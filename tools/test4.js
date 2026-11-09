const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8126);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 async function start(name){await p.goto('http://localhost:8126',{waitUntil:'load'});await p.waitForTimeout(300);await p.fill('#q',name);await p.waitForTimeout(80);await p.tap('#results button');await p.waitForTimeout(200);await p.tap('#begin');await p.waitForTimeout(300)}
 // 오피스: 스카우트
 await start('소공동');await p.screenshot({path:OUT+'/70_office_start.png'});
 ok(await G(()=>__game.S.abil==='office'),'소공동 = 오피스 능력');
 await G(()=>{const g=__game,S=g.S;const D=g.D;for(let j=0;j<D.length;j++)if(S.owner[j]>0){S.owner[D[j].a[0]]=0;S.f[0].money=5000;g.select(j);return}});await p.waitForTimeout(400);await p.screenshot({path:OUT+'/71_scout.png'});
 const t0=await G(()=>__game.S.f[0].troops);await p.evaluate(()=>{const d=document.getElementById('diplo');if(d)d.open=true});await p.tap('#scout');await p.waitForTimeout(150);ok(await G(t=>__game.S.f[0].troops>t,t0),'스카우트 제안 실행: '+await p.textContent('#news'));
 // 대단지: 주민투표
 await G(()=>localStorage.clear());await start('진관동');ok(await G(()=>__game.S.abil==='town'),'진관동 = 대단지 능력');
 const vt=await G(()=>{const g=__game,S=g.S;for(const j of g.D[S.f[0].cap].a)if(S.owner[j]===-1){g.select(j);return j}});await p.waitForTimeout(400);await p.screenshot({path:OUT+'/72_vote.png'});
 await p.tap('#vote');await p.waitForTimeout(400);ok(await G(()=>!!__game.S.vote),'주민투표 발의');await p.tap('#next');await p.waitForTimeout(200);ok(await G(j=>__game.S.owner[j]===0,vt),'다음 달 가결 합류: '+await p.textContent('#news'));
 // 역세권: 급행
 await G(()=>localStorage.clear());await start('서교동');ok(await G(()=>__game.S.abil==='station'),'서교동 = 역세권 능력');
 await p.tap('#cells');await p.waitForTimeout(200);await p.screenshot({path:OUT+'/73_realm.png'});const r0=await G(()=>Object.keys(__game.E.subwayOf(__game.S.f[0].cap)).length);
 await p.tap('#express');await p.waitForTimeout(150);ok(await G(()=>__game.S.express===__game.S.month),'급행 원정 켜기');
 const r1=await G(()=>{const g=__game;let n=0;Object.keys(g.__reach||{});for(const i of g.E.dongsOf(g.S,0))n+=g.E.subwayOf(i,g.S).length;return n});ok(r1>r0,'기습 범위 확대 '+r0+'→'+r1);await p.tap('.x');
 // 주택가: 반상회 + 구청장 사업
 await G(()=>localStorage.clear());await start('상계8동');ok(await G(()=>__game.S.abil==='other'),'상계8동 = 반상회');
 await G(()=>{const S=__game.S;__game.E.dongsOf(S,0).forEach(i=>S.min[i]=50);S.f[0].money=3000});await p.tap('#cells');await p.waitForTimeout(150);await p.tap('#rally');await p.waitForTimeout(100);ok(await G(()=>__game.S.min[__game.S.f[0].cap]===70),'반상회 민심 +20');
 await G(()=>{const g=__game,S=g.S,gu=g.D[S.f[0].cap].g;g.E.guDongs()[gu].slice(0,12).forEach(i=>S.owner[i]=0);S.rank=1;S.promo=0;g.E.dongsOf(S,0).forEach(i=>S.min[i]=30)});await p.tap('.x');await p.tap('#cells');await p.waitForTimeout(150);await p.screenshot({path:OUT+'/74_projects.png'});
 await p.tap('#unity');await p.waitForTimeout(400);ok(await G(()=>__game.S.min[__game.S.f[0].cap]===100&&Object.keys(__game.S.stable).length===1),'구민 화합 사업');
 await p.tap('#exprProj');await p.waitForTimeout(100);ok(await G(()=>__game.S.exprProj===true),'광역 급행 사업');await p.tap('.x');
 // 숙적 예고 → 실제 작전
 await G(()=>{const g=__game,S=g.S;S.month=12;let f=S.f.find(x=>x.ai&&x.alive);S.rival=f.id;f.troops=5000;const mine=g.E.dongsOf(S,0);const b=mine.find(i=>g.D[i].a.some(j=>S.owner[j]===-1));S.owner[g.D[b].a.find(j=>S.owner[j]===-1)]=f.id;});
 await p.waitForTimeout(400);await p.tap('#next');await p.waitForTimeout(250);const plan=await G(()=>__game.S.rivalPlan);ok(!!plan,'숙적 집결 예고: '+await p.textContent('#news'));await p.screenshot({path:OUT+'/75_rival.png'});
 if(plan){const own0=await G(()=>__game.S.owner[__game.S.rivalPlan.t]);await p.tap('#next');await p.waitForTimeout(200);const after=await G(()=>({o:__game.S.owner[__game.S.rivalPlan?__game.S.rivalPlan.t:0],log:__game.S.log.slice(0,4).map(l=>l.t)}));ok(after.log.some(l=>/작전/.test(l)),'숙적 작전 실행: '+after.log.find(l=>/작전/.test(l)))}
 // 구버전 저장(v2) 호환
 await G(()=>{const c=JSON.parse(localStorage.getItem('dongjang-save-v1'));delete c.abil;delete c.scoutAt;delete c.vote;delete c.express;delete c.stable;delete c.rivalPlan;localStorage.setItem('dongjang-save-v1',JSON.stringify(c))});await p.reload({waitUntil:'load'});await p.waitForTimeout(300);await p.tap('#resume');await p.waitForTimeout(200);ok(await G(()=>__game.S.abil==='other'&&!!__game.S.stable),'구버전 저장 호환');
 ok(await G(()=>document.documentElement.scrollWidth<=innerWidth),'가로 넘침 없음');
 console.log('errors',errs);await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
