# Claude CLI Handoff: LoveLi Care

Paste this brief into Claude CLI from the LoveLi Care repository. Continue the current work; do not restart or redo completed edits.

## Goal

Pick up the current LoveLi Care Med Spa work without restarting or overwriting changes. Keep the existing static Liquid Glass frontend, Express backend, and in-page navigation. The user likes the current photo-led hero and wants the image framed waist-up. Keep green/teal as the dominant brand palette and let Libra's maroon hair remain a natural accent. Preserve the existing local portrait; do not replace it with unrelated or generic imagery.

## Work Already Done In This Checkout

- `public/index.html`: Home hero changed from a two-column stack of a translucent copy card, portrait frame, and mission card into a photo-led editorial hero. Copy and credentials use existing site facts. The existing owner portrait now loads eagerly with high fetch priority and descriptive alt text. CTA still opens Vagaro; assistant CTA still uses local in-page navigation.
- `public/assets/css/liquid-glass.css`: Scoped hero design and responsive layouts added. Green/teal is the hero background; desktop hero is constrained to 16:9, mobile portrait uses a 16:9 crop, nameplate drops below the image on mobile, and transparent header text is light for contrast. Founder nameplate is now `Playfair Display`.
- `public/assets/js/liquid-glass.js`: Newsletter subscription now checks `response.ok`, shows success only on HTTP success, and restores the submit button/shows inline error on failure. Do not revert this behavior.
- `docs/cloud.md`: New as-of integration status note covering current APIs, env var names only, webhook status, future GoDaddy import, model lifecycle, and official docs.
- Image generation itself is not yet complete. This Copilot workspace could not invoke Higgsfield MCP; user says Claude CLI has the Higgsfield connection and likes the current portrait usage.

## Immediate Tasks

1. First inspect `git status` and retain all existing changes. The previously verified checkout is branch `main`, with existing edits in `package.json`, `server.js`, `public/index.html`, `public/assets/css/liquid-glass.css`, `public/assets/js/liquid-glass.js`, and an untracked `vercel.json`, `docs/cloud.md`, and this brief. Do not overwrite or discard them.
2. Inspect the desktop and 390px mobile hero. Adjust `object-position`/container aspect ratio so Libra is visibly framed from head through waist, her face and maroon hair stay clear, and the nameplate never overlays her face. The existing photo includes the requested white jacket and clinical setting; keep it local at `public/assets/img/owner-portrait.jpg` unless an approved generated alternative improves it.
3. The user wants the Vercel/GitHub/Obsidian setup checked so the app works end to end and a separate `vercel.app` preview link opened in the already-shared browser. GitHub is already configured as `origin` (`git@github.com:mgcglobalconsulting/lovelicare.git`), and `.vercel/project.json` is linked metadata ignored by `.gitignore`. Verify Vercel CLI authentication, project linkage, deployment routing, and required environment-variable *names* without printing secret values. Do not overwrite the pre-existing untracked `vercel.json`; inspect it and make only a minimal, reviewed adjustment if preview deployment or static/API routing is actually broken.
4. Deploy only a Vercel preview from a dedicated non-production branch/CLI preview deployment after checking the deployment target. Do not push to `main`, promote to production, change DNS, or expose secrets. Open the returned `vercel.app` preview in the shared browser and verify page load plus `/health`, `/chatbot`, and static assets. If Vercel auth, project linkage, or required environment variables block the preview, stop and tell the user exactly what needs access/configuration rather than falling back to production.
5. Obsidian: the repo has no `.obsidian` vault configuration or known vault path. Keep the Markdown docs in `docs/` Obsidian-compatible. Do not create symlinks, copy notes outside the repository, or claim a live Obsidian connection without an identified vault; ask the user for its path only if true vault sync is required.
6. If Higgsfield MCP is available in the Claude CLI session and the user still wants new art, use `public/assets/img/owner-portrait.jpg` as the identity/reference to generate an editorial med-spa **waist-up** hero image with a 16:9 output canvas. Keep her recognizable appearance, white jacket, maroon hair, makeup, and natural facial features. Export approved media locally under `public/assets/img/` and use a local path. Never hotlink generated media. The user likes the existing portrait usage, so do not generate or replace it just for novelty.
7. Test newsletter HTTP success/failure via mocked `/draft` responses only. Never create real Gmail drafts during testing. Failure must not show "You're in"; success only follows a 2xx response.
8. Verify homepage, booking overlay, navigation, contact/newsletter flows, chatbot, responsive overflow, keyboard access, and console/network behavior in the shared browser. Report pre-existing third-party issues separately; do not repair unrelated vendors.
9. Refresh `docs/cloud.md` if verification changes any status. Keep it explicit that GoDaddy import and actual webhooks are not implemented, and distinguish local code/config evidence from a live-authenticated service check.

## Scope And Preservation

- Do not split pages, introduce a framework, replace the Liquid Glass frontend, redesign the backend, or add a GoDaddy scraper in this pass.
- Do not edit `server.js` or change the Anthropic model. The pinned `claude-haiku-4-5-20251001` is listed by Anthropic for retirement no sooner than 2026-10-15. Record it; ask the owner before a model/cost migration.
- `git status` previously showed pre-existing user edits in `package.json` and `server.js`, plus an untracked `vercel.json`. Preserve these exactly; inspect before touching and avoid these files.
- `.vercel/` contains local project metadata and must remain uncommitted. Never expose secret values.
- Do not commit, deploy to production, change DNS, or alter production settings. The user's current request authorizes checking links and creating a preview only; keep the production branch untouched. Vercel docs flag legacy `builds` for review, but change deployment routing only if needed for a verified preview/static serving failure.
- The current local Express dev server is already running at `http://localhost:3000`; reuse the shared browser rather than opening a separate browser session.

## Agent Routing

Only spin up agents if the remaining work is genuinely larger than a short focused pass, and give each a non-overlapping slice:

- Visual polish/crop/responsive check: a frontend/UI specialist; own only `public/index.html` and `public/assets/css/liquid-glass.css` after coordinating changes.
- Integration documentation/API lifecycle fact-check: a backend/integration documentation specialist; own only `docs/cloud.md` and verify claims against local source and official docs.
- Browser verification: a Playwright/test specialist; test home, viewport overflow, CTA/booking overlay, and mocked form responses without real submissions.

Keep a single coordinator responsible for reconciling edits, protecting the dirty worktree, and running the final end-to-end checks. Don't spawn separate agents for tiny typography or documentation edits.

## Required Final Report

Summarize files changed, image framing and local asset source, form mock test results, desktop/mobile checks, verified GitHub/Vercel status, preview URL opened in the shared browser (or exact blocker), Obsidian status/vault-path limitation, known third-party console noise, and any Higgsfield/MCP blocker. Explicitly state whether a preview deploy occurred; confirm no production deploy/promotion and no commit, and identify any pre-existing user files preserved.
