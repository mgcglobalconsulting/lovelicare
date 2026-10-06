# CLAUDE.md — LoveLi Care Med Spa

Project guidance for Claude Code sessions in `~/Desktop/lovelicare`.
Global rules in `~/CLAUDE.md` still apply (client isolation, deploy approval, Stitch formula).

**Client:** LoveLi Care Med Spa & Wellness Lounge · Libra T. Robertson, NP-CRNP (Board Certified)
**Location:** 100 E Pennsylvania Ave, Suite 304, Towson, MD 21286
**Stack:** Express (`server.js`) + static SPA in `public/` + Supabase + Anthropic chatbot. Deploy: Vercel.

---

## Read before working

| Need | File |
|---|---|
| **The active program plan** | `docs/MASTER-PLAN-v2.md` ← start here |
| **Phase 2 hero video plan** | `docs/HERO-VIDEO-PLAN.md` (planning done, awaiting go) |
| **Budget & spend ledger** | `docs/BUDGET.md` |
| Brand authority (palette, type, contrast) | `libra-lovelicare-images/brand/BRANDING.md` |
| Design tokens | `libra-lovelicare-images/brand/tokens/tokens.css` |
| Stitch prompts (already on Bare) | `libra-lovelicare-images/brand/prompts/STITCH-PROMPTS.md` |
| Booking system build brief | `docs/VAGARO-REPLACEMENT-PLAN.md` |
| Browser test patterns | `docs/testing/` |

---

## Color — the thing to get right

Palette is the Vagaro **"Bare"** warm monochrome, **plus the authored extensions**. Not a strict five.
The direction is **creams, whites, caramels, earth tones — rich, not flat.**

| Band | Tokens | Share |
|---|---|---|
| Primary light field | `--c-bone #F4F1EB` · `--c-mist #FAF8F5` | ~65% |
| Warm secondary grounds | `--c-sand #EADFD5` · `--c-shell #E9DAD1` | ~20% |
| Type & dark sections | `--c-espresso #3C2B25` · `--c-ink #241915` | ~10% |
| Secondary UI & rules | `--c-cacao #6E564E` · `--c-clay #A8938B` · `--c-greige #BDAEA9` | ~5% |
| **Caramel accent** | `--c-gold #C9A96E` — **never text** | ≤3% |
| Caramel, text-legal | `--c-gold-ink #7A5F33` — the only accessible gold on light | — |

**How "pop" is produced — this is the design thesis, not decoration:**

1. **Value rhythm, not hue.** Hard lightness gap between adjacent surfaces (bone → sand → shell → espresso). Never two mid-tones touching — that is what reads as muddy.
2. **Caramel as metal, not paint.** Hairlines, active-nav underlines, glass edge-sheen, the `™` on Snatch Protocol™. Never a filled button, never body copy.
3. **Material depth.** Liquid-glass language — inner highlight, long soft shadow, grain, refraction. Warm the glass tints from white toward mist/sand so panels read cream, not grey.
4. **Full-bleed espresso sections as punctuation.** The contrast *between* sections is the drama.

**Never:** teal, blue, green, pink, amber. Gold carrying text. Flattening the palette to 5 swatches —
`BRANDING.md` §1.2 is explicit that five values cannot carry a product.

**Contrast gate:** gold/clay/greige all FAIL on light (2.0 / 2.6 / 1.9:1). Greige is text-legal **on dark only**.
Run the pixel-accurate audit (`docs/testing/`) before calling any visual work done — `getComputedStyle`
reports `transparent` for most grounds on this site, so only a real screenshot sample is trustworthy.

---

## State of the code (verified 2026-10-06)

- `public/` uses **zero** brand tokens. Still 51 × `#C9A96E`, 20 × `#2F4F4F` teal, plus pink/amber strays.
- `tokens.css` exists but **is never imported**. The design system is inert.
- `liquid-glass.css` **already has a `:root` variable layer** (`--cream`, `--teal`, `--gold`, `--glass-*`).
  **Recolor through that seam** — redefine the vars, then convert residual raw literals. Do not value-snap
  every file; that destroys hue and deletes the caramel.
- Supabase (`lphudfgjbsyhroqmhomh`): 2 tables, **0 rows**, insert-only RLS. No revenue/appointment data exists.
- `/chat` **persists nothing** — every chatbot conversation is discarded. Highest-value untapped data source.
- Site nav is sound: 17 `navTo()` targets ↔ 17 `id="page-*"` sections, all matched. Not broken.
- `index.html` is 1688 lines, single-file SPA. **The dashboard does not go in it.**
- `docs/VIDEO-PROMPTS.md` brand lock is still teal — **de-teal before generating any video.**

---

## Hard rules

- **No PHI in Slack, Google Sheets, X, or LinkedIn — ever.** Slack carries aggregates plus first name +
  last initial, service, time, booking ID. Nothing more.
- Clinical data (`clinical` schema) stays in the database behind role-scoped RLS + audit log.
  Only the `ops` tier (counts, totals, rates) may leave.
- Service-role key is **server-side only**. Never ships to a browser.
- **No dashboard tile shows a number it cannot trace to a row.** Empty state over placeholder, always.
  The Dribbble MedSpa shot is a *visual* reference — its revenue/calendar/LTV data does not exist here.
- Never paste Stitch's hex output. Map to custom properties.
- No `git push`, deploy, production migration, Slack install, or message to a real person without
  Mark's explicit OK in the conversation.

---

## Session memory — notes sync (repo ↔ Obsidian ↔ Supabase)

Planning docs carry YAML frontmatter (`slug`, `type`, `status`, `phase`, `tags`, `related`)
and `[[wikilinks]]`, so the same file works in all three places. **The repo is the source of
truth.** Five notes currently sync: branding, master-plan-v2, budget, video-prompts,
hero-video-plan — and every wikilink between them resolves.

```bash
npm run notes:list                              # what would sync
npm run notes:obsidian -- ~/Obsidian/LoveLiCare # export to a vault folder
npm run notes:push                              # upsert into Supabase project_notes
```

- Opt-in: only files with `project: lovelicare` in frontmatter sync. Scans `docs/` and
  `libra-lovelicare-images/brand/`.
- Idempotent: unchanged notes are skipped via `content_hash`.
- `project_notes` is **deny-by-default under RLS with no anon/authenticated policy** —
  internal notes must never be readable from a browser. Push needs `SUPABASE_SERVICE_ROLE_KEY`.
- **Never put client data or PHI in these notes.** Project documentation only.

> ⚠️ `supabase/migrations/0002_project_notes.sql` is **written but NOT applied.**
> Applying it is a production migration and needs Mark's explicit OK.

## Phase 2 (hero video) — PLANNED, not started

Full plan in `docs/HERO-VIDEO-PLAN.md`. Decisions already locked there, don't relitigate:

- Film is **high-key**, not moody — Phase 1 made the hero a light field.
- Placement **C**: full-bleed video + an asymmetric bone scrim that is solid over the copy
  column and clears to ~46% at the right edge. Keeps the 0-contrast-failure result intact.
- Video **replaces** `mesh-canvas` in the hero. They never coexist.
- **No synthetic people, ever.** Libra is a real named NP-CRNP; generated staff/clients on a
  medical site is deceptive and edges toward implied before/after claims. Material and
  abstract only — fluid, glass, light, textile.
- Motion must be **ping-pong safe** (no gravity or directional cue), because models don't
  produce loops. This rules out droplets and pours.
- **Mobile ships poster only.** Reduced-motion ships poster only.
- Hard gates: 0 contrast failures, contrast holds on brightest *and* darkest frame, LCP
  regression ≤200 ms. **Fail any of those three → ship poster-only and stop.**
- Needs **$35–60** of Higgsfield credits. **Not approved yet — generate nothing until Mark says go.**
- `docs/VIDEO-PROMPTS.md` brand lock has been **de-tealed** to Bare+ (it would have produced
  off-brand footage). Two "teal" mentions remain on purpose: both are prohibitions.

## Tooling

| Tool | Owns |
|---|---|
| Claude CLI | Code, data layer, auth, RLS, audits, Stitch→token conversion |
| Stitch | Page/dashboard comps via the Bare Theme block. One major change per iteration |
| Higgsfield | Hero video, b-roll. No rendered text |
| HyperFrames | Motion graphics, titles, overlays, encode |

---

## Decisions — RESOLVED 2026-10-06

- **D1 Deploy target: Vercel.** `vercel.json` is committed and tracked. Netlify is not used.
- **D2 Caramel: retained.** It is the pop. Rules in the Color section above.
- **D3 Dashboard v1 on owned data** — build it, don't wait for Vagaro.
- **D4 PHI: NOT collected. The product stays out of HIPAA scope.** Supabase will only sign a
  BAA on Team ($599/mo) **plus** the HIPAA add-on ($350/mo) = **$949/mo**, which is 2.2× the
  entire $100/week budget. Clinical intake routes through **Vagaro**, which is already a
  HIPAA-covered platform. Our stack stores marketing/ops data only. See `docs/BUDGET.md` §1.
- **D5 X API deferred** ($200/mo = 46% of budget). LinkedIn MDP is free but needs a
  multi-week approval — start the application, no spend. Adapters stubbed.

**Budget: $100/week.** Ledger and recommendations in `docs/BUDGET.md`. Claude proposes spend
there and keeps it current; nothing is bought without Mark's OK.

## Phase 1 (visual pass) — COMPLETE, verified 2026-10-06

- Palette seam wired: `:root` in `liquid-glass.css` now carries the Bare+ tokens, with the
  legacy names (`--cream`/`--teal`/`--gold`) aliased onto them so all 947 CSS lines inherit.
- **0 retired colours and 0 off-brand cool-cast colours** remain in `public/`.
- Home hero flipped from a dark green slab to a **luminous bone→sand field** (luminance 0.95).
- **0 WCAG AA contrast failures across all 7 pages** (was 220+). Verified by pixel sampling.
- Interaction layer added: scroll-progress hairline, staggered grid reveals, pointer tilt,
  button shine, caramel nav underline + dropdown rail, caramel focus rings. All
  `prefers-reduced-motion` aware; stagger gated on `html.lc-js` so no-JS never blanks content.

### Audit gates — run these before calling visual work done
```bash
npm run serve:static        # MUST be the only server on :4321 — see note below
npm run audit:contrast      # full-page pixel-accurate WCAG sweep, all 7 pages
npm run audit:visual        # hero + palette + interaction-layer regression
```
Both need `ws` and `pngjs` (in devDependencies). `audit:contrast` must report **0 failures**.

> **Check for a stale server first.** `lsof -nP -iTCP:4321 -sTCP:LISTEN`. A leftover
> `http.server` from an earlier session will keep the port and silently serve old files —
> this already cost one debugging cycle, and it is why the browser tab looked unchanged.
