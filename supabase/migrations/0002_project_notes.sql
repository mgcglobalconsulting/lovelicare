-- LoveLi Care — project notes / session memory
--
-- Durable home for the markdown planning docs in docs/, so a new Claude session
-- (or Obsidian, or a future dashboard) can read project state without the repo.
--
-- SCOPE: internal project documentation ONLY. Plans, decisions, handoffs.
-- This table is NOT for client data and NOT for protected health information.
-- LoveLi Care's stack is deliberately out of HIPAA scope — Supabase will only
-- sign a BAA on Team ($599/mo) + HIPAA add-on ($350/mo) = $949/mo, against a
-- $433/mo budget. See docs/BUDGET.md §1. Clinical intake routes through Vagaro.
--
-- RLS: deny-by-default. NO anon or authenticated policy is created, so the
-- publishable key cannot read or write this table at all. Sync runs server-side
-- with the service-role key, which bypasses RLS. That is the intent: these are
-- internal notes and must never be reachable from a browser.

create table if not exists public.project_notes (
  id           uuid primary key default gen_random_uuid(),

  -- Identity. slug is the stable key the sync upserts on; it comes from the
  -- markdown frontmatter, falling back to the filename.
  slug         text not null unique,
  title        text not null,
  project      text not null default 'lovelicare',

  -- Classification, mirroring the Obsidian frontmatter 1:1 so the same file
  -- round-trips between vault, repo and database without transformation.
  type         text not null default 'note'
               check (type in ('plan','handoff','decision','reference','note','brief')),
  phase        int,
  status       text not null default 'draft'
               check (status in ('draft','planned','in_progress','blocked','complete','superseded')),
  tags         text[] not null default '{}',

  -- Content
  body_md      text not null,                  -- the markdown body, frontmatter stripped
  frontmatter  jsonb not null default '{}',    -- full frontmatter, so nothing is lost
  source_path  text,                           -- e.g. docs/HERO-VIDEO-PLAN.md

  -- Idempotent sync: unchanged files are skipped instead of rewritten.
  content_hash text not null,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table  public.project_notes is
  'Internal LoveLi Care planning docs synced from docs/*.md. No client data, no PHI.';
comment on column public.project_notes.slug is
  'Stable upsert key from frontmatter `slug`, else the filename.';
comment on column public.project_notes.content_hash is
  'sha256 of the raw file. Lets the sync skip unchanged notes.';
comment on column public.project_notes.frontmatter is
  'Complete frontmatter as JSON so Obsidian-only fields survive the round trip.';

create index if not exists project_notes_project_idx on public.project_notes (project);
create index if not exists project_notes_type_idx    on public.project_notes (type);
create index if not exists project_notes_status_idx  on public.project_notes (status);
create index if not exists project_notes_updated_idx on public.project_notes (updated_at desc);
create index if not exists project_notes_tags_idx    on public.project_notes using gin (tags);

-- keep updated_at honest
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists project_notes_touch on public.project_notes;
create trigger project_notes_touch
  before update on public.project_notes
  for each row execute function public.touch_updated_at();

-- Deny by default. No policies granted to anon/authenticated on purpose.
alter table public.project_notes enable row level security;
