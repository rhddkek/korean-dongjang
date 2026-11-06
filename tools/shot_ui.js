// UI 다이어트 확인용 스크린샷: 우리 동, 적 동, 독립 동, 동장실. 시트 높이(스크롤 길이)도 출력
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.', TAG = process.argv[3] || 'x';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>try{localStorage.getItem("dongjang-replay")||localStorage.setItem("dongjang-replay","off")}catch(e){}</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8140);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  await p.goto('http://localhost:8140', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '소공'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  const ids = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D, id = n => D.findIndex(d => d.n === n);
    S.month = 14; S.f[0].money = 900; S.f[0].troops = 400; S.seenFoe = 1;
    const my = S.f[0].cap; S.dev[my * 4] = 2; S.dev[my * 4 + 3] = 1;
    const nb = D[my].a.filter(j => S.owner[j] !== 0);
    const f = S.f.find(x => x.ai && x.alive); S.owner[nb[0]] = f.id; S.owner[nb[1]] = -1;
    g.sync(); return { my, en: nb[0], ind: nb[1] };
  });
  const shot = async (name, i) => {
    await G(i => __game.select(i), i); await p.waitForTimeout(350);
    const h = await G(() => { const s = document.getElementById('sheet'); return { sh: s.scrollHeight, ch: s.clientHeight, txt: s.innerText.length }; });
    console.log(name, '시트 내용 높이', h.sh, '보이는 높이', h.ch, '글자 수', h.txt);
    await p.screenshot({ path: OUT + '/' + TAG + '_' + name + '.png' });
  };
  await shot('own', ids.my);
  await p.tap('.dev h4[data-dk="0"]'); await p.waitForTimeout(150); await p.screenshot({ path: OUT + '/' + TAG + '_own_more.png' });
  await shot('enemy', ids.en);
  await G(() => { const s = document.getElementById('sheet'); s.scrollTop = s.scrollHeight; }); await p.tap('#diplo summary'); await p.waitForTimeout(200);
  await G(() => { const d = document.getElementById('diplo'); d.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(100); await p.screenshot({ path: OUT + '/' + TAG + '_diplo.png' });
  await shot('ind', ids.ind);
  await G(() => __game.select(null)); await p.tap('#cells'); await p.waitForTimeout(300);
  const h = await G(() => { const s = document.getElementById('sheet'); return { sh: s.scrollHeight, txt: s.innerText.length }; }); console.log('realm 시트 내용 높이', h.sh, '글자 수', h.txt);
  await p.screenshot({ path: OUT + '/' + TAG + '_realm.png' });
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
