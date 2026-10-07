---
title: LoveLi Care — Dashboard authentication design
slug: lovelicare-auth-design
project: lovelicare
type: decision
status: draft
created: 2026-10-06
updated: 2026-10-06
tags: [lovelicare, auth, supabase, rls, oauth, security]
aliases: ["Auth design", "Staff auth"]
related: ["[[lovelicare-dashboard-v1]]", "[[lovelicare-master-plan-v2]]", "[[lovelicare-handoff-2026-10-06]]"]
---

# Dashboard authentication — design for review

**Status: DRAFT. Nothing is applied. No code has changed.**
Deliverable so far: `supabase/migrations/0004_staff_auth_and_audit.sql`.

Read this, flag anything wrong, then I build the login page and swap the API.

---

## 1. What is wrong with what we have

The dashboard is gated by a single shared `DASHBOARD_TOKEN`. For a one-person
tool bound to `localhost` that is reasonable. For Libra **plus assigned admins**
on a public URL it fails in four ways:

| Problem | Consequence |
|---|---|
| One secret for everyone | No per-user identity |
| No identity | **No audit trail** — nobody can tell who changed a status |
| Shared secret | A leak compromises everyone at once |
| Rotation is all-or-nothing | Removing one person locks out all of them |

And a structural one: dashboard reads currently use the **service-role key,
which bypasses RLS entirely**. Authorisation lives in application code. With
several people and several roles, that is the wrong place for it.

---

## 2. The model

```
Google (or Apple / Azure / magic link)
        │  OAuth
        ▼
   auth.users            ← Supabase Auth owns this
        │  trigger on first sign-in, only if invited
        ▼
   public.staff          ← id = auth.users.id, carries the role
        │
        ▼
   RLS policies          ← THE security boundary
        │
        ▼
   data  (inquiries · subscribers · inventory · notes · audit)
```

**The central change: RLS becomes the boundary.** Every dashboard read carries
the signed-in user's JWT. The service-role key is then used for exactly one
thing — the public forms' inserts — and never for dashboard reads.

If a policy is wrong, the database denies it. Not a middleware we might forget.

---

## 3. Roles

Three, per `MASTER-PLAN-v2.md` §4.4. A Postgres **enum**, not free text,
because a typo in a `check` fails loudly but a typo in a **policy fails open**
by silently never matching.

|                        | owner | provider | front_desk | anon |
|---|:---:|:---:|:---:|:---:|
| Inquiries — read       | ✅ | ✅ | ✅ | ❌ |
| Inquiries — set status | ✅ | ✅ | ✅ | ❌ |
| Inquiries — submit form| –  | –  | –  | ✅ |
| Subscribers — read     | ✅ | ✅ | ✅ | ❌ |
| Inventory — read       | ✅ | ✅ | ✅ | ❌ |
| Inventory — adjust     | ✅ | ✅ | ❌ | ❌ |
| Project notes — read   | ✅ | ❌ | ❌ | ❌ |
| Staff — see roster     | ✅ | ✅ | ✅ | ❌ |
| Staff — manage         | ✅ | ❌ | ❌ | ❌ |
| Audit log — read       | ✅ | ✅ | ❌ | ❌ |
| Audit log — modify     | ❌ | ❌ | ❌ | ❌ |

**Libra = `owner`.**

Three judgement calls to confirm or overrule:

1. **`front_desk` cannot adjust inventory.** Stock is a clinical-supply
   responsibility; a receptionist miscounting vials corrupts the ledger.
2. **`project_notes` is owner-only.** It holds `BUDGET.md` and strategy.
3. **`front_desk` cannot read the audit log.** Who-did-what is a supervisory view.

---

## 4. Two problems worth explaining

### 4.1 Bootstrap — the chicken and egg

Only an `owner` may create staff. At install there are no staff, so **nobody
can create the first one.** Weakening the policy to allow self-registration
would let any Google account make itself an admin.

Solution: a `staff_invites` table keyed by **email**, seeded in the migration
(which runs as `postgres` and bypasses RLS). On first sign-in a trigger on
`auth.users` looks for a matching invite, creates the staff row with that role,
and consumes the invite.

Consequence, and it is the point: **Google sign-in is not self-serve.** An
uninvited account can authenticate but gets no staff row, so every policy
denies it. We cannot stop someone clicking "Sign in with Google" — only stop it
meaning anything.

#### Who has access right now

**Two people, both `owner`.** Seeded in `0004`:

| Person | Email seeded | Role | Note |
|---|---|---|---|
| Libra T. Robertson, NP-CRNP | `LoveLiCareSvcs@gmail.com` | `owner` | Founding owner, clinical |
| Mark G. Cartwright | `onedopementor@gmail.com` | `owner` | Executive admin, technical |

> ⚠️ **Both addresses must be confirmed before applying.** The trigger matches
> on email and nothing else. A mismatch means that person signs in
> *successfully* into a completely empty dashboard — which looks like a bug but
> is this policy working exactly as designed.

Adding a third person later needs **no migration**: an owner inserts a row into
`staff_invites` and it is consumed on that person's first sign-in.

### 4.2 Policy recursion

The helpers `is_staff()` and `staff_role()` are `SECURITY DEFINER`. This is not
convenience. They are called from policies **on `public.staff` itself**; an
invoker-rights function would re-enter that policy to read `staff`, which calls
the function again — infinite recursion, which Postgres raises rather than
denying. `DEFINER` reads with the owner's rights, bypassing RLS, breaking the
cycle. `search_path` is pinned on all of them (advisor 0011).

---

## 5. Audit log

Multi-user auth creates the obligation to know who did what.

- Append-only. **No `UPDATE` or `DELETE` policy exists for anyone, including `owner`.**
- Written by `SECURITY DEFINER` **triggers, not application code** — app-level
  logging gets forgotten exactly when it matters, and this cannot be bypassed
  by any route that writes the table.
- Captures actor id + email, action, entity, and a before/after `jsonb`.
- Staff are **deactivated, never deleted**, so an audit row always resolves to a person.
- `inventory_movements` gains `actor_id` (real FK) alongside the old free-text
  `staff_label`, which stays so the seeded opening counts remain readable.

---

## 6. Sign-in methods

Supabase Auth, enabled per provider. **No code difference between them** — all
land in `auth.users`.

| Method | Recommendation |
|---|---|
| **Google** | Primary. Libra already uses Gmail. |
| **Magic link (email)** | Keep as fallback. Costs nothing, rescues a locked-out admin. |
| Apple / Azure / GitHub | Available, enable later if wanted. Zero code change. |
| Password | **Not recommended.** Another credential to leak and reset. |

### What only you can do

I have no access to Google Cloud or the Supabase auth settings:

1. Google Cloud Console → create an **OAuth 2.0 Client ID** (Web application)
2. Authorised redirect URI: `https://tziwrqpvnncddbvlclyg.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → **Google** → paste client ID + secret
4. Supabase → Authentication → URL Configuration → add
   `http://localhost:3000` and the Vercel domain to **Redirect URLs**
5. Confirm the owner email in §4.1

---

## 7. What changes in the code (not built yet)

| File | Change |
|---|---|
| `public/login.html` | **New.** Google button + magic-link fallback. |
| `public/assets/js/dashboard.js` | Replace the token field with a Supabase session; redirect to login when absent. |
| `lib/dashboard-api.js` | Replace `auth()` — verify the JWT, load the staff row, attach role. `DASHBOARD_TOKEN` is deleted. |
| `lib/supabase.js` | Add a per-request client that forwards the user's JWT so RLS applies. |
| `server.js` | `/dashboard` redirects to `/login` without a session. |

Route shapes and the client contract **do not change**, so the dashboard UI
needs no rework beyond sign-in.

### Deliberately deferred
- Per-role UI hiding. Policies deny first; hiding a button the database already
  refuses is cosmetic, and doing it first invites trusting the UI for security.
- MFA. Google accounts can enforce it upstream.
- Session timeout tuning. Supabase defaults until there is a reason.

---

## 8. Order of work

1. ✅ Migration written (`0004`) — **this document**
2. ⬜ **You review and confirm** §3 roles and the §4.1 owner email
3. ⬜ You enable Google in Supabase (§6)
4. ⬜ Apply `0004` via the Studio SQL editor — *MCP `apply_migration` is declined
   by the permission gate; Studio is the path that works*
5. ⬜ I build the login page + swap the API
6. ⬜ Test: Libra signs in; an uninvited Google account signs in and sees nothing;
   a `front_desk` account cannot adjust inventory; the audit log fills
7. ⬜ **Only then** deploy to Vercel

Deploy is last **on purpose**. Shipping an admin surface holding client PII
behind one shared secret is the thing this work exists to prevent.

---

## 9. Open questions for you

1. **Confirm both seeded addresses** are the exact Google accounts each person
   will sign in with — `LoveLiCareSvcs@gmail.com` (Libra) and
   `onedopementor@gmail.com` (Mark). A mismatch yields an empty dashboard.
2. Both are seeded as `owner`. With only two executive admins that is right,
   but note it means **either can add staff, change roles, and read
   `project_notes` including `BUDGET.md`**. Say if Mark should be scoped lower.
3. Confirm or overrule the three judgement calls in §3. (With no `provider` or
   `front_desk` accounts yet, those rows are untested in practice — they exist
   so the model is ready, not because anyone holds them.)
4. Google only, or magic-link fallback too? (I recommend both.)
5. Should `front_desk` see client **phone and email**, or just name and service?
   Currently they see the full row. Narrowing it is a column-level change and
   is easier to decide now than later.
