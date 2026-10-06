# LoveLi Care Vercel preview

Updated October 2, 2026.

- Site: https://lovelicare-7dj8t4co7-onedopestorys-projects.vercel.app
- Embedded assistant: https://lovelicare-7dj8t4co7-onedopestorys-projects.vercel.app/#wellness-assistant
- Standalone assistant: https://lovelicare-7dj8t4co7-onedopestorys-projects.vercel.app/chatbot
- Deployment: https://vercel.com/onedopestorys-projects/lovelicare/5btP3Nd8V9HVcyNdgMzxrNHYY2Pa

The preview is protected by Vercel authentication. Open it while signed into the Vercel account that owns this project.

## Connections

| Feature | Connection | Status |
| --- | --- | --- |
| Website | `public/index.html` and `public/assets/` → Vercel CDN | Deployed |
| Wellness assistant UI | Website iframe and launch links → `/chatbot` → `/chatbot.html` | Connected |
| Chat replies | Chat UI → `POST /chat` → existing Anthropic account | Key configured in Preview; account needs API credits |
| Contact form | `POST /api/contact` → Supabase `contact_inquiries` | Connected |
| Newsletter | `POST /api/subscribe` → Supabase `newsletter_subscribers` | Connected |
| Booking | Existing Vagaro embed | Existing integration retained; no appointment booked during verification |
| Store/account links | Existing external `lovelicare.com` destinations | Existing links retained; no checkout performed |
| Gmail draft notifications | Google OAuth configuration | Disabled; no Google credentials supplied |

The Supabase schema migration `supabase/migrations/0001_contact_and_subscribers.sql` was applied to the database already configured in this project's `.env`. Public roles may insert submissions but cannot read, update, or delete them. No service-role secret is needed by the app.

Only `ANTHROPIC_API_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY` were added to the Vercel Preview environment. Local environment files, source images, and internal notes are excluded by `.vercelignore`.

## Chat billing blocker

The existing Anthropic key authenticates, but the API rejects requests because its credit balance is too low. Add credits in the existing Anthropic account to enable replies with no code change or redeployment.

Vercel AI Gateway was also tested with this project's OIDC identity. It returned HTTP 403 because the Vercel account needs a valid payment card before free credits can be used. No billing settings, purchases, auto-top-up, or application provider changes were made. The Gateway test credential is in ignored `.env.gateway.local`; it is not deployed.

Until credits are available, the assistant reports that it is temporarily unavailable and provides the clinic's phone and email. It does not fabricate a reply.

## Source folders

The deployable website and real chat implementation are both in `/Users/markcartwright/Desktop/lovelicare`.

`/Users/markcartwright/Desktop/lovelicare.chatbox/agents-medical-spa-website-audit-framework` contains an older static site and Gmail draft server, not a separate working chatbot. Its Git worktree reference is broken. It was audited but left unchanged.

## Deployment and verification

The Vercel project is `onedopestorys-projects/lovelicare`, using Express and Node.js 24. Vercel serves `public/` assets directly and runs `server.js` for API routes. The old catch-all legacy build configuration was replaced with the Express framework preset.

The first deployment was automatically assigned Production by Vercel despite requesting Preview, creating `https://lovelicare-five.vercel.app`. It has the initial integration snapshot. The separate Preview URL at the top is the reviewed deployment with Preview credentials and the improved chat outage handling. No custom domain or GitHub remote was changed.

Verified: deployment build; homepage and static assets; embedded same-origin chat markup; configured health endpoint; existing form tests; chat request validation, successful reply contract using a test provider, provider-outage handling, and both chat aliases. Visual browser inspection was unavailable because this session exposed no browser connection.

Live Preview form submissions both returned HTTP 201 and were confirmed in Supabase. The two synthetic verification records were removed afterward. Live chat returned the expected HTTP 503 with clinic contact details while Anthropic credits remain unavailable.

To create another preview from this folder:

```sh
npx --yes vercel@latest deploy --yes --target preview
```

Global CLI 50.44.0 is outdated. This deployment used 62.2.0 through `npx`; upgrade the global installation with `npm i -g vercel@latest` when convenient.
