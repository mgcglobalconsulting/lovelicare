---
title: LoveLi Care — Orders & Order Forms
slug: lovelicare-orders-spec
project: lovelicare
type: spec
status: shipped
created: 2026-10-07
updated: 2026-10-07
phase: dashboard-v2
tags: [lovelicare, orders, inventory, schema, ledger]
aliases: ["Orders Spec"]
related: ["[[lovelicare-inventory-catalog]]", "[[lovelicare-dashboard-layout-map]]", "[[lovelicare-master-plan-v2]]"]
---

# Orders & Order Forms

**Status:** migration `0006` **applied** to `tziwrqpvnncddbvlclyg` on 2026-10-07,
verified end to end. **No PHI.**

## The one rule

An order never writes `inventory_items.quantity` directly. It inserts an
`inventory_movements` row and updates the count in the same transaction, so the
stock number on the dashboard stays *the sum of its movements*. Every other
guarantee in this document follows from that.

## Schema

### `orders`
| Column | Type | Notes |
|---|---|---|
| `order_number` | text unique | `LC-1001`, from a sequence. Safe to read aloud |
| `status` | text | `draft` · `placed` · `fulfilled` · `cancelled` |
| `channel` | text | `in_person` · `phone` · `online` · `comp` |
| `customer_label` | text | **first name + last initial only** |
| `subtotal` `discount` `tax` `total` | numeric(12,2) | server-computed |
| `note` | text ≤1000 | no client information |
| `placed_by` | uuid → auth.users | for when 0004 ships |

Two table constraints make an inconsistent order unrepresentable:

```sql
check (total = round(subtotal - discount + tax, 2))
check (discount <= subtotal)
```

### `order_items`
`item_id` is **`on delete set null`**, not cascade — deleting a product must
never silently rewrite the history of what was sold. `name_snapshot`,
`unit_snapshot` and `unit_price` are frozen at sale time so a cancelled or
archived product's order still reads correctly years later.

```sql
check (line_total = round(unit_price * quantity, 2))
```

### Ledger
`inventory_movements.reason` gained **`sold`** and **`returned`**. A sale is
`-qty / sold`; a cancellation is `+qty / returned`. Both carry
`note = 'Order LC-####'`, so any movement traces to its document.

## The PHI boundary

Decision **D4** holds: this project stays out of HIPAA scope. An order is a
*stock and sales record*, not a patient chart.

Three layers enforce it, because one would be a policy and three are a boundary:

1. **Schema** — `customer_label` rejects `@` and any run of three digits.
2. **Server** — `lib/orders.js` rejects the same with a message a person can
   act on: *"Do not put an email address on an order."*
3. **Interface** — the field is labelled *"first name and last initial only"*
   and the note field says *"no client information"*.

There is no column for an address, phone, date of birth, diagnosis, dose
administered, or clinical note. Clinical intake stays in Vagaro.

## Functions

| Function | Does | Guards |
|---|---|---|
| `order_create(p_order, p_items)` | order + lines + stock + ledger, atomically | 1–100 lines; `for update` row lock per product; refuses an unpriced product; refuses to oversell; refuses a discount above subtotal |
| `order_cancel(p_id, p_version)` | restores stock through the ledger | optimistic concurrency on `updated_at`; refuses a double cancel |
| `order_set_status(p_id, p_status, p_version)` | draft → placed → fulfilled | refuses to reopen a cancelled order; cancelling must go through `order_cancel` |

All three are `security invoker`, revoked from `public`/`anon`/`authenticated`,
and granted only to `service_role`. RLS is **deny-by-default** on both tables with
no browser-facing policy, exactly like inventory.

### Why price comes from the catalog
`order_create` takes `unit_price` from `inventory_items.retail_price` unless one
is passed explicitly, and **raises if it is null**. A zero default would book
revenue that does not exist. This is why all nine products currently refuse to
be sold — see below.

## API

| Route | Purpose |
|---|---|
| `GET /api/dashboard/orders` | 500 most recent, with lines |
| `POST /api/dashboard/orders` | create — totals are never accepted from the browser |
| `POST /api/dashboard/orders/:id/cancel` | cancel, restoring stock |
| `PATCH /api/dashboard/orders/:id` | set status |
| `GET /api/dashboard/metrics` | overview figures, including the donut |

## Verified

`docs/testing/verify-storefront-browser.js` drives a real browser against the
live database and asserts:

- nine products, every one Rx-badged
- **nothing sellable while nothing is priced** — the honest current state
- category and search filters
- quantity stepper with live totals (`$75 → $150 → $125` with a $25 discount)
- the PHI guard refusing `someone@example.com`
- a **real order recorded over HTTP**: `LC-####`, total `$125.00`, subtotal `$150.00`
- stock decremented 10 → 8, with exactly one `sold` ledger row
- the order appearing under Recent orders

The test removes every row it creates and prints `orders remaining = 0`.

A rollback-only SQL harness also proves `order_cancel` restores stock
(10 → 8 → 10, one `sold` + one `returned`).

## Blocked on one thing

**No product has a retail price.** `order_create` refuses an unpriced product,
so the order desk is fully built, fully tested, and cannot take a real order
until prices exist. Setting them is a few minutes of work in the inventory
editor and it unblocks: order totals, stock value, margin, and the revenue
chart. It is the highest-value next action in the project.

## Not done

- **Staff attribution.** `placed_by` exists but stays null until `0004` ships;
  `staff_label` reads `Dashboard owner` for now.
- **Partial fulfilment / returns of single lines.** Cancel is all-or-nothing.
- **Payments.** An order records what was sold, not that money moved. Stripe
  keys exist in the environment but nothing is wired to them.
