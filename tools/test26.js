// v18: 이달 과제·연속 보상, 추천 줄 두 줄, 살림 탭, 소식 한 줄, 인원 부족 시 바로 모집
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const srv = http.createServer((q, r) => { if (/bgm\//.test(q.url)) { r.statusCode = 404; r.end(); return; } r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(fs.readFileSync('index.html')); }).listen(0);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('dongjang-replay', 'off'); } catch (e) {} });
  await p.goto('http://localhost:' + srv.address().port, { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '서교'); await p.waitForTimeout(100); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(500);
  const G = (f, a) => p.evaluate(f, a);
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  await dismiss();
  // 과제 표시
  const q0 = await G(() => { const e = document.getElementById('quest'); return { vis: !e.hidden && e.offsetParent !== null, t: e.innerText, q: __game.S.quest }; });
  ok(q0.vis && /이달 과제/.test(q0.t) && q0.q && q0.q.k === 'take' && q0.q.rw >= 10, '이달 과제 표시: ' + q0.t.replace(/\n/g, ' / '));
  // 추천 줄 두 줄 구조
  const td = await G(() => { const e = document.getElementById('todo'); return { b: (e.querySelector('b') || {}).textContent, s: (e.querySelector('small') || {}).textContent, h: e.getBoundingClientRect().height }; });
  ok(/치기 \d+%|설득/.test(td.b || '') && !/추천 ·/.test(td.b) && td.s && td.h <= 50, '추천 줄: ' + td.b + ' / ' + td.s + ' · 높이 ' + Math.round(td.h));
  // 동 2곳 얻기 → 보상
  const m0 = await G(() => __game.S.f[0].money);
  const rw = q0.q.rw, need = q0.q.n;
  await G(() => { const S = __game.S; S.f[0].troops = 3000; S.ap = 4; __game.sync(); });
  for (let k = 0; k < need; k++) {
    const t = await G(() => { const S = __game.S, D = __game.D, E = __game.E; let t = -1; E.dongsOf(S, 0).some(a => D[a].a.some(j => { if (S.owner[j] !== 0 && E.preview(S, j, 1).route) { t = j; return true; } })); __game.select(t, true); return t; });
    await p.waitForTimeout(200);
    const c95 = await p.$('.qp .chip[data-n]:nth-child(3):not([disabled])'); if (c95) { await c95.tap(); await p.waitForTimeout(150); }
    await p.tap('#atk'); await p.waitForTimeout(300);
    for (let r = 0; r < 3 && (await G(t => __game.S.owner[t], t)) !== 0 && await p.$('#atk:not([disabled])'); r++) { await p.tap('#atk'); await p.waitForTimeout(300); }
    await dismiss();
  }
  const q1 = await G(() => ({ q: __game.S.quest, money: __game.S.f[0].money, st: __game.S.qStreak, txt: document.getElementById('quest').innerText }));
  ok(q1.q.done === 1 && q1.st === 1, '과제 완료 · 연속 ' + q1.st + ' · ' + q1.txt.replace(/\n/g, ' / '));
  // 다음 달: 새 과제, 보상이 연속 보너스로 커짐
  await G(() => __game.select(null)); await p.tap('#next'); await p.waitForTimeout(900); await dismiss();
  const q2 = await G(() => ({ q: __game.S.quest, st: __game.S.qStreak, banner: document.getElementById('turnBanner').innerText, news: document.getElementById('news').textContent }));
  ok(q2.q && q2.q.m === await G(() => __game.S.month) && q2.q.done === 0 && q2.st === 1, '새 달 새 과제: ' + q2.q.txt + ' +' + q2.q.rw + '억');
  // 소식 줄은 한 문장
  ok(!/\.\s+\S/.test(q2.news), '소식 줄 한 문장: ' + q2.news);
  // 과제를 안 하고 넘기면 연속 끊김
  await G(() => __game.select(null)); await p.tap('#next'); await p.waitForTimeout(900); await dismiss();
  ok((await G(() => __game.S.qStreak)) === 0, '과제를 못 하면 연속 기록 0');
  // 살림 탭
  await p.tap('#cells'); await p.waitForTimeout(300);
  const tabs = await G(() => [...document.querySelectorAll('#sheet .tab')].map(t => t.textContent));
  ok(tabs.join(',') === '현황,살림,정책,구역,점령,세력', '동장실 탭: ' + tabs.join(','));
  const now = await G(() => { const sh = document.getElementById('sheet'); return { dev: !!sh.querySelector('.tabp[data-tp="now"] .chips.dt'), link: !!sh.querySelector('.tabp[data-tp="now"] .linkish[data-tab="dev"]') }; });
  ok(!now.dev && now.link, '현황 탭엔 개발 칩 없음 · 살림 바로가기');
  await p.tap('.tabp[data-tp="now"] .linkish[data-tab="dev"]'); await p.waitForTimeout(250);
  const dv = await G(() => { const sh = document.getElementById('sheet'); const pnl = sh.querySelector('.tabp[data-tp="dev"]'); return { vis: !pnl.hidden, rows: [...pnl.querySelectorAll('.rows.num .row')].map(r => r.innerText.replace(/\n/g, ' ')).slice(-3), rec: !!pnl.querySelector('.chip[data-m]') }; });
  ok(dv.vis && dv.rec && dv.rows.some(r => /월수입/.test(r)), '살림 탭: 모집·월 수지 ' + dv.rows.join(' | '));
  await G(() => __game.select(null)); await p.waitForTimeout(150);
  // 인원 부족 → 바로 모집 버튼
  const t3 = await G(() => { const S = __game.S, D = __game.D, E = __game.E; S.f[0].troops = 5; S.f[0].money = 5000; S.ap = 3; let t = -1; E.dongsOf(S, 0).some(a => D[a].a.some(j => { if (S.owner[j] !== 0 && E.preview(S, j, 1).route) { t = j; return true; } })); __game.sync(); __game.select(t, true); return t; });
  await p.waitForTimeout(250);
  const qb = await p.$('#qBuy');
  ok(!!qb, '인원 부족 시 바로 모집 버튼: ' + (qb ? (await qb.innerText()).replace(/\n/g, ' / ') : '없음'));
  if (qb) { await qb.tap(); await p.waitForTimeout(250); const pct = await G(() => document.getElementById('pctV') && document.getElementById('pctV').textContent); ok(+pct.replace('%', '') >= 78, '모집 뒤 승률 ' + pct); }
  await p.screenshot({ path: OUT + '/v18_buy.png' });
  ok(!errs.length, '오류 없음 ' + errs.join(' | '));
  await b.close(); srv.close();
})();
