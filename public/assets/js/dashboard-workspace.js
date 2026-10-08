(function(){
  'use strict';
  const $=s=>document.querySelector(s);
  const overview=['p-overview','p-today','p-journey','p-funnel','p-asking','p-upnext'];
  let current='p-overview',pending=null,last=0;
  function route(target,write=true){
    if(!document.getElementById(target)?.classList.contains('panel'))target='p-overview';
    current=target;
    const visible=overview.includes(target)?overview:[target];
    document.querySelectorAll('.panel').forEach(p=>{p.hidden=!visible.includes(p.id);});
    document.querySelectorAll('.content > .grid').forEach(g=>{g.hidden=![...g.querySelectorAll('.panel')].some(p=>!p.hidden);});
    const space=target==='p-inventory'?'inventory':target==='p-storefront'?'storefront':target==='p-connectors'?'connectors':'overview';
    document.body.dataset.workspace=space;
    $('#filters').hidden=space!=='overview';
    $('#greeting').textContent=space==='inventory'?'Your product collection':space==='storefront'?'Products and orders':space==='connectors'?'Connected workspace':'Your practice, at a glance';
    document.querySelectorAll('.side__link').forEach(b=>b.setAttribute('aria-current',String(b.dataset.target==='#'+target)));
    document.querySelectorAll('.tab').forEach(b=>{
      const menu=b.getAttribute('aria-controls');
      b.setAttribute('aria-current',String(b.dataset.target==='#'+target||!!(menu&&document.getElementById(menu)?.querySelector('[data-target="#'+target+'"]'))));
    });
    if(write)history.pushState(null,'',location.pathname+location.search+'#'+target);
    if(space==='overview')window.LCOverview?.load();
    if(space==='inventory')window.LCInventory.refresh();
    if(space==='storefront'){window.LCStorefront?.load();window.LCStorefront?.loadOrders();}
    if(space==='connectors')connectors();
    window.scrollTo({top:0,behavior:'instant'});
  }
  function element(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;}
  async function connectors(force=false){
    if(pending)return pending;if(!force&&Date.now()-last<60000)return;
    pending=(async()=>{
      const host=$('#connectors');
      try{
        const response=await fetch('/api/dashboard/connectors',{credentials:'same-origin',signal:AbortSignal.timeout(20000)});
        if(!response.ok)throw new Error(response.status===401?'Sign in above to check your connected accounts.':'Connection checks are temporarily unavailable.');
        const data=await response.json();last=Date.now();host.replaceChildren();
        data.connectors.forEach(c=>{
          const card=element('article',null,'connector-card'),head=element('div',null,'connector-card__head');
          head.append(element('h3',c.name),element('span',c.state==='live'?'Connected':c.state==='error'?'Needs attention':'Not connected','stock-badge'));
          card.append(head,element('p',c.description),element('p',c.detail));
          const metrics=element('div',null,'connector-metrics');
          (c.metrics||[]).forEach(m=>{const v=element('div');v.append(element('strong',Number(m.value).toLocaleString('en-US')),element('span',m.label));metrics.append(v);});card.append(metrics);
          if(c.missing.length){const details=element('details'),summary=element('summary','Connection requirements');details.append(summary,element('p','Configure this Lovelicare account on the server. Credentials are never stored in the browser.'),element('code',c.missing.join(' · ')));if(c.id==='sheets')details.append(element('p','Use a Dashboard tab with metric names in column A and numeric values in B. Supported: appointments, revenue, orders, products_sold, new_clients, followers, inquiries.'));card.append(details);}
          const link=element('a',c.state==='live'?'Open source ↗':'Open '+c.name+' ↗');link.href=c.url;link.target='_blank';link.rel='noopener';card.append(link);
          if(c.checkedAt)card.append(element('p','Checked '+new Date(c.checkedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})));
          host.append(card);
        });
      }catch(e){host.replaceChildren(element('div',e.message,'inventory-notice'));last=0;}
    })().finally(()=>{pending=null;});return pending;
  }
  function init(){
    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-target]');if(!b)return;
      route(b.dataset.target.replace(/^#/,''));
      // The original menus scroll to panels. Keep the chosen workspace at its top.
      requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));
    });
    window.addEventListener('popstate',()=>route(location.hash.slice(1)||'p-overview',false));
    window.addEventListener('hashchange',()=>route(location.hash.slice(1)||'p-overview',false));
    $('#refresh').addEventListener('click',()=>connectors(true));
    route(location.hash.slice(1)||'p-overview',false);connectors();
    setInterval(()=>{if(!document.hidden&&current==='p-connectors')connectors();},60000);
  }
  window.LCWorkspace={connectors};document.addEventListener('DOMContentLoaded',init);
})();
