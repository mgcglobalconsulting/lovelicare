// ===========================================================================
// LoveLi Care — Dashboard API
// Mounted at /api/dashboard by server.js
//
// SECURITY POSTURE
// ----------------
// These routes read contact details (name, email, phone, message). That is
// PII. Per D4 the product collects no PHI, so this is out of HIPAA scope —
// but it is still private client data and must never be publicly readable.
//
// Three guards, in order:
//
//   1. DASHBOARD_TOKEN must be set. If it is not, every route returns 503.
//      Secure by default: forgetting to configure auth fails closed, it does
//      not silently expose the queue.
//   2. The caller must present that token, as an `x-dashboard-token` header
//      or an httpOnly `lc_dash` cookie obtained from POST /session.
//      Compared in constant time.
//   3. Reads need the service-role key, because the tables are insert-only
//      under RLS and a publishable key's SELECT is denied. If only the
//      publishable key is present we say so rather than returning an empty
//      set that would look like "no data".
//
// This token gate is INTERIM. MASTER-PLAN-v2.md §4.4 specifies Supabase Auth
// plus a `staff` table with roles owner|provider|front_desk. Replace this
// module's auth() with that when the staff table lands; the route shapes and
// the client contract do not need to change.
// ===========================================================================

const express = require("express");
const crypto = require("crypto");
const { getSupabase, keyMode } = require("./supabase");

const router = express.Router();

const WINDOW_DAYS = 90;          // the dashboard's widest range
const MAX_ROWS = 5000;           // hard ceiling, so one call cannot pull the table

/* ------------------------------------------------------------------ AUTH */

function configuredToken() {
  const t = process.env.DASHBOARD_TOKEN;
  return t && t.length >= 16 ? t : null;
}

// Constant-time compare. A plain === leaks length and prefix via timing.
function tokenMatches(given, expected) {
  if (typeof given !== "string" || given.length === 0) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // Still burn a comparison so the failure takes the same time.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const hit = raw.split(";").map(s => s.trim()).find(s => s.startsWith(name + "="));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function auth(req, res, next) {
  const expected = configuredToken();
  if (!expected) {
    return res.status(503).json({
      error: "Dashboard API is not configured.",
      detail: "Set DASHBOARD_TOKEN (32+ random chars) in the environment to enable it."
    });
  }
  const given = req.get("x-dashboard-token") || readCookie(req, "lc_dash");
  if (!tokenMatches(given, expected)) {
    return res.status(401).json({ error: "Not authorized." });
  }
  next();
}

/* --------------------------------------------------------------- SESSION */

// Exchanges the token for an httpOnly cookie so the browser page can call the
// read routes without the token ever living in JavaScript or in the URL.
router.post("/session", express.json(), (req, res) => {
  const expected = configuredToken();
  if (!expected) {
    return res.status(503).json({ error: "Dashboard API is not configured." });
  }
  if (!tokenMatches(req.body && req.body.token, expected)) {
    return res.status(401).json({ error: "Not authorized." });
  }
  const secure = process.env.NODE_ENV === "production";
  res.setHeader("Set-Cookie",
    "lc_dash=" + encodeURIComponent(expected) +
    "; HttpOnly; SameSite=Strict; Path=/api/dashboard; Max-Age=43200" +
    (secure ? "; Secure" : ""));
  res.json({ ok: true });
});

router.post("/logout", (req, res) => {
  res.setHeader("Set-Cookie", "lc_dash=; HttpOnly; SameSite=Strict; Path=/api/dashboard; Max-Age=0");
  res.json({ ok: true });
});

/* ----------------------------------------------------------------- READS */

function sinceISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Phase 3 tables (chat_sessions, site_events) do not exist yet. Asking for a
// missing table is an expected state, not an error: return an empty set and
// report it, so the dashboard can show an honest empty panel instead of
// failing the whole request.
async function selectSafe(supabase, table, columns, since, dateCol) {
  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .gte(dateCol, since)
    .order(dateCol, { ascending: false })
    .limit(MAX_ROWS);

  if (error) {
    const missing = error.code === "42P01" ||
                    /does not exist|schema cache/i.test(error.message || "");
    return { rows: [], missing, error: missing ? null : error.message };
  }
  return { rows: data || [], missing: false, error: null };
}

router.get("/rows", auth, async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    return res.status(503).json({
      error: "Supabase is not configured.",
      detail: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    });
  }
  if (keyMode() !== "service_role") {
    // Be explicit. With the publishable key every SELECT is denied by RLS and
    // the dashboard would render zeros that look like real zeros.
    return res.status(503).json({
      error: "Dashboard reads require the service-role key.",
      detail: "The tables are insert-only under RLS, so the publishable key " +
              "cannot SELECT. Set SUPABASE_SERVICE_ROLE_KEY (server-side only)."
    });
  }

  const since = sinceISO(WINDOW_DAYS);

  try {
    const [inq, subs, chats, events] = await Promise.all([
      selectSafe(supabase, "contact_inquiries",
        "id,created_at,name,email,phone,service,message,status,source", since, "created_at"),
      selectSafe(supabase, "newsletter_subscribers",
        "id,created_at,email,status,source", since, "created_at"),
      selectSafe(supabase, "chat_sessions",
        "id,started_at,service,question,messages,resolved,booking_click", since, "started_at"),
      selectSafe(supabase, "site_events",
        "id,at,type,page", since, "at")
    ]);

    const hardError = [inq, subs, chats, events].find(r => r.error);
    if (hardError) {
      console.error("[dashboard] read failed:", hardError.error);
      return res.status(500).json({ error: "Could not read dashboard data." });
    }

    res.json({
      all: {
        inquiries: inq.rows,
        subscribers: subs.rows,
        chats: chats.rows,
        events: events.rows
      },
      info: {
        supabase: {
          rows: inq.rows.length + subs.rows.length + chats.rows.length + events.rows.length,
          windowDays: WINDOW_DAYS
        },
        // Which Phase 3 tables are still unbuilt. The UI uses this to explain
        // an empty panel instead of implying the business had no activity.
        missingTables: [
          chats.missing ? "chat_sessions" : null,
          events.missing ? "site_events" : null
        ].filter(Boolean)
      }
    });
  } catch (err) {
    console.error("[dashboard] unexpected read error:", err.message);
    res.status(500).json({ error: "Could not read dashboard data." });
  }
});

/* ---------------------------------------------------------------- WRITES */

const ALLOWED_STATUS = ["new", "contacted", "booked", "closed", "spam"];

router.patch("/inquiries/:id", auth, express.json(), async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: "Supabase is not configured." });
  if (keyMode() !== "service_role") {
    return res.status(503).json({ error: "Status updates require the service-role key." });
  }

  const status = req.body && req.body.status;
  // Mirrors the CHECK constraint in migration 0001. Validate here too, so a
  // bad value is a clean 400 rather than a database error.
  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ error: "Invalid status.", allowed: ALLOWED_STATUS });
  }

  const id = String(req.params.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "Invalid id." });
  }

  const { error } = await supabase
    .from("contact_inquiries")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[dashboard] status update failed:", error.message);
    return res.status(500).json({ error: "Could not update status." });
  }
  res.json({ ok: true, id, status });
});

module.exports = router;
