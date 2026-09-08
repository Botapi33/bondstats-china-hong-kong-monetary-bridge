const $ = (id) => document.getElementById(id);
let payload = null;
let range = 260;

function n(v, d=2){
  const x = Number(v);
  return Number.isFinite(x) ? x.toFixed(d) : '—';
}
function fmt(v, d=0){
  const x = Number(v);
  if(!Number.isFinite(x)) return '—';
  return x.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d});
}
function pct(v){
  const x = Math.max(0,Math.min(100,Number(v)||0));
  return `${Math.round(x)}`;
}
function setBar(id,v){
  const el=$(id); if(el) el.style.width=`${Math.max(0,Math.min(100,Number(v)||0))}%`;
}
function regime(score){
  if(score < 20) return 'OPEN';
  if(score < 40) return 'NORMAL';
  if(score < 60) return 'FRICTION';
  if(score < 80) return 'PRESSURE';
  return 'DISLOCATION';
}
function render(){
  if(!payload) return;
  const cur = payload.current || {};
  const sig = cur.signals || {};
  const score = Number(cur.pressureIndex);

  $('freshness').textContent = payload.status === 'live'
    ? `official data refreshed · ${payload.generatedAt?.slice(0,16).replace('T',' ')} UTC`
    : 'awaiting official data refresh';
  $('sourceHealth').textContent = payload.status === 'live' ? 'Official source layer live' : 'Awaiting first automated refresh';
  $('asOf').textContent = cur.asOf || '—';
  $('pressureScore').textContent = Number.isFinite(score) ? Math.round(score) : '—';
  $('pressureRegime').textContent = Number.isFinite(score) ? regime(score) : 'Awaiting refresh';
  if(Number.isFinite(score)) $('pressurePointer').style.left = `${Math.max(0,Math.min(100,score))}%`;

  $('cnyHkd').textContent = n(cur.cnyHkd,4);
  $('usdHkd').textContent = n(cur.usdHkd,4);
  $('cnyUsd').textContent = n(cur.cnyUsd,4);
  $('aggregateBalance').textContent = fmt(cur.aggregateBalance,0);
  $('hibor1m').textContent = n(cur.hibor1m,3);
  $('baseRate').textContent = n(cur.baseRate,3);
  $('rmbFacility').textContent = fmt(cur.rmbFacility1600,0);

  if(Number.isFinite(Number(cur.cnyHkdChange20d))){
    const v=Number(cur.cnyHkdChange20d);
    $('cnyHkdChange').textContent = `${v>=0?'+':''}${v.toFixed(2)}% over 20 sessions`;
  }

  if(Number.isFinite(Number(cur.pegPosition))){
    const pos=Math.max(0,Math.min(100,Number(cur.pegPosition)));
    $('pegPointer').style.left=`${pos}%`;
    $('pegPositionLabel').textContent=`${pos.toFixed(1)}% across 7.75–7.85 band`;
  }

  setBar('sigPeg',sig.peg);
  setBar('sigFunding',sig.funding);
  setBar('sigLiquidity',sig.liquidity);
  setBar('sigRmb',sig.rmbFacility);
  setBar('sigFx',sig.fxMomentum);

  $('sigPegVal').textContent=pct(sig.peg);
  $('sigFundingVal').textContent=pct(sig.funding);
  $('sigLiquidityVal').textContent=pct(sig.liquidity);
  $('sigRmbVal').textContent=pct(sig.rmbFacility);
  $('sigFxVal').textContent=pct(sig.fxMomentum);

  drawChart();
}

function drawChart(){
  const canvas=$('pressureChart');
  if(!canvas || !payload) return;
  const rows=(payload.history||[]).slice(-range);
  const box=canvas.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;
  canvas.width=Math.max(400,Math.floor(box.width*dpr));
  canvas.height=Math.max(220,Math.floor(box.height*dpr));
  const ctx=canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  const w=box.width,h=box.height;
  ctx.clearRect(0,0,w,h);

  ctx.strokeStyle='#1f2a23';
  ctx.lineWidth=1;
  [0,25,50,75,100].forEach(v=>{
    const y=h-18-(v/100)*(h-36);
    ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();
  });
  if(rows.length<2){
    ctx.fillStyle='#667269';
    ctx.font='11px ui-monospace, monospace';
    ctx.fillText('Run the GitHub Action once to build the live pressure history.',18,38);
    return;
  }
  const points=rows.map((r,i)=>({
    x:(i/(rows.length-1))*w,
    y:h-18-(Math.max(0,Math.min(100,Number(r.pressureIndex)||0))/100)*(h-36)
  }));
  ctx.beginPath();
  points.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.strokeStyle='#68d99a';
  ctx.lineWidth=1.8;
  ctx.shadowBlur=10;
  ctx.shadowColor='rgba(104,217,154,.22)';
  ctx.stroke();
  ctx.shadowBlur=0;

  const last=points[points.length-1];
  ctx.fillStyle='#eef0ec';
  ctx.beginPath();ctx.arc(last.x,last.y,3.2,0,Math.PI*2);ctx.fill();
}

document.querySelectorAll('[data-range]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-range]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    range=Number(btn.dataset.range);
    drawChart();
  });
});
window.addEventListener('resize',drawChart);

fetch('./data/bridge.json',{cache:'no-store'})
  .then(r=>r.ok?r.json():Promise.reject(new Error('data unavailable')))
  .then(d=>{payload=d;render();})
  .catch(()=>{ $('freshness').textContent='awaiting first automated refresh'; drawChart(); });
