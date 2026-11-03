// 광역시: 도시 고르기, 각 도시 시작·진행, 저장 분리
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8131);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  let winShot = 0;
  const dismiss = async () => { for (let k = 0; k < 6; k++) { const w = await p.$('#over:not([hidden]) #cont'); if (w) { if (!winShot++) await p.screenshot({ path: OUT + '/c_win.png' }); await w.tap(); await p.waitForTimeout(250); continue; } const c = await p.$('#over:not([hidden]) #cardOk'); if (!c) break; await c.tap(); await p.waitForTimeout(250); } };
  const newGame = async () => { await dismiss(); await p.tap('#menuBtn'); await p.waitForTimeout(150); await p.tap('#newGame'); await p.waitForTimeout(100); await p.tap('#newGame').catch(() => {}); await p.waitForTimeout(300); };
  await p.goto('http://localhost:8131', { waitUntil: 'load' }); await p.waitForTimeout(400);
  ok(/서울 427개 동/.test(await p.textContent('#brand')), '기본은 서울');
  ok((await p.$$('#cities .city')).length === 7, '도시 칩 7개');
  for (const [id, nm] of [['busan', '부산'], ['daegu', '대구'], ['incheon', '인천'], ['gwangju', '광주'], ['daejeon', '대전'], ['ulsan', '울산']]) {
    await p.tap('#cities .city[data-c="' + id + '"]'); await p.waitForLoadState('load'); await p.waitForTimeout(600);
    const br = await p.textContent('#brand'); ok(br.includes(nm + '시장'), nm + ' 시작 화면: ' + br.trim().slice(0, 70));
    await p.screenshot({ path: OUT + '/c_' + id + '_start.png' });
    const pres = await p.$$eval('#presets button', x => x.map(b => b.textContent)); ok(pres.length >= 3, nm + ' 추천 시작: ' + pres.join(' / '));
    await p.tap('#begin'); await p.waitForTimeout(500);
    const st = await G(() => ({ city: __game.S.city, n: __game.D.length })); ok(st.city === id, nm + ' 게임 시작 ' + st.n + '개 동');
    const r = await G(() => {
      const g = __game, S = g.S, E = g.E, D = g.D;
      for (let m = 0; m < 30 && !S.won && !S.over; m++) {
        if (S.f[0].money > 30) E.recruit(S, S.f[0].money * .8);
        for (let k = 0; k < 12 && S.ap > 0; k++) { let best = -1, bn = 1e9; E.dongsOf(S, 0).forEach(i => D[i].a.forEach(t => { if (S.owner[t] === 0) return; const p = E.preview(S, t, 1); if (p.reason) return; const n = E.needFor(S, t, .8); if (n < bn && n <= S.f[0].troops) { bn = n; best = t; } })); if (best < 0) break; E.attack(S, best, bn); }
        E.endTurn(S);
      }
      g.sync(); return { m: S.month, n: E.dongsOf(S, 0).length, rank: S.rank, share: E.popShare(S, 0), won: S.won };
    });
    ok(r.n > 3, nm + ' 30달 진행: 동 ' + r.n + '개, 직급 ' + r.rank + ', 인구 ' + (r.share * 100).toFixed(1) + '%' + (r.won ? ' (승리)' : ''));
    await dismiss(); await p.screenshot({ path: OUT + '/c_' + id + '_game.png' });
    await p.tap('#cells'); await p.waitForTimeout(200); const rs = await p.textContent('#sheet'); ok(rs.includes(nm + '시장까지'), nm + ' 세력 화면 목표 문구'); await p.tap('.x');
    await p.tap('#menuBtn'); await p.waitForTimeout(150); const ms = await p.textContent('#sheet'); ok(/행정안전부 주민등록 인구통계/.test(ms) && ms.includes(nm + '시장'), nm + ' 메뉴 출처·규칙'); await p.tap('.x');
    await newGame();
  }
  // 부산 판을 남겨 두고 서울에 갔다 오기
  await p.tap('#cities .city[data-c="busan"]'); await p.waitForLoadState('load'); await p.waitForTimeout(500); await p.tap('#begin'); await p.waitForTimeout(400);
  const bstart = await G(() => __game.S.start);
  await G(() => { try { localStorage.setItem('dongjang-city', 'seoul'); } catch (e) {} history.replaceState(null, '', '#city=seoul'); location.reload(); }).catch(() => {});
  await p.waitForLoadState('load'); await p.waitForTimeout(600);
  const sc = await G(() => ({ brand: document.querySelector('#brand').textContent, dot: [...document.querySelectorAll('#cities .city')].find(x => x.dataset.c === 'busan').textContent }));
  ok(/서울/.test(sc.brand) && /·/.test(sc.dot), '서울 화면에서 부산 진행 표시: ' + sc.dot);
  await p.tap('#cities .city[data-c="busan"]'); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  const rv = await p.$('#resume'); ok(!!rv, '부산 이어 하기 버튼'); if (rv) { await rv.tap(); await p.waitForTimeout(400); ok(await G(s => __game.S.start === s, bstart), '부산 판 이어서'); }
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
