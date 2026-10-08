const fs = require('fs');
const path = require('path');
const CATEGORIES = ['iv_therapy','im_injection','lipotropic','vitamin','mineral','antioxidant','other'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function text(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function number(value, nullable = false) {
  if (nullable && (value === '' || value == null)) return null;
  if (value === '' || value == null || !['number','string'].includes(typeof value)) throw new Error('Enter a valid number.');
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1000000 || Math.abs(n * 100 - Math.round(n * 100)) > 0.00001)
    throw new Error('Numbers must be between 0 and 1,000,000 with at most two decimal places.');
  return n;
}
function product(input) {
  if (!input || typeof input !== 'object') throw new Error('A product is required.');
  const name = text(input.name);
  if (!name) throw new Error('Product name is required.');
  if (!CATEGORIES.includes(input.category)) throw new Error('Choose a valid category.');
  const image = text(input.image_url, 500);
  if (image && !/^\/assets\/img\/[a-zA-Z0-9._/-]+$/.test(image))
    throw new Error('Choose a product image from the Lovelicare image library.');
  const result = { name, common_name:text(input.common_name)||name, manufacturer:text(input.manufacturer),
    category:input.category, strength:text(input.strength), unit:text(input.unit,30)||'unit',
    quantity:number(input.quantity ?? 0), reorder_at:number(input.reorder_at ?? 0),
    cost_price:number(input.cost_price,true), retail_price:number(input.retail_price,true),
    compare_at_price:number(input.compare_at_price,true), sku:text(input.sku,100), image_url:image||null,
    notes:text(input.notes,1000), rx_only:input.rx_only !== false };
  if (result.compare_at_price != null && (result.retail_price == null || result.compare_at_price < result.retail_price))
    throw new Error('Compare-at price must be at least the retail price.');
  result.payment_plan=null;
  if(input.payment_plan?.enabled) {
    const plan=input.payment_plan,deposit=number(plan.deposit),installments=Number(plan.installments);
    if(!['weekly','biweekly','monthly'].includes(plan.interval)||!Number.isInteger(installments)||installments<2||installments>24)
      throw new Error('Choose 2–24 installments and a valid payment frequency.');
    if(result.retail_price==null||result.retail_price<=deposit||Math.round((result.retail_price-deposit)*100)<installments)
      throw new Error('Set a retail price above the deposit with at least one cent per installment.');
    result.payment_plan={enabled:true,deposit,installments,interval:plan.interval};
  }
  return result;
}
function sourceReview(kind='stock') {
  if(kind==='invoices') {
    const source='lovelicare-item-invoice-and-item-title-list.txt';
    const lines=fs.readFileSync(path.join(__dirname,'..',source),'utf8').split(/\r?\n/),rows=[];
    let order='';
    lines.forEach((line,i)=>{
      if(/^ORDER #/.test(line))order=line;
      const m=line.match(/^([^\t]+)\t\$(\d+(?:\.\d+)?)\t(\d+)\t\$(\d+(?:\.\d+)?)$/);
      if(!m)return;
      let title='';for(let j=i-1;j>Math.max(0,i-18);j--)if(lines[j]==='Date fulfilled'){title=lines[j-1];break;}
      if(!title)return;
      rows.push({source,original:title+' · '+order,name:title,sku:m[1],cost_price:Number(m[2]),purchase_quantity:Number(m[3]),quantity:null,unit:'unit',rx_only:false,
        review:'Historical purchase: '+m[3]+' units at $'+m[2]+' each. Confirm current stock and retail price.'});
    });
    return rows;
  }
  const source = 'lovelicare-full-inventory-vitamins.txt';
  const raw = fs.readFileSync(path.join(__dirname,'..',source),'utf8');
  if(kind==='supplies')return raw.split('——')[0].trim().split(/\r?\n/).filter(Boolean).map(line=>({source,original:line,name:line,quantity:null,unit:'unit',review:'Confirm product name, package size and count before adding.'}));
  const section = raw.split('Sellable *items Only below *')[1] || '';
  return section.trim().split(/\r?\n/).filter(Boolean).map(line => {
    const match = line.match(/^(\d+(?:\.\d+)?)-\s*([^\d].*)$/);
    return {source, original:line, quantity:match?Number(match[1]):null,
      name:match?match[2].trim():line, review:match?'Confirm product match, unit and stock before adding.':'Ambiguous count — verify against the original file.'};
  });
}
function dbError(res,error) {
  if (error.code==='40001') return res.status(409).json({error:'This product changed. Refresh before saving again.'});
  if (error.code==='23505') return res.status(409).json({error:'A product with that name and strength already exists. Edit it instead.'});
  if (error.code==='P0002') return res.status(404).json({error:'Product not found.'});
  if (error.code==='22023') return res.status(400).json({error:error.message});
  if (/PGRST20[24]|42883|42703/.test(error.code||'')) return res.status(503).json({error:'Inventory editing needs the prepared database update (0005). Your stock has not changed.'});
  console.error('[inventory]',error.code);
  return res.status(502).json({error:'Inventory could not be saved. Refresh and check the ledger before retrying.'});
}
module.exports={product,number,sourceReview,dbError,UUID,CATEGORIES};
