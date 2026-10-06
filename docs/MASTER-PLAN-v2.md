---
title: LoveLi Care — Master Plan v2
slug: lovelicare-master-plan-v2
project: lovelicare
type: plan
status: in_progress
created: 2026-10-06
updated: 2026-10-06
tags: [lovelicare, plan, roadmap, dashboard, redteam]
aliases: ["Master Plan v2"]
related: ["[[lovelicare-hero-video-plan]]", "[[lovelicare-budget]]", "[[lovelicare-branding]]"]
---

# LoveLi Care — Master Plan v2

**Written for:** Mark, and the next Claude CLI session that picks this up cold.
**Date:** 2026-10-06 · **Status:** plan only. Nothing built, migrated, pushed, or deployed.
**Scope:** `~/Desktop/lovelicare` only.

This document was produced in three passes, as requested:

1. **Pass 1** — the obvious plan.
2. **Pass 2** — the opposition. I argued against my own plan and found 12 flaws.
3. **Pass 3** — the refined plan, which is what you should actually execute. It diverges from Pass 1 in four structural ways, each justified below.

Read §3 (Red Team) before §4. The refined plan looks slower than Pass 1 and is in fact faster, because Pass 1 builds a dashboard with no data in it.

---

## 1. Ground truth — verified, not assumed

Everything below was checked against the repo and the live Supabase project on 2026-10-06. Do not re-derive it; do re-verify before executing, since the tree is dirty.

| Fact | Evidence | Consequence |
|---|---|---|
| `public/` uses **zero** brand tokens | `grep '--c-' public/` → 0 hits | The Bare palette has never actually shipped |
| 51 × `#C9A96E` gold, 20 × `#2F4F4F` teal still live | hex census of `public/` | Retired palette is still the site's real palette |
| `tokens.css` is **never imported** | `grep -rn tokens.css public/` → nothing | The authored design system is inert |
| `liquid-glass.css` already has a `:root` var layer | `--cream --teal --gold --glass-*` | **A seam already exists.** Recolor is a redefinition, not a rewrite |
| Supabase: 2 tables, **0 rows**, RLS insert-only | `list_tables` on `lphudfgjbsyhroqmhomh` | There is no live data to put on a dashboard |
| `/chat` persists nothing | `server.js:232-265` — Anthropic call, `res.json`, no insert | Every conversation is discarded. Owned data, thrown away |
| Site nav is sound | 17 `navTo()` targets ↔ 17 `id="page-*"`, all matched | "Dropdowns not connected" is a **dashboard** problem, not a site problem |
| `index.html` is 1688 lines, single-file SPA | `wc -l` | A dashboard cannot live inside it |
| `VIDEO-PROMPTS.md` brand lock is teal | 5 × `#2F4F4F` | Generating video today produces **off-brand** footage |
| `STITCH-PROMPTS.md` is correctly on Bare | espresso/ink/sand/clay/mist, "NO teal" | Stitch is ready to use as-is |
| `BRANDING.md` ships 9 tokens + optional gold | §1.1–1.3 | The "strict 5" from last session contradicts the brand's own doc |

### 1.1 The previous session's scratch copy

Last session produced a programmatic recolor in `/private/tmp/.../scratchpad/bare-preview` that snapped every literal to the nearest of 5 swatches **by WCAG luminance, discarding hue and saturation**, and converted 15 emoji to monochrome SVG. It fixed 130 contrast failures down to 1.

The emoji→SVG work and the pixel-accurate `contrast-audit.js` are genuinely good and should be kept.

**The recolor itself must not be applied.** See Red Team finding R5.

---

## 2. Pass 1 — the obvious plan (recorded, then superseded)

> A. Apply the Bare recolor to `public/`; sprinkle caramel accents for warmth.
> B. Generate a hero video with Higgsfield using the existing brand lock; drop it behind the hero.
> C. Build `/dashboard` reproducing the Dribbble MedSpa layout — Overview, Calendar, Clients, Journeys, Treatment Plans, Memberships, Marketing, Payments, Reports — wired to Supabase, Google Sheets, Slack, X, and LinkedIn.
> D. Add screenshot / file / voice intake endpoints; test them.
> E. Ship.

This is a competent-sounding plan and it fails. Here is why.

---

## 3. Red Team — 12 findings against Pass 1

### R1 — The dashboard has no data. *(Critical)*

The Dribbble reference shows `$142,380` revenue, `68%` rebooking, 19 clients in flow, per-provider calendars, LTV, checkout totals, membership credits. **None of this exists in this project.** Supabase holds two empty, insert-only tables. That data lives in Vagaro, which exposes no usable API on this plan tier.

Pass 1 therefore builds a beautiful dashboard of **fabricated numbers**. For a clinical business that is worse than useless — Libra could make a staffing or inventory decision on a placeholder.

→ **The Dribbble shot is a visual-language reference, not a feature spec.** Treat it as the look. Derive the content from data this project actually owns.

### R2 — HIPAA. *(Critical)*

The reference panels show named patients, treatments, medical history reviewed, consent status, allergies. Reproducing that means building a system that handles PHI, which imposes: a BAA with Supabase (Team plan), access control, audit logging, encryption at rest, retention policy — and **no PHI in Slack, Google Sheets, X, or LinkedIn**, none of which will be under a BAA here.

Your own `docs/VAGARO-REPLACEMENT-PLAN.md` already states the rule: *"No health information in Slack, ever."* Pass 1 silently violates a constraint this project had already adopted.

→ **Hard split between a clinical tier and an ops tier.** The boundary is architectural, not a code-review checklist.

### R3 — X and LinkedIn are procurement, not code. *(High)*

X API: the free tier gives no useful analytics; Basic is ~$200/month. LinkedIn organic analytics needs an approved Marketing Developer Platform app plus Company Page admin rights, and approval is a human review measured in weeks.

Pass 1 treats these as sprint tasks. They will stall the sprint.

→ Move to an **async track** with a documented adapter interface and a no-op/CSV fallback, so the dashboard ships without them and lights up when approval lands.

### R4 — "Make color pop" collides with the brand's own warnings. *(High)*

`BRANDING.md` §1.5: *"the failure mode is muddiness: too many mid-tones touching."* §1.6: gold on light is **2.0:1 — FAIL**, clay 2.6:1 FAIL, greige 1.9:1 FAIL.

Naively "adding caramel for pop" re-creates exactly the 130 contrast failures the last session spent an entire audit eliminating.

→ **Pop must come from value structure and material, not from tinting text.** Hard value gaps between adjacent surfaces; caramel as metallic edge, gradient sheen, and hairline; `#7A5F33` as the only text-legal gold. This reconciles the brief with the brand instead of choosing between them.

### R5 — The scratch recolor moves away from the stated goal. *(High)*

The 5-swatch snap **discards hue and saturation by design**. Its own summary concedes: *"Gold is gone — 42 accents became cacao/greige"* and *"three teal depths collapsed to one espresso, so dark gradients read flatter."*

You are now asking for caramel and for more pop. Applying that scratch copy would delete the caramel and flatten the gradients — the precise opposite — and would then have to be undone. It also contradicts `BRANDING.md` §1.2, which ships ink/sand/clay/mist specifically because *"Five values cannot carry a full product."*

→ **Do not apply it.** Recolor instead through the variable seam that already exists in `liquid-glass.css` (R6).

### R6 — The recolor method was harder than it needed to be. *(Medium — but it's the unlock)*

Last session's first attempt mapped old tokens **by name** and failed because the hero, footer, and chatbot painted from raw literals. The response was a programmatic value-snap across every file.

But `liquid-glass.css` **already defines `--cream`, `--teal`, `--gold`, `--glass-*`**. The palette seam exists; it is simply filled with retired values. The correct move is far smaller and preserves hue:

1. Redefine that `:root` block to Bare values.
2. Convert the residual raw literals (hero/footer/chatbot) to those variables.
3. Gate with the existing `contrast-audit.js`.

Diff size drops by an order of magnitude, hue survives, caramel survives, and the result is maintainable instead of machine-generated.

### R7 — Architecture: the dashboard cannot live in `index.html`. *(High)*

1688 lines, inline styles, inline `onclick`, SPA page-switching. Bolting an authenticated clinical dashboard into it would be unmaintainable and would put staff code in the public bundle.

→ Separate surface, separate bundle, separate auth.

### R8 — Auth is unspecified and load-bearing. *(High)*

"Libra — full access" implies roles, sessions, and a server-side trust boundary. Current RLS is insert-only for `anon`; reading requires either the service-role key (**server-side only — never the browser**, as `.env.example` already warns) or new authenticated read policies.

→ Supabase Auth + a `staff` table + role-scoped RLS, designed before any dashboard pixel.

### R9 — The hero video has five separate failure modes. *(High)*

- The brand lock in `VIDEO-PROMPTS.md` is **teal** → generates off-brand footage today.
- Text over moving video is the most common contrast failure there is; a fixed scrim tuned to the *average* frame fails on the *brightest* frame.
- Autoplay video degrades LCP and mobile data on a page whose job is booking conversion.
- The hero **already** runs `mesh-canvas` + intro aperture + 3 orbs + grain + vignette. Stacking video on that is visual noise and doubles GPU cost.
- Generation spends Higgsfield credits.

→ De-teal the prompts first; video **replaces** the mesh rather than stacking; scrim tuned to the brightest frame; `prefers-reduced-motion` and mobile fall back to poster; LCP measured before/after with a hard regression gate; credits confirmed before spend.

### R10 — Voice and screenshot intake is PHI, not a file upload. *(High)*

A patient voice note describing symptoms is health information. Pass 1's "add upload endpoints" would land it in storage without a private bucket, signed URLs, RLS, retention policy, or a BAA-covered transcription provider.

→ Design the intake pipeline under the R2 clinical tier from the start.

### R11 — Deploy target is ambiguous. *(Medium)*

`vercel.json` and `.vercelignore` are committed and session memory says Vercel; your brief says Netlify. Building against the wrong one wastes a phase.

→ Resolve before Phase 1. (Flagged as decision D1; not guessed.)

### R12 — The real data source was sitting unused. *(Medium — and it's the answer to R1)*

`/chat` calls Anthropic and returns `res.json({reply})` **without persisting anything**. Every question a prospective client has ever asked the wellness assistant has been thrown away.

That is owned, non-Vagaro, genuinely interesting data: what people ask, which services they ask about, when they drop off, whether they clicked Book. Combined with inquiries, subscribers, and booking-intent events, there is enough for an honest, useful dashboard **today** — one that extends naturally when the Vagaro replacement lands.

---

## 4. Refined plan

Four structural changes from Pass 1:

1. **Create the data before the dashboard.** Phase 3 precedes Phase 4. This is the most important resequencing in this document.
2. **Dashboard content is derived from owned data**, with the Dribbble shot governing *look* only.
3. **Recolor via the existing variable seam**, retaining hue and caramel — not the 5-swatch snap.
4. **Clinical/ops split is architectural**, established before any connector is written.

### 4.0 Phase 0 — Decisions and foundations *(no visible change)*

- Resolve D1–D5 (§6).
- Redefine the `:root` palette block in `liquid-glass.css` to Bare + extensions; import `tokens.css` as the single source.
- De-teal `docs/VIDEO-PROMPTS.md` (5 occurrences) and re-anchor the brand lock to Bare.
- Port `contrast-audit.js` from scratch into `docs/testing/` as a permanent gate.
- Port the emoji→monochrome-SVG conversion (that work was correct).

**Done when:** `grep '#2F4F4F' public/ docs/` returns nothing and the audit runs clean on the current site.

### 4.1 Phase 1 — The visual pass *(the "GORGEOUS" work)*

Highest visible value, zero external dependency. Ship this first.

**Palette — "Bare+", the full authored system:**

| Role | Token | Hex |
|---|---|---|
| Primary light field (~65%) | `--c-bone` / `--c-mist` | `#F4F1EB` / `#FAF8F5` |
| Warm secondary grounds (~20%) | `--c-sand` / `--c-shell` | `#EADFD5` / `#E9DAD1` |
| Type & dark sections (~10%) | `--c-espresso` / `--c-ink` | `#3C2B25` / `#241915` |
| Secondary UI & rules (~5%) | `--c-cacao` / `--c-clay` / `--c-greige` | `#6E564E` / `#A8938B` / `#BDAEA9` |
| **Caramel accent (≤3%)** | `--c-gold` | `#C9A96E` — **never text** |
| Caramel, text-legal | `--c-gold-ink` | `#7A5F33` — the only accessible gold on light |

**How "pop" is actually produced** (answers R4 — this is the design thesis):

- **Value rhythm, not hue.** Enforce a hard lightness gap between adjacent surfaces: bone → sand → shell → espresso. Never two mid-tones touching. This is what makes a monochrome palette read as rich rather than muddy.
- **Caramel as metal, not paint.** Hairline rules, active-nav underlines, gradient edge-sheen on glass, the `™` on Snatch Protocol™, icon strokes at small scale. Never a filled button, never body copy.
- **Material depth.** The existing liquid-glass language — inner highlight, long soft shadow, grain, refraction — carries the luxury. Warm the glass tints from white toward mist/sand so the panels read as cream rather than grey.
- **Full-bleed espresso sections** as punctuation between light fields. The contrast *between sections* is the drama; last session's flattening is exactly what removed it.

**Gate:** `contrast-audit.js` at 0 failures. Gold never carries text. No two adjacent surfaces inside 40–70% lightness.

**Tooling:** Stitch for comps using the existing Bare Theme block in `STITCH-PROMPTS.md` (one major change per iteration; Edit Theme for global changes). Convert Stitch HTML to project custom properties — **never paste its hex values**.

### 4.2 Phase 2 — Hero video (home page only)

1. Rewrite the brand lock to Bare (done in Phase 0).
2. Generate with Higgsfield. Direction: slow macro, IV fluid refraction, warm directional key, espresso falloff, caramel specular highlight, film grain. No drone sweeps, no whip pans.
3. HyperFrames for any title/overlay composition.
4. **Video replaces `mesh-canvas` in the hero** — they do not coexist.
5. Encode: H.264 baseline + modern codec; 6–8s seamless loop; ≤2.5 MB; poster frame as LCP element.
6. `muted loop playsinline`, `preload="none"` on mobile, `prefers-reduced-motion` → poster only.
7. Scrim tuned against the **brightest frame**, verified with the pixel audit.

**Gate:** LCP regression ≤200 ms vs. the poster-only baseline, or ship poster-only and revisit.

### 4.3 Phase 3 — Make the data exist *(prerequisite for Phase 4)*

This is the phase Pass 1 skipped. Nothing here is visible, and the dashboard is fiction without it.

**Schema split (R2):**

- `clinical` — PHI. Authenticated staff only, role-scoped RLS, append-only audit log, retention policy. Never leaves the database.
- `ops` — non-PHI aggregates: counts, totals, utilization, funnel rates. The **only** tier Slack, Sheets, X, or LinkedIn may ever read.

**New capture (all owned, all real):**

| Source | What lands | Tier |
|---|---|---|
| `chat_sessions` / `chat_messages` | Persist `/chat` — transcript, services mentioned, resolution, booking click | ops + clinical-flagged |
| `booking_intent` | Vagaro widget opens, CTA clicks, drop-off point | ops |
| `intake_uploads` | Screenshot / document / **voice** — private bucket, signed URLs, RLS, retention | **clinical** |
| `site_events` | Page views, scroll depth, form starts/abandons | ops |
| existing 2 tables | Inquiries, subscribers — add read policies for staff | ops |

**Intake pipeline (R10):** browser `MediaRecorder` → authenticated upload → **private** bucket → RLS-scoped signed URL → transcription under BAA → row in `clinical`. Never a public URL. Test with synthetic data only; no real patient material until D4 is resolved.

**Gate:** submit one of each — screenshot, file, voice note, contact form — from the live site; verify each lands in the right tier with correct RLS; verify an anonymous client cannot read any of it.

### 4.4 Phase 4 — Dashboard v1, on real data

**Surface:** `/dashboard`, separate bundle, Supabase Auth, `staff` table, roles `owner | provider | front_desk`. Libra = `owner`, full access. Service-role key stays server-side.

**The honesty rule — this is what makes it trustworthy:**
> Every tile declares its source and its freshness. A tile with no data shows *"No data yet — lights up when Vagaro booking ships"*, never a placeholder number. Nothing on this dashboard is ever fabricated.

**v1 panels (all backed by Phase 3 data):**

- **Today** — new inquiries, chat sessions, booking clicks, subscribers.
- **Funnel** — visit → chat → inquiry → booking click → booked, with drop-off.
- **What people are asking** — top services and questions from chat transcripts. *This is the panel nobody else has, and it is the strongest argument for the whole build.*
- **Inquiry queue** — triage `new → contacted → booked → closed`, writes back to `contact_inquiries.status`.
- **Intake** — screenshots / uploads / voice, clinical-tier, role-gated.
- **Audience** — subscriber growth; social once D3 lands.

**Deferred until the Vagaro replacement (Tier 2):** revenue, rebooking rate, provider calendar, LTV, memberships, checkout. These appear in the layout as explicit empty states — the dashboard is *designed* for them, it just will not invent them.

**Dropdowns, done correctly** (the stated complaint): every control is a real `<select>`/listbox bound to a query parameter — date range, provider, service, status, source — driving server-side filtering, reflected in the URL so views are shareable, keyboard-navigable, `aria-expanded` correct. No decorative menus.

**Look:** Dribbble MedSpa reference for density, card rhythm, sidebar, and status-pill language — **re-skinned entirely into Bare+**. The reference is purple/green/white; none of that survives. Earth-tone status pills per `BRANDING.md`: `--success #6B7A5E`, `--warn #A8742E`, `--error #9E4B42`.

### 4.5 Phase 5 — Connectors and the Vagaro unlock

- **Google Sheets** — ops aggregates out; manual data in. Workspace BAA required before anything clinical ever touches it (it should not).
- **Slack** — TrueAssist / Alex route ops digests to channels. **Aggregates, plus first name + last initial, service, time, booking ID. Nothing more, ever** — matches the existing rule in `VAGARO-REPLACEMENT-PLAN.md`.
- **X / LinkedIn** — adapter interface written now, no-op until approval (R3). Marketing metrics only; never client data.
- **Vagaro replacement** — execute `docs/VAGARO-REPLACEMENT-PLAN.md`. This is what turns the deferred Tier 2 panels real.

---

## 5. Tool assignment

| Tool | Owns | Does not own |
|---|---|---|
| **Claude CLI** | All code, data layer, auth, RLS, audits, Stitch→token conversion | Visual comps, video |
| **Stitch** | Page and dashboard comps via the Bare Theme block | Production code — its hex is never pasted |
| **Higgsfield** | Hero video, b-roll | Anything with rendered text |
| **HyperFrames** | Motion graphics, titles, overlays, encode pipeline | Source footage |

Stitch iteration format (per global rules): `Target / Change / Keyword`, one major change at a time, Prototype every 2–3 iterations.

---

## 5b. STATUS — updated 2026-10-06

**Phase 0 + Phase 1: COMPLETE and verified.** See `CLAUDE.md` for the detail and the audit
commands. Headline: 0 retired colours, 0 cool-cast colours, 0 WCAG AA failures across 7 pages
(was 220+), hero flipped to a light field, interaction layer shipped.

**Two findings from execution that change later phases:**

1. **R2/R10 are now settled by cost, not preference.** Supabase will only sign a BAA on
   Team ($599/mo) + HIPAA add-on ($350/mo) = **$949/mo**, against a $433/mo budget. The
   product therefore **stays out of HIPAA scope entirely**: clinical intake routes through
   Vagaro, and Phase 3's voice/upload capture is scoped to non-clinical use with explicit
   on-form guidance and short retention. This *removes* the hardest compliance work from
   Phases 3–5. See `docs/BUDGET.md` §1.
2. **The recolor method in R6 was correct and cheaper than predicted.** The `:root` seam in
   `liquid-glass.css` took the whole palette in one edit; the residue was ~30 literals, not a
   whole-file rewrite. But a DOM-only audit is blind to two things that mattered: the mesh
   canvas paints `hsl()` at **runtime** (two cyan hue stops), and blurred gradient orbs
   (a mint orb at 50% across the hero). Both needed **pixel** auditing to find. `audit-contrast.js`
   and `verify-visual.js` now cover this permanently.

## 6. Decisions needed from Mark

| # | Decision | Recommendation |
|---|---|---|
| **D1** | Vercel or Netlify? `vercel.json` is committed; brief says Netlify | **Vercel** — already configured. Confirm and delete the ambiguity |
| **D2** | Caramel/gold: retain at ≤3% or drop entirely? `BRANDING.md` says decide **once, globally** | **Retain.** It is the brand's only color equity and it is what "caramel pop" means |
| **D3** | Dashboard v1 on owned data now, or wait for Vagaro? | **Now.** Waiting means no dashboard for weeks and no data captured in the meantime |
| **D4** | PHI: Supabase Team plan + BAA? Required before real patient voice/screenshot intake | **Yes, before Phase 3 ships real data.** Build and test on synthetic until then |
| **D5** | Budget: X Basic ~$200/mo, LinkedIn MDP approval | **Defer.** Adapters stubbed; costs nothing until you decide |

---

## 7. Execution order

```
Phase 0  Decisions + token seam + de-teal prompts + audit gate     [no visible change]
Phase 1  Visual pass — Bare+ palette, caramel accents, depth       [SHIPPABLE · highest visible value]
Phase 2  Hero video — Higgsfield → HyperFrames → encode            [SHIPPABLE]
Phase 3  Data capture — persist chat, intake, events, PHI split    [invisible · unblocks Phase 4]
Phase 4  Dashboard v1 on real owned data                           [SHIPPABLE]
Phase 5  Connectors + Vagaro replacement → Tier 2 panels light up  [SHIPPABLE]
```

Every phase leaves the site deployable. No phase depends on an external approval except Phase 5.

---

## 8. Standing rules for this project

- Work only inside `~/Desktop/lovelicare`.
- **No `git push`, Vercel/Netlify deploy, production migration, Slack install, or message to a real person without Mark's explicit OK.**
- No PHI in Slack, Sheets, X, or LinkedIn — ever.
- Service-role key never reaches a browser.
- Never paste Stitch's hex; map to custom properties.
- Palette is Vagaro "Bare" + the authored extensions. No teal, blue, green, or pink.
- Gold never carries text. `#7A5F33` if it must.
- No dashboard tile ever shows a number it cannot trace to a row.
