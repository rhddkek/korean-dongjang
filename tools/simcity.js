// 광역시 균형 점검: 추천 시작 동 4곳 × 두 가지 봇
const E=require('../src/engine.js');const presets=require('./presets.js');const fs=require('fs');
const cities=(process.argv[3]||'busan,daegu,incheon,gwangju,daejeon,ulsan').split(',');const N=+process.argv[2]||8;
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a.length?a[a.length>>1]:'-'};
function load(c){const d=JSON.parse(fs.readFileSync(__dirname+'/../data/'+(c==='seoul'?'game_data':'city_'+c)+'.json','utf8'));E.setCity(c==='seoul'?{id:'seoul',name:'서울',water:'한강',r2:4}:{id:c,name:d.cname,water:d.water,r2:Math.max(2,Math.round(d.gu.length/4))});E.setData(d);return d}
function bot(D,mode){return s=>{const me=s.f[0];
 if(s.ev)E.chooseEvent(s,0);
 const oi=E.offerInfo(s);if(oi&&oi.ok)E.acceptOffer(s);
 if(mode.smart){const pi=E.planInfo(s);if(pi&&pi.secN&&pi.secN<=2&&me.money>=pi.secSum)for(let k=0;k<pi.secN;k++)E.develop(s,pi.t,3);
  let b=me.money*.3;for(const i of E.dongsOf(s,0).sort((a,c)=>E.lv(s,a,0)-E.lv(s,c,0)).slice(0,4)){const t=D[i].P>D[i].E?2:0,c=E.devCost(s,i,t);if(c!==null&&c<100&&c<=b){E.develop(s,i,t);b-=c}}}
 const keep=mode.smart?(()=>{const p=E.planInfo(s);return p&&p.extra?Math.min(me.troops*.6,p.extra):0})():0;
 if(me.money>30)E.recruit(s,me.money*.85);
 if(s.rank>=1){const gs={};E.dongsOf(s,0).forEach(i=>D[i].a.forEach(j=>{if(s.owner[j]!==0)gs[D[j].g]=1}));for(let g of Object.keys(gs)){g=+g;while(s.ap>=E.guCost(s)&&!s.won){const p=E.guAttackPreview(s,g,.25);if(p.can<1)break;if(E.guAttack(s,g,.25).err)break}}}
 for(let k=0;k<20&&s.ap>0&&!s.won;k++){let best=-1,bn=1e9;const seen={};E.dongsOf(s,0).forEach(i=>D[i].a.concat(E.subwayOf(i,s)).forEach(t=>{if(seen[t]||s.owner[t]===0)return;seen[t]=1;const p=E.preview(s,t,1);if(p.reason)return;const n=E.needFor(s,t,.8);if(n<bn&&n<=me.troops-keep){bn=n;best=t}}));if(best<0)break;E.attack(s,best,bn)}}}
for(const c of cities){const d=load(c);const P=presets(E,d.d,d.gu);console.log('== '+c+' ('+d.cname+', '+d.d.length+'개 동, 세력 '+(E.create(d,0,1).f.length-1)+')');
 for(const p of P){const st=d.d.findIndex(x=>x.n===p[1]&&d.gu[x.g].n===p[0]);const row=[];
  for(const [mn,mode] of [['단순',{}],['대응',{smart:1}]]){let w=[],dead=0,r1=[],r2=[];for(let i=0;i<N;i++){const s=E.create(d,st,5000+i*71);const b=bot(d.d,mode);let a=null,bb=null;while(s.month<120&&!s.won&&!s.over){b(s);if(s.won||s.over)break;E.endTurn(s);if(s.rank>=1&&a===null)a=s.month;if(s.rank>=2&&bb===null)bb=s.month}if(s.won)w.push(s.month);if(s.over)dead++;if(a!==null)r1.push(a);if(bb!==null)r2.push(bb)}
   row.push(mn+' 승 '+w.length+'/'+N+' 패 '+dead+' 승리 '+med(w)+'개월 구청장 '+med(r1)+' 부시장 '+med(r2))}
  console.log(' ',(p[0]+' '+p[1]).padEnd(14),p[2].padEnd(6),p[3].padEnd(10),'|',row.join(' | '))}}
