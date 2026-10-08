// Every dropdown and menu on the dashboard, exercised in a real browser.
//
// Four distinct components, each with its own failure mode:
//   1. Listbox   — custom ARIA combobox (filters). Mouse AND keyboard.
//   2. Tab menus — ARIA menu with aria-expanded (Clients / Journey / Insights).
//   3. <select>  — native, on the inventory and storefront panels.
//   4. <details> — the "···" overflow on each product card.
// Plus the sidebar nav and the grid/list view switch.
//
// Read-only: nothing here writes to the database.
require('dotenv').config();
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'),
      path = require('path'), assert = require('node:assert/strict'), WS = require('ws');

const port = 9510, base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-menus-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
   '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));
const pass = [];

(async () => {
  let target;
  for (let i = 0; i < 40; i++) {
    try {
      target = (await (await fetch('http://localhost:' + port + '/json/list')).json())
        .find(t => t.type === 'page');
      if (target) break;
    } catch {}
    await wait(250);
  }

  const ws = new WS(target.webSocketDebuggerUrl);
  await new Promise(r => ws.once('open', r));
  let id = 0; const pending = new Map(), errors = [];
  ws.on('message', m => {
    const p = JSON.parse(m);
    if (p.id) { pending.get(p.id)?.(p); pending.delete(p.id); }
    if (p.method === 'Runtime.exceptionThrown') errors.push(p.params.exceptionDetails.text);
  });
  const send = (method, params = {}) => new Promise(resolve => {
    pending.set(++id, resolve); ws.send(JSON.stringify({ id, method, params }));
  });
  const ev = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text);
    return r.result.result.value;
  };
  // Real keystrokes, not synthetic events — a synthetic KeyboardEvent would
  // not prove the component works for someone actually using a keyboard.
  const key = async k => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k,
      windowsVirtualKeyCode: { ArrowDown: 40, ArrowUp: 38, Enter: 13, Escape: 27, Home: 36, End: 35 }[k] || 0 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k });
    await wait(90);
  };

  // A real pointer press. The listbox closes on `mousedown`, and
  // element.click() dispatches only `click` — so a synthetic click would
  // wrongly report the outside-close behaviour as broken.
  const clickAt = async (x, y) => {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent',
        { type, x, y, button: 'left', clickCount: 1 });
    }
    await wait(140);
  };

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCookie', { name: 'lc_dash', value: process.env.DASHBOARD_TOKEN,
    url: base, path: '/api/dashboard', httpOnly: true, sameSite: 'Strict' });
  await send('Emulation.setDeviceMetricsOverride',
    { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + '/dashboard.html' });
  for (let i = 0; i < 60; i++) {
    if (await ev("!!document.querySelector('.lb__btn')")) break;
    await wait(250);
  }

  // ── 1. Listbox: mouse ────────────────────────────────────────────────────
  assert.equal(await ev("document.querySelectorAll('.lb__btn').length"), 4, 'four filter listboxes');
  assert.equal(await ev("document.querySelector('#lb-range-btn').getAttribute('aria-expanded')"), 'false');
  await ev("document.querySelector('#lb-range-btn').click()"); await wait(140);
  assert.equal(await ev("document.querySelector('#lb-range-btn').getAttribute('aria-expanded')"), 'true', 'opens');
  assert.equal(await ev("!document.querySelector('#lb-range-pop').hidden"), true);
  assert.ok(await ev("document.querySelectorAll('#lb-range-pop [role=option]').length >= 3"), 'has options');

  // Option text carries a trailing count badge with no separator
  // ("Weight Management0"), so strip trailing digits before comparing.
  const strip = t => t.replace(/\d+$/, '').trim();
  const firstLabel = strip(await ev("document.querySelectorAll('#lb-range-pop [role=option]')[0].textContent.trim()"));
  await ev("document.querySelectorAll('#lb-range-pop [role=option]')[0].click()"); await wait(220);
  assert.equal(await ev("document.querySelector('#lb-range-btn').getAttribute('aria-expanded')"), 'false', 'closes on pick');
  assert.ok((await ev("document.querySelector('#lb-range-btn').textContent")).includes(firstLabel),
    'button reflects the chosen option');
  pass.push('Listbox — mouse open/select/close, 4 filters');

  // ── 2. Listbox: keyboard ────────────────────────────────────────────────
  await ev("document.querySelector('#lb-service-btn').focus()");
  await key('ArrowDown');
  assert.equal(await ev("document.querySelector('#lb-service-btn').getAttribute('aria-expanded')"), 'true',
    'ArrowDown opens the listbox');
  await key('ArrowDown'); await key('ArrowDown');
  assert.ok(await ev("!!document.querySelector('#lb-service-pop .is-active')"), 'arrow keys move the active option');
  const active = strip(await ev("document.querySelector('#lb-service-pop .is-active').textContent.trim()"));
  await key('Enter'); await wait(240);
  assert.equal(await ev("document.querySelector('#lb-service-btn').getAttribute('aria-expanded')"), 'false',
    'Enter selects and closes');
  assert.ok((await ev("document.querySelector('#lb-service-btn').textContent")).includes(active),
    'Enter applied the active option');
  // Query strings encode spaces as "+", which decodeURIComponent leaves alone —
  // let URLSearchParams do it.
  assert.equal(await ev("new URLSearchParams(location.search).get('service')"), active,
    'Enter wrote the selection to the URL');

  await ev("document.querySelector('#lb-status-btn').focus()");
  await key('ArrowDown');
  assert.equal(await ev("document.querySelector('#lb-status-btn').getAttribute('aria-expanded')"), 'true');
  await key('Escape'); await wait(140);
  assert.equal(await ev("document.querySelector('#lb-status-btn').getAttribute('aria-expanded')"), 'false',
    'Escape closes without selecting');
  pass.push('Listbox — ArrowDown opens, arrows move, Enter selects, Escape cancels');

  // Outside click closes, and only one can be open at a time.
  await ev("document.querySelector('#lb-source-btn').click()"); await wait(120);
  await ev("document.querySelector('#lb-range-btn').click()"); await wait(140);
  assert.equal(await ev("document.querySelector('#lb-source-btn').getAttribute('aria-expanded')"), 'false',
    'opening one listbox closes the other');
  await clickAt(820, 640);   // empty content area, well clear of the filter row
  assert.equal(await ev("document.querySelectorAll('.lb__btn[aria-expanded=true]').length"), 0,
    'clicking outside closes every listbox');
  pass.push('Listbox — mutual exclusion + outside-click close');

  // Filters actually drive state (the URL is the source of truth here).
  await ev("document.querySelector('.filters__reset').click()"); await wait(260);
  assert.ok(await ev("location.search === '' || !location.search.includes('range=')"),
    'reset clears the filter query string');
  pass.push('Filters — reset works');

  // ── 3. Tab menus ────────────────────────────────────────────────────────
  const menuCount = await ev("document.querySelectorAll('.tab[aria-haspopup=true]').length");
  assert.equal(menuCount, 3, 'Clients / Journey / Insights are dropdown tabs');
  for (const n of [1, 2, 4]) {                   // tabmenu indexes with items
    const btn = "#tabmenu-" + n + "-btn", menu = "#tabmenu-" + n;
    assert.equal(await ev(`document.querySelector('${btn}').getAttribute('aria-expanded')`), 'false');
    await ev(`document.querySelector('${btn}').click()`); await wait(140);
    assert.equal(await ev(`document.querySelector('${btn}').getAttribute('aria-expanded')`), 'true',
      'tab menu ' + n + ' opens');
    assert.ok(await ev(`document.querySelectorAll('${menu} [role=menuitem]').length >= 2`),
      'tab menu ' + n + ' has items');
    const goesTo = await ev(`document.querySelector('${menu} [role=menuitem]').dataset.target`);
    await ev(`document.querySelector('${menu} [role=menuitem]').click()`); await wait(300);
    assert.equal(await ev(`!document.querySelector('${goesTo}').hidden`), true,
      'tab menu ' + n + ' routes to ' + goesTo);
    assert.equal(await ev(`document.querySelector('${btn}').getAttribute('aria-expanded')`), 'false',
      'tab menu ' + n + ' closes after choosing');
  }
  // Escape closes an open tab menu.
  await ev("document.querySelector('#tabmenu-1-btn').click()"); await wait(120);
  await key('Escape');
  assert.equal(await ev("document.querySelector('#tabmenu-1-btn').getAttribute('aria-expanded')"), 'false',
    'Escape closes a tab menu');
  pass.push('Tab menus — 3 menus open, route, close, Escape');

  // ── 4. Sidebar nav ──────────────────────────────────────────────────────
  const links = await ev("[...document.querySelectorAll('.side__link')].map(b=>b.dataset.target)");
  for (const t of links) {
    await ev(`document.querySelector('.side__link[data-target="${t}"]').click()`); await wait(260);
    assert.equal(await ev(`!!document.querySelector('${t}') && !document.querySelector('${t}').hidden`),
      true, 'sidebar routes to ' + t);
  }
  pass.push('Sidebar — all ' + links.length + ' links route to a visible panel');

  // ── 5. Inventory <select>s ──────────────────────────────────────────────
  await ev("document.querySelector('.side__link[data-target=\"#p-inventory\"]').click()");
  for (let i = 0; i < 40; i++) {
    if (await ev("document.querySelectorAll('.product-card').length===9")) break;
    await wait(250);
  }
  const setSel = (sel, v) =>
    ev(`(()=>{const e=document.querySelector('${sel}');e.value='${v}';e.dispatchEvent(new Event('change'));return e.value;})()`);

  assert.equal(await setSel('#inventory-category', 'vitamin'), 'vitamin');
  assert.equal(await ev("document.querySelectorAll('.product-card').length"), 3, 'category select filters');
  await ev("document.querySelector('#inventory-reset').click()"); await wait(160);

  assert.equal(await setSel('#inventory-stock', 'low'), 'low');
  const lowCount = await ev("document.querySelectorAll('.product-card').length");
  assert.equal(lowCount, 0, 'after the dose conversion nothing is below reorder level');
  await ev("document.querySelector('#inventory-reset').click()"); await wait(160);

  await setSel('#inventory-sort', 'price');
  const prices = await ev(`[...document.querySelectorAll('.product-price strong')].map(n=>parseFloat(n.textContent.replace(/[^0-9.]/g,''))||Infinity)`);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b), 'sort by price is ordered');
  await ev("document.querySelector('#inventory-reset').click()"); await wait(160);

  const brands = await ev("document.querySelectorAll('#inventory-brand option').length");
  assert.ok(brands > 1, 'brand select is populated from the data');
  pass.push('Inventory selects — category, stock, sort, brand (' + brands + ' options)');

  // View switch
  await ev("document.querySelector('#inventory-list').click()"); await wait(160);
  assert.equal(await ev("document.querySelector('#inventory').classList.contains('product-grid--list')"), true);
  assert.equal(await ev("document.querySelector('#inventory-list').getAttribute('aria-pressed')"), 'true');
  await ev("document.querySelector('#inventory-grid').click()"); await wait(160);
  assert.equal(await ev("document.querySelector('#inventory').classList.contains('product-grid--list')"), false);
  pass.push('View switch — grid/list toggle with aria-pressed');

  // ── 6. Product card "···" <details> menus ───────────────────────────────
  assert.ok(await ev("document.querySelectorAll('.product-menu').length >= 9"), 'every card has an overflow menu');
  await ev("document.querySelector('.product-menu summary').click()"); await wait(160);
  assert.equal(await ev("document.querySelectorAll('.product-menu[open]').length"), 1, 'overflow menu opens');
  assert.equal(await ev("document.querySelectorAll('.product-menu[open] .product-menu__body button').length"), 2,
    'two actions inside');
  await key('Escape');
  assert.equal(await ev("document.querySelectorAll('.product-menu[open]').length"), 0, 'Escape closes it');

  await ev("document.querySelector('.product-menu summary').click()"); await wait(140);
  const titleBox = await ev("(()=>{const r=document.querySelector('.panel__title').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()");
  await clickAt(titleBox.x, titleBox.y);
  assert.equal(await ev("document.querySelectorAll('.product-menu[open]').length"), 0, 'outside click closes it');
  pass.push('Product overflow menus — open, 2 actions, Escape + outside-click close');

  // The menu's action actually opens the dialog.
  await ev("document.querySelector('.product-menu summary').click()"); await wait(140);
  await ev("document.querySelector('.product-menu[open] .product-menu__body button').click()"); await wait(500);
  assert.equal(await ev("!!document.querySelector('dialog[open]')"), true, 'overflow action opens a dialog');
  assert.ok(await ev("document.querySelectorAll('dialog[open] select').length >= 4"),
    'the edit dialog has its own working selects');
  await ev("document.querySelector('dialog[open]').close()"); await wait(200);
  pass.push('Overflow action — opens the edit dialog with populated selects');

  // ── 7. Storefront <select>s ─────────────────────────────────────────────
  await ev("document.querySelector('.side__link[data-target=\"#p-storefront\"]').click()");
  for (let i = 0; i < 40; i++) {
    if (await ev("document.querySelectorAll('.sf-card').length===9")) break;
    await wait(250);
  }
  assert.equal(await setSel('#sf-category', 'lipotropic'), 'lipotropic');
  assert.equal(await ev("document.querySelectorAll('.sf-card').length"), 2, 'storefront category filters');
  await ev("document.querySelector('#sf-reset').click()"); await wait(160);

  assert.equal(await setSel('#sf-availability', 'sellable'), 'sellable');
  assert.equal(await ev("document.querySelectorAll('.sf-card').length"), 9,
    'all nine are sellable now that they are priced');
  await ev("document.querySelector('#sf-reset').click()"); await wait(160);

  await setSel('#sf-sort', 'price-high');
  const sfPrices = await ev(`[...document.querySelectorAll('.sf-card__price strong')].map(n=>parseFloat(n.textContent.replace(/[^0-9.]/g,''))||0)`);
  assert.deepEqual(sfPrices, [...sfPrices].sort((a, b) => b - a), 'price high-to-low is ordered');
  await ev("document.querySelector('#sf-reset').click()"); await wait(160);

  const channels = await ev("document.querySelectorAll('#sf-channel option').length");
  assert.equal(channels, 4, 'channel select has all four options');
  assert.equal(await setSel('#sf-channel', 'phone'), 'phone');
  pass.push('Storefront selects — category, availability, sort, channel (4 options)');

  assert.equal(errors.length, 0, 'console errors: ' + errors.join('; '));

  const out = path.join(__dirname, 'screenshots');
  fs.mkdirSync(out, { recursive: true });
  await wait(1100);
  fs.writeFileSync(path.join(out, 'menus-storefront.png'),
    Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));

  console.log('PASS — every menu and dropdown:');
  pass.forEach(p => console.log('  ✓ ' + p));
  console.log('Screenshot: docs/testing/screenshots/menus-storefront.png');
  ws.close();
})().catch(e => {
  console.error('FAILED after ' + pass.length + ' checks');
  pass.forEach(p => console.error('  ✓ ' + p));
  console.error(e);
  process.exitCode = 1;
}).finally(() => chrome.kill());
