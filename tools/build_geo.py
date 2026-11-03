import json, re, math
import numpy as np, pandas as pd, geopandas as gpd, shapely
from shapely.geometry import MultiLineString, LineString, MultiPolygon, Polygon
from shapely.ops import unary_union, linemerge
from shapely.strtree import STRtree
g=gpd.read_parquet('data/stage1.parquet').reset_index(drop=True)
g=g.sort_values(['sggcd','emdcd']).reset_index(drop=True)
# --- 결측 보정
g['est']=0
m=(g.sggnm=='관악구')&(g.emdnm=='신사동')
facs=['fac','gov','bank','genhosp','hosp','pharm','kinder','elem','mid','high','univ','dept','super','theater','lodge','rail','term','subway','bus']
for c in facs: g.loc[m,c]=g[(g.sggnm=='관악구')&~m][c].median()
g.loc[m,'est']=1
g['workpc']=g.work/g['pop'].clip(lower=200)
for i,r in g[g.work.isna()].iterrows():
    med=g[(g.sggnm==r.sggnm)&g.workpc.notna()].workpc.median()
    g.at[i,'work']=round(med*max(r['pop'],200)); g.at[i,'est']=1
guinc=g.groupby('sggnm').income.median(); allinc=g.income.median()
g['incf']=g.income
for i,r in g[g.income.isna()].iterrows():
    v=guinc.get(r.sggnm); g.at[i,'incf']=v if pd.notna(v) else allinc
for c in facs+['pop','work']: g[c]=g[c].round().astype(int)
print('estimated work/fac',int(g.est.sum()))
# --- 점수 (로그 스케일 0~100)
def lg(s,lo=.03,hi=.995):
    v=np.log1p(s.astype(float)); a,b=v.quantile(lo),v.quantile(hi)
    return ((v-a)/(b-a)).clip(0,1)*100
life_raw=g.hosp*3+g.genhosp*6+g.pharm*1+g.kinder*1.5+(g.elem+g.mid+g.high)*2+g.super*2+g.theater*2
g['P']=lg(g['pop'],.02,.995)
g['E']=(.60*lg(g.work)+.22*lg(g.bank+g.dept*8+g.lodge*.2)+.18*lg(g.fac))
infra_raw=g.subway*14+g.rail*10+g.term*10+g.bus*.8+g.gov*1.0+g.genhosp*6+g.fac*.08
g['I']=lg(infra_raw)
g['L']=.55*lg(life_raw)+.45*((g.incf-g.incf.quantile(.03))/(g.incf.quantile(.99)-g.incf.quantile(.03))).clip(0,1)*100
for c in 'PEIL': g[c]=g[c].round().astype(int).clip(1,100)
print(g[['P','E','I','L']].describe().T.to_string())
print(g.sort_values('E',ascending=False)[['sggnm','emdnm','pop','work','P','E','I','L']].head(10).to_string())
print(g.sort_values('E')[['sggnm','emdnm','pop','work','P','E','I','L']].head(6).to_string())
print(g.sort_values('P',ascending=False)[['sggnm','emdnm','pop','work','P','E','I','L']].head(5).to_string())
# --- 인접
geo=list(g.geometry); tree=STRtree(geo)
NORTH=set('종로구 중구 용산구 성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구 은평구 서대문구 마포구'.split())
adj=[set() for _ in geo]; river=[set() for _ in geo]; riverlines=[]
for i,a in enumerate(geo):
    for j in tree.query(a.buffer(5)):
        j=int(j)
        if j<=i: continue
        L=a.boundary.intersection(geo[j].buffer(1.5)).length
        if L>=40:
            adj[i].add(j); adj[j].add(i)
            if (g.sggnm[i] in NORTH)!=(g.sggnm[j] in NORTH):
                river[i].add(j); river[j].add(i)
print('edges',sum(map(len,adj))//2,'river edges',sum(map(len,river))//2,'isolated',[g.emdnm[i] for i,s in enumerate(adj) if not s])
seen={0};st=[0]
while st:
    x=st.pop()
    for y in adj[x]:
        if y not in seen: seen.add(y);st.append(y)
print('connected',len(seen))
# --- 단순화(토폴로지 유지)
TOL=45
sim=shapely.coverage_simplify(np.array(geo),TOL)
pts=sum(shapely.get_num_coordinates(sim))
print('coords',pts,'valid',all(shapely.is_valid(sim)))
minx,miny,maxx,maxy=shapely.total_bounds(sim)
print('bounds km',(maxx-minx)/1000,(maxy-miny)/1000)
U=10 # 10m 단위
def enc_ring(c):
    out=[];px=py=0
    for x,y in c:
        X=round((x-minx)/U); Y=round((maxy-y)/U)
        out+= [X-px,Y-py]; px,py=X,Y
    return out
def enc(geom):
    polys=list(geom.geoms) if isinstance(geom,MultiPolygon) else [geom]
    polys=[p for p in polys if p.area>20000] or polys[:1]
    return [enc_ring(list(p.exterior.coords)[:-1]) for p in polys]
def enc_lines(ml):
    ls=[ml] if isinstance(ml,LineString) else list(ml.geoms)
    return [enc_ring(list(l.coords)) for l in ls if l.length>20]
# 구 경계 / 한강 / 서울 외곽 (단순화 형상에서 추출)
sg=gpd.GeoDataFrame(g.drop(columns=[g.geometry.name]),geometry=sim,crs=g.crs)
all_bd=unary_union([s.boundary for s in sim])
gu_u={k:unary_union(list(v.geometry)) for k,v in sg.groupby('sggnm')}
gub=linemerge(unary_union([u.boundary for u in gu_u.values()]))
north=unary_union([u for k,u in gu_u.items() if k in NORTH]); south=unary_union([u for k,u in gu_u.items() if k not in NORTH])
rv=north.boundary.intersection(south.buffer(3))
rv=linemerge(unary_union([l for l in (rv.geoms if hasattr(rv,'geoms') else [rv]) if isinstance(l,LineString)]))
print('river len km',rv.length/1000)
outer=unary_union(list(sim)).boundary
guname=sorted(g.sggnm.unique(),key=lambda n:g[g.sggnm==n].sggcd.iloc[0])
FIN={'강남구':60.4,'서초구':57.3,'중구':55.8,'종로구':46.7,'용산구':41.7,'영등포구':37.4,'송파구':37.4,'성동구':34.5,'마포구':33.0,'동작구':27.4,'광진구':26.1,'강동구':25.6,'양천구':25.3,'서대문구':25.2,'동대문구':23.8,'금천구':23.6,'구로구':22.1,'중랑구':21.6,'강서구':21.1,'성북구':20.7,'도봉구':20.0,'관악구':19.9,'은평구':18.1,'강북구':17.2,'노원구':16.5}
REG={'도심권':'종로구 중구 용산구','동북권':'성동구 광진구 동대문구 중랑구 성북구 강북구 도봉구 노원구','서북권':'은평구 서대문구 마포구','서남권':'양천구 강서구 구로구 금천구 영등포구 동작구 관악구','동남권':'서초구 강남구 송파구 강동구'}
g2r={x:k for k,v in REG.items() for x in v.split()}
gus=[]
for n in guname:
    c=gu_u[n].representative_point(); gus.append(dict(n=n,f=FIN[n],r=g2r[n],x=round((c.x-minx)/U),y=round((maxy-c.y)/U),north=int(n in NORTH)))
gi={n:i for i,n in enumerate(guname)}
D=[]
for i,r in g.iterrows():
    s=sim[i]; rp=s.representative_point(); b=s.bounds
    D.append(dict(n=r.emdnm,g=gi[r.sggnm],pop=int(r['pop']),work=int(r.work),km=round(r.km2,2),
      sub=int(r.subway),bus=int(r.bus),fac=int(r.fac),bank=int(r.bank),hosp=int(r.hosp+r.genhosp),ph=int(r.pharm),sch=int(r.elem+r.mid+r.high),dept=int(r.dept),rail=int(r.rail),
      P=int(r.P),E=int(r.E),I=int(r.I),L=int(r.L),est=int(r.est),
      x=round((rp.x-minx)/U),y=round((maxy-rp.y)/U),b=[round((b[0]-minx)/U),round((maxy-b[3])/U),round((b[2]-minx)/U),round((maxy-b[1])/U)],
      a=sorted(adj[i]),r=sorted(river[i]),p=enc(s)))
out=dict(w=round((maxx-minx)/U),h=round((maxy-miny)/U),gu=gus,d=D,guline=enc_lines(gub),river=enc_lines(rv),outer=enc_lines(outer))
s=json.dumps(out,ensure_ascii=False,separators=(',',':'))
open('data/game_data.json','w').write(s); print('json KB',len(s)//1024,'n',len(D))
g.drop(columns=[g.geometry.name]).to_csv('data/final_table.csv',index=False,encoding='utf-8-sig')
for n in ['소공동','여의동','상계8동','진관동','둔촌1동','역삼1동','서교동','화곡1동']:
    r=g[g.emdnm==n].iloc[0]; print(n,r.sggnm,r['pop'],r.work,'P',r.P,'E',r.E,'I',r.I,'L',r.L,'sub',r.subway,'adj',len(adj[g[g.emdnm==n].index[0]]))
print('example river pair',[(g.emdnm[i],[g.emdnm[j] for j in river[i]]) for i in range(len(g)) if river[i]][:6])
print('n dong with river edge',sum(1 for x in river if x),'bridges','subway dongs',(g.subway>0).sum())
