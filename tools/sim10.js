// v19 확인: 공작·보복·재기·연쇄 투항·조기 선거. 엔진만 돌리는 빠른 비교 (옛 엔진 경로를 넘기면 같은 시드로 비교)
const path = require('path'), fs = require('fs');
const NEW = require('../src/engine.js'), OLD = process.argv[4] ? require(path.resolve(process.argv[4])) : null;
const data = JSON.parse(fs.readFileSync(__dirname + '/../data/game_data.json', 'utf8')); const D = data.d;
function attack(E, s) {
  for (let k = 0; k < 30 && s.ap > 0 && !s.won; k++) {
    if (s.rank >= 1) { const gs = {}; E.dongsOf(s, 0).forEach(i => D[i].a.forEach(j => { if (s.owner[j] !== 0) gs[D[j].g] = 1; })); let did = false; for (let g of Object.keys(gs)) { g = +g; if (s.ap >= E.guCost(s) && E.guAttackPreview(s, g, 0.2).can) { const r = E.guAttack(s, g, 0.2); if (r.ok) did = true; } } if (did) continue; }
    let best = -1, bp = 0; const seen = {};
    E.dongsOf(s, 0).forEach(i => D[i].a.forEach(t => { if (seen[t] || s.owner[t] === 0) return; seen[t] = 1; const n = E.needFor(s, t, 0.8); if (n && n <= s.f[0].troops * 0.8 && D[t].pop > bp) { bp = D[t].pop; best = t; } }));
    if (best < 0) break; const r = E.attack(s, best, E.needFor(s, best, 0.8)); if (r.err) break;
  }
}
function persuadeAll(E, s) { const seen = {}; E.dongsOf(s, 0).forEach(i => D[i].a.forEach(t => { if (seen[t] || s.owner[t] !== -1 || s.ap <= 0) return; seen[t] = 1; if (E.persuadeCost(s, t) <= s.f[0].money * 0.6) E.persuade(s, t); })); }
function ops(E, s) {
  if (!E.doOp || s.ap <= 0) return;
  const seen = {}; let best = null;
  E.dongsOf(s, 0).forEach(i => D[i].a.forEach(t => { const o = s.owner[t]; if (o <= 0 || seen[o]) return; seen[o] = 1;
    for (const k of ['bribe', 'feud', 'split']) { const r = E.opInfo(s, k, t); if (r.ok && r.odds >= 0.55 && r.cost <= s.f[0].money * 0.5) { const v = r.odds * (k === 'split' ? 3 : k === 'feud' ? 2 : 1); if (!best || v > best.v) best = { k, t, v }; } } }));
  if (best) E.doOp(s, best.k, best.t);
}
function play(E, st, seed, useOps) {
  const s = E.create(data, st, seed);
  while (s.month < 110 && !s.won && !s.over) {
    if (s.at45 === undefined && E.popShare(s, 0) >= 0.45) s.at45 = s.month;
    if (useOps) ops(E, s);
    persuadeAll(E, s); const r = s.f[0].money * 0.9; if (r > 10) E.recruit(s, r); attack(E, s);
    if (s.offer) E.acceptOffer(s);
    if (s.cardOffer) E.chooseCard(s, s.cardOffer[0]);
    if (s.ev) try { E.chooseEvent(s, 0); } catch (e) {}
    E.endTurn(s);
  }
  return s;
}
const med = a => { a = a.slice().sort((x, y) => x - y); return a.length ? a[a.length >> 1] : '-'; };
const N = +process.argv[2] || 8;
for (const st0 of (process.argv[3] || '서교동,상계8동,대치1동').split(',')) {
  const st = D.findIndex(d => d.n === st0); console.log('== ' + st0);
  const rows = [['옛 엔진', OLD, false], ['새 엔진', NEW, false], ['새 엔진+공작', NEW, true]].filter(x => x[1]);
  for (const [nm, E, uo] of rows) {
    E.setData(data);
    const w = [], dead = [], agg = {};
    for (let i = 0; i < N; i++) { const s = play(E, st, 9100 + i * 37, uo); if (s.won) w.push(s.month); if (s.over) dead.push(s.overWhy || 'zero'); for (const k of ['ops', 'opsWon', 'down', 'surr', 'foeOpStop', 'lost']) agg[k] = (agg[k] || 0) + (s.stat[k] || 0); if (s.won && s.at45 !== undefined) (agg.tail = agg.tail || []).push(s.month - s.at45); }
    console.log(nm.padEnd(10), '승', w.length + '/' + N, '중앙', med(w), '45%뒤 중앙', med(agg.tail || []), '평균', agg.tail ? (agg.tail.reduce((x, y) => x + y, 0) / agg.tail.length).toFixed(1) : '-', '패', dead.join(',') || 0, '| 공작', agg.ops, '성공', agg.opsWon, '재기', agg.down, '투항세력', agg.surr, '포섭막음', agg.foeOpStop, '잃은동', agg.lost);
  }
}
