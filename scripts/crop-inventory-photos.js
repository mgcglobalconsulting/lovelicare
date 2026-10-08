// Crop the letterbox out of the inventory product photographs.
//
// Four of the six files are iPhone screenshots of a photo viewer: a 1284x2778
// canvas where the actual vial photo occupies a ~22% band in the middle and
// everything else is black, including the iOS home indicator. Rendered into a
// product card with object-fit:contain, that is a black rectangle.
//
// This finds the real photo band by scanning for rows that are not near-black,
// then crops and downscales with sips. Originals are copied to _original/
// first and never overwritten, so this is re-runnable and reversible.
//
//   node scripts/crop-inventory-photos.js --dry
//   node scripts/crop-inventory-photos.js

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PNG } = require('pngjs');

const DIR = path.join(__dirname, '..', 'public', 'assets', 'img', 'inventory');
const BACKUP = path.join(DIR, '_original');
const dry = process.argv.includes('--dry');

// A row counts as content if enough of its pixels are clearly above black.
const LUMA_FLOOR = 26;     // 0-255; iOS letterbox is pure #000
const CONTENT_RATIO = 0.06; // 6% of the row's pixels must clear the floor
const TARGET_W = 1100;      // plenty for a 208px card at 3x
const PAD = 4;              // trim a few rows in from the seam

function contentRows(png) {
  const rows = [];
  for (let y = 0; y < png.height; y++) {
    let lit = 0;
    for (let x = 0; x < png.width; x += 4) {          // every 4th pixel is enough
      const i = (png.width * y + x) << 2;
      if (png.data[i + 3] < 8) continue;               // transparent
      const luma = 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
      if (luma > LUMA_FLOOR) lit++;
    }
    rows.push(lit / (png.width / 4) >= CONTENT_RATIO);
  }
  return rows;
}

/** The longest run of content rows — the photo band, ignoring the home indicator. */
function longestRun(rows) {
  let best = { start: 0, len: 0 }, start = -1;
  rows.forEach((isContent, y) => {
    if (isContent && start < 0) start = y;
    if ((!isContent || y === rows.length - 1) && start >= 0) {
      const len = y - start;
      if (len > best.len) best = { start, len };
      start = -1;
    }
  });
  return best;
}

const files = fs.readdirSync(DIR).filter(f => /\.png$/i.test(f));
if (!files.length) { console.log('No PNGs to process.'); process.exit(0); }
if (!dry) fs.mkdirSync(BACKUP, { recursive: true });

let saved = 0;
for (const file of files) {
  const src = path.join(DIR, file);
  const png = PNG.sync.read(fs.readFileSync(src));
  const band = longestRun(contentRows(png));
  const before = fs.statSync(src).size;

  if (!band.len || band.len / png.height > 0.92) {
    console.log(file.padEnd(42) + 'no letterbox — left alone');
    continue;
  }

  const top = Math.min(band.start + PAD, png.height - 1);
  const height = Math.max(band.len - PAD * 2, 1);

  console.log(file.padEnd(42) +
    png.width + 'x' + png.height + ' -> crop ' + png.width + 'x' + height +
    ' at y=' + top + '  (' + (before / 1048576).toFixed(1) + 'MB)');
  if (dry) continue;

  const backup = path.join(BACKUP, file);
  if (!fs.existsSync(backup)) fs.copyFileSync(src, backup);

  // sips crops around the CENTRE; --cropOffset shifts away from it. A negative
  // offset cannot be passed (sips reads "-1" as a flag), so clamp at 0 — a band
  // sitting above centre is simply centre-cropped, which costs a pixel or two.
  const offset = Math.max(0, Math.round(top - (png.height - height) / 2));
  const args = ['-c', String(height), String(png.width)];
  if (offset > 0) args.push('--cropOffset', String(offset), '0');
  const tmp = src + '.tmp.png';
  execFileSync('sips', args.concat([backup, '--out', tmp]), { stdio: 'ignore' });
  execFileSync('sips', ['-Z', String(TARGET_W), tmp, '--out', src], { stdio: 'ignore' });
  fs.unlinkSync(tmp);

  const after = fs.statSync(src).size;
  saved += before - after;
  console.log(''.padEnd(42) + '  -> ' + (after / 1024).toFixed(0) + 'KB');
}

if (!dry && saved > 0) {
  console.log('\nSaved ' + (saved / 1048576).toFixed(1) + 'MB. Originals in ' +
    path.relative(path.join(__dirname, '..'), BACKUP));
}
