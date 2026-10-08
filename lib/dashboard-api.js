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
const inventory = require('./inventory');
const { readConnectors } = require('./dashboard-connectors');
router.use((req,res,next) => { res.set('Cache-Control','no-store'); next(); });

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
  try { return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null; }
  catch { return null; }
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

function inventoryAccess(req,res,next) {
  if (!getSupabase() || keyMode() !== 'service_role')
    return res.status(503).json({error:'Inventory needs a server-side Supabase connection.'});
  next();
}
router.get('/inventory',auth,inventoryAccess,async(req,res) => {
  try {
    const {data,error} = await getSupabase().from('inventory_items').select('*').order('name').limit(MAX_ROWS);
    if(error) return inventory.dbError(res,error);
    // A columns probe also distinguishes an empty migrated catalog from an old schema.
    const ready = await getSupabase().from('inventory_items').select('retail_price').limit(1);
    res.json({items:data,editable:!ready.error,fetchedAt:new Date().toISOString(),truncated:data.length===MAX_ROWS});
  } catch { res.status(502).json({error:'Inventory is temporarily unavailable.'}); }
});
router.get('/inventory/sources',auth,(req,res) => {
  try { res.json({items:inventory.sourceReview(req.query.source)}); }
  catch { res.status(404).json({error:'The local inventory source file is unavailable on this server.'}); }
});
router.get('/inventory/:id/movements',auth,inventoryAccess,async(req,res) => {
  if(!inventory.UUID.test(req.params.id)) return res.status(400).json({error:'Invalid product ID.'});
  try {
    const {data,error}=await getSupabase().from('inventory_movements').select('*').eq('item_id',req.params.id).order('created_at',{ascending:false}).limit(100);
    if(error) return inventory.dbError(res,error);
    res.json({movements:data});
  } catch { res.status(502).json({error:'Could not read the stock ledger.'}); }
});
router.post('/inventory/import',auth,inventoryAccess,async(req,res) => {
  let items;
  try {
    if(!Array.isArray(req.body.items)||!req.body.items.length||req.body.items.length>200) throw new Error('Import 1–200 products at a time.');
    items=req.body.items.map(inventory.product);
  } catch(e) { return res.status(400).json({error:e.message}); }
  try {
    const {data,error}=await getSupabase().rpc('inventory_import',{p_items:items});
    if(error) return inventory.dbError(res,error);
    res.json({imported:data});
  } catch { res.status(502).json({error:'Import response unavailable. Check inventory before retrying.'}); }
});
async function saveProduct(req,res) {
  let item;
  try { item=inventory.product(req.body); }
  catch(e) { return res.status(400).json({error:e.message}); }
  const id=req.params.id||null;
  if(id&&!inventory.UUID.test(id)) return res.status(400).json({error:'Invalid product ID.'});
  try {
    const {data,error}=await getSupabase().rpc('inventory_save',{p_item:item,p_id:id,p_version:req.body.updated_at||null});
    if(error) return inventory.dbError(res,error);
    res.status(id?200:201).json({item:data});
  } catch { res.status(502).json({error:'Save response unavailable. Check inventory before retrying.'}); }
}
router.post('/inventory',auth,inventoryAccess,saveProduct);
router.patch('/inventory/:id',auth,inventoryAccess,saveProduct);
router.post('/inventory/:id/movements',auth,inventoryAccess,async(req,res) => {
  const {delta,reason,note,updated_at}=req.body;
  if(!inventory.UUID.test(req.params.id)) return res.status(400).json({error:'Invalid product ID.'});
  if(typeof delta!=='number'||!Number.isFinite(delta)||!delta||Math.abs(delta)>1000000||Math.abs(delta*100-Math.round(delta*100))>0.00001)
    return res.status(400).json({error:'Enter a nonzero quantity with up to two decimals.'});
  if(!['received','administered','wasted','expired','adjustment'].includes(reason)||
    (reason==='received'&&delta<0)||(['administered','wasted','expired'].includes(reason)&&delta>0))
    return res.status(400).json({error:'Choose a stock reason matching the quantity change.'});
  if(typeof updated_at!=='string'||!Number.isFinite(Date.parse(updated_at))) return res.status(400).json({error:'Refresh the product before changing stock.'});
  try {
    const {data,error}=await getSupabase().rpc('inventory_adjust',{p_id:req.params.id,p_delta:delta,p_reason:reason,p_note:String(note||'').slice(0,1000),p_version:updated_at});
    if(error) return inventory.dbError(res,error);
    res.json({item:data});
  } catch { res.status(502).json({error:'Save response unavailable. Check the ledger before retrying.'}); }
});
router.get('/connectors',auth,async(req,res) => {
  try { res.json({connectors:await readConnectors(),fetchedAt:new Date().toISOString()}); }
  catch { res.status(502).json({error:'Connection status is temporarily unavailable.'}); }
});

// ── Orders ─────────────────────────────────────────────────────────────────
// Totals are never accepted from the browser. order_create recomputes every
// line from the catalog price and writes the stock decrement through the same
// ledger the rest of the dashboard reads, so the inventory number on screen
// stays the sum of its movements.
const orders = require('./orders');

router.get('/orders', auth, inventoryAccess, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return orders.dbError(res, error);
    res.json({ orders: data, fetchedAt: new Date().toISOString() });
  } catch { res.status(502).json({ error: 'Orders are temporarily unavailable.' }); }
});

router.post('/orders', auth, inventoryAccess, async (req, res) => {
  let header, items;
  try {
    header = orders.order(req.body);
    items  = orders.lines(req.body.items);
  } catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    const { data, error } = await getSupabase()
      .rpc('order_create', { p_order: header, p_items: items });
    if (error) return orders.dbError(res, error);
    res.status(201).json({ order: data });
  } catch { res.status(502).json({ error: 'Order response unavailable. Check inventory before retrying.' }); }
});

router.post('/orders/:id/cancel', auth, inventoryAccess, async (req, res) => {
  if (!orders.UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid order ID.' });
  const { updated_at } = req.body || {};
  if (typeof updated_at !== 'string' || !Number.isFinite(Date.parse(updated_at)))
    return res.status(400).json({ error: 'Refresh the order before cancelling it.' });
  try {
    const { data, error } = await getSupabase()
      .rpc('order_cancel', { p_id: req.params.id, p_version: updated_at });
    if (error) return orders.dbError(res, error);
    res.json({ order: data });
  } catch { res.status(502).json({ error: 'Cancel response unavailable. Check inventory before retrying.' }); }
});

router.patch('/orders/:id', auth, inventoryAccess, async (req, res) => {
  if (!orders.UUID.test(req.params.id)) return res.status(400).json({ error: 'Invalid order ID.' });
  const { status, updated_at } = req.body || {};
  if (!orders.STATUSES.includes(status))
    return res.status(400).json({ error: 'Use cancel to cancel an order.' });
  if (typeof updated_at !== 'string' || !Number.isFinite(Date.parse(updated_at)))
    return res.status(400).json({ error: 'Refresh the order before changing it.' });
  try {
    const { data, error } = await getSupabase()
      .rpc('order_set_status', { p_id: req.params.id, p_status: status, p_version: updated_at });
    if (error) return orders.dbError(res, error);
    res.json({ order: data });
  } catch { res.status(502).json({ error: 'Status response unavailable.' }); }
});

// ── Overview metrics ───────────────────────────────────────────────────────
// Everything here is derived from owned rows. A measure with no source returns
// null — never a zero and never an estimate — so the dashboard can render an
// honest empty state rather than a number it cannot trace.
router.get('/metrics', auth, inventoryAccess, async (req, res) => {
  try {
    const db = getSupabase();
    const [itemsQ, movesQ, ordersQ] = await Promise.all([
      db.from('inventory_items').select('*').eq('archived', false).limit(MAX_ROWS),
      db.from('inventory_movements').select('created_at,delta,reason,item_id')
        .order('created_at', { ascending: false }).limit(MAX_ROWS),
      db.from('orders').select('created_at,status,total').limit(MAX_ROWS)
    ]);
    if (itemsQ.error) return inventory.dbError(res, itemsQ.error);

    const items = itemsQ.data || [];
    const moves = movesQ.error ? [] : (movesQ.data || []);
    // Orders may legitimately not exist yet; that is an empty state, not a fault.
    const ordered = ordersQ.error ? null : (ordersQ.data || []);

    const byCategory = {};
    items.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + 1; });

    const costed = items.filter(i => i.cost_price != null);
    const priced = items.filter(i => i.retail_price != null);
    const units  = items.reduce((sum, i) => sum + Number(i.quantity), 0);

    // Month buckets from the ledger, newest 6. Received vs. used, kept apart —
    // netting them would hide a month that both restocked and sold heavily.
    const months = {};
    moves.forEach(m => {
      const key = String(m.created_at).slice(0, 7);
      const b = months[key] || (months[key] = { month: key, in: 0, out: 0 });
      if (Number(m.delta) >= 0) b.in += Number(m.delta); else b.out += -Number(m.delta);
    });

    const live = ordered
      ? (() => {
          const active = ordered.filter(o => o.status !== 'cancelled');
          const week = Date.now() - 7 * 864e5;
          return {
            total: active.length,
            thisWeek: active.filter(o => Date.parse(o.created_at) >= week).length,
            revenue: active.reduce((s, o) => s + Number(o.total || 0), 0)
          };
        })()
      : null;

    res.json({
      products: items.length,
      units,
      lowStock: items.filter(i => Number(i.quantity) <= Number(i.reorder_at)).length,
      outOfStock: items.filter(i => Number(i.quantity) === 0).length,
      // null, not 0 — nothing is costed yet, and "$0" would be a lie.
      stockValue: costed.length
        ? costed.reduce((s, i) => s + Number(i.cost_price) * Number(i.quantity), 0)
        : null,
      costedCount: costed.length,
      pricedCount: priced.length,
      categories: Object.entries(byCategory)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)),
      months: Object.values(months).sort((a, b) => a.month.localeCompare(b.month)).slice(-6),
      movements: moves.length,
      lastCountedAt: moves.length ? moves[0].created_at : null,
      orders: live,
      fetchedAt: new Date().toISOString()
    });
  } catch { res.status(502).json({ error: 'Metrics are temporarily unavailable.' }); }
});

module.exports = router;
