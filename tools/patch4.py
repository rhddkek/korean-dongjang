s=open('src/engine.js').read()
def R(a,b):
    global s
    assert a in s,a[:70]; s=s.replace(a,b)
R("""      v: 2, seed: seed | 0, month: 0,""","""      v: 2, seed: seed | 0, seed0: seed | 0, month: 0,""")
R("""      s.rank = r;
      s.promo = r;""","""      s.rank = r;
      s.promo = r;
      if (r === 1) s.stat.r1 = s.month;
      if (r === 2) { s.stat.r2 = s.month; if (s.stat.r1 === undefined) s.stat.r1 = s.month; }""")
R("""pushLog(s, J(s.f[fid].name, '과', '와') + ' 12개월 불가침 협정을 맺었습니다.');""","""pushLog(s, J(s.f[fid].name, '과', '와') + ' 12개월 불가침. 당분간 서로의 민원은 건드리지 않기로 했습니다.');""")
R("""pushLog(s, D.d[i].n + ' 주민들이 독립을 선언했습니다.', 'bad');""","""pushLog(s, '민심이 낮았던 ' + D.d[i].n + ' 주민들이 독립을 선언했습니다.', 'bad');""")
R("""    me.troops += me.away || 0; me.away = 0;   // 출동 인원은 AI 턴이 끝난 뒤 복귀""","""    me.troops += me.away || 0; me.away = 0;   // 출동 인원은 AI 턴이 끝난 뒤 복귀
    Object.keys(me.pact || {}).forEach(function (fid) { if (me.pact[fid] === s.month + 1 && s.f[fid].alive) pushLog(s, J(s.f[fid].name, '과', '와') + '의 협정이 다음 달 끝납니다.'); });""")
# 구 작전 예비 인원
R("""  function guAttackPreview(s, g) {
    var t = guTargets(s, g).sort(function (a, b) { return a.need - b.need; }), lim = guLimit(s), c = Math.min(lim, t.length), sum = 0, can = 0;
    for (var k = 0; k < c; k++) { sum += t[k].need; if (sum <= s.f[0].troops) can = k + 1; }
    return { count: t.length, limit: lim, n: c, need: sum, can: can };
  }""","""  function guAttackPreview(s, g, reserve) {
    var t = guTargets(s, g).sort(function (a, b) { return a.need - b.need; }), lim = guLimit(s), c = Math.min(lim, t.length), sum = 0, can = 0, usable = s.f[0].troops * (1 - (reserve || 0)), names = [];
    for (var k = 0; k < c; k++) { if (sum + t[k].need > usable) break; sum += t[k].need; can = k + 1; names.push(D.d[t[k].i].n); }
    return { count: t.length, limit: lim, n: c, need: sum, can: can, names: names, left: s.f[0].troops - sum, lack: (t[0] ? t[0].need : 0) };
  }""")
R("""  function guAttack(s, g) {""","""  function guAttack(s, g, reserve) {""")
R("""    var lim = guLimit(s), won = 0, fail = 0, home = 0, back = 0, collapsed = [];""","""    var lim = guLimit(s), won = 0, fail = 0, home = 0, back = 0, collapsed = [], keep = s.f[0].troops * (reserve || 0);""")
R("""      if (!t || t.need > s.f[0].troops) break;""","""      if (!t || t.need > s.f[0].troops - keep) break;""")
open('src/engine.js','w').write(s)

u=open('src/ui.js').read()
def U(a,b,cnt=1):
    global u
    assert u.count(a)>=1,a[:80]; u=u.replace(a,b)
# 공통
U("""  var lastSheetKey = '',""","""  var WIDE = window.matchMedia ? matchMedia('(min-width:900px),(orientation:landscape) and (min-width:560px)') : { matches: false };
  function isWide() { return WIDE.matches; }
  var lastAct = 0, recDong = null, guReserve = 0.25;
  function guard(fn) { return function () { var n = Date.now(); if (n - lastAct < 300) return; lastAct = n; fn.apply(this, arguments); }; }
  var lastSheetKey = '',""")
U("""  function save() { try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }""","""  function save() { try { if (S) localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  function backup() { try { var t = localStorage.getItem(SAVE_KEY); if (t) localStorage.setItem(SAVE_KEY + '-prev', t); } catch (e) {} }
  function bests() { try { return JSON.parse(localStorage.getItem('dongjang-best-v1')) || {}; } catch (e) { return {}; } }
  function saveBest(i, m) { try { var b = bests(); if (!b[i] || m < b[i]) { b[i] = m; localStorage.setItem('dongjang-best-v1', JSON.stringify(b)); } } catch (e) {} }""")
U("""  function loadSave() { try { var t = localStorage.getItem(SAVE_KEY); if (t) return E.migrate(JSON.parse(t)); } catch (e) {} return null; }""","""  function loadSave() {
    var keys = [SAVE_KEY, SAVE_KEY + '-prev'];
    for (var i = 0; i < keys.length; i++) { try { var t = localStorage.getItem(keys[i]); if (t) { var o = E.migrate(JSON.parse(t)); if (o) return o; } } catch (e) {} }
    return null;
  }""")
U("""  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }""","""  function clearSave() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '-prev'); } catch (e) {} }""")
# 레이아웃
U("""      if (W >= 900) { right = W - 400; }
      else bottom = $('bottom').getBoundingClientRect().top;""","""      if (isWide()) right = $('bottom').getBoundingClientRect().left;
      else bottom = $('bottom').getBoundingClientRect().top;""")
U("""      if (W >= 900) right = W - 400; else bottom = $('pick').getBoundingClientRect().top;""","""      if (isWide()) right = $('pick').getBoundingClientRect().left; else bottom = $('pick').getBoundingClientRect().top;""")
U("""if (sheetMode === 'none') { sh.hidden = true; if (W >= 900) idleColumn(); return; }""","""if (sheetMode === 'none') { sh.hidden = true; if (isWide()) idleColumn(); return; }""")
# 지도: 우리 영토 흰 테두리, 경로선, 추천 표시
U("""    c.strokeStyle = '#7DB2CF'; c.lineWidth = Math.max(70, 4.5 * px); c.stroke(riverPath);""","""    if (S && !lens) { c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2 * px; for (var mi = 0; mi < D.length; mi++) if (S.owner[mi] === 0) c.stroke(dongPath[mi]); }
    c.strokeStyle = '#7DB2CF'; c.lineWidth = Math.max(70, 4.5 * px); c.stroke(riverPath);""")
U("""    drawLabels(c, cur);
  }""","""    if (S && sel !== null && S.owner[sel] !== 0 && !lens) {
      var rt = E.route(S, 0, sel);
      if (rt) {
        c.strokeStyle = '#17231C'; c.lineWidth = 2.2 * px; c.setLineDash([6 * px, 5 * px]);
        c.beginPath(); c.moveTo(D[rt.src].x, D[rt.src].y); c.lineTo(D[sel].x, D[sel].y); c.stroke(); c.setLineDash([]);
      }
    }
    drawLabels(c, cur);
  }""")
U("""    if (!isFast()) for (var i = 0; i < LABEL_ORDER.length; i++) if (LABEL_ORDER[i] !== cur) put(LABEL_ORDER[i]);""","""    if (!isFast()) for (var i = 0; i < LABEL_ORDER.length; i++) if (LABEL_ORDER[i] !== cur) put(LABEL_ORDER[i]);
    if (S && !lens && S.stat.took === 0 && recDong !== null && sel === null) {
      var rx = D[recDong].x * cam.s + cam.x, ry = D[recDong].y * cam.s + cam.y + 12;
      c.font = '700 12px "IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
      c.fillStyle = '#D4321F'; c.fillRect(rx - 34, ry - 10, 68, 20);
      c.fillStyle = '#fff'; c.fillText('여기부터', rx, ry);
    }""")
U("""    reach = {};
    if (!S || S.over) return;""","""    reach = {}; recDong = null;
    if (!S || S.over) return;""")
U("""        reach[j] = 2;
      });
    });
  }""","""        reach[j] = 2;
      });
    });
    if (S.stat.took === 0) {
      var bestN = 1e9;
      Object.keys(reach).forEach(function (k) { if (reach[k] !== 1 || S.owner[k] !== -1) return; var n = E.needFor(S, +k, 0.8); if (n < bestN) { bestN = n; recDong = +k; } });
    }
  }""")
# 작은 동을 누르면 확대
U("""    if (i === null) { select(null); return; }
    select(i);""","""    if (i === null) { select(null); return; }
    select(i);
    var bw = Math.max(D[i].b[2] - D[i].b[0], D[i].b[3] - D[i].b[1]) * cam.s;
    if (bw < 30) requestAnimationFrame(function () { var r = viewRect(), ns = Math.min(fitS * 16, cam.s * (70 / Math.max(bw, 1))); tweenTo({ s: ns, x: r.x + r.w / 2 - D[i].x * ns, y: r.y + r.h / 2 - D[i].y * ns }); });""")
# 시작 화면: 무작위, 최고 기록
U("""    html += '<p class="why">점수와 유형은 통계로 계산한 게임용 값입니다. <button id="importBtn" class="linkish" type="button">저장 코드 불러오기</button></p>';""","""    html += '<p class="why">점수와 유형은 2023~2024년 통계로 계산한 게임용 값입니다. <button id="randBtn" class="linkish" type="button">아무 동이나 고르기</button> · <button id="importBtn" class="linkish" type="button">저장 코드 불러오기</button></p>';""")
U("""    bind('importBtn', importDialog);
""","""    bind('importBtn', importDialog);
    bind('randBtn', function () { choosePick(Math.floor(Math.random() * D.length)); });
""")
U("""</p></div></div><p class="why">' + reasonOf(pickSel) + '</p><div class="acts">""","""</p></div></div><p class="why">' + reasonOf(pickSel) + (bests()[pickSel] ? ' 이 동 최고 기록은 ' + bests()[pickSel] + '개월입니다.' : '') + '</p><div class="acts">""")
U("""  function beginGame(i) {
    clearSave();
    S = E.create(DATA, i, (Date.now() & 0x7fffffff));""","""  function beginGame(i, seed) {
    clearSave();
    S = E.create(DATA, i, seed !== undefined ? seed : (Date.now() & 0x7fffffff));""")
# 첫 안내 문구
U("""html += '<p class="tip">처음이면 승률 80%를 추천합니다. 돈이 넉넉하면 설득해도 됩니다.</p>';""","""html += '<p class="tip">공격은 인원을 쓰고 승패가 갈립니다. 설득은 돈으로 확실히 얻습니다. 처음이면 승률 80%를 추천합니다.</p>';""")
# 경로 설명
U("""    var src = D[r.src].n;
    if (r.via === 'land') return src + '에서 바로 진입';
    if (r.via === 'bridgeOk') return src + '에서 한강 건너기 (불이익 없음)';""","""    var src = D[r.src].n, pc = Math.round(r.mult * 100), tail = pc ? ' · 전력 ' + (pc > 0 ? '+' : '−') + Math.abs(pc) + '%' : '';
    if (r.via === 'land') return src + '에서 바로 진입' + tail;
    if (r.via === 'bridgeOk') return src + '에서 한강 건너기' + tail;""")
U("""    if (r.via === 'bridge') return src + '에서 한강 건너기 (전력 ' + (E.TYPES[D[r.src].type].bridge ? '−15%' : '−30%') + ', 교통 2단계면 해결)';""","""    if (r.via === 'bridge') return src + '에서 한강 건너기' + tail + ' (교통 2단계면 불이익 없음)';""")
U("""    return src + '에서 지하철 기습' + (E.TYPES[D[r.src].type].subway ? ' (역세권이라 불이익 없음)' : ' (전력 −20%)');""","""    return src + '에서 지하철 기습' + tail;""")
U("""' 근처 동을 먼저 차지하거나, 역이 있는 우리 동에서 4km 안이면 지하철로 칠 수 있습니다.</p>';""","""' 근처 동을 먼저 차지하세요.' + (o > 0 && S.f[o].cap === sel ? ' 본거지는 지하철로 칠 수 없습니다.' : ' 역이 있는 우리 동에서 4km 안이면 지하철로 칠 수 있습니다.') + '</p>';""")
U("""    bind('atk', doAttack);""","""    bind('atk', guard(doAttack));""")
U("""    bind('per', function () {
      var t = sel,""","""    bind('per', guard(function () {
      var t = sel,""")
U("""if (!S.won && !S.firstWinShown) { firstWinCard(D[t].n, before, 0, 0); save(); } }
    });""","""if (!S.won && !S.firstWinShown) { firstWinCard(D[t].n, before, 0, 0); save(); } }
    }));""")
U("""    bind('merge', function () { act(E.merge(S, o), true); });""","""    bind('merge', guard(function () { act(E.merge(S, o), true); }));""")
# 첫 점령 카드
U("""<div class="row"><span>월 세수</span><span>' + signed(e.tax - before.tax, money) + '</span></div>""","""<div class="row"><span>월 세수</span><span>' + signed(e.tax - before.tax, money) + '</span></div><div class="row"><span>월 동원</span><span>' + signed(e.draft - before.draft, people) + '</span></div>""")
# 개발 표시
U("""    var eff = ['세수 +' + one(fx[0].tax) + '억/월' + payback(), '공격 +7%, 2단계부터 한강 불이익 없음', '동원 +' + one(fx[2].draft) + '명/월', '방어 +35%, 민심 회복 빨라짐'];""","""    var nowTax = E.taxOf(S, sel, fm), nowDr = E.draftOf(S, sel);
    var eff = ['세수 ' + one(nowTax) + '억 → ' + one(nowTax + fx[0].tax) + '억' + payback(), '이 동에서 나가는 공격 +7%, 2단계부터 이 동의 한강 불이익 없음', '동원 +' + one(fx[2].draft) + '명/월', '이 동 방어 +35%, 민심 회복 +2/월'];""")
U("""    if (fm[d.g]) html += '<p class="why">' + GU[d.g].n""","""    html += '<p class="why">방어는 동 자체 방어에 대기 인원 일부가 더해진 값입니다.' + (S.min[sel] < 40 && !capt ? ' <b class="warn">민심이 40 아래면 독립할 수 있습니다.</b>' : '') + '</p>';
    if (fm[d.g]) html += '<p class="why">' + GU[d.g].n""")
# 구 작전
U("""<p>' + GU[g].r + ' · 재정자립도 ' + fin + '%</p>""","""<p>' + GU[g].r + ' · 재정자립도 ' + fin + '% (2023년 통계)</p>""")
U("""      var lim = E.guLimit(S), ap = E.guAttackPreview(S, g), pp = E.guPersuadePreview(S, g);""","""      var lim = E.guLimit(S), ap = E.guAttackPreview(S, g, guReserve), pp = E.guPersuadePreview(S, g);""")
U("""html += '<div class="sec">한꺼번에 공격</div><p class="why num">공격 가능한 ' + ap.count + '개 동 중 최대 ' + lim + '개. 각각 승률 80%만큼 나눠 보냅니다.' + (ap.n ? ' 약 ' + people(ap.need) + ' 필요.' : '') + '</p>""","""html += '<div class="sec">한꺼번에 공격</div><p class="why num">공격 가능한 ' + ap.count + '개 동 중 최대 ' + lim + '개를 약한 순서로, 각각 승률 80%만큼 보냅니다.</p><div class="chips">' + [[0, '남길 인원 없음'], [0.25, '25% 남기기'], [0.5, '50% 남기기']].map(function (x) { return '<button class="chip rs' + (guReserve === x[0] ? ' on' : '') + '" type="button" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="why num">' + (ap.can ? esc(ap.names.join(', ')) + ' · 약 ' + people(ap.need) + ' 출동, ' + people(ap.left) + ' 남음' : (ap.count ? '지금 남길 인원을 빼면 보낼 수 있는 동이 없습니다. 가장 약한 동에도 ' + people(ap.lack) + ' 필요합니다.' : '공격할 수 있는 동이 없습니다.')) + '</p>""")
U("""    bind('guAtk', function () {
      var mark = S.last.length, r = E.guAttack(S, g);""","""    Array.prototype.forEach.call(sh.querySelectorAll('.rs'), function (b) { b.addEventListener('click', function () { guReserve = +b.dataset.r; renderSheet(); }); });
    bind('guAtk', guard(function () {
      var mark = S.last.length, r = E.guAttack(S, g, guReserve);""")
U("""      stampWorld(GU[g].x, GU[g].y, r.won > 0, r.won > 0 ? r.won + '개 접수' : '실패');
      save(); sync();
    });""","""      stampWorld(GU[g].x, GU[g].y, r.won > 0, r.won > 0 ? r.won + '개 접수' : '실패');
      save(); sync();
    }));""")
U("""    bind('guPer', function () { var r = E.guPersuade(S, g); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; setNews(S.log[0].t); save(); sync(); });""","""    bind('guPer', guard(function () { var r = E.guPersuade(S, g); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; setNews(S.log[0].t); save(); sync(); }));""")
# 용어
U("""    html += '<div class="sec">월 수지</div><div class="rows num"><div class="row"><span>세수' + (e.aidTax""","""    html += '<p class="why">대기: 지금 공격과 방어에 쓸 수 있는 인원. 출동: 다음 달 복귀. 귀가: 이번 판에서 빠진 인원.</p>';
    html += '<div class="sec">월 수지</div><div class="rows num"><div class="row"><span>세수' + (e.aidTax""")
U("""        var v = b.dataset.m === 'all' ? me.money : +b.dataset.m;
        E.recruit(S, v); save(); sync();""","""        var v = b.dataset.m === 'all' ? me.money : +b.dataset.m, r = E.recruit(S, v);
        if (r.ok) setNews('일당 지급 완료. +' + people(r.n));
        save(); sync();""")
# 메뉴
U("""<li>세력의 본거지(검은 점)를 빼앗으면 그 세력은 무너지고 동의 절반이 따라옵니다.</li>""","""<li>세력의 본거지(검은 점)를 빼앗으면 그 세력은 무너지고 동 일부가 따라옵니다. 큰 세력일수록 본거지가 단단하고, 본거지는 지하철로 칠 수 없습니다.</li><li>새로 얻은 동은 그달 말부터 수입에 들어오지만, 민심이 회복될 때까지는 적게 들어옵니다.</li>""")
# 다음 달
U("""  $('next').addEventListener('click', function () {
    if (!S || S.over) return;""","""  $('next').addEventListener('click', guard(function () {
    if (!S || S.over) return;
    backup();""")
U("""    errMsg = '';
    save();
    sync();
  });
  $('evBar').addEventListener""","""    errMsg = '';
    save();
    sync();
  }));
  $('evBar').addEventListener""")
U("""    $('lens').textContent = '지도: ' + LENS[lens];""","""    $('lens').textContent = '지도: ' + LENS[lens];
    $('next').className = S.ap <= 0 ? 'go' : '';
    var mb = $('mapBtns'), vr = viewRect(); mb.hidden = false; mb.style.top = (vr.y + 8) + 'px'; mb.style.right = (W - vr.x - vr.w + 8) + 'px';""")
U("""  $('lens').addEventListener('click',""","""  $('toCap').addEventListener('click', function () { if (!S) return; var d = D[S.f[0].cap]; var r = viewRect(), ns = Math.max(cam.s, fitS * 3.2); tweenTo({ s: ns, x: r.x + r.w / 2 - d.x * ns, y: r.y + r.h / 2 - d.y * ns }); });
  $('toAll').addEventListener('click', function () { fitAll(true); });
  $('lens').addEventListener('click',""")
# 엔딩
U("""'<textarea id="shareText" readonly>' + esc(txt) + '</textarea><div class="acts"><button class="btn" id="copy" type="button">문구 복사</button>' + (win ? '<button class="btn" id="cont" type="button">남은 동까지 마저 먹기</button>' : '') + '<button class="btn red" id="again" type="button">새 게임</button></div>');""","""'<div class="rows num" style="text-align:left;margin-top:6px"><div class="row"><span>구청장 / 권역장</span><span>' + (st.r1 !== undefined ? st.r1 + '개월' : '못 함') + ' / ' + (st.r2 !== undefined ? st.r2 + '개월' : '못 함') + '</span></div><div class="row"><span>공격으로 / 설득으로</span><span>' + Math.max(0, st.took - st.talked) + '개 / ' + st.talked + '개</span></div></div><textarea id="shareText" readonly>' + esc(txt) + '</textarea><div class="acts"><button class="btn" id="copy" type="button">문구 복사</button>' + (win ? '<button class="btn" id="cont" type="button">남은 동까지 마저 먹기</button>' : '') + '<button class="btn" id="retry" type="button">같은 조건으로 다시</button><button class="btn red" id="again" type="button">새 동으로 시작</button></div>');
    if (win) saveBest(S.start, S.month);
    bind('retry', function () { var st0 = S.start, sd = S.seed0; $('over').hidden = true; beginGame(st0, sd !== undefined ? sd : Date.now() & 0x7fffffff); });""")
U("""  function enterGame() {
    $('start').hidden = true; $('hud').hidden = false; $('bottom').hidden = false;""","""  function enterGame() {
    $('start').hidden = true; $('hud').hidden = false; $('bottom').hidden = false; $('over').hidden = true;""")
U("""    $('over').hidden = true; $('hud').hidden = true; $('bottom').hidden = true; $('start').hidden = false; $('legend').hidden = true;""","""    $('over').hidden = true; $('hud').hidden = true; $('bottom').hidden = true; $('start').hidden = false; $('legend').hidden = true; $('mapBtns').hidden = true;""")
U("""  window.addEventListener('resize', function () { resize(); if (!S) fitAll(false); });""","""  window.addEventListener('resize', function () { resize(); if (!S) fitAll(false); else requestAnimationFrame(sync); });""")
open('src/ui.js','w').write(u)

t=open('src/index.tpl.html').read()
def T(a,b):
    global t
    assert a in t,a[:70]; t=t.replace(a,b)
T("""  <div id="legend" hidden>""","""  <div id="mapBtns" hidden><button id="toCap" type="button">본거지</button><button id="toAll" type="button">서울 전체</button></div>
  <div id="legend" hidden>""")
T("""#next:active{transform:translateY(1px)}""","""#next:active{transform:translateY(1px)}
#next.go{background:var(--stamp)}
#mapBtns{position:absolute;z-index:4;display:flex;gap:6px}
#mapBtns button{background:var(--sheet);border:1px solid var(--ink);border-radius:3px;font-size:12.5px;min-height:34px;padding:0 9px}
.chip.on{border-color:var(--stamp);box-shadow:inset 0 0 0 1px var(--stamp)}""")
T("""  --display:"Black Han Sans",""","""  --col:min(400px,46vw);
  --display:"Black Han Sans",""")
T("""@media (min-width:900px){
  #bottom{left:auto;top:0;width:400px;""","""@media (min-width:900px),(orientation:landscape) and (min-width:560px){
  #bottom{left:auto;top:0;width:var(--col);""")
T("""  #hud{right:400px}""","""  #hud{right:var(--col)}""")
T("""  #pick{position:absolute;right:0;top:0;bottom:0;width:400px;""","""  #pick{position:absolute;right:0;top:0;bottom:0;width:var(--col);""")
T("""  #brand{max-width:calc(100% - 400px)}""","""  #brand{max-width:calc(100% - var(--col))}""")
open('src/index.tpl.html','w').write(t)

s=open('tools/test3.js').read()
a=" // 사건\n"; assert a in s
s=s.replace(a,""" // 연속 터치
 const tg2=await G(()=>{const g=__game,S=g.S;S.f[0].troops=2000;S.ap=2;for(const i of g.E.dongsOf(S,0))for(const j of g.D[i].a)if(S.owner[j]!==0)return j});
 await G(i=>__game.select(i),tg2);await p.waitForTimeout(150);
 await p.evaluate(()=>{const b=document.getElementById('atk');b.click();b.click();b.click()});await p.waitForTimeout(60);
 ok(await G(()=>__game.S.ap===1),'공격 연속 터치 1회만 처리');
 { const c0=await p.$('#over:not([hidden]) #cardOk'); if(c0)await c0.tap(); await p.waitForTimeout(900); }
 const mo=await G(()=>__game.S.month);await p.evaluate(()=>{const b=document.getElementById('next');b.click();b.click();b.click()});await p.waitForTimeout(40);
 ok(await G(m=>__game.S.month===m+1,mo),'다음 달 연속 터치 1회만 처리');await p.waitForTimeout(320);
"""+a)
a=" console.log('errors',errs);\n await b.close();srv.close();"; assert a in s
s=s.replace(a,""" // 가로 화면
 const c4=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2});const p4=await c4.newPage();await p4.goto('http://localhost:8124',{waitUntil:'load'});await p4.waitForTimeout(300);await p4.screenshot({path:OUT+'/60_land_start.png'});await p4.tap('#begin');await p4.waitForTimeout(350);await p4.screenshot({path:OUT+'/61_land_game.png'});
 ok(await p4.evaluate(()=>document.getElementById('bottom').getBoundingClientRect().left>300),'가로 화면 옆줄 배치');
 await p.evaluate(()=>0);
"""+a)
open('tools/test3.js','w').write(s)
