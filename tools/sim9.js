// 운영 방식 비교: 확장 위주 / 개발 위주 / 공모 위주, 그리고 숙적 예고에 대응 vs 무시
const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);const D=data.d;
const nbOwn=(s,i)=>D[i].a.filter(j=>s.owner[j]===0).length;
function attack(s,keep){const me=s.f[0];for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,.8);if(n<bn&&n<=me.troops-keep){bn=n;best=t}}));if(best<0)break;E.attack(s,best,bn)}
 if(s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(j=>{if(s.owner[j]!==0)gs[D[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(s.ap>=E.guCost(s)&&!s.won){if(E.guAttackPreview(s,g,.25).can<1)break;if(E.guAttack(s,g,.25).err)break}}}}
function persuadeAll(s,frac){const me=s.f[0];let b=me.money*frac,n=0;const seen={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(t=>{if(seen[t]||s.owner[t]!==-1||s.ap<=0)return;seen[t]=1;const c=E.persuadeCost(s,t);if(c<=b&&!E.persuade(s,t).err){b-=c;n++}}));return n}
function devSmart(s,frac){const me=s.f[0];let b=me.money*frac;const mine=E.dongsOf(s,0);
 const hub=mine.slice().sort((a,c)=>nbOwn(s,c)-nbOwn(s,a))[0];if(hub!==undefined&&nbOwn(s,hub)>=3){const c=E.devCost(s,hub,0);if(c!==null&&c<=b){E.develop(s,hub,0);b-=c}}
 const fr=mine.filter(i=>D[i].a.some(j=>s.owner[j]>0)).sort((a,c)=>nbOwn(s,c)-nbOwn(s,a))[0];if(fr!==undefined&&E.lv(s,fr,3)<3){const c=E.devCost(s,fr,3);if(c<=b){E.develop(s,fr,3);b-=c}}
 mine.sort((a,c)=>E.lv(s,a,0)-E.lv(s,c,0)).slice(0,4).forEach(i=>{const t=D[i].P>D[i].E?2:0,c=E.devCost(s,i,t);if(c!==null&&c<=b){E.develop(s,i,t);b-=c}})}
function gov(s,save){const me=s.f[0];const gi=E.govInfo(s);if(gi&&gi.ok.length&&s.ap>0&&me.money>=gi.G.cost){const t=gi.k==='plant'?gi.ok.slice().sort((a,b)=>D[a].P-D[b].P)[0]:gi.ok[0];E.govApply(s,t)}
 for(const i of E.dongsOf(s,0)){const g=E.govSite(s,i);if(g&&g.k==='plant'&&!g.pact&&E.govDone(s,i)&&me.money>=120)E.govPact(s,i)}
 // 다음 공모 조건 준비: 교통·주거·치안 2단계 동 하나씩
 if(save){const gn=E.govNext(s)||(gi&&{k:gi.k});if(gn){const t={agency:1,hospital:2,safety:3}[gn.k];if(t!==undefined&&!E.dongsOf(s,0).some(i=>E.lv(s,i,t)>=2&&!E.govSite(s,i))){const i=E.dongsOf(s,0).find(i=>i!==me.cap&&!E.govSite(s,i))??me.cap;const c=E.devCost(s,i,t);if(c!==null&&c<=me.money)E.develop(s,i,t)}}}
 return save?Math.min(me.money,200):0}
function respond(s){const pi=E.planInfo(s);if(!pi)return 0;const me=s.f[0];if(pi.sec!==null&&me.money>=pi.secCost&&E.lv(s,pi.t,3)<5)E.develop(s,pi.t,3);const pi2=E.planInfo(s);return pi2&&pi2.extra?Math.min(me.troops*.6,pi2.extra):0}
const bots={
 '확장 위주':(s,o)=>{const keep=o.resp?respond(s):0;persuadeAll(s,.7);const r=s.f[0].money*.9;if(r>10)E.recruit(s,r);attack(s,keep)},
 '개발 위주':(s,o)=>{const keep=o.resp?respond(s):0;devSmart(s,.45);const r=s.f[0].money*.9;if(r>10)E.recruit(s,r);attack(s,keep)},
 '공모 위주':(s,o)=>{const keep=o.resp?respond(s):0;const hold=gov(s,true);const r=(s.f[0].money-hold)*.9;if(r>10)E.recruit(s,r);attack(s,keep)}};
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};const N=+process.argv[2]||8;
for(const st0 of (process.argv[3]||'소공동,상계8동').split(',')){const st=D.findIndex(d=>d.n===st0);console.log('== '+st0);
 for(const [nm,b] of Object.entries(bots))for(const resp of [false,true]){if(resp&&nm!=='개발 위주')continue;let w=[],dead=0,n24=[],net24=[],planLost=0,det=0,saved=0,facM=[],gov=0;
  for(let i=0;i<N;i++){const s=E.create(data,st,8800+i*41);while(s.month<110&&!s.won&&!s.over){b(s,{resp});if(s.month===24){n24.push(E.dongsOf(s,0).length);net24.push(Math.round(E.economy(s,0).net))}if(s.won||s.over)break;E.endTurn(s);planLost+=s.last.filter(l=>/의 작전\. /.test(l.t)).length}
   if(s.won)w.push(s.month);if(s.over)dead++;det+=s.stat.deterred||0;saved+=s.stat.facSaved||0;facM.push(Math.round(s.stat.facMoney||0));gov+=s.stat.gov||0}
  console.log((nm+(resp?'+예고 대응':'')).padEnd(12),'승',w.length+'/'+N,'승리',med(w),'24개월 동',med(n24),'순수입',med(net24),'| 예고 작전에 뺏김',(planLost/N).toFixed(1),'물러남',(det/N).toFixed(1),'시설 덕 방어',(saved/N).toFixed(1),'시설 수입',med(facM),'공모',(gov/N).toFixed(1))}}
