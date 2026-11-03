// 도시별 추천 시작 동 4곳 (UI와 시뮬레이션이 같이 씀)
(function (root) {
  function presets(E, D, GU) {
    var idx = D.map(function (d, i) { return i; });
    var nbAvg = function (i) { var a = D[i].a; return a.reduce(function (x, j) { return x + D[j].base; }, 0) / Math.max(1, a.length); };
    var power = function (i) { var d = D[i], T = E.TYPES[d.type]; return (d.tax * (T.tax || 1) * 1.2 + d.draft * (T.draft || 1)) / (nbAvg(i) / 4); };
    var used = {}, out = [];
    function take(list, label, why) { var i = list.find(function (x) { return !used[x]; }); if (i === undefined) return; used[i] = 1; D[i].a.forEach(function (j) { used[j] = 1; }); out.push([GU[D[i].g].n, D[i].n, label, why]); }
    var land = idx.filter(function (i) { return D[i].a.length >= 3 && D[i].pop > 3000; });
    // 처음이면 추천: 역이 있고 고르게 강한 동
    var rec = land.filter(function (i) { return D[i].sub > 0 && D[i].type !== 'office' && D[i].km < 8; });
    if (!rec.length) rec = land.filter(function (i) { return D[i].type !== 'office' && D[i].km < 8; });
    take(rec.sort(function (a, b) { return power(b) - power(a); }), '', '처음이면 추천');
    take(land.filter(function (i) { return D[i].type === 'office'; }).sort(function (a, b) { return D[b].work - D[a].work; }), '', '돈으로 밀어붙이기');
    take(land.filter(function (i) { return D[i].type === 'town'; }).sort(function (a, b) { return D[b].pop - D[a].pop; }), '', '사람으로 밀어붙이기');
    var weak = land.filter(function (i) { return !D[i].r.length && D[i].km < 8; }).sort(function (a, b) { return power(a) - power(b); });
    take(weak.slice(Math.floor(weak.length * 0.1)), '', '어렵게 시작');
    out.forEach(function (p) { var i = D.findIndex(function (d) { return d.n === p[1] && GU[d.g].n === p[0]; }); p[2] = p[3] === '어렵게 시작' ? '도전' : E.TYPES[D[i].type].n; });
    return out;
  }
  if (typeof module !== 'undefined') module.exports = presets; else root.cityPresets = presets;
})(this);
