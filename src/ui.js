(function () {
  'use strict';
  // ---- 도시 고르기: 주소 #city=… > 마지막에 고른 도시 > 서울 ----
  var CITY_GROUPS = [['광역', [['seoul', '서울'], ['busan', '부산'], ['daegu', '대구'], ['incheon', '인천'], ['gwangju', '광주'], ['daejeon', '대전'], ['ulsan', '울산']]],
    ['도', [['gyeonggi', '경기'], ['gangwon', '강원'], ['chungbuk', '충북'], ['chungnam', '충남'], ['jeonbuk', '전북'], ['gyeongbuk', '경북'], ['gyeongnam', '경남'], ['jeju', '제주']]],
    ['통합', [['daegyeong', '대구경북'], ['gyeongsang', '경상도'], ['jeonnam', '전남광주'], ['jeolla', '전라도'], ['korea', '전국']]]];
  // 가벼운 판(서울만 담은 파일)에서는 데이터가 든 지도만 보여 줌
  CITY_GROUPS = CITY_GROUPS.map(function (g) { return [g[0], g[1].filter(function (c) { return document.getElementById('data-' + c[0]); })]; }).filter(function (g) { return g[1].length; });
  var CITY_LIST = [].concat.apply([], CITY_GROUPS.map(function (g) { return g[1]; }));
  function cityPref() {
    var m = /city=(\w+)/.exec(location.hash || '');
    if (m && document.getElementById('data-' + m[1])) return m[1];
    try { var c = localStorage.getItem('dongjang-city'); if (c && document.getElementById('data-' + c)) return c; } catch (e) {}
    return 'seoul';
  }
  var CITY_ID = cityPref();
  var DATA = JSON.parse(document.getElementById('data-' + CITY_ID).textContent);
  var CNAME = DATA.cname || '서울', WATER = DATA.city ? DATA.water : '한강';
  Engine.setCity({ id: CITY_ID, name: CNAME, water: WATER, r2: CITY_ID === 'seoul' ? 4 : Math.min(10, Math.max(2, Math.round(DATA.gu.length / 4))), mode: DATA.mode });
  Engine.setData(DATA);
  var E = Engine, D = DATA.d, GU = DATA.gu, SEOUL = CITY_ID === 'seoul';
  var MAYOR = E.C.RANKS[3], RANK2 = E.C.RANKS[2], R2 = E.C.R2;
  // 모드별 이름: 묶음(구/시군/시군구/시도), 중간 직급, 칸 이름(전국은 '지역')
  var KIND = E.C.KIND, NATION = KIND === 'nation', GRP = E.C.GRP, R1N = E.C.RANKS[1], UNITN = E.C.UNIT;
  var R1S = KIND === 'metro' ? '구청장' : NATION ? '시도지사' : '단체장', R2S = RANK2.split(' ').pop();
  var HAS_SUB = D.some(function (d) { return d.sub > 0; });
  function tx(t) { if (!NATION) return t; return String(t).replace(/지하철/g, 'KTX').replace(/(^|[\s(>·'"“])동(?=$|[^가-힣]|[을를이가은는에의도만과와으까들])/g, '$1지역'); }
  function hd(n) { return E.headOf(n); }
  function Jm(w, a, b) { return E.J(w, a, b); }
  var SAVE_KEY = SEOUL ? 'dongjang-save-v1' : 'dongjang-save-' + CITY_ID + '-v1';
  var BEST_KEY = SEOUL ? 'dongjang-best-v1' : 'dongjang-best-' + CITY_ID + '-v1';
  function switchCity(id) {
    if (id === CITY_ID) return;
    try { localStorage.setItem('dongjang-city', id); } catch (e) {}
    try { history.replaceState(null, '', '#city=' + id); } catch (e) { location.hash = 'city=' + id; }
    location.reload();
  }
  function hasSave(id) { try { var t = localStorage.getItem(id === 'seoul' ? 'dongjang-save-v1' : 'dongjang-save-' + id + '-v1'); if (!t) return false; var o = JSON.parse(t); return !o.over && !o.won; } catch (e) { return false; } }
  var $ = function (id) { return document.getElementById(id); };
  var WIDE = window.matchMedia ? matchMedia('(min-width:900px),(orientation:landscape) and (min-width:560px)') : { matches: false };
  function isWide() { return WIDE.matches; }
  var lastAct = 0, recDong = null, guReserve = 0.25, blinkTimer = 0;
  function guard(fn) { return function () { var n = Date.now(); if (n - lastAct < 300) return; lastAct = n; fn.apply(this, arguments); }; }
  var lastSheetKey = '', peek = false, zoneSel = null, zp = null, TLS = null, CAL = null, guSel = null, S = null, sel = null, pickSel = null, lens = 0, reach = {}, flash = {}, flashTimer = 0, errMsg = '', sendN = 0, sheetMode = 'none', confirmNew = false;
  var LENS = ['세력', '인구', '경제', '인프라', '생활'], LKEY = [null, 'P', 'E', 'I', 'L'];
  var PAL = ['#D4321F', '#2F6DB5', '#E2A11F', '#2F9B78', '#8257B8', '#CC5C98', '#6F9426', '#1C9FB8', '#B0713A', '#5468D4', '#74889A', '#8F3F73', '#3F7A55', '#D9812F', '#A5952E', '#3D5A80', '#56B096', '#B57FD0', '#8A6D3B', '#4F9BD9'];
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 소리: 파일이 있으면 그 소리, 없으면 짧은 합성음 ----
  var SFX_DATA = /*SFX*/{}/*SFX_END*/;
  var SOUND_KEY = 'dongjang-sound', soundOn = true, actx = null, aud = {};
  try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) {}
  function setSound(on) { soundOn = on; try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch (e) {} }
  function tone(f0, f1, dur, type, vol, delay) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + (delay || 0);
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  var SYNTH = {
    stamp: function () { tone(180, 60, 0.12, 'square', 0.25); tone(90, 40, 0.18, 'triangle', 0.3, 0.02); },
    page: function () { tone(1200, 400, 0.07, 'triangle', 0.08); tone(900, 300, 0.05, 'triangle', 0.05, 0.05); },
    fanfare: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0, 0.18, 'square', 0.12, i * 0.12); }); tone(1047, 0, 0.5, 'square', 0.12, 0.48); },
    fail: function () { tone(330, 220, 0.25, 'sawtooth', 0.12); tone(220, 150, 0.35, 'sawtooth', 0.12, 0.25); },
    coin: function () { tone(1760, 0, 0.08, 'sine', 0.15); tone(2217, 0, 0.12, 'sine', 0.12, 0.07); },
    warn: function () { tone(440, 0, 0.08, 'square', 0.15); tone(110, 70, 0.5, 'triangle', 0.25, 0.1); }
  };
  function sfx(k) {
    if (!soundOn || REDUCED) return;
    if (SFX_DATA[k]) {
      try { var a = aud[k]; if (!a) { a = aud[k] = new Audio('data:audio/mpeg;base64,' + SFX_DATA[k]); } a.currentTime = 0; a.volume = 0.7; var pr = a.play(); if (pr && pr.catch) pr.catch(function () {}); return; } catch (e) {}
    }
    if (SYNTH[k]) SYNTH[k]();
  }

  // ---- 형식 ----
  function money(v) { v = Math.round(v); if (Math.abs(v) >= 10000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '조'; return v.toLocaleString('ko-KR') + '억'; }
  function people(v) { v = Math.round(v); if (Math.abs(v) >= 100000) return (v / 10000).toFixed(1).replace(/\.0$/, '') + '만명'; return v.toLocaleString('ko-KR') + '명'; }
  function signed(v, f) { return (v >= 0 ? '+' : '−') + f(Math.abs(v)); }
  function dateOf(m) { var t = 2027 * 12 + m; return Math.floor(t / 12) + '년 ' + (t % 12 + 1) + '월'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fCol(id) { return id === 0 ? PAL[0] : PAL[1 + (id - 1) % (PAL.length - 1)]; }
  function save() { try { if (S) { var o = S.owner; if (RPS) S.owner = RPS.real; if (TLS) S.owner = TLS.real; if (CAL) S.owner = CAL.real; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); S.owner = o; } } catch (e) {} }
  function backup() { try { var t = localStorage.getItem(SAVE_KEY); if (t) localStorage.setItem(SAVE_KEY + '-prev', t); } catch (e) {} }
  function bests() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; } }
  function saveBest(i, m) { try { var b = bests(); if (!b[i] || m < b[i]) { b[i] = m; localStorage.setItem(BEST_KEY, JSON.stringify(b)); } } catch (e) {} }
  function loadSave() {
    var keys = [SAVE_KEY, SAVE_KEY + '-prev'];
    for (var i = 0; i < keys.length; i++) { try { var t = localStorage.getItem(keys[i]); if (t) { var o = E.migrate(JSON.parse(t)); if (o) return o; } } catch (e) {} }
    return null;
  }
  // 광고 자리. 애드센스 승인 후 enabled를 켜고 광고 스크립트를 넣으면 동작합니다. 지금은 꺼져 있어 화면에 아무것도 나오지 않습니다.
  var ADS = { enabled: false };
  function adBreakSafe(cfg) { if (ADS.enabled && window.adBreak) window.adBreak(cfg); else if (cfg.afterAd) cfg.afterAd(); }
  function encodeSave(st) {
    var c = JSON.parse(JSON.stringify(st)); c.log = c.log.slice(0, 12); c.last = [];
    return 'DJ2:' + btoa(unescape(encodeURIComponent(JSON.stringify(c))));
  }
  function decodeSave(code) {
    var t = String(code).trim().replace(/\s+/g, '');
    if (t.indexOf('DJ2:') !== 0) return null;
    try { return E.migrate(JSON.parse(decodeURIComponent(escape(atob(t.slice(4)))))); } catch (e) { return null; }
  }
  function rawSave(code) { var t = String(code).trim().replace(/\s+/g, ''); try { return JSON.parse(decodeURIComponent(escape(atob(t.slice(4))))); } catch (e) { return null; } }
  function copyText(txt, btn, ta) {
    function fb() { if (ta) { ta.focus(); ta.select(); } btn.textContent = '선택됐습니다. 직접 복사해 주세요.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function () { btn.textContent = '복사했습니다'; }, fb); else fb();
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '-prev'); } catch (e) {} }

  // ---- 지도 ----
  var cv = $('map'), ctx = cv.getContext('2d'), hit = document.createElement('canvas').getContext('2d');
  var cam = { s: 1, x: 0, y: 0 }, fitS = 1, W = 0, H = 0, DPR = 1, needs = false, tween = null;
  function pathOf(rings, close) {
    var p = new Path2D();
    rings.forEach(function (r) {
      var x = 0, y = 0;
      for (var i = 0; i < r.length; i += 2) {
        x += r[i]; y += r[i + 1];
        if (i === 0) p.moveTo(x, y); else p.lineTo(x, y);
      }
      if (close) p.closePath();
    });
    return p;
  }
  var dongPath = D.map(function (d) { return pathOf(d.p, true); });
  var ZMAX = (function () { var w = D.map(function (d) { return Math.max(20, d.b[2] - d.b[0]); }).sort(function (a, b) { return a - b; }); return Math.max(16, Math.min(400, 0.32 * DATA.w / w[Math.floor(w.length * 0.1)])); })();
  function zoomFor(i) { return KIND === 'metro' ? 0 : Math.min(fitS * ZMAX, 70 / Math.max(20, D[i].b[2] - D[i].b[0])); }
  var allDong = new Path2D(); dongPath.forEach(function (p) { allDong.addPath(p); });
  var guPath = pathOf(DATA.guline), riverPath = pathOf(DATA.river), outerPath = pathOf(DATA.outer), RIVER_W = CITY_ID === 'ulsan' ? 25 : 70;
  var guBox = GU.map(function () { return [1e9, 1e9, -1e9, -1e9]; });
  D.forEach(function (d) { var b = guBox[d.g]; b[0] = Math.min(b[0], d.b[0]); b[1] = Math.min(b[1], d.b[1]); b[2] = Math.max(b[2], d.b[2]); b[3] = Math.max(b[3], d.b[3]); });

  function viewRect() {
    var hud = $('hud'), top = 0, bottom = H, right = W, left = 0;
    var inGame = !!S;
    if (inGame) {
      top = hud.getBoundingClientRect().bottom;
      if (isWide()) right = $('bottom').getBoundingClientRect().left;
      else bottom = $('bottom').getBoundingClientRect().top;
    } else {
      top = $('brand').getBoundingClientRect().bottom;
      if (isWide()) right = $('pick').getBoundingClientRect().left; else bottom = $('pick').getBoundingClientRect().top;
    }
    return { x: left, y: top, w: right - left, h: Math.max(60, bottom - top) };
  }
  function fitBox(b, pad, animate) {
    var r = viewRect();
    var s = Math.min((r.w - pad * 2) / (b[2] - b[0]), (r.h - pad * 2) / (b[3] - b[1]));
    var t = { s: s, x: r.x + r.w / 2 - s * (b[0] + b[2]) / 2, y: r.y + r.h / 2 - s * (b[1] + b[3]) / 2 };
    if (animate) tweenTo(t); else { cam = t; dirty(); }
  }
  function fitAll(animate) {
    var r = viewRect();
    fitS = Math.min((r.w - 16) / DATA.w, (r.h - 16) / DATA.h);
    fitBox([0, 0, DATA.w, DATA.h], 8, animate);
  }
  function tweenTo(t) {
    if (REDUCED) { cam = t; dirty(); return; }
    tween = { a: { s: cam.s, x: cam.x, y: cam.y }, b: t, t0: performance.now(), dur: 280 };
    dirty();
  }
  function ensureVisible(i) {
    var d = D[i], r = viewRect();
    var sx = d.x * cam.s + cam.x, sy = d.y * cam.s + cam.y;
    var m = 34;
    if (sx > r.x + m && sx < r.x + r.w - m && sy > r.y + m && sy < r.y + r.h - m) return;
    tweenTo({ s: cam.s, x: r.x + r.w / 2 - d.x * cam.s, y: r.y + r.h / 2 - d.y * cam.s });
  }
  // 그 동으로 지도를 옮기고 정보를 연다
  function goDong(i) {
    if (i === undefined || i === null || !D[i]) return;
    select(i);
    requestAnimationFrame(function () { var r = viewRect(), ns = Math.max(cam.s, fitS * 3.2, zoomFor(i)); tweenTo({ s: ns, x: r.x + r.w / 2 - D[i].x * ns, y: r.y + r.h / 2 - D[i].y * ns }); });
  }
  function clampCam() {
    var r = viewRect(), s = cam.s;
    cam.x = Math.min(r.x + r.w - 40, Math.max(r.x + 40 - DATA.w * s, cam.x));
    cam.y = Math.min(r.y + r.h - 40, Math.max(r.y + 40 - DATA.h * s, cam.y));
  }
  function resize() {
    var rc = cv.getBoundingClientRect();
    W = rc.width; H = rc.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    dirty();
  }
  function dirty() { if (!needs) { needs = true; requestAnimationFrame(frame); } }
  function ramp(v) {
    var a = [236, 239, 230], b = [14, 90, 99], t = Math.pow(v / 100, 1.15);
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }
  // ---- 안개: 우리 땅과 맞닿은 구까지만 보인다 ----
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
  function fogged(i) { return !!(S && !lens && !TLS && S.seenGu && !S.seenGu[D[i].g] && !S.won && !(S.cards && S.cards.indexOf('intel') >= 0)); }
  function revealNews(gs) {
    if (!gs.length) return '';
    return gs.map(function (g) {
      var cnt = {};
      E.guDongs()[g].forEach(function (i) { var o = S.owner[i]; if (o > 0) cnt[o] = (cnt[o] || 0) + 1; });
      var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
      return E.J(GU[g].n, '이', '가') + ' 보입니다' + (top ? '. ' + E.J(S.f[top].name, '이', '가') + ' ' + cnt[top] + '개 동을 쥐고 있습니다.' : '. 아직 주인 없는 동네가 많습니다.');
    }).join(' ');
  }
  function mkPattern(draw, size) {
    var k = document.createElement('canvas'); k.width = k.height = size; var g = k.getContext('2d'); draw(g, size);
    return ctx.createPattern(k, 'repeat');
  }
  var FOG_PAT = mkPattern(function (g, n) { g.fillStyle = '#C3CBC1'; g.fillRect(0, 0, n, n); g.strokeStyle = 'rgba(23,35,28,.13)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, n + 2); g.lineTo(n + 2, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(n - 2, n + 2); g.lineTo(n + 2, n - 2); g.stroke(); }, 10);
  var MT_PAT = mkPattern(function (g, n) { g.strokeStyle = 'rgba(30,70,45,.2)'; g.lineWidth = 1.2; g.lineJoin = 'round'; [[8, 12], [24, 28]].forEach(function (p) { g.beginPath(); g.moveTo(p[0] - 4, p[1] + 2); g.lineTo(p[0], p[1] - 3); g.lineTo(p[0] + 4, p[1] + 2); g.stroke(); }); }, 34);
  // 산을 낀 동 (지형을 감안해 고름, 대략적인 표시)
  var MOUNT = {};
  if (SEOUL) ['진관동', '평창동', '우이동', '도봉1동', '정릉4동', '상계1동', '상계3·4동', '공릉2동', '대학동', '남현동', '내곡동', '양재2동', '부암동', '삼청동'].forEach(function (n) { D.forEach(function (d, i) { if (d.n === n) MOUNT[i] = 1; }); });
  var DEV_COL = ['#E2A11F', '#2F6DB5', '#2F9B78', '#47524A'];
  function fillOf(i) {
    if (lens) return ramp(D[i][LKEY[lens]]);
    if (fogged(i)) return FOG_PAT;
    if (!S) return i === pickSel ? '#D4321F' : '#ECEFE6';
    var o = S.owner[i];
    return o === -1 ? '#ECEFE6' : fCol(o);
  }
  function frame(now) {
    needs = false;
    if (S) { var mb = $('mapBtns'), vr = viewRect(), hide = vr.h < 230 || !$('over').hidden || !!RPS || !!TLS; if (mb.hidden !== hide) mb.hidden = hide; if (!hide) { mb.style.top = (vr.y + 8) + 'px'; mb.style.right = (W - vr.x - vr.w + 8) + 'px'; } var rb = $('rpBar'); if (RPS || TLS) { rb.style.top = (vr.y + 8) + 'px'; rb.style.left = (vr.x + 8) + 'px'; rb.style.right = (W - vr.x - vr.w + 8) + 'px'; var tk = $('rpTalk'); tk.style.top = (vr.y + 56) + 'px'; tk.style.left = (vr.x + 8) + 'px'; tk.style.right = (W - vr.x - vr.w + 8) + 'px'; } }
    if (tween) {
      var k = Math.min(1, (now - tween.t0) / tween.dur), e = 1 - Math.pow(1 - k, 3);
      cam.s = tween.a.s + (tween.b.s - tween.a.s) * e;
      cam.x = tween.a.x + (tween.b.x - tween.a.x) * e;
      cam.y = tween.a.y + (tween.b.y - tween.a.y) * e;
      if (k >= 1) tween = null; else dirty();
    }
    var c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.fillStyle = '#CFD8CF'; c.fillRect(0, 0, W, H);
    c.setTransform(DPR * cam.s, 0, 0, DPR * cam.s, DPR * cam.x, DPR * cam.y);
    var px = 1 / cam.s;
    var unscale = new DOMMatrix().scale(1 / cam.s);
    FOG_PAT.setTransform(unscale); MT_PAT.setTransform(unscale);
    for (var i = 0; i < D.length; i++) { c.fillStyle = fillOf(i); c.fill(dongPath[i]); }
    if (!lens) { c.fillStyle = MT_PAT; Object.keys(MOUNT).forEach(function (k) { if (!fogged(+k)) c.fill(dongPath[k]); }); }
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(30,45,35,.32)'; c.lineWidth = 0.7 * px; c.stroke(allDong);
    if (S && !lens) { c.strokeStyle = 'rgba(255,255,255,.85)'; for (var mi = 0; mi < D.length; mi++) if (S.owner[mi] === 0) { var sl = E.lv(S, mi, 3); c.lineWidth = (sl >= 3 ? 1.2 + sl * 0.5 : 1.2) * px; c.stroke(dongPath[mi]); } }
    c.strokeStyle = '#7DB2CF'; c.lineWidth = Math.max(RIVER_W, 4.5 * px); c.stroke(riverPath);
    c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = Math.max(10, 1.2 * px); c.setLineDash([Math.max(60, 8 * px), Math.max(110, 14 * px)]); c.stroke(riverPath); c.setLineDash([]);
    c.strokeStyle = 'rgba(23,35,28,.72)'; c.lineWidth = 1.5 * px; c.stroke(guPath);
    c.strokeStyle = '#17231C'; c.lineWidth = (KIND === 'metro' ? 2.4 : 1.3) * px; c.stroke(outerPath);
    if (S && !lens) {
      // 공격 가능한 동
      if (S.stat.took === 0) { c.fillStyle = 'rgba(212,50,31,.16)'; Object.keys(reach).forEach(function (k) { if (reach[k] === 1) c.fill(dongPath[k]); }); if (recDong !== null) { c.fillStyle = 'rgba(212,50,31,.3)'; c.fill(dongPath[recDong]); } }
      var many = Object.keys(reach).length > 24;
      Object.keys(reach).forEach(function (k) {
        var r = reach[k];
        if (r === 2 && many) return;
        c.strokeStyle = 'rgba(212,50,31,.85)';
        c.lineWidth = (r === 2 ? 1.3 : 1.7) * px;
        c.setLineDash(r === 2 ? [4 * px, 4 * px] : []);
        c.stroke(dongPath[k]);
      });
      c.setLineDash([]);
      // 본거지
      S.f.forEach(function (f) {
        if (!f.alive || fogged(f.cap)) return;
        var d = D[f.cap], rr = (f.id === 0 ? 5 : 3.6) * px;
        c.beginPath(); c.arc(d.x, d.y, rr + 1.6 * px, 0, 7); c.fillStyle = '#fff'; c.fill();
        c.beginPath(); c.arc(d.x, d.y, rr, 0, 7); c.fillStyle = f.id === 0 ? '#D4321F' : '#17231C'; c.fill();
      });
    }
    if (S && !lens && S.rivalPlan && S.owner[S.rivalPlan.t] === 0) {
      var pt = S.rivalPlan.t, blink = 0.45 + 0.35 * Math.sin(performance.now() / 250);
      c.strokeStyle = 'rgba(234,122,30,' + blink + ')'; c.lineWidth = 5 * px; c.stroke(dongPath[pt]); clearTimeout(blinkTimer); blinkTimer = setTimeout(dirty, 130);
    }
    if (S && !lens && !TLS && S.zones && S.zones.length) {
      c.strokeStyle = 'rgba(138,42,28,.75)'; c.lineWidth = 2 * px; c.setLineDash([5 * px, 3 * px]);
      S.zones.forEach(function (z) { z.d.forEach(function (i) { c.stroke(dongPath[i]); }); });
      c.setLineDash([]);
    }
    if (S && sheetMode === 'zpick' && zp) {
      c.strokeStyle = '#fff'; c.lineWidth = 6 * px; zp.list.forEach(function (i) { c.stroke(dongPath[i]); });
      c.strokeStyle = '#8A2A1C'; c.lineWidth = 3.4 * px; zp.list.forEach(function (i) { c.stroke(dongPath[i]); });
    }
    if (S && sheetMode === 'zone' && zoneSel !== null) {
      var zz = E.zoneById(S, zoneSel);
      if (zz) { c.strokeStyle = '#17231C'; c.lineWidth = 2.6 * px; zz.d.forEach(function (i) { c.stroke(dongPath[i]); }); }
    }
    Object.keys(flash).forEach(function (k) {
      c.strokeStyle = flash[k] === 1 ? '#fff' : '#17231C'; c.lineWidth = 4 * px; c.stroke(dongPath[k]);
    });
    if (S && sheetMode === 'gu' && guSel !== null) {
      c.strokeStyle = '#17231C'; c.lineWidth = 2.4 * px;
      E.guDongs()[guSel].forEach(function (i) { c.stroke(dongPath[i]); });
    }
    var cur = S ? sel : pickSel;
    if (cur !== null && cur !== undefined) {
      c.strokeStyle = '#fff'; c.lineWidth = 6 * px; c.stroke(dongPath[cur]);
      c.strokeStyle = '#17231C'; c.lineWidth = 3 * px; c.stroke(dongPath[cur]);
    }
    if (S && sel !== null && sheetMode === 'dong' && S.owner[sel] !== 0 && !lens && !fogged(sel)) {
      var cps = comboCache.i === sel && comboCache.m === S.month && comboCache.ap === S.ap ? comboCache.v : (comboCache = { i: sel, m: S.month, ap: S.ap, v: E.comboPreview(S, sel) }).v;
      if (cps.length) {
        c.strokeStyle = '#E2A11F'; c.lineWidth = 3.2 * px; c.setLineDash([7 * px, 4 * px]);
        cps.forEach(function (cp) { cp.d.forEach(function (j) { c.stroke(dongPath[j]); }); });
        c.setLineDash([]);
      }
    }
    if (S && sel !== null && S.owner[sel] !== 0 && !lens) {
      var rt = E.route(S, 0, sel);
      if (rt) {
        c.strokeStyle = '#17231C'; c.lineWidth = 2.2 * px; c.setLineDash([6 * px, 5 * px]);
        c.beginPath(); c.moveTo(D[rt.src].x, D[rt.src].y); c.lineTo(D[sel].x, D[sel].y); c.stroke(); c.setLineDash([]);
      }
    }
    drawLabels(c, cur);
    if (RPS) drawReplay(c); else drawMarks(c);
  }
  function marksNow() {
    var out = [];
    if (!S) return out;
    if (S.marks && S.marks.m === S.month) S.marks.list.forEach(function (x) { out.push(x); });
    if (S.rivalPlan && S.owner[S.rivalPlan.t] === 0) out.push({ t: S.rivalPlan.t, k: 'threat' });
    return out;
  }
  // ---- 상대 턴 재생: '다음 달'을 누르면 AI가 한 일을 하나씩 보여 줌 (우리 땅 일 → 우리 근처 → 그 밖은 묶어서) ----
  var RPM = (function () { try { return localStorage.getItem('dongjang-replay') || 'normal'; } catch (e) { return 'normal'; } })();
  var RPS = null, rpEndTimer = 0;
  function setReplayMode(m) { RPM = m; try { localStorage.setItem('dongjang-replay', m); } catch (e) {} }
  function rpSteps(before, R) {
    var near = {};
    before.forEach(function (o, i) { if (o === 0) { near[i] = 1; D[i].a.forEach(function (j) { near[j] = 1; }); } });
    var others = 0;
    return R.ev.map(function (e) {
      var ours = e.o === 0 || e.k === 'rebel';
      var vis = !fogged(e.t);
      var show = ours || (vis && (near[e.t] || (e.src != null && near[e.src])) && (e.win || e.k !== 'atk')) || (vis && (e.col || e.k === 'split' || e.k === 'rise'));
      if (show && !ours) { if (others >= 8) show = false; else others++; }
      return { e: e, show: show };
    });
  }
  function startReplay(before, R, done) {
    if (RPM === 'off' || !R || !R.ev || !R.ev.length) { done(); return; }
    var steps = rpSteps(before, R);
    var shown = steps.filter(function (x) { return x.show; }).length;
    if (!shown) { done(); return; }
    RPS = { steps: steps, i: -1, real: S.owner, own: before.slice(), done: done, cur: null, t0: 0, quick: 0, shown: shown, k: 0, fast: RPM === 'fast' };
    S.owner = RPS.own;
    clearTimeout(rpEndTimer); $('rpBar').classList.remove('end');
    $('rpBlock').hidden = false; $('rpBar').hidden = false; $('mapBtns').hidden = true;
    rpText('상대 턴 · ' + dateOf(S.month));
    rpNext();
    requestAnimationFrame(rpTick);
  }
  function rpText(t) { $('rpLabel').textContent = tx(t); }
  function rpDur() { return RPS.fast ? 520 : 1150; }
  function rpApply(st) { st.e.ch.forEach(function (c) { RPS.own[c[0]] = c[1]; }); st.applied = true; }
  function rpNext() {
    if (RPS.cur && !RPS.cur.applied) rpApply(RPS.cur);
    RPS.i++;
    while (RPS.i < RPS.steps.length && !RPS.steps[RPS.i].show) { rpApply(RPS.steps[RPS.i]); RPS.quick++; RPS.i++; }
    if (RPS.i >= RPS.steps.length) { RPS.cur = null; return false; }
    var st = RPS.cur = RPS.steps[RPS.i], e = st.e; RPS.k++;
    st.t0 = performance.now();
    rpText('상대 턴 ' + RPS.k + '/' + RPS.shown);
    var tk = $('rpTalk');
    if (e.k === 'atk' && e.o === 0 && e.f > 0 && bossOf(e.f)) { tk.innerHTML = e.win && S.f[e.f].adv ? bossHTML(e.f, 'revenge', D[e.t].n, true) : bossHTML(e.f, e.win ? 'win' : 'lose', D[e.t].n); tk.hidden = false; }
    else tk.hidden = true;
    // 우리 땅 일만 지도를 옮겨 보여 줌
    if (e.o === 0 || e.k === 'rebel') {
      var r = viewRect(), d = D[e.t], sx = d.x * cam.s + cam.x, sy = d.y * cam.s + cam.y;
      if (sx < r.x + 30 || sx > r.x + r.w - 30 || sy < r.y + 40 || sy > r.y + r.h - 30) {
        var ns = Math.max(cam.s, fitS * 2, zoomFor(e.t) * 0.6);
        tweenTo({ s: ns, x: r.x + r.w / 2 - d.x * ns, y: r.y + r.h / 2 - d.y * ns });
      }
    }
    return true;
  }
  function rpTick() {
    if (!RPS) return;
    var st = RPS.cur, now = performance.now();
    if (st) {
      var p = (now - st.t0) / rpDur();
      if (p >= 0.5 && !st.applied) {
        rpApply(st);
        var e = st.e;
        if (e.o === 0 && e.ch.length) sfx('fail'); else if (e.o === 0 && e.k === 'atk' && !e.win) sfx('stamp');
      }
      if (p >= 1 && !rpNext()) { rpEnd(); return; }
    } else { rpEnd(); return; }
    dirty();
    requestAnimationFrame(rpTick);
  }
  function rpEnd() {
    if (!RPS) return;
    var R = RPS; RPS = null;
    S.owner = R.real;
    $('rpBlock').hidden = true; $('rpTalk').hidden = true;
    // 끝: '우리 턴'을 잠깐 보여 주고 사라짐
    var rb = $('rpBar'); rb.classList.add('end'); rb.style.right = 'auto'; rpText('우리 턴 · ' + dateOf(S.month));
    clearTimeout(rpEndTimer); rpEndTimer = setTimeout(function () { if (!RPS) { rb.hidden = true; rb.classList.remove('end'); } }, 900);
    dirty();
    R.done(R.quick);
  }
  function rpSkip() { if (!RPS) return; RPS.cur = null; RPS.i = RPS.steps.length; rpEnd(); }
  function drawReplay(c) {
    if (!RPS || !RPS.cur) return;
    var st = RPS.cur, e = st.e, p = Math.min(1, (performance.now() - st.t0) / rpDur());
    var d = D[e.t], col = e.f != null && e.f >= 0 && S.f[e.f] ? fCol(e.f) : '#5D6A60';
    c.save(); c.setTransform(DPR * cam.s, 0, 0, DPR * cam.s, DPR * cam.x, DPR * cam.y);
    var px = 1 / cam.s;
    // 목표 동 강조
    c.strokeStyle = '#fff'; c.lineWidth = 7 * px; c.stroke(dongPath[e.t]);
    c.strokeStyle = e.o === 0 ? '#D4321F' : '#17231C'; c.lineWidth = 3.4 * px; c.stroke(dongPath[e.t]);
    // 공격 화살표 (출발 동 → 목표 동)
    if (e.k === 'atk' && e.src != null && D[e.src]) {
      var s0 = D[e.src], k = Math.min(1, p / 0.42), x1 = s0.x + (d.x - s0.x) * k, y1 = s0.y + (d.y - s0.y) * k;
      var mx = (s0.x + d.x) / 2, my = (s0.y + d.y) / 2, dx = d.x - s0.x, dy = d.y - s0.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = mx - dy / L * L * 0.18, cy = my + dx / L * L * 0.18;
      var bx = function (t) { return (1 - t) * (1 - t) * s0.x + 2 * (1 - t) * t * cx + t * t * d.x; }, by = function (t) { return (1 - t) * (1 - t) * s0.y + 2 * (1 - t) * t * cy + t * t * d.y; };
      c.lineCap = 'round';
      [['#fff', 8], [col, 4.2]].forEach(function (w) {
        c.strokeStyle = w[0]; c.lineWidth = w[1] * px; c.beginPath(); c.moveTo(s0.x, s0.y);
        for (var q = 1; q <= 24; q++) { var t = q / 24 * k; c.lineTo(bx(t), by(t)); }
        c.stroke();
      });
      if (k > 0.2) {
        var t2 = k, ex = bx(t2), ey = by(t2), ex0 = bx(Math.max(0, t2 - 0.04)), ey0 = by(Math.max(0, t2 - 0.04)), ang = Math.atan2(ey - ey0, ex - ex0), hs = 13 * px;
        c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 2 * px;
        c.beginPath(); c.moveTo(ex + Math.cos(ang) * hs * 0.6, ey + Math.sin(ang) * hs * 0.6); c.lineTo(ex + Math.cos(ang + 2.5) * hs, ey + Math.sin(ang + 2.5) * hs); c.lineTo(ex + Math.cos(ang - 2.5) * hs, ey + Math.sin(ang - 2.5) * hs); c.closePath(); c.stroke(); c.fill();
      }
      x1 = y1 = 0;
    } else {
      var rr = (18 + 30 * p) * px; c.strokeStyle = col; c.globalAlpha = 1 - p * 0.7; c.lineWidth = 3 * px;
      c.beginPath(); c.arc(d.x, d.y, rr, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
    }
    c.restore();
    // 꼬리표: 누가 어디로 → 결과
    var fn = e.f != null && e.f >= 0 && S.f[e.f] ? S.f[e.f].name : '';
    var t = e.k === 'rebel' ? D[e.t].n + ' 주민 독립 선언' : e.k === 'split' ? S.f[e.o].name + ' 내분 · ' + fn + ' 독립' : e.k === 'rise' ? fn + ' 등장' : fn + ' → ' + D[e.t].n;
    var res = st.applied ? (e.k !== 'atk' ? '' : e.win ? (e.col ? '본거지 함락 · ' + e.col + ' 해체' : e.o === 0 ? '빼앗김' : '점령') : '막아냄') : '';
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.font = '700 13px "IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    var line = tx(t), w1 = c.measureText(line).width, w2 = res ? c.measureText(res).width + 14 : 0, w = w1 + w2 + 18, h = 24;
    var x = Math.max(8, Math.min(W - w - 8, d.x * cam.s + cam.x - w / 2)), y = d.y * cam.s + cam.y - 30;
    c.fillStyle = 'rgba(23,35,28,.92)'; c.beginPath(); if (c.roundRect) c.roundRect(x, y - h / 2, w, h, 5); else c.rect(x, y - h / 2, w, h); c.fill();
    c.fillStyle = '#fff'; c.fillText(line, x + 9, y + 0.5);
    if (res) {
      var good = !e.win && e.o === 0, bad = e.win && e.o === 0;
      c.fillStyle = bad ? '#FF8A7A' : good ? '#8FE0B9' : '#FFD27A'; c.fillText(res, x + 9 + w1 + 10, y + 0.5);
    }
  }
  function drawMarks(c) {
    if (!S || lens) return;
    var ms = marksNow(); if (!ms.length) return;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.font = '700 12px "IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    var STY = { lost: ['#17231C', '#fff', '함락', 'flag'], held: ['#1F6B52', '#fff', '방어 성공', 'shield'], threat: ['#C2410C', '#fff', '위협', 'warn'] };
    ms.forEach(function (m) {
      var d = D[m.t], st = STY[m.k]; if (!d || !st) return;
      // 테두리 (월드 좌표)
      c.save(); c.setTransform(DPR * cam.s, 0, 0, DPR * cam.s, DPR * cam.x, DPR * cam.y);
      var px = 1 / cam.s;
      if (m.k === 'threat') { c.setLineDash([6 * px, 4 * px]); c.strokeStyle = '#EA7A1E'; c.lineWidth = 3.4 * px; c.stroke(dongPath[m.t]); c.setLineDash([]); }
      else { c.strokeStyle = '#fff'; c.lineWidth = 6.5 * px; c.stroke(dongPath[m.t]); c.strokeStyle = st[0]; c.lineWidth = 3.6 * px; c.stroke(dongPath[m.t]); }
      c.restore();
      // 아이콘 + 글자 꼬리표 (화면 좌표)
      var x = d.x * cam.s + cam.x, y = d.y * cam.s + cam.y - 20;
      var w = c.measureText(st[2]).width + 26, h = 20;
      c.fillStyle = st[0]; c.strokeStyle = '#fff'; c.lineWidth = 1.5;
      c.beginPath(); if (c.roundRect) c.roundRect(x - w / 2, y - h / 2, w, h, 5); else c.rect(x - w / 2, y - h / 2, w, h); c.fill(); c.stroke();
      var ix = x - w / 2 + 11, iy = y;
      c.fillStyle = '#fff'; c.beginPath();
      if (st[3] === 'flag') { c.rect(ix - 4, iy - 6, 1.6, 12); c.moveTo(ix - 2.4, iy - 6); c.lineTo(ix + 5, iy - 3.5); c.lineTo(ix - 2.4, iy - 1); c.closePath(); }
      else if (st[3] === 'shield') { c.moveTo(ix, iy - 6); c.lineTo(ix + 5, iy - 4); c.lineTo(ix + 4, iy + 2); c.lineTo(ix, iy + 6); c.lineTo(ix - 4, iy + 2); c.lineTo(ix - 5, iy - 4); c.closePath(); }
      else { c.moveTo(ix, iy - 6); c.lineTo(ix + 6, iy + 5); c.lineTo(ix - 6, iy + 5); c.closePath(); }
      c.fill();
      if (st[3] === 'warn') { c.fillStyle = st[0]; c.fillRect(ix - 0.8, iy - 2.5, 1.6, 4); c.fillRect(ix - 0.8, iy + 2.6, 1.6, 1.4); }
      c.fillStyle = st[1]; c.fillText(st[2], ix + 9, y + 0.5);
    });
  }
  var labelW = {}, wheelUntil = 0, comboCache = {};
  function isFast() { return !!tween || (gest && gest.moved > 6) || performance.now() < wheelUntil; }
  var LABEL_ORDER = D.map(function (d, i) { return i; }).sort(function (a, b) { return (D[b].b[2] - D[b].b[0]) - (D[a].b[2] - D[a].b[0]); });
  function drawLabels(c, cur) {
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    var zoom = cam.s / fitS;
    var r = viewRect();
    if (zoom < 2.6) {
      c.font = (W < 500 ? 12 : 14) + 'px ' + '"Black Han Sans","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
      var guPlaced = [];
      GU.forEach(function (g, gi) {
        var x = g.x * cam.s + cam.x, y = g.y * cam.s + cam.y;
        var gw = c.measureText(g.n).width;
        if ((guBox[gi][2] - guBox[gi][0]) * cam.s < gw * 1.05) return;
        for (var q = 0; q < guPlaced.length; q++) if (Math.abs(guPlaced[q].x - x) < (guPlaced[q].w + gw) / 2 + 3 && Math.abs(guPlaced[q].y - y) < 16) return;
        guPlaced.push({ x: x, y: y, w: gw });
        c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(g.n, x, y);
        c.fillStyle = '#17231C'; c.fillText(g.n, x, y);
      });
    }
    c.font = '500 12px "IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    var placed = [];
    function put(i) {
      if (fogged(i) && i !== cur) return;
      var d = D[i];
      var sx = d.x * cam.s + cam.x, sy = d.y * cam.s + cam.y - 9;
      if (sx < -60 || sx > W + 60 || sy < -20 || sy > H + 20) return;
      var w = labelW[i] || (labelW[i] = c.measureText(d.n).width);
      var bw = (d.b[2] - d.b[0]) * cam.s, bh = (d.b[3] - d.b[1]) * cam.s;
      if (i !== cur && (zoom < 2.6 || bw < w * 0.8 || bh < 14)) return;
      var hw = w / 2 + 2;
      for (var k = 0; k < placed.length; k++) {
        var q = placed[k];
        if (Math.abs(q.x - sx) < q.hw + hw && Math.abs(q.y - sy) < 14) return;
      }
      placed.push({ x: sx, y: sy, hw: hw });
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,.92)'; c.strokeText(d.n, sx, sy);
      c.fillStyle = '#17231C'; c.fillText(d.n, sx, sy);
    }
    if (cur !== null && cur !== undefined) put(cur);
    if (!isFast()) for (var i = 0; i < LABEL_ORDER.length; i++) if (LABEL_ORDER[i] !== cur) put(LABEL_ORDER[i]);
    if (S && !lens && zoom >= 2.2 && !isFast()) {
      E.dongsOf(S, 0).forEach(function (i) {
        var lvls = [0, 1, 2, 3].map(function (t) { return E.lv(S, i, t); });
        if (!lvls.some(Boolean)) return;
        var sx = D[i].x * cam.s + cam.x, sy = D[i].y * cam.s + cam.y + 17;
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
    if (S && !lens && !TLS && S.zones && S.zones.length) {
      c.font = '13px "Black Han Sans","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
      S.zones.forEach(function (z) {
        if (!z.d.length) return;
        var x = 0, y = 0; z.d.forEach(function (i) { x += D[i].x; y += D[i].y; }); x = x / z.d.length * cam.s + cam.x; y = y / z.d.length * cam.s + cam.y + 12;
        if (x < -60 || x > W + 60 || y < -20 || y > H + 20) return;
        c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.95)'; c.strokeText(z.nm, x, y);
        c.fillStyle = '#8A2A1C'; c.fillText(z.nm, x, y);
      });
    }
    if (S && !lens && S.stat.took === 0 && recDong !== null && sel === null) {
      var rx = D[recDong].x * cam.s + cam.x, ry = D[recDong].y * cam.s + cam.y - 28;
      c.font = '700 12px "IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
      c.fillStyle = '#D4321F'; c.fillRect(rx - 34, ry - 10, 68, 20);
      c.fillStyle = '#fff'; c.fillText('여기부터', rx, ry);
    }
  }
  function toWorld(x, y) { return { x: (x - cam.x) / cam.s, y: (y - cam.y) / cam.s }; }
  function dongAt(x, y) {
    var w = toWorld(x, y);
    for (var i = 0; i < D.length; i++) {
      var b = D[i].b;
      if (w.x < b[0] || w.x > b[2] || w.y < b[1] || w.y > b[3]) continue;
      if (hit.isPointInPath(dongPath[i], w.x, w.y)) return i;
    }
    return null;
  }
  // 입력
  var ptrs = {}, gest = null, wheelTimer = 0;
  function pinchInfo() {
    var k = Object.keys(ptrs); var a = ptrs[k[0]], b = ptrs[k[1]];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }
  cv.addEventListener('pointerdown', function (e) {
    cv.setPointerCapture(e.pointerId); tween = null;
    var rc = cv.getBoundingClientRect();
    ptrs[e.pointerId] = { x: e.clientX - rc.left, y: e.clientY - rc.top };
    var n = Object.keys(ptrs).length;
    if (n === 1) gest = { type: 'pan', sx: ptrs[e.pointerId].x, sy: ptrs[e.pointerId].y, moved: 0, lx: ptrs[e.pointerId].x, ly: ptrs[e.pointerId].y };
    else if (n === 2) { var p = pinchInfo(); gest = { type: 'pinch', d: p.d, s: cam.s, cx: p.cx, cy: p.cy, moved: 99 }; }
  });
  cv.addEventListener('pointermove', function (e) {
    if (!ptrs[e.pointerId] || !gest) return;
    var rc = cv.getBoundingClientRect();
    ptrs[e.pointerId] = { x: e.clientX - rc.left, y: e.clientY - rc.top };
    if (gest.type === 'pan') {
      var q = ptrs[e.pointerId];
      gest.moved = Math.max(gest.moved, Math.hypot(q.x - gest.sx, q.y - gest.sy));
      if (gest.moved > 6) { cam.x += q.x - gest.lx; cam.y += q.y - gest.ly; clampCam(); dirty(); }
      gest.lx = q.x; gest.ly = q.y;
    } else if (Object.keys(ptrs).length >= 2) {
      var p = pinchInfo();
      var ns = Math.max(fitS * 0.8, Math.min(fitS * ZMAX, gest.s * p.d / Math.max(1, gest.d)));
      var w = toWorld(gest.cx, gest.cy);
      cam.s = ns;
      cam.x = p.cx - w.x * ns; cam.y = p.cy - w.y * ns;
      gest.cx = p.cx; gest.cy = p.cy; gest.d = p.d; gest.s = ns;
      clampCam(); dirty();
    }
  });
  function ptrEnd(e) {
    var wasPan = gest && gest.type === 'pan' && gest.moved <= 6;
    var pos = ptrs[e.pointerId];
    delete ptrs[e.pointerId];
    if (Object.keys(ptrs).length === 0) {
      if (wasPan && pos && e.type === 'pointerup') tapAt(pos.x, pos.y);
      gest = null;
      dirty();
    } else if (gest && gest.type === 'pinch') {
      var k = Object.keys(ptrs)[0];
      gest = { type: 'pan', sx: ptrs[k].x, sy: ptrs[k].y, lx: ptrs[k].x, ly: ptrs[k].y, moved: 99 };
    }
  }
  cv.addEventListener('pointerup', ptrEnd);
  cv.addEventListener('pointercancel', ptrEnd);
  cv.addEventListener('wheel', function (e) {
    e.preventDefault();
    var rc = cv.getBoundingClientRect(), x = e.clientX - rc.left, y = e.clientY - rc.top, w = toWorld(x, y);
    var ns = Math.max(fitS * 0.8, Math.min(fitS * ZMAX, cam.s * Math.exp(-e.deltaY * 0.0016)));
    cam.s = ns; cam.x = x - w.x * ns; cam.y = y - w.y * ns; clampCam();
    wheelUntil = performance.now() + 140; dirty();
    clearTimeout(wheelTimer); wheelTimer = setTimeout(dirty, 160);
  }, { passive: false });
  function tapAt(x, y) {
    var i = dongAt(x, y);
    if (!S) { if (i !== null) choosePick(i); return; }
    if (sheetMode === 'zpick' && zp) {
      if (i === null) return;
      if (S.owner[i] !== 0) { zp.msg = '우리 ' + UNITN + '만 묶을 수 있습니다.'; renderSheet(); return; }
      if (E.zoneOf(S, i)) { zp.msg = D[i].n + '은 이미 ' + E.zoneOf(S, i).nm + ' 소속입니다.'; renderSheet(); return; }
      var at = zp.list.indexOf(i);
      if (at >= 0) { zp.list.splice(at, 1); zp.msg = ''; } else if (zp.list.length < 8) { zp.list.push(i); zp.msg = ''; } else zp.msg = '8개까지 묶을 수 있습니다.';
      sfx('page'); renderSheet(); dirty(); return;
    }
    if (i === null) { select(null); return; }
    select(i, true);
    var bw = Math.max(D[i].b[2] - D[i].b[0], D[i].b[3] - D[i].b[1]) * cam.s;
    if (bw < 30) requestAnimationFrame(function () { var r = viewRect(), ns = Math.min(fitS * ZMAX, cam.s * (70 / Math.max(bw, 1))); tweenTo({ s: ns, x: r.x + r.w / 2 - D[i].x * ns, y: r.y + r.h / 2 - D[i].y * ns }); });
  }

  // ---- 시작 화면 ----
  var PRESETS = SEOUL ? [['마포구', '서교동', '번화가', '처음이면 추천'], ['중구', '소공동', '오피스', '돈으로 밀어붙이기'], ['은평구', '진관동', '대단지', '사람으로 밀어붙이기'], ['강동구', '둔촌1동', '최약체', '통계상 주민 16명']] : cityPresets(E, D, GU);
  function idOf(gu, n) { return D.findIndex(function (d) { return d.n === n && GU[d.g].n === gu; }); }
  function difficulty(i) {
    var d = D[i], T = E.TYPES[d.type], nb = d.a.map(function (j) { return D[j].base; });
    var avg = nb.reduce(function (a, b) { return a + b; }, 0) / nb.length;
    var r = (d.tax * (T.tax || 1) * 1.2 + d.draft * (T.draft || 1)) / (avg / 4);
    return r > 1 ? '쉬움' : r > 0.6 ? '보통' : '어려움';
  }
  function reasonOf(i) {
    var d = D[i], T = E.TYPES[d.type], tax = d.tax * (T.tax || 1), dr = d.draft * (T.draft || 1), r = difficulty(i);
    if (r === '어려움' && tax < 12) return '돈도 사람도 적어 초반이 어렵습니다. 지원금으로 버티며 한 동씩 키우세요.';
    if (tax > 30 && dr < 10) return '돈은 많지만 사람이 적습니다. 일당으로 인원을 모으거나 설득으로 넓히세요.';
    if (dr > 18 && tax < 25) return '사람이 많습니다. 공격으로 넓히기 좋습니다.';
    if (tax > 28) return '돈과 사람이 고르게 들어옵니다. 처음 하는 사람에게 좋습니다.';
    return '돈과 사람이 무난합니다. 옆 동네 사정을 보고 공격과 설득을 고르세요.';
  }
  function gaugeHTML(d) {
    return '<div class="gauges">' + [['인구', d.P], ['경제', d.E], ['인프라', d.I], ['생활', d.L]].map(function (x) {
      return '<div class="g"><small>' + x[0] + '<b class="num">' + x[1] + '</b></small><span><u style="width:' + x[1] + '%"></u></span></div>';
    }).join('') + '</div>';
  }
  function comboHTML(i) {
    var roles = E.roleOf(i), h = '';
    if (S && S.owner[i] === 0) {
      Object.keys(E.COMBO).forEach(function (k) { if (E.comboOn(S, k, i)) h += '<p class="combo on"><b>' + E.COMBO[k].n + '</b> · ' + E.COMBO[k].fx + '</p>'; });
    } else if (S) {
      E.comboPreview(S, i).forEach(function (c) { h += '<p class="combo"><b>이 동을 확보하면 ' + c.n + ' 완성</b> · ' + esc(c.gain) + '<br><span>' + esc(E.J(c.d.filter(function (j) { return j !== i; }).map(function (j) { return D[j].n; }).join('·'), '과', '와')) + ' 묶임</span></p>'; });
    }
    return h;
  }
  function typeHTML(d) {
    var T = E.TYPES[d.type];
    return '<p class="type"><b>' + T.n + '</b> ' + T.t + '<br><span>' + T.e + '</span></p>';
  }
  function abilHTML(type, long) {
    var A = E.ABIL[E.abilityOf(type)];
    return '<p class="type abil"><b>대표 능력 · ' + A.n + '</b> ' + A.t + (long ? '<br><span>' + A.how + '</span>' : '') + '</p>';
  }
  var METRO_SRC = '<p class="src">주민 수: 행정안전부 주민등록 인구통계 2026년 7월 (행정동 단위, <a href="https://github.com/yadoran-2025/korea-population-classroom-kit" target="_blank" rel="noopener">정리본</a>).<br>상가 수: 소상공인시장진흥공단 상가(상권)정보 2026년 9월 (<a href="https://github.com/team-datapopcorn/sanggwon-dashboard" target="_blank" rel="noopener">약 2km 격자 집계본</a>을 동 면적·인구에 맞춰 나눔, 상가가 가장 많은 동들은 정확한 값).<br>직장인 수·집객시설은 서울 실제값과 상가 수의 관계로 추정한 게임용 값입니다.' + (CITY_ID === 'incheon' ? '<br>지하철역 위치: OpenStreetMap 기여자(ODbL). 옹진군 섬 지역은 지도에서 뺐습니다.' : '<br>지하철역: 위키백과 역 목록의 역 이름과 소재 구를 보고 행정동에 배정해 일부 다를 수 있습니다.') + (CITY_ID === 'busan' ? '<br>재정자립도: <a href="https://www.busan.com/view/busan/view.php?code=2026012218193967246" target="_blank" rel="noopener">부산일보 보도</a> (중구는 추정).' : '<br>재정자립도: 상가·직장인 밀도로 만든 게임용 추정치.') + (CITY_ID === 'gwangju' ? '<br>광주는 통합특별시 출범 전 광주광역시 5개 구만 지도에 담았습니다.' : '') + '<br>행정동 경계: 통계청·행정안전부 자료를 정리한 admdongkor(MIT), 2026년 10월 기준.</p><p class="src">경제·인프라·생활 점수와 동네 유형은 통계를 바탕으로 계산한 게임용 값으로, 실제 순위가 아니며 동네의 우열을 뜻하지 않습니다. 등장 단체와 사건은 모두 지어낸 것입니다.</p>';
  var MODE_SRC = '<p class="src">' + (NATION ? '한 칸은 서울·광역시의 자치구·군, 도의 시·군입니다(시 아래 일반구는 하나로 합침).<br>' : '') + '주민 수: 행정안전부 주민등록 인구통계 2026년 7월 (행정동·읍면 단위, <a href="https://github.com/yadoran-2025/korea-population-classroom-kit" target="_blank" rel="noopener">정리본</a>).<br>상가 수: 소상공인시장진흥공단 상가(상권)정보 2026년 9월 (<a href="https://github.com/team-datapopcorn/sanggwon-dashboard" target="_blank" rel="noopener">약 2km 격자 집계본</a>을 읍면동 면적·인구에 맞춰 나눔).<br>직장인 수·집객시설은 ' + (NATION ? '서울은 서울 열린데이터광장 실제값, 그 밖은 ' : '') + '서울 실제값과 상가 수의 관계로 옮긴 게임용 추정치입니다.<br>' + (NATION ? 'KTX·SRT 주요 정차역을 역이 있는 시군구에 직접 배정했습니다. KTX 기습은 역이 있는 칸끼리 120km 안에서 됩니다.' : '역: 수도권 전철(경기·충남 천안아산·강원 춘천 구간 포함)은 OpenStreetMap 기여자(ODbL) 좌표, 광역시 도시철도는 역 목록 기준 배정, 김해·양산·경산 경전철·도시철도는 역 이름 기준으로 대략 배정했습니다. 일반 철도역은 넣지 않았습니다.') + '<br>재정자립도: 상가·직장인 밀도로 만든 게임용 추정치' + (/부산/.test(DATA.full) ? '(부산 구는 보도 수치)' : '') + '.<br>' + (/울릉/.test(DATA.full) ? '울릉군은 지도가 너무 넓어져 뺐습니다. ' : '') + (/추자/.test(DATA.full) ? '추자면은 지도가 너무 넓어져 뺐습니다. ' : '') + '바다로 떨어진 섬은 가장 가까운 뭍과 다리로 이어진 것으로 칩니다.<br>행정동 경계: 통계청·행정안전부 자료를 정리한 admdongkor(MIT), 2026년 10월 기준.</p><p class="src">경제·인프라·생활 점수와 동네 유형은 통계를 바탕으로 계산한 게임용 값으로, 실제 순위가 아니며 지역의 우열을 뜻하지 않습니다. 직함과 등장 단체, 사건은 모두 게임용으로 지어낸 것입니다.</p>';
  function factsHTML(d) {
    if (!SEOUL) return '<p class="facts num">주민 <b>' + d.pop.toLocaleString('ko-KR') + '명</b> · 직장인 <b>약 ' + d.work.toLocaleString('ko-KR') + '명</b> · 상가 <b>약 ' + (d.st || 0).toLocaleString('ko-KR') + '곳</b> · 지하철역 <b>' + d.sub + '개</b> · 약국 <b>약 ' + d.ph + '곳</b> · 면적 <b>' + d.km + '㎢</b></p>';
    return '<p class="facts num">주민 <b>' + d.pop.toLocaleString('ko-KR') + '명</b> · 직장인 <b>' + (d.est ? '약 ' : '') + d.work.toLocaleString('ko-KR') + '명</b> · 지하철역 <b>' + d.sub + '개</b> · 버스 정류장 <b>' + d.bus + '개</b> · 병원·약국 <b>' + (d.hosp + d.ph) + '곳</b> · 학교 <b>' + d.sch + '곳</b> · 면적 <b>' + d.km + '㎢</b></p>';
  }
  function renderPick() {
    var sv = loadSave();
    var d = pickSel !== null ? D[pickSel] : null;
    var q = $('q') ? $('q').value : '';
    var html = '<div id="cities">' + CITY_GROUPS.map(function (g) { return '<div class="cityRow"><small>' + g[0] + '</small>' + g[1].map(function (c) { return '<button type="button" class="chip city' + (c[0] === CITY_ID ? ' on' : '') + '" data-c="' + c[0] + '"' + (c[0] === CITY_ID ? ' aria-pressed="true"' : '') + '>' + c[1] + (hasSave(c[0]) && c[0] !== CITY_ID ? ' ·' : '') + '</button>'; }).join('') + '</div>'; }).join('') + '</div>';
    if (sv && !sv.over && !sv.won) html += '<button class="btn red" id="resume" type="button" style="width:100%;margin-bottom:10px">이어 하기 · ' + esc(D[sv.start].n) + ' 출신, ' + dateOf(sv.month) + '</button>';
    html += '<input id="q" type="search" autocomplete="off" aria-label="동 이름 검색" placeholder="우리 동네 검색, 또는 지도에서 누르기" value="' + esc(q) + '"><div id="results"></div>';
    html += '<div id="presets">' + PRESETS.map(function (p) {
      var i = idOf(p[0], p[1]);
      return '<button type="button" data-i="' + i + '"' + (i === pickSel ? ' class="on"' : '') + '>' + p[1] + ' · ' + p[2] + '<small>' + difficulty(i) + ' · ' + p[3] + '</small></button>';
    }).join('') + '</div>';
    if (d) {
      html += '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--line)"><div class="head"><div><h2>' + esc(d.n) + '<span class="diff">' + difficulty(pickSel) + '</span></h2><p>' + GU[d.g].n + ' · ' + GU[d.g].r + '</p></div></div><p class="why">' + reasonOf(pickSel) + (bests()[pickSel] ? ' 이 동 최고 기록은 ' + bests()[pickSel] + '개월입니다.' : '') + '</p><div class="acts"><button class="btn red" id="begin" type="button">' + esc(hd(d.n)) + '으로 시작</button></div>' + typeHTML(d) + abilHTML(d.type, true) + gaugeHTML(d) + factsHTML(d) + '</div>';
    }
    html += '<p class="why">점수와 유형은 ' + (SEOUL ? '2023~2024년' : '2026년') + ' 통계로 계산한 게임용 값입니다. <button id="randBtn" class="linkish" type="button">아무 동이나 고르기</button> · <button id="importBtn" class="linkish" type="button">저장 코드 불러오기</button></p>';
    $('pick').innerHTML = tx(html);
    bind('importBtn', importDialog);
    Array.prototype.forEach.call(document.querySelectorAll('#cities .city'), function (b) { b.addEventListener('click', function () { switchCity(b.dataset.c); }); });
    bind('randBtn', function () { choosePick(Math.floor(Math.random() * D.length)); });
    var inp = $('q');
    inp.addEventListener('input', function () { searchList(inp.value); });
    Array.prototype.forEach.call($('presets').children, function (b) { b.addEventListener('click', function () { choosePick(+b.dataset.i); }); });
    if ($('begin')) $('begin').addEventListener('click', function () { beginGame(pickSel); });
    if ($('resume')) $('resume').addEventListener('click', function () { resumeGame(sv); });
    if (q) searchList(q);
  }
  function searchList(q) {
    q = q.trim().replace(/\s+/g, '');
    var box = $('results');
    if (!q) { box.innerHTML = ''; return; }
    var hits = [];
    D.forEach(function (d, i) {
      var name = GU[d.g].n + d.n;
      if (name.indexOf(q) >= 0) hits.push(i);
    });
    box.innerHTML = hits.slice(0, 7).map(function (i) { return '<button type="button" data-i="' + i + '">' + GU[D[i].g].n + ' <b>' + esc(D[i].n) + '</b></button>'; }).join('') || '<p class="why">찾는 동이 없습니다. 행정동 이름으로 찾아 보세요.</p>';
    Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () { $('q').value = ''; choosePick(+b.dataset.i); });
    });
  }
  function choosePick(i) {
    pickSel = i;
    renderPick();
    dirty();
    requestAnimationFrame(function () { fitAll(false); });
  }

  // ---- 게임 시작 ----
  function beginGame(i, seed) {
    clearSave();
    S = E.create(DATA, i, seed !== undefined ? seed : (Date.now() & 0x7fffffff));
    S.city = CITY_ID;
    enterGame();
    setNews('첫 목표: 분홍색 동을 눌러 옆 동네를 차지하세요.');
    save();
  }
  function resumeGame(sv) {
    S = sv;
    enterGame();
    setNews(S.log[0] ? S.log[0].t : '');
  }
  function enterGame() {
    $('start').hidden = true; $('hud').hidden = false; $('bottom').hidden = false; $('over').hidden = true;
    sel = null; lens = 0; sheetMode = 'none';
    sync();
    requestAnimationFrame(function () {
      var mine = E.dongsOf(S, 0), g = D[S.f[0].cap].g;
      fitAll(false);
      if (mine.length < 25) fitBox(expand(guBox[g], 60), 6, false);
      dirty();
    });
  }
  function expand(b, m) { return [b[0] - m, b[1] - m, b[2] + m, b[3] + m]; }

  // ---- 상태 동기화 ----
  function computeReach() {
    reach = {}; recDong = null;
    if (!S || S.over) return;
    var mine = E.dongsOf(S, 0), pact = S.f[0].pact || {};
    mine.forEach(function (i) {
      D[i].a.forEach(function (j) {
        var o = S.owner[j];
        if (o === 0 || (o > 0 && pact[o] > S.month)) return;
        reach[j] = 1;
      });
    });
    mine.forEach(function (i) {
      E.subwayOf(i).forEach(function (j) {
        var o = S.owner[j];
        if (o === 0 || reach[j] || (o > 0 && pact[o] > S.month)) return;
        reach[j] = 2;
      });
    });
    if (S.stat.took === 0) {
      var bestN = 1e9;
      Object.keys(reach).forEach(function (k) { if (reach[k] !== 1 || S.owner[k] !== -1) return; var n = E.needFor(S, +k, 0.8); if (n < bestN) { bestN = n; recDong = +k; } });
    }
  }
  function bestGu() {
    var list = E.guDongs(), best = -1, bk = -1;
    list.forEach(function (ds, g) {
      var k = ds.filter(function (i) { return S.owner[i] === 0; }).length / ds.length;
      if (k > bk) { bk = k; best = g; }
    });
    return best;
  }
  function bestRegion() {
    var c = {};
    E.guDongs().forEach(function (ds, g) {
      var k = ds.filter(function (i) { return S.owner[i] === 0; }).length;
      if (k * 2 >= ds.length) c[GU[g].r] = (c[GU[g].r] || 0) + 1;
    });
    var bn = null, bv = 0; Object.keys(c).forEach(function (r) { if (c[r] > bv) { bv = c[r]; bn = r; } });
    return bn;
  }
  function title() {
    if (S.rank >= 3) return MAYOR;
    if (S.rank === 2) return SEOUL || NATION ? (bestRegion() || CNAME) + ' 권역장' : KIND === 'metro' ? CNAME + ' ' + RANK2 : RANK2;
    if (S.rank === 1) return hd(GU[bestGu()].n);
    return hd(D[S.f[0].cap].n);
  }
  function goalShort() {
    if (S.rank < 1) return R1S + ' ' + E.guStatus(S, bestGu()).need + '개 더';
    if (S.rank < 2) return R2S + ' ' + Math.max(0, R2 - E.guHeld(S, 0)) + (KIND === 'metro' ? '구' : '곳') + ' 더';
    if (S.elect && !S.won) return '선거 ' + Math.max(0, S.elect.at - S.month) + '달 · ' + (E.voteShare(S) * 100).toFixed(0) + '%';
    return '인구 ' + (E.popShare(S, 0) * 100).toFixed(1) + '%';
  }
  function goalLong() {
    if (S.rank < 1) { var g = bestGu(); return hd(GU[g].n) + '까지 ' + E.guStatus(S, g).need + '개 ' + UNITN; }
    if (S.rank < 2) return R2S + '까지 ' + GRP + ' ' + Math.max(0, R2 - E.guHeld(S, 0)) + '곳';
    if (S.elect && !S.won) return MAYOR + ' 선거 ' + Math.max(0, S.elect.at - S.month) + '달 뒤 · 예상 득표 ' + (E.voteShare(S) * 100).toFixed(1) + '% / 과반';
    return CNAME + ' 인구 ' + (E.popShare(S, 0) * 100).toFixed(1) + '% / 60%';
  }
  function firstWinCard(name, before, lost, back) {
    if (S.firstWinShown) return;
    S.firstWinShown = 1;
    var e = E.economy(S, 0);
    showCard('<div class="seal">접수</div><h2>' + esc(name) + ' 접수</h2><div class="rows num" style="text-align:left;margin-top:10px"><div class="row"><span>우리 동</span><span>' + before.n + '개 → ' + e.n + '개</span></div><div class="row"><span>월 세수</span><span>' + signed(e.tax - before.tax, money) + '</span></div><div class="row"><span>월 동원</span><span>' + signed(e.draft - before.draft, people) + '</span></div><div class="row"><span>집에 간 인원</span><span>' + people(lost) + '</span></div><div class="row"><span>다음 달 복귀</span><span>' + people(back) + '</span></div><div class="row"><span>다음 목표</span><span>' + esc(goalLong()) + '</span></div></div><p>새로 얻은 동은 민심이 낮아 세수가 적지만 달마다 회복합니다. 남은 결재를 쓰거나 다음 달로 넘어가세요.</p><div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
    bind('cardOk', hideCard);
  }
  function checkFullGu() {
    if (!S.fullSeen) { S.fullSeen = GU.map(function (g, i) { return E.fullGu(S, 0, i) ? 1 : 0; }); return; }
    GU.forEach(function (g, i) {
      var full = E.fullGu(S, 0, i);
      if (full && !S.fullSeen[i]) {
        S.fullSeen[i] = 1;
        stampWorld(g.x, g.y, true, g.n + ' 완성');
        var msg = E.J(g.n, '을', '를') + ' 통째로 장악했습니다. 이 ' + GRP + ' 세수 +' + g.f + '%.';
        S.log.unshift({ m: S.month, t: msg, k: 'good' });
        $('news').textContent = tx(msg) + ' ' + $('news').textContent; $('news').className = '';
      }
      if (!full && S.fullSeen[i]) S.fullSeen[i] = 0;
    });
  }
  function checkCombo() {
    if (!S.comboNew || !S.comboNew.length) return;
    S.comboNew.forEach(function (k, n) {
      var g = S.combo[k].d, x = 0, y = 0; g.forEach(function (j) { x += D[j].x; y += D[j].y; });
      setTimeout(function () { stampWorld(x / g.length, y / g.length, true, E.COMBO[k].n.replace(/ (생활권|연합)$/, '') + ' 완성'); }, n * 500);
    });
    S.comboNew = null;
  }
  function sync() {
    checkFullGu(); checkCombo();
    var fresh = updateFog();
    if (fresh.length) { var rn = revealNews(fresh); S.log.unshift({ m: S.month, t: rn, k: 'n' }); var nw = $('news'); if (nw.className !== 'bad' && nw.textContent.length < 40) nw.textContent = (nw.textContent ? nw.textContent + ' ' : '') + rn; }
    computeReach();
    var me = S.f[0], e = E.economy(S, 0);
    $('who').textContent = title();
    $('when').textContent = dateOf(S.month);
    $('cMoney').textContent = money(me.money);
    $('cMoneyD').textContent = signed(e.net, money) + '/월';
    $('cMoneyD').className = 'num' + (e.net < 0 ? ' neg' : '');
    $('cTroops').textContent = me.troops >= 10000 ? (me.troops / 10000).toFixed(1) + '만명' : people(me.troops);
    $('cTroopsD').textContent = me.away >= 1 ? '출동 ' + people(me.away) : signed(e.draft - e.decay, people) + '/월';
    $('cAp').textContent = S.ap + '건';
    $('cN').textContent = e.n + '개';
    $('cPop').textContent = tx(goalShort());
    $('lens').textContent = '지도: ' + LENS[lens];
    $('next').className = S.ap <= 0 ? 'go' : '';
    var lg = $('legend');
    lg.hidden = !lens;
    if (lens) { $('legendName').textContent = LENS[lens]; lg.style.top = ($('hud').getBoundingClientRect().bottom + 8) + 'px'; }
    var gb = $('govBar'), gi0 = E.govInfo(S);
    gb.hidden = !gi0;
    if (gi0) gb.textContent = '정부 공모: ' + gi0.G.n + ' · ' + gi0.left + '달 남음 · 신청 가능 ' + gi0.ok.length + '곳';
    var ob = $('offerBar'), oi0 = E.offerInfo(S);
    ob.hidden = !oi0;
    if (oi0) ob.textContent = '협상 제안: ' + oi0.name + ' · ' + oi0.give.length + '개 동 · ' + oi0.left + '달 남음';
    var bar = $('evBar');
    bar.hidden = !S.ev;
    if (S.ev) { var ve = E.eventView(S); bar.textContent = '민원 1건: ' + ve.t + ' · ' + ve.left + '달 안에 처리'; }
    syncPin();
    syncTodo();
    renderSheet();
    dirty();
    checkOverlay();
    $('next').innerHTML = S.ap > 0 ? '다음 달<small>결재 ' + S.ap + '건 남음</small>' : '다음 달 ▶';
  }
  // 지금 할 수 있는 가장 좋은 한 수: 승률 80%로 칠 수 있는 동 중 인구가 가장 큰 곳 → 없으면 설득 → 모집
  function recommend() {
    if (!S || S.over || S.ap <= 0) return null;
    if (S.elect && !S.won) {
      var bc = null; GU.forEach(function (x, gi) { var ci = E.campInfo(S, gi); if (ci.ok && ci.gain >= 0.002 && (!bc || ci.gain > bc.gain)) bc = { g: gi, gain: ci.gain }; });
      if (bc) return { k: 'gu', g: bc.g, txt: '추천 · ' + GU[bc.g].n + ' 유세 +' + (bc.gain * 100).toFixed(1) + '%p' };
    }
    if (S.rank >= 1) {
      var bz = null;
      (S.zones || []).forEach(function (z) { var pv = E.zoneAttackPreview(S, z.id, 0.25); if (pv.can >= 2 && S.ap >= pv.ap && (!bz || pv.can > bz.can)) bz = { id: z.id, nm: z.nm, can: pv.can }; });
      if (bz) return { k: 'zone', z: bz.id, txt: '추천 · ' + bz.nm + ' 작전 ' + bz.can + '곳' };
      var bg = null;
      GU.forEach(function (x, gi) { var pv = E.guAttackPreview(S, gi, 0.25); if (pv.can >= 2 && S.ap >= pv.ap && (!bg || pv.can > bg.can)) bg = { g: gi, can: pv.can }; });
      if (bg) return { k: 'gu', g: bg.g, txt: '추천 · ' + GU[bg.g].n + ' 작전 ' + bg.can + '곳' };
    }
    var me = S.f[0], mine = E.dongsOf(S, 0), seen = {}, best = null, bestP = null, max = Math.floor(me.troops);
    mine.forEach(function (a) { D[a].a.forEach(function (j) {
      if (seen[j] || S.owner[j] === 0 || fogged(j)) return; seen[j] = 1;
      var o = S.owner[j]; if (o > 0 && me.pact && me.pact[o] > S.month) return;
      var n = E.needFor(S, j, 0.8); if (!n || n > max) return;
      var pv = E.preview(S, j, n); if (!pv.ok) return;
      var v = D[j].pop + (D[j].work || 0) * 0.5 + (S.rivalPlan && S.rivalPlan.src === j ? 1e7 : 0);
      if (!best || v > best.v) best = { t: j, v: v, n: n, pct: pv.pct };
      if (o === -1 && pv.route && pv.route.via !== 'subway') { var c = E.persuadeCost(S, j); if (c <= me.money && (!bestP || D[j].pop > bestP.v)) bestP = { t: j, v: D[j].pop, c: c }; }
    }); });
    if (!best && !bestP) {
      Object.keys(reach || {}).some(function (k) { var j = +k; if (S.owner[j] === 0 || fogged(j) || S.owner[j] > 0) return false; var pv = E.preview(S, j, 1); if (!pv.route || pv.route.via === 'subway') return false; var c = E.persuadeCost(S, j); if (c <= me.money) { bestP = { t: j, v: D[j].pop, c: c }; return true; } return false; });
    }
    if (best) return { k: 'atk', t: best.t, txt: '추천 · ' + D[best.t].n + ' 치기 ' + Math.round(best.pct * 100) + '%' };
    if (bestP) return { k: 'per', t: bestP.t, txt: '추천 · ' + D[bestP.t].n + ' 설득 ' + money(bestP.c) };
    if (me.money >= 100 && max < 200) return { k: 'rec', txt: '추천 · 인원 모집 (' + money(me.money) + ' 있음)' };
    return null;
  }
  function syncTodo() {
    var el = $('todo'), r = recommend();
    el.hidden = !r || S.won || S.over || !!TLS || sheetMode === 'zpick' || (sel !== null && r.t === sel) || (sheetMode === 'gu' && r.k === 'gu' && guSel === r.g) || (sheetMode === 'zone' && r.k === 'zone' && zoneSel === r.z);
    if (!el.hidden) { el.innerHTML = '<span>' + esc(tx(r.txt)) + '</span><b>›</b>'; el.dataset.k = r.k; el.dataset.t = r.t === undefined ? '' : r.t; el.dataset.g = r.g === undefined ? '' : r.g; el.dataset.z = r.z === undefined ? '' : r.z; }
  }
  // 이번 달 잃은 동은 소식 줄 옆에 고정 (다른 소식이 덮어도 남음). 누르면 그 동으로, 여러 건이면 전투 결과 다시 보기
  function lostNow() { var mk = S && S.marks && S.marks.m === S.month ? S.marks : null; return mk ? mk.list.filter(function (x) { return x.k === 'lost' && D[x.t]; }) : []; }
  function syncPin() {
    var pin = $('pin'), lost = lostNow();
    pin.hidden = !lost.length;
    if (lost.length) { pin.textContent = '함락 ' + D[lost[0].t].n + (lost.length > 1 ? ' 외 ' + (lost.length - 1) : '') + ' ›'; pin.setAttribute('aria-label', '이번 달 빼앗긴 동 보기'); }
  }

  // 소식 줄에 띄울 '다음에 올 일' 하나: 완공·승진 직전 > 조합 기회 > 공모 예고
  function nextHint() {
    if (!S || S.over) return '';
    var mine = E.dongsOf(S, 0), i, k;
    for (i = 0; i < mine.length; i++) {
      var g = E.govSite(S, mine[i]);
      if (g && g.done === S.month + 1) return '예정: 다음 달 ' + D[mine[i]].n + ' ' + E.GOV[g.k].n.replace(/ (이전|건립|유치|지정)$/, '') + (g.k === 'plant' ? ' 준공 · 지원금 +100억' : g.k === 'agency' ? ' 완공 · 월수입 +25억' : ' 완공');
    }
    if (S.rank < 1) { var bg = bestGu(), st = E.guStatus(S, bg); if (st.need === 1) return '예정: ' + UNITN + ' 하나만 더 먹으면 ' + hd(GU[bg].n); }
    else if (S.rank < 2 && R2 - E.guHeld(S, 0) === 1 && GU.some(function (x, gi) { var t = E.guStatus(S, gi); return !t.half && t.need === 1; })) return '예정: ' + GRP + ' 하나만 더 절반을 넘기면 ' + R2S;
    var seen = {}, cand = [];
    mine.forEach(function (a) { D[a].a.forEach(function (j) { if (!seen[j] && S.owner[j] !== 0 && !fogged(j)) { seen[j] = 1; cand.push(j); } }); });
    for (k = 0; k < cand.length && k < 40; k++) { var cp = E.comboPreview(S, cand[k]); if (cp.length) return '기회: ' + E.J(D[cand[k]].n, '을', '를') + ' 얻으면 ' + cp[0].n + ' 완성 · ' + cp[0].gain; }
    var gn = E.govNext(S); if (gn && gn.left <= 1) return '예정: 다음 달 정부 공모 · ' + gn.G.n + ' · ' + gn.G.cond;
    return '';
  }
  function setNews(t, bad) {
    var n = $('news');
    n.textContent = tx(t);
    n.className = bad ? 'bad' : '';
  }

  // ---- 시트 ----
  function select(i, quick) {
    if (i !== sel) { diploOpen = false; devOpen = {}; }
    peek = !!quick && i !== null && !isWide();
    sel = i; errMsg = '';
    sheetMode = i === null ? 'none' : 'dong';
    $('sheet').scrollTop = 0;
    if (i !== null && S.owner[i] !== 0) {
      var n = E.needFor(S, i, 0.8);
      sendN = Math.max(1, Math.min(Math.floor(S.f[0].troops), n));
    }
    renderSheet();
    dirty();
    if (i !== null) requestAnimationFrame(function () { ensureVisible(i); });
  }
  $('todo').addEventListener('click', function () {
    var el = $('todo'); if (el.dataset.k === 'rec') { sel = null; sheetMode = 'realm'; renderSheet(); return; }
    if (el.dataset.k === 'gu') { openGu(+el.dataset.g); return; }
    if (el.dataset.k === 'zone') { openZone(+el.dataset.z); return; }
    var t = +el.dataset.t; select(t, true); requestAnimationFrame(function () { ensureVisible(t); });
  });
  function closeSheet() { sel = null; sheetMode = 'none'; errMsg = ''; confirmNew = false; renderSheet(); dirty(); }
  function renderSheet() {
    var sh = $('sheet'), key = sheetMode + ':' + sel + ':' + guSel;
    if (S) syncTodo();
    if (key !== lastSheetKey) { lastSheetKey = key; requestAnimationFrame(function () { sh.scrollTop = 0; }); }
    if (sheetMode === 'none') { sh.hidden = true; sh.classList.remove('peek'); if (isWide()) idleColumn(); return; }
    sh.hidden = false;
    if (sheetMode !== 'dong' || isWide()) peek = false;
    sh.classList.toggle('peek', peek);
    if (sheetMode === 'dong') { if (sel === null) { sh.hidden = true; return; } if (S.owner[sel] === 0) ownSheet(sh); else enemySheet(sh); }
    else if (sheetMode === 'realm') realmSheet(sh);
    else if (sheetMode === 'log') logSheet(sh);
    else if (sheetMode === 'menu') menuSheet(sh);
    else if (sheetMode === 'gu') guSheet(sh);
    else if (sheetMode === 'ev') eventSheet(sh);
    else if (sheetMode === 'gov') govSheet(sh);
    else if (sheetMode === 'offer') offerSheet(sh);
    else if (sheetMode === 'zpick') zpickSheet(sh);
    else if (sheetMode === 'zone') zoneSheet(sh);
    var x = sh.querySelector('.x');
    if (x) x.addEventListener('click', closeSheet);
    bind('qMore', function () { peek = false; renderSheet(); sfx('page'); });
  }
  function moreBtn(label) { return '<button class="btn qmore" id="qMore" type="button">' + (label || '자세히') + ' ▾</button>'; }
  function idleColumn() {
    var sh = $('sheet');
    sh.hidden = false;
    realmSheet(sh);
    var x = sh.querySelector('.x'); if (x) x.remove();
    var tip = document.createElement('p');
    tip.className = 'why';
    tip.textContent = tx(S.stat.took === 0 ? '첫 목표: 옆 동네 차지하기. 지도에서 분홍색 동을 누르세요.' : '빨간 실선은 바로 칠 수 있는 동, 빨간 점선은 지하철로 기습할 수 있는 동입니다. 우리 동을 누르면 개발합니다.');
    sh.insertBefore(tip, sh.children[1]);
  }
  function headHTML(d, sub) {
    return '<div class="head"><div><h2>' + esc(d.n) + '</h2><p>' + sub + '</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
  }
  function viaText(r) {
    if (!r) return '';
    var src = D[r.src].n, pc = Math.round(r.mult * 100), tail = pc ? ' · 전력 ' + (pc > 0 ? '+' : '−') + Math.abs(pc) + '%' : '';
    if (r.via === 'land') return src + '에서 바로 진입' + tail;
    if (r.via === 'bridgeOk') return src + '에서 ' + WATER + ' 건너기' + tail;
    if (r.via === 'bridge') return src + '에서 ' + WATER + ' 건너기' + tail + ' (교통 2단계면 불이익 없음)';
    return src + '에서 지하철 기습' + tail;
  }
  function defWarn(left) {
    if (S.month < E.C.GRACE - 1) return '';
    var capI = S.f[0].cap, pact = S.f[0].pact || {}, cur = E.defense(S, capI), base = cur.base, def = base + Math.min(Math.max(0, left) * 0.24, base * 3), worst = null;
    D[capI].a.forEach(function (j) { var o = S.owner[j]; if (o > 0 && !(pact[o] > S.month) && (!worst || S.f[o].troops > worst.troops)) worst = S.f[o]; });
    if (!worst || worst.troops * 0.8 < def * 1.25) return '';
    return '<br><b class="warn">본거지 옆 ' + esc(worst.name) + '(' + people(worst.troops) + ')이 노릴 수 있습니다.</b>';
  }
  function emptyWarn(left) {
    var r = S.rival, me = S.f[0];
    if (r < 0 || !S.f[r].alive || S.month <= E.C.GRACE + 4 || E.dongsOf(S, 0).length <= 10 || (me.pact && me.pact[r] > S.month)) return '';
    if ((me.away || 0) + sendN <= Math.max(30, left) * 2) return '';
    if (!E.dongsOf(S, r).some(function (i) { return D[i].a.some(function (j) { return S.owner[j] === 0; }); })) return '';
    return '<br><b class="warn">보내고 나면 나가 있는 인원이 남은 인원의 두 배가 넘습니다. ' + esc(E.J(S.f[r].name, '이', '가')) + ' 빈집을 노릴 수 있습니다.</b>';
  }
  function estHTML(p) {
    var left = Math.floor(S.f[0].troops) - sendN, quick = S.express === S.month && p.route && p.route.via === 'subway' && (S.expQ || 0) < 3;
    return '예상 귀가: 이기면 ' + p.winLoss[0] + '~' + p.winLoss[1] + '명 · 지면 ' + p.loseLoss[0] + '~' + p.loseLoss[1] + '명<br><b class="keep">공격 후 남는 대기 인원 ' + people(Math.max(0, quick ? left + sendN : left)) + '</b> · ' + (quick ? '나머지는 급행으로 바로 복귀 (' + (3 - (S.expQ || 0)) + '번 남음)' : '나머지는 다음 달 복귀') + (quick ? '' : defWarn(left) + emptyWarn(left));
  }
  function guLinkHTML(g) {
    var st = E.guStatus(S, g);
    return '<button class="guLink" id="guLink" type="button"><span>' + GU[g].n + ' 현황' + (S.rank >= 1 ? '·한꺼번에 작전' : '') + '</span><span class="num">' + st.have + '/' + st.total + ' ›</span></button>';
  }
  // 첫 화면은 판단용(누구 땅·할 수 있는 일·누르면 달라지는 것), 계산·통계·외교는 접어 둠
  var diploOpen = false, devOpen = {};
  function typeLine(d) { var T = E.TYPES[d.type]; return '<p class="type"><b>' + T.n + '</b> · <span>' + T.e + '</span></p>'; }
  function srcLine(d) {
    return '<p class="src">' + (SEOUL ? '주민·직장인·시설: 서울 열린데이터광장 상권분석서비스(2023~2024년 기준)' + (d.est ? '. 이 동 직장인 수는 같은 구 값으로 추정' : '') : '주민: 행정안전부 주민등록 인구통계(2026년 7월) · 상가: 소상공인시장진흥공단(2026년 9월, 격자 집계를 나눈 값) · 직장인 수는 추정값') + '. 네 가지 점수는 통계로 계산한 게임용 값입니다. 전체 출처는 메뉴에 있습니다.</p>';
  }
  function statsHTML(i, extra) {
    var d = D[i], T = E.TYPES[d.type], roles = E.roleOf(i);
    return '<details class="more"><summary>실제 동네 통계 보기</summary><p class="why"><b>' + T.n + '</b> ' + T.t + (roles.length ? '<br>동네 조합 역할: ' + roles.join('·') : '') + '</p>' + (extra || '') + gaugeHTML(d) + factsHTML(d) + srcLine(d) + '</details>';
  }
  function lack(c) { return '예산이 ' + money(Math.ceil(c - S.f[0].money)) + ' 모자랍니다.'; }
  function enemySheet(sh) {
    var d = D[sel], o = S.owner[sel], me = S.f[0];
    if (fogged(sel)) {
      sh.innerHTML = headHTML(d, GU[d.g].n + ' · 안개 속') + '<p class="prose">아직 소식이 들어오지 않은 동네입니다. 누가 쥐고 있는지 모릅니다. ' + GU[d.g].n + '와 맞닿은 동을 차지하면 구 전체가 보입니다.</p>' + typeLine(d) + statsHTML(sel);
      return;
    }
    var sub = GU[d.g].n + ' · ';
    if (o === -1) sub += '독립 동';
    else sub += '<span class="dot" style="background:' + fCol(o) + '"></span>' + esc(S.f[o].name) + (S.f[o].cap === sel ? ' 본거지' : '') + (o === S.rival ? ' · 숙적' : '') + (E.inCoal(S, o) ? ' · 연합' : '') + (moodWord(o) ? ' · <b class="mw ' + E.moodOf(S, o) + '">' + moodWord(o) + '</b>' : '') + ' · ' + E.traitOf(S, o).word;
    var max = Math.floor(me.troops);
    sendN = Math.max(max > 0 ? 1 : 0, Math.min(max, sendN));
    var p = E.preview(S, sel, sendN), pacted = o > 0 && me.pact && me.pact[o] > S.month;
    var per = o === -1 && p.route && p.route.via !== 'subway', c = per ? E.persuadeCost(S, sel) : 0;
    if (peek) {
      // 간단 보기: 판단에 필요한 한 줄 + 바로 누를 버튼. 나머지는 '자세히'
      var q = headHTML(d, sub) + '<div class="quick">';
      if (!p.route) q += '<p class="qstat">' + esc(p.reason) + ' 근처 동을 먼저 차지하세요.</p><div class="qrow">' + moreBtn() + '</div>';
      else if (pacted) q += '<p class="qstat">불가침 협정 ' + (me.pact[o] - S.month) + '달 남음 · 지금은 못 칩니다.</p><div class="qrow">' + moreBtn('협정·외교 보기') + '</div>';
      else {
        var cp = E.comboPreview(S, sel);
        q += '<p class="qstat num">상대 방어 <b>' + people(p.def.total) + '</b> · ' + esc(viaText(p.route)) + (cp.length ? '<br><b class="good">' + esc(cp[0].n) + ' 완성</b> · ' + esc(cp[0].gain) : '') + '</p>';
        q += '<div class="qrow' + (per ? ' two' : '') + '">';
        var weak = p.ok && p.pct < 0.5;
        q += '<button class="btn' + (weak ? '' : ' red') + '" id="atk" type="button"' + (p.ok ? '' : ' disabled') + '>쳐들어가기 <span class="pct num" id="pctV">' + Math.round(p.pct * 100) + '%</span><small>결재 1건 · <span id="atkN">' + people(sendN) + '</span> 보냄</small></button>';
        if (per) q += '<button class="btn" id="per" type="button"' + (me.money >= c && S.ap > 0 ? '' : ' disabled') + '>돈으로 설득<small>결재 1건 · ' + money(c) + '</small></button>';
        q += '</div>';
        var why = p.reason ? esc(p.reason) : max < 1 ? '보낼 인원이 없습니다. 출동한 인원은 다음 달 돌아옵니다.' : S.ap <= 0 ? '이번 달 결재를 다 썼습니다. 다음 달에 치세요.' : weak ? '인원이 모자라 승률이 낮습니다. 위쪽 숫자판을 눌러 모집하거나, 출동 인원이 돌아오는 다음 달에 치세요.' : '';
        if (why) q += '<p class="qstat warn">' + why + '</p>';
        else if (S.stat.took === 0) q += '<p class="tip">승률 80%가 되게 인원을 맞춰 놨습니다. 인원·승률을 바꾸려면 자세히를 누르세요.</p>';
        q += '<div class="qrow">' + moreBtn('인원 조절 · 외교 · 통계') + '</div>';
      }
      if (errMsg) q += '<p class="err">' + esc(errMsg) + '</p>';
      sh.innerHTML = tx(q + '</div>');
      bind('atk', guard(doAttack));
      bind('per', guard(persuadeNow));
      return;
    }
    var html = headHTML(d, sub) + (o > 0 ? bossHTML(o, kindFor(o)) + (S.f[o].adv ? bossHTML(o, 'adv', '', true) : '') : '') + typeLine(d) + govBadge(sel) + comboHTML(sel);
    if (!p.route) {
      html += '<p class="why" style="margin-top:10px">' + esc(p.reason) + ' 근처 동을 먼저 차지하세요.' + (o > 0 && S.f[o].cap === sel ? ' 본거지는 지하철로 칠 수 없습니다.' : ' 역이 있는 우리 동에서 4km 안이면 지하철로 칠 수 있습니다.') + '</p>';
    } else if (pacted) {
      html += '<p class="why" style="margin-top:10px">불가침 협정이 ' + (me.pact[o] - S.month) + '달 남았습니다.</p><div class="acts"><button class="btn" id="bp" type="button">협정 깨기 (모든 우리 동 민심 −10)</button></div>';
    } else {
      html += '<div class="fight"><div><small>상대 방어</small><div class="big num">' + people(p.def.total) + '</div><div class="via">' + esc(viaText(p.route)) + '</div></div><div class="pct"><small>승률</small><div class="big num" id="pctV">' + Math.round(p.pct * 100) + '%</div></div></div>';
      html += '<div class="send"><input id="send" type="range" min="' + (max > 0 ? 1 : 0) + '" max="' + max + '" step="1" value="' + sendN + '" aria-label="보낼 인원"><output id="sendV" class="num">' + people(sendN) + '</output></div>';
      html += '<div class="chips">' + [[0.6, '60%'], [0.8, '80%'], [0.95, '95%']].map(function (x) {
        var nn = E.needFor(S, sel, x[0]);
        return '<button class="chip" type="button" data-n="' + nn + '"' + (nn > max ? ' disabled' : '') + '>승률 ' + x[1] + '</button>';
      }).join('') + '<button class="chip" type="button" data-n="' + max + '"' + (max < 1 ? ' disabled' : '') + '>전원</button></div>';
      html += '<p class="est num" id="estV">' + estHTML(p) + '</p>';
      var atk = '<button class="btn red" id="atk" type="button"' + (p.ok ? '' : ' disabled') + '>쳐들어가기<small>결재 1건 · <span id="atkN">' + people(sendN) + '</span></small></button>';
      var perB = per ? '<button class="btn" id="per" type="button"' + (me.money >= c && S.ap > 0 ? '' : ' disabled') + '>돈으로 설득<small>결재 1건 · ' + money(c) + '</small></button>' : '';
      html += '<div class="acts' + (per ? ' two' : '') + '">' + atk + perB + '</div>';
      if (p.reason) html += '<p class="why">' + esc(p.reason) + '</p>';
      else if (max < 1) html += '<p class="why">지금 보낼 인원이 없습니다. 출동한 인원은 다음 달에 돌아옵니다.</p>';
    }
    if (per && (pacted || !p.route)) per = false;
    if (per) {
      var full = E.taxOf(S, sel, {}) / (0.5 + 0.5 * S.min[sel] / 100) * 0.875, payM = 0, acc = 0;
      for (var q = 0; q < 24 && acc < c; q++) { acc += full * Math.min(1, 0.5 + q * 0.15); payM = q + 1; }
      html += '<p class="why num">설득은 확실히 얻습니다. 첫 달 세수·동원은 50%, 약 4달 뒤 정상(세수 약 ' + money(full) + '/월) · 이 동 수입만으로 약 ' + payM + '달이면 회수.' + (me.money < c ? ' <b class="warn">' + lack(c) + '</b>' : S.ap <= 0 ? ' <b class="warn">이번 달 결재를 다 썼습니다.</b>' : '') + '</p>';
    }
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    if (S.stat.took === 0 && p.route && !pacted) html += '<p class="tip">공격은 인원을 쓰고 승패가 갈립니다. 설득은 돈으로 확실히 얻습니다. 처음이면 승률 80%를 추천합니다.</p>';
    if (S.abil === 'town' && o === -1) {
      var vi = E.voteInfo(S, sel);
      html += '<div class="acts"><button class="btn ab" id="vote" type="button"' + (vi.ok ? '' : ' disabled') + '>주민투표 발의 · 다음 달 합류 · 결재 1건</button></div>' + (vi.why ? '<p class="why">' + esc(vi.why) + '</p>' : '');
    }
    if (o > 0) {
      var items = [], names = [], okN = 0;
      if (S.abil === 'office') {
        var si = E.scoutInfo(S, sel); names.push('스카우트'); if (si.ok) okN++;
        items.push('<button class="btn ab" id="scout" type="button"' + (si.ok ? '' : ' disabled') + '>스카우트' + (si.gain ? ' · 우리 +' + people(si.gain) + ' / 상대 −' + people(si.gain) + '<small>결재 1건 · ' + money(si.cost) + '</small>' : '') + '</button><p class="why">' + (si.why ? esc(si.why) + (si.gain ? ' ' : '') : '') + (si.gain ? '<b class="warn">제안하면 이 세력과 3달 동안 협정·통합 협상이 막힙니다.</b> 공격해 오려는 세력의 인원을 빼 오면 공세를 꺾을 수 있습니다.' : '') + '</p>');
      }
      if (!pacted) {
        var pc = E.pactCheck(S, o), mc = E.mergeCheck(S, o), pp = E.pactCost(S, o), mp = E.mergeCost(S, o);
        var pOk = pc.ok && me.money >= pp, mOk = mc.ok && me.money >= mp && S.ap > 0;
        names.push('불가침', '통합'); okN += (pOk ? 1 : 0) + (mOk ? 1 : 0);
        items.push('<button class="btn" id="pact" type="button"' + (pOk ? '' : ' disabled') + '>불가침 12개월<small>' + money(pp) + '</small></button>' + (pOk ? '<p class="why">12개월 동안 서로 공격하지 않습니다.</p>' : '<p class="why"><b class="lock">잠김</b> ' + esc(pc.ok ? lack(pp) : pc.why) + '</p>'));
        items.push('<button class="btn" id="merge" type="button"' + (mOk ? '' : ' disabled') + '>통합 제안<small>결재 1건 · ' + money(mp) + '</small></button>' + (mOk ? '<p class="why">이 세력의 동 ' + E.dongsOf(S, o).length + '개와 인원 절반이 바로 들어옵니다. 들어온 동은 몇 달 정착 기간을 거칩니다.</p>' : '<p class="why"><b class="lock">잠김</b> ' + esc(!mc.ok ? mc.why : me.money < mp ? lack(mp) : '이번 달 결재를 다 썼습니다.') + '</p>'));
      }
      if (items.length) html += '<details class="more diplo" id="diplo"' + (diploOpen ? ' open' : '') + '><summary>외교 · ' + names.join('·') + (okN ? ' <em>' + okN + '개 가능</em>' : '') + '</summary><div class="acts">' + items.join('') + '</div></details>';
    }
    html += guLinkHTML(d.g) + statsHTML(sel);
    sh.innerHTML = tx(html);
    var dp = $('diplo'); if (dp) dp.addEventListener('toggle', function () { diploOpen = dp.open; });
    var range = $('send');
    if (range) {
      range.addEventListener('input', function () { sendN = +range.value; updateFight(); });
      Array.prototype.forEach.call(sh.querySelectorAll('.chip'), function (b) {
        b.addEventListener('click', function () { sendN = Math.min(max, +b.dataset.n); range.value = sendN; updateFight(); });
      });
    }
    bind('atk', guard(doAttack));
    bind('per', guard(persuadeNow));
    bind('pact', function () { act(E.pact(S, o)); });
    bind('merge', guard(function () { act(E.merge(S, o), true); }));
    bind('scout', guard(function () { var r = E.scout(S, sel); act(r); if (!r.err) setNews(S.log[0].t); }));
    bind('vote', guard(function () { var r = E.vote(S, sel); act(r, true); if (!r.err) setNews(S.log[0].t); }));
    bind('bp', function () { act(E.breakPact(S, o)); });
    bind('guLink', function () { openGu(d.g); });
  }
  function persuadeNow() {
    var t = sel, before = E.economy(S, 0), r = E.persuade(S, t);
    act(r, true);
    if (!r.err) { stampAt(t, true); if (!S.won && !S.firstWinShown) { firstWinCard(D[t].n, before, 0, 0); save(); } }
  }
  function updateFight() {
    var p = E.preview(S, sel, sendN);
    $('pctV').textContent = Math.round(p.pct * 100) + '%';
    if ($('sendV')) $('sendV').textContent = people(sendN);
    if ($('estV')) $('estV').innerHTML = estHTML(p);
    var an = $('atkN'); if (an) an.textContent = people(sendN);
    var b = $('atk'); if (b) b.disabled = !p.ok;
  }
  function bind(id, fn) { var el = $(id); if (el) el.addEventListener('click', fn); }
  function act(res, clear) {
    if (res && res.err) { errMsg = res.err; renderSheet(); return; }
    errMsg = '';
    if (clear) { sel = null; sheetMode = 'none'; }
    var l = S.log[0]; if (l) setNews(l.t, l.k === 'bad');
    save(); sync();
  }
  function doAttack() {
    var t = sel, mark = S.last.length, before = E.economy(S, 0), o0 = S.owner[t], res = E.attack(S, t, sendN);
    if (res.err) { errMsg = res.err; renderSheet(); return; }
    var after = E.economy(S, 0);
    setNews(res.win ? D[t].n + ' 접수. ' + res.lost + '명 귀가, 세수 ' + signed(after.tax - before.tax, money) + '/월.' + (res.collapse ? ' ' + E.collapseText(res.collapse) : '') + (res.quick ? ' 급행으로 바로 복귀.' : '') : D[t].n + ' 공격 실패. ' + res.lost + '명 귀가.', !res.win);
    if (res.win) { sel = null; sheetMode = 'none'; }
    else { var n2 = E.needFor(S, t, 0.8); sendN = Math.max(1, Math.min(Math.floor(S.f[0].troops), n2)); }
    if (res.collapse && S.stat.rivalDown === res.collapse.name && !S.rivalShown) {
      S.rivalShown = res.collapse.name;
      stampAt(t, true, '숙적 해체');
      setNews(res.collapse.name + ' 회장이 마지막 회의를 열었습니다. 안건은 해산입니다.');
    } else stampAt(t, res.win);
    if (res.win && !S.won) firstWinCard(D[t].n, before, res.lost, res.back);
    if (res.collapse && o0 > 0 && $('over').hidden && res.collapse.joined + res.collapse.freed >= 3) {
      showCard('<div class="seal">해체</div><h2>' + esc(res.collapse.name) + ' 해체</h2>' + bossHTML(o0, 'fall') + '<p>' + esc(E.collapseText(res.collapse)) + '</p>' + (res.collapse.adv ? '<p class="why"><b class="warn">' + esc(S.f[o0].boss.nm) + ' 회장은 ' + esc(S.f[res.collapse.adv].name) + ' 고문으로 들어갔습니다. 다시 만날 겁니다.</b></p>' : '') + '<div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
      bind('cardOk', function () { hideCard(); sync(); });
    }
    save();
    sync();
  }
  function stampAt(i, win, txt) { stampWorld(D[i].x, D[i].y, win, txt || (win ? '접수' : '실패')); }
  function stampWorld(wx, wy, win, text) {
    sfx(win ? 'stamp' : 'fail');
    var x = wx * cam.s + cam.x, y = wy * cam.s + cam.y;
    var el = document.createElement('div');
    el.className = 'stampMark' + (win ? '' : ' fail') + (text.length > 2 ? ' long' : '');
    el.textContent = text;
    el.style.left = Math.max(50, Math.min(W - 50, x)) + 'px';
    el.style.top = Math.max(50, Math.min(H - 50, y)) + 'px';
    $('stampLayer').appendChild(el);
    setTimeout(function () { el.remove(); }, REDUCED ? 500 : 800);
  }
  function ownSheet(sh) {
    var d = D[sel], me = S.f[0], list = E.dongsOf(S, 0), fm = E.fullMapOf(S, 0, list), dk = E.drafted(E.nEff(list));
    var def = E.defense(S, sel);
    var capt = me.cap === sel;
    var gtx = E.govTaxOf(S, sel), base = E.taxOf(S, sel, fm), nowTax = base + gtx, nowDr = E.draftOf(S, sel) * dk, nowDef = def.total;
    if (peek) {
      var zq = E.zoneOf(S, sel);
      var q = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : '') + (zq ? ' · ' + esc(zq.nm) : '')) + '<div class="quick">';
      q += '<p class="qstat num">월수입 <b>+' + money(nowTax) + '</b> · 동원 <b>+' + people(nowDr) + '</b> · 방어 <b>' + people(nowDef) + '</b> · 민심 <b>' + Math.round(S.min[sel]) + '</b></p>';
      if (S.rivalPlan && S.rivalPlan.t === sel) { var pi = E.planInfo(S); q += '<p class="qstat warn"><b>' + esc(pi.name) + '</b>이(가) 다음 달 이 동을 노립니다 · ' + people(S.rivalPlan.n) + '. 대기 인원을 남겨 두면 방어가 올라갑니다.</p>'; }
      else if (S.min[sel] < 40 && !capt) q += '<p class="qstat warn">민심 40 아래 · 독립할 수 있습니다. 치안을 올리세요.</p>';
      var stf = E.settleF(S, sel);
      if (stf < 1) q += '<p class="qstat">정착 중 · 세수·동원의 ' + Math.round(stf * 100) + '% · ' + E.settleLeft(S, sel) + '달 뒤 정상</p>';
      q += '<p class="qlbl">개발 · 한 번 누르면 바로 짓습니다</p><div class="qdevs">';
      E.C.TRACKS.forEach(function (t, k) {
        var l = E.lv(S, sel, k), c = E.devCost(S, sel, k);
        q += '<button class="qdev" type="button" data-k="' + k + '"' + (c !== null && me.money >= c ? '' : ' disabled') + '><i class="dd" style="background:' + DEV_COL[k] + '"></i>' + t + '<em>' + '●'.repeat(l) + '○'.repeat(5 - l) + '</em><b class="num">' + (c === null ? '완성' : money(c)) + '</b></button>';
      });
      q += '</div>';
      var sides = E.C.TRACKS.map(function (t, k) { var sd = E.devSide(S, sel, k); return E.lv(S, sel, k) < 5 && sd.text ? t + ': ' + sd.text.replace('이 동 ', '') : ''; }).filter(Boolean);
      if (sides.length) q += '<p class="qstat side">짓는 대가 · ' + esc(sides.join(' · ')) + '</p>';
      if (errMsg) q += '<p class="err">' + esc(errMsg) + '</p>';
      q += '<div class="qrow">' + moreBtn('효과 · 통계') + '</div></div>';
      sh.innerHTML = tx(q);
      bindDev(sh);
      return;
    }
    var zf = E.zoneOf(S, sel);
    var html = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : '') + (zf ? ' · ' + esc(zf.nm) : '')) + typeLine(d) + govBadge(sel) + comboHTML(sel);
    var one = function (v) { return (Math.round(v * 10) / 10).toLocaleString('ko-KR'); };
    html += '<div class="mini num"><div><small>월수입</small><b>+' + money(nowTax) + '</b></div><div><small>동원</small><b>+' + people(nowDr) + '</b></div><div><small>방어</small><b>' + people(nowDef) + '</b></div><div><small>민심</small><b>' + Math.round(S.min[sel]) + '</b></div></div>';
    if (gtx) html += '<p class="why num">월수입 ' + money(nowTax) + ' = 기본 ' + money(base) + (gtx > 0 ? ' + 정부 사업 ' + money(gtx) : ' − 정부 사업 부담 ' + money(-gtx)) + '</p>';
    var stf = E.settleF(S, sel);
    if (stf < 1) html += '<p class="why num"><b>정착 중</b> · 지금 세수·동원의 ' + Math.round(stf * 100) + '%만 들어옵니다. 약 ' + E.settleLeft(S, sel) + '달 뒤 정상. 주거·치안 1단계마다 매달 5%p씩 더 빨라집니다.</p>';
    if (S.rivalPlan && S.rivalPlan.t === sel) html += planHTML();
    if (S.min[sel] < 40 && !capt) html += '<p class="why"><b class="warn">민심이 40 아래면 독립할 수 있습니다.</b> 치안을 올리거나 민원을 처리하세요.</p>';
    if (fm[d.g]) html += '<p class="why">' + Jm(GU[d.g].n, '을', '를') + ' 통째로 장악해 세수 +' + GU[d.g].f + '%가 붙었습니다.</p>';
    // 시설: 두 줄(지금 단계 / 다음 단계에 실제로 바뀌는 값). 나머지는 '자세히'
    var k3 = sel * 4;
    var sim = function (k, lvTo) { var keep = S.dev[k3 + k]; S.dev[k3 + k] = lvTo; var r = { tax: E.taxOf(S, sel, fm) + gtx, dr: E.draftOf(S, sel) * dk, def: E.defense(S, sel).total }; S.dev[k3 + k] = keep; return r; };
    E.C.TRACKS.forEach(function (t, k) {
      var l = E.lv(S, sel, k), c = E.devCost(S, sel, k), sp = E.FAC_SP[k];
      var now = l ? E.facName(S, sel, k, l) : '없음', next = l < 5 ? E.facName(S, sel, k, l + 1) : null;
      var nx = '', cur = '';
      var z = l ? sim(k, 0) : null, up = l < 5 ? sim(k, l + 1) : null;
      if (k === 0) { cur = l ? '이 시설 덕에 월수입 +' + one(nowTax - z.tax) + '억' : '아직 효과 없음'; if (up) nx = '월수입 ' + one(nowTax) + '억 → <b>' + one(up.tax) + '억</b>' + (c && up.tax > nowTax ? ' · 약 ' + Math.ceil(c / (up.tax - nowTax)) + '달이면 회수' : ''); }
      else if (k === 1) { cur = l ? '이 동에서 나가는 공격 전력 +' + l * 7 + '%' + (l >= 2 ? ', ' + WATER + ' 건너기 불이익 없음' : '') : '아직 효과 없음'; if (up) nx = '나가는 공격 전력 +' + l * 7 + '% → <b>+' + (l + 1) * 7 + '%</b>' + (l + 1 === 2 ? ' · ' + WATER + ' 건너기 불이익 없음' : ''); }
      else if (k === 2) { cur = l ? '이 시설 덕에 동원 +' + one(nowDr - z.dr) + '명/월' : '아직 효과 없음'; if (up) nx = '동원 ' + one(nowDr) + ' → <b>' + one(up.dr) + '명/월</b>'; }
      else { cur = l ? '이 시설 덕에 방어 +' + people(nowDef - z.def) + ', 민심 회복 +' + 2 * l + '/월' : '아직 효과 없음'; if (up) nx = '방어 ' + people(nowDef) + ' → <b>' + people(up.def) + '</b> · 민심 회복 +2/월'; }
      var sdx = E.devSide(S, sel, k);
      if (up && sdx.text) nx += '<br><span class="side">대신 ' + esc(sdx.text) + '</span>';
      if (!up) nx = '최고 단계까지 지었습니다.';
      else if (sp[l + 1]) nx += '<br><b class="spNext">' + (l + 1) + '단계 특수 효과: ' + sp[l + 1] + '</b>';
      var spLine = Object.keys(sp).map(function (lv) { return '<span class="' + (l >= +lv ? 'spOn' : 'spOff') + '">' + lv + '단계 ' + sp[lv] + (l >= +lv ? ' (작동 중)' : '') + '</span>'; }).join('<br>');
      var pv = E.spPreview(S, sel, k);
      var more = '지금: ' + cur + '<br>' + spLine + (pv ? '<br><span class="pv">' + pv.lv + '단계 ' + esc(pv.name) + '까지 남은 투자 ' + money(pv.cost) + ' · ' + (/^지금/.test(pv.text) ? '' : '지금 기준 ') + esc(pv.text) + '</span>' : '') + (k === 3 ? '<br>방어는 동 자체 방어(치안·민심·동네 유형)에 대기 인원 일부가 더해진 값입니다.' : '');
      html += '<div class="dev"><h4 role="button" tabindex="0" aria-expanded="' + !!devOpen[k] + '" data-dk="' + k + '"><i class="dd" style="background:' + DEV_COL[k] + '"></i>' + t + ' · ' + esc(now) + '<em>' + '●'.repeat(l) + '○'.repeat(5 - l) + '</em><span class="dtog" aria-hidden="true">' + (devOpen[k] ? '▴' : '▾') + '</span></h4><p>' + (up ? '다음: ' : '') + nx + '</p><button class="btn" data-k="' + k + '" type="button"' + (c !== null && me.money >= c ? '' : ' disabled') + '>' + (c === null ? '최고 단계' : esc(next) + '<br>' + money(c)) + '</button><div class="dmore"' + (devOpen[k] ? '' : ' hidden') + '><p>' + more + '</p></div></div>';
    });
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    if (zf) html += '<button class="guLink" id="zoneLink" type="button"><span>' + esc(zf.nm) + ' · 한꺼번에 작전·개발</span><span class="num">' + zf.d.length + '개 ›</span></button>';
    html += guLinkHTML(d.g) + statsHTML(sel);
    sh.innerHTML = tx(html);
    bind('guLink', function () { openGu(d.g); });
    if (zf) bind('zoneLink', function () { openZone(zf.id); });
    bind('planSrc', function () { var pi = E.planInfo(S); if (pi) select(pi.src); });
    bind('govPact', guard(function () { var r = E.govPact(S, sel); if (r.err) { errMsg = r.err; } else setNews(S.log[0].t); save(); sync(); }));
    Array.prototype.forEach.call(sh.querySelectorAll('.dev h4[data-dk]'), function (h) {
      var tog = function () { var k = +h.dataset.dk, box = h.parentNode.querySelector('.dmore'); devOpen[k] = !devOpen[k]; box.hidden = !devOpen[k]; h.setAttribute('aria-expanded', devOpen[k]); h.querySelector('.dtog').textContent = devOpen[k] ? '▴' : '▾'; };
      h.addEventListener('click', tog); h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(); } });
    });
    bindDev(sh);
  }
  function bindDev(sh) {
    Array.prototype.forEach.call(sh.querySelectorAll('.dev button, .qdev'), function (b) {
      b.addEventListener('click', function () { var k = +b.dataset.k, r = E.develop(S, sel, k); if (r.err) { errMsg = r.err; } else { errMsg = ''; sfx('coin'); var l = E.lv(S, sel, k); setNews(D[sel].n + ' ' + E.facName(S, sel, k, l) + (l === 1 ? ' 창설.' : ' 완공.') + (E.FAC_SP[k][l] ? ' ' + E.FAC_SP[k][l] + '.' : '')); if (E.FAC_SP[k][l]) stampAt(sel, true, l === 5 ? '완공' : '창설'); } save(); sync(); });
    });
  }
  function openGu(g) {
    guSel = g; sel = null; sheetMode = 'gu'; errMsg = '';
    $('sheet').scrollTop = 0;
    renderSheet(); dirty();
    requestAnimationFrame(function () { fitBox(expand(guBox[g], 40), 6, true); });
  }
  function openZone(id) {
    var z = E.zoneById(S, id); if (!z) return;
    zoneSel = id; sel = null; guSel = null; sheetMode = 'zone'; errMsg = '';
    $('sheet').scrollTop = 0; renderSheet(); dirty();
    var b = [1e9, 1e9, -1e9, -1e9]; z.d.forEach(function (i) { b[0] = Math.min(b[0], D[i].b[0]); b[1] = Math.min(b[1], D[i].b[1]); b[2] = Math.max(b[2], D[i].b[2]); b[3] = Math.max(b[3], D[i].b[3]); });
    requestAnimationFrame(function () { fitBox(expand(b, 60), 6, true); });
  }
  function zpickSheet(sh) {
    if (!zp || !zp.list) { sheetMode = 'none'; renderSheet(); return; }
    var c = E.zoneCheck(S, zp.list, zp.name);
    var html = '<div class="head"><div><h2>행정구역 개편</h2><p>지도에서 묶을 우리 ' + UNITN + '을 차례로 누르세요 · 이어진 3~8개</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<p class="qstat num" id="zpList">' + (zp.list.length ? esc(zp.list.map(function (i) { return D[i].n; }).join(' · ')) + ' (' + zp.list.length + '개)' : '아직 고른 ' + UNITN + '이 없습니다.') + '</p>';
    html += '<label class="zname"><span>구역 이름</span><input id="zName" type="text" maxlength="8" autocomplete="off" placeholder="예: 칠성구" value="' + esc(zp.name) + '"></label>';
    html += '<p class="why num" id="zInfo">' + zInfo(c) + '</p>';
    if (zp.msg) html += '<p class="err">' + esc(zp.msg) + '</p>';
    html += '<div class="acts two"><button class="btn red" id="zMake" type="button"' + (c.ok ? '' : ' disabled') + '>구역 만들기</button><button class="btn" id="zCancel" type="button">취소</button></div>';
    sh.innerHTML = tx(html);
    var inp = $('zName');
    inp.addEventListener('input', function () { zp.name = inp.value; var c2 = E.zoneCheck(S, zp.list, zp.name); $('zInfo').innerHTML = tx(zInfo(c2)); $('zMake').disabled = !c2.ok; });
    bind('zCancel', function () { zp = null; sheetMode = 'realm'; renderSheet(); dirty(); });
    bind('zMake', guard(function () {
      var r = E.zoneMake(S, zp.list, zp.name);
      if (r.err) { zp.msg = r.err; renderSheet(); return; }
      sfx('fanfare'); var z = r.zone, h = z.hall; zp = null; sheetMode = 'none';
      stampAt(h, true, '출범'); setNews(S.log[0].t); save(); sync(); openZone(z.id);
    }));
  }
  function zInfo(c) {
    var t = '비용 ' + money(c.cost || 0) + ' · 결재 2건 · 구역 ' + ((S.zones || []).length) + '/' + E.zoneMax(S) + '개. 구역 안 ' + UNITN + ' 세수 +5%, 한 번에 작전·개발.';
    if (c.cross) t += ' <b class="warn">원래 ' + GRP + '가 다른 ' + c.cross + '곳은 주민 반발로 민심 −10.</b>';
    if (!c.ok && c.why) t += '<br>' + esc(c.why);
    return t;
  }
  function zoneSheet(sh) {
    var z = E.zoneById(S, zoneSel);
    if (!z) { sheetMode = 'none'; renderSheet(); return; }
    var html = '<div class="head"><div><h2>' + esc(z.nm) + '</h2><p>행정구역 · ' + z.d.length + '개 ' + UNITN + ' · 청사 ' + esc(D[z.hall].n) + ' · ' + dateOf(z.at) + ' 출범</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<p class="why num">' + esc(z.d.map(function (i) { return D[i].n; }).join(' · ')) + '. 구역 안 ' + UNITN + ' 세수 +5%.</p>';
    var ap = E.zoneAttackPreview(S, z.id, guReserve);
    html += '<div class="sec">맞닿은 ' + UNITN + ' 한꺼번에 공격</div><p class="why num">구역과 맞닿은 ' + ap.count + '곳 중 최대 ' + ap.limit + '곳을 약한 순서로, 각각 승률 80%만큼 보냅니다.</p><div class="chips">' + [[0, '남길 인원 없음'], [0.25, '25% 남기기'], [0.5, '50% 남기기']].map(function (x) { return '<button class="chip rs' + (guReserve === x[0] ? ' on' : '') + '" type="button" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="why num">' + (ap.can ? esc(ap.names.join(', ')) + ' · 약 ' + people(ap.need) + ' 출동, ' + people(ap.left) + ' 남음' : (ap.count ? '지금 남길 인원을 빼면 보낼 수 있는 곳이 없습니다.' : '칠 수 있는 곳이 없습니다.')) + '</p><div class="acts"><button class="btn red" id="zAtk" type="button"' + (S.ap >= ap.ap && ap.can >= 1 ? '' : ' disabled') + '>' + esc(z.nm) + ' 작전 · 결재 ' + ap.ap + '건</button></div>';
    html += '<div class="sec">구역 한꺼번에 개발 (한 단계씩)</div><div class="two">' + E.C.TRACKS.map(function (t, k) { var q = E.zoneDevelopPreview(S, z.id, k); return '<button class="btn gd zd num" type="button" data-k="' + k + '"' + (q.n ? '' : ' disabled') + '>' + t + (q.n ? ' ' + q.n + '곳<br>' + money(q.cost) : '<br>불가') + '</button>'; }).join('') + '</div>';
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    html += '<div class="acts"><button class="btn" id="zDel" type="button">' + (zp && zp.del === z.id ? '정말 해체 (한 번 더 누르기)' : '구역 해체') + '</button></div>';
    sh.innerHTML = tx(html);
    Array.prototype.forEach.call(sh.querySelectorAll('.rs'), function (b) { b.addEventListener('click', function () { guReserve = +b.dataset.r; renderSheet(); }); });
    bind('zAtk', guard(function () {
      var mark = S.last.length, r = E.zoneAttack(S, z.id, guReserve);
      if (r.err) { errMsg = r.err; renderSheet(); return; }
      errMsg = ''; setNews(S.last.slice(mark).map(function (l) { return l.t; }).join(' '), !r.won);
      stampAt(z.hall, r.won > 0, r.won > 0 ? r.won + '개 접수' : '실패');
      save(); sync();
    }));
    Array.prototype.forEach.call(sh.querySelectorAll('.zd'), function (b) { b.addEventListener('click', function () { var r = E.zoneDevelop(S, z.id, +b.dataset.k); errMsg = r.err || ''; if (!r.err) { sfx('coin'); setNews(S.log[0].t); } save(); sync(); }); });
    bind('zDel', function () { if (zp && zp.del === z.id) { E.zoneDissolve(S, z.id); zp = null; setNews(S.log[0].t); sheetMode = 'realm'; save(); sync(); } else { zp = { del: z.id }; renderSheet(); } });
  }
  function guSheet(sh) {
    var g = guSel, st = E.guStatus(S, g), me = S.f[0], fin = GU[g].f;
    var html = '<div class="head"><div><h2>' + GU[g].n + '</h2><p>' + GU[g].r + ' · 재정자립도 ' + fin + '% (2023년 통계)</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="bar"><u style="width:' + (st.have / st.total * 100) + '%"></u><s style="left:50%"></s></div><p class="why num">' + st.total + '개 동 중 ' + st.have + '개 확보</p>';
    html += '<div class="rows num"><div class="row"><span>' + R1S + ' 자격 (절반)</span><span>' + (st.half ? '달성' : st.need + '개 더') + '</span></div><div class="row"><span>통째로 장악하면 세수 +' + fin + '%</span><span>' + (st.full ? '적용 중' : st.left + '개 더') + '</span></div></div>';
    if (S.elect && !S.won) {
      var ci = E.campInfo(S, g), vg = E.voteGu(S, g), cnt = (S.camp && S.camp.g && S.camp.g[g]) || 0;
      html += '<div class="sec">선거 유세 · 이 ' + GRP + ' 예상 득표 ' + (vg * 100).toFixed(1) + '%</div><div class="acts"><button class="btn red" id="guCamp" type="button"' + (ci.ok ? '' : ' disabled') + '>유세 · 결재 1건 · ' + money(ci.cost) + (ci.gain ? ' · 전체 +' + (ci.gain * 100).toFixed(1) + '%p' : '') + '</button></div><p class="why num">이번 선거에 ' + (ci.used || 0) + '/3번 돌았습니다. 한 번 돌 때마다 이 ' + GRP + '의 우리 ' + UNITN + ' +10%p, 독립 ' + UNITN + ' +12%p, 다른 세력 ' + UNITN + ' +8%p.' + (cnt < (ci.used || 0) ? ' <b class="warn">상대 맞불 유세로 ' + ((ci.used || 0) - cnt) + '번만큼 깎였습니다.</b>' : '') + (ci.why && ci.used < 3 ? ' ' + esc(ci.why) : ci.used >= 3 ? ' 이 ' + GRP + '는 다 돌았습니다.' : '') + '</p>';
    }
    if (S.rank < 1) {
      html += '<p class="why" style="margin-top:10px">' + Jm(R1N, '이', '가') + ' 되면 이 화면에서 동 여러 개를 한꺼번에 공격·설득·개발할 수 있습니다.</p>';
    } else {
      var lim = E.guLimit(S), ap = E.guAttackPreview(S, g, guReserve), pp = E.guPersuadePreview(S, g);
      html += '<div class="sec">한꺼번에 공격</div><p class="why num">공격 가능한 ' + ap.count + '개 동 중 최대 ' + lim + '개를 약한 순서로, 각각 승률 80%만큼 보냅니다.</p><div class="chips">' + [[0, '남길 인원 없음'], [0.25, '25% 남기기'], [0.5, '50% 남기기']].map(function (x) { return '<button class="chip rs' + (guReserve === x[0] ? ' on' : '') + '" type="button" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="why num">' + (ap.can ? esc(ap.names.join(', ')) + ' · 약 ' + people(ap.need) + ' 출동, ' + people(ap.left) + ' 남음' : (ap.count ? '지금 남길 인원을 빼면 보낼 수 있는 동이 없습니다. 가장 약한 동에도 ' + people(ap.lack) + ' 필요합니다.' : '공격할 수 있는 동이 없습니다.')) + '</p><div class="acts"><button class="btn red" id="guAtk" type="button"' + (S.ap >= ap.ap && ap.can >= 1 ? '' : ' disabled') + '>' + GU[g].n + ' 작전 · 결재 ' + ap.ap + '건</button></div>';
      html += '<div class="sec">독립 동 한꺼번에 설득</div><div class="acts"><button class="btn" id="guPer" type="button"' + (S.ap >= 1 && pp.n >= 1 ? '' : ' disabled') + '>' + (pp.n ? pp.n + '곳 설득 · ' + money(pp.cost) + ' · 결재 1건' : (pp.count ? '예산이 모자랍니다' : '설득할 독립 동이 없습니다')) + '</button></div>' + (pp.n ? '<p class="why">' + esc(pp.names.join(', ')) + '</p>' : '');
      if (st.have) {
        var ui3 = E.unityInfo(S, g);
        html += '<div class="sec">주민 화합 사업</div><p class="why num">' + unityDetail(g) + '</p><div class="acts"><button class="btn" id="guUnity" type="button"' + (ui3.ok ? '' : ' disabled') + '>' + (S.stable[g] > S.month ? '진행 중 · ' + (S.stable[g] - S.month) + '달 남음' : '민심 100, 6개월간 독립 없음 · ' + money(ui3.cost)) + '</button></div>';
        html += '<div class="sec">우리 동 한꺼번에 개발 (한 단계씩)</div><div class="two">' + E.C.TRACKS.map(function (t, k) {
          var q = E.guDevelopPreview(S, g, k);
          return '<button class="btn gd num" type="button" data-k="' + k + '"' + (q.n ? '' : ' disabled') + '>' + t + (q.n ? ' ' + q.n + '곳<br>' + money(q.cost) : '<br>불가') + '</button>';
        }).join('') + '</div>';
      }
    }
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    sh.innerHTML = tx(html);
    Array.prototype.forEach.call(sh.querySelectorAll('.rs'), function (b) { b.addEventListener('click', function () { guReserve = +b.dataset.r; renderSheet(); }); });
    bind('guAtk', guard(function () {
      var mark = S.last.length, r = E.guAttack(S, g, guReserve);
      if (r.err) { errMsg = r.err; renderSheet(); return; }
      errMsg = ''; setNews(S.last.slice(mark).map(function (l) { return l.t; }).join(' '), !r.won);
      stampWorld(GU[g].x, GU[g].y, r.won > 0, r.won > 0 ? r.won + '개 접수' : '실패');
      save(); sync();
    }));
    bind('guUnity', guard(function () { act(E.unity(S, g)); setNews(S.log[0].t); }));
    bind('guCamp', guard(function () { var r = E.campaign(S, g); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; sfx('stamp'); stampWorld(GU[g].x, GU[g].y, true, '유세'); setNews(S.log[0].t); save(); sync(); }));
    bind('guPer', guard(function () { var r = E.guPersuade(S, g); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; setNews(S.log[0].t); save(); sync(); }));
    Array.prototype.forEach.call(sh.querySelectorAll('.gd'), function (b) {
      b.addEventListener('click', function () { var r = E.guDevelop(S, g, +b.dataset.k); errMsg = r.err || ''; save(); sync(); });
    });
  }
  function moodTax(dm, list) {
    if (!dm) return 0;
    list = list || E.dongsOf(S, 0);
    var b = E.economy(S, 0).tax, keep = list.map(function (i) { return S.min[i]; });
    list.forEach(function (i) { S.min[i] = Math.max(5, Math.min(100, S.min[i] + dm)); });
    var a = E.economy(S, 0).tax;
    list.forEach(function (i, k) { S.min[i] = keep[k]; });
    return a - b;
  }
  function fxText(a) {
    var p = [];
    if (a.money) p.push('예산 ' + signed(a.money, money));
    if (a.troops) p.push('인원 ' + signed(a.troops, people));
    if (a.mood) {
      var mt = moodTax(a.mood), mine = E.dongsOf(S, 0), r0 = mine.filter(function (i) { return S.min[i] < 40; }).length, r1 = mine.filter(function (i) { return Math.max(5, Math.min(100, S.min[i] + a.mood)) < 40; }).length;
      p.push('민심 ' + (a.mood > 0 ? '+' : '−') + Math.abs(a.mood) + ' (우리 동 ' + mine.length + '곳, 세수 ' + signed(Math.round(mt * 10) / 10, function (v) { return v + '억'; }) + '/월' + (r0 !== r1 ? ', 독립 위험 ' + r0 + '곳 → ' + r1 + '곳' : '') + (a.mood > 0 && Math.abs(mt) < 0.5 && r0 === r1 ? ', 민심이 이미 높아 당장 효과는 거의 없음' : '') + ')');
    }
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
  // 예고된 공격: 저쪽 전력과 지금 방어, 기존 수단으로 막는 방법
  function planHTML() {
    var pi = E.planInfo(S); if (!pi) return '';
    var h = '<div class="plan">' + (S.rivalPlan ? bossHTML(S.rivalPlan.f, 'plan', D[S.rivalPlan.t].n) : '') + '<b>' + esc(E.J(pi.name, '이', '가')) + ' 다음 달 이 동을 노립니다' + (pi.why ? ' · ' + esc(pi.why) : '') + '</b>';
    h += '<span class="num">저쪽 예상 전력 약 ' + people(pi.atk) + ' · 지금 방어 ' + people(pi.def) + ' · 저쪽 승률 ' + Math.round(pi.p * 100) + '%</span>';
    if (pi.cons) h += '<span>' + esc(pi.cons) + '.</span>';
    var opt = [];
    var home = Math.floor(S.f[0].troops);
    if (pi.extra === 0) opt.push('동 자체 방어만으로 막힙니다. 저쪽이 접을 겁니다');
    else if (pi.extra !== null) opt.push('대기 인원을 ' + people(pi.extra) + ' 이상 남긴 채 달을 넘기기' + (pi.extra <= home ? ' (지금 ' + people(home) + ' · 그만큼 이번 달 공격을 줄임)' : ' (지금 ' + people(home) + '이라 모자람, 모집 필요)'));
    if (pi.secN) opt.push('치안 ' + pi.secN + '단계 올리기 · 총 ' + money(pi.secSum) + ' (이것만으로 막힘)');
    else if (pi.sec !== null) opt.push('치안 한 단계 올리기 · ' + money(pi.secCost) + ' · 방어 +' + people(pi.sec) + ' (다른 대비와 함께)');
    if (pi.pact !== null) opt.push('불가침 협정 · ' + money(pi.pact) + ' (세력 화면에서)');
    if (pi.src !== undefined && S.owner[pi.src] !== 0) opt.push('출발지 ' + D[pi.src].n + ' 먼저 치기');
    h += '<ul>' + opt.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>';
    if (pi.src !== undefined && S.owner[pi.src] !== 0) h += '<button class="btn" id="planSrc" type="button">' + esc(D[pi.src].n) + ' 보기</button>';
    return h + '<small>예고된 동에는 대기 인원이 평소보다 많이 붙습니다. 방어가 저쪽 전력을 넘으면 공격을 접습니다.</small></div>';
  }
  function offerSheet(sh) {
    var o = E.offerInfo(S);
    if (!o) { sheetMode = 'none'; renderSheet(); return; }
    var html = '<div class="head"><div><h2>' + esc(o.name) + '의 생존 협상</h2><p>' + (o.rival ? '숙적 · ' : '') + o.left + '달 안에 답하지 않으면 없던 일이 됩니다.</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<p class="prose">"본거지 ' + esc(D[o.cap].n) + ' 하나만 남겨 주시면 나머지 동은 넘기겠습니다. 회원들 위로금만 챙겨 주세요."</p>';
    html += '<div class="rows"><div class="row"><span>넘겨받는 동</span><span>' + o.give.length + '곳 · 주민 ' + people(o.pop) + '</span></div><div class="row"><span>위로금</span><span>' + money(o.cost) + ' · 결재 1건</span></div><div class="row"><span>조건</span><span>12개월 불가침' + (o.rival ? ', 숙적 관계 끝' : '') + '</span></div></div>';
    html += '<p class="why">넘겨받은 동은 민심이 65 이하로 시작합니다. 거절하면 저쪽 인원이 15% 늘어납니다.</p><p class="why num">' + esc(o.give.map(function (i) { return D[i].n; }).join(', ')) + '</p>';
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    html += '<div class="two"><button class="btn red" id="offYes" type="button"' + (o.ok ? '' : ' disabled') + '>받아들이기</button><button class="btn" id="offNo" type="button">거절</button></div>' + (o.why ? '<p class="why">' + esc(o.why) + '</p>' : '');
    sh.innerHTML = tx(html);
    bind('offYes', guard(function () { var cap = o.cap, r = E.acceptOffer(S); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; setNews(S.log[0].t); stampAt(cap, true, '협상 타결'); sheetMode = 'none'; save(); sync(); }));
    bind('offNo', guard(function () { E.declineOffer(S); setNews(S.log[0].t); sheetMode = 'none'; save(); sync(); }));
  }
  function unityDetail(g) {
    var mine = E.guDongs()[g].filter(function (i) { return S.owner[i] === 0; });
    var low = mine.filter(function (i) { return S.min[i] < 40; }).length;
    var gain = 0, keep = mine.map(function (i) { return S.min[i]; }), b = E.economy(S, 0).net;
    mine.forEach(function (i) { S.min[i] = 100; }); gain = E.economy(S, 0).net - b; mine.forEach(function (i, k) { S.min[i] = keep[k]; });
    return '우리 동 ' + mine.length + '곳 · 독립 위험(민심 40 미만) ' + low + '곳 → 0곳 · 월 순수입 ' + money(b) + ' → ' + money(b + gain);
  }
  function govSheet(sh) {
    var gi = E.govInfo(S);
    if (!gi) { sheetMode = 'none'; renderSheet(); return; }
    var G = gi.G;
    var html = '<div class="head"><div><h2>' + esc(G.n) + '</h2><p>정부 공모 · ' + G.kind + ' · ' + gi.left + '달 남음</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="rows"><div class="row"><span>조건</span><span>' + G.cond + '</span></div><div class="row"><span>신청</span><span>결재 1건</span></div></div>';
    html += '<p class="why"><b class="good">이익</b> ' + G.gain + '<br><b class="warn">부담</b> ' + G.burden + '</p>';
    var net = gi.k === 'agency' ? 25 * 0.95 : gi.k === 'plant' ? 12 : gi.k === 'hospital' ? -8 : -5;
    var up = gi.k === 'plant' ? 250 : -G.cost, doneM = S.month + G.prep;
    html += '<div class="rows num"><div class="row"><span>준비까지 총비용</span><span>' + (gi.k === 'plant' ? '없음 (지원금 +150억, 준공 때 +100억)' : money(G.cost)) + '</span></div><div class="row"><span>완공</span><span>' + (G.prep ? dateOf(doneM) + ' (' + G.prep + '달 뒤)' : '즉시') + '</span></div><div class="row"><span>완공 후 순이익</span><span>월 ' + (net >= 0 ? '+' : '−') + money(Math.abs(net)) + (gi.k === 'agency' ? ' · 완공 후 약 ' + Math.ceil(G.cost / net) + '달이면 회수' : '') + '</span></div></div>';
    html += '<div class="sec">경쟁 신청</div>' + (gi.rivals.length ? '<div class="rows">' + gi.rivals.map(function (r, k) { var see = S.seenGu && !S.seenGu[D[r.i].g]; return '<div class="row"><span>' + (k === 0 ? '<b>' : '') + esc(see ? '안개 속 어느 세력' : S.f[r.f].name) + (k === 0 ? '</b>' : '') + '</span><span>' + esc(see ? '?' : D[r.i].n) + '</span></div>'; }).join('') + '</div><p class="why">우리가 신청하지 않으면 마감 때 맨 위 후보가 선정됩니다. 다른 세력도 조건과 부담금을 채워야 신청할 수 있습니다.</p>' : '<p class="why">지금은 조건과 부담금을 채운 다른 세력이 없습니다. 아무도 신청하지 않으면 유찰됩니다.</p>');
    html += '<p class="why">한 동에 정부 사업은 하나뿐이고, 동을 빼앗기면 시설과 부담도 같이 넘어갑니다.</p>';
    if (!gi.ok.length) html += '<p class="err">조건을 채운 우리 동이 없습니다. ' + esc(G.cond) + '.</p>';
    else {
      var list = gi.ok.slice().sort(function (a, b) { return gi.k === 'plant' ? D[a].P - D[b].P : D[b].E + D[b].I - D[a].E - D[a].I; }).slice(0, 6);
      html += '<div class="sec">후보지</div><div class="acts">' + list.map(function (i) {
        var note = gi.k === 'plant' ? '주민 ' + D[i].pop.toLocaleString('ko-KR') + '명 · 민심 ' + Math.round(S.min[i]) : '세수 ' + money(E.taxOf(S, i, E.fullMapOf(S, 0, E.dongsOf(S, 0)))) + '/월 · 민심 ' + Math.round(S.min[i]);
        return '<button class="btn gv" type="button" data-i="' + i + '"' + (S.ap > 0 && S.f[0].money >= G.cost ? '' : ' disabled') + '><b>' + esc(D[i].n) + '</b><br><small>' + note + '</small></button>';
      }).join('') + '</div>';
    }
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    sh.innerHTML = tx(html);
    Array.prototype.forEach.call(sh.querySelectorAll('.gv'), function (b) { b.addEventListener('click', guard(function () { var r = E.govApply(S, +b.dataset.i); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; sfx('coin'); setNews(S.log[0].t); stampAt(+b.dataset.i, true, '선정'); sheetMode = 'none'; save(); sync(); })); });
  }
  function govBadge(i) {
    var g = E.govSite(S, i); if (!g) return '';
    var G = E.GOV[g.k], building = S.month < g.done;
    var h = '<div class="gov"><b>정부 사업 · ' + esc(G.n.replace(/ (이전|건립|유치|지정)$/, '')) + '</b> ' + (building ? (g.k === 'plant' ? '준공까지 ' + (g.done - S.month) + '달, 그때 가진 쪽이 지원금 100억 수령' : '공사 중, ' + (g.done - S.month) + '달 남음') : '운영 중') + '<br><span>' + G.gain + ' / ' + G.burden + (g.k === 'plant' && g.pact ? ' (협약 완료, 상한 없음)' : '') + '</span>';
    if (g.k === 'plant' && !g.pact && S.owner[i] === 0) h += '<button class="btn" id="govPact" type="button"' + (S.f[0].money >= 80 ? '' : ' disabled') + '>주민협약 맺기 · 80억 · 민심 +10, 상한 해제</button>';
    return h + '</div>';
  }
  function fuzzy(v, unit) { var lo = Math.max(0, Math.floor(v * 0.7 / unit) * unit), hi = Math.ceil(v * 1.3 / unit) * unit; return lo.toLocaleString('ko-KR') + '~' + hi.toLocaleString('ko-KR'); }
  function realmSheet(sh) {
    var me = S.f[0], e = E.economy(S, 0), held = E.guHeld(S, 0);
    var html = '<div class="head"><div><h2>' + esc(title()) + '</h2><p>' + esc(me.name) + ' · 본거지 ' + esc(D[me.cap].n) + '</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    var share = E.popShare(S, 0);
    html += '<div class="sec">' + MAYOR + '까지</div><div class="bar"><u style="width:' + Math.min(100, share * 100) + '%"></u><s style="left:60%"></s></div><p class="why num">' + CNAME + ' 인구 ' + (share * 100).toFixed(1) + '% 장악. 60%를 넘기면 ' + E.C.ELECT_WAIT + '달 뒤 ' + MAYOR + ' 선거가 열리고, 과반을 얻으면 취임합니다.' + (!S.coal && !S.won ? ' 45%를 넘기면 남은 세력이 반동장 연합을 맺습니다.' : '') + '</p>';
    if (S.elect && !S.won) {
      var vs = E.voteShare(S);
      html += '<div class="sec">선거 예측 · ' + Math.max(0, S.elect.at - S.month) + '달 뒤' + (S.elect.n > 1 ? ' (재선거)' : '') + '</div><div class="bar"><u style="width:' + Math.min(100, vs * 100) + '%"></u><s style="left:50%"></s></div><p class="why num">지금 치르면 득표율 ' + (vs * 100).toFixed(1) + '%' + (vs > 0.5 ? ', 당선권입니다.' : ', 과반에 ' + (50 - vs * 100).toFixed(1) + '%p 모자랍니다.') + ' 우리 동 민심이 높을수록, 인구가 많을수록 표가 늘어납니다. 우리 동 민심 평균 ' + Math.round(E.avgMood(S)) + '.</p>';
      var pl = (S.camp && S.camp.pl) || [];
      html += '<p class="why">공약: ' + (pl.length ? esc(pl.map(function (k) { return E.PLEDGES[k].n; }).join(', ')) : '아직 안 정함') + ' <button class="linkish" id="plEdit" type="button">' + (pl.length ? '바꾸기' : '정하기') + '</button></p>';
      var gl = GU.map(function (x, gi) { return { g: gi, ci: E.campInfo(S, gi), v: E.voteGu(S, gi) }; }).filter(function (x) { return x.ci.gain > 0 && x.ci.used < 3; }).sort(function (a, b) { return b.ci.gain - a.ci.gain; }).slice(0, 3);
      if (gl.length) html += '<div class="rows num">' + gl.map(function (x) { return '<button class="row rowBtn" type="button" data-g="' + x.g + '"><span>' + GU[x.g].n + ' 유세 · 지금 ' + (x.v * 100).toFixed(0) + '%</span><span>+' + (x.ci.gain * 100).toFixed(1) + '%p ›</span></button>'; }).join('') + '</div><p class="why">유세 효과가 큰 ' + GRP + '입니다. 누르면 그 ' + GRP + '로 갑니다.</p>';
    }
    if (S.coal && !S.won) {
      var cm = S.coal.m.filter(function (id) { return S.f[id].alive; });
      html += '<div class="sec">반동장 연합 · ' + cm.length + '개 세력</div><div class="faces sm">' + cm.slice(0, 10).map(function (id) { return faceImg(id, 30); }).join('') + '</div><p class="why num">연합 전체 ' + people(cm.reduce(function (x, id) { return x + S.f[id].troops + (S.f[id].away || 0); }, 0)) + '. 서로 싸우지 않고 우리만 노립니다. 연합 세력과는 협정·통합이 안 됩니다.</p>';
    }
    if (S.rank >= 1) {
      var zs = S.zones || [], zm = E.zoneMax(S);
      html += '<div class="sec">행정구역 · ' + zs.length + '/' + zm + '</div>' + (zs.length ? '<div class="rows num">' + zs.map(function (z) { return '<button class="row rowBtn zrow" type="button" data-z="' + z.id + '"><span>' + esc(z.nm) + ' · 청사 ' + esc(D[z.hall].n) + '</span><span>' + z.d.length + '개 ›</span></button>'; }).join('') + '</div>' : '<p class="why">이어진 우리 ' + UNITN + ' 3~8개를 묶어 직접 이름 붙인 구역을 만들 수 있습니다. 구역은 한 번에 작전·개발하고, 세수 +5%가 붙습니다.</p>') + '<div class="acts"><button class="btn" id="zNew" type="button"' + (zs.length < zm ? '' : ' disabled') + '>' + (zs.length < zm ? '새 구역 만들기' : '지금 직급에선 ' + zm + '개까지') + '</button></div>';
    }
    html += '<div class="sec">시행 중인 정책 · ' + (S.cards || []).length + '장</div>' + ((S.cards || []).length ? '<div class="pcards own">' + S.cards.map(function (k) { return cardHTML(k, false); }).join('') + '</div>' : '<p class="why">아직 없습니다. 승진할 때와 반년마다 정책 카드를 하나씩 고릅니다.' + (S.cardNext ? ' 다음 정책 회의는 ' + Math.max(0, S.cardNext - S.month) + '달 뒤.' : '') + '</p>');
    if (S.rank < 1) { var g = bestGu(), st = E.guStatus(S, g); html += '<p class="why num">' + R1N + ': 한 ' + GRP + '의 ' + UNITN + '을 절반 이상 차지. ' + GU[g].n + ' ' + st.have + '/' + st.total + '개.</p>'; }
    else if (S.rank < 2) html += '<p class="why num">' + RANK2 + ': ' + R2 + '개 ' + GRP + '에서 각각 ' + UNITN + '을 절반 이상 차지. 지금 ' + held + '개 ' + GRP + '.</p>';
    html += '<div class="sec">일당 주고 인원 모으기 (1억 = 1.2명)</div><div class="chips">' + [100, 300].map(function (v) {
      return '<button class="chip num" type="button" data-m="' + v + '"' + (me.money >= v ? '' : ' disabled') + '>' + v + '억 → ' + Math.round(v * 1.2) + '명</button>';
    }).join('') + '<button class="chip num" type="button" data-m="all"' + (me.money >= 1 ? '' : ' disabled') + '>전액 → ' + Math.round(Math.floor(me.money) * 1.2) + '명</button></div>';
    var A = E.ABIL[S.abil];
    html += '<div class="sec">동네 조합</div><div class="rows">' + Object.keys(E.COMBO).map(function (k) {
      var C0 = E.COMBO[k], c = S.combo && S.combo[k], on = c && c.d.every(function (j) { return S.owner[j] === 0; });
      return '<div class="row"><span><b>' + C0.n + '</b><br><small>' + (c ? esc(c.d.map(function (j) { return D[j].n; }).join('·')) : C0.t) + '</small></span><span>' + (c ? (on ? '작동 중' : '끊김') : '아직') + '</span></div>';
    }).join('') + '</div><p class="why">종류마다 한 판에 한 번. 묶인 동 하나라도 빼앗기면 되찾을 때까지 멈춥니다.</p>';
    var fr = E.facReport(S), st0 = S.stat;
    html += '<div class="sec">시설 성과</div><p class="why num">' + (fr.items.length ? fr.items.slice(0, 3).map(function (x) { return esc(x.name) + (x.t === 'gov' ? ' 월 ' + money(x.v) : x.t === 2 ? ' · 주변 ' + x.n + '곳 인원 +' + people(x.v) + '/월' : ' · 주변 ' + x.n + '곳 세수 +' + money(x.v) + '/월'); }).join('<br>') : '아직 옆 동까지 효과를 내는 5단계 시설이나 운영 중인 정부 사업이 없습니다.') + '<br>지금까지 시설이 번 돈 ' + money(st0.facMoney || 0) + (st0.facDraft >= 1 ? ' · 인원 ' + people(st0.facDraft) : '') + ' · 치안 시설 덕에 막은 공격 ' + (st0.facSaved || 0) + '번 · 대비해서 물러나게 한 공격 ' + (st0.deterred || 0) + '번</p>';
    var gn = E.govNext(S);
    if (gn) html += '<p class="why num">다음 정부 공모: 약 ' + gn.left + '달 뒤 ' + esc(gn.G.n) + ' · ' + esc(gn.G.cond) + (gn.G.cost ? ' · 부담금 ' + money(gn.G.cost) : '') + '</p>';
    html += '<div class="sec">대표 능력 · ' + A.n + '</div><p class="why">' + esc(A.how) + '</p>';
    if (S.abil === 'station') { var ei = E.expressInfo(S); html += '<p class="why num">지금 지하철로 칠 수 있는 동 ' + E.raidTargets(S) + '곳. ' + (S.express === S.month ? '바로 복귀 ' + Math.max(0, 3 - (S.expQ || 0)) + '번 남았습니다.' : '켜면 같은 인원으로 세 번까지 연달아 칠 수 있습니다.') + '</p><div class="acts"><button class="btn ab" id="express" type="button"' + (ei.ok ? '' : ' disabled') + '>' + (S.express === S.month ? '이번 달 급행 원정 중' : '급행 원정 켜기' + (ei.cost ? ' · ' + money(ei.cost) : '')) + '</button></div>' + (ei.why ? '<p class="why">' + esc(ei.why) + '</p>' : ''); }
    if (S.abil === 'other') { var ri = E.rallyInfo(S); html += '<div class="acts"><button class="btn ab" id="rally" type="button"' + (ri.ok ? '' : ' disabled') + '>반상회 소집 · 민심 +20' + (ri.cost ? ' · ' + money(ri.cost) : '') + '</button></div>' + (ri.why ? '<p class="why">' + esc(ri.why) + '</p>' : ''); }
    if (S.abil === 'office') html += '<p class="why">맞닿은 세력의 동을 누르면 제안할 수 있습니다.</p>';
    if (S.abil === 'town') html += '<p class="why num">우리 동 민심 평균 ' + Math.round(E.avgMood(S)) + '. ' + (S.vote ? D[S.vote.t].n + ' 투표 진행 중.' : '맞닿은 독립 동을 누르면 발의할 수 있습니다.') + '</p>';
    if (S.rank >= 1) {
      var ug = bestGu(), ui2 = E.unityInfo(S, ug), ep = E.exprProjInfo(S);
      html += '<div class="sec">대형 사업</div><div class="two"><button class="btn num" id="unity" type="button"' + (ui2.ok ? '' : ' disabled') + '>' + GU[ug].n + ' 화합 사업<br>' + (ui2.cost ? money(ui2.cost) : '불가') + '</button><button class="btn num" id="exprProj" type="button"' + (ep.ok ? '' : ' disabled') + '>광역 급행 사업<br>' + (S.exprProj ? '완료' : money(ep.cost)) + '</button></div><p class="why num">화합(' + GU[ug].n + '): ' + unityDetail(ug) + '. 6개월간 독립 없음.<br>광역 급행: 역이 있는 우리 동의 기습 거리 4km → 5.5km 영구 확대. 지금 기습 가능한 동 ' + E.raidTargets(S) + '곳.' + (ui2.why ? ' ' + esc(ui2.why) : '') + '</p>';
    }
    html += '<div class="sec">월 수지</div><div class="rows num"><div class="row"><span>세수' + (e.aidTax > 0 ? ' (약소 동 지원금 포함)' : '') + '</span><span>+' + money(e.tax) + '</span></div><div class="row"><span>동 관리비</span><span>−' + money(e.up) + '</span></div><div class="row"><span>동원' + (e.aidDraft > 0 ? ' (지원 포함)' : '') + '</span><span>+' + people(e.draft) + '</span></div><div class="row"><span>자연 이탈</span><span>−' + people(e.decay) + '</span></div>' + (me.away >= 1 ? '<div class="row"><span>출동 중 (다음 달 복귀)</span><span>' + people(me.away) + '</span></div>' : '') + '<div class="row"><span><b>월 순수입</b> (세수 − 관리비)</span><span><b>' + signed(e.net, money) + '</b></span></div></div><p class="why">위쪽 예산 아래 숫자가 이 순수입입니다. 대기: 지금 공격·방어에 쓸 수 있는 인원. 출동: 다음 달 복귀. 귀가: 이번 판에서 빠진 인원.</p>';
    var list = GU.map(function (x, i) { return { i: i, st: E.guStatus(S, i) }; }).filter(function (x) { return x.st.have > 0; }).sort(function (a, b) { return b.st.have / b.st.total - a.st.have / a.st.total; });
    if (list.length) html += '<div class="sec">우리가 들어간 ' + GRP + '</div><div class="rows num">' + list.slice(0, 12).map(function (x) {
      return '<button class="row rowBtn" type="button" data-g="' + x.i + '"><span>' + GU[x.i].n + (x.st.full ? ' · 세수 +' + GU[x.i].f + '% 적용' : x.st.half ? ' · ' + R1S + ' 자격' : '') + '</span><span>' + x.st.have + '/' + x.st.total + ' ›</span></button>';
    }).join('') + '</div>';
    var fl = E.factionList(S), nbF = {}, big = null;
    E.dongsOf(S, 0).forEach(function (i) { D[i].a.forEach(function (j) { var o = S.owner[j]; if (o > 0) nbF[o] = 1; }); });
    Object.keys(nbF).forEach(function (o) { var f = S.f[o]; if (f.alive && (!big || f.troops + (f.away || 0) > big.troops + (big.away || 0))) big = f; });
    if (big) html += '<div class="sec">맞닿은 세력 중 가장 큰 곳</div>' + bossHTML(big.id, kindFor(big.id)) + (big.adv ? bossHTML(big.id, 'adv', '', true) : '') + '<p class="why num"><span class="dot" style="background:' + fCol(big.id) + '"></span><b>' + esc(big.name) + '</b>' + (big.id === S.rival ? ' · 숙적' : '') + (E.inCoal(S, big.id) ? ' · 연합' : '') + (moodWord(big.id) ? ' · ' + moodWord(big.id) : '') + ' · ' + E.dongsOf(S, big.id).length + '개 동 · ' + people(big.troops + (big.away || 0)) + (me.pact && me.pact[big.id] > S.month ? ' · 협정 ' + (me.pact[big.id] - S.month) + '달' : '') + '</p>';
    html += '<details class="more"><summary>세력 순위 보기</summary><div class="rows num">' + fl.slice(0, 7).map(function (f) {
      var pct = me.pact && me.pact[f.id] > S.month ? ' · 협정 ' + (me.pact[f.id] - S.month) + '달' : '';
      var hid = f.id !== 0 && S.seenGu && !S.seenGu[D[f.cap].g];
      return '<div class="row"><span><span class="dot" style="background:' + (hid ? '#C3CBC1' : fCol(f.id)) + '"></span>' + esc(f.id === 0 ? '우리' : hid ? '안개 속 어느 세력' : f.name) + (f.id === S.rival ? ' · 숙적' : '') + esc(pct) + '</span><span>' + (hid ? fuzzy(f.n, 1) + '개 동 · ' + fuzzy(f.troops, 100) + '명' : f.n + '개 동 · ' + people(f.troops)) + '</span></div>';
    }).join('') + '</div>' + (fl.slice(0, 7).some(function (f) { return f.id !== 0 && S.seenGu && !S.seenGu[D[f.cap].g]; }) ? '<p class="why">안개 속 세력은 대략적인 규모만 보입니다.</p>' : '') + '</details>';
    if (ADS.enabled) html += '<div class="acts"><button class="btn" id="adReward" type="button">광고 보고 예산 받기</button></div>';
    sh.innerHTML = tx(html);
    Array.prototype.forEach.call(sh.querySelectorAll('.chip'), function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.m === 'all' ? me.money : +b.dataset.m, r = E.recruit(S, v);
        if (!r.err) sfx('coin');
        if (r.ok) setNews('일당 지급 완료. +' + people(r.n));
        save(); sync();
      });
    });
    Array.prototype.forEach.call(sh.querySelectorAll('.rowBtn'), function (b) { b.addEventListener('click', function () { if (b.dataset.z) openZone(+b.dataset.z); else openGu(+b.dataset.g); }); });
    bind('zNew', function () { zp = { list: [], name: '', msg: '' }; sel = null; sheetMode = 'zpick'; renderSheet(); dirty(); });
    bind('plEdit', function () { showElectNotice(true); });
    bind('express', guard(function () { act(E.express(S)); setNews(S.log[0].t); }));
    bind('rally', guard(function () { act(E.rally(S)); setNews(S.log[0].t); }));
    bind('unity', guard(function () { act(E.unity(S, bestGu())); setNews(S.log[0].t); }));
    bind('exprProj', guard(function () { act(E.exprProj(S)); setNews(S.log[0].t); }));
    bind('adReward', function () { adBreakSafe({ type: 'reward', name: 'budget', adViewed: function () { S.f[0].money += Math.max(50, E.economy(S, 0).tax); save(); sync(); } }); });
  }
  function logSheet(sh) {
    var html = '<div class="head"><div><h2>지역 소식</h2></div><button class="x" type="button" aria-label="닫기">×</button></div><ul class="log">';
    html += S.log.map(function (l) { var go = l.at !== undefined && D[l.at]; return '<li class="' + (l.k === 'n' ? '' : l.k) + (go ? ' go' : '') + '"' + (go ? ' data-at="' + l.at + '" role="button" tabindex="0"' : '') + '><small class="num">' + dateOf(l.m) + '</small>' + esc(l.t) + (go ? ' <span class="goto">' + esc(D[l.at].n) + ' 보기 ›</span>' : '') + '</li>'; }).join('');
    sh.innerHTML = tx(html + '</ul>');
    Array.prototype.forEach.call(sh.querySelectorAll('li[data-at]'), function (li) { li.addEventListener('click', function () { goDong(+li.dataset.at); }); });
  }
  function menuSheet(sh) {
    var html = '<div class="head"><div><h2>메뉴</h2></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="sec">게임 방법</div><ul class="prose"><li>빨간 테두리 동을 눌러 인원을 보내면 공격합니다. 공격과 설득은 결재를 씁니다.</li><li>보낸 인원은 다음 달에 돌아옵니다. 그동안 우리 동 방어가 약해지니 나눠서 쓰세요.</li><li>세수는 실제 직장인 수(주민 수 일부 포함), 동원은 실제 주민 수, 방어는 낮 인구(주민 + 직장인 절반)에 거의 비례합니다. 규모가 4배면 약 2.8배, 10배면 약 5.6배입니다. 작은 동은 관리비도 적게 듭니다. 동네 유형마다 특성이 있습니다.</li><li>우리 동을 누르면 개발합니다. 값은 어느 동이나 같고, 버튼 옆에 실제로 늘어나는 양이 나옵니다. 우리 동이 3개 이하일 때는 지원금이 나옵니다.</li><li>한 ' + GRP + '의 동을 절반 이상 차지하면 ' + R1N + ', 그런 ' + Jm(GRP, '이', '가') + ' ' + R2 + '개면 ' + R2S + ', ' + CNAME + ' 인구 60%면 ' + MAYOR + '입니다. 인구는 통계 기준으로 고정이라 개발해도 늘지 않습니다.</li><li>' + Jm(GRP, '을', '를') + ' 통째로 먹으면 그 ' + GRP + '의 재정자립도만큼 세수가 늘어납니다.' + (SEOUL ? '' : ' (' + (CITY_ID === 'busan' ? '부산은 보도된 수치, 중구만 추정' : '상가·직장인 밀도로 만든 게임용 추정치' + (KIND !== 'metro' && KIND !== 'nation' && /부산/.test(DATA.full) ? ', 부산 구는 보도된 수치' : '')) + ')') + '</li><li>' + R1N + '부터는 ' + GRP + ' 현황에서 한꺼번에 공격·설득·개발할 수 있습니다.</li><li>처음에는 우리 ' + Jm(GRP, '과', '와') + ' 맞닿은 ' + GRP + '만 보입니다. 땅을 넓히면 안개가 걷힙니다. 동네 통계는 안개 속에서도 볼 수 있습니다.</li><li>개발은 단계마다 이름 붙은 시설이 생깁니다. 3단계·5단계 시설은 옆 우리 동까지 효과가 미칩니다. 예: 자치경찰대(치안 3단계)는 옆 우리 동 방어 +15%, 자치소방서(치안 5단계)는 그 일대 독립을 막습니다.</li><li>동네 조합: 일터 동과 맞닿은 주거 동 둘(직주근접, 동원 +20%), 이어진 상권 동 셋(골목상권, 상권 개발비 −30%), 지하철로 이어진 역세권 셋(환승, 기습 불이익 없음)을 모으면 그 동들에만 보너스가 붙습니다. 종류마다 한 판에 한 번입니다.</li><li>시설의 옆 동 효과는 같은 종류끼리 2곳까지만 겹칩니다(세수·동원 최대 +20%, 방어 최대 +30%). 자치소방서는 독립만 막고, 민심이 낮아 줄어드는 세수·동원은 그대로입니다. 시설이 있는 동을 빼앗기면 그 효과는 그 즉시 사라집니다.</li><li>몇 달마다 정부 공모가 열립니다. 공공기관은 오래 벌고, 공공병원은 민심을 지키고, 자원회수시설은 지원금을 착공·준공 두 번에 나눠 주는 대신 민심을 깎습니다. 후반에는 바로 효과가 나는 안전센터 공모가 섞입니다. 다른 세력도 조건과 부담금을 채워야 신청할 수 있고, 아무도 없으면 유찰됩니다. 효과는 게임용으로 지어낸 것입니다.</li><li>숙적은 우리가 크게 진 직후, 우리 인원이 대부분 나가 있을 때, 공사 중이거나 많이 키운 동이 국경에 있을 때 움직입니다. 힘이 다 빠진 숙적은 본거지만 남겨 달라며 협상을 걸어옵니다. ' + R2S + '부터는 작은 세력도 협상을 제안합니다.</li><li>지도의 작은 색 점은 우리 동의 개발 단계입니다. 노랑 상권, 파랑 교통, 초록 주거, 회색 치안. ' + (SEOUL ? '산 무늬는 산을 낀 동네를 대략 표시한 것입니다.' : '') + '</li><li>시작한 동의 유형에 따라 한 판 내내 대표 능력 하나를 씁니다. 점령한 동은 특성 보너스만 줍니다.</li><li>설득·주민투표·통합·협상으로 들어온 동은 민심이 높지만 첫 달 수입이 50%이고 매달 15%p씩 늘어 약 4달 뒤 정상이 됩니다. 주거·치안을 올리면 더 빨라집니다. 공격으로 뺏은 동은 대신 민심 35에서 시작합니다.</li><li>숙적은 공격하기 한 달 전에 어느 동 앞에 모이는지, 몇 명인지 알려 줍니다. 그 동을 누르면 막는 방법(인원 남기기, 치안, 협정, 선제공격)이 나옵니다. 대비가 돼 있으면 저쪽이 공격을 접습니다.</li><li>민심이 40 아래인 동은 독립할 수 있습니다. ' + R1N + '부터 주민 화합 사업으로 막을 수 있습니다.</li><li>세력의 본거지(검은 점)를 빼앗으면 그 세력은 무너지고 동 일부가 따라옵니다. 큰 세력일수록 본거지가 단단하고, 본거지는 지하철로 칠 수 없습니다.</li><li>새로 얻은 동은 그달 말부터 수입에 들어오지만, 민심이 회복될 때까지는 적게 들어옵니다.</li><li>승진할 때와 반년마다 정책 카드 세 장 중 하나를 고릅니다. 고른 카드는 한 판 내내 적용됩니다.</li><li>' + CNAME + ' 인구 45%를 넘기면 남은 세력이 반동장 연합을 맺습니다. 연합 세력은 서로 싸우지 않고 우리만 노리며, 협정·통합을 받지 않습니다.</li><li>인구 60%를 넘기면 ' + E.C.ELECT_WAIT + '달 뒤 ' + MAYOR + ' 선거가 열립니다. 우리 동 주민은 민심에 따라 35~90%, 맞닿은 독립 동은 35%, 그 밖의 독립 동은 25%, 다른 세력 동은 10%(협정 중이면 20%)가 우리를 찍습니다. 과반이면 취임, 못 넘기면 6달 뒤 재선거입니다.</li><li>세력마다 회장이 있습니다. 얼굴과 대사는 지어낸 것입니다. 우리가 치면 원한이, 협정을 끝까지 지키면 호감이 쌓입니다. 원한이 깊은 회장은 먼저 쳐들어오고, 호감이 있는 회장은 덜 치고 협정이 싸지며 연합에도 잘 안 듭니다. 우리에게 무너진 회장은 다른 세력의 고문으로 들어가 그 세력을 더 독하게 만듭니다.</li><li>개발에는 대가가 있습니다. 상권은 주거 동네 민심을, 교통은 그 동 방어를, 주거는 그 동 세수를, 번화가의 치안은 그 동 세수를 조금씩 깎습니다.</li><li>선거가 잡히면 공약 두 개를 고르고, ' + GRP + ' 화면에서 결재 1건으로 유세합니다. 한 ' + GRP + '에서 세 번까지. 원한 많은 회장은 맞불 유세를 합니다.</li><li>' + Jm(R1N, '이', '가') + ' 되면 이어진 우리 ' + UNITN + ' 3~8개를 묶어 이름 붙인 행정구역을 만들 수 있습니다. 구역은 한 번에 작전·개발하고 세수 +5%. 원래 ' + GRP + '가 다른 ' + UNITN + '을 넣으면 그 동 민심이 떨어집니다.</li><li>판이 끝나면 땅을 넓혀 온 기록을 처음부터 다시 볼 수 있습니다.</li><li>' + Jm(MAYOR, '이', '가') + ' 된 뒤에도 남은 동까지 계속 먹을 수 있습니다.</li></ul>';
    html += '<div class="sec">소리</div><div class="acts"><button class="btn" id="sndBtn" type="button">' + (soundOn ? '효과음 켜짐 · 끄기' : '효과음 꺼짐 · 켜기') + '</button></div>';
    html += '<div class="sec">상대 턴 보기</div><div class="chips" id="rpMode">' + [['normal', '보통'], ['fast', '빠르게'], ['off', '끄기']].map(function (m) { return '<button class="chip' + (RPM === m[0] ? ' on' : '') + '" type="button" data-m="' + m[0] + '"' + (RPM === m[0] ? ' aria-pressed="true"' : '') + '>' + m[1] + '</button>'; }).join('') + '</div><p class="why">다음 달을 누르면 다른 세력이 한 일을 하나씩 보여 줍니다. 우리 땅에서 난 일은 항상, 우리 근처 다툼은 몇 건만 보여 주고 나머지는 지도에 바로 반영합니다. 보는 중에 화면을 누르면 빨라지고, 한 번 더 누르면 건너뜁니다.</p>';
    html += '<div class="sec">저장</div><p class="why">진행 상황은 이 기기의 브라우저에 자동 저장됩니다. 기기를 바꾸거나 브라우저 기록을 지울 때는 저장 코드를 복사해 두세요.</p><div class="two" style="margin-top:6px"><button class="btn" id="expBtn" type="button">저장 코드 복사</button><button class="btn" id="impBtn" type="button">코드 불러오기</button></div><textarea id="expText" readonly hidden></textarea>';
    html += '<div class="acts"><button class="btn" id="newGame" type="button">' + (confirmNew ? '정말 처음부터 시작 (지금 판은 사라집니다)' : '새 게임') + '</button></div>';
    if (!SEOUL) html += '<div class="sec">자료 출처</div>' + (KIND === 'metro' ? METRO_SRC : MODE_SRC);
    else html += '<div class="sec">자료 출처</div><p class="src">서울특별시 서울 열린데이터광장: <a href="https://data.seoul.go.kr/dataList/OA-22183/S/1/datasetView.do" target="_blank" rel="noopener">상권분석서비스(상주인구-행정동)</a>, <a href="https://data.seoul.go.kr/dataList/OA-22184/S/1/datasetView.do" target="_blank" rel="noopener">상권분석서비스(직장인구-행정동)</a>, 상권분석서비스(집객시설-행정동). 2023~2024년 기준이라 지금과 다를 수 있습니다. 직장인 수가 빠진 26개 동과 시설 수가 빠진 관악구 신사동은 같은 구의 값으로 추정했습니다.<br>재정자립도: <a href="https://m.go.seoul.co.kr/news/2024/07/16/20240716500023" target="_blank" rel="noopener">서울시의회 자료 보도(서울신문)</a>, 2023년 기준.<br>생활 점수의 소득 항목은 237개 동만 확보해 나머지는 같은 구의 중간값을 썼습니다.<br>행정동 경계: 통계청·행정안전부 자료를 정리한 admdongkor(MIT), 2026년 10월 기준.</p><p class="src">경제·인프라·생활 점수와 동네 유형은 통계를 바탕으로 계산한 게임용 값으로, 실제 매출이나 소득 순위가 아니며 동네의 우열을 뜻하지 않습니다. 등장 단체와 사건은 모두 지어낸 것입니다.</p>';
    sh.innerHTML = tx(html);
    bind('sndBtn', function () { setSound(!soundOn); if (soundOn) sfx('stamp'); renderSheet(); });
    Array.prototype.forEach.call(sh.querySelectorAll('#rpMode .chip'), function (b) { b.addEventListener('click', function () { setReplayMode(b.dataset.m); renderSheet(); }); });
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
    $('over').hidden = true; $('hud').hidden = true; $('bottom').hidden = true; $('start').hidden = false; $('legend').hidden = true; $('mapBtns').hidden = true;
    renderPick(); requestAnimationFrame(function () { fitAll(false); });
    adBreakSafe({ type: 'next', name: 'new-game' });
  }
  function importDialog() {
    showCard('<h2>저장 코드 불러오기</h2><p>복사해 둔 코드를 붙여 넣으세요. 지금 판은 덮어씁니다.</p><textarea id="impText" aria-label="저장 코드"></textarea><p class="err" id="impErr" hidden></p><div class="acts"><button class="btn red" id="impGo" type="button">불러오기</button><button class="btn" id="impNo" type="button">닫기</button></div>');
    bind('impNo', hideCard);
    bind('impGo', function () {
      var raw = rawSave($('impText').value), rc = raw && (raw.city || 'seoul');
      if (raw && rc !== CITY_ID && document.getElementById('data-' + rc)) {   // 다른 도시 판이면 그 도시로 옮겨 감
        try { localStorage.setItem(rc === 'seoul' ? 'dongjang-save-v1' : 'dongjang-save-' + rc + '-v1', JSON.stringify(raw)); } catch (e) {}
        switchCity(rc); return;
      }
      var o = decodeSave($('impText').value);
      if (!o) { var er = $('impErr'); er.hidden = false; er.textContent = '코드를 읽지 못했습니다. DJ2:로 시작하는 코드 전체를 붙여 넣었는지 확인해 주세요.'; return; }
      $('over').hidden = true;
      resumeGame(o); save();
    });
  }
  // ---- 세력 회장: 코드로 그리는 16×16 도트 얼굴 + 성격별 대사 ----
  var FACE = {};
  function trOf(grp) { return { '조기축구회': 'fight', '청년회': 'fight', '방범대': 'fight', '자율방재단': 'fight', '학부모회': 'build', '입주자대표회의': 'build', '반상회': 'build', '노인회': 'build', '상인회': 'rich', '번영회': 'rich' }[grp] || 'talk'; }
  function bossOf(fid, adv) {
    var f = S && S.f[fid]; if (!f || !f.ai) return null;
    if (adv) { var a = f.adv; if (!a) return null; return { nm: a.nm + ' 고문', face: a.face, tr: trOf(a.grp), grp: a.grp, name: '전 ' + a.from, col: a.fromId }; }
    var b = f.boss || { nm: E.SUR[(fid * 7) % E.SUR.length] + E.GIV[(fid * 11 + 3) % E.GIV.length], face: fid * 7919 % 1000000 };
    return { nm: b.nm + ' 회장', face: b.face, tr: trOf(f.grp), grp: f.grp, name: f.name, col: fid };
  }
  function moodWord(fid) { var m = E.moodOf(S, fid); return m === 'grudge' ? '원한 깊음' : m === 'wary' ? '경계' : m === 'warm' ? '호감' : ''; }
  function kindFor(fid) { var m = E.moodOf(S, fid); return m === 'grudge' ? 'grudge' : m === 'warm' ? 'warm' : 'meet'; }
  function faceURL(fid, adv) {
    var b = bossOf(fid, adv); if (!b) return '';
    var key = (adv ? 'a' : '') + fid + ':' + b.face; if (FACE[key]) return FACE[key];
    var seed = b.face >>> 0 || 1, r = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    var k = document.createElement('canvas'); k.width = k.height = 16; var c = k.getContext('2d');
    var px = function (x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); };
    var skin = ['#F2CDA8', '#EBBE95', '#DDAA80', '#C99169'][Math.floor(r() * 4)];
    var hairC = ['#1F1B18', '#3A2E25', '#5E5E5E', '#9C9C9C', '#E4E4E4'][Math.floor(r() * 5)];
    var shirt = fCol(b.col);
    px(0, 0, 16, 16, '#F3F1E7');
    // 몸·옷
    px(2, 13, 12, 3, shirt); px(6, 13, 4, 1, skin);
    if (b.tr === 'rich') { px(7, 13, 2, 3, '#B8322A'); px(5, 13, 1, 3, '#fff'); px(10, 13, 1, 3, '#fff'); }
    // 얼굴
    px(4, 4, 8, 9, skin); px(3, 7, 1, 3, skin); px(12, 7, 1, 3, skin); px(5, 12, 6, 1, skin);
    // 머리 모양
    var hs = Math.floor(r() * 5);
    if (b.grp === '산악회') { px(3, 2, 10, 3, '#C8402E'); px(2, 4, 12, 1, '#C8402E'); px(4, 1, 8, 1, '#C8402E'); }
    else if (b.grp === '방범대' || b.grp === '자율방재단') { px(3, 2, 10, 3, '#24406B'); px(3, 4, 12, 1, '#24406B'); px(7, 2, 2, 1, '#E7C24A'); }
    else if (b.grp === '조기축구회') { px(4, 3, 8, 2, hairC); px(3, 4, 10, 1, '#fff'); px(3, 4, 1, 3, hairC); px(12, 4, 1, 3, hairC); }
    else if (hs === 0) { px(4, 2, 8, 3, hairC); px(3, 3, 1, 3, hairC); px(12, 3, 1, 3, hairC); }
    else if (hs === 1) { for (var q = 0; q < 6; q++) { px(3 + q * 2, 1 + (q % 2), 2, 2, hairC); } px(3, 3, 10, 2, hairC); px(2, 4, 1, 4, hairC); px(13, 4, 1, 4, hairC); }
    else if (hs === 2) { px(3, 5, 1, 3, hairC); px(12, 5, 1, 3, hairC); px(4, 4, 1, 1, hairC); px(11, 4, 1, 1, hairC); }
    else if (hs === 3) { px(4, 2, 8, 2, hairC); px(4, 4, 3, 1, hairC); px(9, 4, 3, 1, hairC); px(3, 3, 1, 4, hairC); px(12, 3, 1, 4, hairC); px(7, 2, 1, 2, skin); }
    else { px(3, 2, 10, 3, hairC); px(2, 4, 2, 7, hairC); px(12, 4, 2, 7, hairC); }
    // 눈썹·눈
    var ang = b.tr === 'fight';
    if (ang) { px(5, 6, 1, 1, '#2A211B'); px(6, 7, 1, 1, '#2A211B'); px(10, 6, 1, 1, '#2A211B'); px(9, 7, 1, 1, '#2A211B'); }
    else { px(5, 6, 2, 1, '#2A211B'); px(9, 6, 2, 1, '#2A211B'); }
    var gl = r();
    px(5, 8, 1, 1, '#2A211B'); px(10, 8, 1, 1, '#2A211B');
    if (gl < 0.1) { px(4, 7, 3, 2, '#1A1A1A'); px(9, 7, 3, 2, '#1A1A1A'); px(7, 7, 2, 1, '#1A1A1A'); }
    else if (gl < 0.32) { var gc = '#9A8468'; px(4, 7, 3, 1, gc); px(9, 7, 3, 1, gc); px(4, 9, 3, 1, gc); px(9, 9, 3, 1, gc); px(4, 8, 1, 1, gc); px(6, 8, 1, 1, gc); px(9, 8, 1, 1, gc); px(11, 8, 1, 1, gc); px(7, 8, 2, 1, gc); }
    px(7, 9, 2, 1, '#C98E6B');
    // 입·수염
    var m = r();
    if (r() < 0.25) px(6, 10, 4, 1, hairC === '#E4E4E4' ? '#BDBDBD' : hairC);
    if (m < 0.4) { px(6, 11, 4, 1, '#8A3B2E'); px(5, 10, 1, 1, '#8A3B2E'); px(10, 10, 1, 1, '#8A3B2E'); }
    else if (m < 0.7) px(6, 11, 4, 1, '#7A3A2C');
    else { px(6, 11, 4, 1, '#fff'); px(6, 12, 4, 0.5, '#7A3A2C'); }
    // 볼
    px(4, 10, 1, 1, '#E79A86'); px(11, 10, 1, 1, '#E79A86');
    return (FACE[key] = k.toDataURL());
  }
  function faceImg(fid, sz, adv) { var u = faceURL(fid, adv); return u ? '<img class="face" src="' + u + '" width="' + (sz || 40) + '" height="' + (sz || 40) + '" alt="">' : ''; }
  var LINES = {
    plan: { fight: ['다음 달 {t}, 우리가 접수합니다. 문 단단히 잠그세요.', '{t} 사람들 벌써 우리 편입니다. 인사나 하러 갈게요.'], build: ['{t}에 놀이터 하나 놔 드리려고요. 우리 손으로.', '{t} 재개발 설명회, 다음 달에 우리가 엽니다.'], rich: ['{t} 상가 번영회비, 다음 달부터 우리가 받습니다.', '{t}? 돈이면 다 됩니다. 다음 달에 봅시다.'], talk: ['{t} 반상회에서 우리 얘기 많이 나온답니다. 다음 달에 갈게요.', '{t} 단톡방 방장이 바뀔 겁니다. 다음 달에.'] },
    win: { fight: ['{t} 잘 받았습니다. 답례 떡은 없습니다.', '{t}? 생각보다 쉽던데요.'], build: ['{t}는 이제 우리가 가꿉니다.', '{t} 주민센터 현판, 내일 바꿔 답니다.'], rich: ['{t} 임대료 계산서는 우리 앞으로 오겠네요.', '{t}, 계약 끝났습니다.'], talk: ['{t} 주민들이 우리 손을 잡아 주셨습니다.', '{t} 단톡방, 오늘부터 우리 방입니다.'] },
    lose: { fight: ['{t}… 다음엔 이렇게 안 끝납니다.', '오늘은 봐 드립니다. {t}.'], build: ['{t}은 다음 계획에 넣어 두겠습니다.', '공사 일정이 좀 밀렸을 뿐입니다.'], rich: ['{t}, 값을 잘못 매겼네요.', '돈으로 안 되는 데도 있군요. 일단은.'], talk: ['{t} 분들, 아직 마음의 준비가 안 되셨네요.', '대화로 다시 찾아뵙겠습니다.'] },
    fall: { fight: ['이걸로 끝난 줄 아십니까… 회원들은 기억합니다.', '졌습니다. 깔끔하게 인정하죠.'], build: ['우리가 깔아 둔 보도블록은 잘 써 주세요.', '동네만은 잘 부탁드립니다.'], rich: ['장부는 넘겨 드리죠. 적자입니다.', '투자 실패군요.'], talk: ['언젠가 같은 단톡방에서 뵙겠습니다.', '말로 했어야 했는데요.'] },
    coal: { fight: ['혼자서는 못 막는다는 거, 다들 알았습니다. 이제 한 팀입니다.'], build: ['동네를 지키려면 손을 잡을 수밖에요.'], rich: ['돈을 모았습니다. 이제 끝을 보죠.'], talk: ['다 같이 모여 얘기해 봤는데요, 답은 하나더군요.'] },
    grudge: { fight: ['우리 회원들 아직 그때 일 얘기합니다.', '빚진 건 꼭 갚는 사람들입니다.'], build: ['당신이 부순 놀이터, 아직 기억합니다.', '공사 방해한 사람은 안 잊습니다.'], rich: ['그 손해, 이자까지 받아 낼 겁니다.', '장부에 당신 이름 적어 놨습니다.'], talk: ['대화요? 이제 늦었습니다.', '단톡방에서 당신 얘기만 합니다. 좋은 얘기는 아니고요.'] },
    warm: { fight: ['협정 지키는 사람은 우리도 안 칩니다.', '의리 있는 분이시네요.'], build: ['덕분에 공사에만 집중했습니다.', '이웃 잘 만났습니다.'], rich: ['거래 상대로 믿을 만하군요.', '조건 맞으면 또 하시죠.'], talk: ['언제든 차 한잔 하러 오세요.', '약속 지키는 분이라 좋습니다.'] },
    adv: { fight: ['기억나십니까? 저는 생생합니다.', '자리는 바뀌었어도 상대는 그대로입니다.'], build: ['새 동네에서 다시 시작합니다. 당신 덕분에요.', '이번엔 무너지지 않게 짓겠습니다.'], rich: ['잃은 만큼 되찾으러 왔습니다.', '새 장부에도 당신 이름부터 적었습니다.'], talk: ['고문으로 돌아왔습니다. 할 말이 많거든요.', '이 세력 회의 첫 안건이 당신입니다.'] },
    revenge: { fight: ['{t}로 하나는 갚았습니다.', '말했죠, 잊지 않는다고.'], build: ['{t}부터 다시 세웁니다.', '하나씩 되찾겠습니다.'], rich: ['{t}, 이자로 받아 갑니다.', '본전은 아직 멀었습니다.'], talk: ['{t} 분들도 제 얘기를 들어 주셨네요.', '말로 안 되면 이렇게라도.'] },
    meet: { fight: ['붙어 보시겠습니까?', '우리 회원들 요즘 몸이 근질근질합니다.'], build: ['우리 동네 좋아진 거 보이시죠?', '공원부터 짓고 이야기합시다.'], rich: ['계산서 들고 오셨나요?', '좋은 조건이면 듣겠습니다.'], talk: ['차 한잔 하시죠.', '얘기로 풀 수 있는 건 얘기로 풉시다.'] }
  };
  function bossLine(fid, k, t, adv) {
    var b = bossOf(fid, adv); if (!b) return '';
    var a = (LINES[k] && LINES[k][b.tr]) || []; if (!a.length) return '';
    return a[(fid * 7 + S.month) % a.length].replace(/\{t\}(은|는)/g, function () { return Jm(t || '', '은', '는'); }).replace(/\{t\}(을|를)/g, function () { return Jm(t || '', '을', '를'); }).replace(/\{t\}/g, t || '');
  }
  function bossHTML(fid, k, t, adv) {
    var b = bossOf(fid, adv); if (!b) return '';
    var ln = bossLine(fid, k, t, adv);
    return '<div class="boss' + (adv ? ' adv' : '') + '">' + faceImg(fid, 44, adv) + '<div><b>' + esc(b.nm) + '</b><span> · ' + esc(b.name) + '</span>' + (ln ? '<q>' + esc(ln) + '</q>' : '') + '</div></div>';
  }
  // ---- 정책 카드 고르기 ----
  var TAGC = { '개발': '#2E7D57', '방어': '#24406B', '공격': '#B8322A', '돈': '#9A6A12', '사람': '#7A3E9D', '민심': '#C2577A', '외교': '#1D7A8C', '행정': '#47524A' };
  function cardHTML(k, btn) {
    var c = E.CARDS[k]; if (!c) return '';
    var e = tx(c.e.replace('강·바다', WATER ? WATER.split('·').join('·') : '강'));
    return (btn ? '<button type="button" class="pcard" data-k="' + k + '">' : '<div class="pcard own">') + '<i style="--c:' + (TAGC[c.tag] || '#47524A') + '">' + c.tag + '</i><b>' + c.n + '</b><span>' + esc(e) + '</span>' + (btn ? '</button>' : '</div>');
  }
  function showCardPick() {
    var why = S.cardWhy === 'rank' ? '승진 기념으로 새 정책을 하나 시행합니다.' : '반년마다 여는 정책 회의입니다. 하나만 고르세요.';
    sfx('page');
    showCard('<div class="seal">정책</div><h2>정책 카드</h2><p class="why">' + why + ' 고른 카드는 이번 판 내내 적용됩니다.' + (S.cards.length ? ' 지금 ' + S.cards.length + '장 시행 중.' : '') + '</p><div class="pcards">' + S.cardOffer.map(function (k) { return cardHTML(k, true); }).join('') + '</div>');
    Array.prototype.forEach.call($('card').querySelectorAll('.pcard'), function (b) {
      b.addEventListener('click', function () { var r = E.chooseCard(S, b.dataset.k); if (r.err) return; sfx('stamp'); $('over').hidden = true; save(); sync(); });
    });
  }
  // ---- 연합·선거 카드 ----
  function showCoal() {
    S.coalShown = 1; sfx('warn');
    var m = S.coal.m.filter(function (id) { return S.f[id].alive; }), big = m.slice().sort(function (a, b) { return S.f[b].troops - S.f[a].troops; });
    var tot = m.reduce(function (x, id) { return x + S.f[id].troops + (S.f[id].away || 0); }, 0);
    showCard('<div class="seal lose">연합</div><h2>반동장 연합 결성</h2><p>남은 세력 ' + m.length + '곳이 손을 잡았습니다. 서로 싸우지 않고 우리 땅만 노립니다. 연합에 든 세력은 불가침 협정과 통합을 받지 않습니다.</p><div class="faces">' + big.slice(0, 8).map(function (id) { return faceImg(id, 40); }).join('') + '</div>' + (big.length ? bossHTML(big[0], 'coal') : '') + '<div class="rows num"><div class="row"><span>연합 전체 인원</span><span>' + people(tot) + '</span></div><div class="row"><span>우리 대기 인원</span><span>' + people(S.f[0].troops) + '</span></div><div class="row"><span>지금 인구</span><span>' + (E.popShare(S, 0) * 100).toFixed(1) + '% · 60%면 ' + E.C.ELECT_WAIT + '달 뒤 선거</span></div></div>' + (S.coal.stay && S.coal.stay.length ? '<p class="why good">협정을 지켜 온 ' + esc(S.coal.stay.map(function (id) { return S.f[id].name; }).join(', ')) + '은 의리를 지켜 연합에 들지 않았습니다.</p>' : '') + '<p class="why">맞닿은 동에 대기 인원을 남기고, 치안을 올려 버티세요. 민심이 표가 됩니다.</p><div class="acts"><button class="btn red" id="cardOk" type="button">맞서기</button></div>');
    bind('cardOk', function () { hideCard(); sync(); });
  }
  function electTerm() { return MAYOR + ' 선거'; }
  function showElectNotice(edit) {
    if (!edit) sfx('fanfare');
    var cp = S.camp || (S.camp = { pl: [], g: {}, u: {} }), sel2 = (cp.pl || []).slice(), v = E.voteShare(S);
    var keep = cp.pl, gain = {};
    Object.keys(E.PLEDGES).forEach(function (k) { cp.pl = [k]; var a = E.voteShare(S); cp.pl = []; gain[k] = a - E.voteShare(S); });
    cp.pl = keep;
    var draw = function () {
      var ok = sel2.length === 2;
      showCard('<div class="seal">선거</div><h2>' + esc(electTerm()) + (S.elect.n > 1 ? ' (재선거)' : '') + ' ' + Math.max(0, S.elect.at - S.month) + '달 뒤</h2><p>' + (S.elect.n > 1 ? '지난 선거 득표율 ' + (S.elect.last * 100).toFixed(1) + '%. 이번엔 과반을 넘겨야 합니다.' : CNAME + ' 인구의 60%를 장악했습니다. 이제 표를 얻어야 ' + Jm(MAYOR, '이', '가') + ' 됩니다.') + ' 지금 예상 득표율 <b>' + (v * 100).toFixed(1) + '%</b>.</p><p class="why">공약 두 개를 고르세요. ' + UNITN + ' 유형마다 반응이 다릅니다. 숫자는 우리 땅 기준 전체 득표 변화입니다.' + (cp.prev ? ' 지난 공약과 같으면 +1%p, 바꾸면 말 바꾸기 −2%p.' : '') + '</p><div class="pcards">' + Object.keys(E.PLEDGES).map(function (k) { var P = E.PLEDGES[k]; return '<button type="button" class="pcard pl' + (sel2.indexOf(k) >= 0 ? ' on' : '') + '" data-k="' + k + '"><b>' + esc(tx(P.n)) + '</b> <em class="num">' + (gain[k] >= 0 ? '+' : '−') + Math.abs(gain[k] * 100).toFixed(1) + '%p</em><span>' + esc(tx(P.e)) + '</span></button>'; }).join('') + '</div><p class="why">' + GRP + ' 화면에서 결재 1건으로 유세할 수 있습니다. 원한 많은 회장은 맞불 유세로 표를 깎습니다.</p><div class="acts"><button class="btn red" id="plOk" type="button"' + (ok ? '' : ' disabled') + '>' + (ok ? '이 공약으로 출마' : '공약 ' + (2 - sel2.length) + '개 더 고르기') + '</button></div>');
      Array.prototype.forEach.call($('card').querySelectorAll('.pl'), function (b) { b.addEventListener('click', function () { var k = b.dataset.k, at = sel2.indexOf(k); if (at >= 0) sel2.splice(at, 1); else { if (sel2.length >= 2) sel2.shift(); sel2.push(k); } sfx('page'); draw(); }); });
      bind('plOk', function () { var r = E.choosePledges(S, sel2); if (r.err) return; S.electShown = S.elect.n; sfx('stamp'); setNews(S.log[0].t); hideCard(); sync(); });
    };
    draw();
  }
  function showElectLost() {
    var r = S.elect.res; S.electLostShown = r.m; sfx('fail');
    showCard('<div class="seal lose">낙선</div><h2>득표율 ' + (r.v * 100).toFixed(1) + '%</h2><p>과반에 ' + (50 - r.v * 100).toFixed(1) + '%p 모자랐습니다. 6달 뒤 재선거입니다.</p><p class="why">민심이 낮은 우리 동부터 챙기고, 인구 많은 동을 더 가져오세요. 맞닿은 독립 동도 표에 조금 보탬이 됩니다.</p><div class="acts"><button class="btn" id="cardOk" type="button">다시 뛰기</button></div>');
    bind('cardOk', function () { hideCard(); sync(); });
  }
  // ---- 전면 카드 ----
  var holdOv = false;   // 달 넘김 결과 카드가 먼저 나오도록 잠깐 미룸
  function checkOverlay() {
    if (!S || !$('over').hidden || holdOv || CAL) return;
    if (S.over) return showEnd(false);
    if (S.won && !S.keepPlaying && !S.endShown) { S.endShown = 1; return showEnd(true); }
    if (S.promo && S.promo < 3) {
      var r = S.promo; S.promo = 0; sfx('fanfare');
      var name = title();
      showCard('<div class="seal">' + E.C.RANKS[r] + '</div><h2>' + esc(name) + '</h2><p>' + (r === 1 ? '한 달 기본 결재가 3건으로 늘었습니다. 이제 ' + GRP + ' 현황에서 한꺼번에 공격·설득·개발할 수 있고, 세력 화면의 행정구역 개편으로 이어진 ' + UNITN + '을 묶어 직접 이름 붙인 구역을 만들 수 있습니다. 다음 목표는 ' + GRP + ' ' + R2 + '곳입니다.' : '한 달 기본 결재가 5건으로 늘었고, ' + GRP + ' 작전은 결재 3건에 5개 동까지 됩니다. 이제 ' + CNAME + ' 인구 60%를 모아 선거에서 이기면 됩니다.') + '</p><div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
      bind('cardOk', function () { hideCard(); checkOverlay(); });
      return;
    }
    if (S.won) return;
    if (S.cardOffer && S.cardOffer.length) return showCardPick();
    if (S.coal && !S.coalShown) return showCoal();
    if (S.elect && S.elect.res && !S.elect.res.win && S.electLostShown !== S.elect.res.m) return showElectLost();
    if (S.elect && S.electShown !== S.elect.n) return showElectNotice();
    if (S.elect && S.camp && !(S.camp.pl || []).length) return showElectNotice(true);
  }
  function showCard(html) { $('card').innerHTML = tx(html); $('over').hidden = false; var b = $('card').querySelector('button'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } } $('card').scrollTop = 0; }
  function hideCard() { $('over').hidden = true; save(); dirty(); }
  function nickOf(win) {
    var st = S.stat, gu = GU[D[S.start].g].n;
    if (!win) return gu + '의 전직 동장';
    var c = [[st.talked >= Math.max(15, st.took * 0.25), '설득왕'], [st.raid >= 15, '지하철 기습왕'], [st.merged >= 3, '통합의 달인'], [st.bridge >= 10, (SEOUL ? '한강' : (WATER || '강').split('·').pop()) + ' 도강왕'], [st.built >= 60, '개발왕'], [st.guop >= 12, GRP + ' 작전왕']];
    for (var i = 0; i < c.length; i++) if (c[i][0]) return gu + '의 ' + c[i][1];
    return gu + '의 불도저';
  }
  function resultImage(win, span, n, nick, nem) {
    var W2 = 1080, H2 = 1350, k = document.createElement('canvas'); k.width = W2; k.height = H2;
    var c = k.getContext('2d'), disp = '"Black Han Sans","Apple SD Gothic Neo","Malgun Gothic",sans-serif', bod = '"IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
    c.fillStyle = '#F7F8F2'; c.fillRect(0, 0, W2, H2);
    c.fillStyle = '#17231C'; c.fillRect(0, 0, W2, 150);
    c.fillStyle = '#fff'; c.font = '700 74px ' + disp; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText(SEOUL ? '동장의 난' : '동장의 난 · ' + CNAME, 56, 78);
    c.textAlign = 'right'; c.font = '500 32px ' + bod; c.fillText(dateOf(S.month), W2 - 56, 80);
    var ms = Math.min(968 / DATA.w, 500 / DATA.h), ox = (W2 - DATA.w * ms) / 2, oy = 176;
    c.save(); c.translate(ox, oy); c.scale(ms, ms);
    D.forEach(function (d, i) { var o = S.owner[i]; c.fillStyle = o === -1 ? '#ECEFE6' : fCol(o); c.fill(dongPath[i]); });
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(30,45,35,.3)'; c.lineWidth = 0.6 / ms; c.stroke(allDong);
    c.strokeStyle = '#7DB2CF'; c.lineWidth = RIVER_W; c.stroke(riverPath);
    c.strokeStyle = '#17231C'; c.lineWidth = 3 / ms; c.stroke(outerPath);
    c.restore();
    c.textAlign = 'left'; c.fillStyle = win ? '#D4321F' : '#47524A'; c.font = '700 66px ' + disp; c.fillText(win ? MAYOR + ' 취임' : '동네에서 쫓겨남', 56, 740);
    c.fillStyle = '#17231C'; c.font = '700 40px ' + bod; c.fillText(GU[D[S.start].g].n + ' ' + D[S.start].n + ' 출신 · ' + nick, 56, 806);
    var rows = [['걸린 시간', span], ['장악 인구', (E.popShare(S, 0) * 100).toFixed(1) + '%' + (win && S.stat.vote ? ' · 득표 ' + (S.stat.vote * 100).toFixed(1) + '%' : '')], ['접수한 동', n + ' / ' + D.length], ['돈으로 설득한 동', S.stat.talked + '개'], ['대표 능력 사용', (S.stat.abil || 0) + '회'], ['집에 돌아간 주민', S.stat.home.toLocaleString('ko-KR') + '명'], ['가장 크게 진 싸움', S.stat.worst ? S.stat.worst.name + ' ' + S.stat.worst.n.toLocaleString('ko-KR') + '명 귀가' : '없음'], ['최대 라이벌', nem || '없음'], ['시설이 번 돈 · 지킨 싸움', money(S.stat.facMoney || 0) + ' · ' + (S.stat.facSaved || 0) + '번']];
    rows.forEach(function (r, i) {
      var y = 862 + i * 45;
      c.textAlign = 'left'; c.fillStyle = '#5D6A60'; c.font = '500 33px ' + bod; c.fillText(tx(r[0]), 56, y);
      c.textAlign = 'right'; c.fillStyle = '#17231C'; c.font = '700 35px ' + bod; c.fillText(r[1], W2 - 56, y);
    });
    c.textAlign = 'center'; c.fillStyle = '#D4321F'; c.font = '700 40px ' + disp; c.fillText('당신의 동네로도 ' + Jm(MAYOR, '이', '가') + ' 될 수 있습니까?', W2 / 2, 1278);
    try { return k.toDataURL('image/png'); } catch (e) { return null; }
  }
  function showEnd(win) {
    sfx(win ? 'fanfare' : 'fail');
    var st = S.stat, n = E.dongsOf(S, 0).length, name = D[S.start].n, gu = GU[D[S.start].g].n;
    var yr = Math.floor(S.month / 12), mo = S.month % 12;
    var span = ((yr ? yr + '년 ' : '') + (mo ? mo + '개월' : (yr ? '' : '0개월'))).trim();
    var nick = nickOf(win), nem = E.nemesis(S);
    var txt = win
      ? gu + ' ' + hd(name) + '으로 시작해 ' + span + ' 만에 ' + Jm(MAYOR, '이', '가') + ' 됐습니다' + (st.vote ? '(득표율 ' + (st.vote * 100).toFixed(1) + '%)' : '') + '. ' + CNAME + ' ' + D.length + '개 동 중 ' + n + '개 접수, 별명은 ' + nick + '. 당신의 동네로도 될까요? #동장의난'
      : gu + ' ' + hd(name) + '으로 시작해 ' + span + ' 만에 동네에서 쫓겨났습니다. 한때 ' + st.biggest + '개 동을 거느렸습니다. #동장의난';
    var img = resultImage(win, span, win ? n : st.biggest, nick, nem);
    showCard('<h2>' + (win ? MAYOR + ' 취임' : '동네에서 쫓겨났습니다') + '</h2>' + (img ? '<img id="resultImg" src="' + img + '" alt="' + esc(txt) + '"><p class="why">이미지를 길게 누르거나 우클릭해서 저장하세요.</p>' : '<div class="seal' + (win ? '' : ' lose') + '">' + (win ? (KIND === 'metro' ? CNAME + '<br>시장' : esc(MAYOR).replace(' ', '<br>')) : '해임') + '</div>') + '<div class="rows num" style="text-align:left;margin-top:6px"><div class="row"><span>' + R1S + ' / ' + R2S + '</span><span>' + (st.r1 !== undefined ? st.r1 + '개월' : '못 함') + ' / ' + (st.r2 !== undefined ? st.r2 + '개월' : '못 함') + '</span></div><div class="row"><span>공격으로 / 설득으로</span><span>' + Math.max(0, st.took - st.talked) + '개 / ' + st.talked + '개</span></div>' + (win && st.vote ? '<div class="row"><span>' + esc(MAYOR) + ' 선거 득표율</span><span>' + (st.vote * 100).toFixed(1) + '%' + (S.elect && S.elect.n > 1 ? ' (' + S.elect.n + '번째 도전)' : '') + '</span></div>' : '') + '</div><textarea id="shareText" readonly>' + esc(txt) + '</textarea><div class="acts">' + (S.hist && S.hist.d.length ? '<button class="btn red" id="tlBtn" type="button">땅 넓힌 기록 다시 보기 ▶</button>' : '') + '<button class="btn" id="copy" type="button">문구 복사</button>' + (win ? '<button class="btn" id="cont" type="button">남은 동까지 마저 먹기</button>' : '') + '<button class="btn" id="retry" type="button">같은 조건으로 다시</button><button class="btn red" id="again" type="button">새 동으로 시작</button></div>');
    if (win) saveBest(S.start, S.month);
    bind('retry', function () { var st0 = S.start, sd = S.seed0; $('over').hidden = true; beginGame(st0, sd !== undefined ? sd : Date.now() & 0x7fffffff); });
    bind('copy', function () { copyText(txt, $('copy'), $('shareText')); });
    bind('tlBtn', function () { $('over').hidden = true; playTL(function () { showEnd(win); }); });
    bind('cont', function () { S.keepPlaying = true; hideCard(); sync(); });
    bind('again', toStart);
    save();
  }
  // ---- 달 넘김 연출: 탁상 달력이 한 장 넘어가고, 상대 턴이 끝나면 '우리 차례' 띠 ----
  function ym(m) { var t = 2027 * 12 + m; return { y: Math.floor(t / 12), m: t % 12 + 1 }; }
  function calFlip(m0, m1, before, foes, done) {
    if (RPM === 'off' || REDUCED) { done(); return; }
    var a = ym(m0), b = ym(m1), newYear = b.y !== a.y, el = $('turnCal');
    CAL = { real: S.owner, done: done, timer: 0 };
    S.owner = before.slice(); dirty();
    el.innerHTML = '<div class="cal' + (newYear ? ' ny' : '') + '"><div class="ring"><i></i><i></i></div><div class="pg back"><small>' + b.y + '년</small><b>' + b.m + '월</b>' + (newYear ? '<em>새해</em>' : '') + '<span>' + (foes ? '상대 세력이 움직입니다' : '조용한 달') + '</span></div><div class="pg front"><small>' + a.y + '년</small><b>' + a.m + '월</b></div></div>';
    el.hidden = false; el.classList.remove('go', 'out');
    void el.offsetWidth; el.classList.add('go');
    sfx('page');
    var dur = RPM === 'fast' ? 700 : 1150;
    CAL.timer = setTimeout(calEnd, dur);
  }
  function calEnd() {
    if (!CAL) return;
    var c = CAL; CAL = null; clearTimeout(c.timer);
    S.owner = c.real;
    var el = $('turnCal'); el.classList.add('out');
    setTimeout(function () { el.hidden = true; el.classList.remove('go', 'out'); }, 180);
    dirty(); c.done();
  }
  $('turnCal').addEventListener('click', calEnd);
  var bannerTimer = 0;
  function turnBanner() {
    if (!S || S.over || REDUCED) return;
    var el = $('turnBanner'), e = E.economy(S, 0), d = ym(S.month);
    el.innerHTML = '<b>' + d.m + '월 · 우리 차례</b><span class="num">결재 ' + S.ap + '건 · 예산 ' + signed(e.net, money) + '</span>';
    var vr = viewRect(); el.style.top = (vr.y + 8) + 'px'; el.style.left = (vr.x + 8) + 'px';
    el.hidden = false; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    clearTimeout(bannerTimer); bannerTimer = setTimeout(function () { el.hidden = true; el.classList.remove('go'); }, 2000);
  }
  // ---- 타임랩스: 첫 달부터 지금까지 땅이 바뀐 기록을 빠르게 다시 그림 ----
  function playTL(done) {
    if (!S.hist) { done(); return; }
    var fr = S.hist.d, step = Math.max(110, Math.min(420, 9000 / Math.max(1, fr.length)));
    TLS = { real: S.owner, own: S.hist.o0.slice(), i: 0, fr: fr, done: done, timer: 0 };
    S.owner = TLS.own;
    sel = null; sheetMode = 'none'; renderSheet();
    fitAll(true);
    $('rpBlock').hidden = false; $('rpBar').hidden = false; $('rpBar').classList.remove('end'); $('mapBtns').hidden = true; $('rpFast').style.display = 'none';
    rpText('기록 · ' + dateOf(S.hist.m0 || 0));
    var tick = function () {
      if (!TLS) return;
      if (TLS.i >= TLS.fr.length) { TLS.timer = setTimeout(tlEnd, 900); return; }
      var f = TLS.fr[TLS.i++], ch = f[1];
      for (var k = 0; k < ch.length; k += 2) TLS.own[ch[k]] = ch[k + 1];
      var mine = 0; for (var q = 0; q < TLS.own.length; q++) if (TLS.own[q] === 0) mine++;
      rpText('기록 · ' + dateOf(f[0]) + ' · 우리 ' + mine + '개');
      dirty();
      TLS.timer = setTimeout(tick, step);
    };
    TLS.timer = setTimeout(tick, 500);
  }
  function tlEnd() {
    if (!TLS) return;
    var T = TLS; TLS = null; clearTimeout(T.timer);
    S.owner = T.real;
    $('rpBlock').hidden = true; $('rpBar').hidden = true; $('rpFast').style.display = '';
    dirty(); T.done();
  }
  // ---- 버튼 ----
  $('next').addEventListener('click', guard(function () {
    if (!S || S.over) return;
    sfx('page');
    backup();
    var before = S.owner.slice();
    var nBefore = before.filter(function (o) { return o === 0; }).length, capBefore = S.f[0].cap;
    var m0 = S.month, ev = E.endTurn(S);
    save();
    if (sel !== null) { sel = null; sheetMode = 'none'; renderSheet(); }
    var R = E.replay();
    calFlip(m0, S.month, before, !!(R && R.ev && R.ev.length) && RPM !== 'off', function () {
      startReplay(before, R, function (quick) { afterTurn(before, nBefore, capBefore, ev, quick); turnBanner(); });
    });
  }));
  function afterTurn(before, nBefore, capBefore, ev, quick) {
    var lost = 0, lostList = []; flash = {};
    before.forEach(function (o, i) {
      if (o === 0 && S.owner[i] !== 0) { flash[i] = 2; lost++; lostList.push(i); }
      if (o !== 0 && S.owner[i] === 0) flash[i] = 1;
    });
    var battles = (S.battles || []).slice(), held = battles.filter(function (b) { return b.held && S.owner[b.t] === 0; });
    S.marks = { m: S.month, list: lostList.map(function (i) { return { t: i, k: 'lost' }; }).concat(held.map(function (b) { return { t: b.t, k: 'held' }; })), card: { lost: lostList, held: held, battles: battles, n0: nBefore, cap: capBefore !== S.f[0].cap } };
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { flash = {}; dirty(); }, 1500);
    var bad = ev.filter(function (l) { return l.k === 'bad'; }), riv = ev.filter(function (l) { return l.k === 'riv'; }), good = ev.filter(function (l) { return l.k === 'good' || l.k === 'rank'; });
    var hints = { 1: '출동 인원이 돌아왔습니다. 우리 동을 누르면 개발, 위쪽 숫자판을 누르면 인원 모집입니다.', 2: HAS_SUB ? '빨간 점선은 지하철로 기습할 수 있는 동입니다.' : '빨간 테두리가 지금 칠 수 있는 동입니다. 바다 건너 섬은 다리로 이어진 셈 칩니다.', 3: '한 ' + GRP + '의 동을 절반 차지하면 ' + Jm(R1N, '입니다', '입니다') + '.' };
    var plan = S.rivalPlan ? ev.filter(function (l) { return l.k === 'riv' && l.t.indexOf('모이고') >= 0; }) : [];
    var hint = nextHint();
    var nb = lostList.length + held.length, capHit = capBefore !== S.f[0].cap;
    if (lostList.length) {
      var lb = battles.filter(function (b) { return !b.held && b.t === lostList[0]; })[0];
      setNews((capHit ? '본거지 ' : '') + D[lostList[0]].n + ' 함락 · ' + (lb ? S.f[lb.f].name : '주민 독립') + (lostList.length > 1 ? ' 외 ' + (lostList.length - 1) + '곳' : '') + ' · 전투 ' + nb + '건' + (plan.length ? ' · 예고: ' + D[S.rivalPlan.t].n : ''), true);
    } else if (plan.length && S.rivalPlan.t === S.f[0].cap) { setNews('본거지 위기 · ' + plan[0].t + (held.length ? ' (이번 달 방어 성공 ' + held.length + '건)' : ''), true); setTimeout(function () { sfx('warn'); }, 350); }
    else if (held.length) { setNews(D[held[0].t].n + ' 방어 성공 · ' + S.f[held[0].f].name + (held.length > 1 ? ' 외 ' + (held.length - 1) + '곳' : '') + (plan.length ? ' · 예고: ' + D[S.rivalPlan.t].n : ''), !!plan.length); if (plan.length) setTimeout(function () { sfx('warn'); }, 350); }
    else if (plan.length) { setNews(plan[0].t + ' 그 동을 누르면 막는 방법이 나옵니다.', true); setTimeout(function () { sfx('warn'); }, 350); }
    else if (bad.length) setNews(bad[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''), true);
    else if (hint) setNews(hint + (good.length ? ' / ' + good[0].t : ''));
    else if (riv.length) setNews(riv[0].t);
    else if (good.length) setNews(good[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''));
    else if (ev.length) setNews(ev[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''));
    else setNews(hints[S.month] || (dateOf(S.month) + '. 조용한 달이었습니다.'));
    if (!bad.length && !riv.length && !good.length && !nb && hints[S.month]) setNews(hints[S.month]);
    if (!S.seenFoe && !bad.length && !plan.length && !nb) {
      var contact = E.dongsOf(S, 0).some(function (i) { return D[i].a.some(function (j) { return S.owner[j] > 0; }); });
      if (contact) { S.seenFoe = 1; setNews('다른 세력과 맞닿았습니다. 그 동을 누르면 협정도 제안할 수 있습니다.'); }
    }
    if (sel !== null && sheetMode === 'dong' && S.owner[sel] !== 0) { var n = E.needFor(S, sel, 0.8); sendN = Math.max(1, Math.min(Math.floor(S.f[0].troops), n)); }
    errMsg = '';
    save();
    holdOv = true; sync(); holdOv = false;
    // 잃은 동이 있으면(후반엔 본거지가 아니고 한 곳뿐이면 소식 줄로만) 결과 카드 하나로 묶어 보여 줌
    var big = lostList.length ? (S.rank < 2 || lostList.length > 1 || capHit) : (held.length && S.rank === 0);
    if (big && !S.over && $('over').hidden) battleCard(lostList, held, battles, nBefore, capHit);
    else checkOverlay();
  }
  function battleCard(lostList, held, battles, nBefore, capHit) {
    var rows = [];
    lostList.forEach(function (i) {
      var b = battles.filter(function (x) { return x.t === i && !x.held; })[0];
      rows.push({ i: i, h: '<b class="bad">' + esc(D[i].n) + ' 함락</b>', s: b ? esc(S.f[b.f].name) + ' · 우리 측 ' + people(b.mine) + ' 귀가' : '주민 독립 선언' });
    });
    held.forEach(function (b) { rows.push({ i: b.t, h: '<b class="good">' + esc(D[b.t].n) + ' 방어 성공</b>', s: esc(S.f[b.f].name) + ' · 우리 측 ' + people(b.mine) + ' / 상대 ' + people(b.theirs) + ' 귀가' }); });
    var more = rows.length > 6 ? rows.length - 6 : 0; rows = rows.slice(0, 6);
    var nNow = E.dongsOf(S, 0).length;
    var win = !lostList.length;
    var head = win ? (held.length > 1 ? '공격 ' + held.length + '건을 모두 막았습니다' : D[held[0].t].n + ' 방어 성공') : capHit ? '본거지를 빼앗겼습니다' : lostList.length > 1 ? '동 ' + lostList.length + '곳을 빼앗겼습니다' : GU[D[lostList[0]].g].n + ' ' + E.J(D[lostList[0]].n, '을', '를') + ' 빼앗겼습니다';
    var mb = lostList.length ? battles.filter(function (x) { return x.t === lostList[0] && !x.held; })[0] : held[0];
    var bq = mb && mb.f > 0 ? (!win && S.f[mb.f].adv ? bossHTML(mb.f, 'revenge', D[mb.t].n, true) : bossHTML(mb.f, win ? 'lose' : 'win', D[mb.t].n)) : '';
    showCard('<div class="seal' + (win ? '' : ' lose') + '">' + (win ? '방어' : '함락') + '</div><h2>' + esc(head) + '</h2>' + bq + '<div class="rows" style="text-align:left;margin-top:8px">' + rows.map(function (r) { return '<div class="row bt"><span>' + r.h + '<br><small>' + r.s + '</small></span><button class="btn" type="button" data-go="' + r.i + '">보기</button></div>'; }).join('') + (more ? '<div class="row"><span>외 ' + more + '곳</span><span></span></div>' : '') + '<div class="row"><span>우리 동</span><span class="num">' + nBefore + '개 → ' + nNow + '개</span></div>' + (capHit ? '<div class="row"><span>새 본거지</span><span>' + esc(D[S.f[0].cap].n) + '</span></div>' : '') + '</div><p class="why">지도에 이번 달 동안 함락·방어 표시가 남습니다. 소식을 눌러도 그 동으로 갑니다.</p><div class="acts"><button class="btn' + (win ? '' : ' red') + '" id="cardOk" type="button">확인</button></div>');
    sfx(win ? 'stamp' : 'fail');
    bind('cardOk', function () { hideCard(); sync(); });
    Array.prototype.forEach.call($('card').querySelectorAll('[data-go]'), function (b) { b.addEventListener('click', function () { hideCard(); goDong(+b.dataset.go); sync(); }); });
  }
  $('rpBlock').addEventListener('click', function () { if (TLS) { tlEnd(); return; } if (!RPS) return; if (!RPS.fast) { RPS.fast = true; } else rpSkip(); });
  $('rpFast').addEventListener('click', function () { if (RPS) RPS.fast = !RPS.fast; $('rpFast').textContent = RPS && RPS.fast ? '보통' : '빠르게'; });
  $('rpSkip').addEventListener('click', function () { if (TLS) tlEnd(); else rpSkip(); });
  $('govBar').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; errMsg = ''; sheetMode = sheetMode === 'gov' ? 'none' : 'gov'; renderSheet(); dirty(); });
  $('offerBar').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; errMsg = ''; sheetMode = sheetMode === 'offer' ? 'none' : 'offer'; renderSheet(); dirty(); });
  $('evBar').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; sheetMode = sheetMode === 'ev' ? 'none' : 'ev'; renderSheet(); dirty(); });
  $('toCap').addEventListener('click', function () { if (!S) return; var d = D[S.f[0].cap]; var r = viewRect(), ns = Math.max(cam.s, fitS * 3.2, zoomFor(S.f[0].cap)); tweenTo({ s: ns, x: r.x + r.w / 2 - d.x * ns, y: r.y + r.h / 2 - d.y * ns }); });
  $('toAll').addEventListener('click', function () { fitAll(true); });
  $('lens').addEventListener('click', function () { lens = (lens + 1) % LENS.length; sync(); });
  $('cells').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; sheetMode = sheetMode === 'realm' ? 'none' : 'realm'; renderSheet(); dirty(); });
  $('pin').addEventListener('click', function () {
    var lost = lostNow(), c = S.marks.card; if (!lost.length) return;
    if (c && c.lost && (c.lost.length + (c.held || []).length) > 1) battleCard(c.lost, c.held || [], c.battles || [], c.n0, c.cap);
    else goDong(lost[0].t);
  });
  $('news').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; sheetMode = sheetMode === 'log' ? 'none' : 'log'; renderSheet(); dirty(); });
  $('menuBtn').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; confirmNew = false; sheetMode = sheetMode === 'menu' ? 'none' : 'menu'; renderSheet(); dirty(); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S && sheetMode !== 'none') closeSheet();
  });
  window.addEventListener('resize', function () { resize(); if (!S) fitAll(false); else requestAnimationFrame(sync); });
  if (window.ResizeObserver) new ResizeObserver(function () { dirty(); }).observe(document.body);

  // ---- 부팅 ----
  function boot(hotData) {
    resize();
    pickSel = idOf(PRESETS[0][0], PRESETS[0][1]);
    var br = document.querySelector('#brand p'); if (br) br.textContent = (SEOUL ? '서울' : DATA.full) + ' ' + D.length + (NATION ? '곳' : '개 동') + ', 실제 통계로 붙는 동네 전쟁. ' + (KIND === 'metro' ? '동장' : E.C.RANKS[0]) + '에서 ' + MAYOR + '까지.' + (window.__oldBrowser ? ' (이 브라우저는 도·전국 지도를 열 수 없어 서울로 엽니다)' : '');
    if (NATION) Array.prototype.forEach.call(document.querySelectorAll('.cell small'), function (x) { x.textContent = tx(x.textContent); });
    if ($('toAll')) $('toAll').textContent = CNAME + ' 전체';
    var mp = $('map'); if (mp) mp.setAttribute('aria-label', tx(CNAME + (NATION ? ' 시군구' : ' 행정동') + ' 지도. 동을 누르면 정보가 열립니다.'));
    if (!SEOUL) document.title = '동장의 난 · ' + CNAME;
    renderPick();
    var res = hotData && hotData.save && E.migrate(hotData.save);
    if (res) { resumeGame(res); }
    else requestAnimationFrame(function () { fitAll(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { labelW = {}; dirty(); });
    window.__game = { get S() { return S; }, E: E, D: D, cam: function () { return cam; }, select: select, sync: function () { sync(); } };
  }
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(function () { return { save: S }; }); } catch (e) {} }
  if (hot && hot.ready) hot.ready(boot); else boot(hot && hot.data ? hot.data : {});
})();
