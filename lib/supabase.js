// Server-side Supabase client for LoveLi Care form intake.
//
// Two supported modes, in order of preference:
//
//   1. SUPABASE_PUBLISHABLE_KEY  (recommended)
//      Works because the tables carry insert-only RLS policies: the public role
//      may INSERT a submission but can never SELECT, UPDATE or DELETE. Nothing
//      secret lives in the environment, so a leaked key exposes no one's data.
//
//   2. SUPABASE_SERVICE_ROLE_KEY
//      Bypasses RLS entirely. Only needed if the app ever has to read rows back.
//      If set, it wins. Never expose this one to the browser.

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

const key = SERVICE_ROLE || PUBLISHABLE;
const mode = SERVICE_ROLE ? "service_role" : PUBLISHABLE ? "publishable" : null;

let client = null;

if (SUPABASE_URL && key) {
  client = createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
} else {
  console.warn(
    "[supabase] Not configured — set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY " +
    "(or SUPABASE_SERVICE_ROLE_KEY). Form submissions will be rejected with 503."
  );
}

/** The Supabase client, or null when the project is not configured. */
function getSupabase() {
  return client;
}

/** True when a client was created. */
function isConfigured() {
  return client !== null;
}

/** "service_role" | "publishable" | null — surfaced on /health for debugging. */
function keyMode() {
  return mode;
}

module.exports = { getSupabase, isConfigured, keyMode };
