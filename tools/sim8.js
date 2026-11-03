// 5단계 시설: 위치를 골라 지은 경우 vs 골고루 개발 (같은 예산 비율)
const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);const D=data.d;
function atk(s){const me=s.f[0];if(s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(j=>{if(s.owner[j]!==0)gs[D[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(!s.won){const p=E.guAttackPreview(s,g,.25);if(p.can<1||s.ap<p.ap)break;if(E.guAttack(s,g,.25).err)break}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,.8);if(n<bn&&n<=me.troops){bn=n;best=t}}));if(best<0)break;E.attack(s,best,bn)}}
const nbOwn=(s,i)=>D[i].a.filter(j=>s.owner[j]===0).length;
const bots={
 '골고루':s=>{const me=s.f[0];let b=me.money*.35;E.dongsOf(s,0).sort((a,c)=>E.lv(s,a,0)-E.lv(s,c,0)).slice(0,5).forEach(i=>{const t=D[i].P>D[i].E?2:0,c=E.devCost(s,i,t);if(c!==null&&c<=b){E.develop(s,i,t);b-=c}});if(me.money>0)E.recruit(s,me.money);atk(s)},
 '자리 골라 5단계':s=>{const me=s.f[0];let b=me.money*.35;const mine=E.dongsOf(s,0);
   // 우리 동에 가장 많이 둘러싸인 동을 상권 거점으로, 적과 맞닿은 동 중 우리 동이 많이 붙은 곳을 치안 거점으로
   if(mine.length>=6){const hub=mine.slice().sort((a,c)=>nbOwn(s,c)-nbOwn(s,a))[0];const p=E.spPreview(s,hub,0);if(p&&p.nb>=4){const c=E.devCost(s,hub,0);if(c!==null&&c<=b){E.develop(s,hub,0);b-=c}}
     const fr=mine.filter(i=>D[i].a.some(j=>s.owner[j]>0)).sort((a,c)=>nbOwn(s,c)-nbOwn(s,a))[0];if(fr!==undefined&&E.lv(s,fr,3)<3){const c=E.devCost(s,fr,3);if(c<=b){E.develop(s,fr,3);b-=c}}}
   mine.sort((a,c)=>E.lv(s,a,0)-E.lv(s,c,0)).slice(0,3).forEach(i=>{const t=D[i].P>D[i].E?2:0,c=E.devCost(s,i,t);if(c!==null&&c<=b&&E.lv(s,i,t)<1){E.develop(s,i,t);b-=c}});
   if(me.money>0)E.recruit(s,me.money);atk(s)}};
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};const N=+process.argv[2]||8;
for(const st0 of ['서교동','상계8동','둔촌1동']){const st=D.findIndex(d=>d.n===st0);for(const [nm,b] of Object.entries(bots)){let w=[],dead=0,n30=[],tax30=[],lost=[];for(let i=0;i<N;i++){const s=E.create(data,st,4400+i*29);while(s.month<110&&!s.won&&!s.over){b(s);if(s.month===30){n30.push(E.dongsOf(s,0).length);tax30.push(Math.round(E.economy(s,0).net))}if(s.won||s.over)break;E.endTurn(s)}if(s.won)w.push(s.month);if(s.over)dead++;lost.push(s.stat.lost)}
 console.log(st0.padEnd(5),nm.padEnd(9),'승',w.length+'/'+N,'승리',med(w),'30개월 동',med(n30),'30개월 순수입',med(tax30),'빼앗김',med(lost))}}
