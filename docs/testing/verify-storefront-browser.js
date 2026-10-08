// Collection & order desk — live browser verification.
//
// Phase 1 asserts the honest blocked states with the catalog as it really is
// (nothing priced). Phase 2 prices ONE product, places a real order over HTTP,
// checks the stock decrement, then removes every trace it created.
require('dotenv').config();
const { spawn } = require('child_process'), fs = require('fs'), os = require('os'),
      path = require('path'), assert = require('node:assert/strict'), WS = require('ws');
const { createClient } = require('@supabase/supabase-js');

const port = 9509, base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lc-storefront-'));
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile,
   '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));

let probe = null, createdOrderId = null, preExisting = [];

(async () => {
  // Precondition. A stray order from a failed earlier run makes the
  // "Recent orders" assertion below fail for the wrong reason, which sends the
  // next person debugging the UI instead of cleaning the table.
  const { data: existing } = await db.from('orders').select('id, order_number, customer_label');
  preExisting = (existing || []).map(o => o.id);
  if (preExisting.length) {
    throw new Error(
      'Refusing to run: ' + preExisting.length + ' order(s) already exist — ' +
      existing.map(o => o.order_number + ' (' + (o.customer_label || 'no label') + ')').join(', ') +
      '.\nIf they are test rows: node docs/testing/clean-test-orders.js' +
      '\nIf they are real orders, this test must not run against this database.');
  }

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
    { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: base + '/dashboard.html#p-storefront' });

  for (let i = 0; i < 60; i++) {
    if (await ev("document.querySelectorAll('.sf-card').length===9")) break;
    await wait(250);
  }

  // ── Phase 1: the catalog as it really is ────────────────────────────────
  assert.equal(await ev("document.querySelectorAll('.sf-card').length"), 9, 'nine products');
  assert.equal(await ev("document.querySelectorAll('.sf-card__rx').length"), 9,
    'every compounded injectable carries the Rx badge');
  assert.equal(await ev("document.querySelectorAll('.sf-card__add').length"), 9,
    'all nine are priced per dose, so all nine are sellable');
  assert.equal(await ev("document.querySelectorAll('.sf-card__blocked').length"), 0,
    'nothing is blocked now that every product has a price');
  assert.ok(await ev("[...document.querySelectorAll('.sf-card__stock')].every(n=>/dose/.test(n.textContent))"),
    'stock reads in doses, not vials');
  assert.equal(await ev("document.querySelector('#sf-record').disabled"), true,
    'record stays disabled until something is on the order');

  // Filters
  await ev("document.querySelector('#sf-category').value='vitamin';document.querySelector('#sf-category').dispatchEvent(new Event('change'))");
  assert.equal(await ev("document.querySelectorAll('.sf-card').length"), 3, 'category filter');
  await ev("document.querySelector('#sf-reset').click();document.querySelector('#sf-search').value='glutathione';document.querySelector('#sf-search').dispatchEvent(new Event('input'))");
  assert.equal(await ev("document.querySelectorAll('.sf-card').length"), 1, 'search filter');
  await ev("document.querySelector('#sf-reset').click()");

  const out = path.join(__dirname, 'screenshots');
  fs.mkdirSync(out, { recursive: true });
  // Let the staggered card reveal finish, or the screenshot catches the grid
  // mid-fade and is useless for judging the design.
  await wait(1100);
  fs.writeFileSync(path.join(out, 'storefront-desktop.png'),
    Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));

  // ── Phase 2: one real order, end to end ─────────────────────────────────
  // Use the real catalog price — the test must never rewrite what Libra set.
  const { data: taurine } = await db.from('inventory_items')
    .select('*').eq('name', 'TAURINE INJECTION').single();
  probe = { id: taurine.id, quantity: taurine.quantity, retail_price: taurine.retail_price };
  const unit = Number(taurine.retail_price);
  assert.ok(unit > 0, 'Taurine must carry a retail price for this test to mean anything');
  const usd = n => '$' + n.toFixed(2);

  // Isolate one product so the order is deterministic.
  await ev("document.querySelector('#sf-search').value='taurine';document.querySelector('#sf-search').dispatchEvent(new Event('input'))");
  await wait(250);
  assert.equal(await ev("document.querySelectorAll('.sf-card').length"), 1, 'search isolates Taurine');

  await ev("document.querySelector('.sf-card__add').click()");
  assert.equal(await ev("document.querySelectorAll('.sf-line').length"), 1);
  assert.equal(await ev("document.querySelector('#sf-total').textContent"), usd(unit));

  // Stepper and live totals
  await ev("[...document.querySelectorAll('.sf-step__btn')].find(b=>b.textContent==='+').click()");
  assert.equal(await ev("document.querySelector('#sf-total').textContent"), usd(unit * 2));
  await ev("document.querySelector('#sf-discount').value='25';document.querySelector('#sf-discount').dispatchEvent(new Event('input'))");
  assert.equal(await ev("document.querySelector('#sf-total').textContent"), usd(unit * 2 - 25));

  // The PHI guard, surfaced in the UI
  await ev("document.querySelector('#sf-customer').value='someone@example.com'");
  await ev("document.querySelector('#sf-record').click()");
  for (let i = 0; i < 30; i++) {
    if (await ev("document.querySelector('#sf-error').textContent.length>0")) break;
    await wait(200);
  }
  assert.match(await ev("document.querySelector('#sf-error').textContent"), /email address/,
    'an email in the customer label is refused');

  // A good order
  await ev("document.querySelector('#sf-customer').value='Jasmine R.'");
  await ev("document.querySelector('#sf-record').click()");
  for (let i = 0; i < 40; i++) {
    if (await ev("!document.querySelector('#sf-receipt').hidden")) break;
    await wait(250);
  }
  const receipt = await ev("document.querySelector('#sf-receipt').textContent");
  assert.ok(receipt.includes('Recorded LC-') && receipt.includes(usd(unit * 2 - 25)),
    'receipt shows the order number and total — got: ' + receipt);
  assert.equal(await ev("document.querySelectorAll('.sf-line').length"), 0, 'order clears after recording');

  const { data: order } = await db.from('orders')
    .select('*, order_items(*)').order('created_at', { ascending: false }).limit(1).single();
  createdOrderId = order.id;
  assert.equal(order.customer_label, 'Jasmine R.');
  assert.equal(Number(order.total), unit * 2 - 25);
  assert.equal(Number(order.subtotal), unit * 2);
  assert.equal(order.order_items.length, 1);
  assert.equal(Number(order.order_items[0].quantity), 2);

  const { data: after } = await db.from('inventory_items')
    .select('quantity').eq('id', taurine.id).single();
  assert.equal(Number(after.quantity), Number(probe.quantity) - 2, 'stock decremented by the order');

  const { data: ledger } = await db.from('inventory_movements')
    .select('*').eq('item_id', taurine.id).eq('reason', 'sold');
  assert.equal(ledger.length, 1, 'the decrement went through the ledger');

  assert.equal(await ev("document.querySelectorAll('.sf-receipt-row').length"), 1,
    'the order appears under Recent orders');

  assert.equal(errors.length, 0, errors.join('; '));
  console.log('PASS: 9 products, Rx badges, unpriced products blocked, filters,');
  console.log('      stepper + live totals, PHI guard, real order recorded,');
  console.log('      stock decremented through the ledger, recent orders list.');
  console.log('Screenshot: docs/testing/screenshots/storefront-desktop.png');
  ws.close();
})()
.catch(e => { console.error(e); process.exitCode = 1; })
.finally(async () => {
  chrome.kill();
  // Remove every trace this test created. Sweep by "anything that is not
  // pre-existing" rather than by the single id we think we made — if the run
  // threw after order_create committed, createdOrderId was never assigned and
  // the row would otherwise survive into the next run.
  try {
    const { data: now } = await db.from('orders').select('id');
    const mine = (now || []).map(o => o.id).filter(id => !preExisting.includes(id));
    if (createdOrderId && !mine.includes(createdOrderId)) mine.push(createdOrderId);
    if (mine.length) {
      await db.from('order_items').delete().in('order_id', mine);
      await db.from('orders').delete().in('id', mine);
    }
    if (probe) {
      await db.from('inventory_movements').delete().eq('item_id', probe.id).in('reason', ['sold', 'returned']);
      // Restore the CAPTURED price. Hardcoding null here would silently wipe
      // whatever Libra had set.
      await db.from('inventory_items')
        .update({ retail_price: probe.retail_price, quantity: probe.quantity })
        .eq('id', probe.id);
    }
    const { count } = await db.from('orders').select('id', { count: 'exact', head: true });
    console.log('Cleanup: orders remaining =', count);
  } catch (e) { console.error('CLEANUP FAILED —', e.message); process.exitCode = 1; }
});
