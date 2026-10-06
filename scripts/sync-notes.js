#!/usr/bin/env node
/**
 * Sync LoveLi Care planning docs between three homes:
 *
 *   docs/*.md   (repo, source of truth)
 *        │
 *        ├──► Supabase public.project_notes   `node scripts/sync-notes.js push`
 *        └──► an Obsidian vault folder        `node scripts/sync-notes.js obsidian <vault-path>`
 *
 * Only files carrying YAML frontmatter with `project: lovelicare` are synced, so
 * ad-hoc notes in docs/ are ignored until they opt in.
 *
 * SCOPE: internal project documentation only. Never client data, never PHI —
 * this project is deliberately out of HIPAA scope (see docs/BUDGET.md §1).
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY for `push`: project_notes is deny-by-default
 * under RLS, with no anon or authenticated policy. That is intentional.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
// Scanned folders. The brand docs live outside docs/ but are part of the same
// knowledge set, and the wikilinks in docs/ point at them.
const SCAN = [
  path.join(ROOT, "docs"),
  path.join(ROOT, "libra-lovelicare-images", "brand"),
];

/** Minimal YAML frontmatter reader — enough for the flat keys we author. */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const [, head, body] = m;
  const fm = {};
  for (const line of head.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let [, k, v] = kv;
    v = v.trim();
    if (v.startsWith("[") && v.endsWith("]")) {
      fm[k] = v.slice(1, -1).split(",")
        .map(s => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else if (v === "true" || v === "false") {
      fm[k] = v === "true";
    } else if (v !== "" && !isNaN(Number(v))) {
      fm[k] = Number(v);
    } else {
      fm[k] = v.replace(/^["']|["']$/g, "");
    }
  }
  return { fm, body };
}

function collect() {
  const out = [];
  const files = [];
  for (const dir of SCAN) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) if (f.endsWith(".md")) files.push(path.join(dir, f));
  }
  for (const full of files) {
    const file = path.basename(full);
    const raw = fs.readFileSync(full, "utf8");
    const parsed = parseFrontmatter(raw);
    if (!parsed) continue;                              // no frontmatter -> opt out
    if (parsed.fm.project !== "lovelicare") continue;   // not ours -> skip
    out.push({
      file,
      raw,
      slug: parsed.fm.slug || file.replace(/\.md$/, "").toLowerCase(),
      title: parsed.fm.title || file.replace(/\.md$/, ""),
      project: parsed.fm.project,
      type: parsed.fm.type || "note",
      phase: Number.isFinite(parsed.fm.phase) ? parsed.fm.phase : null,
      status: parsed.fm.status || "draft",
      tags: Array.isArray(parsed.fm.tags) ? parsed.fm.tags : [],
      body_md: parsed.body,
      frontmatter: parsed.fm,
      source_path: path.relative(ROOT, full),
      content_hash: crypto.createHash("sha256").update(raw).digest("hex"),
    });
  }
  return out;
}

async function push() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "ERROR: push needs SUPABASE_SERVICE_ROLE_KEY.\n" +
      "project_notes is deny-by-default under RLS — the publishable key cannot write it.");
    process.exit(1);
  }
  const { getSupabase } = require("../lib/supabase");
  const db = getSupabase();
  if (!db) { console.error("ERROR: Supabase not configured (SUPABASE_URL missing)."); process.exit(1); }

  const notes = collect();
  if (!notes.length) { console.log("No frontmatter-tagged notes found in docs/."); return; }

  // Skip notes whose content hash already matches.
  const { data: existing, error: readErr } =
    await db.from("project_notes").select("slug,content_hash");
  if (readErr) {
    console.error("ERROR reading project_notes:", readErr.message);
    if (/does not exist/i.test(readErr.message)) {
      console.error("\nApply the migration first:\n  supabase/migrations/0002_project_notes.sql");
    }
    process.exit(1);
  }
  const have = new Map((existing || []).map(r => [r.slug, r.content_hash]));

  const changed = notes.filter(n => have.get(n.slug) !== n.content_hash);
  if (!changed.length) {
    console.log(`Up to date — ${notes.length} note(s), nothing changed.`);
    return;
  }

  const rows = changed.map(({ file, raw, ...row }) => row);
  const { error } = await db.from("project_notes").upsert(rows, { onConflict: "slug" });
  if (error) { console.error("ERROR upserting:", error.message); process.exit(1); }

  for (const n of changed) console.log(`  ${have.has(n.slug) ? "updated" : "created"}  ${n.slug}`);
  console.log(`\nPushed ${changed.length} of ${notes.length} note(s).`);
}

function toObsidian(vault) {
  if (!vault) { console.error("ERROR: pass the vault folder.\n  node scripts/sync-notes.js obsidian ~/Obsidian/LoveLiCare"); process.exit(1); }
  const dir = vault.replace(/^~/, process.env.HOME);
  fs.mkdirSync(dir, { recursive: true });
  const notes = collect();
  for (const n of notes) {
    fs.writeFileSync(path.join(dir, `${n.slug}.md`), n.raw);
    console.log(`  wrote  ${n.slug}.md`);
  }
  console.log(`\n${notes.length} note(s) -> ${dir}`);
  console.log("Wikilinks resolve once all notes live in the same vault folder.");
}

function list() {
  const notes = collect();
  if (!notes.length) { console.log("No frontmatter-tagged notes in docs/."); return; }
  console.log(`${notes.length} syncable note(s):\n`);
  for (const n of notes) {
    console.log(`  ${n.slug}`);
    console.log(`    ${n.type}/${n.status}${n.phase !== null ? ` · phase ${n.phase}` : ""} · ${n.source_path}`);
  }
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "push") push();
else if (cmd === "obsidian") toObsidian(arg);
else if (cmd === "list") list();
else {
  console.log(`Usage:
  node scripts/sync-notes.js list                  show which docs would sync
  node scripts/sync-notes.js push                  upsert into Supabase project_notes
  node scripts/sync-notes.js obsidian <vault-dir>  copy into an Obsidian vault folder`);
}
