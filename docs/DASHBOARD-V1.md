---
title: LoveLi Care — Owner Dashboard v1
slug: lovelicare-dashboard-v1
project: lovelicare
type: build
status: shipped_local
created: 2026-10-06
updated: 2026-10-06
tags: [lovelicare, dashboard, supabase, phase4, a11y]
aliases: ["Dashboard v1", "Owner Dashboard"]
related: ["[[lovelicare-master-plan-v2]]", "[[lovelicare-branding]]", "[[lovelicare-budget]]"]
---

# Owner Dashboard v1

Phase 4 of [[lovelicare-master-plan-v2]]. Built 2026-10-06. Runs locally;
**not deployed** — no `git push` or Vercel deploy has been made.

Preview: `npm run serve:static` → <http://127.0.0.1:4321/dashboard.html>
Live mode: `npm start` → <http://localhost:3000/dashboard>

---

## 1. Files

| File | Role |
|---|---|
| `public/dashboard.html` | The page. Separate bundle — **not** inside `index.html` (R7). |
| `public/assets/css/dashboard.css` | Styling. Adds no new colour; every value is a Bare+ token. |
| `public/assets/css/tokens.css` | Vendored copy of the brand tokens (the original lives outside `public/`, so it cannot be served). |
| `public/assets/js/dashboard-data.js` | Data layer: adapters, demo generator, filtering, derivation. |
| `public/assets/js/dashboard.js` | UI: listbox, URL state, render, SVG charts. |
| `lib/dashboard-api.js` | Express router, mounted at `/api/dashboard`. |
| `docs/testing/audit-dashboard.js` | WCAG AA pixel gate for this page. `npm run audit:dashboard`. |

`tokens.css` had never been imported by anything — the design system was inert.
The dashboard is the first surface to actually consume it.

---

## 2. The honesty rule, enforced structurally

CLAUDE.md: *"No dashboard tile shows a number it cannot trace to a row."*

That is not upheld by discipline here, it is upheld by construction. There is
exactly **one derivation path**, `deriveAll(rows)`. Both modes feed it rows:

- **LIVE** — rows from `/api/dashboard/rows` → Supabase.
- **DEMO** — rows generated locally, deterministically (seeded PRNG, so the
  numbers are stable across reloads).

No aggregate is ever hardcoded. Every tile, funnel stage, bar and chart point
is computed from an array of rows. A demo number is still traceable to a row —
the row is just synthetic, and **every tile carries a `DEMO` badge** plus a
banner stating that nothing came from a real client.

**Tier 2 metrics are not generated even in demo mode.** Revenue, rebooking,
LTV and memberships render as explicit empty states with the reason. Inventing
revenue for a clinical business is the exact failure the plan's red team flagged.

---

## 3. Deviation from the plan: the funnel

MASTER-PLAN-v2 §4.4 specifies `visit → chat → inquiry → booking click → booked`.

**Those five are not nested sets.** A booking click can originate from the site
CTA or from chat, and neither requires an inquiry — so "booking clicks"
routinely exceeds "inquiries" and the stage renders a **negative drop-off**.
Observed in the first build: `drop-off from inquiries: -36 (-54.5%)`.

Shipped instead, strictly nested — `visits ⊇ inquiries ⊇ contacted ⊇ booked`:

| Stage | Source |
|---|---|
| Site visits | `site_events` |
| Inquiries | `contact_inquiries` |
| Contacted | `contact_inquiries.status ∈ (contacted, booked, closed)` |
| Booked | `contact_inquiries.status = booked` |

Chat sessions and booking clicks are **parallel engagement signals**, not funnel
stages. They keep their own tiles. The renderer also refuses to print a negative
drop-off if live data ever produces one — it says the stages are not nested,
which is a data-model bug, not a number.

---

## 4. Dropdowns

The stated complaint. Each filter is a real combobox, not a styled div:

- `button[role=combobox]` with `aria-expanded`, `aria-controls`, `aria-haspopup`
- `ul[role=listbox]` → `li[role=option][aria-selected]`
- `aria-activedescendant` tracks the focused option
- Keyboard: ↑ ↓ Home End Enter Space Escape Tab, plus printable typeahead
  (700 ms window). Typeahead while closed selects directly, like a native select.
- Click-outside and Escape close it
- Options show **row counts**, so you know what a filter returns before picking it

**Every filter is bound to a URL query param** (`range`, `service`, `status`,
`source`). Views are shareable, Back/Forward work, and non-default filters get a
caramel underscore so an active filter is visible without a coloured fill.

Filtering is applied to **rows**, before any aggregate exists — so changing a
dropdown recomputes every number on the page, not just the table.

---

## 5. API security

`lib/dashboard-api.js` reads contact details (name, email, phone, message).
That is PII. Per D4 no PHI is collected, so this is out of HIPAA scope, but it
must never be publicly readable. Three guards:

1. **`DASHBOARD_TOKEN` must be set.** If unset, every route returns 503.
   Fails closed — forgetting to configure auth exposes nothing.
2. **Caller must present it** — `x-dashboard-token` header or an httpOnly
   `lc_dash` cookie from `POST /api/dashboard/session`. Constant-time compare.
3. **Reads require the service-role key.** The tables are insert-only under RLS,
   so a publishable key's SELECT is denied. Rather than return an empty set that
   looks like real zeros, it returns 503 and says why.

> This token gate is **interim**. §4.4 specifies Supabase Auth + a `staff` table
> with roles `owner | provider | front_desk`. Replace `auth()` when that lands;
> the route shapes and client contract do not change.

Missing Phase 3 tables (`chat_sessions`, `site_events`) are an expected state,
not an error — they return empty and are reported in `info.missingTables`, which
the banner surfaces so an empty panel is never mistaken for a quiet week.

---

## 6. Verification

| Gate | Result |
|---|---|
| `npm run audit:dashboard` | **0 contrast failures** (desktop + dropdown-open passes) |
| UI suite (24 checks) | **all pass** — render, ARIA, keyboard, URL, filtering, write-back, mobile |
| API suite (19 checks) | **all pass** — fails-closed, 401s, constant-time, cookie flags, validation |

The contrast audit gained **occlusion detection** (`elementFromPoint`). Without
it, an open dropdown floating over the banner was sampled as the banner's
background and reported as a phantom 1.06:1 failure. The existing
`audit-contrast.js` has the same blind spot and would benefit from the same fix.

One **real** contrast failure was found and fixed: `.side__count` used greige on
the sidebar's `rgba(244,241,235,.1)` pill. That wash lifts espresso to
≈`rgb(87,76,71)`, where greige measures **3.8:1** and fails AA. Now shell, ≈6.1:1.
BRANDING.md licenses greige on dark — but not on a *lightened* dark.

---

## 7. Known gaps

- **Not deployed.** Needs Mark's explicit OK.
- **Supabase CLI is not linked.** `supabase link --project-ref tziwrqpvnncddbvlclyg`
  fails: the authenticated CLI account only has access to orgs `lovaandwellness`
  and `mgc global consulting`. Run `supabase login` as the owning account.
  `.env` still points at the old `lphudfgjbsyhroqmhomh`.
- **`chat_sessions` / `site_events` do not exist.** Phase 3. Until then those
  panels are empty in live mode — correctly, and labelled.
- **Auth is a shared token,** not per-user. No audit log of who changed a status.
- **Sheets / Slack / X / LinkedIn** are reported honestly as pending or deferred.
  No adapter writes anything yet.
- `ws` and `pngjs` were in `devDependencies` but **not installed**, so
  `audit:contrast` and `audit:visual` would also have failed. Installed with
  `--no-save`; run `npm install` to persist them.

---

## 8. To take it live

```bash
# 1. a real token
export DASHBOARD_TOKEN="$(openssl rand -hex 32)"

# 2. the service-role key for the correct project (server-side only, never shipped)
export SUPABASE_URL="https://tziwrqpvnncddbvlclyg.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."

# 3. apply the migrations to that project (needs a successful supabase link)
supabase db push

# 4. run
npm start      # http://localhost:3000/dashboard
```

Then `POST /api/dashboard/session` with `{"token":"<DASHBOARD_TOKEN>"}` to get
the cookie, and the page flips from DEMO to LIVE on its own.
