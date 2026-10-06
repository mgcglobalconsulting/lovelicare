# Handoff — nav fonts fixed, client demo + "second brain" next

Written for: the next Claude Code session in `/Users/markcartwright/Desktop/lovelicare` (and you, skimming it).

Date: 2026-10-02. Branch `main`. **Nothing was committed or deployed this session.**

---

## 1. Done — nav font fixes (applied, verified locally)

### The diagnosis

The nav menu font "changed" because the dropdown was rebuilt in the already-staged
work. The old menu entries were `<span>`s force-styled to Open Sans via
`!important`; that rule is gone and entries are now `<button class="lc-dropdown-item">`
styled in **Cormorant serif**. `lc-dropdown-item` does not exist in HEAD at all.
So: a deliberate design change, not a regression.

**It was never a Vercel problem.** Verified with the authenticated CLI
(`npx vercel@latest curl <url>`): preview HTML returned 200 with a byte-identical
font link, and `/assets/css/liquid-glass.css` returned 200 at **72080 bytes —
identical to local**. The Google Fonts stylesheet also returned 200 with all five
families. The preview was serving exactly what was on disk; it rendered the same
way locally.

The real defect was **weights requested but never downloaded**:

| Where | Asked for | Was loaded | Result |
|---|---|---|---|
| `.lc-nav-links button` (top nav) | Montserrat **400** (inherits family from base `button{}`) | 500/600/700 | substituted 500 — whole nav a step too heavy |
| `.lc-dropdown-label` (menu group labels) | Open Sans **600** | 300/400/500 | substituted 500 |
| `.lc-home-title`, `.owner-name` | Playfair Display **500** | 400/600/700 | substituted 400 |
| `.hero-scroll-label` | `'DM Sans'` | never requested | fell back to system sans |

Cormorant compounded it: a display serif with a very small x-height, so at
`1.02rem` the menu read thinner and smaller than its nominal size — easy to
mistake for a font that failed to load.

### The three changes (uncommitted, in working tree)

1. `public/index.html` — font link now requests `Montserrat:wght@400;500;600;700`,
   `Open+Sans:wght@300;400;500;600`, `Playfair+Display:...0,500...`. URL was
   validated against Google Fonts (HTTP 200, all weights present) **before** writing.
2. `public/index.html` — `'DM Sans',sans-serif` → `'Open Sans',sans-serif`.
   Chose reuse over adding a sixth family for one small scroll label.
3. `public/assets/css/liquid-glass.css` — `.lc-dropdown-item` `font-size:1.02rem` → `1.15rem`,
   to optically match the 0.78rem Montserrat bar above it.

`git diff` = 2 files, 3 insertions, 3 deletions.

### Verified

Ran `PORT=3077 node server.js` and fetched through it:
- font link served with all new weights ✓
- `DM Sans` no longer present anywhere in the HTML ✓
- `.lc-dropdown-item` serving `font-size:1.15rem` ✓
- a per-page audit script reports **both** `index.html` and `chatbot.html` clean —
  zero missing families, zero missing weights.

Note: `chatbot.html` was never broken. It has its own font link that correctly
loads Inter and Cormorant Garamond; an earlier cross-file check wrongly flagged it.

### One open design call (yours, not a bug)

The menu is serif under a sans toolbar. Kept Cormorant because it matches the
Cormorant/Italiana brand system. To go back to matching the bar instead, set
`.lc-dropdown-item` to `font-family:'Open Sans',sans-serif` and drop the size
back to ~`0.95rem`. One line either way.

---

## 2. Not done — and why

### Not deployed
Preview was **not** redeployed, so the live preview still shows the old fonts.
To deploy from this folder:
```sh
npx --yes vercel@latest deploy --yes --target preview
```

### Two blockers stop a client demo of the assistant — neither is code

**a) Anthropic credits.** Confirmed by hitting the local endpoint:
```
POST /chat  {"message":"What IV drips do you offer?","history":[]}  ->  HTTP 503
server log: 400 invalid_request_error —
  "Your credit balance is too low to access the Anthropic API."
```
The key authenticates fine. Only billing is missing. Until credits are added the
assistant correctly refuses and hands out the clinic's phone/email rather than
inventing a reply. **No code change will fix this.**

**b) Vercel Deployment Protection.** Every preview request 302s to Vercel SSO,
including assets. A client who isn't signed into the owning Vercel account sees a
login page, not the site. Options: turn protection off for the preview, use a
Protection Bypass token, or put it on a real domain.

### Payload shape gotcha
`POST /chat` expects `{ message, history }` — **not** `{ messages }`. Costs a
round trip if you guess wrong.

---

## 3. Supabase — earlier note was wrong, now corrected

Verified via MCP `list_projects` + `list_tables`:

- Exactly **one** project on the account: ref `lphudfgjbsyhroqmhomh`,
  "OneDopeStory's Project", org `eitekaullhwpowohymnd`, us-east-2. `.env`
  `SUPABASE_URL` points here.
- `public` schema holds **only Love Li Care tables**: `contact_inquiries` and
  `newsletter_subscribers` — both RLS-enabled, both 0 rows.
- Migration `supabase/migrations/0001_contact_and_subscribers.sql` already applied.
- The ref the old memory note called "MGC's" (`zppuzfvchqxkzprfkhfz`) is **not in
  this account at all**.

So there is no cross-client data mixing today, and this project is safe to build
on. Re-check `list_tables` before adding new tables; if MGC ever lands in the same
project, the CLAUDE.md isolation rule applies again and they must be split.

---

## 4. Next up — the "second brain" question (not yet started)

The ask: make the assistant answer anything about LoveLi Care and its products,
and walk a client through the right next step — fed by Supabase + Obsidian + the
two connected folders.

**What already exists:** `knowledge-base.js` (212 lines) is a single hardcoded
template string, `require`d by `server.js` and injected whole into `SYSTEM_PROMPT`
on every `/chat` call, with a strict "answer only from this, otherwise give the
phone number" rule. Model is `claude-haiku-4-5-20251001`, `max_tokens: 1024`,
last 10 turns of history. It already covers hours, address, provider, services,
and the complimentary-consultation flow.

**Honest read:** for a knowledge base this size, stuffing it into the system
prompt is the right architecture and prompt caching makes it cheap. Do **not**
jump to vector search / RAG yet — it adds a retrieval layer, an embedding
pipeline, and a new failure mode (retrieving the wrong chunk and answering
confidently from it) to solve a problem this site does not have yet.

Suggested order when the session resumes — decide, don't assume:
1. **Unblock first.** Credits + protection. Nothing else is demoable until then.
2. **Decide the source of truth for content.** Obsidian notes → a build step that
   regenerates `knowledge-base.js`, so edits in Obsidian flow to the site without
   hand-editing JS. This is the highest-value piece and needs a decision on which
   vault folder is canonical.
3. **Add guided next-step behavior.** Extend `SYSTEM_PROMPT` with the actual
   booking/consult decision tree (which service → consult → Vagaro link) rather
   than leaving the model to improvise from a flat fact dump.
4. **Only then** consider Supabase for *conversation logging* (what clients
   actually ask) — which is far more useful than retrieval, because it tells you
   what's missing from the knowledge base.
5. Revisit retrieval only if the knowledge base outgrows the context window.

Open questions to settle with Mark before building:
- Which Obsidian vault/folder is canonical, and what are the "two folders" meant
  to contribute?
- Should chat transcripts be stored? If yes, that's health-adjacent PII from a
  med spa — needs RLS, a retention decision, and a privacy-notice check first.
- Does the assistant need to book, or only route to Vagaro?
