// v17: 플레이 후기 반영 — 상대 턴 말풍선(우리 동 피습/인접 전투) · 승진 목표에 구 이름 · 설득 합류 카드 · 점령 뒤 선택 유지 · 전체 개발 동별 효과 · 첫 동장실 · 추천 이유
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}</style></head><body>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (/\.(js|json|mp3)$/.test(u) && fs.existsSync('.' + u)) { r.setHeader('content-type', u.endsWith('mp3') ? 'audio/mpeg' : 'application/javascript'); r.end(fs.readFileSync('.' + u)); return; }
  r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html);
}).listen(8149);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch();
  for (const [dev, ctxOpt] of [['phone', { ...devices['iPhone 13'] }], ['wide', { viewport: { width: 1280, height: 800 } }]]) {
    const ctx = await b.newContext(ctxOpt); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const G = (f, ...a) => p.evaluate(f, ...a);
    const tap = async s => dev === 'phone' ? p.tap(s) : p.click(s);
    const dismiss = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#over:not([hidden]) #cardOk, #over:not([hidden]) button.pcard'); if (!c) break; await c.click(); await p.waitForTimeout(200); } };
    await p.goto('http://localhost:8149', { waitUntil: 'load' }); await p.waitForTimeout(400);
    await tap('#cities .city[data-c="daegyeong"]'); await p.waitForLoadState('load'); await p.waitForTimeout(700);
    await p.fill('#q', '칠성동'); await p.waitForTimeout(120); await tap('#results button'); await p.waitForTimeout(150); await tap('#begin'); await p.waitForTimeout(500); await dismiss();
    const st0 = await G(() => { const g = __game, S = g.S; return { cap: g.D[S.f[0].cap].n, goal: document.getElementById('cPop').textContent }; });
    ok(/칠성/.test(st0.cap), dev + ' 칠성동 시작');
    ok(/(청장|군수|시장)(까지)? \d+(동|곳)$/.test(st0.goal), dev + ' 승진 목표에 구 이름: ' + st0.goal);
    const ov = await G(() => { const e = document.getElementById('cPop'); return e.scrollWidth - e.clientWidth; });
    ok(ov <= 1, dev + ' 목표 글자가 칸 밖으로 안 넘침 (' + ov + 'px)');
    // 추천 이유
    const r0 = await G(() => __game.rec());
    ok(r0 && (r0.k === 'atk' || r0.k === 'per') && r0.why, dev + ' 추천에 이유: ' + (r0 && r0.txt));
    // 첫 동장실: 목표 → 살펴보기 → 시장 목표, 개발은 한 줄
    if (dev === 'phone') { await tap('#cells'); await p.waitForTimeout(300); } else { await G(() => __game.select(null)); await p.waitForTimeout(300); }
    const fo = await G(() => { const sh = document.getElementById('sheet'), secs = [...sh.querySelectorAll('.sec')].map(x => x.textContent.replace('?', '')), go = sh.querySelector('.acts [data-go1]'); return { secs: secs.slice(0, 3), go: go && go.textContent, goTop: go ? go.getBoundingClientRect().top : 0, dev: !!sh.querySelector('.chips.dt'), one: [...sh.querySelectorAll('.rowBtn')].some(x => /개발하기/.test(x.textContent)) }; });
    ok(/청장까지/.test(fo.secs[0]) && /살펴보기/.test(fo.go || ''), dev + ' 첫 동장실 맨 위: ' + fo.secs[0] + ' → ' + fo.go);
    ok(!fo.dev && fo.one, dev + ' 동 1곳일 때 전체 개발은 한 줄');
    await p.screenshot({ path: OUT + '/v17_' + dev + '_first.png' });
    // 승진 목표 숫자가 동을 얻어도 늘지 않음
    const mono = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; const save = S.owner.slice(); let prev = 1e9, bad = 0, seq = [];
      for (let k = 0; k < 14; k++) { const mine = E.dongsOf(S, 0); let t = -1; mine.some(a => D[a].a.some(j => { if (S.owner[j] !== 0) { t = j; return true; } return false; })); if (t < 0) break; S.owner[t] = 0; g.sync(); if (S.rank >= 1) break; const mt = document.getElementById('cPop').textContent.match(/(\d+)(동|곳|개 더)$/); const m2 = mt ? +mt[1] : 99; seq.push(m2); if (m2 > prev) bad++; prev = m2; }
      for (let i = 0; i < save.length; i++) S.owner[i] = save[i]; S.rank = 0; g.sync(); return { bad, seq }; });
    ok(!mono.bad, dev + ' 동을 얻을수록 남은 수는 그대로거나 줄어듦: ' + mono.seq.join('→'));
    // 설득 → 합류 카드, 선택 유지
    await G(() => __game.select(null)); await dismiss();
    const pt = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; S.f[0].money = 2000; S.ap = 5; const cap = S.f[0].cap; let t = D[cap].a.find(j => S.owner[j] === -1); if (t === undefined) { t = D[cap].a.find(j => S.owner[j] !== 0); S.owner[t] = -1; } g.sync(); g.select(t, true); return t; });
    await p.waitForTimeout(250);
    const pb = await p.$('#per'); if (pb) { await pb.click(); await p.waitForTimeout(150); const still = await G(() => __game.S.owner); if ((await G(t => __game.S.owner[t], pt)) !== 0) { await pb.click().catch(() => {}); await p.waitForTimeout(200); } }
    const pc = await G(t => { const c = document.getElementById('card'); const over = !document.getElementById('over').hidden; return { own: __game.S.owner[t], h2: over && c.querySelector('h2') ? c.querySelector('h2').textContent : '', txt: over ? c.textContent : '', news: document.getElementById('news').textContent }; }, pt);
    ok(pc.own === 0 && /합류/.test(pc.h2), dev + ' 설득 결과 카드: ' + pc.h2);
    ok(!/집에 간|다음 달 복귀|민심이 낮아/.test(pc.txt) && /정착 후/.test(pc.txt), dev + ' 합류 카드에 전투 줄 없음 · 정착 후 수입');
    ok(/합류 · .*사용 · 첫 달 수입 .* → 정착 후 .*\/월/.test(pc.news), dev + ' 소식 줄: ' + pc.news);
    await p.screenshot({ path: OUT + '/v17_' + dev + '_join.png' });
    await dismiss();
    const ks = await G(t => ({ sel: document.querySelector('#sheet h2') && document.querySelector('#sheet h2').textContent, nb: !!document.getElementById('nbView'), n: __game.D[t].n }), pt);
    ok(ks.sel === ks.n && ks.nb, dev + ' 합류한 동이 계속 선택됨 + 인접 동 보기');
    const cam0 = await G(() => JSON.stringify(__game.cam()));
    await tap('#nbView'); await p.waitForTimeout(450);
    ok(cam0 !== await G(() => JSON.stringify(__game.cam())), dev + ' 인접 동 보기 → 지도 이동');
    await p.screenshot({ path: OUT + '/v17_' + dev + '_nb.png' });
    // 공격 승리 → 선택 유지
    const at = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; S.f[0].troops = 5000; S.ap = 5; const mine = E.dongsOf(S, 0); let t = -1; mine.some(a => D[a].a.some(j => { if (S.owner[j] !== 0 && !(S.f[0].pact && S.f[0].pact[S.owner[j]] > S.month)) { t = j; return true; } })); g.sync(); g.select(t, true); return t; });
    await p.waitForTimeout(250);
    if (await p.$('#atk')) { await p.click('#atk'); await p.waitForTimeout(200); if ((await G(t => __game.S.owner[t], at)) !== 0 && await p.$('#atk')) { await p.click('#atk').catch(() => {}); await p.waitForTimeout(200); } }
    await dismiss();
    const ka = await G(t => ({ own: __game.S.owner[t], sel: document.querySelector('#sheet:not([hidden]) h2') && document.querySelector('#sheet h2').textContent, nb: !!document.getElementById('nbView'), n: __game.D[t].n }), at);
    ok(ka.own !== 0 || (ka.sel === ka.n && ka.nb), dev + ' 점령한 동이 계속 선택됨: ' + ka.sel + (ka.own === 0 ? '' : ' (공격 실패)'));
    // 전체 개발: 가장 큰 이득·손해 + 동별 목록
    const nd = await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; const cap = S.f[0].cap, q = [cap], seen = { [cap]: 1 }; while (q.length && Object.keys(seen).length < 8) { const x = q.shift(); D[x].a.forEach(j => { if (!seen[j] && Object.keys(seen).length < 8) { seen[j] = 1; q.push(j); } }); } Object.keys(seen).forEach(i => { S.owner[+i] = 0; S.min[+i] = 70; }); S.f[0].money = 3000; S.stat.took = Math.max(S.stat.took, 3); g.select(null); g.sync(); return E.dongsOf(S, 0).length; });
    if (dev === 'phone') { await tap('#cells'); await p.waitForTimeout(300); }
    await G(() => __game.tab('dev')); await p.waitForTimeout(200);
    const dv = await G(() => { const sh = document.getElementById('sheet'); const top = [...sh.querySelectorAll('.devTop .row')].map(r => r.textContent); const sm = sh.querySelector('.devList summary'); return { top, sum: sm && sm.textContent, rows: sh.querySelectorAll('.devList .row').length }; });
    ok(dv.top.some(t => /가장 큰 이득/.test(t)), dev + ' 전체 개발 가장 큰 이득: ' + dv.top.join(' | '));
    const nn = +((dv.sum || '').match(/대상 (\d+)곳/) || [0, -1])[1];
    ok(nn > 0 && dv.rows === nn, dev + ' 대상 ' + nn + '곳 보기 → 동별 ' + dv.rows + '줄');
    await G(() => { const d = document.querySelector('.devList'); d.open = true; d.scrollIntoView(); }); await p.waitForTimeout(200);
    await p.screenshot({ path: OUT + '/v17_' + dev + '_dev.png' });
    // 상대 턴 말풍선: 우리 땅을 넓히고 인원을 비워 공격을 부름
    await G(() => { const g = __game, S = g.S, D = g.D, E = g.E; const cap = S.f[0].cap, q = [cap], seen = { [cap]: 1 }; while (q.length && Object.keys(seen).length < 40) { const x = q.shift(); D[x].a.forEach(j => { if (!seen[j] && Object.keys(seen).length < 40) { seen[j] = 1; q.push(j); } }); } Object.keys(seen).forEach(i => { S.owner[+i] = 0; S.min[+i] = 60; }); S.f[0].troops = 0; S.f[0].money = 0; S.min[cap] = 100; S.month = Math.max(S.month, 12); const nb = {}; E.dongsOf(S, 0).forEach(i => D[i].a.forEach(j => { const o = S.owner[j]; if (o > 0) nb[o] = 1; })); Object.keys(nb).forEach(o => { S.f[o].troops = 30000; S.f[o].hate = 90; }); g.select(null); g.sync(); g.tags(); });
    let tags = [];
    for (let m = 0; m < 8; m++) {
      if (m >= 3 && tags.some(t => /우리 동 피습/.test(t))) break;
      if (dev === 'phone') await G(() => __game.select(null));
      await dismiss(); await G(() => document.getElementById('next').click()); for (let w = 0; w < 16; w++) { await p.waitForTimeout(200); if (await G(() => !document.getElementById('rpBlock').hidden)) break; }
      for (let w = 0; w < 80; w++) { await p.waitForTimeout(250); if (await p.$('#over:not([hidden])') && !(await G(() => !document.getElementById('rpBlock').hidden))) await dismiss(); const busy = await G(() => !document.getElementById('rpBlock').hidden); if (!busy) break; if (m === 0 && [1, 3, 5, 7].includes(w)) await p.screenshot({ path: OUT + '/v17_' + dev + '_bubble' + w + '.png' }); }
      tags = tags.concat(await G(() => __game.tags())); if (await G(() => __game.S.over)) break; await dismiss();
      const ov = await G(() => document.getElementById('over').hidden ? '' : document.getElementById('card').textContent.slice(0, 80)); if (ov) { console.log('  카드: ' + ov); await G(() => { const b = document.querySelector('#over:not([hidden]) #card button'); if (b) b.click(); }); await p.waitForTimeout(200); }
    }
    const ours = tags.filter(t => /우리 동 피습|방어 성공|함락/.test(t)), near = tags.filter(t => /인접 전투/.test(t));
    ok(ours.length > 0, dev + ' 우리 동 피습 말풍선 ' + ours.length + '개: ' + ours.slice(0, 3).join(' / '));
    ok(tags.every(t => !/→/.test(t) || !/우리/.test(t)), dev + ' 말풍선 ' + tags.length + '개 · 인접 전투 ' + near.length + ' · 예: ' + tags.slice(0, 4).join(' / '));
    ok(!errs.length, dev + ' 오류 없음 ' + errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await b.close(); srv.close();
})();
