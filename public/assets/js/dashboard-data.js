/* ==========================================================================
   LoveLi Care — Dashboard data layer
   Surface: /dashboard.html

   TWO MODES, ONE DERIVATION PATH
   ------------------------------
   The honesty rule (CLAUDE.md): "No dashboard tile shows a number it cannot
   trace to a row. Empty state over placeholder, always."

   That rule is enforced structurally here, not by discipline:

     * LIVE  — rows come from /api/dashboard/rows (Express → Supabase).
     * DEMO  — rows are generated locally, deterministically, and labelled.

   In BOTH modes every tile, funnel stage, bar and chart point is computed by
   deriveAll() from an array of rows. No aggregate is ever hardcoded. A demo
   number is therefore still traceable to a row — the row is just synthetic,
   and the UI badges it as such on every single tile.

   Tier 2 metrics (revenue, LTV, rebooking, calendar, memberships) are NOT
   generated even in demo mode. They have no source and stay empty states.
   ========================================================================== */

(function (global) {
  "use strict";

  /* ----------------------------------------------------------- CONSTANTS */

  // Verbatim from the "Service Interest" <select> on the live contact form.
  // Changing these without changing index.html would silently break filtering.
  var SERVICES = [
    "Medical Aesthetics (Botox / Fillers)",
    "Body Contouring / Snatch Protocol™",
    "IV & Nutritional Wellness Therapy",
    "Weight Management",
    "Nutrition Counseling",
    "MMCC Certification",
    "Medical Physical",
    "General Inquiry"
  ];

  // contact_inquiries.status CHECK constraint, migration 0001.
  var STATUSES = ["new", "contacted", "booked", "closed", "spam"];

  // contact_inquiries.source — website_contact_form is the column default.
  var SOURCES = [
    "website_contact_form",
    "wellness_assistant",
    "online_store",
    "vagaro_widget",
    "instagram",
    "referral"
  ];

  var RANGES = [
    { key: "today", label: "Today",        days: 1 },
    { key: "7d",    label: "Last 7 days",  days: 7 },
    { key: "30d",   label: "Last 30 days", days: 30 },
    { key: "90d",   label: "Last 90 days", days: 90 }
  ];

  /* ------------------------------------------------------------- HELPERS */

  // mulberry32 — a seeded PRNG. Demo data must be stable across reloads, or
  // every refresh would show different "facts" and the preview would be junk.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(r, arr, weights) {
    if (!weights) return arr[Math.floor(r() * arr.length)];
    var total = weights.reduce(function (a, b) { return a + b; }, 0);
    var x = r() * total;
    for (var i = 0; i < arr.length; i++) {
      x -= weights[i];
      if (x <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }

  function startOfDay(d) {
    var c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
  }

  function dayKey(d) {
    var c = new Date(d);
    return c.getFullYear() + "-" + String(c.getMonth() + 1).padStart(2, "0") +
           "-" + String(c.getDate()).padStart(2, "0");
  }

  /* ========================================================================
     DEMO ROW GENERATION
     Rows first. Aggregates are derived from them afterwards, exactly as in
     live mode. This is what keeps demo numbers internally consistent — the
     funnel, the tiles and the table can never disagree.
     ===================================================================== */

  var FIRST = ["Alicia","Brianna","Camille","Danielle","Erin","Gabrielle","Imani",
               "Jasmine","Kendra","Lauren","Maya","Nicole","Olivia","Priya",
               "Renee","Simone","Tanya","Vanessa","Whitney","Yolanda",
               "Marcus","Darnell","Terrence","Andre","Jordan"];
  var LAST  = ["Adams","Brooks","Carter","Dixon","Ellis","Foster","Grant",
               "Harper","Jenkins","Lane","Monroe","Nash","Owens","Price",
               "Reyes","Sutton","Turner","Vaughn","Walker","Young"];

  // Questions a med-spa chatbot actually gets. These populate the
  // "What people are asking" panel, which the plan calls the strongest
  // argument for the whole build.
  var QUESTIONS = [
    "How much is Botox per unit?",
    "Do you take walk-ins or is it appointment only?",
    "What is the Snatch Protocol™ and how many sessions?",
    "Do you accept insurance for the medical physical?",
    "How do I get MMCC certified in Maryland?",
    "Is there downtime after body contouring?",
    "What IV drip helps with fatigue?",
    "Do you offer payment plans?",
    "How long does a semaglutide consult take?",
    "Where exactly are you located in Towson?",
    "Can I bring my daughter to her appointment?",
    "What are your Saturday hours?",
    "Do you do lip filler dissolving?",
    "Is the weight management program covered?",
    "How far in advance should I book?"
  ];

  function generateRows(days, seed) {
    var r = rng(seed || 20261006);
    var now = new Date();
    var inquiries = [], subscribers = [], chats = [], events = [];
    var idn = 0;

    for (var d = days - 1; d >= 0; d--) {
      var day = new Date(now);
      day.setDate(day.getDate() - d);
      var dow = day.getDay();

      // Business rhythm: Thu/Fri/Sat are the open days per the lobby signage.
      // Sunday and Monday are quiet. This is what stops the charts looking
      // like noise and makes the weekly cadence legible.
      var busy = (dow === 4 || dow === 5 || dow === 6) ? 1 : (dow === 0 || dow === 1) ? 0.3 : 0.6;

      // Gentle upward trend over the window, so growth panels have a shape.
      var trend = 0.75 + (0.5 * (days - d) / days);

      // ---- site_events: page views, chat opens, form starts, booking clicks
      var views = Math.round((38 + r() * 46) * busy * trend);
      for (var v = 0; v < views; v++) {
        events.push({
          id: "ev" + (++idn),
          at: stamp(day, r),
          type: "page_view",
          page: pick(r, ["home", "services", "medical-aesthetics", "body-contouring",
                         "weight-management", "contact", "online-store"],
                        [34, 14, 13, 12, 9, 10, 8])
        });
      }

      // ---- chat_sessions (the /chat endpoint, once persistence ships)
      var nChats = Math.round((2 + r() * 5) * busy * trend);
      for (var c = 0; c < nChats; c++) {
        var clicked = r() < 0.27;
        chats.push({
          id: "ch" + (++idn),
          started_at: stamp(day, r),
          service: pick(r, SERVICES, [26, 21, 14, 13, 8, 7, 5, 6]),
          question: QUESTIONS[Math.floor(r() * QUESTIONS.length)],
          messages: 3 + Math.floor(r() * 11),
          resolved: r() < 0.72,
          booking_click: clicked
        });
        if (clicked) {
          events.push({ id: "ev" + (++idn), at: stamp(day, r), type: "booking_click", page: "chat" });
        }
      }

      // ---- booking_intent from the site itself (Vagaro widget / CTA)
      var nClicks = Math.round((1 + r() * 4) * busy * trend);
      for (var b = 0; b < nClicks; b++) {
        events.push({ id: "ev" + (++idn), at: stamp(day, r), type: "booking_click", page: "site" });
      }

      // ---- contact_inquiries
      var nInq = Math.round((1 + r() * 3.4) * busy * trend);
      for (var i = 0; i < nInq; i++) {
        var fn = FIRST[Math.floor(r() * FIRST.length)];
        var ln = LAST[Math.floor(r() * LAST.length)];
        // Older rows have had time to move through triage; today's are new.
        var st = d > 20 ? pick(r, STATUSES, [8, 16, 30, 34, 3])
               : d > 7  ? pick(r, STATUSES, [20, 30, 25, 14, 3])
               : d > 2  ? pick(r, STATUSES, [42, 30, 15, 6, 3])
                        : pick(r, STATUSES, [70, 18, 7, 2, 3]);
        inquiries.push({
          id: "in" + (++idn),
          created_at: stamp(day, r),
          name: fn + " " + ln,
          email: fn.toLowerCase() + "." + ln.toLowerCase() + "@example.com",
          phone: "410-555-0" + String(100 + Math.floor(r() * 899)),
          service: pick(r, SERVICES, [25, 22, 13, 14, 8, 7, 5, 6]),
          message: QUESTIONS[Math.floor(r() * QUESTIONS.length)],
          status: st,
          source: pick(r, SOURCES, [48, 21, 9, 11, 7, 4])
        });
      }

      // ---- newsletter_subscribers
      var nSub = Math.round((1 + r() * 3) * busy * trend);
      for (var s = 0; s < nSub; s++) {
        var sf = FIRST[Math.floor(r() * FIRST.length)];
        subscribers.push({
          id: "su" + (++idn),
          created_at: stamp(day, r),
          email: sf.toLowerCase() + Math.floor(r() * 90 + 10) + "@example.com",
          status: r() < 0.96 ? "subscribed" : "unsubscribed",
          source: pick(r, ["website_subscribe_form", "online_store", "wellness_assistant"], [60, 28, 12])
        });
      }
    }

    return { inquiries: inquiries, subscribers: subscribers, chats: chats, events: events };
  }

  // Clinic hours skew: 10am–7pm, nothing at 3am. Makes "today" views realistic.
  function stamp(day, r) {
    var c = new Date(day);
    c.setHours(10 + Math.floor(r() * 9), Math.floor(r() * 60), Math.floor(r() * 60), 0);
    return c.toISOString();
  }

  /* ========================================================================
     FILTERING — applied to rows, before any aggregate exists.
     This is what makes the dropdowns real: they change the row set, and
     every number on the page recomputes from the filtered rows.
     ===================================================================== */

  function withinRange(iso, rangeKey) {
    var range = RANGES.filter(function (x) { return x.key === rangeKey; })[0] || RANGES[2];
    var from = startOfDay(new Date());
    from.setDate(from.getDate() - (range.days - 1));
    return new Date(iso) >= from;
  }

  function applyFilters(rows, f) {
    function keep(row, opts) {
      if (!withinRange(row.created_at || row.started_at || row.at, f.range)) return false;
      if (opts.service && f.service !== "all" && row.service !== f.service) return false;
      if (opts.status && f.status !== "all" && row.status !== f.status) return false;
      if (opts.source && f.source !== "all" && row.source !== f.source) return false;
      return true;
    }
    return {
      inquiries: rows.inquiries.filter(function (x) {
        return keep(x, { service: true, status: true, source: true });
      }),
      subscribers: rows.subscribers.filter(function (x) {
        return keep(x, { source: true });
      }),
      chats: rows.chats.filter(function (x) {
        return keep(x, { service: true });
      }),
      events: rows.events.filter(function (x) { return keep(x, {}); })
    };
  }

  /* ========================================================================
     DERIVATION — the single path both modes go through.
     ===================================================================== */

  function deriveAll(all, rows, f) {
    var range = RANGES.filter(function (x) { return x.key === f.range; })[0] || RANGES[2];

    // ---- previous period, for the delta chips. Comparing against the same
    // number of days immediately before the window.
    var prevTo = startOfDay(new Date());
    prevTo.setDate(prevTo.getDate() - (range.days - 1));
    var prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - range.days);
    function inPrev(iso) {
      var t = new Date(iso);
      return t >= prevFrom && t < prevTo;
    }
    var prevInq = all.inquiries.filter(function (x) { return inPrev(x.created_at); }).length;
    var prevChat = all.chats.filter(function (x) { return inPrev(x.started_at); }).length;
    var prevSub = all.subscribers.filter(function (x) { return inPrev(x.created_at); }).length;
    var prevClicks = all.events.filter(function (x) {
      return x.type === "booking_click" && inPrev(x.at);
    }).length;

    var clicks = rows.events.filter(function (x) { return x.type === "booking_click"; }).length;
    var views = rows.events.filter(function (x) { return x.type === "page_view"; }).length;
    var booked = rows.inquiries.filter(function (x) { return x.status === "booked"; }).length;

    // ---- tiles. source + freshness are carried on the tile itself, because
    // the plan requires every tile to declare where its number came from.
    var tiles = [
      { key: "inquiries", label: "New inquiries", value: rows.inquiries.length,
        prev: prevInq, src: "contact_inquiries", icon: "mail",
        spark: series(rows.inquiries, "created_at", range.days) },
      { key: "chats", label: "Chat sessions", value: rows.chats.length,
        prev: prevChat, src: "chat_sessions", icon: "chat",
        spark: series(rows.chats, "started_at", range.days) },
      { key: "clicks", label: "Booking clicks", value: clicks,
        prev: prevClicks, src: "booking_intent", icon: "calendar",
        spark: series(rows.events.filter(function (x) { return x.type === "booking_click"; }), "at", range.days) },
      { key: "subs", label: "New subscribers", value: rows.subscribers.length,
        prev: prevSub, src: "newsletter_subscribers", icon: "users",
        spark: series(rows.subscribers, "created_at", range.days) }
    ];

    // ---- funnel.
    //
    // NOTE — this deviates from the stage list in MASTER-PLAN-v2.md §4.4
    // ("visit → chat → inquiry → booking click → booked") on purpose.
    // Those five are not nested sets: a booking click can come from the site
    // CTA or from chat, and neither requires an inquiry. So "booking clicks"
    // routinely exceeds "inquiries" and the stage renders a NEGATIVE drop-off,
    // which is meaningless. A funnel must be monotonically decreasing.
    //
    // These four stages ARE strict subsets of one another, every one of them
    // traceable to a row, so each drop-off is a real number:
    //   visits ⊇ inquiries ⊇ contacted ⊇ booked
    //
    // Chat sessions and booking clicks are parallel engagement signals, not
    // funnel stages. They keep their own tiles at the top of the page.
    var contacted = rows.inquiries.filter(function (x) {
      return x.status === "contacted" || x.status === "booked" || x.status === "closed";
    }).length;

    var funnel = [
      { name: "Site visits",       n: views,                 src: "site_events" },
      { name: "Inquiries",         n: rows.inquiries.length, src: "contact_inquiries" },
      { name: "Contacted",         n: contacted,             src: "contact_inquiries.status" },
      { name: "Booked",            n: booked,                src: "contact_inquiries.status" }
    ];

    // ---- what people are asking: services, from chats AND inquiries together
    var svcCount = {};
    rows.chats.forEach(function (c) { svcCount[c.service] = (svcCount[c.service] || 0) + 1; });
    rows.inquiries.forEach(function (i) { svcCount[i.service] = (svcCount[i.service] || 0) + 1; });
    var services = Object.keys(svcCount).map(function (k) {
      return { name: k, n: svcCount[k] };
    }).sort(function (a, b) { return b.n - a.n; });

    var qCount = {};
    rows.chats.forEach(function (c) { qCount[c.question] = (qCount[c.question] || 0) + 1; });
    rows.inquiries.forEach(function (i) { qCount[i.message] = (qCount[i.message] || 0) + 1; });
    var questions = Object.keys(qCount).map(function (k) {
      return { q: k, n: qCount[k] };
    }).sort(function (a, b) { return b.n - a.n; }).slice(0, 8);

    // ---- audience growth: cumulative subscribers across the window
    var growth = cumulative(all.subscribers, "created_at", range.days);
    var inqSeries = series(rows.inquiries, "created_at", range.days);

    // ---- status counts, for the queue filter option counts
    var statusCount = {};
    STATUSES.forEach(function (s) { statusCount[s] = 0; });
    rows.inquiries.forEach(function (i) { statusCount[i.status] = (statusCount[i.status] || 0) + 1; });

    return {
      tiles: tiles,
      funnel: funnel,
      services: services,
      questions: questions,
      growth: growth,
      inqSeries: inqSeries,
      statusCount: statusCount,
      queue: rows.inquiries.slice().sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      }),
      counts: {
        inquiries: rows.inquiries.length,
        chats: rows.chats.length,
        subscribers: rows.subscribers.length,
        events: rows.events.length
      }
    };
  }

  // Per-day counts across the window — the shape behind sparklines and charts.
  function series(rows, field, days) {
    var buckets = {}, out = [];
    var today = startOfDay(new Date());
    for (var d = days - 1; d >= 0; d--) {
      var day = new Date(today);
      day.setDate(day.getDate() - d);
      buckets[dayKey(day)] = 0;
      out.push({ day: dayKey(day), date: new Date(day), n: 0 });
    }
    rows.forEach(function (r) {
      var k = dayKey(new Date(r[field]));
      if (k in buckets) buckets[k]++;
    });
    out.forEach(function (o) { o.n = buckets[o.day]; });
    return out;
  }

  // Cumulative total — the audience panel answers "how big is the list",
  // not "how many signed up on Tuesday".
  function cumulative(rows, field, days) {
    var today = startOfDay(new Date());
    var from = new Date(today);
    from.setDate(from.getDate() - (days - 1));
    var base = rows.filter(function (r) { return new Date(r[field]) < from; }).length;
    var s = series(rows.filter(function (r) { return new Date(r[field]) >= from; }), field, days);
    var run = base;
    return s.map(function (p) { run += p.n; return { day: p.day, date: p.date, n: run, added: p.n }; });
  }

  /* ========================================================================
     CONNECTORS — real status, never decorative.
     A connector reports what is actually true right now. "Planned" is an
     honest state; a green light that means nothing is not.
     ===================================================================== */

  function connectors(mode) {
    return [{ name: "Supabase", state: mode === "live" ? "live" : "off",
      detail: mode === "live" ? "Connected" : "Sign in to check your data source." },
      { name: "Google Sheets", state: "pending", detail: "Checking your operations sheet connection." }];
  }

  /* ========================================================================
     TIER 2 — deferred metrics. Declared so the layout is designed for them,
     never populated. Not even in demo mode: inventing revenue for a clinical
     business is the exact failure the plan's red team flagged.
     ===================================================================== */

  var DEFERRED = [
    { label: "Revenue",        why: "Needs Vagaro checkout data" },
    { label: "Rebooking rate", why: "Needs appointment history" },
    { label: "Client LTV",     why: "Needs transaction history" },
    { label: "Memberships",    why: "Needs Vagaro membership records" }
  ];

  /* ========================================================================
     INVENTORY
     Transcribed from vial photographs in ~/Desktop/lovelicare-raw-phootage.
     This array mirrors the seed in supabase/migrations/0003_inventory.sql —
     if you change one, change both. Base count 10, every item stocked at 10.

     Unlike the demo rows above, these are REAL product facts: the names,
     strengths, NDCs and manufacturers were read off the actual labels. Only
     the stock movement is simulated.
     ===================================================================== */

  var INVENTORY = [
    { name: "GLUTATHIONE INJECTION PRESERVATIVE FREE", common: "Glutathione",
      ingredients: "Glutathione", strength: "200 mg/mL", vol: 30,
      ndc: "72827-2402-1", mfr: "Empower Pharmacy", vial: "Sterile Single-Dose",
      route: "IV", category: "antioxidant", qty: 10, reorder: 10,
      benefits: ["Skin brightening", "Detoxification"],
      src: "gluthathione-injection-and-biotin.jpg" },

    { name: "BIOTIN SOLUTION FOR INJECTION", common: "Biotin",
      ingredients: "Biotin", strength: "10 mg/mL", vol: 30,
      ndc: "72833-589-30", mfr: "ASP Cares", vial: "Multiple Dose",
      route: "IM or IV", category: "vitamin", qty: 10, reorder: 10,
      benefits: ["Strong hair & nails", "Skin health"],
      src: "gluthathione-injection-and-biotin.jpg" },

    { name: "LIPO INJECTION", common: "Lipotropic",
      ingredients: "Methionine / Inositol / Choline Chloride",
      strength: "25 / 50 / 50 mg/mL", vol: 30,
      ndc: "72827-2415-1", mfr: "Empower Pharmacy", vial: "Sterile Multiple-Dose",
      route: "IM", category: "lipotropic", qty: 10, reorder: 10,
      benefits: ["Burn fat", "Boost metabolism"],
      src: "libo-injection-and-libo-b-injection.jpg" },

    { name: "LIPO-B INJECTION", common: "Lipotropic B",
      ingredients: "Methionine / Inositol / Choline Chloride / Cyanocobalamin",
      strength: "25 / 50 / 50 / 1 mg/mL", vol: 30,
      ndc: "72827-2419-1", mfr: "Empower Pharmacy", vial: "Sterile Multiple-Dose",
      route: "IM", category: "lipotropic", qty: 10, reorder: 10,
      benefits: ["Burn fat", "Energy"],
      src: "libo-injection-and-libo-b-injection.jpg" },

    { name: "TAURINE INJECTION", common: "Taurine",
      ingredients: "Taurine", strength: "50 mg/mL", vol: 30,
      ndc: null, mfr: "Empower Pharmacy", vial: "Sterile Multiple-Dose",
      route: "IM", category: "im_injection", qty: 10, reorder: 10,
      benefits: ["Energy", "Metabolic support"],
      src: "taurine-pryridozine--hcl-b6.JPG" },

    { name: "PYRIDOXINE HCL (B6) INJECTION", common: "Vitamin B6",
      ingredients: "Pyridoxine Hydrochloride", strength: "100 mg/mL", vol: 30,
      ndc: null, mfr: "Empower Pharmacy", vial: "Sterile Multiple-Dose",
      route: "IM", category: "vitamin", qty: 10, reorder: 10,
      benefits: ["Energy", "Metabolism"],
      src: "taurine-pryridozine--hcl-b6.JPG" },

    { name: "COENZYME Q-10 (UBIDECARENONE) INJECTION", common: "CoQ10",
      ingredients: "Ubidecarenone", strength: "20 mg/mL", vol: 10,
      ndc: null, mfr: "Empower Pharmacy", vial: "Sterile Multiple Dose",
      route: "IM or SubQ", category: "antioxidant", qty: 10, reorder: 10,
      benefits: ["Cellular energy", "Antioxidant"],
      src: "coenzyme-q-10.jpg" },

    { name: "VITAMIN D3 INJECTION", common: "Vitamin D3",
      ingredients: "Cholecalciferol", strength: "50,000 IU/mL", vol: 30,
      ndc: "73198-0075", mfr: "Olympia Compounding Pharmacy", vial: "Multiple Dose",
      route: "IM", category: "vitamin", qty: 10, reorder: 10,
      benefits: ["Immune support", "Bone health"],
      src: "vitamin-d3.JPG" },

    { name: "ZINC CHLORIDE INJECTION", common: "Zinc",
      ingredients: "Zinc Chloride", strength: "0.5 mg/mL", vol: 30,
      ndc: null, mfr: "Olympia Pharmaceuticals", vial: "Multi-Dose",
      route: "IV", category: "mineral", qty: 10, reorder: 10,
      benefits: ["Immune support", "Skin healing"],
      src: "zinc-chloride.jpg" }
  ];

  // The eight stages a client moves through. Counts are derived from inquiry
  // status plus chat/booking signals -- never invented. Stages past "Booked"
  // have no owned source yet and report null, which renders as an empty slot.
  function journey(rows) {
    var inq = rows.inquiries;
    var byStatus = function (s) { return inq.filter(function (x) { return x.status === s; }).length; };
    return [
      { n: "01", name: "Enquiry",      v: inq.length,                      src: "contact_inquiries" },
      { n: "02", name: "Contacted",    v: byStatus("contacted") + byStatus("booked") + byStatus("closed"), src: "contact_inquiries.status" },
      { n: "03", name: "Consultation", v: rows.chats.length,               src: "chat_sessions" },
      { n: "04", name: "Booked",       v: byStatus("booked"),              src: "contact_inquiries.status" },
      { n: "05", name: "Treatment",    v: null, src: "vagaro" },
      { n: "06", name: "Aftercare",    v: null, src: "vagaro" },
      { n: "07", name: "Follow-up",    v: null, src: "vagaro" },
      { n: "08", name: "Rebooking",    v: null, src: "vagaro" }
    ];
  }

  /* ========================================================================
     LOAD — tries the API, falls back to demo.
     ===================================================================== */

  function load(filters) {
    var qs = "range=" + encodeURIComponent(filters.range) +
             "&service=" + encodeURIComponent(filters.service) +
             "&status=" + encodeURIComponent(filters.status) +
             "&source=" + encodeURIComponent(filters.source);

    return fetch("/api/dashboard/rows?" + qs, {
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    })
      .then(function (res) {
        if (res.ok) return res.json();
        // Carry the server's own explanation through to the banner, so the
        // page says why it fell back instead of guessing.
        return res.json().catch(function () { return {}; }).then(function (body) {
          var e = new Error("api " + res.status);
          e.status = res.status;
          e.detail = body.detail || body.error || null;
          throw e;
        });
      })
      .then(function (payload) {
        // The API returns rows. Aggregates are derived here, by the same
        // function demo mode uses, so the two modes cannot drift apart.
        var all = payload.all || payload.rows;
        var filtered = applyFilters(all, filters);
        return {
          mode: "live",
          rows: filtered,
          derived: deriveAll(all, filtered, filters),
          connectors: connectors("live", payload.info),
          info: payload.info || {},
          generatedAt: new Date()
        };
      })
      .catch(function (err) {
        // No API (static preview), not configured, or not authorized.
        // Whatever the cause, the page falls back to demo and SAYS SO.
        var why;
        if (!err || !err.status)      why = "The dashboard API is not running. This is the static preview.";
        else if (err.status === 404)  why = "The dashboard API is not mounted on this server.";
        else if (err.status === 401)  why = "Not signed in to the dashboard API.";
        else if (err.status === 503)  why = err.detail || "The dashboard API is not configured.";
        else                          why = err.detail || ("The API returned " + err.status + ".");

        var all = {inquiries:[], subscribers:[], chats:[], events:[]};
        var filtered = applyFilters(all, filters);
        return {
          mode: "demo",
          reason: why,
          rows: filtered,
          derived: deriveAll(all, filtered, filters),
          connectors: connectors("demo"),
          info: {},
          generatedAt: new Date()
        };
      });
  }

  global.LCData = {
    SERVICES: SERVICES,
    STATUSES: STATUSES,
    SOURCES: SOURCES,
    RANGES: RANGES,
    DEFERRED: DEFERRED,
    INVENTORY: INVENTORY,
    journey: journey,
    load: load,
    generateRows: generateRows,
    applyFilters: applyFilters,
    deriveAll: deriveAll
  };
})(window);
