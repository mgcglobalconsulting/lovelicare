#!/usr/bin/env node
/**
 * Mints the Gmail refresh token used for new-submission alerts.
 *
 *   npm run google-auth
 *
 * One-time setup in Google Cloud Console (console.cloud.google.com):
 *   1. Create or pick a project.
 *   2. APIs & Services → Library → enable "Gmail API".
 *   3. APIs & Services → OAuth consent screen → External. Add yourself
 *      (LoveLiCareSvcs@gmail.com) under "Test users". It can stay in Testing
 *      mode — no Google review is needed for your own account.
 *   4. Credentials → Create credentials → OAuth client ID → Web application.
 *      Add this Authorised redirect URI exactly:
 *          http://localhost:5839/oauth2callback
 *   5. Put the client id and secret in .env as GOOGLE_CLIENT_ID and
 *      GOOGLE_CLIENT_SECRET, then run this script.
 *
 * It opens the consent screen, catches the redirect, and writes
 * GOOGLE_REDIRECT_URI + GOOGLE_REFRESH_TOKEN into .env for you.
 *
 * Scope is gmail.compose — it can create drafts and nothing else. It cannot
 * read your mail and cannot send on your behalf.
 */
require("dotenv").config();

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { google } = require("googleapis");

const PORT = 5839;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/gmail.compose";
const ENV_PATH = path.join(__dirname, "..", ".env");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(`
✗ Missing credentials.

  Add these to .env first, then run this again:

    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...

  See the setup steps at the top of scripts/google-auth.js.
`);
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",      // required to receive a refresh token
  prompt: "consent",           // force a refresh token even on re-authorisation
  scope: [SCOPE]
});

/** Add or replace a key in .env without disturbing anything else. */
function upsertEnv(key, value) {
  let body = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(body)) {
    body = body.replace(re, line);
  } else {
    if (body && !body.endsWith("\n")) body += "\n";
    body += line + "\n";
  }
  fs.writeFileSync(ENV_PATH, body);
}

const page = (title, detail, ok) => `<!doctype html><html><head><meta charset="utf-8">
<title>${title}</title><style>
body{margin:0;height:100vh;display:grid;place-items:center;background:#1A3232;
 font-family:-apple-system,system-ui,sans-serif;color:#F5EFE8;text-align:center;padding:24px}
h1{font-weight:400;font-size:1.6rem;margin:0 0 12px;color:${ok ? "#C9A96E" : "#E8A0A0"}}
p{opacity:.75;font-size:.9rem;line-height:1.7;max-width:420px;margin:0}
</style></head><body><div><h1>${title}</h1><p>${detail}</p></div></body></html>`;

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith("/oauth2callback")) {
    res.writeHead(404).end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" })
       .end(page("Authorisation declined", `Google reported: ${error}`, false));
    console.error(`\n✗ Authorisation declined: ${error}\n`);
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      res.writeHead(200, { "Content-Type": "text/html" })
         .end(page("No refresh token returned", "Revoke the app's access in your Google account and run this again.", false));
      console.error(`
✗ Google returned no refresh token.

  This happens when the app was already authorised. Remove its access at
  https://myaccount.google.com/permissions and run this again.
`);
      server.close();
      process.exit(1);
    }

    upsertEnv("GOOGLE_REDIRECT_URI", REDIRECT_URI);
    upsertEnv("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);

    res.writeHead(200, { "Content-Type": "text/html" })
       .end(page("Connected", "The refresh token has been saved to .env. You can close this tab and return to the terminal.", true));

    console.log(`
✓ Connected. Written to .env:

    GOOGLE_REDIRECT_URI=${REDIRECT_URI}
    GOOGLE_REFRESH_TOKEN=${tokens.refresh_token.slice(0, 12)}…(hidden)

  Restart the server and /health should report:
    "emailNotifications": "configured"

  For the deployed site, mirror all four values:
    vercel env add GOOGLE_CLIENT_ID
    vercel env add GOOGLE_CLIENT_SECRET
    vercel env add GOOGLE_REDIRECT_URI
    vercel env add GOOGLE_REFRESH_TOKEN
`);
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(200, { "Content-Type": "text/html" })
       .end(page("Token exchange failed", err.message, false));
    console.error("\n✗ Token exchange failed:", err.message, "\n");
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`
Opening Google's consent screen…

  If it doesn't open, paste this into your browser:

  ${authUrl}

  Waiting on ${REDIRECT_URI}
`);
  const opener = process.platform === "darwin" ? "open"
               : process.platform === "win32" ? "start"
               : "xdg-open";
  exec(`${opener} "${authUrl}"`);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\n✗ Port ${PORT} is busy. Close whatever is using it and try again.\n`);
  } else {
    console.error("\n✗", e.message, "\n");
  }
  process.exit(1);
});
