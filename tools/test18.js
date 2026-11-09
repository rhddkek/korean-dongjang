// v13: 개발 대가, 회장 기억·고문, 선거 공약·유세, 행정구역 개편, 타임랩스
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8143);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const pick2 = async () => { const on = await p.$$eval('#card .pl.on', x => x.length); for (let i = 0; i < 2 - on; i++) { await p.tap('#card .pl:not(.on)'); await p.waitForTimeout(80); } await p.tap('#plOk'); await p.waitForTimeout(200); };
  const dismiss = async () => { for (let k = 0; k < 8; k++) { if (await p.$('#over:not([hidden]) #plOk')) { await pick2(); continue; } const pc = await p.$('#over:not([hidden]) button.pcard:not(.pl)'); if (pc) { await pc.tap(); await p.waitForTimeout(200); continue; } const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  const at = async i => { const q = await G(i => { const g = __game, D = g.D, c = g.cam(); return { x: D[i].x * c.s + c.x, y: D[i].y * c.s + c.y }; }, i); await p.touchscreen.tap(q.x, q.y); await p.waitForTimeout(250); };
  await p.goto('http://localhost:8143', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '창신1'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  // 1) 개발 대가: 우리 동 간단 보기에 '짓는 대가'
  const cap = await G(() => __game.S.f[0].cap);
  await at(cap);
  const side = await G(() => { const t = document.getElementById('sheet').innerText; return (t.match(/짓는 대가 · [^\n]+/) || [''])[0]; });
  ok(/짓는 대가 · .*(민심|방어|세수)/.test(side), '우리 동 짓는 대가: ' + side);
  const mood = await G(() => { const g = __game, S = g.S, E = g.E; S.f[0].money = 999; const i = S.f[0].cap; const nb = g.D[i].a.find(j => S.owner[j] !== 0 && ['home', 'town', 'life'].includes(g.D[j].type)); if (nb !== undefined) { S.owner[nb] = 0; S.min[nb] = 90; } g.sync(); return { nb, before: nb !== undefined ? S.min[nb] : null }; });
  await p.tap('#sheet .qdev[data-k="0"]'); await p.waitForTimeout(200);
  const after = await G(n => n === null || n === undefined ? null : __game.S.min[n], mood.nb);
  ok(mood.nb === undefined || after === mood.before - 2, '상권 지으면 옆 주거 동 민심 −2 (' + mood.before + '→' + after + ')');
  await p.screenshot({ path: OUT + '/v1_side.png' }); await p.tap('.x');
  // 2) 회장 원한·고문
  const adv = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D; S.month = 20; S.seenFoe = 1; S.seenGu = null;
    const f = S.f.find(x => x.ai && x.alive); const cap = S.f[0].cap;
    const ring = D[cap].a.filter(j => j !== cap).slice(0, 3); ring.forEach(j => S.owner[j] = f.id);
    f.hate = 60; g.sync();
    const f2 = S.f.find(x => x.ai && x.alive && x.id !== f.id); const t2 = D[cap].a.find(j => !ring.includes(j) && j !== cap); if (t2 !== undefined) S.owner[t2] = f2.id;
    f2.adv = { nm: '홍길동', face: 12345, grp: '조기축구회', from: '가짜 조기축구회', fromId: f.id, at: 19 }; f2.hate = 30;
    g.sync(); return { t: ring[0], t2, f: f.id, f2: f2.id };
  });
  await at(adv.t);
  const eh = await G(() => document.getElementById('sheet').innerText);
  ok(/원한 깊음/.test(eh), '상대 동 간단 보기에 원한 표시');
  await p.tap('#qMore'); await p.waitForTimeout(200);
  const full = await G(() => ({ t: document.getElementById('sheet').innerText, faces: document.querySelectorAll('#sheet img.face').length }));
  ok(/원한 깊음/.test(full.t) && full.faces >= 1, '자세히: 회장 얼굴·원한 대사');
  await p.tap('.x');
  if (adv.t2 !== undefined) { await G(t => __game.select(t), adv.t2); await p.waitForTimeout(250); const ah = await G(() => ({ t: document.getElementById('sheet').innerText, adv: !!document.querySelector('#sheet .boss.adv') })); ok(ah.adv && /홍길동 고문/.test(ah.t), '고문 얼굴·대사 표시'); await p.screenshot({ path: OUT + '/v2_adv.png' }); await p.tap('.x'); }
  // 3) 행정구역 개편: 세력 화면 → 지도 탭 3번 → 이름 → 만들기
  const zs = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D; S.rank = 1; S.ap = 9; S.f[0].money = 9999; S.f[0].troops = 20000;
    const cap = S.f[0].cap; const chain = [cap]; let cur = cap;
    while (chain.length < 4) { const n = D[cur].a.find(j => !chain.includes(j)); if (n === undefined) break; chain.push(n); cur = n; }
    chain.forEach(i => { S.owner[i] = 0; S.min[i] = 90; }); g.sync(); return chain;
  });
  await p.tap('#cells'); await p.waitForTimeout(250);
  await p.evaluate(() => document.getElementById('zNew').scrollIntoView()); await p.tap('#zNew'); await p.waitForTimeout(250);
  for (const i of zs.slice(0, 3)) await at(i);
  await p.fill('#zName', '시발구'); await p.waitForTimeout(100);
  const bad = await G(() => ({ dis: document.getElementById('zMake').disabled, t: document.getElementById('zInfo').textContent }));
  ok(bad.dis && /쓸 수 없는/.test(bad.t), '욕설 이름 막힘');
  await p.fill('#zName', '칠성구'); await p.waitForTimeout(100);
  await p.screenshot({ path: OUT + '/v3_zpick.png' });
  const can = await G(() => !document.getElementById('zMake').disabled);
  ok(can, '동 3개 + 이름 → 만들기 가능');
  await p.tap('#zMake'); await p.waitForTimeout(500);
  const zr = await G(() => ({ zones: __game.S.zones.map(z => z.nm + ':' + z.d.length), mode: document.querySelector('#sheet h2').textContent }));
  ok(zr.zones.length === 1 && /칠성구/.test(zr.mode), '구역 출범 → 구역 화면: ' + zr.zones.join(','));
  await p.screenshot({ path: OUT + '/v4_zone.png' });
  const zatk = await G(() => !document.getElementById('zAtk').disabled);
  if (zatk) { const n0 = await G(() => __game.E.dongsOf(__game.S, 0).length); await p.tap('#zAtk'); await p.waitForTimeout(400); await dismiss(); const n1 = await G(() => __game.E.dongsOf(__game.S, 0).length); ok(n1 > n0, '구역 작전으로 맞닿은 동 접수 ' + n0 + '→' + n1); }
  else ok(false, '구역 작전 버튼 비활성');
  await p.tap('.x').catch(() => {});
  // 4) 선거: 공약 고르기 → 구 유세 → 추천 줄
  await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D; S.month = 30;
    const order = D.map((d, i) => i).sort((a, b) => D[a].x - D[b].x);
    let tot = D.reduce((a, d) => a + d.pop, 0), acc = 0;
    for (const i of order) { if (acc / tot >= 0.62) break; if (S.owner[i] !== 0) { S.owner[i] = 0; S.min[i] = 70; } acc += D[i].pop; }
    S.f.forEach(f => { if (f.id && f.alive && S.owner[f.cap] !== f.id) { const ds = E.dongsOf(S, f.id); if (ds.length) f.cap = ds[0]; else f.alive = false; } });
    S.coalShown = 1; S.cardNext = 999; S.f[0].troops = 50000; S.f[0].money = 9999;
  });
  await p.tap('#next'); await p.waitForTimeout(500);
  for (let k = 0; k < 6 && !(await p.$('#over:not([hidden]) #plOk')); k++) { const c = await p.$('#over:not([hidden]) #cardOk'); if (c) await c.tap(); const pc = await p.$('#over:not([hidden]) button.pcard:not(.pl)'); if (pc) await pc.tap(); await p.waitForTimeout(200); }
  const pl = await G(() => ({ n: document.querySelectorAll('#card .pl').length, dis: document.getElementById('plOk') && document.getElementById('plOk').disabled, gain: [...document.querySelectorAll('#card .pl em')].map(e => e.textContent) }));
  ok(pl.n === 4 && pl.dis, '선거 예고: 공약 4개, 두 개 고르기 전엔 비활성 ' + pl.gain.join(' '));
  await p.screenshot({ path: OUT + '/v5_pledge.png' });
  const v0 = await G(() => __game.E.voteShare(__game.S));
  await pick2();
  const v1 = await G(() => ({ v: __game.E.voteShare(__game.S), pl: __game.S.camp.pl }));
  ok(v1.pl.length === 2, '공약 선택: ' + v1.pl.join(',') + ' 득표 ' + (v0 * 100).toFixed(1) + '→' + (v1.v * 100).toFixed(1));
  await dismiss();
  const todo = await G(() => document.getElementById('todo').textContent);
  ok(/유세 \+[\d.]+%p/.test(todo), '추천 줄: ' + todo);
  await p.tap('#todo'); await p.waitForTimeout(350);
  const gs = await G(() => ({ t: document.getElementById('sheet').innerText, ok: !document.getElementById('guCamp').disabled }));
  ok(/선거 유세/.test(gs.t) && gs.ok, '구 화면 유세 버튼');
  await p.screenshot({ path: OUT + '/v6_camp.png' });
  const r0 = await G(() => __game.E.voteShare(__game.S)); await p.tap('#guCamp'); await p.waitForTimeout(300); const r1 = await G(() => ({ v: __game.E.voteShare(__game.S), ap: __game.S.ap }));
  ok(r1.v > r0, '유세 → 득표 ' + (r0 * 100).toFixed(2) + '→' + (r1.v * 100).toFixed(2));
  await p.tap('.x').catch(() => {});
  // 5) 당선 → 끝 화면 → 타임랩스
  await G(() => { const S = __game.S; __game.E.dongsOf(S, 0).forEach(i => S.min[i] = 100); S.elect.at = S.month + 1; });
  await p.tap('#next'); await p.waitForTimeout(500);
  for (let k = 0; k < 6 && !(await p.$('#over:not([hidden]) #tlBtn')); k++) { await dismiss(); await p.waitForTimeout(200); }
  const tl = await p.$('#over:not([hidden]) #tlBtn'); ok(!!tl, '끝 화면에 기록 다시 보기 버튼');
  if (tl) {
    const fin = await G(() => __game.S.owner.filter(o => o === 0).length);
    await tl.tap(); await p.waitForTimeout(900);
    const lab = await G(() => ({ bar: !document.getElementById('rpBar').hidden, t: document.getElementById('rpLabel').textContent, mine: __game.S.owner.filter(o => o === 0).length }));
    ok(lab.bar && /기록 · .*년/.test(lab.t), '타임랩스 재생: ' + lab.t);
    await p.screenshot({ path: OUT + '/v7_tl.png' });
    await p.tap('#rpSkip'); await p.waitForTimeout(400);
    const back = await G(() => ({ card: !document.getElementById('over').hidden, mine: __game.S.owner.filter(o => o === 0).length }));
    ok(back.card && back.mine === fin, '건너뛰기 → 끝 화면 복귀, 땅 원상태 (' + back.mine + '/' + fin + ')');
  }
  // 저장본은 진짜 상태
  const saved = await G(() => { const k = Object.keys(localStorage).find(x => /dongjang-save/.test(x) && !/prev/.test(x)); const o = JSON.parse(localStorage.getItem(k)); return { z: (o.zones || []).length, h: !!o.hist, hate: o.f.some(f => f.hate !== undefined) }; });
  ok(saved.z === 1 && saved.h && saved.hate, '저장: 구역·기록·감정');
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
