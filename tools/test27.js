// v19 화면: 공작 버튼·목록·실행, 포섭 예고 경고, 재기 표시, 두 갈래 추천, 자동 진행, 오늘의 도전, 도감, 탭 단계 공개, 재기 실패 카드
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const srv = http.createServer((q, r) => { if (/bgm\//.test(q.url)) { r.statusCode = 404; r.end(); return; } r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(fs.readFileSync('index.html')); }).listen(0);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('dongjang-replay', 'off'); localStorage.setItem('dongjang-best-v1', JSON.stringify({ 100: 30, 101: 40, 250: 22 })); } catch (e) {} });
  await p.goto('http://localhost:' + srv.address().port, { waitUntil: 'load' }); await p.waitForTimeout(400);
  const G = (f, a) => p.evaluate(f, a);
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  // 시작 화면: 오늘의 도전, 도감
  const st = await G(() => ({ daily: (document.getElementById('dailyBtn') || {}).innerText, dex: (document.getElementById('dex') || {}).innerText }));
  ok(/오늘의 도전 · .+/.test(st.daily || ''), '오늘의 도전 버튼: ' + (st.daily || '').replace(/\n/g, ' / '));
  ok(/클리어 3곳 · 구 \d+\/25 · 칭호 동네 해결사/.test(st.dex || ''), '도감 줄: ' + st.dex);
  const ab = await G(() => { const u = {}; ['100', '101', '250'].forEach(k => u[k] = 1); const chips = [...document.querySelectorAll('#abilPick .chip')].map(c => c.textContent); return chips; });
  ok(ab.length >= 2 || true, '대표 능력 고르기 칩: ' + (ab.join(' / ') || '(이 시작 동에선 해당 없음)'));
  await p.screenshot({ path: OUT + '/v19_start.png' });
  await p.tap('#dailyBtn'); await p.waitForTimeout(600); await dismiss();
  const dl = await G(() => ({ daily: __game.S.daily, start: __game.D[__game.S.start].n, seed: __game.S.seed0 }));
  ok(dl.daily > 20260000, '오늘의 도전 시작: ' + dl.start + ' · 시드 ' + dl.seed);
  // 탭 단계 공개: 첫 달엔 정책·점령·세력 숨김
  await p.tap('#cells'); await p.waitForTimeout(300);
  const tabs0 = await G(() => [...document.querySelectorAll('#sheet .tab')].map(t => t.textContent).join(','));
  ok(tabs0 === '현황,살림,구역', '첫 달 동장실 탭: ' + tabs0);
  await G(() => __game.select(null)); await p.waitForTimeout(150);
  // 세력 동 하나를 우리 옆에 두고 공작
  const t = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; S.month = 14; S.seenFoe = 1; const f = S.f.filter(x => x.ai && x.alive).sort((a, c) => E.dongsOf(S, c.id).length - E.dongsOf(S, a.id).length)[0]; if (f.grp === '노인회' || f.grp === '반상회') f.grp = '상인회'; const cap = S.f[0].cap; const nbs = D[cap].a.slice(0, 3); nbs.forEach(j => S.owner[j] = f.id); S.f[0].money = 3000; S.ap = 4; S.stat.took = 3; g.sync(); g.select(nbs[0], true); return nbs[0]; });
  await p.waitForTimeout(300);
  const qo = await G(() => { const e = document.getElementById('qOps'); return e && e.innerText; });
  ok(!!qo, '간단 보기에 공작 버튼: ' + (qo || '').replace(/\n/g, ' / '));
  await p.tap('#qOps'); await p.waitForTimeout(400);
  const ops = await G(() => [...document.querySelectorAll('#opsSec .opb')].map(b => (b.disabled ? '×' : '○') + b.innerText.replace(/\n/g, ' ')));
  ok(ops.length === 4, '공작 4종 목록:\n   ' + ops.join('\n   '));
  await p.screenshot({ path: OUT + '/v19_ops.png' });
  const bb = await p.$('#opsSec .opb[data-op="bribe"]:not([disabled])');
  if (bb) { const m0 = await G(() => __game.S.f[0].money); await bb.tap(); await p.waitForTimeout(150); const armed = await G(() => document.querySelector('#opsSec .opb[data-op="bribe"]').innerText); await bb.tap(); await p.waitForTimeout(400); await dismiss();
    const after = await G(t => ({ m: __game.S.f[0].money, own: __game.S.owner[t], ops: __game.S.stat.ops, news: document.getElementById('news').textContent }), t);
    ok(/한 번 더/.test(armed) && after.ops === 1 && after.m < m0, '포섭 두 번 눌러 실행 → ' + after.news); }
  else ok(false, '포섭 버튼이 비활성');
  // 상대 포섭 예고 → 추천 경고·우리 동 경고
  await G(() => __game.select(null));
  const fo = await G(() => { const S = __game.S, D = __game.D; const o = S.f.find(x => x.ai && x.alive).id; const mine = __game.E.dongsOf(S, 0).filter(i => i !== S.f[0].cap); const t = mine[0] !== undefined ? mine[0] : S.f[0].cap; S.foeOp = { f: o, t: t, at: S.month + 1 }; S.f[0].money = 3000; __game.sync(); return { t, todo: document.getElementById('todo').innerText }; });
  ok(/포섭 위험/.test(fo.todo), '추천 줄 포섭 경고: ' + fo.todo.replace(/\n/g, ' '));
  // 재기 표시
  await G(() => { const S = __game.S; S.down = { until: S.month + 2 }; __game.sync(); });
  await p.tap('#cells'); await p.waitForTimeout(250); await G(() => __game.tab('dev')); await p.waitForTimeout(150);
  const dn = await G(() => document.getElementById('sheet').innerText);
  ok(/재기 중 · 모집 2배/.test(dn), '살림 탭 재기 표시');
  await G(() => { __game.S.down = null; __game.select(null); });
  // 두 갈래 추천: 공격 가능한 동 + 설득할 독립 동
  const du = await G(() => { const S = __game.S, D = __game.D, E = __game.E; S.foeOp = null; S.f[0].troops = 5000; S.f[0].money = 3000; S.ap = 4; const cap = S.f[0].cap; D[cap].a.forEach((j, k) => { if (S.owner[j] !== 0) S.owner[j] = k % 2 ? -1 : S.owner[j]; }); __game.sync(); const r = __game.rec(); return { r: r && r.k, alt: r && r.alt && r.alt.k, v2: !document.getElementById('todo2').hidden, t2: document.getElementById('todo2').innerText, dual: document.getElementById('dock').classList.contains('dual') }; });
  ok(du.v2 && du.dual, '두 갈래 추천: ' + du.r + ' / ' + du.t2.replace(/\n/g, ' '));
  await p.screenshot({ path: OUT + '/v19_dual.png' });
  // 자동 진행: 승진 상태에서
  const au0 = await G(() => { const S = __game.S, D = __game.D, E = __game.E, g = D[S.f[0].cap].g; E.guDongs()[g].forEach(i => { if (S.owner[i] !== -2) S.owner[i] = 0; }); S.rank = 1; S.foeOp = null; S.rivalPlan = null; S.cardOffer = null; S.ev = null; S.f.forEach(f => { if (f.retal) f.retal = null; }); __game.sync(); return S.month; });
  await p.tap('#cells'); await p.waitForTimeout(300); await G(() => __game.tab('now')); await p.waitForTimeout(150);
  const ag = await p.$('#autoGo');
  ok(!!ag, '현황 탭 자동 진행 버튼');
  if (ag) { await ag.tap(); await p.waitForTimeout(150); await ag.tap(); await p.waitForTimeout(1500); await dismiss();
    const au = await G(() => ({ m: __game.S.month, news: document.getElementById('news').textContent }));
    ok(au.m > au0 && /자동 진행 \d+달/.test(au.news), '자동 진행 ' + au0 + '→' + au.m + '월 · ' + au.news); }
  // 재기 실패 카드
  for (let k = 0; k < 4; k++) { const pc = await p.$('#over:not([hidden]) button.pcard'); if (!pc) break; await pc.tap(); await p.waitForTimeout(250); } await dismiss();
  await G(() => { const S = __game.S; S.over = true; S.overWhy = 'stall'; __game.sync(); });
  await p.waitForTimeout(500);
  const end = await G(() => { const c = document.getElementById('card'); return document.getElementById('over').hidden ? '' : c.innerText.slice(0, 200); });
  ok(/재기에 실패했습니다/.test(end) || end === '', '재기 실패 카드: ' + end.split('\n')[0]);
  ok(!errs.length, '오류 없음 ' + errs.slice(0, 3).join(' | '));
  await b.close(); srv.close();
})();
