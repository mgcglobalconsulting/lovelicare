-- ===========================================================================
-- LoveLi Care — staff identity, roles, RLS, and an audit trail
--
-- STATUS: WRITTEN FOR REVIEW. **NOT APPLIED.** Read docs/AUTH-DESIGN.md first.
--
-- Replaces the interim shared-token gate in lib/dashboard-api.js with real
-- per-user identity, so Libra and each assigned admin sign in as themselves.
--
-- THE CENTRAL CHANGE
--   Today the dashboard reads with the service-role key, which bypasses RLS
--   entirely. That is defensible for a single-admin tool behind one secret.
--   For multiple admins it is wrong: RLS must BECOME the security boundary,
--   and every read must carry the signed-in user's JWT. After this migration
--   the service-role key is used for exactly one thing — the public forms'
--   inserts — and never for dashboard reads.
--
-- NO PHI. D4 holds: clinical intake stays in Vagaro. These tables carry
-- marketing/ops data, staff identity, and product inventory only.
-- ===========================================================================


-- ── 1. Roles ───────────────────────────────────────────────────────────────
-- An enum, not free text: a typo in a check constraint fails loudly at write
-- time, but a typo in a POLICY fails *open* by simply never matching.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'staff_role') then
    create type public.staff_role as enum ('owner', 'provider', 'front_desk');
  end if;
end $$;


-- ── 2. Staff ───────────────────────────────────────────────────────────────
-- id IS the auth user id. One row per person who may open the dashboard.
-- Someone with a Google account but no row here is authenticated but NOT
-- staff, and every policy below denies them.
create table if not exists public.staff (
  id            uuid primary key references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  email         text not null unique,
  full_name     text,
  role          public.staff_role not null default 'front_desk',

  -- Deactivate rather than delete, so audit rows keep a resolvable actor.
  active        boolean not null default true,
  last_seen_at  timestamptz
);

comment on table public.staff is
  'People permitted to use the owner dashboard. id = auth.users.id. No PHI.';
comment on column public.staff.active is
  'Soft disable. Deleting a staff row would orphan their audit_log entries.';


-- ── 3. Invites — solves the bootstrap problem ──────────────────────────────
-- Chicken-and-egg: only an owner may create staff, but at install time there
-- are no staff, so no one can. Rather than weaken the policy, we pre-authorise
-- by EMAIL here. This migration runs as postgres and bypasses RLS, so the
-- first owner can be seeded. On first sign-in a trigger converts the invite
-- into a staff row.
--
-- This also means Google sign-in is not self-serve: an uninvited Google
-- account can authenticate but gets no staff row and therefore sees nothing.
create table if not exists public.staff_invites (
  email       text primary key,
  role        public.staff_role not null default 'front_desk',
  invited_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  note        text
);

comment on table public.staff_invites is
  'Pre-authorised emails. Consumed by handle_new_staff_user() on first sign-in.';


-- ── 4. Helpers ─────────────────────────────────────────────────────────────
-- SECURITY DEFINER is REQUIRED here, and the reason is subtle: these are
-- called from inside policies ON public.staff. A plain (invoker) function
-- would re-enter that policy to read staff, which re-calls the function —
-- infinite recursion, and Postgres raises rather than denying. DEFINER reads
-- staff with the owner's rights, bypassing RLS, breaking the cycle.
--
-- search_path is pinned on both (advisor 0011). Both are read-only and take
-- no arguments, so they leak nothing beyond "is the caller staff, and what
-- role" — which the caller already knows about themselves.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.id = (select auth.uid()) and s.active
  );
$$;

create or replace function public.staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select s.role from public.staff s
  where s.id = (select auth.uid()) and s.active;
$$;

-- Convenience: "is the caller at least this privileged".
create or replace function public.staff_at_least(min public.staff_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.staff_role()
           when 'owner'      then true
           when 'provider'   then min in ('provider', 'front_desk')
           when 'front_desk' then min = 'front_desk'
           else false
         end;
$$;

revoke execute on function public.is_staff()        from anon;
revoke execute on function public.staff_role()      from anon;
revoke execute on function public.staff_at_least(public.staff_role) from anon;


-- ── 5. First sign-in: invite → staff ───────────────────────────────────────
create or replace function public.handle_new_staff_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.staff_invites%rowtype;
begin
  select * into inv from public.staff_invites
   where lower(email) = lower(new.email);

  if found then
    insert into public.staff (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name',
               new.raw_user_meta_data ->> 'name'),
      inv.role
    )
    on conflict (id) do nothing;

    delete from public.staff_invites where lower(email) = lower(new.email);
  end if;

  -- Uninvited sign-ups are deliberately allowed to create an auth user but
  -- get no staff row. They can sign in and see nothing, which is the correct
  -- outcome for a public OAuth provider: we cannot stop someone clicking
  -- "Sign in with Google", only stop it meaning anything.
  return new;
end $$;

drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row execute function public.handle_new_staff_user();


-- ── 6. Audit log ───────────────────────────────────────────────────────────
-- The gap that multi-user auth creates: with one shared token nobody could
-- tell who changed a status. Append-only; no UPDATE or DELETE policy exists
-- for anyone, including owner.
create table if not exists public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  at           timestamptz not null default now(),
  actor_id     uuid references auth.users(id),
  actor_email  text,
  action       text not null,
  entity_type  text not null,
  entity_id    uuid,
  before       jsonb,
  after        jsonb
);

create index if not exists audit_log_at_idx     on public.audit_log (at desc);
create index if not exists audit_log_actor_idx  on public.audit_log (actor_id, at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);

comment on table public.audit_log is
  'Append-only. Who changed what, when. Never UPDATE or DELETE. No PHI.';

-- A trigger, not application code: app-level logging is forgotten exactly when
-- it matters. This cannot be bypassed by any route that writes the table.
create or replace function public.log_inquiry_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_log
      (actor_id, actor_email, action, entity_type, entity_id, before, after)
    values (
      (select auth.uid()),
      (select s.email from public.staff s where s.id = (select auth.uid())),
      'inquiry.status_changed',
      'contact_inquiries',
      new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end $$;

drop trigger if exists contact_inquiries_audit on public.contact_inquiries;
create trigger contact_inquiries_audit
  after update on public.contact_inquiries
  for each row execute function public.log_inquiry_status_change();


-- ── 7. Attribute inventory movements to a real person ──────────────────────
-- staff_label (free text) was fine when one person held one token. Add a real
-- FK. The old column stays so the seeded initial_count rows remain readable.
alter table public.inventory_movements
  add column if not exists actor_id uuid references auth.users(id);

create index if not exists inventory_movements_actor_idx
  on public.inventory_movements (actor_id, created_at desc);


-- ── 8. updated_at ──────────────────────────────────────────────────────────
drop trigger if exists staff_touch on public.staff;
create trigger staff_touch
  before update on public.staff
  for each row execute function public.touch_updated_at();


-- ===========================================================================
-- 9. POLICIES
--
-- Capability matrix — the whole authorisation model, in one place:
--
--                              owner   provider   front_desk   anon
--   inquiries   read             y        y           y          n
--   inquiries   set status       y        y           y          n
--   inquiries   submit (form)    -        -           -          Y
--   subscribers read             y        y           y          n
--   inventory   read             y        y           y          n
--   inventory   adjust stock     y        y           n          n
--   project_notes read           y        n           n          n
--   staff       read roster      y        y           y          n
--   staff       manage           y        n           n          n
--   audit_log   read             y        y           n          n
--   audit_log   modify           n        n           n          n
-- ===========================================================================

alter table public.staff          enable row level security;
alter table public.staff_invites  enable row level security;
alter table public.audit_log      enable row level security;

-- staff: everyone on the team can see who else is on it; only owner edits.
drop policy if exists "staff read roster" on public.staff;
create policy "staff read roster" on public.staff
  for select to authenticated using (public.is_staff());

drop policy if exists "owner manages staff" on public.staff;
create policy "owner manages staff" on public.staff
  for all to authenticated
  using (public.staff_role() = 'owner')
  with check (public.staff_role() = 'owner');

-- invites: owner only. Nobody else may even see who has been invited.
drop policy if exists "owner manages invites" on public.staff_invites;
create policy "owner manages invites" on public.staff_invites
  for all to authenticated
  using (public.staff_role() = 'owner')
  with check (public.staff_role() = 'owner');

-- audit_log: readable by owner and provider. NO insert/update/delete policy —
-- rows arrive only via SECURITY DEFINER triggers, and nothing can rewrite them.
drop policy if exists "staff read audit" on public.audit_log;
create policy "staff read audit" on public.audit_log
  for select to authenticated
  using (public.staff_at_least('provider'));

-- contact_inquiries: the anon INSERT policy from 0001 is UNCHANGED — the
-- public form must keep working. These only ADD staff read/update.
drop policy if exists "staff read inquiries" on public.contact_inquiries;
create policy "staff read inquiries" on public.contact_inquiries
  for select to authenticated using (public.is_staff());

drop policy if exists "staff update inquiries" on public.contact_inquiries;
create policy "staff update inquiries" on public.contact_inquiries
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- newsletter_subscribers: read-only for staff. Nobody edits a subscriber by
-- hand; unsubscribes come through the public path.
drop policy if exists "staff read subscribers" on public.newsletter_subscribers;
create policy "staff read subscribers" on public.newsletter_subscribers
  for select to authenticated using (public.is_staff());

-- inventory: all staff read; owner and provider adjust. front_desk is
-- deliberately read-only — stock is a clinical-supply responsibility.
drop policy if exists "staff read inventory" on public.inventory_items;
create policy "staff read inventory" on public.inventory_items
  for select to authenticated using (public.is_staff());

drop policy if exists "providers adjust inventory" on public.inventory_items;
create policy "providers adjust inventory" on public.inventory_items
  for update to authenticated
  using (public.staff_at_least('provider'))
  with check (public.staff_at_least('provider'));

drop policy if exists "owner manages inventory" on public.inventory_items;
create policy "owner manages inventory" on public.inventory_items
  for insert to authenticated
  with check (public.staff_role() = 'owner');

drop policy if exists "staff read movements" on public.inventory_movements;
create policy "staff read movements" on public.inventory_movements
  for select to authenticated using (public.is_staff());

-- Append-only, and you may only file a movement AS YOURSELF.
drop policy if exists "providers log movements" on public.inventory_movements;
create policy "providers log movements" on public.inventory_movements
  for insert to authenticated
  with check (
    public.staff_at_least('provider')
    and actor_id = (select auth.uid())
  );

-- project_notes: owner only. Internal planning, budget figures, decisions.
drop policy if exists "owner reads notes" on public.project_notes;
create policy "owner reads notes" on public.project_notes
  for select to authenticated
  using (public.staff_role() = 'owner');


-- ── 10. Seed the executive admins ──────────────────────────────────────────
-- Exactly two people have access right now. Both `owner`.
--
-- ⚠️ CONFIRM BOTH ADDRESSES BEFORE RUNNING. Each must be the exact address
-- that person signs in to Google with. The trigger matches on email
-- (case-insensitively) and nothing else — a mismatch means they authenticate
-- successfully into a completely empty dashboard, which looks like a bug but
-- is this policy working correctly.
--
-- Adding anyone later does NOT need another migration. An owner inserts a row
-- into staff_invites (or uses the dashboard once the staff screen exists) and
-- the invite is consumed on that person's first sign-in.
insert into public.staff_invites (email, role, note) values
  ('LoveLiCareSvcs@gmail.com', 'owner',
   'Libra T. Robertson, NP-CRNP — founding owner, clinical'),
  ('onedopementor@gmail.com',  'owner',
   'Mark G. Cartwright — executive admin, technical')
on conflict (email) do nothing;
