-- Inventory workspace: pricing, fractional stock and atomic ledger writes.
-- Existing counts are preserved. No source-file counts are applied implicitly.
begin;
alter table public.inventory_items alter column quantity type numeric(12,2);
alter table public.inventory_items alter column reorder_at type numeric(12,2);
alter table public.inventory_movements alter column delta type numeric(12,2);
alter table public.inventory_items
  add column if not exists cost_price numeric(12,2) check (cost_price >= 0),
  add column if not exists retail_price numeric(12,2) check (retail_price >= 0),
  add column if not exists compare_at_price numeric(12,2) check (compare_at_price >= 0),
  add column if not exists sku text,
  add column if not exists image_url text,
  add column if not exists archived boolean not null default false,
  add column if not exists payment_plan jsonb;

create or replace function public.inventory_save(p_item jsonb, p_id uuid default null, p_version timestamptz default null)
returns public.inventory_items language plpgsql security invoker set search_path = public as $$
declare v public.inventory_items; q numeric;
begin
  if p_id is null then
    q := coalesce((p_item->>'quantity')::numeric, 0);
    if q < 0 then raise exception 'Stock cannot be negative' using errcode='22023'; end if;
    insert into inventory_items (name,common_name,manufacturer,category,strength,unit,quantity,reorder_at,
      cost_price,retail_price,compare_at_price,sku,image_url,notes,rx_only,payment_plan)
    values (p_item->>'name',p_item->>'common_name',p_item->>'manufacturer',p_item->>'category',
      p_item->>'strength',p_item->>'unit',q,(p_item->>'reorder_at')::numeric,
      (p_item->>'cost_price')::numeric,(p_item->>'retail_price')::numeric,
      (p_item->>'compare_at_price')::numeric,p_item->>'sku',p_item->>'image_url',p_item->>'notes',
      coalesce((p_item->>'rx_only')::boolean,true),p_item->'payment_plan') returning * into v;
    insert into inventory_movements(item_id,delta,reason,staff_label,note)
      values(v.id,q,'initial_count','Dashboard owner','Opening stock entered in inventory workspace');
  else
    select * into v from inventory_items where id=p_id for update;
    if not found then raise exception 'Product not found' using errcode='P0002'; end if;
    if p_version is null or v.updated_at <> p_version then
      raise exception 'Product changed. Refresh and try again.' using errcode='40001';
    end if;
    update inventory_items set name=p_item->>'name',common_name=p_item->>'common_name',
      manufacturer=p_item->>'manufacturer',category=p_item->>'category',strength=p_item->>'strength',
      unit=p_item->>'unit',reorder_at=(p_item->>'reorder_at')::numeric,
      cost_price=(p_item->>'cost_price')::numeric,retail_price=(p_item->>'retail_price')::numeric,
      compare_at_price=(p_item->>'compare_at_price')::numeric,sku=p_item->>'sku',
      image_url=p_item->>'image_url',notes=p_item->>'notes',payment_plan=p_item->'payment_plan',updated_at=clock_timestamp()
      where id=p_id returning * into v;
  end if;
  return v;
end $$;

create or replace function public.inventory_adjust(p_id uuid,p_delta numeric,p_reason text,p_note text,
  p_version timestamptz)
returns public.inventory_items language plpgsql security invoker set search_path=public as $$
declare v public.inventory_items;
begin
  if p_delta=0 or p_delta is null or abs(p_delta)>1000000 or round(p_delta,2)<>p_delta then
    raise exception 'Invalid quantity' using errcode='22023';
  end if;
  if p_reason not in ('received','administered','wasted','expired','adjustment') then
    raise exception 'Invalid stock reason' using errcode='22023';
  end if;
  if (p_reason='received' and p_delta<0) or (p_reason in ('administered','wasted','expired') and p_delta>0) then
    raise exception 'Quantity direction does not match reason' using errcode='22023';
  end if;
  select * into v from inventory_items where id=p_id for update;
  if not found then raise exception 'Product not found' using errcode='P0002'; end if;
  if p_version is null or v.updated_at<>p_version then
    raise exception 'Stock changed. Refresh and try again.' using errcode='40001';
  end if;
  if v.quantity+p_delta<0 then raise exception 'Insufficient stock' using errcode='22023'; end if;
  insert into inventory_movements(item_id,delta,reason,staff_label,note)
    values(p_id,p_delta,p_reason,'Dashboard owner',p_note);
  update inventory_items set quantity=quantity+p_delta,updated_at=clock_timestamp()
    where id=p_id returning * into v;
  return v;
end $$;

create or replace function public.inventory_import(p_items jsonb)
returns integer language plpgsql security invoker set search_path=public as $$
declare p jsonb; n integer:=0;
begin
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200 then
    raise exception 'Import must contain at most 200 products' using errcode='22023';
  end if;
  for p in select * from jsonb_array_elements(p_items) loop
    perform inventory_save(p); n:=n+1;
  end loop;
  return n;
end $$;

revoke all on function public.inventory_save(jsonb,uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.inventory_adjust(uuid,numeric,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.inventory_import(jsonb) from public,anon,authenticated;
grant execute on function public.inventory_save(jsonb,uuid,timestamptz) to service_role;
grant execute on function public.inventory_adjust(uuid,numeric,text,text,timestamptz) to service_role;
grant execute on function public.inventory_import(jsonb) to service_role;
commit;
