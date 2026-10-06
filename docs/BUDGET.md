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
related: ["[[lovelicare-master-plan-v2]]", "[[lovelicare-hero-video-plan]]"]
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
| **Supabase Pro** | $25 | $5.75 | **Recommend** | Free tier **pauses after 7 days idle** — unacceptable for a live client site. Adds daily backups, 8 GB DB. |
| **Vercel Pro** | $20 | $4.60 | **Recommend** | Hobby is non-commercial; this is a client production site. Adds analytics + password-protected previews. |
| **Anthropic API** (chatbot) | ~$15–40 | ~$3.50–9 | Active | Usage-based. Haiku 4.5 for routine chat turns keeps this at the low end. |
| Domain (lovelicare.com) | ~$1.50 | ~$0.35 | Active | — |
| **Recurring subtotal** | **~$62–87** | **~$14–20** | | **~80% of budget unspent** |

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

## 5. Recommendation

Approve **Supabase Pro + Vercel Pro = $45/mo (~$10.40/week)**. With the API that is roughly **$14–20 of the $100**, leaving **~$80/week** of headroom for generative video and anything Phase 3–5 turns up.

The budget is not the binding constraint. **HIPAA is** — and the answer is to stay out of its scope rather than pay for it.

---

## 6. Ledger

| Date | Item | Amount | Approved by | Running wk total |
|---|---|---:|---|---:|
| 2026-10-06 | *(nothing purchased yet)* | $0.00 | — | $0.00 |

> Claude updates this table whenever spend is approved or incurred. Any new recurring
> cost gets a row in §2 and a note on what it displaces.
