---
title: LoveLi Care — Dashboard Layout Map (Horizon Homes → Med Spa)
slug: lovelicare-dashboard-layout-map
project: lovelicare
type: design
status: in_progress
created: 2026-10-07
updated: 2026-10-07
phase: dashboard-v2
tags: [lovelicare, dashboard, inventory, layout, reference]
aliases: ["Dashboard Layout Map", "Horizon map"]
related: ["[[lovelicare-inventory-catalog]]", "[[lovelicare-orders-spec]]", "[[lovelicare-master-plan-v2]]", "[[lovelicare-branding]]"]
---

# Dashboard Layout Map

**Written for:** Mark, and the next session that picks up the dashboard cold.
**Date:** 2026-10-07
**Reference:** [Horizon Homes Real Estate Web App — Dashboard](https://dribbble.com/shots/24270320-Horizon-Homes-Real-Estate-Web-App-Design-Dashboard) (phenomenonstudio),
with the SEDELA education dashboard as a secondary source for the tab bar and the
donut-plus-stat-card pairing.

Reference governs **layout and component anatomy only**. Palette, type and
material come from `libra-lovelicare-images/brand/BRANDING.md` — Bare+ warm
monochrome. The reference is a dark glass UI over a photograph; LoveLi Care is a
light bone/sand field. Do not carry the reference's dark skin, its orange accent,
or its green/red semantic pills across unchanged. See §4.

---

## 1. The shell

Horizon is a **two-column shell**: a wide working column (~68%) and a persistent
right rail (~32%). That is the single most important structural idea in the shot,
and it is what the current LoveLi Care dashboard does not have — today every
panel is full width or a 50/50 split, so nothing is persistent while you work.

| Horizon | LoveLi Care | Source of truth |
|---|---|---|
| Top bar: logo + text nav + search + bell + avatar | Same bar: LoveLi mark · pill tabs · product search · alerts · Libra | — |
| Nav items (Properties list, Analytics, Tools) | Overview · Inventory · Orders · Clients · Reports | `navTo()` targets |
| Search "Barcelona, Spain" | "Search products, brands or SKU" | `#inventory-search` |
| Avatar: name + country | **Libra T. Robertson, NP-CRNP** · Towson, MD | static |
| Wide left column | Working column — tiles, charts, product grid | — |
| Right rail | Practice card + collection list (persistent) | — |

## 2. Component-by-component mapping

### 2.1 Section header + segmented toggle
Horizon: `Personal cabinet` with a 3-way pill toggle (My cabinet / Portfolio /
Statistics), active pill filled.

LoveLi Care: **`Your practice`** with `Today / Inventory / Orders`. The active
pill is **espresso-filled with mist text** — not the reference's orange. This
replaces the current tab row, and it is the control that must actually switch
panels (see §5).

### 2.2 The four KPI tiles
Horizon: label, large value, green `+11.01% ↗` delta pill.

LoveLi Care — these four, in this order:

| Tile | Value | Sub-stat | Traces to |
|---|---|---|---|
| Products | `9` | across 5 categories | `inventory_items` |
| Stock alerts | `9` | at or below reorder level | `quantity <= reorder_at` |
| Stock value | **empty state** | 0 of 9 products costed | `cost_price` all NULL |
| Orders this week | **empty state** | awaiting migration 0006 | `orders` (not yet created) |

> **The delta pill is the trap.** Horizon puts a `+11.01%` pill on all four
> tiles. We have exactly one day of ledger history (all nine movements are
> `initial_count`, all dated 2026-10-06), so there is no prior period to compare
> against. **A delta pill may only render once the ledger holds two distinct
> periods.** Until then the slot stays empty. This is the honesty rule from
> `CLAUDE.md` applied to a borrowed component.

### 2.3 Bar chart — "Mortgage payment" → **Stock movement**
Horizon: 6 monthly bars, one highlighted, y-axis 0–900K.

LoveLi Care: units received vs. used per month from `inventory_movements`, with
the current month highlighted in **caramel** (`--c-gold`) — the one place the
reference's "one bright bar" idea maps cleanly onto our accent rule, because it
is a fill, not text.

> Today this chart has **one bar** (2026-10-06, +90 units, `initial_count`).
> It is honest and it is thin. It becomes useful the moment stock is drawn
> down through the order desk.

### 2.4 Donut + legend — "Active listings" → **Collection by category**
*This is the lower-right chart.*

Horizon: donut with a right-side legend — colour dot, label, right-aligned
percentage. Clean, and it is the component worth stealing most directly.

LoveLi Care renders **real counts**:

| Category | Items | Share |
|---|---|---|
| Vitamins | 3 | 33.3% |
| Antioxidants | 2 | 22.2% |
| Lipotropic | 2 | 22.2% |
| IM injections | 1 | 11.1% |
| Minerals | 1 | 11.1% |

Colour is the hard part. Horizon uses green/orange/red/grey — four unrelated
hues, which is exactly what `BRANDING.md` §1.2 forbids. The donut instead uses a
**single-hue value ramp** down the warm neutrals:

```
espresso #3C2B25 → cacao #6E564E → clay #A8938B → greige #BDAEA9 → sand #EADFD5
```

Five steps, each a clear lightness jump from its neighbour, so the segments
separate by **value rhythm** rather than hue — the brand's stated thesis. Caramel
is reserved for the hairline ring and the leader line, never a filled segment.

Paired with it, borrowed from SEDELA: a **stat sub-card** to the donut's left
(largest category, items costed, units on hand, last counted).

### 2.5 Full-width bar — "Weekly Revenue" → **Orders by week**
Horizon: full-width bars + inline search + `+ Add Property`.

LoveLi Care: orders per week + `＋ New order`. **Empty state until 0006 ships**
and the first order is written. Never estimated, never seeded.

### 2.6 Right rail, card 1 — profile → **Practice card**
Horizon: avatar, name, star rating, then label/value rows.

LoveLi Care:

| Row | Value |
|---|---|
| Provider | Libra T. Robertson, NP-CRNP · Board Certified |
| Location | 100 E Pennsylvania Ave, Suite 304, Towson, MD 21286 |
| Catalog since | 6 Oct 2026 |
| Products tracked | 9 · 90 units on hand |

Drop the star rating. We have no review source, and inventing one on a medical
provider's card is not a styling choice.

### 2.7 Right rail, card 2 — "My Properties" → **Your collection**
Horizon: thumbnail + name + delta pill + price + sub-price, `+ Add Property`.

LoveLi Care: the **real vial photographs** (6 images covering all 9 products),
product name, stock badge, and price. Prices read **"Price not set"** — all nine
`retail_price` values are NULL. That empty state is correct and must survive;
it is also the clearest possible prompt to go price the catalog.

## 3. What does *not* carry over

| Reference element | Why it is dropped |
|---|---|
| Dark glass over photography | Phase 1 made this site a luminous bone field at 0 contrast failures. Reverting to dark would undo a verified result. |
| Orange accent (`+ Add Property`) | Caramel is the accent and it may never be a filled button or carry text. Primary buttons are espresso. |
| Green/red semantic delta pills | Introduces two off-brand hues. Direction is carried by an arrow glyph and a value step instead. |
| Star rating | No owned review data. |
| Four-hue donut | Replaced by the five-step warm value ramp above. |
| Avatar photos in list rows | Those are client faces. No client imagery, ever — product photography only. |

## 4. Palette binding

| Role | Token |
|---|---|
| Page field | `--c-bone` / `--c-mist` |
| Card ground | `--c-mist` on `--c-sand` |
| Right rail | `--c-sand` (one value step down from the working column) |
| Active pill / primary button | `--c-espresso` + `--c-mist` text |
| Donut ramp | espresso → cacao → clay → greige → sand |
| Hairlines, ring, active underline | `--c-gold` |
| Any gold text | `--c-gold-ink` only |

## 5. Interaction gaps this layout exposes

1. **The pill tabs must be real.** Horizon's nav and SEDELA's chevron tabs both
   imply dropdowns. The `Listbox` component in `dashboard.js` already implements
   a correct ARIA combobox — keyboard, typeahead, outside-click. The tab row must
   route through it rather than being decorative.
2. **The right rail needs its own scroll.** Horizon's rail is longer than the
   viewport. It scrolls independently or the working column is dragged with it.
3. **Card overflow menus (`···`)** appear on every Horizon card. We have one on
   product cards already; the chart cards need the same affordance or they look
   unfinished next to the grid.
4. **Empty states are load-bearing here.** Three of the ten regions have no data
   yet. They must be designed, not left blank — an undesigned empty region is the
   single fastest way to make this layout look broken.

## 6. The most important details, in order

1. **Adopt the two-column shell.** Everything else is decoration by comparison.
2. **The donut is the lower-right chart** and it is the one component that can
   show real, complete, traceable data today. Build it first.
3. **Nine of nine products read "Low stock"** because `reorder_at` was seeded
   equal to the opening count of 10. That is a seeding artifact, not a supply
   problem, and it makes the alerts tile useless until the thresholds are set
   per product. Fix the data, not the badge.
4. **Zero products are priced.** No price, no margin, no stock value, no order
   total. Pricing the nine products is the highest-value unblock in the whole
   build.
5. **Do not import the reference's accent system.** Orange + green + red is
   three new hues on a site that just reached zero contrast failures on a
   five-value warm monochrome.
