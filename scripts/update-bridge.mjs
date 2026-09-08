import fs from 'node:fs/promises';

const OUT = new URL('../data/bridge.json', import.meta.url);

const endpoints = {
  fx: 'https://api.hkma.gov.hk/public/market-data-and-statistics/monthly-statistical-bulletin/er-ir/er-eeri-daily',
  interbank: 'https://api.hkma.gov.hk/public/market-data-and-statistics/daily-monetary-statistics/daily-figures-interbank-liquidity',
  rmb: 'https://api.hkma.gov.hk/public/market-data-and-statistics/daily-monetary-statistics/usage-rmb-liquidity-fac'
};

const clamp = (v,a=0,b=100) => Math.max(a,Math.min(b,Number(v)||0));
const num = v => {
  if(v === null || v === undefined || v === '' || v === 'N.A.') return null;
  const x = Number(String(v).replace(/,/g,''));
  return Number.isFinite(x) ? x : null;
};
const dateOf = r => r.end_of_date || r.end_of_day || r.end_of_month || '';
const sortAsc = rows => [...rows].sort((a,b)=>String(dateOf(a)).localeCompare(String(dateOf(b))));

async function hkma(url, sortby, pagesize=400){
  const u = new URL(url);
  u.searchParams.set('pagesize',String(pagesize));
  u.searchParams.set('offset','0');
  u.searchParams.set('sortby',sortby);
  u.searchParams.set('sortorder','desc');
  const res = await fetch(u, {headers:{'user-agent':'BondStats Monetary Bridge/1.0'}});
  if(!res.ok) throw new Error(`${res.status} ${u}`);
  const json = await res.json();
  if(!json?.result?.records || !Array.isArray(json.result.records)) throw new Error(`Unexpected HKMA response: ${u}`);
  return json.result.records;
}

function percentileRank(values, value, inverse=false){
  const xs=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!xs.length || !Number.isFinite(value)) return 50;
  let count=0; for(const x of xs) if(x<=value) count++;
  const p=(count/xs.length)*100;
  return clamp(inverse ? 100-p : p);
}

function rmbUsage1600(r){
  const vals=['intraday_repo_at_1600','overnight_repo_at_1600','plp_fac_at_1600'].map(k=>num(r[k])).filter(Number.isFinite);
  if(vals.length) return vals.reduce((a,b)=>a+b,0);
  let best=0;
  for(const t of ['0900','1100','1400','1600']){
    const v=['intraday_repo_at_','overnight_repo_at_','plp_fac_at_'].map(k=>num(r[k+t])).filter(Number.isFinite).reduce((a,b)=>a+b,0);
    best=Math.max(best,v);
  }
  return best;
}

function abs20dMomentum(rows, idx){
  if(idx<20) return null;
  const a=num(rows[idx].cny), b=num(rows[idx-20].cny);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b===0) return null;
  return Math.abs((a/b-1)*100);
}
function signed20d(rows, idx){
  if(idx<20) return null;
  const a=num(rows[idx].cny), b=num(rows[idx-20].cny);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b===0) return null;
  return (a/b-1)*100;
}

const [fxDesc, ibDesc, rmbDesc] = await Promise.all([
  hkma(endpoints.fx,'end_of_day',400),
  hkma(endpoints.interbank,'end_of_date',400),
  hkma(endpoints.rmb,'end_of_date',400)
]);

const fx=sortAsc(fxDesc);
const ib=sortAsc(ibDesc);
const rmb=sortAsc(rmbDesc);
const ibMap=new Map(ib.map(r=>[dateOf(r),r]));
const rmbMap=new Map(rmb.map(r=>[dateOf(r),r]));

const common = fx.filter(r=>ibMap.has(dateOf(r)));
if(!common.length) throw new Error('No overlapping HKMA FX/interbank dates.');

const hiborSeries=ib.map(r=>num(r.hibor_fixing_1m)).filter(Number.isFinite);
const balanceSeries=ib.map(r=>num(r.closing_balance)).filter(Number.isFinite);
const rmbUsageSeries=rmb.map(r=>rmbUsage1600(r)).filter(Number.isFinite);
const fxMomSeries=fx.map((r,i)=>abs20dMomentum(fx,i)).filter(Number.isFinite);

function calculate(fxRow){
  const d=dateOf(fxRow);
  const ibRow=ibMap.get(d) || [...ib].reverse().find(x=>dateOf(x)<=d);
  const rmbRow=rmbMap.get(d) || [...rmb].reverse().find(x=>dateOf(x)<=d);
  const usd=num(fxRow.usd);
  const cny=num(fxRow.cny);
  const hibor=num(ibRow?.hibor_fixing_1m);
  const balance=num(ibRow?.closing_balance);
  const base=num(ibRow?.disc_win_base_rate);
  const rmbUse=rmbRow ? rmbUsage1600(rmbRow) : null;

  const pegPosition = Number.isFinite(usd) ? clamp((usd-7.75)/0.10*100) : null;
  const pegPressure = Number.isFinite(usd) ? clamp(Math.abs(usd-7.80)/0.05*100) : 50;
  const fundingPressure=percentileRank(hiborSeries,hibor);
  const liquidityPressure=percentileRank(balanceSeries,balance,true);
  const rmbPressure=percentileRank(rmbUsageSeries,rmbUse);
  const idx=fx.findIndex(x=>dateOf(x)===d);
  const mom=abs20dMomentum(fx,idx);
  const fxPressure=percentileRank(fxMomSeries,mom);
  const composite=clamp(
    pegPressure*.30 +
    fundingPressure*.25 +
    liquidityPressure*.20 +
    rmbPressure*.15 +
    fxPressure*.10
  );

  return {
    date:d,
    pressureIndex:Number(composite.toFixed(1)),
    usdHkd:usd,
    cnyHkd:cny,
    cnyUsd:Number.isFinite(cny)&&Number.isFinite(usd)&&usd!==0 ? Number((cny/usd).toFixed(6)) : null,
    pegPosition:Number.isFinite(pegPosition)?Number(pegPosition.toFixed(1)):null,
    aggregateBalance:balance,
    hibor1m:hibor,
    baseRate:base,
    rmbFacility1600:rmbUse,
    cnyHkdChange20d:signed20d(fx,idx),
    signals:{
      peg:Number(pegPressure.toFixed(1)),
      funding:Number(fundingPressure.toFixed(1)),
      liquidity:Number(liquidityPressure.toFixed(1)),
      rmbFacility:Number(rmbPressure.toFixed(1)),
      fxMomentum:Number(fxPressure.toFixed(1))
    }
  };
}

const history=common.slice(-300).map(calculate).filter(x=>Number.isFinite(x.pressureIndex));
const currentRaw=history[history.length-1];
if(!currentRaw) throw new Error('No current bridge observation could be calculated.');

const output={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  status:'live',
  title:'BondStats China–Hong Kong Monetary Bridge',
  methodology:'BS-MBPI v1',
  current:{
    asOf:currentRaw.date,
    pressureIndex:currentRaw.pressureIndex,
    usdHkd:currentRaw.usdHkd,
    cnyHkd:currentRaw.cnyHkd,
    cnyUsd:currentRaw.cnyUsd,
    pegPosition:currentRaw.pegPosition,
    aggregateBalance:currentRaw.aggregateBalance,
    hibor1m:currentRaw.hibor1m,
    baseRate:currentRaw.baseRate,
    rmbFacility1600:currentRaw.rmbFacility1600,
    cnyHkdChange20d:Number.isFinite(currentRaw.cnyHkdChange20d)?Number(currentRaw.cnyHkdChange20d.toFixed(2)):null,
    signals:currentRaw.signals
  },
  history:history.map(x=>({date:x.date,pressureIndex:x.pressureIndex})),
  sources:[
    {name:'HKMA exchange rates and effective exchange rate indices — daily',url:endpoints.fx},
    {name:'HKMA daily figures of interbank liquidity',url:endpoints.interbank},
    {name:'HKMA usage of Renminbi Liquidity Facility',url:endpoints.rmb}
  ],
  notes:[
    'RMB/HKD is the HKMA published Chinese renminbi exchange-rate reference in HKD per RMB.',
    'RMB/USD is derived from the two HKMA HKD reference rates; it is not presented as a separate tradable CNH quote.',
    'Bridge Pressure Index is a BondStats analytical composite and is not an official HKMA, PBOC or HKEX indicator.'
  ]
};

await fs.writeFile(OUT, JSON.stringify(output,null,2)+'\n','utf8');
console.log(`updated=${output.current.asOf} pressure=${output.current.pressureIndex}`);
