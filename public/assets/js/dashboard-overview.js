/* ===========================================================================
   LoveLi Care — practice overview
   Layout after the Horizon Homes dashboard: a wide working column and a
   persistent right rail. Charts are hand-rolled SVG — no library, no CDN,
   works offline, and inherits Bare+ tokens from the cascade.

   THE HONESTY RULE, IN CODE
   A measure with no owned source renders an empty state, never a zero and
   never an estimate. `null` from /metrics means "no source yet" and is
   deliberately distinct from `0`, which means "counted, and it is none".
   =========================================================================== */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var $ = function (s) { return document.querySelector(s); };

  // Warm value ramp. Segments separate by LIGHTNESS, not hue — the brand's
  // stated thesis. Caramel is the ring and the rules, never a filled segment.
  var RAMP = ['--c-espresso', '--c-cacao', '--c-clay', '--c-greige', '--c-sand'];

  var CATEGORIES = {
    iv_therapy: 'IV therapy', im_injection: 'IM injections',
    lipotropic: 'Lipotropic', vitamin: 'Vitamins', mineral: 'Minerals',
    antioxidant: 'Antioxidants', other: 'Other products'
  };

  function cssvar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  var money = function (n) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: 0
    }).format(n);
  };
  var num = function (n) { return Number(n).toLocaleString('en-US'); };

  var state = null, inFlight = null, lastFetch = 0, failure = '';

  /* ── KPI tiles ───────────────────────────────────────────────────────────
     Horizon puts a green "+11.01%" delta on every tile. We have one day of
     ledger history, so there is no prior period to compare against and the
     delta slot stays empty until there is. */
  function kpis(m) {
    var tiles = [
      { label: 'Products', value: m ? num(m.products) : null,
        sub: m ? m.categories.length + ' categories' : 'No catalog yet', icon: 'box' },
      { label: 'Stock alerts', value: m ? num(m.lowStock) : null,
        sub: m && m.lowStock === m.products && m.products > 0
             ? 'every product — check reorder levels'
             : 'at or below reorder level', icon: 'alert' },
      { label: 'Stock value', value: m && m.stockValue != null ? money(m.stockValue) : null,
        sub: m ? m.costedCount + ' of ' + m.products + ' products costed' : 'Not costed',
        empty: m && m.stockValue == null ? 'Add cost prices' : null, icon: 'coin' },
      { label: 'Orders this week', value: m && m.orders ? num(m.orders.thisWeek) : null,
        sub: m && m.orders ? num(m.orders.total) + ' orders all time' : 'Order desk not ready',
        empty: m && !m.orders ? 'Awaiting update 0006' : null, icon: 'bag' }
    ];

    $('#ov-kpis').replaceChildren.apply($('#ov-kpis'), tiles.map(function (t) {
      var value = t.value == null
        ? el('strong', { class: 'ov-kpi__value ov-kpi__value--empty', text: t.empty || '—' })
        : el('strong', { class: 'ov-kpi__value', text: t.value });
      return el('article', { class: 'ov-kpi' }, [
        el('span', { class: 'ov-kpi__label', text: t.label }),
        value,
        el('span', { class: 'ov-kpi__sub', text: t.sub })
      ]);
    }));
  }

  /* ── Donut: the collection by category ───────────────────────────────────
     This is the lower-right chart. It is the one region that can show real,
     complete, traceable data today, so it carries the most weight. */
  function donut(m) {
    var host = $('#ov-mix-body');
    host.replaceChildren();

    if (!m || !m.categories.length) {
      host.appendChild(el('p', { class: 'ov-empty',
        text: failure || 'No products in the collection yet.' }));
      return;
    }

    var total = m.categories.reduce(function (s, c) { return s + c.count; }, 0);
    var R = 54, C = 2 * Math.PI * R, GAP = 1.6;

    var ring = svg('svg', {
      viewBox: '0 0 140 140', class: 'ov-donut',
      role: 'img',
      'aria-label': 'Collection by category: ' + m.categories.map(function (c) {
        return (CATEGORIES[c.key] || c.key) + ' ' + c.count;
      }).join(', ')
    });

    // Track, so a single-category collection still reads as a ring.
    ring.appendChild(svg('circle', {
      cx: 70, cy: 70, r: R, fill: 'none',
      stroke: cssvar('--c-bone'), 'stroke-width': 17
    }));

    var offset = 0;
    m.categories.forEach(function (c, i) {
      var share = c.count / total;
      var len = Math.max(share * C - GAP, 0.5);
      var arc = svg('circle', {
        cx: 70, cy: 70, r: R, fill: 'none',
        stroke: cssvar(RAMP[i % RAMP.length]),
        'stroke-width': 17, 'stroke-linecap': 'butt',
        'stroke-dasharray': len + ' ' + (C - len),
        'stroke-dashoffset': -offset,
        transform: 'rotate(-90 70 70)',
        class: 'ov-donut__arc', style: '--arc-index:' + i
      });
      arc.appendChild(svg('title', {}));
      arc.lastChild.textContent =
        (CATEGORIES[c.key] || c.key) + ' — ' + c.count +
        ' of ' + total + ' (' + (share * 100).toFixed(1) + '%)';
      ring.appendChild(arc);
      offset += share * C;
    });

    // Caramel hairline on the inner edge — metal, not paint.
    ring.appendChild(svg('circle', {
      cx: 70, cy: 70, r: R - 9.5, fill: 'none',
      stroke: cssvar('--c-gold'), 'stroke-width': 0.8, opacity: '0.55'
    }));

    var centre = svg('text', { x: 70, y: 70, class: 'ov-donut__total',
      'text-anchor': 'middle' });
    centre.appendChild(svg('tspan', { x: 70, dy: '-2', class: 'ov-donut__total-n' }));
    centre.lastChild.textContent = String(total);
    centre.appendChild(svg('tspan', { x: 70, dy: '15', class: 'ov-donut__total-l' }));
    centre.lastChild.textContent = 'products';
    ring.appendChild(centre);

    var legend = el('ul', { class: 'ov-legend' }, m.categories.map(function (c, i) {
      return el('li', { class: 'ov-legend__row' }, [
        el('span', { class: 'ov-legend__key',
          style: 'background:' + cssvar(RAMP[i % RAMP.length]) }),
        el('span', { class: 'ov-legend__label', text: CATEGORIES[c.key] || c.key }),
        el('span', { class: 'ov-legend__value',
          text: (c.count / total * 100).toFixed(1) + '%' })
      ]);
    }));

    // SEDELA's stat sub-card, paired with the donut.
    var top = m.categories[0];
    var stats = el('div', { class: 'ov-mix__stats' }, [
      el('p', { class: 'workspace-eyebrow', text: 'COLLECTION' }),
      statRow('Largest group', (CATEGORIES[top.key] || top.key) + ' · ' + top.count),
      statRow('Units on hand', num(m.units)),
      statRow('Priced', m.pricedCount + ' of ' + m.products),
      statRow('Last counted', m.lastCountedAt
        ? new Date(m.lastCountedAt).toLocaleDateString('en-US',
            { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Never')
    ]);

    host.appendChild(el('div', { class: 'ov-mix' }, [
      stats,
      el('div', { class: 'ov-mix__chart' }, [ring, legend])
    ]));
  }

  function statRow(label, value) {
    return el('div', { class: 'ov-stat' }, [
      el('span', { text: label }), el('strong', { text: value })
    ]);
  }

  /* ── Stock movement bars ─────────────────────────────────────────────── */
  function movement(m) {
    var host = $('#ov-movement-body');
    host.replaceChildren();

    if (!m || !m.months.length) {
      host.appendChild(el('p', { class: 'ov-empty', text: 'No stock movements recorded yet.' }));
      return;
    }

    var peak = Math.max.apply(null, m.months.map(function (b) {
      return Math.max(b.in, b.out);
    })) || 1;
    var thisMonth = new Date().toISOString().slice(0, 7);

    var chart = el('div', { class: 'ov-bars' }, m.months.map(function (b) {
      var label = new Date(b.month + '-01T00:00:00')
        .toLocaleDateString('en-US', { month: 'short' });
      return el('div', { class: 'ov-bars__col' + (b.month === thisMonth ? ' is-current' : '') }, [
        el('div', { class: 'ov-bars__stack' }, [
          el('span', { class: 'ov-bars__in', style: 'height:' + (b.in / peak * 100) + '%',
            title: '+' + num(b.in) + ' received' }),
          el('span', { class: 'ov-bars__out', style: 'height:' + (b.out / peak * 100) + '%',
            title: '-' + num(b.out) + ' used' })
        ]),
        el('span', { class: 'ov-bars__label', text: label })
      ]);
    }));

    host.appendChild(chart);
    host.appendChild(el('div', { class: 'ov-legend ov-legend--inline' }, [
      el('span', { class: 'ov-legend__row' }, [
        el('span', { class: 'ov-legend__key', style: 'background:' + cssvar('--c-gold') }),
        el('span', { class: 'ov-legend__label', text: 'Received' })
      ]),
      el('span', { class: 'ov-legend__row' }, [
        el('span', { class: 'ov-legend__key', style: 'background:' + cssvar('--c-cacao') }),
        el('span', { class: 'ov-legend__label', text: 'Used or sold' })
      ])
    ]));

    if (m.months.length === 1) {
      host.appendChild(el('p', { class: 'ov-note',
        text: 'One month of history so far. This chart fills in as stock moves.' }));
    }
  }

  /* ── Right rail ──────────────────────────────────────────────────────── */
  function practice(m) {
    $('#ov-practice-body').replaceChildren(
      statRow('Provider', 'Libra T. Robertson, NP-CRNP'),
      statRow('Credential', 'Board Certified'),
      statRow('Location', 'Towson, MD'),
      statRow('Products tracked', m ? num(m.products) + ' · ' + num(m.units) + ' units' : '—'),
      statRow('Ledger entries', m ? num(m.movements) : '—')
    );
  }

  function collection(m, items) {
    var host = $('#ov-collection-body');
    host.replaceChildren();

    if (!items || !items.length) {
      host.appendChild(el('p', { class: 'ov-empty',
        text: 'Your products appear here once the collection loads.' }));
      return;
    }

    items.slice(0, 8).forEach(function (p) {
      var name = p.common_name || p.name;
      var src = p.image_url || (p.source_image ? '/assets/img/inventory/' + p.source_image : null);
      var thumb = el('span', { class: 'ov-item__thumb' });
      if (src) {
        var img = el('img', { src: src, alt: '', loading: 'lazy' });
        img.addEventListener('error', function () {
          img.remove();
          thumb.appendChild(el('span', { class: 'ov-item__mono',
            text: name.slice(0, 2).toUpperCase() }));
        }, { once: true });
        thumb.appendChild(img);
      } else {
        thumb.appendChild(el('span', { class: 'ov-item__mono',
          text: name.slice(0, 2).toUpperCase() }));
      }

      var low = Number(p.quantity) <= Number(p.reorder_at);
      host.appendChild(el('article', { class: 'ov-item' }, [
        thumb,
        el('div', { class: 'ov-item__body' }, [
          el('span', { class: 'ov-item__name', text: name }),
          el('span', { class: 'stock-badge' + (low ? ' stock-badge--low' : ''),
            text: Number(p.quantity) === 0 ? 'Out of stock'
                : low ? 'Low · ' + p.quantity + ' ' + p.unit
                : p.quantity + ' ' + p.unit })
        ]),
        el('div', { class: 'ov-item__price' }, [
          el('strong', { text: p.retail_price == null ? 'Price not set'
                              : money(p.retail_price) }),
          el('small', { text: p.manufacturer || 'Brand not recorded' })
        ])
      ]));
    });
  }

  /* ── Load ────────────────────────────────────────────────────────────── */
  function render(items) {
    kpis(state); donut(state); movement(state);
    practice(state); collection(state, items);
    var stamp = $('#ov-stamp');
    if (stamp) {
      stamp.textContent = state
        ? 'Supabase · updated ' + new Date(lastFetch).toLocaleTimeString('en-US',
            { hour: 'numeric', minute: '2-digit' })
        : (failure || 'Overview unavailable');
    }
  }

  function load(force) {
    if (inFlight) return inFlight;
    if (!force && Date.now() - lastFetch < 15000) return Promise.resolve();

    inFlight = Promise.all([
      fetch('/api/dashboard/metrics', { credentials: 'same-origin',
        signal: AbortSignal.timeout(15000) }),
      fetch('/api/dashboard/inventory', { credentials: 'same-origin',
        signal: AbortSignal.timeout(15000) })
    ]).then(function (responses) {
      if (!responses[0].ok) {
        throw new Error(responses[0].status === 401
          ? 'Sign in above to see your practice overview.'
          : 'The overview is temporarily unavailable.');
      }
      return Promise.all(responses.map(function (r) {
        return r.ok ? r.json() : {};
      }));
    }).then(function (data) {
      state = data[0]; failure = ''; lastFetch = Date.now();
      render(data[1].items || []);
    }).catch(function (e) {
      state = null; failure = e.message; lastFetch = 0;
      render([]);
    }).finally(function () { inFlight = null; });

    return inFlight;
  }

  window.LCOverview = { load: load };

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('#ov-kpis')) return;
    load(true);
    var refresh = $('#refresh');
    if (refresh) refresh.addEventListener('click', function () { load(true); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) load(true);
    });
    setInterval(function () {
      if (!document.hidden && !document.querySelector('dialog[open]')) load(true);
    }, 60000);
  });
})();
