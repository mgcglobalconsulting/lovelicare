# LoveLi Care — Design System

Palette: Vagaro **"Bare"** warm monochrome. Type, space, elevation and motion derived from the ambient luxury-villa aesthetic and corrected for accessibility.

Machine-readable equivalents: `tokens/design-tokens.json`, `tokens/tokens.css`, `tokens/tailwind.tokens.js`

---

## 1. Color — Vagaro "Bare"

> Palette overridden to the Vagaro **"Bare"** template. All prior gold/teal direction is retired. See `BRANDING.md` § 1 for the authoritative statement.

### 1.1 Why this works (harmony logic)

The system is a **warm monochrome** — a single hue band (≈14–24°) spread across the full value range.

- There is no complementary tension to manage, because there is no second hue. All contrast is **value contrast**.
- Chroma stays low throughout (8–22% saturation). This is what makes nude palettes read as expensive rather than bland: the color is *almost* absent, so material and light do the talking.
- The warmth is non-negotiable. Every neutral leans red-orange. A single cool grey dropped into this system reads instantly as a mistake.

**The discipline shifts.** In a two-hue system you ration *saturation*. In a monochrome system you ration **mid-tones**. The failure mode is muddiness — several surfaces all sitting in the 40–70% lightness band, touching, with nothing to separate them. Keep a hard value gap between any two adjacent surfaces.

### 1.2 The five

| Token | Hex | HSL | Role |
|---|---|---|---|
| `--c-espresso` | `#3C2B25` | `16 24% 19%` | Darkest ground, primary dark, buttons, headings on light |
| `--c-cacao` | `#6E564E` | `15 17% 37%` | Secondary dark, accent text on light, hover |
| `--c-greige` | `#BDAEA9` | `15 14% 71%` | Hairlines, dividers, muted text **on dark only**, inactive |
| `--c-shell` | `#E9DAD1` | `23 38% 86%` | Secondary light ground, body text on dark |
| `--c-bone` | `#F4F1EB` | `40 29% 94%` | Primary light ground |

### 1.3 Extensions

Five values cannot carry a full interface. These are derived strictly in-family — same hue band, no new chroma.

| Token | Hex | HSL | Role |
|---|---|---|---|
| `--c-ink` | `#241915` | `16 26% 11%` | Max-contrast headings, full-bleed dark sections |
| `--c-sand` | `#EADFD5` | `26 36% 88%` | Page field behind cards (matches Bare's own card surround) |
| `--c-clay` | `#A8938B` | `19 15% 60%` | Secondary buttons, icon strokes, placeholders |
| `--c-mist` | `#FAF8F5` | `36 33% 97%` | Card surfaces lifting off bone, input fields |

### 1.4 Optional heritage accent — gold

`#C9A96E` is the existing site's only color equity (51 occurrences). At hue 39° it harmonizes with the nude band rather than fighting it.

**If kept:** ≤ **3%** of any screen, metallic accents only — a hairline under an active nav item, the `™` on `Snatch Protocol™`, a thin rule above a section eyebrow. Never a filled button, never body text, never an icon fill. **The system is complete without it.** Decide once, globally.

### 1.5 Semantic tokens

| Token | Light ground | Dark ground |
|---|---|---|
| `--bg` | `--c-bone` | `--c-espresso` |
| `--bg-alt` | `--c-sand` | `--c-ink` |
| `--bg-warm` | `--c-shell` | `--c-cacao` |
| `--surface` | `--c-mist` | `rgba(233,218,209,.06)` |
| `--text` | `--c-espresso` | `--c-shell` |
| `--text-strong` | `--c-ink` | `--c-bone` |
| `--text-muted` | `--c-cacao` | `--c-greige` |
| `--rule` | `--c-greige` | `rgba(189,174,169,.26)` |
| `--accent` | `--c-espresso` | `--c-shell` |
| `--success` | `#6B7A5E` | `#9DAE8C` |
| `--warn` | `#A8742E` | `#D9A961` |
| `--error` | `#9E4B42` | `#D98C84` |

> Alerts are desaturated into the warm family. A Bootstrap red breaks the whole system. Note that `--accent` is now a **value**, not a hue — the primary button is simply the darkest color.

### 1.6 Allocation discipline

| Share | Band |
|---|---|
| **65%** | Bone + Mist — primary light field |
| **20%** | Sand + Shell — warm secondary grounds |
| **10%** | Espresso + Ink — type, dark sections, buttons |
| **5%** | Cacao + Clay + Greige — secondary UI, rules |
| *≤3%* | *Gold, if retained — carved out of the 5%* |

### 1.7 Verified contrast pairs

Calculated WCAG 2.1 ratios. Use only these combinations for text.

| Foreground | Background | Ratio | Verdict |
|---|---|---|---|
| `--c-ink` `#241915` | `--c-bone` | **14.9:1** | AAA — display headings |
| `--c-espresso` `#3C2B25` | `--c-bone` | **11.9:1** | AAA — default body on light |
| `--c-espresso` | `--c-shell` | **9.9:1** | AAA — body on blush ground |
| `--c-cacao` `#6E564E` | `--c-bone` | **6.0:1** | AA — accent copy, links on light |
| `--c-bone` | `--c-espresso` | **11.9:1** | AAA — body on dark |
| `--c-shell` | `--c-espresso` | **9.9:1** | AAA — body on dark |
| `--c-greige` `#BDAEA9` | `--c-espresso` | **6.3:1** | AA — muted text on dark |
| ⚠️ `--c-greige` | `--c-bone` | **1.9:1** | **FAIL** — hairlines only, never text |
| ⚠️ `--c-clay` `#A8938B` | `--c-bone` | **2.6:1** | **FAIL** — never text; placeholder only with a visible label |
| ⚠️ `--c-gold` `#C9A96E` | `--c-bone` | **2.0:1** | **FAIL** — never text |

**The dominant risk here is mid-tone text.** Greige and clay look perfectly readable on a bright calibrated monitor and vanish on a phone in a sunlit treatment room. They are *structure*, not voice.

### 1.8 Retired — purge from `public/*.html`

- Teal / cypress / palm: `#2F4F4F` `#0F2020` `#1A3232` `#1A2E2E` `#173b35` `#0D2020` `#0f1a14`
- Lagoon / aqua / mint: `#A8D5BA` `#B3E5FC`
- Duplicate golds: `#D4B87A` `#D9BE86` `#d5ad71` `#e0bd84` `#eed3a0` `#f5dfb5` `#F0D98A` `#B8935A`
- Pink / coral strays: `#F8BBD0` `#FFCDD2` `#e5b6a9` `#f2cfc4` `#edc0b1` `#e7b8aa`
- Amber: `#FFB300` `#FFE082`

---

## 2. Typography

### 2.1 The consolidation

The current build loads **ten** families across three HTML files. Reduce to **three**, each with one non-overlapping job.

**Remove:** Bodoni Moda, Italiana, Playfair Display, Inter, Mulish, Montserrat, Open Sans.
**Keep:** Marcellus, Cormorant Garamond, Jost.

| Role | Family | Why |
|---|---|---|
| **Display** | `Marcellus` | Inscriptional Roman with open counters and generous apertures. Reads as carved stone — travertine, not fashion-magazine. Warmer and more architectural than Bodoni, more credible for a medical practice than Italiana |
| **Editorial** | `Cormorant Garamond` (300, 300 italic, 400) | For pull quotes, testimonials, service overview paragraphs. The italic is the brand's only "soft" voice |
| **UI / Body** | `Jost` (200, 300, 400, 500) | Geometric humanist. Its circular bowls echo the sun/pool motif. Excellent at light weights, which is what makes interfaces feel unhurried |

Both Marcellus and Jost share an open, airy letterform — which is why they read as *space and light* rather than density. That is the typographic expression of the villa.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@200;300;400;500&display=swap" rel="stylesheet">
```

### 2.2 Scale

Base **17px**, ratio **1.25** (major third). A 1.25 ratio is deliberately calmer than the common 1.333 — it produces editorial restraint rather than punchy marketing contrast.

| Token | Size | Line height | Tracking | Use |
|---|---|---|---|---|
| `--t-2xs` | 11px | 1.4 | `+0.16em` | Credential small caps, overlines |
| `--t-xs` | 13px | 1.5 | `+0.04em` | Captions, legal, meta |
| `--t-sm` | 15px | 1.6 | `0` | Secondary UI, labels |
| `--t-base` | 17px | **1.65** | `0` | Body |
| `--t-lg` | 21px | 1.55 | `0` | Lead paragraph |
| `--t-xl` | 27px | 1.4 | `-0.01em` | Card titles, H4 |
| `--t-2xl` | 33px | 1.3 | `-0.01em` | H3 |
| `--t-3xl` | 42px | 1.2 | `-0.015em` | H2 |
| `--t-4xl` | 52px | 1.12 | `-0.02em` | H1 (interior pages) |
| `--t-5xl` | 65px | 1.08 | `-0.02em` | Hero |
| `--t-6xl` | 81px | 1.04 | `-0.025em` | Statement / display |

Body line-height of **1.65** is intentional and load-bearing. Generous leading is the single cheapest way to make a page feel unhurried.

### 2.3 Fluid display sizes

```css
--t-hero:      clamp(2.5rem, 1.4rem + 5.2vw, 4.0625rem);  /* 40 → 65 */
--t-statement: clamp(2rem,   1.1rem + 4.4vw, 5.0625rem);  /* 32 → 81 */
--t-h2:        clamp(1.75rem, 1.2rem + 2.4vw, 2.625rem);  /* 28 → 42 */
```

### 2.4 Rules

1. **Display face is never below 21px.** Marcellus at small sizes loses its apertures and looks generic.
2. **Small caps = `--t-2xs` + `+0.16em` tracking + uppercase.** This is the brand's credential/overline voice. Used for trust rows, category labels, section eyebrows.
3. **Body is Jost 300**, not 400. Light weight at 17px with 1.65 leading is the texture of the brand.
4. **Never center body copy.** Center display headings and single-line statements only. Centered paragraphs read as a spa flyer.
5. **Max measure 68 characters** (`max-width: 34em` at base size).
6. **Italic Cormorant is for human voice only** — testimonials, Libra's quotes, the mission statement. Never for UI.
7. **No letterspacing on display.** Negative tracking only, per the scale table.

---

## 3. Space

Base unit **4px**. The scale is deliberately gappy at the top end — resort-scale breathing room is a brand signal.

| Token | Value |
|---|---|
| `--s-1` | 4px |
| `--s-2` | 8px |
| `--s-3` | 12px |
| `--s-4` | 16px |
| `--s-5` | 24px |
| `--s-6` | 32px |
| `--s-7` | 48px |
| `--s-8` | 64px |
| `--s-9` | 96px |
| `--s-10` | 128px |
| `--s-11` | 160px |
| `--s-12` | 224px |

### Section rhythm

```css
--section-pad-y: clamp(5rem, 11vh, 10rem);   /* 80 → 160px */
--section-pad-y-lg: clamp(7rem, 16vh, 14rem); /* 112 → 224px — hero, statement */
--container: 1280px;
--container-narrow: 760px;  /* editorial measure */
--gutter: clamp(1.5rem, 4vw, 2.5rem);
```

### Grid

12 columns, `--gutter` gap, `--container` max.

**Villa variant (asymmetric):** For editorial sections use a **7/5** or **5/7** split rather than 6/6. Asymmetry reads as architectural composition; perfect halves read as a template. Alternate direction down the page.

---

## 4. Elevation — the pool surface model

**Do not use conventional drop shadows.** This aesthetic is about *illumination*, not objects casting shade onto paper. Elevation is expressed as **translucency, light-catching edges, and warm ambient glow** — the way a water surface or a pane of glass reads at golden hour.

The existing `public/assets/css/liquid-glass.css` is the right instinct. Formalize it against these levels.

| Level | Treatment |
|---|---|
| **0 — Flush** | No background change. Separated by hairline `1px solid var(--rule)` only |
| **1 — Surface** | `background: rgba(250,248,245,.62)`; `border: 1px solid rgba(189,174,169,.38)`; `backdrop-filter: blur(20px) saturate(108%)` |
| **2 — Raised** | Level 1 + `blur(28px)` + top inner highlight: `inset 0 1px 0 rgba(255,255,255,.55)` |
| **3 — Floating** | Level 2 + warm ambient: `0 24px 64px -24px rgba(60,43,37,.22), 0 0 48px -16px rgba(110,86,78,.10)` |
| **4 — Overlay** | Level 3 + scrim behind: `rgba(36,25,21,.72)` with `blur(12px)` |

Notice level 3's shadows are **warm brown at low opacity**, never neutral black. Black shadow on a nude palette instantly reads as dirt. Keep shadow opacity low — in a monochrome system a heavy shadow eats the value separation you depend on.

Dark-ground elevation values differ and are defined in `tokens.css` under `[data-ground="dark"]`.

### Radius

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 6px | Inputs, tags, small controls |
| `--r-md` | 12px | Cards, panels |
| `--r-lg` | 20px | Feature panels, media |
| `--r-pill` | 999px | Buttons, chips |
| `--r-arch` | `20rem 20rem 0 0` | **Signature.** Archway top on portrait media and feature images |

`--r-arch` is the system's most ownable geometric move: the arched niche found in Mediterranean and tropical-modern villa architecture. Use it on Libra's portrait, treatment-room photography, and service feature images. It does a lot of brand work for one line of CSS.

---

## 5. Motion & visual pacing

### 5.1 Tempo derivation

The source genre runs **120–124 BPM**. Deriving motion timing from that tempo is what will make the site feel like the reference material rather than merely look like it.

At 122 BPM:
- 1 beat ≈ **492ms** → rounded to **480ms** as the base duration
- 1 bar (4 beats) ≈ **1.97s** → **2s** for ambient cycles
- 8-bar phrase ≈ **15.7s** → **16s** for background video loops

| Token | Value | Derivation | Use |
|---|---|---|---|
| `--d-quick` | 240ms | ½ beat | Hover, focus, small state change |
| `--d-base` | 480ms | 1 beat | Default transition, reveal |
| `--d-slow` | 720ms | 1½ beats | Panel expand, large reveal |
| `--d-dissolve` | 1200ms | ~2½ beats | Hero crossfade, image transition |
| `--d-ambient` | 16s | 8 bars | Background loop, caustic cycle |
| `--stagger` | 90ms | hi-hat subdivision | Delay between sibling reveals |

### 5.2 Easing

```css
--ease-tide:    cubic-bezier(0.22, 1, 0.36, 1);   /* strong decel — "arriving" */
--ease-swell:   cubic-bezier(0.65, 0, 0.35, 1);   /* symmetric — loops, ambient */
--ease-surface: cubic-bezier(0.33, 1, 0.68, 1);   /* gentle out — hovers */
```

`--ease-tide` is the default. Its long deceleration tail is the motion equivalent of a reverb decay — things settle rather than stop.

### 5.3 Scroll pacing — the arrangement model

Structure pages like a deep house track. Alternate **drop** (full-bleed, dark, immersive, one statement) and **breakdown** (light, generous whitespace, dense information). Never stack two drops or two breakdowns.

Homepage arrangement:

| # | Type | Section | Ground |
|---|---|---|---|
| 1 | **Intro** | Hero — ambient loop, one line, one CTA | Espresso, full-bleed |
| 2 | Breakdown | Credential row + mission | Bone, airy |
| 3 | **Drop** | Six service categories as a composed grid | Espresso |
| 4 | Breakdown | Libra — arch portrait, 7/5 split | Sand |
| 5 | **Drop** | `Snatch Protocol™` statement | Ink, full-bleed, most dramatic |
| 6 | Breakdown | IV drip menus — three cards | Bone |
| 7 | Breakdown | Testimonials, Cormorant italic | Shell |
| 8 | **Outro** | Booking CTA + contact | Espresso, calm, resolved |

### 5.4 Reveal behavior

- Entry: `opacity 0 → 1`, `translateY(16px → 0)`, `--d-base`, `--ease-tide`
- Siblings stagger by `--stagger` (90ms), **capped at 6 items** — beyond that it feels slow, not deliberate
- Threshold: trigger at 18% visible
- **Fire once.** Nothing re-animates on scroll-up. Re-triggering reveals is restless, and restlessness is off-brand
- Images: crossfade only, `--d-dissolve`. No slide, no zoom-in-on-scroll, no parallax beyond 6% travel

### 5.5 Non-negotiable motion bans

- No bounce, no elastic, no overshoot easing
- No spinners — use a slow `--c-cacao` hairline progress sweep at `--d-slow`
- No auto-advancing carousels
- No scroll-jacking or snap-scroll
- No marquee / infinite ticker
- No count-up number animations
- No cursor-following elements

### 5.6 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Ambient video loops must also be replaced with their poster frame under this query. Still beautiful, just still.

---

## 6. The three signature atmosphere effects

These three effects carry the villa aesthetic. Everything else is restraint.

> **Monochrome rule:** every effect below must be achieved with **value, texture and light direction — never hue.** This is a harder discipline than the two-color version and a better result.

### 6.1 Caustics
The rippling light pattern water throws onto a surface — as pure luminance, untinted. A looping overlay on dark sections.
- `mix-blend-mode: soft-light`, `opacity: .09–.13`
- `--d-ambient` (16s) loop, `--ease-swell`, infinite
- Only on dark grounds. Never over text. Never above `z-index: 0`

### 6.2 Frond shadow
A static, soft-edged palm shadow falling across a plaster surface. In this palette the effect **is** the palette — espresso shadow on sand is literally two of the five swatches.
- Applied as a mask or multiply overlay on `--c-sand` / `--c-shell` sections
- `opacity: .07` maximum — it should be noticed second, not first
- Light direction must match the section's photography. Inconsistent shadow direction is the fastest way to look composited

### 6.3 Horizon gradient
A single-direction value ramp, used **only** as a full-section background. These are value ramps now, not color transitions — which is why they never look like a 2021 SaaS gradient.
```css
--grad-horizon: linear-gradient(170deg, #241915 0%, #3C2B25 38%, #6E564E 68%, #BDAEA9 88%, #E9DAD1 100%);
--grad-dusk:    linear-gradient(180deg, #241915 0%, #3C2B25 55%, #6E564E 100%);
--grad-plaster: linear-gradient(165deg, #FAF8F5 0%, #F4F1EB 45%, #EADFD5 100%);
--grad-sunwash: linear-gradient(200deg, #F4F1EB 0%, #EADFD5 52%, #E9DAD1 100%);
```
**Never** apply a gradient to a button, a text fill, a card, an icon, or a decorative blob. Gradients are environments, not objects. This is the rule that keeps the system from sliding into 2021 SaaS.

---

## 7. Implementation order

1. Drop in `tokens/tokens.css`, link it first in every page
2. Replace the 40+ hardcoded hex literals with custom properties — start with the five duplicate golds
3. Swap the font stack to the three approved families; delete the other seven `<link>` loads
4. Apply the type scale to headings, set body to Jost 300 / 17px / 1.65
5. Refactor `liquid-glass.css` to the five elevation levels
6. Add motion tokens and the reduced-motion block
7. Introduce `--r-arch` on Libra's portrait and treatment media
8. Add caustics to dark sections last — it is the garnish, not the meal
