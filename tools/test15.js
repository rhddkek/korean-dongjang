// 상대 턴 재생: 하나씩 보여 주기, 빠르게/건너뛰기, 저장은 진짜 상태, 끄기
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body><script>new MutationObserver(function(){var b=document.querySelector("#card button.pcard");if(b&&!b.dataset.ap){b.dataset.ap=1;setTimeout(function(){b.click()},0)}}).observe(document.documentElement,{childList:true,subtree:true})</script>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8137);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  await p.goto('http://localhost:8137', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '소공'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  // 우리 동 옆에 강한 세력 → 다음 달 우리 땅 공격이 일어나게
  const setup = async () => G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D; S.seenFoe = 1; S.month = Math.max(S.month, 8);
    const my = S.f[0].cap, mine = E.dongsOf(S, 0); const t = D[my].a.find(j => S.owner[j] !== 0); S.owner[t] = 0; S.min[t] = 70;
    const f = S.f.find(x => x.ai && x.alive); const nb = D[t].a.find(j => S.owner[j] !== 0 && j !== my);
    S.owner[nb] = f.id; f.troops = 40000; f.lostAt = -9; S.f[0].pact = {}; S.f[0].troops = 0; S.f[0].away = 0;
    const rt = E.route(S, f.id, t) || { mult: 0, src: nb }; S.rivalPlan = { t, f: f.id, n: 30000, mult: rt.mult, src: rt.src }; S.rival = f.id;
    g.sync(); return { t, name: D[t].n, f: f.name };
  });
  const st = await setup();
  await p.tap('#next'); await p.waitForTimeout(250);
  const r1 = await G(() => ({ bar: !document.getElementById('rpBar').hidden, label: document.getElementById('rpLabel').textContent }));
  ok(r1.bar && /상대 턴/.test(r1.label), '다음 달 → 상대 턴 재생 시작: ' + r1.label);
  await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/r1_replay.png' });
  // 재생 중 저장본은 이미 다음 달의 진짜 상태
  const sv = await G((t) => { const k = Object.keys(localStorage).find(x => /dongjang-save/.test(x) && !/prev/.test(x)); const o = JSON.parse(localStorage.getItem(k)); return { month: o.month, owner: o.owner[t] }; }, st.t);
  ok(sv.month === await G(() => __game.S.month), '재생 중에도 저장본은 다음 달 상태');
  // 끝까지 기다리기(최대 25초)
  await p.waitForFunction(() => document.getElementById('rpBlock').hidden, null, { timeout: 25000 }); await p.waitForTimeout(100);
  const r2 = await G((t) => ({ lost: __game.S.owner[t] !== 0, news: document.getElementById('news').textContent, card: !document.getElementById('over').hidden }), st.t);
  ok(r2.lost && /함락/.test(r2.news), '재생 끝 → 함락 소식·결과 카드: ' + r2.news.slice(0, 50) + (r2.card ? ' (카드)' : ''));
  await p.screenshot({ path: OUT + '/r2_after.png' });
  await p.tap('#cardOk').catch(() => {}); await p.waitForTimeout(200);
  // 건너뛰기
  await setup(); await p.tap('#next'); await p.waitForTimeout(200);
  const on = await G(() => !document.getElementById('rpBar').hidden);
  if (on) { await p.tap('#rpSkip'); await p.waitForTimeout(250); }
  const r3 = await G(() => ({ bar: document.getElementById('rpBar').hidden, eq: (() => { const g = __game; return JSON.stringify(g.S.owner) === JSON.stringify(g.E.replay() ? g.S.owner : g.S.owner); })() }));
  ok(on && (r3.bar || await G(() => document.getElementById('rpBar').classList.contains('end'))), '건너뛰기 → 바로 우리 턴');
  await p.tap('#cardOk').catch(() => {}); await p.waitForTimeout(200);
  // 화면 누르기: 첫 번째는 빠르게, 두 번째는 건너뛰기
  await setup(); await p.tap('#next'); await p.waitForTimeout(150);
  await p.mouse.click(200, 500); await p.waitForTimeout(100); const fast = await G(() => document.getElementById('rpBar').hidden === false);
  await p.mouse.click(200, 500); await p.waitForTimeout(250); const gone = await G(() => document.getElementById('rpBar').hidden || document.getElementById('rpBar').classList.contains('end'));
  ok(fast && gone, '화면 누르기: 빠르게 → 건너뛰기');
  await p.tap('#cardOk').catch(() => {}); await p.waitForTimeout(200);
  // 메뉴에서 끄기
  await p.tap('#menuBtn'); await p.waitForTimeout(200); await p.tap('#rpMode .chip[data-m="off"]'); await p.waitForTimeout(100);
  ok(await G(() => localStorage.getItem('dongjang-replay') === 'off'), '메뉴: 상대 턴 보기 끄기'); await p.tap('.x');
  await setup(); await p.tap('#next'); await p.waitForTimeout(150);
  ok(await G(() => document.getElementById('rpBlock').hidden && document.getElementById('rpLabel').textContent.indexOf('상대') < 0 || document.getElementById('rpBar').hidden), '끄면 재생 없이 바로');
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
