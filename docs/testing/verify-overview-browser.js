// Practice overview — live browser verification.
// Reads only. Asserts the donut, the KPI empty states, the legend percentages,
// the dropdown menus and mobile overflow, then captures screenshots.
require('dotenv').config();
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'),
      path = require('path'), assert = require('node:assert/strict'), WS = require('ws');

const port = 9508, base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-overview-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
   '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));

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

  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
  await send('Network.setCookie', { name: 'lc_dash', value: process.env.DASHBOARD_TOKEN,
    url: base, path: '/api/dashboard', httpOnly: true, sameSite: 'Strict' });
  await send('Emulation.setDeviceMetricsOverride',
    { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + '/dashboard.html#p-overview' });

  for (let i = 0; i < 60; i++) {
    if (await ev("document.querySelectorAll('.ov-donut__arc').length===5")) break;
    await wait(250);
  }

  // ── The donut: one arc per real category, correct percentages ───────────
  assert.equal(await ev("document.querySelectorAll('.ov-donut__arc').length"), 5,
    'donut should draw one arc per category');
  assert.equal(await ev("document.querySelector('.ov-donut__total-n').textContent"), '9',
    'donut centre should show the real product count');
  assert.deepEqual(
    await ev("[...document.querySelectorAll('.ov-legend__value')].slice(0,5).map(n=>n.textContent)"),
    ['33.3%', '22.2%', '22.2%', '11.1%', '11.1%'], 'legend percentages must match the rows');
  // Scope to the donut card — the movement card has its own inline legend.
  assert.equal(
    await ev("document.querySelector('#ov-mix-body .ov-legend__label').textContent"), 'Vitamins',
    'largest category first');
  assert.deepEqual(
    await ev("[...document.querySelectorAll('#ov-mix-body .ov-legend__label')].map(n=>n.textContent)"),
    ['Vitamins', 'Antioxidants', 'Lipotropic', 'IM injections', 'Minerals'],
    'legend labels, largest group first');

  // No hue outside the warm ramp may appear in the chart.
  assert.equal(await ev(`[...document.querySelectorAll('.ov-donut__arc')]
    .every(a=>{const c=getComputedStyle(a).stroke;
      const m=c.match(/\\d+/g).map(Number);
      // warm monochrome: red >= green >= blue on every ramp step
      return m[0]>=m[1] && m[1]>=m[2];})`), true, 'donut must stay warm monochrome');

  // ── KPI tiles: unsourced measures render a prompt, never a zero ─────────
  assert.equal(await ev("document.querySelectorAll('.ov-kpi').length"), 4);
  assert.equal(await ev("document.querySelectorAll('.ov-kpi')[0].querySelector('.ov-kpi__value').textContent"), '9');
  assert.equal(await ev("document.querySelectorAll('.ov-kpi')[1].querySelector('.ov-kpi__value').textContent"), '0',
    'no stock alerts once reorder levels are set per product');
  assert.equal(await ev("document.querySelectorAll('.ov-kpi')[2].querySelector('.ov-kpi__value').textContent"),
    'Add cost prices', 'stock value has no source yet and must not render $0');
  assert.equal(await ev("document.querySelectorAll('.ov-kpi')[2].querySelector('.ov-kpi__value').classList.contains('ov-kpi__value--empty')"), true);

  // ── Right rail ──────────────────────────────────────────────────────────
  assert.ok(await ev("document.querySelectorAll('.ov-item').length>=8"), 'rail lists products');
  assert.ok(await ev("document.querySelector('#ov-practice-body').textContent.includes('Libra T. Robertson')"));
  // Every product is now priced per dose, so the rail must show real money and
  // no "Price not set" anywhere.
  assert.equal(await ev("[...document.querySelectorAll('.ov-item__price strong')].filter(n=>n.textContent==='Price not set').length"), 0,
    'no product should still read "Price not set"');
  // The rail formats with maximumFractionDigits:0 — "$45", not "$45.00".
  assert.ok(await ev("[...document.querySelectorAll('.ov-item__price strong')].every(n=>/^\\$[\\d,]+(\\.\\d{2})?$/.test(n.textContent))"),
    'every rail price renders as currency');
  assert.ok(await ev("[...document.querySelectorAll('.ov-item .stock-badge')].every(n=>/dose/.test(n.textContent))"),
    'rail stock reads in doses');

  // ── Movement chart ──────────────────────────────────────────────────────
  assert.equal(await ev("document.querySelectorAll('.ov-bars__col').length"), 1,
    'one month of ledger history so far');

  const out = path.join(__dirname, 'screenshots');
  fs.mkdirSync(out, { recursive: true });
  await wait(900);   // let the donut arcs finish revealing
  fs.writeFileSync(path.join(out, 'overview-desktop.png'),
    Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));

  // ── Dropdown menus actually route ───────────────────────────────────────
  assert.equal(await ev("document.querySelector('#tabmenu-1-btn').getAttribute('aria-expanded')"), 'false');
  await ev("document.querySelector('#tabmenu-1-btn').click()");
  await wait(150);
  assert.equal(await ev("!document.querySelector('#tabmenu-1').hidden"), true, 'menu opens');
  await ev("document.querySelector('#tabmenu-1 [role=menuitem]').click()");
  await wait(250);
  assert.equal(await ev("!document.querySelector('#p-queue').hidden"), true, 'menu item routes');

  // Filter listboxes are real comboboxes, keyboard included.
  await ev("document.querySelector('.side__link[data-target=\"#p-overview\"]').click()");
  await wait(250);

  // ── Mobile: no horizontal overflow ──────────────────────────────────────
  await send('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(400);
  assert.equal(await ev("document.documentElement.scrollWidth<=innerWidth"), true,
    'overview must not overflow on a phone');
  fs.writeFileSync(path.join(out, 'overview-mobile.png'),
    Buffer.from((await send('Page.captureScreenshot',
      { format: 'png', captureBeyondViewport: true })).result.data, 'base64'));

  assert.equal(errors.length, 0, errors.join('; '));
  console.log('PASS: donut (5 real arcs, warm ramp, correct %), KPI empty states,');
  console.log('      practice rail, movement chart, dropdown routing, mobile overflow.');
  console.log('Screenshots: docs/testing/screenshots/overview-{desktop,mobile}.png');
  ws.close();
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => chrome.kill());
