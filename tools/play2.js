const { chromium, devices } = require('playwright'); const http=require('http'), fs=require('fs');
const OUT=process.argv[2];
const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>'+fs.readFileSync('dongjang.html','utf8')+'</body></html>';
const srv=http.createServer((q,r)=>{r.setHeader('content-type','text/html;charset=utf-8');r.end(html)}).listen(8125);
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
(async()=>{
 const b=await chromium.launch(); const ctx=await b.newContext({...devices['iPhone SE'],viewport:{width:360,height:640}}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 const G=(f,...a)=>p.evaluate(f,...a);
 await p.goto('http://localhost:8125',{waitUntil:'load'}); await p.waitForTimeout(400); await p.screenshot({path:OUT+'/50_start.png'});
 await p.tap('#begin'); await p.waitForTimeout(350); await p.screenshot({path:OUT+'/51_first.png'});
 ok((await p.textContent('#news')).includes('첫 목표'),'첫 목표 안내');
 const tgt=async()=>G(()=>{const g=__game,S=g.S,D=g.D,c=g.cam();let best=null;const r=document.getElementById('hud').getBoundingClientRect().bottom,bt=document.getElementById('bottom').getBoundingClientRect().top;for(const i of g.E.dongsOf(S,0))for(const j of D[i].a){if(S.owner[j]===0)continue;const x=D[j].x*c.s+c.x,y=D[j].y*c.s+c.y;if(x>20&&x<innerWidth-20&&y>r+20&&y<bt-20){const n=g.E.needFor(S,j,.8);if(!best||n<best.n)best={x,y,n,name:D[j].n}}}return best});
 let t=await tgt(); await p.touchscreen.tap(t.x,t.y); await p.waitForTimeout(350); await p.screenshot({path:OUT+'/52_sheet.png'});
 ok(await p.isVisible('.tip'),'첫 공격 추천 문구');
 const qm=await p.$('#qMore');if(qm){await qm.tap();await p.waitForTimeout(150)}
 const chip80=await p.$$('.chip'); await chip80[0].tap();await p.waitForTimeout(50);await (await p.$$('.chip'))[3].tap(); await p.waitForTimeout(50);
 let captured=false;for(let k=0;k<12&&!captured;k++){const a=await p.$('#atk:not([disabled])');if(a){await a.tap();await p.waitForTimeout(250)}
  captured=await G(()=>__game.S.stat.took>0);
  if(!captured){await p.tap('#next');await p.waitForTimeout(80);t=await tgt();if(!t)continue;await p.touchscreen.tap(t.x,t.y);await p.waitForTimeout(250);const ch=await p.$$('.chip');if(ch[3])await ch[3].tap()}}
 await p.waitForTimeout(150);ok(await p.isVisible('#cardOk'),'첫 점령 결과 카드');await p.screenshot({path:OUT+'/53_firstwin.png'});
 console.log(' card:',(await p.textContent('#card')).slice(0,120));
 await p.tap('#cardOk');await p.waitForTimeout(800);
 console.log(' news:',await p.textContent('#news'));
 const again=await G(()=>__game.S.firstWinShown);ok(again===1,'첫 점령 카드는 한 번만');
 // 개발 수치가 실제와 일치
 await G(()=>__game.select(__game.S.f[0].cap));await p.waitForTimeout(250);await p.screenshot({path:OUT+'/54_own.png'});
 const devTxt=await p.textContent('.dev p');console.log(' 개발 표시:',devTxt);
 const mm=devTxt.match(/([\d.]+)억 → ([\d.]+)억/);const shown=parseFloat(mm[2])-parseFloat(mm[1]);
 const real=await G(()=>{const g=__game,S=g.S,i=S.f[0].cap,fm=g.E.fullMapOf(S,0,g.E.dongsOf(S,0)),a=g.E.taxOf(S,i,fm);S.f[0].money+=100;g.E.develop(S,i,0);return g.E.taxOf(S,i,fm)-a});
 ok(Math.abs(real-shown)<0.21,'개발 효과 표시='+shown+' 실제='+real.toFixed(2));
 await p.tap('.x');
 // 실제 승진까지: 단일 공격은 엔진, 승진 후에는 구 작전 버튼을 눌러 진행
 let guTaps=0,promo=[],m=0;
 for(;m<140;m++){
  const st=await G(()=>{const g=__game,S=g.S,E=g.E,D=g.D;if(S.f[0].money>0)E.recruit(S,S.f[0].money*.85);if(S.rank<1){for(let k=0;k<8&&S.ap>0;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(S,0).forEach(i=>D[i].a.forEach(t=>{if(seen[t]||S.owner[t]===0)return;seen[t]=1;const pv=E.preview(S,t,1);if(pv.reason)return;const n=E.needFor(S,t,.8);if(n<bn&&n<=S.f[0].troops){bn=n;best=t}}));if(best<0)break;E.attack(S,best,bn)}}return{rank:S.rank,ap:S.ap,won:S.won,over:S.over}});
  if(st.won||st.over)break;
  if(st.rank>=1){
   // 구 현황 → 작전 버튼
   for(let z=0;z<4;z++){const g=await G(()=>{const g=__game,S=g.S;let best=-1,bv=-1;g.E.guDongs().forEach((ds,i)=>{const pv=g.E.guAttackPreview(S,i);if(pv.can>=1){const st=g.E.guStatus(S,i);const v=st.have/st.total;if(v>bv){bv=v;best=i}}});return S.ap>=g.E.guCost(S)?best:-1});
    if(g<0)break;
    await G(i=>{const t=__game.E.guDongs()[i].find(x=>__game.S.owner[x]!==0);__game.select(t)},g);await p.waitForTimeout(40);
    const link=await p.$("#guLink");if(!link)break;await link.tap().catch(()=>{});await p.waitForTimeout(60);
    const ga=await p.$('#guAtk:not([disabled])');if(!ga){await p.tap('.x');break}await ga.tap().catch(()=>{});guTaps++;await p.waitForTimeout(40);
    if(guTaps===1){await p.waitForTimeout(150);await p.screenshot({path:OUT+'/55_guop.png'})}
    const c=await p.$('#over:not([hidden]) #cardOk');if(c){promo.push(await p.textContent('#card h2'));await c.tap().catch(()=>{})}
    if(await p.$('#over:not([hidden]) #again'))break;
    const x=await p.$('.x');if(x)await x.tap().catch(()=>{});
   }
  }
  if(await p.$('#over:not([hidden]) #again'))break;
  await p.tap('#next');await p.waitForTimeout(25);
  const c=await p.$('#over:not([hidden]) #cardOk');if(c){const h=await p.textContent('#card h2');promo.push(h);if(promo.length===1){await p.screenshot({path:OUT+'/56_promo.png'})}await c.tap().catch(()=>{})}
  if(await p.$('#over:not([hidden]) #again'))break;
  if(m===18){await p.waitForTimeout(80);await p.screenshot({path:OUT+'/57_mid.png'})}
 }
 console.log('승진 기록',promo,'구 작전 버튼',guTaps,'회');
 await p.waitForTimeout(250);await p.screenshot({path:OUT+'/58_end.png'});
 const fin=await G(()=>{const g=__game,S=g.S;return{m:S.month,won:S.won,over:S.over,n:g.E.dongsOf(S,0).length,stat:S.stat}});console.log(JSON.stringify(fin));
 const img=await p.$('#resultImg');if(img){const src=await img.getAttribute('src');fs.writeFileSync(OUT+'/59_card.png',Buffer.from(src.split(',')[1],'base64'))}
 ok(guTaps>0,'승진 후 실제 구 작전 버튼 사용');
 const ov=await G(()=>[...document.querySelectorAll('.cell b,.cell i,.cell small')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.textContent));ok(ov.length===0,'360px 숫자판 넘침 '+JSON.stringify(ov));
 ok(await G(()=>document.documentElement.scrollWidth<=innerWidth),'가로 넘침 없음');
 console.log('errors',errs);
 await b.close();srv.close();
})().catch(e=>{console.error(e);process.exit(1)});
