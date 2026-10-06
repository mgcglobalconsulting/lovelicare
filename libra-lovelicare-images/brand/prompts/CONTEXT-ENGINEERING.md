# LoveLi Care — Context Engineering Prompts

Paste-ready prompt blocks for building the site at `/Users/markcartwright/Desktop/lovelicare/`.
Purpose: carry the design system into every coding session without re-explaining it.

---

## 0. The session primer

Paste at the **start of any Claude Code session** touching this project.

```
You are working on LoveLi Care Med Spa & Wellness Lounge
(/Users/markcartwright/Desktop/lovelicare/). Stay inside this directory.

Read these first and treat them as binding:
- brand/BRANDING.md          (authoritative — wins over any other file)
- brand/tokens/tokens.css    (the only legal source of color and spacing)

Non-negotiables:
1. PALETTE: Vagaro "Bare" warm monochrome ONLY. #3C2B25 #6E564E #BDAEA9
   #E9DAD1 #F4F1EB #241915 #EADFD5 #A8938B #FAF8F5. No teal, no blue, no
   green, no pink. Never introduce a hex literal — use the custom property.
2. TYPE: three families only — Marcellus (display 21px+), Cormorant Garamond
   (editorial/italic), Jost (body, weight 300, 17px, line-height 1.65).
   If you see Bodoni Moda, Italiana, Playfair, Inter, Mulish, Montserrat or
   Open Sans, remove them.
3. CONTRAST: #BDAEA9 and #A8938B FAIL as text on light grounds. They are
   hairlines and structure only. #C9A96E fails as text anywhere on light.
4. ELEVATION: translucency + 1px warm hairline + backdrop blur. Never a
   conventional drop shadow. Shadows warm brown at low opacity, never black.
5. MOTION: durations from tokens.css only (240/480/720/1200ms, 16s ambient,
   90ms stagger). Default easing cubic-bezier(0.22,1,0.36,1). No bounce,
   no spinners, no carousels, no scroll-jacking, no count-ups.
6. Always include the prefers-reduced-motion block.
7. No emoji anywhere in the UI. No exclamation marks in copy.
8. ASK ME before any git push or vercel deploy.

Tone of the product: unhurried, clinical, private. Aman resort, not a
Corona commercial.
```

---

## 1. Migrating an existing page

```
Refactor /Users/markcartwright/Desktop/lovelicare/public/<FILE>.html to the
brand design system.

Steps, in order:
1. Link brand/tokens/tokens.css FIRST, before any other stylesheet.
2. Replace every hardcoded hex with the matching custom property. The file
   currently contains retired values — map them:
     #2F4F4F #0F2020 #1A3232 #1A2E2E #173b35 #0D2020 #0f1a14  -> espresso/ink
     #FFF9F5 #F5EFE8 #FCF9F4 #F8F2EB                          -> bone/mist
     #E8DCCB #EFE6D8 #EDE4D8 #E0D5C5 #DDD0BC #e8e0d0          -> sand/shell
     #C9A96E #D4B87A #D9BE86 #d5ad71 #e0bd84 #B8935A          -> cacao or clay
     #A8D5BA #B3E5FC #F8BBD0 #FFCDD2 #FFB300 #FFE082          -> DELETE, replace
   If a value has no sensible mapping, ask me rather than guessing.
3. Collapse the font <link> tags down to the single approved Google Fonts
   request in BRANDING.md § 4. Remove all other families.
4. Apply the type scale: h1 var(--t-hero), h2 var(--t-h2), h3 var(--t-2xl),
   body var(--t-base)/var(--lh-body) at weight 300.
5. Convert card and panel shadows to the .e1/.e2/.e3 elevation classes.
6. Add the prefers-reduced-motion block if absent.

Report every value you could not map confidently. Do not invent colors.
```

---

## 2. Building a new section

```
Build a <SECTION NAME> section for the LoveLi Care site.

Constraints:
- Ground: <bone | sand | shell | espresso | ink>. If it's a dark "drop"
  section, set data-ground="dark" on the section element — the tokens handle
  the rest.
- Use .container (1280px) or .container-narrow (760px) for editorial text.
- Vertical padding: var(--section-pad-y). Hero/statement: --section-pad-y-lg.
- If two columns, use .split-7-5 or .split-5-7 — never a 50/50 split.
- Paragraph max-width is var(--measure). Never center body copy.
- Entry animation: .reveal class, fires once, 90ms stagger, max 6 siblings.
- Semantic HTML. One h1 per page. Headings must not skip levels.
- Interactive elements need visible :focus-visible — the token handles it.

Follow the page arrangement model in DESIGN-SYSTEM.md § 5.3: alternate dark
"drop" sections with light "breakdown" sections. Never stack two of the same.
```

---

## 3. Component build

```
Build the <COMPONENT> component for LoveLi Care.

Specify all states: default, hover, focus-visible, active, disabled, and
loading if applicable.

Rules:
- Primary button: solid var(--c-espresso), bone text, --r-pill radius,
  Jost 500. Hover shifts to var(--c-cacao) over --d-quick. In this monochrome
  system the primary action is the DARKEST VALUE, not a hue.
- Secondary button: transparent, 1px var(--c-clay) border, espresso text.
- Inputs: var(--c-mist) background, 1px var(--c-greige) border, --r-sm.
  Placeholder in var(--c-clay) — and because clay fails contrast, every input
  MUST also carry a persistent visible label. Never label-by-placeholder.
- Cards: .e1 or .e2. Radius --r-md. Media inside cards may use --r-arch.
- No icon libraries. If an icon is unavoidable, a 1px stroke in currentColor.
- Transitions: --d-quick with --ease-surface for hover; --d-base with
  --ease-tide for entry.
- Minimum 44x44px touch target.

Write it as plain HTML + CSS using the custom properties. No framework
unless I say so.
```

---

## 4. Copy generation

```
Write copy for <PAGE/SECTION> on the LoveLi Care site.

Source of truth: /Users/markcartwright/Desktop/lovelicare/knowledge-base.js.
Do not invent services, prices, nutrients, credentials or claims that are not
in that file.

Voice:
- Short declaratives. Second person, present tense.
- Name the mechanism when explaining a treatment — specificity is the
  differentiator (e.g. "Biotin supports keratin production").
- Never promise an outcome. Write copy that does not need a disclaimer to
  rescue it.
- NO exclamation marks. No emoji.
- Use: nurture, restore, elevate, balance, refine, sculpt, optimize,
  replenish, considered, unhurried, clinical, luminous, composed.
- Avoid: snatched (except in "Snatch Protocol™"), slay, obsessed, bestie,
  girlie, miracle, magic, secret, hack, anti-aging, flawless, perfect.
- No urgency, no scarcity, no countdowns, no "limited spots".

Always preserve: "No pressure — just personalized guidance."
Always render the product mark as "Snatch Protocol™" with the symbol.
```

---

## 5. Pre-ship review

```
Review <FILE> against the LoveLi Care design system and report violations.
Do not fix anything yet — list findings first with file:line references.

Check:
[ ] Any hex literal not present in brand/tokens/tokens.css
[ ] Any retired color (teal, aqua, mint, pink, amber — BRANDING.md § 1.4)
[ ] Any font family outside Marcellus / Cormorant Garamond / Jost
[ ] Text set in #BDAEA9 or #A8938B on a light ground (contrast failure)
[ ] Text set in #C9A96E on any light ground (2.0:1 — always a failure)
[ ] Conventional drop shadows instead of the elevation classes
[ ] Gradients applied to buttons, text, icons, cards or blobs
      (gradients are ENVIRONMENTS only)
[ ] Motion durations not drawn from the token set
[ ] Missing prefers-reduced-motion block
[ ] Autoplaying video without muted/playsinline/poster
[ ] Inputs relying on placeholder as the only label
[ ] Missing or non-descriptive alt text
[ ] Heading levels skipped
[ ] Emoji or exclamation marks in UI copy
[ ] Gold exceeding 3% of the screen
[ ] Two ambient video loops on one page
```

---

## 6. Accessibility pass

```
Audit <FILE> for accessibility. This is a medical practice site — the
standard is WCAG 2.1 AA, and the real-world test is a phone screen in a
sunlit treatment room.

The known risk in this palette is mid-tone text. Verify every text/background
pair against BRANDING.md § 1.6 and flag anything using greige #BDAEA9 or
clay #A8938B as a foreground on a light ground.

Also check: focus-visible on every interactive element, 44px touch targets,
form labels present and associated, logical heading order, descriptive link
text (no "click here"), alt text on all meaningful images, color never the
sole carrier of meaning, and prefers-reduced-motion honored including video.
```

---

## 7. Chatbot UI alignment

```
The existing chatbot at public/chatbot.html uses a gold/teal glass-morphism
treatment. Migrate it to the Bare palette.

- Assistant bubble: var(--surface) with .e1 elevation, espresso text.
- User bubble: solid var(--c-espresso), bone text.
- Typing indicator: three dots in var(--c-clay), opacity pulse at --d-slow
  with --ease-swell. No bouncing.
- Input: var(--c-mist), 1px var(--c-greige) border, --r-pill, with a visible
  label for screen readers.
- Send button: solid espresso, --r-pill.
- Keep the Jost 300 / 17px / 1.65 body setting — chat text is still body text.
- The chatbot answers only from knowledge-base.js. Do not change that
  behavior or widen its scope.
```

---

## 8. Reusable guardrail block

Append to any prompt where drift is a risk:

```
GUARDRAILS:
- Palette: Bare monochrome only. No teal, blue, green, pink. No new hex.
- Atmosphere via light and texture, never hue, never tropical iconography.
  No palms as decoration, no hibiscus, no tiki, no shells, no script fonts.
- No gradient buttons, gradient text, or decorative blobs.
- No emoji. No exclamation marks.
- No urgency or scarcity language.
- Never state a medical claim not present in knowledge-base.js.
- Ask before git push or vercel deploy.
```
