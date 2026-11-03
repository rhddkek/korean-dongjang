u=open('src/ui.js').read()
def U(a,b):
    global u
    assert a in u,a[:80]; u=u.replace(a,b)
# 시설 이름 개발 행
U("""    E.C.TRACKS.forEach(function (t, k) {
      var l = E.lv(S, sel, k), c = E.devCost(S, sel, k);
      html += '<div class="dev"><h4><i class="dd" style="background:' + DEV_COL[k] + '"></i>' + t + '<em>' + '●'.repeat(l) + '○'.repeat(5 - l) + '</em></h4><p>' + eff[k] + '</p><button class="btn" data-k="' + k + '" type="button"' + (c !== null && me.money >= c ? '' : ' disabled') + '>' + (c === null ? '최고 단계' : '올리기 ' + money(c)) + '</button></div>';
    });""","""    E.C.TRACKS.forEach(function (t, k) {
      var l = E.lv(S, sel, k), c = E.devCost(S, sel, k), sp = E.FAC_SP[k];
      var now = l ? E.facName(S, sel, k, l) : '없음', next = l < 5 ? E.facName(S, sel, k, l + 1) : null;
      var spLine = Object.keys(sp).map(function (lv) { return '<span class="' + (l >= +lv ? 'spOn' : 'spOff') + '">' + lv + '단계 ' + sp[lv] + '</span>'; }).join(' · ');
      html += '<div class="dev"><h4><i class="dd" style="background:' + DEV_COL[k] + '"></i>' + t + ' · ' + esc(now) + '<em>' + '●'.repeat(l) + '○'.repeat(5 - l) + '</em></h4><p>' + eff[k] + '<br>' + spLine + '</p><button class="btn" data-k="' + k + '" type="button"' + (c !== null && me.money >= c ? '' : ' disabled') + '>' + (c === null ? '최고 단계' : esc(next) + '<br>' + money(c)) + '</button></div>';
    });""")
U("""    Array.prototype.forEach.call(sh.querySelectorAll('.dev button'), function (b) {
      b.addEventListener('click', function () { var r = E.develop(S, sel, +b.dataset.k); if (r.err) { errMsg = r.err; } else errMsg = ''; save(); sync(); });""","""    Array.prototype.forEach.call(sh.querySelectorAll('.dev button'), function (b) {
      b.addEventListener('click', function () { var k = +b.dataset.k, r = E.develop(S, sel, k); if (r.err) { errMsg = r.err; } else { errMsg = ''; var l = E.lv(S, sel, k); setNews(D[sel].n + ' ' + E.facName(S, sel, k, l) + (l === 1 ? ' 창설.' : ' 완공.') + (E.FAC_SP[k][l] ? ' ' + E.FAC_SP[k][l] + '.' : '')); if (E.FAC_SP[k][l]) stampAt(sel, true, l === 5 ? '완공' : '창설'); } save(); sync(); });""")
U("""  function stampAt(i, win) { stampWorld(D[i].x, D[i].y, win, win ? '접수' : '실패'); }""","""  function stampAt(i, win, txt) { stampWorld(D[i].x, D[i].y, win, txt || (win ? '접수' : '실패')); }""")
# 구 작전: 결재·설득 대상
U("""(S.ap >= E.guCost(S) && ap.can >= 1 ? '' : ' disabled') + '>' + GU[g].n + ' 작전 · 결재 ' + E.guCost(S) + '건</button></div>';""","""(S.ap >= ap.ap && ap.can >= 1 ? '' : ' disabled') + '>' + GU[g].n + ' 작전 · 결재 ' + ap.ap + '건</button></div>';""")
U("""(pp.n ? pp.n + '곳 설득 · ' + money(pp.cost) + ' · 결재 1건' : (pp.count ? '예산이 모자랍니다' : '설득할 독립 동이 없습니다')) + '</button></div>';""","""(pp.n ? pp.n + '곳 설득 · ' + money(pp.cost) + ' · 결재 1건' : (pp.count ? '예산이 모자랍니다' : '설득할 독립 동이 없습니다')) + '</button></div>' + (pp.n ? '<p class="why">' + esc(pp.names.join(', ')) + '</p>' : '');""")
# 민심 효과를 세수로 환산
U("""  function fxText(a) {
    var p = [];""","""  function moodTax(dm, list) {
    if (!dm) return 0;
    list = list || E.dongsOf(S, 0);
    var b = E.economy(S, 0).tax, keep = list.map(function (i) { return S.min[i]; });
    list.forEach(function (i) { S.min[i] = Math.max(5, Math.min(100, S.min[i] + dm)); });
    var a = E.economy(S, 0).tax;
    list.forEach(function (i, k) { S.min[i] = keep[k]; });
    return a - b;
  }
  function fxText(a) {
    var p = [];""")
U("""    if (a.mood) p.push('민심 ' + (a.mood > 0 ? '+' : '−') + Math.abs(a.mood));""","""    if (a.mood) { var mt = moodTax(a.mood); p.push('민심 ' + (a.mood > 0 ? '+' : '−') + Math.abs(a.mood) + ' (우리 동 ' + E.dongsOf(S, 0).length + '곳, 세수 ' + signed(Math.round(mt * 10) / 10, function (v) { return v + '억'; }) + '/월)'); }""")
# 화합 사업 효과 표시
U("""  function realmSheet(sh) {""","""  function unityDetail(g) {
    var mine = E.guDongs()[g].filter(function (i) { return S.owner[i] === 0; });
    var low = mine.filter(function (i) { return S.min[i] < 40; }).length;
    var gain = 0, keep = mine.map(function (i) { return S.min[i]; }), b = E.economy(S, 0).net;
    mine.forEach(function (i) { S.min[i] = 100; }); gain = E.economy(S, 0).net - b; mine.forEach(function (i, k) { S.min[i] = keep[k]; });
    return '우리 동 ' + mine.length + '곳 · 독립 위험(민심 40 미만) ' + low + '곳 → 0곳 · 월 순수입 ' + money(b) + ' → ' + money(b + gain);
  }
  function realmSheet(sh) {""")
U("""<p class="why">화합: 그 구의 우리 동 민심 100, 6개월간 독립 없음. 급행: 역이 있는 우리 동의 기습 거리 5.5km로 영구 확대.' + (ui2.why ? ' ' + esc(ui2.why) : '') + '</p>';""","""<p class="why num">화합(' + GU[ug].n + '): ' + unityDetail(ug) + '. 6개월간 독립 없음.<br>광역 급행: 역이 있는 우리 동의 기습 거리 4km → 5.5km 영구 확대. 지금 기습 가능한 동 ' + E.raidTargets(S) + '곳.' + (ui2.why ? ' ' + esc(ui2.why) : '') + '</p>';""")
U("""        html += '<div class="sec">구민 화합 사업</div>""","""        html += '<div class="sec">구민 화합 사업</div><p class="why num">' + unityDetail(g) + '</p>""")
# 급행 원정: 사용 전 대상 수
U("""    if (S.abil === 'station') { var ei = E.expressInfo(S); html += '""","""    if (S.abil === 'station') { var ei = E.expressInfo(S); html += '<p class="why num">지금 지하철로 칠 수 있는 동 ' + E.raidTargets(S) + '곳. 켜면 이 동들을 같은 인원으로 연달아 칠 수 있습니다.</p>""")
# 공격 소식: 붕괴 0개 생략
U("""(res.collapse ? ' ' + res.collapse.name + ' 붕괴, ' + res.collapse.joined + '개 동 합류.' : '')""","""(res.collapse ? ' ' + E.collapseText(res.collapse) : '') + (res.quick ? ' 급행으로 바로 복귀.' : '')""")
# 숙적 해체·구 완성 연출
U("""    stampAt(t, res.win);
    if (res.win && !S.won) firstWinCard(D[t].n, before, res.lost, res.back);""","""    if (res.collapse && S.stat.rivalDown === res.collapse.name && !S.rivalShown) {
      S.rivalShown = res.collapse.name;
      stampAt(t, true, '숙적 해체');
      setNews(res.collapse.name + ' 회장이 마지막 회의를 열었습니다. 안건은 해산입니다.');
    } else stampAt(t, res.win);
    if (res.win && !S.won) firstWinCard(D[t].n, before, res.lost, res.back);""")
U("""  function sync() {
    var fresh = updateFog();""","""  function checkFullGu() {
    if (!S.fullSeen) { S.fullSeen = GU.map(function (g, i) { return E.fullGu(S, 0, i) ? 1 : 0; }); return; }
    GU.forEach(function (g, i) {
      var full = E.fullGu(S, 0, i);
      if (full && !S.fullSeen[i]) {
        S.fullSeen[i] = 1;
        stampWorld(g.x, g.y, true, g.n + ' 완성');
        var msg = g.n + '를 통째로 장악했습니다. 이 구 세수 +' + g.f + '%.';
        S.log.unshift({ m: S.month, t: msg, k: 'good' });
        $('news').textContent = msg + ' ' + $('news').textContent; $('news').className = '';
      }
      if (!full && S.fullSeen[i]) S.fullSeen[i] = 0;
    });
  }
  function sync() {
    checkFullGu();
    var fresh = updateFog();""")
# 메뉴
U("""<li>지도의 작은 색 점은""","""<li>개발은 단계마다 이름 붙은 시설이 생깁니다. 3단계·5단계 시설은 옆 우리 동까지 효과가 미칩니다. 예: 자치경찰대(치안 3단계)는 옆 우리 동 방어 +15%, 자치소방서(치안 5단계)는 그 일대 독립을 막습니다.</li><li>크게 지고 나면 숙적과 싸움 좋아하는 세력이 그 틈을 노립니다.</li><li>지도의 작은 색 점은""")
open('src/ui.js','w').write(u)
t=open('src/index.tpl.html').read()
a=".dd{"; assert a in t
t=t.replace(a,".spOn{color:var(--good);font-weight:500}\n.spOff{color:#9AA39B}\n.dev button{line-height:1.25;font-size:13.5px}\n.dd{")
open('src/index.tpl.html','w').write(t)
