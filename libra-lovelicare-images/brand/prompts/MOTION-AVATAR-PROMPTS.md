# LoveLi Care — Motion, Video & Avatar Prompts

Tooling: **Higgsfield** (video) · **Hyperframes** (programmatic motion graphics) · **HeyGen** (avatar video)

---

## ⚠️ READ FIRST — Avatar & AI disclosure compliance

LoveLi Care is a **HIPAA-compliant medical practice** and Libra Robertson is a **licensed, board-certified NP-CRNP**. AI-generated likeness and AI-generated medical content carry real exposure here. These are not stylistic preferences.

**Hard rules:**

1. **Never** generate a synthetic Libra delivering clinical advice, treatment recommendations, dosing, or outcome claims. An AI avatar may deliver *hospitality and logistics* content only — welcome, hours, parking, what to bring, how to book.
2. **Any** synthetic likeness of Libra requires her written consent on file before generation, and visible on-screen disclosure (e.g. "AI-generated presenter") plus a line in the video description.
3. **Preferred path: do not synthesize Libra at all.** Use HeyGen's generic stock avatars for faceless logistics content, and film Libra herself — even on a phone — for anything where her authority is the point. A real 30-second clip of the actual provider outperforms a polished synthetic one for trust, which is the entire thing this brand sells.
4. Never imply an AI-generated patient is a real client. No synthetic testimonials, ever. Maryland and FTC rules on testimonial substantiation apply.
5. No before/after generation. Synthetic results imagery for a medical aesthetics practice is the highest-risk category available.
6. Run any script that touches a service claim past Libra before publishing.

> If in doubt: film it, don't generate it. Generate environments, film humans.

---

## 1. Higgsfield — ambient video

All loops are **16 seconds** (an 8-bar phrase at 122 BPM), seamless, silent, and must hold up under a heavy scrim with headline text over them.

### Shared video style suffix
```
Warm monochrome nude palette only — espresso #3C2B25, cacao #6E564E,
greige #BDAEA9, shell #E9DAD1, bone #F4F1EB. NO teal, NO blue, NO green,
NO saturated color. Golden-hour directional light from one low side angle,
long soft shadows, mild haze, gentle bloom. Shadows deep but open.
Camera motion EXTREMELY slow and minimal — a barely perceptible drift or
push, under 5% travel across the whole clip. Locked-off is acceptable and
often better. No whip pans, no orbits, no crash zooms, no drone reveals,
no speed ramps, no lens flare, no text, no people unless specified.
Natural film grain. Seamless loop.
```

### 1.1 Hero loop — primary
```
Static wide shot of a sunlit boutique spa treatment lounge. The ONLY motion
is slow-drifting dust in the light beam and the faint movement of a shadow
across the plaster wall. Treatment chair, linen, travertine floor. Empty.
Negative space in the upper third for a headline.
+ [VIDEO STYLE SUFFIX]
```

### 1.2 Caustic surface loop
```
Slow rippling water caustics playing across a warm sandstone surface, shot
straight down. Pure luminance — no blue or turquoise tint at all. Gentle
continuous ripple. Seamless loop.
+ [VIDEO STYLE SUFFIX]
```
> This is the source for the `.caustics` overlay. Export as a looping WebM, blend `soft-light`, opacity `.11`.

### 1.3 Frond shadow loop
```
The soft shadow of palm fronds moving almost imperceptibly on a limewash
plaster wall in a light breeze. The plants are entirely out of frame — the
shadow is the subject. Flat-on. Very slow motion. Seamless loop.
+ [VIDEO STYLE SUFFIX]
```

### 1.4 Snatch Protocol™ statement loop
```
Abstract architectural form: strong low directional light crossing a curved
plaster wall, the hard shadow edge creeping slowly across the curve over the
duration of the clip. No people, no objects. Monumental, quiet, high
contrast but with open shadow detail.
+ [VIDEO STYLE SUFFIX]
```

### Running them
```
generate_video(
  prompt: "<scene> + <VIDEO STYLE SUFFIX>",
  aspect_ratio: "16:9",
  duration: 16
)
```
Use `generate_video_batch` for the set. `upscale_video` on finals.

### Web delivery rules
- Export WebM (VP9) + MP4 (H.264) fallback, **≤ 2.5 MB** per loop
- `muted autoplay loop playsinline preload="metadata"`
- Always supply a `poster` frame
- **Under `prefers-reduced-motion`, swap the video for its poster frame** — this is required, not optional
- Never autoplay with sound. Never add an audio track to a hero loop

---

## 2. Hyperframes — programmatic motion graphics

For deterministic, token-driven motion that must match the design system exactly. All timings come from `tokens/tokens.css` — do not invent new durations.

### Shared constraints
```
Palette: ONLY #3C2B25 #6E564E #BDAEA9 #E9DAD1 #F4F1EB #241915 #EADFD5
         #A8938B #FAF8F5. No other color may appear in any frame.
Type:    Marcellus (display), Jost 300 (body), Jost 500 uppercase 0.16em
         letterspacing (overlines).
Timing:  base 480ms, quick 240ms, slow 720ms, dissolve 1200ms, stagger 90ms,
         ambient loop 16s. Derived from 122 BPM — do not deviate.
Easing:  cubic-bezier(0.22, 1, 0.36, 1) default.
Banned:  bounce, elastic, overshoot, spin, confetti, particle bursts,
         count-up numbers, progress bars, emoji, sound effects.
Motion is slow, settled and deliberate. Things arrive and rest.
```

### 2.1 Service category reveal
```
Six service cards entering a 3x2 grid. Each card: opacity 0 -> 1 and
translateY 16px -> 0 over 480ms with cubic-bezier(0.22,1,0.36,1), staggered
90ms apart, capped at 6. Fires once. Card surfaces are translucent with a
1px warm hairline border. Category name in Marcellus, body in Jost 300.
Ground: espresso #3C2B25.
```

### 2.2 Snatch Protocol™ title build
```
"Snatch Protocol™" in Marcellus on an ink #241915 ground. Letters fade up as
a single block over 1200ms with a slow-decelerating ease — no per-letter
stagger, no typewriter, no scale. A hairline rule in cacao #6E564E draws
beneath it from center outward over 720ms, beginning 400ms after the title
settles. Nothing else moves. Ends on a 4-second hold.
```

### 2.3 IV drip menu comparison
```
Three drip cards — Build Your Glow, Fat Burn & Energy, Immunity Fortress.
Each reveals its nutrient list as a staggered 90ms cascade of hairline rows.
Rows are text only: nutrient name in Jost 400, mechanism in Jost 300. No
icons, no bars, no charts, no percentages. Ground: bone #F4F1EB.
```

### 2.4 Social cut — 9:16
```
Vertical 1080x1920. Ambient environment footage with a heavy espresso scrim.
One line of Marcellus display type, centered, entering over 480ms. One
overline above it in Jost 500 uppercase. Hold 3 seconds. Cut to a bone card
with the booking line and the Vagaro URL. Total 8 seconds. No music sting,
no swipe transitions, no captions burned in unless the clip has speech.
```

---

## 3. HeyGen — avatar video

**Re-read the compliance block at the top of this file before using any of these.**

### 3.1 Approved use — logistics only, generic stock avatar
```
Avatar:     HeyGen stock avatar. NOT a likeness of Libra Robertson.
Background: Replace with a LoveLi Care environment still (warm plaster /
            treatment lounge). Blur to f/2.0 equivalent.
Framing:    Medium close, eye level, subject slightly off-center left with
            negative space right for lower-third type.
Lower third: Jost 500, 11px equivalent, uppercase, 0.16em letterspacing,
            bone #F4F1EB on a translucent espresso bar. No logo bug, no icons.
Disclosure: Persistent on-screen label "AI-generated presenter" in the lower
            right for the full duration. Also state it in the description.
Tone:       Calm, unhurried, warm. No exclamation marks in the script.
```

**Script — "Preparing for your visit" (approved topic):**
```
Before your appointment at LoveLi Care, a few simple things.

Plan to arrive ten minutes early so you can complete your intake forms
without rushing.

Drink plenty of water beforehand — especially if you're coming in for IV
therapy or a body treatment.

Bring a valid photo ID. If you're here for an MMCC appointment, bring your
patient registry documents as well.

And have a current list of your medications, supplements, and any known
allergies ready to share.

That's everything. We'll see you soon.
```

**Other approved topics:** hours and location · parking and suite access · how to book and reschedule · the 24-hour cancellation policy · what a complimentary consultation involves *(process only — never content)* · general aftercare reminders already published on the site.

### 3.2 Prohibited topics — never scripted for an avatar
Treatment recommendations · dosing · nutrient or drip selection for an individual · expected results or timelines · pricing promises · MMCC eligibility determinations · anything comparing LoveLi Care to another provider · anything a patient could reasonably act on medically.

### 3.3 Preferred alternative — film Libra
For anything where authority is the point, shoot real footage:

```
Setup:   Libra seated beside a window, three-quarter to camera. 50mm
         equivalent, f/2.0, eye level, subject frame-left with negative
         space right. Single warm key from the window, no fill flash, no
         ring light. Warm plaster or the treatment lounge behind, thrown
         out of focus.
Wardrobe: Neutral linen or a clean clinical coat. Nothing with a pattern.
Audio:   Lav mic. Room tone recorded separately.
Length:  30-60 seconds per topic.
Grade:   Warm monochrome to match the Bare palette. Lift shadows slightly —
         keep them open, never crushed.
```
A slightly imperfect real clip of the actual provider beats a flawless synthetic one. Trust is the product.

---

## 4. Asset budget per page

| Page | Ambient loop | Stills | Avatar/filmed |
|---|---|---|---|
| Homepage | 1 (hero) | 4–6 | optional 1 filmed intro |
| Service detail | 0 | 2–3 | 0 |
| Snatch Protocol™ | 1 (statement) | 2 | 0 |
| About | 0 | 3 | 1 filmed, Libra |
| Booking | 0 | 0 | 0 |

**One ambient loop per page, maximum.** Two competing loops on one page destroys the calm the entire system is built to produce.
