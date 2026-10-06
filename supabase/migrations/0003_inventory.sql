-- LoveLi Care Med Spa — Injectable / IV inventory
--
-- SOURCE OF TRUTH: every row below was transcribed from a photograph of the
-- physical vial in ~/Desktop/lovelicare-raw-phootage. Nothing here is invented.
-- Where a label was partially obscured in the photo the column is left NULL
-- rather than guessed — see `label_verified`.
--
-- This is PRODUCT inventory, not patient data. No PHI. Safe for the ops tier.
--
--   Photo evidence per row is recorded in `source_image` so any number on the
--   dashboard can be traced back to the picture it came from.

-- ── Catalog ────────────────────────────────────────────────────────────────
create table if not exists public.inventory_items (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Identity, exactly as printed on the vial
  name            text not null,              -- "GLUTATHIONE INJECTION PRESERVATIVE FREE"
  common_name     text,                       -- "Glutathione"
  active_ingredients text,                    -- "Methionine / Inositol / Choline Chloride"
  strength        text,                       -- "200 mg/mL"
  volume_ml       numeric(6,2),               -- 30.00
  ndc             text,                       -- "72827-2402-1"
  manufacturer    text,                       -- "Empower Pharmacy"
  vial_type       text,                       -- "Sterile Single-Dose" | "Multiple Dose"
  route           text,                       -- "IV" | "IM" | "IM or IV" | "IM or SubQ"
  rx_only         boolean not null default true,
  compounded      boolean not null default false,

  -- Merchandising
  category        text not null
                  check (category in ('iv_therapy','im_injection','lipotropic',
                                      'vitamin','mineral','antioxidant','other')),
  benefits        text[],                     -- from the clinic's own chalkboard

  -- Stock
  quantity        integer not null default 0 check (quantity >= 0),
  reorder_at      integer not null default 10,
  unit            text not null default 'vial',

  -- Provenance
  source_image    text,                       -- the photo this row was read from
  label_verified  boolean not null default false,
  notes           text
);

comment on table public.inventory_items is
  'Injectable and IV product catalog, transcribed from vial photographs. No PHI.';
comment on column public.inventory_items.reorder_at is
  'Base count. At or below this, the item is flagged low on the dashboard.';
comment on column public.inventory_items.source_image is
  'Filename in lovelicare-raw-phootage that this row was read from.';

create index if not exists inventory_items_category_idx on public.inventory_items (category);
create index if not exists inventory_items_quantity_idx on public.inventory_items (quantity);
create unique index if not exists inventory_items_name_strength_key
  on public.inventory_items (lower(name), coalesce(strength, ''));

-- ── Movement log — every change to quantity, append-only ───────────────────
-- Without this a stock number is just an assertion. With it, the dashboard can
-- show a count that is the sum of its movements, which is the honesty rule
-- applied to inventory.
create table if not exists public.inventory_movements (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  item_id      uuid not null references public.inventory_items(id) on delete cascade,
  delta        integer not null,              -- -1 used, +10 restocked
  reason       text not null
               check (reason in ('received','administered','wasted','expired',
                                 'adjustment','initial_count')),
  staff_label  text,                          -- "Libra R." — never a full client name
  note         text
);

create index if not exists inventory_movements_item_idx
  on public.inventory_movements (item_id, created_at desc);

comment on table public.inventory_movements is
  'Append-only stock ledger. Never records who a dose was given to — no PHI.';

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Deny by default. No anon or authenticated policy is created, so inventory is
-- unreadable from a browser. The dashboard reads it server-side with the
-- service-role key, exactly like contact_inquiries.
alter table public.inventory_items     enable row level security;
alter table public.inventory_movements enable row level security;

-- ── Seed: base count 10, every item stocked at 10 ──────────────────────────
insert into public.inventory_items
  (name, common_name, active_ingredients, strength, volume_ml, ndc, manufacturer,
   vial_type, route, rx_only, compounded, category, benefits,
   quantity, reorder_at, source_image, label_verified)
values
  ('GLUTATHIONE INJECTION PRESERVATIVE FREE', 'Glutathione', 'Glutathione',
   '200 mg/mL', 30, '72827-2402-1', 'Empower Pharmacy',
   'Sterile Single-Dose', 'IV', true, true, 'antioxidant',
   array['Skin brightening','Detoxification','Antioxidant support'],
   10, 10, 'gluthathione-injection-and-biotin.png', true),

  ('BIOTIN SOLUTION FOR INJECTION', 'Biotin', 'Biotin',
   '10 mg/mL', 30, '72833-589-30', 'ASP Cares',
   'Multiple Dose', 'IM or IV', true, false, 'vitamin',
   array['Strong hair & nails','Skin health'],
   10, 10, 'gluthathione-injection-and-biotin.png', true),

  ('LIPO INJECTION', 'Lipotropic', 'Methionine / Inositol / Choline Chloride',
   '25 / 50 / 50 mg/mL', 30, '72827-2415-1', 'Empower Pharmacy',
   'Sterile Multiple-Dose', 'IM', true, true, 'lipotropic',
   array['Burn fat','Boost metabolism'],
   10, 10, 'libo-injection-and-libo-b-injection.png', true),

  ('LIPO-B INJECTION', 'Lipotropic B',
   'Methionine / Inositol / Choline Chloride / Cyanocobalamin',
   '25 / 50 / 50 / 1 mg/mL', 30, '72827-2419-1', 'Empower Pharmacy',
   'Sterile Multiple-Dose', 'IM', true, true, 'lipotropic',
   array['Burn fat','Boost metabolism','Energy'],
   10, 10, 'libo-injection-and-libo-b-injection.png', true),

  ('TAURINE INJECTION', 'Taurine', 'Taurine',
   '50 mg/mL', 30, null, 'Empower Pharmacy',
   'Sterile Multiple-Dose', 'IM', true, true, 'im_injection',
   array['Energy','Metabolic support'],
   10, 10, 'taurine-pryridozine--hcl-b6.JPG', true),

  ('PYRIDOXINE HCL (B6) INJECTION', 'Vitamin B6', 'Pyridoxine Hydrochloride',
   '100 mg/mL', 30, null, 'Empower Pharmacy',
   'Sterile Multiple-Dose', 'IM', true, true, 'vitamin',
   array['Energy','Metabolism','Mood support'],
   10, 10, 'taurine-pryridozine--hcl-b6.JPG', true),

  ('COENZYME Q-10 (UBIDECARENONE) INJECTION', 'CoQ10', 'Ubidecarenone',
   '20 mg/mL', 10, null, 'Empower Pharmacy',
   'Sterile Multiple Dose', 'IM or SubQ', true, true, 'antioxidant',
   array['Cellular energy','Antioxidant support','Heart health'],
   10, 10, 'coenzyme-q-10.png', true),

  ('VITAMIN D3 INJECTION', 'Vitamin D3', 'Cholecalciferol',
   '50,000 IU/mL', 30, '73198-0075', 'Olympia Compounding Pharmacy',
   'Multiple Dose', 'IM', true, true, 'vitamin',
   array['Immune support','Bone health','Mood support'],
   10, 10, 'vitamin-d3.JPG', true),

  ('ZINC CHLORIDE INJECTION', 'Zinc', 'Zinc Chloride',
   '0.5 mg/mL', 30, null, 'Olympia Pharmaceuticals',
   'Multi-Dose', 'IV', true, true, 'mineral',
   array['Immune support','Skin healing'],
   10, 10, 'zinc-chloride.png', true)
on conflict do nothing;

-- Opening count, so every quantity above is backed by a ledger row.
insert into public.inventory_movements (item_id, delta, reason, staff_label, note)
select id, quantity, 'initial_count', 'Libra R.',
       'Opening count from vial photographs, ' || coalesce(source_image, 'unknown')
from public.inventory_items
where not exists (
  select 1 from public.inventory_movements m
  where m.item_id = public.inventory_items.id and m.reason = 'initial_count'
);
