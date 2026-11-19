// v14.1: 전체 개발(한 번에) + 매달 자동 개발
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body><script>try{localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8145);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  await p.goto('http://localhost:8145', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '서교'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  for (let k = 0; k < 4; k++) { const c = await p.$('#over:not([hidden]) #cardOk, #over:not([hidden]) button.pcard'); if (!c) break; await c.tap(); await p.waitForTimeout(200); }
  await G(() => { const g = __game, S = g.S, D = g.D; const cap = S.f[0].cap; D[cap].a.slice(0, 6).forEach(j => { S.owner[j] = 0; S.min[j] = 70; }); S.min[D[cap].a[0]] = 30; S.f[0].money = 2000; g.sync(); });
  await p.tap('#cells'); await p.waitForTimeout(300); await G(() => __game.tab('dev')); await p.waitForTimeout(150);
  const t0 = await G(() => document.getElementById('sheet').innerText);
  ok(/전체 개발 · 우리 동 7곳/.test(t0) && /추천대로 \d+곳 짓기/.test(t0), '살림 탭에 전체 개발 · 추천 버튼');
  await p.screenshot({ path: OUT + '/r1_realm_dev.png' });
  const before = await G(() => ({ dev: __game.S.dev.reduce((a, b) => a + b, 0), m: __game.S.f[0].money, ap: __game.S.ap }));
  await p.tap('#realmDev'); await p.waitForTimeout(300);
  const after = await G(() => ({ dev: __game.S.dev.reduce((a, b) => a + b, 0), m: __game.S.f[0].money, ap: __game.S.ap, sec: __game.S.dev[__game.D[__game.S.f[0].cap].a[0] * 4 + 3], news: document.getElementById('news').textContent }));
  ok(after.dev - before.dev === 7 && after.m < before.m && after.ap === before.ap, '추천대로 7곳 한 단계씩 · 결재 그대로 · ' + after.news);
  ok(after.sec === 1, '민심 낮은 동은 치안부터');
  // 상권만, 절반 예산
  await p.tap('.chip[data-dt="0"]'); await p.waitForTimeout(150); await p.tap('.chip[data-db="0.5"]'); await p.waitForTimeout(150);
  const t1 = await G(() => ({ txt: document.getElementById('realmDev').textContent, m: __game.S.f[0].money }));
  const cost = +(t1.txt.match(/([\d,]+)억/) || [0, '0'])[1].replace(/,/g, '');
  ok(/상권 \d+곳 짓기/.test(t1.txt) && cost <= t1.m / 2 + 0.5, '상권 · 절반 예산 미리보기: ' + t1.txt);
  // 매달 자동 30%
  await p.tap('.chip[data-dp="0.3"]'); await p.waitForTimeout(200);
  const dp = await G(() => __game.S.devPlan);
  ok(dp && dp.t === 0 && dp.pct === 0.3, '매달 자동 켬 ' + JSON.stringify(dp));
  await p.screenshot({ path: OUT + '/r2_realm_auto.png' });
  await p.tap('.x'); await p.waitForTimeout(150);
  const b2 = await G(() => __game.S.dev.reduce((a, b) => a + b, 0));
  await p.tap('#next'); await p.waitForTimeout(900);
  for (let k = 0; k < 4; k++) { const c = await p.$('#over:not([hidden]) #cardOk, #over:not([hidden]) button.pcard'); if (!c) break; await c.tap(); await p.waitForTimeout(200); }
  const a2 = await G(() => ({ dev: __game.S.dev.reduce((a, b) => a + b, 0), log: __game.S.log.filter(l => /자동 개발/.test(l.t)).map(l => l.t)[0] }));
  ok(a2.dev > b2 && /자동 개발 · 상권/.test(a2.log || ''), '다음 달 자동 개발: ' + a2.log);
  // 저장·불러오기 후 유지
  const dp2 = await G(() => { for (let k = 0; k < localStorage.length; k++) { const v = localStorage.getItem(localStorage.key(k)); if (v && v.indexOf('"devPlan"') >= 0) return JSON.parse(v).devPlan; } return null; });
  ok(dp2 && dp2.pct === 0.3, '자동 개발 설정 저장 유지');
  ok(!errs.length, '오류 없음 ' + errs.join(' | '));
  await b.close(); srv.close();
})();
