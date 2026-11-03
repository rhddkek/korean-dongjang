// 도시별 추천 시작 동 4곳 (UI와 시뮬레이션이 같이 씀)
(function (root) {
  function presets(E, D, GU) {
    var idx = D.map(function (d, i) { return i; });
    var nbAvg = function (i) { var a = D[i].a; return a.reduce(function (x, j) { return x + D[j].base; }, 0) / Math.max(1, a.length); };
    var power = function (i) { var d = D[i], T = E.TYPES[d.type]; return (d.tax * (T.tax || 1) * 1.2 + d.draft * (T.draft || 1)) / (nbAvg(i) / 4); };
    var used = {}, out = [];
    function take(list, label, why) { var i = list.find(function (x) { return !used[x]; }); if (i === undefined) return; used[i] = 1; D[i].a.forEach(function (j) { used[j] = 1; }); out.push([GU[D[i].g].n, D[i].n, label, why]); }
    var land = idx.filter(function (i) { return D[i].a.length >= 3 && D[i].pop > 3000; });
    // 도·통합·전국: 인구가 몰린 큰 시군(전국은 큰 시도)에서 시작해야 60%까지 갈 길이 열림. '도전'은 그대로
    var gp = GU.map(function () { return 0; }); D.forEach(function (d) { gp[d.g] += d.pop; });
    var gmax = Math.max.apply(null, gp), easy = land;
    if (E.C.KIND && E.C.KIND !== 'metro') {
      var pops = D.map(function (d) { return d.pop; }).sort(function (a, b) { return a - b; }), pmed = pops[Math.floor(pops.length * 0.5)];
      var nbPop = function (i) { return D[i].a.reduce(function (x, j) { return x + D[j].pop; }, 0) / Math.max(1, D[i].a.length); };
      easy = land.filter(function (i) { return gp[D[i].g] >= gmax * 0.3 && nbPop(i) >= pmed * 1.2; });
      if (easy.length < 12) easy = land.filter(function (i) { return gp[D[i].g] >= gmax * 0.3; });
    }
    // 도·전국처럼 칸이 넓은 지도는 '작은 동' 기준도 넓힘 (서울·광역시는 8㎢ 그대로)
    var kms = D.map(function (d) { return d.km; }).sort(function (a, b) { return a - b; }), KM = Math.max(8, kms[Math.floor(kms.length * 0.6)]);
    // 처음이면 추천: 역이 있고 고르게 강한 동
    var rec = easy.filter(function (i) { return D[i].sub > 0 && D[i].type !== 'office' && D[i].km < KM; });
    if (!rec.length) rec = easy.filter(function (i) { return D[i].type !== 'office' && D[i].km < KM; });
    take(rec.sort(function (a, b) { return power(b) - power(a); }), '', '처음이면 추천');
    take(easy.filter(function (i) { return D[i].type === 'office'; }).sort(function (a, b) { return D[b].work - D[a].work; }), '', '돈으로 밀어붙이기');
    take(easy.filter(function (i) { return D[i].type === 'town'; }).sort(function (a, b) { return D[b].pop - D[a].pop; }), '', '사람으로 밀어붙이기');
    var weak = land.filter(function (i) { return !D[i].r.length && D[i].km < KM; }).sort(function (a, b) { return power(a) - power(b); });
    take(weak.slice(Math.floor(weak.length * 0.1)), '', '어렵게 시작');
    out.forEach(function (p) { var i = D.findIndex(function (d) { return d.n === p[1] && GU[d.g].n === p[0]; }); p[2] = p[3] === '어렵게 시작' ? '도전' : E.TYPES[D[i].type].n; });
    return out;
  }
  if (typeof module !== 'undefined') module.exports = presets; else root.cityPresets = presets;
})(this);
