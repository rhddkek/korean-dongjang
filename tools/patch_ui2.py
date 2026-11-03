import re
u=open('src/ui.js').read()
def R(a,b):
    global u
    assert a in u, a[:80]
    u=u.replace(a,b)
def F(name,new):
    global u
    m=re.search(r'^  function '+name+r'\(',u,re.M); assert m,name
    n=re.compile(r'^  (function |// ----|\$\(|window\.|var )',re.M).search(u,m.end()); assert n,name
    u=u[:m.start()]+new.strip('\n')+'\n'+u[n.start():]
R("""function loadSave() { try { var t = localStorage.getItem(SAVE_KEY); if (t) { var o = JSON.parse(t); if (o && o.v === 1) return o; } } catch (e) {} return null; }""",
"""function loadSave() { try { var t = localStorage.getItem(SAVE_KEY); if (t) return E.migrate(JSON.parse(t)); } catch (e) {} return null; }
  // 광고 자리. 애드센스 승인 후 enabled를 켜고 광고 스크립트를 넣으면 동작합니다. 지금은 꺼져 있어 화면에 아무것도 나오지 않습니다.
  var ADS = { enabled: false };
  function adBreakSafe(cfg) { if (ADS.enabled && window.adBreak) window.adBreak(cfg); else if (cfg.afterAd) cfg.afterAd(); }
  function encodeSave(st) {
    var c = JSON.parse(JSON.stringify(st)); c.log = c.log.slice(0, 12); c.last = [];
    return 'DJ2:' + btoa(unescape(encodeURIComponent(JSON.stringify(c))));
  }
  function decodeSave(code) {
    var t = String(code).trim().replace(/\\s+/g, '');
    if (t.indexOf('DJ2:') !== 0) return null;
    try { return E.migrate(JSON.parse(decodeURIComponent(escape(atob(t.slice(4)))))); } catch (e) { return null; }
  }
  function copyText(txt, btn, ta) {
    function fb() { if (ta) { ta.focus(); ta.select(); } btn.textContent = '선택됐습니다. 직접 복사해 주세요.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { btn.textContent = '복사했습니다'; }, fb); else fb();
  }""")
R("""  var S = null, sel = null,""","""  var guSel = null, S = null, sel = null,""")
R("""    var cur = S ? sel : pickSel;
    if (cur !== null && cur !== undefined) {""","""    if (S && sheetMode === 'gu' && guSel !== null) {
      c.strokeStyle = '#17231C'; c.lineWidth = 2.4 * px;
      E.guDongs()[guSel].forEach(function (i) { c.stroke(dongPath[i]); });
    }
    var cur = S ? sel : pickSel;
    if (cur !== null && cur !== undefined) {""")
# 시작 화면
R("""    var d = D[i], t = 130 + d.P * 1.9, m = 30 + d.E * 2, nb = d.a.map(function (j) { return D[j].base; });
    var avg = nb.reduce(function (a, b) { return a + b; }, 0) / nb.length;
    var r = (t + m * 1.5) / (avg * 1.3);
    return r > 2 ? '쉬움' : r > 1.45 ? '보통' : '어려움';""","""    var d = D[i], T = E.TYPES[d.type], nb = d.a.map(function (j) { return D[j].base; });
    var avg = nb.reduce(function (a, b) { return a + b; }, 0) / nb.length;
    var r = (d.tax * (T.tax || 1) * 1.2 + d.draft * (T.draft || 1)) / (avg / 4);
    return r > 1 ? '쉬움' : r > 0.6 ? '보통' : '어려움';""")
R("""  function factsHTML(d) {""","""  function typeHTML(d) {
    var T = E.TYPES[d.type];
    return '<p class="type"><b>' + T.n + '</b> ' + T.t + '<br><span>' + T.e + '</span></p>';
  }
  function factsHTML(d) {""")
R("""</p></div></div>' + gaugeHTML(d) + factsHTML(d) + '<div class="acts"><button class="btn red" id="begin" type="button">' + esc(d.n) + ' 동장으로 시작</button></div></div>';""","""</p></div></div>' + typeHTML(d) + gaugeHTML(d) + factsHTML(d) + '<div class="acts"><button class="btn red" id="begin" type="button">' + esc(d.n) + ' 동장으로 시작</button></div></div>';""")
R("""    $('pick').innerHTML = html;""","""    html += '<p class="why">점수와 유형은 통계로 계산한 게임용 값입니다. <button id="importBtn" class="linkish" type="button">저장 코드 불러오기</button></p>';
    $('pick').innerHTML = html;
    bind('importBtn', importDialog);""")
# 게임 시작
R("""    setNews('빨간 테두리 동을 눌러 쳐들어가 보세요.');""","""    setNews('빨간 테두리 동을 눌러 쳐들어가 보세요. 보낸 인원은 다음 달에 돌아옵니다.');""")
R("""    $('cTroops').textContent = people(me.troops);
    $('cTroopsD').textContent = signed(e.draft - e.decay, people) + '/월';""","""    $('cTroops').textContent = people(me.troops);
    $('cTroopsD').textContent = me.away >= 1 ? '출동 ' + people(me.away) : signed(e.draft - e.decay, people) + '/월';""")
R("""    renderSheet();
    dirty();
    checkOverlay();""","""    var bar = $('evBar');
    bar.hidden = !S.ev;
    if (S.ev) { var ve = E.eventView(S); bar.textContent = '민원 1건: ' + ve.t + ' · ' + ve.left + '달 안에 처리'; }
    renderSheet();
    dirty();
    checkOverlay();""")
R("""    else if (sheetMode === 'menu') menuSheet(sh);""","""    else if (sheetMode === 'menu') menuSheet(sh);
    else if (sheetMode === 'gu') guSheet(sh);
    else if (sheetMode === 'ev') eventSheet(sh);""")
R("""    if (r.via === 'bridgeOk') return src + '에서 한강 건너기 (교통 2단계라 불이익 없음)';""","""    if (r.via === 'bridgeOk') return src + '에서 한강 건너기 (불이익 없음)';""")
R("""    return src + '에서 지하철 기습 (전력 −20%)';""","""    return src + '에서 지하철 기습' + (E.TYPES[D[r.src].type].subway ? ' (역세권이라 불이익 없음)' : ' (전력 −20%)');""")
F('enemySheet',r"""
  function estHTML(p) {
    var left = Math.floor(S.f[0].troops) - sendN;
    return '이기면 ' + p.winLoss[0] + '~' + p.winLoss[1] + '명, 지면 ' + p.loseLoss[0] + '~' + p.loseLoss[1] + '명이 집에 갑니다.<br>나머지는 다음 달 복귀. 이번 달 남는 인원 ' + people(Math.max(0, left)) + ', 그만큼 우리 동 방어가 약해집니다.';
  }
  function guLinkHTML(g) {
    var st = E.guStatus(S, g);
    return '<button class="guLink" id="guLink" type="button"><span>' + GU[g].n + ' 현황' + (S.rank >= 1 ? '·한꺼번에 작전' : '') + '</span><span class="num">' + st.have + '/' + st.total + ' ›</span></button>';
  }
  function enemySheet(sh) {
    var d = D[sel], o = S.owner[sel], me = S.f[0];
    var sub = GU[d.g].n + ' · ';
    if (o === -1) sub += '독립 동';
    else sub += '<span class="dot" style="background:' + fCol(o) + '"></span>' + esc(S.f[o].name) + (S.f[o].cap === sel ? ' 본거지' : '') + (o === S.rival ? ' · 숙적' : '') + ' · ' + E.traitOf(S, o).word;
    var max = Math.floor(me.troops);
    sendN = Math.max(max > 0 ? 1 : 0, Math.min(max, sendN));
    var p = E.preview(S, sel, sendN);
    var html = headHTML(d, sub) + typeHTML(d) + gaugeHTML(d);
    if (!p.route) {
      html += '<p class="why" style="margin-top:10px">' + esc(p.reason) + ' 근처 동을 먼저 차지하거나, 역이 있는 우리 동에서 4km 안이면 지하철로 칠 수 있습니다.</p>';
    } else if (o > 0 && me.pact && me.pact[o] > S.month) {
      html += '<p class="why" style="margin-top:10px">불가침 협정이 ' + (me.pact[o] - S.month) + '달 남았습니다.</p><div class="acts"><button class="btn" id="bp" type="button">협정 깨기 (모든 우리 동 민심 −10)</button></div>';
    } else {
      html += '<div class="fight"><div><small>상대 방어</small><div class="big num">' + people(p.def.total) + '</div><div class="via">' + esc(viaText(p.route)) + '</div></div><div class="pct"><small>승률</small><div class="big num" id="pctV">' + Math.round(p.pct * 100) + '%</div></div></div>';
      html += '<div class="send"><input id="send" type="range" min="' + (max > 0 ? 1 : 0) + '" max="' + max + '" step="1" value="' + sendN + '" aria-label="보낼 인원"><output id="sendV" class="num">' + people(sendN) + '</output></div>';
      html += '<div class="chips">' + [[0.6, '60%'], [0.8, '80%'], [0.95, '95%']].map(function (x) {
        var nn = E.needFor(S, sel, x[0]);
        return '<button class="chip" type="button" data-n="' + nn + '"' + (nn > max ? ' disabled' : '') + '>승률 ' + x[1] + '</button>';
      }).join('') + '<button class="chip" type="button" data-n="' + max + '"' + (max < 1 ? ' disabled' : '') + '>전원</button></div>';
      html += '<p class="est num" id="estV">' + estHTML(p) + '</p>';
      html += '<div class="acts"><button class="btn red" id="atk" type="button"' + (p.ok ? '' : ' disabled') + '>쳐들어가기 · 결재 1건</button></div>';
      if (p.reason) html += '<p class="why">' + esc(p.reason) + '</p>';
      else if (max < 1) html += '<p class="why">지금 보낼 인원이 없습니다. 출동한 인원은 다음 달에 돌아옵니다.</p>';
    }
    if (o === -1 && p.route && p.route.via !== 'subway') {
      var c = E.persuadeCost(S, sel);
      html += '<div class="acts"><button class="btn" id="per" type="button"' + (me.money >= c && S.ap > 0 ? '' : ' disabled') + '>돈으로 설득하기 · ' + money(c) + ' · 결재 1건</button></div>';
    }
    if (o > 0) {
      var pc = E.pactCheck(S, o), mc = E.mergeCheck(S, o), pp = E.pactCost(S, o), mp = E.mergeCost(S, o);
      if (!(me.pact && me.pact[o] > S.month)) {
        html += '<div class="two" style="margin-top:8px"><button class="btn" id="pact" type="button"' + (pc.ok && me.money >= pp ? '' : ' disabled') + '>불가침 12개월<br>' + money(pp) + '</button><button class="btn" id="merge" type="button"' + (mc.ok && me.money >= mp && S.ap > 0 ? '' : ' disabled') + '>통합 제안<br>' + money(mp) + '</button></div>';
        var why = !pc.ok ? pc.why : (!mc.ok ? '통합 제안: ' + mc.why : '');
        if (why) html += '<p class="why">' + esc(why) + '</p>';
      }
    }
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    html += guLinkHTML(d.g) + factsHTML(d);
    sh.innerHTML = html;
    var range = $('send');
    if (range) {
      range.addEventListener('input', function () { sendN = +range.value; updateFight(); });
      Array.prototype.forEach.call(sh.querySelectorAll('.chip'), function (b) {
        b.addEventListener('click', function () { sendN = Math.min(max, +b.dataset.n); range.value = sendN; updateFight(); });
      });
    }
    bind('atk', doAttack);
    bind('per', function () { act(E.persuade(S, sel), true); });
    bind('pact', function () { act(E.pact(S, o)); });
    bind('merge', function () { act(E.merge(S, o), true); });
    bind('bp', function () { act(E.breakPact(S, o)); });
    bind('guLink', function () { openGu(d.g); });
  }
""")
R("""    $('sendV').textContent = people(sendN);""","""    $('sendV').textContent = people(sendN);
    $('estV').innerHTML = estHTML(p);""")
# 우리 동 시트
R("""    var html = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : ''));""","""    var html = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : '')) + typeHTML(d);""")
R("""var eff = ['세수 +5억/월', '공격 +7%, 2단계부터 한강 불이익 없음', '동원 +4명/월', '방어 +35%, 민심 회복 빨라짐'];""","""var dx = E.TYPES[d.type].devx || 1;
    var eff = ['세수 +' + (5 * dx) + '억/월', '공격 +7%, 2단계부터 한강 불이익 없음', '동원 +' + (4 * dx).toFixed(1).replace(/\\.0$/, '') + '명/월', '방어 +35%, 민심 회복 빨라짐'];""")
R("""    html += '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)">' + gaugeHTML(d) + factsHTML(d) + '</div>';
    sh.innerHTML = html;""","""    html += guLinkHTML(d.g) + '<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)">' + gaugeHTML(d) + factsHTML(d) + '</div>';
    sh.innerHTML = html;
    bind('guLink', function () { openGu(d.g); });""")
F('realmSheet',r"""
  function openGu(g) {
    guSel = g; sel = null; sheetMode = 'gu'; errMsg = '';
    $('sheet').scrollTop = 0;
    renderSheet(); dirty();
    requestAnimationFrame(function () { fitBox(expand(guBox[g], 40), 6, true); });
  }
  function guSheet(sh) {
    var g = guSel, st = E.guStatus(S, g), me = S.f[0], fin = GU[g].f;
    var html = '<div class="head"><div><h2>' + GU[g].n + '</h2><p>' + GU[g].r + ' · 재정자립도 ' + fin + '%</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="bar"><u style="width:' + (st.have / st.total * 100) + '%"></u><s style="left:50%"></s></div><p class="why num">' + st.total + '개 동 중 ' + st.have + '개 확보</p>';
    html += '<div class="rows num"><div class="row"><span>구청장 자격 (절반)</span><span>' + (st.half ? '달성' : st.need + '개 더') + '</span></div><div class="row"><span>통째로 장악하면 세수 +' + fin + '%</span><span>' + (st.full ? '적용 중' : st.left + '개 더') + '</span></div></div>';
    if (S.rank < 1) {
      html += '<p class="why" style="margin-top:10px">구청장이 되면 이 화면에서 동 여러 개를 한꺼번에 공격·설득·개발할 수 있습니다.</p>';
    } else {
      var lim = E.guLimit(S), ap = E.guAttackPreview(S, g), pp = E.guPersuadePreview(S, g);
      html += '<div class="sec">한꺼번에 공격</div><p class="why num">공격 가능한 ' + ap.count + '개 동 중 최대 ' + lim + '개. 각각 승률 80%만큼 나눠 보냅니다.' + (ap.n ? ' 약 ' + people(ap.need) + ' 필요.' : '') + '</p><div class="acts"><button class="btn red" id="guAtk" type="button"' + (S.ap >= 2 && ap.can >= 1 ? '' : ' disabled') + '>' + GU[g].n + ' 작전 · 결재 2건</button></div>';
      html += '<div class="sec">독립 동 한꺼번에 설득</div><div class="acts"><button class="btn" id="guPer" type="button"' + (S.ap >= 1 && pp.n >= 1 ? '' : ' disabled') + '>' + (pp.n ? pp.n + '곳 설득 · ' + money(pp.cost) + ' · 결재 1건' : (pp.count ? '예산이 모자랍니다' : '설득할 독립 동이 없습니다')) + '</button></div>';
      if (st.have) {
        html += '<div class="sec">우리 동 한꺼번에 개발 (한 단계씩)</div><div class="two">' + E.C.TRACKS.map(function (t, k) {
          var q = E.guDevelopPreview(S, g, k);
          return '<button class="btn gd num" type="button" data-k="' + k + '"' + (q.n ? '' : ' disabled') + '>' + t + (q.n ? ' ' + q.n + '곳<br>' + money(q.cost) : '<br>불가') + '</button>';
        }).join('') + '</div>';
      }
    }
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    sh.innerHTML = html;
    bind('guAtk', function () {
      var mark = S.last.length, r = E.guAttack(S, g);
      if (r.err) { errMsg = r.err; renderSheet(); return; }
      errMsg = ''; setNews(S.last.slice(mark).map(function (l) { return l.t; }).join(' '), !r.won);
      stampWorld(GU[g].x, GU[g].y, r.won > 0, r.won > 0 ? r.won + '개 접수' : '실패');
      save(); sync();
    });
    bind('guPer', function () { var r = E.guPersuade(S, g); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; setNews(S.log[0].t); save(); sync(); });
    Array.prototype.forEach.call(sh.querySelectorAll('.gd'), function (b) {
      b.addEventListener('click', function () { var r = E.guDevelop(S, g, +b.dataset.k); errMsg = r.err || ''; save(); sync(); });
    });
  }
  function fxText(a) {
    var p = [];
    if (a.money) p.push('예산 ' + signed(a.money, money));
    if (a.troops) p.push('인원 ' + signed(a.troops, people));
    if (a.mood) p.push('민심 ' + (a.mood > 0 ? '+' : '−') + Math.abs(a.mood));
    if (a.foe) p.push('이웃 세력 인원 −' + Math.round(a.foe * 100) + '%');
    if (a.join) p.push('옆 독립 동 편입');
    return p.join(', ');
  }
  function eventSheet(sh) {
    var v = E.eventView(S);
    if (!v) { sheetMode = 'none'; renderSheet(); return; }
    var html = '<div class="head"><div><h2>' + esc(v.t) + '</h2><p>' + v.left + '달 안에 처리하지 않으면 민심이 조금 떨어집니다.</p></div><button class="x" type="button" aria-label="닫기">×</button></div><p class="prose">' + esc(v.b) + '</p><div class="acts">';
    v.c.forEach(function (c, i) {
      var t = fxText(c.a);
      if (c.chance) t = (t ? t + ', ' : '') + '성공 ' + Math.round(c.chance * 100) + '%: ' + fxText(c.good) + ' / 실패: ' + (fxText(c.bad) || '변화 없음');
      var short = c.a.money < 0 && S.f[0].money < -c.a.money;
      html += '<button class="btn ch" type="button" data-i="' + i + '"' + (short ? ' disabled' : '') + '><b>' + esc(c.l) + '</b><br><small>' + esc(t || '변화 없음') + '</small></button>';
    });
    sh.innerHTML = html + '</div>';
    Array.prototype.forEach.call(sh.querySelectorAll('.ch'), function (b) {
      b.addEventListener('click', function () { var r = E.chooseEvent(S, +b.dataset.i); if (r.err) return; setNews(S.log[0].t); sheetMode = 'none'; save(); sync(); });
    });
  }
  function realmSheet(sh) {
    var me = S.f[0], e = E.economy(S, 0), held = E.guHeld(S, 0);
    var html = '<div class="head"><div><h2>' + esc(title()) + '</h2><p>' + esc(me.name) + ' · 본거지 ' + esc(D[me.cap].n) + '</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    var share = E.popShare(S, 0);
    html += '<div class="sec">서울시장까지</div><div class="bar"><u style="width:' + Math.min(100, share * 100) + '%"></u><s style="left:60%"></s></div><p class="why num">서울 인구 ' + (share * 100).toFixed(1) + '% 장악. 60%가 되면 서울시장에 취임합니다.</p>';
    if (S.rank < 1) { var g = bestGu(), st = E.guStatus(S, g); html += '<p class="why num">구청장: 한 구의 동을 절반 이상 차지. ' + GU[g].n + ' ' + st.have + '/' + st.total + '개.</p>'; }
    else if (S.rank < 2) html += '<p class="why num">권역장: 4개 구에서 각각 동을 절반 이상 차지. 지금 ' + held + '개 구.</p>';
    html += '<div class="sec">일당 주고 인원 모으기 (1억 = 1.2명)</div><div class="chips">' + [100, 300].map(function (v) {
      return '<button class="chip num" type="button" data-m="' + v + '"' + (me.money >= v ? '' : ' disabled') + '>' + v + '억 → ' + Math.round(v * 1.2) + '명</button>';
    }).join('') + '<button class="chip num" type="button" data-m="all"' + (me.money >= 1 ? '' : ' disabled') + '>전액 → ' + Math.round(Math.floor(me.money) * 1.2) + '명</button></div>';
    html += '<div class="sec">월 수지</div><div class="rows num"><div class="row"><span>세수' + (e.aidTax > 0 ? ' (약소 동 지원금 포함)' : '') + '</span><span>+' + money(e.tax) + '</span></div><div class="row"><span>동 관리비</span><span>−' + money(e.up) + '</span></div><div class="row"><span>동원' + (e.aidDraft > 0 ? ' (지원 포함)' : '') + '</span><span>+' + people(e.draft) + '</span></div><div class="row"><span>자연 이탈</span><span>−' + people(e.decay) + '</span></div>' + (me.away >= 1 ? '<div class="row"><span>출동 중 (다음 달 복귀)</span><span>' + people(me.away) + '</span></div>' : '') + '</div>';
    var list = GU.map(function (x, i) { return { i: i, st: E.guStatus(S, i) }; }).filter(function (x) { return x.st.have > 0; }).sort(function (a, b) { return b.st.have / b.st.total - a.st.have / a.st.total; });
    if (list.length) html += '<div class="sec">우리가 들어간 구</div><div class="rows num">' + list.slice(0, 12).map(function (x) {
      return '<button class="row rowBtn" type="button" data-g="' + x.i + '"><span>' + GU[x.i].n + (x.st.full ? ' · 세수 +' + GU[x.i].f + '% 적용' : x.st.half ? ' · 구청장 자격' : '') + '</span><span>' + x.st.have + '/' + x.st.total + ' ›</span></button>';
    }).join('') + '</div>';
    var fl = E.factionList(S);
    html += '<div class="sec">세력 순위</div><div class="rows num">' + fl.slice(0, 7).map(function (f) {
      var pct = me.pact && me.pact[f.id] > S.month ? ' · 협정 ' + (me.pact[f.id] - S.month) + '달' : '';
      return '<div class="row"><span><span class="dot" style="background:' + fCol(f.id) + '"></span>' + esc(f.id === 0 ? '우리' : f.name) + (f.id === S.rival ? ' · 숙적' : '') + esc(pct) + '</span><span>' + f.n + '개 동 · ' + people(f.troops) + '</span></div>';
    }).join('') + '</div>';
    if (ADS.enabled) html += '<div class="acts"><button class="btn" id="adReward" type="button">광고 보고 예산 받기</button></div>';
    sh.innerHTML = html;
    Array.prototype.forEach.call(sh.querySelectorAll('.chip'), function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.m === 'all' ? me.money : +b.dataset.m;
        E.recruit(S, v); save(); sync();
      });
    });
    Array.prototype.forEach.call(sh.querySelectorAll('.rowBtn'), function (b) { b.addEventListener('click', function () { openGu(+b.dataset.g); }); });
    bind('adReward', function () { adBreakSafe({ type: 'reward', name: 'budget', adViewed: function () { S.f[0].money += Math.max(50, E.economy(S, 0).tax); save(); sync(); } }); });
  }
""")
R("""    var html = '<div class="head"><div><h2>지역 소식</h2></div><button class="x" type="button" aria-label="닫기">×</button></div><ul class="log">';""","""    var html = '<div class="head"><div><h2>지역 소식</h2></div><button class="x" type="button" aria-label="닫기">×</button></div><ul class="log">';""")
F('menuSheet',r"""
  function menuSheet(sh) {
    var html = '<div class="head"><div><h2>메뉴</h2></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="sec">게임 방법</div><ul class="prose"><li>빨간 테두리 동을 눌러 인원을 보내면 공격합니다. 공격과 설득은 결재를 씁니다.</li><li>보낸 인원은 다음 달에 돌아옵니다. 그동안 우리 동 방어가 약해지니 나눠서 쓰세요.</li><li>직장인이 많으면 세수가, 주민이 많으면 동원이 많습니다. 동네 유형마다 특성이 있습니다.</li><li>우리 동을 누르면 개발합니다. 값은 어느 동이나 같습니다. 우리 동이 3개 이하일 때는 지원금이 나옵니다.</li><li>한 구의 동을 절반 이상 차지하면 구청장, 그런 구가 4개면 권역장, 서울 인구 60%면 서울시장입니다. 인구는 통계 기준으로 고정이라 개발해도 늘지 않습니다.</li><li>구를 통째로 먹으면 그 구의 실제 재정자립도만큼 세수가 늘어납니다.</li><li>구청장부터는 구 현황에서 한꺼번에 공격·설득·개발할 수 있습니다.</li><li>세력의 본거지(검은 점)를 빼앗으면 그 세력은 무너지고 동의 절반이 따라옵니다.</li><li>서울시장이 된 뒤에도 남은 동까지 계속 먹을 수 있습니다.</li></ul>';
    html += '<div class="sec">저장</div><p class="why">진행 상황은 이 기기의 브라우저에 자동 저장됩니다. 기기를 바꾸거나 브라우저 기록을 지울 때는 저장 코드를 복사해 두세요.</p><div class="two" style="margin-top:6px"><button class="btn" id="expBtn" type="button">저장 코드 복사</button><button class="btn" id="impBtn" type="button">코드 불러오기</button></div><textarea id="expText" readonly hidden></textarea>';
    html += '<div class="acts"><button class="btn" id="newGame" type="button">' + (confirmNew ? '정말 처음부터 시작 (지금 판은 사라집니다)' : '새 게임') + '</button></div>';
    html += '<div class="sec">자료 출처</div><p class="src">서울특별시 서울 열린데이터광장: <a href="https://data.seoul.go.kr/dataList/OA-22183/S/1/datasetView.do" target="_blank" rel="noopener">상권분석서비스(상주인구-행정동)</a>, <a href="https://data.seoul.go.kr/dataList/OA-22184/S/1/datasetView.do" target="_blank" rel="noopener">상권분석서비스(직장인구-행정동)</a>, 상권분석서비스(집객시설-행정동). 2023~2024년 기준이라 지금과 다를 수 있습니다. 직장인 수가 빠진 26개 동과 시설 수가 빠진 관악구 신사동은 같은 구의 값으로 추정했습니다.<br>재정자립도: <a href="https://m.go.seoul.co.kr/news/2024/07/16/20240716500023" target="_blank" rel="noopener">서울시의회 자료 보도(서울신문)</a>, 2023년 기준.<br>생활 점수의 소득 항목은 237개 동만 확보해 나머지는 같은 구의 중간값을 썼습니다.<br>행정동 경계: 통계청·행정안전부 자료를 정리한 admdongkor(MIT), 2026년 10월 기준.</p><p class="src">경제·인프라·생활 점수와 동네 유형은 통계를 바탕으로 계산한 게임용 값으로, 실제 매출이나 소득 순위가 아니며 동네의 우열을 뜻하지 않습니다. 등장 단체와 사건은 모두 지어낸 것입니다.</p>';
    sh.innerHTML = html;
    bind('expBtn', function () {
      var code = encodeSave(S), ta = $('expText');
      ta.hidden = false; ta.value = code;
      copyText(code, $('expBtn'), ta);
    });
    bind('impBtn', importDialog);
    bind('newGame', function () {
      if (!confirmNew) { confirmNew = true; renderSheet(); return; }
      toStart();
    });
  }
  function toStart() {
    clearSave(); S = null; confirmNew = false; sheetMode = 'none'; sel = null; guSel = null; lens = 0;
    $('over').hidden = true; $('hud').hidden = true; $('bottom').hidden = true; $('start').hidden = false; $('legend').hidden = true;
    renderPick(); requestAnimationFrame(function () { fitAll(false); });
    adBreakSafe({ type: 'next', name: 'new-game' });
  }
  function importDialog() {
    showCard('<h2>저장 코드 불러오기</h2><p>복사해 둔 코드를 붙여 넣으세요. 지금 판은 덮어씁니다.</p><textarea id="impText" aria-label="저장 코드"></textarea><p class="err" id="impErr" hidden></p><div class="acts"><button class="btn red" id="impGo" type="button">불러오기</button><button class="btn" id="impNo" type="button">닫기</button></div>');
    bind('impNo', hideCard);
    bind('impGo', function () {
      var o = decodeSave($('impText').value);
      if (!o) { var er = $('impErr'); er.hidden = false; er.textContent = '코드를 읽지 못했습니다. DJ2:로 시작하는 코드 전체를 붙여 넣었는지 확인해 주세요.'; return; }
      $('over').hidden = true;
      resumeGame(o); save();
    });
  }
""")
R("""'한 달 기본 결재가 3건으로 늘었습니다. 다음 목표는 구 4곳입니다.' : '한 달 기본 결재가 5건으로 늘었습니다. 이제 서울 인구 60%만 남았습니다.'""","""'한 달 기본 결재가 3건으로 늘었습니다. 이제 구 현황에서 한꺼번에 공격·설득·개발할 수 있습니다. 다음 목표는 구 4곳입니다.' : '한 달 기본 결재가 5건으로 늘었고, 구 작전은 한 번에 6개 동까지 됩니다. 이제 서울 인구 60%만 남았습니다.'""")
F('showEnd',r"""
  function nickOf(win) {
    var st = S.stat, gu = GU[D[S.start].g].n;
    if (!win) return gu + '의 전직 동장';
    var c = [[st.talked >= Math.max(15, st.took * 0.25), '설득왕'], [st.raid >= 15, '지하철 기습왕'], [st.merged >= 3, '통합의 달인'], [st.bridge >= 10, '한강 도강왕'], [st.built >= 60, '개발왕'], [st.guop >= 12, '구 작전왕']];
    for (var i = 0; i < c.length; i++) if (c[i][0]) return gu + '의 ' + c[i][1];
    return gu + '의 불도저';
  }
  function resultImage(win, span, n, nick, nem) {
    var W2 = 1080, H2 = 1350, k = document.createElement('canvas'); k.width = W2; k.height = H2;
    var c = k.getContext('2d'), disp = '"Black Han Sans","Apple SD Gothic Neo","Malgun Gothic",sans-serif', bod = '"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    c.fillStyle = '#F7F8F2'; c.fillRect(0, 0, W2, H2);
    c.fillStyle = '#17231C'; c.fillRect(0, 0, W2, 150);
    c.fillStyle = '#fff'; c.font = '700 74px ' + disp; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('동장의 난', 56, 78);
    c.textAlign = 'right'; c.font = '500 32px ' + bod; c.fillText(dateOf(S.month), W2 - 56, 80);
    var ms = Math.min(968 / DATA.w, 560 / DATA.h), ox = (W2 - DATA.w * ms) / 2, oy = 186;
    c.save(); c.translate(ox, oy); c.scale(ms, ms);
    D.forEach(function (d, i) { var o = S.owner[i]; c.fillStyle = o === -1 ? '#ECEFE6' : fCol(o); c.fill(dongPath[i]); });
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(30,45,35,.3)'; c.lineWidth = 0.6 / ms; c.stroke(allDong);
    c.strokeStyle = '#7DB2CF'; c.lineWidth = 70; c.stroke(riverPath);
    c.strokeStyle = '#17231C'; c.lineWidth = 3 / ms; c.stroke(outerPath);
    c.restore();
    c.textAlign = 'left'; c.fillStyle = win ? '#D4321F' : '#47524A'; c.font = '700 66px ' + disp; c.fillText(win ? '서울시장 취임' : '동네에서 쫓겨남', 56, 806);
    c.fillStyle = '#17231C'; c.font = '700 40px ' + bod; c.fillText(GU[D[S.start].g].n + ' ' + D[S.start].n + ' 출신 · ' + nick, 56, 874);
    var rows = [['걸린 시간', span], ['장악 인구', (E.popShare(S, 0) * 100).toFixed(1) + '%'], ['접수한 동', n + ' / 427'], ['집에 돌아간 주민', S.stat.home.toLocaleString('ko-KR') + '명'], ['최대 라이벌', nem || '없음']];
    rows.forEach(function (r, i) {
      var y = 950 + i * 58;
      c.textAlign = 'left'; c.fillStyle = '#5D6A60'; c.font = '500 33px ' + bod; c.fillText(r[0], 56, y);
      c.textAlign = 'right'; c.fillStyle = '#17231C'; c.font = '700 35px ' + bod; c.fillText(r[1], W2 - 56, y);
    });
    c.textAlign = 'center'; c.fillStyle = '#D4321F'; c.font = '700 40px ' + disp; c.fillText('당신의 동네로도 서울시장이 될 수 있습니까?', W2 / 2, 1278);
    try { return k.toDataURL('image/png'); } catch (e) { return null; }
  }
  function showEnd(win) {
    var st = S.stat, n = E.dongsOf(S, 0).length, name = D[S.start].n, gu = GU[D[S.start].g].n;
    var yr = Math.floor(S.month / 12), mo = S.month % 12;
    var span = ((yr ? yr + '년 ' : '') + (mo ? mo + '개월' : (yr ? '' : '0개월'))).trim();
    var nick = nickOf(win), nem = E.nemesis(S);
    var txt = win
      ? gu + ' ' + name + ' 동장으로 시작해 ' + span + ' 만에 서울시장이 됐습니다. 427개 동 중 ' + n + '개 접수, 별명은 ' + nick + '. 당신의 동네로도 될까요? #동장의난'
      : gu + ' ' + name + ' 동장으로 시작해 ' + span + ' 만에 동네에서 쫓겨났습니다. 한때 ' + st.biggest + '개 동을 거느렸습니다. #동장의난';
    var img = resultImage(win, span, win ? n : st.biggest, nick, nem);
    showCard('<h2>' + (win ? '서울시장 취임' : '동네에서 쫓겨났습니다') + '</h2>' + (img ? '<img id="resultImg" src="' + img + '" alt="' + esc(txt) + '"><p class="why">이미지를 길게 누르거나 우클릭해서 저장하세요.</p>' : '<div class="seal' + (win ? '' : ' lose') + '">' + (win ? '서울<br>시장' : '해임') + '</div>') + '<textarea id="shareText" readonly>' + esc(txt) + '</textarea><div class="acts"><button class="btn" id="copy" type="button">문구 복사</button>' + (win ? '<button class="btn" id="cont" type="button">남은 동까지 마저 먹기</button>' : '') + '<button class="btn red" id="again" type="button">새 게임</button></div>');
    bind('copy', function () { copyText(txt, $('copy'), $('shareText')); });
    bind('cont', function () { S.keepPlaying = true; hideCard(); sync(); });
    bind('again', toStart);
    save();
  }
""")
R("""  function stampAt(i, win) {
    var d = D[i], x = d.x * cam.s + cam.x, y = d.y * cam.s + cam.y;
    var el = document.createElement('div');
    el.className = 'stampMark' + (win ? '' : ' fail');
    el.textContent = win ? '접수' : '실패';""","""  function stampAt(i, win) { stampWorld(D[i].x, D[i].y, win, win ? '접수' : '실패'); }
  function stampWorld(wx, wy, win, text) {
    var x = wx * cam.s + cam.x, y = wy * cam.s + cam.y;
    var el = document.createElement('div');
    el.className = 'stampMark' + (win ? '' : ' fail') + (text.length > 2 ? ' long' : '');
    el.textContent = text;""")
# 다음 달 소식
R("""    var bad = ev.filter(function (l) { return l.k === 'bad'; }), good = ev.filter(function (l) { return l.k === 'good' || l.k === 'rank'; });
    if (bad.length) setNews(bad[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''), true);""","""    var bad = ev.filter(function (l) { return l.k === 'bad'; }), riv = ev.filter(function (l) { return l.k === 'riv'; }), good = ev.filter(function (l) { return l.k === 'good' || l.k === 'rank'; });
    var hints = { 1: '우리 동을 누르면 개발합니다. 예산이 남으면 위쪽 숫자판을 눌러 인원을 모으세요.', 2: '빨간 점선은 지하철로 기습할 수 있는 동입니다.', 3: '한 구의 동을 절반 차지하면 구청장입니다. 진행도는 위쪽 숫자판에서 볼 수 있습니다.' };
    if (bad.length) setNews(bad[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''), true);
    else if (riv.length) setNews(riv[0].t);""")
R("""    else setNews(dateOf(S.month) + '. 조용한 달이었습니다.');""","""    else setNews(hints[S.month] || (dateOf(S.month) + '. 조용한 달이었습니다.'));
    if (!bad.length && !riv.length && !good.length && hints[S.month]) setNews(hints[S.month]);""")
R("""    $('sheet').scrollTop = 0; sel = null; sheetMode = sheetMode === 'log' ? 'none' : 'log';""","""    $('sheet').scrollTop = 0; sel = null; sheetMode = sheetMode === 'log' ? 'none' : 'log';""") if False else None
R("""  $('lens').addEventListener('click',""","""  $('evBar').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; sheetMode = sheetMode === 'ev' ? 'none' : 'ev'; renderSheet(); dirty(); });
  $('lens').addEventListener('click',""")
R("""    var res = hotData && hotData.save;
    if (res && res.v === 1) { resumeGame(res); }""","""    var res = hotData && hotData.save && E.migrate(hotData.save);
    if (res) { resumeGame(res); }""")
open('src/ui.js','w').write(u)
t=open('src/index.tpl.html').read()
def T(a,b):
    global t
    assert a in t,a[:70]; t=t.replace(a,b)
T("""      <div class="cell"><small>동원 인원</small>""","""      <div class="cell"><small>대기 인원</small>""")
T("""    <div id="dock">""","""    <button id="evBar" type="button" hidden></button>
    <div id="dock">""")
T(""".facts{margin:8px 0 0;""",""".type{margin:8px 0 0;font-size:13.5px;line-height:1.4}
.type b{font-weight:700}
.type span{color:var(--mute);font-size:12.5px}
.est{margin:6px 0 0;font-size:12.5px;line-height:1.45;color:var(--mute)}
.guLink{display:flex;justify-content:space-between;gap:8px;width:100%;margin-top:10px;padding:10px 12px;background:var(--paper);border:1px solid var(--line);border-radius:3px;font-weight:500;font-size:14px;text-align:left;min-height:44px;align-items:center}
.rowBtn{width:100%;background:none;border-width:1px 0 0;border-style:solid;border-color:#E6E9E0;text-align:left;min-height:42px;align-items:center}
.rowBtn:first-child{border-top:0}
#evBar{background:#FBE9E3;border:0;border-top:2px solid var(--ink);padding:8px max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px));font-weight:700;font-size:14px;text-align:left;color:var(--stamp-dark);width:100%;min-height:40px}
.linkish{background:none;border:0;padding:0;color:#1B5E8C;text-decoration:underline;font-size:inherit}
.ch{text-align:left;padding:8px 12px}
.ch small{font-weight:400;font-size:12.5px;color:var(--mute)}
.ch:disabled small{color:inherit}
.gd{font-size:14px}
#resultImg{display:block;width:100%;border:1px solid var(--line);margin-top:10px}
#expText,#impText{width:100%;height:84px;margin-top:8px;font-size:12.5px;border:1px solid var(--line);border-radius:3px;padding:8px;resize:none;background:#fff}
.facts{margin:8px 0 0;""")
T(""".log li.bad{color:var(--stamp-dark)}""",""".log li.riv{font-weight:500;color:#5A3A8C} .log li.ev{font-weight:700}
.log li.bad{color:var(--stamp-dark)}""")
T("""@keyframes stamp{""",""".stampMark.long{width:112px;height:112px;margin:-56px 0 0 -56px;font-size:23px;line-height:1.05;text-align:center;padding:10px}
@keyframes stamp{""")
open('src/index.tpl.html','w').write(t)
