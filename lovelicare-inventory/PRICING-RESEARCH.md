---
title: LoveLi Care — Pricing & Sourcing Research
slug: lovelicare-pricing-research
project: lovelicare
type: research
status: applied
created: 2026-10-07
updated: 2026-10-07
phase: dashboard-v2
tags: [lovelicare, pricing, sourcing, inventory, margin, research]
aliases: ["Pricing Research", "Sourcing"]
related: ["[[lovelicare-inventory-catalog]]", "[[lovelicare-orders-spec]]", "[[lovelicare-budget]]", "[[lovelicare-inventory-readme]]"]
---

# Pricing & Sourcing Research

**Why this exists:** zero of nine live products have a `retail_price`, and
`order_create` refuses to sell an unpriced product. This is the single blocker
on the order desk, the stock-value tile, margin, and the revenue chart.

**Status:** benchmarks gathered and **APPLIED 2026-10-07** — see §8 for what
is live. The ranges below are still other practices' published list prices, so
they remain a sanity check, not an authority. These are published rates from other practices' public menus — they
validate a number, they do not set one. Three inputs are still missing, and
they are the ones that actually determine Libra's price (§4).

---

## 1. ~~Decide this first~~ — RESOLVED: per dose

**Decision: option 1 — the unit is now `dose`.** Stock is held in doses and
`retail_price` is the price of one injection. Applied 2026-10-07; the original
reasoning is kept below because it explains why this mattered.

The inventory schema prices **per stock unit**, and the unit is `vial`. The med
spa industry prices **per injection**. Those are not the same number and the gap
is large:

> A 30 mL multi-dose Lipo-B vial yielding ~30 × 1 mL doses at $30/dose is
> **$900 of revenue from one vial.** Entering `retail_price = 30` against a unit
> of `vial` would make every order total, margin and stock-value figure wrong by
> roughly 30×.

Three ways to resolve it, in order of preference:

1. **Change the unit to `dose`** for injectables and hold stock in doses.
   Honest, and it makes `quantity` mean "doses left", which is what the front
   desk actually needs to know. Requires a ledger conversion of the current
   counts.
2. **Add `doses_per_unit`** and derive dose price. More faithful to the physical
   vial, but every display has to do the division.
3. Price per vial and accept the dashboard reports wholesale value, not retail.
   Cheapest, least useful.

**Do not set a single price until this is decided** — otherwise the numbers have
to be re-entered.

## 2. Market benchmarks — the nine live products

Published single-injection rates from US med spa menus, 2026. Wide spreads are
real: they track metro, tier and whether the item is sold standalone or as an
IV add-on.

| Product | Common range | Notes |
|---|---|---|
| Glutathione 200 mg/mL | **$35 – $50** IM | $30–50 as an IV add-on; $69 add-on / $119 standalone at premium sites |
| Biotin 10 mg/mL | **$35 – $55** | $45 is the most common single price |
| Lipo (MIC) | **$25 – $40** | Full published spread is $15–75 |
| Lipo-B (MIC + B12) | **$25 – $45** | Usually $5–10 above plain MIC |
| Taurine | **$35 – $40** | Thin public data; often bundled into energy blends |
| Pyridoxine B6 100 mg/mL | **$25 – $35** | Tracks the general B-vitamin shot rate |
| CoQ10 20 mg/mL | **$45 – $55** | One of the higher-priced single shots |
| Vitamin D3 50,000 IU | **$40 – $55** | Up to $75 at premium sites |
| Zinc Chloride | **$30 – $35** | Usually an immune add-on, not standalone |

Context: B12 shots run **$25–60** nationally, IV drips **$150–300** mid-tier,
and a Myers Cocktail **$200–250**. Those anchor the top and bottom of a menu.

## 3. The margin math

Industry benchmarks to price against, not to guess at:

- IV therapy gross margin: **60–70%**
- Injectable COGS should sit **at or below 35%** of injectable revenue;
  **above 40% is a problem**
- A well-run med spa nets **20–25%**

The formula to use:

```
Price = Cost ÷ (1 − desired margin)

e.g. cost per dose $9.00 at a 65% target → 9 ÷ 0.35 = $25.71 → menu at $30
```

`lib/inventory.js` already computes and displays margin per product once
`cost_price` and `retail_price` are both set, so this is checkable in the UI
the moment the numbers go in.

## 4. The three missing inputs

Benchmarks cannot be turned into prices without these, and **none of them can
be researched — they come from Libra's own records**:

1. **Actual cost per vial**, from the Empower / Olympia / Anazao / ASP Cares
   invoices. The 2022–2025 invoices already in the repo cover the *retail goods*
   line, not the injectables.
2. **Doses per vial** for each product, at the dose Libra actually gives.
   30 mL at 1 mL/dose is not the same as 30 mL at 2 mL/dose, and it changes
   cost-per-dose by 2×.
3. **Towson / Baltimore County comps.** The ranges above are national. Maryland
   suburban pricing typically sits mid-band, but that needs five local menus
   checked, not an assumption.

## 5. Sourcing

Current suppliers, from the labels already transcribed:

| Supplier | Type | Supplies |
|---|---|---|
| **Empower Pharmacy** (Houston, TX) | 503A **and** 503B | Glutathione, Lipo, Lipo-B, Taurine, B6, CoQ10 — 6 of 9 |
| **Olympia Pharmaceuticals** | 503B outsourcing facility | Vitamin D3, Zinc |
| **ASP Cares** | 503A | Biotin |
| **Anazao Health** | 503A/503B | Lysine, Glutathione PF, Plenish (source list only) |

Empower is the largest FDA-registered 503B outsourcing facility in the US and
runs a 503A division alongside it; Olympia is a leading 503B. Both are
mainstream, defensible choices — **there is no obvious sourcing mistake here.**

### What actually moves cost

- **503B vs 503A is the lever.** A 503B outsourcing facility sells *office
  stock* in bulk without a patient-specific prescription; a 503A fills per
  patient. Consolidating office-stock items onto a 503B account is normally
  where the per-dose saving is, not switching vendors.
- **Volume tiers.** Both Empower and Olympia tier by order size. Worth asking
  each rep directly for the current tier table.
- **Consolidation.** Six of nine already come from Empower. Moving the Olympia
  and ASP items there — *if* the formulations match — may cross a tier
  threshold. Verify formulation equivalence before switching a product Libra
  already trusts clinically.

> **This is not a shopping exercise.** These are prescription compounded
> medications. Accounts are prescriber-gated and must be opened under Libra's
> own NP-CRNP license and Maryland scope of practice. Price is one input;
> formulation, sterility assurance, beyond-use dating and supply reliability are
> the others, and they are her call, not a spreadsheet's.

## 6. The retail goods line — real margins already available

Unlike the injectables, pool 4 has **actual paid costs** on file (65 SKUs,
132 units, $1,157.60 across five orders, 2022–2025):

| Product | Unit cost | Typical shapewear retail | Implied margin |
|---|---|---|---|
| Steel Boned Waist Trainer | $10.50 | $35 – $50 | 70 – 79% |
| Men's Sauna Vest | $6.90 | $25 – $35 | 72 – 80% |
| Colombia Fajas Bodysuit | $11.80 | $40 – $60 | 71 – 80% |
| Resistance Band 3-pack | $5.90 | $20 – $28 | 71 – 79% |
| Double Chin Reducer | $3.90 | $15 – $20 | 74 – 81% |

**These can be priced and sold today** — they are not Rx, they need no
formulation decision, and the cost basis is already known. Shipping ($38–135
per order) has to be amortised into landed cost before the margin is real.

If the goal is to get the order desk live quickly, **this line is the fastest
path**, and it exercises the whole order → ledger → stock flow with no
regulatory surface.

## 7. Next session — do this in order

1. Decide **vial vs dose** (§1). Everything else depends on it.
2. Pull **actual invoice costs** for the nine injectables from Libra's
   Empower / Olympia / ASP accounts.
3. Get **doses per vial** at Libra's real dosing.
4. Check **five Towson-area menus** for local comps.
5. Compute with `Price = Cost ÷ (1 − 0.65)`, sanity-check against §2,
   round to a menu-friendly number.
6. Enter prices in the inventory editor; the margin figure appears per product
   immediately. Confirm the stock-value tile leaves its empty state.
7. Separately: price the retail goods from known landed cost (§6).

**Sources:** national price-aggregation and individual med spa public menus
(ModMD, Hydrate Me, Spark Mobile, Zen IV, Glow Light, Art of Aesthetics,
RevIV), [Med Spa Prices 2026 US Cost Guide](https://locationsnearmenow.net/med-spa-prices-list-costs-in-usa/),
[Lipotropic Injections Cost](https://www.ivyrx.com/blog/lipotropic-injections-cost),
[Med Spa Profit Margins 2026](https://www.spakinect.com/blog/med-spa-profit-margins-for-2026),
[Vagaro — Med Spa Profit Margins](https://www.vagaro.com/learn/med-spa-profit-margins-guide),
[Zenoti — How to Price Med Spa Services](https://www.zenoti.com/thecheckin/how-to-price-med-spa-services),
[Empower Pharmacy](https://www.empowerpharmacy.com/),
[Olympia Pharmacy](https://www.olympiapharmacy.com/503a-pharmacy/).
Ranges are published list prices from other practices and are **benchmarks, not
recommendations**. Verify before adopting.


---

## 8. Applied — live as of 2026-10-07

Unit changed `vial` → `dose`. Stock converted **through the ledger**
(`reason = 'adjustment'`, one row per product, each noting the conversion), so
the invariant holds: every count still equals the sum of its movements —
verified on all nine.

| Product | mL/dose | Doses/vial | Stock | Reorder | **Price/dose** | Stock retail |
|---|---|---|---|---|---|---|
| Biotin 10 mg/mL | 1.0 | 30 | 300 | 60 | **$45** | $13,500 |
| CoQ10 20 mg/mL | 1.0 | 10 | 100 | 20 | **$50** | $5,000 |
| Glutathione 200 mg/mL | 2.0 | 15 | 150 | 30 | **$45** | $6,750 |
| Lipo (MIC) | 1.0 | 30 | 300 | 60 | **$35** | $10,500 |
| Lipo-B (MIC+B12) | 1.0 | 30 | 300 | 60 | **$40** | $12,000 |
| Pyridoxine B6 100 mg/mL | 1.0 | 30 | 300 | 60 | **$30** | $9,000 |
| Taurine 50 mg/mL | 1.0 | 30 | 300 | 60 | **$35** | $10,500 |
| Vitamin D3 50,000 IU/mL | 1.0 | 30 | 300 | 60 | **$45** | $13,500 |
| Zinc Chloride | 1.0 | 30 | 300 | 60 | **$35** | $10,500 |
| | | | **2,350** | | | **$91,250** |

Every price is the **mid-band of its researched range** (§2), rounded to a menu
number. Reorder points are **two vials' worth of doses** — enough lead time for
a compounding pharmacy to ship. That also fixed the "9 of 9 low stock" artifact:
alerts now read **0**, honestly.

### Two things that are deliberately still unset

- **`cost_price` is NULL on all nine.** It was not invented. The Stock-value
  tile therefore still reads *"Add cost prices"* and margin reads *"Margin not
  set"* — both correct. Real invoice costs are the remaining input (§4).
- **Doses per vial are ASSUMPTIONS.** 1 mL/dose for the 30 mL multi-dose vials,
  2 mL for Glutathione, and CoQ10's 10 mL vial gives 10. Each product's `notes`
  field records its assumption and says to confirm. **If Libra's real dosing
  differs, stock counts are wrong by that ratio** — re-run the conversion rather
  than hand-editing, so the ledger stays whole.

> Reversing is possible: each conversion wrote one `adjustment` movement whose
> note contains the original vial count.
