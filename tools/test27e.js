// v19 엔진 단위 확인: 공작 4종, 결속형, 보복, 상대 포섭, 재기, 깔끔한 패배, 연쇄 투항, 조기 선거
const E = require('../src/engine.js'), fs = require('fs');
const data = JSON.parse(fs.readFileSync(__dirname + '/../data/game_data.json', 'utf8')); const D = data.d; E.setData(data);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const st = D.findIndex(d => d.n === '서교동');
function fresh(seed) { const s = E.create(data, st, seed || 4242); s.month = 14; return s; }
function bigFaction(s) { return s.f.filter(f => f.ai && f.alive).sort((a, b) => E.dongsOf(s, b.id).length - E.dongsOf(s, a.id).length)[0]; }
// 1) 포섭: 성공·실패 둘 다 확인 (시드를 바꿔 가며)
{ let win = 0, lose = 0, retal = 0;
  for (let k = 0; k < 40 && (!win || !lose); k++) {
    const s = fresh(100 + k), f = bigFaction(s); while (E.dongsOf(s, f.id).length < 4) { const free = D.findIndex((d, i) => s.owner[i] === -1 && d.a.some(j => s.owner[j] === f.id)); if (free < 0) break; s.owner[free] = f.id; }
    if (f.grp === '노인회' || f.grp === '반상회') f.grp = '상인회';
    // 우리 동과 맞닿은 세력 동을 하나 만들어 보복 대상이 생기게
    const t = E.dongsOf(s, f.id).find(i => i !== f.cap); const nb = D[s.f[0].cap].a.find(j => s.owner[j] !== 0); s.owner[nb] = f.id;
    s.f[0].money = 9999; s.ap = 5;
    const r = E.doOp(s, 'bribe', t);
    if (r.err) { ok(false, '포섭 실행: ' + r.err); break; }
    if (r.win) { win++; if (k === 0 || win === 1) ok(s.owner[t] === 0, '포섭 성공 → 우리 동'); }
    else { lose++; retal += f.retal ? 1 : 0; ok(s.owner[t] === f.id && /들킴/.test(s.log[0].t + s.log[1].t), '포섭 실패 → 그대로 · 들킴 기록'); }
  }
  ok(win && lose, '포섭 성공 ' + win + ' · 실패 ' + lose + ' · 실패 시 보복 예고 ' + retal);
}
// 2) 결속형은 포섭·내분 불가, 무너지면 통째로
{ const s = fresh(7), f = bigFaction(s); f.grp = '노인회';
  const t = E.dongsOf(s, f.id).find(i => i !== f.cap) ?? f.cap; s.f[0].money = 9999; s.ap = 5;
  ok(!E.opInfo(s, 'bribe', t).ok && /결속형/.test(E.opInfo(s, 'bribe', t).why), '결속형 포섭 불가: ' + E.opInfo(s, 'bribe', t).why);
  ok(E.traitOf(s, f.id).tight === 1, '결속형 성향');
}
// 3) 이간질 성공이면 두 세력이 서로 싸우는 상태
{ let done = false;
  for (let k = 0; k < 30 && !done; k++) { const s = fresh(300 + k); s.f[0].money = 9999; s.ap = 5;
    for (const f of s.f.filter(x => x.ai && x.alive)) { const t = E.dongsOf(s, f.id)[0]; const r0 = E.opInfo(s, 'feud', t); if (!r0.ok) continue; const r = E.doOp(s, 'feud', t); if (r.win) { ok(f.war && s.f[r0.b].war && f.war.f === r0.b, '이간질 성공 → 서로 싸움 (' + f.name + ' ↔ ' + r.b + ')'); done = true; } break; } }
  if (!done) ok(false, '이간질 성공 사례 없음');
}
// 4) 내분 조장: 동 일부 독립 + 설득 할인
{ let done = false;
  for (let k = 0; k < 40 && !done; k++) { const s = fresh(500 + k), f = bigFaction(s); if (f.grp === '노인회' || f.grp === '반상회') f.grp = '상인회';
    let add = 0; for (let i = 0; i < D.length && E.dongsOf(s, f.id).length < 7; i++) if (s.owner[i] === -1 && D[i].a.some(j => s.owner[j] === f.id)) { s.owner[i] = f.id; add++; }
    s.f[0].money = 9999; s.ap = 5; const n0 = E.dongsOf(s, f.id).length, t = E.dongsOf(s, f.id)[0];
    const r = E.doOp(s, 'split', t); if (r.err) continue;
    if (r.win) { const fr = r.freed; const i0 = D.findIndex((d, i) => s.cheap && s.cheap[i] > s.month && s.owner[i] === -1); ok(E.dongsOf(s, f.id).length === n0 - fr && fr >= 1 && i0 >= 0, '내분 성공 → ' + fr + '곳 독립 (' + n0 + '→' + E.dongsOf(s, f.id).length + ')'); const c1 = E.persuadeCost(s, i0); s.cheap[i0] = 0; ok(c1 < E.persuadeCost(s, i0), '독립한 동 설득 할인 ' + c1 + ' < ' + E.persuadeCost(s, i0)); done = true; }
    else ok(f.tightUntil > s.month && !E.opInfo(s, 'split', t).ok, '내분 실패 → 경계 (다시 불가)');
  }
}
// 5) 한 달에 같은 세력을 두 번 치면 보복 예고
{ const s = fresh(9); s.f[0].troops = 4000; s.ap = 9; const f = bigFaction(s); f.troops = 500;
  const cap0 = s.f[0].cap, nbs = D[cap0].a.slice(0, 3); nbs.forEach(j => { s.owner[j] = f.id; });
  // 공격 뒤에도 맞닿은 세력 동이 남도록 하나 더
  const extra = D[nbs[2]].a.find(j => j !== cap0 && s.owner[j] !== 0); if (extra !== undefined) s.owner[extra] = f.id;
  E.attack(s, nbs[0], E.needFor(s, nbs[0], 0.95) || 9999); E.attack(s, nbs[1], E.needFor(s, nbs[1], 0.95) || 9999);
  ok(!!f.retal, '같은 세력 두 번 공격 → 보복 예고 ' + (f.retal ? D[f.retal.t].n : '없음'));
}
// 6) 상대 포섭: 치안이 높으면 잘 막음
{ const s = fresh(11), t = s.f[0].cap; const nb = D[t].a[0]; s.owner[nb] = 0;
  const d0 = E.foeOpDef(s, nb); s.dev[nb * 4 + 3] = 4; const d1 = E.foeOpDef(s, nb);
  ok(d1 > d0 + 0.4, '치안 4단계 → 포섭 막을 확률 ' + Math.round(d0 * 100) + '% → ' + Math.round(d1 * 100) + '%');
}
// 7) 재기: 동 4곳 이하면 3달 도움, 모집 2배
{ const s = fresh(13); const m0 = s.f[0].money = 100; const r0 = E.recruit(s, 10).n; s.down = { until: s.month + 2 }; const r1 = E.recruit(s, 10).n;
  ok(r1 === r0 * 2, '재기 중 모집 2배 ' + r0 + '→' + r1); s.down = null;
  E.endTurn(s); ok(E.downOn(s) && s.stat.down === 1, '동 ' + E.dongsOf(s, 0).length + '곳 → 재기의 기회 발동');
}
// 8) 깔끔한 패배
{ const s = fresh(15); s.lowFrom = s.month - 11; for (let k = 0; k < 2 && !s.over; k++) E.endTurn(s);
  ok(s.over && s.overWhy === 'stall', '12달 동안 5곳 미만 → 재기 실패 패배');
}
// 9) 연쇄 투항: 판이 기운 뒤 큰 세력 해체 시 작은 세력이 손듦
{ const s = fresh(17); s.rank = 2; s.f[0].troops = 99999;
  const ais = s.f.filter(f => f.ai && f.alive); const small = ais.slice(0, 3);
  small.forEach(f => { const c = f.cap; const nb = D[c].a.find(j => s.owner[j] !== f.id); if (nb !== undefined) s.owner[nb] = 0; f.troops = 10; });
  const sv = E.surrender(s, -1);
  ok(sv && sv.n >= 1 && sv.names.length >= 1, '연쇄 투항 ' + (sv ? sv.names.length + '개 세력 · ' + sv.n + '곳' : '없음'));
}
// 10) 조기 선거: 55~60% + 남은 세력이 모두 작으면
{ const s = fresh(19); const tot = D.reduce((a, d) => a + d.pop, 0); let p = 0; const order = D.map((d, i) => i).sort((a, b) => D[b].pop - D[a].pop);
  for (const i of order) { if (p / tot >= 0.565) break; s.owner[i] = 0; p += D[i].pop; }
  // 나머지 세력 동을 쪼개 모두 작게
  s.f.forEach(f => { if (f.ai) { const l = E.dongsOf(s, f.id); l.slice(3).forEach(i => s.owner[i] = -1); } });
  s.elect = null; E.endTurn(s);
  ok(s.elect && s.elect.early === 1, '인구 ' + Math.round(E.popShare(s, 0) * 100) + '% · 조기 선거 ' + (s.elect ? s.elect.at + '달' : '없음'));
}
