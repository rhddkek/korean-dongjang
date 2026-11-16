// 추천 줄만 따라 누르는 사람 흉내: 달마다 탭 수·기다린 시간·끼어든 창·남긴 결재를 잰다
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2], START = process.argv[3] || '서교', RP = process.argv[4] || 'normal', MAXM = +(process.argv[5] || 70);
const srv = http.createServer((q, r) => { if (/bgm\//.test(q.url)) { r.statusCode = 404; r.end(); return; } r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(fs.readFileSync('index.html')); }).listen(8170 + (process.pid % 20));
(async () => {
  const port = srv.address().port; const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(rp => { try { localStorage.setItem('dongjang-replay', rp); } catch (e) {} }, RP);
  await p.goto('http://localhost:' + port, { waitUntil: 'load' }); await p.waitForTimeout(500);
  await p.fill('#q', START); await p.waitForTimeout(100); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(500);
  let taps = 0; const tap = async sel => { try { await p.tap(sel, { timeout: 2500 }); taps++; return true; } catch (e) { return false; } };
  const st = () => p.evaluate(() => { const S = __game.S, E = __game.E; return { m: S.month, ap: S.ap, n: E.dongsOf(S, 0).length, rank: S.rank, won: !!S.won, over: !!S.over, coal: !!S.coal, elect: !!S.elect, money: Math.round(S.f[0].money), troops: Math.round(S.f[0].troops), share: +(E.popShare(S, 0) * 100).toFixed(1), todo: document.getElementById('todo').hidden ? '' : document.getElementById('todo').textContent, over2: !document.getElementById('over').hidden, card: document.getElementById('over').hidden ? '' : (document.querySelector('#card h2') || {}).textContent || 'card' }; });
  const modal = async (log) => { for (let k = 0; k < 8; k++) { const s = await st(); if (!s.over2) return; log.push(s.card);
      if (await p.$('#over:not([hidden]) #plOk')) { const on = await p.$$eval('#card .pl.on', x => x.length); for (let i = 0; i < 2 - on; i++) await tap('#card .pl:not(.on)'); await tap('#plOk'); }
      else if (await p.$('#over:not([hidden]) button.pcard:not(.pl)')) await tap('#over button.pcard:not(.pl)');
      else if (await p.$('#over:not([hidden]) #cont')) return 'end';
      else if (await p.$('#over:not([hidden]) #again')) return 'end';
      else if (!(await tap('#over:not([hidden]) #cardOk'))) await tap('#over:not([hidden]) button');
      await p.waitForTimeout(250); } };
  const rows = []; let end = '';
  for (let mm = 0; mm < MAXM; mm++) {
    const t0 = Date.now(); taps = 0; const cards = []; let acts = 0, idle = 0;
    if (await modal(cards) === 'end') { end = 'end'; break; }
    for (let a = 0; a < 12; a++) {
      const s = await st(); if (s.won || s.over) break; if (!s.todo || s.ap <= 0 && !/경고/.test(s.todo)) break;
      if (/새 기능|경고|남기고 다음 달/.test(s.todo)) break;
      await tap('#todo'); await p.waitForTimeout(250);
      // 시트에서 주 버튼
      let done = false;
      for (const b2 of ['#atk:not([disabled])', '#per:not([disabled])', '#guAtk:not([disabled])', '#zAtk:not([disabled])', '#guCamp:not([disabled])', '.chip[data-m="all"]:not([disabled])']) { if (await p.$(b2)) { await tap(b2); done = true; break; } }
      await p.waitForTimeout(300);
      // 전투 연출·결과 카드 닫기
      for (let w = 0; w < 30; w++) { if (await p.evaluate(() => !!document.querySelector('#rps:not([hidden]), #battle:not([hidden])'))) await p.waitForTimeout(150); else break; }
      if (await modal(cards) === 'end') break;
      const x = await p.$('.x'); if (x && await x.isVisible()) { await tap('.x'); await p.waitForTimeout(120); }
      if (!done) { idle++; break; } acts++;
    }
    const s1 = await st(); if (s1.won || s1.over) { rows.push({ ...s1, taps, acts, ms: Date.now() - t0, cards: cards.join('|') }); end = s1.won ? 'won' : 'over'; break; }
    const tAct = Date.now() - t0; const t1 = Date.now();
    await tap('#next');
    for (let w = 0; w < 400; w++) { await p.waitForTimeout(100); const busy = await p.evaluate(() => !document.getElementById('rpBlock').hidden || !document.getElementById('turnCal').hidden); if (!busy) break; }
    const wait = Date.now() - t1;
    rows.push({ m: s1.m, n: s1.n, rank: s1.rank, share: s1.share, apLeft: s1.ap, taps, acts, tAct, wait, money: s1.money, troops: s1.troops, coal: s1.coal, elect: s1.elect, cards: cards.join('|'), todoLeft: s1.todo.slice(0, 30) });
    if ([1, 8, 20, 35, 50].includes(mm)) await p.screenshot({ path: OUT + '/bot_' + START + '_' + mm + '.png' });
  }
  const f = await st(); await p.screenshot({ path: OUT + '/bot_' + START + '_end.png' });
  fs.writeFileSync(OUT + '/bot_' + START + '_' + RP + '.json', JSON.stringify({ end, final: f, rows, errs }));
  const sum = k => rows.reduce((a, r) => a + (r[k] || 0), 0);
  console.log(START, RP, 'end=' + end, 'months=' + rows.length, 'final', JSON.stringify({ n: f.n, rank: f.rank, share: f.share, won: f.won, over: f.over }), 'taps/달 ' + (sum('taps') / rows.length).toFixed(1), '행동/달 ' + (sum('acts') / rows.length).toFixed(1), '조작 ' + (sum('tAct') / 1000 / rows.length).toFixed(1) + 's/달', '기다림 ' + (sum('wait') / 1000 / rows.length).toFixed(1) + 's/달', '남긴 결재 ' + (sum('apLeft') / rows.length).toFixed(2), 'errs', errs.length);
  await b.close(); srv.close();
})();
