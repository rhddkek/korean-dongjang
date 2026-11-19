// v12.1: 간단 보기(peek) 시트, 할 일 줄 추천, 다음 달 버튼 결재 표시, 우리 동 한 번 눌러 개발
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8142);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  await p.goto('http://localhost:8142', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '소공'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  // 할 일 줄
  const todo = await G(() => ({ hid: document.getElementById('todo').hidden, t: document.getElementById('todo').textContent, next: document.getElementById('next').innerText }));
  ok(!todo.hid && /(치기 \d+%|설득)/.test(todo.t) && !/추천 ·/.test(todo.t), '할 일 줄 추천: ' + todo.t);
  ok(/결재 2건 남음/.test(todo.next), '다음 달 버튼에 남은 결재: ' + todo.next.replace(/\n/g, ' '));
  // 지도 탭 → 간단 보기: 지도가 절반 넘게 보이고 공격 버튼이 바로 있음
  const pos = await G(() => { const g = __game, S = g.S, D = g.D, c = g.cam(); const j = D[S.f[0].cap].a.find(x => S.owner[x] !== 0); return { j, x: D[j].x * c.s + c.x, y: D[j].y * c.s + c.y }; });
  await p.touchscreen.tap(pos.x, pos.y); await p.waitForTimeout(400);
  const pk = await G(() => { const sh = document.getElementById('sheet'); const r = sh.getBoundingClientRect(); return { peek: sh.classList.contains('peek'), h: r.height, H: innerHeight, atk: !!document.querySelector('#sheet #atk'), slider: !!document.querySelector('#sheet #send'), more: !!document.getElementById('qMore'), todoHid: document.getElementById('todo').hidden }; });
  ok(pk.peek && pk.h < pk.H * 0.4 && pk.atk && !pk.slider && pk.more, '지도 탭 → 간단 보기 (시트 ' + Math.round(pk.h) + 'px / ' + pk.H + ')');
  await p.screenshot({ path: OUT + '/u1_peek.png' });
  // 자세히 → 전체 시트(슬라이더·칩)
  await p.tap('#qMore'); await p.waitForTimeout(300);
  const fl = await G(() => ({ peek: document.getElementById('sheet').classList.contains('peek'), slider: !!document.querySelector('#sheet #send'), chips: document.querySelectorAll('#sheet .chip').length }));
  ok(!fl.peek && fl.slider && fl.chips >= 5, '자세히 → 승률 칩 4개 + 직접(슬라이더)');
  await p.tap('.x'); await p.waitForTimeout(150);
  // 할 일 줄 누르면 그 동 간단 보기, 그동안 할 일 줄은 숨김
  await p.tap('#todo'); await p.waitForTimeout(350);
  const td = await G(() => ({ sel: document.querySelector('#sheet h2') && document.querySelector('#sheet h2').textContent, peek: document.getElementById('sheet').classList.contains('peek'), todoHid: document.getElementById('todo').hidden }));
  ok(td.peek && td.sel && td.todoHid, '할 일 줄 → ' + td.sel + ' 간단 보기, 할 일 줄 숨김');
  // 간단 보기에서 바로 공격
  const ap0 = await G(() => __game.S.ap);
  const btn = await p.$('#atk:not([disabled])');
  if (btn) { await btn.tap(); await p.waitForTimeout(400); }
  for (let k = 0; k < 4; k++) { const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(200); }
  const ap1 = await G(() => __game.S.ap);
  ok(btn && ap1 === ap0 - 1, '간단 보기에서 바로 공격 (결재 ' + ap0 + '→' + ap1 + ')');
  // 우리 동 간단 보기: 개발 칩 한 번
  await G(() => { __game.S.f[0].money = 999; __game.sync(); });
  await G(() => __game.select(null)); await p.waitForTimeout(200); await G(() => document.getElementById('toCap').click()); await p.waitForTimeout(700);
  const cp = await G(() => { const g = __game, S = g.S, D = g.D, c = g.cam(); const j = S.f[0].cap; return { x: D[j].x * c.s + c.x, y: D[j].y * c.s + c.y }; });
  await p.touchscreen.tap(cp.x, cp.y); await p.waitForTimeout(400);
  const od = await G(() => ({ peek: document.getElementById('sheet').classList.contains('peek'), n: document.querySelectorAll('#sheet .qdev').length, qr: JSON.stringify(document.getElementById('quest').getBoundingClientRect()), mode: document.querySelector('#sheet h2') && document.querySelector('#sheet h2').textContent }));
  ok(od.peek && od.n === 4, '우리 동 간단 보기: 개발 칩 4개');
  await p.screenshot({ path: OUT + '/u2_own.png' });
  await p.tap('#sheet .qdev[data-k="0"]'); await p.waitForTimeout(300);
  ok(await G(() => __game.E.lv(__game.S, __game.S.f[0].cap, 0) === 1), '칩 한 번 → 상권 1단계');
  // 결재 0 → 다음 달 버튼 강조, 할 일 줄 숨김
  await G(() => { __game.S.ap = 0; __game.select(null); __game.sync(); }); await p.waitForTimeout(150);
  const z = await G(() => ({ go: document.getElementById('next').classList.contains('go'), txt: document.getElementById('next').innerText, todo: document.getElementById('todo').hidden, tt: document.getElementById('todo').textContent }));
  ok(z.go && /▶/.test(z.txt) && (z.todo || /모집|전체 개발|다음 달/.test(z.tt)), '결재 0 → 다음 달 강조, 할 일 줄은 숨김 또는 결재 안 드는 일만: ' + (z.todo ? '숨김' : z.tt));
  // 가로 화면에서는 간단 보기 없음
  const c4 = await b.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p4 = await c4.newPage(); await p4.goto('http://localhost:8142', { waitUntil: 'load' }); await p4.waitForTimeout(300); await p4.tap('#begin'); await p4.waitForTimeout(350);
  const lp = await p4.evaluate(() => { const g = __game, S = g.S, D = g.D, c = g.cam(); const j = D[S.f[0].cap].a.find(x => S.owner[x] !== 0); return { x: D[j].x * c.s + c.x, y: D[j].y * c.s + c.y }; });
  await p4.touchscreen.tap(lp.x, lp.y); await p4.waitForTimeout(350);
  ok(await p4.evaluate(() => !document.getElementById('sheet').classList.contains('peek') && !!document.getElementById('send')), '가로 화면: 바로 전체 시트');
  await p4.screenshot({ path: OUT + '/u3_land.png' });
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
