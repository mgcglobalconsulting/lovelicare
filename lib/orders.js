// Order validation. Mirrors the constraints in migration 0006 so a bad order is
// rejected before it reaches the database, with a message a person can act on.
//
// NO PHI. customer_label is a first name + last initial and nothing else. The
// checks below reject the two shapes most likely to carry identity by accident
// — an email address and any run of digits (phone, DOB, record number).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHANNELS = ['in_person', 'phone', 'online', 'comp'];
const STATUSES = ['draft', 'placed', 'fulfilled'];

function money(value, field) {
  if (value === '' || value == null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000000 ||
      Math.abs(n * 100 - Math.round(n * 100)) > 0.00001)
    throw new Error(field + ' must be between 0 and 1,000,000 with at most two decimals.');
  return Math.round(n * 100) / 100;
}

function customerLabel(value) {
  const label = typeof value === 'string' ? value.trim() : '';
  if (!label) return null;
  if (label.length > 60) throw new Error('Use a short label — a first name and last initial.');
  if (label.includes('@'))
    throw new Error('Do not put an email address on an order. Use a first name and last initial.');
  if (/[0-9]{3}/.test(label))
    throw new Error('Do not put a phone number, date of birth or record number on an order.');
  return label;
}

/** Validate an order header. Totals are NOT accepted from the client — the
 *  database recomputes them from the catalog price of each line. */
function order(input) {
  if (!input || typeof input !== 'object') throw new Error('An order is required.');
  const channel = input.channel || 'in_person';
  if (!CHANNELS.includes(channel)) throw new Error('Choose a valid order channel.');
  const status = input.status || 'placed';
  if (!STATUSES.includes(status)) throw new Error('Choose a valid order status.');

  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 1000) : '';
  return {
    status,
    channel,
    customer_label: customerLabel(input.customer_label),
    note: note || null,
    discount: money(input.discount, 'Discount'),
    tax: money(input.tax, 'Tax'),
    staff_label: 'Dashboard owner'
  };
}

/** Validate the order lines. unit_price is optional — omitted means "use the
 *  catalog retail price", which is the safe default and the usual case. */
function lines(input) {
  if (!Array.isArray(input) || !input.length)
    throw new Error('Add at least one product to the order.');
  if (input.length > 100) throw new Error('An order holds at most 100 product lines.');

  return input.map((line, i) => {
    const at = 'Line ' + (i + 1) + ': ';
    if (!line || typeof line !== 'object') throw new Error(at + 'is not a product.');
    if (!UUID.test(String(line.item_id || ''))) throw new Error(at + 'choose a product.');

    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000 ||
        Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.00001)
      throw new Error(at + 'enter a quantity above zero with at most two decimals.');

    const out = { item_id: line.item_id, quantity: Math.round(quantity * 100) / 100 };
    if (line.unit_price !== '' && line.unit_price != null)
      out.unit_price = money(line.unit_price, at + 'unit price');
    return out;
  });
}

/** Map a Postgres error onto a message the owner can act on. Never leaks a
 *  driver string, a constraint name, or a row's contents. */
function dbError(res, error) {
  const message = String(error.message || '');
  if (error.code === '40001')
    return res.status(409).json({ error: 'This order changed. Refresh before trying again.' });
  if (error.code === 'P0002')
    return res.status(404).json({ error: 'Order not found.' });
  if (error.code === '22023')
    // These are the raise-exception messages from order_create — already written
    // for a person ("Only 3 vial of X remain.", "Set a retail price for X").
    return res.status(400).json({ error: message || 'That order could not be accepted.' });
  if (error.code === '23505')
    return res.status(409).json({ error: 'That order number already exists.' });
  if (/PGRST20[24]|42883|42703|42P01/.test(error.code || ''))
    return res.status(503).json({
      error: 'Order recording needs the prepared database update (0006). No stock has changed.'
    });
  console.error('[orders]', error.code);
  return res.status(502).json({
    error: 'The order could not be saved. Check inventory before retrying.'
  });
}

module.exports = { order, lines, dbError, UUID, CHANNELS, STATUSES };
