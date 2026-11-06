const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8127);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 await p.goto('http://localhost:8127',{waitUntil:'load'});await p.waitForTimeout(300);await p.fill('#q','상계8');await p.waitForTimeout(80);await p.tap('#results button');await p.waitForTimeout(150);await p.tap('#begin');await p.waitForTimeout(400);
 const seen=await G(()=>__game.S.seenGu.filter(Boolean).length);ok(seen>1&&seen<10,'시작 시 보이는 구 '+seen+'개');
 await p.tap('#toAll');await p.waitForTimeout(450);await p.screenshot({path:OUT+'/80_fog_all.png'});
 ok(!(await p.textContent('#news')).includes('보입니다'),'첫 화면에 공개 소식 없음');
 // 안개 속 동 시트
 const fd=await G(()=>{const g=__game,S=g.S;return g.D.findIndex(d=>!S.seenGu[d.g])});await G(i=>__game.select(i),fd);await p.waitForTimeout(400);ok((await p.textContent('#sheet')).includes('안개 속'),'안개 속 동 정보창');await p.screenshot({path:OUT+'/81_fog_sheet.png'});await p.tap('.x');
 // 확장하면 안개 걷힘
 await G(()=>{const g=__game,S=g.S;const t=g.D.findIndex(d=>!S.seenGu[d.g]&&d.a.some(j=>S.seenGu[g.D[j].g]));const nb=g.D[t].a.find(j=>S.seenGu[g.D[j].g]);S.owner[nb]=0;});
 await p.waitForTimeout(350);await p.tap('#next');await p.waitForTimeout(250);
 const n2=await G(()=>__game.S.seenGu.filter(Boolean).length);ok(n2>seen,'확장 후 안개 걷힘 '+seen+'→'+n2+' / '+(await p.textContent('#news')).slice(0,80));
 // 개발 표시
 await G(()=>{const g=__game,S=g.S;S.f[0].money=5000;const c=S.f[0].cap;[0,0,0,1,1,2,3,3,3,3,3].forEach(t=>g.E.develop(S,c,t));});
 await p.tap('#toCap');await p.waitForTimeout(450);await G(()=>{const g=__game,c=g.cam();});
 await p.evaluate(()=>{const c=document.getElementById('map');for(let i=0;i<6;i++)c.dispatchEvent(new WheelEvent('wheel',{deltaY:-200,clientX:innerWidth/2,clientY:innerHeight/2,bubbles:true,cancelable:true}))});await p.waitForTimeout(500);
 await p.screenshot({path:OUT+'/82_dev.png'});
 // 저장/복원 시 안개 유지
 await p.reload({waitUntil:'load'});await p.waitForTimeout(300);await p.tap('#resume');await p.waitForTimeout(300);ok(await G(n=>__game.S.seenGu.filter(Boolean).length===n,n2),'저장 후 안개 상태 유지');
 // 데이터 지도에서는 안개 없음
 await p.tap('#toAll');await p.waitForTimeout(400);await p.tap('#lens');await p.waitForTimeout(300);await p.screenshot({path:OUT+'/83_lens.png'});await p.tap('#lens');await p.tap('#lens');await p.tap('#lens');await p.tap('#lens');
 // 데스크톱 전체 모습
 const p2=await b.newPage({viewport:{width:1280,height:800}});await p2.goto('http://localhost:8127',{waitUntil:'load'});await p2.waitForTimeout(300);await p2.click('#begin');await p2.waitForTimeout(400);await p2.click('#toAll');await p2.waitForTimeout(400);await p2.screenshot({path:OUT+'/84_desk.png'});
 console.log('errors',errs);await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
