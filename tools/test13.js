// 적 침공 알림: 결과 카드, 지도 표식, 소식 줄 우선순위, 소식 눌러 이동
const { chromium, devices } = require('playwright'); const http = require('http'), fs = require('fs');
const OUT = process.argv[2] || '.';
const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}[hidden]{display:none!important}img{max-width:100%}</style></head><body>' + fs.readFileSync('dongjang.html', 'utf8') + '</body></html>';
const srv = http.createServer((q, r) => { r.setHeader('content-type', 'text/html;charset=utf-8'); r.end(html); }).listen(8135);
const ok = (c, m) => console.log((c ? 'PASS ' : 'FAIL ') + m);
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['iPhone 13'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const G = (f, ...a) => p.evaluate(f, ...a);
  await p.goto('http://localhost:8135', { waitUntil: 'load' }); await p.waitForTimeout(400);
  await p.fill('#q', '소공'); await p.waitForTimeout(80); await p.tap('#results button'); await p.waitForTimeout(150); await p.tap('#begin'); await p.waitForTimeout(400);
  // 명동·필동을 우리 땅으로, 명동 옆에 강한 세력, 필동에는 숙적 집결 예고
  const set = await G(() => {
    const g = __game, S = g.S, E = g.E, D = g.D, id = n => D.findIndex(d => d.n === n);
    const my = id('명동'), pil = id('필동'); S.owner[my] = 0; S.owner[pil] = 0; S.month = 15; S.seenFoe = 1;
    // 명동과 맞닿은 동 하나를 강한 AI 땅으로
    const f = S.f.find(x => x.ai && x.alive); const nb = D[my].a.find(j => j !== S.f[0].cap && j !== pil);
    S.owner[nb] = f.id; f.troops = 60000; f.money = 0; f.lostAt = -9; S.f[0].pact = {};
    S.f[0].troops = 0; S.f[0].away = 0; S.min[my] = 30;
    // 숙적 예고는 다른 세력이 필동을
    S.rival = f.id; const rt = E.route(S, f.id, my) || { mult: 0, src: nb };
    S.rivalPlan = { t: my, f: f.id, n: 50000, mult: rt.mult, src: rt.src };
    return { my, pil, f: f.name, fid: f.id, nb: D[nb].n };
  });
  // 확실히 명동으로 오게: 그 세력의 다른 후보를 없앰 → 명동만 맞닿게
  await G(s => { const g = __game, S = g.S, D = g.D; const f = S.f[s.fid]; g.E.dongsOf(S, f.id).forEach(i => { if (D[i].a.indexOf(s.my) < 0) S.owner[i] = -1; }); f.cap = g.E.dongsOf(S, f.id)[0]; }, set);
  await p.tap('#next'); await p.waitForTimeout(600);
  const st = await G(s => ({ lost: __game.S.owner[s.my] !== 0, over: !document.getElementById('over').hidden, card: document.getElementById('card').textContent, news: document.getElementById('news').textContent }), set);
  ok(st.lost, '명동 함락 재현 (' + set.f + ')');
  ok(st.over && /명동/.test(st.card) && /빼앗겼습니다/.test(st.card) && /→/.test(st.card), '전투 결과 카드: ' + st.card.replace(/\s+/g, ' ').slice(0, 120));
  ok(/명동/.test(st.news) && /빼앗겼습니다/.test(st.news), '소식 줄이 함락을 먼저: ' + st.news.slice(0, 80));
  await p.screenshot({ path: OUT + '/e1_card.png' });
  // 카드의 보기 → 명동으로 이동, 정보 열림
  await p.tap('#card [data-go]'); await p.waitForTimeout(700);
  const go = await G(s => { const g = __game, c = g.cam(), d = g.D[s.my]; return { sel: document.querySelector('#sheet h2') && document.querySelector('#sheet h2').textContent, sx: d.x * c.s + c.x, sy: d.y * c.s + c.y, w: innerWidth }; }, set);
  ok(/명동/.test(go.sel || ''), '보기 → 명동 정보 열림');
  ok(go.sx > 0 && go.sx < go.w, '지도가 명동으로 이동');
  // 지도 표식이 이번 달 유지
  const mk = await G(() => (__game.S.marks || {}).list); ok(mk && mk.some(x => x.k === 'lost'), '함락 표식 기록');
  await p.screenshot({ path: OUT + '/e2_mark.png' });
  // 소식 목록에서 함락 줄 누르면 이동
  await p.tap('.x'); await G(() => __game.select(null)); await p.tap('#news'); await p.waitForTimeout(300);
  const li = await p.$('li[data-at]:has-text("빼앗겼")'); ok(!!li, '함락 소식에 보기 링크'); if (li) { await li.tap(); await p.waitForTimeout(500); ok(/명동/.test(await p.textContent('#sheet h2')), '함락 소식 눌러 명동 열기: ' + await p.textContent('#sheet h2')); }
  await p.screenshot({ path: OUT + '/e3_log.png' });
  // 방어 성공: 엔진이 낸 전투 기록을 UI가 카드·표식·소식으로 보여 주는지 (전투 결과 하나를 끼워 넣음)
  await p.tap('.x').catch(() => {}); await G(() => __game.select(null));
  const hd = await G(() => {
    const g = __game, S = g.S, E = g.E; S.rank = 0; S.rivalPlan = null;
    const mine = E.dongsOf(S, 0); const t = mine.find(i => i !== S.f[0].cap) ?? mine[0]; const f = S.f.find(x => x.ai && x.alive);
    const orig = E.endTurn; E.endTurn = function (s) { const r = orig.apply(this, arguments); s.rivalPlan = null; s.battles = [{ t, f: f.id, held: true, mine: 40, theirs: 900, cap: false, fac: '' }]; E.endTurn = orig; return r.filter(l => !/모이고/.test(l.t)); };
    return { t, n: g.D[t].n, f: f.name };
  });
  await p.tap('#next'); await p.waitForTimeout(600);
  const h2 = await G(() => ({ marks: (__game.S.marks || {}).list, news: document.getElementById('news').textContent, card: document.getElementById('over').hidden ? '' : document.getElementById('card').textContent }));
  ok(h2.marks && h2.marks.some(x => x.k === 'held' && x.t === hd.t), '방어 성공 표식 기록');
  ok(new RegExp(hd.n + ' 방어 성공').test(h2.card), '동장 때는 방어 성공 카드: ' + h2.card.replace(/\s+/g, ' ').slice(0, 90));
  await p.screenshot({ path: OUT + '/e4_held.png' });
  await p.tap('#cardOk').catch(() => {}); await p.waitForTimeout(300);
  ok(new RegExp(hd.n + ' 방어 성공').test(h2.news), '소식 줄 방어 성공: ' + h2.news.slice(0, 70));
  await p.screenshot({ path: OUT + '/e5_heldmap.png' });
  console.log('errors', errs); await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
