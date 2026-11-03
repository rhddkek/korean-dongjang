const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);
function atk(s,pct,gu){const me=s.f[0];
 if(gu&&s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(j=>{if(s.owner[j]!==0)gs[data.d[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(s.ap>=2&&!s.won){const p=E.guAttackPreview(s,g);if(p.can<1)break;if(E.guAttack(s,g).err)break}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,pct);if(n<bn&&n<=me.troops){bn=n;best=t}}));if(best<0)break;E.attack(s,best,bn)}}
function persuadeAll(s){for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bc=1e9;const seen={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(t=>{if(seen[t]||s.owner[t]!==-1)return;seen[t]=1;const c=E.persuadeCost(s,t);if(c<bc&&c<=s.f[0].money){bc=c;best=t}}));if(best<0)break;if(E.persuade(s,best).err)break}}
function devAll(s,frac,lvMax){let b=s.f[0].money*frac;const ml=E.dongsOf(s,0).sort((a,c)=>E.lv(s,a,0)-E.lv(s,c,0));for(const i of ml){const c=E.devCost(s,i,0);if(c!==null&&E.lv(s,i,0)<lvMax&&c<=b){E.develop(s,i,0);b-=c}}}
const S={
 '공격 60%':s=>{if(s.f[0].money>0)E.recruit(s,s.f[0].money);atk(s,.6,1)},
 '공격 80%':s=>{if(s.f[0].money>0)E.recruit(s,s.f[0].money);atk(s,.8,1)},
 '공격 95%':s=>{if(s.f[0].money>0)E.recruit(s,s.f[0].money);atk(s,.95,1)},
 '설득 위주':s=>{persuadeAll(s);atk(s,.8,1);},
 '개발 우선':s=>{if(s.month<12)devAll(s,1,3);else devAll(s,.4,3);if(s.f[0].money>0)E.recruit(s,s.f[0].money*.8);atk(s,.8,1)},
};
const starts=['서교동','소공동','진관동','상계8동','둔촌1동'];const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};
const N=+process.argv[2]||10;
for(const nm of starts){console.log('== '+nm);const st=data.d.findIndex(d=>d.n===nm);for(const [name,bot] of Object.entries(S)){let w=[],dead=0,rk=[],lost=[],sent=[],talk=[];for(let i=0;i<N;i++){const s=E.create(data,st,5000+i*131);let r1=null;while(s.month<110&&!s.won&&!s.over){bot(s);if(s.won||s.over)break;E.endTurn(s);if(s.rank>=1&&r1===null)r1=s.month}if(s.won)w.push(s.month);if(s.over)dead++;if(r1!==null)rk.push(r1);lost.push(s.stat.lost);talk.push(s.stat.talked)}console.log(name.padEnd(8),'승',w.length+'/'+N,'패',dead,'승리',med(w),'구청장',med(rk),'빼앗김',med(lost),'설득',med(talk))}}
