const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var b=document.querySelector("#card button.pcard");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8124);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 await p.goto('http://localhost:8124',{waitUntil:'load'}); await p.waitForTimeout(400);
 await p.screenshot({path:OUT+'/40_start.png'});
 // 구버전(v1) 저장 호환
 await p.tap('#begin'); await p.waitForTimeout(250);
 await G(()=>{const c=JSON.parse(localStorage.getItem('dongjang-save-v1'));c.v=1;c.f.forEach(f=>{delete f.away;delete f.tookMine});delete c.ev;delete c.evUsed;delete c.nextEv;delete c.rival;delete c.rivalAt;delete c.stat.talked;delete c.stat.raid;delete c.stat.bridge;delete c.stat.guop;delete c.stat.events;localStorage.setItem('dongjang-save-v1',JSON.stringify(c))});
 await p.reload({waitUntil:'load'}); await p.waitForTimeout(300); await p.tap('#resume'); await p.waitForTimeout(200);
 ok(await G(()=>__game.S.v===2&&__game.S.f[0].away===0&&__game.S.evUsed.length===0),'구버전 저장 불러오기');
 // 출동 묶임
 const t=await G(()=>{const g=__game,S=g.S;let j=-1;for(const i of g.D[S.f[0].cap].a)if(S.owner[i]!==0){j=i;break}return j});
 await G(i=>__game.select(i),t); await p.waitForTimeout(250); await p.screenshot({path:OUT+'/41_enemy.png'});
 const est=await p.textContent('#estV'); ok(/이기면 \d+~\d+명/.test(est),'예상 손실 표시: '+est.slice(0,40));
 const before=await G(()=>__game.S.f[0].troops); const n=await p.$eval('#send',e=>+e.value);
 await p.tap('#atk'); await p.waitForTimeout(100);
 const cw=await p.$('#over:not([hidden]) #cardOk'); if(cw){await cw.tap();await p.waitForTimeout(50)}
 const af=await G(()=>({t:__game.S.f[0].troops,a:__game.S.f[0].away}));
 ok(Math.abs(af.t-(before-n))<1&&af.a>=0,'보낸 인원이 대기에서 빠짐 '+JSON.stringify(af));
 const cellTxt=await p.textContent('#cTroopsD'); ok(/출동/.test(cellTxt)||af.a<1,'숫자판 출동 표시 '+cellTxt);
 await p.waitForTimeout(800); await p.tap('#next'); await p.waitForTimeout(100);
 const af2=await G(()=>__game.S.f[0].away); ok(af2===0,'다음 달 복귀');
 // 연속 터치
 const tg2=await G(()=>{const g=__game,S=g.S;S.f[0].troops=2000;S.ap=2;for(const i of g.E.dongsOf(S,0))for(const j of g.D[i].a)if(S.owner[j]!==0)return j});
 await G(i=>__game.select(i),tg2);await p.waitForTimeout(450);
 await p.evaluate(()=>{const b=document.getElementById('atk');b.click();b.click();b.click()});await p.waitForTimeout(60);
 ok(await G(()=>__game.S.ap===1),'공격 연속 터치 1회만 처리');
 { const c0=await p.$('#over:not([hidden]) #cardOk'); if(c0)await c0.tap(); await p.waitForTimeout(900); }
 const mo=await G(()=>__game.S.month);await p.evaluate(()=>{const b=document.getElementById('next');b.click();b.click();b.click()});await p.waitForTimeout(40);
 ok(await G(m=>__game.S.month===m+1,mo),'다음 달 연속 터치 1회만 처리');await p.waitForTimeout(320);
 // 사건
 await G(()=>{const S=__game.S;S.ev=null;S.nextEv=S.month;S.month+=0});
 for(let i=0;i<2&&!(await G(()=>__game.S.ev));i++){await p.tap('#next');await p.waitForTimeout(60)}
 const bar=await p.$('#evBar:not([hidden])'); ok(!!bar,'민원 알림줄: '+(await p.textContent('#evBar')));
 await p.tap('#evBar'); await p.waitForTimeout(150); await p.screenshot({path:OUT+'/42_event.png'});
 await G(()=>{__game.S.f[0].money=500});
 await p.tap('.ch:not([disabled])'); await p.waitForTimeout(100); ok(await G(()=>__game.S.ev===null),'민원 선택 처리: '+await p.textContent('#news'));
 // 모든 사건 선택지 실행 (단위)
 const evc=await G(()=>{const g=__game;const bad=[];const save=JSON.stringify(g.S);for(let e=0;e<g.E.EVENTS.length;e++)for(let c=0;c<g.E.EVENTS[e].c.length;c++){const S=JSON.parse(save);S.f[0].money=99999;S.ev={id:e,exp:S.month+3};const r=g.E.chooseEvent(S,c);if(r.err||!r.text||/undefined/.test(r.text))bad.push([e,c,r])}return{n:g.E.EVENTS.length,bad}});ok(evc.bad.length===0,'사건 '+evc.n+'종 선택지 전부 실행 '+JSON.stringify(evc.bad));
 // 구 작전: 구청장 만들기
 await G(()=>{const g=__game,S=g.S;const gu=g.D[S.f[0].cap].g;const ds=g.E.guDongs()[gu];ds.slice(0,Math.ceil(ds.length/2)+1).forEach(i=>{S.owner[i]=0});S.f[0].troops=4000;S.f[0].money=3000;S.ap=8;S.rank=1;S.promo=0;});
 await G(()=>__game.select(__game.D[__game.S.f[0].cap].a[0]));await p.waitForTimeout(150);
 await p.tap('#guLink').catch(()=>{});await p.waitForTimeout(450);await p.screenshot({path:OUT+'/43_gu.png'});
 const n0=await G(()=>__game.E.dongsOf(__game.S,0).length);const ap0=await G(()=>__game.S.ap);
 await p.tap('#guAtk');await p.waitForTimeout(250);await p.screenshot({path:OUT+'/44_guafter.png'});
 const r1=await G(()=>({n:__game.E.dongsOf(__game.S,0).length,ap:__game.S.ap}));ok(r1.ap===ap0-2&&r1.n>=n0,'구 일괄 공격 '+n0+'→'+r1.n+' / 결재 '+ap0+'→'+r1.ap);console.log(' news',await p.textContent('#news'));
 await p.waitForTimeout(800);
 const per=await p.$('#guPer:not([disabled])'); if(per){const m0=await G(()=>__game.S.f[0].money);await per.tap();await p.waitForTimeout(100);ok(await G(m=>__game.S.f[0].money<m,m0),'구 일괄 설득')}else console.log(' 설득 대상 없음');
 const gd=await p.$('.gd:not([disabled])'); if(gd){const m0=await G(()=>__game.S.stat.built);await gd.tap();await p.waitForTimeout(100);ok(await G(m=>__game.S.stat.built>m,m0),'구 일괄 개발')}
 await p.tap('.x');
 // 저장 코드 왕복
 await p.tap('#menuBtn');await p.waitForTimeout(100);await p.screenshot({path:OUT+'/45_menu.png'});await p.tap('#expBtn');await p.waitForTimeout(150);
 const code=await p.$eval('#expText',e=>e.value);ok(code.startsWith('DJ2:')&&code.length<60000,'저장 코드 생성 '+code.length+'자');
 const st0=await G(()=>JSON.stringify(__game.S.owner));
 await G(()=>__game.S.owner[0]=__game.S.owner[0]===0?-1:0);
 await p.tap('#impBtn');await p.waitForTimeout(100);await p.fill('#impText','엉터리');await p.tap('#impGo');await p.waitForTimeout(80);ok(await p.isVisible('#impErr'),'잘못된 코드 안내');
 await p.fill('#impText',code);await p.tap('#impGo');await p.waitForTimeout(200);
 ok(await G(()=>JSON.stringify(__game.S.owner))===st0,'저장 코드 복원');
 // 라이벌: 시간 경과
 for(let i=0;i<14;i++){await p.tap('#next');await p.waitForTimeout(25);const o=await p.$('#cardOk');if(o)await o.tap();if(await p.$('#over:not([hidden]) #again'))break}
 const riv=await G(()=>({r:__game.S.rival,lines:__game.S.log.filter(l=>l.k==='riv').map(l=>l.t).slice(0,3)}));ok(riv.r>=0||riv.lines.length>0,'숙적 등장 '+JSON.stringify(riv.lines));
 await p.tap('#news');await p.waitForTimeout(100);await p.screenshot({path:OUT+'/46_log.png'});await p.tap('.x');
 // 승리 → 결과 이미지
 await G(()=>{const g=__game,S=g.S;for(let i=0;i<S.owner.length;i++)if(g.D[i].g%5!==0)S.owner[i]=0;S.f[0].troops=9999;S.ap=3;S.stat.home=1842;S.stat.talked=60;for(let i=0;i<S.owner.length;i++)if(S.owner[i]===0)S.min[i]=100;S.elect={at:S.month+1,n:1};S.electShown=1;S.coalShown=1});
 await p.tap('#next');await p.waitForTimeout(300);
 const img=await p.$('#resultImg');ok(!!img,'결과 이미지 생성');await p.screenshot({path:OUT+'/47_end.png'});
 if(img){const src=await img.getAttribute('src');fs.writeFileSync(OUT+'/48_card.png',Buffer.from(src.split(',')[1],'base64'))}
 await p.tap('#cont');await p.waitForTimeout(150);ok(await G(()=>__game.S.keepPlaying&&document.getElementById('over').hidden),'계속 플레이');
 ok(await G(()=>document.documentElement.scrollWidth<=innerWidth),'가로 넘침 없음');
 // 가로 화면
 const c4=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2});const p4=await c4.newPage();await p4.goto('http://localhost:8124',{waitUntil:'load'});await p4.waitForTimeout(300);await p4.screenshot({path:OUT+'/60_land_start.png'});await p4.tap('#begin');await p4.waitForTimeout(350);await p4.screenshot({path:OUT+'/61_land_game.png'});
 ok(await p4.evaluate(()=>document.getElementById('bottom').getBoundingClientRect().left>300),'가로 화면 옆줄 배치');
 await p.evaluate(()=>0);
 console.log('errors',errs);
 await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
