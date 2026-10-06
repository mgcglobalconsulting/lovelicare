# Deploying the LoveLi Care Website

A step-by-step guide to putting this website online under your own GitHub and
Vercel accounts. No prior experience assumed. Allow about 30 minutes.

Nothing here touches your current lovelicare.com site — that stays exactly as it
is until the final optional step.

---

## What you'll end up with

- The website running at a free Vercel address, e.g. `lovelicare.vercel.app`
- The contact form and newsletter signup saving straight into your own database
- Optionally, your own domain pointed at the new site

---

## Step 1 — Create your accounts

Three free accounts. Use the same email for all three.

| Service | Sign up at | What it does |
|---|---|---|
| GitHub | github.com | Stores the website's code |
| Vercel | vercel.com | Runs the website |
| Supabase | supabase.com | Stores form submissions |

When signing up for **Vercel** and **Supabase**, choose **"Continue with GitHub"**.
It links everything automatically and saves a step later.

---

## Step 2 — Get the code into your GitHub

Whoever hands you this project will either:

- **Transfer the repository to you** — accept the transfer invitation in your email, or
- **Add you as a collaborator** — then click **Fork** on the repository page to get
  your own copy.

Either way, confirm you can see the repository at `github.com/<your-username>/<repo-name>`
before continuing.

---

## Step 3 — Set up the database

1. At [supabase.com/dashboard](https://supabase.com/dashboard), click **New project**.
2. Name it `lovelicare`. Pick the region closest to Maryland — **East US (North Virginia)**.
3. Set a database password and **save it somewhere safe**. You won't need it often,
   but it cannot be recovered.
4. Wait about two minutes for it to finish setting up.

### Create the tables

1. In the left sidebar click **SQL Editor**, then **New query**.
2. Open the file `supabase/migrations/0001_contact_and_subscribers.sql` from the
   repository, copy everything in it, and paste it into the editor.
3. Click **Run**.

You should see "Success". Click **Table Editor** in the sidebar — you'll now see
`contact_inquiries` and `newsletter_subscribers`.

> **This is where your form submissions will appear.** Check it like an inbox.

### Copy your two connection values

In the left sidebar go to **Project Settings → Data API**, and copy:

- **Project URL** — looks like `https://abcdefgh.supabase.co`
- **Publishable key** (or **anon public** key) — a long string starting `sb_publishable_…`

Keep these handy for the next step.

> **Is the publishable key safe to use?** Yes. The tables are configured so the
> website can only *add* a submission — it can never read, change or delete one.
> Even if that key were public, nobody could retrieve your clients' details.

---

## Step 4 — Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Find your repository in the list and click **Import**.
   (If you don't see it, click **Adjust GitHub App Permissions** and grant access.)
3. **Leave every build setting on its default.** Don't change the framework,
   build command, or output directory — the project already includes a
   `vercel.json` that configures all of it.
4. Expand **Environment Variables** and add these two:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL from Step 3 |
   | `SUPABASE_PUBLISHABLE_KEY` | the publishable key from Step 3 |

5. Click **Deploy** and wait a minute or two.

When it finishes you'll get a link like `lovelicare.vercel.app`. **That's your site.**

---

## Step 5 — Check that it works

1. Open your new `.vercel.app` link.
2. Add `/health` to the end of the address, e.g. `lovelicare.vercel.app/health`.
   You should see `"supabase": "configured (publishable key)"`.
   If it says *missing*, re-check the two environment variables in Step 4 for typos.
3. Go to the **Contact** page on your site and send yourself a test message.
4. Back in Supabase, open **Table Editor → contact_inquiries**. Your test message
   should be sitting there.

If it is, you're live.

---

## Step 6 (optional) — Use your own domain

Only do this when you're happy with the new site. **This is the step that
replaces your current website**, so there's no rush.

1. In Vercel, open your project → **Settings → Domains**.
2. Enter `lovelicare.com` and click **Add**.
3. Vercel shows you DNS records to create.
4. Sign in to **GoDaddy**, open the DNS settings for `lovelicare.com`, and enter
   the records exactly as Vercel listed them.
5. Changes usually take under an hour, occasionally up to 48.

Your old GoDaddy-built site stays untouched the whole time. If anything looks
wrong, undo the DNS change and the old site returns.

---

## Optional extras

These aren't needed for the site to work.

**Email alerts on new submissions.** By default, submissions are saved to Supabase
and you check them there. To also receive a Gmail draft for each one, follow the
setup notes at the top of `scripts/google-auth.js`, then add `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` and `GOOGLE_REFRESH_TOKEN` to your
Vercel environment variables.

**The wellness chatbot.** The assistant page needs an Anthropic API key. Add
`ANTHROPIC_API_KEY` to your Vercel environment variables. This one is paid —
usage-based, typically a few dollars a month at low traffic.

---

## Making changes later

Edit a file on GitHub and Vercel redeploys automatically within a minute or two.
Every deployment is kept, so if something breaks you can open **Deployments** in
Vercel, find the last good one, and click **Promote to Production** to roll back.

---

## A note on Vercel's free plan

Vercel's Hobby plan is free but its terms are written for personal,
non-commercial projects. A business website generally counts as commercial use,
which calls for the **Pro** plan at about $20/month. Many small sites run on
Hobby without issue, but the terms do allow Vercel to suspend commercial
projects, so it's worth knowing before you rely on it.

Supabase's free tier has no such restriction and is far more capacity than this
website needs.

---

## If something goes wrong

| Symptom | Likely cause |
|---|---|
| Form says "temporarily unavailable" | Environment variables missing or misspelled in Vercel |
| `/health` says `missing SUPABASE_URL` | Variables weren't added, or you added them after deploying — redeploy |
| Form fails but `/health` looks fine | The SQL from Step 3 wasn't run, or was run on a different project |
| Repository won't appear in Vercel | Grant Vercel access via **Adjust GitHub App Permissions** |
| Changes aren't showing | Check **Deployments** in Vercel for a failed build |

After changing any environment variable, **redeploy**: open **Deployments**, click
the `⋯` menu on the most recent one, and choose **Redeploy**.
