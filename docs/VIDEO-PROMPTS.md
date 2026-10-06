---
title: LoveLi Care — Generative Video Prompt System
slug: lovelicare-video-prompts
project: lovelicare
type: reference
status: in_progress
created: 2026-10-05
updated: 2026-10-06
tags: [lovelicare, video, prompts, brand, higgsfield, veo, kling]
aliases: ["Video Prompts", "Brand Lock"]
related: ["[[lovelicare-hero-video-plan]]", "[[lovelicare-branding]]"]
---

# LoveLi Care — Generative Video Prompt System

Brand-locked prompts for Higgsfield, Veo, Runway, Kling, Sora, and any other
text-to-video model. Every prompt here is engineered from this site's own design
tokens and clinical copy, so output matches the brand instead of drifting into
generic "spa stock footage."

Source of truth: `public/assets/css/liquid-glass.css` (tokens),
`public/index.html` § Vitamin Cheat Sheet (clinical copy), `knowledge-base.js`.

---

## 1. The Brand Lock

Prepend this to **every** generative call. It is the contextual engineering —
without it, models default to white-marble-and-eucalyptus spa clichés that look
nothing like this brand.

```
BRAND LOCK — LoveLi Care Med Spa & Wellness Lounge, Towson MD.

Palette (strict):   Vagaro "Bare" warm monochrome nude.
                    espresso #3C2B25, ink #241915, cacao #6E564E, clay #A8938B,
                    greige #BDAEA9, shell #E9DAD1, sand #EADFD5, bone #F4F1EB,
                    mist #FAF8F5, caramel #C9A96E.
                    NO teal, NO green, NO blue, NO pink, NO amber — the whole
                    frame lives in the 14–24 degree hue band, caramel at 39.
                    Caramel is an ACCENT only — never a gold-flooded frame.
Ground (pick one):  HIGH-KEY for anything placed on the light hero or light
                    sections — bone and mist dominant, shadows no deeper than
                    cacao, airy and sunlit.
                    LOW-KEY for full-bleed dark placements — espresso falling
                    into ink, candlelit-clinical.
                    Never bright white studio; never a cold grade.
Light:              soft directional key from upper left, warm falloff into
                    espresso shadow. Warm white balance (~4800K), never cool.
Surface language:   liquid glass — frosted translucent panels, 1px warm-white
                    inner highlight on every edge, long soft shadows, condensation,
                    refraction through fluid.
Texture:            fine film grain, subtle vignette, shallow depth of field.
Camera:             slow, deliberate, locked or 1–3cm drift. Macro and close.
                    No whip pans, no drone sweeps, no handheld shake.
Pace:               unhurried. One idea per shot. Let the fluid move, not the camera.
Mood:               "Compassionate care, guided by science." Clinical credibility
                    with warmth. Luxury, not loud. Restraint over spectacle.
Typography (overlay only, added in post — do not ask the model to render text):
                    Italiana for the wordmark, Cormorant for headlines,
                    Open Sans for body, Montserrat for CTAs.
```

### Universal negative prompt

```
NEGATIVE: text, words, letters, watermark, logo, captions, subtitles,
UI, numbers, distorted hands, extra fingers, plastic skin, waxy skin,
oversaturated, neon, purple gradient, teal-and-orange grade, cool grade, green cast, HDR glow,
lens flare, stock-photo smile, white marble spa, bamboo, orchids, hot stones,
rolled towels, cucumber slices, candles, crowded frame, fast cuts, zoom bursts,
needles entering skin, blood, visible injection, medical waste, syringe close-up
```

> **Why "no text":** every current model renders typography unreliably. All
> on-screen copy is added in post with the real brand fonts. The prompts below
> deliberately leave clean negative space where that text lands.

---

## 2. Prompt skeleton

Models respond best to this order. Front-load subject and motion; the model
weights early tokens most heavily.

```
[SHOT TYPE] of [SUBJECT] — [SUBJECT MOTION] —
[CAMERA MOVE] — [LIGHT] — [PALETTE] — [TEXTURE/GRADE] — [MOOD]
```

### Model routing

| Model | Best for here | Notes |
|---|---|---|
| **Higgsfield** | Stylized hero shots, motion presets | Free plan = **10 credits**; a 5s 720p generation costs more. Not runnable today — see § 6. |
| **Veo 3** | Photoreal fluid/macro, native audio | Strongest for the IV-drip and liquid shots. |
| **Kling 2.x** | Slow luxury product motion | Good at glass, condensation, refraction. |
| **Runway Gen-4** | Image-to-video from a locked start frame | Best control: generate the still first, then animate it. |
| **Sora** | Longer continuous takes | Looser prompt adherence; reinforce the palette. |

**Recommended workflow:** generate a **still** first (Midjourney / Flux / Higgsfield
image / Nano Banana) using the image prompt, approve the frame, then feed that
still to an image-to-video model with the motion prompt. Far cheaper and far more
on-brand than text-to-video roulette.

---

## 3. The four launch films

Selected as the hero nutrient of each of the site's four wellness categories, so
the series covers four distinct emotional territories with no overlap. By raw
site frequency the order is Vitamin C and Glutathione (6 mentions each), B12 (5),
then Zinc / Vitamin D (4) — Magnesium is chosen over those two because it anchors
the Stress / Mood / Sleep category, which otherwise has no film.

Each film: **15s**, three 5s shots. Copy in quotes is lifted or tightened from the
site's own Vitamin Cheat Sheet — it is clinically accurate and already approved.

---

### FILM 1 — GLUTATHIONE · "The Master Antioxidant"

**Territory:** Detox & clarity. **Emotional promise:** lightness, clean slate.
**Site copy:** "Master antioxidant. Improves skin clarity, brightening, and
pigmentation issues. Detoxifies at cellular level."

**Shot 1 — the reveal (0–5s)**
```
Extreme macro of a single luminous pearl-white droplet suspended in espresso
fluid, slowly rotating, catching a thin champagne-gold rim light along its edge —
camera holds absolutely still as the droplet drifts upward through frame —
soft directional key from upper left, espresso falloff into ink —
palette strictly espresso #3C2B25 and caramel #C9A96E on bone
highlights — fine film grain, shallow depth of field, subtle vignette —
serene, clinical, weightless.
```

**Shot 2 — the mechanism (5–10s)**
```
Macro of frosted liquid-glass panels layered in depth, a clear fluid threading
between them and leaving every surface brighter as it passes — camera drifts
2cm forward, nothing else moves — low-key light from upper left, warm white inner
highlight on each glass edge — espresso and caramel only — film grain,
long soft shadows — purifying, quiet, precise.
```

**Shot 3 — the human beat (10–15s)**
```
Close profile of a woman's face in three-quarter light, eyes closed, calm, skin
luminous and natural with visible real texture — she inhales once, slowly —
camera locked, no movement — soft key from upper left, espresso background
falling to shadow, champagne gold rim along the cheekbone — warm cream skin
tones, film grain, shallow depth of field — restored, unhurried, serene.
Negative space on the right third for typography.
```

**Post:** Cormorant headline right third — *"Clarity, at the cellular level."*
Montserrat CTA — **BOOK YOUR IV PROTOCOL**.
**VO (optional):** "Glutathione. The body's master antioxidant — and the reason
your skin remembers how to glow."

---

### FILM 2 — VITAMIN C · "The Collagen Architect"

**Territory:** Skin, structure, radiance. **Emotional promise:** firmness, bounce.
**Site copy:** "Required for collagen synthesis. Helps skin elasticity and wound
healing. Antioxidant protecting against UV damage."

**Shot 1 — the reveal (0–5s)**
```
Extreme macro of a saturated golden-amber fluid blooming into warm cream liquid
in slow motion, tendrils unfurling like ink in water — camera completely still —
directional key from upper left, espresso surround — caramel #C9A96E
blooming through bone #F4F1EB against espresso #3C2B25 — film grain,
shallow depth of field, soft vignette — vital, luminous, alive.
```

**Shot 2 — the mechanism (5–10s)**
```
Abstract macro of fine translucent golden filaments weaving into a lattice,
tightening and lifting as they interlock — camera holds, the lattice rises
slightly toward it — low-key light raking from upper left, warm white edge
highlight — champagne gold on espresso, warm cream accents — film grain,
long soft shadows — structural, precise, strengthening.
```

**Shot 3 — the human beat (10–15s)**
```
Close-up of a woman's cheekbone and jawline in soft raking light, skin natural
with real pores and fine texture, faint gold sheen along the high plane — the
smallest lift at the corner of the mouth — camera locked — key from upper left,
espresso shadow side, warm cream highlight — film grain, shallow depth of field —
confident, radiant, unposed. Clean negative space upper left for typography.
```

**Post:** Cormorant — *"Collagen, rebuilt."* Montserrat CTA — **EXPLORE IV THERAPY**.
**VO:** "Vitamin C. Not a glow filter — the architecture underneath it."

---

### FILM 3 — B12 METHYLCOBALAMIN · "The Switch"

**Territory:** Energy, metabolism, momentum. **Emotional promise:** ignition.
**Site copy:** "Boosts energy production, supports metabolism, and enhances fat
mobilization when paired with MIC."

**Shot 1 — the reveal (0–5s)**
```
Extreme macro of a vivid magenta-rose fluid curling through espresso liquid in
slow motion, dense and saturated, leaving a luminous trail — camera still —
hard-edged directional key from upper left, espresso falling to black —
blush rose and champagne gold against espresso #3C2B25 — film grain, shallow
depth of field — electric but controlled, potent.
```

**Shot 2 — the mechanism (5–10s)**
```
Macro of a dark espresso field in which small points of warm caramel light ignite one
after another in a slow spreading cascade, each bloom soft-edged — camera pulls
back 3cm, revealing more of the field — low-key, light sourced from the points
themselves — champagne gold on espresso only — film grain, subtle vignette —
awakening, cascading, deliberate.
```

**Shot 3 — the human beat (10–15s)**
```
Medium close-up of a woman opening her eyes and lifting her chin slightly, calm
and awake rather than excited, natural skin texture, no makeup gloss —
camera locked, no movement — soft key upper left, espresso background,
champagne gold rim light on hair and shoulder — warm cream skin tones, film
grain, shallow depth of field — alert, grounded, capable.
Negative space on the left for typography.
```

**Post:** Cormorant — *"Energy you don't have to borrow."*
Montserrat CTA — **BUILD YOUR DRIP**.
**VO:** "B12. Methylcobalamin — the active form. Your metabolism, switched back on."

---

### FILM 4 — MAGNESIUM · "The Quiet"

**Territory:** Stress, mood, sleep. **Emotional promise:** descent into calm.
**Site copy:** "Calms nervous system via GABA receptors. Deficiency linked to
anxiety, irritability, and sleep problems. Supports melatonin."

**Shot 1 — the reveal (0–5s)**
```
Extreme macro of a pale translucent mineral crystal slowly dissolving in still
espresso water, edges softening, fine threads drifting downward — camera
absolutely still — single soft key from upper left, deep shadow everywhere else —
warm cream and champagne gold against espresso #3C2B25 and ink #241915 —
heavy film grain, strong vignette, shallow depth of field — hushed, slow, heavy.
```

**Shot 2 — the mechanism (5–10s)**
```
Macro of a taut rippling liquid surface in espresso gradually going glass-flat
and still, the last ring spreading out and vanishing — camera holds dead still —
low raking light from upper left catching the final ripple in champagne gold —
espresso with a single gold highlight — film grain, deep vignette —
tension releasing, settling, quiet.
```

**Shot 3 — the human beat (10–15s)**
```
Close-up of a woman's face at rest on a warm cream linen surface, eyes closed,
shoulders dropped, breathing slow and even, natural skin texture — a single
slow exhale, nothing else moves — camera locked — very soft key from upper left,
espresso shadow filling the frame, faint gold warmth on the temple —
film grain, shallow depth of field, strong vignette — deeply calm, safe, still.
Negative space across the top for typography.
```

**Post:** Cormorant — *"The nervous system, finally off duty."*
Montserrat CTA — **FIND YOUR PROTOCOL**.
**VO:** "Magnesium. Because rest isn't a luxury — it's a deficiency you can correct."

---

## 4. Compliance guardrails

This is a medical spa. Generated marketing is regulated advertising, and these
constraints are baked into the prompts above — keep them in any new prompt.

- **No injection imagery.** Needles, syringes entering skin, and IV cannulation
  are restricted on Meta and TikTok ad platforms and will get an ad rejected.
  The films above show fluid and outcome, never the stick.
- **No before/after.** Before-and-after pairs are prohibited or heavily limited
  for medical aesthetics on most ad platforms and in several state regulations.
- **No guaranteed outcomes.** Say what a nutrient *does* ("required for collagen
  synthesis"), never what a patient *will get* ("erases wrinkles"). Every line of
  copy above is drawn from the site's existing clinical descriptions for exactly
  this reason.
- **No diagnosis or treatment claims.** IV nutrition is wellness support, not a
  treatment for disease. Avoid "treats," "cures," "prevents."
- **Keep skin real.** Prompts specify visible pores and natural texture. Airbrushed
  AI skin reads as a false result claim and damages clinical credibility.
- **Disclose AI generation** where required by platform policy, and never imply a
  generated person is an actual LoveLi Care patient.

---

## 5. Adapting the system

To write a prompt for any new service, fill this template:

```
[BRAND LOCK]

Shot 1 — the reveal:    the substance itself, macro, in fluid
Shot 2 — the mechanism: an abstract visual metaphor for how it works
Shot 3 — the human beat: a calm face, locked camera, negative space for type

[UNIVERSAL NEGATIVE PROMPT]
```

The three-shot spine — *substance → mechanism → person* — is what makes the four
films read as one campaign. Keep it. Vary the fluid color and the emotional
register, never the structure, the camera discipline, or the palette.

---

## 6. Credits — current blocker

`higgsfield balance` reports **10 credits on the free plan**. A single 5s 720p
generation costs well more than that, so nothing can be generated on Higgsfield
today. Options:

1. Upgrade the Higgsfield plan, then run the prompts above as-is.
2. Run them on another model — Veo or Kling are better suited to the fluid macro
   work anyway (§ 2 routing table).
3. Generate stills first (cheap), approve the frames, then animate only the
   approved ones. Lowest spend, highest control.

An alternative that costs no model credits at all: the `/product-launch-video`
HyperFrames pipeline renders video locally from HTML compositions using the real
brand fonts and tokens. It produces motion-graphics films rather than photoreal
footage — a good fit for the typographic, liquid-glass side of this brand.
