---
title: LoveLi Care — Inventory Catalog & Source Reconciliation
slug: lovelicare-inventory-catalog
project: lovelicare
type: reference
status: in_progress
created: 2026-10-07
updated: 2026-10-07
phase: dashboard-v2
tags: [lovelicare, inventory, catalog, data, reconciliation]
aliases: ["Inventory Catalog"]
related: ["[[lovelicare-dashboard-layout-map]]", "[[lovelicare-orders-spec]]", "[[lovelicare-master-plan-v2]]"]
---

# Inventory Catalog & Source Reconciliation

**Date:** 2026-10-07 · verified against live Supabase `tziwrqpvnncddbvlclyg`
**No PHI.** Everything here is product data. Nothing in this file names a client.

There are **four separate inventory pools**, and the single most common mistake
available in this project is treating them as one list. They have different
units, different owners, different legal status, and only one of them is live.

| # | Pool | Items | State | Lives in |
|---|---|---|---|---|
| 1 | Injectables & IV | 9 | **LIVE** | `inventory_items` |
| 2 | Sellable vitamins & IV stock | 28 | source file | `lovelicare-full-inventory-vitamins.txt` |
| 3 | Clinical supplies | 15 | source file | same file, above the `——` rule |
| 4 | Retail goods | 65 SKUs | source file | `lovelicare-item-invoice-and-item-title-list.txt` |

---

## Pool 1 — Injectables & IV (live)

Nine products, transcribed from photographs of the physical vials (migration
`0003`). Every row carries `source_image`, so any number traces to a picture.

| Product | Category | Mfr | Qty | Reorder | Cost | Retail |
|---|---|---|---|---|---|---|
| Glutathione Injection PF | antioxidant | Empower | 10 vial | 10 | — | — |
| Biotin Solution | vitamin | ASP Cares | 10 vial | 10 | — | — |
| Lipo Injection | lipotropic | Empower | 10 vial | 10 | — | — |
| Lipo-B Injection | lipotropic | Empower | 10 vial | 10 | — | — |
| Taurine Injection | im_injection | Empower | 10 vial | 10 | — | — |
| Pyridoxine HCl (B6) | vitamin | Empower | 10 vial | 10 | — | — |
| Coenzyme Q-10 | antioxidant | Empower | 10 vial | 10 | — | — |
| Vitamin D3 Injection | vitamin | Olympia Compounding | 10 vial | 10 | — | — |
| Zinc Chloride Injection | mineral | Olympia | 10 vial | 10 | — | — |

**Category split** (drives the dashboard donut): vitamin 3 · antioxidant 2 ·
lipotropic 2 · im_injection 1 · mineral 1.

**Photography:** 6 images cover all 9 products — two labels appear per photo in
`gluthathione-injection-and-biotin.jpg`, `libo-injection-and-libo-b-injection.jpg`
and `taurine-pryridozine--hcl-b6.JPG`. Files are in `public/assets/img/inventory/`.

> **Fixed 2026-10-07.** Four of the six were iPhone screenshots of a photo
> viewer — 1284×2778, the real photo in a ~22% band, the rest black letterbox —
> so product cards rendered as black rectangles. They were cropped to the photo
> band and converted to JPEG: **18.1 MB → 1.0 MB**. Originals are kept in
> `_original/`. Re-run with `node scripts/crop-inventory-photos.js`.
> If photos are added later, check for this first — a phone screenshot of a
> photo is not a product photo.

### Two data problems to fix before this pool is useful

1. **Every product reads "Low stock."** `reorder_at` was seeded at 10 and
   `quantity` was seeded at 10, so `quantity <= reorder_at` is true for all
   nine. The alerts tile therefore reports 9 of 9 and carries no information.
   Reorder points need to be set per product against real burn rate.
2. **Nothing is priced.** All 18 `cost_price` / `retail_price` values are NULL.
   This blocks stock value, margin, order totals, and the whole product page
   price column. **It is the highest-value unblock in the build.**

---

## Pool 2 — Sellable vitamins & IV stock (28, source file)

Counts here are **fractional vials**, not units — `0.5` means half a vial
remains. This is a working stock sheet, not a catalog.

```
1    Magnesium 300mg/ml        1    Glycine (Empower)
1    Vita Complex              1    Ascorbic Acid (Empower)
1    MICC                      1    Ascorbic Acid (Olympia)
1    Mineral Blend             1    Pyridoxine (Empower)
1    Taurine                   2.5  Glutathione (Olympia)
1    Amino Blend (Olympia)     0.5  NAD+ 100mg/ml (Olympia 10ml)
1    Carnitine (Olympia)       0.5  Zinc 10mg/ml (Olympia 10ml)
1.5  Lysine (Anazao)           0.25 Tri-Immune (Olympia)
1    Alpha Lipoic Acid (Emp)   1    Lipo Mino Mix-C (Olympia)
0.5  Alpha Lipoic Acid (Oly)   1    Glutathione PF (Anazao 10ml)
1    Lipo Mino Mix (Olympia)   1    Glutamine (Olympia)
1    Vitamin D (Olympia)       1.5  Chromium 4mcg/ml
                              5    Diphenhydramine (50mg/ml)
                             20    Famotidine (20mg/2ml)
```

**Two entries do not parse to a count** and are deliberately held back rather
than guessed — `lib/inventory.js` returns `quantity: null` for both:

- `O.5-Lidocaine 2% (50ml)` — leading letter `O`, not a zero
- `0-25-Plenish IV (Anazao)` — hyphen where a decimal point belongs

Both almost certainly mean `0.5` and `0.25`. **Neither may be auto-corrected.**
A typo that silently becomes stock is a worse failure than an empty field. They
surface in the import reviewer flagged *"Ambiguous count — verify against the
original file."*

### Overlap with Pool 1 — the duplicate-import hazard

At least seven of these 28 are the same substance as a live Pool 1 product under
a different name:

| Pool 2 | Pool 1 |
|---|---|
| Taurine | TAURINE INJECTION |
| Pyridoxine (Empower) | PYRIDOXINE HCL (B6) INJECTION |
| Vitamin D (Olympia) | VITAMIN D3 INJECTION |
| Glutathione (Olympia) | GLUTATHIONE INJECTION PRESERVATIVE FREE |
| Glutathione PF (Anazao) | GLUTATHIONE INJECTION PRESERVATIVE FREE |
| Zinc 10mg/ml (Olympia) | ZINC CHLORIDE INJECTION |
| Lipo Mino Mix / Mix-C | LIPO INJECTION / LIPO-B INJECTION |

The unique index on `(lower(name), coalesce(strength,''))` will **not** catch
these — the names differ. Import is review-gated one product at a time for
exactly this reason. Bulk-importing Pool 2 would double the catalog with
near-duplicates at different strengths and vendors.

---

## Pool 3 — Clinical supplies (15, source file)

Consumables: Tegaderm, 25G/31G safety needles, Luer Lock syringes (1/10/20/50 ml),
insulin syringes, lactated ringers, skin marking grids, IV administration sets,
butterfly needles, winged IV catheter, J-loop.

Counts are **mixed units** — some loose ("250"), some by box ("100 per box"),
some by pack-of-packs ("7 packs of 10"). Two lines read `0 (NEED)`: the 20 ml and
50 ml Luer Lock syringes are **out of stock and flagged for reorder**.

These are not sellable and should never appear on a product page. If tracked at
all, they belong in a separate `supply` category with its own reorder logic.

---

## Pool 4 — Retail goods (65 SKUs, source file)

Shapewear, waist trainers, resistance bands and sauna vests purchased under the
**Goodie 2 Shoes** billing name across five orders, 2022-03 → 2025-04.

- **79 invoice lines → 65 distinct SKUs**
- **132 units purchased**
- **$1,157.60 total cost** (merchandise, excluding shipping)
- Unit costs $3.90 – $13.50

Top movers by units purchased:

| Units | Cost | Product |
|---|---|---|
| 13 | $10.50 | Steel Boned Latex Waist Trainer — S / Black |
| 12 | $6.90 | Men's Sauna Vest — L/XL / Black |
| 9 | $6.90 | Men's Sauna Vest — 2XL/3XL / Black |
| 8 | $10.50 | Steel Boned Latex Waist Trainer — L / Black |
| 6 | $10.50 | Steel Boned Latex Waist Trainer — XL / Black |

### Three cautions

1. **These are purchase prices, not retail prices.** `lib/inventory.js` maps them
   to `cost_price` and sets `quantity: null`. A 2022 purchase quantity is not
   today's shelf count.
2. **They are a different business line.** Non-Rx physical goods, shipped from a
   different billing entity. Mixing them into the same grid as compounded
   injectables makes both harder to reason about. They want their own category
   and their own view.
3. **The source file contains a home address** (6405 Chessington Street) repeated
   on every order block. It is Libra's own billing address, not a client's, but
   it must not be imported into any field or surfaced on any page.

---

## What is safe to show where

| Pool | Owner dashboard | Public product page |
|---|---|---|
| 1 Injectables & IV | ✅ full detail | ⚠️ **Rx-only — consultation required, never a cart** |
| 2 Sellable vitamins | ✅ after review-gated import | ⚠️ same |
| 3 Clinical supplies | ✅ separate supply view | ❌ never |
| 4 Retail goods | ✅ full detail | ✅ safe to sell directly |

Pools 1 and 2 are prescription compounded injectables. `rx_only` defaults `true`
in `lib/inventory.js` and the schema. A public "Add to cart" on a compounded
injectable is not a UI decision — it is a regulatory one. The product page shows
them as **consultation-gated**, with booking routed to Vagaro, which is the
HIPAA-covered platform per decision D4.

---

## Reconciliation summary

| Measure | Value |
|---|---|
| Live products | 9 |
| Live units on hand | 90 |
| Live products priced | **0** |
| Live ledger movements | 9 (all `initial_count`, 2026-10-06) |
| Source items awaiting review | 28 + 15 + 65 = **108** |
| Ambiguous counts held back | 2 |
| Known Pool 1 ↔ Pool 2 duplicates | 7 |
