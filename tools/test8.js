// v7: 시설 예정 효과, 생존 협상, 빈집 경고, 급행 바로 복귀 3번, 안전센터, 숙적의 시설 노림·빈집 노림
const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2]||'.';
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8129);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 const dismiss=async()=>{for(let k=0;k<5;k++){const c=await p.$('#over:not([hidden]) #cardOk');if(!c)break;await c.tap();await p.waitForTimeout(300)}};
 await p.goto('http://localhost:8129',{waitUntil:'load'});await p.waitForTimeout(300);await p.fill('#q','서교');await p.waitForTimeout(80);await p.tap('#results button');await p.waitForTimeout(150);await p.tap('#begin');await p.waitForTimeout(400);
 // 우리 동 몇 개 확보한 상태로 만듦
 await G(()=>{const g=__game,S=g.S,cap=S.f[0].cap;g.D[cap].a.forEach(j=>{S.owner[j]=0});S.month=12;S.f[0].money=5000;S.f[0].troops=3000;S.ap=5;g.select(cap)});await p.waitForTimeout(400);
 const sheet=await p.textContent('#sheet');
 ok(/5단계 상권 특구까지 남은 투자 .*옆 우리 동 \d+곳 세수 \+\d+억\/월/.test(sheet),'상권 5단계 예정 효과 표시');
 ok(/3단계 자치경찰대까지.*방어 합계/.test(sheet),'치안 3단계 예정 효과 표시');
 await p.screenshot({path:OUT+'/a1_preview.png',fullPage:false});
 const pv=await G(()=>{const g=__game,S=g.S,cap=S.f[0].cap;return g.E.spPreview(S,cap,0)});ok(pv&&pv.val>0&&pv.cost>0,'spPreview 상권 '+JSON.stringify(pv));
 await p.tap('.x');
 // 급행: 바로 복귀 3번
 const ex=await G(()=>{const g=__game,S=g.S,E=g.E;S.abil='station';S.express=-99;S.ap=10;S.f[0].money=5000;S.f[0].troops=20000;const r=E.express(S);let q=0,n=0;
   const ts=[];E.dongsOf(S,0).forEach(i=>E.subwayOf(i,S).forEach(t=>{if(S.owner[t]!==0&&ts.indexOf(t)<0)ts.push(t)}));
   for(const t of ts){const pv=E.preview(S,t,1);if(pv.reason||pv.route.via!=='subway')continue;const rr=E.attack(S,t,E.needFor(S,t,.9));if(rr.err)continue;n++;if(rr.quick)q++;if(n>=5)break}
   return{ok:r.ok,n,q,cost:E.expressInfo(S).cost}});
 ok(ex.ok&&ex.n>=4&&ex.q===3,'급행 바로 복귀는 3번까지 ('+ex.q+'/'+ex.n+')');
 // 안전센터
 const sf=await G(()=>{const g=__game,S=g.S,E=g.E;const i=E.dongsOf(S,0).find(i=>i!==S.f[0].cap&&!S.gov.sites[i]);S.dev[i*4+3]=2;S.gov.open={k:'safety',until:S.month+3};S.ap=3;const m0=S.min[i]=50;const r=E.govApply(S,i);return{r,lv:E.lv(S,i,3),mood:S.min[i]}});
 ok(sf.r.ok&&sf.lv===3&&sf.mood===60,'광역 안전센터: 치안 +1단계, 민심 +10');
 // 생존 협상
 const of=await G(()=>{const g=__game,S=g.S,E=g.E;const f=S.f.find(f=>f.ai&&f.alive);
   g.D[f.cap].a.slice(0,3).forEach(j=>{if(j!==S.f[0].cap)S.owner[j]=f.id});
   // 숙적을 약하게 만들고 우리와 맞닿게
   const ds=E.dongsOf(S,f.id);S.rival=f.id;f.troops=10;f.offered=false;S.offerAt=-99;S.offer=null;S.f[0].troops=5000;
   const nb=g.D[ds[0]].a.find(j=>S.owner[j]!==f.id);if(nb!==undefined)S.owner[nb]=0;
   for(let k=0;k<40;k++){const x=g.D.findIndex((d,i)=>S.owner[i]===-1);if(x<0)break;S.owner[x]=0}
   S.month=20;S.f[0].pact={};const pre={n:E.dongsOf(S,f.id).length,me:E.dongsOf(S,0).length,offerAt:S.offerAt};E.endTurn(S);return{offer:!!S.offer,name:f.name,log:S.last.map(l=>l.t).find(t=>/생존 협상/.test(t))||JSON.stringify({pre,alive:f.alive,n:E.dongsOf(S,f.id).length,ft:Math.round(f.troops),mt:Math.round(S.f[0].troops),offered:f.offered,off:S.offer,logs:S.last.map(l=>l.t).slice(0,6)})}});
 ok(of.offer,'약한 숙적의 생존 협상 제안: '+of.log);
 await G(()=>{__game.S.ap=3;__game.S.f[0].money=5000});await p.tap('#next').catch(()=>{});await p.waitForTimeout(100);
 await G(()=>{const g=__game;g.S.offer=g.S.offer||null});
 await dismiss();
 const barVis=await p.isVisible('#offerBar');ok(barVis,'협상 제안 막대 표시');
 if(barVis){await p.tap('#offerBar');await p.waitForTimeout(300);await p.screenshot({path:OUT+'/a2_offer.png'});const st=await p.textContent('#sheet');ok(/생존 협상/.test(st)&&/위로금/.test(st),'협상 화면');
  const before=await G(()=>__game.E.dongsOf(__game.S,0).length);await p.tap('#offYes');await p.waitForTimeout(400);const after=await G(()=>({n:__game.E.dongsOf(__game.S,0).length,rival:__game.S.rival,pact:Object.keys(__game.S.f[0].pact).length}));
  ok(after.n>before&&after.pact>=1,'협상 타결: 동 '+before+'→'+after.n+' · '+await p.textContent('#news'));await p.screenshot({path:OUT+'/a3_deal.png'})}
 // 숙적: 공사판 노림
 const pz=await G(()=>{const g=__game,S=g.S,E=g.E;S.rivalPlanAt=-99;S.rivalPlan=null;
   // 새 숙적: 우리와 맞닿은 세력 중 하나를 강하게
   let f=null,tgt=-1;for(const ff of S.f){if(!ff.ai||!ff.alive)continue;for(const i of E.dongsOf(S,ff.id)){const j=g.D[i].a.find(j=>S.owner[j]===0&&j!==S.f[0].cap&&!S.gov.sites[j]);if(j!==undefined){f=ff;tgt=j;break}}if(f)break}
   if(!f)return null;S.rival=f.id;f.troops=20000;S.f[0].troops=50;S.f[0].away=0;S.f[0].pact={};S.gov.sites[tgt]={k:'agency',start:S.month,done:S.month+3,pact:false,paid:0};
   S.month=Math.max(S.month,20);E.endTurn(S);return{plan:S.rivalPlan,tgt,log:S.last.map(l=>l.t).find(t=>/모이고/.test(t))}});
 ok(pz&&pz.plan&&/공사판|시설 밀집지/.test(pz.log||''),'숙적이 공사판을 노림: '+(pz&&pz.log));
 // 빈집 노림
 const op=await G(()=>{const g=__game,S=g.S,E=g.E;const f=S.f[S.rival];S.rivalHitAt=-99;S.weakAt=-9;S.f[0].away=9000;S.f[0].troops=100;f.troops=20000;S.rivalPlan=null;S.f[0].pact={};E.endTurn(S);return S.last.map(l=>l.t).find(t=>/비어 있는 틈/.test(t))||null});
 ok(!!op,'숙적이 빈집을 노림: '+op);
 // 공격 화면 빈집 경고
 await dismiss();await G(()=>{const g=__game,S=g.S,E=g.E;S.f[0].away=0;S.f[0].troops=3000;S.ap=5;const f=S.f[S.rival];const t=E.dongsOf(S,0).map(i=>g.D[i].a.find(j=>S.owner[j]!==0&&S.owner[j]!==S.rival)).find(x=>x!==undefined);g.select(t)});await p.waitForTimeout(300);
 await G(()=>{const r=document.querySelector('#sheet input[type=range]');if(r){r.value=r.max;r.dispatchEvent(new Event('input',{bubbles:true}))}});await p.waitForTimeout(200);
 const st2=await p.textContent('#sheet');ok(/빈집을 노릴 수 있습니다/.test(st2),'출동 화면 빈집 경고');await p.screenshot({path:OUT+'/a4_empty.png'});
 // 메뉴 규칙
 await dismiss();await p.tap('.x').catch(()=>{});await p.tap('#menuBtn');await p.waitForTimeout(200);const mt=await p.textContent('#sheet');ok(/2곳까지만 겹칩니다/.test(mt)&&/유찰/.test(mt)&&/생존|협상/.test(mt),'규칙에 겹침·유찰·협상 설명');
 console.log('errors',errs);await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
