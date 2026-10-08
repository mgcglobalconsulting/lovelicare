---
title: LoveLi Care — Inventory Workspace
slug: lovelicare-inventory-readme
project: lovelicare
type: index
status: in_progress
created: 2026-10-07
updated: 2026-10-07
phase: dashboard-v2
tags: [lovelicare, inventory, index]
aliases: ["Inventory Workspace"]
related: ["[[lovelicare-inventory-catalog]]", "[[lovelicare-orders-spec]]", "[[lovelicare-dashboard-layout-map]]", "[[lovelicare-master-plan-v2]]"]
---

# Inventory Workspace

Everything about LoveLi Care's products, stock and orders. The repo is the
source of truth; these notes sync to Obsidian and Supabase like the rest.

| Document | What it answers |
|---|---|
| [[lovelicare-inventory-catalog]] | What products exist, where they came from, what is safe to show |
| [[lovelicare-orders-spec]] | How an order is recorded and why it can't carry PHI |
| [[lovelicare-dashboard-layout-map]] | How the reference dashboard maps onto this business |
| [[lovelicare-pricing-research]] | **What to charge, what it costs, where to buy it** |
| [[lovelicare-glass-pass]] | The liquid-glass material pass (shipped) |

## Where the code lives

| Layer | File |
|---|---|
| Schema | `supabase/migrations/0003_inventory.sql`, `0005_inventory_workspace.sql`, `0006_orders.sql` |
| Validation | `lib/inventory.js`, `lib/orders.js` |
| API | `lib/dashboard-api.js` (`/inventory`, `/orders`, `/metrics`) |
| Inventory editor | `public/assets/js/dashboard-inventory.js` |
| Practice overview + donut | `public/assets/js/dashboard-overview.js` |
| Collection & order desk | `public/assets/js/dashboard-storefront.js` |
| Styles | `public/assets/css/dashboard-{workspace,overview,storefront}.css` |
| Product photography | `public/assets/img/inventory/` (6 files, 9 products) |

## Verify before calling anything done

```bash
node server.js &                                   # the API must be up
node --test docs/testing/test-inventory.js         # validation unit tests
node docs/testing/verify-inventory-browser.js      # inventory editor
node docs/testing/verify-overview-browser.js       # donut, KPIs, rail
node docs/testing/verify-storefront-browser.js     # catalog + a real order
node docs/testing/audit-dashboard.js               # WCAG AA — must be 0
node docs/testing/clean-test-orders.js --dry      # confirm no stray test orders
```

> **Check for a stale server first:** `lsof -nP -iTCP:3000 -sTCP:LISTEN`.
> A leftover process keeps the port and serves the old `lib/`, because
> `require()` caches. This has already cost one debugging cycle.

The storefront test writes a real order and then deletes it. It prints
`Cleanup: orders remaining = 0`. **If that line says anything else, a test
order is sitting in production data** — remove it before moving on.

## State, 2026-10-07

- **9 products live**, **2,350 doses**, 18 ledger entries, 5 categories.
- **Unit is `dose`, and 9 of 9 are priced** ($30–$50/dose, industry mid-band).
  Stock retail value **$91,250**. See [[lovelicare-pricing-research]] §8.
- **Stock alerts: 0.** Reorder points are now two vials' worth of doses, which
  retired the "9 of 9 low stock" seeding artifact.
- **`cost_price` is still NULL on all nine** — so the Stock-value tile and
  margin stay in their empty states, correctly. Real invoice costs are the one
  remaining input.
- **Doses per vial are assumptions** recorded in each product's `notes`.
  Confirm with Libra before trusting stock counts.
- **108 source items** await review-gated import (28 vitamins · 15 supplies ·
  65 retail SKUs). 2 have ambiguous counts and are deliberately held back.
- Migrations 0001, 0002, 0003, 0005, 0006 are **applied**. 0004 (staff auth)
  is written and **not applied**.

> ### ▶ NEXT SESSION — confirm dosing, then add costs
> *(Pricing itself is done — §8 of the research note. What remains:)*
> Benchmarks are gathered. Before entering a single number, **decide whether a
> product is priced per vial or per dose** — a 30 mL multi-dose vial at ~30
> doses makes those two answers differ by roughly 30×, and getting it wrong
> means re-entering everything.
>
> Then, per item in the inventory list:
> 1. **Current market rate** — §2 has national ranges for all nine
>    (Glutathione $35–50, Biotin $35–55, Lipo $25–40, Lipo-B $25–45,
>    Taurine $35–40, B6 $25–35, CoQ10 $45–55, Vitamin D3 $40–55, Zinc $30–35).
>    Still needs **five Towson-area comps** — the ranges are national.
> 2. **Real cost** — pull actual per-vial invoice costs from Libra's Empower /
>    Olympia / ASP Cares accounts, plus **doses per vial at her real dosing**.
>    Neither can be researched; both come from her records.
> 3. **Best source** — 6 of 9 already come from Empower (503A + 503B). The lever
>    is usually **503B office stock + volume tiers**, not switching vendors.
>    Verify formulation equivalence before moving anything she trusts clinically.
> 4. **Set the price** — `Price = Cost ÷ (1 − 0.65)`, sanity-check against the
>    benchmark, round to a menu number. Margin shows per product in the editor.
>
> **Fastest path to a live order:** the 65 retail SKUs have real paid costs on
> file ($3.90–$13.50) and imply **70–80% margins**. Non-Rx, no formulation
> decision, no regulatory surface. Amortise shipping into landed cost first.

