// 기능 간 충돌 점검: (A) 자원회수시설 거절 vs 유치+즉시 협약, (B) 급행 원정 사용 vs 미사용, (C) 판 길이 지표
const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);
const D=data.d;
function adjEnemy(s){const out={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(j=>{if(s.owner[j]!==0)out[j]=1}));return Object.keys(out).map(Number)}
function attackBest(s,pct){const me=s.f[0];let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>D[i].a.concat(E.subwayOf(i,s)).forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,pct);if(n<bn&&n<=me.troops){bn=n;best=t}}));if(best<0)return false;E.attack(s,best,bn);return true}
function bot(s,o){const me=s.f[0];let cmds=0;
 // 정부 공모
 const gi=E.govInfo(s);
 if(gi&&gi.ok.length&&s.ap>0){
  if(gi.k==='plant'&&o.plant){const t=gi.ok.slice().sort((a,b)=>(D[a].P)-(D[b].P))[0];if(!E.govApply(s,t).err)cmds++}
  if(gi.k!=='plant'&&o.gov&&me.money>=gi.G.cost*1.5){if(!E.govApply(s,gi.ok[0]).err)cmds++}}
 if(o.plant==='pact'){for(const i of E.dongsOf(s,0)){const g=E.govSite(s,i);if(g&&g.k==='plant'&&!g.pact&&E.govDone(s,i)&&me.money>=80*1.5){if(!E.govPact(s,i).err)cmds++}}}
 // 생존 협상
 if(o.deal!==false){const oi=E.offerInfo(s);if(oi&&oi.ok&&!E.acceptOffer(s).err){cmds++;R0.deal++}}
 // 급행
 if(s.abil==='station'&&o.express&&s.ap>1){const i=E.expressInfo(s);if(i.ok&&E.raidTargets(s)>=2&&me.money>=i.cost*1.3){E.express(s);cmds++}}
 if(s.rank>=1){const g=D[me.cap].g;const u=E.unityInfo(s,g);if(u.ok&&E.avgMood(s)<60&&me.money>u.cost*2){E.unity(s,g);cmds++}}
 let b=me.money*.3;for(const i of E.dongsOf(s,0).slice(0,3)){const c=E.devCost(s,i,0);if(c!==null&&E.lv(s,i,0)<2&&c<=b){E.develop(s,i,0);b-=c;cmds++}}
 const r=me.money*.85;if(r>10){E.recruit(s,r)}
 if(s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(j=>{if(s.owner[j]!==0)gs[D[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(s.ap>=E.guCost(s)&&!s.won){if(E.guAttackPreview(s,g,.25).can<1)break;if(E.guAttack(s,g,.25).err)break;cmds++}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){if(!attackBest(s,.8))break;cmds++}
 return cmds}
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};const avg=a=>a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1):'-';
let R0={deal:0,opp:0,prize:0};
function run(st0,o,N,seed0){R0={deal:0,opp:0,prize:0};const st=D.findIndex(d=>d.n===st0);const R={w:[],dead:0,n24:[],p24:[],r1:[],exM:[],noM:[],dec:[],gap:[],cmdE:[],cmdL:[],plants:0,lostPl:0,revolt:0};
 for(let i=0;i<N;i++){const s=E.create(data,st,seed0+i*37);let r1=null,dec=null;
  while(s.month<120&&!s.won&&!s.over){const before=E.dongsOf(s,0).length,exp=()=>s.express===s.month;const c=bot(s,o);const wasExp=exp();const after=E.dongsOf(s,0).length;
   (wasExp?R.exM:R.noM).push(after-before);(s.month<12?R.cmdE:R.cmdL).push(c);
   if(s.month===24){R.n24.push(E.dongsOf(s,0).length);R.p24.push(Math.round(s.f[0].money+s.f[0].troops*0.6))}
   if(s.won||s.over)break;E.endTurn(s);R.revolt+=s.last.filter(l=>/독립을 선언/.test(l.t)).length;R0.opp+=s.last.filter(l=>/비어 있는 틈/.test(l.t)).length;R0.prize+=s.last.filter(l=>/공사판|시설 밀집지/.test(l.t)).length;
   if(s.rank>=1&&r1===null)r1=s.month;
   const fl=E.factionList(s).filter(f=>f.id),top=fl.length?Math.max(...fl.map(f=>f.pop)):0,me=E.popShare(s,0);if(dec===null&&me>=.3&&me>=top*2.5)dec=s.month}
  if(s.won){R.w.push(s.month);if(dec!==null){R.dec.push(dec);R.gap.push(s.month-dec)}}if(s.over)R.dead++;if(r1!==null)R.r1.push(r1);
}
 return R}
const N=+process.argv[2]||10;const part=process.argv[3]||'ABC';
if(part.includes('A')){console.log('== A. 자원회수시설: 거절 vs 유치(협약 없음) vs 유치+협약');
 for(const st0 of ['서교동','상계8동','둔촌1동','소공동']){for(const [nm,o] of [['거절',{plant:false}],['유치만',{plant:'take'}],['유치+협약',{plant:'pact'}]]){const R=run(st0,o,N,5100);
  console.log(st0.padEnd(5),nm.padEnd(6),'승',R.w.length+'/'+N,'승리',med(R.w),'24개월 동',med(R.n24),'24개월 힘',med(R.p24),'독립(판당)',(R.revolt/N).toFixed(1))}}}
if(part.includes('B')){console.log('== B. 급행 원정 (역세권)');
 for(const st0 of ['서교동','공덕동','공릉1동']){for(const [nm,o] of [['안 씀',{express:false}],['씀',{express:true}]]){const R=run(st0,o,N,6100);
  console.log(st0.padEnd(5),nm.padEnd(4),'승',R.w.length+'/'+N,'승리',med(R.w),'급행 달 평균 확보',avg(R.exM),'(n='+R.exM.length+')','다른 달',avg(R.noM),'최대(급행 달)',R.exM.length?Math.max(...R.exM):'-')}}}
if(part.includes('C')){console.log('== C. 판 길이');
 for(const st0 of ['서교동','상계8동','소공동','진관동','둔촌1동']){const R=run(st0,{plant:'pact',gov:true,express:true,deal:process.env.NODEAL?false:true},N,7100);
  console.log(st0.padEnd(5),'승',R.w.length+'/'+N,'첫 구청장',med(R.r1),'사실상 결정',med(R.dec),'엔딩',med(R.w),'결정→엔딩',med(R.gap),'명령/턴 초반',avg(R.cmdE),'후반',avg(R.cmdL),'협상(판당)',(R0.deal/N).toFixed(1),'빈집노림',(R0.opp/N).toFixed(1),'시설노림',(R0.prize/N).toFixed(1),'독립',(R.revolt/N).toFixed(1))}}
