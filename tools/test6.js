const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8128);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 await p.goto('http://localhost:8128',{waitUntil:'load'});await p.waitForTimeout(300);await p.fill('#q','신림');await p.waitForTimeout(80);await p.tap('#results button');await p.waitForTimeout(150);await p.tap('#begin');await p.waitForTimeout(400);
 // 시설
 await G(()=>{__game.S.f[0].money=3000;__game.select(__game.S.f[0].cap)});await p.waitForTimeout(400);
 const first=await p.textContent('.dev:nth-of-type(4) button').catch(()=>null);
 const btns=await p.$$('.dev button');await btns[3].tap();await p.waitForTimeout(400);
 const news=await p.textContent('#news');ok(/신림 방범대 창설/.test(news),'방범대 창설: '+news);
 for(let k=0;k<4;k++){const bb=await p.$$('.dev button');await bb[3].tap();await p.waitForTimeout(350)}
 ok(await G(()=>__game.E.lv(__game.S,__game.S.f[0].cap,3)===5),'치안 5단계 자치소방서');console.log(' news:',await p.textContent('#news'));
 await p.screenshot({path:OUT+'/90_facility.png'});
 // 이웃 방어 보너스
 const nb=await G(()=>{const g=__game,S=g.S;const j=g.D[S.f[0].cap].a[0];const before=g.E.defense(S,j).base;S.owner[j]=0;const after=g.E.defense(S,j).base;return {before,after}});ok(nb.after>nb.before,'자치경찰대 옆 동 방어 보너스 '+Math.round(nb.before)+'→'+Math.round(nb.after));
 await p.tap('.x');
 // 구 작전: 대상 1곳이면 결재 1건
 const one=await G(()=>{const g=__game,S=g.S,E=g.E;S.rank=1;S.promo=0;S.f[0].troops=5000;S.ap=3;for(let gi=0;gi<25;gi++){const pv=E.guAttackPreview(S,gi,0);if(pv.count>=1){let ts=E.guTargets(S,gi);for(let q=0;q<12&&ts.length>1;q++){ts.slice(1).forEach(t=>S.owner[t.i]=0);ts=E.guTargets(S,gi)}const pv2=E.guAttackPreview(S,gi,0);if(pv2.count===1)return{gi,ap:pv2.ap,need:pv2.need,single:E.needFor(S,ts[0].i,.8)}}}return null});
 ok(one&&one.ap===1&&one.need===one.single,'대상 1곳 구 작전 = 결재 1건, 인원 개별과 같음 '+JSON.stringify(one));
 // 숙적이 무너진 틈을 노림
 const pz=await G(()=>{const g=__game,S=g.S,E=g.E;S.month=14;S.rank=1;const f=S.f.find(x=>x.ai&&x.alive);S.rival=f.id;f.troops=8000;
   const mine=E.dongsOf(S,0);for(let k=0;k<8;k++){const i=g.D.findIndex((d,ix)=>S.owner[ix]===-1&&d.a.some(j=>S.owner[j]===0));if(i>=0)S.owner[i]=0}
   const b=E.dongsOf(S,0).find(i=>g.D[i].a.some(j=>S.owner[j]===-1));S.owner[g.D[b].a.find(j=>S.owner[j]===-1)]=f.id;
   S.weakAt=S.month;S.f[0].troops=10;S.rivalPlanAt=S.month;E.endTurn(S);return S.last.filter(l=>l.k==='riv'||l.k==='bad').map(l=>l.t)});
 ok(pz.some(t=>/틈을 노립니다|걸어 잠그고/.test(t)),'숙적의 틈 노리기: '+pz.slice(0,3).join(' / '));
 // 민원 민심 효과 표시
 await G(()=>{const S=__game.S;S.ev={id:4,exp:S.month+3}});await p.tap('#next').catch(()=>{});await p.waitForTimeout(400);
 await G(()=>{const S=__game.S;S.ev={id:4,exp:S.month+3}});await G(()=>{document.getElementById('evBar').hidden=false});await p.tap('#evBar');await p.waitForTimeout(300);
 const evt=await p.textContent('#sheet');ok(/수입 [+−]/.test(evt),'민원 민심 효과에 수입 환산 표시');await p.screenshot({path:OUT+'/91_event.png'});
 console.log('errors',errs);await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
