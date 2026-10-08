// Existing CDP test pattern. Live reads only; mutation check uses an explicit fixture.
require('dotenv').config();
const {spawn}=require('child_process'),fs=require('fs'),os=require('os'),path=require('path'),assert=require('node:assert/strict'),WS=require('ws');
const port=9507,base=process.env.BASE_URL||'http://127.0.0.1:3000';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'lc-inventory-'));
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+profile,'--no-first-run','--hide-scrollbars','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let target;for(let i=0;i<40;i++){try{target=(await(await fetch('http://localhost:'+port+'/json/list')).json()).find(t=>t.type==='page');if(target)break;}catch{}await wait(250);}
  const ws=new WS(target.webSocketDebuggerUrl);await new Promise(r=>ws.once('open',r));let id=0;const pending=new Map(),errors=[];
  ws.on('message',m=>{const p=JSON.parse(m);if(p.id){pending.get(p.id)?.(p);pending.delete(p.id);}if(p.method==='Runtime.exceptionThrown')errors.push(p.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise(resolve=>{pending.set(++id,resolve);ws.send(JSON.stringify({id,method,params}));});
  const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.result.exceptionDetails)throw new Error(r.result.exceptionDetails.text);return r.result.result.value;};
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCookie',{name:'lc_dash',value:process.env.DASHBOARD_TOKEN,url:base,path:'/api/dashboard',httpOnly:true,sameSite:'Strict'});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:base+'/dashboard.html#p-inventory'});
  for(let i=0;i<40;i++){if(await ev("document.querySelectorAll('.product-card').length===9"))break;await wait(250);}
  assert.equal(await ev("document.querySelectorAll('.product-card').length"),9);assert.equal(await ev("document.body.dataset.workspace"),'inventory');
  const out=path.join(__dirname,'screenshots');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'inventory-desktop.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
  await ev("document.querySelector('#inventory-category').value='vitamin';document.querySelector('#inventory-category').dispatchEvent(new Event('change'))");assert.equal(await ev("document.querySelectorAll('.product-card').length"),3);
  await ev("document.querySelector('#inventory-reset').click();document.querySelector('#inventory-search').value='biotin';document.querySelector('#inventory-search').dispatchEvent(new Event('input'))");assert.equal(await ev("document.querySelectorAll('.product-card').length"),1);
  await ev("document.querySelector('#inventory-list').click()");assert.equal(await ev("document.querySelector('#inventory').classList.contains('product-grid--list')"),true);
  await ev("document.querySelector('.product-stock-link').click()");await wait(600);assert.equal(await ev("!!document.querySelector('dialog[open]')"),true);
  await ev("document.querySelector('dialog').close();document.querySelector('#inventory-reset').click();document.querySelector('#inventory-grid').click()");
  await ev("document.querySelector('#tabmenu-1-btn').click();document.querySelector('#tabmenu-1 [role=menuitem]').click()");assert.equal(await ev("!document.querySelector('#p-queue').hidden"),true);
  await ev("document.querySelector('.side__link[data-target=\"#p-inventory\"]').click()");
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await wait(350);assert.equal(await ev("document.documentElement.scrollWidth<=innerWidth"),true);
  fs.writeFileSync(path.join(out,'inventory-mobile.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).result.data,'base64'));
  await ev(`window.__actualFetch=window.fetch;window.__writes=[];window.fetch=async function(url,options){if(String(url).endsWith('/inventory')&&(!options?.method||options.method==='GET')){const r=await window.__actualFetch(url,options);const b=await r.json();b.editable=true;return new Response(JSON.stringify(b),{status:200});}if(options?.method==='PATCH'){window.__writes.push(JSON.parse(options.body));return new Response(JSON.stringify({item:{}}),{status:200});}return window.__actualFetch(url,options);};window.LCInventory.refresh(true)`);
  await ev("document.querySelector('.product-name').click();document.querySelector('[name=retail_price]').value='42.50';document.querySelector('dialog form').requestSubmit()");await wait(500);assert.equal(await ev("window.__writes[0].retail_price"),'42.50');
  assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS: live inventory, category/search, list view, ledger, dropdown routing, mobile overflow, isolated price save.');console.log('Screenshots: docs/testing/screenshots/inventory-{desktop,mobile}.png');ws.close();
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>chrome.kill());
