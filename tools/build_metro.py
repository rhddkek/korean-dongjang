# 광역시 6곳 게임 데이터 만들기
# 인구: 행정안전부 주민등록 인구통계(2026년 7월, 행정동)  - raw/metro/pop_kit.json
# 상가: 소상공인시장진흥공단 상가(상권)정보 0.02도 격자 집계(2026년 9월) - raw/metro/sanggwon_dashboard.json
#       격자를 행정동에 면적·인구밀도로 나눠 담고, 상위 300개 동은 정확한 값으로 덮어씀
# 직장인 수·집객시설 수: 서울 실제값과 상가 추정치의 관계(회귀)로 추정 (게임용 추정치)
# 역: 인천은 OpenStreetMap 좌표, 나머지는 역 이름·소재 구 기준 배정 (tools/metro_stations.py)
import json, re, sys, math
import numpy as np, pandas as pd, geopandas as gpd, shapely
from shapely.geometry import LineString, MultiPolygon, Point
from shapely.ops import unary_union, linemerge
from shapely.strtree import STRtree
import admdongkor as adk
sys.path.insert(0, 'tools')
from metro_grid import allocate
from metro_stations import ST, RAIL

NAT = adk.get('20261001', 'emd', detail=True).reset_index(drop=True)
NAT['code'] = NAT.emdcd.astype(str)
kit = json.load(open('raw/metro/pop_kit.json'))
kd = pd.DataFrame(kit['dongs'])
popd = dict(zip(kd.c, kd.t)); hh = dict(zip(kd.c, kd.h))
# 코드가 바뀐 동 (달성군 구지읍)
orphan = [c for c in kd.c if c not in set(NAT.code)]
for i, r in NAT[~NAT.code.isin(popd)].iterrows():
    m = [c for c in orphan if c[:5] == r.code[:5]]
    if len(m) == 1: popd[r.code] = popd[m[0]]; print('code fix', r.emdnm, m[0], '->', r.code)
NAT['pop'] = NAT.code.map(popd)
print('pop missing', NAT[NAT['pop'].isna()][['sidonm', 'emdnm']].values.tolist())
NAT['pop'] = NAT['pop'].fillna(0)
NAT['km2'] = NAT.geometry.area / 1e6

G = json.load(open('raw/metro/sanggwon_dashboard.json'))
nm = lambda s: re.sub(r'[·.,\s]', '', str(s))
EXACT = {(d['sido'], d['sgg'], nm(d['dong'])): d['n'] for d in G['dong']}

def stores_for(sub):
    """sub: 도시 동들. 주변 동까지 넣고 격자를 나눈 뒤 도시 동만 돌려줌"""
    b = sub.total_bounds
    pool = NAT.cx[b[0] - 4000:b[2] + 4000, b[1] - 4000:b[3] + 4000].reset_index(drop=True)
    al = allocate(pool, alpha=0.3)
    al['code'] = pool.code.values
    al = al.set_index('code').loc[sub.code.values].reset_index(drop=True)
    hit = 0
    for k, (i, r) in enumerate(sub.iterrows()):
        key = (r.sidonm, r.sggnm, nm(r.emdnm))
        if key in EXACT: al.at[k, 'n'] = EXACT[key]; hit += 1
    return al, hit

# ---- 서울로 추정식 맞추기 (서울은 실제 직장인구·집객시설이 있음)
seoul_t = pd.read_csv('data/final_table.csv')
seoul_t['code'] = seoul_t.emdcd.astype(str)
SE = NAT[NAT.sidonm == '서울특별시'].reset_index(drop=True)
sal, sh = stores_for(SE)
SE = SE.join(sal[['n', '약국', '입시·교과학원', '편의점', '세탁소', '카페']])
SE = SE.merge(seoul_t[['code', 'work', 'fac', 'bank', 'dept', 'lodge', 'L', 'E']], on='code', how='left')
def fit(y, X):
    X1 = np.column_stack([np.ones(len(X))] + [X[:, k] for k in range(X.shape[1])])
    b, *_ = np.linalg.lstsq(X1, y, rcond=None)
    pred = X1 @ b; r2 = 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()
    return b, r2
Xs = np.column_stack([np.log1p(SE.n), np.log1p(SE['pop'])])
bw, r2w = fit(np.log1p(SE.work.values), Xs)
bf, r2f = fit(np.log1p(SE.fac.values), Xs)
bb, r2b = fit(np.log1p((SE.bank + SE.dept * 8 + SE.lodge * .2).values), Xs)
print('서울 검증: 직장인 R2 %.2f, 집객시설 R2 %.2f, 은행 R2 %.2f (상가 정확값 %d곳)' % (r2w, r2f, r2b, sh))
pred = lambda b, X: np.expm1(b[0] + X @ b[1:])

def lg(s, lo=.03, hi=.995):
    v = np.log1p(np.asarray(s, float)); a, b = np.quantile(v, lo), np.quantile(v, hi)
    return np.clip((v - a) / (b - a), 0, 1) * 100

CITIES = {
 'busan': dict(n='부산', full='부산광역시', sel=lambda g: g.sidonm == '부산광역시', water='낙동강',
               rivers=[({'강서구'}, {'사하구', '사상구', '북구'})], fin={'영도구': 9.5, '북구': 9.9, '서구': 12.4, '동구': 14.8, '사하구': 15.1, '금정구': 15.6, '사상구': 16.0, '수영구': 16.3, '남구': 17.1, '부산진구': 17.7, '연제구': 17.5, '동래구': 18.1, '강서구': 39.6, '기장군': 28.1, '해운대구': 24.9}),
 'daegu': dict(n='대구', full='대구광역시', sel=lambda g: g.sidonm == '대구광역시', water=None, rivers=[]),
 'incheon': dict(n='인천', full='인천광역시', sel=lambda g: (g.sidonm == '인천광역시') & (g.sggnm != '옹진군'), water='바다', rivers=[]),
 'gwangju': dict(n='광주', full='광주 5개 구', sel=lambda g: (g.sidonm == '전남광주통합특별시') & g.sggnm.isin(['광산구', '남구', '동구', '북구', '서구']), water=None, rivers=[]),
 'daejeon': dict(n='대전', full='대전광역시', sel=lambda g: g.sidonm == '대전광역시', water=None, rivers=[]),
 'ulsan': dict(n='울산', full='울산광역시', sel=lambda g: g.sidonm == '울산광역시', water='태화강',
               rivers=[({'중구', '북구', '동구'}, {'남구'})]),
}
OSM = json.load(open('raw/metro/subway_capital_osm.json'))

def build(cid, C):
    g = NAT[C['sel'](NAT)].copy().sort_values(['sggcd', 'emdcd']).reset_index(drop=True)
    al, hit = stores_for(g)
    for c in al.columns: g[c] = al[c].values
    # 서울에서 상가 수 순위와 직장인·집객시설 순위가 같다고 보고 분포를 그대로 옮김 (회귀는 극단값을 깎아 도심이 사라짐)
    qm = lambda x, src, dst: np.interp(x, np.sort(src), np.sort(dst))
    # 직장인은 인구 대비 상가가 많은 곳(도심)에 몰리도록 1인당 상가 수를 조금 섞음 (서울에서 순위상관 0.58 → 0.58)
    cw = lambda d: np.log1p(d.n) + 0.35 * np.log((d.n + 1) / (d['pop'] + 500))
    g['work'] = qm(cw(g), cw(SE), SE.work).round()
    g['fac'] = qm(g.n, SE.n, SE.fac).round()
    g['bankx'] = qm(g.n, SE.n, (SE.bank + SE.dept * 8 + SE.lodge * .2))
    # 역
    g['sub'] = 0; g['rail'] = 0
    if cid == 'incheon':
        pts = [s for s in OSM['stations'] if 37.2 < s['lat'] < 37.8 and 126.3 < s['lon'] < 126.8]
        gp = gpd.GeoDataFrame(pts, geometry=[Point(s['lon'], s['lat']) for s in pts], crs=4326).to_crs(5179)
        seen = set()
        for _, s in gp.iterrows():
            k = s['ko']
            if k in seen: continue
            hitp = g[g.geometry.contains(s.geometry)]
            if len(hitp): g.loc[hitp.index[0], 'sub'] += 1; seen.add(k)
        for nmr in ['부평', '주안', '인천']:
            s = gp[gp.ko == nmr]
            if len(s):
                hitp = g[g.geometry.contains(s.geometry.iloc[0])]
                if len(hitp): g.loc[hitp.index[0], 'rail'] += 1
    else:
        for gu, m in ST[C['n']].items():
            for st, d in m.items():
                gg = gu
                if '@' in d: d, gg = d.split('@')
                ix = g[(g.sggnm == gg) & (g.emdnm == d)].index
                g.loc[ix[0], 'sub'] += 1
        for gu, d in RAIL[C['n']]:
            ix = g[(g.sggnm == gu) & (g.emdnm == d)].index
            g.loc[ix[0], 'rail'] += 1
    # 점수 (서울과 같은 방식, 도시 안에서 상대값)
    g['P'] = lg(g['pop'], .02, .995)
    g['E'] = .60 * lg(g.work) + .22 * lg(g.bankx) + .18 * lg(g.fac)
    g['I'] = lg(g['sub'] * 14 + g.rail * 10 + g.fac * .08 + g['편의점'] * .3)
    life = (g['약국'] * 3 + g['입시·교과학원'] * 2 + g['편의점'] + g['세탁소']).rank(pct=True).values
    g['L'] = np.interp(life, np.linspace(0, 1, len(SE)), np.sort(SE.L.values))   # 서울 생활 점수 분포에 맞춤
    for c in 'PEIL': g[c] = np.clip(np.round(g[c]), 1, 100).astype(int)
    # ---- 인접 / 강 / 섬 연결
    geo = list(g.geometry); tree = STRtree(geo)
    adj = [set() for _ in geo]; river = [set() for _ in geo]
    for i, a in enumerate(geo):
        for j in tree.query(a.buffer(5)):
            j = int(j)
            if j <= i: continue
            L = a.boundary.intersection(geo[j].buffer(1.5)).length
            if L >= 40:
                adj[i].add(j); adj[j].add(i)
                for A, B in C['rivers']:
                    if (g.sggnm[i] in A and g.sggnm[j] in B) or (g.sggnm[i] in B and g.sggnm[j] in A):
                        river[i].add(j); river[j].add(i)
    # 연결 요소: 떨어진 섬은 가장 가까운 동과 '바다 건너기'로 잇기 (다리·연륙교 가정)
    def comps():
        seen = [-1] * len(geo); cs = []
        for s in range(len(geo)):
            if seen[s] >= 0: continue
            st = [s]; seen[s] = len(cs); cur = [s]
            while st:
                x = st.pop()
                for y in adj[x]:
                    if seen[y] < 0: seen[y] = len(cs); st.append(y); cur.append(y)
            cs.append(cur)
        return cs
    links = []
    while True:
        cs = comps()
        if len(cs) == 1: break
        cs.sort(key=len, reverse=True)
        main = set(cs[0]); best = None
        for comp in cs[1:]:
            for i in comp:
                for j in main:
                    dd = geo[i].distance(geo[j])
                    if best is None or dd < best[0]: best = (dd, i, j)
        _, i, j = best
        # 같은 섬에서 가까운 쌍을 하나 더 (다리가 둘인 경우)
        adj[i].add(j); adj[j].add(i); river[i].add(j); river[j].add(i); links.append((g.emdnm[i], g.emdnm[j], round(best[0] / 1000, 1)))
    # 단순화
    TOL = 45 if g.km2.sum() < 700 else 70
    sim = shapely.coverage_simplify(np.array(geo), TOL)
    minx, miny, maxx, maxy = shapely.total_bounds(sim)
    U = 10
    def enc_ring(c):
        out = []; px = py = 0
        for x, y in c:
            Xq = round((x - minx) / U); Yq = round((maxy - y) / U)
            out += [Xq - px, Yq - py]; px, py = Xq, Yq
        return out
    def enc(geom):
        polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
        polys = [p for p in polys if p.area > 20000] or polys[:1]
        return [enc_ring(list(p.exterior.coords)[:-1]) for p in polys]
    def enc_lines(ml):
        if ml.is_empty: return []
        ls = [ml] if isinstance(ml, LineString) else [x for x in getattr(ml, 'geoms', []) if isinstance(x, LineString)]
        return [enc_ring(list(l.coords)) for l in ls if l.length > 20]
    sg = gpd.GeoDataFrame(g.drop(columns=[g.geometry.name]), geometry=sim, crs=g.crs)
    gu_u = {k: unary_union(list(v.geometry)) for k, v in sg.groupby('sggnm')}
    gb = unary_union([u.boundary for u in gu_u.values()])
    gub = linemerge(gb) if gb.geom_type == 'MultiLineString' else gb
    rv = []
    for A, B in C['rivers']:
        a = unary_union([gu_u[x] for x in A if x in gu_u]); b = unary_union([gu_u[x] for x in B if x in gu_u])
        l = a.boundary.intersection(b.buffer(3))
        rv += [x for x in (l.geoms if hasattr(l, 'geoms') else [l]) if isinstance(x, LineString)]
    ru = unary_union(rv) if rv else LineString()
    rvl = linemerge(ru) if ru.geom_type == 'MultiLineString' else ru
    outer = unary_union(list(sim)).boundary
    guname = sorted(g.sggnm.unique(), key=lambda n: g[g.sggnm == n].sggcd.iloc[0])
    # 재정자립도: 부산은 보도 수치(중구는 없어 원도심 이웃 구 평균), 나머지 도시는 상가·직장인 밀도로 만든 게임용 추정치
    fin = dict(C.get('fin', {}))
    est_fin = {}
    for n in guname:
        sub = g[g.sggnm == n]
        est_fin[n] = (sub.work.sum() + sub.n.sum() * 3) / max(1, sub['pop'].sum())
    vals = np.array(list(est_fin.values()))
    lo, hi = np.quantile(vals, .1), np.quantile(vals, .9)
    for n in guname:
        if n in fin: continue
        if cid == 'busan': fin[n] = round(np.mean([fin['서구'], fin['동구'], fin['영도구']]) + 4, 1)
        else: fin[n] = round(12 + 26 * float(np.clip((est_fin[n] - lo) / max(hi - lo, 1e-9), 0, 1)), 1)
    gus = []
    for n in guname:
        c = gu_u[n].representative_point()
        gus.append(dict(n=n, f=fin[n], r=C['n'], x=round((c.x - minx) / U), y=round((maxy - c.y) / U), north=0))
    gi = {n: i for i, n in enumerate(guname)}
    D = []
    for i, r in g.iterrows():
        s = sim[i]; rp = s.representative_point(); b = s.bounds
        D.append(dict(n=r.emdnm, g=gi[r.sggnm], pop=int(r['pop']), work=int(r.work), km=round(r.km2, 2),
            sub=int(r['sub']), bus=0, fac=int(r.fac), bank=int(round(r.bankx)), hosp=0, ph=int(round(r['약국'])), sch=int(round(r['입시·교과학원'])), dept=0, rail=int(r.rail),
            P=int(r.P), E=int(r.E), I=int(r.I), L=int(r.L), est=1, st=int(round(r.n)),
            x=round((rp.x - minx) / U), y=round((maxy - rp.y) / U), b=[round((b[0] - minx) / U), round((maxy - b[3]) / U), round((b[2] - minx) / U), round((maxy - b[1]) / U)],
            a=sorted(adj[i]), r=sorted(river[i]), p=enc(s)))
    out = dict(city=cid, cname=C['n'], full=C['full'], water=C['water'], w=round((maxx - minx) / U), h=round((maxy - miny) / U), gu=gus, d=D,
               guline=enc_lines(gub), river=enc_lines(rvl) if C['rivers'] else [], outer=enc_lines(outer))
    js = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    open('data/city_%s.json' % cid, 'w').write(js)
    types = []
    for d in D:  # 엔진과 같은 분류
        types.append('office' if d['work'] >= 30000 or (d['work'] > d['pop'] * 2 and d['work'] >= 8000) else 'station' if d['sub'] >= 3 else 'town' if (d['P'] >= 82 and d['work'] < d['pop'] * .5) else 'busy' if d['fac'] >= 230 else 'river' if d['r'] else 'wide' if d['km'] >= 3.5 else 'life' if d['L'] >= 55 else 'home')
    tc = pd.Series(types).value_counts().to_dict()
    print('==', C['n'], 'dongs', len(D), 'gu', len(gus), 'pop', int(g['pop'].sum()), 'KB', len(js) // 1024, 'exact', hit, 'subway dongs', int((g['sub'] > 0).sum()), 'stations', int(g['sub'].sum()),
          'river edges', sum(map(len, river)) // 2, 'links', links, 'km', round((maxx - minx) / 1000), round((maxy - miny) / 1000))
    print('   types', tc)
    print('   top work', g.sort_values('work', ascending=False)[['sggnm', 'emdnm', 'work', 'n', 'pop']].head(5).values.tolist())
    print('   fin', {k: v for k, v in fin.items()})
    return out

if __name__ == '__main__':
    only = sys.argv[1:] or list(CITIES)
    for cid in only: build(cid, CITIES[cid])
