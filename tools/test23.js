// v15.1: 괴뢰국 한도(1/3/5) · 땅 주고받기(우리↔괴뢰국, 괴뢰국↔괴뢰국, 구역째 편입)
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body><script>try{localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8147);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#over:not([hidden]) #cardOk, #over:not([hidden]) button.pcard'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  await p.goto('http://localhost:8147', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '서교'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400); await dismiss();
  const r = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; const st = S.f[0].cap; const q = [st], seen = { [st]: 1 };
    while (q.length && Object.keys(seen).length < 70) { const x = q.shift(); D[x].a.forEach(j => { if (!seen[j] && Object.keys(seen).length < 70) { seen[j] = 1; q.push(j); } }); }
    Object.keys(seen).forEach(i => { S.owner[+i] = 0; S.min[+i] = 70; }); S.month = 20; S.f[0].troops = 8000; S.f[0].money = 5000; S.seenGu = S.seenGu.map(() => 1);
    const out = {}; S.rank = 1; out.m1 = E.pupMax(S); S.rank = 2; out.m2 = E.pupMax(S); S.rank = 3; out.m3 = E.pupMax(S); S.rank = 2;
    const mine = E.dongsOf(S, 0), far = mine.slice().sort((a, b) => Math.hypot(D[b].x - D[st].x, D[b].y - D[st].y) - Math.hypot(D[a].x - D[st].x, D[a].y - D[st].y));
    const used = []; const grow = (s0, n) => { const zz = [s0]; while (zz.length < n) { const nx = far.find(i => !zz.includes(i) && !used.includes(i) && i !== st && D[i].a.some(j => zz.includes(j))); if (nx === undefined) break; zz.push(nx); } used.push(...zz); return zz; };
    // 괴뢰국 A, 그 옆에 괴뢰국 B, 그 옆에 구역 C
    const zA = grow(far[0], 4); S.ap = 20; const A = E.makePuppet(S, E.zoneMake(S, zA, '가국').zone.id).id;
    const nbB = far.find(i => !used.includes(i) && i !== st && D[i].a.some(j => zA.includes(j))); const zB = grow(nbB, 4); S.ap = 20; const B = E.makePuppet(S, E.zoneMake(S, zB, '나국').zone.id).id;
    const nbC = far.find(i => !used.includes(i) && i !== st && D[i].a.some(j => zA.includes(j) || zB.includes(j))); const zC = grow(nbC, 3); S.ap = 20; const C = E.zoneMake(S, zC, '다구').zone.id;
    out.A = A; out.B = B; out.C = C; out.n = E.puppets(S).length;
    // 우리 동 중 A와 맞닿은 것, A 동 중 우리와 맞닿은 것, A 동 중 B와 맞닿은 것
    out.give = mine.find(i => S.owner[i] === 0 && i !== st && D[i].a.some(j => S.owner[j] === A) && !S.zones.some(z => z.d.includes(i)));
    out.take = E.dongsOf(S, A).find(i => i !== S.f[A].cap && D[i].a.some(j => S.owner[j] === 0));
    out.move = E.dongsOf(S, A).find(i => i !== S.f[A].cap && D[i].a.some(j => S.owner[j] === B) && i !== out.take);
    S.ap = 10; g.sync(); return out; });
  ok(r.m1 === 1 && r.m2 === 3 && r.m3 === 5, '괴뢰국 한도 구청장 1 · 권역장 3 · 시장 5');
  ok(r.n === 2, '괴뢰국 2개 수립');
  // 우리 동 → 괴뢰국 A
  if (r.give != null) {
    await G(i => __game.select(i, false), r.give); await p.waitForTimeout(300);
    const btn = await p.$('.pg2[data-p="' + r.A + '"]'); ok(!!btn, '우리 동 화면에 "가국에 넘기기"');
    const l0 = await G(a => __game.S.f[a].puppet.loyal, r.A);
    await p.screenshot({ path: OUT + '/t1_give.png' });
    if (btn) { await btn.tap(); await p.waitForTimeout(300); }
    const g1 = await G(([i, a]) => ({ o: __game.S.owner[i], l: __game.S.f[a].puppet.loyal }), [r.give, r.A]);
    ok(g1.o === r.A && g1.l === Math.min(100, l0 + 3), '넘김 → 주인 가국, 충성 ' + l0 + '→' + g1.l);
  } else ok(false, '넘길 우리 동을 못 찾음');
  // 괴뢰국 A 동 → 우리
  await G(i => __game.select(i, false), r.take); await p.waitForTimeout(300);
  await p.screenshot({ path: OUT + '/t2_pup_dong.png' });
  const ap0 = await G(() => __game.S.ap);
  await p.tap('#pTake'); await p.waitForTimeout(300);
  const t1 = await G(([i]) => ({ o: __game.S.owner[i], ap: __game.S.ap, settle: !!(__game.S.settle && __game.S.settle[i]) }), [r.take]);
  ok(t1.o === 0 && t1.ap === ap0 - 1, '받아오기 → 우리 땅, 결재 −1');
  // A 동 → B
  if (r.move != null && r.move !== r.take) {
    await G(i => __game.select(i, false), r.move); await p.waitForTimeout(300);
    const pm = await p.$('.pm[data-p="' + r.B + '"]'); ok(!!pm, '괴뢰국 화면에 "나국에 옮기기"');
    if (pm) { await pm.tap(); await p.waitForTimeout(300); }
    const m1 = await G(i => __game.S.owner[i], r.move);
    ok(m1 === r.B, '가국 → 나국으로 옮김');
  }
  // 구역 C → 괴뢰국에 편입
  await p.tap('#cells'); await p.waitForTimeout(250); await G(() => __game.tab('zone')); await p.waitForTimeout(150);
  await p.tap('.zrow[data-z="' + r.C + '"]'); await p.waitForTimeout(300);
  const zg = await p.$('.zg:not([disabled])'); ok(!!zg, '구역 화면에 "괴뢰국에 편입"');
  await p.screenshot({ path: OUT + '/t3_zone_give.png' });
  if (zg) { await zg.tap(); await p.waitForTimeout(400); }
  const zc = await G(c => ({ zones: __game.S.zones.length, log: __game.S.log[0].t }), r.C);
  ok(zc.zones === 0 && /편입했습니다/.test(zc.log), zc.log);
  // 세력 탭 괴뢰국 수
  await p.tap('#cells'); await p.waitForTimeout(250); await G(() => __game.tab('fac')); await p.waitForTimeout(150);
  const ft = await G(() => document.getElementById('sheet').innerText);
  ok(/괴뢰국 · 2\/3/.test(ft), '세력 탭 2/3');
  ok(!errs.length, '오류 없음 ' + errs.join(' | '));
  await b.close(); srv.close();
})();
