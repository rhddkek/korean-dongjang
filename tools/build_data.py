import json, math, re, sys
import numpy as np, pandas as pd, geopandas as gpd, shapely
from shapely.geometry import MultiLineString, LineString, Polygon, MultiPolygon
from shapely.ops import unary_union, linemerge
import admdongkor as adk
KEY='20261001'
g=adk.get(KEY,'emd',detail=True)  # EPSG:5179
g=g[g.sidonm.astype(str).str.contains('서울')].copy().reset_index(drop=True)
g['c8']=g.emdcd.astype(str).str[:8]; g['e8']=g.emd8.astype(str)
g['key']=g.sggnm.astype(str)+'|'+g.emdnm.astype(str)
g['km2']=g.geometry.area/1e6
print('dongs',len(g),'gu',g.sggnm.nunique())
pop=pd.read_csv('raw/pop.csv'); pop=pop[pop['기준_년분기_코드']==pop['기준_년분기_코드'].max()]; pop['c']=pop['행정동_코드'].astype(str)
att=pd.read_csv('raw/localmatch.csv'); att['c']=att['행정동_코드'].astype(str); att['k']=att.gu+'|'+att.dong
work=pd.read_csv('raw/work.csv'); work['k']=work['자치구']+'|'+work['행정동']; work['c']=work['행정동_코드'].astype(str)
sales=pd.read_csv('raw/sales.csv'); sales['k']=sales['자치구']+'|'+sales['행정동']; sales['c']=sales['행정동_코드'].astype(str)
inc=pd.read_csv('raw/income.csv'); inc['k']=inc['시군구명']+'|'+inc['읍면동명']
# 경계 변경: 옛 단위 -> 현재 단위
SPLIT={'11230536':['신설동','용두동'],'11740520':['상일제1동','상일제2동']}
RENAME={'11680740':'개포3동'}
g['pop']=np.nan
popd=dict(zip(pop.c,pop['총_상주인구_수']))
for i,r in g.iterrows():
    if r.c8 in popd: g.at[i,'pop']=popd[r.c8]
print('pop extras',[ (c,pop[pop.c==c]['행정동_코드_명'].iloc[0]) for c in set(pop.c)-set(g.c8)])
def share_old(dfval, code, names, col):
    sub=g[g.emdnm.isin(names)&g.sggnm.isin(g[g.emdnm.isin(names)].sggnm)]
    tot=sub.km2.sum()
    for i,r in sub.iterrows(): g.at[i,col]=dfval*r.km2/tot
for c,names in SPLIT.items():
    if c in popd: share_old(popd[c],c,names,'pop')
for c,n in RENAME.items():
    if c in popd: g.loc[g.emdnm==n,'pop']=popd[c]
# 집객시설
cols={'집객시설_수':'fac','관공서_수':'gov','은행_수':'bank','종합병원_수':'genhosp','일반_병원_수':'hosp','약국_수':'pharm','유치원_수':'kinder','초등학교_수':'elem','중학교_수':'mid','고등학교_수':'high','대학교_수':'univ','백화점_수':'dept','슈퍼마켓_수':'super','극장_수':'theater','숙박_시설_수':'lodge','철도_역_수':'rail','버스_터미널_수':'term','지하철_역_수':'subway','버스_정거장_수':'bus'}
for v in cols.values(): g[v]=np.nan
ad=att.set_index('c')
for i,r in g.iterrows():
    src=None
    if r.c8 in ad.index: src=ad.loc[r.c8]
    else:
        for c,n in RENAME.items():
            if r.emdnm==n and c in ad.index: src=ad.loc[c]
    if src is not None:
        if isinstance(src,pd.DataFrame): src=src.iloc[0]
        for k,v in cols.items(): g.at[i,v]=0 if pd.isna(src[k]) else float(src[k])
for c,names in SPLIT.items():
    if c in ad.index:
        s=ad.loc[c]; sub=g[g.emdnm.isin(names)]; tot=sub.km2.sum()
        for i,r in sub.iterrows():
            for k,v in cols.items(): g.at[i,v]=(0 if pd.isna(s[k]) else float(s[k]))*r.km2/tot
# 직장인구/매출 (자치구|행정동 이름 또는 통계청 코드)
def nm(x): return re.sub(r'[·?.,]','',str(x))
ALIAS={'상일1동':'상일제1동','상일2동':'상일제2동','일원2동':'개포3동'}
def join(df,val,out):
    d2=df.copy(); d2['n']=d2['행정동'].map(lambda x:ALIAS.get(nm(x),nm(x)))
    d2['k2']=d2['자치구']+'|'+d2.n
    by_k=dict(zip(d2.k2,d2[val])); by_c=dict(zip(df.c,df[val])); hit=0
    by_n=d2[~d2.n.duplicated(keep=False)].set_index('n')[val].to_dict()
    g[out]=np.nan
    for i,r in g.iterrows():
        n=nm(r.emdnm)
        v=by_k.get(r.sggnm+'|'+n)
        if v is None: v=by_c.get(r.e8)
        if v is None: v=by_n.get(n)
        if v is not None: g.at[i,out]=float(v); hit+=1
    old=d2[d2.n=='용신동'][val]
    if len(old):
        sub=g[g.emdnm.isin(['신설동','용두동'])]; tot=sub.km2.sum()
        for i,r in sub.iterrows(): g.at[i,out]=float(old.iloc[0])*r.km2/tot
    miss=g[g[out].isna()][['sggnm','emdnm']].values.tolist()
    print(out,'hit',hit,'missing',len(miss),miss)
join(work,'총_직장_인구_수','work'); join(sales,'당월_매출_금액','sales')
inc['k2']=inc['시군구명']+'|'+inc['읍면동명'].map(nm)
g['income']=(g.sggnm+'|'+g.emdnm.map(nm)).map(dict(zip(inc.k2,inc['월_평균_소득_금액'])))
print('income hit',g.income.notna().sum())
a2=att.copy(); a2['k2']=a2.gu+'|'+a2.dong
for i,r in g[g.fac.isna()].iterrows():
    m=a2[a2.k2==r.key]
    if len(m):
        for k,v in cols.items(): g.at[i,v]=0 if pd.isna(m.iloc[0][k]) else float(m.iloc[0][k])
print('pop na',g[g['pop'].isna()].emdnm.tolist(),'fac na',g[g.fac.isna()].emdnm.tolist())
gname=g.geometry.name; print('geom col',gname); g.to_parquet('data/stage1.parquet')
print(g[['sggnm','emdnm','pop','work','sales','subway','bus','income']].sort_values('sales',ascending=False).head(8).to_string())
print(g[['pop','work','sales','fac','subway','bus','km2','income']].describe().T.to_string())
print('totals pop',g['pop'].sum(),'work',g.work.sum(),'sales(억)',g.sales.sum()/1e8)
print(g.groupby('sggnm')['pop'].sum().sort_values(ascending=False).head(6))
print('coverage_simplify', hasattr(shapely,'coverage_simplify'), shapely.geos_version)
