# Build Brief: Native Booking + Slack Booking Agent (replaces Vagaro)

> **How to use this file:** start a Claude session in `~/Desktop/lovelicare` and say:
> "Read docs/VAGARO-REPLACEMENT-PLAN.md and run it. Start at Step 0."

**Status:** plan only. Nothing built, migrated, pushed or deployed. Written 2026-10-05 at Mark's request.

---

## Role and objective

You are the engineer for LoveLi Care Med Spa (Libra T. Robertson, NP-CRNP, Towson, MD).

Replace the embedded Vagaro "Book Online" widget on `lovelicare-five.vercel.app` with booking that this project owns end to end:

1. **Client booking flow** on the site: service menu, packages, time slots, cart and confirmation.
2. **Supabase as the system of record**, with constraints and triggers enforcing the business rules.
3. **Manuela, the Slack booking assistant.** Libra and her staff run the schedule from Slack:
   - booking alerts with one-click buttons
   - a daily agenda
   - plain-English commands ("move Tasha to 3pm Friday", "block Monday morning"), carried out by Manuela, a Claude agent with tools

Done means a client can book on the site, the slot can't be double-booked, and Libra gets a Slack card with Confirm / Decline / Reschedule buttons that work. She can also ask Manuela about or change her schedule in Slack, and every change is confirmed before it is written.

## Ground truth: what exists now (verify, don't assume)

- **Stack:**
  - Express in `server.js`: routes `/health`, `/chatbot`, `/api/contact`, `/api/subscribe`, `/draft`, `/chat`.
  - `@anthropic-ai/sdk`, `@supabase/supabase-js`, `googleapis`.
  - `vercel.json` for deploys.
  - Supabase helper in `lib/supabase.js`.
  - One migration: `supabase/migrations/0001_contact_and_subscribers.sql`.
- **No Slack code exists yet.**
- **Vagaro features to match**, from Mark's screenshots:
  - services grouped by category (e.g. "Extended Sale")
  - packages like "4 for $40 Wellness Injections" ($40.00, long description, 4 injections over 2 per visit)
  - a cart with item count
  - checkout
- Read `docs/SESSION-HANDOFF.md`, `docs/NEXT-SESSION-PLAN.md` and `docs/OWNER-DEPLOY.md` before writing code. They may change the plan.

## Hard rules

- Work only inside `~/Desktop/lovelicare`. Never touch other client folders.
- No `git push`, Vercel deploy, production migration, Slack app install, or message to a real person without Mark's explicit OK in the conversation. Build and test locally; use a test Slack workspace or channel.
- **No health information in Slack, ever.** Slack messages carry first name, last initial, service name, time and booking ID only. Intake answers, conditions, medications and notes stay in the database (or a HIPAA tool; see Decision D).
- **Secrets stay in env vars:** `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN`, `SLACK_BOOKINGS_CHANNEL_ID`, `SLACK_ALLOWED_USER_IDS`, `STRIPE_*`, `LOVELI_AGENT_MODEL`. Never read or print `.env*` contents.
- **Model text goes in with `textContent`,** never `innerHTML`.
- **Dates and times:** store times as `timestamptz` and display in America/New_York.

## Step 0: decisions (ask Mark once, all together, then wait)

| # | Decision | Default if Mark says "you pick" |
|---|---|---|
| A | Payment at booking: none, deposit (amount?), or full prepay | Deposit $25 via Stripe Checkout, credited at visit |
| B | Mirror bookings to Libra's Google Calendar? | Yes, one-way write, using the existing `googleapis` setup |
| C | Cutover: export of her full Vagaro service menu, and a go-live date | Vagaro stays live until go-live; same-day switch |
| D | Intake/consent forms (contain health data): HIPAA-eligible Supabase plan with a BAA, or a separate HIPAA tool | Defer forms to Phase 3; Phases 1–2 store no health data |
| E | What "GoDaddy template" means: is any part of the site still on GoDaddy? | Vercel site only |
| F | Slack workspace and channel; who is allowed to act (Libra, staff) | New channel `#loveli-bookings`; Libra only |
| G | Cancellation window and no-show policy | 24 h; no automatic fees in Phase 1 |

## Phase 1: booking core

### Data (`supabase/migrations/0002_booking_core.sql`)

**Tables:**
- `service_categories`: id, name, sort.
- `services`: id, category_id, name, description, price_cents, duration_min, buffer_min, active, sort.
- `packages`: id, name, description, price_cents, includes jsonb, active. This is for items like "4 for $40".
- `providers`: id, display_name, slack_user_id, active.
- `provider_hours`: provider_id, weekday, start_time, end_time.
- `time_blocks`: provider_id, tstzrange, reason.
- `clients`: id, first_name, last_name, email, phone, created_at. No health fields.
- `bookings`:
  - Columns: id, client_id, provider_id, `during tstzrange`, status, source, total_cents, created_at.
  - Status values: `pending | confirmed | declined | cancelled | completed | no_show`.
  - Source values: `web | slack | admin`.
- `booking_items`: booking_id, service_id or package_id, price_cents.
- `booking_events`: an audit log of who did what, when, and from where (`web | slack | agent`).
- `notification_queue`: id, booking_id, kind, channel (`email | slack`), payload jsonb, status, attempts, run_after, last_error.

**Constraints:**
- `btree_gist` exclusion on `bookings (provider_id WITH =, during WITH &&) WHERE status IN ('pending','confirmed')`. This makes double booking impossible at the database level.
- Check constraints on prices, durations and status values.

**Triggers:**
- After insert on `bookings`: insert into `booking_events`, and queue an `owner_alert` (Slack) and a `client_received` (email).
- After status update: log the event, then queue the matching message:
  - confirmed → client confirmation
  - declined or cancelled → client notice and Slack update
- `updated_at` maintenance.

**Row-level security:**
- On for every table.
- The public site can read active services and packages only.
- All writes go through server routes that use the service role.

**Slot function:** `get_open_slots(service_id, date)` returns open start times. It takes provider hours, removes `time_blocks` and existing bookings, and applies the service duration and buffer.

### API (`server.js` or `routes/booking.js`)

- `GET /api/booking/menu`: categories, services and packages.
- `GET /api/booking/slots?service=&date=`
- `POST /api/booking`:
  - Validates the input and creates the client and booking in one transaction.
  - Maps an exclusion violation to HTTP 409 "slot just taken, pick another".
  - Rate-limited and origin-locked.
- `POST /api/booking/:id/cancel` uses a signed token link. No login needed.

### Booking UI (`public/book.html` + `public/assets/booking.js`)

- Flow: category accordion, then service cards (name, price, description, Add), then cart drawer with count, then date and slot picker, then contact details, then review and Book.
- Match the current LoveLi look: deep green, champagne gold "Book Now", serif headings.
- Must work at 375px and be keyboard accessible.
- The "Book Now" buttons open this flow instead of the Vagaro iframe. Keep the Vagaro embed code behind a flag until go-live.

### Notification worker

`POST /api/jobs/notifications`:
- Called by Vercel Cron every minute, or a Supabase `pg_cron` + `pg_net` hook.
- Claims queued rows with `FOR UPDATE SKIP LOCKED` and sends them.
- Retries with backoff and stops after 5 attempts.
- Slack and email failures never block a booking.

## Phase 1b: Manuela, the Slack booking assistant

### Slack app

- Bolt for JavaScript, mounted on the Express app in HTTP mode at `POST /api/slack/events`.
- Verify the Slack signing secret on every request. Socket Mode is OK for local dev.
- **Scopes (minimum):**
  - `chat:write`
  - `commands`
  - `app_mentions:read`
  - `im:history`
  - `im:write`
  - `users:read`
- **Access control:** only user IDs in `SLACK_ALLOWED_USER_IDS` can act. Anyone else gets a polite refusal.
- **Timing:** acknowledge every interaction within 3 seconds. Do the slow work after the ack (`waitUntil` on Vercel, or an async job).
- Write `slack/manifest.json`. Do **not** sync it to a live app without Mark's OK.

### What Libra sees in Slack

1. **New booking card** in `#loveli-bookings`:
   - Content: first name and last initial, service, time, total, deposit status.
   - Buttons: **Confirm**, **Decline**, **Reschedule**.
   - Each button updates the booking in the database, edits the card in place, and the trigger then emails the client.
2. **Daily agenda** at 7:30 am ET (cron): today's appointments, gaps and pending items.
3. **App Home tab:** this week's schedule plus quick actions (Block time, Pause online booking).
4. **Slash command** `/manuela today | week | pending | block <range>`.
5. **Manuela:** DM Manuela or @mention her in plain English.

### Who Manuela is (persona and system prompt core)

- **Name and app:** Slack app display name "Manuela", bot handle `@manuela`, slash command `/manuela`. Profile image: a simple monogram "M" in LoveLi deep green and champagne gold. No real person's photo.
- **Role:** front-desk and scheduling assistant for LoveLi Care Med Spa & Wellness Lounge. She works *for* Libra and her staff inside Slack. She does not talk to clients in Phase 1.
- **Voice:**
  - Warm, calm and brief, like a polished med spa coordinator.
  - Short Slack-friendly replies with times in ET and the weekday.
  - No emojis unless Libra uses them first.
- **Opening line on first DM:** "Hi, I'm Manuela, LoveLi Care's booking assistant. I can show your schedule, find open times, and line up changes for you to approve."
- **What she always does:**
  - Checks real data with tools before answering.
  - Asks when a name or time is ambiguous.
  - Proposes changes and waits for Approve.
  - Says plainly when something failed.
- **What she never does:**
  - Gives medical advice.
  - Shares health information.
  - Invents availability or prices.
  - Changes data without an Approve click.
  - Contacts a client on her own.
- **Identity honesty:** if asked, she says she's an AI assistant, not a person.
- **Config:**
  - `ASSISTANT_NAME=Manuela` (env var, so the name can change without code edits).
  - Store the system prompt in `lib/manuela/system-prompt.md`.
  - Store tools in `lib/manuela/tools.js` and the Slack handlers in `lib/manuela/slack.js`.

### Manuela's brain (Claude tool use)

- Model from `LOVELI_AGENT_MODEL`, defaulting to the current Sonnet model. Use the existing `@anthropic-ai/sdk` with a tool-use loop of 8 turns at most.
- **Read tools** (run freely):
  - `list_bookings(range, status?)`
  - `get_open_slots(service, date)`
  - `find_client(name)`, which returns booking history only, no health data
  - `get_menu()`
- **Write tools** (never run directly). Each one returns a *proposal*. Manuela posts a confirmation card ("Move Tasha R. from Fri 1:00 to Fri 3:00?" with Approve / Cancel buttons). The database changes only when an allowed user clicks Approve.
  - `propose_reschedule(booking_id, new_start)`
  - `propose_cancel(booking_id, reason)`
  - `propose_block_time(range, reason)`
  - `propose_booking(client, service, start)`
  - `propose_price_change(service, price)`
- Every approved action is written to `booking_events` with `source='agent'` and the Slack user ID.
- **System prompt rules:**
  - Never invent availability; always call `get_open_slots`.
  - Never put health information in a message.
  - Quote times in ET with the weekday.
  - When unsure which client or booking is meant, ask instead of guessing.
- **Guardrails:**
  - Per-user rate limit.
  - Tool arguments are validated server-side; the model's word is never trusted for IDs or prices.
  - Refuse requests outside scheduling, such as medical advice. Tell the user to contact Libra directly.

## Phase 2

- Reminder jobs at 24 h and 2 h (email; SMS via Twilio if Mark approves the cost).
- Client self-reschedule links.
- Stripe deposit per Decision A: Checkout plus a webhook, with the booking moving `pending` → `confirmed` on payment.
- Slack card shows the payment state.
- No-show marking from Slack.
- Optional Google Calendar mirror per Decision B.

## Phase 3 (needs Decision D first)

- Intake and consent forms.
- Client history.
- Gift cards.
- Memberships and package balances, e.g. tracking the 4 injections in "4 for $40".
- Review requests after `completed`.

## Testing (required before reporting done)

- **SQL tests:**
  - Two simultaneous inserts for the same slot leave exactly one booking.
  - Triggers enqueue the right notification rows.
  - Row-level security blocks anonymous writes.
- **API tests:** menu, slots, a booking that succeeds, a booking that hits a taken slot (409), and cancel with a bad token.
- **Slack:**
  - Signature verification rejects a bad request.
  - Button handlers are idempotent; a double click doesn't double-apply.
  - An unauthorized user is refused.
  - Agent write tools never touch the database without an Approve click.
- **Browser:** the whole booking flow at 375px and on desktop, in the in-app browser.

## Deliverables and report

1. `docs/booking-spec.md`: the final spec after Step 0 answers.
2. Migration `0002_booking_core.sql`, run against a **local or branch** database only.
3. Routes, UI, worker, Slack app and Manuela code, with tests.
4. `slack/manifest.json` and `docs/SLACK-SETUP.md`: the owner steps to create, install and set env vars.
5. Update `docs/SESSION-HANDOFF.md` at each milestone.
6. Report to Mark:
   - what works, with test output
   - what's left
   - the exact env vars and approvals needed: production migration, Slack install, Vercel deploy, go-live date

**Next step:** Step 0. Ask Mark decisions A–G in one message, then wait.
