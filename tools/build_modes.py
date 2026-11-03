# 도 지역·통합 모드·전국 모드 데이터 (tools/build_metro.py 방식을 넓힘)
# 인구: 행정안전부 주민등록 인구통계(2026년 7월, 행정동) / 상가: 소상공인시장진흥공단 상가정보 격자 집계(2026년 9월)
# 직장인·집객시설: 서울 실제값과 상가 수의 관계로 옮긴 게임용 추정치 (서울 동은 실제값)
# 역: 수도권 전철(경기·충남 천안아산·강원 춘천 포함)은 OpenStreetMap 좌표, 광역시는 metro_stations.py, 경남·경북 경전철은 역 이름 기준 수작업 배정
# 전국 모드: 서울·광역시는 자치구·군, 도는 시·군(일반구는 시로 합침)이 한 칸. 역은 KTX·SRT 정차역(수작업 배정)
import json, re, sys
import numpy as np, pandas as pd, geopandas as gpd, shapely
from shapely.geometry import LineString, MultiPolygon, Point
from shapely.ops import unary_union, linemerge
from shapely.strtree import STRtree
sys.path.insert(0, 'tools')
import build_metro as bm

NAT, SE, OSM, ST, RAIL = bm.NAT, bm.SE, bm.OSM, bm.ST, bm.RAIL
lg = bm.lg
MSH = {'서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천', '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종'}
DSH = {'경기도': '경기', '강원특별자치도': '강원', '충청북도': '충북', '충청남도': '충남', '전북특별자치도': '전북', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주', '전남광주통합특별시': '전남'}
GJ5 = {'광산구', '남구', '동구', '북구', '서구'}
def is_gj(r): return r.sidonm == '전남광주통합특별시' and r.sggnm in GJ5
def metro_of(r):
    if r.sidonm in MSH: return MSH[r.sidonm]
    if is_gj(r): return '광주'
    return None
def city_merge(sgg):
    m = re.match(r'^(.+?시)(.+구)$', sgg)
    return m.group(1) if m else sgg

# 경남·경북 경전철·도시철도 연장 구간 (역 → 행정동, 이름·소재지 기준 대략 배정)
EXTRA = [
    ('경상남도', '김해시', '불암동', 1), ('경상남도', '김해시', '활천동', 2), ('경상남도', '김해시', '삼안동', 1), ('경상남도', '김해시', '부원동', 2),
    ('경상남도', '김해시', '회현동', 1), ('경상남도', '김해시', '동상동', 1), ('경상남도', '김해시', '내외동', 1), ('경상남도', '김해시', '북부동', 3),
    ('경상남도', '양산시', '물금읍', 2), ('경상남도', '양산시', '양주동', 1), ('경상남도', '양산시', '중앙동', 1), ('경상남도', '양산시', '동면', 1),
    ('경상북도', '경산시', '서부1동', 1), ('경상북도', '경산시', '서부2동', 1), ('경상북도', '경산시', '북부동', 1), ('경상북도', '경산시', '하양읍', 2),
]
# 전국 모드 KTX·SRT 정차역 (칸 이름 → 역 수)
KTX = {'용산구': 2, '영등포구': 1, '강남구': 1, '중랑구': 1, '동대문구': 1, '서울 중구': 1, '광명시': 1, '수원시': 1, '화성시': 1, '평택시': 1, '고양시': 1,
       '아산시': 1, '천안시': 0, '청주시': 1, '공주시': 1, '대전 동구': 1, '대전 중구': 1, '김천시': 1, '대구 동구': 1, '대구 서구': 1, '경주시': 1, '울주군': 1,
       '부산 동구': 1, '부산 북구': 1, '밀양시': 1, '양산시': 1, '포항시': 1, '익산시': 1, '정읍시': 1, '전주시': 1, '남원시': 1, '광산구': 1, '나주시': 1, '목포시': 1,
       '곡성군': 1, '순천시': 2, '여수시': 2, '장성군': 1, '김해시': 1, '창원시': 3, '진주시': 1, '함안군': 1, '양평군': 1, '원주시': 2, '횡성군': 2, '평창군': 2, '강릉시': 1,
       '동해시': 1, '제천시': 1, '단양군': 1, '영주시': 2, '안동시': 1, '의성군': 1, '영천시': 1, '세종': 0}

def fit_quant(g):
    qm = lambda x, src, dst: np.interp(x, np.sort(src), np.sort(dst))
    cw = lambda d: np.log1p(d.n) + 0.35 * np.log((d.n + 1) / (d['pop'] + 500))
    g['work'] = qm(cw(g), cw(SE), SE.work).round()
    g['fac'] = qm(g.n, SE.n, SE.fac).round()
    g['bankx'] = qm(g.n, SE.n, (SE.bank + SE.dept * 8 + SE.lodge * .2))
    # 서울 동은 실제값
    se = g.sidonm == '서울특별시'
    if se.any():
        m = SE.set_index('code')
        g.loc[se, 'work'] = g.loc[se, 'code'].map(m.work).fillna(g.loc[se, 'work'])
        g.loc[se, 'fac'] = g.loc[se, 'code'].map(m.fac).fillna(g.loc[se, 'fac'])
        g.loc[se, 'bankx'] = g.loc[se, 'code'].map(m.bank + m.dept * 8 + m.lodge * .2).fillna(g.loc[se, 'bankx'])
    return g

def stations(g):
    g['sub'] = 0; g['rail'] = 0
    cap = g[g.sidonm.isin(['서울특별시', '인천광역시', '경기도', '충청남도', '강원특별자치도'])]
    if len(cap):
        seen = set(); pts = []
        for s in OSM['stations']:
            k = (s['ko'], round(s['lat'], 2), round(s['lon'], 2))
            if k in seen: continue
            seen.add(k); pts.append(s)
        gp = gpd.GeoDataFrame(pts, geometry=[Point(s['lon'], s['lat']) for s in pts], crs=4326).to_crs(5179)
        j = gpd.sjoin(gp, gpd.GeoDataFrame(geometry=cap.geometry, crs=g.crs), predicate='within')
        for ix, n in j.index_right.value_counts().items(): g.loc[ix, 'sub'] += n
    for city, sido in [('부산', '부산광역시'), ('대구', '대구광역시'), ('대전', '대전광역시'), ('울산', '울산광역시'), ('광주', '전남광주통합특별시')]:
        if city not in ST: continue
        for gu, m in ST[city].items():
            for st, d in m.items():
                gg = gu
                if '@' in d: d, gg = d.split('@')
                ix = g[(g.sidonm == sido) & (g.sggnm == gg) & (g.emdnm == d)].index
                if len(ix): g.loc[ix[0], 'sub'] += 1
        for gu, d in RAIL.get(city, []):
            ix = g[(g.sidonm == sido) & (g.sggnm == gu) & (g.emdnm == d)].index
            if len(ix): g.loc[ix[0], 'rail'] += 1
    for sido, sgg, d, n in EXTRA:
        ix = g[(g.sidonm == sido) & (g.sggnm == sgg) & (g.emdnm == d)].index
        if len(ix): g.loc[ix[0], 'sub'] += n
    return g

def scores(g):
    g['P'] = lg(g['pop'], .02, .995)
    g['E'] = .60 * lg(g.work) + .22 * lg(g.bankx) + .18 * lg(g.fac)
    g['I'] = lg(g['sub'] * 14 + g.rail * 10 + g.fac * .08 + g['편의점'] * .3)
    life = (g['약국'] * 3 + g['입시·교과학원'] * 2 + g['편의점'] + g['세탁소']).rank(pct=True).values
    g['L'] = np.interp(life, np.linspace(0, 1, len(SE)), np.sort(SE.L.values))
    for c in 'PEIL': g[c] = np.clip(np.round(g[c]), 1, 100).astype(int)
    return g

def adjacency(geo, keys, rivers, minL):
    tree = STRtree(geo)
    adj = [set() for _ in geo]; river = [set() for _ in geo]
    for i, a in enumerate(geo):
        for j in tree.query(a.buffer(5)):
            j = int(j)
            if j <= i: continue
            L = a.boundary.intersection(geo[j].buffer(1.5)).length
            if L >= minL:
                adj[i].add(j); adj[j].add(i)
                for A, B in rivers:
                    if (keys[i] in A and keys[j] in B) or (keys[i] in B and keys[j] in A):
                        river[i].add(j); river[j].add(i)
    # 떨어진 섬: 가장 가까운 뭍과 '바다 건너기'로 잇기
    links = []
    while True:
        seen = [-1] * len(geo); cs = []
        for s in range(len(geo)):
            if seen[s] >= 0: continue
            st = [s]; seen[s] = len(cs); cur = [s]
            while st:
                x = st.pop()
                for y in adj[x]:
                    if seen[y] < 0: seen[y] = len(cs); st.append(y); cur.append(y)
            cs.append(cur)
        if len(cs) == 1: break
        cs.sort(key=len, reverse=True)
        main = cs[0]; mt = STRtree([geo[k] for k in main]); best = None
        for comp in cs[1:]:
            for i in comp:
                q, d = mt.query_nearest(geo[i], return_distance=True)
                d = float(d[0]); jj = main[int(q[1][0])] if q.ndim == 2 else main[int(q[0])]
                if best is None or d < best[0]: best = (d, i, jj)
        _, i, j = best
        adj[i].add(j); adj[j].add(i); river[i].add(j); river[j].add(i); links.append((i, j, round(best[0] / 1000, 1)))
    return adj, river, links

def encode(sim, minpart):
    minx, miny, maxx, maxy = shapely.total_bounds(sim)
    U = 10
    def enc_ring(c):
        out = []; px = py = 0
        for x, y in c:
            Xq = round((x - minx) / U); Yq = round((maxy - y) / U)
            if out and Xq == px and Yq == py: continue
            out += [Xq - px, Yq - py]; px, py = Xq, Yq
        return out
    def enc(geom):
        polys = list(geom.geoms) if isinstance(geom, MultiPolygon) else [geom]
        big = sorted(polys, key=lambda p: -p.area)
        keep = [p for p in big if p.area > minpart] or big[:1]
        return [enc_ring(list(p.exterior.coords)[:-1]) for p in keep]
    def enc_lines(ml):
        if ml.is_empty: return []
        ls = [ml] if isinstance(ml, LineString) else [x for x in getattr(ml, 'geoms', []) if isinstance(x, LineString)]
        return [enc_ring(list(l.coords)) for l in ls if l.length > 40]
    return minx, miny, maxx, maxy, U, enc, enc_lines

def fin_est(names, frame, key):
    est = {}
    for n in names:
        sub = frame[frame[key] == n]
        est[n] = (sub.work.sum() + sub.n.sum() * 3) / max(1, sub['pop'].sum())
    vals = np.array(list(est.values())); lo, hi = np.quantile(vals, .1), np.quantile(vals, .9)
    out = {n: round(12 + 26 * float(np.clip((est[n] - lo) / max(hi - lo, 1e-9), 0, 1)), 1) for n in names}
    for k, v in bm.CITIES['busan']['fin'].items():
        if '부산 ' + k in out: out['부산 ' + k] = v
        if k in out and key == 'grp_busan': out[k] = v
    return out

def type_of(d, kmq, wq, fq):
    if d['work'] >= 30000 or (d['work'] > d['pop'] * 2 and d['work'] >= 8000) or (d['work'] >= wq and d['work'] > d['pop'] * .8): return 'office'
    if d['sub'] >= 3: return 'station'
    if d['P'] >= 82 and d['work'] < d['pop'] * .5: return 'town'
    if d['fac'] >= 230 or d['fac'] >= fq: return 'busy'
    if d['r']: return 'river'
    if d['km'] >= kmq: return 'wide'
    if d['L'] >= 55: return 'life'
    return 'home'

def finish(mid, M, g, geo_full, keys, gname, rivers, tol, minpart, minL, extra_d=None):
    """g: 칸 데이터프레임(pop, work, n, ...), geo_full: 칸 경계, gname: 칸마다 그룹 이름"""
    adj, river, links = adjacency(geo_full, keys, rivers, minL)
    sim = shapely.coverage_simplify(np.array(geo_full), tol)
    minx, miny, maxx, maxy, U, enc, enc_lines = encode(sim, minpart)
    sg = gpd.GeoDataFrame({'grp': gname}, geometry=sim, crs=5179)
    gu_u = {k: unary_union(list(v.geometry)) for k, v in sg.groupby('grp')}
    gb = unary_union([u.boundary for u in gu_u.values()])
    gub = linemerge(gb) if gb.geom_type == 'MultiLineString' else gb
    rv = []
    for i in range(len(sim)):
        for j in river[i]:
            if j > i and sim[i].distance(sim[j]) < 5:
                l = sim[i].boundary.intersection(sim[j].buffer(3))
                rv += [x for x in (l.geoms if hasattr(l, 'geoms') else [l]) if isinstance(x, LineString)]
    ru = unary_union(rv) if rv else LineString()
    rvl = linemerge(ru) if ru.geom_type == 'MultiLineString' else ru
    outer = unary_union(list(sim)).boundary
    order = []
    for n in gname:
        if n not in order: order.append(n)
    fin = M.get('fin') or {}
    gus = []
    for n in order:
        c = gu_u[n].representative_point()
        gus.append(dict(n=n, f=fin.get(n, 20), r=M.get('region', {}).get(n, M['n']), x=round((c.x - minx) / U), y=round((maxy - c.y) / U), north=0))
    gi = {n: i for i, n in enumerate(order)}
    kmq = float(np.quantile(g.km2, M.get('wideq', .6)))
    D = []
    for i, r in g.reset_index(drop=True).iterrows():
        s = sim[i]; rp = s.representative_point(); b = s.bounds
        d = dict(n=r['name'], g=gi[gname[i]], pop=int(r['pop']), work=int(r.work), km=round(r.km2, 2),
                 sub=int(r['sub']), bus=0, fac=int(r.fac), bank=int(round(r.bankx)), hosp=0, ph=int(round(r['약국'])), sch=int(round(r['입시·교과학원'])), dept=0, rail=int(r.rail),
                 P=int(r.P), E=int(r.E), I=int(r.I), L=int(r.L), est=1, st=int(round(r.n)),
                 x=round((rp.x - minx) / U), y=round((maxy - rp.y) / U), b=[round((b[0] - minx) / U), round((maxy - b[3]) / U), round((b[2] - minx) / U), round((maxy - b[1]) / U)],
                 a=sorted(adj[i]), r=sorted(river[i]), p=enc(s))
        if M['kind'] == 'nation': d['ty'] = r['ty']
        D.append(d)
    if M['kind'] != 'nation':
        wq, fq = float(np.quantile(g.work, .97)), float(np.quantile(g.fac, .95))
        for d in D: d['ty'] = type_of(d, kmq, wq, fq)
    out = dict(city=mid, cname=M['n'], full=M['full'], water=M['water'] if any(map(len, river)) else None, w=round((maxx - minx) / U), h=round((maxy - miny) / U), gu=gus, d=D,
               guline=enc_lines(gub), river=enc_lines(rvl), outer=enc_lines(outer), mode=M['mode'])
    js = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    open('data/city_%s.json' % mid, 'w').write(js)
    tc = pd.Series([d['ty'] for d in D]).value_counts().to_dict()
    print('==', mid, M['n'], '칸', len(D), '그룹', len(gus), '인구', int(g['pop'].sum()), 'KB', len(js) // 1024, '역 칸', int((g['sub'] > 0).sum()), '역', int(g['sub'].sum()),
          '건너기', sum(map(len, river)) // 2, '섬 연결', len(links), 'km', round((maxx - minx) / 1000), round((maxy - miny) / 1000))
    print('   types', tc)
    print('   top work', g.sort_values('work', ascending=False)[['name', 'work', 'pop']].head(4).values.tolist())
    return out

def emd_mode(mid, M):
    g = NAT[M['sel'](NAT)].copy()
    for d in M.get('drop', []): g = g[g.sggnm != d]
    for d in M.get('drop_emd', []): g = g[g.emdnm != d]
    g = g.sort_values(['sidocd', 'sggcd', 'emdcd']).reset_index(drop=True)
    al, hit = bm.stores_for(g)
    for c in al.columns: g[c] = al[c].values
    g = fit_quant(g); g = stations(g); g = scores(g)
    g['name'] = g.emdnm
    if M['kind'] == 'prov': gname = [city_merge(s) for s in g.sggnm]
    else:
        gname = []
        for _, r in g.iterrows():
            mt = metro_of(r)
            gname.append(mt + ' ' + r.sggnm if mt else city_merge(r.sggnm))
    keys = [r.sidonm + '|' + r.sggnm for _, r in g.iterrows()]
    rivers = [({'부산광역시|강서구'}, {'부산광역시|사하구', '부산광역시|사상구', '부산광역시|북구'}),
              ({'울산광역시|중구', '울산광역시|북구', '울산광역시|동구'}, {'울산광역시|남구'})]
    # 재정자립도: 부산 구는 보도 수치, 나머지는 상가·직장인 밀도로 만든 추정치
    g['grp'] = gname
    fin = fin_est(list(dict.fromkeys(gname)), g, 'grp')
    for k, v in bm.CITIES['busan']['fin'].items():
        if '부산 ' + k in fin: fin['부산 ' + k] = v
    M['fin'] = fin
    return finish(mid, M, g, list(g.geometry), keys, gname, rivers, M['tol'], M['minpart'], 40)

def nation(mid, M):
    g = NAT.copy().sort_values(['sidocd', 'sggcd', 'emdcd']).reset_index(drop=True)
    al, hit = bm.stores_for(g)
    for c in al.columns: g[c] = al[c].values
    g = fit_quant(g)
    # 칸: 서울·광역시는 자치구·군, 도는 시·군 (일반구는 시로)
    base = []
    for _, r in g.iterrows():
        mt = metro_of(r)
        base.append((mt or DSH.get(r.sidonm, r.sidonm), r.sggnm if mt else city_merge(r.sggnm), r.sidonm if not is_gj(r) else '광주'))
    cnt = pd.Series([b[1] for b in set((b[0], b[1]) for b in base)]).value_counts()
    g['unit'] = [(b[0] + ' ' + b[1]) if cnt[b[1]] > 1 else b[1] for b in base]
    g.loc[g.sidonm == '세종특별자치시', 'unit'] = '세종'
    # 그룹 = 시도 (전남광주통합특별시는 하나)
    g['grp'] = g.sidonm
    agg = {'pop': 'sum', 'work': 'sum', 'fac': 'sum', 'bankx': 'sum', 'n': 'sum', 'km2': 'sum', '약국': 'sum', '입시·교과학원': 'sum', '편의점': 'sum', '세탁소': 'sum', 'grp': 'first', 'sidocd': 'first', 'sggcd': 'first'}
    u = g.groupby('unit', sort=False).agg(agg).reset_index()
    u = u.sort_values(['sidocd', 'sggcd']).reset_index(drop=True)
    geo = [unary_union(list(g[g.unit == n].geometry)).buffer(0) for n in u.unit]
    u['name'] = u.unit
    u['sub'] = [KTX.get(n, 0) for n in u.unit]; u['rail'] = 0
    u = scores(u)
    # 칸 유형은 전국 안에서 상대 기준
    ratio = u.work / u['pop'].clip(lower=1)
    q = lambda s, p: float(np.quantile(s, p))
    ty = []
    for i, r in u.iterrows():
        if ratio[i] >= q(ratio, .9) and r.work >= q(u.work, .6): ty.append('office')
        elif r['sub'] >= 2: ty.append('station')
        elif r.P >= 70 and ratio[i] < q(ratio, .4): ty.append('town')
        elif r.fac >= q(u.fac, .9): ty.append('busy')
        elif r.km2 >= q(u.km2, .7): ty.append('wide')
        elif r.L >= 55: ty.append('life')
        else: ty.append('home')
    u['ty'] = ty
    keys = list(u.unit)
    # 한강: 서울 게임 데이터에서 구끼리 강 건너기 쌍
    sd = json.load(open('data/game_data.json'))
    sgn = [sd['gu'][d['g']]['n'] for d in sd['d']]
    hp = set()
    for i, d in enumerate(sd['d']):
        for j in d['r']:
            if sgn[i] != sgn[j]:
                un = set(u.unit); nm2 = lambda n: '서울 ' + n if '서울 ' + n in un else n
                hp.add(frozenset((nm2(sgn[i]), nm2(sgn[j]))))
    rivers = [({a}, {b}) for a, b in (tuple(p) for p in hp)]
    reg = {'서울특별시': '수도권', '인천광역시': '수도권', '경기도': '수도권', '대전광역시': '충청권', '세종특별자치시': '충청권', '충청북도': '충청권', '충청남도': '충청권',
           '전북특별자치도': '호남권', '전남광주통합특별시': '호남권', '부산광역시': '영남권', '대구광역시': '영남권', '울산광역시': '영남권', '경상북도': '영남권', '경상남도': '영남권',
           '강원특별자치도': '강원·제주권', '제주특별자치도': '강원·제주권'}
    M['region'] = reg
    M['fin'] = fin_est(list(dict.fromkeys(u.grp)), u, 'grp')
    u = u.rename(columns={})
    return finish(mid, M, u, geo, keys, list(u.grp), rivers, M['tol'], M['minpart'], 300)

def prov(n, full, sido, title, tol=90, minpart=250000, drop=(), extra=None):
    return dict(n=n, full=full, kind='prov', sel=lambda G, s=sido: G.sidonm == s, water='바다', tol=tol, minpart=minpart, drop=list(drop),
                mode=dict(kind='prov', grp='시군', r1='시장·군수', r2=n + ' 부지사', final=title, unit='동'))
MODES = {
    'gyeonggi': prov('경기', '경기도', '경기도', '경기도지사', tol=70),
    'gangwon': prov('강원', '강원특별자치도', '강원특별자치도', '강원특별자치도지사', tol=110),
    'chungbuk': prov('충북', '충청북도', '충청북도', '충청북도지사', tol=90),
    'chungnam': prov('충남', '충청남도', '충청남도', '충청남도지사', tol=90),
    'jeonbuk': prov('전북', '전북특별자치도', '전북특별자치도', '전북특별자치도지사', tol=90),
    'gyeongbuk': prov('경북', '경상북도 (울릉군 제외)', '경상북도', '경상북도지사', tol=110, drop=['울릉군']),
    'gyeongnam': prov('경남', '경상남도', '경상남도', '경상남도지사', tol=90),
    'jeju': dict(prov('제주', '제주특별자치도 (추자면 제외)', '제주특별자치도', '제주특별자치도지사', tol=50, minpart=60000), drop_emd=['추자면']),
    'daegyeong': dict(n='대구경북', full='대구광역시·경상북도 (울릉군 제외)', kind='combo', sel=lambda G: G.sidonm.isin(['대구광역시', '경상북도']), water='바다', tol=100, minpart=250000, drop=['울릉군'],
                      mode=dict(kind='combo', grp='시군구', r1='시장·군수·구청장', r2='대구경북 부시장', final='대구경북 통합시장', unit='동')),
    'gyeongsang': dict(n='경상도', full='부산·대구·울산·경상북도·경상남도 (울릉군 제외)', kind='combo', sel=lambda G: G.sidonm.isin(['부산광역시', '대구광역시', '울산광역시', '경상북도', '경상남도']), water='강·바다', tol=130, minpart=300000, drop=['울릉군'],
                       mode=dict(kind='combo', grp='시군구', r1='시장·군수·구청장', r2='경상도 도사', final='경상도 관찰사', unit='동')),
    'jeonnam': dict(n='전남광주', full='전남광주통합특별시', kind='combo', sel=lambda G: G.sidonm == '전남광주통합특별시', water='바다', tol=100, minpart=300000,
                    mode=dict(kind='combo', grp='시군구', r1='시장·군수·구청장', r2='통합특별시 부시장', final='전남광주통합특별시장', unit='동')),
    'jeolla': dict(n='전라도', full='전남광주통합특별시·전북특별자치도', kind='combo', sel=lambda G: G.sidonm.isin(['전남광주통합특별시', '전북특별자치도']), water='바다', tol=120, minpart=300000,
                   mode=dict(kind='combo', grp='시군구', r1='시장·군수·구청장', r2='전라도 도사', final='전라도 관찰사', unit='동')),
    'korea': dict(n='대한민국', full='전국 시군구', kind='nation', water='강·바다', tol=800, minpart=8000000,
                  mode=dict(kind='nation', grp='시도', r1='시도지사', r2='권역장', final='대통령', unit='지역', rail='KTX', raid=120)),
}

if __name__ == '__main__':
    only = sys.argv[1:] or list(MODES)
    for mid in only:
        M = MODES[mid]
        nation(mid, M) if M['kind'] == 'nation' else emd_mode(mid, M)
