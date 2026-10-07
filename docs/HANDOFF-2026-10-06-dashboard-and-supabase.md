---
title: LoveLi Care — Handoff, 2026-10-06 (dashboard, inventory, Supabase cutover)
slug: lovelicare-handoff-2026-10-06
project: lovelicare
type: handoff
status: in_progress
created: 2026-10-06
updated: 2026-10-06
tags: [lovelicare, handoff, dashboard, supabase, inventory, github]
aliases: ["Handoff Oct 6", "Dashboard handoff"]
related: ["[[lovelicare-dashboard-v1]]", "[[lovelicare-master-plan-v2]]", "[[lovelicare-budget]]", "[[lovelicare-branding]]"]
---

# Handoff — 2026-10-06

Read this first, then `docs/DASHBOARD-V1.md`, then `docs/MASTER-PLAN-v2.md`.

**One-line state:** the owner dashboard is built, redesigned, verified and
pushed; Supabase is cut over to a new project with the schema applied and
9 real inventory rows; the only thing standing between here and live data is
**one missing environment variable**.

---

## 1. Start here next session

```bash
cd ~/Desktop/lovelicare

# The dashboard, with API + live data path
npm start                      # http://localhost:3000/dashboard

# Design-only preview (no API, always DEMO)
npm run serve:static           # http://127.0.0.1:4321/dashboard.html

# Gates — both must stay clean
npm run audit:dashboard        # WCAG AA on /dashboard  → currently 0 failures
npm run audit:contrast         # the 7 public SPA pages
```

> Check for a stale server first: `lsof -nP -iTCP:4321 -sTCP:LISTEN`.
> A leftover `http.server` will silently serve old files.

> `ws` and `pngjs` are in `devDependencies` but were **not installed**; this
> session installed them with `--no-save`. If the audits fail with
> `Cannot find module 'ws'`, run `npm install`.

> Chrome/CDP **needs the Bash sandbox disabled** to launch. Each headless run
> leaves helper processes behind; six runs exhausted the 1392-process user
> limit and `fork` started failing for everything. **Clean up after every run:**
> `pkill -f "user-data-dir=/var/folders.*<prefix>-"`. Do not broad-`pkill`
> "Google Chrome Helper" — that kills the user's own browser tabs.

---

## 2. ~~THE ONE BLOCKER~~ — RESOLVED

`SUPABASE_SERVICE_ROLE_KEY` is set and **the dashboard runs LIVE**.

```
GET /health ->
  supabase:  "configured (service_role key)"
  dashboard: "configured"
GET /api/dashboard/rows + cookie -> 200
```

**Gotcha worth remembering:** the key was first added to `.env.local`, but
`server.js` calls `require("dotenv").config()` with **no path**, so only `.env`
is ever read. It was moved to `.env`. If a variable "is set" but the app cannot
see it, check which file it is in.

Key format is the new `sb_secret_*` style, which is correct for reads.

## 3. Supabase — CUT OVER, schema applied

| | |
|---|---|
| Project | **`tziwrqpvnncddbvlclyg`** — "LoveLiCare Medspa and Wellness Services" |
| URL | `https://tziwrqpvnncddbvlclyg.supabase.co` |
| Region / status | us-east-1 · ACTIVE_HEALTHY · created 2026-10-06 |
| Old project | `lphudfgjbsyhroqmhomh` — **abandoned**, do not use |

### Tables (all RLS-enabled)

| Table | RLS | Rows |
|---|---|---|
| `contact_inquiries` | insert-only (anon may submit) | 0 (test row deleted) |
| `newsletter_subscribers` | insert-only (anon may subscribe) | 0 |
| `project_notes` | deny-all | 0 |
| `inventory_items` | deny-all | **9** |
| `inventory_movements` | deny-all | **9** |

### Verified end to end
POSTed through the real `/api/contact` endpoint → **HTTP 201**, row confirmed in
the database. Live form → publishable key → insert-only RLS → new project works.

### ⚠️ Delete the test row
The delete was declined by the destructive-statement gate. Run in SQL Editor:
```sql
delete from public.contact_inquiries where email = 'connection-test@lovelicare.invalid';
```

### Access quirk — important
- **Supabase MCP** has access to the new project. Use it for reads and SQL.
- **Supabase CLI does NOT.** `supabase link --project-ref tziwrqpvnncddbvlclyg`
  fails with *"account does not have the necessary privileges"*. The CLI is
  signed into an account seeing only orgs `lovaandwellness` and
  `mgc global consulting`. `supabase login` **cannot run here** — it refuses
  non-TTY and needs `--token` or `SUPABASE_ACCESS_TOKEN`.
- `apply_migration` via MCP was **declined twice** by the permission gate.
  Schema was applied by Mark pasting `supabase/APPLY-TO-NEW-PROJECT.sql` into
  the Studio SQL editor. **Use that path for future migrations.**

### Security advisors — reviewed
- **Fixed:** `touch_updated_at` had a mutable `search_path`. Now pinned to `''`
  with `security invoker`, in both the database and `0002`.
- **Benign, leave alone:** `rls_auto_enable()` flagged twice as an anon-callable
  `SECURITY DEFINER`. Source inspected — it is a Supabase-managed *event
  trigger* that auto-enables RLS on new tables, owned by `postgres`, with
  `search_path` already pinned. Event-trigger functions cannot be meaningfully
  invoked over RPC. Effectively a false positive.
- **Intentional:** 3× "RLS enabled, no policy" on inventory and notes. That is
  deny-by-default working — unreadable from any browser, server-side only.

---

## 4. The dashboard

**Surface:** `public/dashboard.html`, its own bundle. Never inside `index.html` (R7).

| File | Role |
|---|---|
| `public/dashboard.html` | page |
| `public/assets/css/dashboard.css` | layout + components |
| `public/assets/css/dashboard-theme.css` | **tan + white-frost theme, loads last** |
| `public/assets/css/tokens.css` | vendored copy (original lives outside `public/`) |
| `public/assets/js/dashboard-data.js` | adapters, demo generator, filtering, derivation, INVENTORY |
| `public/assets/js/dashboard.js` | listbox, tabs, URL state, render, SVG charts, sign-in |
| `lib/dashboard-api.js` | Express router at `/api/dashboard` |
| `docs/testing/audit-dashboard.js` | WCAG gate — `npm run audit:dashboard` |

### Design
Tan field + white-frost panels. **Cormorant Garamond 300** for display and
metric numerals, **Jost** for UI. Sidebar is frosted white; the greeting hero is
the single espresso punctuation block. Caramel stays metal — hairlines, the
active tab rail, chart strokes, the hero's top sheen. Never a filled button,
never body copy.

### Panels
Greeting hero · 4 KPI tiles each with two sub-stats · 8-stage Client journey ·
Funnel · What people are asking · Inquiry queue · **Inventory** · Audience ·
Up next · Deferred Tier 2 · Connectors.

### Two things NOT to "fix"

**1. The funnel deviates from the plan deliberately.**
`MASTER-PLAN-v2.md` §4.4 says `visit → chat → inquiry → booking click → booked`.
Those are **not nested sets** — a booking click comes from the site CTA *or*
chat and needs no inquiry, so the stage exceeds its predecessor and renders a
**negative drop-off** (observed `-36 (-54.5%)`). Shipped instead:
`visits ⊇ inquiries ⊇ contacted ⊇ booked`. Chat sessions and booking clicks are
parallel engagement signals with their own tiles. The renderer also refuses to
print a negative drop-off if live data ever produces one.

**2. The honesty rule is structural.**
There is one `deriveAll(rows)` path. DEMO and LIVE both feed it rows, so no
aggregate is hardcoded and the modes cannot drift. Demo rows are seeded (stable
across reloads) and every tile is badged `DEMO`. **Tier 2 metrics — revenue,
LTV, rebooking, memberships — are not generated even in demo.** Four of eight
journey stages render hollow for the same reason.

### Sign-in flow
The API is token-gated and there was no browser way in, so the page would sit in
DEMO forever. Mode bar now carries a token field → `POST /api/dashboard/session`
→ httpOnly `SameSite=Strict` cookie scoped to `/api/dashboard`, 12h. The token
never touches JS, localStorage or the URL. Sign-out button appears in LIVE.

### API security
`lib/dashboard-api.js` reads PII (name, email, phone, message). Three guards:
1. **`DASHBOARD_TOKEN` must be set** — otherwise every route 503s. Fails closed.
2. Caller presents it via `x-dashboard-token` header or the cookie. **Constant-time** compare.
3. Reads require the service-role key; otherwise 503 with the reason.

> This token gate is **interim**. §4.4 specifies Supabase Auth + a `staff` table
> with roles `owner | provider | front_desk`. Swap `auth()` when that lands —
> route shapes and the client contract do not change.

---

## 5. Inventory — from vial photographs

Source: `~/Desktop/lovelicare-raw-phootage`. Every field was read off an actual
label; nothing invented. Base count 10, each stocked at 10.

| Common | Name on vial | Strength | Route | Manufacturer | NDC |
|---|---|---|---|---|---|
| Glutathione | GLUTATHIONE INJECTION PRESERVATIVE FREE | 200 mg/mL | IV | Empower Pharmacy | 72827-2402-1 |
| Biotin | BIOTIN SOLUTION FOR INJECTION | 10 mg/mL | IM or IV | ASP Cares | 72833-589-30 |
| Lipotropic | LIPO INJECTION (Methionine/Inositol/Choline Chloride) | 25/50/50 mg/mL | IM | Empower Pharmacy | 72827-2415-1 |
| Lipotropic B | LIPO-B INJECTION (+ Cyanocobalamin) | 25/50/50/1 mg/mL | IM | Empower Pharmacy | 72827-2419-1 |
| Taurine | TAURINE INJECTION | 50 mg/mL | IM | Empower Pharmacy | — |
| Vitamin B6 | PYRIDOXINE HCL (B6) INJECTION | 100 mg/mL | IM | Empower Pharmacy | — |
| CoQ10 | COENZYME Q-10 (UBIDECARENONE) INJECTION | 20 mg/mL | IM or SubQ | Empower Pharmacy | — |
| Vitamin D3 | VITAMIN D3 INJECTION (Cholecalciferol) | 50,000 IU/mL | IM | Olympia Compounding | 73198-0075 |
| Zinc | ZINC CHLORIDE INJECTION | 0.5 mg/mL | IV | Olympia Pharmaceuticals | — |

`inventory_movements` is append-only; a stock count is the sum of its movements,
not a bare assertion. Each row carries `source_image` so any number traces back
to the photo. Benefits come from the clinic's own chalkboard (Burn Fat, Boost
Metabolism, Strong Hair & Nails). **No PHI** — product data only.

> The catalog is duplicated in `dashboard-data.js` as `INVENTORY` for demo mode.
> **Change one, change both.** Next step is to have the dashboard read
> `inventory_items` over the API instead and delete the duplicate.

---

## 6. Verification status

| Gate | Result |
|---|---|
| `npm run audit:dashboard` | **0 contrast failures** (desktop + dropdown-open passes) |
| UI suite (24 checks) | all pass — render, ARIA, keyboard, URL, filtering, write-back, mobile |
| API suite (19 checks) | all pass — fails-closed, 401s, constant-time, cookie flags, validation |
| Sign-in flow | verified in headless Chrome against the real server |
| `/api/contact` → Supabase | HTTP 201, row confirmed |

Two real contrast bugs were found and fixed this session:
- `.side__count` greige on the sidebar's `.1` bone wash → **3.8:1**. Now shell.
- `.jstage__n` clay on frost → **2.66:1**. `BRANDING.md` says clay is *never*
  text. Now cacao.

The audit gained two capabilities the upstream `audit-contrast.js` still lacks:
**occlusion detection** (`elementFromPoint` — an open dropdown over a banner was
producing phantom 1:1 failures) and **single-glyph checking** (the 2-char
minimum was hiding em-dash empty states). Worth backporting.

---

## 7. Git

| Remote | URL | State |
|---|---|---|
| `origin` | `git@github.com:mgcglobalconsulting/lovelicare.git` | **working, PUBLIC**, `main` tracks it |
| `onedopestory-pending` | `https://github.com/OneDopeStory/lovelicare.git` | **404**, parked |

Pushed: `2467924` — 63 files, the whole working tree.

**Why the repo looked empty:** not the remote. The work had never been
committed. The last pushed tree held **7 entries and no `public/`** while the
working tree had 52 pending changes and 26 never-tracked files. **Check
`git status` before blaming a remote.**

### Uncommitted right now
```
 M public/assets/js/dashboard.js                 # sign-in / sign-out flow
 M supabase/migrations/0002_project_notes.sql    # search_path hardening
?? supabase/APPLY-TO-NEW-PROJECT.sql             # combined schema for Studio
```

### OneDopeStory is still not connected
`gh` is authed as **`mgcglobalconsulting`**. A `gh auth login --web` device code
was issued but never entered and **timed out**. `OneDopeStory/lovelicare`
returns 404 — never created, or private without `mgcglobalconsulting` as a
collaborator. To move: Mark signs into github.com **as OneDopeStory first**,
then a fresh code, then
`gh repo create OneDopeStory/lovelicare --private --source=. --push`.
Mark chose **private** for that repo.

### ⚠️ `origin` is PUBLIC
`docs/BUDGET.md`, the dashboard source and the API auth design are publicly
readable at `github.com/mgcglobalconsulting/lovelicare`. Worth flipping private.

### Excluded on purpose (in `.gitignore`)
`lovelicare.chatbox/` — superseded prototype with its **own `.git`** and
**117 MB of node_modules**; committing it would create a broken submodule.
Also `supabase/.temp/` and the loose root reference screenshots.

---

## 8. Environment

```
STRIPE_SECRET_KEY           SET
ANTHROPIC_API_KEY           SET
SUPABASE_URL                SET  → tziwrqpvnncddbvlclyg
SUPABASE_PUBLISHABLE_KEY    SET
DASHBOARD_TOKEN             SET  (generated this session, 64 hex)
SUPABASE_SERVICE_ROLE_KEY   SET  (sb_secret_*, moved from .env.local)
GOOGLE_*                    missing → Gmail notification drafts disabled
```

`.env` is gitignored. `.env.example` documents `DASHBOARD_TOKEN` and holds only
empty placeholders.

> A Supabase **Next.js** quickstart was pasted this session. This project is
> **Express + a static SPA** — `@supabase/ssr`, `utils/supabase/*`,
> `middleware.ts` and `page.tsx` do not apply, and `NEXT_PUBLIC_*` names would
> never be read. Only the URL and publishable key were taken from it.

---

## 9. Next, in order

1. ~~Add `SUPABASE_SERVICE_ROLE_KEY`~~ — **DONE. Dashboard is LIVE.**
2. ~~Delete the test inquiry row~~ — **DONE.** `contact_inquiries` is at 0.
3. **Commit the four pending files** (see §7).
4. **Decide `origin` visibility** — it is public and holds the budget.
5. **Point the dashboard at `inventory_items` over the API**, delete the duplicated
   `INVENTORY` array in `dashboard-data.js`.
6. **Phase 3 capture** — `chat_sessions`, `site_events`, `booking_intent`.
   `/chat` persists nothing today; it is the highest-value untapped source and
   the funnel/journey panels stay thin until it lands.
7. **Replace the token gate with Supabase Auth** + `staff` table and roles.
8. Optional: back-port occlusion + single-glyph checks into `audit-contrast.js`.

**Not started, unchanged:** Phase 2 hero video (`docs/HERO-VIDEO-PLAN.md`,
needs $35–60 of Higgsfield credits, **not approved**). Vagaro replacement.
Sheets/Slack/X/LinkedIn connectors — all reported honestly as pending or deferred.

---

## 10. Standing rules that bit this session

- **No push, deploy, production migration, or outward action without Mark's
  explicit OK.** The permission gate enforces it independently — `apply_migration`
  and a `delete` were both declined even after verbal approval. Do not retry a
  declined call; route around it (Studio SQL editor).
- **No dashboard tile shows a number it cannot trace to a row.**
- **No PHI.** D4 holds: clinical intake routes through Vagaro.
- Clay and greige are **never text on light**. Gold never carries text.
- Never paste Stitch hex; map to tokens.
