const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);
function bot(s){const me=s.f[0];if(me.money>0)E.recruit(s,me.money*.85);if(s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(j=>{if(s.owner[j]!==0)gs[data.d[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(s.ap>=E.guCost(s)&&!s.won){if(E.guAttackPreview(s,g,.25).can<1)break;if(E.guAttack(s,g,.25).err)break}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,.8);if(n<bn&&n<=me.troops){bn=n;best=t}}));if(best<0)break;E.attack(s,best,bn)}}
const s=E.create(data,data.d.findIndex(d=>d.n==='서교동'),11);
console.log('월 | 동 | 세수 | 관리비 | 순수입 | 동원 | 대기인원 | 예산잔액');
while(s.month<60&&!s.won){bot(s);E.endTurn(s);const e=E.economy(s,0);if(s.month%5===0)console.log(s.month,'|',e.n,'|',Math.round(e.tax),'|',Math.round(e.up),'|',Math.round(e.net),'|',Math.round(e.draft),'|',Math.round(s.f[0].troops),'|',Math.round(s.f[0].money))}
