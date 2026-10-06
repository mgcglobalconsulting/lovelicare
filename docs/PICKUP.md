# LoveLi Care — pickup point

Last updated: 2026-10-02. **Nothing committed. Nothing deployed.**
Supersedes all earlier versions of this file.

---

## The one thing blocking everything

**The Supabase migration has not been run.** Until it is, both forms return an
error and nothing else can be verified end to end.

- SQL file: `supabase/migrations/0001_contact_and_subscribers.sql`
- My project (`lphudfgjbsyhroqmhomh`) — re-probed at end of session, tables still absent
- I attempted it twice via the Supabase tool; **both were denied** by a permission
  gate on cloud-database writes. It has to be run by a human in the dashboard.

Everything downstream is already built and verified against it.

---

## Open decisions — these change what happens next

### 1. Who hosts? (biggest one — the two routes do not combine)

| | Your account | Owner self-hosts |
|---|---|---|
| Supabase | mine (`lphudfgjbsyhroqmhomh`) | she creates her own |
| Vercel | yours, Pro $20/mo | hers, free Hobby |
| Deploy | I do it | she imports from GitHub |
| Prepared | env vars already set | `prepare-handoff.sh` + `OWNER-DEPLOY.md` |

Earlier in the session the agreed plan was **your account, Vercel Pro, preview-only
deploy**. The later handoff request points at **owner self-hosts**. Both are fully
prepared; pick one. Note Vercel Hobby's terms exclude commercial/client sites.

### 2. Typeface — three options, awaiting your pick
Shown in situ at `public/typography.html` (also published privately at
https://claude.ai/artifact/5218zTnTEoss1dHr9BgAMm).

- **Voice One — Marcellus + Mulish** *(my recommendation)*. Moderate-contrast serif
  with a rounded sans — the pairing the research ties to comfort and trust.
- **Voice Two — Bodoni Moda + Jost.** Classic luxury formula, most aspirational, runs cool.
- **Voice Three — Cormorant Garamond + Jost.** Smallest change; Cormorant already loads.

Say a number and I apply it across all 17 pages.

### 3. Email alerts — needs ~15 min of your time
`npm run google-auth` does the whole token dance. First create an OAuth client in
Google Cloud Console; exact steps are in the header of `scripts/google-auth.js`.

### 4. Out of scope (confirmed)
Stripe shop / checkout. `STRIPE_SECRET_KEY` exists in `.env` but no checkout is wired.

---

## Agreed scope for "complete"
Contact form → Supabase · Newsletter → Supabase · Email alert on submission.
Not the shop.

---

## What is built and verified

| Area | State | Evidence |
|---|---|---|
| Forms → Supabase | code done | 31/31 `docs/testing/test-endpoints.js` |
| Nav + dropdowns | rebuilt | 24/24 `docs/testing/test-nav.js` |
| Buttons / links / pages | audited | 17/17 `docs/testing/test-interactive.js` |
| Cursor | rebuilt | 11/11 (verified inline) |
| Handoff export | tested | `prepare-handoff.sh` → 21 files, clean |

**Backend.** `POST /api/contact` and `/api/subscribe` write one column per labeled
field. Validation, length caps, email normalisation, duplicate signup treated as
success, real DB errors surfaced as 500 — never a false "You're in". Gmail is a
best-effort notification only, so missing `GOOGLE_*` can no longer kill a submission.
`/health` reports Supabase and email status.

**Security model.** Tables are **insert-only** under RLS: the site can add a
submission and can never read, update or delete. So the app uses a *publishable*
key, not a service_role secret. A leaked key exposes nothing.

**Nav.** Was hover-only with no click handler — unusable on touch — plus fake
`role="menubar"` ARIA promising keyboard behaviour that did not exist. Rebuilt on
the WAI-ARIA disclosure pattern: tap, hover-with-intent, CSS bridge over the dead
gap, `aria-expanded`, Escape, arrow keys, outside-click. Then a visual pass:
lit gold top edge, editorial section rules, gold-chipped icons, Cormorant names.

**Cursor.** Site had `cursor:none` with a 30%-alpha gold ring on cream — effectively
invisible, no hover feedback, and hostile to low-vision and magnifier users. Native
cursor restored (`cursor:pointer` everywhere interactive); the halo now augments it,
with dark-under-light strokes so it reads on cream and on teal, a 52px target lock,
press pulse, and keyboard parity. Falls back to the plain OS cursor on touch,
reduced-motion and forced-colors.

**Mobile drawer.** Was 1095px of content in an 844px viewport with
`overflow-y: visible` — Contact, Client Portal and **Book Appointment** were
unreachable on a phone. Now scrolls; verified at 844px and 667px.

---

## Environment state

- **Local `.env`** — has `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (plus your
  existing Stripe/Anthropic keys). `/health` reports `configured (publishable key)`.
- **Vercel** (`onedopestorys-projects/lovelicare`) — `SUPABASE_URL` and
  `SUPABASE_PUBLISHABLE_KEY` set for **Production and Development only**.
  Preview could not be set: **the Vercel project has no connected Git repository**,
  so branch-scoped preview vars are rejected. A `vercel.app` production deploy is
  the practical review URL — and it does *not* touch lovelicare.com, since the
  domain isn't attached to Vercel.
- **`ANTHROPIC_API_KEY` is not in Vercel** — the chatbot will error on any deploy.

---

## Context worth not rediscovering

- **lovelicare.com is a live GoDaddy Website Builder site.** This repo replaces it.
  Final cutover is a DNS change at GoDaddy; nothing public changes before that.
- **`.env.example` had my Supabase URL and key committed** — sanitised. Had it
  shipped, the owner's site would have written into my database.
- **`vercel.json`, `lib/`, `supabase/` are untracked.** Any handoff must include
  them or the app will not deploy. `prepare-handoff.sh` verifies this and aborts.
- **`docs/testing/test-nav.js` is flaky ~1 run in 3** — the Vagaro/Affirm embeds
  steal focus. Clean with `BLOCK_THIRDPARTY=1`. That widget also overwrites
  `body.className`, which is why all state flags live on `<html>`.
- **Browser tests need ~4.2s** after navigate; shorter waits give false failures.
- **Higgsfield: 10 credits, free plan** — generates nothing. Prompts are written
  and ready in `docs/VIDEO-PROMPTS.md` (Brand Lock + four 15s films for
  Glutathione, Vitamin C, B12, Magnesium). Veo via Google Flow is the better
  route and costs no Higgsfield credits.

---

## Files added this session

```
lib/supabase.js                         server-side client, publishable or service_role
supabase/migrations/0001_*.sql          the schema + insert-only RLS   ← run this
scripts/google-auth.js                  one-command Gmail refresh token
scripts/prepare-handoff.sh              clean export for the owner (tested)
docs/OWNER-DEPLOY.md                    non-technical deploy guide (ships to her)
docs/VIDEO-PROMPTS.md                   brand-locked generative video prompts
docs/testing/{test-endpoints,test-nav,test-interactive,measure2}.js
public/typography.html                  internal font proposal — do not ship
```

---

## First five minutes next session

1. Probe whether the migration landed:
   `node docs/testing/test-interactive.js 9448` → forms 503/500 means still not run.
2. If it did: start the server and submit a real inquiry; confirm the row in Supabase.
3. Resolve the hosting decision above — it gates everything else.
4. Apply the chosen typeface.

Start the server with:
`node -e "require('./server.js').listen(4178)"` → http://localhost:4178
