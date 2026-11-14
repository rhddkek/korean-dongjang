const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8129);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 await p.goto('http://localhost:8129',{waitUntil:'load'});await p.waitForTimeout(300);await p.tap('#begin');await p.waitForTimeout(400);
 // 동 5개 확보 + 개발
 await G(()=>{const g=__game,S=g.S;S.f[0].money=3000;for(let k=0;k<5;k++){const i=g.D.findIndex((d,ix)=>S.owner[ix]===-1&&d.a.some(j=>S.owner[j]===0));S.owner[i]=0}g.E.dongsOf(S,0).forEach(i=>{S.dev[i*4+1]=2;S.dev[i*4+2]=2});S.gov.nextAt=S.month+1});
 await p.tap('#next');await p.waitForTimeout(300);
 ok(await p.isVisible('#govBar'),'정부 공모 알림줄: '+await p.textContent('#govBar'));
 await p.tap('#govBar');await p.waitForTimeout(300);await p.screenshot({path:OUT+'/95_gov.png'});
 const k1=await G(()=>__game.S.gov.open.k);const t0=await G(()=>__game.E.economy(__game.S,0).tax);
 const pick=await G(()=>+document.querySelector('.gv').dataset.i);await p.tap('.gv');await p.waitForTimeout(300);
 ok(await G(i=>!!__game.S.gov.sites[i],pick),k1+' 유치: '+await p.textContent('#news'));
 for(let m=0;m<4;m++){await p.waitForTimeout(320);await p.tap('#next');await p.waitForTimeout(150)}
 const t1=await G(()=>__game.E.economy(__game.S,0).tax);ok(k1!=='agency'||t1>t0+15,'공공기관 완공 후 수입 증가 '+Math.round(t0)+'→'+Math.round(t1));
 await G(i=>__game.select(i),pick);await p.waitForTimeout(350);ok((await p.textContent('#sheet')).includes('정부 사업'),'동 화면 정부 사업 표시');await p.screenshot({path:OUT+'/96_badge.png'});await p.tap('.x');
 // 자원회수시설: 지원금과 민심
 const pr=await G(()=>{const g=__game,S=g.S,E=g.E;S.gov.open={k:'plant',until:S.month+3};S.ap=3;const i=E.govInfo(S).ok[0];const m0=S.f[0].money,mo0=S.min[i];const r=E.govApply(S,i);const m1=S.f[0].money;return{r,dm:m1-m0,mood:[mo0,S.min[i]],i}});
 ok(pr.r.ok&&pr.dm===150&&pr.mood[1]<=pr.mood[0]-15,'자원회수시설: 착공 지원금 150억, 민심 '+pr.mood.join('→'));
 const pr2=await G(i=>{const g=__game,S=g.S,E=g.E;const m0=S.f[0].money;for(let k=0;k<2;k++)E.endTurn(S);return{log:S.log.slice(0,12).map(l=>l.t).find(t=>/준공/.test(t))||null,paid:S.gov.sites[i].paid}},pr.i);
 ok(pr2.paid===2&&/100억/.test(pr2.log||''),'자원회수시설 준공 지원금: '+pr2.log);
 await G(i=>__game.select(i),pr.i);await p.waitForTimeout(350);await p.tap('#govPact');await p.waitForTimeout(150);ok(await G(i=>__game.S.gov.sites[i].pact,pr.i),'주민협약');await p.tap('.x');
 // 신청 안 하면 AI 배정
 const ai=await G(()=>{const g=__game,S=g.S,E=g.E;
   // 다른 세력 하나가 조건(주거 2단계)과 부담금을 채우게 만듦
   const f=S.f.find(f=>f.ai&&f.alive&&g.E.dongsOf(S,f.id).length>1);const d=g.E.dongsOf(S,f.id).find(i=>i!==f.cap&&!S.gov.sites[i]);S.dev[d*4+2]=3;f.money=500;
   S.gov.open={k:'hospital',until:S.month+1};const rv=E.govInfo(S).rivals;const before=Object.keys(S.gov.sites).length;E.endTurn(S);const ks=Object.keys(S.gov.sites);const last=ks.find(i=>S.gov.sites[i].k==='hospital');
   return{rv:rv.length,before,after:ks.length,owner:last!==undefined?S.owner[last]:null,paid:500-f.money,log:S.last.map(l=>l.t).find(t=>/공모 결과/.test(t))}});
 ok(ai.rv>=1&&ai.after===ai.before+1&&ai.owner>0&&ai.paid>=150,'조건 채운 다른 세력 선정(부담금 납부): '+ai.log);
 const nob=await G(()=>{const g=__game,S=g.S,E=g.E;S.f.forEach(f=>{if(f.ai)f.money=0});S.gov.open={k:'agency',until:S.month+1};const before=Object.keys(S.gov.sites).length;E.endTurn(S);return{same:Object.keys(S.gov.sites).length===before,log:S.last.map(l=>l.t).find(t=>/공모 결과/.test(t))}});
 ok(nob.same&&/유찰/.test(nob.log||''),'신청 없으면 유찰: '+nob.log);
 // 저장 호환
 await G(()=>{const c=JSON.parse(localStorage.getItem('dongjang-save-v1'));delete c.gov;localStorage.setItem('dongjang-save-v1',JSON.stringify(c))});await p.reload({waitUntil:'load'});await p.waitForTimeout(300);await p.tap('#resume');await p.waitForTimeout(250);ok(await G(()=>!!__game.S.gov),'구버전 저장 호환');
 console.log('errors',errs);await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
