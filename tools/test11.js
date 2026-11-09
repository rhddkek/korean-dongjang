// v10: 동네 조합, 소식 줄 다음 일, 스카우트 공세 무산(검증된 경우만)
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8132);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(250); } };
  await p.goto('http://localhost:8132', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '소공'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  // 직주근접: 일터(소공동) + 맞닿은 주거 동 하나는 이미 우리 것, 하나 더 먹으면 완성되는 상황 만들기
  const setup = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D, cap = S.f[0].cap;
    for (let i = 0; i < D.length; i++) { if (E.roleOf(i).includes('일터') && D[i].a.filter(j => E.roleOf(j).includes('주거')).length >= 2) {
      const res = D[i].a.filter(j => E.roleOf(j).includes('주거'));
      S.owner[i] = 0; S.owner[res[0]] = 0; S.owner[res[1]] = -1; S.combo = {}; g.sync(); return { hub: i, a: res[0], t: res[1], names: [D[i].n, D[res[0]].n, D[res[1]].n] };
    } }
    return null;
  });
  ok(!!setup, '조합 시험 지형: ' + (setup && setup.names.join('·')));
  await G(t => __game.select(t), setup.t); await p.waitForTimeout(350);
  const st = await p.textContent('#sheet');
  ok(/이 동을 확보하면 직주근접 생활권 완성/.test(st) && /동원 \+\d+명\/월/.test(st), '먹기 전 완성 미리보기');
  await p.screenshot({ path: OUT + '/d1_preview.png' });
  const pv = await G(t => __game.E.comboPreview(__game.S, t), setup.t); ok(pv.some(c => c.k === 'jj' && c.d.includes(setup.hub)), '미리보기 묶음에 일터 동 포함');
  // 설득으로 확보 → 완성
  await G(() => { __game.S.f[0].money = 9999; __game.S.ap = 5; }); await p.tap('#per'); await p.waitForTimeout(700); await dismiss();
  const done = await G(() => { const S = __game.S; return { combo: S.combo && S.combo.jj, log: S.log.slice(0, 6).map(l => l.t).find(t => /직주근접 생활권 완성/.test(t)) }; });
  ok(done.combo && done.log, '조합 완성 소식: ' + done.log);
  await p.screenshot({ path: OUT + '/d2_done.png' });
  const fx = await G(s => { const g = __game, S = g.S, E = g.E; const on = E.draftOf(S, s.a); const keep = S.combo.jj; S.combo.jj = null; const off = E.draftOf(S, s.a); S.combo.jj = keep; return { on, off }; }, setup);
  ok(fx.on > fx.off * 1.15, '묶인 동 동원 +20% (' + fx.off.toFixed(1) + '→' + fx.on.toFixed(1) + ')');
  await G(a => __game.select(a), setup.a); await p.waitForTimeout(300); ok(/직주근접 생활권<\/b>|직주근접 생활권 ·/.test(await p.innerHTML('#sheet')), '우리 동 화면에 작동 중 표시'); await p.tap('.x');
  // 골목상권: 개발비 할인
  const mk = await G(() => { const g = __game, S = g.S, E = g.E, D = g.D; const ids = []; for (let i = 0; i < D.length && ids.length < 1; i++) { if (!E.roleOf(i).includes('상권')) continue; const nb = D[i].a.filter(j => E.roleOf(j).includes('상권')); if (nb.length >= 2) { ids.push(i, nb[0], nb[1]); } } ids.forEach(i => S.owner[i] = 0); S.combo.mk = { d: ids, at: S.month }; return { c: E.devCost(S, ids[0], 0), base: E.C.COST[E.lv(S, ids[0], 0)] }; });
  ok(mk.c < mk.base, '골목상권 개발비 할인 ' + mk.base + '→' + mk.c);
  // 세력 화면 조합 현황
  await G(() => __game.sync()); await p.tap('#cells'); await p.waitForTimeout(250); const rs = await p.textContent('#sheet');
  ok(/동네 조합/.test(rs) && /작동 중/.test(rs) && /환승 생활권/.test(rs), '세력 화면 조합 현황'); await p.tap('.x');
  // 소식 줄 다음 일: 다음 달 완공
  const nh = await G(() => { const g = __game, S = g.S; const i = g.E.dongsOf(S, 0).find(x => !S.gov.sites[x]); S.gov.sites[i] = { k: 'agency', start: S.month - 1, done: S.month + 2, pact: false, paid: 0 }; S.rivalPlan = null; S.seenFoe = 1; return i; });
  await dismiss(); await p.tap('#next'); await p.waitForTimeout(400); await dismiss();
  const news = await p.textContent('#news'); ok(/예정: 다음 달 .* 완공 · 월수입 \+25억|주의|빼앗|공격/.test(news), '소식 줄 다음 일: ' + news.slice(0, 80));
  // 스카우트 공세 무산: 엔진으로 직접 검증
  const sc = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D;
    let f = null, t = -1; for (const ff of S.f) { if (!ff.ai || !ff.alive) continue; for (const i of E.dongsOf(S, ff.id)) { const j = D[i].a.find(x => S.owner[x] === 0 && x !== S.f[0].cap); if (j !== undefined) { f = ff; t = j; break; } } if (f) break; }
    if (!f) return null;
    S.rival = f.id; S.f[0].pact = {}; f.lostAt = -9; f.grudge = 0; S.f[0].troops = 0; S.f[0].away = 0;
    S.min[t] = 800; S.f[0].troops = 800; // 방어가 너무 얇으면 AI 월 동원만으로 넘어가서 시험이 흔들림
    const r = E.route(S, f.id, t); const def = E.defense(S, t).total;
    // 예고 인원은 방어를 넘지만, 스카우트로 빠진 뒤 남은 인원으로는 못 넘게
    const need = def * 1.2 / (1 + r.mult);
    S.rivalPlan = { t, f: f.id, n: Math.round(need * 20), mult: r.mult, src: r.src };
    f.troops = 10; f.money = 0; S.scoutAt[f.id] = S.month; S.scoutGain = { [f.id]: Math.round(need * 20) };
    S.f[0].troops = 0; S.f[0].away = 0;
    E.endTurn(S);
    return S.last.map(l => l.t).find(x => /스카우트로|공격을 접었|미뤘/.test(x)) || S.last.map(l => l.t).slice(0, 4).join(' | ');
  });
  ok(/스카우트로 .*공세가 무산/.test(sc || ''), '스카우트 덕분일 때만 무산 문구: ' + sc);
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
