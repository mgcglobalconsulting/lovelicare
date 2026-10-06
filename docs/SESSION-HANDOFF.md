# LoveLi Care — Session Handoff

As of 2026-10-02. Branch `main`, **nothing committed, nothing deployed.**

## What changed this session

Two files, both already dirty before I started:

| File | Change |
|---|---|
| `public/index.html` | Replaced the flat `#lc-loader` with a cinematic `#lc-intro` aperture sequence; added `hero-atmos` layer; split the H1 into masked lines; rewrote the bottom loader script |
| `public/assets/css/liquid-glass.css` | Waist-up portrait crop; appended `HOME HERO: ATMOSPHERE + CINEMATIC ENTRANCE` block (~120 lines) at end of file |

Untouched and preserved exactly as found: `package.json`, `server.js`, `public/assets/js/liquid-glass.js`, `vercel.json` (md5 `61c1387a7a6e9fc1172ab9ed10a4f902`), `docs/cloud.md`, `docs/CLAUDE-CLI-BRIEF.md`.

## 1. Hero crop (brief item 2) — done

Source portrait is 1024×1536 (2:3), kept local at `public/assets/img/owner-portrait.jpg`. No regeneration.

- Desktop: container `aspect-ratio:5/6`, `object-position:center 25%` → head through waist, face and maroon hair clear.
- Mobile (≤900px): `aspect-ratio:1/1`, `object-position:center 32%`; nameplate drops below the image.
- Verified: nameplate never overlaps her face at 1440×900, 1280×720, or 390×844. Zero horizontal overflow on all 17 pages at every viewport.

## 2. Intro sequence (new direction) — done

`#lc-intro` — deep teal field, Italiana wordmark with blush "Care", gold hairline rule, wide-tracked locality line; the panel then parts horizontally to reveal the hero. Hero gained three slow-drifting light orbs, film grain, and a vignette; the headline rises out of a mask and the portrait settles from a slight push-in with a periodic specular sweep.

Timing: first visit ~1.5s hold + 0.95s part. Repeat visits in the same session are abbreviated (~450ms measured) via `sessionStorage.lcIntroSeen`. `prefers-reduced-motion` and no-JS both resolve to a fully visible page — verified.

### Two gotchas that cost real time — do not re-break these

1. **The Vagaro widget overwrites `document.body.className`.** State flags must live on `<html>` (`html.intro-done`), never `<body>`. A `body.intro-done` hook is silently wiped and the hero portrait renders at `opacity:0`.
2. **Do not gate animations on `window.load`.** Vagaro/Affirm/Maps delay it for seconds. The intro gates on the portrait image's own `load` plus a 900ms cap.

First paint to full reveal is still ~5s on a cold load, dominated by pre-existing third-party script weight. The intro now covers that with branding rather than exposing a half-built page.

## 3. Forms (brief item 7) — verified, all mocked

`/draft` was intercepted in Playwright for every test. **No real Gmail drafts were created.**

- Newsletter, mocked 500 → no "You're in", inline error shown, submit button re-enabled. ✅
- Newsletter, mocked 200 → "You're in" shown. ✅
- Contact, mocked 500 → no "Message Received", inline error shown. ✅

## 4. The `/draft` endpoint is broken in real use — credentials, not code

`POST /draft` returns **500: "No access, refresh token, API key or refresh handler callback is set."**

So every real contact-form and newsletter submission currently fails. The route exists at `server.js:58` and `googleapis` is installed. What's missing is credentials — `.env` and `.env.local` hold only `STRIPE_SECRET_KEY` and `ANTHROPIC_API_KEY`. These four from `.env.example` are absent:

```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
GOOGLE_REFRESH_TOKEN
```

To fix: create an OAuth client in Google Cloud Console (Gmail API enabled), run the consent flow once with scope `https://www.googleapis.com/auth/gmail.compose` to mint a refresh token, put all four in `.env`, then mirror them with `vercel env add` for the deployed site.

### `~/Desktop/lovelicare.chatbox/` is superseded — nothing to port

Its `/draft` block is **byte-identical** to the one already in the main repo. It has no git remote, no commits, and no `.env`. It is an older snapshot of the same site, not pending work. Ignore it; fix the env vars instead.

## 5. Not done

- **No Vercel preview deploy.** CLI is authenticated (`onedopestory`), project linked (`lovelicare`, team `team_E6Nd…`). Not deployed because deploys need explicit approval per CLAUDE.md and the session was redirected to design work. `vercel.json` still uses legacy `builds`/`routes` — inspected, not modified.
- **No Higgsfield video.** Account has **10 credits on the free plan**, free-trial unlimited unavailable. A 5s 720p generation costs well more. Owner chose a code-based intro instead.
- **Obsidian**: no `.obsidian` vault in the repo and no vault path identified. `docs/*.md` are plain Markdown and Obsidian-compatible. No symlinks created, no live vault connection claimed.
- `docs/cloud.md` not refreshed — the `/draft` credential finding above should be folded into it.

## Known third-party console noise (pre-existing, not ours)

Vagaro CORS failures on `getwidgetservices` and `getallpromotiondetailsbybusinessid`; Vagaro CSP violation loading `about:blank`; "payment is not allowed in this document" permissions-policy; Affirm third-party-cookie warning and aborted `chrono/v3/collect`; Google Maps `RetiredVersion` plus a non-async loading warning; malformed viewport meta inside a third-party frame. Also: the **cookie banner overflows horizontally on 390px** — pre-existing, worth fixing separately.

## Verification harness

Scratch scripts live in this session's scratchpad (`verify.js`, `shots.js`, `paths.js`, `settle.js`) using `playwright-core` with `channel: 'chrome'`. Notes for reuse: launch with `--enable-unsafe-swiftshader`; use `waitUntil:'load'` or `'domcontentloaded'`, never `'networkidle'` (never settles); dismiss the cookie banner via `evaluate(() => document.getElementById('lc-cookie-accept')?.click())` since it intercepts pointer events.
