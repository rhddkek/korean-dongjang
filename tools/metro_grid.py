# 상가 0.02도 격자(소상공인시장진흥공단 상가정보 집계)를 행정동에 나눠 담는 함수와 서울 검증
import json, re, numpy as np, pandas as pd, geopandas as gpd, shapely
from shapely.geometry import box
G=json.load(open('raw/metro/sanggwon_dashboard.json'))
grid=pd.DataFrame(G['grid'])
FOCUS=['카페','편의점','치킨','미용실','피부 관리실','부동산 중개/대리업','입시·교과학원','빵/도넛','노래방','약국','세탁소','안경']
def cells_gdf():
    geo=[box(r.lon,r.lat,r.lon+0.02,r.lat+0.02) for r in grid.itertuples()]
    return gpd.GeoDataFrame(grid.copy(),geometry=geo,crs='EPSG:4326').to_crs(5179)
CELLS=None
def allocate(dongs, alpha=0.5, popcol='pop'):
    """dongs: GeoDataFrame EPSG:5179 with pop. returns DataFrame of allocated counts (n + focus)"""
    global CELLS
    if CELLS is None: CELLS=cells_gdf()
    b=dongs.total_bounds
    c=CELLS.cx[b[0]-3000:b[2]+3000,b[1]-3000:b[3]+3000].reset_index(drop=True)
    inter=gpd.overlay(gpd.GeoDataFrame({'di':range(len(dongs))},geometry=dongs.geometry.values,crs=dongs.crs),
                      gpd.GeoDataFrame({'ci':range(len(c))},geometry=c.geometry.values,crs=c.crs),how='intersection',keep_geom_type=True)
    inter['a']=inter.geometry.area
    dens=(dongs[popcol].values/np.maximum(dongs.geometry.area.values/1e6,0.05))
    inter['w']=inter.a*(np.maximum(dens[inter.di],50)**alpha)
    inter['wt']=inter.w/inter.groupby('ci').w.transform('sum')
    cols=['n']+FOCUS
    out=np.zeros((len(dongs),len(cols)))
    for k,col in enumerate(cols):
        v=c[col].values[inter.ci]*inter.wt.values
        np.add.at(out[:,k],inter.di.values,v)
    return pd.DataFrame(out,columns=cols)
if __name__=='__main__':
    g=gpd.read_parquet('data/stage1.parquet').reset_index(drop=True)
    g=g.set_geometry('geom') if 'geom' in g.columns and g.geometry.name!='geom' else g
    nm=lambda s:re.sub(r'[·.]','',str(s))
    exact={(d['sgg'],nm(d['dong'])):d['n'] for d in G['dong'] if d['sido']=='서울특별시'}
    for a in [0,0.3,0.5,0.8]:
        al=allocate(g,alpha=a)
        g['st']=al.n.values
        m=[(g.st[i],exact[(g.sggnm[i],nm(g.emdnm[i]))]) for i in range(len(g)) if (g.sggnm[i],nm(g.emdnm[i])) in exact]
        x=np.array(m)
        r_ex=np.corrcoef(np.log(x[:,0]),np.log(x[:,1]))[0,1]; ratio=np.median(x[:,0]/x[:,1])
        lw=np.corrcoef(np.log1p(g.st),np.log1p(g.work))[0,1]; lf=np.corrcoef(np.log1p(g.st),np.log1p(g.fac))[0,1]
        print('alpha',a,'top66 logcorr',round(r_ex,3),'median est/exact',round(ratio,2),'| all: corr log work',round(lw,3),'log fac',round(lf,3),'sum',int(g.st.sum()))
