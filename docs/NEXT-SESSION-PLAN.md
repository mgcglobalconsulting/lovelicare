# LoveLi Care — Next Session Plan

**Decision (2026-10-01):** Polish the current site. Keep the Liquid Glass HTML/CSS/JS and the Express server, split the single file into real pages with real URLs, and deploy on Vercel. No framework rewrite.

**How to start the next session (to save tokens):**
> "Read `docs/NEXT-SESSION-PLAN.md` and do Phase 1."

Do one phase per session if tokens are tight. Each phase ends in a working, committable state.

---

## Already done (2026-10-01 session)

- Synced local `main` with GitHub. It was 2 commits behind and missing the owner portrait, SVG icons and Vagaro embed from PR #1. Resolved the merge conflicts so both the SVG icons and the new "Prepare for Visit" links are kept.
- Fixed the broken hero image. `assets/img/hero-macro.jpg` never existed; the page now uses the owner portrait.
- Optimized the owner portrait from a 2.0MB PNG to a 290KB JPG, with lazy loading and fixed dimensions.
- Made web-ready copies of the two loose photos:
  - `assets/img/case-study-14-week.jpg`: real body-composition case study (216→199 lb, body fat 53.4%→42.4%, 14 weeks)
  - `assets/img/product-smart-greens.jpg`: Smart Pressed Organic Greens product shot
- Fixed mobile layout: inline 2-column grids never collapsed, so content was clipped on phones. Verified 0 overflowing elements at 390px on Home, Medical Aesthetics, Body Contouring, Contact and Prepare.
- Hash URLs plus a working back button (`/#medical-aesthetics`). This is the interim step; Phase 1 replaces it with real URLs.
- Firecrawl scrape pipeline: `npm run scrape` writes `site-content.md`, which feeds the chatbot. It still needs `FIRECRAWL_API_KEY` in `.env`.
- **2026-10-01 cleanup:** static site moved into `public/` (required by Vercel: `express.static` is ignored there). Old worktrees removed, experiments saved as `experiment/*` branches, README + `.env.example` added, Vercel project `lovelicare` created and connected to GitHub.

---

## Phase 1: Split into real pages (biggest win: SEO plus maintainability)

**Why:** All 17 pages live in one 1,600-line `index.html`, which means one URL for Google, a 135KB first load, and every edit risks breaking another page.

**Approach:** Use a tiny build script with no framework.

```
src/
  partials/head.html      ← <head>, fonts, CSS (with {{title}} {{description}} {{canonical}})
  partials/header.html    ← nav + mobile menu
  partials/footer.html    ← footer + Vagaro overlay + scripts
  pages/home.html, medical-aesthetics.html, body-contouring.html, … (one per .lc-page block)
  pages.json              ← slug → title, meta description, URL path
scripts/build.js          ← stitches partials + page → public/<path>/index.html, copies assets
public/                   ← build output (served by Express locally, Vercel in prod)
```

Steps:
1. Write a one-off script that extracts each `<div class="lc-page" id="page-X">` block from `public/index.html` into `src/pages/X.html`, and the shared header/footer into partials. Use a script; don't hand-copy, to save tokens.
2. `scripts/build.js` with these URL paths:
   - `/` · `/services` · `/services/medical-aesthetics` · `/services/body-contouring` (Snatch Protocol™)
   - `/services/iv-nutritional-wellness` · `/services/weight-management` · `/services/nutrition-counseling` · `/services/non-emergent-care`
   - `/vitamin-cheat-sheet` · `/prepare` · `/contact` · `/wellness-assistant` · `/shop` · `/client-login` · `/sitemap` · `/privacy-policy` · `/terms`
3. Replace `onclick="navTo('x')"` with `<a href="/path">` using a find/replace map in the extraction script. Delete `navTo` and the hash code from `liquid-glass.js`. Keep the reveal and scroll animations, triggered on page load.
4. Mark the active nav item from `location.pathname`.
5. Add `"build": "node scripts/build.js"` to package.json and set it as the Vercel build command. Express already serves `public/` locally. Keep `public/assets/` as the asset source, or move it to `src/assets` and copy it in at build time.
6. **Check:** every URL returns 200, nav works, there's no overflow at 390px (reuse the iframe probe approach from the last session), and the console has no errors.

**Skills to use:** none required. Optionally `frontend-design` only if you're touching visuals.

---

## Phase 2: Fill content gaps and use the new photos

Thin or stub pages (line counts in the current `index.html`): Weight Management (~17), Nutrition Counseling (~16), Non-Emergent Care (~17), All Services (~13), Wellness Assistant (~18), Shop (~24), Privacy (~20), Terms (~16).

1. **Content source:** run `npm run scrape` (add the Firecrawl key first), then use `site-content.md` + `knowledge-base.js`. Don't invent services or prices. The site's own chatbot already follows this rule.
   - Also scrape `https://lovelicare.com/vitamin-cheat-sheet` and the free meal plan product page; add them as URLs in `scripts/scrape-site.js`.
2. **Case study image:** put it on Body Contouring/Snatch Protocol and Weight Management as a "14-Week Results" card that pulls out the numbers. Add a line saying individual results vary.
   - ⚠️ **Ask the owner first:** confirm the client consented to the case study being used on the website. It's already on Instagram, but the website is a separate use.
3. **Product image:** add it to the Shop page as a featured product. Confirm the product name and price with the owner, and whether it's sold in-house or through the GoDaddy store.
4. **Wellness Assistant page:** it currently links out to `lovelicare.com/wellness-chatbox`. Point it at our own `/chatbot` instead (or embed it), since the server `/chat` endpoint already exists.
5. **Privacy and Terms:** they must mention the AI assistant and the contact-form email handling. Keep it HIPAA-aware: no health details collected via the forms or the chatbot.

---

## Phase 3: SEO and launch prep

1. A unique `<title>`, meta description, canonical and OG image on each page, driven by `pages.json`.
2. Generate `public/sitemap.xml` and `public/robots.txt` in `build.js`.
3. Extend the existing JSON-LD to the `MedicalBusiness` type with address, phone, hours (by appointment), `sameAs` links to Instagram and Facebook, and the provider (Libra Robertson, NP-CRNP).
4. Images: move inline `style=` image sizing to classes, add `alt` to the one `<img>` missing it, add `loading="lazy"` to everything below the fold.
5. Move the 3 inline-grid layouts into CSS classes, then delete the "MOBILE FIX" block at the bottom of `liquid-glass.css`.

---

## Phase 4: Deploy on Vercel (ask before deploying; this uses credits)

1. ✅ Done: the project is created and connected to GitHub, and the static files are already in `public/`.
2. Environment variables in Vercel: `ANTHROPIC_API_KEY`, the `GOOGLE_*` variables (Gmail drafts for the contact form), and `FIRECRAWL_API_KEY` (only needed for local scraping).
3. Push a branch first to get a preview deploy (pushes to `main` deploy to production) and test forms, chat and Vagaro booking on a real phone, then production. Pointing the domain away from GoDaddy is the owner's decision; do it last.

---

## Housekeeping for you to run (Claude was blocked from deleting things)

```bash
cd ~/Desktop/lovelicare
git stash list                      # one stash "pre-sync…" = backup of today's work, already re-applied
git stash drop                      # once you're happy with today's changes
git worktree prune                  # removes the dead agents/… worktree entry
# 5 old worktrees in .claude/worktrees/ — only these have uncommitted work:
#   happy-yonath   → small CSS/JS tweaks (66 lines), probably superseded
#   pensive-volhard → CSS tweak, already merged via PR #1
#   peaceful-hermann → contains an MGC Global Consulting invoice.html — that's MGC's, not LoveLi's; move it to the MGC folder if you need it
# Then: git worktree remove .claude/worktrees/<name>  (add --force if dirty)
rm assets/2D4D559F-*.JPG assets/62DB04FD-*.JPG   # originals; optimized copies live in assets/img/
git rm assets/img/owner-portrait.png             # replaced by owner-portrait.jpg
printf ".obsidian/\n.superpowers/\nsite-content.md\n" >> .gitignore
```

---

## Token-saving rules for these sessions

- Never read all of `index.html` (135KB). Use `grep`/`sed -n` line ranges, or the context-mode tools.
- Make page extraction and link replacement **scripted** changes, not hand edits.
- Check pages with the headless-Chrome iframe probe (it reports an overflow count) rather than screenshots. Take screenshots only for final visual sign-off.
- Commit at the end of every phase so a new session never has to re-discover state.
