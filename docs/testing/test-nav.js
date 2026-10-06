// Drives the real nav in headless Chrome: tap, hover-across-the-gap, keyboard,
// Escape, outside-click, and dropdown-closes-on-navigate.
const { spawn } = require("child_process");
const os = require("os"), fs = require("fs"), path = require("path");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.argv[2] || 9351);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cdpnav-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
  "--hide-scrollbars", "about:blank"], { stdio: "ignore" });
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
  throw new Error("no target");
}

let failures = 0;
function check(label, cond, detail) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${cond ? "" : "  → " + JSON.stringify(detail)}`);
  if (!cond) failures++;
}

async function main() {
  const ws = new WebSocket(await target());
  await new Promise(r => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails.exception));
    return r.result.result.value;
  };
  const mouse = (type, x, y) => send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" ? "none" : "left", clickCount: type === "mouseMoved" ? 0 : 1, buttons: 0 });
  const key = (k, code, keyCode) => send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: keyCode })
    .then(() => send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: keyCode }));

  await send("Page.enable"); await send("Runtime.enable");
  // BLOCK_THIRDPARTY=1 blocks the Vagaro/Affirm embeds. They load iframes that
  // can take focus at unpredictable times, which makes keyboard assertions flaky.
  if (process.env.BLOCK_THIRDPARTY) {
    await send("Network.enable");
    await send("Network.setBlockedURLs", { urls: ["*vagaro.com*", "*affirm.com*", "*googletagmanager*"] });
  }

  // ─────────────── DESKTOP ───────────────
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: "http://127.0.0.1:4178/" });
  await sleep(4200);

  check("nav JS initialized (html.lc-nav-js)",
    await ev(`document.documentElement.classList.contains('lc-nav-js')`));
  check("no legacy menubar roles remain",
    await ev(`document.querySelectorAll('[role="menubar"],[role="menuitem"],[role="menu"]').length`) === 0);
  check("dropdown items are focusable buttons",
    await ev(`Array.from(document.querySelectorAll('.lc-dropdown-item')).every(b=>b.tagName==='BUTTON')`));

  const box = async sel => ev(`(()=>{const r=document.querySelector("${sel}").getBoundingClientRect();
    return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),right:Math.round(r.right)};})()`);
  const isOpen = async () => ev(`document.querySelector('.lc-dropdown').classList.contains('open')`);
  const expanded = async () => ev(`document.querySelector('.lc-dropdown-trigger').getAttribute('aria-expanded')`);

  const trig = await box(".lc-dropdown-trigger");

  // 1. Click opens, aria-expanded syncs
  await mouse("mousePressed", trig.x, trig.y); await mouse("mouseReleased", trig.x, trig.y);
  await sleep(300);
  check("click opens dropdown", await isOpen());
  check("aria-expanded=true when open", await expanded() === "true");

  // 2. Click again closes
  await mouse("mousePressed", trig.x, trig.y); await mouse("mouseReleased", trig.x, trig.y);
  await sleep(300);
  check("click again closes", !(await isOpen()));
  check("aria-expanded=false when closed", await expanded() === "false");

  // 3. THE ORIGINAL BUG: hover the trigger, then move down across the 10px gap
  //    into the panel. The menu must still be open when the pointer arrives.
  await mouse("mouseMoved", 20, 700);      // park the pointer away first, so
  await sleep(150);                        // moving onto the trigger fires mouseenter
  await mouse("mouseMoved", trig.x, trig.y);
  await sleep(350);
  check("hover opens dropdown", await isOpen());
  const panel = await box(".lc-dropdown-menu");
  const gapY = Math.round((trig.bottom + panel.top) / 2);   // dead space between them
  await mouse("mouseMoved", trig.x, gapY);                  // pointer in the gap
  await sleep(60);
  const openInGap = await isOpen();
  await mouse("mouseMoved", panel.x, panel.top + 30);       // arrived in the panel
  await sleep(120);
  check("stays open while crossing the gap", openInGap, { gapY, trigBottom: trig.bottom, panelTop: panel.top });
  check("stays open once inside the panel", await isOpen());

  // 4. Moving fully away closes it (after the grace period)
  await mouse("mouseMoved", 20, 700);
  await sleep(600);
  check("closes after pointer leaves", !(await isOpen()));

  // 5. Keyboard: focus trigger, Enter opens and moves focus to first item
  await ev(`document.querySelector('.lc-dropdown-trigger').focus(); true`);
  await key("Enter", "Enter", 13);
  await sleep(250);
  check("Enter opens dropdown", await isOpen());
  check("focus moves into first item",
    await ev(`document.activeElement.classList.contains('lc-dropdown-item')`));

  // 6. ArrowDown moves to the next item
  const firstLabel = await ev(`document.activeElement.textContent.trim()`);
  await key("ArrowDown", "ArrowDown", 40);
  await sleep(150);
  const secondLabel = await ev(`document.activeElement.textContent.trim()`);
  check("ArrowDown moves to next item", firstLabel !== secondLabel, { firstLabel, secondLabel });

  // 7. End / Home
  await key("End", "End", 35); await sleep(120);
  const lastLabel = await ev(`document.activeElement.textContent.trim()`);
  await key("Home", "Home", 36); await sleep(120);
  check("End then Home returns to first item",
    (await ev(`document.activeElement.textContent.trim()`)) === firstLabel, { lastLabel });

  // 8. Escape closes and returns focus to the trigger (WCAG 1.4.13 dismissible)
  await key("Escape", "Escape", 27);
  await sleep(200);
  check("Escape closes dropdown", !(await isOpen()));
  check("Escape returns focus to trigger",
    await ev(`document.activeElement.classList.contains('lc-dropdown-trigger')`));

  // 9. Outside click dismisses
  await mouse("mousePressed", trig.x, trig.y); await mouse("mouseReleased", trig.x, trig.y);
  await sleep(250);
  await mouse("mousePressed", 640, 700); await mouse("mouseReleased", 640, 700);
  await sleep(250);
  check("outside click dismisses", !(await isOpen()));

  // 10. Choosing an item navigates AND closes the dropdown
  await mouse("mousePressed", trig.x, trig.y); await mouse("mouseReleased", trig.x, trig.y);
  await sleep(250);
  const item = await box(".lc-dropdown-item");
  await mouse("mousePressed", item.x, item.y); await mouse("mouseReleased", item.x, item.y);
  await sleep(600);
  check("selecting an item navigates", (await ev(`location.hash`)) !== "", await ev(`location.hash`));
  check("dropdown closed after navigating", !(await isOpen()));

  // 11. Only one panel open at a time
  await ev(`document.querySelectorAll('.lc-dropdown-trigger')[0].click(); true`); await sleep(200);
  await ev(`document.querySelectorAll('.lc-dropdown-trigger')[1].click(); true`); await sleep(200);
  check("opening the second closes the first",
    (await ev(`document.querySelectorAll('.lc-dropdown.open').length`)) === 1);

  // ─────────────── TOUCH / MOBILE ───────────────
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Page.navigate", { url: "http://127.0.0.1:4178/" });
  await sleep(4200);
  check("mobile drawer toggle exists", await ev(`!!document.getElementById('mobile-toggle')`));
  await ev(`document.getElementById('mobile-toggle').click(); true`);
  await sleep(1400);   // the drawer slides in over 450ms; measure once settled
  check("mobile drawer opens on tap",
    await ev(`document.getElementById('mobile-menu').classList.contains('open')`));
  const offscreen = await ev(`(()=>{const items=[...document.querySelectorAll('.mobile-nav-item')];
    return items.filter(i=>{const r=i.getBoundingClientRect(); return r.right>window.innerWidth||r.left<0;}).length;})()`);
  check("no mobile nav item overflows the viewport", offscreen === 0, { offscreen });

  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(process.argv[3] || "/tmp/nav-mobile.png", Buffer.from(shot.result.data, "base64"));

  console.log(failures === 0 ? "\nAll nav checks passed." : `\n${failures} nav check(s) failed.`);
  chrome.kill();
  process.exit(failures === 0 ? 0 : 1);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
