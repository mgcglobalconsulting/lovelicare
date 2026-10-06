# LoveLi Care Cloud Connections

**Reviewed:** 2026-10-02

This note reflects the code and local project files reviewed on this date. It records repository evidence, not live credential or production-health verification. Secret values are intentionally excluded.

## Current Connections

| Service | Current role | Repository entry point | Status |
| --- | --- | --- | --- |
| Vercel | Hosts the website and serverless Express entry point; GitHub is connected to project `lovelicare`. | `vercel.json`, `server.js`, `public/` | Project is linked. The `vercel.json` present in the working tree is untracked; do not overwrite or commit it without owner review. Current Vercel docs mark legacy `builds` configuration as deprecated. |
| Google OAuth + Gmail API | Contact and newsletter submissions create Gmail drafts; they are not sent automatically. | `server.js` (`POST /draft`), `public/assets/js/liquid-glass.js` | Code path exists. Requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_REFRESH_TOKEN`. No credential or live Gmail delivery was verified in this review. |
| Anthropic Claude Messages API | Website wellness chat answers using the curated knowledge base plus optional scraped site content. | `server.js` (`POST /chat`) | Code path exists. Requires `ANTHROPIC_API_KEY`. Current model is pinned to `claude-haiku-4-5-20251001`. Anthropic lists the Haiku 4.5 retirement date as no sooner than 2026-10-15. Do not change model/cost without owner approval; evaluate replacement separately. |
| Firecrawl | Manual scrape of LoveLi Care's current public website into local chatbot context. | `scripts/scrape-site.js`, `npm run scrape` | Requires `FIRECRAWL_API_KEY`; writes `site-content.md`, loaded by `server.js` at startup. It currently targets `https://lovelicare.com/` only. No GoDaddy import, scheduled crawl, or webhook is configured. |
| Vagaro | Appointment booking through Vagaro's generated embedded widget in the booking overlay. | `public/index.html`, `public/assets/js/liquid-glass.js` (`openVagaro`) | Embedded widget exists. Vagaro's instructions say to paste its generated embed and re-add updated code when widget settings change; avoid casually editing the tokenized vendor snippet. Browser checks may show Vagaro cross-origin/network errors that are outside this site's origin. |
| Higgsfield | Creative tool for generating the requested local hero visual using the owner's portrait as the reference. | No application integration found in this repository. Claude-side MCP endpoint: `https://mcp.higgsfield.ai/mcp` | User reports access to Higgsfield. Use it from the Claude CLI environment if connected, then export/copy approved outputs into `public/assets/img/` and reference local paths. The public site should not hotlink generator-hosted media. |

## Webhooks

No webhook registration, callback route, signature verification, or webhook secret was found in the reviewed app. Current connections are direct API/OAuth calls, an embedded booking widget, and a creative-tool MCP workflow. Treat future hooks/webhooks as new integrations requiring an owner decision, documented event source, authentication/signature validation, and a test plan.

## Environment Names

- `ANTHROPIC_API_KEY`: Anthropic chat in `POST /chat`.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`: Gmail OAuth draft creation in `POST /draft`.
- `FIRECRAWL_API_KEY`: local/manual `npm run scrape` only.

Put values in local `.env` or the relevant Vercel environment settings; never write values into documentation, HTML, or commits. The `.vercel/README.txt` specifically says `.vercel/` project metadata should not be shared/committed. Keep `.vercel/project.json` local.

## Future GoDaddy Content Import

GoDaddy is not a configured content source in the current scraper. Before importing, collect the authorized source URLs/export, confirm ownership/access, and review the captured material for accurate services, prices, claims, and privacy-safe content. Keep the curated `knowledge-base.js` authoritative over scraped copy. Do not scrape private or authenticated GoDaddy content without explicit authorization.

## Verification Notes

- `server.js` defines `GET /health`, `GET /chatbot`, `POST /draft`, and `POST /chat`.
- Local browser tests of form handling should mock `/draft`; do not create test Gmail drafts or submit personal/health information without approval.
- A successful local response does not prove the deployed Vercel environment has all variables or OAuth scopes configured.
- Vercel docs currently recommend replacing legacy `builds` config with supported modern configuration, but changing deployment routing is out of scope for the visual pass. The current untracked `vercel.json` is user state and must be preserved.

## Official Documentation

- Firecrawl Node SDK: https://docs.firecrawl.dev/sdks/node
- Firecrawl scrape: https://docs.firecrawl.dev/features/scrape
- Gmail drafts: https://developers.google.com/gmail/api/guides/drafts
- Google OAuth 2.0 and refresh tokens: https://developers.google.com/identity/protocols/oauth2
- Anthropic Messages API: https://platform.claude.com/docs/en/api/messages
- Anthropic models and lifecycle: https://platform.claude.com/docs/en/docs/about-claude/models/overview
- Vercel Functions: https://vercel.com/docs/functions
- Vercel `vercel.json`: https://vercel.com/docs/project-configuration/vercel-json
- Vagaro booking widget: https://support.vagaro.com/hc/en-us/articles/204347860
- Higgsfield MCP: https://higgsfield.ai/mcp
