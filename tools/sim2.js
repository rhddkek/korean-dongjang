const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);
const tc={};data.d.forEach(d=>tc[d.type]=(tc[d.type]||0)+1);console.log('유형',tc);
function mk(mode){return s=>{const me=s.f[0];let acts=0;
 if(s.ev&&mode.events){E.chooseEvent(s,0);acts+=2}
 const nb={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(j=>{const o=s.owner[j];if(o>0)nb[o]=1}));
 if(mode.dip){for(const f of Object.keys(nb)){if(E.mergeCheck(s,+f).ok&&s.ap>0&&me.money>=E.mergeCost(s,+f)){E.merge(s,+f);acts+=2}}
  for(const f of Object.keys(nb)){if(s.f[f].alive&&s.f[f].troops>me.troops*.8&&E.pactCheck(s,+f).ok&&me.money>=E.pactCost(s,+f)){E.pact(s,+f);acts+=2}}}
 if(mode.dev){let b=me.money*.4;for(const i of E.dongsOf(s,0).sort((a,c)=>E.lv(s,a,0)-E.lv(s,c,0)).slice(0,4)){const t=data.d[i].P>data.d[i].E?2:0,c=E.devCost(s,i,t);if(c!==null&&c<100&&c<=b){E.develop(s,i,t);b-=c;acts+=2}}}
 if(me.money>30){E.recruit(s,me.money*(mode.dev?.85:1));acts+=1}
 if(mode.gu&&s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(j=>{if(s.owner[j]!==0)gs[data.d[j].g]=1}));
  for(let g of Object.keys(gs)){g=+g;while(s.ap>=E.guCost(s)&&!s.won){const p=E.guAttackPreview(s,g);if(p.can<1)break;const r=E.guAttack(s,g);acts+=2;if(r.err)break}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,mode.pct||.8);if(n<bn&&n<=me.troops){bn=n;best=t}}));if(best<0)break;
  const send=mode.all?Math.floor(me.troops):bn;E.attack(s,best,send);acts+=2}
 s._acts=(s._acts||0)+acts+1;}}
const starts=['서교동','상계8동','소공동','역삼1동','창신2동','둔촌1동'];const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};
const N=+process.argv[2]||14;
const modes={'80%':{pct:.8},'전원':{all:1},'분배+구작전':{pct:.75,gu:1,dev:1,dip:1,events:1}};
for(const [name,mode] of Object.entries(modes)){console.log('== '+name);for(const nm of starts){const st=data.d.findIndex(d=>d.n===nm);let w=[],dead=0,acts=[],rk=[];for(let i=0;i<N;i++){const s=E.create(data,st,3000+i*91);const b=mk(mode);let r1=null;while(s.month<130&&!s.won&&!s.over){b(s);if(s.won||s.over)break;E.endTurn(s);if(s.rank>=1&&r1===null)r1=s.month}if(s.won)w.push(s.month);if(s.over)dead++;acts.push(s._acts);if(r1!==null)rk.push(r1)}console.log(nm.padEnd(6),'승',w.length+'/'+N,'패',dead,'승리개월',med(w),'구청장',med(rk),'조작수(대략)',med(acts))}}
