// Measures whether the cookie banner's CONTENT (not just its box) stays inside
// the banner and the viewport at 390px, for whichever CSS file is on disk.
const { spawn } = require("child_process");
const os = require("os"), fs = require("fs"), path = require("path");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = Number(process.argv[3] || 9335);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cdp2-"));
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

async function main() {
  const ws = new WebSocket(await target());
  await new Promise(r => (ws.onopen = r));
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async expr => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.result.value;

  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: "http://127.0.0.1:4178/" });
  await sleep(2200);
  await evaluate(`localStorage.removeItem('lc_cookie_ok');
    const c=document.getElementById('lc-cookie'); if(c) c.classList.remove('hidden'); true;`);
  await sleep(400);

  const m = await evaluate(`(() => {
    const el = document.getElementById('lc-cookie');
    const p  = el.querySelector('p');
    const btn = document.getElementById('lc-cookie-accept');
    const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect(), br = btn.getBoundingClientRect();
    return {
      vw: window.innerWidth,
      bannerBox:   [Math.round(r.left), Math.round(r.right)],
      bannerScrollW: el.scrollWidth, bannerClientW: el.clientWidth,
      textBox:     [Math.round(pr.left), Math.round(pr.right)],
      buttonBox:   [Math.round(br.left), Math.round(br.right)],
      overflowX:   getComputedStyle(el).overflowX,
      whiteSpace:  getComputedStyle(el).whiteSpace
    };
  })()`);

  const contentOverflowsBanner = m.bannerScrollW > m.bannerClientW;
  const textPastViewport = m.textBox[1] > m.vw || m.textBox[0] < 0;
  const buttonPastViewport = m.buttonBox[1] > m.vw || m.buttonBox[0] < 0;

  console.log(JSON.stringify(m, null, 2));
  console.log(`content overflows banner box: ${contentOverflowsBanner} (scrollW ${m.bannerScrollW} vs clientW ${m.bannerClientW})`);
  console.log(`text escapes viewport:        ${textPastViewport}`);
  console.log(`Accept button escapes viewport: ${buttonPastViewport}`);

  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(process.argv[2], Buffer.from(shot.result.data, "base64"));
  chrome.kill(); process.exit(0);
}
main().catch(e => { console.error(e); chrome.kill(); process.exit(1); });
