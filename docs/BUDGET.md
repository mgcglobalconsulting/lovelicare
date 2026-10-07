---
title: LoveLi Care — Budget & Spend Tracker
slug: lovelicare-budget
project: lovelicare
type: reference
status: in_progress
created: 2026-10-06
updated: 2026-10-06
tags: [lovelicare, budget, spend, hipaa, supabase, vercel]
aliases: ["Budget", "Spend Tracker"]
related: ["[[lovelicare-master-plan-v2]]", "[[lovelicare-hero-video-plan]]", "[[lovelicare-auth-design]]", "[[lovelicare-handoff-2026-10-06]]"]
---

# LoveLi Care — Budget & Spend Tracker

**Written for:** Mark. **Budget:** $100/week ≈ **$433/month**. **Opened:** 2026-10-06.
Claude proposes spend here and keeps the ledger current. Nothing is purchased without Mark's OK.

---

## 1. The finding that shapes everything: HIPAA is out of budget

Verified 2026-10-06. Supabase will sign a BAA and accept PHI **only** on:

| Line | Cost |
|---|---|
| Supabase **Team** plan (minimum tier that can sign a BAA) | **$599/mo** |
| Supabase **HIPAA add-on** (required on top) | **$350/mo** |
| **Total, Supabase alone** | **$949/mo** |

That is **$219/week — 2.2× the entire budget**, before Vercel, the API, or anything else.

### Consequence — the product stays non-PHI

This is a constraint, not a failure, and it simplifies the build:

- **LoveLi Care's own stack never stores protected health information.** No symptoms, conditions, medications, treatment notes, or clinical photos in Supabase.
- **Clinical intake routes through Vagaro**, which already operates as a HIPAA-covered med spa platform. We link to it; we do not reimplement it.
- **The dashboard covers the marketing and operations funnel** — inquiries, chat sessions, booking intent, subscribers, traffic. All genuinely owned, all non-PHI, all free to store.
- **Voice notes and uploads** (Phase 3) are scoped to *non-clinical* use — general questions, prep photos the client chooses to share for logistics — with explicit on-form guidance not to send medical details, and short retention.

Revisit only if revenue justifies ~$950/mo, or if a cheaper BAA-covered store is sourced.

---

## 2. Recommended recurring stack

| Item | Cost/mo | Cost/wk | Status | Why |
|---|---:|---:|---|---|
| **Supabase Pro** | $25 | $5.75 | **Recommend — now urgent** | Free tier **pauses after 7 days idle**. This already bit us: the old project timed out on connect on 2026-10-06. The new project now holds the real inventory **and receives the live site's form submissions** — a pause means the contact form silently stops saving. Adds daily backups, 8 GB DB. |
| **Vercel Pro** | $20 | $4.60 | **Hold until deploy day** | Still correct eventually — Hobby is non-commercial and this is a client production site. But **nothing is deployed**: on 2026-10-06 Mark chose to build Supabase Auth before shipping anything. Password-protected previews buy nothing while there is no deployment. Revisit when §8 step 7 is reached. |
| **Anthropic API** (chatbot) | ~$15–40 | ~$3.50–9 | Active | Usage-based. Haiku 4.5 for routine chat turns keeps this at the low end. |
| Domain (lovelicare.com) | ~$1.50 | ~$0.35 | Active | — |
| **Recurring subtotal, as recommended today** | **~$42–67** | **~$9.60–15.40** | | **~85% of budget unspent** |

## 3. One-off / variable

| Item | Est. | Status | Notes |
|---|---:|---|---|
| Higgsfield credits — hero video (Phase 2) | $20–60 | **Needs OK** | 6–8s loop, likely several generations to land the look |
| Higgsfield — b-roll for service pages | $40–80 | Later | Only after the hero lands |
| Stock photography (if portraits need refresh) | $0–50 | Not needed yet | Current portrait is strong |

## 4. Declined / deferred, with reasons

| Item | Cost | Verdict |
|---|---:|---|
| **Supabase Team + HIPAA** | $949/mo | **Out of budget (2.2×).** Drives the non-PHI architecture above. |
| **X (Twitter) API Basic** | $200/mo | **Defer.** 46% of the weekly budget for analytics on a med spa with limited X presence. Adapter stubbed; costs nothing until switched on. |
| **LinkedIn Marketing Developer Platform** | $0 | **Pursue — it's free, but gated.** Needs Company Page admin + a multi-week approval review. Start the application; no spend. |
| Google Workspace (for Sheets BAA) | $6–18/user/mo | **Not needed** while nothing clinical touches Sheets. |

---

## 5. Recommendation — revised 2026-10-06

**Split the two. They are no longer the same decision.**

### Approve now — Supabase Pro, $25/mo (~$5.75/week)

This stopped being a nice-to-have today. The new project `tziwrqpvnncddbvlclyg`
now holds the 9 real inventory items **and is wired to the live site's contact
and subscribe forms**. On the free tier it pauses after 7 days idle, and a
paused database means **submissions fail silently** — the visitor sees a
success message and the row never lands. The old project already demonstrated
the failure mode by timing out earlier the same day.

$5.75/week against a $100 budget to protect the system of record.

### Hold — Vercel Pro, $20/mo

Correct eventually, but premature. Mark chose on 2026-10-06 to build Supabase
Auth **before** deploying, because shipping an admin surface holding client PII
behind one shared token is the thing that work exists to prevent. Until there
is a deployment, Pro's analytics and protected previews buy nothing. Revisit at
`AUTH-DESIGN.md` §8 step 7.

### Where that leaves the week

| | /mo | /wk |
|---|---:|---:|
| Supabase Pro | $25 | $5.75 |
| Anthropic API | ~$15–40 | ~$3.50–9 |
| Domain | ~$1.50 | ~$0.35 |
| **Total** | **~$42–67** | **~$9.60–15.40** |

Roughly **$85/week of headroom** — enough for the Phase 2 hero video ($20–60
one-off) without touching the rest.

The budget is not the binding constraint. **HIPAA is** — and the answer is to
stay out of its scope rather than pay for it.

---

## 6. Ledger

| Date | Item | Amount | Approved by | Running wk total |
|---|---|---:|---|---:|
| 2026-10-06 | *(nothing purchased yet)* | $0.00 | — | $0.00 |

### Pending decisions — not purchased, not approved

| Raised | Item | Amount | State |
|---|---|---:|---|
| 2026-10-06 | **Supabase Pro** | $25/mo | **Recommended, awaiting Mark's purchase decision.** Protects the live forms from free-tier pausing. |
| 2026-10-06 | Vercel Pro | $20/mo | **Held** until there is a deployment. |
| 2026-10-06 | Higgsfield credits (hero video) | $20–60 | Needs OK. Unchanged. |

> Nothing above has been bought. A row only moves into the ledger once Mark
> approves it **and** the charge exists.

> Claude updates this table whenever spend is approved or incurred. Any new recurring
> cost gets a row in §2 and a note on what it displaces.
