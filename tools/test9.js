// v8: 설득 정착, 공격 예고와 대응, 시설 성과, 표시 수정
const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2]||'.';
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8130);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 const dismiss=async()=>{for(let k=0;k<5;k++){const c=await p.$('#over:not([hidden]) #cardOk');if(!c)break;await c.tap();await p.waitForTimeout(300)}};
 await p.goto('http://localhost:8130',{waitUntil:'load'});await p.waitForTimeout(300);await p.fill('#q','소공');await p.waitForTimeout(80);await p.tap('#results button');await p.waitForTimeout(150);await p.tap('#begin');await p.waitForTimeout(400);
 // 설득 화면 안내
 const tg=await G(()=>{const g=__game,S=g.S;const t=g.D.findIndex(d=>d.n==='명동');S.owner[t]=-1;S.f[0].money=500;S.ap=3;g.select(t);return t});await p.waitForTimeout(350);
 let st=await p.textContent('#sheet');ok(/첫 달 세수·동원은 50%/.test(st)&&/달이면 회수/.test(st),'설득 버튼 정착·회수 안내');
 await p.tap('#per');await p.waitForTimeout(400);await dismiss();
 const s1=await G(t=>({f:__game.E.settleF(__game.S,t)}),tg);ok(Math.abs(s1.f-0.5)<1e-9,'설득 직후 수입 50%');
 await G(t=>__game.select(t),tg);await p.waitForTimeout(350);st=await p.textContent('#sheet');ok(/정착 중/.test(st)&&/50%/.test(st),'우리 동 화면 정착 표시');await p.screenshot({path:OUT+'/b1_settle.png'});await p.tap('.x');
 const ramp=await G(t=>{const g=__game,S=g.S,E=g.E;const r=[];for(let k=0;k<4;k++){S.month++;r.push(Math.round(E.settleF(S,t)*100))}S.month-=4;S.dev[t*4+2]=2;S.month+=1;const fast=Math.round(E.settleF(S,t)*100);S.month-=1;S.dev[t*4+2]=0;return{r,fast}},tg);
 ok(ramp.r.join()==='50,65,80,95'&&ramp.fast===50,'정착 속도 '+ramp.r.join('→')+' (주거 2단계 둘째 달 '+(await G(t=>{const g=__game,S=g.S;S.dev[t*4+2]=2;S.month+=2;const v=Math.round(g.E.settleF(S,t)*100);S.month-=2;S.dev[t*4+2]=0;return v},tg))+')');
 // 예고와 대응
 const pl=await G(()=>{const g=__game,S=g.S,E=g.E;let f=null,tgt=-1;
   for(const ff of S.f){if(!ff.ai||!ff.alive)continue;g.D[ff.cap].a.forEach(j=>{if(tgt<0&&S.owner[j]!==ff.id&&j!==S.f[0].cap){f=ff;tgt=j}});if(f)break}
   S.owner[tgt]=0;g.D[tgt].a.forEach(j=>{if(S.owner[j]===-1)S.owner[j]=0});S.dev[tgt*4+0]=3;S.dev[tgt*4+1]=3;S.dev[tgt*4+2]=2;
   S.rival=f.id;f.troops=4000;S.f[0].pact={};f.grudge=0;S.rivalPlanAt=-99;S.month=Math.max(S.month,20);S.f[0].troops=200;S.f[0].away=0;
   E.endTurn(S);return{plan:S.rivalPlan,log:S.last.map(l=>l.t).find(t=>/모이고/.test(t)),f:f.id}});
 ok(pl.plan&&/다음 달 공격 가능성 높음/.test(pl.log||'')&&/약 \d+명/.test(pl.log||''),'예고 문구: '+pl.log);
 await dismiss();await G(t=>__game.select(t),pl.plan.t);await p.waitForTimeout(350);st=await p.textContent('#sheet');
 ok(/저쪽 예상 전력/.test(st)&&/치안 (한 단계|\d+단계) 올리기/.test(st)&&/공격을 접습니다/.test(st),'대응 패널');await p.screenshot({path:OUT+'/b2_plan.png'});
 // 대비하면 물러남
 const dt=await G(()=>{const g=__game,S=g.S,E=g.E,t=S.rivalPlan.t;S.dev[t*4+3]=5;S.f[0].troops=1500;E.endTurn(S);return{log:S.last.map(l=>l.t).filter(t=>/접었습니다|미뤘습니다|막아냈습니다|빼앗겼습니다/.test(t)).join(' / '),det:S.stat.deterred||0}});
 ok(dt.det>=1&&/대비가 통했습니다/.test(dt.log),'대비하면 공격을 접음: '+dt.log);
 // 시설 덕에 막은 싸움
 const fs1=await G(()=>{const g=__game,S=g.S,E=g.E;const mine=E.dongsOf(S,0);let t=-1,hub=-1;for(const i of mine){const h=g.D[i].a.find(j=>S.owner[j]===0&&j!==S.f[0].cap);if(h!==undefined&&i!==S.f[0].cap){t=i;hub=h;break}}
   S.dev[hub*4+3]=5;S.dev[t*4+3]=3;const f=S.f.find(f=>f.ai&&f.alive);const d=E.defense(S,t);const noFac=d.base/((1+.35*3)*(1+.15*Math.min(2,(()=>{let c=0;g.D[t].a.forEach(j=>{if(S.owner[j]===0&&S.dev[j*4+3]>=3)c++});return c})())))+d.share;
   return{t,hub,noFac:Math.round(noFac),tot:Math.round(d.total)}});
 ok(fs1.tot>fs1.noFac,'치안 시설 방어 기여 계산 '+fs1.noFac+'→'+fs1.tot);
 // 세력 화면: 시설 성과·다음 공모
 await G(()=>{const g=__game,S=g.S;S.dev[S.f[0].cap*4+0]=5;S.gov.open=null;S.gov.nextAt=S.month+2;g.sync&&g.sync()});await p.tap('#cells');await p.waitForTimeout(300);st=await p.textContent('#sheet');
 ok(/시설 성과/.test(st)&&/상권 특구 · 주변 \d+곳 세수/.test(st)&&/다음 정부 공모: 약 \d+달 뒤/.test(st),'세력 화면 시설 성과·다음 공모');await p.screenshot({path:OUT+'/b3_realm.png',fullPage:true});
 ok(/\d+~\d+개 동/.test(st)||!/안개 속 어느 세력/.test(st),'안개 속 세력 규모는 범위로');await p.tap('.x');
 // 3달 성과 로그
 const rep=await G(()=>{const g=__game,S=g.S,E=g.E;S.facAcc={tax:0,draft:0,n:2};E.endTurn(S);return S.last.map(l=>l.t).find(t=>/시설 성과\(3달\)/.test(t))||null});ok(!!rep,'3달 시설 성과 소식: '+rep);
 // 공모 화면 총비용·완공·순이익
 await dismiss();await G(()=>{const g=__game,S=g.S;S.gov.open={k:'agency',until:S.month+3};g.sync&&g.sync()});await p.waitForTimeout(150);
 if(await p.isVisible('#govBar')){await p.tap('#govBar');await p.waitForTimeout(300);st=await p.textContent('#sheet');ok(/준비까지 총비용/.test(st)&&/완공 후 순이익/.test(st)&&/달이면 회수/.test(st),'공모 화면 총비용·완공·순이익');await p.screenshot({path:OUT+'/b4_gov.png'});await p.tap('.x')}else ok(false,'공모 막대');
 // 정부 사업 세수 합산 표시
 const gt=await G(()=>{const g=__game,S=g.S,cap=S.f[0].cap;S.gov.sites[cap]={k:'agency',start:0,done:0,pact:false,paid:0};g.select(cap);return true});await p.waitForTimeout(350);st=await p.textContent('#sheet');ok(/기본 [\d,.]+억 \+ 정부 사업 [\d,.]+억/.test(st),'동 세수에 정부 사업 합산');await p.tap('.x');
 // 스카우트 사유
 const sc=await G(()=>{const g=__game,S=g.S,E=g.E;const f=S.f.find(f=>f.ai&&f.alive);f.grudge=S.month+3;f.grudgeWhy='scout';return E.pactCheck(S,f.id).why});ok(/회원을 빼 가서/.test(sc),'스카우트 후 협정 거절 사유: '+sc);
 // 민원 효과 없음 안내
 await G(()=>{const g=__game,S=g.S;g.E.dongsOf(S,0).forEach(i=>S.min[i]=100);S.ev={id:0,exp:S.month+3};g.sync&&g.sync()});await p.waitForTimeout(150);
 if(await p.isVisible('#evBar')){await p.tap('#evBar');await p.waitForTimeout(300);st=await p.textContent('#sheet');ok(/당장 효과는 거의 없음/.test(st),'민심 가득일 때 효과 없음 안내');await p.tap('.x')}
 console.log('errors',errs);await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
