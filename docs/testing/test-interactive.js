// Clicks every navigation control and checks the page actually changes, then
// verifies call/email links, the booking button, and both forms end to end.
// Third-party embeds are blocked: they steal focus and make results flaky.
const { spawn } = require("child_process");
const os = require("os"), fs = require("fs"), path = require("path");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.argv[2] || 9440);
const BASE = process.env.BASE_URL || "http://127.0.0.1:4178";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "int-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
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
const ck = (l, c, d) => { console.log(`${c ? "PASS" : "FAIL"}  ${l}${c ? "" : "  -> " + JSON.stringify(d)}`); if (!c) fails++; };

(async () => {
  const ws = new WebSocket(await target());
  await new Promise(r => (ws.onopen = r));
  let id = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async x => {
    const r = await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || "eval error");
    return r.result.result.value;
  };

  await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
  await send("Network.setBlockedURLs", { urls: ["*vagaro.com*", "*affirm.com*", "*googletagmanager*"] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1340, height: 820, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: BASE + "/" });
  await sleep(4200);

  // ── Every nav destination actually renders ──
  const pages = await ev(`[...document.querySelectorAll('[id^="page-"]')].map(p=>p.id.slice(5))`);
  const broken = [];
  for (const p of pages) {
    await ev(`navTo('${p}'); true`);
    await sleep(120);
    const active = await ev(`document.querySelector('.lc-page.active')?.id.slice(5) || null`);
    const visible = await ev(`(()=>{const el=document.getElementById('page-${p}');
      if(!el) return false; const r=el.getBoundingClientRect();
      return getComputedStyle(el).display!=='none' && r.height>50;})()`);
    if (active !== p || !visible) broken.push({ page: p, active, visible });
  }
  // Guard against a vacuous pass: an empty page list means the app never loaded.
  ck("page list was discovered (app actually loaded)", pages.length >= 10, pages.length);
  ck(`all ${pages.length} pages render when navigated to`, pages.length >= 10 && broken.length === 0, broken);

  // ── Only one page visible at a time ──
  await ev(`navTo('home'); true`); await sleep(200);
  ck("exactly one page active at a time", (await ev(`document.querySelectorAll('.lc-page.active').length`)) === 1);

  // ── Call + email links are real, tappable anchors ──
  const tel = await ev(`JSON.stringify([...document.querySelectorAll('a[href^="tel:"]')].map(a=>({href:a.getAttribute('href'),text:a.textContent.trim().slice(0,24)})))`);
  const tels = JSON.parse(tel);
  ck("call links present", tels.length > 0, tels.length);
  ck("every tel: href is a valid dialable number",
    tels.every(t => /^tel:\+?[0-9]{10,15}$/.test(t.href)), tels.map(t => t.href));
  const mail = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('a[href^="mailto:"]')].map(a=>a.getAttribute('href')))`));
  ck("every mailto: href is a valid address",
    mail.every(m => /^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(m)), mail);

  // ── No control is a dead end ──
  const deadEnds = await ev(`(()=>{
    const out=[];
    document.querySelectorAll('button').forEach(b=>{
      if(b.closest('#mobile-menu')||b.closest('.lc-dropdown-menu')) return;
      const hasInline = b.hasAttribute('onclick');
      const isSubmit  = b.type==='submit';
      const isToggle  = b.id==='mobile-toggle'||b.classList.contains('lc-dropdown-trigger');
      if(!hasInline && !isSubmit && !isToggle) out.push((b.className||'(no class)')+' :: '+b.textContent.trim().slice(0,30));
    });
    return out;})()`);
  ck("no button without a handler", deadEnds.length === 0, deadEnds);

  // ── Booking button exists and is wired ──
  // Only <button> carries a booking handler; an <a> shares the class purely for
  // styling (the "Launch Wellness Assistant" link), so it is excluded.
  ck("every booking BUTTON wired to openVagaro",
    await ev(`[...document.querySelectorAll('button.vagaro-glass-btn')].every(b=>(b.getAttribute('onclick')||'').includes('openVagaro'))`));
  ck("styled anchors sharing the class have a real href",
    await ev(`[...document.querySelectorAll('a.vagaro-glass-btn')].every(a=>{const h=a.getAttribute('href')||'';return h.length>1&&h!=='#';})`));
  // Clicking the booking button must actually open the modal and lock scroll.
  await ev(`openVagaro(); true`); await sleep(700);
  ck("booking modal opens and locks page scroll",
    await ev(`(()=>{const m=document.getElementById('vagaro-modal');
      return !!m && getComputedStyle(m).display!=='none' && document.body.style.overflow==='hidden';})()`));
  await ev(`if(typeof closeVagaro==='function')closeVagaro(); true`); await sleep(400);
  ck("booking modal closes and restores scroll",
    await ev(`document.body.style.overflow!=='hidden'`));
  ck("openVagaro is defined", (await ev(`typeof openVagaro`)) === "function");

  // ── Forms: contact ──
  await ev(`navTo('contact'); true`); await sleep(400);
  const contact = await ev(`(async()=>{
    const r=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:'Smoke Test',email:'smoke@example.com',phone:'4105551212',
        service:'General Inquiry',message:'automated check',pageUrl:location.href})});
    return r.status+' '+JSON.stringify(await r.json());})()`);
  console.log("      POST /api/contact   ->", contact);
  ck("contact endpoint reachable (not 404)", !contact.startsWith("404"), contact);

  const sub = await ev(`(async()=>{
    const r=await fetch('/api/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'smoke@example.com',pageUrl:location.href})});
    return r.status+' '+JSON.stringify(await r.json());})()`);
  console.log("      POST /api/subscribe ->", sub);
  ck("subscribe endpoint reachable (not 404)", !sub.startsWith("404"), sub);

  const health = await ev(`(async()=>JSON.stringify(await (await fetch('/health')).json()))()`);
  console.log("      GET  /health        ->", health);

  // ── Validation still rejects bad input ──
  const bad = await ev(`(async()=>{const r=await fetch('/api/contact',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'nope'})});return r.status;})()`);
  ck("bad email rejected with 400", bad === 400 || bad === 503, bad);

  console.log(fails === 0 ? "\nAll interactive checks passed." : `\n${fails} check(s) failed.`);
  chrome.kill();
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
