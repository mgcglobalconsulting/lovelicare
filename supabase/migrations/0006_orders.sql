-- ===========================================================================
-- LoveLi Care — itemized orders and order forms
--
-- Closes the loop opened by 0003/0005: stock could be counted and adjusted,
-- but nothing recorded WHY it left the shelf in a sellable sense. An order is
-- the document that makes a stock decrement traceable to a transaction.
--
-- THE CENTRAL RULE: an order never writes `quantity` directly. It calls the
-- same ledger path everything else uses, so the stock number on the dashboard
-- stays the sum of its movements. A new `sold` reason is added for this.
--
-- NO PHI. D4 holds — this project stays out of HIPAA scope. An order carries a
-- *label* ("Jasmine R."), never a full name, address, phone, email, DOB, or any
-- clinical detail. Clinical intake stays in Vagaro. See docs/BUDGET.md §1.
-- ===========================================================================
begin;

-- ── 1. Let the ledger express a sale ───────────────────────────────────────
-- 0003 created this check inline, so the constraint name is generated. Find it
-- rather than guessing, then re-add it with 'sold' included.
do $$
declare c_name text;
begin
  select conname into c_name
    from pg_constraint
   where conrelid = 'public.inventory_movements'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%administered%';
  if c_name is not null then
    execute format('alter table public.inventory_movements drop constraint %I', c_name);
  end if;
end $$;

alter table public.inventory_movements
  add constraint inventory_movements_reason_check
  check (reason in ('received','administered','wasted','expired',
                    'adjustment','initial_count','sold','returned'));


-- ── 2. Orders ──────────────────────────────────────────────────────────────
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Human-facing reference. "LC-1001". Safe to read aloud, safe for Slack.
  order_number   text not null unique
                 default 'LC-' || nextval('public.order_number_seq')::text,

  status         text not null default 'draft'
                 check (status in ('draft','placed','fulfilled','cancelled')),
  channel        text not null default 'in_person'
                 check (channel in ('in_person','phone','online','comp')),

  -- First name + last initial ONLY. The check is a guard rail, not a policy:
  -- it blocks the two shapes most likely to carry identity by accident.
  customer_label text
                 check (customer_label is null or (
                   length(customer_label) between 1 and 60
                   and customer_label !~ '@'                 -- no email
                   and customer_label !~ '[0-9]{3}'          -- no phone / DOB
                 )),

  subtotal       numeric(12,2) not null default 0 check (subtotal >= 0),
  discount       numeric(12,2) not null default 0 check (discount >= 0),
  tax            numeric(12,2) not null default 0 check (tax      >= 0),
  total          numeric(12,2) not null default 0 check (total    >= 0),

  note           text check (note is null or length(note) <= 1000),
  placed_by      uuid references auth.users(id),
  staff_label    text,
  fulfilled_at   timestamptz,

  constraint orders_total_is_consistent
    check (total = round(subtotal - discount + tax, 2)),
  constraint orders_discount_within_subtotal
    check (discount <= subtotal)
);

comment on table public.orders is
  'Itemized orders. Marketing/ops data only — no PHI. customer_label is a '
  'first name + last initial, never a full identity.';
comment on column public.orders.total is
  'Server-computed. Never trusted from the client; order_create recomputes it.';

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status, created_at desc);


-- ── 3. Order lines ─────────────────────────────────────────────────────────
-- item_id is ON DELETE SET NULL, not CASCADE: deleting a product must never
-- silently rewrite the history of what was sold. The snapshot columns are what
-- keep a cancelled or archived product's order readable years later.
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  item_id       uuid references public.inventory_items(id) on delete set null,

  name_snapshot text not null,
  unit_snapshot text not null default 'unit',
  unit_price    numeric(12,2) not null check (unit_price >= 0),
  quantity      numeric(12,2) not null check (quantity > 0 and quantity <= 1000000),
  line_total    numeric(12,2) not null check (line_total >= 0),

  constraint order_items_line_total_is_consistent
    check (line_total = round(unit_price * quantity, 2))
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_item_idx  on public.order_items (item_id);

comment on table public.order_items is
  'One line per product on an order. Snapshots survive product deletion.';


-- ── 4. updated_at ──────────────────────────────────────────────────────────
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch
  before update on public.orders
  for each row execute function public.touch_updated_at();


-- ── 5. order_create — the only way an order comes into existence ───────────
-- Atomic: the order, its lines, the stock decrements and the ledger rows all
-- commit together or none of them do. A half-written order that moved stock
-- would corrupt the one number the dashboard promises to be traceable.
create or replace function public.order_create(p_order jsonb, p_items jsonb)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order    public.orders;
  v_line     jsonb;
  v_item     public.inventory_items;
  v_qty      numeric;
  v_price    numeric;
  v_subtotal numeric := 0;
  v_discount numeric;
  v_tax      numeric;
  v_count    integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'An order needs at least one product line.' using errcode = '22023';
  end if;

  v_count := jsonb_array_length(p_items);
  if v_count = 0 or v_count > 100 then
    raise exception 'An order holds between 1 and 100 product lines.' using errcode = '22023';
  end if;

  v_discount := round(coalesce((p_order->>'discount')::numeric, 0), 2);
  v_tax      := round(coalesce((p_order->>'tax')::numeric, 0), 2);
  if v_discount < 0 or v_tax < 0 then
    raise exception 'Discount and tax cannot be negative.' using errcode = '22023';
  end if;

  -- A consistent empty header: 0 = 0 - 0 + 0, and 0 <= 0. Seeding the real
  -- discount here would trip orders_discount_within_subtotal before the lines
  -- have been priced. Totals are written together at the end.
  insert into orders (status, channel, customer_label, note, staff_label,
                      subtotal, discount, tax, total)
  values (coalesce(p_order->>'status', 'placed'),
          coalesce(p_order->>'channel', 'in_person'),
          nullif(trim(coalesce(p_order->>'customer_label', '')), ''),
          nullif(trim(coalesce(p_order->>'note', '')), ''),
          coalesce(p_order->>'staff_label', 'Dashboard owner'),
          0, 0, 0, 0)
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := round((v_line->>'quantity')::numeric, 2);
    if v_qty is null or v_qty <= 0 or v_qty > 1000000 then
      raise exception 'Each line needs a quantity above zero.' using errcode = '22023';
    end if;

    -- Lock the product so two concurrent orders cannot oversell the same vial.
    select * into v_item from inventory_items
     where id = (v_line->>'item_id')::uuid
     for update;
    if not found then
      raise exception 'Product not found on one of the order lines.' using errcode = 'P0002';
    end if;
    if v_item.archived then
      raise exception 'Product "%" is archived and cannot be sold.', v_item.name
        using errcode = '22023';
    end if;

    -- Price comes from the catalog, not the client. An unpriced product cannot
    -- be sold: a zero would silently book revenue that does not exist.
    v_price := coalesce((v_line->>'unit_price')::numeric, v_item.retail_price);
    if v_price is null then
      raise exception 'Set a retail price for "%" before selling it.', v_item.name
        using errcode = '22023';
    end if;
    v_price := round(v_price, 2);
    if v_price < 0 then
      raise exception 'A unit price cannot be negative.' using errcode = '22023';
    end if;

    if v_item.quantity < v_qty then
      raise exception 'Only % % of "%" remain.', v_item.quantity, v_item.unit, v_item.name
        using errcode = '22023';
    end if;

    insert into order_items (order_id, item_id, name_snapshot, unit_snapshot,
                             unit_price, quantity, line_total)
    values (v_order.id, v_item.id, coalesce(v_item.common_name, v_item.name),
            v_item.unit, v_price, v_qty, round(v_price * v_qty, 2));

    -- Through the ledger, never around it.
    insert into inventory_movements (item_id, delta, reason, staff_label, note)
    values (v_item.id, -v_qty, 'sold', v_order.staff_label,
            'Order ' || v_order.order_number);

    update inventory_items
       set quantity = quantity - v_qty, updated_at = clock_timestamp()
     where id = v_item.id;

    v_subtotal := v_subtotal + round(v_price * v_qty, 2);
  end loop;

  if v_discount > v_subtotal then
    raise exception 'The discount is larger than the order subtotal.' using errcode = '22023';
  end if;

  update orders
     set subtotal = v_subtotal,
         discount = v_discount,
         tax      = v_tax,
         total    = round(v_subtotal - v_discount + v_tax, 2)
   where id = v_order.id
  returning * into v_order;

  return v_order;
end $$;


-- ── 6. order_cancel — puts the stock back, through the ledger ──────────────
create or replace function public.order_cancel(p_id uuid, p_version timestamptz)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.orders;
  v_line  public.order_items;
begin
  select * into v_order from orders where id = p_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if p_version is null or v_order.updated_at <> p_version then
    raise exception 'This order changed. Refresh before cancelling again.' using errcode = '40001';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'This order is already cancelled.' using errcode = '22023';
  end if;

  for v_line in select * from order_items where order_id = p_id loop
    if v_line.item_id is not null then
      insert into inventory_movements (item_id, delta, reason, staff_label, note)
      values (v_line.item_id, v_line.quantity, 'returned', v_order.staff_label,
              'Cancelled order ' || v_order.order_number);

      update inventory_items
         set quantity = quantity + v_line.quantity, updated_at = clock_timestamp()
       where id = v_line.item_id;
    end if;
  end loop;

  update orders set status = 'cancelled' where id = p_id returning * into v_order;
  return v_order;
end $$;


-- ── 7. order_set_status — fulfilment only. Cancelling goes through 6. ──────
create or replace function public.order_set_status(p_id uuid, p_status text,
                                                   p_version timestamptz)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare v_order public.orders;
begin
  if p_status not in ('draft','placed','fulfilled') then
    raise exception 'Use order_cancel to cancel an order.' using errcode = '22023';
  end if;
  select * into v_order from orders where id = p_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if p_version is null or v_order.updated_at <> p_version then
    raise exception 'This order changed. Refresh and try again.' using errcode = '40001';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'A cancelled order cannot be reopened.' using errcode = '22023';
  end if;

  update orders
     set status = p_status,
         fulfilled_at = case when p_status = 'fulfilled' then now() else null end
   where id = p_id
  returning * into v_order;
  return v_order;
end $$;


-- ── 8. RLS — deny by default, exactly like inventory ───────────────────────
-- No anon or authenticated policy is created here, so orders are unreadable
-- from a browser. The dashboard reads them server-side with the service-role
-- key. When 0004 ships, staff policies get added alongside the inventory ones.
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

revoke all on function public.order_create(jsonb, jsonb)              from public, anon, authenticated;
revoke all on function public.order_cancel(uuid, timestamptz)          from public, anon, authenticated;
revoke all on function public.order_set_status(uuid, text, timestamptz) from public, anon, authenticated;

grant execute on function public.order_create(jsonb, jsonb)               to service_role;
grant execute on function public.order_cancel(uuid, timestamptz)          to service_role;
grant execute on function public.order_set_status(uuid, text, timestamptz) to service_role;

commit;
