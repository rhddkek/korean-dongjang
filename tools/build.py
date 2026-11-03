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
print('built KB', len(t.encode()) // 1024)
