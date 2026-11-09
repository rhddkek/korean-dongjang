// 실제 브라우저에서 터치 입력으로 플레이
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || '.';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_|fonts|Failed to load resource/.test(m.text())) errs.push('console ' + m.text()); });
  const html = fs.readFileSync('dongjang.html', 'utf8');
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var c=document.querySelector("#card");if(!c)return;var b=c.querySelector("button.pcard:not(.pl)");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0);return}var ok=c.querySelector("#plOk");if(ok&&!ok.dataset.ap){ok.dataset.ap=1;setTimeout(function(){var on=document.querySelectorAll("#card .pl.on").length;var q=document.querySelectorAll("#card .pl:not(.on)");for(var i=0;i<2-on&&i<q.length;i++)q[i].click();var o2=document.querySelector("#plOk");if(o2&&!o2.disabled)o2.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script>' + html + '</body></html>', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/01_start.png' });
  // 검색으로 시작
  await page.fill('#q', '상계8');
  await page.waitForTimeout(100);
  await page.tap('#results button');
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/02_pick.png' });
  await page.tap('#begin');
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/03_game.png' });
  const reachOne = () => page.evaluate(() => {
    const g = window.__game, S = g.S, D = g.D, c = g.cam();
    let best = null;
    for (const i of g.E.dongsOf(S, 0)) for (const j of D[i].a) if (S.owner[j] !== 0) { const sx = D[j].x * c.s + c.x, sy = D[j].y * c.s + c.y; if (sx > 30 && sx < innerWidth - 30 && sy > 150 && sy < innerHeight - 90) { const need = g.E.needFor(S, j, .8); if (!best || need < best.need) best = { j, sx, sy, need, name: D[j].n }; } }
    return best;
  });
  // 지도를 탭해서 공격
  const t = await reachOne();
  console.log('target', t);
  await page.touchscreen.tap(t.sx, t.sy);
  await page.waitForTimeout(450);
  await page.screenshot({ path: OUT + '/04_enemy.png' });
  const sheetName = await page.textContent('#sheet h2');
  console.log('sheet opened:', sheetName);
  await page.tap('#atk');
  await page.waitForTimeout(220);
  await page.screenshot({ path: OUT + '/05_stamp.png' });
  const cw = await page.$('#over:not([hidden]) #cardOk'); if (cw) await cw.tap();
  await page.waitForTimeout(800);
  console.log('news:', await page.textContent('#news'));
  // 우리 동 개발 화면
  const own = await page.evaluate(() => { const g = window.__game, d = g.D[g.S.f[0].cap], c = g.cam(); return { x: d.x * c.s + c.x, y: d.y * c.s + c.y }; });
  await page.touchscreen.tap(own.x, own.y);
  await page.waitForTimeout(450);
  await page.screenshot({ path: OUT + '/06_own.png' });
  const devBtn = await page.$('.dev button:not([disabled])');
  if (devBtn) { await devBtn.tap(); console.log('developed'); }
  await page.tap('.x');
  // 세력 / 소식 / 메뉴
  await page.tap('#cells'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/07_realm.png' });
  await page.tap('.x');
  await page.tap('#menuBtn'); await page.waitForTimeout(200); await page.screenshot({ path: OUT + '/08_menu.png', fullPage: false });
  await page.tap('.x');
  await page.tap('#lens'); await page.tap('#lens'); await page.waitForTimeout(250); await page.screenshot({ path: OUT + '/09_lens.png' });
  await page.tap('#lens'); await page.tap('#lens'); await page.tap('#lens');
  // 몇 달 진행 (UI 버튼 + 간단한 봇)
  const bot = async () => page.evaluate(() => {
    const g = window.__game, S = g.S, E = g.E, D = g.D;
    if (S.f[0].money > 30) E.recruit(S, S.f[0].money * .9);
    for (let k = 0; k < 15 && S.ap > 0; k++) {
      let best = -1, bn = 1e9; const seen = {};
      E.dongsOf(S, 0).forEach(i => D[i].a.forEach(t => { if (seen[t] || S.owner[t] === 0) return; seen[t] = 1; const p = E.preview(S, t, 1); if (p.reason) return; const n = E.needFor(S, t, .8); if (n < bn && n <= S.f[0].troops) { bn = n; best = t; } }));
      if (best < 0) break;
      E.attack(S, best, bn);
    }
    return { m: S.month, n: E.dongsOf(S, 0).length, rank: S.rank, won: S.won, over: S.over };
  });
  let info, shots = { 12: 0, 30: 0 }, promoShot = false;
  for (let m = 0; m < 200; m++) {
    info = await bot();
    if (info.won || info.over) { await page.evaluate(() => {}); }
    await page.tap('#next', { timeout: 3000 }).catch(() => {});
    if (await page.$('#over:not([hidden])')) {
      if (!promoShot) { await page.waitForTimeout(120); await page.screenshot({ path: OUT + '/10_promo.png' }); promoShot = true; }
      const ok = await page.$('#over:not([hidden]) #cardOk');
      if (ok) await ok.tap(); else break;
    }
    if (m === 14) { await page.waitForTimeout(100); await page.screenshot({ path: OUT + '/11_m15.png' }); }
    if (m === 30) { await page.evaluate(() => {}); await page.tap('#news'); await page.waitForTimeout(120); await page.screenshot({ path: OUT + '/12_log.png' }); await page.tap('.x'); await page.waitForTimeout(100); await page.screenshot({ path: OUT + '/13_m30.png' }); }
    if (info.over || info.won) break;
  }
  await page.waitForTimeout(300);
  console.log('final', await page.evaluate(() => { const g = window.__game, S = g.S; return { m: S.month, n: g.E.dongsOf(S, 0).length, won: S.won, over: S.over, rank: S.rank, stat: S.stat, share: g.E.popShare(S, 0) }; }));
  await page.screenshot({ path: OUT + '/14_end.png' });
  console.log('end card:', (await page.textContent('#card').catch(() => '')) || '');
  // 저장 후 이어 하기
  console.log('errors', errs);
  await b.close();
  // 데스크톱
  const b2 = await chromium.launch(); const p2 = await b2.newPage({ viewport: { width: 1280, height: 800 } });
  const er2 = []; p2.on('pageerror', e => er2.push(e.message));
  await p2.setContent('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + html + '</body></html>', { waitUntil: 'load', timeout: 60000 });
  await p2.waitForTimeout(600); await p2.screenshot({ path: OUT + '/20_desk_start.png' });
  await p2.click('#begin'); await p2.waitForTimeout(500); await p2.screenshot({ path: OUT + '/21_desk_game.png' });
  console.log('desktop errors', er2);
  await b2.close();
})().catch(e => { console.error(e); process.exit(1); });
