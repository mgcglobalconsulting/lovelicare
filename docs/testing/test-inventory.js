// Validation and HTTP contract checks; never writes to the live database.
const test=require('node:test'),assert=require('node:assert/strict');
const {product,sourceReview}=require('../../lib/inventory');
const base={name:'Test product',category:'vitamin',quantity:1.5,reorder_at:1,cost_price:10,retail_price:20};
test('fractional stock and unknown prices remain distinct',()=>{
  assert.equal(product(base).quantity,1.5);
  assert.equal(product({...base,cost_price:''}).cost_price,null);
  assert.equal(product({...base,retail_price:0}).retail_price,0);
});
test('invalid amounts, categories and compare-at prices are rejected',()=>{
  for(const quantity of [-1,NaN,Infinity,'bad',0.001,true])assert.throws(()=>product({...base,quantity}));
  assert.throws(()=>product({...base,category:'invalid'}));
  assert.throws(()=>product({...base,compare_at_price:5}));
  assert.throws(()=>product({...base,image_url:'javascript:alert(1)'}));
});
test('ambiguous source counts cannot silently become stock',()=>{
  const rows=sourceReview();assert.equal(rows.length,28);
  assert.equal(rows.filter(r=>r.quantity===null).length,2);
  assert.equal(rows.find(r=>r.name.startsWith('Lysine')).quantity,1.5);
  const invoices=sourceReview('invoices');assert.equal(invoices.length,79);assert.equal(invoices[0].cost_price,10.5);assert.equal(invoices[0].quantity,null);assert.equal(invoices[0].purchase_quantity,1);
});
test('payment plans require a retail price, valid deposit and whole installment count',()=>{
  const plan={enabled:true,deposit:5,installments:4,interval:'monthly'};
  assert.deepEqual(product({...base,payment_plan:plan}).payment_plan,plan);
  assert.throws(()=>product({...base,payment_plan:{...plan,deposit:25}}));
  assert.throws(()=>product({...base,payment_plan:{...plan,installments:2.5}}));
  assert.throws(()=>product({...base,retail_price:null,payment_plan:plan}));
});
test('protected routes validate before writing and use atomic RPCs',async()=>{
  const express=require('express');process.env.DASHBOARD_TOKEN='test-only-owner-token-at-least-32-characters';let calls=[];
  require.cache[require.resolve('../../lib/supabase')]={exports:{keyMode:()=> 'service_role',getSupabase:()=>({rpc:async(name,args)=>{calls.push({name,args});return {data:{id:args.p_id||'created'}};}})}};
  require.cache[require.resolve('../../lib/dashboard-connectors')]={exports:{readConnectors:async()=>[]}};
  const app=express();app.use(express.json());app.use('/api/dashboard',require('../../lib/dashboard-api'));
  const server=app.listen(0);await new Promise(r=>server.once('listening',r));
  const origin='http://127.0.0.1:'+server.address().port+'/api/dashboard';
  const headers={'Content-Type':'application/json','x-dashboard-token':process.env.DASHBOARD_TOKEN};
  const post=(url,body)=>fetch(origin+url,{method:'POST',headers,body:JSON.stringify(body)});
  try{
    const denied=await fetch(origin+'/inventory');assert.equal(denied.status,401);assert.equal(denied.headers.get('cache-control'),'no-store');
    assert.equal((await fetch(origin+'/inventory',{headers:{cookie:'lc_dash=%E0%A4%A'}})).status,401);
    assert.equal((await post('/inventory',{...base,quantity:-1})).status,400);assert.equal(calls.length,0);
    assert.equal((await post('/inventory',base)).status,201);assert.equal(calls[0].name,'inventory_save');assert.equal(calls[0].args.p_item.quantity,1.5);
    const url='/inventory/8e31df77-dae9-44e6-b6b0-d49c6b82bbe6/movements';
    assert.equal((await post(url,{delta:1,reason:'wasted',updated_at:new Date().toISOString()})).status,400);assert.equal(calls.length,1);
    assert.equal((await post(url,{delta:-0.5,reason:'administered',updated_at:new Date().toISOString()})).status,200);assert.equal(calls[1].name,'inventory_adjust');
    assert.equal((await post('/inventory/import',{items:[base,{...base,quantity:-1}]})).status,400);assert.equal(calls.length,2);
  }finally{server.close();}
});
