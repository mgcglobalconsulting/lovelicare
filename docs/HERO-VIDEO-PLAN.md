---
title: LoveLi Care — Home Hero Video Plan
slug: lovelicare-hero-video-plan
project: lovelicare
type: plan
phase: 2
status: planned
created: 2026-10-06
updated: 2026-10-06
owner: Mark Cartwright
spend_required: true
spend_estimate_usd: 45
approved: false
tags: [lovelicare, video, hero, phase-2, brand, higgsfield, hyperframes, performance]
aliases: ["Hero Video Plan", "Phase 2 Video"]
related: ["[[lovelicare-master-plan-v2]]", "[[lovelicare-branding]]", "[[lovelicare-video-prompts]]", "[[lovelicare-budget]]"]
---

# Home Hero Video Plan

> **Planning only. Nothing generated, no credits spent, no files added.**
> Execute only after Mark approves §8 (spend) and §9 (go/no-go).
> Scope: the **home page hero only**. Other heroes come later, if this lands.

Related: [[lovelicare-master-plan-v2]] · [[lovelicare-branding]] · [[lovelicare-video-prompts]] · [[lovelicare-budget]]

---

## 1. What changed since this was first imagined

Phase 1 inverted the premise. The hero used to be a **dark green slab**, so the original
note in `index.html` — `<!-- VEO 3 VIDEO ACCENT: Replace with ./assets/video/ripple-loop.mp4 -->`
— assumed a dark, moody, low-key film.

The hero is now a **luminous bone→sand light field** (measured luminance **0.95**), and the
page currently sits at **0 WCAG AA contrast failures across all 7 pages**.

Two consequences, both load-bearing:

1. **The film must be high-key**, not moody. A dark video on a light hero fights the design and
   re-breaks the contrast work.
2. **Motion behind body copy is the fastest way to lose those 0 failures.** Contrast against a
   moving image has to hold on the *brightest and darkest* frame, not the average. This drives
   the layout decision in §3.

---

## 2. What the video is *for*

Not decoration. One job: **make the hero feel alive in the first 2 seconds without costing
legibility, load time, or credibility.**

It must read as *clinical calm* — a med spa, not a nightclub. Restraint is the brand.

---

## 3. Placement — the central decision

The hero is a two-column grid: copy left (`1.08fr`), portrait right (`0.82fr`). A slot already
exists at `.video-bg-container` (`position:absolute; inset:0; z-index:0`), currently
`display:none` on the home hero, with `.video-bg-fallback` already painting a warm cream gradient.

| Option | Verdict |
|---|---|
| **A — Full-bleed behind everything** | ✗ Puts motion directly behind the H1, lead and trust strip. Destroys the measured contrast. |
| **B — Right column only, around the portrait** | ~ Safe, but boxes the motion into a panel and reads like an embedded player. |
| **C — Full-bleed video, asymmetric scrim** | ✓ **Chosen.** |

### C, precisely

Full-bleed video at `z-index:0`, with a bone scrim above it that is **near-opaque over the copy
column and clears toward the right**:

```
linear-gradient(100deg,
  var(--c-bone)       0%,     /* copy column: solid. contrast maths unchanged */
  var(--c-bone)      42%,
  rgba(244,241,235,.72) 62%,
  rgba(244,241,235,.46) 100%) /* right edge: motion visible around the portrait */
```

The copy column keeps a **solid bone ground**, so every contrast number measured in Phase 1
holds exactly. Motion lives on the right, where the eye travels toward the portrait and the
booking CTA. The scrim is a plain gradient — no `backdrop-filter` — so it costs nothing.

**The video replaces `mesh-canvas` in the hero. They do not coexist.** Keeping both means two
animated layers plus three blurred orbs — noise, and double GPU cost on a page whose only job
is to get someone to book. `mesh-canvas` stays on other sections.

---

## 4. Content direction

### 4.1 Hard rule — no synthetic people

**No AI-generated faces, bodies, hands-on-patient, or practitioner footage. Ever.**

Libra is a real, named, board-certified NP-CRNP. Synthetic footage implying staff, clients, or
treatment outcomes on a medical provider's site is deceptive, and in aesthetics it edges toward
implied before/after claims. The existing compliance guardrails in [[lovelicare-video-prompts]] §4
already govern claims; this extends the same logic to imagery.

The hero film is **material and abstract**: fluid, glass, light, textile. The real portrait of
Libra already carries the human presence, and it is genuine.

### 4.2 Loop seamlessness drives the concept

Generative models do not produce loops. Three ways out:

1. **Ping-pong** (play forward, then reversed) — free, perfectly seamless, but only works when the
   motion carries **no directional or gravity cue**. Reversed falling water is instantly wrong.
2. **Crossfade tail into head** (~0.5s) — works on anything, costs a little softness at the seam.
3. **Generate to a steady state** and loop the settled portion — most expensive in attempts.

→ **Choose motion that is ping-pong safe.** That rules out droplets, pours, and drips —
which is most of what the four launch films do. This is a real constraint, not a preference.

### 4.3 Three concepts — generate stills first, pick one

| # | Concept | Motion | Ping-pong safe | Verdict |
|---|---|---|---|---|
| **1** | **Caustics** — warm light refracted through slow-moving liquid, cast across a bone surface | drifting light pattern | ✓ Yes | **Primary.** Abstract, unmistakably warm, reads as "clinical light" not "spa stock" |
| **2** | **Infusion bloom** — a caramel bloom diffusing into clear fluid, high-key | radial diffusion | ✗ No (reverses into un-mixing) | Backup. Needs concept 3 of §4.2 |
| **3** | **Linen drift** — warm cream fabric breathing in slow air | gentle swell | ✓ Yes | Safe but generic. Last resort |

### 4.4 Prompt — Concept 1 (prepend the BRAND LOCK from [[lovelicare-video-prompts]] §1, HIGH-KEY variant)

```
Extreme macro of warm sunlight refracting through a slow-moving layer of clear
liquid, casting soft caustic light patterns across a smooth bone-coloured surface
— the light pattern drifts and breathes almost imperceptibly, no droplets, no
pouring, no splash — camera locked, zero movement — soft directional key from
upper left, warm white balance, high-key and airy, shadows no deeper than cacao
#6E564E — palette strictly bone #F4F1EB, mist #FAF8F5, sand #EADFD5 with a single
caramel #C9A96E specular highlight — fine film grain, shallow depth of field,
generous empty negative space in the left two-thirds of the frame — unhurried,
calm, clinical luxury
```

Append the universal negative prompt from [[lovelicare-video-prompts]] §1, plus:
`falling droplets, pouring, splashing, directional flow, people, hands, faces`

> **Negative space is deliberate.** The left two-thirds sits under the solid scrim and must
> stay quiet — a busy left side wastes bitrate on pixels nobody sees.

---

## 5. Tooling

| Stage | Tool | Note |
|---|---|---|
| Still frame | Higgsfield image / Flux | Approve the frame **before** spending on motion |
| Still → video | Higgsfield (MCP available in-session) · Kling 2.x · Veo 3 | Image-to-video is far cheaper and far more on-brand than text-to-video roulette |
| Loop, grade, encode | **HyperFrames** | Ping-pong assembly, grain match, caramel-highlight grade, export ladder |
| Integration + audit | Claude CLI | CSS/markup, poster extraction, LCP measurement, contrast re-run |

Workflow is the one already proven in [[lovelicare-video-prompts]] §2: **still first, approve, then animate.**

---

## 6. Technical specification

| Property | Target | Why |
|---|---|---|
| Duration | 6–8 s loop | Long enough not to feel twitchy; short enough to stay small |
| Resolution | 1920×1080 master → 1280×720 served | Right half is all that's visible; 720p is invisible under a scrim |
| H.264 (baseline) | **≤ 2.5 MB** | Universal fallback |
| AV1 or HEVC | **≤ 1.5 MB** | Modern browsers, served first via `<source>` |
| Frame rate | 24 fps | Filmic, and cheaper than 30/60 |
| Audio | **none** — strip the track entirely | Autoplay requires muted; a silent track is wasted bytes |
| Poster | first frame, WebP ≤ 120 KB | This is the LCP candidate, not the video |

### Markup shape

```html
<div class="video-bg-container" aria-hidden="true">
  <video class="hero-video" poster="./assets/video/hero-caustics-poster.webp"
         muted loop playsinline preload="none" disablepictureinpicture>
    <source src="./assets/video/hero-caustics.av1.mp4" type="video/mp4; codecs=av01.0.05M.08">
    <source src="./assets/video/hero-caustics.h264.mp4" type="video/mp4">
  </video>
  <div class="hero-video-scrim"></div>
</div>
```

### Loading rules

- `preload="none"` + poster always. The poster paints; the video is attached after.
- **Attach the video only when:** pointer-fine **and** viewport ≥ 900px **and**
  `prefers-reduced-motion: no-preference` **and** `navigator.connection.saveData !== true`
  **and** `effectiveType` is not `2g`/`slow-2g`.
- **Mobile ships the poster only.** A background loop is not worth the data on a phone, and the
  hero is portrait-stacked there anyway.
- `prefers-reduced-motion: reduce` → poster only, video never attached. Matches the existing
  interaction layer, which already bails out entirely under that query.
- Start playback **after** the intro aperture hands off (`html.intro-done`), so the video never
  competes with the entrance animation or delays it.
- `.video-bg-fallback` stays as the no-JS / no-video ground. It already looks good.

---

## 7. Acceptance gates — all must pass, measured not eyeballed

| # | Gate | Threshold | How |
|---|---|---|---|
| 1 | Contrast holds | **0 failures**, all 7 pages | `npm run audit:contrast` |
| 2 | Contrast holds on the *worst* frame | ≥ 4.5:1 body / 3.0:1 large | Sample the brightest **and** darkest frame, not the average |
| 3 | LCP regression | **≤ 200 ms** vs poster-only baseline | Measure baseline *first*, before any video lands |
| 4 | Palette | **0 cool-cast pixels** outside image rects | `npm run audit:visual` |
| 5 | Loop seam | invisible at 3 consecutive cycles | Manual review |
| 6 | Transfer size | ≤ 2.5 MB H.264 / ≤ 1.5 MB modern | DevTools network |
| 7 | Reduced motion | video never attaches | Emulate `prefers-reduced-motion: reduce` |
| 8 | Mobile | poster only, no video request | Emulate 390×844 |

**If gate 1, 2 or 3 fails → ship poster-only and stop.** The cream gradient already in
`.video-bg-fallback` is genuinely good. A hero that loads fast and reads clearly beats a hero
with a loop in it. This is the honest fallback, not a failure state.

---

## 8. Cost — needs approval before anything is generated

| Item | Est. |
|---|---:|
| Still frames, 3 concepts × ~3 attempts | $8–15 |
| Image→video, ~6–10 generations at 5–8 s | $25–45 |
| Re-rolls if the first pass misses | $0–15 |
| **Total** | **$35–60** |

Against the **$100/week** budget, with ~$80/week currently unspent ([[lovelicare-budget]] §5).
This is a one-off, not recurring.

**Claude will not generate anything until Mark says go.**

---

## 9. Execution order

```
0  Measure LCP baseline (poster-only)        ← MUST be first, or gate 3 is meaningless
1  Approve spend (§8)
2  Generate 3 still frames, pick one          ← approve the FRAME before paying for motion
3  Image→video, 5–8s, concept 1
4  HyperFrames: ping-pong loop, grade, encode ladder
5  Extract poster, wire markup + scrim, swap OUT mesh-canvas
6  Run gates 1–8
7  Pass → ship.  Fail 1/2/3 → poster-only, stop, report
```

Every step before 5 is reversible and touches no site file.

---

## 10. Open questions for Mark

1. **Concept** — caustics (recommended), infusion bloom, or linen drift?
2. **Any real footage?** A 10-second phone clip of the actual Towson treatment room or a real
   IV setup would beat anything generative, costs $0, and carries no authenticity risk. Worth
   checking before spending.
3. **Other heroes** — service pages later, or home only?

---

## 11. Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-10-06 | Hero film is **high-key**, not moody | Phase 1 made the hero a light field |
| 2026-10-06 | Placement **C** — full-bleed + asymmetric scrim | Preserves 0 contrast failures on the copy column |
| 2026-10-06 | Video **replaces** `mesh-canvas` in hero | Two animated layers = noise + double GPU cost |
| 2026-10-06 | **No synthetic people**, ever | Real named medical provider; deception + implied-claims risk |
| 2026-10-06 | Motion must be **ping-pong safe** | Models don't loop; rules out droplets and pours |
| 2026-10-06 | **Mobile ships poster only** | Data cost on the page that drives bookings |
| 2026-10-06 | Brand lock in [[lovelicare-video-prompts]] **de-tealed** | It was still specifying `#2F4F4F`; would have generated off-brand footage |
