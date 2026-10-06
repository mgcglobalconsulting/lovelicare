// Pixel-accurate WCAG AA sweep for /dashboard.html.
//
// Why this is separate from audit-contrast.js: that script drives the public
// SPA by calling navTo() inside index.html. The dashboard is its own document
// and its own bundle (R7), so it needs its own pass.
//
// Same technique, and for the same reason: this site paints nearly every
// ground with gradients, glass and backdrop-filter, which getComputedStyle
// reports as `transparent`. Only sampling the real rendered pixel is
// trustworthy. Text is hidden, the page is screenshotted, and the pixel
// under each text node is read back as its true background.
//
// It also opens a dropdown before sampling, because the listbox popup floats
// over other content and its contrast is only real once it is painted.
//
//   node docs/testing/audit-dashboard.js [cdpPort]
//
// Requires a static server on :4321 (npm run serve:static) and `pngjs`.

const { spawn } = require("child_process");
const os = require("os"), fs = require("fs"), path = require("path");
const PNG = require("pngjs").PNG;

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.argv[2] || 9496);
const BASE = process.env.BASE_URL || "http://127.0.0.1:4321";

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "dashaudit-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars",
  "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// WCAG relative luminance + contrast ratio.
const lum = c => {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = l.find(t => t.type === "page");
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error("no debug target");
}

(async () => {
  const WebSocket = require(path.join(__dirname, "..", "..", "node_modules", "ws"));
  const ws = new WebSocket(await target(), { perMessageDeflate: false, maxPayload: 256 * 1024 * 1024 });
  await new Promise(r => ws.on("open", r));
  let id = 0; const pend = new Map();
  ws.on("message", m => {
    const o = JSON.parse(m);
    if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); }
  });
  const send = (method, params = {}) => new Promise(res => {
    const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");

  const all = [];

  // Two passes: the default view, and the view with a dropdown open so the
  // floating listbox gets sampled against what it actually sits on.
  const passes = [
    { name: "default", setup: null },
    { name: "dropdown-open", setup: `document.querySelector('.lb__btn').click()` }
  ];

  for (const pass of passes) {
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 950, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE}/dashboard.html` });
    await sleep(3200);
    if (pass.setup) { await ev(pass.setup); await sleep(500); }

    const docH = await ev(`document.documentElement.scrollHeight`);
    for (let top = 0; top < Math.min(docH, 14000); top += 760) {
      await ev(`window.scrollTo({top:${top},behavior:'instant'})`);
      await sleep(380);

      const probes = await ev(`(() => {
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!el.childNodes.length) continue;
          let txt = '';
          for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent.trim();
          // 1, not 2. A single glyph standing in for a value (an em-dash
          // empty state, a count of 7) is real text and must meet AA. The
          // upstream audit-contrast.js uses 2 and silently skips these.
          if (txt.length < 1) continue;
          if (el.checkVisibility && !el.checkVisibility({
                checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.35) continue;
          let anc = el.parentElement, hidden = false;
          while (anc && anc !== document.body) {
            const a = getComputedStyle(anc);
            if (a.visibility === 'hidden' || a.display === 'none' || +a.opacity < 0.35) { hidden = true; break; }
            anc = anc.parentElement;
          }
          if (hidden) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          if (r.top < 4 || r.bottom > innerHeight - 4) continue;
          // OCCLUSION. checkVisibility() walks ancestors but knows nothing
          // about something floating on top. An open dropdown covering a
          // banner would otherwise be sampled as that banner's background
          // and reported as a 1:1 failure. Only sample if this element (or
          // its own subtree) is what actually paints at the sample point.
          const sx = Math.round(r.left + Math.min(r.width/2, 40));
          const sy = Math.round(r.top + r.height/2);
          const hit = document.elementFromPoint(sx, sy);
          if (!hit || (hit !== el && !el.contains(hit))) continue;
          const m = cs.color.match(/[\\d.]+/g); if (!m) continue;
          if (m[3] !== undefined && +m[3] < 0.35) continue;
          const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400;
          out.push({ tag: el.tagName.toLowerCase(),
                     cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0,42),
                     txt: txt.slice(0,34),
                     x: sx,
                     y: sy,
                     fg: [+m[0], +m[1], +m[2]],
                     large: (fs >= 24) || (fs >= 18.66 && fw >= 700) });
        }
        return out;
      })()`);
      if (!probes || !probes.length) continue;

      await ev(`(() => { let s=document.getElementById('__hide');
        if(!s){s=document.createElement('style');s.id='__hide';document.head.appendChild(s);}
        s.textContent='*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}'; })()`);
      await sleep(300);
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await ev(`(() => { const s=document.getElementById('__hide'); if(s) s.textContent=''; })()`);

      const png = PNG.sync.read(Buffer.from(shot.result.data, "base64"));
      for (const p of probes) {
        if (p.x < 0 || p.y < 0 || p.x >= png.width || p.y >= png.height) continue;
        const i = (png.width * p.y + p.x) << 2;
        const bg = [png.data[i], png.data[i+1], png.data[i+2]];
        const r = ratio(p.fg, bg);
        const need = p.large ? 3.0 : 4.5;
        if (r < need) all.push({ pass: pass.name, ...p, bg, r: +r.toFixed(2), need });
      }
    }
  }

  const seen = new Set(), uniq = [];
  for (const f of all.sort((a, b) => a.r - b.r)) {
    const k = f.cls + '|' + f.txt;
    if (seen.has(k)) continue; seen.add(k); uniq.push(f);
  }

  console.log(`\n=== DASHBOARD CONTRAST FAILURES: ${uniq.length} unique (${all.length} raw) ===\n`);
  for (const f of uniq.slice(0, 40)) {
    console.log(`${String(f.r).padStart(5)}:1  need ${f.need}  [${f.pass}] ${f.tag}.${f.cls}`);
    console.log(`         "${f.txt}"  fg rgb(${f.fg}) on rgb(${f.bg})`);
  }
  if (uniq.length > 40) console.log(`... and ${uniq.length - 40} more`);
  console.log(uniq.length === 0 ? "\nCLEAN — every text element on /dashboard meets WCAG AA" : "");
  chrome.kill();
  process.exit(uniq.length === 0 ? 0 : 1);
})().catch(e => { console.error("ERR", e.message, e.stack); chrome.kill(); process.exit(2); });
