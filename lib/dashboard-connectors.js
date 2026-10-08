// Read-only operations feeds. No client records or messages leave this server.
const {google}=require('googleapis');
const {getSupabase,keyMode}=require('./supabase');
let cached=null, expires=0, pending=null;
const SPECS=[
  {id:'supabase',name:'Supabase',required:['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'],url:'https://supabase.com/dashboard',description:'Inventory and inquiry data'},
  {id:'sheets',name:'Google Sheets',required:['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','GOOGLE_SHEETS_ID'],url:'https://sheets.google.com',description:'Operations metrics from your sheet'}
];
async function request(url,headers={}) {
  const r=await fetch(url,{headers,signal:AbortSignal.timeout(10000)});
  if(!r.ok) throw new Error(r.status===401||r.status===403?'Account access needs attention.':r.status===429?'Provider rate limit reached. Try again later.':'Provider request failed ('+r.status+').');
  const data=await r.json();
  if(data.ok===false||data.errors?.length) throw new Error('The provider could not authorize this read. Check account access and scopes.');
  return data;
}
async function read(spec) {
  const missing=spec.required.filter(k=>!process.env[k]);
  const result={...spec,state:missing.length?'pending':'live',missing,metrics:[],checkedAt:null};
  delete result.required;
  if(missing.length) return {...result,detail:'Account connection required'};
  try {
    if(spec.id==='supabase') {
      if(keyMode()!=='service_role') throw new Error('Server read access is not configured.');
      const {count,error}=await getSupabase().from('inventory_items').select('id',{count:'exact',head:true});
      if(error) throw new Error('Database is not responding.');
      result.metrics=[{label:'Products',value:count}];
      result.url=process.env.SUPABASE_URL.replace(/https:\/\/([^.]+).*/, 'https://supabase.com/dashboard/project/$1');
    } else if(spec.id==='sheets') {
      const auth=new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET);
      auth.setCredentials({refresh_token:process.env.GOOGLE_REFRESH_TOKEN});
      const sheets=google.sheets({version:'v4',auth});
      const r=await sheets.spreadsheets.values.get({spreadsheetId:process.env.GOOGLE_SHEETS_ID,
        range:process.env.GOOGLE_SHEETS_RANGE||'Dashboard!A1:B100',valueRenderOption:'UNFORMATTED_VALUE'}, {timeout:10000,retry:false});
      const allowed=new Set(['appointments','revenue','orders','products_sold','new_clients','followers','inquiries']);
      result.metrics=(r.data.values||[]).filter(row=>allowed.has(String(row[0]).toLowerCase())&&row[1]!==''&&row[1]!=null&&Number.isFinite(Number(row[1])))
        .map(row=>({label:String(row[0]).replace(/_/g,' '),value:Number(row[1])}));
      result.url='https://docs.google.com/spreadsheets/d/'+encodeURIComponent(process.env.GOOGLE_SHEETS_ID);
    }
    result.checkedAt=new Date().toISOString();
    result.detail=result.detail||'Connected · read-only';
    return result;
  } catch(error) {
    // Do not return provider bodies, headers, tokens, or OAuth errors.
    return {...result,state:'error',detail:spec.id==='sheets'?'Sheet access failed. Check the account, sheet and read scope.':error.message,metrics:[]};
  }
}
async function readConnectors() {
  if(cached&&Date.now()<expires) return cached;
  if(!pending) pending=Promise.all(SPECS.map(read)).then(results=>{cached=results;expires=Date.now()+60000;return results;}).finally(()=>{pending=null;});
  return pending;
}
module.exports={readConnectors};
