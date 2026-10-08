// Remove test orders left behind by a failed verification run.
//
// A verification writes a real order and then deletes it. If the run throws
// between those two points, the order survives — and because the storefront
// test asserts on the number of rows under "Recent orders", one stray row
// makes every later run fail for the wrong reason.
//
// Safety: this only ever removes orders whose customer_label is in TEST_LABELS.
// A real order is never touched. Run with --dry to see what would go.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const TEST_LABELS = ['Jasmine R.', 'Test T.'];
const dry = process.argv.includes('--dry');

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } });

(async () => {
  const { data: orders, error } = await db
    .from('orders').select('id, order_number, customer_label, total, created_at')
    .in('customer_label', TEST_LABELS);
  if (error) throw error;

  const { data: all } = await db.from('orders').select('id, order_number, customer_label');
  const real = (all || []).filter(o => !TEST_LABELS.includes(o.customer_label));

  if (!orders.length) {
    console.log('No test orders found.');
  } else {
    console.log((dry ? 'Would remove' : 'Removing') + ' ' + orders.length + ' test order(s):');
    orders.forEach(o => console.log('  ' + o.order_number + '  ' + o.customer_label +
      '  $' + o.total + '  ' + o.created_at));

    if (!dry) {
      const ids = orders.map(o => o.id);
      // Lines first: order_items has no cascade from this direction.
      const a = await db.from('order_items').delete().in('order_id', ids);
      if (a.error) throw a.error;
      const b = await db.from('orders').delete().in('id', ids);
      if (b.error) throw b.error;

      // Ledger rows written by those orders, and the stock they moved.
      const c = await db.from('inventory_movements').delete().in('reason', ['sold', 'returned']);
      if (c.error) throw c.error;
    }
  }

  if (real.length) {
    console.log('\nLEFT ALONE — ' + real.length + ' order(s) with a non-test label:');
    real.forEach(o => console.log('  ' + o.order_number + '  ' + o.customer_label));
  }

  const { count } = await db.from('orders').select('id', { count: 'exact', head: true });
  const { count: strays } = await db.from('inventory_movements')
    .select('id', { count: 'exact', head: true }).in('reason', ['sold', 'returned']);
  const { data: items } = await db.from('inventory_items').select('quantity, retail_price');
  console.log('\nState: orders=' + count + '  sold/returned ledger rows=' + strays +
    '  units=' + items.reduce((s, i) => s + Number(i.quantity), 0) +
    '  priced=' + items.filter(i => i.retail_price != null).length + '/' + items.length);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
