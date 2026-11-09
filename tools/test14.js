// 도·통합·전국 모드: 고르기, 압축 데이터 풀기, 직함, 30달 진행, 규칙·출처 문구, 저장 분리
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8136);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
const MODES = [['gyeonggi', '경기', '경기도지사'], ['gangwon', '강원', '강원특별자치도지사'], ['chungbuk', '충북', '충청북도지사'], ['chungnam', '충남', '충청남도지사'], ['jeonbuk', '전북', '전북특별자치도지사'],
  ['gyeongbuk', '경북', '경상북도지사'], ['gyeongnam', '경남', '경상남도지사'], ['jeju', '제주', '제주특별자치도지사'], ['daegyeong', '대구경북', '대구경북 통합시장'], ['gyeongsang', '경상도', '경상도 관찰사'],
  ['jeonnam', '전남광주', '전남광주통합특별시장'], ['jeolla', '전라도', '전라도 관찰사'], ['korea', '전국', '대통령']].filter(m => !ONLY || ONLY.includes(m[0]));
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  const ready = () => p.waitForFunction(() => window.__game && __game.D && document.querySelector('#begin'), null, { timeout: 20000 });
  const dismiss = async () => { for (let k = 0; k < 8; k++) { const w = await p.$('#over:not([hidden]) #cont'); if (w) { await w.tap(); await p.waitForTimeout(200); continue; } const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(200); } };
  await p.goto('http://localhost:8136', { waitUntil: 'load' }); await ready();
  for (const [id, nm, mayor] of MODES) {
    const t0 = Date.now();
    await p.tap('#cities .city[data-c="' + id + '"]'); await p.waitForLoadState('load'); await ready(); await p.waitForTimeout(300);
    const br = await p.textContent('#brand'); ok(br.includes(mayor), nm + ' 시작 화면 (' + (Date.now() - t0) + 'ms): ' + br.trim().slice(5, 80));
    const pres = await p.$$eval('#presets button', x => x.map(b => b.textContent)); ok(pres.length >= 3, nm + ' 추천 시작: ' + pres.slice(0, 3).join(' / '));
    await p.screenshot({ path: OUT + '/n_' + id + '_start.png' });
    const bt = await p.textContent('#begin'); ok(/(동장|읍장|면장|청장|시장|군수)으로 시작/.test(bt), nm + ' 시작 버튼: ' + bt);
    await p.tap('#begin'); await p.waitForTimeout(400);
    const who = await p.textContent('#who'); ok(/(동장|읍장|면장|청장|시장|군수)$/.test(who.trim()), nm + ' 첫 직함: ' + who);
    const st = await G(() => ({ city: __game.S.city, n: __game.D.length, f: __game.S.f.length - 1 }));
    const tTurn = Date.now();
    const r = await G(() => {
      const g = __game, S = g.S, E = g.E, D = g.D;
      for (let m = 0; m < 30 && !S.won && !S.over; m++) {
        if (S.f[0].money > 30) E.recruit(S, S.f[0].money * .8);
        for (let k = 0; k < 14 && S.ap > 0; k++) { let best = -1, bn = 1e9; E.dongsOf(S, 0).forEach(i => D[i].a.forEach(t => { if (S.owner[t] === 0) return; const p = E.preview(S, t, 1); if (p.reason) return; const n = E.needFor(S, t, .8); if (n < bn && n <= S.f[0].troops) { bn = n; best = t; } })); if (best < 0) break; E.attack(S, best, bn); }
        E.endTurn(S);
      }
      g.sync(); return { m: S.month, n: E.dongsOf(S, 0).length, rank: S.rank, share: E.popShare(S, 0), won: S.won, who: document.getElementById('who').textContent, goal: document.getElementById('cPop').textContent };
    });
    ok(r.n > 3, nm + ' ' + st.n + '칸·세력 ' + st.f + ' → 30달: ' + r.n + '칸, 직급 ' + r.rank + ' (' + r.who + '), 인구 ' + (r.share * 100).toFixed(1) + '%, 목표 "' + r.goal + '" · 턴당 ' + Math.round((Date.now() - tTurn) / 30) + 'ms');
    await dismiss(); await p.screenshot({ path: OUT + '/n_' + id + '_game.png' });
    await p.tap('#cells'); await p.waitForTimeout(200); const rs = await p.textContent('#sheet'); ok(rs.includes(mayor + '까지'), nm + ' 세력 화면 목표'); await p.tap('.x');
    await p.tap('#menuBtn'); await p.waitForTimeout(150); const ms = await p.textContent('#sheet'); ok(/행정안전부 주민등록 인구통계/.test(ms) && ms.includes(mayor) && !/구청장부터는 구 현황/.test(ms.replace(/시군구/g, '')), nm + ' 메뉴 출처·규칙'); await p.tap('.x');
    if (id === 'korea') { const all = await p.evaluate(() => document.body.innerText); ok(!/우리 동[^네원]/.test(all), '전국: "우리 동" 대신 "지역"'); }
    await p.tap('#menuBtn'); await p.waitForTimeout(150); await p.tap('#newGame'); await p.waitForTimeout(100); await p.tap('#newGame').catch(() => {}); await p.waitForTimeout(300); await ready();
  }
  // 저장 분리: 경기 판을 남겨 두고 전국 갔다 오기
  if (!ONLY) {
    await p.tap('#cities .city[data-c="gyeonggi"]'); await p.waitForLoadState('load'); await ready(); await p.tap('#begin'); await p.waitForTimeout(300);
    const s0 = await G(() => __game.S.start);
    await G(() => { try { localStorage.setItem('dongjang-city', 'korea'); } catch (e) {} history.replaceState(null, '', '#city=korea'); location.reload(); }).catch(() => {});
    await p.waitForLoadState('load'); await ready();
    const dot = await G(() => [...document.querySelectorAll('#cities .city')].find(x => x.dataset.c === 'gyeonggi').textContent); ok(/·/.test(dot), '전국 화면에서 경기 진행 표시');
    await p.tap('#cities .city[data-c="gyeonggi"]'); await p.waitForLoadState('load'); await ready();
    const rv = await p.$('#resume'); ok(!!rv, '경기 이어 하기'); if (rv) { await rv.tap(); await p.waitForTimeout(300); ok(await G(s => __game.S.start === s, s0), '경기 판 그대로'); }
  }
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
