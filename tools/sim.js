// 자동 플레이로 밸런스 확인
const E = require('../src/engine.js');
const data = JSON.parse(require('fs').readFileSync(__dirname + '/../data/game_data.json', 'utf8'));
E.setData(data);
const byName = (gu, n) => data.d.findIndex(d => d.n === n && data.gu[d.g].n === gu);

function smartBot(s) {
  const me = s.f[0];
  // 큰 이웃이 위협적이면 협정
  const neighbors = {};
  E.dongsOf(s, 0).forEach(i => data.d[i].a.forEach(j => { const o = s.owner[j]; if (o > 0) neighbors[o] = 1; }));
  for (const fid of Object.keys(neighbors)) {
    if (E.mergeCheck(s, +fid).ok && s.ap > 0 && me.money >= E.mergeCost(s, +fid)) E.merge(s, +fid);
  }
  for (const fid of Object.keys(neighbors)) {
    if (!s.f[fid].alive) continue;
    if (s.f[fid].troops > me.troops * 0.8 && E.pactCheck(s, +fid).ok && me.money >= E.pactCost(s, +fid)) E.pact(s, +fid);
  }
  // 개발: 수입의 40%까지
  const mine = E.dongsOf(s, 0);
  let budget = me.money * 0.4;
  for (const i of mine.slice().sort((a, b) => E.lv(s, a, 0) - E.lv(s, b, 0)).slice(0, 4)) {
    const t = s.owner[i] === 0 && data.d[i].P > data.d[i].E ? 2 : 0;
    const c = E.devCost(s, i, t);
    if (c !== null && c < 100 && c <= budget) { E.develop(s, i, t); budget -= c; }
  }
  if (me.money > 30) E.recruit(s, me.money * 0.85);
  // 공격: 싼 곳부터
  for (let guard = 0; guard < 20 && s.ap > 0 && !s.won; guard++) {
    const seen = {}; let best = -1, bestNeed = 1e9;
    E.dongsOf(s, 0).forEach(i => data.d[i].a.concat(E.subwayOf(i)).forEach(t => {
      if (seen[t] || s.owner[t] === 0) return; seen[t] = 1;
      const p = E.preview(s, t, 1); if (p.reason) return;
      const n = E.needFor(s, t, 0.8);
      const capB = s.owner[t] > 0 && s.f[s.owner[t]].cap === t ? 0.6 : 1;
      const score = n * capB / (data.d[t].P + data.d[t].E + 20);
      if (score < bestNeed && n <= me.troops) { bestNeed = score; best = t; }
    }));
    if (best < 0) break;
    E.attack(s, best, E.needFor(s, best, 0.8));
  }
}
function greedyBot(s) { // 개발·외교 없이 공격만
  const me = s.f[0];
  if (me.money > 0) E.recruit(s, me.money);
  for (let guard = 0; guard < 20 && s.ap > 0 && !s.won; guard++) {
    let best = -1, bn = 1e9; const seen = {};
    E.dongsOf(s, 0).forEach(i => data.d[i].a.forEach(t => {
      if (seen[t] || s.owner[t] === 0) return; seen[t] = 1;
      const n = E.needFor(s, t, 0.7); if (n < bn && n <= me.troops) { bn = n; best = t; }
    }));
    if (best < 0) break;
    E.attack(s, best, bn);
  }
}
function idleBot() {}

function run(start, seed, bot, maxM = 200) {
  const s = E.create(data, start, seed);
  const m = { rank1: null, rank2: null, peak: 0 };
  let timeline = [];
  while (s.month < maxM && !s.won && !s.over) {
    bot(s);
    s.ap = s.ap;
    if (s.won || s.over) break;
    E.endTurn(s);
    if (s.rank >= 1 && m.rank1 === null) m.rank1 = s.month;
    if (s.rank >= 2 && m.rank2 === null) m.rank2 = s.month;
    const fl = E.factionList(s);
    const top = fl.filter(f => f.id !== 0)[0];
    if (top) m.peak = Math.max(m.peak, top.n);
    if (s.month % 20 === 0) timeline.push(`${s.month}:${E.dongsOf(s, 0).length}/${top ? top.n : 0}/${fl.length}`);
  }
  return { s, m, timeline };
}
const med = a => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1] : null; };
const starts = { '역삼1동(부자)': byName('강남구', '역삼1동'), '소공동(돈O사람X)': byName('중구', '소공동'), '화곡1동(사람많음)': byName('강서구', '화곡1동'), '상계8동(베드)': byName('노원구', '상계8동'), '창신2동(약체)': byName('종로구', '창신2동'), '둔촌1동(최약)': byName('강동구', '둔촌1동'), '서교동': byName('마포구', '서교동') };
const N = +process.argv[2] || 24;
for (const [botName, bot] of [['smart', smartBot], ['greedy', greedyBot], ['idle', idleBot]]) {
  console.log('== ' + botName);
  for (const [nm, st] of Object.entries(starts)) {
    const res = []; for (let i = 0; i < N; i++) res.push(run(st, 1000 + i * 77, bot, 160));
    const wins = res.filter(r => r.s.won), dead = res.filter(r => r.s.over);
    console.log(nm.padEnd(16), 'win', wins.length + '/' + N, 'dead', dead.length, 'winM med', med(wins.map(r => r.s.month)), 'minM', wins.length ? Math.min(...wins.map(r => r.s.month)) : '-', 'deadM', med(dead.map(r => r.s.month)), '구청장', med(res.map(r => r.m.rank1).filter(x => x !== null)), '권역장', med(res.map(r => r.m.rank2).filter(x => x !== null)), 'AI최대', med(res.map(r => r.m.peak)), 'lost', med(res.map(r => r.s.stat.lost)));
    if (nm.startsWith('서교')) console.log('   sample', res[0].timeline.join(' '));
  }
}
