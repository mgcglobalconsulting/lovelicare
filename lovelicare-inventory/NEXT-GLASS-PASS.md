---
title: LoveLi Care — Liquid-Glass Background Pass
slug: lovelicare-glass-pass
project: lovelicare
type: prompt
status: shipped
created: 2026-10-07
updated: 2026-10-07
phase: dashboard-v2
tags: [lovelicare, design, glassmorphism, dashboard, prompt]
aliases: ["Glass Pass", "Frost pass"]
related: ["[[lovelicare-dashboard-layout-map]]", "[[lovelicare-branding]]", "[[lovelicare-inventory-readme]]"]
---

# Liquid-Glass Background Pass

**SHIPPED 2026-10-07.** Executed in the same session it was written. §4 is kept
verbatim as the brief that was followed; §7 records what actually changed and
what it cost. Everything above §4 is the evidence behind it.

**Scope:** `/dashboard.html` background and surface material **only**. No layout
changes, no copy changes, no data changes. The donut, the order desk, the
product grid and the rail all keep their current geometry.

---

## 1. The problem, precisely

The dashboard reads flat and grey-ish. It is not a missing feature — it is a
**regression**. A complete frost-glass system already exists and is being
overwritten by a later stylesheet.

`public/assets/css/dashboard-theme.css` already defines:

```css
--frost:        rgba(253, 251, 249, .78);
--frost-strong: rgba(254, 252, 250, .92);
--frost-soft:   rgba(253, 251, 249, .55);
--frost-edge:   rgba(255, 255, 255, .85);
--frost-blur:   blur(22px) saturate(165%);
--dash-inset:   inset 0 1px 0 var(--frost-edge);
--dash-shadow-lift: 0 2px 5px rgba(60,43,37,.07), 0 26px 60px -18px rgba(60,43,37,.28);
```

…and gives `body` two warm radial pools on `background-attachment: fixed`, plus
a `backdrop-filter` frosted sidebar.

**`public/assets/css/dashboard-workspace.css` loads after it and cancels all of it:**

| Line | Rule as written | Effect |
|---|---|---|
| **4** | `body { background: var(--c-sand); background-image: none; }` | **kills both warm pools — this is the bland background** |
| **6** | `.side { background:var(--c-mist); padding:30px 19px 22px; }` | removes the frosted sidebar (keep the padding) |
| **17** | `.top {…background:var(--c-mist);…backdrop-filter:none;}` | removes the frosted header (keep the padding) |

Lines 6 and 17 also carry layout padding that must survive — strip only the
`background` / `backdrop-filter` declarations, not the whole rule.

Then the two newest stylesheets never opted into glass at all — every
`.ov-card`, `.ov-kpi`, `.sf-card` and `.sf-order` is **opaque** `var(--c-mist)`
with a `--frost-edge` border. They look like paper on paper.

CSS load order (`dashboard.html` 21–27):
`tokens → dashboard → dashboard-theme → dashboard-workspace → dashboard-overview → dashboard-storefront`

## 2. Why this matters to the brand

`CLAUDE.md` names material depth as one of the four mechanisms that produce
"pop", not as decoration:

> **Material depth.** Liquid-glass language — inner highlight, long soft shadow,
> grain, refraction. Warm the glass tints from white toward mist/sand so panels
> read cream, not grey.

So restoring this is returning to the documented thesis, not adding a trend.

## 3. The two ways this goes wrong

1. **Grey glass.** `rgba(255,255,255,α)` over a cool shadow reads grey on a warm
   palette. Every translucent fill must be tinted toward `--c-mist` / `--c-sand`,
   and every shadow stays **espresso-tinted** (`rgba(60,43,37,…)`), never black.
2. **Contrast loss.** The dashboard is at **0 WCAG AA failures**. Translucency
   lowers effective contrast behind text. `getComputedStyle` reports
   `transparent` for most of these grounds, so only pixel sampling is
   trustworthy — `audit:dashboard` must still print 0.

---

## 4. The brief — paste this

```
Liquid-glass pass on the LoveLi Care dashboard background and surfaces.
Read lovelicare-inventory/NEXT-GLASS-PASS.md first. Visual only — no layout,
copy, schema or data changes. Scope is /dashboard.html.

GOAL
Make the dashboard field read as warm frosted glass over a luminous bone/sand
ground, so the inventory cards, the donut and the order desk sit ON something
with depth instead of on a flat tan slab. Creams, whites, caramels, earth tones
— rich, not flat.

1. STOP CANCELLING THE GLASS — public/assets/css/dashboard-workspace.css
   - Delete `background: var(--c-sand); background-image: none;` from `body`.
     Let dashboard-theme.css's radial pools through.
   - Delete `background: var(--c-mist)` from `.side` and restore the frosted
     sidebar from dashboard-theme.css.
   - Delete `backdrop-filter: none` from `.top`; restore `var(--frost-blur)`.
   These three lines are the whole bland-background bug.

2. DEEPEN THE FIELD — dashboard-theme.css `body`
   Keep `background-attachment: fixed`. Build the ground from THREE warm pools
   plus a grain layer, all existing tokens:
     - bone pool, top-left, large and bright
     - shell/sand pool, top-right
     - a third faint cacao-tinted pool low-right at very low alpha, so the
       bottom of a long page is not a dead flat field
     - a fine grain/noise overlay at <= 3% opacity (inline SVG feTurbulence
       data-URI, no external asset) — grain is what stops large soft gradients
       banding on a wide monitor
   No new hex literals. Compose from --c-bone / --c-mist / --c-sand / --c-shell
   / --c-cacao via rgba() or color-mix().

3. FROST THE SURFACES — dashboard-overview.css, dashboard-storefront.css
   Convert these from opaque --c-mist to the frost system:
     .ov-card, .ov-kpi, .sf-card, .sf-order, .sf-hero, .ov-mix__stats
   Each gets:
     background: var(--frost);              /* or --frost-strong where text is dense */
     backdrop-filter: var(--frost-blur);
     -webkit-backdrop-filter: var(--frost-blur);
     border: 1px solid var(--frost-edge);
     box-shadow: var(--dash-shadow), var(--dash-inset);
   Use --frost-strong behind the KPI numbers, the donut legend and the order
   totals (dense small text). Use --frost / --frost-soft for large calm areas
   like .sf-hero.

4. EDGE SHEEN — caramel as metal, never paint
   A 1px caramel top-edge highlight on the hero and the donut card only:
     inset 0 1px 0 rgba(201,169,110,.28)
   Plus the existing inner white highlight. Caramel must not become a fill,
   a button, or text anywhere in this pass.

5. VALUE RHYTHM MUST SURVIVE
   Glass reduces the lightness gap between adjacent surfaces, and that gap is
   how this palette produces pop. After frosting, re-check that the right rail
   still sits a visible step below the working column, and that .ov-mix__stats
   still separates from its parent card. If two mid-tones end up touching,
   drop the rail one more step toward --c-sand rather than adding a border.

6. PERFORMANCE
   backdrop-filter on many large elements is expensive. Do NOT put it on every
   .sf-card (there can be 65+ after import). Frost the CONTAINERS — hero, order
   desk, overview cards, rail, sidebar, top bar — and let product cards stay a
   near-opaque --frost-strong with no blur. Cap total blurred elements at ~12.

7. GRACEFUL DEGRADATION
   Wrap every blur in @supports (backdrop-filter: blur(1px)) or the
   -webkit- equivalent, with an opaque --c-mist fallback. A browser without
   backdrop-filter must get a solid warm card, never a washed-out one.
   Respect prefers-reduced-transparency: fall back to opaque there too.

HARD GATES — all three must pass before calling this done
   node server.js &                                 # API must be up
   node docs/testing/audit-dashboard.js             # MUST print 0 failures
   node docs/testing/verify-overview-browser.js     # donut + KPI states
   node docs/testing/verify-storefront-browser.js   # must end "orders remaining = 0"
   Check for a stale server first: lsof -nP -iTCP:3000 -sTCP:LISTEN

NEVER
   - teal, blue, green, pink, amber
   - pure #FFF or black shadows (both read grey/cold on this palette)
   - gold carrying text (use --c-gold-ink)
   - new raw hex literals — compose from the Bare+ tokens
   - flattening the palette to five swatches (BRANDING.md §1.2)

Capture docs/testing/screenshots/overview-desktop.png before and after and
show me both.
```

## 5. Stitch Theme block

If any of this is explored in Stitch first, paste this as the `Theme:` line so
the output lands on-palette and needs no hex remapping:

```
Theme: Warm frosted glass over a luminous bone field. Background #F4F1EB with
       soft #FAF8F5 and #EADFD5 light pools and a faint film grain. Panels are
       translucent warm white (not grey, never pure #FFF) with a 22px blur,
       a bright inner top highlight, and long espresso-tinted shadows
       (rgba(60,43,37,.2)). Caramel #C9A96E appears only as 1px metallic
       edge-sheen and hairlines, never as a fill and never as text. Type is
       Cormorant Garamond display over Jost UI, espresso #3C2B25. Serene,
       premium, medical-spa calm. No teal, blue, green, pink or amber.
```

## 6. Done means

- The three cancelling rules in `dashboard-workspace.css` are gone.
- The field has visible depth top-to-bottom on a 1440×1200 screenshot.
- Containers read as frosted glass; product cards stay crisp and legible.
- `audit:dashboard` prints **0 failures**.
- Both browser verifications still pass, storefront ending `orders remaining = 0`.
- No new hex literals anywhere in the diff.


---

## 7. Shipped — what actually changed

### The three flatteners (dashboard-workspace.css)
| Was | Now |
|---|---|
| `body { background: var(--c-sand); background-image: none; }` | removed — a comment marks the field as theme-owned |
| `.side { background:var(--c-mist); … }` | fill removed, padding kept |
| `.top { …backdrop-filter:none; }` | both removed, padding kept |

### The field (dashboard-theme.css)
Three pools, not two: bone top-left, shell top-right, and a `rgba(110,86,78,.085)`
cacao pool low-right so a long page stops dying into a flat slab. Grain is an
inline `feTurbulence` data-URI, desaturated via `feColorMatrix` and held at
**5.5%** — coloured noise tints a warm palette green.

The bone pool was pulled back from `.88` to **`.70`**. At full strength it
washed the field to near-white, which removed the very contrast the frosted
panels need in order to read as glass instead of as paper. That single value is
the difference between "frosted" and "flat" in the first screenshot.

New tokens: `--frost-blur-lite` (10px, for repeating surfaces), `--dash-grain`,
`--sheen-gold`.

### Surfaces
Blurred: `.ov-card`, `.ov-kpi` (lite), `.sf-hero`, `.sf-order`, plus the
sidebar and top bar that were restored. **Not** blurred: `.sf-card` — it uses
`--frost-strong` with no `backdrop-filter`, because the grid reaches 65+ cards
after the retail import and `backdrop-filter` is per-element GPU work.
`.ov-mix__stats` stays solid bone: blur nested inside blur reads muddy, and
that is exactly where the value step has to survive.

`#ov-mix` and `.sf-hero` carry `--sheen-gold` — the only caramel in the pass.

### Product photography — found while verifying
The cards were rendering **solid black rectangles**. The cause was not CSS:
four of the six files were **iPhone screenshots of a photo viewer**, 1284×2778,
where the real photo occupied a ~22% band and the rest was black letterbox plus
the iOS home indicator. `object-fit: contain` was faithfully fitting a mostly
black canvas.

`scripts/crop-inventory-photos.js` detects the photo band by scanning for rows
above a luma floor, takes the longest run, and crops with `sips`. Then converted
PNG → JPEG at q86, since these are photographs.

| | Before | After |
|---|---|---|
| Four product images | 17.8 MB | 0.70 MB |
| Whole folder | 18.1 MB | 1.0 MB |

Originals are in `public/assets/img/inventory/_original/` and are never
overwritten, so the script is re-runnable and reversible. Renaming `.png` → `.jpg`
meant updating three reference points: `inventory_items.source_image` (SQL),
the `images` array in `dashboard-inventory.js`, and two literals in
`dashboard.html` / `dashboard-data.js`.

> **Gotcha for next time:** `sips --cropOffset` cannot take a negative value —
> it parses `-1` as a flag. The script clamps to 0, which centre-crops.

### Gates
```
audit:dashboard      0 failures
verify:overview      PASS
verify:storefront    PASS   orders remaining = 0
verify:inventory     PASS
test:inventory       5/5
```

### Also fixed
`verify-storefront-browser.js` leaked a test order when it threw between
`order_create` and cleanup, and its teardown only removed "the newest order" —
so strays accumulated and broke later runs for the wrong reason. It now refuses
to start if any order exists, and sweeps everything not present beforehand.
`docs/testing/clean-test-orders.js` removes strays by test label only, with
`--dry`, and never touches an order with a real customer label.
