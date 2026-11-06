const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8123);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8123',{waitUntil:'load'}); await p.waitForTimeout(500);
 await p.tap('#begin'); await p.waitForTimeout(300);
 const G=(f,...a)=>p.evaluate(f,...a);
 // 저장/이어하기
 let m=await G(()=>{const g=__game,S=g.S;return{money:S.f[0].money,cap:S.f[0].cap}});
 await p.tap('#next'); await p.waitForTimeout(120); await p.tap('#next'); await p.waitForTimeout(120);
 const before=await G(()=>JSON.stringify({m:__game.S.month,o:__game.S.owner,t:__game.S.f[0].troops}));
 await p.reload({waitUntil:'load'}); await p.waitForTimeout(400);
 ok(!!(await p.$('#resume')),'새로고침 후 이어 하기 버튼'); await p.tap('#resume'); await p.waitForTimeout(250);
 const after=await G(()=>JSON.stringify({m:__game.S.month,o:__game.S.owner,t:__game.S.f[0].troops}));
 ok(before===after,'이어 하기 상태 일치');
 // 지하철 기습 탭: 점선 대상
 const subT=await G(()=>{const g=__game,S=g.S,D=g.D;for(const i of g.E.dongsOf(S,0))for(const j of g.E.subwayOf(i))if(S.owner[j]!==0&&D[i].a.indexOf(j)<0&&!D[S.f[0].cap].a.includes(j)){return{j,name:D[j].n}}return null});
 if(subT){await G(i=>__game.select(i),subT.j);await p.waitForTimeout(200);const via=await p.textContent('.via');ok(/지하철/.test(via),'지하철 기습 경로 표시: '+via);await p.tap('.x');}
 // 설득 (돈 넉넉히)
 await G(()=>{__game.S.f[0].money=5000;__game.S.f[0].troops=3000});
 const ind=await G(()=>{const g=__game,S=g.S;for(const i of g.E.dongsOf(S,0))for(const j of g.D[i].a)if(S.owner[j]===-1&&!g.D[j].r.includes(i))return j;return null});
 await G(i=>__game.select(i),ind);await p.waitForTimeout(150);await p.waitForTimeout(350);await p.tap('#per');await p.waitForTimeout(150);{const c0=await p.$('#over:not([hidden]) #cardOk');if(c0)await c0.tap();await p.waitForTimeout(400)}
 ok(await G(i=>__game.S.owner[i]===0,ind),'돈으로 설득 편입');
 // 한강 불이익
 const riv=await G(()=>{const g=__game,S=g.S,D=g.D;const a=D.findIndex(d=>d.r.length>0);S.owner[a]=0;const t=D[a].r[0];if(S.owner[t]===0)S.owner[t]=-1;return{a,t,r:g.E.route(S,0,t)}});
 const br=await G(()=>{const g=__game,S=g.S,D=g.D;const a=D.findIndex(d=>d.r.length>0&&d.sub===0);const t=D[a].r[0];const save=S.owner.slice();for(let i=0;i<S.owner.length;i++)if(S.owner[i]===0)S.owner[i]=-1;S.owner[a]=0;S.owner[t]=-1;const r1=g.E.route(S,0,t);S.dev[a*4+1]=2;const r2=g.E.route(S,0,t);S.dev[a*4+1]=0;S.owner=save;return{r1:r1.via,m1:r1.mult,r2:r2.via,m2:r2.mult}});ok(br.r1==='bridge'&&br.r2==='bridgeOk'&&br.m2>br.m1,'한강 불이익/교통 2단계 해제 '+JSON.stringify(br));
 // 협정·통합: 세력 동 선택
 await G(()=>{__game.S.month=0;__game.S.ap=5});
 const fd=await G(()=>{const g=__game,S=g.S,D=g.D;let t=-1;for(const i of g.E.dongsOf(S,0))for(const j of D[i].a)if(S.owner[j]>0){t=j}if(t<0){for(let j=0;j<D.length;j++)if(S.owner[j]>0){const nb=D[j].a[0];S.owner[nb]=0;t=j;break}}return{t,f:S.owner[t],name:S.f[S.owner[t]].name}});
 await G(i=>__game.select(i),fd.t);await p.waitForTimeout(150);await p.screenshot({path:OUT+'/30_faction.png'});
 await p.waitForTimeout(350);await p.evaluate(()=>{const d=document.getElementById('diplo');if(d)d.open=true});await p.tap('#pact');await p.waitForTimeout(350);
 ok(await G(f=>__game.S.f[0].pact[f]>__game.S.month,fd.f),'불가침 협정 체결');
 ok(await G(i=>__game.E.preview(__game.S,i,10).reason.includes('협정'),fd.t),'협정 중 공격 차단');
 await G(i=>__game.select(i),fd.t);await p.waitForTimeout(100);
 await p.tap('#bp');await p.waitForTimeout(100);
 ok(await G(f=>!__game.S.f[0].pact[f],fd.f),'협정 파기');
 await G(()=>{__game.S.f[0].money=99999;__game.S.f[0].troops=99999;__game.S.ap=3;Object.values(__game.S.f).forEach(f=>{if(f.id)f.grudge=0})});
 await G(i=>__game.select(i),fd.t);await p.waitForTimeout(100);await p.waitForTimeout(350);await p.evaluate(()=>{const d=document.getElementById('diplo');if(d)d.open=true});await p.tap('#merge');await p.waitForTimeout(350);
 ok(await G(f=>!__game.S.f[f].alive,fd.f),'세력 통합');
 // 본거지 함락 → 붕괴
 const c=await G(()=>{const g=__game,S=g.S;const f=S.f.find(x=>x.ai&&x.alive&&g.E.dongsOf(S,x.id).length>=1);const cap=f.cap;S.owner[g.D[cap].a[0]]=0;S.ap=3;S.f[0].troops=99999;const r=g.E.attack(S,cap,50000);return{win:r.win,col:r.collapse,alive:f.alive,own:S.owner[cap]}});
 ok(c.win&&!c.alive&&c.own===0,'본거지 함락 시 세력 붕괴 '+JSON.stringify(c.col));
 // 진급 카드
 const pr=await G(()=>{const g=__game,S=g.S;return{rank:S.rank,gu:g.E.guHeld(S,0)}});console.log('rank',pr);
 // 렌더 성능 (CPU 6배 저하)
 const cdp=await ctx.newCDPSession(p);await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
 const perf=await G(async()=>{const c=document.getElementById('map');const t=[];for(let i=0;i<20;i++){const a=performance.now();c.dispatchEvent(new WheelEvent('wheel',{deltaY:i%2?40:-40,clientX:200,clientY:400,bubbles:true,cancelable:true}));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));t.push(performance.now()-a)}t.sort((x,y)=>x-y);return{med:t[10],max:t[19]}});
 console.log('frame ms under 6x CPU',perf);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
 const tt=await G(()=>{const a=performance.now();for(let i=0;i<20;i++)__game.E.endTurn(__game.S);return (performance.now()-a)/20});console.log('endTurn ms',tt);
 // 가로 스크롤 없는지
 ok(await G(()=>document.documentElement.scrollWidth<=innerWidth),'가로 넘침 없음');
 await p.waitForTimeout(100);console.log('errors',errs);
 await b.close();
 const b2=await chromium.launch();const p2=await b2.newPage({viewport:{width:1280,height:800}});await p2.goto('http://localhost:8123',{waitUntil:'load'});await p2.waitForTimeout(400);await p2.click('#begin');await p2.waitForTimeout(400);await p2.screenshot({path:OUT+'/31_desk.png'});
 const pos=await p2.evaluate(()=>{const g=__game,S=g.S,D=g.D,c=g.cam();const j=D[S.f[0].cap].a[0];return{x:D[j].x*c.s+c.x,y:D[j].y*c.s+c.y}});await p2.mouse.click(pos.x,pos.y);await p2.waitForTimeout(300);await p2.screenshot({path:OUT+'/32_desk_enemy.png'});
 // 소형 폰
 const c3=await b2.newContext({viewport:{width:360,height:640},hasTouch:true,isMobile:true,deviceScaleFactor:2});const p3=await c3.newPage();await p3.goto('http://localhost:8123',{waitUntil:'load'});await p3.waitForTimeout(300);await p3.screenshot({path:OUT+'/33_small_start.png'});await p3.tap('#begin');await p3.waitForTimeout(300);await p3.tap('#cells');await p3.waitForTimeout(150);await p3.screenshot({path:OUT+'/34_small_realm.png'});
 console.log('small overflow', await p3.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), await p3.evaluate(()=>{const c=[...document.querySelectorAll('.cell b')];return c.map(e=>e.scrollWidth>e.clientWidth)}));
 await b2.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
