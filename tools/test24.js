// v16: 되돌리기 · 두 번 눌러 실행 · 점령 탭 · 괴뢰국 바로 관리 · 충성 경고 · 도장 위치 · 배경음악 버튼
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body><script>try{localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { if (/bgm\/(calm|tense)\.mp3/.test(q.url)) { r.setHeader('content-type', 'audio/mpeg'); r.end(fs.readFileSync('.' + q.url.split('?')[0])); return; } r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8148);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#over:not([hidden]) #cardOk, #over:not([hidden]) button.pcard'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  await p.goto('http://localhost:8148', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '서교'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400); await dismiss();
  // --- 되돌리기: 개발 → 되돌리기 ---
  await G(() => { const S = __game.S; S.f[0].money = 500; __game.sync(); });
  const cap = await G(() => __game.S.f[0].cap);
  await G(i => __game.select(i, true), cap); await p.waitForTimeout(300);
  const m0 = await G(() => ({ m: __game.S.f[0].money, d: __game.S.dev.reduce((a, b) => a + b, 0) }));
  await p.tap('#sheet .qdevs button:not([disabled])'); await p.waitForTimeout(300);
  const m1 = await G(() => ({ m: __game.S.f[0].money, d: __game.S.dev.reduce((a, b) => a + b, 0), u: !document.getElementById('undo').hidden }));
  ok(m1.d === m0.d + 1 && m1.u, '개발 후 되돌리기 버튼이 뜸');
  await p.screenshot({ path: OUT + '/u1_undo.png' });
  await p.tap('#undo'); await p.waitForTimeout(300);
  const m2 = await G(() => ({ m: __game.S.f[0].money, d: __game.S.dev.reduce((a, b) => a + b, 0), u: !document.getElementById('undo').hidden }));
  ok(m2.d === m0.d && Math.round(m2.m) === Math.round(m0.m) && !m2.u, '되돌리기 → 돈·시설 원래대로 (' + Math.round(m0.m) + '억)');
  // 개발 뒤 다음 달을 누르면 되돌리기 사라짐
  await G(i => __game.select(i, true), cap); await p.waitForTimeout(200); await p.tap('#sheet .qdevs button:not([disabled])'); await p.waitForTimeout(200); await p.tap('.x'); await p.waitForTimeout(100);
  await p.tap('#next'); await p.waitForTimeout(700); await dismiss();
  ok(await G(() => document.getElementById('undo').hidden), '다음 달 뒤에는 되돌리기 없음');
  // --- 넓은 영토 + 구역 + 괴뢰국 ---
  const r = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; const st = S.f[0].cap; const q = [st], seen = { [st]: 1 };
    while (q.length && Object.keys(seen).length < 60) { const x = q.shift(); D[x].a.forEach(j => { if (!seen[j] && Object.keys(seen).length < 60) { seen[j] = 1; q.push(j); } }); }
    Object.keys(seen).forEach(i => { S.owner[+i] = 0; S.min[+i] = 70; }); S.rank = 2; S.month = 20; S.f[0].troops = 6000; S.f[0].money = 3000; S.ap = 12; S.seenGu = S.seenGu.map(() => 1);
    const mine = E.dongsOf(S, 0), far = mine.slice().sort((a, b) => Math.hypot(D[b].x - D[st].x, D[b].y - D[st].y) - Math.hypot(D[a].x - D[st].x, D[a].y - D[st].y));
    const z = [far[0]]; while (z.length < 4) z.push(far.find(i => !z.includes(i) && i !== st && D[i].a.some(j => z.includes(j))));
    const zz = E.zoneMake(S, z, '시험구').zone; S.ap = 12; g.sync(); return { z: zz.id }; });
  // 추천 줄: 괴뢰국 안내 (다른 추천이 없을 때만 뜨므로 직접 확인은 생략) · 구역 화면 두 번 눌러 실행
  await p.tap('#cells'); await p.waitForTimeout(250); await G(() => __game.tab('zone')); await p.waitForTimeout(150);
  await p.tap('.zrow[data-z="' + r.z + '"]'); await p.waitForTimeout(300);
  await p.tap('#zPup'); await p.waitForTimeout(200);
  const a1 = await G(() => ({ n: __game.E.puppets(__game.S).length, txt: document.getElementById('zPup').textContent, arm: document.getElementById('zPup').classList.contains('arm') }));
  ok(a1.n === 0 && a1.arm && /한 번 더/.test(a1.txt), '괴뢰국 수립 첫 탭은 확인만: ' + a1.txt);
  await p.screenshot({ path: OUT + '/u2_arm.png' });
  await p.tap('#zPup'); await p.waitForTimeout(160);
  const sm0 = await G(() => { const el = document.querySelector('#stampLayer .stampMark'); const sh = document.getElementById('sheet'); if (!el) return null; const r = el.getBoundingClientRect(); return { bottom: Math.round(r.bottom), shTop: Math.round(sh.hidden ? innerHeight : sh.getBoundingClientRect().top) }; });
  ok(!sm0 || sm0.bottom <= sm0.shTop + 6, '수립 도장이 정보창을 안 가림 ' + JSON.stringify(sm0));
  await p.waitForTimeout(500);
  const pid = await G(() => { const P = __game.E.puppets(__game.S); return P.length ? P[0].id : -1; });
  ok(pid > 0, '두 번째 탭에 수립');
  // 도장이 정보창을 가리지 않음
  const st = await G(() => { const g = __game; g.select(g.S.f[0].cap, false); return 1; }); await p.waitForTimeout(350);
  const pos = await G(() => { const E = __game.E, S = __game.S; const sh = document.getElementById('sheet').getBoundingClientRect(); const lay = document.getElementById('stampLayer'); const before = lay.children.length; return { shTop: sh.top }; });
  await p.tap('#sheet .dev button.btn:not([disabled])').catch(() => {}); await p.waitForTimeout(120);
  const sm = await G(() => { const el = document.querySelector('#stampLayer .stampMark'); if (!el) return null; const r = el.getBoundingClientRect(); return { bottom: r.bottom, top: r.top, sm: el.classList.contains('sm') }; });
  ok(!sm || sm.bottom <= pos.shTop + 6, '도장은 정보창 위로 안 내려옴 ' + (sm ? Math.round(sm.bottom) + ' ≤ ' + Math.round(pos.shTop) : '(도장 없음)'));
  await p.tap('.x'); await p.waitForTimeout(150);
  // 세력 탭: 괴뢰국 바로 관리
  await p.tap('#cells'); await p.waitForTimeout(250); await G(() => __game.tab('fac')); await p.waitForTimeout(150);
  await p.tap('.pq .chip[data-r="0.5"]'); await p.waitForTimeout(200); await p.tap('.pq .chip[data-s="def"]'); await p.waitForTimeout(200);
  const P = await G(id => __game.S.f[id].puppet, pid);
  ok(P.rate === 0.5 && P.stance === 'def', '세력 탭에서 상납 50% · 방침 방어로 변경');
  await p.screenshot({ path: OUT + '/u3_fac.png' });
  // 점령 탭
  await G(() => __game.tab('occ')); await p.waitForTimeout(150);
  const oc = await G(() => ({ tabs: [...document.querySelectorAll('.tab')].map(x => x.textContent).join(','), n: document.querySelectorAll('.tabp[data-tp="occ"] details.rg').length, z: document.querySelectorAll('.tabp[data-tp="zone"] details.rg').length }));
  ok(/점령/.test(oc.tabs) && oc.n >= 20 && oc.z === 0, '점령 탭 분리: ' + oc.tabs);
  await p.screenshot({ path: OUT + '/u4_occ.png' });
  await p.tap('.x'); await p.waitForTimeout(150);
  // 충성 경고: 추천 줄 + 지도 표시
  await G(id => { __game.S.f[id].puppet.loyal = 24; __game.sync(); }, pid); await p.waitForTimeout(250);
  const td = await G(() => document.getElementById('todo').textContent);
  ok(/경고 · 시험구 충성 24/.test(td), '추천 줄 충성 경고: ' + td);
  await p.screenshot({ path: OUT + '/u5_loyal.png' });
  await p.tap('#todo'); await p.waitForTimeout(350);
  ok(/괴뢰국/.test(await G(() => document.getElementById('sheet').innerText)), '누르면 그 괴뢰국 화면');
  await p.tap('.x'); await p.waitForTimeout(150);
  // 배경음악 버튼
  await p.tap('#menuBtn'); await p.waitForTimeout(300);
  await p.tap('#musBtn'); await p.waitForTimeout(900);
  const mu = await G(() => ({ t: document.getElementById('musBtn').textContent, a: [...document.querySelectorAll('audio')].length }));
  ok(/배경음악 켜짐/.test(mu.t), '배경음악 버튼: ' + mu.t);
  await p.tap('#musBtn'); await p.waitForTimeout(200);
  ok(!errs.length, '오류 없음 ' + errs.join(' | '));
  await b.close(); srv.close();
})();
