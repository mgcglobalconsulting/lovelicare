/* ==========================================================================
   LoveLi Care — Dashboard UI
   Surface: /dashboard.html

   Contains:
     1. Listbox     — the dropdowns, done properly (the stated complaint).
     2. URL state   — every filter is a query param, so views are shareable.
     3. Render      — tiles, funnel, asking, queue, audience, deferred, connectors.
     4. Charts      — hand-rolled SVG. No chart library, no CDN, works offline.

   Charts are drawn with Bare+ tokens read from the cascade, never hex
   literals, so a palette change in tokens.css propagates here automatically.
   ========================================================================== */

(function () {
  "use strict";

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var SVGNS = "http://www.w3.org/2000/svg";

  // Resolve a CSS custom property to its computed value. Lets the charts
  // inherit the brand palette instead of restating it.
  var cssvar = function (name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  };

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function fmt(n) { return n.toLocaleString("en-US"); }

  function pct(a, b) { return b === 0 ? 0 : Math.round((a / b) * 1000) / 10; }

  function ago(d) {
    var s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }

  function icon(name) {
    var P = {
      mail: "M2 4h12v8H2z M2 4l6 5 6-5",
      chat: "M14 9a2 2 0 0 1-2 2H6l-3 3V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2z",
      calendar: "M3 4h10v10H3z M3 7h10 M6 2v3 M10 2v3",
      users: "M11 13v-1a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v1 M6.5 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5",
      grid: "M2 2h5v5H2z M9 2h5v5H9z M2 9h5v5H2z M9 9h5v5H9z",
      funnel: "M2 3h12l-4.5 5v5l-3 1V8z",
      spark: "M2 11l3.5-4 2.5 2.5L13 4",
      list: "M5 4h9 M5 8h9 M5 12h9 M2 4h.01 M2 8h.01 M2 12h.01",
      plug: "M6 2v4 M10 2v4 M4 6h8v3a4 4 0 0 1-8 0z M8 13v2",
      lock: "M4 7h8v6H4z M6 7V5a2 2 0 0 1 4 0v2"
    };
    var s = svg("svg", { viewBox: "0 0 16 16", fill: "none", stroke: "currentColor",
                         "stroke-width": "1.5", "stroke-linecap": "round",
                         "stroke-linejoin": "round", "aria-hidden": "true" });
    s.appendChild(svg("path", { d: P[name] || P.grid }));
    return s;
  }

  /* ========================================================================
     1. LISTBOX
     A real combobox, not a styled div. The plan is explicit: "every control
     is a real <select>/listbox bound to a query parameter ... keyboard-
     navigable, aria-expanded correct. No decorative menus."

     Implements the WAI-ARIA collapsed-listbox pattern:
       - button[role=combobox][aria-expanded][aria-controls][aria-haspopup]
       - ul[role=listbox] > li[role=option][aria-selected]
       - aria-activedescendant tracks the focused option
       - ArrowUp/Down, Home/End, Enter/Space, Escape, Tab, printable typeahead
     ===================================================================== */

  function Listbox(opts) {
    var self = {};
    var open = false;
    var activeIdx = -1;
    var typed = "";
    var typedAt = 0;
    var items = opts.items;          // [{value,label,count}]
    var value = opts.value;
    var uid = "lb-" + opts.name;

    var label = el("span", { class: "lb__label", text: opts.label, id: uid + "-lbl" });

    var valSpan = el("span", { class: "lb__val" });
    var caret = svg("svg", { class: "lb__caret", viewBox: "0 0 12 12", fill: "none",
                             stroke: "currentColor", "stroke-width": "1.6",
                             "stroke-linecap": "round", "stroke-linejoin": "round",
                             "aria-hidden": "true" });
    caret.appendChild(svg("path", { d: "M2.5 4.5 6 8l3.5-3.5" }));

    var btn = el("button", {
      type: "button",
      class: "lb__btn",
      id: uid + "-btn",
      role: "combobox",
      "aria-haspopup": "listbox",
      "aria-expanded": "false",
      "aria-controls": uid + "-pop",
      "aria-labelledby": uid + "-lbl " + uid + "-btn"
    }, [valSpan, caret]);

    var pop = el("ul", {
      class: "lb__pop",
      id: uid + "-pop",
      role: "listbox",
      "aria-labelledby": uid + "-lbl",
      tabindex: "-1",
      hidden: "hidden"
    });

    var root = el("div", { class: "lb" }, [label, btn, pop]);

    function optionEls() { return $$("[role=option]", pop); }

    function render() {
      pop.innerHTML = "";
      items.forEach(function (it, i) {
        var tick = svg("svg", { class: "lb__tick", viewBox: "0 0 16 16", fill: "none",
                                stroke: "currentColor", "stroke-width": "2",
                                "stroke-linecap": "round", "stroke-linejoin": "round",
                                "aria-hidden": "true" });
        tick.appendChild(svg("path", { d: "M3 8.5 6.5 12 13 4.5" }));

        var li = el("li", {
          class: "lb__opt",
          id: uid + "-opt-" + i,
          role: "option",
          "aria-selected": String(it.value === value)
        }, [el("span", { text: it.label })]);

        if (it.count !== undefined && it.count !== null) {
          li.appendChild(el("span", { class: "lb__optcount", text: String(it.count) }));
        }
        li.appendChild(tick);

        li.addEventListener("click", function () { choose(i); });
        li.addEventListener("mousemove", function () { setActive(i); });
        pop.appendChild(li);
      });
      syncButton();
    }

    function syncButton() {
      var cur = items.filter(function (i) { return i.value === value; })[0];
      valSpan.textContent = cur ? cur.label : items[0].label;
      // A filter away from its default gets the caramel underscore.
      btn.setAttribute("data-dirty", String(value !== opts.defaultValue));
    }

    function setActive(i) {
      activeIdx = i;
      optionEls().forEach(function (o, n) { o.classList.toggle("is-active", n === i); });
      if (i >= 0) {
        btn.setAttribute("aria-activedescendant", uid + "-opt-" + i);
        var node = optionEls()[i];
        if (node) node.scrollIntoView({ block: "nearest" });
      } else {
        btn.removeAttribute("aria-activedescendant");
      }
    }

    function openPop() {
      if (open) return;
      closeAll(self);
      open = true;
      pop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      var sel = items.findIndex(function (i) { return i.value === value; });
      setActive(sel < 0 ? 0 : sel);
    }

    function closePop(focus) {
      if (!open) return;
      open = false;
      pop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      btn.removeAttribute("aria-activedescendant");
      optionEls().forEach(function (o) { o.classList.remove("is-active"); });
      if (focus) btn.focus();
    }

    function choose(i) {
      var it = items[i];
      if (!it) return;
      value = it.value;
      render();
      closePop(true);
      opts.onChange(value);
    }

    btn.addEventListener("click", function () { open ? closePop(true) : openPop(); });

    btn.addEventListener("keydown", function (e) {
      var k = e.key;

      if (!open) {
        // Opening keys, per the ARIA pattern.
        if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " " || k === "Spacebar") {
          e.preventDefault();
          openPop();
          return;
        }
        // Typeahead while closed selects directly, like a native <select>.
        if (k.length === 1 && /\S/.test(k)) { e.preventDefault(); typeahead(k, true); }
        return;
      }

      if (k === "ArrowDown")      { e.preventDefault(); setActive(Math.min(activeIdx + 1, items.length - 1)); }
      else if (k === "ArrowUp")   { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
      else if (k === "Home")      { e.preventDefault(); setActive(0); }
      else if (k === "End")       { e.preventDefault(); setActive(items.length - 1); }
      else if (k === "Enter" || k === " " || k === "Spacebar") { e.preventDefault(); choose(activeIdx); }
      else if (k === "Escape")    { e.preventDefault(); closePop(true); }
      else if (k === "Tab")       { closePop(false); }
      else if (k.length === 1 && /\S/.test(k)) { e.preventDefault(); typeahead(k, false); }
    });

    // Printable-character typeahead with a 700ms accumulation window.
    function typeahead(ch, selectDirect) {
      var now = Date.now();
      typed = (now - typedAt > 700) ? ch : typed + ch;
      typedAt = now;
      var idx = items.findIndex(function (i) {
        return i.label.toLowerCase().indexOf(typed.toLowerCase()) === 0;
      });
      if (idx < 0) return;
      if (selectDirect) { choose(idx); } else { setActive(idx); }
    }

    document.addEventListener("mousedown", function (e) {
      if (open && !root.contains(e.target)) closePop(false);
    });

    self.root = root;
    self.close = function () { closePop(false); };
    self.setItems = function (next) { items = next; render(); };
    self.setValue = function (v) { value = v; render(); };
    self.name = opts.name;

    render();
    return self;
  }

  var allBoxes = [];
  function closeAll(except) {
    allBoxes.forEach(function (b) { if (b !== except) b.close(); });
  }

  /* ========================================================================
     2. URL STATE — filters live in the query string, so a filtered view can
     be copied out of the address bar and shared. Back/forward work.
     ===================================================================== */

  var DEFAULTS = { range: "30d", service: "all", status: "all", source: "all" };
  var filters = Object.assign({}, DEFAULTS);

  function readURL() {
    var p = new URLSearchParams(location.search);
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = p.get(k);
      if (v) filters[k] = v;
    });
  }

  function writeURL(push) {
    var p = new URLSearchParams(location.search);
    Object.keys(DEFAULTS).forEach(function (k) {
      if (filters[k] !== DEFAULTS[k]) p.set(k, filters[k]);
      else p.delete(k);
    });
    var qs = p.toString();
    var url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    history[push ? "pushState" : "replaceState"]({ filters: Object.assign({}, filters) }, "", url);
  }

  window.addEventListener("popstate", function () {
    filters = Object.assign({}, DEFAULTS);
    readURL();
    boxes.forEach(function (b) { b.setValue(filters[b.name]); });
    refresh();
  });

  /* ========================================================================
     3. CHARTS
     ===================================================================== */

  function sparkline(points, host) {
    host.innerHTML = "";
    if (!points.length) return;
    var W = 220, H = 34, pad = 2;
    var max = Math.max.apply(null, points.map(function (p) { return p.n; })) || 1;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none",
                         class: "tile__sparkline", "aria-hidden": "true" });
    var step = points.length > 1 ? (W - pad * 2) / (points.length - 1) : 0;
    var coords = points.map(function (p, i) {
      return [pad + i * step, H - pad - (p.n / max) * (H - pad * 2)];
    });

    var dLine = coords.map(function (c, i) {
      return (i ? "L" : "M") + c[0].toFixed(1) + " " + c[1].toFixed(1);
    }).join(" ");

    // Area fill reads as a warm wash, not a second colour.
    var dArea = dLine + " L" + (W - pad) + " " + (H - pad) + " L" + pad + " " + (H - pad) + " Z";
    s.appendChild(svg("path", { d: dArea, fill: cssvar("--c-sand"), opacity: ".75" }));
    s.appendChild(svg("path", { d: dLine, fill: "none", stroke: cssvar("--c-cacao"),
                                "stroke-width": "1.5", "stroke-linejoin": "round",
                                "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" }));
    host.appendChild(s);
  }

  // Audience growth. Caramel is permitted here because it is a stroke —
  // metal, not paint, and it carries no text.
  function growthChart(points, host) {
    host.innerHTML = "";
    if (!points.length) return;
    var W = 760, H = 180, L = 42, R = 10, T = 12, B = 26;
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, class: "chart",
                         role: "img",
                         "aria-label": "Cumulative subscriber growth over the selected range" });

    var vals = points.map(function (p) { return p.n; });
    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);
    if (max === min) max = min + 1;
    // Round the top out to a clean number so the axis reads properly.
    var top = Math.ceil(max / 5) * 5;
    var bot = Math.max(0, Math.floor(min / 5) * 5);

    var x = function (i) { return L + (i / Math.max(1, points.length - 1)) * (W - L - R); };
    var y = function (v) { return T + (1 - (v - bot) / (top - bot)) * (H - T - B); };

    // Gridlines + y labels
    for (var g = 0; g <= 4; g++) {
      var val = bot + ((top - bot) * g / 4);
      var yy = y(val);
      s.appendChild(svg("line", { x1: L, x2: W - R, y1: yy, y2: yy,
                                  class: "chart__grid", opacity: g === 0 ? ".9" : ".45" }));
      var t = svg("text", { x: L - 8, y: yy + 3, "text-anchor": "end", class: "chart__axis" });
      t.textContent = Math.round(val);
      s.appendChild(t);
    }

    var line = points.map(function (p, i) {
      return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.n).toFixed(1);
    }).join(" ");

    var area = line + " L" + x(points.length - 1).toFixed(1) + " " + y(bot) +
               " L" + x(0).toFixed(1) + " " + y(bot) + " Z";

    var grad = svg("linearGradient", { id: "lc-grow", x1: "0", y1: "0", x2: "0", y2: "1" });
    var st1 = svg("stop", { offset: "0%",   "stop-color": cssvar("--c-shell"), "stop-opacity": ".85" });
    var st2 = svg("stop", { offset: "100%", "stop-color": cssvar("--c-bone"),  "stop-opacity": "0" });
    grad.appendChild(st1); grad.appendChild(st2);
    var defs = svg("defs", {}); defs.appendChild(grad); s.appendChild(defs);

    s.appendChild(svg("path", { d: area, fill: "url(#lc-grow)" }));
    s.appendChild(svg("path", { d: line, fill: "none", stroke: cssvar("--c-gold"),
                                "stroke-width": "2", "stroke-linejoin": "round",
                                "stroke-linecap": "round" }));

    // End marker
    var lastI = points.length - 1;
    s.appendChild(svg("circle", { cx: x(lastI), cy: y(points[lastI].n), r: "3.5",
                                  fill: cssvar("--c-mist"), stroke: cssvar("--c-gold"),
                                  "stroke-width": "2" }));

    // X labels — first, middle, last only. Dense ticks are unreadable.
    [0, Math.floor(lastI / 2), lastI].forEach(function (i) {
      if (i < 0 || !points[i]) return;
      var t = svg("text", { x: x(i), y: H - 7,
                            "text-anchor": i === 0 ? "start" : i === lastI ? "end" : "middle",
                            class: "chart__axis" });
      t.textContent = points[i].date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      s.appendChild(t);
    });

    host.appendChild(s);
  }

  /* ========================================================================
     4. RENDER
     ===================================================================== */

  var state = null;
  var boxes = [];

  function tileCard(t, mode) {
    var delta = t.prev === 0
      ? (t.value > 0 ? { cls: "up", txt: "new" } : { cls: "flat", txt: "—" })
      : (function () {
          var d = Math.round(((t.value - t.prev) / t.prev) * 100);
          if (d > 0)  return { cls: "up",   txt: "+" + d + "%" };
          if (d < 0)  return { cls: "down", txt: d + "%" };
          return { cls: "flat", txt: "0%" };
        })();

    var ic = el("span", { class: "tile__icon" }); ic.appendChild(icon(t.icon));

    var val = el("div", { class: "tile__value" }, [
      el("span", { text: fmt(t.value) }),
      el("span", { class: "tile__delta tile__delta--" + delta.cls, text: delta.txt })
    ]);

    var spark = el("div");

    // Badge first, then source, then freshness — so the demo flag sits in the
    // same place on every tile instead of wrapping to a second line on some.
    var meta = el("div", { class: "tile__meta" }, [
      mode === "demo" ? el("span", { class: "badge badge--empty", text: "not connected" }) : null,
      el("span", { class: "tile__src", text: t.src }),
      el("span", { text: ago(state.generatedAt) })
    ]);

    // Two sub-stats under each KPI (the Credit Command pattern). Both are
    // counted from the same filtered rows the headline number came from.
    var card = el("div", { class: "card" }, [
      el("div", { class: "tile__top" }, [el("span", { class: "tile__label", text: t.label }), ic]),
      val, spark,
      substatsFor(t),
      meta
    ]);

    // Deferred so the node is in the DOM and cssvar() resolves against it.
    requestAnimationFrame(function () { sparkline(t.spark, spark); });
    return card;
  }

  // Each pair is counted from the same filtered row set as its headline, so a
  // sub-stat can never disagree with the number above it.
  function substatsFor(t) {
    var d = state.derived, r = state.rows, pair;

    if (t.key === "inquiries") {
      pair = [["Awaiting reply", d.statusCount["new"] || 0],
              ["Booked", d.statusCount["booked"] || 0]];
    } else if (t.key === "chats") {
      var resolved = r.chats.filter(function (c) { return c.resolved; }).length;
      var clicked = r.chats.filter(function (c) { return c.booking_click; }).length;
      pair = [["Resolved", resolved], ["Led to booking", clicked]];
    } else if (t.key === "clicks") {
      var fromChat = r.events.filter(function (e) {
        return e.type === "booking_click" && e.page === "chat"; }).length;
      var fromSite = r.events.filter(function (e) {
        return e.type === "booking_click" && e.page === "site"; }).length;
      pair = [["From chat", fromChat], ["From site", fromSite]];
    } else {
      var active = r.subscribers.filter(function (s) { return s.status === "subscribed"; }).length;
      var store = r.subscribers.filter(function (s) { return s.source === "online_store"; }).length;
      pair = [["Active", active], ["From store", store]];
    }

    return el("div", { class: "substats" }, pair.map(function (p) {
      return el("div", {}, [
        el("span", { class: "substat__k", text: p[0] }),
        el("span", { class: "substat__v", text: fmt(p[1]) })
      ]);
    }));
  }

  function renderTiles() {
    var host = $("#tiles");
    host.innerHTML = "";
    state.derived.tiles.forEach(function (t) { host.appendChild(tileCard(t, state.mode)); });
  }

  /* ---------------------------------------------------------- GREETING */

  function renderGreeting() {
    var now = new Date();
    var h = now.getHours();
    var part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    $("#greeting").textContent = document.body.dataset.workspace === 'inventory' ? 'Your product collection' : document.body.dataset.workspace === 'connectors' ? 'Connected workspace' : part + ", Libra";
    $("#todaydate").textContent = now.toLocaleDateString("en-US", {
      weekday: "long", day: "numeric", month: "long"
    });
  }

  // The espresso punctuation block. Everything in it is a counted row.
  function renderHero() {
    var d = state.derived;
    var open = d.statusCount["new"] || 0;
    var contacted = d.statusCount["contacted"] || 0;
    var booked = d.statusCount["booked"] || 0;
    var top = d.services.slice(0, 5);

    var host = $("#hero");
    host.innerHTML = "";
    host.appendChild(el("span", { class: "hero__eyebrow", text: "Inquiry desk" }));
    host.appendChild(el("h2", { class: "hero__title", html:
      fmt(open) + " <em>awaiting</em> a reply" }));
    host.appendChild(el("p", { class: "hero__sub", text:
      contacted + " contacted · " + booked + " booked · " +
      fmt(d.counts.chats) + " chat sessions in range" }));

    var tags = el("div", { class: "hero__tags" });
    if (!top.length) {
      tags.appendChild(el("span", { class: "hero__tag", text: "No service interest recorded in range" }));
    }
    top.forEach(function (s) {
      tags.appendChild(el("span", { class: "hero__tag", text:
        s.name.replace(/ \(.*\)$/, "") + " · " + s.n }));
    });
    host.appendChild(tags);
  }

  /* ----------------------------------------------------- CLIENT JOURNEY */

  function renderJourney() {
    var stages = LCData.journey(state.rows);
    var host = $("#journey");
    host.innerHTML = "";

    var vals = stages.map(function (s) { return s.v; }).filter(function (v) { return v !== null; });
    var max = Math.max.apply(null, vals.concat([1]));
    var filled = stages.filter(function (s) { return s.v !== null; }).length;
    $("#journey-note").textContent =
      "Where everyone is right now · " + filled + " of " + stages.length +
      " stages have an owned source";

    stages.forEach(function (s, i) {
      var has = s.v !== null;
      var cls = "jstage" + (has ? " jstage--has" : " jstage--empty") +
                (has && i === 3 ? " jstage--last" : "");
      var bar = el("div", { class: "jstage__bar" }, [
        el("span", { class: "jstage__v", text: has ? fmt(s.v) : "—" })
      ]);
      var node = el("div", { class: cls }, [
        el("span", { class: "jstage__n", text: s.n }),
        el("span", { class: "jstage__name", text: s.name }),
        bar
      ]);
      node.title = has ? s.name + ": " + s.v + " (source: " + s.src + ")"
                       : s.name + ": no owned source yet (" + s.src + ")";
      host.appendChild(node);

      requestAnimationFrame(function () {
        bar.style.height = has
          ? Math.max(34, 34 + (s.v / max) * 104) + "px"
          : "34px";
      });
    });
  }

  /* ------------------------------------------------------------ UP NEXT */

  function renderUpNext() {
    var host = $("#upnext");
    host.innerHTML = "";
    var rows = state.derived.queue.filter(function (r) {
      return r.status === "new" || r.status === "contacted";
    }).slice(0, 6);

    if (!rows.length) {
      host.appendChild(el("p", { class: "panel__note",
        text: "Nothing awaiting a reply in this range." }));
      return;
    }

    rows.forEach(function (r) {
      var d = new Date(r.created_at);
      // First name + last initial only, matching the Slack/PHI rule.
      var parts = (r.name || "").split(" ");
      var shortName = parts[0] + (parts[1] ? " " + parts[1][0] + "." : "");
      var initials = (parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "");

      host.appendChild(el("div", { class: "unext__row" }, [
        el("div", { class: "unext__time", html:
          d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) +
          "<span>" + d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + "</span>" }),
        el("span", { class: "unext__av", text: initials.toUpperCase() }),
        el("div", { class: "unext__body" }, [
          el("div", { class: "unext__who", text: shortName }),
          el("div", { class: "unext__what", text: r.service })
        ]),
        el("span", { class: "pill pill--" + r.status, text: r.status })
      ]));
    });
  }

  /* ---------------------------------------------------------- INVENTORY */

  function renderInventory() {
    window.LCInventory.refresh(true);
  }

  /* -------------------------------------------------------------- TABS */

  // Horizontal nav with real dropdown menus. Each item either scrolls to a
  // panel or opens a menu of panels. Menus are proper ARIA menus, not divs.
  var TABS = [
    { label: "Home", target: "#p-today" },
    { label: "Clients", items: [
      { label: "Inquiry queue", target: "#p-queue" },
      { label: "Up next", target: "#p-upnext" },
      { label: "Audience", target: "#p-audience" }
    ]},
    { label: "Journey", items: [
      { label: "Client journey", target: "#p-journey" },
      { label: "Funnel", target: "#p-funnel" }
    ]},
    { label: "Inventory", target: "#p-inventory" },
    { label: "Insights", items: [
      { label: "What people ask", target: "#p-asking" },
      { label: "Audience growth", target: "#p-audience" }
    ]},
    { label: "Revenue", target: "#p-deferred" },
    { label: "Connectors", target: "#p-connectors" }
  ];

  function buildTabs() {
    var host = $("#tabs");
    host.innerHTML = "";

    TABS.forEach(function (t, ti) {
      if (!t.items) {
        var b = el("button", { class: "tab", type: "button",
          "data-target": t.target, text: t.label });
        if (ti === 0) b.setAttribute("aria-current", "true");
        b.addEventListener("click", function () { goTo(t.target); });
        host.appendChild(b);
        return;
      }

      var uid = "tabmenu-" + ti;
      var caret = svg("svg", { class: "tab__caret", viewBox: "0 0 12 12", fill: "none",
        stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round",
        "stroke-linejoin": "round", "aria-hidden": "true" });
      caret.appendChild(svg("path", { d: "M2.5 4.5 6 8l3.5-3.5" }));

      var btn = el("button", { class: "tab", type: "button",
        id: uid + "-btn", "aria-haspopup": "true", "aria-expanded": "false",
        "aria-controls": uid }, [el("span", { text: t.label }), caret]);

      var menu = el("div", { class: "lb__pop", id: uid, role: "menu",
        "aria-labelledby": uid + "-btn", hidden: "hidden" });

      t.items.forEach(function (it) {
        var mi = el("button", { class: "lb__opt", type: "button", role: "menuitem",
          text: it.label, "data-target": it.target });
        mi.addEventListener("click", function () { close(); goTo(it.target); });
        menu.appendChild(mi);
      });

      var wrap = el("div", { style: "position:relative" }, [btn, menu]);

      function open() {
        closeAllMenus();
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        var first = menu.querySelector("[role=menuitem]");
        if (first) first.focus();
      }
      function close(focus) {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        if (focus) btn.focus();
      }
      menuClosers.push(function () { close(false); });

      btn.addEventListener("click", function () {
        menu.hidden ? open() : close(true);
      });
      btn.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault(); open();
        }
      });
      menu.addEventListener("keydown", function (e) {
        var items = $$("[role=menuitem]", menu);
        var i = items.indexOf(document.activeElement);
        if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
        else if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(i - 1, 0)].focus(); }
        else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
        else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
        else if (e.key === "Escape") { e.preventDefault(); close(true); }
        else if (e.key === "Tab") { close(false); }
      });
      document.addEventListener("mousedown", function (e) {
        if (!menu.hidden && !wrap.contains(e.target)) close(false);
      });

      host.appendChild(wrap);
    });
  }

  var menuClosers = [];
  function closeAllMenus() { menuClosers.forEach(function (f) { f(); }); }

  function goTo(sel) {
    var t = $(sel);
    if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    $$(".tab").forEach(function (b) {
      b.setAttribute("aria-current", String(b.getAttribute("data-target") === sel));
    });
  }

  function renderFunnel() {
    var host = $("#funnel");
    host.innerHTML = "";
    var f = state.derived.funnel;
    var top = f[0].n || 1;

    f.forEach(function (stage, i) {
      var prev = i > 0 ? f[i - 1].n : null;
      var dropN = prev === null ? null : prev - stage.n;
      var dropPct = prev ? pct(dropN, prev) : null;

      // With no rows at all, a share-of-total is meaningless. Show an em-dash
      // rather than a confident "0%", which reads like a measured result.
      var hasData = f[0].n > 0;
      var meta = el("div", { class: "funnel__meta" }, [
        el("span", { class: "funnel__name", text: stage.name }),
        el("span", { class: "funnel__pct", text: hasData ? pct(stage.n, top) + "%" : "—" }),
        el("span", { class: "funnel__n", text: fmt(stage.n) })
      ]);

      var fill = el("div", { class: "funnel__fill" });
      var track = el("div", { class: "funnel__track" }, [fill]);

      var row = el("div", { class: "funnel__row" }, [meta, track]);

      // Nothing upstream means there is no drop-off to describe. Printing
      // "0 (null%)" — which is what `prev ? pct(..) : null` produced — looks
      // like a broken calculation. Say nothing instead.
      if (dropN !== null && prev === 0) {
        // no upstream rows; omit the line entirely
      }
      // A funnel stage can never exceed the one above it. If live data ever
      // produces that, it means the stages are not nested sets — which is a
      // data-model bug, not a number to display. Say so rather than printing
      // a negative drop-off.
      else if (dropN !== null && dropN < 0) {
        row.appendChild(el("div", { class: "funnel__drop", html:
          "<strong>stage exceeds " + f[i - 1].name.toLowerCase() +
          "</strong> — not a nested set, drop-off not meaningful" }));
      } else if (dropN !== null) {
        row.appendChild(el("div", { class: "funnel__drop", html:
          "drop-off from " + f[i - 1].name.toLowerCase() + ": <strong>" +
          fmt(dropN) + " (" + dropPct + "%)</strong>" }));
      }
      host.appendChild(row);

      requestAnimationFrame(function () {
        fill.style.width = (top ? (stage.n / top) * 100 : 0) + "%";
      });
    });
  }

  function renderAsking() {
    var sHost = $("#svcbars");
    sHost.innerHTML = "";
    var svcs = state.derived.services.slice(0, 6);
    var max = svcs.length ? svcs[0].n : 1;

    if (!svcs.length) {
      sHost.appendChild(el("p", { class: "panel__note",
        text: "No chat or inquiry rows in this range." }));
    }

    svcs.forEach(function (s) {
      var fill = el("div", { class: "bar__fill" });
      var row = el("div", { class: "bar" }, [
        el("div", { class: "bar__meta" }, [
          el("span", { class: "bar__name", text: s.name }),
          el("span", { class: "bar__n", text: fmt(s.n) })
        ]),
        el("div", { class: "bar__track" }, [fill])
      ]);
      sHost.appendChild(row);
      requestAnimationFrame(function () { fill.style.width = (s.n / max) * 100 + "%"; });
    });

    var qHost = $("#questions");
    qHost.innerHTML = "";
    if (!state.derived.questions.length) {
      qHost.appendChild(el("p", { class: "panel__note", text: "No questions captured yet." }));
    }
    state.derived.questions.forEach(function (q) {
      qHost.appendChild(el("div", { class: "qlist__item" }, [
        el("span", { class: "qlist__n", text: "×" + q.n }),
        el("span", { text: q.q })
      ]));
    });
  }

  function renderQueue() {
    var tb = $("#queue tbody");
    tb.innerHTML = "";
    var rows = state.derived.queue.slice(0, 25);

    if (!rows.length) {
      tb.appendChild(el("tr", {}, [
        el("td", { colspan: "6", class: "panel__note",
                   text: "No inquiries match these filters." })
      ]));
      return;
    }

    rows.forEach(function (r) {
      var sel = el("select", { class: "sr", "aria-label": "Status for " + r.name });
      // Status write-back. In live mode this PATCHes contact_inquiries.status;
      // in demo it mutates the local row so the interaction is still real.
      LCData.STATUSES.forEach(function (s) {
        sel.appendChild(el("option", { value: s, text: s, selected: s === r.status ? "selected" : null }));
      });

      var pill = el("button", {
        class: "pill pill--" + r.status,
        type: "button",
        "aria-label": "Advance status for " + r.name + ", currently " + r.status,
        text: r.status
      });

      pill.addEventListener("click", function () {
        var order = ["new", "contacted", "booked", "closed"];
        var i = order.indexOf(r.status);
        var next = order[(i + 1) % order.length];
        setStatus(r, next, pill);
      });

      tb.appendChild(el("tr", {}, [
        el("td", {}, [el("div", { class: "t__who" }, [
          el("span", { class: "t__name", text: r.name }),
          el("span", { class: "t__mail", text: r.email })
        ])]),
        el("td", {}, [el("span", { text: r.service })]),
        el("td", {}, [el("span", { class: "t__msg", text: r.message })]),
        el("td", {}, [el("span", { class: "tile__src", text: r.source })]),
        el("td", {}, [pill]),
        el("td", {}, [el("span", { class: "t__when", text: ago(r.created_at) })])
      ]));
    });
  }

  function setStatus(row, next, pill) {
    var prev = row.status;
    row.status = next;
    pill.className = "pill pill--" + next;
    pill.textContent = next;
    pill.setAttribute("aria-label", "Advance status for " + row.name + ", currently " + next);

    if (state.mode === "live") {
      fetch("/api/dashboard/inquiries/" + encodeURIComponent(row.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      }).then(function (res) {
        if (!res.ok) throw new Error("patch " + res.status);
        toast("Status → " + next + " · saved");
      }).catch(function () {
        row.status = prev;
        pill.className = "pill pill--" + prev;
        pill.textContent = prev;
        toast("Could not save — reverted");
      });
    } else {
      toast("Status → " + next + " · demo only, not persisted");
    }
    // Recompute the status filter counts from the mutated rows.
    refreshCounts();
  }

  function renderAudience() {
    growthChart(state.derived.growth, $("#growth"));
    var last = state.derived.growth[state.derived.growth.length - 1];
    var first = state.derived.growth[0];
    var added = last && first ? last.n - first.n + first.added : 0;
    $("#growth-total").textContent = last ? fmt(last.n) : "0";
    $("#growth-added").textContent = "+" + fmt(added) + " in range";
  }

  function renderDeferred() {
    var host = $("#deferred");
    host.innerHTML = "";
    LCData.DEFERRED.forEach(function (d) {
      host.appendChild(el("div", { class: "card empty" }, [
        el("span", { class: "empty__label", text: d.label }),
        el("span", { class: "empty__dash", text: "—" }),
        el("span", { class: "badge badge--empty", text: "no data yet" }),
        el("span", { class: "empty__why", text: d.why })
      ]));
    });
  }

  function renderConnectors() {
    if (window.LCWorkspace) { window.LCWorkspace.connectors(true); return; }
    var host = $("#connectors");
    host.innerHTML = "";
    state.connectors.forEach(function (c) {
      host.appendChild(el("div", { class: "card" }, [
        el("div", { class: "conn" }, [
          el("span", { class: "conn__dot conn__dot--" + c.state,
                       role: "img", "aria-label": "status: " + c.state }),
          el("div", { class: "conn__body" }, [
            el("div", { class: "conn__name", text: c.name }),
            el("div", { class: "conn__state", text: c.detail })
          ])
        ])
      ]));
    });
  }

  function renderModebar() {
    var bar = $("#modebar");
    bar.className = "modebar modebar--" + state.mode;
    $("#mode-tag").textContent = state.mode === "demo" ? "Not connected" : "Live";
    if (state.mode === "demo") {
      $("#mode-text").innerHTML =
        "<strong>Sign in to your owner workspace.</strong> " +
        (state.reason || "") +
        " Live operations remain empty until the connection is available.";
      // The API is token-gated. Without a way in from the browser the page
      // would sit in demo forever, so offer the unlock when the server is
      // actually there and simply refused us.
      renderUnlock(state.reason || "");
    } else {
      var missing = (state.info && state.info.missingTables) || [];
      $("#mode-text").innerHTML =
        "<strong>Connected to your practice.</strong> Inventory refreshes every 30 seconds. " +
        (missing.length
          ? " Chat and website activity are not being captured yet."
          : "");

      var old = $("#unlock");
      if (old) old.remove();
      var out = el("button", { class: "btn btn--ghost", type: "button", text: "Sign out" });
      out.addEventListener("click", function () {
        fetch("/api/dashboard/logout", { method: "POST", credentials: "same-origin" })
          .then(function () { toast("Signed out"); return refresh(); });
      });
      $("#modebar").appendChild(el("div", { class: "modebar__actions", id: "unlock" }, [out]));
    }
  }

  /* ========================================================================
     UNLOCK — exchange the dashboard token for an httpOnly cookie.
     The token is POSTed to /api/dashboard/session and never stored in JS,
     localStorage or the URL; the server sets an httpOnly SameSite=Strict
     cookie scoped to /api/dashboard. Reloading keeps you signed in for 12h.
     ===================================================================== */

  function renderUnlock(reason) {
    var bar = $("#modebar");
    var old = $("#unlock");
    if (old) old.remove();

    // Only offer it when a server actually answered. On the static preview
    // there is no API to sign in to, so the control would be a dead end.
    var signedOut = /not signed in/i.test(reason);
    var notConfigured = /not configured/i.test(reason);
    if (!signedOut && !notConfigured) return;

    var wrap = el("div", { class: "modebar__actions", id: "unlock" });

    if (notConfigured) {
      wrap.appendChild(el("span", { class: "badge badge--empty",
        text: "set DASHBOARD_TOKEN" }));
      bar.appendChild(wrap);
      return;
    }

    var input = el("input", {
      type: "password",
      id: "unlock-token",
      class: "lb__btn",
      placeholder: "DASHBOARD_TOKEN",
      autocomplete: "current-password",
      "aria-label": "Dashboard token"
    });
    input.style.minWidth = "210px";

    var go = el("button", { class: "btn btn--primary", type: "button", text: "Use live data" });

    function submit() {
      var token = input.value.trim();
      if (!token) { input.focus(); return; }
      go.disabled = true;
      go.textContent = "Checking…";
      fetch("/api/dashboard/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token: token })
      }).then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        input.value = "";
        toast("Signed in · switching to live data");
        return refresh();
      }).catch(function (e) {
        go.disabled = false;
        go.textContent = "Use live data";
        toast(e.message === "401" ? "That token was not accepted"
                                  : "Sign-in failed (" + e.message + ")");
      });
    }

    go.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });

    wrap.appendChild(input);
    wrap.appendChild(go);
    bar.appendChild(wrap);
  }

  function renderSideCounts() {
    var c = state.derived.counts;
    $("#c-today").textContent = fmt(c.inquiries);
    $("#c-queue").textContent = fmt(state.derived.statusCount["new"] || 0);
    $("#c-asking").textContent = fmt(c.chats);
    $("#c-audience").textContent = fmt(c.subscribers);
  }

  function refreshCounts() {
    var sc = {};
    LCData.STATUSES.forEach(function (s) { sc[s] = 0; });
    state.derived.queue.forEach(function (r) { sc[r.status] = (sc[r.status] || 0) + 1; });
    state.derived.statusCount = sc;
    var sb = boxes.filter(function (b) { return b.name === "status"; })[0];
    if (sb) sb.setItems(statusItems());
    $("#c-queue").textContent = fmt(sc["new"] || 0);
  }

  /* ---------------------------------------------------------------- TOAST */
  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, 2600);
  }

  /* ========================================================================
     FILTER OPTION SETS — counts come from the live row set, so the dropdown
     tells you how many rows each option would return before you pick it.
     ===================================================================== */

  function statusItems() {
    var sc = state ? state.derived.statusCount : {};
    var total = Object.keys(sc).reduce(function (a, k) { return a + sc[k]; }, 0);
    return [{ value: "all", label: "All statuses", count: total }].concat(
      LCData.STATUSES.map(function (s) {
        return { value: s, label: s.charAt(0).toUpperCase() + s.slice(1), count: sc[s] || 0 };
      })
    );
  }

  function serviceItems() {
    var counts = {};
    if (state) state.derived.services.forEach(function (s) { counts[s.name] = s.n; });
    return [{ value: "all", label: "All services" }].concat(
      LCData.SERVICES.map(function (s) {
        return { value: s, label: s, count: counts[s] || 0 };
      })
    );
  }

  function sourceItems() {
    return [{ value: "all", label: "All sources" }].concat(
      LCData.SOURCES.map(function (s) {
        return { value: s, label: s.replace(/_/g, " ") };
      })
    );
  }

  function rangeItems() {
    return LCData.RANGES.map(function (r) { return { value: r.key, label: r.label }; });
  }

  /* ========================================================================
     BOOT
     ===================================================================== */

  function refresh() {
    return LCData.load(filters).then(function (next) {
      state = next;
      renderModebar();
      renderGreeting();
      renderHero();
      renderTiles();
      renderJourney();
      renderFunnel();
      renderAsking();
      renderQueue();
      renderInventory();
      renderUpNext();
      renderAudience();
      renderDeferred();
      renderConnectors();
      renderSideCounts();
      // Option counts depend on the freshly derived data.
      boxes.forEach(function (b) {
        if (b.name === "status")  b.setItems(statusItems());
        if (b.name === "service") b.setItems(serviceItems());
        b.setValue(filters[b.name]);
      });
      $("#freshness").textContent = "updated " + ago(state.generatedAt);
    });
  }

  function onFilterChange(name, value) {
    filters[name] = value;
    writeURL(true);
    refresh();
  }

  function init() {
    readURL();
    buildTabs();

    var host = $("#filters");
    var defs = [
      { name: "range",   label: "Date range", items: rangeItems(),   def: DEFAULTS.range },
      { name: "service", label: "Service",    items: serviceItems(), def: DEFAULTS.service },
      { name: "status",  label: "Status",     items: statusItems(),  def: DEFAULTS.status },
      { name: "source",  label: "Source",     items: sourceItems(),  def: DEFAULTS.source }
    ];

    defs.forEach(function (d) {
      var b = Listbox({
        name: d.name,
        label: d.label,
        items: d.items,
        value: filters[d.name],
        defaultValue: d.def,
        onChange: function (v) { onFilterChange(d.name, v); }
      });
      boxes.push(b);
      allBoxes.push(b);
      host.appendChild(b.root);
    });

    var reset = el("button", { class: "filters__reset", type: "button", text: "Reset filters" });
    reset.addEventListener("click", function () {
      filters = Object.assign({}, DEFAULTS);
      boxes.forEach(function (b) { b.setValue(filters[b.name]); });
      writeURL(true);
      refresh();
      toast("Filters reset");
    });
    host.appendChild(reset);

    // Escape closes any open listbox from anywhere on the page.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll(null);
    });

    $("#refresh").addEventListener("click", function () {
      refresh().then(function () { toast("Refreshed"); });
    });

    // Sidebar nav — scroll to panel, and reflect the active section.
    $$(".side__link").forEach(function (a) {
      a.addEventListener("click", function () {
        var t = $(a.getAttribute("data-target"));
        if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    var panels = $$(".panel");
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$(".side__link").forEach(function (a) {
          a.setAttribute("aria-current",
            String(a.getAttribute("data-target") === "#" + en.target.id));
        });
      });
    }, { rootMargin: "-140px 0px -65% 0px" });
    panels.forEach(function (p) { spy.observe(p); });

    writeURL(false);
    refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
