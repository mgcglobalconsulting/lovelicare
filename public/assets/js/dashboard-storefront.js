/* ===========================================================================
   LoveLi Care — the collection & order desk

   A product page the owner works in: browse the collection, build an itemized
   order, record it. Recording an order writes through order_create, which
   decrements stock through the ledger — so the number here and the number on
   the overview are the same number, derived the same way.

   WHAT THIS IS NOT: a public storefront. Pools 1 and 2 are prescription
   compounded injectables (rx_only). They are badged Rx and never presented as
   a self-serve purchase. Clinical booking routes to Vagaro, per decision D4.
   =========================================================================== */
(function () {
  'use strict';

  var $ = function (s) { return document.querySelector(s); };

  var CATEGORIES = {
    iv_therapy: 'IV therapy', im_injection: 'IM injections',
    lipotropic: 'Lipotropic', vitamin: 'Vitamins', mineral: 'Minerals',
    antioxidant: 'Antioxidants', other: 'Other products'
  };

  var CHANNELS = [
    ['in_person', 'In person'], ['phone', 'Phone'],
    ['online', 'Online'], ['comp', 'Complimentary']
  ];

  var money = function (n) {
    return n == null ? 'Price not set'
      : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  };
  var exact = function (n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  };

  var items = [], cart = [], loaded = false, failure = '', busy = false;

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

  function button(text, onClick, cls) {
    var b = el('button', { type: 'button', class: cls || 'btn btn--ghost', text: text });
    b.addEventListener('click', onClick);
    return b;
  }

  function photo(p) {
    if (p.image_url && /^\/assets\/img\/[a-zA-Z0-9._/-]+$/.test(p.image_url)) return p.image_url;
    return p.source_image ? '/assets/img/inventory/' + p.source_image : null;
  }

  async function api(path, options) {
    var response = await fetch('/api/dashboard' + path, Object.assign({
      credentials: 'same-origin', signal: AbortSignal.timeout(20000)
    }, options || {}, {
      headers: Object.assign({ 'Content-Type': 'application/json' },
        (options || {}).headers || {})
    }));
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      throw new Error(response.status === 401
        ? 'Sign in above to use the order desk.'
        : data.error || 'That did not go through. Try again.');
    }
    return data;
  }

  /* ── Catalog ─────────────────────────────────────────────────────────── */
  function visible() {
    var q = $('#sf-search').value.trim().toLowerCase();
    var cat = $('#sf-category').value;
    var avail = $('#sf-availability').value;

    return items.filter(function (p) {
      if (p.archived) return false;
      if (q && ![p.name, p.common_name, p.sku, p.manufacturer, p.strength]
        .join(' ').toLowerCase().includes(q)) return false;
      if (cat !== 'all' && p.category !== cat) return false;
      if (avail === 'sellable' && (p.retail_price == null || Number(p.quantity) <= 0)) return false;
      if (avail === 'unpriced' && p.retail_price != null) return false;
      return true;
    }).sort(function (a, b) {
      switch ($('#sf-sort').value) {
        case 'price-low':
          return (a.retail_price == null ? Infinity : +a.retail_price) -
                 (b.retail_price == null ? Infinity : +b.retail_price);
        case 'price-high':
          return (b.retail_price == null ? -Infinity : +b.retail_price) -
                 (a.retail_price == null ? -Infinity : +a.retail_price);
        case 'stock': return a.quantity - b.quantity;
        default: return (a.common_name || a.name).localeCompare(b.common_name || b.name);
      }
    });
  }

  function card(p, i) {
    var name = p.common_name || p.name;
    var inCart = cart.find(function (l) { return l.item_id === p.id; });
    var left = Number(p.quantity) - (inCart ? inCart.quantity : 0);

    var media = el('figure', { class: 'sf-card__media' });
    var src = photo(p);
    if (src) {
      var img = el('img', { src: src, alt: name + ' product label',
        loading: i < 6 ? 'eager' : 'lazy' });
      img.addEventListener('error', function () {
        img.remove();
        media.appendChild(el('span', { class: 'sf-card__mono', text: name.slice(0, 2).toUpperCase() }));
      }, { once: true });
      media.appendChild(img);
    } else {
      media.appendChild(el('span', { class: 'sf-card__mono', text: name.slice(0, 2).toUpperCase() }));
    }
    media.appendChild(el('span', { class: 'sf-card__cat', text: CATEGORIES[p.category] || p.category }));
    if (p.rx_only) media.appendChild(el('span', { class: 'sf-card__rx', text: 'Rx' }));

    var unpriced = p.retail_price == null;
    var out = Number(p.quantity) <= 0;
    var exhausted = left <= 0 && !out;

    var action;
    if (unpriced) {
      action = el('p', { class: 'sf-card__blocked',
        text: 'Set a retail price before this can be sold.' });
    } else if (out) {
      action = el('p', { class: 'sf-card__blocked', text: 'Out of stock.' });
    } else if (exhausted) {
      action = el('p', { class: 'sf-card__blocked', text: 'All remaining stock is on this order.' });
    } else {
      action = button('Add to order', function () { add(p); }, 'btn btn--primary sf-card__add');
    }

    var price = el('div', { class: 'sf-card__price' }, [
      el('strong', { text: money(p.retail_price) })
    ]);
    if (p.compare_at_price != null && +p.compare_at_price > +p.retail_price) {
      price.appendChild(el('del', { text: money(p.compare_at_price) }));
    }

    return el('article', { class: 'sf-card', style: '--i:' + i }, [
      media,
      el('div', { class: 'sf-card__body' }, [
        el('h3', { class: 'sf-card__name', text: name }),
        el('p', { class: 'sf-card__spec',
          text: [p.strength, p.manufacturer].filter(Boolean).join(' · ') || 'Details not recorded' }),
        price,
        el('p', { class: 'sf-card__stock',
          text: out ? 'None on hand' : left + ' of ' + p.quantity + ' ' + p.unit + ' available' }),
        action
      ])
    ]);
  }

  function renderCatalog() {
    var host = $('#sf-grid');
    var rows = loaded ? visible() : [];
    host.replaceChildren();

    $('#sf-count').textContent = loaded
      ? rows.length + ' of ' + items.filter(function (p) { return !p.archived; }).length + ' products'
      : (failure || 'Loading the collection…');

    if (!loaded) {
      host.appendChild(el('p', { class: 'sf-empty', text: failure || 'Loading…' }));
      return;
    }
    if (!rows.length) {
      host.appendChild(el('div', { class: 'sf-empty' }, [
        el('h3', { text: 'Nothing matches this view.' }),
        el('p', { text: 'Clear the filters to see the whole collection.' })
      ]));
      return;
    }
    rows.forEach(function (p, i) { host.appendChild(card(p, i)); });
  }

  /* ── Order form ──────────────────────────────────────────────────────── */
  function add(p) {
    var line = cart.find(function (l) { return l.item_id === p.id; });
    if (line) line.quantity += 1;
    else cart.push({ item_id: p.id, quantity: 1 });
    render();
  }

  function setQty(itemId, quantity) {
    var line = cart.find(function (l) { return l.item_id === itemId; });
    if (!line) return;
    var product = items.find(function (p) { return p.id === itemId; });
    var capped = Math.max(0, Math.min(quantity, Number(product.quantity)));
    if (capped <= 0) cart = cart.filter(function (l) { return l.item_id !== itemId; });
    else line.quantity = capped;
    render();
  }

  function totals() {
    var subtotal = cart.reduce(function (sum, line) {
      var p = items.find(function (x) { return x.id === line.item_id; });
      return sum + (p && p.retail_price != null ? +p.retail_price * line.quantity : 0);
    }, 0);
    var discount = Math.min(Number($('#sf-discount').value) || 0, subtotal);
    var tax = Number($('#sf-tax').value) || 0;
    return { subtotal: subtotal, discount: discount, tax: tax,
             total: Math.round((subtotal - discount + tax) * 100) / 100 };
  }

  function renderOrder() {
    var host = $('#sf-lines');
    host.replaceChildren();

    if (!cart.length) {
      host.appendChild(el('p', { class: 'sf-order__empty',
        text: 'No products on this order yet. Add one from the collection.' }));
    } else {
      cart.forEach(function (line) {
        var p = items.find(function (x) { return x.id === line.item_id; });
        if (!p) return;
        var name = p.common_name || p.name;

        var stepper = el('div', { class: 'sf-step' }, [
          button('−', function () { setQty(p.id, line.quantity - 1); }, 'sf-step__btn'),
          el('span', { class: 'sf-step__n', text: String(line.quantity) }),
          button('+', function () { setQty(p.id, line.quantity + 1); }, 'sf-step__btn')
        ]);
        stepper.firstChild.setAttribute('aria-label', 'One fewer ' + name);
        stepper.lastChild.setAttribute('aria-label', 'One more ' + name);
        if (line.quantity >= Number(p.quantity)) stepper.lastChild.disabled = true;

        host.appendChild(el('div', { class: 'sf-line' }, [
          el('div', { class: 'sf-line__main' }, [
            el('span', { class: 'sf-line__name', text: name }),
            el('span', { class: 'sf-line__unit',
              text: exact(p.retail_price) + ' / ' + p.unit })
          ]),
          stepper,
          el('strong', { class: 'sf-line__total',
            text: exact(+p.retail_price * line.quantity) })
        ]));
      });
    }

    var t = totals();
    $('#sf-subtotal').textContent = exact(t.subtotal);
    $('#sf-total').textContent = exact(t.total);
    $('#sf-record').disabled = busy || !cart.length;
    $('#sf-clear').disabled = busy || !cart.length;
  }

  function render() { renderCatalog(); renderOrder(); }

  async function record() {
    if (!cart.length || busy) return;
    busy = true;
    $('#sf-error').textContent = '';
    $('#sf-record').disabled = true;

    try {
      var data = await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer_label: $('#sf-customer').value,
          channel: $('#sf-channel').value,
          discount: $('#sf-discount').value,
          tax: $('#sf-tax').value,
          note: $('#sf-note').value,
          items: cart
        })
      });

      cart = [];
      $('#sf-customer').value = '';
      $('#sf-note').value = '';
      $('#sf-discount').value = '0';
      $('#sf-tax').value = '0';
      $('#sf-receipt').textContent =
        'Recorded ' + data.order.order_number + ' · ' + exact(data.order.total) +
        '. Stock has been adjusted through the ledger.';
      $('#sf-receipt').hidden = false;

      busy = false;
      await load(true);
      if (window.LCOverview) window.LCOverview.load(true);
      if (window.LCInventory) window.LCInventory.refresh(true);
      loadOrders();
    } catch (e) {
      $('#sf-error').textContent = e.message;
      busy = false;
      render();
    }
  }

  /* ── Recent orders ───────────────────────────────────────────────────── */
  async function loadOrders() {
    var host = $('#sf-orders');
    if (!host) return;
    try {
      var data = await api('/orders');
      host.replaceChildren();
      if (!data.orders.length) {
        host.appendChild(el('p', { class: 'sf-order__empty',
          text: 'No orders recorded yet. Your first one will appear here.' }));
        return;
      }
      data.orders.slice(0, 10).forEach(function (o) {
        var row = el('div', { class: 'sf-receipt-row' }, [
          el('div', {}, [
            el('strong', { text: o.order_number }),
            el('small', { text: (o.customer_label || 'No label') + ' · ' +
              (o.order_items || []).length + ' line' +
              ((o.order_items || []).length === 1 ? '' : 's') + ' · ' +
              new Date(o.created_at).toLocaleDateString('en-US',
                { month: 'short', day: 'numeric' }) })
          ]),
          el('span', { class: 'stock-badge' +
            (o.status === 'cancelled' ? '' : ' stock-badge--low'), text: o.status }),
          el('strong', { text: exact(o.total) })
        ]);
        host.appendChild(row);
      });
    } catch (e) {
      host.replaceChildren(el('p', { class: 'sf-order__empty', text: e.message }));
    }
  }

  /* ── Load ────────────────────────────────────────────────────────────── */
  var inFlight = null, lastFetch = 0;
  function load(force) {
    if (inFlight) return inFlight;
    if (!force && Date.now() - lastFetch < 15000) return Promise.resolve();

    inFlight = api('/inventory').then(function (data) {
      items = data.items || [];
      loaded = true; failure = ''; lastFetch = Date.now();
      // Drop any line whose product vanished or went out of stock behind us.
      cart = cart.filter(function (l) {
        var p = items.find(function (x) { return x.id === l.item_id; });
        return p && Number(p.quantity) > 0;
      });
      fillCategories();
      render();
    }).catch(function (e) {
      items = []; loaded = false; failure = e.message; lastFetch = 0;
      render();
    }).finally(function () { inFlight = null; });

    return inFlight;
  }

  function fillCategories() {
    var select = $('#sf-category');
    var previous = select.value;
    while (select.options.length > 1) select.remove(1);
    var present = [...new Set(items.map(function (p) { return p.category; }))].sort();
    present.forEach(function (key) {
      select.add(new Option(CATEGORIES[key] || key, key));
    });
    select.value = [...select.options].some(function (o) { return o.value === previous; })
      ? previous : 'all';
  }

  function init() {
    if (!$('#sf-grid')) return;

    CHANNELS.forEach(function (c) { $('#sf-channel').add(new Option(c[1], c[0])); });

    ['sf-search', 'sf-category', 'sf-availability', 'sf-sort'].forEach(function (id) {
      $('#' + id).addEventListener(id === 'sf-search' ? 'input' : 'change', renderCatalog);
    });
    ['sf-discount', 'sf-tax'].forEach(function (id) {
      $('#' + id).addEventListener('input', renderOrder);
    });

    $('#sf-reset').addEventListener('click', function () {
      $('#sf-search').value = '';
      $('#sf-category').value = 'all';
      $('#sf-availability').value = 'all';
      $('#sf-sort').value = 'name';
      renderCatalog();
    });

    $('#sf-clear').addEventListener('click', function () {
      cart = []; $('#sf-error').textContent = ''; $('#sf-receipt').hidden = true; render();
    });
    $('#sf-record').addEventListener('click', record);

    load(true);
    loadOrders();
  }

  window.LCStorefront = { load: load, loadOrders: loadOrders };
  document.addEventListener('DOMContentLoaded', init);
})();
