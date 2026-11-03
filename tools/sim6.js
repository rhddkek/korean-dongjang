const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);
function atk(s){const me=s.f[0];if(s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(j=>{if(s.owner[j]!==0)gs[data.d[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(!s.won){const p=E.guAttackPreview(s,g,.25);if(p.can<1||s.ap<p.ap)break;if(E.guAttack(s,g,.25).err)break}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,.8);if(n<bn&&n<=me.troops){bn=n;best=t}}));if(best<0)break;E.attack(s,best,bn)}}
const bots={
 '개발 안 함':s=>{if(s.f[0].money>0)E.recruit(s,s.f[0].money);atk(s)},
 '골고루 개발':s=>{const me=s.f[0];let b=me.money*.35;E.dongsOf(s,0).sort((a,c)=>E.lv(s,a,0)-E.lv(s,c,0)).slice(0,5).forEach(i=>{const t=data.d[i].P>data.d[i].E?2:0,c=E.devCost(s,i,t);if(c!==null&&c<=b){E.develop(s,i,t);b-=c}});if(me.money>0)E.recruit(s,me.money);atk(s)},
 '거점 집중':s=>{const me=s.f[0];let b=me.money*.35;const cap=me.cap;
   // 본거지: 상권 5 → 주거 5, 전선 1곳: 치안 3
   for(const t of [0,2]){const c=E.devCost(s,cap,t);if(c!==null&&c<=b){E.develop(s,cap,t);b-=c;break}}
   const front=E.dongsOf(s,0).filter(i=>data.d[i].a.some(j=>s.owner[j]>0)).sort((a,c)=>E.lv(s,c,3)-E.lv(s,a,3))[0];if(front!==undefined&&E.lv(s,front,3)<3){const c=E.devCost(s,front,3);if(c<=b){E.develop(s,front,3);b-=c}}
   if(me.money>0)E.recruit(s,me.money*.9);atk(s)}};
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};const N=8;
for(const st0 of ['서교동','상계8동','둔촌1동']){console.log('== '+st0);const st=data.d.findIndex(d=>d.n===st0);for(const [nm,b] of Object.entries(bots)){let w=[],dead=0,rk=[],lost=[],pounce=0;for(let i=0;i<N;i++){const s=E.create(data,st,4400+i*29);let r1=null;while(s.month<110&&!s.won&&!s.over){b(s);if(s.won||s.over)break;E.endTurn(s);pounce+=s.last.filter(l=>/틈을 노립니다|걸어 잠그고/.test(l.t)).length;if(s.rank>=1&&r1===null)r1=s.month}if(s.won)w.push(s.month);if(s.over)dead++;if(r1!==null)rk.push(r1);lost.push(s.stat.lost)}console.log(nm.padEnd(7),'승',w.length+'/'+N,'패',dead,'승리',med(w),'구청장',med(rk),'빼앗김',med(lost),'틈노림(판당)',(pounce/N).toFixed(1))}}
