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
  var netBefore = null, lastBroke = [];
  var lastAct = 0, recDong = null, guReserve = 0.25, blinkTimer = 0;
  function guard(fn) { return function () { var n = Date.now(); if (n - lastAct < 300) return; lastAct = n; fn.apply(this, arguments); }; }
  var lastSheetKey = '', peek = false, zoneSel = null, zp = null, TLS = null, CAL = null, guSel = null, S = null, sel = null, pickSel = null, lens = 0, reach = {}, flash = {}, flashTimer = 0, errMsg = '', sendN = 0, sheetMode = 'none', confirmNew = false;
  var LENS = ['세력', '점령', '인구', '경제', '인프라', '생활'], LKEY = [null, null, 'P', 'E', 'I', 'L'], OCC = 1;
  var PAL = ['#D4321F', '#2F6DB5', '#E2A11F', '#2F9B78', '#8257B8', '#CC5C98', '#6F9426', '#1C9FB8', '#B0713A', '#5468D4', '#74889A', '#8F3F73', '#3F7A55', '#D9812F', '#A5952E', '#3D5A80', '#56B096', '#B57FD0', '#8A6D3B', '#4F9BD9'];
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 소리: 파일이 있으면 그 소리, 없으면 짧은 합성음 ----
  var SFX_DATA = /*SFX*/{}/*SFX_END*/;
  var SOUND_KEY = 'dongjang-sound', soundOn = true, actx = null, aud = {};
  try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) {}
  // 배경음악: 따로 둔 파일(bgm/*.mp3)을 켰을 때만 불러옴. 파일이 없으면 조용히 꺼짐
  var MUSIC_KEY = 'dongjang-music', musicOn = false, bgm = null, bgmK = '', bgmBad = false;
  try { musicOn = localStorage.getItem(MUSIC_KEY) === 'on'; } catch (e) {}
  function bgmWant() { return !S || S.over || S.won ? 'calm' : (S.coal || S.elect) ? 'tense' : 'calm'; }
  function bgmSync(gesture) {
    if (!musicOn || bgmBad) { if (bgm) bgm.pause(); return; }
    var k = bgmWant();
    if (!bgm) { bgm = new Audio(); bgm.loop = true; bgm.volume = 0.32; bgm.preload = 'auto'; bgm.addEventListener('error', function () { bgmBad = true; musicOn = false; if (sheetMode === 'menu') renderSheet(); }); }
    if (bgmK !== k) { bgmK = k; bgm.src = 'bgm/' + k + '.mp3'; }
    if (bgm.paused && (gesture || bgm.dataset.ok)) { var pr = bgm.play(); if (pr && pr.then) pr.then(function () { bgm.dataset.ok = 1; }).catch(function () {}); }
  }
  function setMusic(on) { musicOn = on; bgmBad = false; try { localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off'); } catch (e) {} bgmSync(true); }
  document.addEventListener('pointerdown', function () { if (musicOn && bgm && bgm.paused || (musicOn && !bgm)) bgmSync(true); }, true);
  document.addEventListener('visibilitychange', function () { if (bgm) { if (document.hidden) bgm.pause(); else bgmSync(true); } });
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
  // ---- PixelLab 도트: 24×24 아이콘 줄 하나 + 32×32 얼굴 판 (build.py가 data URL로 채움) ----
  var ICON_SRC = /*ICONS*/'', FACE_SRC = /*FACES*/'';
  var ICK = ['coin', 'people', 'doc', 'flag', 'bag', 'bus', 'house', 'badge', 'handshake', 'envelope', 'split', 'megaphone', 'arrow', 'fist', '번영회', '부녀회', '상인회', '조기축구회', '통장협의회', '노인회', '청년회', '산악회', '입주자대표회의', '배드민턴클럽', '학부모회', '방범대', '반상회', '테니스동호회', '자율방재단'];
  var DEVI = ['bag', 'bus', 'house', 'badge'], OPI = { feud: 'handshake', bribe: 'envelope', split: 'split', smear: 'megaphone' };
  function ic(k, cls) { var i = ICK.indexOf(k); return i < 0 || !ICON_SRC ? '' : '<i class="ic' + (cls ? ' ' + cls : '') + '" style="background-position:-' + i * 24 + 'px 0" aria-hidden="true"></i>'; }
  function emb(fid) { var f = S && S.f[fid], i = f ? ICK.indexOf(f.grp) : -1; return i < 0 || !ICON_SRC ? '' : '<i class="ic emb" style="background-position:-' + i * 24 + 'px 0;--fc:' + fCol(fid) + '" aria-hidden="true"></i>'; }
  var ICON_IMG = null;
  if (ICON_SRC) { (function () { var st = document.createElement('style'); st.textContent = '.ic{background-image:url(' + ICON_SRC + ')}'; (document.head || document.documentElement).appendChild(st); ICON_IMG = new Image(); ICON_IMG.src = ICON_SRC; })(); }
  function fCol(id) { return id === 0 ? PAL[0] : S && S.f[id] && S.f[id].puppet ? pupCol() : PAL[1 + (id - 1) % (PAL.length - 1)]; }
  var PUPCOL = null;
  function pupCol() { if (PUPCOL) return PUPCOL; var n = parseInt(PAL[0].slice(1), 16), k = 0.5, m = function (v) { return Math.round(v + (255 - v) * k); }; return (PUPCOL = 'rgb(' + m(n >> 16) + ',' + m(n >> 8 & 255) + ',' + m(n & 255) + ')'); }
  function isPupO(o) { return S && o > 0 && E.isPup(S, o); }
  var UNDO = [], undoKeep = false;
  function undoable(fn) { var snap = JSON.stringify(S), r = fn(); if (r && !r.err) { UNDO.push(snap); if (UNDO.length > 12) UNDO.shift(); undoKeep = true; } return r; }
  function syncUndo() { var u = $('undo'); if (u) { u.hidden = !UNDO.length || !S || S.over; if (!u.hidden) u.textContent = '되돌리기' + (UNDO.length > 1 ? ' ' + UNDO.length : ''); } }
  function save() { if (!undoKeep) UNDO.length = 0; undoKeep = false; syncUndo(); try { if (S) { var o = S.owner; if (RPS) S.owner = RPS.real; if (TLS) S.owner = TLS.real; if (CAL) S.owner = CAL.real; localStorage.setItem(SAVE_KEY, JSON.stringify(S)); S.owner = o; } } catch (e) {} }
  function backup() { try { var t = localStorage.getItem(SAVE_KEY); if (t) localStorage.setItem(SAVE_KEY + '-prev', t); } catch (e) {} }
  function bests() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch (e) { return {}; } }
  // ---- 오늘의 도전: 날짜로 시작 동과 판(시드)을 정해 모두 같은 판 · 도감: 클리어한 시작 동 ----
  var DAILY_KEY = 'dongjang-daily-' + CITY_ID, BESTC = null;
  function todayKey() { var d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  function dailyPick() { var k = todayKey(), h = Math.imul(k ^ (CITY_ID.length * 7919), 2654435761) >>> 0; return { i: h % D.length, seed: (h ^ 0x5bd1e995) & 0x7fffffff, k: k }; }
  function dailyRec() { try { return JSON.parse(localStorage.getItem(DAILY_KEY)) || {}; } catch (e) { return {}; } }
  function saveDaily(k, m, won) { try { var o = dailyRec(), c = o[k]; if (!c || (won && (!c.won || m < c.m))) { o[k] = { m: m, won: won }; localStorage.setItem(DAILY_KEY, JSON.stringify(o)); } } catch (e) {} }
  // 다른 유형 동에서 이기면 그 대표 능력을 어느 동에서든 고를 수 있음
  var pickAbil = null;
  function abilUnlocked() { var u = {}; Object.keys(bests()).forEach(function (k) { if (D[k]) u[E.abilityOf(D[k].type)] = 1; }); return u; }
  function abilPickHTML(d) {
    var own = E.abilityOf(d.type), u = abilUnlocked(), keys = Object.keys(E.ABIL).filter(function (k) { return k === own || u[k]; });
    if (keys.length < 2) return Object.keys(u).length ? '' : '<p class="why">다른 유형 동에서 이기면 그 대표 능력을 어디서든 쓸 수 있습니다.</p>';
    if (!pickAbil || keys.indexOf(pickAbil) < 0) pickAbil = own;
    return '<p class="qlbl">대표 능력 · 깬 유형만 고를 수 있음</p><div class="chips" id="abilPick">' + keys.map(function (k) { return '<button type="button" class="chip' + (k === pickAbil ? ' on' : '') + '" data-ab="' + k + '">' + esc(E.ABIL[k].n) + (k === own ? ' (기본)' : '') + '</button>'; }).join('') + '</div>';
  }
  function titleOf(n) { return n >= 20 ? '전설의 동장' : n >= 10 ? '모두가 아는 이름' : n >= 5 ? GRP + ' 실력자' : n >= 3 ? '동네 해결사' : n >= 1 ? '신참 동장' : ''; }
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
    if (lens === OCC && S) { var oo = S.owner[i]; return oo === 0 ? PAL[0] : isPupO(oo) ? pupCol() : GU_TOUCH && GU_TOUCH[D[i].g] ? '#E2E6DA' : '#F2F3EE'; }
    if (lens) return ramp(D[i][LKEY[lens]]);
    if (fogged(i)) return FOG_PAT;
    if (!S) return i === pickSel ? '#D4321F' : BESTC && BESTC[i] ? '#F2D58A' : '#ECEFE6';
    var o = S.owner[i];
    return o === -1 ? '#ECEFE6' : o === 0 || o === S.rival || isPupO(o) ? fCol(o) : muted(fCol(o));
  }
  var MUTE = {}, GU_TOUCH = null;
  function muted(hex) {
    if (MUTE[hex]) return MUTE[hex];
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
    var n = parseInt(hex.slice(1), 16), k = 0.42, m = function (v, t) { return Math.round(v + (t - v) * k); };
    return (MUTE[hex] = 'rgb(' + m(n >> 16, 236) + ',' + m(n >> 8 & 255, 239) + ',' + m(n & 255, 230) + ')');
  }
  function frame(now) {
    needs = false;
    if (S) placeQuest();
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
    if (lens === OCC && S) { GU_TOUCH = {}; for (var gi0 = 0; gi0 < D.length; gi0++) if (S.owner[gi0] === 0 || isPupO(S.owner[gi0])) GU_TOUCH[D[gi0].g] = 1; }
    for (var i = 0; i < D.length; i++) { c.fillStyle = fillOf(i); c.fill(dongPath[i]); }
    if (!lens) { c.fillStyle = MT_PAT; Object.keys(MOUNT).forEach(function (k) { if (!fogged(+k)) c.fill(dongPath[k]); }); }
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(30,45,35,.32)'; c.lineWidth = 0.7 * px; c.stroke(allDong);
    if (S && !lens) { c.strokeStyle = 'rgba(255,255,255,.85)'; for (var mi = 0; mi < D.length; mi++) if (S.owner[mi] === 0) { var sl = E.lv(S, mi, 3); c.lineWidth = (sl >= 3 ? 1.2 + sl * 0.5 : 1.2) * px; c.stroke(dongPath[mi]); } }
    if (S && (!lens || lens === OCC)) { var pf = S.f.filter(function (f) { return f.puppet && f.alive; }); if (pf.length) { c.strokeStyle = PAL[0]; c.lineWidth = 1.6 * px; c.setLineDash([4 * px, 3 * px]); for (var pi = 0; pi < D.length; pi++) if (isPupO(S.owner[pi])) c.stroke(dongPath[pi]); c.setLineDash([]); } }
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
    if (S.rivalPlan && S.owner[S.rivalPlan.t] === 0) out.push({ t: S.rivalPlan.t, k: 'threat', s: 'arrow' });
    if (S.foeOp && S.owner[S.foeOp.t] === 0) out.push({ t: S.foeOp.t, k: 'threat', s: 'envelope' });
    S.f.forEach(function (f) { if (f.ai && f.alive && f.retal && S.owner[f.retal.t] === 0) out.push({ t: f.retal.t, k: 'threat', s: 'fist' }); });
    E.puppets(S).forEach(function (f) { if (f.puppet.loyal <= 30) out.push({ t: f.cap, k: 'loyal' }); });
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
  function rpDots() {
    var el = $('rpDots'); if (!el) return;
    if (!RPS || RPS.shown > 12 || RPS.shown < 2) { el.innerHTML = ''; return; }
    var h = ''; for (var q = 1; q <= RPS.shown; q++) h += '<i' + (q <= RPS.k ? ' class="on"' : '') + '></i>';
    el.innerHTML = h;
  }
  function rpDur() { return RPS.fast ? 520 : RPS.shown > 4 && RPS.k > 3 ? 420 : 1150; }
  function rpApply(st) { st.e.ch.forEach(function (c) { RPS.own[c[0]] = c[1]; }); st.applied = true; }
  function rpNext() {
    if (RPS.cur && !RPS.cur.applied) rpApply(RPS.cur);
    RPS.i++;
    while (RPS.i < RPS.steps.length && (!RPS.steps[RPS.i].show || RPS.k >= 8)) { rpApply(RPS.steps[RPS.i]); RPS.quick++; RPS.i++; }
    if (RPS.i >= RPS.steps.length) { RPS.cur = null; return false; }
    var st = RPS.cur = RPS.steps[RPS.i], e = st.e; RPS.k++;
    st.t0 = performance.now();
    rpText('상대 턴 ' + RPS.k + '/' + Math.min(8, RPS.shown)); rpDots();
    var tk = $('rpTalk');
    if (e.k === 'atk' && e.o === 0 && e.f > 0 && bossOf(e.f)) { tk.innerHTML = e.win && S.f[e.f].adv ? bossHTML(e.f, 'revenge', D[e.t].n, true) : bossHTML(e.f, e.win ? 'win' : 'lose', D[e.t].n); tk.hidden = false; }
    else tk.hidden = true;
    // 우리 땅 일과 맞닿은 전투는 지도를 옮겨 보여 줌. 위쪽 상대 턴 줄·회장 말 상자에 말풍선이 가리지 않게
    var r = viewRect(), rb0 = $('rpBar').getBoundingClientRect().bottom, tb0 = tk.hidden ? 0 : tk.getBoundingClientRect().bottom;
    RPS.top = Math.max(r.y, rb0, tb0);
    if (e.o === 0 || e.k === 'rebel' || (e.k === 'atk' && D[e.t].a.some(function (j) { return S.owner[j] === 0; }))) {
      var d = D[e.t], sx = d.x * cam.s + cam.x, sy = d.y * cam.s + cam.y, top = RPS.top, bot = r.y + r.h;
      if (sx < r.x + 30 || sx > r.x + r.w - 30 || sy < top + 56 || sy > bot - 30) {
        var ns = Math.max(cam.s, fitS * 2, zoomFor(e.t) * 0.6), cy = bot - top > 140 ? (top + 40 + bot) / 2 : r.y + r.h / 2;
        tweenTo({ s: ns, x: r.x + r.w / 2 - d.x * ns, y: cy - d.y * ns });
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
    $('rpBlock').hidden = true; $('rpTalk').hidden = true; $('rpDots').innerHTML = '';
    // 끝: '우리 턴'을 잠깐 보여 주고 사라짐
    var rb = $('rpBar'); rb.classList.add('end'); rb.style.right = 'auto'; rpText('우리 턴 · ' + dateOf(S.month));
    clearTimeout(rpEndTimer); rpEndTimer = setTimeout(function () { if (!RPS) { rb.hidden = true; rb.classList.remove('end'); } }, 900);
    dirty();
    R.done(R.quick);
  }
  function rpSkip() { if (!RPS) return; RPS.cur = null; RPS.i = RPS.steps.length; rpEnd(); }
  var rpTags = {};
  function drawReplay(c) {
    if (!RPS || !RPS.cur) return;
    var st = RPS.cur, e = st.e, p = Math.max(0, Math.min(1, (performance.now() - st.t0) / rpDur()));
    var d = D[e.t], col = e.f != null && e.f >= 0 && S.f[e.f] ? fCol(e.f) : '#5D6A60';
    c.save(); c.setTransform(DPR * cam.s, 0, 0, DPR * cam.s, DPR * cam.x, DPR * cam.y);
    var px = 1 / cam.s;
    // 이번 일과 관계없는 동은 어둡게, 출발·목표 동만 원래 색
    c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0); c.fillStyle = 'rgba(23,35,28,.3)'; c.fillRect(0, 0, W, H); c.restore();
    [e.t, e.src].forEach(function (j) { if (j != null && D[j]) { c.fillStyle = fillOf(j); c.fill(dongPath[j]); } });
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
    // 우리 동이 대상이면 '우리 동 피습', 우리 땅과 맞닿은 남의 동이면 '인접 전투'. 결과는 같은 자리에서 바뀜
    var bg = 'rgba(23,35,28,.92)', subC = '#FFD27A', sub = res;
    if (e.k === 'atk' && e.o === 0) {
      sub = fn; subC = 'rgba(255,255,255,.78)';
      if (!st.applied) { t = '우리 동 피습 · ' + D[e.t].n; bg = '#B4261A'; }
      else { t = D[e.t].n + (e.win ? ' 함락' : ' 방어 성공'); bg = e.win ? '#17231C' : '#1F6B52'; }
    } else if (e.k === 'atk' && D[e.t].a.some(function (j) { return S.owner[j] === 0; })) {
      t = '인접 전투 · ' + D[e.t].n;
      sub = st.applied ? (e.win ? (e.col ? '본거지 함락 · ' + e.col + ' 해체' : fn + ' 점령') : '막아냄') : fn;
      subC = st.applied ? '#FFD27A' : 'rgba(255,255,255,.78)';
    }
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.textAlign = 'left'; c.textBaseline = 'middle';
    var F1 = '700 13px "IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif', F2 = (sub === res ? '700 13px' : '500 11px') + ' "IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif';
    var line = tx(t), sub2 = sub ? tx(sub) : '';
    c.font = F1; var w1 = c.measureText(line).width;
    c.font = F2; var w2 = sub2 ? c.measureText(sub2).width + 10 : 0;
    var w = w1 + w2 + 18, h = 24;
    var x = Math.max(8, Math.min(W - w - 8, d.x * cam.s + cam.x - w / 2)), y = Math.max((RPS.top || 0) + h / 2 + 6, d.y * cam.s + cam.y - 30);
    c.fillStyle = bg; c.beginPath(); if (c.roundRect) c.roundRect(x, y - h / 2, w, h, 5); else c.rect(x, y - h / 2, w, h); c.fill();
    c.font = F1; c.fillStyle = '#fff'; c.fillText(line, x + 9, y + 0.5);
    if (sub2) {
      if (sub === res && res) { var good = !e.win && e.o === 0, bad = e.win && e.o === 0; subC = bad ? '#FF8A7A' : good ? '#8FE0B9' : '#FFD27A'; }
      c.font = F2; c.fillStyle = subC; c.fillText(sub2, x + 9 + w1 + 10, y + 0.5);
    }
    rpTags[line + (sub2 ? ' ' + sub2 : '')] = 1;
  }
  function drawMarks(c) {
    if (!S || lens) return;
    var ms = marksNow(); if (!ms.length) return;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.font = '700 12px "IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    var STY = { lost: ['#17231C', '#fff', '함락', 'flag'], held: ['#1F6B52', '#fff', '방어 성공', 'shield'], threat: ['#C2410C', '#fff', '침공 예고', 'warn'], loyal: ['#B4261A', '#fff', '충성 위험', 'warn'] };
    ms.forEach(function (m) {
      var d = D[m.t], st = STY[m.k]; if (!d || !st) return;
      // 테두리 (월드 좌표)
      c.save(); c.setTransform(DPR * cam.s, 0, 0, DPR * cam.s, DPR * cam.x, DPR * cam.y);
      var px = 1 / cam.s;
      if (m.k === 'threat') {
        c.setLineDash([6 * px, 4 * px]); c.strokeStyle = '#EA7A1E'; c.lineWidth = 3.4 * px; c.stroke(dongPath[m.t]); c.setLineDash([]);
        var sp = S.rivalPlan && S.rivalPlan.src;
        if (sp != null && D[sp] && sp !== m.t && !fogged(sp)) threatArrow(c, D[sp], d, px);
      }
      else { c.strokeStyle = '#fff'; c.lineWidth = 6.5 * px; c.stroke(dongPath[m.t]); c.strokeStyle = st[0]; c.lineWidth = 3.6 * px; c.stroke(dongPath[m.t]); }
      c.restore();
      // 아이콘 + 글자 꼬리표 (화면 좌표)
      var x = d.x * cam.s + cam.x, y = d.y * cam.s + cam.y - 27;
      var spr = m.s && ICON_IMG && ICON_IMG.complete && ICON_IMG.naturalWidth ? ICK.indexOf(m.s) : -1;
      if (spr >= 0) {   // 도트 아이콘 꼬리표: 종이색 바탕 + 예고 종류별 그림
        var lb = { arrow: '침공 예고', envelope: '포섭 예고', fist: '보복 예고' }[m.s], ww = c.measureText(lb).width + 36, hh = 28;
        c.fillStyle = '#FDFDF9'; c.strokeStyle = st[0]; c.lineWidth = 2;
        c.beginPath(); if (c.roundRect) c.roundRect(x - ww / 2, y - hh / 2, ww, hh, 5); else c.rect(x - ww / 2, y - hh / 2, ww, hh); c.fill(); c.stroke();
        c.imageSmoothingEnabled = false; c.drawImage(ICON_IMG, spr * 24, 0, 24, 24, Math.round(x - ww / 2 + 3), Math.round(y - 12), 24, 24); c.imageSmoothingEnabled = true;
        c.fillStyle = st[0]; c.fillText(lb, x - ww / 2 + 29, y + 0.5);
        return;
      }
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
  // 다음 달 공격해 올 동 → 노리는 동: 점선 곡선 화살표 (월드 좌표)
  function threatArrow(c, s0, d, px) {
    var mx = (s0.x + d.x) / 2, my = (s0.y + d.y) / 2, dx = d.x - s0.x, dy = d.y - s0.y, L = Math.sqrt(dx * dx + dy * dy) || 1;
    var cx = mx - dy * 0.18, cy = my + dx * 0.18, T = 0.86;
    var bx = function (t) { return (1 - t) * (1 - t) * s0.x + 2 * (1 - t) * t * cx + t * t * d.x; }, by = function (t) { return (1 - t) * (1 - t) * s0.y + 2 * (1 - t) * t * cy + t * t * d.y; };
    c.lineCap = 'round';
    [['rgba(255,255,255,.9)', 7, []], ['#EA7A1E', 3.6, [7 * px, 5 * px]]].forEach(function (w) {
      c.strokeStyle = w[0]; c.lineWidth = w[1] * px; c.setLineDash(w[2]); c.beginPath(); c.moveTo(s0.x, s0.y);
      for (var q = 1; q <= 24; q++) { var t = q / 24 * T; c.lineTo(bx(t), by(t)); }
      c.stroke();
    });
    c.setLineDash([]);
    var ex = bx(T), ey = by(T), ang = Math.atan2(ey - by(T - 0.04), ex - bx(T - 0.04)), hs = 12 * px;
    c.fillStyle = '#EA7A1E'; c.strokeStyle = '#fff'; c.lineWidth = 2 * px;
    c.beginPath(); c.moveTo(ex + Math.cos(ang) * hs * 0.6, ey + Math.sin(ang) * hs * 0.6); c.lineTo(ex + Math.cos(ang + 2.5) * hs, ey + Math.sin(ang + 2.5) * hs); c.lineTo(ex + Math.cos(ang - 2.5) * hs, ey + Math.sin(ang - 2.5) * hs); c.closePath(); c.stroke(); c.fill();
  }
  var labelW = {}, wheelUntil = 0, comboCache = {};
  function isFast() { return !!tween || (gest && gest.moved > 6) || performance.now() < wheelUntil; }
  var LABEL_ORDER = D.map(function (d, i) { return i; }).sort(function (a, b) { return (D[b].b[2] - D[b].b[0]) - (D[a].b[2] - D[a].b[0]); });
  function drawLabels(c, cur) {
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    var zoom = cam.s / fitS;
    var r = viewRect();
    var occ = lens === OCC && S, occN = null;
    if (occ) { occN = GU.map(function () { return [0, 0, 0]; }); for (var oi = 0; oi < D.length; oi++) { var og = occN[D[oi].g]; og[2]++; if (S.owner[oi] === 0) og[0]++; else if (isPupO(S.owner[oi])) og[1]++; } }
    if (zoom < 2.6 || occ) {
      c.font = (W < 500 ? 12 : 14) + 'px ' + '"Black Han Sans","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
      var guPlaced = [];
      GU.forEach(function (g, gi) {
        var x = g.x * cam.s + cam.x, y = g.y * cam.s + cam.y;
        var gl = occ && (occN[gi][0] || occN[gi][1]) ? g.n + ' ' + (occN[gi][0] + occN[gi][1]) + '/' + occN[gi][2] : g.n;
        if (occ && x > -80 && x < W + 80 && y > -20 && y < H + 20 && (occN[gi][0] || occN[gi][1])) { c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.95)'; c.strokeText(gl, x, y); c.fillStyle = '#7A1A0E'; c.fillText(gl, x, y); guPlaced.push({ x: x, y: y, w: c.measureText(gl).width }); return; }
        if (occ && zoom >= 2.6) return;
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
      if (wasPan && pos && e.type === 'pointerup') { lastMapTap = { t: performance.now(), x: e.clientX, y: e.clientY }; tapAt(pos.x, pos.y); }
      gest = null;
      dirty();
    } else if (gest && gest.type === 'pinch') {
      var k = Object.keys(ptrs)[0];
      gest = { type: 'pan', sx: ptrs[k].x, sy: ptrs[k].y, lx: ptrs[k].x, ly: ptrs[k].y, moved: 99 };
    }
  }
  // 지도를 누르는 순간 정보창이 그 자리까지 올라오면, 손을 뗄 때 따라오는 클릭이 새 버튼(공격 등)을 누르지 않게 막음
  var lastMapTap = null;
  document.addEventListener('click', function (e) {
    var t = lastMapTap; if (!t || e.target === cv) return;
    if (performance.now() - t.t < 450 && Math.abs(e.clientX - t.x) < 12 && Math.abs(e.clientY - t.y) < 12) { e.preventDefault(); e.stopPropagation(); }
    lastMapTap = null;
  }, true);
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
    if (tax > 30 && dr < 10) return '돈은 많고 사람은 적음 · 모집하거나 설득으로 넓히기';
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
      brokenFor(i).forEach(function (k) { var ms = comboMiss(k); h += '<p class="combo"><b>되찾으면 ' + E.COMBO[k].n + ' 다시 작동</b> · ' + E.COMBO[k].fx + (ms.length > 1 ? '<br><span>' + esc(ms.filter(function (j) { return j !== i; }).map(function (j) { return D[j].n; }).join('·')) + '도 되찾아야 합니다</span>' : '') + '</p>'; });
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
    var dp = dailyPick(), dr = dailyRec()[dp.k]; BESTC = bests();
    html += '<button class="btn" id="dailyBtn" type="button" style="width:100%;margin-bottom:8px">오늘의 도전 · ' + esc(D[dp.i].n) + '<small>모두 같은 시작·같은 판 · ' + (dr ? (dr.won ? '내 기록 ' + dr.m + '달' : '도전함 · 아직 못 깸') : '오늘 아직 안 함') + '</small></button>';
    var clr = Object.keys(BESTC).filter(function (k) { return D[k]; }), gus = {}; clr.forEach(function (k) { gus[D[k].g] = 1; });
    if (clr.length) html += '<p class="why num" id="dex">도감 · 클리어 ' + clr.length + '곳 · ' + GRP + ' ' + Object.keys(gus).length + '/' + GU.length + ' · 칭호 <b>' + titleOf(clr.length) + '</b> · 지도의 노란 동</p>';
    html += '<input id="q" type="search" autocomplete="off" aria-label="동 이름 검색" placeholder="우리 동네 검색, 또는 지도에서 누르기" value="' + esc(q) + '"><div id="results"></div>';
    html += '<div id="presets">' + PRESETS.map(function (p) {
      var i = idOf(p[0], p[1]);
      return '<button type="button" data-i="' + i + '"' + (i === pickSel ? ' class="on"' : '') + '>' + p[1] + ' · ' + p[2] + '<small>' + difficulty(i) + ' · ' + p[3] + '</small></button>';
    }).join('') + '</div>';
    if (d) {
      html += '<div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--line)"><div class="head"><div><h2>' + esc(d.n) + '<span class="diff">' + difficulty(pickSel) + '</span></h2><p>' + GU[d.g].n + ' · ' + GU[d.g].r + '</p></div></div><p class="why">' + reasonOf(pickSel) + (bests()[pickSel] ? ' 이 동 최고 기록은 ' + bests()[pickSel] + '개월입니다.' : '') + '</p>' + abilPickHTML(d) + '<div class="acts"><button class="btn red" id="begin" type="button">' + esc(hd(d.n)) + '으로 시작</button></div>' + typeHTML(d) + abilHTML(d.type, true) + gaugeHTML(d) + factsHTML(d) + '</div>';
    }
    html += '<p class="why">점수와 유형은 ' + (SEOUL ? '2023~2024년' : '2026년') + ' 통계로 계산한 게임용 값입니다. <button id="randBtn" class="linkish" type="button">아무 동이나 고르기</button> · <button id="importBtn" class="linkish" type="button">저장 코드 불러오기</button></p>';
    $('pick').innerHTML = tx(html);
    bind('importBtn', importDialog);
    Array.prototype.forEach.call(document.querySelectorAll('#cities .city'), function (b) { b.addEventListener('click', function () { switchCity(b.dataset.c); }); });
    bind('randBtn', function () { choosePick(Math.floor(Math.random() * D.length)); });
    var inp = $('q');
    inp.addEventListener('input', function () { searchList(inp.value); });
    Array.prototype.forEach.call($('presets').children, function (b) { b.addEventListener('click', function () { choosePick(+b.dataset.i); }); });
    if ($('begin')) $('begin').addEventListener('click', function () { var ab = pickAbil; beginGame(pickSel); if (ab && ab !== S.abil && abilUnlocked()[ab]) { S.abil = ab; save(); sync(); } });
    Array.prototype.forEach.call(document.querySelectorAll('#abilPick .chip'), function (b) { b.addEventListener('click', function () { pickAbil = b.dataset.ab; renderPick(); }); });
    if ($('resume')) $('resume').addEventListener('click', function () { resumeGame(sv); });
    bind('dailyBtn', function () { var dp2 = dailyPick(); beginGame(dp2.i, dp2.seed); S.daily = dp2.k; save(); setNews('오늘의 도전 · ' + D[dp2.i].n + ' · 모두 같은 판'); });
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
    pickSel = i; pickAbil = null;
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
        if (o === 0 || (o > 0 && (pact[o] > S.month || isPupO(o)))) return;
        reach[j] = 1;
      });
    });
    mine.forEach(function (i) {
      E.subwayOf(i).forEach(function (j) {
        var o = S.owner[j];
        if (o === 0 || reach[j] || (o > 0 && (pact[o] > S.month || isPupO(o)))) return;
        reach[j] = 2;
      });
    });
    if (S.stat.took === 0) {
      var bestN = 1e9;
      Object.keys(reach).forEach(function (k) { if (reach[k] !== 1 || S.owner[k] !== -1) return; var n = E.needFor(S, +k, 0.8); if (n < bestN) { bestN = n; recDong = +k; } });
    }
  }
  // 승진에 가장 가까운 구: 우리 동이 있거나 맞닿은 구 중 '절반까지 남은 수'가 가장 적은 곳 (같으면 우리 비율이 높은 곳)
  // 동을 더 얻어서 남은 수가 늘어나는 일이 없도록 비율이 아니라 남은 수로 고름
  function bestGu() {
    var list = E.guDongs(), best = -1, bn = 1e9, bk = -1;
    list.forEach(function (ds, g) {
      var own = 0, touch = false;
      ds.forEach(function (i) { if (S.owner[i] === 0) own++; else if (!touch && D[i].a.some(function (j) { return S.owner[j] === 0; })) touch = true; });
      if (!own && !touch) return;
      var need = Math.max(0, Math.ceil(ds.length / 2) - own), k = own / ds.length + (own ? 1 : 0);
      if (need < bn || (need === bn && k > bk)) { bn = need; bk = k; best = g; }
    });
    return best < 0 ? D[S.f[0].cap].g : best;
  }
  function unitN(n) { return n + (UNITN.length > 1 ? '곳' : UNITN); }
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
    if (S.rank < 1) { var g0 = bestGu(); return hd(gShort(g0)) + '까지 ' + unitN(E.guStatus(S, g0).need); }
    if (S.rank < 2) return R2S + ' ' + Math.max(0, R2 - E.guHeld(S, 0)) + (KIND === 'metro' ? '구' : '곳') + ' 더';
    if (S.elect && !S.won) return '선거 ' + Math.max(0, S.elect.at - S.month) + '달·' + (E.voteShare(S) * 100).toFixed(0) + '%';
    return '인구 ' + (E.popShare(S, 0) * 100).toFixed(1) + '%';
  }
  // 다음 직급까지 진행: 칸이 12개 이하면 칸 막대, 아니면 이어진 막대
  function goalSeg() {
    var a, b;
    if (S.won) return '';
    if (S.rank < 1) { var st = E.guStatus(S, bestGu()); a = st.have; b = Math.ceil(st.total / 2); }
    else if (S.rank < 2) { a = E.guHeld(S, 0); b = R2; }
    else if (S.elect) { a = E.voteShare(S); b = 0.5; }
    else { a = E.popShare(S, 0); b = 0.6; }
    if (b >= 1 && b <= 12 && b === Math.round(b)) { var h = ''; for (var q = 0; q < b; q++) h += '<i' + (q < a ? ' class="on"' : '') + '></i>'; return h; }
    var pc = Math.max(0, Math.min(100, a / b * 100));
    return '<i style="background:linear-gradient(90deg,var(--good) ' + pc.toFixed(1) + '%,var(--line) ' + pc.toFixed(1) + '%)"></i>';
  }
  function goalLong() {
    if (S.rank < 1) { var g = bestGu(); return hd(GU[g].n) + '까지 ' + unitN(E.guStatus(S, g).need); }
    if (S.rank < 2) return R2S + '까지 ' + GRP + ' ' + Math.max(0, R2 - E.guHeld(S, 0)) + '곳';
    if (S.elect && !S.won) return MAYOR + ' 선거 ' + Math.max(0, S.elect.at - S.month) + '달 뒤 · 예상 득표 ' + (E.voteShare(S) * 100).toFixed(1) + '% / 과반';
    return CNAME + ' 인구 ' + (E.popShare(S, 0) * 100).toFixed(1) + '% / 60%';
  }
  function firstWinCard(name, before, lost, back) {
    if (S.firstWinShown) return;
    S.firstWinShown = 1;
    var e = E.economy(S, 0);
    showCard('<div class="seal">접수</div><h2>' + esc(name) + ' 접수</h2><div class="rows num" style="text-align:left;margin-top:10px"><div class="row"><span>우리 동</span><span>' + before.n + '개 → ' + e.n + '개</span></div><div class="row"><span>월 수입</span><span>' + signed(e.tax - before.tax, money) + '</span></div><div class="row"><span>월 동원</span><span>' + signed(e.draft - before.draft, people) + '</span></div><div class="row"><span>집에 간 인원</span><span>' + people(lost) + '</span></div><div class="row"><span>다음 달 복귀</span><span>' + people(back) + '</span></div><div class="row"><span>다음 목표</span><span>' + esc(goalLong()) + '</span></div></div><p class="why">민심이 오르면 수입도 오릅니다. 남은 결재를 쓰거나 다음 달로.</p><div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
    bind('cardOk', hideCard);
  }
  // 설득·통합으로 들어온 동의 수입: 지금(정착 중)과 정착 후
  function joinFx(t) {
    var fm = E.fullMapOf(S, 0, E.dongsOf(S, 0)), now = E.taxOf(S, t, fm) + E.govTaxOf(S, t);
    var sv = S.settle ? S.settle[t] : undefined; if (sv !== undefined) delete S.settle[t];
    var full = E.taxOf(S, t, fm) + E.govTaxOf(S, t);
    if (sv !== undefined) S.settle[t] = sv;
    return { now: now, full: full, left: E.settleLeft(S, t) };
  }
  function joinText(t, cost) { var j = joinFx(t); return D[t].n + ' 합류 · ' + money(cost) + ' 사용 · 첫 달 수입 ' + money(j.now) + ' → 정착 후 ' + money(j.full) + '/월'; }
  function joinCard(t, before, cost) {
    if (S.firstWinShown) return;
    S.firstWinShown = 1;
    var e = E.economy(S, 0), j = joinFx(t);
    showCard('<div class="seal">합류</div><h2>' + esc(D[t].n) + ' 합류</h2><div class="rows num" style="text-align:left;margin-top:10px"><div class="row"><span>우리 동</span><span>' + before.n + '개 → ' + e.n + '개</span></div><div class="row"><span>설득 비용</span><span>' + money(cost) + '</span></div><div class="row"><span>' + esc(D[t].n) + ' 수입</span><span>첫 달 <b>' + money(j.now) + '</b> → 정착 후 <b>' + money(j.full) + '/월</b></span></div><div class="row"><span>다음 목표</span><span>' + esc(goalLong()) + '</span></div></div><p>싸우지 않고 들어와 인원은 그대로입니다. 수입·동원은 절반에서 시작해 ' + (j.left ? j.left + '달 뒤' : '곧') + ' 정상이 됩니다.</p><div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
    bind('cardOk', hideCard);
  }
  function checkFullGu() {
    if (!S.fullSeen) { S.fullSeen = GU.map(function (g, i) { return E.fullGu(S, 0, i) ? 1 : 0; }); return; }
    GU.forEach(function (g, i) {
      var full = E.fullGu(S, 0, i);
      if (full && !S.fullSeen[i]) {
        S.fullSeen[i] = 1;
        stampWorld(g.x, g.y, true, g.n + ' 완성');
        var msg = E.J(g.n, '을', '를') + ' 통째로 장악했습니다. 이 ' + GRP + ' 수입 +' + g.f + '%.';
        S.log.unshift({ m: S.month, t: msg, k: 'good' });
        var old0 = $('news').textContent; $('news').textContent = tx(msg) + (old0 && !/^첫 목표/.test(old0) && old0.length < 60 ? ' ' + old0 : ''); $('news').className = '';
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
  // ---- 이달 과제: 달마다 하나. 해내면 예산 보상, 연달아 해내면 보상이 10%씩 커짐(최대 +50%) ----
  function questReward(mul) { var e = E.economy(S, 0), base = Math.max(10, Math.max(0, e.net) * 0.25 * (mul || 1)); return Math.round(base * (1 + 0.1 * Math.min(5, S.qStreak || 0)) / 5) * 5; }
  function newQuest() {
    if (!S || S.over || (S.won && !S.keepPlaying)) { if (S) S.quest = null; return; }
    var q = { m: S.month, done: 0 }, rp = S.rivalPlan, r = recommend(), mul = 1, cand = [];
    if (rp && S.owner[rp.t] === 0) { q.k = 'keep'; q.t = rp.t; q.n = 1; q.txt = D[rp.t].n + ' 지키기'; mul = 1.2; }
    else {
      var canTake = r && /^(atk|per|gu|zone)$/.test(r.k);
      if (canTake) cand.push({ k: 'take', n: S.rank >= 1 ? Math.max(3, Math.round(S.ap * 1.5)) : Math.max(1, Math.min(2, S.ap)) });
      // 구 절반 넘기기: 남은 수가 적은 구
      if (canTake) { var gb = -1, gn = 99; GU.forEach(function (x, g) { var st = E.guStatus(S, g); if (!st.half && st.have && st.need <= (S.rank >= 1 ? 4 : 2) && st.need < gn) { gn = st.need; gb = g; } }); if (gb >= 0) cand.push({ k: 'gu', g: gb, n: 1, mul: 1.3 }); }
      if (S.f[0].money >= 60) cand.push({ k: 'dev', n: 2 + 2 * S.rank });
      if (!cand.length) cand.push({ k: 'take', n: 1 });
      var c = cand[S.month % cand.length];
      q.k = c.k; q.n = c.n; mul = c.mul || 1;
      if (c.k === 'take') { q.b = S.stat.took; q.txt = UNITN + ' ' + c.n + '곳 얻기'; }
      else if (c.k === 'dev') { q.b = S.stat.built; q.txt = '개발 ' + c.n + '번'; }
      else { q.g = c.g; q.txt = gShort(c.g) + ' 절반 넘기기'; }
    }
    q.rw = questReward(mul); S.quest = q;
  }
  function questProg(q) { return q.k === 'take' ? Math.min(q.n, S.stat.took - q.b) : q.k === 'dev' ? Math.min(q.n, S.stat.built - q.b) : q.k === 'gu' ? (E.guStatus(S, q.g).half ? 1 : 0) : 0; }
  function questWin(q) {
    q.done = 1; S.qStreak = (S.qStreak || 0) + 1; S.f[0].money += q.rw; S.stat.quests = (S.stat.quests || 0) + 1; S.stat.qBest = Math.max(S.stat.qBest || 0, S.qStreak);
    var el = $('quest'); if (el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    setTimeout(function () { sfx('coin'); }, 250);
  }
  function questCheck() { var q = S && S.quest; if (!q || q.done || q.k === 'keep' || q.m !== S.month) return; if (questProg(q) >= q.n) questWin(q); }
  // 달이 바뀔 때: 지키기 과제 판정, 못 한 과제는 연속 기록 끊김, 새 과제
  function questTurn() {
    var q = S.quest, line = '';
    if (q && !q.done && q.k === 'keep' && S.owner[q.t] === 0) { questWin(q); S.quest0rw = q.rw; line = 'keep'; }
    else if (q && !q.done) S.qStreak = 0;
    newQuest();
    return line;
  }
  function placeQuest() {
    var el = $('quest'), q = S && S.quest; if (!el) return;
    var vr = viewRect(), hide = !q || S.over || !!RPS || !!TLS || !!CAL || vr.h < 230 || !$('over').hidden;
    if (el.hidden !== hide) el.hidden = hide; if (hide) return;
    var lg = $('legend'), top = vr.y + 8 + (lg.hidden ? 0 : lg.getBoundingClientRect().height + 6);
    el.style.top = top + 'px'; el.style.left = (vr.x + 8) + 'px';
  }
  function syncQuest() {
    var el = $('quest'), q = S && S.quest; if (!el || !q) return;
    var pr = q.k === 'keep' ? '' : q.k === 'gu' ? (q.done ? '' : ' ' + E.guStatus(S, q.g).need + '곳 남음') : ' ' + questProg(q) + '/' + q.n, st = S.qStreak || 0;
    el.className = q.done ? 'done' : '';
    el.innerHTML = '<small>' + (q.done ? '이달 과제 완료' : '이달 과제') + (st >= 2 ? ' · 연속 ' + st + '달' : '') + '</small><b>' + (q.done ? '✓ ' : '') + esc(tx(q.txt)) + (q.done ? '' : pr) + ' <em>+' + money(q.rw) + '</em></b>';
  }
  function sync() {
    if (S.quest === undefined) newQuest();
    questCheck();
    checkFullGu(); checkCombo();
    var fresh = updateFog();
    if (fresh.length) { var rn = revealNews(fresh); S.log.unshift({ m: S.month, t: rn, k: 'n' }); }
    computeReach();
    var me = S.f[0], e = E.economy(S, 0);
    $('who').textContent = title();
    $('when').textContent = dateOf(S.month);
    $('cMoney').textContent = money(me.money);
    $('cMoneyD').textContent = signed(e.net, money) + '/월';
    $('cMoneyD').className = 'num' + (e.net < 0 ? ' neg' : '');
    $('cTroops').textContent = me.troops >= 99950 ? Math.round(me.troops / 10000) + '만명' : me.troops >= 10000 ? (me.troops / 10000).toFixed(1) + '만명' : people(me.troops);
    $('cTroopsD').textContent = me.away >= 1 ? '출동 ' + (me.away >= 10000 ? (me.away / 10000).toFixed(1).replace(/\.0$/, '') + '만명' : people(me.away)) : signed(e.draft - e.decay, people) + '/월';
    $('cAp').textContent = S.ap + '건';
    $('cN').textContent = e.n + '개';
    var cp = $('cPop'); cp.textContent = tx(goalShort());
    // 칸이 좁으면 '까지'를 빼고, 그래도 넘치면 예전처럼 짧게
    if (S.rank < 1 && cp.scrollWidth > cp.clientWidth + 1) { var g1 = bestGu(), nd = E.guStatus(S, g1).need; cp.textContent = tx(hd(gShort(g1)) + ' ' + unitN(nd)); if (cp.scrollWidth > cp.clientWidth + 1) cp.textContent = tx(R1S + ' ' + nd + '개 더'); }
    $('cSeg').innerHTML = goalSeg();
    $('lens').textContent = '지도: ' + LENS[lens];
    $('next').className = S.ap <= 0 ? 'go' : '';
    var lg = $('legend');
    lg.hidden = !lens;
    if (lens) { $('legendName').textContent = LENS[lens]; lg.style.top = ($('hud').getBoundingClientRect().bottom + 8) + 'px'; }
    lg.classList.toggle('occ', lens === OCC);
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
    syncQuest(); syncTodo();
    renderSheet();
    dirty();
    checkOverlay();
    $('next').innerHTML = S.ap > 0 ? '다음 달<small>결재 ' + S.ap + '건 남음</small>' : '다음 달 ▶';
  }
  // 지금 할 수 있는 가장 좋은 한 수: 승률 80%로 칠 수 있는 동 중 인구가 가장 큰 곳 → 없으면 설득 → 모집
  // 결재가 안 드는 일: 돈이 남는데 인원이 얇으면 모집, 아니면 전체 개발
  function idleRec(force) {
    var me = S.f[0], n = E.dongsOf(S, 0).length;
    if (me.money < 150) return null;
    var threat = S.rivalPlan && S.owner[S.rivalPlan.t] === 0 && me.troops < S.rivalPlan.n * 1.2;
    var thin = me.troops < Math.min(1500, Math.max(150, n * 25));
    if (threat) return { k: 'rec', txt: '추천 · 모집 · 침공 대비 (예산 ' + money(me.money) + ')' };
    if (thin || force) return { k: 'rec', txt: '추천 · 모집 · 예산 ' + money(me.money) + ' 남음' };
    if (me.money >= 300) { var pl = E.realmDevPlan(S, -1, Math.floor(me.money * 0.5)); if (pl.n) return { k: 'rec', txt: '추천 · 전체 개발 ' + pl.n + '곳 · 예산 ' + money(me.money) + ' 남음' }; }
    return null;
  }
  function gShort(g) { return GU[g].n.split(' ').pop(); }
  function recReason(j) {
    if (S.rivalPlan && S.rivalPlan.src === j) return '침공 출발지';
    var cp = E.comboPreview(S, j); if (cp.length) return cp[0].n.replace(/ (생활권|연합)$/, '') + ' 완성';
    var g = D[j].g, st = E.guStatus(S, g);
    if (S.rank < 1 && g === bestGu()) return hd(gShort(g)) + (st.need === 1 ? ' 승진' : ' 목표');
    if (S.rank >= 1 && S.rank < 2 && !st.half && st.need <= 2) return gShort(g) + ' 절반까지 ' + st.need;
    return st.have ? gShort(g) + ' 확장' : gShort(g) + ' 진출';
  }
  function recommend() {
    if (!S || S.over) return null;
    var lowP = E.puppets(S).filter(function (f) { return f.puppet.loyal <= 30; }).sort(function (a, b) { return a.puppet.loyal - b.puppet.loyal; })[0];
    if (lowP) return { k: 'pup', t: lowP.cap, txt: '경고 · ' + lowP.name + ' 충성 ' + Math.round(lowP.puppet.loyal) + ' · 지원금 보내기' };
    if (S.foeOp && S.owner[S.foeOp.t] === 0) { var fd = E.foeOpDef(S, S.foeOp.t), fc = E.lv(S, S.foeOp.t, 3) < 5 ? E.devCost(S, S.foeOp.t, 3) : null; if (fd < 0.8 && fc !== null && fc <= S.f[0].money) return { k: 'foe', t: S.foeOp.t, txt: '경고 · ' + D[S.foeOp.t].n + ' 포섭 위험 ' + Math.round((1 - fd) * 100) + '% · 치안 올리기 ' + money(fc) }; }
    if (S.ap <= 0) return idleRec();
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
    var me = S.f[0], mine = E.dongsOf(S, 0), seen = {}, best = null, bestP = null, max = Math.floor(me.troops), held0 = false, goalG = S.rank < 1 ? bestGu() : -1;
    var threatN = S.rivalPlan && S.owner[S.rivalPlan.t] === 0 ? S.rivalPlan.n : 0;
    var keep = Math.max(threatN, S.coal && !S.won ? Math.min(1500, mine.length * 6) : 0);
    mine.forEach(function (a) { D[a].a.forEach(function (j) {
      if (seen[j] || S.owner[j] === 0 || fogged(j)) return; seen[j] = 1;
      var o = S.owner[j]; if (o > 0 && me.pact && me.pact[o] > S.month) return;
      var n = E.needFor(S, j, 0.8); if (!n || n > max) return;
      if (n > max - keep) { held0 = true; return; }
      var pv = E.preview(S, j, n); if (!pv.ok) return;
      var v = (D[j].pop + (D[j].work || 0) * 0.5) * (D[j].g === goalG ? 1.4 : 1) + (S.rivalPlan && S.rivalPlan.src === j ? 1e7 : 0);
      if (!best || v > best.v) best = { t: j, v: v, n: n, pct: pv.pct };
      if (o === -1 && pv.route && pv.route.via !== 'subway') { var c = E.persuadeCost(S, j); var pv2 = D[j].pop * (D[j].g === goalG ? 1.4 : 1); if (c <= me.money && (!bestP || pv2 > bestP.v)) bestP = { t: j, v: pv2, c: c }; }
    }); });
    if (!best && !bestP) {
      Object.keys(reach || {}).some(function (k) { var j = +k; if (S.owner[j] === 0 || fogged(j) || S.owner[j] > 0) return false; var pv = E.preview(S, j, 1); if (!pv.route || pv.route.via === 'subway') return false; var c = E.persuadeCost(S, j); if (c <= me.money) { bestP = { t: j, v: D[j].pop, c: c }; return true; } return false; });
    }
    var back = null;
    Object.keys(S.combo || {}).some(function (k) { return comboMiss(k).some(function (j) {
      if (fogged(j)) return false; var o = S.owner[j]; if (o > 0 && me.pact && me.pact[o] > S.month) return false;
      var n = E.needFor(S, j, 0.8); if (!n || n > max) return false;
      var pv = E.preview(S, j, n); if (!pv.ok) return false;
      back = { t: j, k: k, pct: pv.pct }; return true;
    }); });
    var thin0 = me.money >= 150 && (me.troops < Math.min(1500, Math.max(150, mine.length * 25)) || (S.rivalPlan && S.owner[S.rivalPlan.t] === 0 && me.troops < S.rivalPlan.n * 1.2));
    if (thin0) return idleRec();
    if (back) return { k: 'atk', t: back.t, txt: '추천 · ' + D[back.t].n + ' 되찾기 ' + Math.round(back.pct * 100) + '% · ' + shortCombo(back.k) + ' 재가동' };
    if (best) { var w1 = recReason(best.t), ra = { k: 'atk', t: best.t, why: w1, txt: '추천 · ' + D[best.t].n + ' 치기 ' + Math.round(best.pct * 100) + '% · ' + people(best.n) + ' · ' + w1 }; if (bestP && bestP.t !== best.t) ra.alt = { k: 'per', t: bestP.t, txt: D[bestP.t].n + ' 설득 ' + money(bestP.c) + ' · 남는 돈 ' + money(me.money - bestP.c) + ' · ' + recReason(bestP.t) }; return ra; }
    if (bestP) { var w2 = recReason(bestP.t); return { k: 'per', t: bestP.t, why: w2, txt: '추천 · ' + D[bestP.t].n + ' 설득 ' + money(bestP.c) + ' · ' + w2 }; }
    var ir = idleRec(!best && !bestP); if (ir) return ir;
    if (held0) return { k: 'hold', txt: '추천 · 대기 ' + people(keep) + ' 남기고 다음 달 (' + (threatN ? '침공 대비' : '연합 대비') + ')' };
    var hs = S.seenHint || {};
    if (S.rank >= 1 && !hs.zone && !(S.zones || []).length && !E.puppets(S).length && mine.length >= 4) return { k: 'hint', h: 'zone', txt: '새 기능 · 행정구역 만들기 (이어진 ' + UNITN + ' 묶기)' };
    if (S.rank >= 1 && !hs.pup && (S.zones || []).length && !E.puppets(S).length) { var z0 = S.zones.filter(function (z) { return z.d.indexOf(me.cap) < 0; })[0]; if (z0) return { k: 'zone', z: z0.id, h: 'pup', txt: '새 기능 · ' + z0.nm + ' 괴뢰국으로 독립' }; }
    if (S.month >= 1 && !S.won) return { k: 'hold', txt: '추천 · 다음 달 · 돈과 인원 모으는 중' };
    return null;
  }
  // 추천 줄: 굵은 한 줄(할 일) + 작은 한 줄(이유). '추천 ·' 머리말은 노란 바탕이 대신함
  function todoHTML(t) {
    var m = /^(추천|경고|새 기능|공작) · (.*)$/.exec(tx(t)), tag = m ? m[1] : '', parts = (m ? m[2] : tx(t)).split(' · ');
    var main = parts.shift(), sub = parts.join(' · ');
    if (/^(모집|다음 달)$/.test(main) && sub) { main = main + ' · ' + sub.split(' · ')[0]; sub = sub.split(' · ').slice(1).join(' · '); }
    return '<span><b>' + (tag && tag !== '추천' ? '<em class="tg' + (tag === '경고' ? ' bad' : tag === '공작' ? ' op' : '') + '">' + tag + '</em> ' : '') + esc(main) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><i>›</i>';
  }
  function opsAlt() {
    var seen = {}, b = null, me = S.f[0];
    E.dongsOf(S, 0).forEach(function (a) { D[a].a.forEach(function (j) { var o = S.owner[j]; if (o <= 0 || seen[o] || fogged(j) || !opsOk(j) || (me.pact && me.pact[o] > S.month)) return; seen[o] = 1;
      var r = opsBest(j); if (r && r.odds >= 0.55 && r.cost <= me.money * 0.7) { var v = r.odds * (r.k === 'split' ? 3 : r.k === 'feud' ? 2 : 1.4); if (!b || v > b.v) b = { v: v, t: j, r: r }; } }); });
    return b ? { k: 'op', t: b.t, txt: '공작 · ' + S.f[S.owner[b.t]].name + ' ' + b.r.n + ' ' + Math.round(b.r.odds * 100) + '% · ' + money(b.r.cost) + (b.r.ap > 1 ? ' · 결재 ' + b.r.ap : '') } : null;
  }
  function altRec(r) {
    if (!r || S.stat.took < 2 || S.ap <= 0 || !/^(atk|per|gu|zone)$/.test(r.k)) return null;
    return r.alt || opsAlt();
  }
  function setTodoEl(el, r) { el.innerHTML = todoHTML(r.txt); el.dataset.k = r.k; el.dataset.t = r.t === undefined ? '' : r.t; el.dataset.g = r.g === undefined ? '' : r.g; el.dataset.z = r.z === undefined ? '' : r.z; el.dataset.h = r.h || ''; }
  function syncTodo() {
    var el = $('todo'), r = recommend();
    el.hidden = !r || S.won || S.over || !!TLS || sheetMode === 'zpick' || (sel !== null && r.t === sel) || (sheetMode === 'gu' && r.k === 'gu' && guSel === r.g) || (sheetMode === 'zone' && r.k === 'zone' && zoneSel === r.z);
    if (!el.hidden) setTodoEl(el, r);
    var a = el.hidden ? null : altRec(r), e2 = $('todo2');
    e2.hidden = !a || (sel !== null && a.t === sel);
    if (!e2.hidden) setTodoEl(e2, a);
    $('dock').classList.toggle('dual', !e2.hidden);
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
    var n = $('news'), full = tx(t || ''), m = /[.!?]\s+/.exec(full), head = (m ? full.slice(0, m.index) : full).replace(/\.$/, ''), rest = m ? full.slice(m.index + m[0].length) : '';
    n.textContent = head + (rest.length > 2 ? ' ›' : '');
    n.title = full;
    n.className = bad ? 'bad' : '';
  }

  // ---- 시트 ----
  function select(i, quick) {
    if (i !== sel) { diploOpen = false; devOpen = {}; }
    if (i !== justTook) justTook = null;
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
  function todoGo(el) {
    if (el.dataset.h) { S.seenHint = S.seenHint || {}; S.seenHint[el.dataset.h] = 1; save(); }
    if (el.dataset.k === 'hold') { var nb0 = $('next'); nb0.classList.remove('nudge'); void nb0.offsetWidth; nb0.classList.add('nudge'); return; }
    if (el.dataset.k === 'hint') { sel = null; realmTab = 'zone'; sheetMode = 'realm'; renderSheet(); return; }
    if (el.dataset.k === 'rec') { sel = null; realmTab = 'dev'; sheetMode = 'realm'; renderSheet(); return; }
    if (el.dataset.k === 'gu') { openGu(+el.dataset.g); return; }
    if (el.dataset.k === 'zone') { openZone(+el.dataset.z); return; }
    if (el.dataset.k === 'op') { var t0 = +el.dataset.t; select(t0); peek = false; opsFocus = true; renderSheet(); requestAnimationFrame(function () { ensureVisible(t0); }); return; }
    var t = +el.dataset.t; select(t, true); requestAnimationFrame(function () { ensureVisible(t); });
  }
  $('todo').addEventListener('click', function () { todoGo($('todo')); });
  $('todo2').addEventListener('click', function () { todoGo($('todo2')); });

  function closeSheet() { justTook = null; sel = null; sheetMode = 'none'; errMsg = ''; confirmNew = false; renderSheet(); dirty(); }
  function renderSheet() {
    var sh = $('sheet'), key = sheetMode + ':' + sel + ':' + guSel;
    if (S) syncTodo();
    if (key !== lastSheetKey) { lastSheetKey = key; requestAnimationFrame(function () { sh.scrollTop = 0; }); }
    if (sheetMode === 'none') { sh.hidden = true; sh.classList.remove('peek'); if (isWide()) idleColumn(); return; }
    sh.hidden = false;
    if (sheetMode !== 'dong' || isWide()) peek = false;
    sh.classList.toggle('peek', peek);
    if (sheetMode === 'dong') { if (sel === null) { sh.hidden = true; return; } if (S.owner[sel] === 0) ownSheet(sh); else if (isPupO(S.owner[sel])) pupSheet(sh); else enemySheet(sh); }
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
    bind('nbView', function () { if (sel !== null) showNeighbors(sel); });
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
    return '예상 귀가 · 승 ' + p.winLoss[0] + '~' + p.winLoss[1] + '명 / 패 ' + p.loseLoss[0] + '~' + p.loseLoss[1] + '명<br><b class="keep">남는 대기 인원 ' + people(Math.max(0, quick ? left + sendN : left)) + '</b> · ' + (quick ? '급행으로 바로 복귀 (' + (3 - (S.expQ || 0)) + '번 남음)' : '출동 인원 다음 달 복귀') + (quick ? '' : defWarn(left) + emptyWarn(left));
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
    else sub += (emb(o) || '<span class="dot" style="background:' + fCol(o) + '"></span>') + esc(S.f[o].name) + (S.f[o].cap === sel ? ' 본거지' : '') + (o === S.rival ? ' · 숙적' : '') + (E.inCoal(S, o) ? ' · 연합' : '') + (moodWord(o) ? ' · <b class="mw ' + E.moodOf(S, o) + '">' + moodWord(o) + '</b>' : '') + ' · ' + E.traitOf(S, o).word;
    var max = Math.floor(me.troops);
    sendN = Math.max(max > 0 ? 1 : 0, Math.min(max, sendN));
    var p = E.preview(S, sel, sendN), pacted = o > 0 && me.pact && me.pact[o] > S.month;
    var per = o === -1 && p.route && p.route.via !== 'subway', c = per ? E.persuadeCost(S, sel) : 0;
    if (peek) {
      // 간단 보기: 판단에 필요한 한 줄 + 바로 누를 버튼. 나머지는 '자세히'
      var q = headHTML(d, sub) + '<div class="quick">';
      if (!p.route) q += '<p class="qstat">' + esc(p.reason) + ' 근처 동을 먼저 차지하세요.</p><div class="qrow' + (opsOk(sel) ? ' two' : '') + '">' + moreBtn() + (opsOk(sel) ? '<button class="btn" id="qOps" type="button">공작<small>안 맞닿아도 포섭 가능</small></button>' : '') + '</div>';
      else if (pacted) q += '<p class="qstat">불가침 ' + (me.pact[o] - S.month) + '달 남음 · 공격 불가</p><div class="qrow">' + moreBtn('협정·외교 보기') + '</div>';
      else {
        var cp = E.comboPreview(S, sel);
        var bk = brokenFor(sel);
        q += '<p class="qstat num">상대 방어 <b>' + people(p.def.total) + '</b> · ' + esc(viaText(p.route)) + (bk.length ? '<br><b class="good">되찾으면 ' + esc(E.COMBO[bk[0]].n) + ' 다시 작동</b>' : cp.length ? '<br><b class="good">' + esc(cp[0].n) + ' 완성</b> · ' + esc(cp[0].gain) : '') + '</p>';
        if (max >= 1) q += '<div class="chips qp" role="group" aria-label="승률로 인원 맞추기">' + [[0.6, '60%'], [0.8, '80%'], [0.95, '95%']].map(function (x) {
          var nn = E.needFor(S, sel, x[0]);
          return '<button class="chip num' + (nn && nn === sendN ? ' on' : '') + '" type="button" data-n="' + nn + '"' + (!nn || nn > max ? ' disabled' : '') + '>승률 ' + x[1] + '</button>';
        }).join('') + '<button class="chip qm" id="qMore" type="button" aria-label="인원 조절 · 외교 · 통계 자세히">자세히 ▾</button></div>';
        q += '<div class="qrow' + (per || opsOk(sel) ? ' two' : '') + '">';
        var weak = p.ok && p.pct < 0.5;
        q += '<button class="btn' + (weak ? '' : ' red') + '" id="atk" type="button"' + (p.ok ? '' : ' disabled') + '>쳐들어가기 <span class="pct num" id="pctV">' + Math.round(p.pct * 100) + '%</span><small><span id="atkN">' + people(sendN) + '</span> 보냄</small></button>';
        if (per) q += '<button class="btn" id="per" type="button"' + (me.money >= c && S.ap > 0 ? '' : ' disabled') + '>돈으로 설득<small>' + money(c) + (me.money >= c ? ' · 남는 돈 ' + money(me.money - c) : ' · ' + money(c - me.money) + ' 모자람') + '</small></button>';
        else if (opsOk(sel)) { var ob = opsBest(sel); q += '<button class="btn" id="qOps" type="button">공작<small>' + (ob ? esc(ob.n) + ' ' + Math.round(ob.odds * 100) + '% · ' + money(ob.cost) : '지금 할 수 있는 것 없음') + '</small></button>'; }
        q += '</div>';
        var n80 = E.needFor(S, sel, 0.8), rate = recRate(), buyM = n80 && n80 > max ? Math.ceil((n80 - max) / rate / 5) * 5 : 0;
        var why = p.reason ? esc(p.reason) : max < 1 ? '보낼 인원 없음 · 출동 인원은 다음 달 복귀' : S.ap <= 0 ? '이번 달 결재를 다 씀 · 다음 달에' : weak ? '인원이 모자라 승률이 낮음' : '';
        if (why) q += '<p class="qstat warn">' + why + '</p>';
        if ((weak || max < 1) && buyM && buyM <= me.money && S.ap > 0) q += '<div class="qrow"><button class="btn" id="qBuy" type="button" data-m="' + buyM + '">' + money(buyM) + '으로 모집 → 승률 80%<small>결재 안 씀 · +' + people(Math.round(buyM * rate)) + '</small></button></div>';
        if (!why && S.stat.took === 0) q += '<p class="tip">처음이면 승률 80% 추천</p>';
        if (max < 1) q += '<div class="qrow">' + moreBtn('인원 조절 · 외교 · 통계') + '</div>';
      }
      if (errMsg) q += '<p class="err">' + esc(errMsg) + '</p>';
      sh.innerHTML = tx(q + '</div>');
      Array.prototype.forEach.call(sh.querySelectorAll('.qp .chip[data-n]'), function (b) { b.addEventListener('click', function () { sendN = Math.min(max, +b.dataset.n); renderSheet(); }); });
      bind('qBuy', function () { var v = +$('qBuy').dataset.m, r = undoable(function () { return E.recruit(S, v); }); if (r.ok) { sfx('coin'); setNews('모집 +' + people(r.n)); var n2 = E.needFor(S, sel, 0.8); sendN = Math.max(1, Math.min(Math.floor(S.f[0].troops), n2 || 1)); } save(); sync(); });
      bind('atk', guard(doAttack));
      bind('per', guard(persuadeNow));
      bindOps(sh);
      return;
    }
    var html = headHTML(d, sub) + (o > 0 ? bossHTML(o, kindFor(o)) + (S.f[o].adv ? bossHTML(o, 'adv', '', true) : '') : '') + typeLine(d) + govBadge(sel) + comboHTML(sel);
    if (!p.route) {
      html += '<p class="why" style="margin-top:10px">' + esc(p.reason) + ' 근처 동을 먼저 차지하세요.' + (o > 0 && S.f[o].cap === sel ? ' 본거지는 지하철로 칠 수 없습니다.' : ' 역이 있는 우리 동에서 4km 안이면 지하철로 칠 수 있습니다.') + '</p>';
    } else if (pacted) {
      html += '<p class="why" style="margin-top:10px">불가침 협정이 ' + (me.pact[o] - S.month) + '달 남았습니다.</p><div class="acts"><button class="btn" id="bp" type="button">협정 깨기 (모든 우리 동 민심 −10)</button></div>';
    } else {
      html += '<div class="fight"><div><small>상대 방어</small><div class="big num">' + people(p.def.total) + '</div><div class="via">' + esc(viaText(p.route)) + '</div></div><div class="pct"><small>승률</small><div class="big num" id="pctV">' + Math.round(p.pct * 100) + '%</div></div></div>';
      html += '<div class="chips sendc">' + [[0.6, '60%'], [0.8, '80%'], [0.95, '95%']].map(function (x) {
        var nn = E.needFor(S, sel, x[0]);
        return '<button class="chip' + (nn === sendN ? ' on' : '') + '" type="button" data-n="' + nn + '"' + (nn > max ? ' disabled' : '') + '>승률 ' + x[1] + '</button>';
      }).join('') + '<button class="chip' + (max === sendN ? ' on' : '') + '" type="button" data-n="' + max + '"' + (max < 1 ? ' disabled' : '') + '>전원</button><button class="chip' + (sendOpen ? ' on' : '') + '" type="button" id="sendMore">직접</button></div>';
      html += '<div class="send"' + (sendOpen ? '' : ' hidden') + '><input id="send" type="range" min="' + (max > 0 ? 1 : 0) + '" max="' + max + '" step="1" value="' + sendN + '" aria-label="보낼 인원"><output id="sendV" class="num">' + people(sendN) + '</output></div>';
      html += '<p class="est num" id="estV">' + estHTML(p) + '</p>';
      var atk = '<button class="btn red" id="atk" type="button"' + (p.ok ? '' : ' disabled') + '>쳐들어가기<small><span id="atkN">' + people(sendN) + '</span> 보냄</small></button>';
      var perB = per ? '<button class="btn" id="per" type="button"' + (me.money >= c && S.ap > 0 ? '' : ' disabled') + '>돈으로 설득<small>' + money(c) + (me.money >= c ? ' · 남는 돈 ' + money(me.money - c) : ' · ' + money(c - me.money) + ' 모자람') + '</small></button>' : '';
      html += '<div class="acts stick' + (per ? ' two' : '') + '">' + atk + perB + '</div>';
      if (p.reason) html += '<p class="why">' + esc(p.reason) + '</p>';
      else if (max < 1) html += '<p class="why">보낼 인원 없음 · 출동 인원은 다음 달 복귀</p>';
    }
    if (!pacted) html += opsHTML(sel);
    if (per && (pacted || !p.route)) per = false;
    if (per) {
      var full = E.taxOf(S, sel, {}) / (0.5 + 0.5 * S.min[sel] / 100) * 0.875, payM = 0, acc = 0;
      for (var q = 0; q < 24 && acc < c; q++) { acc += full * Math.min(1, 0.5 + q * 0.15); payM = q + 1; }
      html += '<p class="why num">설득 · 확정 합류 · 정착 후 ' + money(full) + '/월 · ' + payM + '달 회수' + (S.ap <= 0 && me.money >= c ? ' <b class="warn">결재를 다 씀</b>' : '') + '</p>';
    }
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    if (S.stat.took === 0 && p.route && !pacted) html += '<p class="tip">공격: 인원 사용 · 승패 있음 / 설득: 돈으로 확정 / 처음이면 승률 80%</p>';
    if (S.abil === 'town' && o === -1) {
      var vi = E.voteInfo(S, sel);
      html += '<div class="acts"><button class="btn ab" id="vote" type="button"' + (vi.ok ? '' : ' disabled') + '>주민투표 발의 · 다음 달 합류 · 결재 1건</button></div>' + (vi.why ? '<p class="why">' + esc(vi.why) + '</p>' : '');
    }
    if (o > 0) {
      var items = [], names = [], okN = 0;
      if (S.abil === 'office') {
        var si = E.scoutInfo(S, sel); names.push('스카우트'); if (si.ok) okN++;
        items.push('<button class="btn ab" id="scout" type="button"' + (si.ok ? '' : ' disabled') + '>스카우트' + (si.gain ? ' · 우리 +' + people(si.gain) + ' / 상대 −' + people(si.gain) + '<small>결재 1건 · ' + money(si.cost) + '</small>' : '') + '</button><p class="why">' + (si.why ? esc(si.why) + (si.gain ? ' ' : '') : '') + (si.gain && si.ok ? '예산 ' + money(me.money) + ' → ' + money(me.money - si.cost) + '. ' : '') + (si.gain ? '<b class="warn">제안 후 3달간 협정·통합 불가</b> · 공격 예고한 세력에 쓰면 공세를 꺾음' : '') + '</p>');
      }
      if (!pacted) {
        var pc = E.pactCheck(S, o), mc = E.mergeCheck(S, o), pp = E.pactCost(S, o), mp = E.mergeCost(S, o);
        var pOk = pc.ok && me.money >= pp, mOk = mc.ok && me.money >= mp && S.ap > 0;
        names.push('불가침', '통합'); okN += (pOk ? 1 : 0) + (mOk ? 1 : 0);
        items.push('<button class="btn" id="pact" type="button"' + (pOk ? '' : ' disabled') + '>불가침 12개월<small>' + money(pp) + '</small></button>' + (pOk ? '<p class="why num">12개월 상호 불가침 · 예산 ' + money(me.money) + ' → ' + money(me.money - pp) + '</p>' : '<p class="why"><b class="lock">잠김</b> ' + esc(pc.ok ? lack(pp) : pc.why) + '</p>'));
        items.push('<button class="btn" id="merge" type="button"' + (mOk ? '' : ' disabled') + '>통합 제안<small>결재 1건 · ' + money(mp) + '</small></button>' + (mOk ? '<p class="why num">동 ' + E.dongsOf(S, o).length + '개 + 인원 절반 즉시 합류 · 몇 달 정착 · 예산 ' + money(me.money) + ' → ' + money(me.money - mp) + '</p>' : '<p class="why"><b class="lock">잠김</b> ' + esc(!mc.ok ? mc.why : me.money < mp ? lack(mp) : '이번 달 결재를 다 썼습니다.') + '</p>'));
      }
      if (items.length) html += '<details class="more diplo" id="diplo"' + (diploOpen ? ' open' : '') + '><summary>외교 · ' + names.join('·') + (okN ? ' <em>' + okN + '개 가능</em>' : '') + '</summary><div class="acts">' + items.join('') + '</div></details>';
    }
    html += guLinkHTML(d.g) + statsHTML(sel);
    sh.innerHTML = tx(html);
    var dp = $('diplo'); if (dp) dp.addEventListener('toggle', function () { diploOpen = dp.open; });
    var range = $('send');
    if (range) {
      range.addEventListener('input', function () { sendN = +range.value; updateFight(); });
      Array.prototype.forEach.call(sh.querySelectorAll('.sendc .chip[data-n]'), function (b) {
        b.addEventListener('click', function () { sendN = Math.min(max, +b.dataset.n); range.value = sendN; updateFight(); Array.prototype.forEach.call(sh.querySelectorAll('.sendc .chip[data-n]'), function (x) { x.classList.toggle('on', x === b); }); });
      });
      bind('sendMore', function () { sendOpen = !sendOpen; renderSheet(); });
    }
    bind('atk', guard(doAttack));
    bind('per', guard(persuadeNow));
    bind('pact', function () { act(E.pact(S, o)); });
    bind('merge', guard(function () { act(E.merge(S, o), true); }));
    bind('scout', guard(function () { var r = E.scout(S, sel); act(r); if (!r.err) setNews(S.log[0].t); }));
    bind('vote', guard(function () { var r = E.vote(S, sel); act(r, true); if (!r.err) setNews(S.log[0].t); }));
    bind('bp', function () { act(E.breakPact(S, o)); });
    bind('guLink', function () { openGu(d.g); });
    bindOps(sh);
  }
  // ---- 정치공작 ----
  var OPK = ['bribe', 'feud', 'split', 'smear'], opsFocus = false, sendOpen = false;
  function recRate() { return E.C.RECRUIT * (E.hasCard(S, 'hire') ? 1.25 : 1) * (E.downOn(S) ? 2 : 1); }
  function opsOk(t) { var o = S.owner[t]; return o > 0 && S.f[o].ai && !S.f[o].puppet; }
  function opsBest(t) { var b = null; OPK.forEach(function (k) { var r = E.opInfo(S, k, t); if (r.ok && (!b || r.odds > b.odds)) b = r; }); return b; }
  function opsHTML(t) {
    if (!opsOk(t)) return '';
    var rows = OPK.map(function (k) {
      var r = E.opInfo(S, k, t), tg = k === 'feud' ? (r.bn ? ' ↔ ' + r.bn : '') : k === 'smear' ? ' · ' + (r.gn || GU[D[t].g].n) : k === 'split' && r.free ? ' · ' + r.free + '곳 독립' : '';
      return '<button class="row rowBtn opb" type="button" data-op="' + k + '"' + (r.ok ? '' : ' disabled') + '><span class="opt">' + ic(OPI[k]) + '<span><b>' + r.n + esc(tg) + '</b><br><small class="mute">' + esc(r.e) + '</small><br><small class="side">' + esc(r.ok ? '들키면 ' + r.bad : r.why) + '</small></span></span><span class="num">' + (r.odds !== undefined ? '<b>' + Math.round(r.odds * 100) + '%</b><br>' : '') + '<small>' + (r.cost !== undefined ? money(r.cost) : '') + (r.ap > 1 ? ' · 결재 ' + r.ap : '') + '</small></span></button>';
    });
    return '<div id="opsSec">' + sec('공작', '돈과 결재로 세력을 흔듭니다. 성공률은 우리 동 치안 개발, 상대 성향, 같은 세력에 최근 한 공작 수로 정해지고, 우리 땅이 작을수록 잘 먹힙니다. 들키면 적힌 대가를 치릅니다. 결속형 세력에는 포섭·내분이 안 통합니다.') + '<div class="rows ops">' + rows.join('') + '</div></div>';
  }
  function bindOps(sh) {
    Array.prototype.forEach.call(sh.querySelectorAll('.opb[data-op]'), function (b) { if (!b.disabled) b.addEventListener('click', arm(b, function () { doOpNow(b.dataset.op); })); });
    bind('qOps', function () { peek = false; opsFocus = true; renderSheet(); sfx('page'); });
    if (opsFocus) { opsFocus = false; var os = $('opsSec'); if (os) requestAnimationFrame(function () { os.scrollIntoView({ block: 'start' }); }); }
  }
  function doOpNow(k) {
    var t = sel, o = S.owner[t], r = E.doOp(S, k, t);
    if (r.err) { errMsg = r.err; renderSheet(); return; }
    errMsg = ''; S.undo = []; 
    setNews(r.msg || '', !r.win);
    if (r.win && k === 'bribe') { keepTook(t); stampAt(t, true, '포섭'); }
    else if (r.win && k === 'split') { stampAt(r.t, true, '내분'); floatText(r.t, r.freed + '곳 독립', '#1F6B52'); }
    else if (r.win && k === 'feud') { stampAt(t, true, '이간'); }
    else if (r.win) { stampAt(t, true, '여론'); }
    else { stampAt(t, false, '발각'); }
    save(); sync();
  }
  function persuadeNow() {
    var t = sel, before = E.economy(S, 0), cost = E.persuadeCost(S, t), r = E.persuade(S, t);
    act(r, false);
    if (r.err) return;
    setNews(joinText(t, cost));
    keepTook(t);
    stampAt(t, true, '합류');
    if (!S.won && !S.firstWinShown) { joinCard(t, before, cost); save(); }
  }
  // 방금 얻은 동: 선택과 지도 위치를 그대로 두고, 정보창 머리에 '인접 동 보기'
  var justTook = null;
  function keepTook(t) { justTook = t; select(t, true); }
  function tookSub(d) { return justTook === sel ? ' · <b class="good">방금 확보</b> <button class="linkish" id="nbView" type="button">인접 동 보기 ›</button>' : ''; }
  function showNeighbors(t) {
    var b = [D[t].b[0], D[t].b[1], D[t].b[2], D[t].b[3]];
    flash = {};
    D[t].a.forEach(function (j) { var q = D[j].b; b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); if (S.owner[j] !== 0) flash[j] = 1; });
    fitBox(b, 28, true);
    clearTimeout(flashTimer); flashTimer = setTimeout(function () { flash = {}; dirty(); }, 1800);
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
  // 첫 탭: '한 번 더 누르면 실행'으로 바뀜(4초). 두 번째 탭에 실행
  function arm(b, fn) {
    return function (ev) {
      if (b.dataset.arm) { delete b.dataset.arm; fn(ev); return; }
      var tgt = b.classList.contains('row') ? b.lastElementChild : b, old = tgt.innerHTML;
      b.dataset.arm = 1; b.classList.add('arm'); tgt.textContent = '한 번 더 누르면 실행';
      setTimeout(function () { if (b.dataset.arm) { delete b.dataset.arm; b.classList.remove('arm'); tgt.innerHTML = old; } }, 4000);
    };
  }
  function bindArm(id, fn) { var el = $(id); if (el) el.addEventListener('click', arm(el, fn)); }
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
    setNews(res.win ? D[t].n + ' 접수 · 수입 ' + signed(after.tax - before.tax, money) + '/월' + (res.collapse ? ' · ' + res.collapse.name + ' 해체' : '') + (res.quick ? ' · 급행 복귀' : '') : D[t].n + ' 공격 실패 · ' + res.lost + '명 귀가', !res.win);
    if (res.win) keepTook(t);
    else { var n2 = E.needFor(S, t, 0.8); sendN = Math.max(1, Math.min(Math.floor(S.f[0].troops), n2)); }
    if (res.collapse && S.stat.rivalDown === res.collapse.name && !S.rivalShown) {
      S.rivalShown = res.collapse.name;
      stampAt(t, true, '숙적 해체');
      setNews('숙적 ' + res.collapse.name + ' 해산');
    } else stampAt(t, res.win);
    hitRing(t, !res.win); if (res.lost) floatText(t, '−' + people(res.lost), '#B4261A');
    if (res.collapse && res.collapse.surr) setTimeout(function () { setNews('연쇄 투항 · ' + res.collapse.surr.names.length + '개 세력 · ' + res.collapse.surr.n + '곳 합류'); }, 900);
    if (res.win && !S.won) firstWinCard(D[t].n, before, res.lost, res.back);
    if (res.collapse && o0 > 0 && $('over').hidden && res.collapse.joined + res.collapse.freed >= 3) {
      showCard('<div class="seal">해체</div><h2>' + esc(res.collapse.name) + ' 해체</h2>' + bossHTML(o0, 'fall') + '<p>' + (res.collapse.joined ? res.collapse.joined + '개 동 합류' : '남은 동은 독립') + '</p>' + (res.collapse.surr ? '<p class="good"><b>연쇄 투항</b> · ' + esc(res.collapse.surr.names.join(', ')) + ' · ' + res.collapse.surr.n + '곳 합류</p>' : '') + (res.collapse.adv ? '<p class="why"><b class="warn">' + esc(S.f[o0].boss.nm) + ' 회장 → ' + esc(S.f[res.collapse.adv].name) + ' 고문</b></p>' : '') + '<div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
      bind('cardOk', function () { hideCard(); sync(); });
    }
    save();
    sync();
  }
  function stampAt(i, win, txt) { stampWorld(D[i].x, D[i].y, win, txt || (win ? '접수' : '실패')); }
  // 짧은 연출: 지도 위 충돌 고리와 떠오르는 숫자 (움직임 줄이기 설정이면 생략)
  function fxAt(i, cls, txt, col) {
    if (REDUCED || !S || i === undefined || i === null || i < 0) return;
    var vr = viewRect(), x = D[i].x * cam.s + cam.x, y = D[i].y * cam.s + cam.y;
    if (x < vr.x || x > vr.x + vr.w || y < vr.y || y > vr.y + vr.h) return;
    var el = document.createElement('div');
    el.className = 'fx ' + cls; if (txt) el.textContent = txt; if (col) el.style.color = col;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    $('stampLayer').appendChild(el);
    setTimeout(function () { el.remove(); }, 1100);
  }
  function floatText(i, txt, col) { fxAt(i, 'ft', txt, col); }
  function hitRing(i, bad) { fxAt(i, 'ring' + (bad ? ' bad' : '')); }
  function stampWorld(wx, wy, win, text) {
    sfx(win ? 'stamp' : 'fail');
    var x = wx * cam.s + cam.x, y = wy * cam.s + cam.y;
    var el = document.createElement('div');
    el.className = 'stampMark' + (win ? '' : ' fail') + (text.length > 2 ? ' long' : '');
    el.textContent = text;
    // 보이는 지도 안에만 찍음. 지도가 거의 안 보이면(정보창이 꽉 참) 소리만
    var vr = viewRect(), bot = S && !isWide() ? $('bottom').getBoundingClientRect().top : vr.y + vr.h, hh = bot - vr.y, R = text.length > 2 ? 58 : 44;
    if (hh < 70) return;
    if (hh < R * 2 + 8) { el.classList.add('sm'); R = text.length > 2 ? 32 : 26; }
    el.style.left = Math.max(vr.x + R, Math.min(vr.x + vr.w - R, x)) + 'px';
    el.style.top = Math.max(vr.y + R, Math.min(bot - R, y)) + 'px';
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
      var q = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : '') + (zq ? ' · ' + esc(zq.nm) : '') + tookSub(d)) + '<div class="quick">';
      q += '<p class="qstat num">월수입 <b>+' + money(nowTax) + '</b> · 동원 <b>+' + people(nowDr) + '</b> · 방어 <b>' + people(nowDef) + '</b> · 민심 <b>' + Math.round(S.min[sel]) + '</b></p>';
      if (S.foeOp && S.foeOp.t === sel) q += '<p class="qstat warn"><b>' + esc(S.f[S.foeOp.f].name) + '</b> 포섭 시도 예고 · 막을 확률 ' + Math.round(E.foeOpDef(S, sel) * 100) + '% · 치안을 올리면 ↑</p>';
      if (S.rivalPlan && S.rivalPlan.t === sel) { var pi = E.planInfo(S); q += '<p class="qstat warn"><b>' + esc(pi.name) + '</b> 다음 달 침공 예고 · ' + people(S.rivalPlan.n) + ' · 대기 인원을 남기면 방어 상승</p>'; }
      else if (S.min[sel] < 40 && !capt) q += '<p class="qstat warn">민심 40 아래 · 독립 위험 · 치안 올리기</p>';
      var stf = E.settleF(S, sel);
      if (stf < 1) q += '<p class="qstat">정착 중 · 수입·동원의 ' + Math.round(stf * 100) + '% · ' + E.settleLeft(S, sel) + '달 뒤 정상</p>';
      var sideShort = function (k) { var sd = E.devSide(S, sel, k); if (!sd.text) return ''; return k === 0 ? (sd.mood ? '민심−' + sd.mood : '옆 민심−2') : sd.text.replace('이 동 ', '').replace(' ', ''); };
      q += '<p class="qlbl">개발 · 빨간 글자는 대가</p><div class="qdevs">';
      E.C.TRACKS.forEach(function (t, k) {
        var l = E.lv(S, sel, k), c = E.devCost(S, sel, k);
        q += '<button class="qdev" type="button" data-k="' + k + '"' + (c !== null && me.money >= c ? '' : ' disabled') + '>' + (ic(DEVI[k]) || '<i class="dd" style="background:' + DEV_COL[k] + '"></i>') + '' + t + '<em>' + '●'.repeat(l) + '○'.repeat(5 - l) + '</em><b class="num">' + (c === null ? '완성' : money(c)) + '</b>' + (c !== null && sideShort(k) ? '<em class="sd">' + sideShort(k) + '</em>' : '') + '</button>';
      });
      q += '</div>';
      var sides = E.C.TRACKS.map(function (t, k) { var sd = E.devSide(S, sel, k); return E.lv(S, sel, k) < 5 && sd.text ? t + ': ' + sd.text.replace('이 동 ', '') : ''; }).filter(Boolean);

      if (errMsg) q += '<p class="err">' + esc(errMsg) + '</p>';
      q += '<div class="qrow">' + moreBtn('효과 · 통계') + '</div></div>';
      sh.innerHTML = tx(q);
      bindDev(sh);
      return;
    }
    var zf = E.zoneOf(S, sel);
    var html = headHTML(d, GU[d.g].n + ' · 우리 동' + (capt ? ' · 본거지' : '') + (zf ? ' · ' + esc(zf.nm) : '') + tookSub(d)) + typeLine(d) + govBadge(sel) + comboHTML(sel);
    var one = function (v) { return (Math.round(v * 10) / 10).toLocaleString('ko-KR'); };
    html += '<div class="mini num"><div><small>월수입</small><b>+' + money(nowTax) + '</b></div><div><small>동원</small><b>+' + people(nowDr) + '</b></div><div><small>방어</small><b>' + people(nowDef) + '</b></div><div><small>민심</small><b>' + Math.round(S.min[sel]) + '</b></div></div>';
    if (gtx) html += '<p class="why num">월수입 ' + money(nowTax) + ' = 기본 ' + money(base) + (gtx > 0 ? ' + 정부 사업 ' + money(gtx) : ' − 정부 사업 부담 ' + money(-gtx)) + '</p>';
    var stf = E.settleF(S, sel);
    if (stf < 1) html += '<p class="why num"><b>정착 중</b> · 수입·동원 ' + Math.round(stf * 100) + '% · ' + E.settleLeft(S, sel) + '달 뒤 정상 · 주거·치안 단계마다 +5%p/월</p>';
    if (S.rivalPlan && S.rivalPlan.t === sel) html += planHTML();
    if (S.foeOp && S.foeOp.t === sel) html += '<p class="why warn"><b>' + esc(S.f[S.foeOp.f].name) + '</b>이 이 동 주민을 포섭하려 합니다 · 다음 달 · 막을 확률 ' + Math.round(E.foeOpDef(S, sel) * 100) + '% · 치안 1단계마다 +12%p</p>';
    if (S.min[sel] < 40 && !capt) html += '<p class="why"><b class="warn">민심 40 아래 · 독립 위험</b> · 치안 올리기 또는 민원 처리</p>';
    if (fm[d.g]) html += '<p class="why">' + GU[d.g].n + ' 전체 장악 · 수입 +' + GU[d.g].f + '%</p>';
    // 시설: 두 줄(지금 단계 / 다음 단계에 실제로 바뀌는 값). 나머지는 '자세히'
    var k3 = sel * 4;
    var sim = function (k, lvTo) { var keep = S.dev[k3 + k]; S.dev[k3 + k] = lvTo; var r = { tax: E.taxOf(S, sel, fm) + gtx, dr: E.draftOf(S, sel) * dk, def: E.defense(S, sel).total }; S.dev[k3 + k] = keep; return r; };
    E.C.TRACKS.forEach(function (t, k) {
      var l = E.lv(S, sel, k), c = E.devCost(S, sel, k), sp = E.FAC_SP[k];
      var now = l ? E.facName(S, sel, k, l) : '없음', next = l < 5 ? E.facName(S, sel, k, l + 1) : null;
      var nx = '', cur = '';
      var z = l ? sim(k, 0) : null, up = l < 5 ? sim(k, l + 1) : null;
      if (k === 0) { cur = l ? '이 시설 덕에 월수입 +' + one(nowTax - z.tax) + '억' : '아직 효과 없음'; if (up) nx = '월수입 <b>+' + one(up.tax - nowTax) + '억</b>' + (c && up.tax > nowTax ? ' · ' + Math.ceil(c / (up.tax - nowTax)) + '달 회수' : ''); }
      else if (k === 1) { cur = l ? '이 동에서 나가는 공격 전력 +' + l * 7 + '%' + (l >= 2 ? ', ' + WATER + ' 건너기 불이익 없음' : '') : '아직 효과 없음'; if (up) nx = '공격 전력 <b>+' + (l + 1) * 7 + '%</b>' + (l + 1 === 2 ? ' · ' + WATER + ' 불이익 없음' : ''); }
      else if (k === 2) { cur = l ? '이 시설 덕에 동원 +' + one(nowDr - z.dr) + '명/월' : '아직 효과 없음'; if (up) nx = '동원 <b>+' + one(up.dr - nowDr) + '명/월</b>'; }
      else { cur = l ? '이 시설 덕에 방어 +' + people(nowDef - z.def) + ', 민심 회복 +' + 2 * l + '/월' : '아직 효과 없음'; if (up) nx = '방어 <b>+' + people(up.def - nowDef) + '</b> · 민심 회복 +2/월'; }
      var sdx = E.devSide(S, sel, k);
      if (up && sdx.text) nx += ' · <span class="side">' + esc(sdx.text) + '</span>';
      if (!up) nx = '최고 단계';
      else if (sp[l + 1]) nx += '<br><b class="spNext">' + (l + 1) + '단계 특수 · ' + sp[l + 1] + '</b>';
      var spLine = Object.keys(sp).map(function (lv) { return '<span class="' + (l >= +lv ? 'spOn' : 'spOff') + '">' + lv + '단계 ' + sp[lv] + (l >= +lv ? ' (작동 중)' : '') + '</span>'; }).join('<br>');
      var pv = E.spPreview(S, sel, k);
      var more = '지금: ' + cur + '<br>' + spLine + (pv ? '<br><span class="pv">' + pv.lv + '단계 ' + esc(pv.name) + '까지 남은 투자 ' + money(pv.cost) + ' · ' + (/^지금/.test(pv.text) ? '' : '지금 기준 ') + esc(pv.text) + '</span>' : '') + (k === 3 ? '<br>방어는 동 자체 방어(치안·민심·동네 유형)에 대기 인원 일부가 더해진 값입니다.' : '');
      html += '<div class="dev"><h4 role="button" tabindex="0" aria-expanded="' + !!devOpen[k] + '" data-dk="' + k + '">' + (ic(DEVI[k]) || '<i class="dd" style="background:' + DEV_COL[k] + '"></i>') + '' + t + ' · ' + esc(now) + '<em>' + '●'.repeat(l) + '○'.repeat(5 - l) + '</em><span class="dtog" aria-hidden="true">' + (devOpen[k] ? '▴' : '▾') + '</span></h4><p>' + nx + '</p><button class="btn" data-k="' + k + '" type="button"' + (c !== null && me.money >= c ? '' : ' disabled') + '>' + (c === null ? '최고 단계' : esc(next) + '<br>' + money(c)) + '</button><div class="dmore"' + (devOpen[k] ? '' : ' hidden') + '><p>' + more + '</p></div></div>';
    });
    var adjP = E.puppets(S).filter(function (f) { return d.a.some(function (j) { return S.owner[j] === f.id; }); });
    if (adjP.length && sel !== S.f[0].cap) html += sec('괴뢰국에 넘기기', '이 ' + UNITN + '을 맞닿은 괴뢰국에 넘깁니다. 결재 없음 · 충성 +3.') + '<div class="chips wrap">' + adjP.map(function (f) { return '<button class="chip pg2" type="button" data-p="' + f.id + '"><span class="dot" style="background:' + pupCol() + '"></span>' + esc(f.name) + '에 넘기기</button>'; }).join('') + '</div>';
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    if (zf) html += '<button class="guLink" id="zoneLink" type="button"><span>' + esc(zf.nm) + ' · 한꺼번에 작전·개발</span><span class="num">' + zf.d.length + '개 ›</span></button>';
    html += guLinkHTML(d.g) + statsHTML(sel);
    sh.innerHTML = tx(html);
    bind('guLink', function () { openGu(d.g); });
    if (zf) bind('zoneLink', function () { openZone(zf.id); });
    Array.prototype.forEach.call(sh.querySelectorAll('.pg2'), function (b) { b.addEventListener('click', arm(b, function () { var i = sel, r = E.giveToPup(S, i, +b.dataset.p); errMsg = r.err || ''; if (r.ok) { sfx('page'); setNews(S.log[0].t); } save(); sync(); })); });
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
      b.addEventListener('click', function () { var k = +b.dataset.k, r = undoable(function () { return E.develop(S, sel, k); }); if (r.err) { errMsg = r.err; } else { errMsg = ''; sfx('coin'); var l = E.lv(S, sel, k); setNews(D[sel].n + ' ' + E.facName(S, sel, k, l) + (l === 1 ? ' 창설.' : ' 완공.') + (E.FAC_SP[k][l] ? ' ' + E.FAC_SP[k][l] + '.' : '')); if (E.FAC_SP[k][l]) stampAt(sel, true, l === 5 ? '완공' : '창설'); } save(); sync(); });
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
    bind('zCancel', function () { zp = null; realmTab = 'zone'; sheetMode = 'realm'; renderSheet(); dirty(); });
    bind('zMake', guard(function () {
      var r = E.zoneMake(S, zp.list, zp.name);
      if (r.err) { zp.msg = r.err; renderSheet(); return; }
      sfx('fanfare'); var z = r.zone, h = z.hall; zp = null; sheetMode = 'none';
      stampAt(h, true, '출범'); setNews(S.log[0].t); save(); sync(); openZone(z.id);
    }));
  }
  function zInfo(c) {
    var t = '비용 ' + money(c.cost || 0) + ' · 결재 2건 · 구역 ' + ((S.zones || []).length) + '/' + E.zoneMax(S) + '개. 구역 안 ' + UNITN + ' 수입 +5%, 한 번에 작전·개발.';
    if (c.cross) t += ' <b class="warn">원래 ' + GRP + '가 다른 ' + c.cross + '곳은 주민 반발로 민심 −10.</b>';
    if (!c.ok && c.why) t += '<br>' + esc(c.why);
    return t;
  }
  function zoneSheet(sh) {
    var z = E.zoneById(S, zoneSel);
    if (!z) { sheetMode = 'none'; renderSheet(); return; }
    var html = '<div class="head"><div><h2>' + esc(z.nm) + (z.d.length >= 10 ? ' <em class="spz">특별구</em>' : '') + '</h2><p>행정구역 · ' + z.d.length + '개 ' + UNITN + ' · 청사 ' + esc(D[z.hall].n) + ' · ' + dateOf(z.at) + ' 출범</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<p class="why num">' + esc(z.d.map(function (i) { return D[i].n; }).join(' · ')) + '. 구역 안 ' + UNITN + ' 수입 +5%.</p>';
    var ap = E.zoneAttackPreview(S, z.id, guReserve);
    html += '<div class="sec">맞닿은 ' + UNITN + ' 한꺼번에 공격</div><p class="why num">약한 동부터 최대 ' + Math.min(ap.limit, ap.count) + '곳 · 각 승률 80%</p><div class="chips">' + [[0, '남길 인원 없음'], [0.25, '25% 남기기'], [0.5, '50% 남기기']].map(function (x) { return '<button class="chip rs' + (guReserve === x[0] ? ' on' : '') + '" type="button" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="why num">' + (ap.can ? esc(ap.names.join(', ')) + ' · 약 ' + people(ap.need) + ' 출동, ' + people(ap.left) + ' 남음' : (ap.count ? '지금 남길 인원을 빼면 보낼 수 있는 곳이 없습니다.' : '칠 수 있는 곳이 없습니다.')) + '</p><div class="acts"><button class="btn red" id="zAtk" type="button"' + (S.ap >= ap.ap && ap.can >= 1 ? '' : ' disabled') + '>' + esc(z.nm) + ' 작전 · 결재 ' + ap.ap + '건</button></div>';
    html += '<div class="sec">구역 한꺼번에 개발 (한 단계씩)</div><div class="two">' + E.C.TRACKS.map(function (t, k) { var q = E.zoneDevelopPreview(S, z.id, k); return '<button class="btn gd zd num" type="button" data-k="' + k + '"' + (q.n ? '' : ' disabled') + '>' + t + (q.n ? ' ' + q.n + '곳<br>' + money(q.cost) : '<br>불가') + '</button>'; }).join('') + '</div>';
    var others = (S.zones || []).filter(function (x) { return x !== z && E.zoneTouch(z, x); });
    if (others.length) {
      if (!zp || zp.mergeOf !== z.id) zp = { mergeOf: z.id, name: (z.nm.replace(/(구|동|시|군)$/, '') + others[0].nm).slice(0, 8) };
      html += sec('구역 합병 · 최대 ' + E.zoneSize(S) + '개', '맞닿은 우리 구역과 합쳐 새 이름 하나로. 크기 상한은 직급 따라 8 → 12 → 16개. 결재 2건 + ' + UNITN + '마다 15억.');
      html += '<label class="zname"><span>새 이름</span><input id="zmName" type="text" maxlength="8" autocomplete="off" value="' + esc(zp.name) + '"></label>';
      html += '<div class="rows num">' + others.map(function (x) { var c = E.zoneMergeCheck(S, z.id, x.id, zp.name); return '<button class="row rowBtn zm" type="button" data-z="' + x.id + '"' + (c.ok ? '' : ' disabled') + '><span>' + esc(x.nm) + '와 합병 · 합계 ' + c.n + '개</span><span>' + (c.ok ? money(c.cost) + ' ›' : esc(c.why)) + '</span></button>'; }).join('') + '</div>';
    }
    if (S.rank >= 1) {
      var pc = E.puppetCheck(S, z.id);
      html += sec('괴뢰국으로 독립', '이 구역을 떼어 내 우리 말을 듣는 나라로 만듭니다.<br>매달 수입의 일부를 바치고, 스스로 인원을 모아 주변 세력을 칩니다. 우리 땅은 절대 안 칩니다.<br>우리 동 수가 줄어 관리비가 줄고, 인구는 절반만 장악으로 칩니다.<br>충성이 15 아래로 떨어지면 반란. 충성 40 이상이면 언제든 다시 합칠 수 있습니다.') + '<div class="acts"><button class="btn red" id="zPup" type="button"' + (pc.ok ? '' : ' disabled') + '>괴뢰국 수립 · 결재 2건 · 인원 ' + people(pc.troops || 0) + ' 넘김</button></div>' + (pc.why ? '<p class="why">' + esc(pc.why) + '</p>' : '<p class="why num">' + E.puppets(S).length + '/' + E.pupMax(S) + '개 · 처음 상납률 30%</p>');
    }
    var zpn = E.puppets(S).filter(function (f) { return z.d.some(function (i) { return D[i].a.some(function (j) { return S.owner[j] === f.id; }); }); });
    if (zpn.length) html += sec('괴뢰국에 편입', '이 구역을 맞닿은 괴뢰국에 통째로 넘깁니다. 결재 1건 · 충성 +' + Math.min(20, 2 * z.d.length) + '.') + '<div class="rows num">' + zpn.map(function (f) { var c = E.zoneGiveCheck(S, z.id, f.id); return '<button class="row rowBtn zg" type="button" data-p="' + f.id + '"' + (c.ok ? '' : ' disabled') + '><span><span class="dot" style="background:' + pupCol() + '"></span>' + esc(f.name) + '에 편입</span><span>' + (c.ok ? z.d.length + '개 ›' : esc(c.why)) + '</span></button>'; }).join('') + '</div>';
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    html += '<div class="acts"><button class="btn" id="zDel" type="button">' + (zp && zp.del === z.id ? '정말 해체 (한 번 더 누르기)' : '구역 해체') + '</button></div>';
    sh.innerHTML = tx(html);
    Array.prototype.forEach.call(sh.querySelectorAll('.rs'), function (b) { b.addEventListener('click', function () { guReserve = +b.dataset.r; renderSheet(); }); });
    bind('zAtk', guard(function () {
      var mark = S.last.length, r = E.zoneAttack(S, z.id, guReserve);
      if (r.err) { errMsg = r.err; renderSheet(); return; }
      errMsg = ''; setNews(S.last[mark] ? S.last[mark].t : '', !r.won);
      stampAt(z.hall, r.won > 0, r.won > 0 ? r.won + '개 접수' : '실패');
      save(); sync();
    }));
    Array.prototype.forEach.call(sh.querySelectorAll('.zd'), function (b) { b.addEventListener('click', function () { var r = undoable(function () { return E.zoneDevelop(S, z.id, +b.dataset.k); }); errMsg = r.err || ''; if (!r.err) { sfx('coin'); setNews(S.log[0].t); } save(); sync(); }); });
    var zmIn = $('zmName');
    if (zmIn) zmIn.addEventListener('input', function () { zp.name = zmIn.value; Array.prototype.forEach.call(sh.querySelectorAll('.zm'), function (b) { var c = E.zoneMergeCheck(S, z.id, +b.dataset.z, zp.name); b.disabled = !c.ok; b.lastElementChild.textContent = tx(c.ok ? money(c.cost) + ' ›' : c.why); }); });
    Array.prototype.forEach.call(sh.querySelectorAll('.zm'), function (b) { b.addEventListener('click', arm(b, function () {
      var r = E.zoneMerge(S, z.id, +b.dataset.z, zp.name);
      if (r.err) { errMsg = r.err; renderSheet(); return; }
      errMsg = ''; zp = null; zoneSel = r.zone.id; sfx('stamp'); stampAt(r.zone.hall, true, '합병'); setNews(S.log[0].t); save(); sync();
    })); });
    Array.prototype.forEach.call(sh.querySelectorAll('.zg'), function (b) { b.addEventListener('click', arm(b, function () {
      var hall = z.hall, r = E.zoneGive(S, z.id, +b.dataset.p);
      if (r.err) { errMsg = r.err; renderSheet(); return; }
      errMsg = ''; sfx('stamp'); stampAt(hall, true, '편입'); setNews(S.log[0].t); save(); goDong(hall);
    })); });
    bindArm('zPup', (function () {
      var r = E.makePuppet(S, z.id);
      if (r.err) { errMsg = r.err; renderSheet(); return; }
      errMsg = ''; zp = null; sfx('stamp'); stampAt(S.f[r.id].cap, true, '독립'); setNews(S.log[0].t); save(); goDong(S.f[r.id].cap);
    }));
    bind('zDel', function () { if (zp && zp.del === z.id) { E.zoneDissolve(S, z.id); zp = null; setNews(S.log[0].t); realmTab = 'zone'; sheetMode = 'realm'; save(); sync(); } else { zp = { del: z.id }; renderSheet(); } });
  }
  var STANCE = [['atk', '공격'], ['def', '방어'], ['dev', '개발']];
  function pupSheet(sh) {
    var o = S.owner[sel], f = S.f[o], P = f.puppet, n = E.dongsOf(S, o).length, trib = E.tribOf(S, f), base = P.rate ? trib / P.rate : 0;
    var html = '<div class="head"><div><h2>' + esc(D[sel].n) + '</h2><p>' + esc(f.name) + ' · 괴뢰국 · ' + n + '개 ' + UNITN + '</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="pupTop">' + faceImg(o, 44) + '<div><b>' + esc(f.boss.nm) + ' 대표</b><br><span class="num">상납 월 <b>' + money(trib) + '</b> · 인원 ' + people(f.troops + (f.away || 0)) + ' · 방침 ' + STANCE.filter(function (x) { return x[0] === P.stance; })[0][1] + (P.target > 0 && S.f[P.target].alive ? ' → ' + esc(S.f[P.target].name) : '') + '</span></div></div>';
    html += '<div class="bar' + (P.loyal <= 30 ? ' low' : '') + '"><u style="width:' + P.loyal + '%"></u><s style="left:15%"></s></div><p class="why num">충성 <b>' + Math.round(P.loyal) + '</b> · 15 아래면 반란' + (P.took ? ' · 지금까지 ' + P.took + '곳 점령' : '') + '</p>';
    var aid = [50, 100, 300].map(function (v) { return '<button class="chip num pa" type="button" data-a="' + v + '"' + (S.f[0].money >= v ? '' : ' disabled') + '>' + v + '억 · 충성 +' + v / 10 + '</button>'; }).join('');
    if (peek) {
      html += '<div class="chips">' + aid.split('</button>').slice(0, 2).join('</button>') + '</button><button class="chip qm" id="qMore" type="button">관리 ▾</button></div>';
      sh.innerHTML = tx(html); bindPup(sh, o); return;
    }
    var tk = E.takeCheck(S, sel), oth = E.puppets(S).filter(function (x) { return x.id !== o && D[sel].a.some(function (j) { return S.owner[j] === x.id; }); });
    html += sec(D[sel].n + ' 주고받기', '받아오기: 우리 땅과 맞닿은 ' + UNITN + '만 · 결재 1건 · 충성 −6 (충성 30 이상).<br>다른 괴뢰국으로: 맞닿은 괴뢰국에 옮김 · 결재 없음 · 주는 쪽 충성 −2, 받는 쪽 +2.') + '<div class="chips wrap"><button class="chip" id="pTake" type="button"' + (tk.ok ? '' : ' disabled') + '>우리가 받아오기 · 결재 1건</button>' + oth.map(function (x) { return '<button class="chip pm" type="button" data-p="' + x.id + '"><span class="dot" style="background:' + pupCol() + '"></span>' + esc(x.name) + '에 옮기기</button>'; }).join('') + '</div>' + (tk.ok ? '' : '<p class="why">' + esc(tk.why) + '</p>');
    html += sec('상납률', '상납이 무거울수록 매달 충성이 바뀝니다. 15%: +2 · 30%: 0 · 50%: −3.<br>이 나라가 우리 땅의 40%를 넘거나 인원이 우리보다 많아지면 충성이 더 떨어집니다.') + '<div class="chips">' + E.PUP_RATES.map(function (r) { return '<button class="chip num pr' + (P.rate === r ? ' on' : '') + '" type="button" data-r="' + r + '">' + Math.round(r * 100) + '% · 월 ' + money(base * r) + '</button>'; }).join('') + '</div>';
    html += sec('방침', '공격: 맞닿은 세력을 알아서 칩니다(우리는 절대 안 침).<br>방어: 공격하지 않고 인원을 모읍니다.<br>개발: 돈을 개발에 씁니다.') + '<div class="chips">' + STANCE.map(function (x) { return '<button class="chip ps' + (P.stance === x[0] ? ' on' : '') + '" type="button" data-s="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var nb = {}; E.dongsOf(S, o).forEach(function (i) { D[i].a.forEach(function (j) { var q = S.owner[j]; if (q > 0 && !isPupO(q) && S.f[q].alive) nb[q] = 1; }); });
    var nbl = Object.keys(nb).map(Number).sort(function (a, b) { return E.dongsOf(S, b).length - E.dongsOf(S, a).length; }).slice(0, 5);
    if (P.stance === 'atk') html += sec('공격 대상', '고른 세력의 동을 먼저 노리고 한 달에 한 번 더 칩니다.') + '<div class="chips wrap">' + '<button class="chip pt' + (P.target > 0 ? '' : ' on') + '" type="button" data-t="-1">알아서</button>' + nbl.map(function (q) { return '<button class="chip pt' + (P.target === q ? ' on' : '') + '" type="button" data-t="' + q + '"><span class="dot" style="background:' + fCol(q) + '"></span>' + esc(S.f[q].name) + '</button>'; }).join('') + '</div>';
    html += sec('지원금') + '<div class="chips">' + aid + '</div>';
    var ac = E.absorbCheck(S, o);
    html += sec('다시 합치기', '이 나라의 ' + UNITN + '을 모두 우리 땅으로 되돌립니다. 인원 60%와 돈 절반이 들어오고, 몇 달 정착 기간을 거칩니다.') + '<div class="acts"><button class="btn" id="pAbs" type="button"' + (ac.ok ? '' : ' disabled') + '>' + n + '개 ' + UNITN + ' 되돌리기 · 결재 2건</button></div>' + (ac.why ? '<p class="why">' + esc(ac.why) + '</p>' : '');
    if (errMsg) html += '<p class="err">' + esc(errMsg) + '</p>';
    sh.innerHTML = tx(html); bindPup(sh, o);
  }
  function bindPup(sh, o) {
    var each = function (sel2, fn) { Array.prototype.forEach.call(sh.querySelectorAll(sel2), function (b) { b.addEventListener('click', function () { fn(b); save(); sync(); }); }); };
    each('.pr', function (b) { E.pupSet(S, o, 'rate', +b.dataset.r); });
    each('.ps', function (b) { E.pupSet(S, o, 'stance', b.dataset.s); });
    each('.pt', function (b) { E.pupSet(S, o, 'target', +b.dataset.t); });
    each('.pa', function (b) { var r = E.pupAid(S, o, +b.dataset.a); errMsg = r.err || ''; if (r.ok) { sfx('coin'); setNews(S.f[o].name + '에 ' + money(r.amt) + ' 지원 · 충성 ' + Math.round(S.f[o].puppet.loyal)); } });
    bind('pTake', guard(function () { var i = sel, r = E.takeFromPup(S, i); errMsg = r.err || ''; if (r.ok) { sfx('stamp'); stampAt(i, true, '인수'); setNews(S.log[0].t); } save(); sync(); }));
    Array.prototype.forEach.call(sh.querySelectorAll('.pm'), function (b) { b.addEventListener('click', function () { var r = E.movePup(S, sel, +b.dataset.p); errMsg = r.err || ''; if (r.ok) { sfx('page'); setNews(S.log[0].t); } save(); sync(); }); });
    bindArm('pAbs', (function () { var cap = S.f[o].cap, r = E.absorbPuppet(S, o); errMsg = r.err || ''; if (r.ok) { sfx('stamp'); stampAt(cap, true, '합병'); setNews(S.log[0].t); } save(); sync(); }));
  }
  function guSheet(sh) {
    var g = guSel, st = E.guStatus(S, g), me = S.f[0], fin = GU[g].f;
    var html = '<div class="head"><div><h2>' + GU[g].n + '</h2><p>' + GU[g].r + ' · 재정자립도 ' + fin + '% (2023년 통계)</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    html += '<div class="bar"><u style="width:' + (st.have / st.total * 100) + '%"></u><s style="left:50%"></s></div><p class="why num">' + st.total + '개 동 중 ' + st.have + '개 확보</p>';
    html += '<div class="rows num"><div class="row"><span>' + R1S + ' 자격 (절반)</span><span>' + (st.half ? '달성' : st.need + '개 더') + '</span></div><div class="row"><span>통째로 장악하면 수입 +' + fin + '%</span><span>' + (st.full ? '적용 중' : st.left + '개 더') + '</span></div></div>';
    if (S.elect && !S.won) {
      var ci = E.campInfo(S, g), vg = E.voteGu(S, g), cnt = (S.camp && S.camp.g && S.camp.g[g]) || 0;
      html += '<div class="sec">선거 유세 · 이 ' + GRP + ' 예상 득표 ' + (vg * 100).toFixed(1) + '%</div><div class="acts"><button class="btn red" id="guCamp" type="button"' + (ci.ok ? '' : ' disabled') + '>유세 · 결재 1건 · ' + money(ci.cost) + (ci.gain ? ' · 전체 +' + (ci.gain * 100).toFixed(1) + '%p' : '') + '</button></div><p class="why num">유세 ' + (ci.used || 0) + '/3번' + (cnt < (ci.used || 0) ? ' · <b class="warn">맞불 유세로 −' + ((ci.used || 0) - cnt) + '번</b>' : '') + (ci.why && ci.used < 3 ? ' ' + esc(ci.why) : ci.used >= 3 ? ' · 이 ' + GRP + ' 유세 끝' : '') + '</p>';
    }
    if (S.rank < 1) {
      html += '<p class="why" style="margin-top:10px">' + Jm(R1N, '이', '가') + ' 되면 이 화면에서 동 여러 개를 한꺼번에 공격·설득·개발할 수 있습니다.</p>';
    } else {
      var lim = E.guLimit(S), ap = E.guAttackPreview(S, g, guReserve), pp = E.guPersuadePreview(S, g);
      html += '<div class="sec">한꺼번에 공격</div><p class="why num">약한 동부터 최대 ' + Math.min(lim, ap.count) + '곳 · 각 승률 80%</p><div class="chips">' + [[0, '남길 인원 없음'], [0.25, '25% 남기기'], [0.5, '50% 남기기']].map(function (x) { return '<button class="chip rs' + (guReserve === x[0] ? ' on' : '') + '" type="button" data-r="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><p class="why num">' + (ap.can ? ap.can + '곳 · ' + people(ap.need) + ' 출동 · ' + people(ap.left) + ' 남음' : (ap.count ? '인원 부족 · 가장 약한 동에도 ' + people(ap.lack) + ' 필요' : '칠 수 있는 동 없음')) + '</p><div class="acts"><button class="btn red" id="guAtk" type="button"' + (S.ap >= ap.ap && ap.can >= 1 ? '' : ' disabled') + '>' + GU[g].n + ' 작전 · 결재 ' + ap.ap + '건</button></div>';
      html += '<div class="sec">독립 동 한꺼번에 설득</div><div class="acts"><button class="btn" id="guPer" type="button"' + (S.ap >= 1 && pp.n >= 1 ? '' : ' disabled') + '>' + (pp.n ? pp.n + '곳 설득 · ' + money(pp.cost) + ' · 결재 1건' : (pp.count ? '예산이 모자랍니다' : '설득할 독립 동이 없습니다')) + '</button></div>' + (pp.n ? '<p class="why">' + esc(pp.names.join(', ')) + '</p>' : '');
      if (st.have) {
        var ui3 = E.unityInfo(S, g);
        html += '<div class="sec">주민 화합 사업</div><p class="why num">' + unityDetail(g) + '</p><div class="acts"><button class="btn" id="guUnity" type="button"' + (ui3.ok ? '' : ' disabled') + '>' + (S.stable[g] > S.month ? '진행 중 · ' + (S.stable[g] - S.month) + '달 남음' : '민심 100 · 6달 독립 없음 · ' + money(ui3.cost)) + '</button></div>';
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
      errMsg = ''; setNews(S.last[mark] ? S.last[mark].t : '', !r.won);
      stampWorld(GU[g].x, GU[g].y, r.won > 0, r.won > 0 ? r.won + '개 접수' : '실패');
      save(); sync();
    }));
    bind('guUnity', guard(function () { act(E.unity(S, g)); setNews(S.log[0].t); }));
    bind('guCamp', guard(function () { var r = E.campaign(S, g); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; sfx('stamp'); stampWorld(GU[g].x, GU[g].y, true, '유세'); setNews(S.log[0].t); save(); sync(); }));
    bind('guPer', guard(function () { var r = E.guPersuade(S, g); if (r.err) { errMsg = r.err; renderSheet(); return; } errMsg = ''; setNews(S.log[0].t); save(); sync(); }));
    Array.prototype.forEach.call(sh.querySelectorAll('.gd'), function (b) {
      b.addEventListener('click', function () { var r = undoable(function () { return E.guDevelop(S, g, +b.dataset.k); }); errMsg = r.err || ''; save(); sync(); });
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
      p.push('민심 ' + (a.mood > 0 ? '+' : '−') + Math.abs(a.mood) + ' (우리 동 ' + mine.length + '곳, 수입 ' + signed(Math.round(mt * 10) / 10, function (v) { return v + '억'; }) + '/월' + (r0 !== r1 ? ', 독립 위험 ' + r0 + '곳 → ' + r1 + '곳' : '') + (a.mood > 0 && Math.abs(mt) < 0.5 && r0 === r1 ? ', 민심이 이미 높아 당장 효과는 거의 없음' : '') + ')');
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
    html += '<p class="why">받은 동은 민심 65 이하로 시작 · 거절하면 상대 인원 +15%</p><p class="why num">' + esc(o.give.map(function (i) { return D[i].n; }).join(', ')) + '</p>';
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
    return (low ? '독립 위험 ' + low + '곳 → 0 · ' : '') + '월수입 +' + money(gain);
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
    html += '<div class="sec">경쟁 신청</div>' + (gi.rivals.length ? '<div class="rows">' + gi.rivals.map(function (r, k) { var see = S.seenGu && !S.seenGu[D[r.i].g]; return '<div class="row"><span>' + (k === 0 ? '<b>' : '') + esc(see ? '안개 속 어느 세력' : S.f[r.f].name) + (k === 0 ? '</b>' : '') + '</span><span>' + esc(see ? '?' : D[r.i].n) + '</span></div>'; }).join('') + '</div><p class="why">신청 안 하면 마감 때 맨 위 후보 선정 · 다른 세력도 조건·부담금 필요</p>' : '<p class="why">조건을 채운 다른 세력 없음 · 아무도 신청 안 하면 유찰</p>');
    html += '<p class="why">동마다 정부 사업 1개 · 동을 빼앗기면 시설·부담도 넘어감</p>';
    if (!gi.ok.length) html += '<p class="err">조건을 채운 우리 동이 없습니다. ' + esc(G.cond) + '.</p>';
    else {
      var list = gi.ok.slice().sort(function (a, b) { return gi.k === 'plant' ? D[a].P - D[b].P : D[b].E + D[b].I - D[a].E - D[a].I; }).slice(0, 6);
      html += '<div class="sec">후보지</div><div class="acts">' + list.map(function (i) {
        var note = gi.k === 'plant' ? '주민 ' + D[i].pop.toLocaleString('ko-KR') + '명 · 민심 ' + Math.round(S.min[i]) : '수입 ' + money(E.taxOf(S, i, E.fullMapOf(S, 0, E.dongsOf(S, 0)))) + '/월 · 민심 ' + Math.round(S.min[i]);
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
  var realmTab = 'now', devT = null, devB = 1;
  var DEVN = ['상권', '교통', '주거', '치안'];
  // 전체 개발 미리보기: 계획대로 한 단계씩 올렸을 때 월수입·동원 변화 (상태는 되돌림)
  function realmDevFx(plan) {
    var a = E.economy(S, 0);
    plan.list.forEach(function (x) { S.dev[x[0] * 4 + x[1]]++; });
    var b = E.economy(S, 0);
    plan.list.forEach(function (x) { S.dev[x[0] * 4 + x[1]]--; });
    var by = [0, 0, 0, 0], side = 0;
    plan.list.forEach(function (x) { by[x[1]]++; if (E.devSide(S, x[0], x[1]).text) side++; });
    return { tax: b.net - a.net, dr: b.draft - a.draft, by: by, side: side };
  }
  // 전체 개발 동별 효과 (이 동만 보면): 수입·동원 변화와 대가
  var devDet = null, devListOpen = false;
  function sideScore(sd) { return sd.t === 0 ? (sd.mood || 0) + 2 * (sd.nb ? sd.nb.length : 0) : sd.t === 1 ? 5 : sd.t === 2 ? (/8%/.test(sd.text) ? 8 : 4) : sd.text ? 5 : 0; }
  function realmDevRows(plan) {
    var key = S.month + '|' + plan.cost + '|' + plan.list.join(';') + '|' + S.dev.reduce(function (a, v) { return a + v; }, 0);
    if (devDet && devDet.k === key) return devDet.v;
    var list = E.dongsOf(S, 0), fm = E.fullMapOf(S, 0, list), dk = E.drafted(E.nEff(list));
    var rows = plan.list.map(function (x) {
      var i = x[0], k = x[1], l = E.lv(S, i, k), t0 = E.taxOf(S, i, fm), d0 = E.draftOf(S, i) * dk;
      S.dev[i * 4 + k]++; var t1 = E.taxOf(S, i, fm), d1 = E.draftOf(S, i) * dk; S.dev[i * 4 + k]--;
      var sd = E.devSide(S, i, k);
      return { i: i, k: k, l: l, tax: t1 - t0, dr: d1 - d0, side: sd.text, ss: sd.text ? sideScore(sd) : 0 };
    });
    devDet = { k: key, v: rows };
    return rows;
  }
  function devGain(r) { return [r.tax >= 0.5 ? '수입 +' + money(r.tax) : '', r.dr >= 0.5 ? '동원 +' + people(r.dr) : '', r.k === 1 ? '공격↑' : '', r.k === 3 ? '방어·민심↑' : ''].filter(Boolean).join(' · ') || '단계↑'; }
  function realmDevHTML(me) {
    if (devT === null) devT = S.devPlan ? S.devPlan.t : -1;
    var mine = E.dongsOf(S, 0).length;
    if (mine < 2) return sec('개발') + '<div class="rows"><button class="row rowBtn" type="button" data-go1="' + me.cap + '"><span>우리 ' + UNITN + ' 1곳 · ' + esc(D[me.cap].n) + '</span><span>개발하기 ›</span></button></div>';
    var h = sec('전체 개발 · 우리 동 ' + mine + '곳', '우리 동 전체에서 단계 낮은 곳부터 한 단계씩 올립니다. 결재는 쓰지 않습니다.<br>추천: 동 성격에 맞춰 상권·주거 등을 고르고, 민심 45 아래 동은 치안부터.<br>매달 자동: 다음 달부터 월수입의 일정 비율로 알아서 짓습니다.');
    h += '<div class="chips dt" role="group" aria-label="무엇을 지을지">' + [[-1, '추천']].concat(DEVN.map(function (n, k) { return [k, n]; })).map(function (x) { return '<button class="chip' + (devT === x[0] ? ' on' : '') + '" type="button" data-dt="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="chips db" role="group" aria-label="예산">' + [[0.3, '예산 30%'], [0.5, '절반'], [1, '전액']].map(function (x) { return '<button class="chip num' + (devB === x[0] ? ' on' : '') + '" type="button" data-db="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var pl = E.realmDevPlan(S, devT, Math.floor(me.money * devB));
    if (pl.n) {
      var fx = realmDevFx(pl);
      h += '<p class="why num">' + pl.n + '곳 · ' + money(pl.cost) + ' → ' + [fx.tax >= 0.5 ? '월수입 <b>+' + money(fx.tax) + '</b>' : '', fx.dr >= 0.5 ? '동원 <b>+' + people(fx.dr) + '/월</b>' : '', fx.by[1] ? '공격 전력↑ ' + fx.by[1] + '곳' : '', fx.by[3] ? '방어·민심↑ ' + fx.by[3] + '곳' : ''].filter(Boolean).join(' · ') + '</p>';
      var rows = realmDevRows(pl), up = rows.slice().sort(function (a, b) { return b.tax + b.dr * 0.5 - a.tax - a.dr * 0.5; })[0], dn = rows.filter(function (r) { return r.ss; }).sort(function (a, b) { return b.ss - a.ss; })[0];
      h += '<div class="rows num devTop">' + (up ? '<div class="row"><span>가장 큰 이득 · ' + esc(D[up.i].n) + ' ' + DEVN[up.k] + ' ' + up.l + '→' + (up.l + 1) + '</span><span class="good">' + devGain(up) + '</span></div>' : '') + (dn ? '<div class="row"><span>가장 큰 손해 · ' + esc(D[dn.i].n) + ' ' + DEVN[dn.k] + '</span><span class="side">' + esc(dn.side) + '</span></div>' : '') + '</div>';
      h += '<details class="more rule devList"' + (devListOpen ? ' open' : '') + '><summary>대상 ' + pl.n + '곳 보기</summary><div class="rows num">' + rows.map(function (r) { return '<button class="row rowBtn" type="button" data-go1="' + r.i + '"><span>' + esc(D[r.i].n) + ' · ' + DEVN[r.k] + ' ' + r.l + '→' + (r.l + 1) + (r.side ? '<br><small class="side">' + esc(r.side) + '</small>' : '') + '</span><span>' + devGain(r) + '</span></button>'; }).join('') + '</div></details>';
    } else h += '<p class="why">' + (pl.all ? '예산 부족 · 가장 싼 곳 ' + money(Math.min.apply(null, E.dongsOf(S, 0).map(function (i) { var tt = devT >= 0 ? devT : E.autoDevType(S, i); var c = tt < 0 ? null : E.devCost(S, i, tt); return c === null ? 1e9 : c; }))) : '모두 최고 단계') + '</p>';
    h += '<div class="acts"><button class="btn" id="realmDev" type="button"' + (pl.n ? '' : ' disabled') + '>' + (pl.n ? (devT < 0 ? '추천대로' : DEVN[devT]) + ' ' + pl.n + '곳 짓기 · ' + money(pl.cost) : '지을 곳 없음') + '</button></div>';
    var dp = S.devPlan;
    h += '<p class="qlbl">매달 자동 · ' + (dp ? (dp.t < 0 ? '추천' : DEVN[dp.t]) + ' · 월수입의 ' + Math.round(dp.pct * 100) + '%' : '꺼짐') + '</p><div class="chips dp" role="group" aria-label="매달 자동 개발">' + [[0, '끄기'], [0.3, '월수입 30%'], [0.5, '월수입 50%']].map(function (x) { var on = x[0] ? dp && dp.pct === x[0] && dp.t === devT : !dp; return '<button class="chip num' + (on ? ' on' : '') + '" type="button" data-dp="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
    return h;
  }
  // 제목 + 접어 둔 설명(? 버튼)
  function sec(t, help) { return '<div class="sec">' + t + (help ? '<button class="q" type="button" aria-label="설명 보기" aria-expanded="false">?</button>' : '') + '</div>' + (help ? '<p class="why hp" hidden>' + help + '</p>' : ''); }
  // 지역별 점령: 모든 구를 점령 비율 순으로, 펼치면 동 이름(누르면 이동)
  function regionHTML() {
    var rows = GU.map(function (g, gi) { return { gi: gi, d: [] }; });
    for (var i = 0; i < D.length; i++) rows[D[i].g].d.push(i);
    var full = 0, half = 0, inn = 0;
    rows.forEach(function (r) { r.own = r.d.filter(function (i) { return S.owner[i] === 0; }).length; r.pup = r.d.filter(function (i) { return isPupO(S.owner[i]); }).length; if (r.own === r.d.length) full++; else if (r.own * 2 >= r.d.length) half++; if (r.own || r.pup) inn++; });
    rows.sort(function (a, b) { return (b.own + b.pup * 0.5) / b.d.length - (a.own + a.pup * 0.5) / a.d.length || a.gi - b.gi; });
    var h = sec('지역별 점령 · ' + GRP + ' ' + GU.length + '곳', '펼치면 ' + UNITN + ' 이름이 나옵니다. 진한 칸은 우리 ' + UNITN + ', 옅은 칸은 괴뢰국, 빈 칸은 아직 아닌 곳. 누르면 지도에서 그 ' + UNITN + '으로 갑니다.<br>지도 버튼을 눌러 "지도: 점령"으로 바꾸면 지도에서도 볼 수 있습니다.');
    h += '<p class="why num">전체 장악 <b>' + full + '</b> · 절반 이상 <b>' + half + '</b> · 진출 <b>' + inn + '</b> / ' + GU.length + '</p>';
    h += rows.map(function (r) {
      var g = GU[r.gi], pc = Math.round((r.own / r.d.length) * 100);
      var tag = r.own === r.d.length ? '전체 장악' : r.own * 2 >= r.d.length ? '절반 이상' : r.own || r.pup ? '진출' : '';
      var body = '<div class="dchips">' + r.d.slice().sort(function (a, b) { var ra = S.owner[a] === 0 ? 0 : isPupO(S.owner[a]) ? 1 : 2, rb = S.owner[b] === 0 ? 0 : isPupO(S.owner[b]) ? 1 : 2; return ra - rb || (D[a].n < D[b].n ? -1 : 1); }).map(function (i) { var o = S.owner[i]; return '<button type="button" class="dc' + (o === 0 ? ' own' : isPupO(o) ? ' pup' : '') + '" data-go1="' + i + '">' + esc(D[i].n) + '</button>'; }).join('') + '</div><button class="linkish" type="button" data-gs="' + r.gi + '">' + g.n + ' 화면 ›</button>';
      return '<details class="more rule rg"><summary><span class="rgN">' + g.n + (tag ? ' <em>' + tag + '</em>' : '') + '</span><span class="rgBar"><u style="width:' + pc + '%"></u><i style="left:' + pc + '%;width:' + Math.round(r.pup / r.d.length * 100) + '%"></i></span><span class="num rgC">' + r.own + '/' + r.d.length + (r.pup ? '<small>괴뢰 ' + r.pup + '</small>' : '') + '</span></summary>' + body + '</details>';
    }).join('');
    return h;
  }
  function realmSheet(sh) {
    var me = S.f[0], e = E.economy(S, 0), held = E.guHeld(S, 0);
    var html = '<div class="head"><div><h2>' + esc(title()) + '</h2><p>' + esc(me.name) + ' · 본거지 ' + esc(D[me.cap].n) + '</p></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    var tN = '', tD = '', tP = '', tZ = '', tF = '';
    // ---- 현황 ----
    var share = E.popShare(S, 0);
    if (S.rank < 1) {
      var g = bestGu(), st = E.guStatus(S, g);
      tN += sec(hd(GU[g].n) + '까지 ' + unitN(st.need), '한 ' + GRP + '의 ' + UNITN + ' 절반 이상을 차지하면 ' + R1N + '으로 승진합니다. 지금 가장 가까운 ' + GRP + '를 보여 줍니다.') + '<p class="why num">' + GU[g].n + ' <b>' + st.have + '/' + Math.ceil(st.total / 2) + '개</b> <span class="hpi">(전체 ' + st.total + '개 중 절반)</span></p>';
      var fr0 = S.stat.took === 0 ? recommend() : null;
      if (fr0 && (fr0.k === 'atk' || fr0.k === 'per')) tN += '<div class="acts"><button class="btn red" type="button" data-go1="' + fr0.t + '">' + esc(D[fr0.t].n) + ' 살펴보기' + (fr0.why ? ' · ' + esc(fr0.why) : '') + '</button></div>';
    }
    if (S.rank >= 1 && !S.won && !S.over) tN += '<div class="acts"><button class="btn" id="autoGo" type="button">자동 진행 · 사건 날 때까지<small>추천대로 결재 · 최대 6달 · 예고·카드·선거·동 잃으면 멈춤</small></button></div>';
    tN += sec(MAYOR + '까지', CNAME + ' 인구 60%를 넘기면 ' + E.C.ELECT_WAIT + '달 뒤 ' + MAYOR + ' 선거가 열리고, 과반을 얻으면 취임합니다.' + (!S.coal && !S.won ? ' 45%를 넘기면 남은 세력이 반동장 연합을 맺습니다.' : '')) + '<div class="bar"><u style="width:' + Math.min(100, share * 100) + '%"></u><s style="left:60%"></s></div><p class="why num">' + CNAME + ' 인구 <b>' + (share * 100).toFixed(1) + '%</b> 장악 · 목표 60%' + (!S.coal && !S.won ? ' · 45%부터 연합' : '') + '</p>';
    if (S.rank >= 1 && S.rank < 2) tN += '<p class="why num">' + RANK2 + ' · 절반 넘긴 ' + GRP + ' <b>' + held + '/' + R2 + '개</b></p>';
    if (S.elect && !S.won) {
      var vs = E.voteShare(S);
      tN += sec('선거 예측 · ' + Math.max(0, S.elect.at - S.month) + '달 뒤' + (S.elect.n > 1 ? ' (재선거)' : ''), '우리 동 민심이 높을수록, 인구가 많을수록 표가 늘어납니다. 유세는 ' + GRP + ' 화면에서 결재 1건으로 합니다.') + '<div class="bar"><u style="width:' + Math.min(100, vs * 100) + '%"></u><s style="left:50%"></s></div><p class="why num">지금 치르면 득표율 <b>' + (vs * 100).toFixed(1) + '%</b> · ' + (vs > 0.5 ? '당선권' : '과반에 ' + (50 - vs * 100).toFixed(1) + '%p 모자람') + ' · 민심 평균 ' + Math.round(E.avgMood(S)) + '</p>';
      var pl = (S.camp && S.camp.pl) || [];
      tN += '<p class="why">공약: ' + (pl.length ? esc(pl.map(function (k) { return E.PLEDGES[k].n; }).join(', ')) : '아직 안 정함') + ' <button class="linkish" id="plEdit" type="button">' + (pl.length ? '바꾸기' : '정하기') + '</button></p>';
      var gl = GU.map(function (x, gi) { return { g: gi, ci: E.campInfo(S, gi), v: E.voteGu(S, gi) }; }).filter(function (x) { return x.ci.gain > 0 && x.ci.used < 3; }).sort(function (a, b) { return b.ci.gain - a.ci.gain; }).slice(0, 3);
      if (gl.length) tN += '<div class="rows num">' + gl.map(function (x) { return '<button class="row rowBtn" type="button" data-g="' + x.g + '"><span>' + GU[x.g].n + ' 유세 · 지금 ' + (x.v * 100).toFixed(0) + '%</span><span>+' + (x.ci.gain * 100).toFixed(1) + '%p ›</span></button>'; }).join('') + '</div>';
    }
    if (S.coal && !S.won) {
      var cm = S.coal.m.filter(function (id) { return S.f[id].alive; });
      tN += sec('반동장 연합 · ' + cm.length + '개 세력', '서로 싸우지 않고 우리만 노립니다. 연합 세력과는 협정·통합이 안 됩니다.') + '<div class="faces sm">' + cm.slice(0, 10).map(function (id) { return faceImg(id, 30); }).join('') + '</div><p class="why num">연합 전체 ' + people(cm.reduce(function (x, id) { return x + S.f[id].troops + (S.f[id].away || 0); }, 0)) + '</p>';
    }
    tD += realmDevHTML(me);
    tD += sec('모집', '일당을 주고 인원을 모읍니다. 1억 = 1.2명.') + '<div class="chips">' + [100, 300].map(function (v) {
      return '<button class="chip num" type="button" data-m="' + v + '"' + (me.money >= v ? '' : ' disabled') + '>' + v + '억 → ' + Math.round(v * recRate()) + '명</button>';
    }).join('') + '<button class="chip num" type="button" data-m="all"' + (me.money >= 1 ? '' : ' disabled') + '>전액 → ' + Math.round(Math.floor(me.money) * recRate()) + '명</button></div>' + (E.downOn(S) ? '<p class="why good">재기 중 · 모집 2배 · ' + (S.down.until - S.month + 1) + '달 남음</p>' : '');
    tD += sec('월 수지', '수입에서 동 관리비를 뺀 값이 위쪽 예산 아래 숫자입니다. 동원은 매달 들어오는 인원입니다.') + '<div class="rows num"><div class="row"><span><b>월수입</b><br><small class="mute">수입 ' + money(e.tax) + ' − 관리비 ' + money(e.up) + (e.trib >= 0.5 ? ' + 상납 ' + money(e.trib) : '') + '</small></span><span><b>' + signed(e.net, money) + '</b></span></div><div class="row"><span>동원' + (e.decay >= 1 ? '<br><small class="mute">자연 귀가 −' + people(e.decay) + '</small>' : '') + '</span><span>+' + people(e.draft) + '/월</span></div>' + (me.away >= 1 ? '<div class="row"><span>출동 중 · 다음 달 복귀</span><span>' + people(me.away) + '</span></div>' : '') + '</div>';
    tN += '<p class="why num">월수입 <b>' + signed(e.net, money) + '</b> · 동원 <b>+' + people(e.draft) + '/월</b> <button class="linkish" type="button" data-tab="dev">살림 ›</button></p>';
    var AB = E.ABIL[S.abil];
    tN += sec('대표 능력 · ' + AB.n, esc(AB.how));
    if (S.abil === 'station') { var ei = E.expressInfo(S); tN += '<p class="why num">지하철로 칠 수 있는 동 ' + E.raidTargets(S) + '곳 · ' + (S.express === S.month ? '바로 복귀 ' + Math.max(0, 3 - (S.expQ || 0)) + '번 남음' : '켜면 같은 인원으로 3번 연달아 공격') + '</p><div class="acts"><button class="btn ab" id="express" type="button"' + (ei.ok ? '' : ' disabled') + '>' + (S.express === S.month ? '이번 달 급행 원정 중' : '급행 원정 켜기' + (ei.cost ? ' · ' + money(ei.cost) : '')) + '</button></div>' + (ei.why ? '<p class="why">' + esc(ei.why) + '</p>' : ''); }
    if (S.abil === 'other') { var ri = E.rallyInfo(S); tN += '<div class="acts"><button class="btn ab" id="rally" type="button"' + (ri.ok ? '' : ' disabled') + '>반상회 소집 · 민심 +20' + (ri.cost ? ' · ' + money(ri.cost) : '') + '</button></div>' + (ri.why ? '<p class="why">' + esc(ri.why) + '</p>' : ''); }
    if (S.abil === 'office') tN += '<p class="why">맞닿은 세력의 동을 누르면 제안</p>';
    if (S.abil === 'town') tN += '<p class="why num">민심 평균 ' + Math.round(E.avgMood(S)) + ' · ' + (S.vote ? D[S.vote.t].n + ' 투표 진행 중' : '맞닿은 독립 동을 누르면 발의') + '</p>';
    if (ADS.enabled) tN += '<div class="acts"><button class="btn" id="adReward" type="button">광고 보고 예산 받기</button></div>';
    // ---- 정책·사업 ----
    tP += sec('시행 중인 정책 · ' + (S.cards || []).length + '장', '승진할 때와 반년마다 정책 카드를 하나씩 고릅니다. 고른 카드는 한 판 내내 적용됩니다.') + ((S.cards || []).length ? '<div class="pcards own">' + S.cards.map(function (k) { return cardHTML(k, false); }).join('') + '</div>' : '<p class="why">아직 없음' + (S.cardNext ? ' · 다음 정책 회의 ' + Math.max(0, S.cardNext - S.month) + '달 뒤' : '') + '</p>');
    if (S.rank >= 1) {
      var ug = bestGu(), ui2 = E.unityInfo(S, ug), ep = E.exprProjInfo(S);
      tP += sec('대형 사업', '화합(' + GU[ug].n + '): ' + unityDetail(ug) + '. 6개월간 독립 없음.<br>광역 급행: 역이 있는 우리 동의 기습 거리 4km → 5.5km 영구 확대. 지금 기습 가능한 동 ' + E.raidTargets(S) + '곳.') + '<div class="two"><button class="btn num" id="unity" type="button"' + (ui2.ok ? '' : ' disabled') + '>' + GU[ug].n + ' 화합 사업<br>' + (ui2.cost ? money(ui2.cost) : '불가') + '</button><button class="btn num" id="exprProj" type="button"' + (ep.ok ? '' : ' disabled') + '>광역 급행 사업<br>' + (S.exprProj ? '완료' : money(ep.cost)) + '</button></div>' + (ui2.why ? '<p class="why">' + esc(ui2.why) + '</p>' : '');
    }
    var fr = E.facReport(S), st0 = S.stat;
    tP += sec('시설 성과') + '<p class="why num">' + (fr.items.length ? fr.items.slice(0, 3).map(function (x) { return esc(x.name) + (x.t === 'gov' ? ' 월 ' + money(x.v) : x.t === 2 ? ' · 주변 ' + x.n + '곳 인원 +' + people(x.v) + '/월' : ' · 주변 ' + x.n + '곳 수입 +' + money(x.v) + '/월'); }).join('<br>') : '옆 동까지 효과를 내는 5단계 시설·정부 사업 없음') + '</p><div class="rows num"><div class="row"><span>시설이 번 돈</span><span>' + money(st0.facMoney || 0) + '</span></div>' + (st0.facDraft >= 1 ? '<div class="row"><span>시설이 모은 인원</span><span>' + people(st0.facDraft) + '</span></div>' : '') + '<div class="row"><span>치안 시설로 막은 공격</span><span>' + (st0.facSaved || 0) + '번</span></div><div class="row"><span>대비해서 물러나게 한 공격</span><span>' + (st0.deterred || 0) + '번</span></div></div>';
    var gn = E.govNext(S);
    if (gn) tP += '<p class="why num">다음 정부 공모 · 약 ' + gn.left + '달 뒤 · ' + esc(gn.G.n) + ' · ' + esc(gn.G.cond) + (gn.G.cost ? ' · 부담금 ' + money(gn.G.cost) : '') + '</p>';
    // ---- 구역·조합 ----
    if (S.rank >= 1) {
      var zs = S.zones || [], zm = E.zoneMax(S);
      tZ += sec('행정구역 · ' + zs.length + '/' + zm, '이어진 우리 ' + UNITN + ' 3~8개를 묶어 직접 이름 붙인 구역을 만들 수 있습니다. 구역은 한 번에 작전·개발하고, 수입 +5%가 붙습니다.') + (zs.length ? '<div class="rows num">' + zs.map(function (z) { return '<button class="row rowBtn zrow" type="button" data-z="' + z.id + '"><span>' + esc(z.nm) + ' · 청사 ' + esc(D[z.hall].n) + '</span><span>' + z.d.length + '개 ›</span></button>'; }).join('') + '</div>' : '<p class="why">이어진 우리 ' + UNITN + ' 3~8개 묶기 · 한 번에 작전·개발 · 수입 +5%</p>') + '<div class="acts"><button class="btn" id="zNew" type="button"' + (zs.length < zm ? '' : ' disabled') + '>' + (zs.length < zm ? '새 구역 만들기' : '지금 직급에선 ' + zm + '개까지') + '</button></div>';
    }
    tZ += sec('동네 조합', '종류마다 한 판에 한 번. 묶인 동 하나라도 빼앗기면 되찾을 때까지 멈춥니다.') + '<div class="rows">' + Object.keys(E.COMBO).map(function (k) {
      var C0 = E.COMBO[k], c = S.combo && S.combo[k], on = c && c.d.every(function (j) { return S.owner[j] === 0; });
      var ms = c && !on ? comboMiss(k) : [];
      return '<div class="row' + (ms.length ? ' bt' : '') + '"><span><b>' + C0.n + '</b><br><small>' + (ms.length ? '<b class="bad">멈춤</b> · ' + esc(ms.map(function (j) { return D[j].n; }).join('·')) + ' 되찾으면 다시 작동' : c ? esc(c.d.map(function (j) { return D[j].n; }).join('·')) : C0.t) + '</small></span>' + (ms.length ? '<button class="btn" type="button" data-cgo="' + ms[0] + '">' + esc(D[ms[0]].n) + ' 보기</button>' : '<span class="nw">' + (c ? '작동 중' : '아직') + '</span>') + '</div>';
    }).join('') + '</div>';
    var tO = regionHTML();
    // ---- 세력 ----
    var fl = E.factionList(S), nbF = {}, big = null;
    E.dongsOf(S, 0).forEach(function (i) { D[i].a.forEach(function (j) { var o = S.owner[j]; if (o > 0 && !isPupO(o)) nbF[o] = 1; }); });
    Object.keys(nbF).forEach(function (o) { var f = S.f[o]; if (f.alive && (!big || f.troops + (f.away || 0) > big.troops + (big.away || 0))) big = f; });
    if (big) tF += sec('맞닿은 세력 중 가장 큰 곳') + bossHTML(big.id, kindFor(big.id)) + (big.adv ? bossHTML(big.id, 'adv', '', true) : '') + '<p class="why num">' + (emb(big.id) || '<span class="dot" style="background:' + fCol(big.id) + '"></span>') + '<b>' + esc(big.name) + '</b>' + (big.id === S.rival ? ' · 숙적' : '') + (E.inCoal(S, big.id) ? ' · 연합' : '') + (moodWord(big.id) ? ' · ' + moodWord(big.id) : '') + ' · ' + E.dongsOf(S, big.id).length + '개 동 · ' + people(big.troops + (big.away || 0)) + (me.pact && me.pact[big.id] > S.month ? ' · 협정 ' + (me.pact[big.id] - S.month) + '달' : '') + '</p>';
    var anyHid = fl.slice(0, 7).some(function (f) { return f.id !== 0 && S.seenGu && !S.seenGu[D[f.cap].g]; });
    tF += sec('세력 순위', anyHid ? '안개 속 세력은 대략적인 규모만 보입니다.' : '') + '<div class="rows num">' + fl.slice(0, 7).map(function (f) {
      var pct = me.pact && me.pact[f.id] > S.month ? ' · 협정 ' + (me.pact[f.id] - S.month) + '달' : '';
      var hid = f.id !== 0 && S.seenGu && !S.seenGu[D[f.cap].g];
      return '<div class="row"><span>' + ((!hid && f.id && emb(f.id)) || '<span class="dot" style="background:' + (hid ? '#C3CBC1' : fCol(f.id)) + '"></span>') + esc(f.id === 0 ? '우리' : hid ? '안개 속 어느 세력' : f.name) + (f.id === S.rival ? ' · 숙적' : '') + (isPupO(f.id) ? ' · 괴뢰국' : '') + esc(pct) + '</span><span>' + (hid ? fuzzy(f.n, 1) + '개 동 · ' + fuzzy(f.troops, 100) + '명' : f.n + '개 동 · ' + people(f.troops)) + '</span></div>';
    }).join('') + '</div>';
    var pl0 = E.puppets(S);
    if (pl0.length || S.rank >= 1) tF = sec('괴뢰국 · ' + pl0.length + '/' + E.pupMax(S), '구역 화면에서 구역을 괴뢰국으로 독립시킬 수 있습니다. 한도: ' + R1N + ' 1 · ' + RANK2 + ' 3 · ' + MAYOR + ' 5.<br>괴뢰국 동을 누르면 받아오기·다른 괴뢰국으로 옮기기, 우리 동을 누르면 괴뢰국에 넘기기.') + (pl0.length ? '<div class="rows num">' + pl0.map(function (f) { return '<button class="row rowBtn" type="button" data-pg="' + f.cap + '"><span><span class="dot" style="background:' + pupCol() + '"></span>' + esc(f.name) + ' · 충성 ' + Math.round(f.puppet.loyal) + (f.puppet.loyal <= 30 ? ' <b class="bad">위험</b>' : '') + '</span><span>' + E.dongsOf(S, f.id).length + '개 · 월 +' + money(E.tribOf(S, f)) + ' ›</span></button><div class="chips pq" data-p="' + f.id + '">' + E.PUP_RATES.map(function (r) { return '<button class="chip num' + (f.puppet.rate === r ? ' on' : '') + '" type="button" data-r="' + r + '" aria-label="상납 ' + Math.round(r * 100) + '%">' + Math.round(r * 100) + '%</button>'; }).join('') + '<i></i>' + STANCE.map(function (x) { return '<button class="chip' + (f.puppet.stance === x[0] ? ' on' : '') + '" type="button" data-s="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'; }).join('') + '</div>' : '<p class="why">아직 없음</p>') + tF;
    var TABS = [['now', '현황', tN], ['dev', '살림', tD], ['pol', '정책', tP], ['zone', '구역', tZ], ['occ', '점령', tO], ['fac', '세력', tF]];
    // 처음엔 탭을 줄이고 필요해질 때 엶: 정책(첫 카드 무렵), 점령(동 6곳부터), 세력(다른 세력과 맞닿으면)
    var tabOn = { now: 1, dev: 1, zone: 1, pol: (S.cards || []).length > 0 || S.month >= 6 || S.rank >= 1, occ: E.dongsOf(S, 0).length >= 6, fac: !!S.seenFoe || S.month >= 9 };
    TABS = TABS.filter(function (x) { return tabOn[x[0]]; });
    if (!tabOn[realmTab]) realmTab = 'now';
    if (!TABS.some(function (t) { return t[0] === realmTab; })) realmTab = 'now';
    html += '<div class="tabs" role="tablist">' + TABS.map(function (t) { return '<button class="tab' + (realmTab === t[0] ? ' on' : '') + '" type="button" role="tab" aria-selected="' + (realmTab === t[0]) + '" data-tab="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    html += TABS.map(function (t) { return '<div class="tabp" role="tabpanel" data-tp="' + t[0] + '"' + (realmTab === t[0] ? '' : ' hidden') + '>' + t[2] + '</div>'; }).join('');
    sh.innerHTML = tx(html);
    Array.prototype.forEach.call(sh.querySelectorAll('.tab'), function (b) { b.addEventListener('click', function () {
      realmTab = b.dataset.tab;
      Array.prototype.forEach.call(sh.querySelectorAll('.tab'), function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      Array.prototype.forEach.call(sh.querySelectorAll('.tabp'), function (x) { x.hidden = x.dataset.tp !== realmTab; });
      sh.scrollTop = 0;
    }); });
    bindArm('autoGo', function () { autoRun(6); });
    var dl0 = sh.querySelector('.devList'); if (dl0) dl0.addEventListener('toggle', function () { devListOpen = dl0.open; });
    Array.prototype.forEach.call(sh.querySelectorAll('.linkish[data-tab]'), function (b) { b.addEventListener('click', function () { var t = sh.querySelector('.tab[data-tab="' + b.dataset.tab + '"]'); if (t) t.click(); }); });
    Array.prototype.forEach.call(sh.querySelectorAll('[data-cgo],[data-pg],[data-go1]'), function (b) { b.addEventListener('click', function () { goDong(+(b.dataset.cgo || b.dataset.pg || b.dataset.go1)); }); });
    Array.prototype.forEach.call(sh.querySelectorAll('.pq .chip'), function (b) { b.addEventListener('click', function () { var pid = +b.parentNode.dataset.p; if (b.dataset.r) E.pupSet(S, pid, 'rate', +b.dataset.r); else E.pupSet(S, pid, 'stance', b.dataset.s); save(); sync(); }); });
    Array.prototype.forEach.call(sh.querySelectorAll('[data-gs]'), function (b) { b.addEventListener('click', function () { guSel = +b.dataset.gs; sel = null; sheetMode = 'gu'; renderSheet(); dirty(); }); });
    Array.prototype.forEach.call(sh.querySelectorAll('.chip[data-dt]'), function (b) { b.addEventListener('click', function () { devT = +b.dataset.dt; renderSheet(); }); });
    Array.prototype.forEach.call(sh.querySelectorAll('.chip[data-db]'), function (b) { b.addEventListener('click', function () { devB = +b.dataset.db; renderSheet(); }); });
    Array.prototype.forEach.call(sh.querySelectorAll('.chip[data-dp]'), function (b) { b.addEventListener('click', function () {
      var v = +b.dataset.dp; S.devPlan = v ? { t: devT, pct: v } : null;
      setNews(v ? '매달 자동 개발 · ' + (devT < 0 ? '추천' : DEVN[devT]) + ' · 월수입의 ' + Math.round(v * 100) + '%' : '매달 자동 개발 끔'); save(); sync();
    }); });
    bind('realmDev', guard(function () {
      var r = undoable(function () { return E.realmDevelop(S, devT, Math.floor(S.f[0].money * devB)); });
      if (r.err) { errMsg = r.err; } else { errMsg = ''; sfx('coin'); setNews('전체 개발 · ' + r.by.map(function (n, k) { return n ? DEVN[k] + ' ' + n : ''; }).filter(Boolean).join(' · ') + '곳 · ' + money(r.cost)); }
      save(); sync();
    }));
    Array.prototype.forEach.call(sh.querySelectorAll('.chip[data-m]'), function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.m === 'all' ? me.money : +b.dataset.m, r = undoable(function () { return E.recruit(S, v); });
        if (!r.err) sfx('coin');
        if (r.ok) setNews('모집 +' + people(r.n));
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
  // 게임 방법: 한 덩어리 글 대신 주제별로 접어 둠
  function rulesFold(body) {
    var items = body.split('</li>').map(function (x) { return x.replace(/^\s*<li>/, ''); }).filter(function (x) { return x.replace(/<[^>]+>/g, '').trim(); });
    var T = [['기본', null], ['승진·선거', /선거|취임|공약|유세|통째로|절반 이상 차지/], ['조합·시설·공모', /조합|공모|시설|단계/], ['정책·구역', /정책|카드|행정구역|구역/], ['세력·외교', /세력|회장|협정|통합|숙적|연합|스카우트|고문/], ['돈·개발', /수입|개발|관리비|지원금|예산/], ['공격·인원', /공격|인원|기습|지하철|본거지|방어|안개/], ['그 밖', /./]];
    var G = T.map(function () { return []; });
    items.forEach(function (it, n) { if (n < 2) { G[0].push(it); return; } var txt = it.replace(/<[^>]+>/g, ''); for (var k = 1; k < T.length; k++) if (T[k][1].test(txt)) { G[k].push(it); return; } });
    var words = '<details class="more rule"><summary>낱말 8개</summary><div class="rows"><div class="row"><span><b>예산</b></span><span>가진 돈</span></div><div class="row"><span><b>월수입</b></span><span>수입 − 관리비</span></div><div class="row"><span><b>결재</b></span><span>한 달에 할 수 있는 일의 수</span></div><div class="row"><span><b>대기</b></span><span>지금 쓸 수 있는 인원</span></div><div class="row"><span><b>출동</b></span><span>나간 인원 · 다음 달 복귀</span></div><div class="row"><span><b>동원</b></span><span>매달 동에서 들어오는 인원</span></div><div class="row"><span><b>귀가</b></span><span>이번 판에서 빠진 인원</span></div><div class="row"><span><b>민심</b></span><span>낮으면 수입·동원 감소 · 40 아래 독립</span></div></div></details>';
    return words + T.map(function (t, k) { return G[k].length ? '<details class="more rule"' + (k === 0 ? ' open' : '') + '><summary>' + t[0] + ' <em>' + G[k].length + '</em></summary><ul class="prose"><li>' + G[k].join('</li><li>') + '</li></ul></details>' : ''; }).join('');
  }
  function menuSheet(sh) {
    var html = '<div class="head"><div><h2>메뉴</h2></div><button class="x" type="button" aria-label="닫기">×</button></div>';
    // 한눈에 보기: 규칙 전체 대신 여섯 줄
    html += '<div class="sec">한눈에 보기</div><ol class="prose brief"><li>빨간 테두리 동을 눌러 <b>공격</b>(인원) · <b>설득</b>(돈) · <b>공작</b>(돈+결재)</li><li>한 달에 <b>결재</b> 수만큼 하고 <b>다음 달</b></li><li>한 ' + GRP + ' 절반 → ' + R1N + ' · 인구 60% → 선거 → ' + MAYOR + '</li><li>개발은 수입·인원을 늘리지만 <b>대가</b>가 있음</li><li><b>이달 과제</b>·정책 카드·조합이 보너스</li><li><b>예고</b>(침공·포섭·보복)가 뜨면 그 동을 눌러 대비</li></ol>';
    html += '<div class="sec">게임 방법</div><ul class="prose"><li>빨간 테두리 동을 눌러 인원을 보내면 공격합니다. 공격과 설득은 결재를 씁니다.</li><li>보낸 인원은 다음 달에 돌아옵니다. 그동안 우리 동 방어가 약해지니 나눠서 쓰세요.</li><li>지도 왼쪽 위의 이달 과제를 해내면 예산 보상을 받습니다. 연달아 해내면 보상이 10%씩 커집니다(최대 +50%).</li><li>다른 세력의 동을 누르면 공격 옆에 공작이 있습니다. 이간질·내부 포섭·내분 조장·여론전. 성공률은 우리 치안 개발과 상대 성향으로 정해지고 들키면 대가가 있습니다. 상대가 우리 동을 포섭하려 하면 치안을 올려 막으세요.</li><li>한 달에 같은 세력을 두 번 넘게 치면 그 세력이 보복을 예고합니다.</li><li>본거지를 잃거나 동이 4곳 이하가 되면 3달 동안 재기의 기회가 옵니다. 12달 동안 동 5곳을 못 넘기면 패배입니다.</li><li>수입는 실제 직장인 수(주민 수 일부 포함), 동원은 실제 주민 수, 방어는 낮 인구(주민 + 직장인 절반)에 거의 비례합니다. 규모가 4배면 약 2.8배, 10배면 약 5.6배입니다. 작은 동은 관리비도 적게 듭니다. 동네 유형마다 특성이 있습니다.</li><li>우리 동을 누르면 개발합니다. 값은 어느 동이나 같고, 버튼 옆에 실제로 늘어나는 양이 나옵니다. 우리 동이 3개 이하일 때는 지원금이 나옵니다.</li><li>한 ' + GRP + '의 동을 절반 이상 차지하면 ' + R1N + ', 그런 ' + Jm(GRP, '이', '가') + ' ' + R2 + '개면 ' + R2S + ', ' + CNAME + ' 인구 60%면 ' + MAYOR + '입니다. 인구는 통계 기준으로 고정이라 개발해도 늘지 않습니다.</li><li>' + Jm(GRP, '을', '를') + ' 통째로 먹으면 그 ' + GRP + '의 재정자립도만큼 수입가 늘어납니다.' + (SEOUL ? '' : ' (' + (CITY_ID === 'busan' ? '부산은 보도된 수치, 중구만 추정' : '상가·직장인 밀도로 만든 게임용 추정치' + (KIND !== 'metro' && KIND !== 'nation' && /부산/.test(DATA.full) ? ', 부산 구는 보도된 수치' : '')) + ')') + '</li><li>' + R1N + '부터는 ' + GRP + ' 현황에서 한꺼번에 공격·설득·개발할 수 있습니다.</li><li>처음에는 우리 ' + Jm(GRP, '과', '와') + ' 맞닿은 ' + GRP + '만 보입니다. 땅을 넓히면 안개가 걷힙니다. 동네 통계는 안개 속에서도 볼 수 있습니다.</li><li>개발은 단계마다 이름 붙은 시설이 생깁니다. 3단계·5단계 시설은 옆 우리 동까지 효과가 미칩니다. 예: 자치경찰대(치안 3단계)는 옆 우리 동 방어 +15%, 자치소방서(치안 5단계)는 그 일대 독립을 막습니다.</li><li>동네 조합: 일터 동과 맞닿은 주거 동 둘(직주근접, 동원 +20%), 이어진 상권 동 셋(골목상권, 상권 개발비 −30%), 지하철로 이어진 역세권 셋(환승, 기습 불이익 없음)을 모으면 그 동들에만 보너스가 붙습니다. 종류마다 한 판에 한 번입니다.</li><li>시설의 옆 동 효과는 같은 종류끼리 2곳까지만 겹칩니다(수입·동원 최대 +20%, 방어 최대 +30%). 자치소방서는 독립만 막고, 민심이 낮아 줄어드는 수입·동원은 그대로입니다. 시설이 있는 동을 빼앗기면 그 효과는 그 즉시 사라집니다.</li><li>몇 달마다 정부 공모가 열립니다. 공공기관은 오래 벌고, 공공병원은 민심을 지키고, 자원회수시설은 지원금을 착공·준공 두 번에 나눠 주는 대신 민심을 깎습니다. 후반에는 바로 효과가 나는 안전센터 공모가 섞입니다. 다른 세력도 조건과 부담금을 채워야 신청할 수 있고, 아무도 없으면 유찰됩니다. 효과는 게임용으로 지어낸 것입니다.</li><li>숙적은 우리가 크게 진 직후, 우리 인원이 대부분 나가 있을 때, 공사 중이거나 많이 키운 동이 국경에 있을 때 움직입니다. 힘이 다 빠진 숙적은 본거지만 남겨 달라며 협상을 걸어옵니다. ' + R2S + '부터는 작은 세력도 협상을 제안합니다.</li><li>지도의 작은 색 점은 우리 동의 개발 단계입니다. 노랑 상권, 파랑 교통, 초록 주거, 회색 치안. ' + (SEOUL ? '산 무늬는 산을 낀 동네를 대략 표시한 것입니다.' : '') + '</li><li>시작한 동의 유형에 따라 한 판 내내 대표 능력 하나를 씁니다. 점령한 동은 특성 보너스만 줍니다.</li><li>설득·주민투표·통합·협상으로 들어온 동은 민심이 높지만 첫 달 수입이 50%이고 매달 15%p씩 늘어 약 4달 뒤 정상이 됩니다. 주거·치안을 올리면 더 빨라집니다. 공격으로 뺏은 동은 대신 민심 35에서 시작합니다.</li><li>숙적은 공격하기 한 달 전에 어느 동 앞에 모이는지, 몇 명인지 알려 줍니다. 그 동을 누르면 막는 방법(인원 남기기, 치안, 협정, 선제공격)이 나옵니다. 대비가 돼 있으면 저쪽이 공격을 접습니다.</li><li>민심이 40 아래인 동은 독립할 수 있습니다. ' + R1N + '부터 주민 화합 사업으로 막을 수 있습니다.</li><li>세력의 본거지(검은 점)를 빼앗으면 그 세력은 무너지고 동 일부가 따라옵니다. 큰 세력일수록 본거지가 단단하고, 본거지는 지하철로 칠 수 없습니다.</li><li>새로 얻은 동은 그달 말부터 수입에 들어오지만, 민심이 회복될 때까지는 적게 들어옵니다.</li><li>승진할 때와 반년마다 정책 카드 세 장 중 하나를 고릅니다. 고른 카드는 한 판 내내 적용됩니다.</li><li>' + CNAME + ' 인구 45%를 넘기면 남은 세력이 반동장 연합을 맺습니다. 연합 세력은 서로 싸우지 않고 우리만 노리며, 협정·통합을 받지 않습니다.</li><li>인구 60%를 넘기면 ' + E.C.ELECT_WAIT + '달 뒤 ' + MAYOR + ' 선거가 열립니다. 우리 동 주민은 민심에 따라 35~90%, 맞닿은 독립 동은 35%, 그 밖의 독립 동은 25%, 다른 세력 동은 10%(협정 중이면 20%)가 우리를 찍습니다. 과반이면 취임, 못 넘기면 6달 뒤 재선거입니다.</li><li>세력마다 회장이 있습니다. 얼굴과 대사는 지어낸 것입니다. 우리가 치면 원한이, 협정을 끝까지 지키면 호감이 쌓입니다. 원한이 깊은 회장은 먼저 쳐들어오고, 호감이 있는 회장은 덜 치고 협정이 싸지며 연합에도 잘 안 듭니다. 우리에게 무너진 회장은 다른 세력의 고문으로 들어가 그 세력을 더 독하게 만듭니다.</li><li>개발에는 대가가 있습니다. 상권은 주거 동네 민심을, 교통은 그 동 방어를, 주거는 그 동 수입를, 번화가의 치안은 그 동 수입를 조금씩 깎습니다.</li><li>선거가 잡히면 공약 두 개를 고르고, ' + GRP + ' 화면에서 결재 1건으로 유세합니다. 한 ' + GRP + '에서 세 번까지. 원한 많은 회장은 맞불 유세를 합니다.</li><li>' + Jm(R1N, '이', '가') + ' 되면 이어진 우리 ' + UNITN + ' 3~8개를 묶어 이름 붙인 행정구역을 만들 수 있습니다. 구역은 한 번에 작전·개발하고 수입 +5%. 원래 ' + GRP + '가 다른 ' + UNITN + '을 넣으면 그 동 민심이 떨어집니다.</li><li>판이 끝나면 땅을 넓혀 온 기록을 처음부터 다시 볼 수 있습니다.</li><li>' + Jm(MAYOR, '이', '가') + ' 된 뒤에도 남은 동까지 계속 먹을 수 있습니다.</li></ul>';
    html += '<div class="sec">소리</div><div class="acts"><button class="btn" id="sndBtn" type="button">' + (soundOn ? '효과음 켜짐 · 끄기' : '효과음 꺼짐 · 켜기') + '</button><button class="btn" id="musBtn" type="button">' + (bgmBad ? '배경음악 파일 없음' : musicOn ? '배경음악 켜짐 · 끄기' : '배경음악 꺼짐 · 켜기') + '</button></div>';
    html += '' + sec('상대 턴 보기', '다음 달을 누르면 다른 세력이 한 일을 하나씩 보여 줍니다. 우리 땅에서 난 일은 항상, 우리 근처 다툼은 몇 건만 보여 주고 나머지는 지도에 바로 반영합니다. 보는 중에 화면을 누르면 빨라지고, 한 번 더 누르면 건너뜁니다.') + '<div class="chips" id="rpMode">' + [['normal', '보통'], ['fast', '빠르게'], ['off', '끄기']].map(function (m) { return '<button class="chip' + (RPM === m[0] ? ' on' : '') + '" type="button" data-m="' + m[0] + '"' + (RPM === m[0] ? ' aria-pressed="true"' : '') + '>' + m[1] + '</button>'; }).join('') + '</div>';
    html += '<div class="sec">저장</div><p class="why">이 기기 브라우저에 자동 저장 · 기기를 바꾸거나 기록을 지우기 전에 저장 코드 복사</p><div class="two" style="margin-top:6px"><button class="btn" id="expBtn" type="button">저장 코드 복사</button><button class="btn" id="impBtn" type="button">코드 불러오기</button></div><textarea id="expText" readonly hidden></textarea>';
    html += '<div class="acts"><button class="btn" id="newGame" type="button">' + (confirmNew ? '정말 처음부터 시작 (지금 판은 사라집니다)' : '새 게임') + '</button></div>';
    if (!SEOUL) html += '<div class="sec">자료 출처</div>' + (KIND === 'metro' ? METRO_SRC : MODE_SRC);
    else html += '<div class="sec">자료 출처</div><p class="src">서울특별시 서울 열린데이터광장: <a href="https://data.seoul.go.kr/dataList/OA-22183/S/1/datasetView.do" target="_blank" rel="noopener">상권분석서비스(상주인구-행정동)</a>, <a href="https://data.seoul.go.kr/dataList/OA-22184/S/1/datasetView.do" target="_blank" rel="noopener">상권분석서비스(직장인구-행정동)</a>, 상권분석서비스(집객시설-행정동). 2023~2024년 기준이라 지금과 다를 수 있습니다. 직장인 수가 빠진 26개 동과 시설 수가 빠진 관악구 신사동은 같은 구의 값으로 추정했습니다.<br>재정자립도: <a href="https://m.go.seoul.co.kr/news/2024/07/16/20240716500023" target="_blank" rel="noopener">서울시의회 자료 보도(서울신문)</a>, 2023년 기준.<br>생활 점수의 소득 항목은 237개 동만 확보해 나머지는 같은 구의 중간값을 썼습니다.<br>행정동 경계: 통계청·행정안전부 자료를 정리한 admdongkor(MIT), 2026년 10월 기준.</p><p class="src">경제·인프라·생활 점수와 동네 유형은 통계를 바탕으로 계산한 게임용 값으로, 실제 매출이나 소득 순위가 아니며 동네의 우열을 뜻하지 않습니다. 등장 단체와 사건은 모두 지어낸 것입니다.</p>';
    var rulesHtml = '';
    html = html.replace(/<div class="sec">게임 방법<\/div><ul class="prose">([\s\S]*?)<\/ul>/, function (m, body) { rulesHtml = '<details class="more rule"><summary>자세한 규칙</summary>' + rulesFold(body).replace(' open>', '>') + '</details>'; return ''; });
    html = html.replace('<div class="sec">자료 출처</div>', rulesHtml + '<details class="more rule"><summary>자료 출처</summary>') + '</details>';
    sh.innerHTML = tx(html);
    bind('musBtn', function () { setMusic(!musicOn); renderSheet(); });
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
  // PixelLab으로 뽑은 32×32 회장 얼굴 48장(남 24 · 여 24). 이름으로 성별을 고르고 face 씨앗으로 얼굴을 고름
  var FEM = ['순자', '말순', '춘자', '미숙', '정자', '옥자', '금순', '영자', '경숙', '점례', '명자', '두리'];
  var FACE_IMG = null;
  if (FACE_SRC && typeof Image !== 'undefined') { FACE_IMG = new Image(); FACE_IMG.onload = function () { FACE = {}; try { if (S) renderSheet(); } catch (e) {} }; FACE_IMG.src = FACE_SRC; }
  function faceURL(fid, adv) {
    var b = bossOf(fid, adv); if (!b) return '';
    var key = (adv ? 'a' : '') + fid + ':' + b.face; if (FACE[key]) return FACE[key];
    if (FACE_IMG && FACE_IMG.complete && FACE_IMG.naturalWidth) {
      var fem = FEM.indexOf(b.nm.split(' ')[0].slice(1)) >= 0, ix = ((b.face >>> 0) % 24) + (fem ? 24 : 0);
      var kc = document.createElement('canvas'); kc.width = kc.height = 32; var cx = kc.getContext('2d');
      cx.fillStyle = '#F3F1E7'; cx.fillRect(0, 0, 32, 32); cx.imageSmoothingEnabled = false;
      cx.drawImage(FACE_IMG, (ix % 8) * 32, Math.floor(ix / 8) * 32, 32, 32, 0, 0, 32, 32);
      return (FACE[key] = kc.toDataURL());
    }
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
  // 테두리 2px 포함 크기: 36 → 그림 32(1배), 52 → 48(1.5배). 도트가 고르게 보이도록 이 둘만 씀
  function faceImg(fid, sz, adv) { var u = faceURL(fid, adv), b = u && bossOf(fid, adv); sz = (sz || 40) <= 32 ? 36 : 52; return u ? '<img class="face" src="' + u + '" width="' + sz + '" height="' + sz + '" style="border-color:' + fCol(b.col) + '" alt="">' : ''; }
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
    var now = btn ? cardNow(k) : '';
    return (btn ? '<button type="button" class="pcard" data-k="' + k + '">' : '<div class="pcard own">') + '<i style="--c:' + (TAGC[c.tag] || '#47524A') + '">' + c.tag + '</i><b>' + c.n + '</b><span>' + esc(e) + '</span>' + (now ? '<em class="now num">' + esc(now) + '</em>' : '') + (btn ? '</button>' : '</div>');
  }
  // 이 카드를 지금 고르면 실제로 바뀌는 양 (같은 상태에서 카드만 넣었다 빼서 계산)
  function cardNow(k) {
    if (!S || !S.cards || S.cards.indexOf(k) >= 0) return '';
    var me = S.f[0], cap = me.cap, out = [];
    try {
      var a = E.economy(S, 0), mine = E.dongsOf(S, 0), dA = cap != null ? E.defense(S, cap).total : 0;
      var per = []; mine.forEach(function (i) { D[i].a.forEach(function (j) { if (S.owner[j] === -1 && per.indexOf(j) < 0) { var pv = E.preview(S, j, 1); if (pv.route && pv.route.via !== 'subway') per.push(j); } }); });
      var cA = per.length ? Math.min.apply(null, per.map(function (j) { return E.persuadeCost(S, j); })) : 0;
      var devA = cap != null ? Math.min.apply(null, [0, 1, 2, 3].map(function (t) { var v = E.devCost(S, cap, t); return v === null ? 1e9 : v; })) : 1e9;
      var apA = E.maxAP(S);
      S.cards.push(k);
      var apB = E.maxAP(S), b = E.economy(S, 0), dB = cap != null ? E.defense(S, cap).total : 0;
      var cB = per.length ? Math.min.apply(null, per.map(function (j) { return E.persuadeCost(S, j); })) : 0;
      var devB = cap != null ? Math.min.apply(null, [0, 1, 2, 3].map(function (t) { var v = E.devCost(S, cap, t); return v === null ? 1e9 : v; })) : 1e9;
      S.cards.pop();
      if (k === 'bond') return '지금 기준 바로 +' + money(Math.round(a.tax * 4)) + ' · 관리비 월 +' + money(b.up - a.up);
      if (Math.round(b.tax - a.tax)) out.push('수입 월 ' + signed(b.tax - a.tax, money));
      if (Math.round(a.up - b.up) > 0) out.push('월 ' + money(a.up - b.up) + ' 절약');
      if (Math.round(b.draft - a.draft)) out.push('동원 월 ' + signed(b.draft - a.draft, people));
      if (k === 'hire') out.push('100억 → ' + people(Math.round(100 * 1.2 * 1.25)) + ' (지금 ' + people(120) + ')');
      if ((k === 'patrol' || k === 'fort') && Math.round(dB - dA)) out.push('본거지 방어 ' + people(dA) + ' → ' + people(dB));
      if (k === 'talk' && cA && Math.round(cA - cB)) out.push('가장 싼 설득 ' + money(cA) + ' → ' + money(cB));
      if (k === 'redev' && devA < 1e9 && Math.round(devA - devB)) out.push('본거지 개발 ' + money(devA) + ' → ' + money(devB));
      if (apB !== apA) out.push('결재 월 ' + apA + '건 → ' + apB + '건');
    } catch (err) { if (S.cards[S.cards.length - 1] === k) S.cards.pop(); return ''; }
    return out.length ? '지금 기준 ' + out.join(' · ') : '';
  }
  function showCardPick() {
    var why = S.cardWhy === 'rank' ? '승진 기념 정책 하나 고르기' : S.cardsSeen ? '정책 회의 · 하나 고르기' : '반년마다 정책을 하나 고릅니다'; S.cardsSeen = 1;
    sfx('page');
    showCard('<div class="seal">정책</div><h2>정책 카드</h2><p class="why">' + why + ' 이번 판 내내 적용' + (S.cards.length ? ' · 시행 중 ' + S.cards.length + '장' : '') + '</p><div class="pcards">' + S.cardOffer.map(function (k) { return cardHTML(k, true); }).join('') + '</div>');
    Array.prototype.forEach.call($('card').querySelectorAll('.pcard'), function (b) {
      b.addEventListener('click', function () { var r = E.chooseCard(S, b.dataset.k); if (r.err) return; sfx('stamp'); $('over').hidden = true; save(); sync(); });
    });
  }
  // ---- 연합·선거 카드 ----
  function showCoal() {
    S.coalShown = 1; sfx('warn');
    var m = S.coal.m.filter(function (id) { return S.f[id].alive; }), big = m.slice().sort(function (a, b) { return S.f[b].troops - S.f[a].troops; });
    var tot = m.reduce(function (x, id) { return x + S.f[id].troops + (S.f[id].away || 0); }, 0);
    showCard('<div class="seal lose">연합</div><h2>반동장 연합 결성</h2><p>남은 세력 ' + m.length + '곳이 손잡고 우리만 노립니다.</p><p class="why">연합 세력과는 협정·통합 불가</p><div class="faces">' + big.slice(0, 8).map(function (id) { return faceImg(id, 40); }).join('') + '</div>' + (big.length ? bossHTML(big[0], 'coal') : '') + '<div class="rows num"><div class="row"><span>연합 전체 인원</span><span>' + people(tot) + '</span></div><div class="row"><span>우리 대기 인원</span><span>' + people(S.f[0].troops) + '</span></div><div class="row"><span>지금 인구</span><span>' + (E.popShare(S, 0) * 100).toFixed(1) + '% · 60%면 ' + E.C.ELECT_WAIT + '달 뒤 선거</span></div></div>' + (S.coal.stay && S.coal.stay.length ? '<p class="why good">협정을 지켜 온 ' + esc(S.coal.stay.map(function (id) { return S.f[id].name; }).join(', ')) + '은 의리를 지켜 연합에 들지 않았습니다.</p>' : '') + '<p class="why">대응 · 맞닿은 동에 대기 인원 남기기 · 치안 올리기 · 민심이 곧 표</p><div class="acts"><button class="btn red" id="cardOk" type="button">맞서기</button></div>');
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
      showCard('<div class="seal">선거</div><h2>' + esc(electTerm()) + (S.elect.n > 1 ? ' (재선거)' : '') + ' ' + Math.max(0, S.elect.at - S.month) + '달 뒤</h2><p>' + (S.elect.n > 1 ? '지난 선거 득표율 ' + (S.elect.last * 100).toFixed(1) + '%. 이번엔 과반을 넘겨야 합니다.' : CNAME + ' 인구의 60%를 장악했습니다. 이제 표를 얻어야 ' + Jm(MAYOR, '이', '가') + ' 됩니다.') + ' 지금 예상 득표율 <b>' + (v * 100).toFixed(1) + '%</b>.</p><p class="why">공약 2개 선택 · 숫자는 전체 득표 변화 (' + UNITN + ' 유형마다 반응이 다름)' + (cp.prev ? ' · 지난 공약 유지 +1%p / 바꾸면 −2%p' : '') + '</p><div class="pcards">' + Object.keys(E.PLEDGES).map(function (k) { var P = E.PLEDGES[k]; return '<button type="button" class="pcard pl' + (sel2.indexOf(k) >= 0 ? ' on' : '') + '" data-k="' + k + '"><b>' + esc(tx(P.n)) + '</b> <em class="num">' + (gain[k] >= 0 ? '+' : '−') + Math.abs(gain[k] * 100).toFixed(1) + '%p</em><span>' + esc(tx(P.e)) + '</span></button>'; }).join('') + '</div><p class="why">유세 · ' + GRP + ' 화면에서 결재 1건 / 원한 많은 회장은 맞불 유세</p><div class="acts"><button class="btn red" id="plOk" type="button"' + (ok ? '' : ' disabled') + '>' + (ok ? '이 공약으로 출마' : '공약 ' + (2 - sel2.length) + '개 더 고르기') + '</button></div>');
      Array.prototype.forEach.call($('card').querySelectorAll('.pl'), function (b) { b.addEventListener('click', function () { var k = b.dataset.k, at = sel2.indexOf(k); if (at >= 0) sel2.splice(at, 1); else { if (sel2.length >= 2) sel2.shift(); sel2.push(k); } sfx('page'); draw(); }); });
      bind('plOk', function () { var r = E.choosePledges(S, sel2); if (r.err) return; S.electShown = S.elect.n; sfx('stamp'); setNews(S.log[0].t); hideCard(); sync(); });
    };
    draw();
  }
  function showElectLost() {
    var r = S.elect.res; S.electLostShown = r.m; sfx('fail');
    showCard('<div class="seal lose">낙선</div><h2>득표율 ' + (r.v * 100).toFixed(1) + '%</h2><p>과반에 ' + (50 - r.v * 100).toFixed(1) + '%p 모자랐습니다. 6달 뒤 재선거입니다.</p><p class="why">민심 낮은 우리 동 챙기기 · 인구 많은 동 확보 · 맞닿은 독립 동도 표에 보탬</p><div class="acts"><button class="btn" id="cardOk" type="button">다시 뛰기</button></div>');
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
      showCard('<div class="seal">' + E.C.RANKS[r] + '</div><h2>' + esc(name) + '</h2><p class="unlT">새로 열린 것</p><ul class="unl">' + (r === 1 ? '<li><b>결재 3건</b> · 매달</li><li><b>' + GRP + ' 작전</b> · ' + GRP + ' 화면에서 한꺼번에 공격·설득·개발</li><li><b>행정구역</b> · 세력 화면 → 구역 · 이어진 ' + UNITN + '을 묶어 이름 붙이기</li><li><b>괴뢰국 1개</b> · 구역 화면에서 독립 · 상납·자율 공격</li><li><b>전체 개발</b> · 세력 화면 → 현황</li></ul><p>다음 목표 · ' + GRP + ' ' + R2 + '곳</p>' : '<li><b>결재 5건</b> · 매달</li><li><b>' + GRP + ' 작전</b> · 결재 3건에 5개 동까지</li><li><b>구역 크기 12개</b> · 구역 합병</li><li><b>괴뢰국 3개</b></li></ul><p>다음 목표 · ' + CNAME + ' 인구 60% → 선거</p>') + '<div class="acts"><button class="btn red" id="cardOk" type="button">계속</button></div>');
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
  function showCard(html) { $('rpBar').hidden = true; $('card').innerHTML = tx(html); $('over').hidden = false; var b = $('card').querySelector('button'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } } $('card').scrollTop = 0; }
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
    if (S.daily) txt = '오늘의 도전(' + Math.floor(S.daily / 100 % 100) + '/' + (S.daily % 100) + ') ' + (win ? S.month + '달 만에 성공' : '실패') + ' · ' + txt;
    var img = resultImage(win, span, win ? n : st.biggest, nick, nem), pb0 = bests()[S.start];
    showCard('<h2>' + (win ? MAYOR + ' 취임' : S.overWhy === 'stall' ? '재기에 실패했습니다' : '동네에서 쫓겨났습니다') + '</h2>' + (img ? '<img id="resultImg" src="' + img + '" alt="' + esc(txt) + '"><p class="why">이미지를 길게 누르거나 우클릭해서 저장하세요.</p>' : '<div class="seal' + (win ? '' : ' lose') + '">' + (win ? (KIND === 'metro' ? CNAME + '<br>시장' : esc(MAYOR).replace(' ', '<br>')) : '해임') + '</div>') + '<div class="rows num" style="text-align:left;margin-top:6px"><div class="row"><span>' + R1S + ' / ' + R2S + '</span><span>' + (st.r1 !== undefined ? st.r1 + '개월' : '못 함') + ' / ' + (st.r2 !== undefined ? st.r2 + '개월' : '못 함') + '</span></div><div class="row"><span>공격으로 / 설득으로</span><span>' + Math.max(0, st.took - st.talked) + '개 / ' + st.talked + '개</span></div>' + (S.daily ? '<div class="row"><span>오늘의 도전</span><span>' + (win ? '<b class="good">' + S.month + '달 성공</b>' : '실패') + '</span></div>' : '') + (st.ops ? '<div class="row"><span>공작</span><span>' + st.ops + '번 · 성공 ' + (st.opsWon || 0) + '</span></div>' : '') + (st.quests ? '<div class="row"><span>이달 과제</span><span>' + st.quests + '번 · 최장 연속 ' + (st.qBest || 1) + '달</span></div>' : '') + (win ? '<div class="row"><span>' + esc(D[S.start].n) + ' 최단 기록</span><span>' + (pb0 === undefined || S.month < pb0 ? '<b class="good">새 기록 ' + S.month + '개월</b>' : pb0 + '개월 (이번 ' + S.month + ')') + '</span></div>' : '') + (win && st.vote ? '<div class="row"><span>' + esc(MAYOR) + ' 선거 득표율</span><span>' + (st.vote * 100).toFixed(1) + '%' + (S.elect && S.elect.n > 1 ? ' (' + S.elect.n + '번째 도전)' : '') + '</span></div>' : '') + '</div><textarea id="shareText" readonly>' + esc(txt) + '</textarea><div class="acts">' + (S.hist && S.hist.d.length ? '<button class="btn red" id="tlBtn" type="button">땅 넓힌 기록 다시 보기 ▶</button>' : '') + '<button class="btn" id="copy" type="button">문구 복사</button>' + (win ? '<button class="btn" id="cont" type="button">남은 동까지 마저 먹기</button>' : '') + '<button class="btn" id="retry" type="button">같은 조건으로 다시</button><button class="btn red" id="again" type="button">새 동으로 시작</button></div>');
    if (win) saveBest(S.start, S.month);
    if (S.daily) saveDaily(S.daily, S.month, win);
    bind('retry', function () { var st0 = S.start, sd = S.seed0, dk = S.daily; $('over').hidden = true; beginGame(st0, sd !== undefined ? sd : Date.now() & 0x7fffffff); if (dk) { S.daily = dk; save(); } });
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
  $('undo').addEventListener('click', function () {
    if (!UNDO.length || RPS || TLS || CAL) return;
    S = JSON.parse(UNDO.pop()); errMsg = ''; undoKeep = UNDO.length > 0;
    setNews('되돌렸습니다 · 예산 ' + money(S.f[0].money) + ' · 대기 ' + people(S.f[0].troops)); sfx('page'); save(); sync(); dirty();
  });
  $('sheet').addEventListener('click', function (e) { var q = e.target.closest ? e.target.closest('.q') : null; if (!q) return; var hp = q.parentNode.nextElementSibling; if (hp && hp.classList.contains('hp')) { hp.hidden = !hp.hidden; q.setAttribute('aria-expanded', !hp.hidden); } });
  var bannerTimer = 0;
  function turnBanner() {
    if (!S || S.over || REDUCED) return;
    $('rpBar').hidden = true;
    var el = $('turnBanner'), e = E.economy(S, 0), d = ym(S.month);
    var q = S.quest;
    el.innerHTML = '<b>' + d.m + '월 · 우리 차례</b><span class="num">결재 ' + S.ap + '건 · 예산 ' + signed(e.net, money) + '</span>' + (E.downOn(S) ? '<span class="num">재기 중 · 모집 2배 · 설득 −30%</span>' : '') + (S.lowFrom !== undefined && E.dongsOf(S, 0).length < 5 ? '<span class="num">동 5곳 못 넘으면 ' + (12 - (S.month - S.lowFrom)) + '달 뒤 패배</span>' : '') + (q && !q.done ? '<span class="num">과제 · ' + esc(tx(q.txt)) + ' +' + money(q.rw) + '</span>' : '');
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
    netBefore = E.economy(S, 0).net;
    var m0 = S.month, ev = E.endTurn(S);
    save();
    if (sel !== null) { sel = null; sheetMode = 'none'; renderSheet(); }
    var R = E.replay();
    calFlip(m0, S.month, before, !!(R && R.ev && R.ev.length) && RPM !== 'off', function () {
      startReplay(before, R, function (quick) { afterTurn(before, nBefore, capBefore, ev, quick); turnBanner(); });
    });
  }));
  // ---- 자동 진행: 추천대로 결재하고 달을 넘기다가 사건이 생기면 멈춤 (승진 뒤부터) ----
  function autoDo(r) {
    var me = S.f[0], res;
    if (r.k === 'atk') { var n = E.needFor(S, r.t, 0.8); if (!n) return false; res = E.attack(S, r.t, n); }
    else if (r.k === 'per') res = E.persuade(S, r.t);
    else if (r.k === 'gu') res = E.guAttack(S, r.g, 0.25);
    else if (r.k === 'zone') res = E.zoneAttack(S, r.z, 0.25);
    else return false;
    return !!(res && !res.err);
  }
  function autoIdle() {
    var me = S.f[0], ir = idleRec(true);
    if (!ir) return;
    if (/전체 개발/.test(ir.txt)) E.realmDevelop(S, -1, Math.floor(me.money * 0.5));
    if (S.f[0].money >= 50) E.recruit(S, Math.floor(S.f[0].money * 0.8));
  }
  function autoStop(m0) {
    if (S.over || S.won) return '판 끝';
    if (S.cardOffer && S.cardOffer.length) return '정책 카드';
    if (S.ev) return '사건';
    if (S.offer) return '생존 협상 제안';
    if (S.rivalPlan && S.owner[S.rivalPlan.t] === 0) return '침공 예고';
    if (S.foeOp && S.owner[S.foeOp.t] === 0) return '포섭 예고';
    if (S.f.some(function (f) { return f.ai && f.alive && f.retal && S.owner[f.retal.t] === 0; })) return '보복 예고';
    if (S.elect && !m0.elect) return '선거 확정';
    if (S.coal && !m0.coal) return '반동장 연합';
    if (S.rank > m0.rank) return '승진';
    if (E.dongsOf(S, 0).length < m0.n) return '동을 잃음';
    if (E.puppets(S).some(function (f) { return f.puppet.loyal <= 30; })) return '괴뢰국 충성 낮음';
    return '';
  }
  function autoRun(maxM) {
    if (!S || S.over || S.rank < 1) return;
    backup();
    var n0 = E.dongsOf(S, 0).length, m = 0, why = '', last = null;
    while (m < maxM) {
      for (var k = 0; k < 12 && S.ap > 0; k++) { var r = recommend(); if (!r || !autoDo(r)) break; }
      autoIdle();
      var mark = { elect: !!S.elect, coal: !!S.coal, rank: S.rank, n: E.dongsOf(S, 0).length };
      var before = S.owner.slice(), nB = mark.n, capB = S.f[0].cap;
      netBefore = E.economy(S, 0).net;
      var ev = E.endTurn(S); m++;
      last = { before: before, nB: nB, capB: capB, ev: ev };
      why = autoStop(mark);
      if (why || m >= maxM) break;
      questTurn();
    }
    S.stat.auto = (S.stat.auto || 0) + m;
    save();
    sel = null; sheetMode = 'none'; renderSheet();
    if (last) afterTurn(last.before, last.nB, last.capB, last.ev, true);
    var n1 = E.dongsOf(S, 0).length;
    setNews('자동 진행 ' + m + '달 · 우리 동 ' + n0 + '→' + n1 + (why ? ' · 멈춤: ' + why : ''), n1 < n0);
    turnBanner();
  }
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
    var hints = { 1: '출동 인원 복귀 · 숫자판을 누르면 모집', 2: HAS_SUB ? '빨간 점선 동은 지하철로 기습 가능' : '빨간 테두리 동은 지금 칠 수 있음', 3: '한 ' + GRP + ' 절반을 차지하면 ' + R1N };
    var plan = S.rivalPlan ? ev.filter(function (l) { return l.k === 'riv' && l.t.indexOf('모이고') >= 0; }) : [];
    var hint = nextHint(), qLine = questTurn();
    var nb = lostList.length + held.length, capHit = capBefore !== S.f[0].cap;
    var netNow = E.economy(S, 0).net, netLine = netBefore !== null && Math.round(netBefore) !== Math.round(netNow) ? ' · 월수입 ' + netTxt(netBefore) + '→' + netTxt(netNow) : '';
    lastBroke = Object.keys(S.combo || {}).filter(function (k) { var g = S.combo[k].d; return g.every(function (j) { return before[j] === 0; }) && !g.every(function (j) { return S.owner[j] === 0; }); });
    var brokeLine = lastBroke.length ? ' · ' + lastBroke.map(function (k) { return shortCombo(k); }).join('·') + ' 멈춤' : '';
    if (lostList.length) {
      var lb = battles.filter(function (b) { return !b.held && b.t === lostList[0]; })[0];
      setNews((capHit ? '본거지 ' : '') + D[lostList[0]].n + ' 함락 · ' + (lb ? S.f[lb.f].name : '주민 독립') + (lostList.length > 1 ? ' 외 ' + (lostList.length - 1) + '곳' : '') + netLine + brokeLine + (plan.length ? ' · 예고: ' + D[S.rivalPlan.t].n : ''), true);
    } else if (plan.length && S.rivalPlan.t === S.f[0].cap) { setNews('본거지 위기 · ' + plan[0].t + (held.length ? ' (이번 달 방어 성공 ' + held.length + '건)' : ''), true); setTimeout(function () { sfx('warn'); }, 350); }
    else if (held.length) { setNews(D[held[0].t].n + ' 방어 성공 · ' + S.f[held[0].f].name + (held.length > 1 ? ' 외 ' + (held.length - 1) + '곳' : '') + (plan.length ? ' · 예고: ' + D[S.rivalPlan.t].n : ''), !!plan.length); if (plan.length) setTimeout(function () { sfx('warn'); }, 350); }
    else if (plan.length) { setNews(plan[0].t.replace(/\.$/, '') + ' · 그 동을 누르면 대비법', true); setTimeout(function () { sfx('warn'); }, 350); }
    else if (bad.length) setNews(bad[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''), true);
    else if (hint) setNews(hint + (good.length ? ' / ' + good[0].t : ''));
    else if (riv.length) setNews(riv[0].t);
    else if (good.length) setNews(good[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''));
    else if (ev.length) setNews(ev[0].t + (ev.length > 1 ? ' 외 ' + (ev.length - 1) + '건' : ''));
    else setNews(hints[S.month] || (dateOf(S.month) + '. 조용한 달이었습니다.'));
    if (!bad.length && !riv.length && !good.length && !nb && hints[S.month]) setNews(hints[S.month]);
    if (qLine) { var nw0 = $('news'); nw0.textContent = (nw0.textContent ? nw0.textContent.replace(/ ›$/, '') + ' · ' : '') + '과제 완료 +' + money(S.quest0rw || 0); }
    if (!S.seenFoe && !bad.length && !plan.length && !nb) {
      var contact = E.dongsOf(S, 0).some(function (i) { return D[i].a.some(function (j) { return S.owner[j] > 0; }); });
      if (contact) { S.seenFoe = 1; setNews('다른 세력과 맞닿음 · 그 동에서 협정 제안 가능'); }
    }
    if (sel !== null && sheetMode === 'dong' && S.owner[sel] !== 0) { var n = E.needFor(S, sel, 0.8); sendN = Math.max(1, Math.min(Math.floor(S.f[0].troops), n)); }
    errMsg = '';
    save();
    holdOv = true; sync(); holdOv = false;
    // 잃은 동이 있으면(후반엔 본거지가 아니고 한 곳뿐이면 소식 줄로만) 결과 카드 하나로 묶어 보여 줌
    var lc = S.lossCards || 0;
    var big = lostList.length ? (capHit || lc < 2) : (held.length && S.rank === 0 && lc < 2);
    if (big && lostList.length) S.lossCards = lc + 1;
    if (big && !S.over && $('over').hidden) battleCard(lostList, held, battles, nBefore, capHit);
    else checkOverlay();
  }
  function netTxt(v) { return (v < 0 ? '−' : '') + money(Math.abs(v)); }
  function shortCombo(k) { return E.COMBO[k].n.replace(/ (생활권|연합)$/, ''); }
  // 조합이 끊겼으면 빠진 동 목록 (우리 땅이 아닌 동)
  function comboMiss(k) { var c = S.combo && S.combo[k]; return c ? c.d.filter(function (j) { return S.owner[j] !== 0; }) : []; }
  function brokenFor(i) { return Object.keys(S.combo || {}).filter(function (k) { return comboMiss(k).indexOf(i) >= 0; }); }
  function battleCard(lostList, held, battles, nBefore, capHit) {
    var rows = [];
    lostList.forEach(function (i) {
      var b = battles.filter(function (x) { return x.t === i && !x.held; })[0];
      rows.push({ i: i, h: '<b class="bad">' + esc(D[i].n) + ' 함락</b>', s: b ? esc(S.f[b.f].name) + ' · 우리 측 ' + people(b.mine) + ' 귀가' : '주민 독립 선언' });
    });
    lastBroke.forEach(function (k) { var ms = comboMiss(k); if (ms.length) rows.push({ i: ms[0], h: '<b class="bad">' + esc(E.COMBO[k].n) + ' 멈춤</b>', s: esc(ms.map(function (j) { return D[j].n; }).join('·')) + ' 되찾으면 다시 작동' }); });
    held.forEach(function (b) { rows.push({ i: b.t, h: '<b class="good">' + esc(D[b.t].n) + ' 방어 성공</b>', s: esc(S.f[b.f].name) + ' · 우리 측 ' + people(b.mine) + ' / 상대 ' + people(b.theirs) + ' 귀가' }); });
    var more = rows.length > 6 ? rows.length - 6 : 0; rows = rows.slice(0, 6);
    var nNow = E.dongsOf(S, 0).length;
    var win = !lostList.length;
    var head = win ? (held.length > 1 ? '공격 ' + held.length + '건을 모두 막았습니다' : D[held[0].t].n + ' 방어 성공') : capHit ? '본거지를 빼앗겼습니다' : lostList.length > 1 ? '동 ' + lostList.length + '곳을 빼앗겼습니다' : GU[D[lostList[0]].g].n + ' ' + E.J(D[lostList[0]].n, '을', '를') + ' 빼앗겼습니다';
    var mb = lostList.length ? battles.filter(function (x) { return x.t === lostList[0] && !x.held; })[0] : held[0];
    var bq = mb && mb.f > 0 ? (!win && S.f[mb.f].adv ? bossHTML(mb.f, 'revenge', D[mb.t].n, true) : bossHTML(mb.f, win ? 'lose' : 'win', D[mb.t].n)) : '';
    showCard('<div class="seal' + (win ? '' : ' lose') + '">' + (win ? '방어' : '함락') + '</div><h2>' + esc(head) + '</h2>' + bq + '<div class="rows" style="text-align:left;margin-top:8px">' + rows.map(function (r) { return '<div class="row bt"><span>' + r.h + '<br><small>' + r.s + '</small></span><button class="btn" type="button" data-go="' + r.i + '">보기</button></div>'; }).join('') + (more ? '<div class="row"><span>외 ' + more + '곳</span><span></span></div>' : '') + '<div class="row"><span>우리 동</span><span class="num">' + nBefore + '개 → ' + nNow + '개</span></div>' + (netBefore !== null ? '<div class="row"><span>월수입</span><span class="num">' + netTxt(netBefore) + ' → ' + netTxt(E.economy(S, 0).net) + '</span></div>' : '') + (capHit ? '<div class="row"><span>새 본거지</span><span>' + esc(D[S.f[0].cap].n) + '</span></div>' : '') + '</div><div class="acts"><button class="btn' + (win ? '' : ' red') + '" id="cardOk" type="button">확인</button></div>');
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
  // 과제를 누르면 그 과제를 할 수 있는 곳으로
  $('quest').addEventListener('click', function () {
    var q = S && S.quest; if (!q) return;
    setNews(q.done ? '과제 완료 · 다음 달도 해내면 보상 +10%' : tx(q.txt) + ' → 예산 +' + money(q.rw) + ' · 연속이면 보상 +10%씩');
    if (q.done) return;
    if (q.k === 'keep') goDong(q.t);
    else if (q.k === 'gu') openGu(q.g);
    else if (q.k === 'dev') { sel = null; realmTab = 'dev'; sheetMode = 'realm'; renderSheet(); dirty(); }
    else if (!$('todo').hidden) $('todo').click();
  });
  $('lens').addEventListener('click', function () { lens = (lens + 1) % LENS.length; sync(); });
  $('cells').addEventListener('click', function () { $('sheet').scrollTop = 0; sel = null; realmTab = 'now'; sheetMode = sheetMode === 'realm' ? 'none' : 'realm'; renderSheet(); dirty(); });
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
    window.__game = { get S() { return S; }, E: E, D: D, cam: function () { return cam; }, select: select, sync: function () { sync(); }, tab: function (t) { realmTab = t; if (sheetMode === 'realm') renderSheet(); }, tags: function () { var k = Object.keys(rpTags); rpTags = {}; return k; }, rec: function () { return recommend(); } };
  }
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) { try { hot.snapshot(function () { return { save: S }; }); } catch (e) {} }
  if (hot && hot.ready) hot.ready(boot); else boot(hot && hot.data ? hot.data : {});
})();
