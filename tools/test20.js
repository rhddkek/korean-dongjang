// v13.2: 침공 예고 화살표, 전후 숫자, 간단 보기 승률 버튼, 재생 진행 점, 승진 칸 막대, 끊긴 조합, 정책 카드 숫자, 넓은 화면
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8144);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const pick2 = async () => { const on = await p.$$eval('#card .pl.on', x => x.length); for (let i = 0; i < 2 - on; i++) { await p.tap('#card .pl:not(.on)'); await p.waitForTimeout(80); } await p.tap('#plOk'); await p.waitForTimeout(200); };
  const dismiss = async () => { for (let k = 0; k < 8; k++) { if (await p.$('#over:not([hidden]) #plOk')) { await pick2(); continue; } const pc = await p.$('#over:not([hidden]) button.pcard:not(.pl)'); if (pc) { await pc.tap(); await p.waitForTimeout(200); continue; } const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  await p.goto('http://localhost:8144', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '서교'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  await dismiss();

  // 1) 승진 칸 막대
  const seg = await G(() => document.querySelectorAll('#cSeg i').length);
  ok(seg >= 1, '위쪽 숫자판 승진 칸 막대 ' + seg + '칸');

  // 2) 간단 보기 승률 버튼 + 설득 전후 예산
  const t = await G(() => { const g = __game, S = g.S, D = g.D; S.f[0].troops = 5000; S.f[0].money = 900; const cap = S.f[0].cap; const j = D[cap].a.find(x => S.owner[x] === -1); g.sync(); return j; });
  await G(t => __game.select(t, true), t); await p.waitForTimeout(250);
  const q0 = await G(() => ({ chips: document.querySelectorAll('#sheet .qp .chip[data-n]').length, on: (document.querySelector('#sheet .qp .chip.on') || {}).textContent, pct: document.getElementById('pctV').textContent, txt: document.getElementById('sheet').innerText }));
  ok(q0.chips === 3 && /80/.test(q0.on || ''), '간단 보기 승률 버튼 3개, 80% 선택됨 (' + q0.on + ', ' + q0.pct + ')');
  ok(/남는 돈 [\d,]+억/.test(q0.txt), '설득 뒤 남는 돈 표시');
  await p.tap('#sheet .qp .chip[data-n]:nth-child(3)'); await p.waitForTimeout(200);
  const q1 = await G(() => ({ on: (document.querySelector('#sheet .qp .chip.on') || {}).textContent, pct: +document.getElementById('pctV').textContent.replace('%', ''), peek: document.getElementById('sheet').classList.contains('peek') }));
  ok(/95/.test(q1.on || '') && q1.pct >= 90 && q1.peek, '95% 누르면 승률 ' + q1.pct + '%, 간단 보기 유지');
  await p.screenshot({ path: OUT + '/w1_peek.png' });
  await p.tap('#qMore'); await p.waitForTimeout(200);
  const full = await G(() => document.getElementById('sheet').innerText);
  ok(/남는 돈/.test(full), '자세히에도 설득 뒤 남는 돈');
  await p.tap('.x');

  // 3) 침공 예고 화살표 (그림) + 꼬리표
  const plan = await G(() => { const g = __game, S = g.S, D = g.D; const cap = S.f[0].cap; const mine = D[cap].a.find(x => S.owner[x] === -1); S.owner[mine] = 0; const f = S.f.find(x => x.ai && x.alive); const src = D[mine].a.find(x => x !== cap && S.owner[x] !== 0); S.owner[src] = f.id; S.rivalPlan = { t: mine, f: f.id, why: '', cons: '', n: 300, mult: 0, src: src }; S.rivalPlanAt = S.month; g.sync(); return { mine, src }; });
  await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/w2_threat.png' });
  ok(!errs.length, '예고 화살표 그릴 때 오류 없음');

  // 4) 끊긴 조합: 세력 화면 '멈춤' + 보기 버튼, 추천 줄 '되찾기'
  const cb = await G(() => { const g = __game, S = g.S, D = g.D; const cap = S.f[0].cap; const a = D[cap].a.filter(x => x !== cap).slice(0, 2); a.forEach(x => S.owner[x] = 0); const miss = D[cap].a.find(x => !a.includes(x) && x !== cap && S.owner[x] !== 0) ; S.owner[miss] = -1; S.combo = { mk: { d: [cap, a[0], miss], at: 1 } }; S.ap = 3; S.f[0].troops = 20000; S.rivalPlan = null; g.sync(); return { miss, n: D[miss].n }; });
  const todo = await G(() => document.getElementById('todo').textContent);
  ok(/되찾기.*골목상권 재가동/.test(todo), '추천 줄: ' + todo);
  await p.tap('#cells'); await p.waitForTimeout(250); await p.evaluate(() => __game.tab('zone')); await p.waitForTimeout(100);
  const rm = await G(() => { const b = document.querySelector('#sheet [data-cgo]'); return { t: document.getElementById('sheet').innerText.match(/골목상권 연합[^\n]*\n[^\n]*/)?.[0], has: !!b }; });
  ok(rm.has && /멈춤/.test(rm.t || ''), '세력 화면 조합 멈춤 + 보기 버튼: ' + (rm.t || '').replace(/\n/g, ' / '));
  await p.evaluate(() => document.querySelector('#sheet [data-cgo]').scrollIntoView()); await p.screenshot({ path: OUT + '/w3_combo.png' });
  await p.tap('#sheet [data-cgo]'); await p.waitForTimeout(400);
  const went = await G(m => __game.S && document.getElementById('sheet').innerText.includes('되찾으면 골목상권 연합 다시 작동'), cb.miss);
  ok(went, '보기 → 그 동 간단 보기에 "되찾으면 … 다시 작동"');
  await p.tap('.x');

  // 5) 정책 카드: 지금 기준 숫자
  await G(() => { const g = __game, S = g.S; S.cardOffer = ['coupon', 'saving', 'talk']; S.cardWhy = 'half'; g.sync(); });
  await p.waitForTimeout(300);
  const cards = await G(() => Array.from(document.querySelectorAll('#over:not([hidden]) .pcard em.now')).map(e => e.textContent));
  ok(cards.length >= 2 && cards.some(x => /수입 월 \+/.test(x)) && cards.some(x => /절약/.test(x)), '정책 카드 지금 기준 숫자: ' + cards.join(' | '));
  await p.screenshot({ path: OUT + '/w4_cards.png' });
  await dismiss();

  // 6) 함락 소식에 월수입 전후 (센 적을 붙여 놓고 몇 달 넘김)
  await G(() => { const g = __game, S = g.S, D = g.D; S.month = 24; S.f[0].troops = 0; const f = S.f.find(x => x.ai && x.alive); f.troops = 2500; f.hate = 100; S.f[0].pact = {}; const mine = g.E.dongsOf(S, 0); mine.forEach(i => D[i].a.forEach(j => { if (S.owner[j] !== 0) S.owner[j] = f.id; })); g.sync(); });
  let news = '', card = '';
  for (let k = 0; k < 4; k++) {
    await p.tap('#next'); await p.waitForTimeout(700);
    card = await G(() => { const o = document.getElementById('over'); return o.hidden ? '' : document.getElementById('card').innerText; });
    news = await G(() => document.getElementById('news').textContent);
    if (/함락/.test(news)) break;
    await dismiss(); await G(() => { const S = __game.S; S.f[0].troops = 0; });
  }
  ok(/월수입 −?[\d,]+억→−?[\d,]+억/.test(news) || !/함락/.test(news), '함락 소식 월수입 전후: ' + news);
  if (card) { console.log('CARD ' + card.replace(/\n/g, ' / ').slice(0, 200)); ok(/월수입/.test(card), '결과 카드 월수입 전후'); await p.screenshot({ path: OUT + '/w5_lost.png' }); }
  await dismiss();
  ok(!errs.length, '오류 없음 ' + errs.join(' | '));
  await ctx.close();

  // 7) 재생 진행 점 (재생 켜고 한 달)
  const ctx2 = await b.newContext({ ...devices['iPhone 13'] }); const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push(e.message));
  await p2.addInitScript(() => { try { localStorage.setItem('dongjang-replay', 'normal'); } catch (e) {} });
  await p2.goto('http://localhost:8144', { waitUntil: 'load' }); await p2.waitForTimeout(400);
  await p2.fill('#q', '서교'); await p2.waitForTimeout(80); await p2.tap('#results button'); await p2.waitForTimeout(150); await p2.tap('#begin'); await p2.waitForTimeout(400);
  await p2.evaluate(() => { const g = __game, S = g.S; S.month = 12; S.seenGu = g.S.seenGu.map(() => 1); g.sync(); });
  let dots = 0, maxN = 0;
  for (let k = 0; k < 8 && !dots; k++) {
    await p2.tap('#next');
    for (let w = 0; w < 30 && !dots; w++) { await p2.waitForTimeout(100); const st = await p2.evaluate(() => ({ d: document.querySelectorAll('#rpDots i').length, n: +((document.getElementById('rpLabel').textContent.match(/\/(\d+)/) || [0, 0])[1]) })); dots = st.d; if (st.n > maxN) maxN = st.n; }
    if (dots) { await p2.waitForTimeout(450); await p2.screenshot({ path: OUT + '/w6_replay.png' }); }
    for (let w = 0; w < 80; w++) { await p2.waitForTimeout(100); if (await p2.evaluate(() => document.getElementById('rpBlock').hidden && document.getElementById('turnCal').hidden)) break; }
    for (let w = 0; w < 6; w++) { const c = await p2.$('#over:not([hidden]) #cardOk, #over:not([hidden]) button.pcard'); if (!c) break; await c.tap(); await p2.waitForTimeout(200); }
  }
  ok(dots >= 2 || (maxN < 2 && !dots), '상대 턴 진행 점 ' + dots + '개 (보인 상대 행동 최대 ' + maxN + '건)');
  await ctx2.close();

  // 8) 넓은 화면
  const ctx3 = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p3 = await ctx3.newPage(); p3.on('pageerror', e => errs.push(e.message));
  await p3.goto('http://localhost:8144', { waitUntil: 'load' }); await p3.waitForTimeout(400);
  await p3.fill('#q', '서교'); await p3.waitForTimeout(80); await p3.click('#results button'); await p3.waitForTimeout(150); await p3.click('#begin'); await p3.waitForTimeout(600);
  await p3.screenshot({ path: OUT + '/w7_wide_idle.png' });
  const tw = await p3.evaluate(() => { const g = __game, S = g.S, D = g.D; const cap = S.f[0].cap; return D[cap].a.find(x => S.owner[x] === -1); });
  await p3.evaluate(t => __game.select(t, true), tw); await p3.waitForTimeout(300);
  await p3.screenshot({ path: OUT + '/w8_wide_sel.png' });
  ok(!errs.length, '전체 오류 없음 ' + errs.join(' | '));
  await b.close(); srv.close();
})();
