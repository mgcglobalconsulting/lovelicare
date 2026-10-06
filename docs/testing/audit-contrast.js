// Full-page pixel-accurate contrast sweep across every visible text element on
// every SPA page. Scrolls in viewport chunks, hides text, screenshots, and
// samples the REAL background pixel — getComputedStyle reports 'transparent'
// for the gradient/glass grounds this site uses almost everywhere.
const { spawn } = require("child_process");
const os = require("os"), fs = require("fs"), path = require("path");
const { PNG } = require("pngjs");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.argv[2] || 9495);
const BASE = process.env.BASE_URL || "http://127.0.0.1:4321";
const PAGES = (process.argv[3] || "home,services,medical-aesthetics,nutritional-wellness,contact,online-store,prepare").split(",");

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "aud-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars",
  "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));

const srgb = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const L = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const ratio = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

(async () => {
  const WebSocket = require("ws");
  let url;
  for (let i = 0; i < 40; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = l.find(t => t.type === "page"); if (p) { url = p.webSocketDebuggerUrl; break; } } catch {}
    await sleep(250);
  }
  const ws = new WebSocket(url, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
  await new Promise(r => ws.on("open", r));
  let id = 0; const pend = new Map();
  ws.on("message", m => { const o = JSON.parse(m); if (o.id && pend.has(o.id)) { pend.get(o.id)(o); pend.delete(o.id); } });
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async e => {
    const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
    return r.result.result ? r.result.result.value : null;
  };

  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [
    { name: "prefers-reduced-motion", value: "no-preference" },
    { name: "prefers-color-scheme", value: "light" }] });
  await send("Page.navigate", { url: `${BASE}/index.html` });
  await sleep(4500);
  await ev(`(() => { const i=document.getElementById('lc-intro');
    if(i) i.classList.add('lc-intro-done','split');
    const c=document.getElementById('lc-cookie'); if(c) c.remove(); })()`);

  const all = [];
  for (const page of PAGES) {
    await ev(`navTo(${JSON.stringify(page)})`);
    await sleep(1300);
    await ev(`document.querySelectorAll('.lc-reveal').forEach(e=>e.classList.add('in'));
              document.querySelectorAll('.grid-2,.grid-3,.grid-4,.ba-grid').forEach(g=>g.classList.add('lc-in'));`);
    await sleep(700);

    const docH = await ev(`document.documentElement.scrollHeight`);
    for (let top = 0; top < Math.min(docH, 14000); top += 800) {
      await ev(`window.scrollTo({top:${top},behavior:'instant'})`);
      await sleep(450);

      // text elements currently in viewport
      const probes = await ev(`(() => {
        const out = [];
        for (const el of document.querySelectorAll('body *')) {
          if (!el.childNodes.length) continue;
          let txt = '';
          for (const n of el.childNodes) if (n.nodeType === 3) txt += n.textContent.trim();
          if (txt.length < 2) continue;
          // checkVisibility walks ANCESTORS — without it, items inside closed
          // dropdowns and hidden modals register as visible text and produce
          // hundreds of phantom failures.
          if (el.checkVisibility && !el.checkVisibility({
                checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.35) continue;
          // any ancestor faded/hidden?
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
          const m = cs.color.match(/[\\d.]+/g); if (!m) continue;
          if (m[3] !== undefined && +m[3] < 0.35) continue;
          const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight || 400;
          out.push({ tag: el.tagName.toLowerCase(),
                     cls: (el.className && el.className.toString ? el.className.toString() : '').slice(0,42),
                     txt: txt.slice(0,34),
                     x: Math.round(r.left + Math.min(r.width/2, 40)),
                     y: Math.round(r.top + r.height/2),
                     fg: [+m[0], +m[1], +m[2]],
                     large: (fs >= 24) || (fs >= 18.66 && fw >= 700) });
        }
        return out;
      })()`);
      if (!probes || !probes.length) continue;

      await ev(`(() => { let s=document.getElementById('__hide');
        if(!s){s=document.createElement('style');s.id='__hide';document.head.appendChild(s);}
        s.textContent='*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}'; })()`);
      await sleep(320);
      const shot = await send("Page.captureScreenshot", { format: "png" });
      await ev(`(() => { const s=document.getElementById('__hide'); if(s) s.textContent=''; })()`);

      const png = PNG.sync.read(Buffer.from(shot.result.data, "base64"));
      for (const p of probes) {
        if (p.x < 0 || p.y < 0 || p.x >= png.width || p.y >= png.height) continue;
        const i = (png.width * p.y + p.x) << 2;
        const bg = [png.data[i], png.data[i+1], png.data[i+2]];
        const r = ratio(p.fg, bg);
        const need = p.large ? 3.0 : 4.5;
        if (r < need) all.push({ page, ...p, bg, r: +r.toFixed(2), need });
      }
    }
  }

  // de-dup by class+text
  const seen = new Set(), uniq = [];
  for (const f of all.sort((a, b) => a.r - b.r)) {
    const k = f.page + '|' + f.cls + '|' + f.txt;
    if (seen.has(k)) continue; seen.add(k); uniq.push(f);
  }
  console.log(`\n=== CONTRAST FAILURES: ${uniq.length} unique (${all.length} raw) ===\n`);
  for (const f of uniq.slice(0, 40)) {
    console.log(`${String(f.r).padStart(5)}:1  need ${f.need}  [${f.page}] ${f.tag}.${f.cls}`);
    console.log(`         "${f.txt}"  fg rgb(${f.fg}) on rgb(${f.bg})`);
  }
  if (uniq.length > 40) console.log(`... and ${uniq.length - 40} more`);
  console.log(uniq.length === 0 ? "\nCLEAN — every text element meets WCAG AA" : "");
  chrome.kill(); process.exit(0);
})().catch(e => { console.error("ERR", e.message, e.stack); chrome.kill(); process.exit(2); });
