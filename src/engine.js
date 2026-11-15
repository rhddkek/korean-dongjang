// 동장의 난 — 게임 규칙 (화면과 분리, node에서도 돌아감)
var Engine = (function () {
  'use strict';
  var C = {
    WIN_POP: 0.6, COAL_POP: 0.45, ELECT_WAIT: 3,
    GRACE: 8,            // 처음 몇 달은 AI가 플레이어를 건드리지 않음
    COST: [25, 50, 90, 150, 240],
    RECRUIT: 1.2,        // 예산 1억 = 1.2명 (고정가)
    SHARE: 0.2,         // 세력 인원 중 방어에 합류하는 비율
    SHARE_CAP: 5,
    TRACKS: ['상권', '교통', '주거', '치안'],
    GROUPS: ['번영회', '부녀회', '상인회', '조기축구회', '통장협의회', '노인회', '청년회', '산악회', '입주자대표회의', '배드민턴클럽', '학부모회', '방범대', '반상회', '테니스동호회', '자율방재단'],
    REAL: 0.75,   // 실제 규모 반영 강도: 동마다 수입·동원·방어 몫이 실제 규모의 0.75제곱에 비례 (0이면 예전 점수제, 1이면 완전 비례)
    RANKS: ['동장', '구청장', '권역장', '서울시장'], GRP: '구', UNIT: '동', KIND: 'metro', RAIL: '지하철', RAID_KM: 4,
    GU_LIMIT: [0, 3, 5, 5], GU_COST: [2, 2, 3, 3]   // 직급별 구 작전 한 번의 최대 동 수
  };
  // 통계로 자동 분류한 동네 유형. 실제 동네에 대한 평가가 아니라 게임용 각색.
  var TYPES = {
    office: { n: '오피스 타운', t: '낮에는 북적, 밤에는 적막', e: '수입 +25%, 동원 −25%', tax: 1.25, draft: 0.75 },
    busy: { n: '번화가', t: '사람이 모이면 돈도 모입니다', e: '수입 +20%', tax: 1.2 },
    station: { n: '역세권', t: '사통팔달', e: '여기서 지하철 기습을 나가도 전력이 줄지 않음', subway: 1 },
    town: { n: '대단지', t: '사람이 곧 힘', e: '동원 +25%, 수입 −10%', tax: 0.9, draft: 1.25 },
    river: { n: '강변', t: '다리만 건너면 강 건너', e: '여기서 한강을 건널 때 불이익이 절반', bridge: 1 },
    wide: { n: '넓은 땅', t: '한 바퀴 도는 데 한참', e: '방어 +25%', def: 1.25 },
    life: { n: '생활권', t: '병원도 학교도 가깝습니다', e: '방어 +10%, 민심 회복 +3', def: 1.1, heal: 3 },
    home: { n: '주택가', t: '조용하지만 손댈 곳이 많습니다', e: '상권·주거 개발 효과 +40%', devx: 1.4 }
  };
  var TRAITS = {
    fight: { word: '싸움을 좋아함', tries: 1, rec: 0.9, dev: 0.15, money: 1 },
    build: { word: '동네 개발 우선', tries: 0, rec: 0.55, dev: 0.6, money: 1 },
    rich: { word: '돈이 많음', tries: 0, rec: 0.7, dev: 0.35, money: 1.25 },
    talk: { word: '협상에 잘 응함', tries: -1, rec: 0.75, dev: 0.35, money: 1, deal: 0.7 }
  };
  // 정책 카드: 승진할 때와 6달마다 3장 중 1장. 한 판에 같은 카드는 한 번
  var CARDS = {
    redev: { n: '재개발 특구', e: '개발비 −30%. 대신 개발한 동 민심 −5', tag: '개발' },
    patrol: { n: '자율방범대', e: '우리 동 방어 +20%', tag: '방어' },
    fort: { n: '철벽 본거지', e: '본거지 방어 +60%, 본거지 옆 우리 동 방어 +20%', tag: '방어' },
    shuttle: { n: '출근 셔틀', e: '강·바다 건너는 공격의 불이익이 사라짐', tag: '공격', need: 'water' },
    express: { n: '급행 노선', e: '지하철 기습 거리 +40%, 기습 전력 +15%', tag: '공격', need: 'sub' },
    elite: { n: '정예 기동대', e: '모든 공격 전력 +12%', tag: '공격' },
    market: { n: '상인회 장악', e: '오피스·번화가·상권 동 수입 +25%', tag: '돈' },
    coupon: { n: '지역화폐', e: '수입 +10%', tag: '돈' },
    saving: { n: '관리비 절감', e: '관리비 −20%', tag: '돈' },
    bond: { n: '주민 채권', e: '지금 바로 월 수입 4달치. 대신 관리비 +10%', tag: '돈' },
    mom: { n: '부녀회 연대', e: '주택가·대단지·주거 동 동원 +25%', tag: '사람' },
    hire: { n: '공무원 특채', e: '같은 돈으로 모집 인원 +25%', tag: '사람' },
    youth: { n: '청년 동원령', e: '동원 +15%. 대신 매달 우리 동 민심 −1', tag: '사람' },
    festival: { n: '동네 축제', e: '매달 우리 동 민심 +3', tag: '민심' },
    settle: { n: '빠른 정착', e: '새로 얻은 동이 두 배 빨리 정착', tag: '민심' },
    talk: { n: '설득의 달인', e: '독립 동 설득 비용 −30%', tag: '외교' },
    diplo: { n: '외교 특보', e: '불가침 비용 −40%. 우리 세력이 2배만 돼도 통합에 응함', tag: '외교' },
    paper: { n: '결재 간소화', e: '한 달 결재 +1건', tag: '행정' },
    intel: { n: '정보망', e: '모든 지역의 안개가 걷힘', tag: '행정' }
  };
  function hasCard(s, k) { return !!(s.cards && s.cards.indexOf(k) >= 0); }
  // 선거 공약: 동 유형마다 반응이 다름 (%p)
  var PLEDGES = {
    redev: { n: '낡은 동네 재개발', e: '주택가 +8%p, 번화가 +3%p, 생활권 −3%p', fx: { home: 0.08, busy: 0.03, life: -0.03 } },
    park: { n: '공원·녹지 확대', e: '대단지·생활권 +6%p, 주택가 +3%p, 오피스 −2%p', fx: { town: 0.06, life: 0.06, home: 0.03, office: -0.02 } },
    subway: { n: '지하철 연장', e: '역 없는 동 +7%p, 넓은 땅 +4%p, 역세권 −2%p', fx: { wide: 0.04, station: -0.02 }, nosub: 0.07 },
    tax: { n: '세금 동결', e: '오피스·번화가 +6%p, 나머지 동 +1%p', fx: { office: 0.06, busy: 0.06 }, all: 0.01 }
  };
  var RESI = { home: 1, town: 1, life: 1 }, COMM = { office: 1, busy: 1, station: 1 };
  var BAD_WORDS = ['시발', '씨발', '씨빨', '병신', '좆', '개새', '지랄', '썅', '느금', '미친', '닥쳐', '꺼져', '섹스', '18놈', '니미'];
  // 세력 회장: 이름과 얼굴(화면에서 그림)의 씨앗
  var SUR = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'];
  var GIV = ['덕배', '순자', '영수', '말순', '춘자', '상철', '미숙', '용팔', '복남', '정자', '만수', '옥자', '기철', '금순', '동팔', '영자', '봉구', '경숙', '칠성', '점례', '갑수', '명자', '태식', '두리'];
  var GROUP_TRAIT = { '조기축구회': 'fight', '청년회': 'fight', '방범대': 'fight', '자율방재단': 'fight', '학부모회': 'build', '입주자대표회의': 'build', '반상회': 'build', '노인회': 'build', '상인회': 'rich', '번영회': 'rich', '통장협의회': 'talk', '부녀회': 'talk', '산악회': 'talk', '배드민턴클럽': 'talk', '테니스동호회': 'talk' };
  // 시작 동 유형별 대표 능력 (시작 동 유형에만 붙고 한 판 내내 유지)
  // 개발 단계마다 이름 붙은 시설. 3단계·5단계에는 주변까지 미치는 효과가 있다.
  var FAC = [
    ['골목시장', '상점가 간판 정비', '상인회 사무소', '전통시장 현대화', '상권 특구'],
    ['마을버스 노선', '한강 셔틀버스', '공유 자전거 거치대', '광역버스 정류장', '환승센터'],
    ['경로당', '놀이터·공원', '주민센터 증축', '청년 주택', '아파트 단지'],
    ['방범대', '방범 순찰차', '자치경찰대', '자치경찰 상황실', '자치소방서']
  ];
  var FAC_SP = [
    { 5: '옆 우리 동 수입 +10%' },
    { 5: '이 동에서 나가는 공격 전력 +15% 추가' },
    { 5: '옆 우리 동 동원 +10%' },
    { 3: '옆 우리 동 방어 +15%', 5: '이 동과 옆 우리 동은 독립하지 않음(낮은 민심의 수입·동원 손해는 그대로), 이 동 민심 회복 +5' }
  ];
  function facName(s, i, t, l) { var n = FAC[t][l - 1]; return t === 3 && l === 1 ? stem(D.d[i].n) + ' ' + n : n; }
  function nbLv(s, i, t, minLv) { var o = s.owner[i]; if (o < 0) return 0; var c = 0; D.d[i].a.forEach(function (j) { if (s.owner[j] === o && s.dev[j * 4 + t] >= minLv) c++; }); return c; }
  // 정부 공모 사업 (게임용 각색: 실제 시설의 영향에 대한 주장이 아님)
  var GOV = {
    agency: { n: '공공기관 지역본부 이전', kind: '성장 사업', cond: '교통 2단계 이상', cost: 200, prep: 3,
      gain: '완공 후 이 동 수입 +25억/월', burden: '교통 혼잡: 교통 4단계 전까지 이 동 민심 회복 −3/월' },
    hospital: { n: '공공병원 건립', kind: '생활 사업', cond: '주거 2단계 이상', cost: 150, prep: 3,
      gain: '완공 후 이 동과 옆 같은 편 동 민심 회복 +3/월, 이 동 동원 +15%', burden: '운영비 −8억/월 (가진 쪽 부담)' },
    plant: { n: '광역 자원회수시설 유치', kind: '기피 사업', cond: '본거지가 아닌 우리 동', cost: 0, prep: 2,
      gain: '착공 지원금 +150억, 2달 뒤 준공 지원금 +100억, 이후 교부금 +12억/월 (그때 가진 쪽 수령)', burden: '착공 때 이 동과 옆 우리 동 민심 −15, 협약 전까지 이 동 민심 70 상한, 운영 중 이 동 민심 회복 −2/월' },
    safety: { n: '광역 안전센터 지정', kind: '안전 사업', cond: '치안 2단계 이상', cost: 100, prep: 0,
      gain: '즉시 이 동 치안 +1단계, 이 동과 옆 우리 동 민심 +10', burden: '운영비 −5억/월 (가진 쪽 부담)' }
  };
  var GOV_ORDER = ['agency', 'plant', 'hospital', 'safety'];
  var GOV_COND = { agency: 1, hospital: 2, safety: 3 };   // 조건이 걸린 개발 분야
  function govSite(s, i) { return s.gov && s.gov.sites[i]; }
  function govDone(s, i) { var g = govSite(s, i); return g && s.month >= g.done ? g : null; }
  var ABIL = {
    office: { n: '스카우트 제안', t: '옆 세력 인원을 돈으로 데려옵니다', how: '맞닿은 세력의 동을 눌러 제안. 그 세력 인원의 20%가 우리 쪽으로 옵니다. 1명당 1.6억, 같은 세력에는 6개월에 한 번. 결재 1건.' },
    town: { n: '주민투표', t: '옆 독립 동을 투표로 합류시킵니다', how: '맞닿은 독립 동을 눌러 발의. 우리 동 전체 민심 평균 70 이상이어야 하고, 다음 달에 합류합니다. 돈은 안 들지만 결재 1건. 한 번에 하나만.' },
    station: { n: '급행 원정', t: '이번 달 지하철 기습을 연달아 나갑니다', how: '세력 화면에서 켭니다. 이번 달 지하철 기습은 전력 +15%, 처음 3번은 살아남은 인원이 바로 돌아와 같은 달에 또 나갈 수 있습니다. 비용은 한 달 수입의 절반(최대 120억), 3개월에 한 번. 거리는 그대로입니다.' },
    other: { n: '반상회 소집', t: '동네 전체 민심을 한 번에 올립니다', how: '세력 화면에서 소집. 우리 동 전체 민심 +20, 비용은 한 달 수입. 8개월에 한 번.' }
  };
  var PROJECTS = {
    unity: { n: '주민 화합 사업', t: '한 구의 우리 동 민심을 100으로 올리고 6개월간 독립을 막습니다' },
    express: { n: '광역 급행 사업', t: '역이 있는 우리 동의 기습 거리를 영구히 5.5km로 늘립니다 (한 판에 한 번)' }
  };
  var RIVAL_LINES = ['우리 구에서는 아직도 동장님이라고 부릅니다.', '결재 서류 그만 올리시고 회의나 나오시죠.', '동네 일은 단톡방에서 정하는 겁니다.', '다음 달 정기 모임 안건은 당신네 동입니다.', '주차 문제부터 해결하고 오시죠.', '회비도 안 내면서 무슨 서울시장입니까.', '우리 회장님 인맥이면 구청 앞 민원은 금방입니다.'];
  // 사건: 금액은 그 달 수입 배수(money), 인원은 그 달 동원 배수(troops), mood는 전체 민심
  var EVENTS = [
    { t: '새벽 노랫소리', b: '새벽마다 들리는 노랫소리를 찾아 달라는 민원이 들어왔습니다. 범인은 조기축구회 회장님의 노래 연습이었습니다.', c: [
      { l: '노래방 이용권 지원', x: { money: -0.5, mood: 4 }, r: '회장님이 노래방으로 옮겼습니다. 동네가 조용해졌습니다.' },
      { l: '모른 척하기', x: { mood: -4 }, r: '오늘도 새벽 네 시에 트로트가 울립니다.' },
      { l: '홍보대사로 임명', x: { troops: 1, mood: -2 }, r: '회장님이 감격해서 회원들을 데려왔습니다. 노래는 계속됩니다.' }] },
    { t: '옆 동네 단톡방 분열', b: '이웃 세력 단톡방에서 회비 문제로 싸움이 났습니다. 캡처본이 우리 쪽까지 넘어왔습니다.', c: [
      { l: '구경만 하기', x: {}, r: '팝콘만 축냈습니다.' },
      { l: '중재해 주는 척하기', x: { money: -0.3, foe: 0.15 }, r: '중재하러 갔다가 양쪽 다 더 화났습니다. 상대 인원이 빠졌습니다.' },
      { l: '캡처본 퍼뜨리기', x: { foe: 0.3, mood: -3 }, r: '상대는 흔들렸지만 우리 동네에서도 뒷말이 나옵니다.' }] },
    { t: '동네 축제 예산', b: '올해 축제를 어떻게 할지 주민 의견이 갈립니다. 작년 초청 가수는 아직도 회자됩니다.', c: [
      { l: '크게 연다', x: { money: -1, mood: 8 }, r: '이틀 내내 동네가 시끄럽고 다들 즐거워합니다.' },
      { l: '소박하게 연다', x: { money: -0.3, mood: 3 }, r: '국수는 맛있었다는 평입니다.' },
      { l: '취소하고 예산 환수', x: { money: 0.5, mood: -6 }, r: '현수막만 남았습니다. 민심이 떨어졌습니다.' }] },
    { t: '아파트 대표 회의', b: '옆 독립 동 아파트 대표들이 회의에 불렀습니다. 요구 조건은 주차장 증설입니다.', c: [
      { l: '요구를 들어주기', x: { money: -1.5, join: 1 }, r: '주차장을 약속하고 옆 동을 얻었습니다.' },
      { l: '사진만 찍고 나오기', x: { troops: 0.3, mood: -2 }, r: '소식지 1면에 실렸습니다. 약속은 없었습니다.' },
      { l: '안 간다', x: {}, r: '회의록에 불참으로 적혔습니다.' }] },
    { t: '막차 대란', b: '심야에 집에 못 가는 주민이 늘었습니다. 대책을 내놓으라는 전화가 옵니다.', c: [
      { l: '심야 버스 증차', x: { money: -0.6, mood: 5 }, r: '막차 걱정이 줄었습니다.' },
      { l: '동원 인원으로 카풀', x: { troops: -0.5, mood: 6 }, r: '우리 쪽 인원이 운전대를 잡았습니다. 평이 좋습니다.' },
      { l: '각자 귀가', x: { mood: -5 }, r: '택시 앱만 바빠졌습니다.' }] },
    { t: '동장배 족구대회', b: '옆 동네가 족구 시합을 걸어왔습니다. 이기면 그쪽 주민들이 우리 편이 되겠답니다.', c: [
      { l: '출전한다', x: { chance: 0.55, good: { join: 1, mood: 2 }, bad: { troops: -0.5 } }, r: '시합이 끝났습니다.', rg: '이겼습니다. 옆 동이 우리 편이 됐습니다.', rb: '졌습니다. 회식비까지 물었습니다.' },
      { l: '응원만 한다', x: { money: -0.1, mood: 2 }, r: '치킨을 돌렸습니다.' },
      { l: '불참', x: {}, r: '옆 동네가 부전승이라고 현수막을 걸었습니다.' }] },
    { t: '쓰레기 무단 투기', b: '골목 쓰레기 민원이 쌓였습니다. 범인을 찾아 달라는 요구가 거셉니다.', c: [
      { l: 'CCTV 설치', x: { money: -0.5, mood: 4 }, r: '골목이 깨끗해졌습니다.' },
      { l: '경고문 붙이기', x: { mood: 1 }, r: '경고문 앞에 쓰레기가 놓였습니다.' },
      { l: '범인 찾아 나서기', x: { chance: 0.5, good: { mood: 6 }, bad: { mood: -6 } }, r: '추적이 끝났습니다.', rg: '범인을 찾았습니다. 주민들이 박수를 쳤습니다.', rb: '범인은 통장님 댁 조카였습니다. 분위기가 싸늘합니다.' }] },
    { t: '길고양이 급식소', b: '급식소를 놓자는 쪽과 치우자는 쪽이 반상회에서 맞붙었습니다.', c: [
      { l: '급식소 설치', x: { money: -0.3, mood: 3 }, r: '고양이들이 동장실 앞에 줄을 섭니다.' },
      { l: '철거', x: { mood: -4 }, r: '항의 쪽지가 문에 붙었습니다.' },
      { l: '구청에 넘기기', x: { mood: -1 }, r: '담당자가 휴가 중입니다.' }] },
    { t: '주차 전쟁', b: '밤마다 이중 주차 때문에 고성이 오갑니다. 차 빼 달라는 전화가 동장실로 옵니다.', c: [
      { l: '공영 주차장 짓기', x: { money: -1, mood: 7 }, r: '드디어 차를 댈 곳이 생겼습니다.' },
      { l: '단속 강화', x: { money: 0.5, mood: -5 }, r: '과태료는 걷혔지만 욕도 같이 걷혔습니다.' },
      { l: '이중 주차 허용', x: { mood: 2, troops: -0.3 }, r: '아침마다 차 빼느라 인원이 지각합니다.' }] },
    { t: '경로당 안마의자', b: '어르신들이 경로당 안마의자가 고장 났다고 하십니다. 투표율 높은 분들입니다.', c: [
      { l: '새로 사 드린다', x: { money: -0.5, mood: 3, troops: 0.5 }, r: '어르신들이 손주까지 데려오셨습니다.' },
      { l: '다음에 한다', x: { mood: -3 }, r: '다음이 언제냐는 전화가 매일 옵니다.' }] },
    { t: '맛집 방송 출연', b: '방송국에서 우리 동 국밥집을 찍겠답니다. 줄이 길어지면 민원도 길어집니다.', c: [
      { l: '적극 밀어주기', x: { money: 1, mood: -2 }, r: '수입는 늘고 골목은 막혔습니다.' },
      { l: '동장이 직접 출연', x: { chance: 0.5, good: { money: 1.5 }, bad: { mood: -5 } }, r: '방송이 나갔습니다.', rg: '국밥을 맛있게 먹는 표정이 화제가 됐습니다.', rb: '국밥에 소금을 너무 쳐서 사장님이 화났습니다.' },
      { l: '조용히 넘기기', x: {}, r: '다른 동네 국밥집이 나왔습니다.' }] },
    { t: '옆 동에서 온 떡', b: '이웃 동에서 개업 떡을 보내왔습니다. 답례를 어떻게 할지 고민입니다.', c: [
      { l: '더 큰 떡으로 답례', x: { money: -0.2, chance: 0.3, good: { join: 1 }, bad: { mood: 1 } }, r: '떡을 보냈습니다.', rg: '떡에 감동한 옆 동이 합치자고 합니다.', rb: '떡만 오갔습니다.' },
      { l: '그냥 먹는다', x: { mood: 1 }, r: '맛있었습니다.' }] }
  ];
  // ---- 도시 설정: 서울이 기본, 광역시는 setCity로 바꿈 ----
  var CITY = { id: 'seoul', name: '서울', water: '한강', r2: 4 };
  function waterShuttle(w) { return w === '한강' ? '한강 셔틀버스' : w && w.indexOf('바다') >= 0 ? '연안 셔틀버스' : w ? w + ' 셔틀버스' : '도심 셔틀버스'; }
  // 모드: 광역시(기본) / 도(prov) / 통합(combo) / 전국(nation). 직급·묶음 이름이 바뀜
  function setCity(c) {
    CITY = c;
    var m = c.mode || {};
    C.KIND = m.kind || 'metro';
    C.RANKS = m.kind ? [m.kind === 'nation' ? '시장·군수·구청장' : '읍면동장', m.r1, m.r2, m.final] : ['동장', '구청장', c.id === 'seoul' ? '권역장' : '부시장', c.name + '시장'];
    C.GRP = m.grp || '구'; C.UNIT = m.unit || '동';
    C.RAIL = m.rail || '지하철'; C.RAID_KM = m.raid || 4;
    C.R2 = c.r2;
    TYPES.river.e = '여기서 ' + J(c.water || '강', '을', '를') + ' 건널 때 불이익이 절반';
    TYPES.river.t = c.water === '바다' ? '다리 하나면 섬과 뭍이 이어집니다' : '다리만 건너면 강 건너';
    FAC[1][1] = waterShuttle(c.water);
  }
  var D = null, SUBWAY = null, SUBWAY6 = null, SUBWAY7 = null, TOTALPOP = 0, GUDONGS = null, GUREG = null;

  // 실제 규모 반영: 지도 전체 합계는 그대로 두고, 동마다 몫을 실제 인구·경제 규모의 C.REAL 제곱에 비례해 나눔
  //   동원 ← 주민 수, 수입 ← 직장인 + 주민 0.35 (+인프라·생활 약간), 방어 ← 주간 인구(주민 + 직장인 절반) + 넓이 약간
  function realScale(list) {
    var a = C.REAL; if (!a) return;
    function spread(key, mass, floor) {
      var tot = 0, w = 0, ws = list.map(function (d) { var x = Math.pow(Math.max(1, mass(d)), a); w += x; tot += d[key + '0']; return x; });
      list.forEach(function (d, i) { d[key] = Math.max(floor, tot * ws[i] / w); });
    }
    spread('draft', function (d) { return d.pop; }, 1.2);
    spread('tax', function (d) { return (d.work + d.pop * 0.35) * (1 + (d.I - 50) * 0.002 + (d.L - 50) * 0.002); }, 1.5);
    spread('base', function (d) { return d.pop + d.work * 0.5; }, 14);
    list.forEach(function (d) { d.base += Math.min(d.km * 2, 20); });
    // 관리비·동원 효율은 '동 개수' 대신 규모 가중 개수로: 작은 면·동은 0.25개~1개로 셈
    var avg = list.reduce(function (x, d) { return x + d.tax + d.draft * 1.5; }, 0) / list.length;
    list.forEach(function (d) { d._w = Math.max(0.25, Math.min(1, (d.tax + d.draft * 1.5) / avg)); });
  }
  function nEff(list) { return C.REAL ? list.reduce(function (x, i) { return x + D.d[i]._w; }, 0) : list.length; }
  function setData(data) {
    D = data;
    TOTALPOP = 0; ROLE_TH = null;
    GUDONGS = data.gu.map(function () { return []; });
    data.d.forEach(function (d, i) {
      TOTALPOP += d.pop; GUDONGS[d.g].push(i);
      d._adj = d.a; d._river = {};
      d.r.forEach(function (j) { d._river[j] = 1; });
      d.base = 30 + d.P * 1.5 + d.I * 0.7 + Math.min(d.km * 5, 40);
      d.tax = 3 + d.E * 0.28 + d.I * 0.05 + d.L * 0.06;
      d.draft = 4 + d.P * 0.18;
      d.base0 = d.base; d.tax0 = d.tax; d.draft0 = d.draft;
      d.type = d.ty || (d.work >= 30000 || (d.work > d.pop * 2 && d.work >= 8000) ? 'office' : d.sub >= 3 ? 'station' : (d.P >= 82 && d.work < d.pop * 0.5) ? 'town' : d.fac >= 230 ? 'busy' : d.r.length > 0 ? 'river' : d.km >= 3.5 ? 'wide' : d.L >= 55 ? 'life' : 'home');
    });
    realScale(data.d);
    // 지하철 기습: 역이 있는 동끼리 4km 이내 (전국 모드는 KTX 역끼리 더 멀리)
    var R0 = C.RAID_KM * 100, R7 = R0 * 1.375, R6 = R0 * 1.5;
    SUBWAY = data.d.map(function () { return []; }); SUBWAY6 = data.d.map(function () { return []; }); SUBWAY7 = data.d.map(function () { return []; });
    var subs = [];
    data.d.forEach(function (d, i) { if (d.sub > 0) subs.push(i); });
    subs.forEach(function (i) {
      subs.forEach(function (j) {
        if (i === j || data.d[i].a.indexOf(j) >= 0) return;
        var dx = data.d[i].x - data.d[j].x, dy = data.d[i].y - data.d[j].y, q = dx * dx + dy * dy;
        if (q <= R0 * R0) SUBWAY[i].push(j);
        if (q <= R7 * R7) SUBWAY7[i].push(j);
        if (q <= R6 * R6) SUBWAY6[i].push(j);
      });
    });
  }

  function rnd(s) {
    s.seed = (s.seed + 0x6D2B79F5) | 0;
    var t = s.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pick(s, a) { return a[Math.floor(rnd(s) * a.length)]; }
  function bat(w) {
    var c = String(w).charCodeAt(String(w).length - 1);
    if (c >= 0xAC00 && c <= 0xD7A3) return (c - 0xAC00) % 28;
    return /[136780]$/.test(String(w)) ? 1 : 0;
  }
  function J(w, a, b) { return w + (bat(w) ? a : b); }
  function ro(w) { var b = bat(w); return w + (b && b !== 8 ? '으로' : '로'); }
  function stem(name) {
    var n = name.replace(/^\S+ /, '');   // '서울 강남구' → '강남구'
    var m = n.match(/^([가-힣]+?)(제?\d.*)?동$/);
    if (m) return m[1];
    var k = n.replace(/(읍|면|시|군|구)$/, '');
    return k.length >= 2 ? k : n;
  }
  // 칸·묶음 이름에 붙는 직함: 소공동 동장 / 애월읍 읍장 / 포항시장 / 양평군수 / 서울 강남구청장 / 경기도지사
  function headOf(n) {
    if (n === '세종') return '세종시장';
    var l = n.charAt(n.length - 1);
    if (l === '동' || l === '읍' || l === '면' || l === '가' || l === '리') return n + ' ' + (l === '읍' ? '읍장' : l === '면' ? '면장' : '동장');
    return n + (l === '구' ? '청장' : l === '군' ? '수' : l === '도' ? '지사' : '장');
  }
  function officeOf(n) { var h = headOf(n); return stem(n) + ' ' + (/읍장$/.test(h) ? '읍장실' : /면장$/.test(h) ? '면장실' : /동장$/.test(h) ? '동장실' : /청장$/.test(h) ? '구청' : /군수$/.test(h) ? '군청' : '시청'); }

  function create(data, start, seed) {
    if (D !== data) setData(data);
    var n = data.d.length;
    var s = {
      v: 2, seed: seed | 0, seed0: seed | 0, month: 0, start: start, won: false, over: false, keepPlaying: false,
      owner: new Array(n).fill(-1), min: new Array(n).fill(100),
      dev: new Array(n * 4).fill(0),
      f: [], ap: 2, rank: 0, log: [], last: [],
      stat: { took: 0, lost: 0, sent: 0, home: 0, built: 0, merged: 0, biggest: 0, talked: 0, raid: 0, bridge: 0, guop: 0, events: 0 },
      ev: null, evUsed: [], nextEv: 4 + Math.floor((seed >>> 3) % 3), rival: -1, rivalAt: 0,
      weakAt: -9, gov: { open: null, sites: {}, nextAt: 6, idx: 0 }, abil: abilityOf(data.d[start].type), scoutAt: {}, vote: null, express: -99, rallyAt: -99, stable: {}, exprProj: false, rivalPlan: null, awayLate: 0,
      cards: [], cardOffer: null, cardQ: 0, cardNext: 6, coal: null, elect: null, camp: null, zones: [], zoneSeq: 0
    };
    var me = { id: 0, name: officeOf(data.d[start].n), cap: start, money: Math.max(60, Math.round(30 + data.d[start].E * 2)), troops: Math.max(230, Math.round(130 + data.d[start].P * 1.9)), away: 0, ai: false, alive: true, c: 0, pact: {}, grudge: 0 };
    s.f.push(me);
    s.owner[start] = 0;
    var ban = {}; ban[start] = 1; data.d[start].a.forEach(function (j) { ban[j] = 1; });
    var used = {};
    GUDONGS.forEach(function (list, g) {
      var c = list.filter(function (i) { return !ban[i]; });
      c.sort(function (a, b) { return (data.d[b].P + data.d[b].E) - (data.d[a].P + data.d[a].E); });
      c = c.slice(0, Math.max(1, Math.ceil(c.length * 0.6)));
      // 광역시: 도시 전체 세력 수를 동 15개당 하나(최소 8개)로 맞추고 구 크기대로 나눔
      var k = CITY.id === 'seoul' ? 1 : Math.max(C.KIND === 'nation' ? 0 : 1, Math.round(Math.max(8, data.d.length / 15) * list.length / data.d.length));
      for (var q = 0; q < k && c.length; q++) {
        var w = pick(s, c);
        if (w === undefined) return;
        addFaction(s, w, 170 + rnd(s) * 80);
        c = c.filter(function (x) { return x !== w && data.d[w].a.indexOf(x) < 0; });
      }
    });
    s.ap = maxAP(s);
    s.hist = { o0: s.owner.slice(), m0: 0, d: [] }; s.hp = s.owner.slice();
    pushLog(s, J(headOf(data.d[start].n), '에', '에') + ' 취임했습니다. 옆 동네가 눈에 들어옵니다.');
    return s;
  }
  function abilityOf(type) { return ABIL[type] ? type : 'other'; }
  function addFaction(s, cap, troops) {
    var used = {};
    s.f.forEach(function (x) { if (x.alive) used[x.grp] = (used[x.grp] || 0) + 1; });
    var g = pick(s, C.GROUPS);
    var id = s.f.length;
    s.f.push({ id: id, name: stem(D.d[cap].n) + ' ' + g, grp: g, cap: cap, money: 50, troops: troops, away: 0, ai: true, alive: true, c: id, grudge: 0, tookMine: 0, lostAt: -9, hate: 0, warm: 0, boss: { nm: pick(s, SUR) + pick(s, GIV), face: Math.floor(rnd(s) * 1e6) } });
    s.owner[cap] = id;
    return id;
  }
  // 회장의 감정: 원한(hate)·호감(warm) 0~100. 우리가 치면 원한, 협정을 지키면 호감
  function feel(s, fid, dh, dw) {
    var f = s.f[fid]; if (!f || !f.ai) return;
    f.hate = Math.max(0, Math.min(100, (f.hate || 0) + (dh || 0)));
    f.warm = Math.max(0, Math.min(100, (f.warm || 0) + (dw || 0) - (dh > 0 ? dh : 0)));
  }
  function moodOf(s, fid) { var f = s.f[fid]; if (!f || !f.ai) return ''; return (f.hate || 0) >= 55 ? 'grudge' : (f.hate || 0) >= 25 ? 'wary' : (f.warm || 0) >= 40 ? 'warm' : ''; }
  function pushLog(s, t, kind, at) {
    var e = { m: s.month, t: t, k: kind || 'n' };
    if (at !== undefined) e.at = at;   // 누르면 이동할 동
    s.log.unshift(e);
    if (s.log.length > 80) s.log.length = 80;
    s.last.push(e);
  }

  function lv(s, i, t) { return s.dev[i * 4 + t]; }
  function mood(s, i) { return 0.5 + 0.5 * s.min[i] / 100; }
  // 설득·투표·통합으로 들어온 동: 첫 달 50%에서 매달 +15%p (주거·치안 단계마다 +5%p 더)
  function settleRate(s, i) { return (0.15 + 0.05 * (lv(s, i, 2) + lv(s, i, 3))) * (s.owner[i] === 0 && hasCard(s, 'settle') ? 2 : 1); }
  function settleF(s, i) {
    if (s.owner[i] !== 0 || !s.settle || s.settle[i] === undefined) return 1;
    var m = Math.max(0, s.month - s.settle[i] - 1);
    return Math.min(1, 0.5 + m * settleRate(s, i));
  }
  function settleLeft(s, i) { var f = settleF(s, i); return f >= 1 ? 0 : Math.ceil((1 - f) / settleRate(s, i)); }
  function joinSoft(s, i) { if (!s.settle) s.settle = {}; s.settle[i] = s.month; }
  // ---- 동네 조합: 맞닿은 동을 묶어 확보하면 그 동들에만 보너스 (종류마다 한 판에 한 번) ----
  var COMBO = {
    jj: { n: '직주근접 생활권', t: '일터 동 하나와 맞닿은 주거 동 둘 이상', fx: '이 생활권 동원 +20%' },
    mk: { n: '골목상권 연합', t: '서로 이어진 상권 동 셋 이상', fx: '이 동들 상권 개발비 −30%' },
    tr: { n: '환승 생활권', t: '지하철로 이어진 역세권 동 셋 이상 (역이 흔한 도시는 역 2개 이상인 동)', fx: '이 동들에서 나가는 지하철 기습 불이익 없음, 전력 +10%' }
  };
  // 도시마다 기준을 상대값으로: 일터는 경제 상위 8%, 상권은 상위 12%, 역세권은 역이 흔한 도시면 역 2개 이상
  var ROLE_TH = null;
  function roleTh() {
    if (ROLE_TH) return ROLE_TH;
    var es = D.d.map(function (d) { return d.E; }).sort(function (a, b) { return b - a; }), ps = D.d.map(function (d) { return d.P; }).sort(function (a, b) { return a - b; });
    var subShare = D.d.filter(function (d) { return d.sub > 0; }).length / D.d.length;
    ROLE_TH = { work: es[Math.floor(es.length * 0.08)], mk: es[Math.floor(es.length * 0.12)], p: ps[Math.floor(ps.length * 0.5)], sub: subShare > 0.35 ? 2 : 1 };
    return ROLE_TH;
  }
  function roleOf(d) {
    var th = roleTh(), r = [];
    if (d.type === 'office' || d.E >= th.work) r.push('일터');
    if (d.type === 'town' || ((d.type === 'home' || d.type === 'life') && d.P >= th.p)) r.push('주거');
    if (d.E >= th.mk || d.type === 'busy') r.push('상권');
    if (d.sub >= th.sub) r.push('역세권');
    return r;
  }
  function hasRole(i, r) { var d = D.d[i]; return (d._role || (d._role = roleOf(d))).indexOf(r) >= 0; }
  function comboOn(s, k, i) { var c = s.combo && s.combo[k]; return !!(c && c.d.indexOf(i) >= 0 && c.d.every(function (j) { return s.owner[j] === 0; })); }
  // 우리 동만으로 만들 수 있는 조합 묶음 찾기 (must: 꼭 들어가야 하는 동)
  function findCombo(s, k, must) {
    var own = function (i) { return s.owner[i] === 0; }, best = null;
    if (k === 'jj') {
      for (var i = 0; i < s.owner.length; i++) {
        if (!own(i) || !hasRole(i, '일터')) continue;
        var res = D.d[i].a.filter(function (j) { return own(j) && hasRole(j, '주거'); }).sort(function (a, b) { return D.d[b].pop - D.d[a].pop; }).slice(0, 3);
        if (res.length < 2) continue;
        var g = [i].concat(res);
        if (must !== undefined && g.indexOf(must) < 0) continue;
        var v = res.reduce(function (a, j) { return a + D.d[j].pop; }, 0);
        if (!best || v > best.v) best = { d: g, v: v };
      }
      return best && best.d;
    }
    var role = k === 'mk' ? '상권' : '역세권', seen = {};
    for (var q = 0; q < s.owner.length; q++) {
      if (seen[q] || !own(q) || !hasRole(q, role)) continue;
      var comp = [], st = [q]; seen[q] = 1;
      while (st.length) {
        var x = st.pop(); comp.push(x);
        var nb = k === 'tr' ? D.d[x].a.concat(SUBWAY[x]) : D.d[x].a;
        nb.forEach(function (y) { if (!seen[y] && own(y) && hasRole(y, role)) { seen[y] = 1; st.push(y); } });
      }
      if (comp.length < 3) continue;
      if (must !== undefined && comp.indexOf(must) < 0) continue;
      comp.sort(function (a, b) { return (must === b) - (must === a) || D.d[b].E - D.d[a].E; });
      var g2 = comp.slice(0, 5);
      if (!best || g2.length > best.length) best = g2;
    }
    return best;
  }
  function checkCombos(s) {
    if (!s.combo) s.combo = {};
    var made = [];
    Object.keys(COMBO).forEach(function (k) {
      if (s.combo[k]) return;
      var g = findCombo(s, k);
      if (g) { s.combo[k] = { d: g, at: s.month }; made.push(k); pushLog(s, COMBO[k].n + ' 완성: ' + g.map(function (i) { return D.d[i].n; }).join('·') + '. ' + COMBO[k].fx + '.', 'good'); }
    });
    if (made.length) s.comboNew = made;
    return made;
  }
  // 이 동을 얻으면 완성되는 조합과 지금 기준 효과
  function comboPreview(s, t) {
    if (s.owner[t] === 0) return [];
    var keep = s.owner[t], out = [];
    s.owner[t] = 0;
    Object.keys(COMBO).forEach(function (k) {
      if (s.combo && s.combo[k]) return;
      var g = findCombo(s, k, t);
      if (!g) return;
      var gain = '';
      if (k === 'jj') { var dd = drafted(nEff(dongsOf(s, 0))), v = g.reduce(function (a, j) { return a + draftOf(s, j); }, 0) * 0.2 * dd; gain = '동원 +' + Math.max(1, Math.round(v)) + '명/월'; }
      else if (k === 'mk') gain = g.length + '개 동 상권 개발비 −30%';
      else gain = g.length + '개 역세권에서 지하철 기습 불이익 없음';
      out.push({ k: k, n: COMBO[k].n, d: g, gain: gain });
    });
    s.owner[t] = keep;
    return out;
  }
  function dongsOf(s, fid) { var r = []; for (var i = 0; i < s.owner.length; i++) if (s.owner[i] === fid) r.push(i); return r; }
  function fullGu(s, fid, g) { return GUDONGS[g].every(function (i) { return s.owner[i] === fid; }); }
  // 개발의 대가: 주거를 올리면 상가가 줄고, 번화가에 치안을 올리면 손님이 줄어듦
  function sideTaxF(s, i) { var d = D.d[i], f = 1 - lv(s, i, 2) * (COMM[d.type] ? 0.08 : 0.04); if (COMM[d.type]) f -= lv(s, i, 3) * 0.05; return Math.max(0.5, f); }
  function devSide(s, i, t) {
    var d = D.d[i], o = s.owner[i];
    if (t === 0) {
      var nb = d.a.filter(function (j) { return s.owner[j] === o && o >= 0 && RESI[D.d[j].type]; });
      var self = RESI[d.type] ? 4 : 0;
      return { t: 0, mood: self, nb: nb, text: (self ? '이 동 민심 −4' : '') + (nb.length ? (self ? ', ' : '') + '옆 주거 동 ' + nb.length + '곳 민심 −2' : '') };
    }
    if (t === 1) return { t: 1, text: '이 동 방어 −5%' };
    if (t === 2) return { t: 2, text: '이 동 수입 −' + (COMM[d.type] ? 8 : 4) + '%' };
    return { t: 3, text: COMM[d.type] ? '이 동 수입 −5%' : '' };
  }
  function applyDevSide(s, i, t) {
    if (t !== 0) return;
    var sd = devSide(s, i, 0);
    if (sd.mood) s.min[i] = Math.max(10, s.min[i] - sd.mood);
    sd.nb.forEach(function (j) { s.min[j] = Math.max(10, s.min[j] - 2); });
  }

  function taxOf(s, i, fullMap) {
    var d = D.d[i], f = s.owner[i];
    var T = TYPES[d.type];
    var v = (d.tax * (T.tax || 1) + lv(s, i, 0) * 7 * (T.devx || 1)) * mood(s, i) * (1 + 0.1 * Math.min(2, nbLv(s, i, 0, 5)));
    if (f >= 0 && s.f[f].cap === i) v *= 1.3;
    v *= settleF(s, i);
    if (fullMap && fullMap[d.g]) v *= 1 + D.gu[d.g].f / 100;
    if (f === 0 && hasCard(s, 'market') && (d.type === 'office' || d.type === 'busy' || hasRole(i, '상권'))) v *= 1.25;
    v *= sideTaxF(s, i);
    if (f === 0 && s.zones && s.zones.length && zoneOf(s, i)) v *= 1.05;
    return v;
  }
  function draftOf(s, i) {
    var d = D.d[i], f = s.owner[i];
    var T = TYPES[d.type];
    var v = (d.draft * (T.draft || 1) + lv(s, i, 2) * 6 * (T.devx || 1)) * mood(s, i) * (1 + 0.1 * Math.min(2, nbLv(s, i, 2, 5)));
    if (f >= 0 && s.f[f].cap === i) v *= 1.2;
    v *= settleF(s, i);
    var gs = govDone(s, i); if (gs && gs.k === 'hospital') v *= 1.15;
    if (f === 0 && comboOn(s, 'jj', i)) v *= 1.2;
    if (f === 0 && hasCard(s, 'mom') && (d.type === 'home' || d.type === 'town' || hasRole(i, '주거'))) v *= 1.25;
    return v;
  }
  function fullMapOf(s, fid, list) {
    var m = {}, seen = {};
    list.forEach(function (i) { seen[D.d[i].g] = 1; });
    Object.keys(seen).forEach(function (g) { if (fullGu(s, fid, +g)) m[g] = 1; });
    return m;
  }
  // 정부 사업이 이 동에서 더하거나 빼는 수입
  function govTaxOf(s, i) {
    var g = govDone(s, i); if (!g) return 0;
    return g.k === 'agency' ? 25 * mood(s, i) : g.k === 'plant' ? 12 : g.k === 'hospital' ? -8 : g.k === 'safety' ? -5 : 0;
  }
  // 시설이 이번 달 벌어 준 것: 상권 특구·아파트 단지의 옆 동 몫, 정부 사업 수입
  function facReport(s) {
    var mine = dongsOf(s, 0), fm = fullMapOf(s, 0, mine), out = { tax: 0, draft: 0, items: [] }, dd = drafted(nEff(mine));
    mine.forEach(function (i) {
      [0, 2].forEach(function (t) {
        if (lv(s, i, t) < 5) return;
        var v = 0, n = 0;
        D.d[i].a.forEach(function (j) {
          if (s.owner[j] !== 0) return;
          var k = Math.min(2, nbLv(s, j, t, 5)); if (!k) return;
          var x = t === 0 ? taxOf(s, j, fm) : draftOf(s, j) * dd;
          v += x * (0.1 * k / (1 + 0.1 * k)) / k; n++;
        });
        if (v > 0) { out.items.push({ i: i, t: t, v: v, n: n, name: stem(D.d[i].n) + ' ' + facName(s, i, t, 5) }); if (t === 0) out.tax += v; else out.draft += v; }
      });
      var g = govDone(s, i);
      if (g && (g.k === 'agency' || g.k === 'plant')) { var gv = govTaxOf(s, i); out.tax += gv; out.items.push({ i: i, t: 'gov', v: gv, n: 0, name: D.d[i].n + ' ' + GOV_SHORT(g.k) }); }
    });
    out.items.sort(function (a, b) { return b.v - a.v; });
    return out;
  }
  // 관리비: 동이 늘수록 가파르게. 서울(427동)보다 큰 지도는 그만큼 완만하게 늘림 (넓은 도 지도에서도 60%까지 갈 수 있게)
  function upkeep0(n) { return n <= 1 ? 0 : 1.6 * Math.pow(n, 1.3) + (n > 30 ? 0.5 * Math.pow(n - 30, 1.45) : 0); }
  function upkeep(n) { var k = D ? Math.max(1, D.d.length / 427) : 1; return k === 1 ? upkeep0(n) : upkeep0(n / k) * k; }
  function drafted(n) { return n <= 15 ? 1 : Math.pow(15 / n, 0.3); }
  function economy(s, fid) {
    var list = dongsOf(s, fid), fm = fullMapOf(s, fid, list), tax = 0, draft = 0;
    var govIn = 0, govOut = 0;
    list.forEach(function (i) {
      tax += taxOf(s, i, fm); draft += draftOf(s, i);
      var gt = govTaxOf(s, i); tax += gt; if (gt > 0) govIn += gt; else govOut -= gt;
    });
    var ne = nEff(list), up = upkeep(ne);
    draft *= drafted(ne);
    if (fid === 0) {
      if (hasCard(s, 'coupon')) tax *= 1.1;
      if (hasCard(s, 'youth')) draft *= 1.15;
      up *= (hasCard(s, 'saving') ? 0.8 : 1) * (hasCard(s, 'bond') ? 1.1 : 1);
    }
    var aidTax = 0, aidDraft = 0;
    if (fid === 0 && list.length && list.length <= 3) {   // 약소 동 지원금
      aidTax = Math.max(0, 16 - tax); aidDraft = Math.max(0, 12 - draft);
      tax += aidTax; draft += aidDraft;
    }
    return { n: list.length, tax: tax, draft: draft, up: up, net: tax - up, decay: s.f[fid].troops * 0.015, full: Object.keys(fm).length, aidTax: aidTax, aidDraft: aidDraft, govIn: govIn, govOut: govOut };
  }
  function defense(s, i) {
    var d = D.d[i], o = s.owner[i];
    var base = d.base * (TYPES[d.type].def || 1) * (1 + 0.35 * lv(s, i, 3)) * (0.6 + 0.4 * s.min[i] / 100) * (1 + 0.15 * Math.min(2, nbLv(s, i, 3, 3))) * (1 - 0.05 * lv(s, i, 1));
    var share = 0;
    if (o >= 0) {
      var isCap = s.f[o].cap === i;
      if (isCap) base *= 1.35 * (o === 0 ? 1 : 1 + Math.min(1.2, dongsOf(s, o).length * 0.06));   // 큰 세력일수록 본거지가 단단함
      if (o === 0) {
        if (hasCard(s, 'patrol')) base *= 1.2;
        if (hasCard(s, 'fort')) base *= isCap ? 1.6 : D.d[s.f[0].cap].a.indexOf(i) >= 0 ? 1.2 : 1;
      }
      var alert = o === 0 && !isCap && s.rivalPlan && s.rivalPlan.t === i;   // 예고된 동은 주민들이 대비해 대기 인원을 더 받음
      share = o === 0 ? Math.min(s.f[o].troops * (isCap ? 0.4 : alert ? 0.3 : 0.24), base * (alert ? 8 : 3)) : Math.min(s.f[o].troops * (isCap ? 0.4 : C.SHARE), base * C.SHARE_CAP);
    }
    return { base: base, share: share, total: base + share };
  }

  // 공격 경로: 땅 / 한강 다리 / 지하철 중 가장 유리한 것
  function route(s, fid, t) {
    var d = D.d[t], best = null;
    function consider(src, via, mult) {
      var sd = D.d[src];
      var m = mult + lv(s, src, 1) * 0.07 + sd.I * 0.001 + (lv(s, src, 1) >= 5 ? 0.15 : 0);
      if (!best || m > best.mult) best = { src: src, via: via, mult: m };
    }
    d.a.forEach(function (j) {
      if (s.owner[j] !== fid) return;
      var free = lv(s, j, 1) >= 2 || (fid === 0 && hasCard(s, 'shuttle'));
      if (d._river[j]) consider(j, free ? 'bridgeOk' : 'bridge', free ? 0 : (TYPES[D.d[j].type].bridge ? -0.15 : -0.3));
      else consider(j, 'land', 0);
    });
    var tOwner = s.owner[t];
    var exp = fid === 0 && s.express === s.month, net = fid === 0 && (s.exprProj || hasCard(s, 'express')) ? SUBWAY7 : SUBWAY;
    var xc = fid === 0 && hasCard(s, 'express') ? 0.15 : 0;
    if (d.sub > 0 && !(tOwner >= 0 && s.f[tOwner].cap === t)) net[t].forEach(function (j) { if (s.owner[j] === fid) { var tr = fid === 0 && comboOn(s, 'tr', j); consider(j, 'subway', (TYPES[D.d[j].type].subway || tr ? 0 : -0.2) + (exp ? 0.15 : 0) + (tr ? 0.1 : 0) + xc); } });
    if (best && fid === 0 && hasCard(s, 'elite')) best = { src: best.src, via: best.via, mult: best.mult + 0.12 };
    return best;
  }
  function winChance(atk, def) {
    if (atk <= 0) return 0;
    var a = Math.pow(atk, 3), b = Math.pow(Math.max(def, 1), 3);
    return Math.min(0.97, Math.max(0.03, a / (a + b)));
  }
  function preview(s, t, n) {
    var f = s.f[0];
    var r = route(s, 0, t);
    var out = { ok: false, reason: '', route: r, def: defense(s, t), pct: 0, atk: 0 };
    if (s.owner[t] === 0) { out.reason = '우리 동입니다.'; return out; }
    if (!r) { out.reason = '우리 땅과 붙어 있지 않습니다.'; return out; }
    var o = s.owner[t];
    if (o >= 0 && f.pact && f.pact[o] > s.month) { out.reason = '불가침 협정 중입니다.'; return out; }
    if (s.ap <= 0) { out.reason = '이번 달 결재를 다 썼습니다.'; }
    var mult = 1 + r.mult;
    out.atk = n * mult;
    out.mult = mult;
    out.pct = winChance(out.atk, out.def.total);
    out.ok = !out.reason && n >= 1 && n <= f.troops;
    var dt = out.def.total, sq = Math.sqrt(dt / Math.max(out.atk, 1));
    out.winLoss = [Math.round(Math.min(n * 0.92, dt * 0.34 * sq)), Math.round(Math.min(n * 0.92, dt * 0.52 * sq))];
    out.loseLoss = [Math.round(n * 0.55), Math.round(n * 0.8)];
    return out;
  }
  // 승률 목표에 필요한 인원
  function needFor(s, t, pct) {
    var r = route(s, 0, t);
    if (!r) return 0;
    var def = defense(s, t).total;
    var ratio = Math.pow(pct / (1 - pct), 1 / 3);
    return Math.ceil(def * ratio / (1 + r.mult));
  }

  var EXP_Q = 3;   // 급행으로 바로 돌아오는 출동은 한 달에 3번까지
  function quickOk(s, fid, r) { return fid === 0 && s.express === s.month && r.via === 'subway' && (s.expQ || 0) < EXP_Q; }
  // 상대 턴 기록: AI 턴 동안 일어난 일을 순서대로 (화면에서 하나씩 다시 보여 줌). 저장되지 않음
  var RP = null;
  function rpPush(s, e, b0) {
    if (!RP) return;
    var ch = [];
    if (b0) { for (var i = 0; i < s.owner.length; i++) if (s.owner[i] !== b0[i]) ch.push([i, s.owner[i]]); }
    e.ch = e.ch || ch; RP.ev.push(e);
  }
  function resolve(s, fid, t, n, r, plan) {
    var b0 = RP && fid > 0 ? s.owner.slice() : null;
    var att = s.f[fid], o = s.owner[t];
    var def = defense(s, t);
    var a = n * (1 + r.mult) * (fid > 0 && o === 0 && att.adv ? 1.1 : 1);   // 우리에게 원한 있는 고문이 붙은 세력은 더 독하게 침
    var p = winChance(a, def.total);
    var win = rnd(s) < p;
    var lost, res = { win: win, p: p, t: t, n: n, from: o, collapse: null };
    if (win) {
      lost = Math.min(n * 0.92, def.total * (0.34 + rnd(s) * 0.18) * Math.sqrt(def.total / Math.max(a, 1)));
      if (o >= 0) { s.f[o].troops = Math.max(0, s.f[o].troops - def.share * 0.55); }
      res.lost = Math.round(lost);
      att.troops -= n;
      if (quickOk(s, fid, r)) { att.troops += n - lost; res.quick = 1; s.expQ = (s.expQ || 0) + 1; } else att.away = (att.away || 0) + n - lost;
      capture(s, fid, t, res);
    } else {
      lost = n * (0.55 + rnd(s) * 0.25);
      res.lost = Math.round(lost);
      att.troops -= n;
      if (quickOk(s, fid, r)) { att.troops += n - lost; res.quick = 1; s.expQ = (s.expQ || 0) + 1; } else att.away = (att.away || 0) + n - lost;
      if (o >= 0) s.f[o].troops = Math.max(0, s.f[o].troops - Math.min(def.share, a * 0.3));
      if (o === 0 && fid > 0) {
        var nbk = Math.min(2, nbLv(s, t, 3, 3)), fac = (1 + 0.35 * lv(s, t, 3)) * (1 + 0.15 * nbk);
        var noFac = def.base / fac + def.share, p0 = winChance(a, noFac);
        if (fac > 1 && p0 >= 0.5) {
          var hub = D.d[t].a.filter(function (j) { return s.owner[j] === 0 && lv(s, j, 3) >= 3; }).sort(function (x, y) { return lv(s, y, 3) - lv(s, x, 3); })[0];
          var who = hub !== undefined && nbk ? stem(D.d[hub].n) + ' ' + facName(s, hub, 3, lv(s, hub, 3)) : D.d[t].n + ' ' + facName(s, t, 3, lv(s, t, 3));
          res.facNote = J(who, '이', '가') + ' ' + D.d[t].n + ' 방어에 힘을 보탰습니다. 시설이 없었다면 저쪽 승률 ' + Math.round(p0 * 100) + '%였습니다.';
          s.stat.facSaved = (s.stat.facSaved || 0) + 1;
        }
      }
    }
    att.troops = Math.max(0, att.troops);
    if (o === 0 && fid > 0) {
      s.battles = s.battles || [];
      s.battles.push({ t: t, f: fid, held: !win, mine: Math.round(win ? def.share * 0.55 : Math.min(def.share, a * 0.3)), theirs: res.lost, cap: !!res.movedCap || s.f[0].cap === t, fac: res.facNote || '' });
    }
    if (o >= 0 && s.f[o].alive && fid === 0) { s.f[o].grudge = s.month + 6; s.f[o].grudgeWhy = 'atk'; feel(s, o, win ? 5 : 3, 0); }
    if (b0) rpPush(s, { k: 'atk', f: fid, o: o, t: t, src: r.src, via: r.via, win: win, plan: !!plan, col: res.collapse ? res.collapse.name : null, n: Math.round(n) }, b0);
    return res;
  }
  function capture(s, fid, t, res) {
    var o = s.owner[t];
    s.owner[t] = fid;
    s.min[t] = 35;
    if (s.settle) delete s.settle[t];   // 공격으로 얻은 동은 낮은 민심이 대신함
    for (var k = 0; k < 4; k++) s.dev[t * 4 + k] = Math.max(0, s.dev[t * 4 + k] - (k === 3 ? 1 : 0));
    if (o >= 0 && s.f[o].cap === t) {
      if (o === 0) {
        var mine = dongsOf(s, 0);
        if (mine.length) {
          mine.sort(function (a, b) { return D.d[b].base - D.d[a].base; });
          s.f[0].cap = mine[0];
          s.f[0].troops *= 0.75;
          res.movedCap = mine[0];
        }
      } else collapse(s, o, fid, res);
    }
    if (o === 0 && !dongsOf(s, 0).length) { s.over = true; }
    if (dongsOf(s, o).length === 0 && o > 0) s.f[o].alive = false;
  }
  function collapse(s, o, fid, res) {
    var list = dongsOf(s, o), joined = 0;
    if (fid === 0) s.stat.took += 0;
    list.forEach(function (i) {
      if (rnd(s) < (list.length >= 15 ? 0.3 : 0.4)) { s.owner[i] = fid; s.min[i] = 30; joined++; if (fid === 0) s.stat.took++; }
      else { s.owner[i] = -1; s.min[i] = 60; }
    });
    s.f[o].alive = false;
    s.f[o].troops = 0; s.f[o].away = 0;
    if (fid === 0 && s.rival === o) { s.stat.rivalDown = s.f[o].name; s.rival = -1; pushLog(s, s.f[o].name + ' 회장이 마지막 회의를 열었습니다. 안건은 해산입니다.', 'riv'); }
    if (res) res.collapse = { name: s.f[o].name, joined: joined, freed: list.length - joined };
    if (fid === 0) advMove(s, o, list.length, res);
    return joined;
  }

  // 우리에게 무너진 회장은 사라지지 않고 우리와 맞닿은 다른 세력의 고문으로 들어감
  function advMove(s, o, size, res) {
    var gone = s.f[o];
    if (gone.adv) pushLog(s, gone.adv.nm + ' 고문도 이번엔 짐을 쌌습니다.', 'good');
    if (!gone.boss || ((gone.hate || 0) < 20 && size < 4)) return;
    var best = null;
    s.f.forEach(function (x) {
      if (!x.ai || !x.alive || x.id === o || x.adv) return;
      var n = dongsOf(s, x.id).length; if (!n) return;
      var sc = n + (touchesMe(s, x.id) ? 1000 : 0);
      if (!best || sc > best.sc) best = { id: x.id, sc: sc };
    });
    if (!best) return;
    var to = s.f[best.id];
    to.adv = { nm: gone.boss.nm, face: gone.boss.face, grp: gone.grp, from: gone.name, fromId: o, at: s.month };
    feel(s, best.id, Math.max(15, (gone.hate || 0) * 0.6), 0);
    pushLog(s, gone.boss.nm + ' 회장(전 ' + gone.name + ')이 ' + to.name + ' 고문으로 들어갔습니다. 우리를 잊지 않았답니다.', 'riv');
    if (res && res.collapse) res.collapse.adv = best.id;
  }
  // ---- 플레이어 행동 ----
  function attack(s, t, n) {
    var p = preview(s, t, n);
    if (!p.ok) return { err: p.reason || '인원이 부족합니다.' };
    n = Math.floor(n);
    s.ap--;
    var r = resolve(s, 0, t, n, p.route);
    r.via = p.route.via;
    var d = D.d[t];
    s.stat.sent += n; s.stat.home += r.lost;
    if (!s.stat.worst || r.lost > s.stat.worst.n) s.stat.worst = { n: r.lost, name: d.n };
    r.back = n - r.lost;
    if (r.win) {
      s.stat.took++;
      if (p.route.via === 'subway') s.stat.raid++;
      if (p.route.via === 'bridge' || p.route.via === 'bridgeOk') s.stat.bridge++;
      pushLog(s, d.n + ' 접수. ' + r.lost + '명이 집에 갔고, ' + r.back + (r.quick ? '명은 급행으로 바로 돌아왔습니다.' : '명은 다음 달 복귀합니다.'), 'good');
      if (r.collapse) pushLog(s, collapseText(r.collapse), 'good');
    } else {
      pushLog(s, d.n + ' 공격 실패. ' + r.lost + '명이 집에 갔고, ' + r.back + (r.quick ? '명은 급행으로 바로 돌아왔습니다.' : '명은 다음 달 복귀합니다.'), 'bad');
      if (r.lost >= 120 && s.f[0].troops < r.lost) { s.weakAt = s.month; s.weakDong = t; }
    }
    afterChange(s);
    return r;
  }
  // 다음 특수 효과 단계까지 올리면 지금 조건에서 무엇이 바뀌는지
  function spPreview(s, i, t) {
    var cur = lv(s, i, t), tgt = null;
    Object.keys(FAC_SP[t]).forEach(function (l) { l = +l; if (tgt === null && l > cur) tgt = l; });
    if (tgt === null) return null;
    var cost = 0, l;
    for (l = cur; l < tgt; l++) cost += C.COST[l];
    var o = s.owner[i], nb = D.d[i].a.filter(function (j) { return s.owner[j] === o; });
    var out = { lv: tgt, name: facName(s, i, t, tgt), cost: cost, nb: nb.length, val: 0 };
    var fm = fullMapOf(s, o, dongsOf(s, o)), keep = s.dev[i * 4 + t];
    var sum = function (fn) { return nb.reduce(function (a, j) { return a + fn(j); }, 0); };
    var tx = function (j) { return taxOf(s, j, fm); }, dr = function (j) { return draftOf(s, j); }, df = function (j) { return defense(s, j).total; };
    if (t === 0 || t === 2 || (t === 3 && tgt === 3)) {
      var fn = t === 0 ? tx : t === 2 ? dr : df, a0 = sum(fn);
      s.dev[i * 4 + t] = tgt; var a1 = sum(fn); s.dev[i * 4 + t] = keep;
      out.val = a1 - a0;
      out.text = nb.length ? '옆 우리 동 ' + nb.length + '곳 ' + (t === 0 ? '수입 +' + Math.round(out.val) + '억/월' : t === 2 ? '동원 +' + Math.round(out.val) + '명/월' : '방어 합계 +' + Math.round(out.val) + '명') : '지금은 옆에 우리 동이 없어 효과를 받을 곳이 없습니다';
    } else if (t === 3) {
      var risk = [i].concat(nb).filter(function (j) { return s.min[j] < 40 && s.f[o].cap !== j; }).length;
      out.val = risk;
      out.text = '이 동과 옆 우리 동 ' + (nb.length + 1) + '곳 독립 없음 · 지금 독립 위험 ' + risk + '곳 → 0곳';
    } else {
      var seen = {}, n = 0;
      D.d[i].a.concat(SUBWAY[i]).forEach(function (j) { if (!seen[j] && s.owner[j] !== o) { seen[j] = 1; n++; } });
      out.val = n;
      out.text = '이 동에서 칠 수 있는 동 ' + n + '곳에 전력 +15%';
    }
    return out;
  }
  // 한 단계 올렸을 때 지금 조건에서 실제로 늘어나는 양
  function devEffect(s, i, t) {
    var list = dongsOf(s, 0), fm = fullMapOf(s, 0, list), k = i * 4 + t;
    var t0 = taxOf(s, i, fm), d0 = draftOf(s, i);
    s.dev[k]++;
    var t1 = taxOf(s, i, fm), d1 = draftOf(s, i);
    s.dev[k]--;
    return { tax: t1 - t0, draft: (d1 - d0) * drafted(nEff(list)) };
  }
  function collapseText(c) { return c.name + ' 본거지 함락.' + (c.joined ? ' ' + c.joined + '개 동이 우리에게 넘어왔습니다.' : ' 남은 동들은 독립했습니다.'); }
  function devCost(s, i, t) { var l = lv(s, i, t); if (l >= 5) return null; var c = t === 0 && s.owner[i] === 0 && comboOn(s, 'mk', i) ? C.COST[l] * 0.7 : C.COST[l]; if (s.owner[i] === 0 && hasCard(s, 'redev')) c *= 0.7; return Math.round(c); }
  function develop(s, i, t) {
    if (s.owner[i] !== 0) return { err: '우리 동이 아닙니다.' };
    var c = devCost(s, i, t);
    if (c === null) return { err: '이미 최고 단계입니다.' };
    if (s.f[0].money < c) return { err: '예산이 ' + Math.ceil(c - s.f[0].money) + '억 모자랍니다.' };
    s.f[0].money -= c;
    s.dev[i * 4 + t]++;
    s.stat.built++;
    if (hasCard(s, 'redev')) s.min[i] = Math.max(10, s.min[i] - 5);
    applyDevSide(s, i, t);
    return { ok: true };
  }
  function recruit(s, money) {
    money = Math.min(Math.floor(money), Math.floor(s.f[0].money));
    if (money <= 0) return { err: '예산이 없습니다.' };
    s.f[0].money -= money;
    var n = Math.round(money * C.RECRUIT * (hasCard(s, 'hire') ? 1.25 : 1));
    s.f[0].troops += n;
    return { ok: true, n: n };
  }
  function persuadeCost(s, i) { return Math.round(D.d[i].base * 0.65 * (1 + 0.35 * lv(s, i, 3)) * (hasCard(s, 'talk') ? 0.7 : 1)); }
  function persuade(s, i) {
    if (s.owner[i] !== -1) return { err: '독립 동만 설득할 수 있습니다.' };
    var r = route(s, 0, i);
    if (!r || r.via === 'subway') return { err: '우리 땅과 붙어 있어야 합니다.' };
    if (s.ap <= 0) return { err: '이번 달 결재를 다 썼습니다.' };
    var c = persuadeCost(s, i);
    if (s.f[0].money < c) return { err: '예산이 ' + Math.ceil(c - s.f[0].money) + '억 모자랍니다.' };
    s.f[0].money -= c; s.ap--;
    s.owner[i] = 0; s.min[i] = 75; joinSoft(s, i);
    s.stat.took++; s.stat.talked++;
    pushLog(s, J(D.d[i].n, '이', '가') + ' 설득에 넘어왔습니다.', 'good');
    afterChange(s);
    return { ok: true };
  }
  function dealX(s, fid) { return traitOf(s, fid).deal || 1; }
  function pactCost(s, fid) { return Math.round((20 + dongsOf(s, fid).length * 5) * dealX(s, fid) * (hasCard(s, 'diplo') ? 0.6 : 1) * ((s.f[fid].warm || 0) >= 40 ? 0.8 : 1)); }
  function grudgeText(s, f) { return (f.grudgeWhy === 'scout' ? '회원을 빼 가서 관계가 나빠졌습니다. 만나 주지 않습니다. ' : '최근에 공격해서 만나 주지 않습니다. ') + (f.grudge - s.month) + '달 뒤 다시 오세요.'; }
  function pactCheck(s, fid) {
    var f = s.f[fid];
    if (!f || !f.alive) return { ok: false, why: '사라진 세력입니다.' };
    if (s.f[0].pact && s.f[0].pact[fid] > s.month) return { ok: false, why: '이미 협정 중입니다.' };
    if (inCoal(s, fid)) return { ok: false, why: '반동장 연합에 들어가 있어 만나 주지 않습니다.' };
    if (f.grudge > s.month) return { ok: false, why: grudgeText(s, f) };
    if ((f.hate || 0) >= 70) return { ok: false, why: '회장의 원한이 깊어 만나 주지 않습니다. 한동안 건드리지 않으면 풀립니다.' };
    return { ok: true };
  }
  function pact(s, fid) {
    var c = pactCheck(s, fid);
    if (!c.ok) return { err: c.why };
    var price = pactCost(s, fid);
    if (s.f[0].money < price) return { err: '예산이 ' + Math.ceil(price - s.f[0].money) + '억 모자랍니다.' };
    s.f[0].money -= price;
    if (!s.f[0].pact) s.f[0].pact = {};
    s.f[0].pact[fid] = s.month + 12;
    feel(s, fid, 0, 8);
    pushLog(s, J(s.f[fid].name, '과', '와') + ' 12개월 불가침. 당분간 서로의 민원은 건드리지 않기로 했습니다.');
    return { ok: true };
  }
  function breakPact(s, fid) {
    if (s.f[0].pact) delete s.f[0].pact[fid];
    feel(s, fid, 30, -100);
    dongsOf(s, 0).forEach(function (i) { s.min[i] = Math.max(10, s.min[i] - 10); });
    pushLog(s, J(s.f[fid].name, '과', '와') + '의 협정을 깼습니다. 동네 민심이 떨어졌습니다.', 'bad');
    return { ok: true };
  }
  function power(s, fid) { var e = economy(s, fid); return s.f[fid].troops + e.draft * 4 + e.tax * 5; }
  function mergeCost(s, fid) { var e = economy(s, fid); return Math.round((e.tax * 8 + (s.f[fid].troops + (s.f[fid].away || 0)) * 0.6 + 60) * dealX(s, fid)); }
  function mergeCheck(s, fid) {
    var f = s.f[fid];
    if (!f || !f.alive) return { ok: false, why: '사라진 세력입니다.' };
    var mx = (hasCard(s, 'diplo') ? 2 : 3) - ((f.warm || 0) >= 60 ? 0.5 : 0);
    if (power(s, 0) < power(s, fid) * mx) return { ok: false, why: '우리 세력이 ' + mx + '배는 돼야 응합니다.' };
    if (s.coal && s.coal.m.indexOf(fid) >= 0) return { ok: false, why: '반동장 연합에 들어가 있어 만나 주지 않습니다.' };
    if (f.grudge > s.month) return { ok: false, why: grudgeText(s, f) };
    return { ok: true };
  }
  function merge(s, fid) {
    var c = mergeCheck(s, fid);
    if (!c.ok) return { err: c.why };
    if (s.ap <= 0) return { err: '이번 달 결재를 다 썼습니다.' };
    var price = mergeCost(s, fid);
    if (s.f[0].money < price) return { err: '예산이 ' + Math.ceil(price - s.f[0].money) + '억 모자랍니다.' };
    s.f[0].money -= price; s.ap--;
    var list = dongsOf(s, fid);
    list.forEach(function (i) { s.owner[i] = 0; s.min[i] = 55; joinSoft(s, i); });
    s.f[0].troops += (s.f[fid].troops + (s.f[fid].away || 0)) * 0.5;
    if (s.rival === fid) { s.stat.rivalDown = s.f[fid].name; s.rival = -1; }
    s.f[fid].alive = false; s.f[fid].troops = 0; s.f[fid].away = 0;
    s.stat.took += list.length; s.stat.merged++;
    pushLog(s, J(s.f[fid].name, '이', '가') + ' 통합에 합의했습니다. ' + list.length + '개 동이 들어왔습니다.', 'good');
    afterChange(s);
    return { ok: true, n: list.length };
  }

  // ---- 구 단위 작전 (구청장부터) ----
  function traitOf(s, fid) { var f = s.f[fid]; return TRAITS[GROUP_TRAIT[f.grp] || 'talk']; }
  function guStatus(s, g) {
    var list = GUDONGS[g], have = 0;
    list.forEach(function (i) { if (s.owner[i] === 0) have++; });
    return { have: have, total: list.length, half: have * 2 >= list.length, full: have === list.length, f: D.gu[g].f, need: Math.max(0, Math.ceil(list.length / 2) - have), left: list.length - have };
  }
  function guTargets(s, g, indepOnly) {
    var pact = s.f[0].pact || {}, out = [];
    GUDONGS[g].forEach(function (i) {
      var o = s.owner[i];
      if (o === 0 || (o > 0 && pact[o] > s.month)) return;
      if (indepOnly && o !== -1) return;
      var r = route(s, 0, i);
      if (!r || (indepOnly && r.via === 'subway')) return;
      out.push({ i: i, need: needFor(s, i, 0.8), cost: persuadeCost(s, i) });
    });
    return out;
  }
  function guLimit(s) { var b = C.GU_LIMIT[s.rank] || 0, k = D ? D.d.length / 427 : 1; return k > 1.2 ? Math.round(b * Math.min(2, Math.sqrt(k))) : b; }
  function opPreview(s, targets, lim, reserve) {
    var t = targets.sort(function (a, b) { return a.need - b.need; }), c = Math.min(lim, t.length), sum = 0, can = 0, usable = s.f[0].troops * (1 - (reserve || 0)), names = [];
    for (var k = 0; k < c; k++) { if (sum + t[k].need > usable) break; sum += t[k].need; can = k + 1; names.push(D.d[t[k].i].n); }
    return { count: t.length, limit: lim, n: c, need: sum, can: can, names: names, left: s.f[0].troops - sum, lack: (t[0] ? t[0].need : 0), ap: can <= 1 ? 1 : C.GU_COST[s.rank] };
  }
  function guAttackPreview(s, g, reserve) { return opPreview(s, guTargets(s, g), guLimit(s), reserve); }
  function guAttack(s, g, reserve) { return opAttack(s, function () { return guTargets(s, g); }, guLimit(s), reserve, D.gu[g].n); }
  function opAttack(s, getT, limit, reserve, label) {
    if (s.rank < 1) return { err: C.RANKS[1] + '부터 쓸 수 있습니다.' };
    var pv = opPreview(s, getT(), limit, reserve), apCost = pv.ap;
    if (s.ap < apCost) return { err: '결재 ' + apCost + '건이 필요합니다.' };
    var lim = Math.max(1, pv.can), won = 0, fail = 0, home = 0, back = 0, collapsed = [], keep = s.f[0].troops * (reserve || 0);
    for (var k = 0; k < lim; k++) {
      var t = getT().sort(function (a, b) { return a.need - b.need; })[0];
      if (!t || t.need > s.f[0].troops - keep) break;
      var r = route(s, 0, t.i);
      var res = resolve(s, 0, t.i, t.need, r);
      s.stat.sent += t.need; s.stat.home += res.lost; home += res.lost; back += t.need - res.lost;
      if (res.win) { won++; s.stat.took++; if (r.via === 'subway') s.stat.raid++; if (r.via === 'bridge' || r.via === 'bridgeOk') s.stat.bridge++; if (res.collapse) collapsed.push(res.collapse); } else fail++;
      if (s.won || popShare(s, 0) >= C.WIN_POP) break;
    }
    if (!won && !fail) return { err: '보낼 인원이 모자랍니다.' };
    s.ap -= apCost; s.stat.guop++;
    pushLog(s, label + ' 작전: ' + won + '개 ' + C.UNIT + ' 접수' + (fail ? ', ' + fail + '개 실패' : '') + '. ' + home + '명이 집에 갔고, ' + back + '명은 다음 달 복귀합니다.', won ? 'good' : 'bad');
    collapsed.forEach(function (c) { pushLog(s, collapseText(c), 'good'); });
    if (fail >= 2 && s.f[0].troops < home) { s.weakAt = s.month; }
    afterChange(s);
    return { ok: true, won: won, fail: fail, home: home };
  }
  function guPersuadePreview(s, g) {
    var t = guTargets(s, g, true).sort(function (a, b) { return a.cost - b.cost; }).slice(0, guLimit(s)), sum = 0, can = 0, names = [];
    t.forEach(function (x) { if (sum + x.cost <= s.f[0].money) { sum += x.cost; can++; names.push(D.d[x.i].n); } });
    return { n: can, cost: sum, count: t.length, names: names };
  }
  function guPersuade(s, g) {
    if (s.rank < 1) return { err: C.RANKS[1] + '부터 쓸 수 있습니다.' };
    if (s.ap < 1) return { err: '이번 달 결재를 다 썼습니다.' };
    var t = guTargets(s, g, true).sort(function (a, b) { return a.cost - b.cost; }).slice(0, guLimit(s)), n = 0, sum = 0;
    t.forEach(function (x) { if (s.f[0].money >= x.cost) { s.f[0].money -= x.cost; sum += x.cost; s.owner[x.i] = 0; s.min[x.i] = 75; joinSoft(s, x.i); n++; } });
    if (!n) return { err: '예산이 모자랍니다.' };
    s.ap--; s.stat.took += n; s.stat.talked += n; s.stat.guop++;
    pushLog(s, D.gu[g].n + ' 독립 동 ' + n + '곳을 ' + sum + '억에 설득했습니다.', 'good');
    afterChange(s);
    return { ok: true, n: n };
  }
  function guDevelopPreview(s, g, t) {
    var sum = 0, n = 0, m = s.f[0].money;
    GUDONGS[g].forEach(function (i) { if (s.owner[i] !== 0) return; var c = devCost(s, i, t); if (c !== null && sum + c <= m) { sum += c; n++; } });
    return { n: n, cost: sum };
  }
  function guDevelop(s, g, t) {
    if (s.rank < 1) return { err: C.RANKS[1] + '부터 쓸 수 있습니다.' };
    var p = guDevelopPreview(s, g, t);
    if (!p.n) return { err: '올릴 수 있는 동이 없거나 예산이 모자랍니다.' };
    var left = s.f[0].money;
    GUDONGS[g].forEach(function (i) { if (s.owner[i] !== 0) return; var c = devCost(s, i, t); if (c !== null && c <= left) { left -= c; s.dev[i * 4 + t]++; s.stat.built++; applyDevSide(s, i, t); } });
    s.f[0].money = left;
    return { ok: true, n: p.n, cost: p.cost };
  }

  // ---- 전체 개발: 우리 동 전체에서 단계 낮은 곳부터 한 단계씩 (결재 안 씀) ----
  var DEV_ORDER = { comm: [0, 1, 3, 2], resi: [2, 3, 0, 1], etc: [0, 2, 1, 3] };
  function autoDevType(s, i) {
    if (s.min[i] < 45 && lv(s, i, 3) < 5) return 3;
    var ord = COMM[D.d[i].type] ? DEV_ORDER.comm : RESI[D.d[i].type] ? DEV_ORDER.resi : DEV_ORDER.etc, best = -1, bl = 9;
    ord.forEach(function (t) { var l = lv(s, i, t); if (l < 5 && l < bl) { bl = l; best = t; } });
    return best;
  }
  function realmDevPlan(s, t, budget) {
    var c = [];
    dongsOf(s, 0).forEach(function (i) { var tt = t >= 0 ? t : autoDevType(s, i); if (tt < 0) return; var k = devCost(s, i, tt); if (k !== null) c.push({ i: i, t: tt, c: k, l: lv(s, i, tt) }); });
    c.sort(function (a, b) { return a.l - b.l || a.c - b.c || D.d[b.i].pop - D.d[a.i].pop; });
    var sum = 0, list = [], m = Math.min(s.f[0].money, budget === undefined ? Infinity : budget);
    c.forEach(function (x) { if (sum + x.c <= m) { sum += x.c; list.push([x.i, x.t]); } });
    return { n: list.length, cost: sum, list: list, all: c.length };
  }
  function realmDevelop(s, t, budget) {
    var p = realmDevPlan(s, t, budget);
    if (!p.n) return { err: p.all ? '예산이 모자랍니다.' : '올릴 수 있는 동이 없습니다.' };
    var by = [0, 0, 0, 0];
    p.list.forEach(function (x) { var r = develop(s, x[0], x[1]); if (r.ok) by[x[1]]++; });
    return { ok: true, n: p.n, cost: p.cost, by: by };
  }
  var DEV_N = ['상권', '교통', '주거', '치안'];
  function devPlanRun(s, net) {
    var dp = s.devPlan; if (!dp || !(net > 0)) return;
    var r = realmDevelop(s, dp.t, Math.floor(net * dp.pct));
    if (r.ok) pushLog(s, '자동 개발 · ' + r.by.map(function (n, k) { return n ? DEV_N[k] + ' ' + n : ''; }).filter(Boolean).join(' · ') + '곳 · ' + r.cost + '억', 'dev');
  }

  // ---- 행정구역 개편: 이어진 우리 동 3~8개를 이름 붙인 구역으로 (구청장부터) ----
  function zoneOf(s, i) { var z = s.zones; if (!z) return null; for (var k = 0; k < z.length; k++) if (z[k].d.indexOf(i) >= 0) return z[k]; return null; }
  function zoneById(s, id) { return (s.zones || []).filter(function (z) { return z.id === id; })[0] || null; }
  function zoneMax(s) { return [0, 2, 4, 6][s.rank] || 0; }
  function cleanName(n) { return String(n || '').replace(/\s+/g, ' ').trim(); }
  function nameOk(n) {
    if (!n) return '구역 이름을 지어 주세요.';
    if (n.length > 8) return '이름은 8자까지입니다.';
    if (!/^[가-힣A-Za-z0-9 ]+$/.test(n)) return '한글·영문·숫자만 쓸 수 있습니다.';
    var low = n.replace(/\s/g, '');
    for (var k = 0; k < BAD_WORDS.length; k++) if (low.indexOf(BAD_WORDS[k]) >= 0) return '쓸 수 없는 이름입니다.';
    return '';
  }
  function zoneCheck(s, list, name) {
    list = list || [];
    if (s.rank < 1) return { ok: false, why: C.RANKS[1] + '부터 할 수 있습니다.' };
    if ((s.zones || []).length >= zoneMax(s)) return { ok: false, why: '지금 직급으로는 구역을 ' + zoneMax(s) + '개까지 만들 수 있습니다.' };
    if (list.some(function (i) { return s.owner[i] !== 0; })) return { ok: false, why: '우리 ' + C.UNIT + '만 묶을 수 있습니다.' };
    if (list.some(function (i) { return zoneOf(s, i); })) return { ok: false, why: '이미 다른 구역에 든 ' + C.UNIT + '이 있습니다.' };
    var cost = 20 * list.length, gs = {}, main = -1, mc = 0;
    list.forEach(function (i) { var g = D.d[i].g; gs[g] = (gs[g] || 0) + 1; if (gs[g] > mc) { mc = gs[g]; main = g; } });
    var cross = list.filter(function (i) { return D.d[i].g !== main; }).length;
    var out = { ok: false, cost: cost, ap: 2, cross: cross, main: main, n: list.length };
    if (list.length < 3 || list.length > 8) { out.why = C.UNIT + ' 3~8개를 고르세요. 지금 ' + list.length + '개.'; return out; }
    var seen = {}, q = [list[0]]; seen[list[0]] = 1;
    while (q.length) { var x = q.pop(); D.d[x].a.forEach(function (j) { if (!seen[j] && list.indexOf(j) >= 0) { seen[j] = 1; q.push(j); } }); }
    if (Object.keys(seen).length !== list.length) { out.why = '서로 이어진 ' + C.UNIT + '만 묶을 수 있습니다.'; return out; }
    var nw = nameOk(cleanName(name)); if (nw) { out.why = nw; return out; }
    if ((s.zones || []).some(function (z) { return z.nm === cleanName(name); })) { out.why = '같은 이름의 구역이 이미 있습니다.'; return out; }
    if (s.ap < 2) { out.why = '결재 2건이 필요합니다.'; return out; }
    if (s.f[0].money < cost) { out.why = '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.'; return out; }
    out.ok = true; return out;
  }
  function zoneMake(s, list, name) {
    var c = zoneCheck(s, list, name);
    if (!c.ok) return { err: c.why };
    name = cleanName(name);
    s.ap -= 2; s.f[0].money -= c.cost;
    var hall = list.slice().sort(function (a, b) { return D.d[b].base - D.d[a].base; })[0];
    var z = { id: ++s.zoneSeq, nm: name, d: list.slice(), at: s.month, hall: hall };
    (s.zones = s.zones || []).push(z);
    list.forEach(function (i) { if (D.d[i].g !== c.main) s.min[i] = Math.max(10, s.min[i] - 10); });
    s.stat.zones = (s.stat.zones || 0) + 1;
    pushLog(s, name + ' 출범. ' + list.length + '개 ' + C.UNIT + '을 묶었고 청사는 ' + D.d[hall].n + '에 둡니다.' + (c.cross ? ' 원래 ' + C.GRP + '가 다른 ' + c.cross + '곳은 주민 반발로 민심이 떨어졌습니다.' : ''), 'good');
    return { ok: true, zone: z };
  }
  function zoneDissolve(s, id) {
    var z = zoneById(s, id); if (!z) return { err: '없는 구역입니다.' };
    s.zones = s.zones.filter(function (x) { return x !== z; });
    pushLog(s, z.nm + '을 해체했습니다.');
    return { ok: true };
  }
  function zonesClean(s) {
    if (!s.zones || !s.zones.length) return;
    s.zones = s.zones.filter(function (z) {
      z.d = z.d.filter(function (i) { return s.owner[i] === 0; });
      if (z.d.indexOf(z.hall) < 0 && z.d.length) z.hall = z.d.slice().sort(function (a, b) { return D.d[b].base - D.d[a].base; })[0];
      if (z.d.length >= 2) return true;
      pushLog(s, z.nm + '은 ' + C.UNIT + '이 줄어 해체됐습니다.', 'bad');
      return false;
    });
  }
  function zoneTargets(s, z) {
    var pact = s.f[0].pact || {}, out = [], seen = {};
    z.d.forEach(function (i) {
      D.d[i].a.forEach(function (j) {
        if (seen[j]) return; seen[j] = 1;
        var o = s.owner[j];
        if (o === 0 || (o > 0 && pact[o] > s.month)) return;
        var r = route(s, 0, j); if (!r) return;
        out.push({ i: j, need: needFor(s, j, 0.8), cost: persuadeCost(s, j) });
      });
    });
    return out;
  }
  function zoneLimit(s) { return Math.max(3, guLimit(s)); }
  function zoneAttackPreview(s, id, reserve) {
    var z = zoneById(s, id); if (!z) return { count: 0, can: 0, names: [], need: 0, left: 0, lack: 0, ap: 1, limit: 0 };
    return opPreview(s, zoneTargets(s, z), zoneLimit(s), reserve);
  }
  function zoneAttack(s, id, reserve) {
    var z = zoneById(s, id); if (!z) return { err: '없는 구역입니다.' };
    return opAttack(s, function () { return zoneTargets(s, z); }, zoneLimit(s), reserve, z.nm);
  }
  function zoneDevelopPreview(s, id, t) {
    var z = zoneById(s, id), sum = 0, n = 0, m = s.f[0].money; if (!z) return { n: 0, cost: 0 };
    z.d.forEach(function (i) { var c = devCost(s, i, t); if (c !== null && sum + c <= m) { sum += c; n++; } });
    return { n: n, cost: sum };
  }
  function zoneDevelop(s, id, t) {
    var z = zoneById(s, id); if (!z) return { err: '없는 구역입니다.' };
    var p = zoneDevelopPreview(s, id, t);
    if (!p.n) return { err: '올릴 수 있는 ' + C.UNIT + '이 없거나 예산이 모자랍니다.' };
    var left = s.f[0].money;
    z.d.forEach(function (i) { var c = devCost(s, i, t); if (c !== null && c <= left) { left -= c; s.dev[i * 4 + t]++; s.stat.built++; applyDevSide(s, i, t); } });
    s.f[0].money = left;
    pushLog(s, z.nm + ' ' + C.TRACKS[t] + ' 개발 ' + p.n + '곳 · ' + p.cost + '억.', 'good');
    return { ok: true, n: p.n, cost: p.cost };
  }

  // ---- 시작 유형 능력 ----
  function avgMood(s) { var l = dongsOf(s, 0), t = 0; l.forEach(function (i) { t += s.min[i]; }); return l.length ? t / l.length : 0; }
  function scoutInfo(s, t) {
    var o = s.owner[t];
    if (s.abil !== 'office') return { ok: false, why: '오피스 타운 출신만 할 수 있습니다.' };
    if (o <= 0) return { ok: false, why: '세력이 가진 동이어야 합니다.' };
    if (!D.d[t].a.some(function (j) { return s.owner[j] === 0; })) return { ok: false, why: '우리 땅과 붙어 있어야 합니다.' };
    if ((s.scoutAt[o] || -99) + 6 > s.month) return { ok: false, why: '이 세력에는 ' + (s.scoutAt[o] + 6 - s.month) + '달 뒤 다시 제안할 수 있습니다.' };
    var gain = Math.round(Math.min(s.f[o].troops * 0.2, 400 + s.month * 20));
    if (gain < 10) return { ok: false, why: '데려올 인원이 거의 없습니다.' };
    var cost = Math.round(gain * 1.6);
    return { ok: s.ap > 0 && s.f[0].money >= cost, gain: gain, cost: cost, why: s.ap <= 0 ? '이번 달 결재를 다 썼습니다.' : s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function scout(s, t) {
    var i = scoutInfo(s, t);
    if (!i.ok) return { err: i.why };
    var o = s.owner[t];
    s.f[0].money -= i.cost; s.ap--; s.f[o].troops -= i.gain; s.f[0].troops += i.gain; s.scoutAt[o] = s.month; s.scoutGain = s.scoutGain || {}; s.scoutGain[o] = i.gain; s.f[o].grudge = Math.max(s.f[o].grudge || 0, s.month + 3); s.f[o].grudgeWhy = 'scout'; feel(s, o, 12, 0);
    s.stat.abil = (s.stat.abil || 0) + 1;
    pushLog(s, s.f[o].name + ' 회원 ' + i.gain + '명이 조건을 듣고 우리 쪽으로 왔습니다.', 'good');
    return { ok: true, gain: i.gain };
  }
  function voteInfo(s, t) {
    if (s.abil !== 'town') return { ok: false, why: '대단지 출신만 할 수 있습니다.' };
    if (s.owner[t] !== -1) return { ok: false, why: '독립 동이어야 합니다.' };
    if (!D.d[t].a.some(function (j) { return s.owner[j] === 0 && !D.d[t]._river[j]; })) return { ok: false, why: (CITY.water || '강') + ' 없이 붙어 있는 우리 동이 있어야 합니다.' };
    if (s.vote) return { ok: false, why: D.d[s.vote.t].n + ' 투표가 진행 중입니다.' };
    var m = avgMood(s);
    if (m < 70) return { ok: false, why: '우리 동 민심 평균이 70은 돼야 합니다 (지금 ' + Math.round(m) + ').' };
    if (s.ap <= 0) return { ok: false, why: '이번 달 결재를 다 썼습니다.' };
    return { ok: true, why: '' };
  }
  function vote(s, t) {
    var i = voteInfo(s, t);
    if (!i.ok) return { err: i.why };
    s.ap--; s.vote = { t: t, m: s.month };
    pushLog(s, D.d[t].n + ' 주민투표를 발의했습니다. 다음 달 결과가 나옵니다.');
    return { ok: true };
  }
  function tickVote(s) {
    if (!s.vote) return;
    var t = s.vote.t; s.vote = null;
    if (s.owner[t] !== -1) { pushLog(s, D.d[t].n + ' 투표가 무산됐습니다. 그사이 주인이 바뀌었습니다.', 'bad'); return; }
    if (avgMood(s) < 60) { pushLog(s, D.d[t].n + ' 투표가 부결됐습니다. 우리 동네 민심이 흔들렸습니다.', 'bad'); return; }
    s.owner[t] = 0; s.min[t] = 85; joinSoft(s, t); s.stat.took++; s.stat.talked++; s.stat.abil = (s.stat.abil || 0) + 1;
    pushLog(s, D.d[t].n + ' 주민투표 가결. 평화롭게 합류했습니다.', 'good');
    afterChange(s);
  }
  function expressInfo(s) {
    if (s.abil !== 'station') return { ok: false, why: '역세권 출신만 할 수 있습니다.' };
    if (s.express === s.month) return { ok: false, why: '이번 달 켜져 있습니다.' };
    if (s.express + 3 > s.month) return { ok: false, why: (s.express + 3 - s.month) + '달 뒤 다시 쓸 수 있습니다.' };
    var cost = Math.round(Math.min(120, Math.max(20, economy(s, 0).tax * 0.5)));
    return { ok: s.f[0].money >= cost, cost: cost, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function raidTargets(s) {
    var seen = {}, n = 0, net = s.exprProj ? SUBWAY7 : SUBWAY;
    dongsOf(s, 0).forEach(function (i) { net[i].forEach(function (j) { var o = s.owner[j]; if (seen[j] || o === 0 || (o >= 0 && s.f[o].cap === j) || D.d[i].a.indexOf(j) >= 0) return; seen[j] = 1; n++; }); });
    return n;
  }
  function express(s) {
    var i = expressInfo(s);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.express = s.month; s.expQ = 0; s.stat.abil = (s.stat.abil || 0) + 1;
    pushLog(s, '급행 원정. 이번 달 지하철 기습은 전력 +15%, 처음 ' + EXP_Q + '번은 살아남은 인원이 바로 돌아옵니다.');
    return { ok: true };
  }
  function rallyInfo(s) {
    if (s.abil !== 'other') return { ok: false, why: '' };
    if (s.rallyAt + 8 > s.month) return { ok: false, why: (s.rallyAt + 8 - s.month) + '달 뒤 다시 소집할 수 있습니다.' };
    var cost = Math.round(Math.max(20, economy(s, 0).tax));
    return { ok: s.f[0].money >= cost, cost: cost, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function rally(s) {
    var i = rallyInfo(s);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.rallyAt = s.month; s.stat.abil = (s.stat.abil || 0) + 1;
    dongsOf(s, 0).forEach(function (j) { s.min[j] = Math.min(100, s.min[j] + 20); });
    pushLog(s, '반상회 소집. 국수를 돌렸더니 동네 민심이 올랐습니다.', 'good');
    return { ok: true };
  }
  // ---- 대형 사업 ----
  function unityInfo(s, g) {
    var mine = GUDONGS[g].filter(function (i) { return s.owner[i] === 0; });
    if (!mine.length) return { ok: false, why: '이 ' + C.GRP + '에 우리 ' + C.UNIT + '이 없습니다.' };
    if (s.stable[g] > s.month) return { ok: false, why: '이미 진행 중입니다. ' + (s.stable[g] - s.month) + '달 남음.' };
    var cost = 60 + mine.length * 25;
    return { ok: s.f[0].money >= cost, cost: cost, n: mine.length, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function unity(s, g) {
    var i = unityInfo(s, g);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.stable[g] = s.month + 6; s.stat.proj = (s.stat.proj || 0) + 1;
    GUDONGS[g].forEach(function (j) { if (s.owner[j] === 0) s.min[j] = 100; });
    pushLog(s, D.gu[g].n + ' 주민 화합 사업. 민심이 가득 찼고 6개월간 독립 걱정이 없습니다.', 'good');
    return { ok: true };
  }
  function exprProjInfo(s) {
    if (s.exprProj) return { ok: false, why: '이미 완료한 사업입니다.' };
    var cost = 400 + dongsOf(s, 0).length * 10;
    return { ok: s.f[0].money >= cost, cost: cost, why: s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function exprProj(s) {
    var i = exprProjInfo(s);
    if (!i.ok) return { err: i.why };
    s.f[0].money -= i.cost; s.exprProj = true; s.stat.proj = (s.stat.proj || 0) + 1;
    pushLog(s, '광역 급행 사업 완료. 역이 있는 우리 동의 기습 거리가 5.5km가 됐습니다.', 'good');
    return { ok: true };
  }
  // ---- 숙적 작전 ----
  function weakBorder(s, fid) {
    var best = -1, bv = 1e9;
    dongsOf(s, fid).forEach(function (i) {
      D.d[i].a.forEach(function (j) {
        if (s.owner[j] !== 0) return;
        var r = route(s, fid, j); if (!r) return;
        var d = defense(s, j).total / (1 + r.mult);
        if (d < bv) { bv = d; best = j; }
      });
    });
    return best < 0 ? null : { t: best, need: bv };
  }
  // 숙적이 탐내는 우리 동과 그 이유: 공사 중인 정부 사업, 완공된 공공기관, 시설 밀집지, 구 절반이 걸린 동
  function prizeBorder(s, fid) {
    var best = null;
    dongsOf(s, fid).forEach(function (i) {
      D.d[i].a.forEach(function (j) {
        if (s.owner[j] !== 0 || s.f[0].cap === j) return;
        var g = govSite(s, j), build = g && s.month < g.done, agency = g && !build && g.k === 'agency';
        var devSum = lv(s, j, 0) + lv(s, j, 1) + lv(s, j, 2) + lv(s, j, 3);
        var gu = D.d[j].g, st = guStatus(s, gu), edge = s.rank < 2 && st.half && (st.have - 1) * 2 < st.total;
        if (!build && !agency && devSum < 8 && !edge) return;
        var r = route(s, fid, j); if (!r) return;
        var need = defense(s, j).total / (1 + r.mult), w = build ? 2 : agency ? 1.8 : edge ? 1.6 : 1;
        var val = w * (devSum + 4) / need;
        var why = build ? GOV_SHORT(g.k) + ' 공사판' : agency ? '공공기관 수입' : edge ? D.gu[gu].n + ' 절반이 걸린 곳' : '시설 밀집지';
        var cons = build ? (GOV[g.k].cost ? '빼앗기면 들인 공사비 ' + GOV[g.k].cost + '억도 같이 넘어갑니다' : '빼앗기면 준공 지원금이 저쪽으로 갑니다') : agency ? '빼앗기면 매달 25억 수입가 넘어갑니다' : edge ? '잃으면 ' + D.gu[gu].n + ' 절반이 무너집니다' + (s.rank < 1 ? '. 구청장 승급이 늦어집니다' : '') : '빼앗기면 키운 시설이 통째로 넘어갑니다';
        if (!best || val > best.val) best = { t: j, need: need, val: val, why: why, cons: cons };
      });
    });
    return best;
  }
  function planLog(s, f, t, why, cons, est) {
    pushLog(s, f.name + ' 회원들이 ' + D.d[t].n + (why ? '(' + why + ')' : '') + ' 앞에 모이고 있습니다. 약 ' + Math.round(est) + '명, 다음 달 공격 가능성 높음.' + (cons ? ' ' + cons + '.' : ''), 'riv', t);
  }
  function tickRivalPlan(s) {
    s.rivalPlan = null;
    if (s.rival < 0 || !s.f[s.rival].alive || s.month <= C.GRACE) return;
    var f = s.f[s.rival];
    if (s.f[0].pact && s.f[0].pact[f.id] > s.month) return;
    if ((s.rivalPlanAt || -9) + 3 > s.month) return;
    // 본거지가 위협받는 중이면 예고하지 않음 (예고하고 안 오는 일을 줄임)
    var capDef = defense(s, f.cap).total, threat = 0;
    D.d[f.cap].a.forEach(function (j) { var o = s.owner[j]; if (o >= 0 && o !== f.id) threat = Math.max(threat, s.f[o].troops + (o === 0 ? s.f[o].away || 0 : 0)); });
    if (threat * 0.8 > capDef) return;
    var exposed = (s.f[0].away || 0) > s.f[0].troops;
    var prize = prizeBorder(s, f.id), pick = null;
    if (prize && f.troops * 0.8 >= prize.need * 1.3) pick = prize;
    else {
      var w = weakBorder(s, f.id);
      if (w && (f.troops * 0.8 >= w.need * 1.6 || (exposed && f.troops * 0.8 >= w.need * 1.1))) pick = { t: w.t, need: w.need, why: '', cons: exposed ? '우리 인원이 많이 나가 있는 걸 알아챘습니다' : '' };
    }
    if (!pick) return;
    var r = route(s, f.id, pick.t), est = Math.min(f.troops * 0.85, defense(s, pick.t).total * 1.6 / (1 + r.mult));
    s.rivalPlanAt = s.month;
    s.rivalPlan = { t: pick.t, f: f.id, why: pick.why, cons: pick.cons, n: Math.round(est), mult: r.mult, src: r.src };
    planLog(s, f, pick.t, pick.why, pick.cons, est);
  }
  // 예고된 공격에 대한 대응 정보: 저쪽 전력, 지금 방어, 막는 데 필요한 것
  function planInfo(s) {
    var p = s.rivalPlan; if (!p || s.owner[p.t] !== 0) return null;
    var f = s.f[p.f], d = defense(s, p.t), atk = p.n * (1 + p.mult);
    var goal = atk / 1.05, keep = s.dev[p.t * 4 + 3], sec = null, secN = 0, secSum = 0;
    if (keep < 5) { s.dev[p.t * 4 + 3] = keep + 1; sec = defense(s, p.t).total - d.total; s.dev[p.t * 4 + 3] = keep; }
    for (var L = keep; L < 5 && defense(s, p.t).total < goal; L++) { secSum += C.COST[L]; secN++; s.dev[p.t * 4 + 3] = L + 1; }
    var secOk = defense(s, p.t).total >= goal; s.dev[p.t * 4 + 3] = keep;
    var isCap = s.f[0].cap === p.t, rate = isCap ? 0.4 : 0.3, cap = isCap ? Infinity : d.base * 8;
    // 이번 달 끝까지 집에 남겨야 할 대기 인원 (본거지 아니면 상한 있음)
    var needShare = Math.max(0, goal - d.base), extra = needShare <= cap ? Math.ceil(needShare / rate) : null;
    return { t: p.t, f: p.f, name: f.name, why: p.why, cons: p.cons, atk: atk, def: d.total, p: winChance(atk, d.total), sec: sec, secCost: keep < 5 ? C.COST[keep] : null,
      secN: secOk ? secN : null, secSum: secSum, extra: extra, pact: pactCheck(s, p.f).ok ? pactCost(s, p.f) : null, src: p.src };
  }
  // ---- 정부 공모 ----
  function govElig(s, fid, k, i) {
    if (s.owner[i] !== fid) return fid === 0 ? '우리 동이 아닙니다.' : 'x';
    if (govSite(s, i)) return '이미 정부 사업이 있는 동입니다.';
    if (k === 'agency' && lv(s, i, 1) < 2) return '교통 2단계가 필요합니다.';
    if (k === 'hospital' && lv(s, i, 2) < 2) return '주거 2단계가 필요합니다.';
    if (k === 'safety' && lv(s, i, 3) < 2) return '치안 2단계가 필요합니다.';
    if (k === 'plant' && s.f[fid].cap === i) return '본거지에는 들일 수 없습니다.';
    return '';
  }
  function govEligible(s, k, i) { return govElig(s, 0, k, i); }
  // 다른 세력의 신청: 조건을 채우고 비용을 낼 수 있어야 함. 자원회수시설은 돈이 궁한 세력만.
  function govRivals(s, k) {
    var G = GOV[k], out = [];
    s.f.forEach(function (f) {
      if (!f.ai || !f.alive) return;
      if (f.money < G.cost) return;
      if (k === 'plant' && f.money > 150) return;
      var best = -1, bs = -1;
      dongsOf(s, f.id).forEach(function (i) {
        if (govElig(s, f.id, k, i)) return;
        var sc = GOV_COND[k] !== undefined ? lv(s, i, GOV_COND[k]) * 100 + D.d[i].E : 1000 - D.d[i].P;
        if (sc > bs) { bs = sc; best = i; }
      });
      if (best >= 0) out.push({ f: f.id, i: best, sc: bs + dongsOf(s, f.id).length });
    });
    out.sort(function (a, b) { return b.sc - a.sc; });
    return out.slice(0, 3);
  }
  function govWhy(s, k, i) {
    var t = GOV_COND[k];
    if (t !== undefined) return C.TRACKS[t] + ' ' + lv(s, i, t) + '단계로 신청한 곳 중 조건이 가장 좋았습니다';
    return '신청한 곳 중 주민이 가장 적었습니다';
  }
  function govNext(s) {
    var gv = s.gov; if (!gv || gv.open) return null;
    var k = GOV_ORDER[gv.idx % GOV_ORDER.length];
    if (k === 'agency' && Math.max(s.month, gv.nextAt) >= 30) k = GOV_ORDER[(gv.idx + 1) % GOV_ORDER.length];
    return { k: k, G: GOV[k], left: Math.max(1, gv.nextAt - s.month) };
  }
  function govInfo(s) {
    if (!s.gov || !s.gov.open) return null;
    var k = s.gov.open.k, G = GOV[k], ok = [], all = dongsOf(s, 0);
    all.forEach(function (i) { if (!govEligible(s, k, i)) ok.push(i); });
    return { k: k, G: G, left: s.gov.open.until - s.month, ok: ok, any: all.length, rivals: govRivals(s, k) };
  }
  // 선정된 세력에 사업을 세움 (플레이어·AI 공통)
  function govBuild(s, fid, k, i) {
    var G = GOV[k], f = s.f[fid];
    f.money -= G.cost;
    s.gov.sites[i] = { k: k, start: s.month, done: s.month + G.prep, pact: false, paid: 0, was0: fid === 0 };
    if (k === 'plant') {
      f.money += 150; s.gov.sites[i].paid = 1;
      [i].concat(D.d[i].a).forEach(function (j) { if (s.owner[j] === fid) s.min[j] = Math.max(5, s.min[j] - 15); });
    }
    if (k === 'safety') {
      if (lv(s, i, 3) < 5) s.dev[i * 4 + 3]++;
      [i].concat(D.d[i].a).forEach(function (j) { if (s.owner[j] === fid) s.min[j] = Math.min(100, s.min[j] + 10); });
    }
  }
  function govApply(s, i) {
    var info = govInfo(s);
    if (!info) return { err: '열린 공모가 없습니다.' };
    var why = govEligible(s, info.k, i);
    if (why) return { err: why };
    if (s.ap <= 0) return { err: '이번 달 결재를 다 썼습니다.' };
    if (s.f[0].money < info.G.cost) return { err: '예산이 ' + Math.ceil(info.G.cost - s.f[0].money) + '억 모자랍니다.' };
    s.ap--;
    govBuild(s, 0, info.k, i);
    s.gov.open = null; s.gov.nextAt = s.month + 5 + Math.floor(rnd(s) * 3); s.stat.gov = (s.stat.gov || 0) + 1;
    if (info.k === 'plant') pushLog(s, D.d[i].n + '에 광역 자원회수시설 착공. 지원금 150억이 들어왔고, 주민들은 현수막을 걸었습니다. 준공 지원금 100억은 2달 뒤입니다.', 'good');
    else if (info.k === 'safety') pushLog(s, J(D.d[i].n, '이', '가') + ' 광역 안전센터로 지정됐습니다. 치안이 한 단계 올랐습니다.', 'good');
    else pushLog(s, J(D.d[i].n, '이', '가') + ' ' + info.G.n + ' 대상지로 뽑혔습니다. ' + info.G.prep + '달 뒤 완공됩니다.', 'good');
    return { ok: true };
  }
  function govPactCost() { return 80; }
  function govPact(s, i) {
    var g = govSite(s, i);
    if (!g || g.k !== 'plant' || g.pact) return { err: '협약할 시설이 없습니다.' };
    if (s.owner[i] !== 0) return { err: '우리 동이 아닙니다.' };
    if (s.f[0].money < 80) return { err: '예산이 ' + Math.ceil(80 - s.f[0].money) + '억 모자랍니다.' };
    s.f[0].money -= 80; g.pact = true; s.min[i] = Math.min(100, s.min[i] + 10);
    pushLog(s, D.d[i].n + ' 주민협약 체결. 환경설비를 늘리고 주민 감시단을 꾸렸습니다.', 'good');
    return { ok: true };
  }
  var GOV_SHORT = function (k) { return GOV[k].n.replace(/ (이전|건립|유치|지정)$/, ''); };
  function tickGov(s) {
    if (!s.gov) s.gov = { open: null, sites: {}, nextAt: 6, idx: 0 };
    var gv = s.gov;
    Object.keys(gv.sites).forEach(function (i) {
      var g = gv.sites[i], o = s.owner[i];
      if (g.done !== s.month) return;
      if (g.k === 'plant' && g.paid === 1 && o >= 0) {
        g.paid = 2; s.f[o].money += 100;
        if (o === 0) pushLog(s, D.d[i].n + ' 자원회수시설 준공. 준공 지원금 100억이 들어왔습니다. 이제 매달 교부금 12억이 나옵니다.', 'good');
        else if (gv.sites[i].was0) pushLog(s, D.d[i].n + ' 자원회수시설 준공 지원금 100억은 ' + J(s.f[o].name, '이', '가') + ' 받아 갔습니다.', 'bad');
      } else if (g.k !== 'plant' && g.k !== 'safety' && o === 0) pushLog(s, D.d[i].n + ' ' + GOV_SHORT(g.k) + ' 완공. ' + GOV[g.k].gain.replace('완공 후 ', '') + '.', 'good');
    });
    if (gv.open && s.month >= gv.open.until) {
      var k = gv.open.k, rv = govRivals(s, k);
      if (rv.length) {
        var w = rv[0];
        govBuild(s, w.f, k, w.i);
        pushLog(s, '정부 공모 결과: ' + s.f[w.f].name + ' 쪽 ' + D.d[w.i].n + ' 선정. ' + govWhy(s, k, w.i) + '.');
      } else pushLog(s, '정부 공모 결과: ' + J(GOV_SHORT(k), '은', '는') + ' 조건을 채운 신청이 없어 유찰됐습니다.');
      gv.open = null; gv.nextAt = s.month + 4 + Math.floor(rnd(s) * 3);
    }
    if (!gv.open && s.month >= gv.nextAt && dongsOf(s, 0).length >= 3) {
      var kk = GOV_ORDER[gv.idx % GOV_ORDER.length]; gv.idx++;
      if (kk === 'agency' && s.month >= 30) { kk = GOV_ORDER[gv.idx % GOV_ORDER.length]; gv.idx++; }   // 후반엔 회수가 느린 사업을 건너뜀
      gv.open = { k: kk, until: s.month + 3 };
      var rv0 = govRivals(s, kk);
      pushLog(s, '정부 공모: ' + GOV[kk].n + '. ' + GOV[kk].kind + ', 3달 안에 신청.' + (rv0.length ? ' ' + s.f[rv0[0].f].name + '도 서류를 준비 중입니다.' : ''), 'ev');
    }
  }
  // ---- 사건 ----
  function evAmount(s, x) {
    var e = economy(s, 0), out = {};
    if (x.money) out.money = Math.round(x.money * Math.max(20, e.tax) * (x.money < 0 && x.mood > 0 ? 0.5 : 1));
    if (x.troops) out.troops = Math.round(x.troops * Math.max(20, e.draft));
    if (x.mood) out.mood = x.mood;
    if (x.foe) out.foe = x.foe;
    if (x.join) out.join = 1;
    return out;
  }
  function eventView(s) {
    if (!s.ev) return null;
    var ev = EVENTS[s.ev.id];
    return { t: ev.t, b: ev.b, left: s.ev.exp - s.month, c: ev.c.map(function (c) {
      var x = c.x, a = evAmount(s, x), parts = [];
      return { l: c.l, a: a, chance: x.chance, good: x.good ? evAmount(s, x.good) : null, bad: x.bad ? evAmount(s, x.bad) : null };
    }) };
  }
  function foeOf(s) {
    var seen = {}, best = -1, bt = -1;
    dongsOf(s, 0).forEach(function (i) { D.d[i].a.forEach(function (j) { var o = s.owner[j]; if (o > 0 && !seen[o]) { seen[o] = 1; if (s.f[o].troops > bt) { bt = s.f[o].troops; best = o; } } }); });
    return best;
  }
  function applyFx(s, x) {
    var a = evAmount(s, x), me = s.f[0];
    if (a.money) me.money = Math.max(0, me.money + a.money);
    if (a.troops) me.troops = Math.max(0, me.troops + a.troops);
    if (a.mood) dongsOf(s, 0).forEach(function (i) { s.min[i] = Math.max(5, Math.min(100, s.min[i] + a.mood)); });
    if (a.foe) { var f = foeOf(s); if (f > 0) { s.f[f].troops *= 1 - a.foe; } }
    if (a.join) {
      var c = [];
      dongsOf(s, 0).forEach(function (i) { D.d[i].a.forEach(function (j) { if (s.owner[j] === -1 && !D.d[i]._river[j] && c.indexOf(j) < 0) c.push(j); }); });
      if (c.length) { var t = pick(s, c); s.owner[t] = 0; s.min[t] = 70; joinSoft(s, t); s.stat.took++; s.stat.talked++; return D.d[t].n; }
    }
    return null;
  }
  function chooseEvent(s, idx) {
    if (!s.ev) return { err: '처리할 민원이 없습니다.' };
    var ev = EVENTS[s.ev.id], c = ev.c[idx];
    if (!c) return { err: '없는 선택지입니다.' };
    if (c.x.money && c.x.money < 0 && s.f[0].money < -evAmount(s, c.x).money) return { err: '예산이 모자랍니다.' };
    var txt = c.r, joined = applyFx(s, c.x);
    if (c.x.chance) {
      var good = rnd(s) < c.x.chance, sub = good ? c.x.good : c.x.bad;
      joined = applyFx(s, sub) || joined;
      txt = good ? c.rg : c.rb;
    }
    if (joined) txt += ' (' + joined + ' 편입)';
    s.ev = null; s.stat.events++;
    pushLog(s, ev.t + ': ' + txt, 'n');
    afterChange(s);
    return { ok: true, text: txt };
  }
  function tickEvents(s) {
    if (s.ev && s.ev.exp <= s.month) {
      var ev = EVENTS[s.ev.id];
      dongsOf(s, 0).forEach(function (i) { s.min[i] = Math.max(5, s.min[i] - 3); });
      pushLog(s, ev.t + ' 민원을 묵혔습니다. 민심이 조금 떨어졌습니다.', 'bad');
      s.ev = null;
    }
    if (!s.ev && s.month >= s.nextEv) {
      var left = [];
      EVENTS.forEach(function (e, i) { if (s.evUsed.indexOf(i) < 0) left.push(i); });
      if (!left.length) { s.evUsed = []; left = EVENTS.map(function (e, i) { return i; }); }
      var id = pick(s, left);
      s.evUsed.push(id);
      s.ev = { id: id, exp: s.month + 3 };
      s.nextEv = s.month + 5 + Math.floor(rnd(s) * 4);
      pushLog(s, '새 민원: ' + EVENTS[id].t, 'ev');
    }
  }
  function tickRival(s) {
    if (s.month < 4) return;
    if (s.rival < 0 || !s.f[s.rival].alive) {
      var seen = {}, best = -1, bn = 0;
      dongsOf(s, 0).forEach(function (i) { D.d[i].a.forEach(function (j) { var o = s.owner[j]; if (o > 0 && !seen[o]) { seen[o] = 1; var n = dongsOf(s, o).length; if (n > bn) { bn = n; best = o; } } }); });
      if (best > 0) { s.rival = best; s.rivalAt = s.month; pushLog(s, s.f[best].name + ': 앞으로 자주 보겠네요.', 'riv'); }
      return;
    }
    if (s.month - s.rivalAt >= 6) {
      s.rivalAt = s.month;
      pushLog(s, s.f[s.rival].name + ': ' + pick(s, RIVAL_LINES), 'riv');
    }
  }
  // ---- 생존 협상: 싸울 힘이 없는 숙적(권역장부터는 작은 세력도)이 조건부 통합을 제안 ----
  function touchesMe(s, fid) { return dongsOf(s, fid).some(function (i) { return D.d[i].a.some(function (j) { return s.owner[j] === 0; }); }); }
  function tickOffer(s) {
    if (s.offer && (s.offer.exp <= s.month || !s.f[s.offer.f].alive)) {
      if (s.f[s.offer.f].alive) pushLog(s, s.f[s.offer.f].name + '의 생존 협상 제안이 흐지부지됐습니다.');
      s.offer = null;
    }
    var late = s.rank >= 2 && popShare(s, 0) >= 0.4;   // 승부가 기울면 제안이 잦아짐
    if (s.offer || s.month <= C.GRACE || (s.offerAt || -9) + (late ? 2 : 6) > s.month) return;
    var me = s.f[0], pn = dongsOf(s, 0).length, best = null;
    s.f.forEach(function (f) {
      if (!f.ai || !f.alive || f.offered || (me.pact && me.pact[f.id] > s.month)) return;
      var n = dongsOf(s, f.id).length;
      if (n < 2 || !touchesMe(s, f.id)) return;
      var weak = f.troops < me.troops * 0.25 && pn >= n * 4;
      if (f.id === s.rival ? weak && n <= 8 : s.rank >= 2 && weak && n <= (late ? 10 : 5)) { if (!best || f.id === s.rival) best = f; }
    });
    if (!best) return;
    best.offered = true; s.offerAt = s.month;
    s.offer = { f: best.id, exp: s.month + 3 };
    pushLog(s, best.name + ': 본거지 하나만 남겨 주시면 나머지는 넘기겠습니다. (생존 협상 제안)', 'riv');
  }
  function offerInfo(s) {
    if (!s.offer) return null;
    var f = s.f[s.offer.f], give = dongsOf(s, f.id).filter(function (i) { return i !== f.cap; });
    var cost = Math.round(give.length * 12);
    return { f: f.id, name: f.name, rival: f.id === s.rival, give: give, cap: f.cap, cost: cost, left: s.offer.exp - s.month, pop: give.reduce(function (a, i) { return a + D.d[i].pop; }, 0),
      ok: s.ap > 0 && s.f[0].money >= cost, why: s.ap <= 0 ? '이번 달 결재를 다 썼습니다.' : s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '' };
  }
  function acceptOffer(s) {
    var o = offerInfo(s);
    if (!o) return { err: '받은 제안이 없습니다.' };
    if (!o.ok) return { err: o.why };
    var f = s.f[o.f], me = s.f[0];
    me.money -= o.cost; s.ap--;
    o.give.forEach(function (i) { s.owner[i] = 0; s.min[i] = Math.min(s.min[i], 65); joinSoft(s, i); });
    s.stat.took += o.give.length; s.stat.talked += o.give.length; s.stat.deal = (s.stat.deal || 0) + 1;
    if (!me.pact) me.pact = {};
    me.pact[f.id] = s.month + 12;
    if (s.rival === f.id) { s.stat.rivalDown = f.name; s.rival = -1; }
    pushLog(s, J(f.name, '과', '와') + ' 생존 협상 타결. ' + o.give.length + '개 동을 넘겨받고 본거지 ' + J(D.d[f.cap].n, '은', '는') + ' 남겨 두기로 했습니다. 12개월 불가침.', 'good');
    s.offer = null;
    afterChange(s);
    return { ok: true, n: o.give.length, rival: o.rival, name: f.name };
  }
  function declineOffer(s) {
    if (!s.offer) return { err: '받은 제안이 없습니다.' };
    var f = s.f[s.offer.f];
    f.troops *= 1.15;
    pushLog(s, f.name + '의 제안을 거절했습니다. 저쪽 회원들이 결사 항전을 다짐합니다.', 'riv');
    s.offer = null;
    return { ok: true };
  }
  function nemesis(s) {
    var best = null;
    s.f.forEach(function (f) { if (f.ai && (f.tookMine || 0) > 0 && (!best || f.tookMine > best.tookMine)) best = f; });
    if (best) return best.name;
    return s.rival >= 0 ? s.f[s.rival].name : (s.stat.rivalDown || null);
  }
  function migrate(o) {
    if (!o || !o.owner || !o.f || !o.dev || o.owner.length !== D.d.length || o.dev.length !== D.d.length * 4 || !o.f[0]) return null;
    o.f.forEach(function (f) { if (f.away === undefined) f.away = 0; if (f.ai && f.tookMine === undefined) f.tookMine = 0; });
    var st = o.stat || (o.stat = {});
    ['took', 'lost', 'sent', 'home', 'built', 'merged', 'biggest', 'talked', 'raid', 'bridge', 'guop', 'events'].forEach(function (k) { if (st[k] === undefined) st[k] = 0; });
    if (o.ev === undefined) o.ev = null;
    if (!o.evUsed) o.evUsed = [];
    if (o.nextEv === undefined) o.nextEv = o.month + 3;
    if (o.rival === undefined) o.rival = -1;
    if (o.rivalAt === undefined) o.rivalAt = o.month;
    if (o.weakAt === undefined) o.weakAt = -9;
    if (!o.gov) o.gov = { open: null, sites: {}, nextAt: o.month + 3, idx: 0 };
    if (!o.abil) o.abil = abilityOf(D.d[o.start].type);
    if (!o.cards) { o.cards = []; o.cardOffer = null; o.cardQ = 0; o.cardNext = o.month + 6; }
    if (o.coal === undefined) o.coal = null; if (o.elect === undefined) o.elect = null;
    if (o.camp === undefined) o.camp = o.elect ? { pl: [], g: {}, u: {} } : null;
    if (!o.zones) { o.zones = []; o.zoneSeq = 0; }
    if (!o.hist) { o.hist = { o0: o.owner.slice(), m0: o.month, d: [] }; o.hp = o.owner.slice(); }
    o.f.forEach(function (f) { if (f.ai) { if (f.hate === undefined) f.hate = 0; if (f.warm === undefined) f.warm = 0; } });
    o.f.forEach(function (f) { if (f.ai && !f.boss) f.boss = { nm: SUR[(f.id * 7) % SUR.length] + GIV[(f.id * 11 + 3) % GIV.length], face: f.id * 7919 % 1000000 }; });
    if (!o.scoutAt) o.scoutAt = {}; if (o.vote === undefined) o.vote = null; if (o.express === undefined || o.express === -1) o.express = -99; if (o.rallyAt === undefined) o.rallyAt = -99;
    if (o.gov && o.gov.sites) Object.keys(o.gov.sites).forEach(function (k) { if (o.gov.sites[k].paid === undefined) o.gov.sites[k].paid = 2; });
    if (o.offer === undefined) o.offer = null;
    if (!o.settle) o.settle = {};
    if (!o.combo) o.combo = {};
    if (!o.stable) o.stable = {}; if (o.exprProj === undefined) o.exprProj = false; if (o.rivalPlan === undefined) o.rivalPlan = null; if (o.awayLate === undefined) o.awayLate = 0;
    o.f.forEach(function (f) { if (f.ai && f.lostAt === undefined) f.lostAt = -9; });
    if (!o.log) o.log = [];
    if (!o.last) o.last = [];
    o.v = 2;
    return o;
  }

  // ---- 진급 / 승리 ----
  function cardPool(s) {
    return Object.keys(CARDS).filter(function (k) {
      if (hasCard(s, k)) return false;
      var nd = CARDS[k].need;
      if (nd === 'sub' && !D.d.some(function (d) { return d.sub > 0; })) return false;
      if (nd === 'water' && !D.d.some(function (d) { return d.r.length; })) return false;
      return true;
    });
  }
  function offerCards(s, why) {
    if (!s.cards) { s.cards = []; s.cardQ = 0; }
    if (s.cardOffer) { s.cardQ = (s.cardQ || 0) + 1; return; }
    var pool = cardPool(s), out = [];
    while (out.length < 3 && pool.length) { var k = pool.splice(Math.floor(rnd(s) * pool.length), 1)[0]; out.push(k); }
    if (out.length) { s.cardOffer = out; s.cardWhy = why || ''; }
  }
  function chooseCard(s, k) {
    if (!s.cardOffer || s.cardOffer.indexOf(k) < 0) return { err: '고를 수 없는 카드입니다.' };
    s.cards.push(k); s.cardOffer = null;
    if (k === 'bond') { var e = economy(s, 0); s.f[0].money += Math.round(e.tax * 4); }
    pushLog(s, '정책 카드 시행: ' + CARDS[k].n + '. ' + CARDS[k].e + '.', 'good');
    if (s.cardQ > 0) { s.cardQ--; offerCards(s, s.cardWhy); }
    return { ok: true };
  }
  // ---- 반동장 연합과 선거 ----
  function coalForm(s) {
    var m = s.f.filter(function (f) { return f.ai && f.alive && dongsOf(s, f.id).length; }).map(function (f) { return f.id; });
    var stay = m.filter(function (id) { return (s.f[id].warm || 0) >= 50 && s.f[0].pact && s.f[0].pact[id] > s.month; });
    m = m.filter(function (id) { return stay.indexOf(id) < 0; });
    if (m.length < 2) return;
    s.coal = { at: s.month, m: m, stay: stay };
    stay.forEach(function (id) { pushLog(s, s.f[id].boss.nm + ' 회장(' + s.f[id].name + ')은 우리와의 의리를 지켜 연합에 들지 않았습니다.', 'good'); });
    var broke = 0;
    m.forEach(function (id) { var f = s.f[id]; f.troops *= 1.1; if (s.f[0].pact && s.f[0].pact[id] > s.month) { delete s.f[0].pact[id]; broke++; } });
    pushLog(s, '남은 세력 ' + m.length + '곳이 반동장 연합을 맺었습니다. 서로 싸우지 않고 우리만 노립니다.' + (broke ? ' 불가침 협정 ' + broke + '건이 깨졌습니다.' : ''), 'bad');
  }
  function inCoal(s, fid) { return !!(s.coal && s.coal.m.indexOf(fid) >= 0); }
  // 예상 득표율: 우리 동은 민심에 따라 35~90%, 독립 동 25%(우리와 맞닿으면 35%), 다른 세력 동 10%(협정 중이면 20%)
  // 선거 기간에는 공약(동 유형별 반응)과 구별 유세가 더해짐
  function voteOf(s, i) {
    var o = s.owner[i], p, d = D.d[i];
    if (o === 0) p = 0.35 + 0.55 * s.min[i] / 100;
    else if (o === -1) p = d.a.some(function (j) { return s.owner[j] === 0; }) ? 0.35 : 0.25;
    else p = s.f[0].pact && s.f[0].pact[o] > s.month ? 0.2 : 0.1;
    var cp = s.camp;
    if (cp && s.elect && !s.won) {
      (cp.pl || []).forEach(function (k) { var P = PLEDGES[k]; if (!P) return; p += (P.fx[d.type] || 0) + (P.nosub && !(d.sub > 0) ? P.nosub : 0) + (P.all || 0); });
      if (cp.pl && cp.pl.length && cp.prev) p += cp.flip ? -0.02 : 0.01;
      var k = (cp.g && cp.g[d.g]) || 0;
      if (k) p += k * (o === 0 ? 0.1 : o === -1 ? 0.12 : 0.08);
    }
    return Math.max(0.02, Math.min(0.97, p));
  }
  function voteShare(s) {
    var v = 0;
    for (var i = 0; i < s.owner.length; i++) v += D.d[i].pop * voteOf(s, i);
    return v / TOTALPOP;
  }
  function voteGu(s, g) {
    var v = 0, p = 0;
    GUDONGS[g].forEach(function (i) { v += D.d[i].pop * voteOf(s, i); p += D.d[i].pop; });
    return p ? v / p : 0;
  }
  function campCost(s, g) { return Math.round(15 + GUDONGS[g].length * 1.5); }
  function campInfo(s, g) {
    if (!s.elect || s.won) return { ok: false, why: '선거 기간에만 할 수 있습니다.' };
    var cp = s.camp || (s.camp = { pl: [], g: {}, u: {} });
    var used = (cp.u && cp.u[g]) || 0, cost = campCost(s, g);
    if (!GUDONGS[g].some(function (i) { return s.owner[i] === 0; })) return { ok: false, why: '우리 동이 하나라도 있는 구에서만 유세할 수 있습니다.', used: used, cost: cost };
    var k0 = cp.g[g] || 0, v0 = voteShare(s); cp.g[g] = k0 + 1; var v1 = voteShare(s); cp.g[g] = k0;
    var why = used >= 3 ? '이 구는 이번 선거에 세 번 다 돌았습니다.' : s.ap <= 0 ? '이번 달 결재를 다 썼습니다.' : s.f[0].money < cost ? '예산이 ' + Math.ceil(cost - s.f[0].money) + '억 모자랍니다.' : '';
    return { ok: !why, why: why, used: used, cost: cost, gain: v1 - v0 };
  }
  function campaign(s, g) {
    var ci = campInfo(s, g);
    if (!ci.ok) return { err: ci.why };
    var cp = s.camp;
    s.ap--; s.f[0].money -= ci.cost;
    cp.g[g] = (cp.g[g] || 0) + 1; cp.u = cp.u || {}; cp.u[g] = (cp.u[g] || 0) + 1;
    s.stat.rally = (s.stat.rally || 0) + 1;
    pushLog(s, D.gu[g].n + ' 유세. 예상 득표율 +' + (ci.gain * 100).toFixed(1) + '%p.', 'good');
    return { ok: true, gain: ci.gain };
  }
  function choosePledges(s, arr) {
    if (!s.elect || s.won) return { err: '선거 기간이 아닙니다.' };
    if (!arr || arr.length !== 2 || arr[0] === arr[1] || !PLEDGES[arr[0]] || !PLEDGES[arr[1]]) return { err: '공약 두 개를 고르세요.' };
    var cp = s.camp || (s.camp = { pl: [], g: {}, u: {} });
    cp.pl = arr.slice();
    cp.flip = !!(cp.prev && cp.prev.slice().sort().join() !== arr.slice().sort().join());
    pushLog(s, '공약 발표: ' + PLEDGES[arr[0]].n + ', ' + PLEDGES[arr[1]].n + '.' + (cp.prev ? cp.flip ? ' 지난 선거와 공약이 달라 말 바꾸기라는 소리를 듣습니다.' : ' 지난 공약을 그대로 지켜 믿음을 얻었습니다.' : ''), 'good');
    return { ok: true };
  }
  // 상대 맞불 유세: 선거 기간에 원한 많은 회장이 우리 표밭 한 구를 깎음
  function counterCamp(s) {
    if (!s.elect || s.won || !s.camp) return;
    var foes = s.f.filter(function (f) { return f.ai && f.alive && dongsOf(s, f.id).length && (inCoal(s, f.id) || (f.hate || 0) >= 20); });
    if (!foes.length || rnd(s) > 0.65) return;
    foes.sort(function (a, b) { return ((b.hate || 0) + (b.adv ? 30 : 0)) - ((a.hate || 0) + (a.adv ? 30 : 0)); });
    var f = foes[0], best = -1, bp = -1;
    GUDONGS.forEach(function (list, g) {
      if (!list.some(function (i) { return s.owner[i] === f.id; }) && !list.some(function (i) { return s.owner[i] === 0 && D.d[i].a.some(function (j) { return s.owner[j] === f.id; }); })) return;
      var p = 0; list.forEach(function (i) { if (s.owner[i] === 0) p += D.d[i].pop; });
      if ((s.camp.g[g] || 0) <= -2) return;
      if (p > bp) { bp = p; best = g; }
    });
    if (best < 0 || bp <= 0) return;
    s.camp.g[best] = (s.camp.g[best] || 0) - 1;
    s.camp.last = { f: f.id, g: best, m: s.month };
    pushLog(s, (f.adv ? f.adv.nm + ' 고문' : f.boss.nm + ' 회장') + '(' + f.name + ')이 ' + D.gu[best].n + '에서 맞불 유세를 했습니다. 그 구 득표율이 떨어졌습니다.', 'riv');
  }
  function election(s) {
    var v = voteShare(s), win = v > 0.5;
    s.elect.res = { v: v, win: win, m: s.month };
    if (win) {
      s.won = true; s.rank = 3; s.promo = 3; s.stat.vote = v;
      pushLog(s, C.RANKS[3] + ' 선거에서 득표율 ' + (v * 100).toFixed(1) + '%로 당선됐습니다. ' + C.RANKS[3] + '에 취임합니다.', 'rank');
    } else {
      s.elect = { at: s.month + 6, n: (s.elect.n || 1) + 1, last: v, res: s.elect.res };
      if (s.camp) { s.camp.prev = (s.camp.pl || []).slice(); s.camp.g = {}; s.camp.u = {}; s.camp.flip = false; }
      pushLog(s, '선거에서 떨어졌습니다. 득표율 ' + (v * 100).toFixed(1) + '%. 6달 뒤 재선거입니다. 우리 동 민심을 올리고 땅을 더 넓히세요.', 'bad');
    }
  }
  function guHeld(s, fid) {
    var c = 0;
    GUDONGS.forEach(function (list) {
      var k = 0; list.forEach(function (i) { if (s.owner[i] === fid) k++; });
      if (k * 2 >= list.length) c++;
    });
    return c;
  }
  function popShare(s, fid) {
    var p = 0;
    for (var i = 0; i < s.owner.length; i++) if (s.owner[i] === fid) p += D.d[i].pop;
    return p / TOTALPOP;
  }
  function rankNow(s) {
    var g = guHeld(s, 0);
    return g >= (C.R2 || 4) ? 2 : g >= 1 ? 1 : 0;
  }
  function maxAP(s) {
    var n = dongsOf(s, 0).length;
    return [2, 3, 5, 5][Math.max(s.rank, rankNow(s))] + Math.min(10, Math.floor(n / 15)) + (hasCard(s, 'paper') ? 1 : 0);
  }
  function afterChange(s) {
    if (s.owner && s.f && s.f[0]) { checkCombos(s); zonesClean(s); }
    var r = rankNow(s);
    if (r > s.rank) {
      s.rank = r;
      s.promo = r;
      if (r === 1) s.stat.r1 = s.month;
      if (r === 2) { s.stat.r2 = s.month; if (s.stat.r1 === undefined) s.stat.r1 = s.month; }
      offerCards(s, 'rank');
      var extra = maxAP(s) - s.ap;
      pushLog(s, (r === 3 ? C.RANKS[3] : r === 1 && C.KIND !== 'metro' ? C.RANKS[1] : C.RANKS[r]) + '에 올랐습니다.', 'rank');
      if (s.rival >= 0 && s.f[s.rival].alive) pushLog(s, s.f[s.rival].name + ': ' + (r === 1 ? '벌써 ' + J(C.RANKS[1], '이라고요', '라고요') + '? 우리 회장님이 가만 안 있습니다.' : J(C.RANKS[2], '이요', '요') + '? 우리 단톡방에서는 아직 동장님입니다.'), 'riv');
    }
    s.stat.biggest = Math.max(s.stat.biggest, dongsOf(s, 0).length);
    var sh = popShare(s, 0);
    if (!s.won && !s.coal && sh >= C.COAL_POP && s.month > 0) coalForm(s);
    if (!s.won && !s.elect && sh >= C.WIN_POP) {
      s.elect = { at: s.month + C.ELECT_WAIT, n: 1 };
      s.camp = { pl: [], g: {}, u: {} };
      pushLog(s, CITY.name + ' 인구의 60%를 장악했습니다. ' + C.ELECT_WAIT + '달 뒤 ' + C.RANKS[3] + ' 선거입니다. 우리 동 민심이 표가 됩니다.', 'rank');
    }
    if (s.over && !s.endLogged) { s.endLogged = 1; pushLog(s, '마지막 동까지 빼앗겼습니다.', 'bad'); }
  }

  // ---- 월말 처리 ----
  function aiTurn(s, f) {
    var e = economy(s, f.id), tr = traitOf(s, f.id);
    f.troops += f.away || 0; f.away = 0;
    var big = e.n <= 12 ? 1 : Math.pow(12 / e.n, 0.45);
    f.money += e.net * 0.8 * big * tr.money;
    f.troops += e.draft * 0.85 * big - f.troops * 0.02;
    var list = dongsOf(s, f.id);
    if (!list.length) { f.alive = false; return; }
    // 정부 공모에 낼 서류가 있으면 부담금은 남겨 둠
    var hold = 0;
    if (s.gov && s.gov.open && s.gov.open.k !== 'plant') {
      var gk = s.gov.open.k;
      if (list.some(function (i) { return !govElig(s, f.id, gk, i); })) hold = GOV[gk].cost;
    }
    // 예산: 인원 모집 + 개발
    if (f.money > hold) {
      var spend = (f.money - hold) * tr.rec;
      if (rnd(s) < tr.dev && spend >= 25) {
        var r0 = rnd(s), i = pick(s, list), t = r0 < 0.4 ? 0 : r0 < 0.75 ? 2 : r0 < 0.88 ? 1 : 3, c = devCost(s, i, t);
        if (c !== null && c <= f.money - hold) { f.money -= c; s.dev[i * 4 + t]++; applyDevSide(s, i, t); spend = Math.max(0, f.money - hold) * 0.5; }
      }
      f.money -= spend;
      f.troops += spend * C.RECRUIT;
    }
    var tries = Math.max(1, Math.min(3, 1 + Math.floor(list.length / 12)) + tr.tries);
    var touching = list.some(function (i) { return D.d[i].a.some(function (j) { return s.owner[j] === 0; }); });
    var pounce = touching && s.weakAt === s.month - 1 && s.month > C.GRACE && dongsOf(s, 0).length > 5 && f.id === s.rival && !(s.f[0].pact && s.f[0].pact[f.id] > s.month);
    if (pounce) {
      tries += 1;
      var wb = weakBorder(s, f.id);
      if (wb && f.troops * 0.8 >= wb.need * 1.2) pushLog(s, J(f.name, '이', '가') + ' 우리가 무너진 틈을 노립니다.', 'riv');
      else if (f.id === s.rival) { f.troops += Math.max(0, f.money) * C.RECRUIT; f.money = 0; pushLog(s, J(f.name, '은', '는') + ' 칠 힘이 없어 본거지 문을 걸어 잠그고 인원을 모읍니다.', 'riv'); pounce = false; }
    }
    var me0 = s.f[0], opp = false;
    if (!pounce && touching && f.id === s.rival && s.month > C.GRACE + 4 && dongsOf(s, 0).length > 10 && (me0.away || 0) > Math.max(30, me0.troops) * 2 && (s.rivalHitAt || -9) + 4 <= s.month && !(me0.pact && me0.pact[f.id] > s.month)) {
      var wb2 = weakBorder(s, f.id);
      if (wb2 && f.troops * 0.8 >= wb2.need * 1.3) { opp = true; s.rivalHitAt = s.month; tries += 1; pushLog(s, J(f.name, '이', '가') + ' 우리 인원이 비어 있는 틈을 노립니다.', 'riv'); }
    }
    var meP = !!(s.f[0].pact && s.f[0].pact[f.id] > s.month);
    var grudge = touching && !meP && s.month > C.GRACE + 2 && ((f.hate || 0) >= 55 || (f.adv && (f.hate || 0) >= 35));
    if (grudge && !f.hateSaid) { f.hateSaid = 1; pushLog(s, (f.adv ? f.adv.nm + ' 고문' : f.boss.nm + ' 회장') + '(' + f.name + ')이 우리 이름만 들어도 이를 갑니다. 먼저 노릴 겁니다.', 'riv'); }
    if ((f.hate || 0) < 30) f.hateSaid = 0;
    var hunt = pounce || opp || (inCoal(s, f.id) && touching) || grudge;
    // 본거지가 위협받으면 확장을 멈추고 지킨다
    var capDef = defense(s, f.cap).total, threat = 0;
    D.d[f.cap].a.forEach(function (j) { var o = s.owner[j]; if (o >= 0 && o !== f.id) threat = Math.max(threat, s.f[o].troops + (o === 0 ? s.f[o].away || 0 : 0)); });
    if (threat * 0.8 > capDef) { f.troops += Math.max(0, f.money) * C.RECRUIT * 0.5; f.money *= 0.5; tries = inCoal(s, f.id) && touching ? 1 : 0; }   // 연합은 겁먹지 않고 계속 침
    if (f.lostAt + 1 >= s.month) tries = Math.min(tries, 1);
    // 숙적 작전: 예고한 동을 친다. 본거지가 위협받아 못 나오면 미룸
    if (tries <= 0 && s.rivalPlan && s.rivalPlan.f === f.id && s.owner[s.rivalPlan.t] === 0) {
      pushLog(s, J(f.name, '이', '가') + ' 본거지를 지키느라 ' + D.d[s.rivalPlan.t].n + ' 공격을 미뤘습니다. 대비가 통했습니다.', 'good');
      s.stat.deterred = (s.stat.deterred || 0) + 1; s.rivalPlan = null;
    }
    if (tries > 0 && s.rivalPlan && s.rivalPlan.f === f.id && s.owner[s.rivalPlan.t] === 0 && !(s.f[0].pact && s.f[0].pact[f.id] > s.month)) {
      var pt = s.rivalPlan.t, pr = route(s, f.id, pt);
      if (pr) {
        var pdef = defense(s, pt).total, pn = Math.min(f.troops * 0.85, s.rivalPlan.n || pdef * 1.6 / (1 + pr.mult));   // 예고한 인원만 보냄
        if (pn * (1 + pr.mult) < pdef * 1.05) {
          // 지난달 스카우트로 빠진 인원이 없었다면 쳐들어왔을지 실제로 계산해서만 스카우트 덕이라고 말함
          var sg = s.scoutAt && s.scoutAt[f.id] === s.month - 1 && s.scoutGain ? s.scoutGain[f.id] || 0 : 0;
          var withSg = Math.min((f.troops + sg) * 0.85, s.rivalPlan.n || 1e9) * (1 + pr.mult);
          if (sg && withSg >= pdef * 1.05) pushLog(s, '스카우트로 ' + f.name + '의 공세가 무산됐습니다. 빼 온 ' + sg + '명이 없었다면 ' + ro(D.d[pt].n) + ' 쳐들어왔을 겁니다.', 'good');
          else pushLog(s, J(f.name, '이', '가') + ' ' + D.d[pt].n + ' 공격을 접었습니다. 대비가 통했습니다.', 'good');
          s.stat.deterred = (s.stat.deterred || 0) + 1; s.rivalPlan = null; tries--;
          pr = null;
        }
      }
      if (pr) {
        var pres = resolve(s, f.id, pt, pn, pr, true);
        tries--;
        if (pres.win) { s.stat.lost++; f.tookMine = (f.tookMine || 0) + 1; pushLog(s, f.name + '의 작전. ' + J(D.d[pt].n, '을', '를') + ' 빼앗겼습니다.', 'bad', pt); if (pres.movedCap !== undefined) pushLog(s, '본거지를 ' + ro(D.d[pres.movedCap].n) + ' 옮겼습니다.', 'bad'); }
        else { f.lostAt = s.month; pushLog(s, J(D.d[pt].n, '이', '가') + ' ' + f.name + '의 작전을 막아냈습니다.', 'good', pt); if (pres.facNote) pushLog(s, pres.facNote, 'good'); }
      }
      s.rivalPlan = null;
    }
    while (tries-- > 0 && !s.over) {
      list = dongsOf(s, f.id);
      if (!list.length) break;
      var seen = {}, bestT = -1, bestScore = -1, bestR = null;
      for (var a = 0; a < list.length; a++) {
        var adj = D.d[list[a]].a;
        for (var b = 0; b < adj.length; b++) {
          var t2 = adj[b];
          if (seen[t2] || s.owner[t2] === f.id) continue;
          seen[t2] = 1;
          var o = s.owner[t2];
          if (o > 0 && inCoal(s, f.id) && inCoal(s, o)) continue;
          if (o === 0) {
            if (s.month <= C.GRACE) continue;
            if (s.f[0].pact && s.f[0].pact[f.id] > s.month) continue;
            if (!hunt && rnd(s) < ((f.warm || 0) >= 40 ? 0.85 : 0.58)) continue;
          }
          var def = defense(s, t2).total;
          var r = route(s, f.id, t2);
          if (!r) continue;
          var need = def * 1.25 / (1 + r.mult);
          if (need > f.troops * 0.8) continue;
          var val = D.d[t2].P + D.d[t2].E + 10;
          if (hunt && o === 0) val *= 2.5;
          if (D.d[t2].g === D.d[f.cap].g) val *= 1.5;
          if (o >= 0 && s.f[o].cap === t2) val *= 1.8;
          var sc = val / def * (0.8 + rnd(s) * 0.4);
          if (sc > bestScore) { bestScore = sc; bestT = t2; bestR = r; }
        }
      }
      if (bestT < 0) break;
      var dv = defense(s, bestT).total;
      var n = Math.min(f.troops * 0.8, dv * 1.55 / (1 + bestR.mult));
      var from = s.owner[bestT];
      var res = resolve(s, f.id, bestT, n, bestR);
      if (from === 0) {
        if (res.win) {
          s.stat.lost++;
          f.tookMine = (f.tookMine || 0) + 1;
          pushLog(s, f.name + '에게 ' + J(D.d[bestT].n, '을', '를') + ' 빼앗겼습니다.', 'bad', bestT);
          if (f.id === s.rival && rnd(s) < 0.25) pushLog(s, f.name + ': ' + D.d[bestT].n + ' 잘 받았습니다. 답례 떡은 안 돌립니다.', 'riv');
          if (res.movedCap !== undefined) pushLog(s, '본거지를 ' + ro(D.d[res.movedCap].n) + ' 옮겼습니다. 인원 일부가 흩어졌습니다.', 'bad');
        } else { f.lostAt = s.month; pushLog(s, J(D.d[bestT].n, '이', '가') + ' ' + f.name + '의 공격을 막아냈습니다.', 'good', bestT); if (res.facNote) pushLog(s, res.facNote, 'good'); }
      } else if (res.collapse) {
        pushLog(s, J(f.name, '이', '가') + ' ' + J(res.collapse.name, '을', '를') + ' 무너뜨렸습니다.');
      }
    }
  }
  function endTurn(s) {
    RP = null;
    if (s.over) return s.last;
    s.last = [];
    s.battles = [];
    s.month++;
    var me = s.f[0];
    var e = economy(s, 0);
    me.money = Math.max(0, me.money + e.net);
    devPlanRun(s, e.net);
    var fr = facReport(s);
    s.stat.facMoney = (s.stat.facMoney || 0) + fr.tax; s.stat.facDraft = (s.stat.facDraft || 0) + fr.draft;
    var fa = s.facAcc = s.facAcc || { tax: 0, draft: 0, n: 0, it: {} }; fa.it = fa.it || {};
    fa.tax += fr.tax; fa.draft += fr.draft; fa.n++;
    fr.items.forEach(function (x) { var k = x.name + '|' + x.t; var o = fa.it[k] || (fa.it[k] = { name: x.name, t: x.t, n: x.n, v: 0 }); o.v += x.v; o.n = x.n; });
    if (fa.n >= 3) {
      var tops = Object.keys(fa.it).map(function (k) { return fa.it[k]; }).sort(function (a, b) { return b.v - a.v; });
      if (tops.length && fa.tax + fa.draft > 1) {
        var top = tops[0];
        pushLog(s, '시설 성과(3달): ' + top.name + (top.t === 'gov' ? '에서 ' : ' 덕분에 주변 ' + top.n + '개 동에서 ') + (top.t === 2 ? '인원 ' + Math.round(top.v) + '명' : Math.round(top.v) + '억') + ' 추가. 시설 전체로는 ' + Math.round(fa.tax) + '억' + (fa.draft >= 1 ? ', 인원 ' + Math.round(fa.draft) + '명' : '') + '.', 'good');
      }
      s.facAcc = { tax: 0, draft: 0, n: 0, it: {} };
    }
    me.troops = Math.max(0, me.troops + e.draft - e.decay);
    for (var i = 0; i < s.owner.length; i++) {
      var heal = 5 + lv(s, i, 3) * 2 + (TYPES[D.d[i].type].heal || 0) + (lv(s, i, 3) >= 5 ? 5 : 0);
      if (s.gov) {
        var gi = govDone(s, i);
        if (gi && gi.k === 'agency' && lv(s, i, 1) < 4) heal -= 3;
        if (gi && gi.k === 'plant') heal -= 2;
        if (gi && gi.k === 'hospital') heal += 3;
        else if (D.d[i].a.some(function (j) { var gj = govDone(s, j); return gj && gj.k === 'hospital' && s.owner[j] === s.owner[i] && s.owner[i] >= 0; })) heal += 3;
      }
      if (s.owner[i] === 0) heal += (hasCard(s, 'festival') ? 3 : 0) - (hasCard(s, 'youth') ? 1 : 0);
      s.min[i] = Math.min(gi && gi.k === 'plant' && !gi.pact ? 70 : 100, s.min[i] + heal);
    }
    RP = { start: s.owner.slice(), ev: [] };
    // 반란: 민심이 바닥인 동은 독립할 수 있음
    dongsOf(s, 0).forEach(function (i) {
      if (s.min[i] < 40 && s.f[0].cap !== i && !(s.stable && s.stable[D.d[i].g] > s.month) && lv(s, i, 3) < 5 && !nbLv(s, i, 3, 5) && rnd(s) < (s.min[i] < 25 ? 0.12 : 0.06)) {
        s.owner[i] = -1; s.min[i] = 60;
        rpPush(s, { k: 'rebel', t: i, o: 0, ch: [[i, -1]] });
        pushLog(s, '민심이 낮았던 ' + D.d[i].n + ' 주민들이 독립을 선언했습니다.', 'bad', i);
      }
    });
    var order = s.f.filter(function (f) { return f.ai && f.alive; });
    for (var k = order.length - 1; k > 0; k--) { var j = Math.floor(rnd(s) * (k + 1)); var tmp = order[k]; order[k] = order[j]; order[j] = tmp; }
    order.forEach(function (f) { if (f.alive && !s.over) aiTurn(s, f); });
    // 내분: 덩치가 커진 세력은 갈라질 수 있음
    s.f.filter(function (f) { return f.ai && f.alive; }).forEach(function (f) {
      var list = dongsOf(s, f.id);
      if (list.length < 36 || rnd(s) > Math.min(0.22, (list.length - 30) * 0.006)) return;
      var groups = {};
      list.forEach(function (i) { var g = D.d[i].g; if (g !== D.d[f.cap].g) (groups[g] = groups[g] || []).push(i); });
      var keys = Object.keys(groups);
      if (!keys.length) return;
      var part = groups[pick(s, keys)];
      part.sort(function (a, b) { return D.d[b].base - D.d[a].base; });
      var id = addFaction(s, part[0], f.troops * part.length / list.length);
      f.troops *= 1 - part.length / list.length;
      part.forEach(function (i) { s.owner[i] = id; s.min[i] = Math.min(s.min[i], 60); });
      rpPush(s, { k: 'split', f: id, o: f.id, t: part[0], ch: part.map(function (i) { return [i, id]; }) });
      pushLog(s, f.name + '에 내분이 일어났습니다. ' + J(s.f[id].name, '이', '가') + ' ' + part.length + '개 동을 들고 나갔습니다.');
    });
    // 새 세력: 빈 동네가 많으면 가끔 등장
    if (s.month % 10 === 0) {
      var free = [];
      for (var q = 0; q < s.owner.length; q++) if (s.owner[q] === -1) free.push(q);
      if (free.length > 40) {
        var c = pick(s, free);
        if (D.d[c].P + D.d[c].E > 90) {
          var id = addFaction(s, c, 180 + s.month * 3);
          rpPush(s, { k: 'rise', f: id, o: -1, t: c, ch: [[c, id]] });
          pushLog(s, J(s.f[id].name, '이', '가') + ' ' + D.d[c].n + '에서 들고일어났습니다.');
        }
      }
    }
    me.troops += me.away || 0; me.away = 0;   // 출동 인원은 AI 턴이 끝난 뒤 복귀
    tickVote(s); tickRivalPlan(s); tickGov(s);
    Object.keys(me.pact || {}).forEach(function (fid) {
      if (me.pact[fid] === s.month + 1 && s.f[fid].alive) pushLog(s, J(s.f[fid].name, '과', '와') + '의 협정이 다음 달 끝납니다.');
      if (me.pact[fid] === s.month && s.f[fid].alive) { feel(s, +fid, 0, 20); pushLog(s, J(s.f[fid].name, '과', '와') + '의 협정을 끝까지 지켰습니다. ' + s.f[fid].boss.nm + ' 회장이 고마워합니다.', 'good'); }
    });
    s.f.forEach(function (f) { if (f.ai && f.alive) { f.hate = Math.max(0, (f.hate || 0) - 1.5); f.warm = Math.max(0, (f.warm || 0) - 0.5); } });
    counterCamp(s);
    if (RP) RP.done = true;
    if (!s.over) { tickEvents(s); tickRival(s); tickOffer(s); }
    afterChange(s);
    if (!s.over && s.elect && !s.won && s.month >= s.elect.at) election(s);
    if (!s.over && !s.won && s.month >= (s.cardNext || 6)) { s.cardNext = s.month + 6; offerCards(s, 'half'); }
    zonesClean(s);
    recordHist(s);
    s.ap = maxAP(s);
    return s.last;
  }

  // 달마다 바뀐 땅만 기록 (끝 화면 타임랩스용)
  function recordHist(s) {
    if (!s.hist) { s.hist = { o0: s.owner.slice(), m0: s.month, d: [] }; s.hp = s.owner.slice(); return; }
    var ch = [], hp = s.hp || s.hist.o0;
    for (var i = 0; i < s.owner.length; i++) if (s.owner[i] !== hp[i]) ch.push(i, s.owner[i]);
    if (ch.length) s.hist.d.push([s.month, ch]);
    s.hp = s.owner.slice();
  }
  function factionList(s) {
    return s.f.filter(function (f) { return f.alive; }).map(function (f) {
      return { id: f.id, name: f.name, n: dongsOf(s, f.id).length, troops: f.troops + (f.away || 0), pop: popShare(s, f.id), cap: f.cap };
    }).sort(function (a, b) { return b.n - a.n; });
  }

  return {
    realmDevPlan: realmDevPlan, realmDevelop: realmDevelop, autoDevType: autoDevType,
    PLEDGES: PLEDGES, devSide: devSide, moodOf: moodOf, voteOf: voteOf, voteGu: voteGu, campInfo: campInfo, campaign: campaign, choosePledges: choosePledges,
    zoneOf: zoneOf, zoneById: zoneById, zoneMax: zoneMax, zoneCheck: zoneCheck, zoneMake: zoneMake, zoneDissolve: zoneDissolve, zoneAttack: zoneAttack, zoneAttackPreview: zoneAttackPreview, zoneDevelop: zoneDevelop, zoneDevelopPreview: zoneDevelopPreview, zoneTargets: zoneTargets, nameOk: nameOk,
    C: C, setData: setData, setCity: setCity, city: function () { return CITY; }, replay: function () { return RP; }, CARDS: CARDS, hasCard: hasCard, chooseCard: chooseCard, offerCards: offerCards, voteShare: voteShare, inCoal: inCoal, SUR: SUR, GIV: GIV, headOf: headOf, stem: stem, create: create, preview: preview, needFor: needFor, attack: attack, develop: develop, devCost: devCost,
    recruit: recruit, persuade: persuade, persuadeCost: persuadeCost, pact: pact, pactCost: pactCost, pactCheck: pactCheck, breakPact: breakPact,
    merge: merge, mergeCost: mergeCost, mergeCheck: mergeCheck, endTurn: endTurn, economy: economy, defense: defense, route: route,
    dongsOf: dongsOf, guHeld: guHeld, popShare: popShare, rankNow: rankNow, maxAP: maxAP, factionList: factionList, lv: lv, taxOf: taxOf, draftOf: draftOf, drafted: drafted, nEff: nEff,
    fullMapOf: fullMapOf, fullGu: fullGu, stem: stem, power: power, J: J, ro: ro, TYPES: TYPES, traitOf: traitOf,
    guStatus: guStatus, guTargets: guTargets, guLimit: guLimit, guCost: function (s) { return C.GU_COST[s.rank]; }, guAttack: guAttack, guAttackPreview: guAttackPreview, guPersuade: guPersuade, guPersuadePreview: guPersuadePreview, guDevelop: guDevelop, guDevelopPreview: guDevelopPreview,
    devEffect: devEffect, spPreview: spPreview, COMBO: COMBO, roleOf: function (i) { return roleOf(D.d[i]); }, comboOn: comboOn, comboPreview: comboPreview, settleF: settleF, settleLeft: settleLeft, planInfo: planInfo, facReport: facReport, govTaxOf: govTaxOf, govNext: govNext, winChance: winChance, offerInfo: offerInfo, acceptOffer: acceptOffer, declineOffer: declineOffer, eventView: eventView, GOV: GOV, govInfo: govInfo, govApply: govApply, govPact: govPact, govSite: govSite, govDone: govDone, govEligible: govEligible, FAC: FAC, FAC_SP: FAC_SP, facName: facName, raidTargets: raidTargets, collapseText: collapseText, ABIL: ABIL, PROJECTS: PROJECTS, abilityOf: abilityOf, avgMood: avgMood,
    scoutInfo: scoutInfo, scout: scout, voteInfo: voteInfo, vote: vote, expressInfo: expressInfo, express: express, rallyInfo: rallyInfo, rally: rally,
    unityInfo: unityInfo, unity: unity, exprProjInfo: exprProjInfo, exprProj: exprProj, chooseEvent: chooseEvent, nemesis: nemesis, migrate: migrate, EVENTS: EVENTS,
    guDongs: function () { return GUDONGS; }, subwayOf: function (i, s) { return s && s.express === s.month ? SUBWAY6[i] : s && s.exprProj ? SUBWAY7[i] : SUBWAY[i]; }
  };
})();
if (typeof module !== 'undefined') module.exports = Engine;
