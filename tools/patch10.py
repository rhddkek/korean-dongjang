s=open('src/engine.js').read()
def R(a,b):
    global s
    assert a in s,a[:80]; s=s.replace(a,b)
R("""  var ABIL = {""","""  // 정부 공모 사업 (게임용 각색: 실제 시설의 영향에 대한 주장이 아님)
  var GOV = {
    agency: { n: '공공기관 지역본부 이전', kind: '성장 사업', cond: '교통 2단계 이상', cost: 200, prep: 3,
      gain: '완공 후 이 동 세수 +25억/월', burden: '교통 혼잡: 교통 4단계 전까지 이 동 민심 회복 −3/월' },
    hospital: { n: '공공병원 건립', kind: '생활 사업', cond: '주거 2단계 이상', cost: 150, prep: 3,
      gain: '완공 후 이 동과 옆 같은 편 동 민심 회복 +3/월, 이 동 동원 +15%', burden: '운영비 −8억/월 (가진 쪽 부담)' },
    plant: { n: '광역 자원회수시설 유치', kind: '기피 사업', cond: '본거지가 아닌 우리 동', cost: 0, prep: 0,
      gain: '유치 즉시 지원금 +250억, 이후 교부금 +12억/월 (가진 쪽 수령)', burden: '이 동과 옆 우리 동 민심 −15, 협약 전까지 이 동 민심 70 상한' }
  };
  var GOV_ORDER = ['agency', 'plant', 'hospital'];
  function govSite(s, i) { return s.gov && s.gov.sites[i]; }
  function govDone(s, i) { var g = govSite(s, i); return g && s.month >= g.done ? g : null; }
  var ABIL = {""")
R("""    list.forEach(function (i) { tax += taxOf(s, i, fm); draft += draftOf(s, i); });
    var up = upkeep(list.length);""","""    var govIn = 0, govOut = 0;
    list.forEach(function (i) {
      tax += taxOf(s, i, fm); draft += draftOf(s, i);
      var g = govDone(s, i);
      if (g) { if (g.k === 'agency') tax += 25 * mood(s, i); if (g.k === 'plant') { tax += 12; govIn += 12; } if (g.k === 'hospital') { tax -= 8; govOut += 8; } }
    });
    var up = upkeep(list.length);""")
R("""    return { n: list.length, tax: tax, draft: draft, up: up, net: tax - up, decay: s.f[fid].troops * 0.015, full: Object.keys(fm).length, aidTax: aidTax, aidDraft: aidDraft };""","""    return { n: list.length, tax: tax, draft: draft, up: up, net: tax - up, decay: s.f[fid].troops * 0.015, full: Object.keys(fm).length, aidTax: aidTax, aidDraft: aidDraft, govIn: govIn, govOut: govOut };""")
R("""    if (f >= 0 && s.f[f].cap === i) v *= 1.2;
    return v;
  }""","""    if (f >= 0 && s.f[f].cap === i) v *= 1.2;
    var gs = govDone(s, i); if (gs && gs.k === 'hospital') v *= 1.15;
    return v;
  }""")
R("""      var heal = 5 + lv(s, i, 3) * 2 + (TYPES[D.d[i].type].heal || 0) + (lv(s, i, 3) >= 5 ? 5 : 0);
      s.min[i] = Math.min(100, s.min[i] + heal);""","""      var heal = 5 + lv(s, i, 3) * 2 + (TYPES[D.d[i].type].heal || 0) + (lv(s, i, 3) >= 5 ? 5 : 0);
      if (s.gov) {
        var gi = govDone(s, i);
        if (gi && gi.k === 'agency' && lv(s, i, 1) < 4) heal -= 3;
        if (gi && gi.k === 'hospital') heal += 3;
        else if (D.d[i].a.some(function (j) { var gj = govDone(s, j); return gj && gj.k === 'hospital' && s.owner[j] === s.owner[i] && s.owner[i] >= 0; })) heal += 3;
      }
      s.min[i] = Math.min(gi && gi.k === 'plant' && !gi.pact ? 70 : 100, s.min[i] + heal);""")
R("""    tickVote(s); tickRivalPlan(s);""","""    tickVote(s); tickRivalPlan(s); tickGov(s);""")
R("""  // ---- 사건 ----""","""  // ---- 정부 공모 ----
  function govEligible(s, k, i) {
    if (s.owner[i] !== 0) return '우리 동이 아닙니다.';
    if (govSite(s, i)) return '이미 정부 사업이 있는 동입니다.';
    if (k === 'agency' && lv(s, i, 1) < 2) return '교통 2단계가 필요합니다.';
    if (k === 'hospital' && lv(s, i, 2) < 2) return '주거 2단계가 필요합니다.';
    if (k === 'plant' && s.f[0].cap === i) return '본거지에는 들일 수 없습니다.';
    return '';
  }
  function govInfo(s) {
    if (!s.gov || !s.gov.open) return null;
    var k = s.gov.open.k, G = GOV[k], ok = [], all = dongsOf(s, 0);
    all.forEach(function (i) { if (!govEligible(s, k, i)) ok.push(i); });
    return { k: k, G: G, left: s.gov.open.until - s.month, ok: ok, any: all.length };
  }
  function govApply(s, i) {
    var info = govInfo(s);
    if (!info) return { err: '열린 공모가 없습니다.' };
    var why = govEligible(s, info.k, i);
    if (why) return { err: why };
    if (s.ap <= 0) return { err: '이번 달 결재를 다 썼습니다.' };
    if (s.f[0].money < info.G.cost) return { err: '예산이 ' + Math.ceil(info.G.cost - s.f[0].money) + '억 모자랍니다.' };
    s.f[0].money -= info.G.cost; s.ap--;
    s.gov.sites[i] = { k: info.k, start: s.month, done: s.month + info.G.prep, pact: false };
    s.gov.open = null; s.gov.nextAt = s.month + 5 + Math.floor(rnd(s) * 3); s.stat.gov = (s.stat.gov || 0) + 1;
    if (info.k === 'plant') {
      s.f[0].money += 250;
      [i].concat(D.d[i].a).forEach(function (j) { if (s.owner[j] === 0) s.min[j] = Math.max(5, s.min[j] - 15); });
      pushLog(s, D.d[i].n + '에 광역 자원회수시설을 유치했습니다. 지원금 250억이 들어왔고, 주민들은 현수막을 걸었습니다.', 'good');
    } else pushLog(s, J(D.d[i].n, '이', '가') + ' ' + info.G.n + ' 대상지로 뽑혔습니다. ' + info.G.prep + '달 뒤 완공됩니다.', 'good');
    return { ok: true };
  }
  function govPactCost() { return 80; }
  function govPact(s, i) {
    var g = govSite(s, i);
    if (!g || g.k !== 'plant' || g.pact) return { err: '협약할 시설이 없습니다.' };
    if (s.owner[i] !== 0) return { err: '우리 동이 아닙니다.' };
    if (s.f[0].money < 80) return { err: '예산이 ' + Math.ceil(80 - s.f[0].money) + '억 모자랍니다.' };
    s.f[0].money -= 80; g.pact = true; s.min[i] = Math.min(100, s.min[i] + 10);
    pushLog(s, D.d[i].n + ' 주민협약 체결. 환경설비를 늘리고 주민 감시단을 꾸렸습니다.', 'good');
    return { ok: true };
  }
  function tickGov(s) {
    if (!s.gov) s.gov = { open: null, sites: {}, nextAt: 6, idx: 0 };
    var gv = s.gov;
    Object.keys(gv.sites).forEach(function (i) { var g = gv.sites[i]; if (g.done === s.month && g.k !== 'plant' && s.owner[i] === 0) pushLog(s, D.d[i].n + ' ' + GOV[g.k].n.replace(/ (이전|건립)$/, '') + ' 완공. ' + GOV[g.k].gain.replace('완공 후 ', '') + '.', 'good'); });
    if (gv.open && s.month >= gv.open.until) {
      var k = gv.open.k, cands = [];
      for (var i = 0; i < s.owner.length; i++) if (s.owner[i] > 0 && !gv.sites[i] && s.f[s.owner[i]].cap !== i) cands.push(i);
      if (cands.length) {
        cands.sort(function (a, b) { return dongsOf(s, s.owner[b]).length - dongsOf(s, s.owner[a]).length; });
        var t = cands[Math.floor(rnd(s) * Math.min(5, cands.length))];
        gv.sites[t] = { k: k, start: s.month, done: s.month + GOV[k].prep, pact: false };
        pushLog(s, '정부가 ' + s.f[s.owner[t]].name + ' 쪽 ' + D.d[t].n + '에 ' + GOV[k].n.replace(/ (이전|건립|유치)$/, '') + '을 배정했습니다.');
      }
      gv.open = null; gv.nextAt = s.month + 4 + Math.floor(rnd(s) * 3);
    }
    if (!gv.open && s.month >= gv.nextAt && dongsOf(s, 0).length >= 3) {
      var kk = GOV_ORDER[gv.idx % GOV_ORDER.length]; gv.idx++;
      gv.open = { k: kk, until: s.month + 3 };
      pushLog(s, '정부 공모: ' + GOV[kk].n + '. ' + GOV[kk].kind + ', 3달 안에 신청.', 'ev');
    }
  }
  // ---- 사건 ----""")
R("""    if (o.weakAt === undefined) o.weakAt = -9;""","""    if (o.weakAt === undefined) o.weakAt = -9;
    if (!o.gov) o.gov = { open: null, sites: {}, nextAt: o.month + 3, idx: 0 };""")
R("""      weakAt: -9, abil:""","""      weakAt: -9, gov: { open: null, sites: {}, nextAt: 6, idx: 0 }, abil:""")
R("""devEffect: devEffect, eventView: eventView,""","""devEffect: devEffect, eventView: eventView, GOV: GOV, govInfo: govInfo, govApply: govApply, govPact: govPact, govSite: govSite, govDone: govDone, govEligible: govEligible,""")
open('src/engine.js','w').write(s)

u=open('src/ui.js').read()
def U(a,b):
    global u
    assert a in u,a[:80]; u=u.replace(a,b)
# 공모 알림줄
U("""    var bar = $('evBar');""","""    var gb = $('govBar'), gi0 = E.govInfo(S);
    gb.hidden = !gi0;
    if (gi0) gb.textContent = '정부 공모: ' + gi0.G.n + ' · ' + gi0.left + '달 남음 · 신청 가능 ' + gi0.ok.length + '곳';
    var bar = $('evBar');""")
U("""    else if (sheetMode === 'ev') eventSheet(sh);""","""    else if (sheetMode === 'ev') eventSheet(sh);
    else if (sheetMode === 'gov') govSheet(sh);""")
U("""  function realmSheet(sh) {""","""  function govSheet(sh) {
    var gi = E.govInfo(S);
    if (!gi) { sheetMode = 'none'; renderSheet(); return; }
    var G = gi.G;
    var html = '<div class="head"><div><h2>' + esc(G.n) + '</h2><p>정부 공모 · ' + G.kind + ' · ' + gi.left + '달 남음</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="rows"><div class="row"><span>조건</span><span>' + G.cond + '</span></div><div class="row"><span>비용</span><span>' + (G.cost ? money(G.cost) + ' · 결재 1건' : '없음 · 결재 1건') + '</span></div><div class="row"><span>준비</span><span>' + (G.prep ? G.prep + '달' : '즉시') + '</span></div></div>';
    html += '<p class="why"><b class="good">이익</b> ' + G.gain + '<br><b class="warn">부담</b> ' + G.burden + '</p><p class="why">한 동에 정부 사업은 하나뿐이고, 동을 빼앗기면 시설과 부담도 같이 넘어갑니다. 아무도 신청하지 않으면 정부가 다른 세력 동에 배정합니다.</p>';
    if (!gi.ok.length) html += '<p class="err">조건을 채운 우리 동이 없습니다. ' + esc(G.cond) + '.</p>';
    else {
      var list = gi.ok.slice().sort(function (a, b) { return gi.k === 'plant' ? D[a].P - D[b].P : D[b].E + D[b].I - D[a].E - D[a].I; }).slice(0, 6);
      html += '<div class="sec">후보지</div><div class="acts">' + list.map(function (i) {
        var note = gi.k === 'plant' ? '주민 ' + D[i].pop.toLocaleString('ko-KR') + '명 · 민심 ' + Math.round(S.min[i]) : '세수 ' + money(E.taxOf(S, i, E.fullMapOf(S, 0, E.dongsOf(S, 0)))) + '/월 · 민심 ' + Math.round(S.min[i]);
        return '<button class="btn gv" type="button" data-i="' + i + '"' + (S.ap > 0 && S.f[0].money >= G.cost ? '' : ' disabled') + '><b>' + esc(D[i].n) + '</b><br><small>' + note + '</small></button>';
      }).join('') + '</div>';
    }
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    sh.innerHTML = html;
    Array.prototype.forEach.call(sh.querySelectorAll('.gv'), function (b) { b.addEventListener('click', guard(function () { var r = E.govApply(S, +b.dataset.i); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; setNews(S.log[0].t); stampAt(+b.dataset.i, true, '선정'); sheetMode = 'none'; save(); sync(); })); });
  }
  function govBadge(i) {
    var g = E.govSite(S, i); if (!g) return '';
    var G = E.GOV[g.k], building = S.month < g.done;
    var h = '<div class="gov"><b>정부 사업 · ' + esc(G.n.replace(/ (이전|건립|유치)$/, '')) + '</b> ' + (building ? '공사 중, ' + (g.done - S.month) + '달 남음' : '운영 중') + '<br><span>' + G.gain + ' / ' + G.burden + (g.k === 'plant' && g.pact ? ' (협약 완료, 상한 없음)' : '') + '</span>';
    if (g.k === 'plant' && !g.pact && S.owner[i] === 0) h += '<button class="btn" id="govPact" type="button"' + (S.f[0].money >= 80 ? '' : ' disabled') + '>주민협약 맺기 · 80억 · 민심 +10, 상한 해제</button>';
    return h + '</div>';
  }
  function realmSheet(sh) {""")
U("""    var html = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : '')) + typeHTML(d);""","""    var html = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : '')) + typeHTML(d) + govBadge(sel);""")
U("""    bind('guLink', function () { openGu(d.g); });
  }
  function realmSheet""".replace("  function realmSheet","").strip("\n") if False else """    sh.innerHTML = html;
    bind('guLink', function () { openGu(d.g); });""","""    sh.innerHTML = html;
    bind('guLink', function () { openGu(d.g); });
    bind('govPact', guard(function () { var r = E.govPact(S, sel); if (r.err) { errMsg = r.err; } else setNews(S.log[0].t); save(); sync(); }));""")
U("""    var html = headHTML(d, sub) + typeHTML(d);
    if (!p.route) {""","""    var html = headHTML(d, sub) + typeHTML(d) + govBadge(sel);
    if (!p.route) {""")
U("""  $('evBar').addEventListener(""","""  $('govBar').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; errMsg = ''; sheetMode = sheetMode === 'gov' ? 'none' : 'gov'; renderSheet(); dirty(); });
  $('evBar').addEventListener(""")
U("""<li>크게 지고 나면""","""<li>몇 달마다 정부 공모가 열립니다. 공공기관은 오래 벌고, 공공병원은 민심을 지키고, 자원회수시설은 당장 돈을 주는 대신 민심을 깎습니다. 신청하지 않으면 다른 세력이 받습니다. 효과는 게임용으로 지어낸 것입니다.</li><li>크게 지고 나면""")
open('src/ui.js','w').write(u)
t=open('src/index.tpl.html').read()
a="""    <button id="evBar" type="button" hidden></button>"""; assert a in t
t=t.replace(a,"""    <button id="govBar" type="button" hidden></button>
    <button id="evBar" type="button" hidden></button>""")
a="#evBar{"; assert a in t
t=t.replace(a,"#govBar{background:#E5EEF6;border:0;border-top:2px solid var(--ink);padding:8px max(16px,env(safe-area-inset-right,0px)) 8px max(16px,env(safe-area-inset-left,0px));font-weight:700;font-size:14px;text-align:left;color:#1B4C78;width:100%;min-height:40px}\n.gov{margin-top:8px;padding:8px 10px;background:#EEF3F8;border-left:3px solid #2F6DB5;font-size:13.5px;line-height:1.45}\n.gov span{color:var(--mute);font-size:12.5px}\n.gov .btn{width:100%;margin-top:6px;min-height:40px;font-size:13.5px}\n.good{color:var(--good)}\n.gv{text-align:left}\n.gv small{font-weight:400;color:var(--mute)}\n#evBar{")
open('src/index.tpl.html','w').write(t)
