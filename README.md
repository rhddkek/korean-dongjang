# 동장의 난

서울 427개 행정동과 광역시 6곳(부산·대구·인천·광주·대전·울산)의 실제 통계로 하는 턴제 동네 전쟁 웹게임.
동장에서 시작해 구청장 → 권역장(부시장) → 시장까지. 단일 HTML 파일 하나로 돌아갑니다.

- 게임: `dongjang.html` (열면 바로 실행, 저장은 브라우저에 남음)
- 규칙: `src/engine.js` · 화면: `src/ui.js` · 틀: `src/index.tpl.html`
- 데이터: `data/game_data.json`(서울), `data/city_*.json`(광역시)
- 빌드: `python3 tools/build.py`
- 테스트: `node tools/test2.js ~ test12.js <스크린샷폴더>` (Playwright, 휴대폰 화면)
- 자동 플레이 균형: `node tools/sim2.js`, `node tools/simcity.js`

자료 출처와 게임용 추정치에 대한 설명은 게임 메뉴의 「자료 출처」에 있습니다.
등장 단체와 사건은 모두 지어낸 것이며, 점수와 유형은 동네의 우열을 뜻하지 않습니다.
