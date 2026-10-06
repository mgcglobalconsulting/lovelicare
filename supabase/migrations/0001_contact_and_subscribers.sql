-- LoveLi Care Med Spa — form intake tables
-- Each form field lands in its own labeled column so inquiries are queryable,
-- not buried in an email body.
--
-- Writes happen server-side with the publishable key and insert-only RLS.
-- Public roles may submit forms but cannot read, update, or delete rows.

-- ── Contact / consultation inquiries (the main contact form) ────────────────
create table if not exists public.contact_inquiries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  -- Labeled form sections, 1:1 with the fields on the contact form
  name        text,                 -- "Your Name"
  email       text not null,        -- "Email *"
  phone       text,                 -- "Phone"
  service     text,                 -- "Service Interest" (dropdown)
  message     text,                 -- "Message"

  -- Triage / provenance
  status      text not null default 'new'
              check (status in ('new', 'contacted', 'booked', 'closed', 'spam')),
  source      text not null default 'website_contact_form',
  page_url    text,
  user_agent  text,
  notes       text                  -- staff-only follow-up notes
);

comment on table  public.contact_inquiries is 'Submissions from the LoveLi Care website contact form.';
comment on column public.contact_inquiries.service is 'Selected "Service Interest" option, e.g. Medical Aesthetics (Botox / Fillers).';
comment on column public.contact_inquiries.status  is 'Follow-up state, managed by staff. Defaults to new.';

create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);
create index if not exists contact_inquiries_status_idx     on public.contact_inquiries (status);
create index if not exists contact_inquiries_email_idx      on public.contact_inquiries (email);

alter table public.contact_inquiries enable row level security;

-- ── Newsletter / wellness community subscribers ─────────────────────────────
create table if not exists public.newsletter_subscribers (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),

  email          text not null,
  status         text not null default 'subscribed'
                 check (status in ('subscribed', 'unsubscribed')),
  source         text not null default 'website_subscribe_form',
  page_url       text,
  user_agent     text,
  unsubscribed_at timestamptz
);

comment on table public.newsletter_subscribers is 'Email signups from the LoveLi Care online store subscribe form.';

-- One row per address, case-insensitive. Lets the API treat a repeat signup as
-- success instead of surfacing an error to the visitor.
create unique index if not exists newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

create index if not exists newsletter_subscribers_created_at_idx
  on public.newsletter_subscribers (created_at desc);

alter table public.newsletter_subscribers enable row level security;

-- ── Insert-only access for the public site ─────────────────────────────────
-- The site may add a submission and nothing else. With no SELECT/UPDATE/DELETE
-- policy, those operations are denied for anon and authenticated, so a leaked
-- publishable key cannot read anyone's contact details. Staff read the rows in
-- the Supabase dashboard, which authenticates separately.
drop policy if exists "public can submit an inquiry" on public.contact_inquiries;
create policy "public can submit an inquiry"
  on public.contact_inquiries for insert to anon, authenticated with check (true);

drop policy if exists "public can subscribe" on public.newsletter_subscribers;
create policy "public can subscribe"
  on public.newsletter_subscribers for insert to anon, authenticated with check (true);
