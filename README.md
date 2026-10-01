# LoveLi Care Med Spa & Wellness Lounge

Website and wellness chatbot for LoveLi Care (Towson, MD). It uses a static "Liquid Glass" front end served by a small Express server.

## Run locally

```bash
npm install
npm start          # http://localhost:3000  ·  chatbot at /chatbot
npm run scrape     # refresh site-content.md from lovelicare.com (needs FIRECRAWL_API_KEY)
```

## Environment (`.env`, never committed)

| Key | Used for |
|-----|----------|
| `ANTHROPIC_API_KEY` | Wellness chatbot (`POST /chat`) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN` | Contact/subscribe forms → Gmail drafts (`POST /draft`) |
| `FIRECRAWL_API_KEY` | `npm run scrape` only (local) |

## Layout

```
index.html              all site pages (to be split into real pages — see docs/NEXT-SESSION-PLAN.md)
chatbot.html            standalone wellness assistant UI
server.js               Express: static files, /chat, /draft, /health
knowledge-base.js       curated facts the chatbot is allowed to use
scripts/scrape-site.js  Firecrawl scrape → site-content.md (supplements the knowledge base)
assets/css, js, img     Liquid Glass design system + web-optimized images
docs/                   plans and notes
```

## Deploy

The site deploys on Vercel (project `lovelicare`), which is connected to this GitHub repo. **Every push to `main` deploys to production**, so ask the owner before pushing.

## Branches

- `main`: the live site.
- `experiment/*`: saved design explorations (sage palette, Royal Green Oasis homepage, header tweak). These are not merged.
