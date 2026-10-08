(function () {
  'use strict';
  const $=s=>document.querySelector(s);
  const categories={iv_therapy:'IV therapy',im_injection:'IM injections',lipotropic:'Lipotropic',vitamin:'Vitamins',mineral:'Minerals',antioxidant:'Antioxidants',other:'Other products'};
  const money=n=>n==null?'Not set':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const count=n=>Number(n).toLocaleString('en-US',{maximumFractionDigits:2});
  const images=['gluthathione-injection-and-biotin.jpg','libo-injection-and-libo-b-injection.jpg','taurine-pryridozine--hcl-b6.JPG','coenzyme-q-10.jpg','vitamin-d3.JPG','zinc-chloride.jpg'];
  let items=[], editable=false, loaded=false, inFlight=null, lastFetch=0, error='', view='grid';
  function node(tag,attrs={},children=[]) {
    const n=document.createElement(tag);
    Object.entries(attrs).forEach(([key,value])=>{if(key==='text')n.textContent=value;else if(key==='class')n.className=value;else if(value!=null)n.setAttribute(key,value);});
    children.forEach(c=>n.append(c));return n;
  }
  function button(text,fn,cls='btn btn--ghost') { const b=node('button',{type:'button',class:cls,text});b.addEventListener('click',fn);return b; }
  async function api(path,options={}) {
    const response=await fetch('/api/dashboard'+path,{credentials:'same-origin',signal:AbortSignal.timeout(15000),...options,headers:{'Content-Type':'application/json',...options.headers}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(response.status===401?'Sign in above to access your inventory.':data.error||'The connection is unavailable. Try refreshing.');
    return data;
  }
  function picture(p) {
    if(p.image_url&&/^\/assets\/img\/[a-zA-Z0-9._/-]+$/.test(p.image_url)) return p.image_url;
    return images.includes(p.source_image)?'/assets/img/inventory/'+p.source_image:null;
  }
  function status(p) {return Number(p.quantity)===0?'Out of stock':Number(p.quantity)<=Number(p.reorder_at)?'Low stock':'In stock';}
  function fillOptions(id,entries) {
    const select=$(id),old=select.value;
    while(select.options.length>1)select.remove(1);
    entries.forEach(([value,label])=>select.add(new Option(label,value)));
    select.value=[...select.options].some(o=>o.value===old)?old:'all';
  }
  function filtered() {
    const search=$('#inventory-search').value.trim().toLowerCase(),cat=$('#inventory-category').value,brand=$('#inventory-brand').value,stock=$('#inventory-stock').value;
    return items.filter(p=>!p.archived&&(!search||[p.name,p.common_name,p.sku,p.manufacturer,p.strength].join(' ').toLowerCase().includes(search))&&
      (cat==='all'||p.category===cat)&&(brand==='all'||(p.manufacturer||'Unspecified')===brand)&&
      (stock==='all'||(stock==='low'&&Number(p.quantity)>0&&Number(p.quantity)<=Number(p.reorder_at))||(stock==='out'&&Number(p.quantity)===0)||(stock==='in'&&Number(p.quantity)>Number(p.reorder_at))))
      .sort((a,b)=>{switch($('#inventory-sort').value){case 'price':return (a.retail_price==null?Infinity:Number(a.retail_price))-(b.retail_price==null?Infinity:Number(b.retail_price));case 'quantity':return a.quantity-b.quantity;case 'recent':return new Date(b.updated_at)-new Date(a.updated_at);default:return (a.common_name||a.name).localeCompare(b.common_name||b.name);}});
  }
  function stats() {
    const active=items.filter(p=>!p.archived), priced=active.filter(p=>p.cost_price!=null),retail=active.filter(p=>p.retail_price!=null);
    const values=[['Products',active.length,'Across the collection'],['Stock alerts',active.filter(p=>p.quantity<=p.reorder_at).length,'At or below reorder level'],
      ['Stock value',priced.length?money(priced.reduce((sum,p)=>sum+Number(p.cost_price)*Number(p.quantity),0)):'—',priced.length+' of '+active.length+' products costed'],['Retail prices',retail.length+' / '+active.length,'Products with a selling price']];
    $('#inventory-stats').replaceChildren(...values.map(([label,value,detail],i)=>node('div',{class:'inventory-stat'+(i===2?' inventory-stat--dark':'')},[
      node('span',{text:label}),node('strong',{text:loaded?String(value):'—'}),node('small',{text:detail})])));
  }
  function render() {
    const rows=filtered(),host=$('#inventory');
    host.className='product-grid'+(view==='list'?' product-grid--list':'');host.replaceChildren();
    $('#c-inv').textContent=loaded?String(items.length):'—';
    $('#inv-summary').textContent=loaded?rows.length+' of '+items.length+' products · Supabase · updated '+new Date(lastFetch).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'Inventory unavailable';
    $('#inventory-notice').textContent=error||(!editable&&loaded?'Your catalog is live. Editing will be available after the prepared inventory database update is applied.':'');
    $('#inventory-notice').hidden=!$('#inventory-notice').textContent;
    $('#inventory-add').disabled=!editable;$('#inventory-export').disabled=!loaded||!rows.length;
    stats();
    if(!rows.length) {
      host.append(node('div',{class:'inventory-empty'},[node('span',{class:'workspace-eyebrow',text:loaded?'YOUR COLLECTION':'OWNER ACCESS'}),node('h3',{text:loaded?'No products match this view.':'Your inventory belongs here.'}),node('p',{text:error||'Add a product or clear the filters to see your collection.'})]));return;
    }
    rows.forEach((p,i)=>{
      const name=p.common_name||p.name;
      const photo=node('div',{class:'product-photo'}),src=picture(p);
      if(src) {
        const img=node('img',{src,alt:name+' · product label',loading:i<4?'eager':'lazy'});
        img.addEventListener('error',()=>{img.remove();photo.append(node('span',{class:'product-monogram',text:name.slice(0,2).toUpperCase()}));},{once:true});photo.append(img);
      } else photo.append(node('span',{class:'product-monogram',text:name.slice(0,2).toUpperCase()}),node('span',{class:'product-photo-note',text:'No product photo'}));
      photo.append(node('span',{class:'product-category',text:categories[p.category]||p.category}));
      const menu=node('details',{class:'product-menu'}),summary=node('summary',{'aria-label':'Actions for '+name,text:'···'});
      const menuBody=node('div',{class:'product-menu__body'});
      menuBody.append(button('View / edit product',()=>{menu.open=false;edit(p);}),button('Stock & history',()=>{menu.open=false;stockDialog(p);}));menu.append(summary,menuBody);photo.append(menu);
      const price=node('div',{class:'product-price'},[node('strong',{text:p.retail_price==null?'Price not set':money(p.retail_price)})]);
      if(p.compare_at_price!=null&&Number(p.compare_at_price)>Number(p.retail_price))price.append(node('del',{text:money(p.compare_at_price)}));
      const title=button(name,()=>edit(p),'product-name');
      const margin=p.retail_price>0&&p.cost_price!=null?((p.retail_price-p.cost_price)/p.retail_price*100).toFixed(1)+'% margin':'Margin not set';
      const body=node('div',{class:'product-body'},[price,title,node('p',{class:'product-spec',text:[p.strength,p.manufacturer||'Brand not recorded'].filter(Boolean).join(' · ')}),
        node('div',{class:'product-pricing-meta'},[node('span',{text:'Cost '+money(p.cost_price)}),node('span',{text:margin})]),
        node('div',{class:'product-stock'},[node('span',{class:'stock-badge'+(p.quantity<=p.reorder_at?' stock-badge--low':''),text:status(p)}),node('strong',{text:count(p.quantity)+' '+p.unit})]),
        button('Manage stock ↗',()=>stockDialog(p),'product-stock-link')]);
      if(p.payment_plan?.enabled)body.append(node('p',{class:'product-plan',text:money(p.payment_plan.deposit)+' deposit · '+p.payment_plan.installments+' '+p.payment_plan.interval+' installments'}));
      host.append(node('article',{class:'product-card',style:'--card-index:'+i},[photo,body]));
    });
  }
  async function refresh(force=false) {
    if(inFlight)return inFlight;
    if(!force&&Date.now()-lastFetch<15000)return;
    inFlight=(async()=>{
      try {const data=await api('/inventory');items=data.items;editable=data.editable;loaded=true;error=data.truncated?'Showing the first 5,000 products. Export is limited to this loaded set.':'';lastFetch=Date.now();
        fillOptions('#inventory-category',Object.entries(categories));fillOptions('#inventory-brand',[...new Set(items.map(p=>p.manufacturer||'Unspecified'))].sort().map(x=>[x,x]));}
      catch(e){items=[];loaded=false;editable=false;error=e.message;lastFetch=0;}
      render();
    })().finally(()=>{inFlight=null;});return inFlight;
  }
  function dialog(title,sub) {
    const d=node('dialog',{class:'inventory-dialog','aria-label':title});
    const body=node('div',{class:'inventory-dialog__body'}),err=node('p',{class:'form-error',role:'alert'});
    const close=button('×',()=>d.close(),'dialog-close');close.setAttribute('aria-label','Close dialog');
    body.append(close,node('p',{class:'workspace-eyebrow',text:'LOVELICARE · OWNER WORKSPACE'}),node('h2',{text:title}),node('p',{class:'dialog-sub',text:sub||''}));
    d.append(body);document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();
    return {d,body,err};
  }
  function field(form,name,label,value='',opts={}) {
    let input;
    if(opts.choices) {input=node('select',{name});opts.choices.forEach(([v,t])=>input.add(new Option(t,v)));input.value=value;}
    else {input=node(opts.multiline?'textarea':'input',{name,type:opts.type||'text',value:opts.multiline?null:value??'',...opts});if(opts.multiline)input.value=value||'';}
    input.removeAttribute('choices');input.removeAttribute('multiline');
    form.append(node('label',{class:'form-field',text:label},[input]));return input;
  }
  function edit(p={}) {
    const editing=!!p.id,modal=dialog(editing?(p.common_name||p.name):'Add a product','Product details and prices · USD. Stock changes are recorded separately.');
    const form=node('form'),grid=node('div',{class:'product-form-grid'});form.append(grid);
    field(grid,'name','Product name',p.name,{required:'',maxlength:200});field(grid,'common_name','Display name',p.common_name||p.name,{maxlength:200});
    field(grid,'category','Category',p.category||'other',{choices:Object.entries(categories)});field(grid,'manufacturer','Brand / manufacturer',p.manufacturer,{maxlength:200});
    field(grid,'sku','SKU',p.sku,{maxlength:100});field(grid,'strength','Strength / variant',p.strength,{maxlength:200});
    field(grid,'unit','Stock unit',p.unit||'vial',{required:'',maxlength:30});field(grid,'reorder_at','Reorder at',p.reorder_at??0,{type:'number',min:0,max:1000000,step:0.01,required:''});
    if(!editing)field(grid,'quantity','Opening stock',p.quantity??0,{type:'number',min:0,max:1000000,step:0.01,required:''});
    field(grid,'cost_price','Cost per stock unit ($)',p.cost_price,{type:'number',min:0,max:1000000,step:0.01});
    field(grid,'retail_price','Retail per stock unit ($)',p.retail_price,{type:'number',min:0,max:1000000,step:0.01});
    field(grid,'compare_at_price','Compare-at price ($)',p.compare_at_price,{type:'number',min:0,max:1000000,step:0.01});
    field(grid,'image_url','Product photograph',picture(p)||'',{choices:[['','No photograph'],...images.map(x=>['/assets/img/inventory/'+x,x.replace(/\.(jpg|JPG|png)$/,'').replace(/-/g,' ')]),['/assets/img/product-smart-greens.jpg','Smart Greens']]});
    field(grid,'notes','Product notes (no client information)',p.notes,{multiline:true,maxlength:1000});
    form.append(node('h3',{text:'Customer payment plan'}),node('p',{class:'dialog-sub',text:'Optional terms per stock unit. No interest or fees included. Saving terms does not charge a customer.'}));
    const plans=node('div',{class:'product-form-grid'});form.append(plans);
    field(plans,'plan_enabled','Payment options',p.payment_plan?.enabled?'yes':'no',{choices:[['no','Pay in full'],['yes','Offer installments']]});
    field(plans,'deposit','Deposit ($)',p.payment_plan?.deposit??0,{type:'number',min:0,max:1000000,step:0.01});
    field(plans,'installments','Installment count',p.payment_plan?.installments??4,{type:'number',min:2,max:24,step:1});
    field(plans,'interval','Payment frequency',p.payment_plan?.interval||'monthly',{choices:[['weekly','Weekly'],['biweekly','Every two weeks'],['monthly','Monthly']]});
    const calculation=node('p',{class:'plan-calculation',role:'status'});form.append(calculation);
    function calculatePlan(){
      const f=form.elements,enabled=f.plan_enabled.value==='yes';['deposit','installments','interval'].forEach(k=>f[k].disabled=!enabled);
      if(!enabled){calculation.textContent='Pay in full. No installment plan offered.';return;}
      const total=Math.round(Number(f.retail_price.value)*100),deposit=Math.round(Number(f.deposit.value)*100),n=Number(f.installments.value);
      if(!f.retail_price.value||total<=deposit||deposit<0||!Number.isInteger(n)||n<2||n>24||(total-deposit)<n){calculation.textContent='Enter a retail price, a smaller deposit, and 2–24 installments.';return;}
      const regular=Math.floor((total-deposit)/n),final=total-deposit-regular*(n-1);
      calculation.textContent=money(deposit/100)+' deposit + '+(n-1)+' × '+money(regular/100)+' + final '+money(final/100)+' = '+money(total/100)+'. Frequency: '+f.interval.value+'.';
    }
    form.addEventListener('input',calculatePlan);form.addEventListener('change',calculatePlan);calculatePlan();
    if(p.source_image)form.append(node('p',{class:'panel__note',text:'Original label: '+p.source_image}));
    const save=node('button',{type:'submit',class:'btn btn--primary',text:editing?'Save changes':'Add product'});save.disabled=!editable;
    form.append(modal.err,node('div',{class:'dialog-actions'},[button('Cancel',()=>modal.d.close()),save]));modal.body.append(form);
    if(!editable)modal.err.textContent=loaded?'Editing requires the prepared database update.':'Sign in to edit products.';
    form.addEventListener('submit',async e=>{e.preventDefault();if(!editable)return;save.disabled=true;modal.err.textContent='';
      try {const data=Object.fromEntries(new FormData(form));data.updated_at=p.updated_at;data.rx_only=p.rx_only;
        data.payment_plan=data.plan_enabled==='yes'?{enabled:true,deposit:data.deposit,installments:data.installments,interval:data.interval}:null;
        await api('/inventory'+(editing?'/'+p.id:''),{method:editing?'PATCH':'POST',body:JSON.stringify(data)});await refresh(true);modal.d.close();}
      catch(e){modal.err.textContent=e.message;save.disabled=false;}
    });
  }
  async function stockDialog(p) {
    const modal=dialog(p.common_name||p.name,count(p.quantity)+' '+p.unit+' on hand · every adjustment is recorded.');
    const form=node('form'),grid=node('div',{class:'product-form-grid'});form.append(grid);
    field(grid,'reason','Reason','received',{choices:[['received','Received'],['administered','Used in service'],['wasted','Wasted'],['expired','Expired'],['adjustment','Count correction']]});
    field(grid,'delta','Quantity change (+ / −)',1,{type:'number',min:-1000000,max:1000000,step:0.01,required:''});
    field(grid,'note','Stock note (no client information)','',{maxlength:1000});
    const save=node('button',{type:'submit',class:'btn btn--primary',text:'Save stock movement'});save.disabled=!editable;
    form.append(modal.err,node('div',{class:'dialog-actions'},[save]));modal.body.append(form,node('h3',{text:'Recent stock history'}));
    const log=node('div',{class:'movement-log',text:'Loading ledger…'});modal.body.append(log);
    form.elements.reason.addEventListener('change',()=>{const input=form.elements.delta;input.value=['administered','wasted','expired'].includes(form.elements.reason.value)?-Math.abs(Number(input.value)):Math.abs(Number(input.value));});
    form.addEventListener('submit',async e=>{e.preventDefault();if(!editable)return;save.disabled=true;modal.err.textContent='';
      try {await api('/inventory/'+p.id+'/movements',{method:'POST',body:JSON.stringify({delta:Number(form.elements.delta.value),reason:form.elements.reason.value,note:form.elements.note.value,updated_at:p.updated_at})});await refresh(true);modal.d.close();}
      catch(e){modal.err.textContent=e.message;save.disabled=false;}
    });
    try {const data=await api('/inventory/'+p.id+'/movements');log.replaceChildren(...data.movements.map(m=>node('div',{class:'movement-row'},[
      node('strong',{text:(m.delta>0?'+':'')+count(m.delta)}),node('span',{text:m.reason.replace(/_/g,' ')}),node('time',{text:new Date(m.created_at).toLocaleString()}),node('small',{text:m.note||''})])));if(!data.movements.length)log.textContent='No movements recorded.';}
    catch(e){log.textContent=e.message;}
  }
  function parseCSV(text) {
    const rows=[];let row=[],cell='',quoted=false;
    text=text.replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
    if(quoted)throw new Error('CSV contains an unclosed quote.');row.push(cell);if(row.some(Boolean))rows.push(row);
    const headers=(rows.shift()||[]).map(x=>x.trim());if(!headers.includes('name'))throw new Error('CSV needs a name column. Download the template.');
    if(new Set(headers).size!==headers.length)throw new Error('CSV contains duplicate column names.');
    if(rows.some(row=>row.length!==headers.length))throw new Error('CSV rows must match the header column count.');
    return rows.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]])));
  }
  const columns=['name','common_name','category','manufacturer','strength','sku','unit','quantity','reorder_at','cost_price','retail_price','compare_at_price','image_url','notes'];
  function download(rows,name) {
    const cell=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
    const csv=[columns,...rows.map(p=>columns.map(k=>p[k]))].map(row=>row.map(cell).join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const link=node('a',{href:url,download:name});document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function importDialog() {
    const modal=dialog('Bring your products together','Review before importing. Invoice purchase prices are costs, not retail prices.');
    const sourceSelect=field(modal.body,'source-kind','Local source file','stock',{choices:[['stock','Sellable vitamins & IV stock'],['supplies','Clinical supplies'],['invoices','Retail product invoices']]});
    const file=node('input',{type:'file',accept:'.csv,text/csv','aria-label':'Select inventory CSV'}),preview=node('div',{class:'import-preview'});
    const save=button('Import reviewed products',async()=>{
      save.disabled=true;modal.err.textContent='';try {const result=await api('/inventory/import',{method:'POST',body:JSON.stringify({items:pending})});await refresh(true);preview.textContent=result.imported+' products imported. Each opening count is in the ledger.';pending=[];}
      catch(e){modal.err.textContent=e.message;save.disabled=!editable;}
    },'btn btn--primary');save.disabled=true;let pending=[];
    modal.body.append(node('div',{class:'dialog-actions'},[button('Download CSV template',()=>download([],'lovelicare-inventory-template.csv')),button('Review local stock file',async()=>{
      preview.textContent='Reading source file…';save.disabled=true;pending=[];
      try{const data=await api('/inventory/sources?source='+sourceSelect.value);preview.replaceChildren(node('p',{text:'These are source records, not live stock. Review each product before adding; duplicates are rejected. Invoice purchase quantities are never treated as current stock.'}));
        data.items.forEach(p=>preview.append(node('div',{class:'source-row'},[node('div',{},[node('strong',{text:p.original}),node('small',{text:p.review})]),button('Review',()=>{modal.d.close();edit({name:p.name,quantity:p.quantity??0,cost_price:p.cost_price,sku:p.sku,unit:p.unit,rx_only:p.rx_only,category:'other',notes:'Source: '+p.source+'; original entry: '+p.original+(p.purchase_quantity?'; purchased: '+p.purchase_quantity:'')});})])));}
      catch(e){preview.textContent=e.message;}
    })]),node('label',{class:'form-field',text:'Or upload a product CSV (up to 200 rows)'},[file]),preview,modal.err,save);
    file.addEventListener('change',async()=>{save.disabled=true;pending=[];modal.err.textContent='';if(!file.files[0])return;
      try {if(file.files[0].size>100000)throw new Error('Use a CSV smaller than 100 KB.');pending=parseCSV(await file.files[0].text());
        if(!pending.length||pending.length>200)throw new Error('Import 1–200 products at a time.');
        if(pending.some(p=>!p.name?.trim()||!categories[p.category]))throw new Error('Each product needs a name and a valid category code.');
        preview.replaceChildren(node('strong',{text:pending.length+' products ready for review'}),...pending.map(p=>node('p',{text:p.name+' · '+(p.quantity||0)+' '+(p.unit||'unit')+' · retail '+(p.retail_price?money(Number(p.retail_price)):'not set')})));
        save.disabled=!editable;if(!editable)modal.err.textContent='Sign in and activate inventory editing before importing.';
      }catch(e){pending=[];modal.err.textContent=e.message;}
    });
  }
  function updateURL() {
    const u=new URL(location.href);['search','category','brand','stock','sort'].forEach(k=>{const v=$('#inventory-'+k).value;if(v&&v!=='all'&&!(k==='sort'&&v==='name'))u.searchParams.set('inv_'+k,v);else u.searchParams.delete('inv_'+k);});
    if(view==='list')u.searchParams.set('inv_view',view);else u.searchParams.delete('inv_view');history.replaceState(null,'',u);render();
  }
  function restoreURL() {
    const q=new URLSearchParams(location.search);['search','category','brand','stock','sort'].forEach(k=>{const el=$('#inventory-'+k),v=q.get('inv_'+k);if(v&&(k==='search'||[...el.options].some(o=>o.value===v)))el.value=v;});
    view=q.get('inv_view')==='list'?'list':'grid';$('#inventory-grid').setAttribute('aria-pressed',String(view==='grid'));$('#inventory-list').setAttribute('aria-pressed',String(view==='list'));render();
  }
  function init() {
    ['search','category','brand','stock','sort'].forEach(k=>$('#inventory-'+k).addEventListener(k==='search'?'input':'change',updateURL));
    ['grid','list'].forEach(v=>$('#inventory-'+v).addEventListener('click',()=>{view=v;$('#inventory-grid').setAttribute('aria-pressed',String(v==='grid'));$('#inventory-list').setAttribute('aria-pressed',String(v==='list'));updateURL();}));
    $('#inventory-reset').addEventListener('click',()=>{['search','category','brand','stock','sort'].forEach(k=>$('#inventory-'+k).value=k==='search'?'':k==='sort'?'name':'all');updateURL();});
    $('#inventory-add').addEventListener('click',()=>edit());$('#inventory-import').addEventListener('click',importDialog);$('#inventory-export').addEventListener('click',()=>download(filtered(),'lovelicare-inventory.csv'));
    document.addEventListener('click',e=>document.querySelectorAll('.product-menu[open]').forEach(d=>{if(!d.contains(e.target))d.open=false;}));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.product-menu[open]').forEach(d=>{d.open=false;d.querySelector('summary').focus();});});
    $('#refresh').addEventListener('click',()=>refresh(true));
    window.addEventListener('popstate',restoreURL);
    refresh().then(restoreURL);
    setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))refresh(true);},30000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true);});
  }
  window.LCInventory={refresh,parseCSV};
  document.addEventListener('DOMContentLoaded',init);
})();
