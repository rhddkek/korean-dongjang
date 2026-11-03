s=open('src/engine.js').read()
def R(a,b):
    global s
    assert a in s,a[:70]; s=s.replace(a,b)
R("""  var RIVAL_LINES = [""","""  // 시작 동 유형별 대표 능력 (시작 동 유형에만 붙고 한 판 내내 유지)
  var ABIL = {
    office: { n: '스카우트 제안', t: '옆 세력 인원을 돈으로 데려옵니다', how: '맞닿은 세력의 동을 눌러 제안. 그 세력 인원의 20%가 우리 쪽으로 옵니다. 1명당 1.6억, 같은 세력에는 6개월에 한 번. 결재 1건.' },
    town: { n: '주민투표', t: '옆 독립 동을 투표로 합류시킵니다', how: '맞닿은 독립 동을 눌러 발의. 우리 동 전체 민심 평균 70 이상이어야 하고, 다음 달에 합류합니다. 돈은 안 들지만 결재 1건. 한 번에 하나만.' },
    station: { n: '급행 원정', t: '이번 달 지하철 기습 거리를 7km로 늘립니다', how: '세력 화면에서 켭니다. 이번 달 보낸 인원은 한 달 늦게 돌아오고, 비용은 세수의 절반.' },
    other: { n: '반상회 소집', t: '동네 전체 민심을 한 번에 올립니다', how: '세력 화면에서 소집. 우리 동 전체 민심 +20, 비용은 한 달 세수. 8개월에 한 번.' }
  };
  var PROJECTS = {
    unity: { n: '구민 화합 사업', t: '한 구의 우리 동 민심을 100으로 올리고 6개월간 독립을 막습니다' },
    express: { n: '광역 급행 사업', t: '역이 있는 우리 동의 기습 거리를 영구히 6km로 늘립니다 (한 판에 한 번)' }
  };
  var RIVAL_LINES = [""")
R("""      ev: null, evUsed: [], nextEv: 4 + Math.floor((seed >>> 3) % 3), rival: -1, rivalAt: 0
    };""","""      ev: null, evUsed: [], nextEv: 4 + Math.floor((seed >>> 3) % 3), rival: -1, rivalAt: 0,
      abil: abilityOf(data.d[start].type), scoutAt: {}, vote: null, express: -1, rallyAt: -99, stable: {}, exprProj: false, rivalPlan: null, awayLate: 0
    };""")
R("""  function addFaction(s, cap, troops) {""","""  function abilityOf(type) { return ABIL[type] ? type : 'other'; }
  function addFaction(s, cap, troops) {""")
R("""    s.f.push({ id: id, name: stem(D.d[cap].n) + ' ' + g, grp: g, cap: cap, money: 50, troops: troops, away: 0, ai: true, alive: true, c: id, grudge: 0, tookMine: 0 });""","""    s.f.push({ id: id, name: stem(D.d[cap].n) + ' ' + g, grp: g, cap: cap, money: 50, troops: troops, away: 0, ai: true, alive: true, c: id, grudge: 0, tookMine: 0, lostAt: -9 });""")
# 지하철 거리: 4km 기본, 급행 시 확장
R("""    SUBWAY = data.d.map(function () { return []; });
    var subs = [];
    data.d.forEach(function (d, i) { if (d.sub > 0) subs.push(i); });
    subs.forEach(function (i) {
      subs.forEach(function (j) {
        if (i === j || data.d[i].a.indexOf(j) >= 0) return;
        var dx = data.d[i].x - data.d[j].x, dy = data.d[i].y - data.d[j].y;
        if (dx * dx + dy * dy <= 400 * 400) SUBWAY[i].push(j);
      });
    });""","""    SUBWAY = data.d.map(function () { return []; }); SUBWAY6 = data.d.map(function () { return []; }); SUBWAY7 = data.d.map(function () { return []; });
    var subs = [];
    data.d.forEach(function (d, i) { if (d.sub > 0) subs.push(i); });
    subs.forEach(function (i) {
      subs.forEach(function (j) {
        if (i === j || data.d[i].a.indexOf(j) >= 0) return;
        var dx = data.d[i].x - data.d[j].x, dy = data.d[i].y - data.d[j].y, q = dx * dx + dy * dy;
        if (q <= 400 * 400) SUBWAY[i].push(j);
        if (q <= 600 * 600) SUBWAY6[i].push(j);
        if (q <= 700 * 700) SUBWAY7[i].push(j);
      });
    });""")
R("""  var D = null, SUBWAY = null,""","""  var D = null, SUBWAY = null, SUBWAY6 = null, SUBWAY7 = null,""")
R("""    var tOwner = s.owner[t];
    if (d.sub > 0 && !(tOwner >= 0 && s.f[tOwner].cap === t)) SUBWAY[t].forEach(function (j) { if (s.owner[j] === fid) consider(j, 'subway', TYPES[D.d[j].type].subway ? 0 : -0.2); });""","""    var tOwner = s.owner[t];
    var net = fid === 0 ? (s.express === s.month ? SUBWAY7 : s.exprProj ? SUBWAY6 : SUBWAY) : SUBWAY;
    if (d.sub > 0 && !(tOwner >= 0 && s.f[tOwner].cap === t)) net[t].forEach(function (j) { if (s.owner[j] === fid) consider(j, 'subway', TYPES[D.d[j].type].subway ? 0 : -0.2); });""")
# 출동 복귀 지연(급행)
R("""      res.lost = Math.round(lost);
      att.troops -= n;
      att.away = (att.away || 0) + n - lost;
      capture(s, fid, t, res);""","""      res.lost = Math.round(lost);
      att.troops -= n;
      if (fid === 0 && s.express === s.month) s.awayLate = (s.awayLate || 0) + n - lost; else att.away = (att.away || 0) + n - lost;
      capture(s, fid, t, res);""")
R("""      res.lost = Math.round(lost);
      att.troops -= n;
      att.away = (att.away || 0) + n - lost;
      if (o >= 0) s.f[o].troops""","""      res.lost = Math.round(lost);
      att.troops -= n;
      if (fid === 0 && s.express === s.month) s.awayLate = (s.awayLate || 0) + n - lost; else att.away = (att.away || 0) + n - lost;
      if (o >= 0) s.f[o].troops""")
# 경제: 관리비, 독립
R("""  function upkeep(n) { return n <= 1 ? 0 : 1.6 * Math.pow(n, 1.3); }""","""  function upkeep(n) { return n <= 1 ? 0 : 1.6 * Math.pow(n, 1.3) + (n > 30 ? 0.9 * Math.pow(n - 30, 1.5) : 0); }""")
R("""      if (s.min[i] < 40 && s.f[0].cap !== i && rnd(s) < 0.03) {""","""      if (s.min[i] < 40 && s.f[0].cap !== i && !(s.stable && s.stable[D.d[i].g] > s.month) && rnd(s) < (s.min[i] < 25 ? 0.12 : 0.06)) {""")
R("""    me.troops += me.away || 0; me.away = 0;   // 출동 인원은 AI 턴이 끝난 뒤 복귀""","""    me.troops += me.away || 0; me.away = s.awayLate || 0; s.awayLate = 0;   // 출동 인원은 AI 턴이 끝난 뒤 복귀, 급행은 한 달 더
    tickVote(s); tickRivalPlan(s);""")
# 능력/사업 함수
R("""  // ---- 사건 ----""","""  // ---- 시작 유형 능력 ----
  function avgMood(s) { var l = dongsOf(s, 0), t = 0; l.forEach(function (i) { t += s.min[i]; }); return l.length ? t / l.length : 0; }
  function scoutInfo(s, t) {
    var o = s.owner[t];
    if (s.abil !== 'office') return { ok: false, why: '오피스 타운 출신만 할 수 있습니다.' };
    if (o <= 0) return { ok: false, why: '세력이 가진 동이어야 합니다.' };
    if (!D.d[t].a.some(function (j) { return s.owner[j] === 0; })) return { ok: false, why: '우리 땅과 붙어 있어야 합니다.' };
    if ((s.scoutAt[o] || -99) + 6 > s.month) return { ok: false, why: '이 세력에는 ' + (s.scoutAt[o] + 6 - s.month) + '달 뒤 다시 제안할 수 있습니다.' };
    var gain = Math.round(Math.min(s.f[o].troops * 0.2, 400 + s.month * 20));
    if (gain < 10) return { ok: false, why: '데려올 인원이 거의 없습니다.' };
    var cost = Math.round(gain * 1.6);
    return { ok: s.ap > 0 && s.f[0].money >= cost, gain: gain, cost: cost, why: s.ap <= 0 ? '이번 달 결재를 다 썼습니다.' : s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function scout(s, t) {
    var i = scoutInfo(s, t);
    if (!i.ok) return { err: i.why };
    var o = s.owner[t];
    s.f[0].money -= i.cost; s.ap--; s.f[o].troops -= i.gain; s.f[0].troops += i.gain; s.scoutAt[o] = s.month; s.f[o].grudge = s.month + 3;
    s.stat.abil = (s.stat.abil || 0) + 1;
    pushLog(s, s.f[o].name + ' 회원 ' + i.gain + '명이 조건을 듣고 우리 쪽으로 왔습니다.', 'good');
    return { ok: true, gain: i.gain };
  }
  function voteInfo(s, t) {
    if (s.abil !== 'town') return { ok: false, why: '대단지 출신만 할 수 있습니다.' };
    if (s.owner[t] !== -1) return { ok: false, why: '독립 동이어야 합니다.' };
    if (!D.d[t].a.some(function (j) { return s.owner[j] === 0 && !D.d[t]._river[j]; })) return { ok: false, why: '한강 없이 붙어 있는 우리 동이 있어야 합니다.' };
    if (s.vote) return { ok: false, why: D.d[s.vote.t].n + ' 투표가 진행 중입니다.' };
    var m = avgMood(s);
    if (m < 70) return { ok: false, why: '우리 동 민심 평균이 70은 돼야 합니다 (지금 ' + Math.round(m) + ').' };
    if (s.ap <= 0) return { ok: false, why: '이번 달 결재를 다 썼습니다.' };
    return { ok: true, why: '' };
  }
  function vote(s, t) {
    var i = voteInfo(s, t);
    if (!i.ok) return { err: i.why };
    s.ap--; s.vote = { t: t, m: s.month };
    pushLog(s, D.d[t].n + ' 주민투표를 발의했습니다. 다음 달 결과가 나옵니다.');
    return { ok: true };
  }
  function tickVote(s) {
    if (!s.vote) return;
    var t = s.vote.t; s.vote = null;
    if (s.owner[t] !== -1) { pushLog(s, D.d[t].n + ' 투표가 무산됐습니다. 그사이 주인이 바뀌었습니다.', 'bad'); return; }
    if (avgMood(s) < 60) { pushLog(s, D.d[t].n + ' 투표가 부결됐습니다. 우리 동네 민심이 흔들렸습니다.', 'bad'); return; }
    s.owner[t] = 0; s.min[t] = 85; s.stat.took++; s.stat.talked++; s.stat.abil = (s.stat.abil || 0) + 1;
    pushLog(s, D.d[t].n + ' 주민투표 가결. 평화롭게 합류했습니다.', 'good');
    afterChange(s);
  }
  function expressInfo(s) {
    if (s.abil !== 'station') return { ok: false, why: '역세권 출신만 할 수 있습니다.' };
    if (s.express === s.month) return { ok: false, why: '이번 달 이미 켰습니다.' };
    var cost = Math.round(Math.max(20, economy(s, 0).tax * 0.5));
    return { ok: s.f[0].money >= cost, cost: cost, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function express(s) {
    var i = expressInfo(s);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.express = s.month; s.stat.abil = (s.stat.abil || 0) + 1;
    pushLog(s, '급행 원정. 이번 달 기습 거리 7km, 출동 인원은 두 달 뒤 복귀합니다.');
    return { ok: true };
  }
  function rallyInfo(s) {
    if (s.abil !== 'other') return { ok: false, why: '' };
    if (s.rallyAt + 8 > s.month) return { ok: false, why: (s.rallyAt + 8 - s.month) + '달 뒤 다시 소집할 수 있습니다.' };
    var cost = Math.round(Math.max(20, economy(s, 0).tax));
    return { ok: s.f[0].money >= cost, cost: cost, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function rally(s) {
    var i = rallyInfo(s);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.rallyAt = s.month; s.stat.abil = (s.stat.abil || 0) + 1;
    dongsOf(s, 0).forEach(function (j) { s.min[j] = Math.min(100, s.min[j] + 20); });
    pushLog(s, '반상회 소집. 국수를 돌렸더니 동네 민심이 올랐습니다.', 'good');
    return { ok: true };
  }
  // ---- 대형 사업 ----
  function unityInfo(s, g) {
    var mine = GUDONGS[g].filter(function (i) { return s.owner[i] === 0; });
    if (!mine.length) return { ok: false, why: '이 구에 우리 동이 없습니다.' };
    if (s.stable[g] > s.month) return { ok: false, why: '이미 진행 중입니다. ' + (s.stable[g] - s.month) + '달 남음.' };
    var cost = 60 + mine.length * 25;
    return { ok: s.f[0].money >= cost, cost: cost, n: mine.length, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function unity(s, g) {
    var i = unityInfo(s, g);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.stable[g] = s.month + 6; s.stat.proj = (s.stat.proj || 0) + 1;
    GUDONGS[g].forEach(function (j) { if (s.owner[j] === 0) s.min[j] = 100; });
    pushLog(s, D.gu[g].n + ' 구민 화합 사업. 민심이 가득 찼고 6개월간 독립 걱정이 없습니다.', 'good');
    return { ok: true };
  }
  function exprProjInfo(s) {
    if (s.exprProj) return { ok: false, why: '이미 완료한 사업입니다.' };
    var cost = 400 + dongsOf(s, 0).length * 10;
    return { ok: s.f[0].money >= cost, cost: cost, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function exprProj(s) {
    var i = exprProjInfo(s);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.exprProj = true; s.stat.proj = (s.stat.proj || 0) + 1;
    pushLog(s, '광역 급행 사업 완료. 역이 있는 우리 동의 기습 거리가 6km가 됐습니다.', 'good');
    return { ok: true };
  }
  // ---- 숙적 작전 ----
  function weakBorder(s, fid) {
    var best = -1, bv = 1e9;
    dongsOf(s, fid).forEach(function (i) {
      D.d[i].a.forEach(function (j) {
        if (s.owner[j] !== 0) return;
        var r = route(s, fid, j); if (!r) return;
        var d = defense(s, j).total / (1 + r.mult);
        if (d < bv) { bv = d; best = j; }
      });
    });
    return best < 0 ? null : { t: best, need: bv };
  }
  function tickRivalPlan(s) {
    s.rivalPlan = null;
    if (s.rival < 0 || !s.f[s.rival].alive || s.month <= C.GRACE) return;
    var f = s.f[s.rival];
    if (s.f[0].pact && s.f[0].pact[f.id] > s.month) return;
    var w = weakBorder(s, f.id);
    if (!w) return;
    var exposed = (s.f[0].away || 0) > s.f[0].troops;
    if (f.troops * 0.8 >= w.need * 1.25 || exposed) {
      s.rivalPlan = { t: w.t, f: f.id };
      pushLog(s, f.name + ' 회원들이 ' + D.d[w.t].n + ' 쪽에 모이고 있습니다.' + (exposed ? ' 우리 인원이 많이 나가 있는 걸 알아챘습니다.' : ''), 'riv');
    }
  }
  // ---- 사건 ----""")
# AI 턴: 본거지 위협 시 방어, 패배 후 자제, 숙적 계획 실행
R("""    var tries = Math.max(1, Math.min(3, 1 + Math.floor(list.length / 12)) + tr.tries);""","""    var tries = Math.max(1, Math.min(3, 1 + Math.floor(list.length / 12)) + tr.tries);
    // 본거지가 위협받으면 확장을 멈추고 지킨다
    var capDef = defense(s, f.cap).total, threat = 0;
    D.d[f.cap].a.forEach(function (j) { var o = s.owner[j]; if (o >= 0 && o !== f.id) threat = Math.max(threat, s.f[o].troops + (o === 0 ? s.f[o].away || 0 : 0)); });
    if (threat * 0.8 > capDef) { f.troops += Math.max(0, f.money) * C.RECRUIT * 0.5; f.money *= 0.5; tries = 0; }
    if (f.lostAt + 1 >= s.month) tries = Math.min(tries, 1);
    // 숙적 작전: 예고한 동을 친다
    if (tries > 0 && s.rivalPlan && s.rivalPlan.f === f.id && s.owner[s.rivalPlan.t] === 0 && !(s.f[0].pact && s.f[0].pact[f.id] > s.month)) {
      var pt = s.rivalPlan.t, pr = route(s, f.id, pt);
      if (pr) {
        var pdef = defense(s, pt).total, pn = Math.min(f.troops * 0.85, pdef * 1.6 / (1 + pr.mult));
        var pres = resolve(s, f.id, pt, pn, pr);
        tries--;
        if (pres.win) { s.stat.lost++; f.tookMine = (f.tookMine || 0) + 1; pushLog(s, f.name + '의 작전. ' + J(D.d[pt].n, '을', '를') + ' 빼앗겼습니다.', 'bad'); if (pres.movedCap !== undefined) pushLog(s, '본거지를 ' + ro(D.d[pres.movedCap].n) + ' 옮겼습니다.', 'bad'); }
        else { f.lostAt = s.month; pushLog(s, J(D.d[pt].n, '이', '가') + ' ' + f.name + '의 작전을 막아냈습니다.', 'good'); }
      }
      s.rivalPlan = null;
    }""")
R("""        } else pushLog(s, J(D.d[bestT].n, '이', '가') + ' ' + f.name + '의 공격을 막아냈습니다.', 'good');""","""        } else { f.lostAt = s.month; pushLog(s, J(D.d[bestT].n, '이', '가') + ' ' + f.name + '의 공격을 막아냈습니다.', 'good'); }""")
# migrate
R("""    if (o.rivalAt === undefined) o.rivalAt = o.month;""","""    if (o.rivalAt === undefined) o.rivalAt = o.month;
    if (!o.abil) o.abil = abilityOf(D.d[o.start].type);
    if (!o.scoutAt) o.scoutAt = {}; if (o.vote === undefined) o.vote = null; if (o.express === undefined) o.express = -1; if (o.rallyAt === undefined) o.rallyAt = -99;
    if (!o.stable) o.stable = {}; if (o.exprProj === undefined) o.exprProj = false; if (o.rivalPlan === undefined) o.rivalPlan = null; if (o.awayLate === undefined) o.awayLate = 0;
    o.f.forEach(function (f) { if (f.ai && f.lostAt === undefined) f.lostAt = -9; });""")
R("""devEffect: devEffect, eventView: eventView,""","""devEffect: devEffect, eventView: eventView, ABIL: ABIL, PROJECTS: PROJECTS, abilityOf: abilityOf, avgMood: avgMood,
    scoutInfo: scoutInfo, scout: scout, voteInfo: voteInfo, vote: vote, expressInfo: expressInfo, express: express, rallyInfo: rallyInfo, rally: rally,
    unityInfo: unityInfo, unity: unity, exprProjInfo: exprProjInfo, exprProj: exprProj,""")
open('src/engine.js','w').write(s)
