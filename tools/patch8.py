s=open('src/engine.js').read()
def R(a,b,n=1):
    global s
    assert s.count(a)>=1,a[:80]; s=s.replace(a,b)
# ---- 시설 이름과 특수 효과 ----
R("""  var ABIL = {""","""  // 개발 단계마다 이름 붙은 시설. 3단계·5단계에는 주변까지 미치는 효과가 있다.
  var FAC = [
    ['골목시장', '상점가 간판 정비', '상인회 사무소', '전통시장 현대화', '상권 특구'],
    ['마을버스 노선', '공영주차장', '공유 자전거 거치대', '광역버스 정류장', '환승센터'],
    ['경로당', '놀이터·공원', '주민센터 증축', '청년 주택', '아파트 단지'],
    ['방범대', '방범 순찰차', '자치경찰대', '자치경찰 상황실', '자치소방서']
  ];
  var FAC_SP = [
    { 5: '옆 우리 동 세수 +10%' },
    { 5: '이 동에서 나가는 공격 전력 +15% 추가' },
    { 5: '옆 우리 동 동원 +10%' },
    { 3: '옆 우리 동 방어 +15%', 5: '이 동과 옆 우리 동은 독립하지 않음, 민심 회복 +5' }
  ];
  function facName(s, i, t, l) { var n = FAC[t][l - 1]; return t === 3 && l === 1 ? stem(D.d[i].n) + ' ' + n : n; }
  function nbLv(s, i, t, minLv) { var o = s.owner[i]; if (o < 0) return 0; var c = 0; D.d[i].a.forEach(function (j) { if (s.owner[j] === o && s.dev[j * 4 + t] >= minLv) c++; }); return c; }
  var ABIL = {""")
R("""    var v = (d.tax * (T.tax || 1) + lv(s, i, 0) * 7 * (T.devx || 1)) * mood(s, i);""","""    var v = (d.tax * (T.tax || 1) + lv(s, i, 0) * 7 * (T.devx || 1)) * mood(s, i) * (1 + 0.1 * Math.min(2, nbLv(s, i, 0, 5)));""")
R("""    var v = (d.draft * (T.draft || 1) + lv(s, i, 2) * 6 * (T.devx || 1)) * mood(s, i);""","""    var v = (d.draft * (T.draft || 1) + lv(s, i, 2) * 6 * (T.devx || 1)) * mood(s, i) * (1 + 0.1 * Math.min(2, nbLv(s, i, 2, 5)));""")
R("""    var base = d.base * (TYPES[d.type].def || 1) * (1 + 0.35 * lv(s, i, 3)) * (0.6 + 0.4 * s.min[i] / 100);""","""    var base = d.base * (TYPES[d.type].def || 1) * (1 + 0.35 * lv(s, i, 3)) * (0.6 + 0.4 * s.min[i] / 100) * (1 + 0.15 * Math.min(2, nbLv(s, i, 3, 3)));""")
R("""      var m = mult + lv(s, src, 1) * 0.07 + sd.I * 0.001;""","""      var m = mult + lv(s, src, 1) * 0.07 + sd.I * 0.001 + (lv(s, src, 1) >= 5 ? 0.15 : 0);""")
# 급행 원정 재설계: 거리 대신 템포 (생존 인원 즉시 복귀, 기습 +15%)
R("""station: { n: '급행 원정', t: '이번 달 지하철 기습이 6km까지, 불이익 없이 나갑니다', how: '세력 화면에서 켭니다. 비용은 한 달 세수의 절반, 3개월에 한 번. 본거지는 여전히 기습할 수 없습니다.' },""","""station: { n: '급행 원정', t: '이번 달 지하철 기습을 연달아 나갑니다', how: '세력 화면에서 켭니다. 이번 달 지하철 기습은 전력 +15%, 살아남은 인원이 바로 돌아와 같은 달에 또 나갈 수 있습니다. 비용은 한 달 세수의 절반, 3개월에 한 번. 거리는 그대로입니다.' },""")
R("""    var exp = fid === 0 && s.express === s.month, net = fid === 0 ? (exp ? SUBWAY6 : s.exprProj ? SUBWAY7 : SUBWAY) : SUBWAY;
    if (d.sub > 0 && !(tOwner >= 0 && s.f[tOwner].cap === t)) net[t].forEach(function (j) { if (s.owner[j] === fid) consider(j, 'subway', exp || TYPES[D.d[j].type].subway ? 0 : -0.2); });""","""    var exp = fid === 0 && s.express === s.month, net = fid === 0 && s.exprProj ? SUBWAY7 : SUBWAY;
    if (d.sub > 0 && !(tOwner >= 0 && s.f[tOwner].cap === t)) net[t].forEach(function (j) { if (s.owner[j] === fid) consider(j, 'subway', (TYPES[D.d[j].type].subway ? 0 : -0.2) + (exp ? 0.15 : 0)); });""")
R("""      res.lost = Math.round(lost);
      att.troops -= n;
      att.away = (att.away || 0) + n - lost;
      capture(s, fid, t, res);""","""      res.lost = Math.round(lost);
      att.troops -= n;
      if (fid === 0 && s.express === s.month && r.via === 'subway') { att.troops += n - lost; res.quick = 1; } else att.away = (att.away || 0) + n - lost;
      capture(s, fid, t, res);""")
R("""      res.lost = Math.round(lost);
      att.troops -= n;
      att.away = (att.away || 0) + n - lost;
      if (o >= 0) s.f[o].troops""","""      res.lost = Math.round(lost);
      att.troops -= n;
      if (fid === 0 && s.express === s.month && r.via === 'subway') { att.troops += n - lost; res.quick = 1; } else att.away = (att.away || 0) + n - lost;
      if (o >= 0) s.f[o].troops""")
R("""    pushLog(s, '급행 원정. 이번 달 지하철 기습은 6km까지, 전력 불이익 없이 나갑니다.');""","""    pushLog(s, '급행 원정. 이번 달 지하철 기습은 전력 +15%, 살아남은 인원이 바로 돌아옵니다.');""")
R("""  function express(s) {""","""  function raidTargets(s) {
    var seen = {}, n = 0, net = s.exprProj ? SUBWAY7 : SUBWAY;
    dongsOf(s, 0).forEach(function (i) { net[i].forEach(function (j) { var o = s.owner[j]; if (seen[j] || o === 0 || (o >= 0 && s.f[o].cap === j) || D.d[i].a.indexOf(j) >= 0) return; seen[j] = 1; n++; }); });
    return n;
  }
  function express(s) {""")
# 공격 결과 문구: 급행 즉시 복귀, 0개 동 문장 생략, 크게 진 순간 기록
R("""      pushLog(s, d.n + ' 접수. ' + r.lost + '명이 집에 갔고, ' + r.back + '명은 다음 달 복귀합니다.', 'good');
      if (r.collapse) pushLog(s, r.collapse.name + ' 본거지 함락. ' + r.collapse.joined + '개 동이 우리에게 넘어왔습니다.', 'good');
    } else {
      pushLog(s, d.n + ' 공격 실패. ' + r.lost + '명이 집에 갔고, ' + r.back + '명은 다음 달 복귀합니다.', 'bad');""","""      pushLog(s, d.n + ' 접수. ' + r.lost + '명이 집에 갔고, ' + r.back + (r.quick ? '명은 급행으로 바로 돌아왔습니다.' : '명은 다음 달 복귀합니다.'), 'good');
      if (r.collapse) pushLog(s, collapseText(r.collapse), 'good');
    } else {
      pushLog(s, d.n + ' 공격 실패. ' + r.lost + '명이 집에 갔고, ' + r.back + (r.quick ? '명은 급행으로 바로 돌아왔습니다.' : '명은 다음 달 복귀합니다.'), 'bad');
      if (r.lost >= 120 && s.f[0].troops < r.lost) { s.weakAt = s.month; s.weakDong = t; }""")
R("""  function devCost(s, i, t) {""","""  function collapseText(c) { return c.name + ' 본거지 함락.' + (c.joined ? ' ' + c.joined + '개 동이 우리에게 넘어왔습니다.' : ' 남은 동들은 독립했습니다.'); }
  function devCost(s, i, t) {""")
R("""    collapsed.forEach(function (c) { pushLog(s, c.name + ' 본거지 함락. ' + c.joined + '개 동이 우리에게 넘어왔습니다.', 'good'); });""","""    collapsed.forEach(function (c) { pushLog(s, collapseText(c), 'good'); });
    if (fail >= 2 && s.f[0].troops < home) { s.weakAt = s.month; }""")
# 구 작전: 개별 공격과 같은 계산, 대상 1곳이면 결재 1건
R("""      out.push({ i: i, need: Math.ceil(needFor(s, i, 0.8) * 1.1), cost: persuadeCost(s, i) });""","""      out.push({ i: i, need: needFor(s, i, 0.8), cost: persuadeCost(s, i) });""")
R("""    return { count: t.length, limit: lim, n: c, need: sum, can: can, names: names, left: s.f[0].troops - sum, lack: (t[0] ? t[0].need : 0) };""","""    return { count: t.length, limit: lim, n: c, need: sum, can: can, names: names, left: s.f[0].troops - sum, lack: (t[0] ? t[0].need : 0), ap: can <= 1 ? 1 : C.GU_COST[s.rank] };""")
R("""    var apCost = C.GU_COST[s.rank];
    if (s.ap < apCost) return { err: '결재 ' + apCost + '건이 필요합니다.' };
    var lim = guLimit(s),""","""    var pv = guAttackPreview(s, g, reserve), apCost = pv.ap;
    if (s.ap < apCost) return { err: '결재 ' + apCost + '건이 필요합니다.' };
    var lim = Math.max(1, pv.can),""")
R("""    var t = guTargets(s, g, true).sort(function (a, b) { return a.cost - b.cost; }).slice(0, guLimit(s)), sum = 0, can = 0;
    t.forEach(function (x) { if (sum + x.cost <= s.f[0].money) { sum += x.cost; can++; } });
    return { n: can, cost: sum, count: t.length };""","""    var t = guTargets(s, g, true).sort(function (a, b) { return a.cost - b.cost; }).slice(0, guLimit(s)), sum = 0, can = 0, names = [];
    t.forEach(function (x) { if (sum + x.cost <= s.f[0].money) { sum += x.cost; can++; names.push(D.d[x.i].n); } });
    return { n: can, cost: sum, count: t.length, names: names };""")
# 자치소방서: 독립 방지
R("""      if (s.min[i] < 40 && s.f[0].cap !== i && !(s.stable && s.stable[D.d[i].g] > s.month) && rnd(s) < (s.min[i] < 25 ? 0.12 : 0.06)) {""","""      if (s.min[i] < 40 && s.f[0].cap !== i && !(s.stable && s.stable[D.d[i].g] > s.month) && lv(s, i, 3) < 5 && !nbLv(s, i, 3, 5) && rnd(s) < (s.min[i] < 25 ? 0.12 : 0.06)) {""")
R("""      var heal = 5 + lv(s, i, 3) * 2 + (TYPES[D.d[i].type].heal || 0);""","""      var heal = 5 + lv(s, i, 3) * 2 + (TYPES[D.d[i].type].heal || 0) + (lv(s, i, 3) >= 5 ? 5 : 0);""")
# 숙적: 크게 무너진 틈을 노린다
R("""    var tries = Math.max(1, Math.min(3, 1 + Math.floor(list.length / 12)) + tr.tries);""","""    var tries = Math.max(1, Math.min(3, 1 + Math.floor(list.length / 12)) + tr.tries);
    var touching = list.some(function (i) { return D.d[i].a.some(function (j) { return s.owner[j] === 0; }); });
    var pounce = touching && s.weakAt === s.month - 1 && s.month > C.GRACE && (f.id === s.rival || GROUP_TRAIT[f.grp] === 'fight') && !(s.f[0].pact && s.f[0].pact[f.id] > s.month);
    if (pounce) {
      tries += 1;
      var wb = weakBorder(s, f.id);
      if (wb && f.troops * 0.8 >= wb.need * 1.2) pushLog(s, f.name + '이 우리가 무너진 틈을 노립니다.', 'riv');
      else if (f.id === s.rival) { f.troops += Math.max(0, f.money) * C.RECRUIT; f.money = 0; pushLog(s, f.name + '이 칠 힘은 없어 본거지 문을 걸어 잠그고 인원을 모읍니다.', 'riv'); pounce = false; }
    }""")
R("""            if (rnd(s) < 0.58) continue;""","""            if (!pounce && rnd(s) < 0.58) continue;""")
R("""          var val = D.d[t2].P + D.d[t2].E + 10;""","""          var val = D.d[t2].P + D.d[t2].E + 10;
          if (pounce && o === 0) val *= 2.5;""")
R("""    if (o.rivalAt === undefined) o.rivalAt = o.month;""","""    if (o.rivalAt === undefined) o.rivalAt = o.month;
    if (o.weakAt === undefined) o.weakAt = -9;""")
R("""      abil: abilityOf(data.d[start].type),""","""      weakAt: -9, abil: abilityOf(data.d[start].type),""")
R("""devEffect: devEffect, eventView: eventView,""","""devEffect: devEffect, eventView: eventView, FAC: FAC, FAC_SP: FAC_SP, facName: facName, raidTargets: raidTargets, collapseText: collapseText,""")
open('src/engine.js','w').write(s)
