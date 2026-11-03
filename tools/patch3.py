s=open('src/engine.js').read()
def R(a,b):
    global s
    assert a in s,a[:70]; s=s.replace(a,b)
R("lv(s, i, 0) * 5 * (T.devx || 1)","lv(s, i, 0) * 7 * (T.devx || 1)")
R("lv(s, i, 2) * 4 * (T.devx || 1)","lv(s, i, 2) * 6 * (T.devx || 1)")
R("""  function devCost(s, i, t) {""","""  // 한 단계 올렸을 때 지금 조건에서 실제로 늘어나는 양
  function devEffect(s, i, t) {
    var list = dongsOf(s, 0), fm = fullMapOf(s, 0, list), k = i * 4 + t;
    var t0 = taxOf(s, i, fm), d0 = draftOf(s, i);
    s.dev[k]++;
    var t1 = taxOf(s, i, fm), d1 = draftOf(s, i);
    s.dev[k]--;
    return { tax: t1 - t0, draft: (d1 - d0) * drafted(list.length) };
  }
  function devCost(s, i, t) {""")
R("""    s.stat.sent += n; s.stat.home += r.lost;
    r.back = n - r.lost;""","""    s.stat.sent += n; s.stat.home += r.lost;
    if (!s.stat.worst || r.lost > s.stat.worst.n) s.stat.worst = { n: r.lost, name: d.n };
    r.back = n - r.lost;""")
R("""      pushLog(s, C.RANKS[r] + '에 올랐습니다.', 'rank');""","""      pushLog(s, C.RANKS[r] + '에 올랐습니다.', 'rank');
      if (s.rival >= 0 && s.f[s.rival].alive) pushLog(s, s.f[s.rival].name + ': ' + (r === 1 ? '벌써 구청장이라고요? 우리 회장님이 가만 안 있습니다.' : '권역장이요? 우리 단톡방에서는 아직 동장님입니다.'), 'riv');""")
R("eventView: eventView,","devEffect: devEffect, eventView: eventView,")
open('src/engine.js','w').write(s)
u=open('src/ui.js').read()
def U(a,b):
    global u
    assert a in u,a[:70]; u=u.replace(a,b)
# 시작 추천
U("""[['중구', '소공동', '오피스', '돈은 많고 사람은 적음'], ['은평구', '진관동', '대단지', '사람은 많고 돈은 보통'], ['마포구', '서교동', '번화가', '돈도 사람도 제법'], ['강동구', '둔촌1동', '최약체', '통계상 주민 16명']]""","""[['마포구', '서교동', '번화가', '처음이면 추천'], ['중구', '소공동', '오피스', '돈으로 밀어붙이기'], ['은평구', '진관동', '대단지', '사람으로 밀어붙이기'], ['강동구', '둔촌1동', '최약체', '통계상 주민 16명']]""")
U("""'<small>' + p[3] + '</small></button>';""","""'<small>' + difficulty(i) + ' · ' + p[3] + '</small></button>';""")
U("""  function gaugeHTML(d) {""","""  function reasonOf(i) {
    var d = D[i], T = E.TYPES[d.type], tax = d.tax * (T.tax || 1), dr = d.draft * (T.draft || 1), r = difficulty(i);
    if (r === '어려움' && tax < 12) return '돈도 사람도 적어 초반이 어렵습니다. 지원금으로 버티며 한 동씩 키우세요.';
    if (tax > 30 && dr < 10) return '돈은 많지만 사람이 적습니다. 일당으로 인원을 모으거나 설득으로 넓히세요.';
    if (dr > 18 && tax < 25) return '사람이 많습니다. 공격으로 넓히기 좋습니다.';
    if (tax > 28) return '돈과 사람이 고르게 들어옵니다. 처음 하는 사람에게 좋습니다.';
    return '돈과 사람이 무난합니다. 옆 동네 사정을 보고 공격과 설득을 고르세요.';
  }
  function gaugeHTML(d) {""")
U("""</p></div></div>' + typeHTML(d) + gaugeHTML(d) + factsHTML(d) + '<div class="acts"><button class="btn red" id="begin\"""","""</p></div></div><p class="why">' + reasonOf(pickSel) + '</p>' + typeHTML(d) + gaugeHTML(d) + factsHTML(d) + '<div class="acts"><button class="btn red" id="begin\"""")
# 첫 안내
U("""setNews('빨간 테두리 동을 눌러 쳐들어가 보세요. 보낸 인원은 다음 달에 돌아옵니다.');""","""setNews('첫 목표: 옆 동네 차지하기. 분홍색으로 표시된 동을 누르세요.');""")
U("""      // 공격 가능한 동
""","""      // 공격 가능한 동
      if (S.stat.took === 0) { c.fillStyle = 'rgba(212,50,31,.16)'; Object.keys(reach).forEach(function (k) { if (reach[k] === 1) c.fill(dongPath[k]); }); }
""")
U("""      html += '<div class="acts"><button class="btn red" id="atk" type="button"' + (p.ok ? '' : ' disabled') + '>쳐들어가기 · 결재 1건</button></div>';""","""      if (S.stat.took === 0) html += '<p class="tip">처음이면 승률 80%를 추천합니다. 돈이 넉넉하면 설득해도 됩니다.</p>';
      html += '<div class="acts"><button class="btn red" id="atk" type="button"' + (p.ok ? '' : ' disabled') + '>쳐들어가기 · 결재 1건</button></div>';""")
U("""    tip.textContent = '빨간 실선은 바로 칠 수 있는 동, 빨간 점선은 지하철로 기습할 수 있는 동입니다. 우리 동을 누르면 개발합니다.';""","""    tip.textContent = S.stat.took === 0 ? '첫 목표: 옆 동네 차지하기. 지도에서 분홍색 동을 누르세요.' : '빨간 실선은 바로 칠 수 있는 동, 빨간 점선은 지하철로 기습할 수 있는 동입니다. 우리 동을 누르면 개발합니다.';""")
# 다음 목표
U("""    $('cPop').textContent = '인구 ' + (E.popShare(S, 0) * 100).toFixed(1) + '%';""","""    $('cPop').textContent = goalShort();""")
U("""  function sync() {""","""  function goalShort() {
    if (S.rank < 1) return '구청장 ' + E.guStatus(S, bestGu()).need + '개 더';
    if (S.rank < 2) return '권역장 ' + Math.max(0, 4 - E.guHeld(S, 0)) + '구 더';
    return '인구 ' + (E.popShare(S, 0) * 100).toFixed(1) + '%';
  }
  function goalLong() {
    if (S.rank < 1) { var g = bestGu(); return GU[g].n + '청장까지 ' + E.guStatus(S, g).need + '개 동'; }
    if (S.rank < 2) return '권역장까지 구 ' + Math.max(0, 4 - E.guHeld(S, 0)) + '곳';
    return '서울 인구 ' + (E.popShare(S, 0) * 100).toFixed(1) + '% / 60%';
  }
  function firstWinCard(name, before, lost, back) {
    if (S.firstWinShown) return;
    S.firstWinShown = 1;
    var e = E.economy(S, 0);
    showCard('<div class="seal">접수</div><h2>' + esc(name) + ' 접수</h2><div class="rows num" style="text-align:left;margin-top:10px"><div class="row"><span>우리 동</span><span>' + before.n + '개 → ' + e.n + '개</span></div><div class="row"><span>월 세수</span><span>' + signed(e.tax - before.tax, money) + '</span></div><div class="row"><span>집에 간 인원</span><span>' + people(lost) + '</span></div><div class="row"><span>다음 달 복귀</span><span>' + people(back) + '</span></div><div class="row"><span>다음 목표</span><span>' + esc(goalLong()) + '</span></div></div><p>새로 얻은 동은 민심이 낮아 세수가 적지만 달마다 회복합니다. 남은 결재를 쓰거나 다음 달로 넘어가세요.</p><div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
    bind('cardOk', hideCard);
  }
  function sync() {""")
# 공격 결과 문구
U("""    var t = sel, mark = S.last.length, res = E.attack(S, t, sendN);
    if (res.err) { errMsg = res.err; renderSheet(); return; }
    setNews(S.last.slice(mark).map(function (l) { return l.t; }).join(' '), !res.win);""","""    var t = sel, mark = S.last.length, before = E.economy(S, 0), res = E.attack(S, t, sendN);
    if (res.err) { errMsg = res.err; renderSheet(); return; }
    var after = E.economy(S, 0);
    setNews(S.last.slice(mark).map(function (l) { return l.t; }).join(' ') + (res.win ? ' 세수 ' + signed(after.tax - before.tax, money) + '/월. ' + goalLong() + '.' : ''), !res.win);""")
U("""    stampAt(t, res.win);
    save();
    sync();""","""    stampAt(t, res.win);
    if (res.win && !S.won) firstWinCard(D[t].n, before, res.lost, res.back);
    save();
    sync();""")
U("""    bind('per', function () { act(E.persuade(S, sel), true); });""","""    bind('per', function () {
      var t = sel, before = E.economy(S, 0), r = E.persuade(S, t);
      act(r, true);
      if (!r.err) { stampAt(t, true); if (!S.won && !S.firstWinShown) { firstWinCard(D[t].n, before, 0, 0); save(); } }
    });""")
# 방어 경고
U("""  function estHTML(p) {
    var left = Math.floor(S.f[0].troops) - sendN;
    return """,""" function defWarn(left) {
    if (S.month < E.C.GRACE - 1) return '';
    var capI = S.f[0].cap, pact = S.f[0].pact || {}, cur = E.defense(S, capI), base = cur.base, def = base + Math.min(Math.max(0, left) * 0.24, base * 3), worst = null;
    D[capI].a.forEach(function (j) { var o = S.owner[j]; if (o > 0 && !(pact[o] > S.month) && (!worst || S.f[o].troops > worst.troops)) worst = S.f[o]; });
    if (!worst || worst.troops * 0.8 < def * 1.25) return '';
    return '<br><b class="warn">본거지 옆 ' + esc(worst.name) + '(' + people(worst.troops) + ')이 노릴 수 있습니다.</b>';
  }
  function estHTML(p) {
    var left = Math.floor(S.f[0].troops) - sendN;
    return defWarn(left) + '<br>' + """.replace(" function defWarn","  function defWarn",1).replace("return defWarn(left) + '<br>' + ","return "))
U("""명 귀가. 나머지는 다음 달 복귀.<br>이번 달 우리 동을 지킬 인원 ' + people(Math.max(0, left));""","""명 귀가. 나머지는 다음 달 복귀.<br>이번 달 우리 동을 지킬 인원 ' + people(Math.max(0, left)) + defWarn(left);""")
# 개발 효과
U("""    var dx = E.TYPES[d.type].devx || 1;
    var eff = ['세수 +' + (5 * dx) + '억/월', '공격 +7%, 2단계부터 한강 불이익 없음', '동원 +' + (4 * dx).toFixed(1).replace(/\\.0$/, '') + '명/월', '방어 +35%, 민심 회복 빨라짐'];""","""    var fx = { 0: E.devEffect(S, sel, 0), 2: E.devEffect(S, sel, 2) }, one = function (v) { return (Math.round(v * 10) / 10).toString(); };
    var payback = function () { var c0 = E.devCost(S, sel, 0); return c0 !== null && fx[0].tax > 0 ? ' · 약 ' + Math.ceil(c0 / fx[0].tax) + '개월이면 회수' : ''; };
    var eff = ['세수 +' + one(fx[0].tax) + '억/월' + payback(), '공격 +7%, 2단계부터 한강 불이익 없음', '동원 +' + one(fx[2].draft) + '명/월', '방어 +35%, 민심 회복 빨라짐'];""")
# 첫 접촉 안내
U("""    if (sel !== null && sheetMode === 'dong' && S.owner[sel] !== 0) { var n = E.needFor""","""    if (!S.seenFoe && !bad.length) {
      var contact = E.dongsOf(S, 0).some(function (i) { return D[i].a.some(function (j) { return S.owner[j] > 0; }); });
      if (contact) { S.seenFoe = 1; setNews('처음으로 다른 세력과 맞닿았습니다. 그 동을 누르면 불가침이나 통합도 제안할 수 있습니다.'); }
    }
    if (sel !== null && sheetMode === 'dong' && S.owner[sel] !== 0) { var n = E.needFor""")
U("""    var hints = { 1: '우리 동을 누르면 개발합니다. 예산이 남으면 위쪽 숫자판을 눌러 인원을 모으세요.',""","""    var hints = { 1: '우리 동을 누르면 개발합니다. 예산이 남으면 위쪽 숫자판을 눌러 인원을 모으세요. 출동 인원은 돌아왔습니다.',""")
# 메뉴 문구
U("""<li>우리 동을 누르면 개발합니다. 값은 어느 동이나 같습니다.""","""<li>우리 동을 누르면 개발합니다. 값은 어느 동이나 같고, 버튼 옆에 실제로 늘어나는 양이 나옵니다.""")
# 결과 카드
U("""    var ms = Math.min(968 / DATA.w, 560 / DATA.h), ox = (W2 - DATA.w * ms) / 2, oy = 186;""","""    var ms = Math.min(968 / DATA.w, 500 / DATA.h), ox = (W2 - DATA.w * ms) / 2, oy = 176;""")
U("""c.fillText(win ? '서울시장 취임' : '동네에서 쫓겨남', 56, 806);""","""c.fillText(win ? '서울시장 취임' : '동네에서 쫓겨남', 56, 740);""")
U("""' 출신 · ' + nick, 56, 874);""","""' 출신 · ' + nick, 56, 806);""")
U("""['접수한 동', n + ' / 427'], ['집에 돌아간 주민',""","""['접수한 동', n + ' / 427'], ['돈으로 설득한 동', S.stat.talked + '개'], ['집에 돌아간 주민',""")
U("""['최대 라이벌', nem || '없음']];""","""['가장 크게 진 싸움', S.stat.worst ? S.stat.worst.name + ' ' + S.stat.worst.n.toLocaleString('ko-KR') + '명 귀가' : '없음'], ['최대 라이벌', nem || '없음']];""")
U("""      var y = 950 + i * 58;""","""      var y = 874 + i * 54;""")
open('src/ui.js','w').write(u)
t=open('src/index.tpl.html').read()
a="#cells{display:grid;grid-template-columns:repeat(4,1fr);"; assert a in t
t=t.replace(a,"#cells{display:grid;grid-template-columns:1.05fr 1.05fr .8fr 1.1fr;")
a=".est{margin:6px 0 0;"; assert a in t
t=t.replace(a,".warn{color:var(--stamp-dark);font-weight:700}\n.tip{margin:6px 0 0;font-size:13.5px;font-weight:500}\n.est{margin:6px 0 0;")
a=".cell{padding:4px 8px;"; assert a in t
t=t.replace(a,".cell{padding:4px 7px;")
open('src/index.tpl.html','w').write(t)
