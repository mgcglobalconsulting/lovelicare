---
title: LoveLi Care — Master Branding Document
slug: lovelicare-branding
project: lovelicare
type: reference
status: complete
created: 2026-10-05
updated: 2026-10-06
tags: [lovelicare, brand, palette, bare, typography, contrast, authority]
aliases: ["Branding", "BRANDING.md", "Brand Authority"]
related: ["[[lovelicare-master-plan-v2]]", "[[lovelicare-video-prompts]]", "[[lovelicare-hero-video-plan]]"]
---

# LoveLi Care — Master Branding Document

> **This is the authoritative branding reference.** Where any other file disagrees, this file wins.
> Last palette revision: Vagaro **"Bare"** template override.

**Client:** LoveLi Care Med Spa & Wellness Lounge
**Provider:** Libra Robertson, NP-CRNP (Board Certified)
**Location:** 100 E Pennsylvania Ave, Suite 304, Towson, MD 21286
**Booking:** vagaro.com/lovelicaremd/book-now
**Tagline:** Biophilic · Clinical · Luxury

---

## 1. Palette — AUTHORITATIVE (Vagaro "Bare")

The brand palette is a **warm monochrome nude** system sampled from the Vagaro "Bare" template. It replaces all prior gold/teal direction.

### 1.1 The five

| # | Token | Hex | Name | Role |
|---|---|---|---|---|
| 1 | `--c-espresso` | `#3C2B25` | Espresso | Darkest ground, primary dark, buttons, headings on light |
| 2 | `--c-cacao` | `#6E564E` | Cacao | Secondary dark, accent text on light, hover states |
| 3 | `--c-greige` | `#BDAEA9` | Greige | Hairlines, dividers, muted text **on dark only**, inactive |
| 4 | `--c-shell` | `#E9DAD1` | Shell | Secondary light ground, warm blush field, body text on dark |
| 5 | `--c-bone` | `#F4F1EB` | Bone | Primary light ground |

### 1.2 Extensions (required for a working interface)

Five values cannot carry a full product. These are derived strictly within the family — same hue band (14–24°), no new chroma introduced.

| Token | Hex | Derivation | Role |
|---|---|---|---|
| `--c-ink` | `#241915` | Espresso darkened | Maximum-contrast headings, full-bleed dark sections |
| `--c-sand` | `#EADFD5` | Between shell and bone | Page field behind cards (matches Bare's own card surround) |
| `--c-clay` | `#A8938B` | Between cacao and greige | Secondary buttons, icon strokes, placeholder text on light |
| `--c-mist` | `#FAF8F5` | Bone lightened | Card surfaces lifting off bone, input fields |

### 1.3 Optional heritage accent — gold

The existing site is built on champagne gold `#C9A96E` (51 occurrences). It is the brand's only existing color equity, and at hue 39° it harmonizes with the nude band (14–24°) rather than fighting it.

**If retained:** strictly ≤ **3%** of any screen. Metallic accents only — a hairline under an active nav item, the `™` on `Snatch Protocol™`, a thin rule above a section eyebrow. Never a filled button, never body text, never an icon fill.

**The system is complete without it.** Dropping gold entirely is a valid and arguably cleaner choice. Decide once, globally — do not use it on some pages and not others.

> ⚠️ **`#C9A96E` on any light ground is 2.0:1 and fails WCAG.** If gold carries text, it must be `#7A5F33`. Simpler: never let gold carry text.

### 1.4 Retired

Removed from the system. Purge from `public/*.html`:

- All teal / cypress / palm: `#2F4F4F`, `#0F2020`, `#1A3232`, `#1A2E2E`, `#173b35`, `#0D2020`, `#0f1a14`
- Lagoon / aqua / mint: `#A8D5BA`, `#B3E5FC`
- Duplicate golds: `#D4B87A`, `#D9BE86`, `#d5ad71`, `#e0bd84`, `#eed3a0`, `#f5dfb5`, `#F0D98A`, `#B8935A`
- Pink/coral strays: `#F8BBD0`, `#FFCDD2`, `#e5b6a9`, `#f2cfc4`, `#edc0b1`, `#e7b8aa`
- Amber: `#FFB300`, `#FFE082`

### 1.5 Allocation discipline

| Share | Band |
|---|---|
| **65%** | Bone + Mist (primary light field) |
| **20%** | Sand + Shell (warm secondary grounds) |
| **10%** | Espresso + Ink (type, dark sections, buttons) |
| **5%** | Cacao + Clay + Greige (secondary UI, rules) |
| *≤3%* | *Gold, if retained — carved out of the 5%* |

In a monochrome system the discipline shifts from *hue restraint* to **value restraint**. The failure mode is muddiness: too many mid-tones touching. Keep a hard value gap between any two adjacent surfaces — if two neighboring areas are both in the 40–70% lightness band, one of them is wrong.

### 1.6 Verified contrast

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `--c-ink` `#241915` | `--c-bone` | **14.9:1** | AAA — display headings |
| `--c-espresso` `#3C2B25` | `--c-bone` | **11.9:1** | AAA — default body on light |
| `--c-espresso` | `--c-shell` | **9.9:1** | AAA — body on blush ground |
| `--c-cacao` `#6E564E` | `--c-bone` | **6.0:1** | AA — accent copy, links on light |
| `--c-bone` | `--c-espresso` | **11.9:1** | AAA — body on dark |
| `--c-shell` | `--c-espresso` | **9.9:1** | AAA — body on dark |
| `--c-greige` `#BDAEA9` | `--c-espresso` | **6.3:1** | AA — muted text on dark |
| ⚠️ `--c-greige` | `--c-bone` | **1.9:1** | **FAIL** — hairlines and dividers only, never text |
| ⚠️ `--c-clay` `#A8938B` | `--c-bone` | **2.6:1** | **FAIL** — never text. Placeholder only if paired with a visible label |
| ⚠️ `--c-gold` `#C9A96E` | `--c-bone` | **2.0:1** | **FAIL** — never text |

**The dominant risk in this palette:** mid-tones that look readable on a bright designer monitor and disappear in a sunlit Towson treatment room. Greige and clay are *structure*, not *voice*.

---

## 2. How the villa aesthetic survives the monochrome

The aesthetic source is an ambient luxury-villa / sunset-lagoon visual mix. Going monochrome does not weaken it — it sharpens it.

| Before (gold + teal) | Now (Bare monochrome) |
|---|---|
| Atmosphere carried by **hue** — teal water vs gold light | Atmosphere carried by **light and texture** — direction, falloff, material |
| Risk of reading "beach club" | Reads "Aman resort / private villa" |
| Caustics tinted aqua | Caustics as pure luminance — more realistic, more subtle |
| Palm shadow competed with teal | Palm shadow on plaster **is literally the palette** |
| Sunset = coral gradient | Sunset = warm value ramp, espresso → sand |

**Operating principle:** every atmospheric effect must now be achieved with **value, texture, and light direction — never hue.** This is a harder discipline and a better result.

### The golden-hour lighting model (unchanged, now load-bearing)

Because color can no longer do the work, lighting must. Every photograph, render, and video in the system uses:
- **One** warm directional key, low angle, from frame left or right — never front-flat
- Long soft shadows with visible falloff
- Mild atmospheric haze; gentle bloom around highlights
- Deep but *open* shadows — detail retained, never crushed to black
- Skin rendered warm and real; texture visible, not retouched to plastic

---

## 3. The guardrail (unchanged, now easier to hold)

> **Translate atmosphere, never iconography.**

### Banned permanently
Pineapples, hibiscus, monstera-as-pattern, flamingos, toucans, tiki, thatch, bamboo framing, surfboards, shells, starfish, nautical rope, script fonts, "Aloha / Paradise / Oasis / Escape" copy, cocktail-umbrella imagery, saturated turquoise, gradient buttons, gradient text, gradient blobs.

### Always permitted
Palm-frond shadow on plaster, water caustics, haze, bloom, travertine, limewash, teak, unglazed ceramic, raw linen, brushed metal, horizon lines, wide calm framing, one real specific plant.

**Test:** Corona commercial → wrong. Aman resort brochure → right.

---

## 4. Typography — AUTHORITATIVE

The current build loads **ten** families across three HTML files. This is the biggest credibility leak in the project. Reduce to **three**.

| Role | Family | Weights | Job |
|---|---|---|---|
| **Display** | `Marcellus` | 400 | Headings ≥21px only. Inscriptional, carved-stone feel |
| **Editorial** | `Cormorant Garamond` | 300, 300 italic, 400 | Testimonials, mission, Libra's quotes. The brand's only soft voice. Never UI |
| **UI / Body** | `Jost` | 200, 300, 400, 500 | Body and all interface. Default **300** |

**Remove:** Bodoni Moda, Italiana, Playfair Display, Inter, Mulish, Montserrat, Open Sans.

> Note: the Vagaro "Bare" template uses a high-contrast didone display face. Marcellus is the deliberate departure — didones read *fashion editorial*, which undercuts a medical practice. Marcellus holds the luxury register while keeping clinical credibility. If the Vagaro-hosted booking pages cannot change their face, let them differ; do not degrade the main site to match a template default.

```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet">
```

Scale, line-heights and tracking: see `DESIGN-SYSTEM.md` § 2. Body is **Jost 300 / 17px / 1.65 line-height** — the generous leading is load-bearing and non-negotiable.

---

## 5. Voice

**Principles:** short declaratives · name the mechanism · never promise outcomes · second person present tense · **no exclamation marks anywhere**.

**Use:** nurture, restore, elevate, balance, refine, sculpt, optimize, replenish, considered, unhurried, clinical, luminous, composed

**Avoid:** snatched *(except in `Snatch Protocol™`)*, slay, obsessed, bestie, girlie, miracle, magic, secret, hack, anti-aging, flawless, perfect

---

## 6. Service taxonomy

Six categories, each a verb. In a monochrome system categories are differentiated by **ground value and photographic register**, not by color coding.

| Category | Domain | Ground | Register |
|---|---|---|---|
| **Refine** | Medical Aesthetics | Bone | Brightest. High-key morning light, mirror-clean |
| **Sculpt** | Body Contouring · `Snatch Protocol™` | Ink | Most architectural. Deep shadow, strong directional light, form and edge |
| **Optimize** | Weight Management | Mist | Clear, daylit, organized. Charts permitted here |
| **Restore** | IV & Nutritional Wellness | Espresso | Deepest, most immersive. Dusk, lantern light, reclined comfort |
| **Nourish** | Nutrition Counseling | Shell | Warmest, most domestic. Teak, ceramic, real food |
| **Concierge Medical** | Non-Emergent Care | Sand | Most restrained. Efficiency signals respect for time |

`Snatch Protocol™` is a trademarked product mark and the brand's most ownable asset after Libra. Set in display face, always with ™, never explained apologetically.

---

## 7. Trust architecture

5.0 Google Stars · NP-CRNP Board Certified · HIPAA Compliant · Maryland Licensed · Medical Director Oversight · Complimentary consultation

**Placement:** one quiet row, `Jost 500 / 11px / +0.16em` uppercase, greige hairline dividers, **no icons, no badge graphics, no color.** Should read like a gallery wall label, not a trust-badge plugin.

---

## 8. Signature elements

1. **`--r-arch`** — `border-radius: 20rem 20rem 0 0`. The villa archway niche. Use on Libra's portrait, treatment-room media, service feature images. The system's most ownable geometric move.
2. **Pool-surface elevation** — elevation as translucency and light-catching edges, never conventional drop shadow. The existing `assets/css/liquid-glass.css` is the right instinct; refactor it to the five levels in `DESIGN-SYSTEM.md` § 4.
3. **122 BPM motion** — all durations derived from the source genre's tempo. Base transition **480ms** (one beat), ambient loops **16s** (eight bars). This derivation is what makes the site *feel* like the reference rather than merely look like it.

---

## 9. Build order

1. Drop in `tokens/tokens.css`, link first on every page
2. Purge every retired hex in § 1.4 — start with the five duplicate golds
3. Swap to the three approved font families; delete the other seven `<link>` loads
4. Apply the type scale; body → Jost 300 / 17px / 1.65
5. Refactor `liquid-glass.css` to the five elevation levels
6. Add motion tokens + the `prefers-reduced-motion` block
7. Apply `--r-arch` to Libra's portrait and treatment media
8. Commission photography — the real blocker (only 3 brand images exist today)
9. Atmosphere effects (caustics, frond shadow) **last** — garnish, not the meal

---

## 10. File map

| File | Purpose |
|---|---|
| **`BRANDING.md`** | **This file — authoritative** |
| `BRAND-FOUNDATION.md` | Positioning, voice, personality, audit findings |
| `DESIGN-SYSTEM.md` | Full color/type/space/elevation/motion spec |
| `tokens/tokens.css` | Drop-in CSS custom properties |
| `tokens/design-tokens.json` | Machine-readable tokens |
| `tokens/tailwind.tokens.js` | Tailwind theme fragment |
| `prompts/STITCH-PROMPTS.md` | Page-by-page Stitch prompts |
| `prompts/IMAGE-GENERATION-PROMPTS.md` | Higgsfield still-image prompts |
| `prompts/MOTION-AVATAR-PROMPTS.md` | Higgsfield video · Hyperframes · HeyGen |
| `prompts/CONTEXT-ENGINEERING.md` | Prompts to paste when building |

> **Hex sampling note:** values in § 1.1 are read from the Vagaro "Bare" template screenshot. Before production, export the template's own swatches from Vagaro and reconcile — expect ±2 per channel.
