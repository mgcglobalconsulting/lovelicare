# LoveLi Care — Image Generation Prompts

For Higgsfield (`generate_image`), Midjourney, or any diffusion model.
**Only 3 brand images exist today.** Photography is the single biggest blocker to this aesthetic landing.

---

## The shared style suffix

Append to **every** image prompt. This is what holds the set together.

```
STYLE: warm monochrome nude palette only — deep espresso brown #3C2B25,
cacao #6E564E, warm greige #BDAEA9, blush shell #E9DAD1, bone #F4F1EB.
Strictly NO teal, NO blue, NO green, NO pink, NO saturated color anywhere.
Every neutral leans warm red-orange.
LIGHT: single low-angle warm directional key from frame left, golden hour,
long soft shadows with visible falloff, mild atmospheric haze, gentle bloom
on highlights. Shadows deep but OPEN — detail retained, never crushed black.
MATERIALS: travertine, limewash plaster, teak, raw linen, unglazed ceramic,
brushed metal.
CAMERA: 50mm or 85mm, f/2.0, shallow depth of field, eye level, wide calm
framing, generous negative space, editorial composition.
FINISH: natural film grain, true skin texture, no plastic retouching,
no HDR, no vignette, no lens flare.
NEGATIVE: no palm trees as subject, no hibiscus, no monstera pattern, no
tiki, no thatch, no bamboo, no shells, no starfish, no flamingo, no cocktail,
no beach umbrella, no turquoise water, no neon, no text, no watermark, no
logo, no medical waste, no syringes, no needles, no blood, no gore,
no stock-photo smiling, no clip art, no 3D render look.
```

---

## Tier 1 — ship-blocking

### 1.1 Hero ambient — treatment lounge
```
Interior of a boutique medical spa treatment lounge at golden hour. A single
reclined leather-and-linen treatment chair beside a tall window. Limewash
plaster walls. Travertine floor. One real potted plant, specific and
unstyled, in soft focus at frame edge. Long window light rakes across the
wall. Empty, quiet, unoccupied. Wide shot with deep negative space in the
upper third for headline text.
+ [STYLE SUFFIX]
```

### 1.2 Reception / arrival
```
Entry vestibule of a small luxury medical practice. Low teak console, a
single unglazed ceramic vessel, folded raw linen. Warm light pooling on a
plaster wall from an unseen window. No signage, no logo, no people. Calm,
restrained, expensive.
+ [STYLE SUFFIX]
```

### 1.3 Plaster + frond shadow (for the `.frond-shadow` overlay)
```
Extreme close detail of a limewash plaster wall with the soft-edged shadow
of palm fronds falling diagonally across it at golden hour. The shadow is
the subject — the plants themselves are entirely out of frame. Soft shadow
edges, warm bounce light in the shadow areas. Flat-on, no perspective.
Seamless and tileable.
+ [STYLE SUFFIX]
```
> Export this as a 2000px PNG and wire it to `--frond-src`. Cap opacity at `.07`.

### 1.4 Water caustics (for the `.caustics` overlay)
```
Rippling water caustic light patterns cast on a flat warm sandstone surface.
Pure luminance study — bright caustic lines over warm neutral stone, NO blue
or turquoise tint whatsoever. Shot straight down. Seamless, tileable,
high contrast between light lines and shadow.
+ [STYLE SUFFIX]
```
> Export greyscale-warm. In a monochrome system caustics must be **luminance only** — any aqua tint instantly breaks the palette.

### 1.5 Archway portrait environment
```
A woman in her 30s-40s seated beside a tall arched window in a warm plaster
room, three-quarter view, relaxed and composed, looking slightly off camera.
Natural makeup, visible real skin texture. Soft warm directional window light
from frame left. Neutral linen clothing. Environment visible but thrown out
of focus behind her. Vertical portrait orientation with headroom.
+ [STYLE SUFFIX]
```
> Composition must survive the `--r-arch` crop — fully rounded top, square bottom. Keep the subject's head well below the arch apex.

---

## Tier 2 — service imagery

Use **environments and materials, never procedures.** No needles, no syringes, no injection close-ups, no before/after. Medical imagery erodes the luxury register and raises compliance questions.

### 2.1 Refine (Medical Aesthetics) — brightest
```
High-key morning light across a clean plaster vanity surface. A single
unglazed ceramic bowl, a folded white linen cloth, a smooth river stone.
Mirror edge catching light at frame right. Minimal, surgical in its
emptiness, luminous.
+ [STYLE SUFFIX]
```

### 2.2 Sculpt (Snatch Protocol™) — most architectural
```
Abstract architectural study: a curved plaster wall meeting a flat one, lit
by strong low directional light creating a hard-edged shadow across the
curve. Pure form, light and shadow. No people, no objects. Deep but open
shadow. Monumental and quiet.
+ [STYLE SUFFIX]
```

### 2.3 Optimize (Weight Management) — clear and daylit
```
Overhead flat lay on warm travertine: a glass carafe of water, a small teak
bowl, a folded linen napkin, a plain notebook. Even bright daylight, soft
shadows. Organized, clear, uncluttered.
+ [STYLE SUFFIX]
```

### 2.4 Restore (IV Wellness) — deepest, most immersive
```
A reclined lounge chair in a dim warm room, lit by a single low lantern.
Folded linen throw across the arm. Deep shadow filling the corners of the
frame, warm light pooling only on the chair. Restful, enveloping,
unoccupied. No medical equipment.
+ [STYLE SUFFIX]
```

### 2.5 Nourish (Nutrition) — warmest, most domestic
```
A worn teak table in warm late-afternoon light. Real whole food, simply
arranged and unstyled — a few figs, a bowl of greens, a ceramic cup. Long
shadows across the grain of the wood. Domestic, honest, inviting.
+ [STYLE SUFFIX]
```

### 2.6 Concierge Medical — most restrained
```
A plain plaster wall, a simple teak chair, and a window casting one clean
rectangle of light on the floor. Almost nothing in frame. Efficient, calm,
respectful of time.
+ [STYLE SUFFIX]
```

---

## Tier 3 — texture library

Shoot or generate flat, tileable, at 2000px+. These power backgrounds and overlays.

| Asset | Prompt core |
|---|---|
| `tex-plaster.jpg` | Flat-on limewash plaster, subtle trowel variation, warm bone tone, raking light |
| `tex-travertine.jpg` | Travertine slab surface, natural pitting, warm sand tone, even light |
| `tex-linen.jpg` | Raw linen weave, macro, warm shell tone, soft shadow in the weave |
| `tex-teak.jpg` | Teak wood grain, warm cacao tone, low raking light |
| `tex-ceramic.jpg` | Unglazed ceramic surface detail, matte, warm greige |

---

## Running these on Higgsfield

```
generate_image(
  prompt: "<scene> + <STYLE SUFFIX>",
  aspect_ratio: "16:9"   // hero / ambient
                "3:4"    // portraits, archway crops
                "1:1"    // textures, tileable overlays
)
```

**Batching:** use `generate_image_batch` for the Tier 2 set — six scenes sharing one style suffix is exactly the case it is built for. Generate 3–4 variations per scene; consistency across the set matters more than any single image.

**Upscale** finals with `upscale_image` before export. **Remove background** (`remove_background`) only for product shots, never for environments.

---

## Acceptance checklist

Before any generated image enters the repo:

- [ ] No color outside the Bare palette — check for stray teal/blue in shadows especially
- [ ] Light comes from **one** direction, and that direction matches neighboring images on the same page
- [ ] Shadows are open, not crushed to pure black
- [ ] Skin texture is real; no plastic retouching
- [ ] Zero banned iconography (§ style suffix negatives)
- [ ] Composition leaves negative space where text will sit
- [ ] Exported ≤ 400KB as WebP, with a JPG fallback
- [ ] Filename descriptive: `hero-lounge-golden.webp`, not `img_01.webp`
- [ ] Meaningful `alt` text written — these are real environments, describe them
