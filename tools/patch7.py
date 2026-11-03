u=open('src/ui.js').read()
def U(a,b):
    global u
    assert a in u,a[:80]; u=u.replace(a,b)
# 공통: 구 인접, 안개, 패턴
U("""  function fillOf(i) {
    if (lens) return ramp(D[i][LKEY[lens]]);""","""  // ---- 안개: 우리 땅과 맞닿은 구까지만 보인다 ----
  var GU_ADJ = GU.map(function () { return {}; });
  D.forEach(function (d) { d.a.forEach(function (j) { if (D[j].g !== d.g) { GU_ADJ[d.g][D[j].g] = 1; } }); });
  function updateFog() {
    if (!S) return [];
    if (!S.seenGu || S.seenGu.length !== GU.length) S.seenGu = GU.map(function () { return 0; });
    var fresh = [];
    function see(g) { if (!S.seenGu[g]) { S.seenGu[g] = 1; fresh.push(g); } }
    E.dongsOf(S, 0).forEach(function (i) {
      see(D[i].g);
      D[i].a.forEach(function (j) { see(D[j].g); });
      E.subwayOf(i, S).forEach(function (j) { see(D[j].g); });
    });
    return S.month === 0 && S.stat.took === 0 && fresh.length === S.seenGu.filter(Boolean).length ? [] : fresh;
  }
  function fogged(i) { return !!(S && !lens && S.seenGu && !S.seenGu[D[i].g] && !S.won); }
  function revealNews(gs) {
    if (!gs.length) return '';
    return gs.map(function (g) {
      var cnt = {};
      E.guDongs()[g].forEach(function (i) { var o = S.owner[i]; if (o > 0) cnt[o] = (cnt[o] || 0) + 1; });
      var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
      return GU[g].n + '가 보입니다' + (top ? '. ' + S.f[top].name + '이 ' + cnt[top] + '개 동을 쥐고 있습니다.' : '. 아직 주인 없는 동네가 많습니다.');
    }).join(' ');
  }
  function mkPattern(draw, size) {
    var k = document.createElement('canvas'); k.width = k.height = size; var g = k.getContext('2d'); draw(g, size);
    return ctx.createPattern(k, 'repeat');
  }
  var FOG_PAT = mkPattern(function (g, n) { g.fillStyle = '#C3CBC1'; g.fillRect(0, 0, n, n); g.strokeStyle = 'rgba(23,35,28,.13)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, n + 2); g.lineTo(n + 2, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(n - 2, n + 2); g.lineTo(n + 2, n - 2); g.stroke(); }, 10);
  var MT_PAT = mkPattern(function (g, n) { g.strokeStyle = 'rgba(30,70,45,.28)'; g.lineWidth = 1.3; g.lineJoin = 'round'; [[5, 9], [17, 21]].forEach(function (p) { g.beginPath(); g.moveTo(p[0] - 4, p[1] + 2); g.lineTo(p[0], p[1] - 3); g.lineTo(p[0] + 4, p[1] + 2); g.stroke(); }); }, 24);
  // 산을 낀 동 (지형을 감안해 고름, 대략적인 표시)
  var MOUNT = {};
  ['진관동', '평창동', '우이동', '도봉1동', '정릉4동', '상계1동', '상계3·4동', '공릉2동', '대학동', '남현동', '내곡동', '양재2동', '부암동', '삼청동'].forEach(function (n) { D.forEach(function (d, i) { if (d.n === n) MOUNT[i] = 1; }); });
  var DEV_COL = ['#E2A11F', '#2F6DB5', '#2F9B78', '#47524A'];
  function fillOf(i) {
    if (lens) return ramp(D[i][LKEY[lens]]);
    if (fogged(i)) return FOG_PAT;""")
# 그리기: 산, 강물결, 치안 테두리, 본거지 안개
U("""    for (var i = 0; i < D.length; i++) { c.fillStyle = fillOf(i); c.fill(dongPath[i]); }""","""    var unscale = new DOMMatrix().scale(1 / cam.s);
    FOG_PAT.setTransform(unscale); MT_PAT.setTransform(unscale);
    for (var i = 0; i < D.length; i++) { c.fillStyle = fillOf(i); c.fill(dongPath[i]); }
    if (!lens) { c.fillStyle = MT_PAT; Object.keys(MOUNT).forEach(function (k) { if (!fogged(+k)) c.fill(dongPath[k]); }); }""")
U("""    if (S && !lens) { c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2 * px; for (var mi = 0; mi < D.length; mi++) if (S.owner[mi] === 0) c.stroke(dongPath[mi]); }
    c.strokeStyle = '#7DB2CF'; c.lineWidth = Math.max(70, 4.5 * px); c.stroke(riverPath);""","""    if (S && !lens) { c.strokeStyle = 'rgba(255,255,255,.85)'; for (var mi = 0; mi < D.length; mi++) if (S.owner[mi] === 0) { var sl = E.lv(S, mi, 3); c.lineWidth = (sl >= 3 ? 1.2 + sl * 0.5 : 1.2) * px; c.stroke(dongPath[mi]); } }
    c.strokeStyle = '#7DB2CF'; c.lineWidth = Math.max(70, 4.5 * px); c.stroke(riverPath);
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = Math.max(10, 1.2 * px); c.setLineDash([Math.max(60, 8 * px), Math.max(110, 14 * px)]); c.stroke(riverPath); c.setLineDash([]);""")
U("""      S.f.forEach(function (f) {
        if (!f.alive) return;""","""      S.f.forEach(function (f) {
        if (!f.alive || fogged(f.cap)) return;""")
# 라벨: 안개 동 숨김, 개발 표시
U("""    function put(i) {
      var d = D[i];""","""    function put(i) {
      if (fogged(i) && i !== cur) return;
      var d = D[i];""")
U("""    if (S && !lens && S.stat.took === 0 && recDong !== null && sel === null) {""","""    if (S && !lens && zoom >= 2.2 && !isFast()) {
      E.dongsOf(S, 0).forEach(function (i) {
        var lvls = [0, 1, 2, 3].map(function (t) { return E.lv(S, i, t); });
        if (!lvls.some(Boolean)) return;
        var sx = D[i].x * cam.s + cam.x, sy = D[i].y * cam.s + cam.y + 9;
        if (sx < -30 || sx > W + 30 || sy < -20 || sy > H + 20) return;
        var shown = lvls.map(function (l, t) { return { l: l, t: t }; }).filter(function (o) { return o.l > 0; });
        var x0 = sx - (shown.length - 1) * 6;
        shown.forEach(function (o, k) {
          var r = 2.6 + o.l * 0.75, x = x0 + k * 12;
          c.beginPath(); c.arc(x, sy, r + 1.3, 0, 7); c.fillStyle = '#fff'; c.fill();
          c.beginPath(); c.arc(x, sy, r, 0, 7); c.fillStyle = DEV_COL[o.t]; c.fill();
          if (o.l >= 5) { c.beginPath(); c.arc(x, sy, r + 2.6, 0, 7); c.strokeStyle = DEV_COL[o.t]; c.lineWidth = 1.2; c.stroke(); }
        });
      });
    }
    if (S && !lens && S.stat.took === 0 && recDong !== null && sel === null) {""")
# 안개 동 시트
U("""  function enemySheet(sh) {
    var d = D[sel], o = S.owner[sel], me = S.f[0];""","""  function enemySheet(sh) {
    var d = D[sel], o = S.owner[sel], me = S.f[0];
    if (fogged(sel)) {
      sh.innerHTML = headHTML(d, GU[d.g].n + ' · 안개 속') + '<p class="prose">아직 소식이 들어오지 않은 동네입니다. 누가 쥐고 있는지 모릅니다. ' + GU[d.g].n + '와 맞닿은 동을 차지하면 구 전체가 보입니다.</p>' + typeHTML(d) + gaugeHTML(d) + factsHTML(d);
      return;
    }""")
# 개발 행 색 점
U("""html += '<div class="dev"><h4>' + t + '<em>'""","""html += '<div class="dev"><h4><i class="dd" style="background:' + DEV_COL[k] + '"></i>' + t + '<em>'""")
# 세력 순위: 안개 속 세력
U("""      return '<div class="row"><span><span class="dot" style="background:' + fCol(f.id) + '"></span>' + esc(f.id === 0 ? '우리' : f.name)""","""      var hid = f.id !== 0 && S.seenGu && !S.seenGu[D[f.cap].g];
      return '<div class="row"><span><span class="dot" style="background:' + (hid ? '#C3CBC1' : fCol(f.id)) + '"></span>' + esc(f.id === 0 ? '우리' : hid ? '안개 속 어느 세력' : f.name)""")
# sync에서 안개 갱신 + 소식
U("""  function sync() {
    computeReach();""","""  function sync() {
    var fresh = updateFog();
    if (fresh.length) { var rn = revealNews(fresh); S.log.unshift({ m: S.month, t: rn, k: 'n' }); var nw = $('news'); nw.textContent = (nw.textContent ? nw.textContent + ' ' : '') + rn; }
    computeReach();""")
# 메뉴
U("""<li>시작한 동의 유형에 따라""","""<li>처음에는 우리 구와 맞닿은 구만 보입니다. 땅을 넓히면 안개가 걷힙니다. 동네 통계는 안개 속에서도 볼 수 있습니다.</li><li>지도의 작은 색 점은 우리 동의 개발 단계입니다. 노랑 상권, 파랑 교통, 초록 주거, 회색 치안. 산 무늬는 산을 낀 동네를 대략 표시한 것입니다.</li><li>시작한 동의 유형에 따라""")
open('src/ui.js','w').write(u)
t=open('src/index.tpl.html').read()
a=".dev h4{margin:0;font-size:15px;font-weight:700}"; assert a in t
t=t.replace(a,a+"\n.dd{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;vertical-align:1px}")
open('src/index.tpl.html','w').write(t)
