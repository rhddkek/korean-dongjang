// 소리: 합성음 호출, 끄기 저장, 오류 없음
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body><script>new MutationObserver(function(){var b=document.querySelector("#card button.pcard");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8133);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8133', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.addInitScript(() => {}); 
  await p.evaluate(() => { window.__osc = 0; const o = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__osc++; return o.call(this); }; const AC = window.AudioContext; window.AudioContext = function () { const c = new AC(); const o = c.createOscillator.bind(c); c.createOscillator = function () { window.__osc++; return o(); }; return c; }; });
  await p.tap('#begin'); await p.waitForTimeout(400);
  await p.tap('#next'); await p.waitForTimeout(300);
  const n1 = await p.evaluate(() => window.__osc); ok(n1 > 0, '다음 달 소리 (합성음 ' + n1 + '개)');
  await p.evaluate(() => { const g = __game, S = g.S; S.f[0].money = 999; g.select(S.f[0].cap); }); await p.waitForTimeout(300);
  const dev = await p.$('.dev button:not([disabled])'); if (dev) await dev.tap(); await p.waitForTimeout(200);
  const n2 = await p.evaluate(() => window.__osc); ok(n2 > n1, '개발 소리'); await p.tap('.x');
  await p.tap('#menuBtn'); await p.waitForTimeout(200); ok(/효과음 켜짐/.test(await p.textContent('#sheet')), '메뉴에 소리 버튼');
  await p.tap('#sndBtn'); await p.waitForTimeout(200); ok(/효과음 꺼짐/.test(await p.textContent('#sheet')), '끄기');
  const before = await p.evaluate(() => window.__osc); await p.tap('.x'); await p.tap('#next'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => window.__osc) === before, '꺼진 뒤 소리 없음');
  ok(await p.evaluate(() => localStorage.getItem('dongjang-sound')) === 'off', '설정 저장');
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
