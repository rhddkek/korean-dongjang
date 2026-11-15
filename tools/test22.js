// v15: 구역 합병 · 괴뢰국 · 지역별 점령(목록 + 지도 렌즈)
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body><script>try{localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8146);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#over:not([hidden]) #cardOk, #over:not([hidden]) button.pcard'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  await p.goto('http://localhost:8146', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '서교'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400); await dismiss();
  // 넓은 영토 + 권역장 + 구역 두 개(맞닿게)
  const z = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; const st = S.f[0].cap; const q = [st], seen = { [st]: 1 };
    while (q.length && Object.keys(seen).length < 60) { const x = q.shift(); D[x].a.forEach(j => { if (!seen[j] && Object.keys(seen).length < 60) { seen[j] = 1; q.push(j); } }); }
    Object.keys(seen).forEach(i => { S.owner[+i] = 0; S.min[+i] = 70; }); S.rank = 2; S.month = 20; S.f[0].troops = 6000; S.f[0].money = 3000; S.ap = 12; S.seenGu = S.seenGu.map(() => 1);
    const mine = E.dongsOf(S, 0), far = mine.slice().sort((a, b) => Math.hypot(D[b].x - D[st].x, D[b].y - D[st].y) - Math.hypot(D[a].x - D[st].x, D[a].y - D[st].y));
    const grow = (s0, ex, n) => { const zz = [s0]; while (zz.length < n) { const nx = far.find(i => !zz.includes(i) && !ex.includes(i) && i !== st && D[i].a.some(j => zz.includes(j))); if (nx === undefined) break; zz.push(nx); } return zz; };
    const z1 = grow(far[0], [], 5); const r1 = E.zoneMake(S, z1, '범어구'); const nb = far.find(i => !z1.includes(i) && i !== st && D[i].a.some(j => z1.includes(j))); const z2 = grow(nb, z1, 4); const r2 = E.zoneMake(S, z2, '만촌구');
    S.ap = 12; g.sync(); return { a: r1.zone && r1.zone.id, b: r2.zone && r2.zone.id, err: (r1.err || '') + (r2.err || ''), hall: r1.zone && r1.zone.hall }; });
  ok(z.a && z.b, '구역 두 개 준비 ' + z.err);
  // 구역 화면 → 합병
  await G(() => { __game.tab('zone'); }); await p.tap('#cells'); await p.waitForTimeout(250); await G(() => __game.tab('zone')); await p.waitForTimeout(150);
  await p.tap('.zrow[data-z="' + z.a + '"]'); await p.waitForTimeout(300);
  const zs = await G(() => document.getElementById('sheet').innerText);
  ok(/구역 합병 · 최대 12개/.test(zs) && /만촌구와 합병 · 합계 9개/.test(zs) && /괴뢰국으로 독립/.test(zs), '구역 화면에 합병·괴뢰국');
  await p.fill('#zmName', '범어만촌'); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/p1_zone.png' });
  await p.tap('.zm'); await p.waitForTimeout(400);
  const mg = await G(() => ({ zs: __game.S.zones.map(x => x.nm + ':' + x.d.length), h: document.querySelector('#sheet h2').textContent }));
  ok(mg.zs.length === 1 && /범어만촌:9/.test(mg.zs[0]), '합병 → ' + mg.zs.join(','));
  // 괴뢰국 수립
  await p.tap('#zPup'); await p.waitForTimeout(500);
  const pp = await G(() => { const S = __game.S, f = S.f[S.f.length - 1]; return { pup: !!f.puppet, name: f.name, n: __game.E.dongsOf(S, f.id).length, sheet: document.getElementById('sheet').innerText, zones: S.zones.length, troops: f.troops }; });
  ok(pp.pup && pp.name === '범어만촌' && pp.n === 9 && pp.zones === 0, '괴뢰국 수립: ' + pp.name + ' ' + pp.n + '개 · 인원 ' + pp.troops);
  ok(/괴뢰국/.test(pp.sheet) && /충성/.test(pp.sheet), '괴뢰국 화면이 뜸');
  await p.screenshot({ path: OUT + '/p2_pup_peek.png' });
  if (await p.$('#qMore')) { await p.tap('#qMore'); await p.waitForTimeout(250); }
  await p.screenshot({ path: OUT + '/p3_pup_full.png' });
  // 명령: 상납 15%, 방침 공격, 대상 지정, 지원
  await p.tap('.pr[data-r="0.15"]'); await p.waitForTimeout(150);
  const tg = await p.$('.pt:not([data-t="-1"])'); if (tg) { await tg.tap(); await p.waitForTimeout(150); }
  await p.tap('.pa[data-a="100"]'); await p.waitForTimeout(150);
  const P = await G(() => { const S = __game.S, f = S.f[S.f.length - 1]; return { ...f.puppet, money: f.money }; });
  ok(P.rate === 0.15 && P.loyal >= 79 && (tg ? P.target > 0 : true), '명령 반영 ' + JSON.stringify({ rate: P.rate, loyal: P.loyal, target: P.target }));
  // 우리 공격 불가 + 경제에 상납
  const ck = await G(() => { const g = __game, S = g.S, f = S.f[S.f.length - 1]; const t = g.E.dongsOf(S, f.id)[0]; return { reason: g.E.preview(S, t, 10).reason, trib: g.E.economy(S, 0).trib }; });
  ok(/괴뢰국/.test(ck.reason) && ck.trib > 0, '우리 괴뢰국은 공격 불가 · 상납 월 ' + ck.trib.toFixed(1));
  // 몇 달 진행: 괴뢰국이 우리를 치지 않음
  await p.tap('.x'); await p.waitForTimeout(150);
  let hit = 0;
  for (let m = 0; m < 4; m++) { const o0 = await G(() => __game.S.owner.slice()); await p.tap('#next'); await p.waitForTimeout(700); await dismiss(); const o1 = await G(() => __game.S.owner.slice()); const pid = await G(() => __game.S.f.length - 1); for (let i = 0; i < o0.length; i++) if (o0[i] === 0 && o1[i] === pid) hit++; }
  ok(hit === 0, '4달 동안 괴뢰국이 우리 땅을 친 횟수 ' + hit);
  // 세력 화면: 상납 줄, 괴뢰국 목록, 지역별 점령
  await p.tap('#cells'); await p.waitForTimeout(250);
  const now = await G(() => document.getElementById('sheet').innerText);
  ok(/괴뢰국 상납/.test(now), '월 수지에 괴뢰국 상납');
  await G(() => __game.tab('fac')); await p.waitForTimeout(150);
  const fac = await G(() => document.getElementById('sheet').innerText);
  ok(/괴뢰국 · 1\/3/.test(fac) && /범어만촌 · 충성/.test(fac), '세력 탭 괴뢰국 목록');
  await G(() => __game.tab('zone')); await p.waitForTimeout(150);
  const rg = await G(() => ({ n: document.querySelectorAll('details.rg').length, t: document.getElementById('sheet').innerText.match(/전체 장악[^\n]*/)?.[0] }));
  ok(rg.n >= 20, '지역별 점령 목록 ' + rg.n + '개 구 · ' + rg.t);
  await p.tap('details.rg summary'); await p.waitForTimeout(150);
  await p.screenshot({ path: OUT + '/p4_region.png' });
  const dc = await p.$('details.rg[open] .dc.own'); const dn = dc ? await dc.textContent() : '';
  if (dc) { await dc.tap(); await p.waitForTimeout(400); }
  const went = await G(() => document.querySelector('#sheet h2') && document.querySelector('#sheet h2').textContent);
  ok(dc && went === dn, '동 이름 누르면 그 동으로 이동: ' + dn);
  await p.tap('.x'); await p.waitForTimeout(150);
  // 지도 렌즈 '점령'
  await p.tap('#lens'); await p.waitForTimeout(300);
  const lz = await G(() => ({ t: document.getElementById('lens').textContent, occ: document.getElementById('legend').classList.contains('occ') }));
  ok(/점령/.test(lz.t) && lz.occ, '지도: 점령 렌즈 · 범례');
  await p.screenshot({ path: OUT + '/p5_lens.png' });
  // 반란: 충성 강제로 낮추고 상납 50%
  await G(() => { const S = __game.S, f = S.f[S.f.length - 1]; f.puppet.loyal = 16; f.puppet.rate = 0.5; });
  await p.tap('#lens'); await p.tap('#lens'); await p.tap('#lens'); await p.tap('#lens'); await p.tap('#lens');
  await p.tap('#next'); await p.waitForTimeout(800); await dismiss();
  const rb = await G(() => { const S = __game.S, f = S.f[S.f.length - 1]; return { pup: !!f.puppet, log: S.log.filter(l => /반란/.test(l.t)).map(l => l.t)[0] }; });
  ok(!rb.pup && /반란/.test(rb.log || ''), '충성 15 아래 → 반란: ' + rb.log);
  ok(!errs.length, '오류 없음 ' + errs.join(' | '));
  await b.close(); srv.close();
})();
