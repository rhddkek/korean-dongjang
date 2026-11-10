import json, re, base64, glob, os
t = open('src/index.tpl.html', encoding='utf-8').read()
data = open('data/game_data.json', encoding='utf-8').read()
cities = {c: open('data/city_%s.json' % c, encoding='utf-8').read() for c in ['busan', 'daegu', 'incheon', 'gwangju', 'daejeon', 'ulsan']}
# 도·통합·전국: gzip + base64 (화면에서 고를 때 풀어 씀)
import gzip
MODES = ['gyeonggi', 'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'gyeongbuk', 'gyeongnam', 'jeju', 'daegyeong', 'gyeongsang', 'jeonnam', 'jeolla', 'korea']
for c in MODES:
    raw = open('data/city_%s.json' % c, encoding='utf-8').read()
    cities[c] = base64.b64encode(gzip.compress(raw.encode('utf-8'), 9, mtime=0)).decode()
pre = open('tools/presets.js', encoding='utf-8').read()
eng = open('src/engine.js', encoding='utf-8').read()
ui = open('src/ui.js', encoding='utf-8').read()
sfx = {}
for f in sorted(glob.glob('raw/sfx/*.mp3')):
    k = os.path.basename(f)[:-4]
    sfx[k] = base64.b64encode(open(f, 'rb').read()).decode()
ui = re.sub(r'/\*SFX\*/\{\}/\*SFX_END\*/', lambda m: json.dumps(sfx), ui, count=1)
print('sfx files', list(sfx))
for x in (data, eng, ui, pre, *cities.values()):
    assert '</script' not in x
t = t.replace('/*DATA_seoul*/', data).replace('/*PRESETS*/', pre)
for c, v in cities.items(): t = t.replace('/*DATA_%s*/' % c, v)
t = t.replace('/*ENGINE*/', eng).replace('/*UI*/', ui)
open('dongjang.html', 'w', encoding='utf-8').write(t)
# GitHub Pages용 완전한 문서 (카톡·SNS 미리보기 포함)
SITE = 'https://rhddkek.github.io/dongjang/'
head = ('<!doctype html><html lang="ko"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<meta name="description" content="내가 사는 동에서 동장으로 시작해 시장·도지사·대통령까지. 실제 행정동 지도와 인구·상권 통계로 하는 턴제 땅따먹기 웹게임.">'
        '<meta property="og:type" content="website"><meta property="og:title" content="동장의 난">'
        '<meta property="og:description" content="우리 동네에서 동장으로 시작해 시장까지. 실제 행정동 지도로 하는 땅따먹기.">'
        '<meta property="og:image" content="' + SITE + 'og.png"><meta property="og:url" content="' + SITE + '">'
        '<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#17231C">'
        '<style>html,body{margin:0;height:100%;background:#CFD8CF}</style></head><body>')
open('index.html', 'w', encoding='utf-8').write(head + t + '</body></html>')
print('built KB', len(t.encode()) // 1024)
