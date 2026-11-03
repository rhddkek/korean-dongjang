// 시작 유형별 첫 10턴 행동 비교: 각 봇은 자기 능력을 쓰되 공통 규칙은 같음
const E=require('../src/engine.js');const data=JSON.parse(require('fs').readFileSync(__dirname+'/../data/game_data.json','utf8'));E.setData(data);
function adjEnemy(s){const out={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(j=>{if(s.owner[j]!==0)out[j]=1}));return Object.keys(out).map(Number)}
function attackBest(s,pct){const me=s.f[0];let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>data.d[i].a.concat(E.subwayOf(i,s)).forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,pct);if(n<bn&&n<=me.troops){bn=n;best=t}}));if(best<0)return false;const o=s.owner[best];E.attack(s,best,bn);return {t:best,o,n:bn}}
function bot(s,log){const me=s.f[0],ab=s.abil;const sp={recruit:0,dev:0,persuade:0,abil:0,proj:0};
 // 능력
 if(ab==='office'){for(const t of adjEnemy(s)){const i=E.scoutInfo(s,t);if(i.ok&&me.money>=i.cost*1.2){E.scout(s,t);sp.abil+=i.cost;break}}}
 if(ab==='town'){for(const t of adjEnemy(s)){if(E.voteInfo(s,t).ok){E.vote(s,t);break}}}
 if(ab==='station'&&s.month>=1&&s.ap>0){const i=E.expressInfo(s);if(i.ok&&me.money>=i.cost*1.3){
   // 7km 안에만 있는 좋은 목표(독립·약한 동)가 있을 때만
   const near={};E.dongsOf(s,0).forEach(j=>E.subwayOf(j).concat(data.d[j].a).forEach(x=>near[x]=1));let good=null;
   E.dongsOf(s,0).forEach(j=>{s.express=s.month;E.subwayOf(j,s).forEach(x=>{if(near[x]||s.owner[x]===0)return;const n=E.needFor(s,x,.8);if(n<=me.troops*.5&&s.owner[x]===-1&&(data.d[x].P+data.d[x].E)>90&&(!good||n<good.n))good={x,n}});s.express=-1});
   if(good){E.express(s);sp.abil+=i.cost;E.attack(s,good.x,good.n);log&&log.push({k:'공격(독립)',t:good.x})}}}
 if(ab==='other'){const i=E.rallyInfo(s);if(i.ok&&E.avgMood(s)<70){E.rally(s);sp.abil+=i.cost}}
 // 사업
 if(s.rank>=1){const g=data.d[me.cap].g;const u=E.unityInfo(s,g);if(u.ok&&E.avgMood(s)<60&&me.money>u.cost*2){E.unity(s,g);sp.proj+=u.cost}}
 // 설득: 돈이 넉넉하고 인원이 적을 때
 for(const t of adjEnemy(s)){if(s.owner[t]!==-1||s.ap<=0)continue;const c=E.persuadeCost(s,t);const need=E.needFor(s,t,.8);if(c<=me.money*.5&&need>me.troops){if(!E.persuade(s,t).err){sp.persuade+=c;log&&log.push({k:'설득',t})}}}
 // 개발: 수입의 30%
 let b=me.money*.3;for(const i of E.dongsOf(s,0).slice(0,3)){const c=E.devCost(s,i,0);if(c!==null&&E.lv(s,i,0)<2&&c<=b){E.develop(s,i,0);b-=c;sp.dev+=c}}
 // 모집
 const keep=ab==='town'?me.money*.5:ab==='office'?me.money*.6:me.money*.15;const r=me.money-keep;if(r>10){E.recruit(s,r);sp.recruit+=r}
 if(s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>data.d[i].a.forEach(j=>{if(s.owner[j]!==0)gs[data.d[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(s.ap>=E.guCost(s)&&!s.won){if(E.guAttackPreview(s,g,.25).can<1)break;if(E.guAttack(s,g,.25).err)break}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){const r=attackBest(s,.8);if(!r)break;log&&log.push({k:r.o===-1?'공격(독립)':'공격(세력)',t:r.t})}
 return sp}
const starts={'소공동(오피스)':'소공동','진관동(대단지)':'진관동','서교동(역세권?)':'서교동','상계8동(주택가)':'상계8동','둔촌1동':'둔촌1동'};
const N=+process.argv[2]||8;const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};
console.log('시작동 | 능력 | 승 | 승리개월 | 구청장 | 첫10턴 지출 비중(모집/개발/설득/능력) | 첫10턴 대상(독립/세력/설득/투표) | 10턴 후 동 수 | 숙적 작전 피해');
for(const [nm,dn] of Object.entries(starts)){const st=data.d.findIndex(d=>d.n===dn);let w=[],dead=0,rk=[],sum={recruit:0,dev:0,persuade:0,abil:0},tg={ind:0,fac:0,per:0,vote:0},n10=[],lost=[];
 for(let i=0;i<N;i++){const s=E.create(data,st,9000+i*17);let r1=null;while(s.month<120&&!s.won&&!s.over){const log=s.month<10?[]:null;const sp=bot(s,log);if(s.month<10){for(const k in sum)sum[k]+=sp[k];log.forEach(l=>{if(l.k==='공격(독립)')tg.ind++;else if(l.k==='공격(세력)')tg.fac++;else tg.per++});if(s.abil==='town'&&s.vote)tg.vote++}if(s.month===10)n10.push(E.dongsOf(s,0).length);if(s.won||s.over)break;E.endTurn(s);if(s.rank>=1&&r1===null)r1=s.month}if(s.won)w.push(s.month);if(s.over)dead++;if(r1!==null)rk.push(r1);lost.push(s.stat.lost)}
 const T=sum.recruit+sum.dev+sum.persuade+sum.abil||1;const pc=k=>Math.round(sum[k]/T*100)+'%';
 console.log(nm.padEnd(12),'|',E.abilityOf(data.d[st].type).padEnd(7),'|',w.length+'/'+N,'|',med(w),'|',med(rk),'|',[pc('recruit'),pc('dev'),pc('persuade'),pc('abil')].join('/'),'|',[tg.ind,tg.fac,tg.per,tg.vote].map(x=>Math.round(x/N)).join('/'),'|',med(n10),'|',med(lost))}
