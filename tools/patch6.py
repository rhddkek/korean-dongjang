u=open('src/ui.js').read()
def U(a,b):
    global u
    assert a in u,a[:70]; u=u.replace(a,b)
# 시작 화면: 대표 능력 소개
U("""  function typeHTML(d) {
    var T = E.TYPES[d.type];
    return '<p class="type"><b>' + T.n + '</b> ' + T.t + '<br><span>' + T.e + '</span></p>';
  }""","""  function typeHTML(d) {
    var T = E.TYPES[d.type];
    return '<p class="type"><b>' + T.n + '</b> ' + T.t + '<br><span>' + T.e + '</span></p>';
  }
  function abilHTML(type, long) {
    var A = E.ABIL[E.abilityOf(type)];
    return '<p class="type abil"><b>대표 능력 · ' + A.n + '</b> ' + A.t + (long ? '<br><span>' + A.how + '</span>' : '') + '</p>';
  }""")
U("""</button></div>' + typeHTML(d) + gaugeHTML(d) + factsHTML(d) + '</div>';""","""</button></div>' + typeHTML(d) + abilHTML(d.type, true) + gaugeHTML(d) + factsHTML(d) + '</div>';""")
# 적 동 시트: 스카우트 / 주민투표 버튼
U("""    if (o === -1 && p.route && p.route.via !== 'subway') {
      var c = E.persuadeCost(S, sel);""","""    if (S.abil === 'office' && o > 0) {
      var si = E.scoutInfo(S, sel);
      html += '<div class="acts"><button class="btn ab" id="scout" type="button"' + (si.ok ? '' : ' disabled') + '>스카우트 제안' + (si.gain ? ' · ' + people(si.gain) + ' 영입 · ' + money(si.cost) + ' · 결재 1건' : '') + '</button></div>' + (si.why ? '<p class="why">' + esc(si.why) + '</p>' : '');
    }
    if (S.abil === 'town' && o === -1) {
      var vi = E.voteInfo(S, sel);
      html += '<div class="acts"><button class="btn ab" id="vote" type="button"' + (vi.ok ? '' : ' disabled') + '>주민투표 발의 · 다음 달 합류 · 결재 1건</button></div>' + (vi.why ? '<p class="why">' + esc(vi.why) + '</p>' : '');
    }
    if (o === -1 && p.route && p.route.via !== 'subway') {
      var c = E.persuadeCost(S, sel);""")
U("""    bind('merge', guard(function () { act(E.merge(S, o), true); }));""","""    bind('merge', guard(function () { act(E.merge(S, o), true); }));
    bind('scout', guard(function () { var r = E.scout(S, sel); act(r); if (!r.err) setNews(S.log[0].t); }));
    bind('vote', guard(function () { var r = E.vote(S, sel); act(r, true); if (!r.err) setNews(S.log[0].t); }));""")
# 세력 시트: 능력, 사업, 상태
U("""    html += '<p class="why">대기: 지금 공격과 방어에 쓸 수 있는 인원. 출동: 다음 달 복귀. 귀가: 이번 판에서 빠진 인원.</p>';""","""    var A = E.ABIL[S.abil];
    html += '<div class="sec">대표 능력 · ' + A.n + '</div><p class="why">' + esc(A.how) + '</p>';
    if (S.abil === 'station') { var ei = E.expressInfo(S); html += '<div class="acts"><button class="btn ab" id="express" type="button"' + (ei.ok ? '' : ' disabled') + '>' + (S.express === S.month ? '이번 달 급행 원정 중' : '급행 원정 켜기' + (ei.cost ? ' · ' + money(ei.cost) : '')) + '</button></div>' + (ei.why ? '<p class="why">' + esc(ei.why) + '</p>' : ''); }
    if (S.abil === 'other') { var ri = E.rallyInfo(S); html += '<div class="acts"><button class="btn ab" id="rally" type="button"' + (ri.ok ? '' : ' disabled') + '>반상회 소집 · 민심 +20' + (ri.cost ? ' · ' + money(ri.cost) : '') + '</button></div>' + (ri.why ? '<p class="why">' + esc(ri.why) + '</p>' : ''); }
    if (S.abil === 'office') html += '<p class="why">맞닿은 세력의 동을 누르면 제안할 수 있습니다.</p>';
    if (S.abil === 'town') html += '<p class="why num">우리 동 민심 평균 ' + Math.round(E.avgMood(S)) + '. ' + (S.vote ? D[S.vote.t].n + ' 투표 진행 중.' : '맞닿은 독립 동을 누르면 발의할 수 있습니다.') + '</p>';
    if (S.rank >= 1) {
      var ug = bestGu(), ui2 = E.unityInfo(S, ug), ep = E.exprProjInfo(S);
      html += '<div class="sec">대형 사업</div><div class="two"><button class="btn num" id="unity" type="button"' + (ui2.ok ? '' : ' disabled') + '>' + GU[ug].n + ' 화합 사업<br>' + (ui2.cost ? money(ui2.cost) : '불가') + '</button><button class="btn num" id="exprProj" type="button"' + (ep.ok ? '' : ' disabled') + '>광역 급행 사업<br>' + (S.exprProj ? '완료' : money(ep.cost)) + '</button></div><p class="why">화합: 그 구의 우리 동 민심 100, 6개월간 독립 없음. 급행: 역이 있는 우리 동의 기습 거리 5.5km로 영구 확대.' + (ui2.why ? ' ' + esc(ui2.why) : '') + '</p>';
    }
    html += '<p class="why">대기: 지금 공격과 방어에 쓸 수 있는 인원. 출동: 다음 달 복귀. 귀가: 이번 판에서 빠진 인원.</p>';""")
U("""    bind('adReward', function () {""","""    bind('express', guard(function () { act(E.express(S)); setNews(S.log[0].t); }));
    bind('rally', guard(function () { act(E.rally(S)); setNews(S.log[0].t); }));
    bind('unity', guard(function () { act(E.unity(S, bestGu())); setNews(S.log[0].t); }));
    bind('exprProj', guard(function () { act(E.exprProj(S)); setNews(S.log[0].t); }));
    bind('adReward', function () {""")
# 구 시트에도 화합 사업
U("""      if (st.have) {
        html += '<div class="sec">우리 동 한꺼번에 개발 (한 단계씩)</div>""","""      if (st.have) {
        var ui3 = E.unityInfo(S, g);
        html += '<div class="sec">구민 화합 사업</div><div class="acts"><button class="btn" id="guUnity" type="button"' + (ui3.ok ? '' : ' disabled') + '>' + (S.stable[g] > S.month ? '진행 중 · ' + (S.stable[g] - S.month) + '달 남음' : '민심 100, 6개월간 독립 없음 · ' + money(ui3.cost)) + '</button></div>';
        html += '<div class="sec">우리 동 한꺼번에 개발 (한 단계씩)</div>""")
U("""    bind('guPer', guard(""","""    bind('guUnity', guard(function () { act(E.unity(S, g)); setNews(S.log[0].t); }));
    bind('guPer', guard(""")
# 숙적 예고를 소식 1순위로, 지도에 표시
U("""    if (bad.length) setNews(bad[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''), true);
    else if (riv.length) setNews(riv[0].t);""","""    var plan = S.rivalPlan ? ev.filter(function (l) { return l.k === 'riv' && l.t.indexOf('모이고') >= 0; }) : [];
    if (plan.length) setNews(plan[0].t + ' 방어를 올리거나 협정을 맺으세요.', true);
    else if (bad.length) setNews(bad[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''), true);
    else if (riv.length) setNews(riv[0].t);""")
U("""    Object.keys(flash).forEach(function (k) {""","""    if (S && !lens && S.rivalPlan && S.owner[S.rivalPlan.t] === 0) {
      var pt = S.rivalPlan.t, blink = 0.45 + 0.35 * Math.sin(performance.now() / 250);
      c.strokeStyle = 'rgba(212,50,31,' + blink + ')'; c.lineWidth = 5 * px; c.stroke(dongPath[pt]); dirty();
    }
    Object.keys(flash).forEach(function (k) {""")
# 우리 동 시트: 위협 표시
U("""    html += '<p class="why">방어는 동 자체 방어에 대기 인원 일부가 더해진 값입니다.'""","""    if (S.rivalPlan && S.rivalPlan.t === sel) html += '<p class="err">' + esc(S.f[S.rivalPlan.f].name) + '이 이 동을 노리고 있습니다. 치안을 올리거나 인원을 남겨 두세요.</p>';
    html += '<p class="why">방어는 동 자체 방어에 대기 인원 일부가 더해진 값입니다.'""")
# 메뉴 설명
U("""<li>세력의 본거지(검은 점)를 빼앗으면""","""<li>시작한 동의 유형에 따라 한 판 내내 대표 능력 하나를 씁니다. 점령한 동은 특성 보너스만 줍니다.</li><li>민심이 40 아래인 동은 독립할 수 있습니다. 구청장부터 구민 화합 사업으로 막을 수 있습니다.</li><li>세력의 본거지(검은 점)를 빼앗으면""")
# 결과: 능력 사용 횟수
U("""['돈으로 설득한 동', S.stat.talked + '개'],""","""['돈으로 설득한 동', S.stat.talked + '개'], ['대표 능력 사용', (S.stat.abil || 0) + '회'],""")
U("""      var y = 874 + i * 54;""","""      var y = 866 + i * 50;""")
open('src/ui.js','w').write(u)
t=open('src/index.tpl.html').read()
a=".type span{color:var(--mute);font-size:12.5px}"; assert a in t
t=t.replace(a,a+"\n.type.abil{border-left:3px solid var(--stamp);padding-left:8px}\n.btn.ab{border-color:var(--stamp);color:var(--stamp-dark)}\n.btn.ab:disabled{border-color:#D5DAD0;color:#8B958C}")
open('src/index.tpl.html','w').write(t)
