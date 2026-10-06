// Phase 1 verification: palette purge, hero brightness, pixel-accurate contrast,
// and the interaction layer. Follows the CDP pattern in docs/testing/.
const { spawn } = require("child_process");
const os = require("os"), fs = require("fs"), path = require("path");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.argv[2] || 9471);
const BASE = process.env.BASE_URL || "http://127.0.0.1:4321";
const OUT = process.argv[3] || "/tmp/lc-shots";
fs.mkdirSync(OUT, { recursive: true });

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "ver-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars",
  "--force-device-scale-factor=1", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

let fails = 0;
const ck = (l, c, d) => {
  console.log(`${c ? "PASS" : "FAIL"}  ${l}${c ? "" : "  -> " + JSON.stringify(d)}`);
  if (!c) fails++;
};

(async () => {
  const WebSocket = require("ws");
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
  const evalJs = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
    return r.result.result.value;
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }, { name: "prefers-color-scheme", value: "light" }] });
  await send("Page.navigate", { url: `${BASE}/index.html` });
  await sleep(4500); // intro aperture + font load; short waits give false failures

  // The intro aperture hands off on the hero portrait's load event, which can
  // outlast the wait in headless. If it is still up we are auditing the overlay,
  // not the page — so force it closed and record that we had to.
  const introForced = await evalJs(`(() => {
    const i = document.getElementById('lc-intro');
    if (!i || i.classList.contains('lc-intro-done')) return false;
    i.classList.add('lc-intro-done','split');
    return true;
  })()`);
  if (introForced) console.log("note: intro overlay force-dismissed for audit");
  await sleep(600);

  // ── 1. No retired colours survive in COMPUTED styles ────────────────────
  const retired = await evalJs(`(() => {
    const bad = [[47,79,79],[26,50,50],[15,32,32],[23,59,53],[16,45,42],
                 [168,213,186],[179,229,252],[248,187,208],[255,205,210],
                 [229,182,169],[242,207,196],[231,184,170],[255,179,0],[255,224,130]];
    const hit = {};
    const near = (r,g,b) => bad.some(c => Math.abs(c[0]-r)<6 && Math.abs(c[1]-g)<6 && Math.abs(c[2]-b)<6);
    for (const el of document.querySelectorAll('*')) {
      const s = getComputedStyle(el);
      for (const p of ['color','backgroundColor','borderTopColor','fill','stroke']) {
        const m = (s[p]||'').match(/rgba?\\((\\d+), ?(\\d+), ?(\\d+)/);
        if (m && near(+m[1],+m[2],+m[3])) {
          const k = el.tagName.toLowerCase()+'.'+(el.className||'').toString().slice(0,30)+' '+p+' '+s[p];
          hit[k] = (hit[k]||0)+1;
        }
      }
    }
    return Object.keys(hit).slice(0,8);
  })()`);
  ck("no retired palette colours in computed styles", retired.length === 0, retired);

  // ── 2. Hero is now a LIGHT field ────────────────────────────────────────
  const hero = await evalJs(`(() => {
    const h = document.querySelector('.lc-home-hero');
    const s = getComputedStyle(h);
    const m = s.backgroundColor.match(/\\d+/g).map(Number);
    const lum = (0.2126*m[0] + 0.7152*m[1] + 0.0722*m[2]) / 255;
    return { bg: s.backgroundColor, lum: +lum.toFixed(3), color: s.color };
  })()`);
  ck(`hero ground is light (lum ${hero.lum} > 0.75)`, hero.lum > 0.75, hero);

  // ── 3. Pixel-accurate contrast on hero text ─────────────────────────────
  // getComputedStyle reports 'transparent' for gradient/glass grounds, so the
  // only trustworthy background is the rendered pixel with text hidden.
  const probes = await evalJs(`(() => {
    const sel = ['.lc-home-title','.lc-home-subtitle','.lc-home-lead',
                 '.lc-home-hero .lc-eyebrow-text','.lc-home-copy .trust-val',
                 '.lc-home-copy .trust-key','.lc-home-mission','.owner-name','.owner-role',
                 '.lc-nav-links button','.lc-logo-sub','.hero-scroll-label'];
    return sel.map(s => {
      const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return null;
      const c = getComputedStyle(e).color.match(/\\d+/g).map(Number);
      return { sel: s, x: Math.round(r.left + Math.min(r.width/2, 60)),
               y: Math.round(r.top + r.height/2), fg: c.slice(0,3) };
    }).filter(Boolean);
  })()`);

  await evalJs(`(() => {
    const st = document.createElement('style'); st.id='lc-hide-text';
    st.textContent = '*{color:transparent!important;text-shadow:none!important}';
    document.head.appendChild(st);
  })()`);
  await sleep(400);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await evalJs(`document.getElementById('lc-hide-text').remove()`);
  fs.writeFileSync(path.join(OUT, "hero-notext.png"), Buffer.from(shot.result.data, "base64"));

  const { PNG } = require("pngjs");
  const png = PNG.sync.read(fs.readFileSync(path.join(OUT, "hero-notext.png")));
  const srgb = v => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  const L = ([r,g,b]) => 0.2126*srgb(r) + 0.7152*srgb(g) + 0.0722*srgb(b);
  const ratio = (a,b) => { const [x,y] = [L(a),L(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };

  // ── 3b. No cool pixels anywhere in the hero ─────────────────────────────
  // Catches colour generated at RUNTIME (the mesh canvas paints hsl() in JS)
  // and blurred gradient orbs — neither appears in computed styles, so a
  // DOM-only audit is blind to them. In a warm monochrome palette every pixel
  // should satisfy R >= G >= B; green-dominant pixels mean something is off-brand.
  // Photographs legitimately contain cool pixels (lab coats, steel, IV fluid),
  // so exclude <img>/<video> rects — we are auditing the painted field, not the
  // photography.
  const imgRects = await evalJs(`[...document.querySelectorAll('img,video,picture')]
    .map(e => { const r = e.getBoundingClientRect();
                return {x:r.left, y:r.top, w:r.width, h:r.height}; })
    .filter(r => r.w > 8 && r.h > 8)`);
  const inImage = (x, y) => imgRects.some(r =>
    x >= r.x - 2 && x <= r.x + r.w + 2 && y >= r.y - 2 && y <= r.y + r.h + 2);

  let cool = 0, sampled = 0;
  for (let y = 0; y < Math.min(png.height, 760); y += 4) {
    for (let x = 0; x < png.width; x += 4) {
      if (inImage(x, y)) continue;
      const i = (png.width * y + x) << 2;
      const r = png.data[i], g = png.data[i+1], b = png.data[i+2];
      sampled++;
      if (g > r + 5 || b > r + 5) cool++;
    }
  }
  const coolPct = (cool / sampled) * 100;
  ck(`hero has no cool/green cast (${coolPct.toFixed(2)}% cool pixels, limit 0.5%)`,
     coolPct < 0.5, { cool, sampled });

  let worst = { r: 99 };
  for (const p of probes) {
    if (p.x < 0 || p.y < 0 || p.x >= png.width || p.y >= png.height) continue;
    const i = (png.width * p.y + p.x) << 2;
    const bg = [png.data[i], png.data[i+1], png.data[i+2]];
    const r = ratio(p.fg, bg);
    const big = /title|subtitle/.test(p.sel);
    const need = big ? 3.0 : 4.5;
    ck(`contrast ${p.sel} = ${r.toFixed(2)}:1 (needs ${need})`, r >= need, { fg: p.fg, bg });
    if (r < worst.r) worst = { r, sel: p.sel };
  }
  console.log(`\n  worst hero contrast: ${worst.sel} ${worst.r.toFixed(2)}:1\n`);

  // ── 4. Interaction layer ────────────────────────────────────────────────
  const inter = await evalJs(`(() => ({
    progress: !!document.getElementById('lc-progress'),
    tiltOn: document.documentElement.classList.contains('lc-tilt-on'),
    grids: document.querySelectorAll('.grid-2,.grid-3,.grid-4,.ba-grid').length,
    indexed: [...document.querySelectorAll('.grid-3')].filter(g => g.children[1] &&
             g.children[1].style.getPropertyValue('--i') !== '').length
  }))()`);
  ck("scroll-progress bar injected", inter.progress, inter);
  ck("pointer tilt enabled", inter.tiltOn, inter);
  ck(`grids found and indexed (${inter.grids} grids)`, inter.grids > 0 && inter.indexed > 0, inter);

  // scroll to trigger stagger + progress
  await evalJs(`window.scrollTo({top: 1400, behavior:'instant'})`);
  await sleep(1400);
  const afterScroll = await evalJs(`(() => ({
    revealed: document.querySelectorAll('.lc-in').length,
    bar: document.getElementById('lc-progress').style.transform
  }))()`);
  ck("grids reveal on scroll", afterScroll.revealed > 0, afterScroll);
  ck("progress bar advances", /scaleX\(0\.[0-9]/.test(afterScroll.bar), afterScroll);

  // ── 5. Dropdown still works after restyle ───────────────────────────────
  await evalJs(`window.scrollTo({top:0,behavior:'instant'})`);
  await sleep(600);
  const dd = await evalJs(`(() => {
    const t = document.querySelector('.lc-dropdown-trigger'); if (!t) return {err:'no trigger'};
    t.click();
    const m = document.getElementById('lc-menu-services');
    return { expanded: t.getAttribute('aria-expanded'),
             visible: m ? getComputedStyle(m).visibility : 'none',
             opacity: m ? getComputedStyle(m).opacity : '0' };
  })()`);
  ck("services dropdown opens", dd.expanded === "true" && dd.visible !== "hidden", dd);

  // ── 6. Final screenshots ────────────────────────────────────────────────
  await evalJs(`(() => { const t=document.querySelector('.lc-dropdown-trigger'); if(t) t.click(); })()`);
  await sleep(500);
  const full = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT, "hero.png"), Buffer.from(full.result.data, "base64"));

  await evalJs(`window.scrollTo({top: 1500, behavior:'instant'})`);
  await sleep(1200);
  const mid = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(OUT, "mid.png"), Buffer.from(mid.result.data, "base64"));

  console.log(`\nscreenshots -> ${OUT}`);
  console.log(fails === 0 ? "\nALL CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
  chrome.kill();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error("ERROR", e.message); chrome.kill(); process.exit(2); });
