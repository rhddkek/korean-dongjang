// v12: 정책 카드, 반동장 연합, 선거, 세력 회장 얼굴·대사
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8138);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const dismiss = async () => { for (let k = 0; k < 8; k++) { const pl = await p.$('#over:not([hidden]) #plOk'); if (pl) { const on = await p.$$eval('#card .pl.on', x => x.length); for (let i = 0; i < 2 - on; i++) { await p.tap('#card .pl:not(.on)'); await p.waitForTimeout(80); } await p.tap('#plOk'); await p.waitForTimeout(200); continue; } const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  await p.goto('http://localhost:8138', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '역삼1'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  // 1) 6달째 정책 회의 → 카드 세 장
  await G(() => { const S = __game.S; S.month = 5; S.cardNext = 6; S.seenFoe = 1; S.f[0].troops = 3000; });
  await p.tap('#next'); await p.waitForTimeout(400); await dismiss();
  let pick = await G(() => ({ open: !document.getElementById('over').hidden, n: document.querySelectorAll('#card .pcard').length, offer: __game.S.cardOffer }));
  for (let k = 0; k < 4 && !pick.n; k++) { await dismiss(); pick = await G(() => ({ open: !document.getElementById('over').hidden, n: document.querySelectorAll('#card .pcard').length, offer: __game.S.cardOffer })); }
  ok(pick.n === 3 && pick.offer && pick.offer.length === 3, '반년 정책 회의: 카드 3장 ' + JSON.stringify(pick.offer));
  await p.screenshot({ path: OUT + '/p1_cards.png' });
  const k0 = pick.offer[0];
  await p.tap('#card .pcard[data-k="' + k0 + '"]'); await p.waitForTimeout(250);
  const ch = await G(() => ({ cards: __game.S.cards, offer: __game.S.cardOffer, open: !document.getElementById('over').hidden }));
  ok(ch.cards.indexOf(k0) >= 0 && !ch.offer, '카드 고르면 시행: ' + ch.cards.join(','));
  // 효과 확인: 개발비 할인 카드
  const fx = await G(() => { const g = __game, S = g.S, E = g.E; const i = S.f[0].cap; const keep = S.cards.slice(); S.cards = []; const a = E.devCost(S, i, 1); S.cards = ['redev']; const c = E.devCost(S, i, 1); S.cards = keep; return { a, c }; });
  ok(fx.c < fx.a, '재개발 특례 개발비 ' + fx.a + '→' + fx.c);
  // 정보원 카드 → 안개 걷힘
  const fog = await G(() => { const g = __game, S = g.S, D = g.D; const i = D.findIndex(d => S.seenGu && !S.seenGu[d.g]); if (i < 0) return null; const keep = S.cards.slice(); const a = document.querySelectorAll ? null : null; S.cards = keep.concat(['intel']); g.sync(); g.select(i); const t = document.getElementById('sheet').textContent; S.cards = keep; return { fogText: /안개 속/.test(t) }; });
  ok(!fog || fog.fogText === false, '정보원: 안개 속 동도 보임');
  await p.tap('.x').catch(() => {});
  // 2) 세력 화면에 시행 중 정책
  await p.tap('#cells'); await p.waitForTimeout(200); let rs = await p.textContent('#sheet');
  ok(/시행 중인 정책 · 1장/.test(rs), '세력 화면 정책 목록'); await p.tap('.x');
  // 3) 승진 → 정책 카드가 승진 카드 다음에 바로
  const pr = await G(() => { const E = __game.E, S = __game.S; E.offerCards(S, 'rank'); S.promo = 1; __game.sync(); return 1; });
  await p.waitForTimeout(250);
  const t1 = await p.textContent('#card'); await p.tap('#cardOk'); await p.waitForTimeout(250);
  const t2 = await G(() => document.querySelectorAll('#card .pcard').length);
  ok(/구청장|기본 결재/.test(t1) && t2 === 3, '승진 카드 → 정책 카드 이어짐');
  await p.tap('#card .pcard'); await p.waitForTimeout(250);
  // 4) 연합 결성: 인구 45% 만들기
  const co = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D; S.cardOffer = null; S.cardNext = 999; S.rank = 2;
    const order = D.map((d, i) => i).sort((a, b) => D[a].x - D[b].x);
    let tot = D.reduce((a, d) => a + d.pop, 0), acc = 0;
    for (const i of order) { if (acc / tot >= 0.46) break; if (S.owner[i] !== 0) { S.owner[i] = 0; S.min[i] = 80; } acc += D[i].pop; }
    S.f.forEach(f => { if (f.id && f.alive && E.dongsOf(S, f.id).length === 0) f.alive = false; });
    S.f.forEach(f => { if (f.id && f.alive && S.owner[f.cap] !== f.id) { const ds = E.dongsOf(S, f.id); if (ds.length) f.cap = ds[0]; else f.alive = false; } });
    if (S.owner[S.f[0].cap] !== 0) S.f[0].cap = E.dongsOf(S, 0)[0];
    S.f[0].troops = 20000; S.seenGu = null; S.rivalPlan = null;
    return E.popShare(S, 0);
  });
  await p.tap('#next'); await p.waitForTimeout(500);
  let coal = await G(() => ({ c: __game.S.coal, txt: document.getElementById('card').textContent, open: !document.getElementById('over').hidden, faces: document.querySelectorAll('#card img.face').length }));
  for (let k = 0; k < 5 && !/반동장 연합/.test(coal.txt); k++) { await p.tap('#over:not([hidden]) #cardOk').catch(() => {}); await p.waitForTimeout(200); coal = await G(() => ({ c: __game.S.coal, txt: document.getElementById('card').textContent, open: !document.getElementById('over').hidden, faces: document.querySelectorAll('#card img.face').length })); }
  ok(coal.c && coal.c.m.length >= 2 && /반동장 연합 결성/.test(coal.txt) && coal.faces >= 2, '인구 ' + (co * 100).toFixed(1) + '% → 반동장 연합 ' + (coal.c ? coal.c.m.length : 0) + '곳, 얼굴 ' + coal.faces);
  await p.screenshot({ path: OUT + '/p2_coal.png' });
  await dismiss();
  // 연합 세력은 협정 불가
  const pc = await G(() => { const g = __game, S = g.S, E = g.E; const id = S.coal.m.find(x => S.f[x].alive); return E.pactCheck(S, id).why || ''; });
  ok(/연합/.test(pc), '연합 세력 협정 거절: ' + pc);
  // 상대 동 화면: 회장 얼굴
  const en = await G(() => { const g = __game, S = g.S, D = g.D; const i = D.findIndex((d, i) => S.owner[i] > 0 && S.f[S.owner[i]].alive); g.select(i); return i; });
  await p.waitForTimeout(250);
  const eh = await p.innerHTML('#sheet'); ok(/class="face"/.test(eh) && /회장/.test(eh) && /· 연합/.test(eh), '상대 동 화면에 회장 얼굴·연합 표시');
  await p.screenshot({ path: OUT + '/p3_boss.png' }); await p.tap('.x');
  // 5) 60% → 선거 예고
  const sh60 = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D;
    const order = D.map((d, i) => i).sort((a, b) => D[a].x - D[b].x);
    let tot = D.reduce((a, d) => a + d.pop, 0), acc = 0;
    for (const i of order) { if (acc / tot >= 0.61) break; if (S.owner[i] !== 0) { S.owner[i] = 0; S.min[i] = 85; } acc += D[i].pop; }
    S.f.forEach(f => { if (f.id && f.alive && S.owner[f.cap] !== f.id) { const ds = E.dongsOf(S, f.id); if (ds.length) f.cap = ds[0]; else f.alive = false; } });
    S.f.forEach(f => { if (f.id) { f.troops = 0; f.away = 0; } }); S.f[0].troops = 50000;
    return E.popShare(S, 0);
  });
  await p.tap('#next'); await p.waitForTimeout(500);
  let el = null;
  for (let k = 0; k < 5; k++) { el = await G(() => ({ e: __game.S.elect, won: __game.S.won, txt: document.getElementById('card').textContent, goal: document.getElementById('cPop') ? document.getElementById('cPop').textContent : '' })); if (/선거/.test(el.txt) && /달 뒤/.test(el.txt)) break; await p.tap('#over:not([hidden]) #cardOk').catch(() => {}); await p.tap('#over:not([hidden]) .pcard').catch(() => {}); await p.waitForTimeout(200); }
  ok(el.e && !el.won && /선거/.test(el.txt) && /예상 득표율/.test(el.txt), '인구 ' + (sh60 * 100).toFixed(1) + '% → 바로 취임 대신 선거 예고 (' + (el.e && el.e.at) + '달)');
  await p.screenshot({ path: OUT + '/p4_elect.png' });
  await dismiss();
  const goal = await G(() => document.getElementById('hud').textContent);
  ok(/선거 \d+달·\d+%/.test(goal), 'HUD 목표: 선거 카운트다운');
  await p.tap('#cells'); await p.waitForTimeout(200); rs = await p.textContent('#sheet'); ok(/선거 예측/.test(rs) && /득표율/.test(rs), '세력 화면 선거 예측'); await p.tap('.x');
  // 6) 낙선 → 재선거: 민심을 바닥으로
  const lose = await G(() => { const g = __game, S = g.S, E = g.E; E.dongsOf(S, 0).forEach(i => S.min[i] = 0); S.elect.at = S.month + 1; S.f[0].troops = 99999; return E.voteShare(S); });
  // 민심 0이면 독립이 터질 수 있어 화합 처리
  await G(() => { const S = __game.S; __game.E.guDongs().forEach((x, g) => { S.stable[g] = S.month + 12; }); });
  await p.tap('#next'); await p.waitForTimeout(500);
  let ls = null;
  for (let k = 0; k < 6; k++) { ls = await G(() => ({ e: __game.S.elect, won: __game.S.won, txt: document.getElementById('card').textContent })); if (/낙선|득표율/.test(ls.txt) && /재선거/.test(ls.txt)) break; await p.tap('#over:not([hidden]) #cardOk').catch(() => {}); await p.tap('#over:not([hidden]) .pcard').catch(() => {}); await p.waitForTimeout(200); }
  ok(!ls.won && ls.e && ls.e.n === 2 && /재선거/.test(ls.txt), '예상 ' + (lose * 100).toFixed(1) + '% → 낙선, 6달 뒤 재선거');
  await p.screenshot({ path: OUT + '/p5_lost.png' });
  await dismiss();
  // 7) 재선거 당선
  await G(() => { const g = __game, S = g.S, E = g.E; E.dongsOf(S, 0).forEach(i => S.min[i] = 100); S.elect.at = S.month + 1; });
  await p.tap('#next'); await p.waitForTimeout(500);
  let wn = null;
  for (let k = 0; k < 6; k++) { wn = await G(() => ({ won: __game.S.won, vote: __game.S.stat.vote, txt: document.getElementById('card').textContent })); if (wn.won && /취임/.test(wn.txt)) break; await p.tap('#over:not([hidden]) #cardOk').catch(() => {}); await p.waitForTimeout(200); }
  ok(wn.won && /득표율 \d+\.\d%/.test(wn.txt) && /2번째 도전/.test(wn.txt), '재선거 당선 → 끝 화면 득표율 ' + (wn.vote * 100).toFixed(1) + '%');
  await p.screenshot({ path: OUT + '/p6_win.png' });
  // 8) 예고·재생 말풍선: 회장 얼굴
  const face = await G(() => { const g = __game; const f = g.S.f.find(x => x.ai); const img = new Image(); return !!(f && f.boss && f.boss.nm); });
  ok(face, '세력마다 회장 이름 있음');
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
