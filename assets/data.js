/**
 * 1. TRD 기반 마산 시범 구간 정적 시연 데이터 (demo-v1)
 * - 실제 이동에 사용 불가한 해커톤 검증 시연용 데이터 구조
 */
const DEMO_META = {
  source: 'sample',
  asOf: '2026-11-26T00:00:00Z',
  dataVersion: 'demo-v1',
  notice: '시연 데이터. 실제 이동에 사용하지 마세요.'
};

const DEVICES = {
  power_wheelchair: { id: 'power_wheelchair', label: '전동휠체어', speedKmh: 4.0, icon: '🦽' },
  scooter: { id: 'scooter', label: '전동스쿠터', speedKmh: 4.0, icon: '🛵' },
  manual_wheelchair: { id: 'manual_wheelchair', label: '수동휠체어', speedKmh: 3.0, icon: '🧑‍🦽' },
  stroller: { id: 'stroller', label: '유모차', speedKmh: 3.0, icon: '👶' }
};

const PLACES = {
  masan_univ: { id: 'masan_univ', name: '마산대학교 정문', zone: 'A', lat: 35.2492, lng: 128.5048, x: 90, y: 150 },
  naeseo_center: { id: 'naeseo_center', name: '내서읍 행정복지센터', zone: 'A', lat: 35.2415, lng: 128.5112, x: 510, y: 150 },
  masan_terminal: { id: 'masan_terminal', name: '마산시외버스터미널', zone: 'B', lat: 35.2368, lng: 128.5824, x: 90, y: 150 },
  hapseong_under: { id: 'hapseong_under', name: '합성동 지하상가 3번출구 인근', zone: 'B', lat: 35.2389, lng: 128.5841, x: 510, y: 150 },
  happo_office: { id: 'happo_office', name: '마산합포구청', zone: 'OUT', lat: 35.1795, lng: 128.5665, x: 300, y: 260 }
};

/**
 * 시범 경로 후보 및 구간 데이터
 * 상태값(status):
 * - passable: 양호 (초록/파랑)
 * - caution: 주의 (주황 - 경사 1/12 이상, 유효폭 1.2m 미만, 단차 2cm 초과 등)
 * - unknown: 정보 미확인 (회색 - 현장 조사 미완료 구간)
 * - blocked: 진입 불가 (빨강 - 계단, 높은 단차 등으로 추천 경로에서 제외됨)
 */
const DEMO_SCENARIOS = {
  // 시범 구역 A: 마산대학교 정문 <-> 내서읍 행정복지센터
  'masan_univ__naeseo_center': {
    zoneTitle: '마산 시범 구역 A (내서읍 대학로 ~ 광려천서로 일대)',
    observedAt: '2026-11-20',
    // 지도에 별도 표시할 시범 구역 내 진입 불가(blocked) 장애물 구간
    areaBlockedSegments: [
      {
        id: 'SEG-A-BLK-01',
        title: '구도로 보행육교 및 계단 구간',
        reason: '계단 14단 및 유효 보도폭 0.75m (전 기기 진입 불가)',
        lengthM: 120,
        points: '210,75 390,75',
        badgeX: 300,
        badgeY: 62
      }
    ],
    candidates: [
      {
        id: 'ROUTE-A-1',
        name: '광려천 평탄 산책로 우회길 (추천 쉬운 길)',
        carDurationMin: 4,
        segments: [
          { id: 'S-A1-1', name: '마산대 정문 횡단보도~삼거리', lengthM: 320, status: 'passable', detail: '유효 보도폭 2.1m, 단차 0cm (양호)', points: '90,150 230,210' },
          { id: 'S-A1-2', name: '광려천 데크 진입 경사로', lengthM: 280, status: 'caution', detail: '경사 약 7.5%(1/13) 완만 경사 주의', points: '230,210 380,210' },
          { id: 'S-A1-3', name: '내서읍 행정복지센터 정면 진입로', lengthM: 350, status: 'passable', detail: '유효 보도폭 2.4m, 평탄 보도 (양호)', points: '380,210 510,150' }
        ]
      },
      {
        id: 'ROUTE-A-2',
        name: '내서대로 직선 큰길 (최단 빠른 길)',
        carDurationMin: 4,
        segments: [
          { id: 'S-A2-1', name: '마산대 앞 내리막 보도', lengthM: 290, status: 'caution', detail: '경사 8.8%(1/11.3) 기준 초과 주의', points: '90,150 250,145' },
          { id: 'S-A2-2', name: '상가 밀집 구간 인도', lengthM: 260, status: 'unknown', detail: '적치물·보도폭 현장 재확인 필요 (미확인)', points: '250,145 390,145' },
          { id: 'S-A2-3', name: '복지센터 북측 횡단보도', lengthM: 230, status: 'passable', detail: '음향신호기 및 낮춤석 확인 (양호)', points: '390,145 510,150' }
        ]
      },
      {
        id: 'ROUTE-A-3-BLOCKED',
        name: '구도로 지름길 (진입 불가로 자동 제외됨)',
        carDurationMin: 4,
        segments: [
          { id: 'S-A3-1', name: '구도로 진입로', lengthM: 200, status: 'passable', detail: '양호', points: '90,150 210,75' },
          { id: 'S-A3-2', name: '구도로 보행육교 및 계단', lengthM: 120, status: 'blocked', detail: '계단 14단 존재 - 휠체어·유모차 진입 불가', points: '210,75 390,75' },
          { id: 'S-A3-3', name: '복지센터 후문', lengthM: 220, status: 'passable', detail: '양호', points: '390,75 510,150' }
        ]
      }
    ]
  },

  // 시범 구역 B: 마산시외버스터미널 <-> 합성동 지하상가 3번출구 인근
  'masan_terminal__hapseong_under': {
    zoneTitle: '마산 시범 구역 B (합성남로 ~ 합성옛길 상권 일대)',
    observedAt: '2026-11-22',
    areaBlockedSegments: [
      {
        id: 'SEG-B-BLK-01',
        title: '합성동 지하상가 중앙 계단 출입구',
        reason: '승강기 미설치 계단 구간 (진입 불가)',
        lengthM: 85,
        points: '240,80 380,80',
        badgeX: 310,
        badgeY: 66
      }
    ],
    candidates: [
      {
        id: 'ROUTE-B-1',
        name: '합성남로 지상 횡단보도 우회 경로',
        carDurationMin: 3,
        segments: [
          { id: 'S-B1-1', name: '터미널 광장~대우백화점 방면 보도', lengthM: 210, status: 'passable', detail: '유효 보도폭 2.8m, 턱낮춤 완료 (양호)', points: '90,150 260,205' },
          { id: 'S-B1-2', name: '합성사거리 지상 횡단보도', lengthM: 140, status: 'caution', detail: '배수로 덮개 단차 2.3cm 주의', points: '260,205 390,205' },
          { id: 'S-B1-3', name: '3번출구 인근 엘리베이터 앞', lengthM: 170, status: 'passable', detail: '지상 엘리베이터 접근 양호', points: '390,205 510,150' }
        ]
      },
      {
        id: 'ROUTE-B-2-BLOCKED',
        name: '지하보도 직통 연결통로 (계단으로 제외됨)',
        carDurationMin: 3,
        segments: [
          { id: 'S-B2-1', name: '터미널 앞 보행로', lengthM: 150, status: 'passable', detail: '양호', points: '90,150 240,80' },
          { id: 'S-B2-2', name: '합성동 지하상가 중앙 계단', lengthM: 85, status: 'blocked', detail: '계단 구간 - 휠체어·유모차 진입 불가', points: '240,80 380,80' },
          { id: 'S-B2-3', name: '3번출구 측면 골목', lengthM: 130, status: 'caution', detail: '보도폭 1.0m 미만', points: '380,80 510,150' }
        ]
      }
    ]
  }
};

// 역방향에서는 구간 순서와 선의 방향을 함께 뒤집는다.
function reverseScenario(scenario, zoneTitle) {
  return {
    ...scenario,
    zoneTitle,
    candidates: scenario.candidates.map((candidate) => ({
      ...candidate,
      segments: [...candidate.segments].reverse().map((segment) => ({
        ...segment,
        points: segment.points.split(' ').reverse().join(' ')
      }))
    }))
  };
}
DEMO_SCENARIOS['naeseo_center__masan_univ'] = reverseScenario(
  DEMO_SCENARIOS['masan_univ__naeseo_center'],
  '마산 시범 구역 A 역방향 (내서읍 행정복지센터 → 마산대학교 정문)'
);
DEMO_SCENARIOS['hapseong_under__masan_terminal'] = reverseScenario(
  DEMO_SCENARIOS['masan_terminal__hapseong_under'],
  '마산 시범 구역 B 역방향 (합성동 지하상가 인근 → 마산시외버스터미널)'
);

// 시범 정류장 및 저상버스 샘플 데이터
const DEMO_BUS_DATA = {
  stop_masan_univ: {
    stopName: '마산대학 정류장 (3790101)',
    asOf: '2026-11-26 14:10 (시연 샘플)',
    arrivals: [
      { routeNo: '113번', dest: '창원역 방면', minutes: 4, isLowFloor: true, statusText: '저상버스 운행' },
      { routeNo: '250번', dest: '마산역·합성동 방면', minutes: 9, isLowFloor: true, statusText: '저상버스 운행' },
      { routeNo: '111번', dest: '경남대 방면', minutes: 14, isLowFloor: false, statusText: '일반버스 (계단 있음)' }
    ]
  },
  stop_naeseo: {
    stopName: '내서읍행정복지센터 정류장 (3790204)',
    asOf: '2026-11-26 14:10 (시연 샘플)',
    arrivals: [
      { routeNo: '250번', dest: '마산대학 방면', minutes: 3, isLowFloor: true, statusText: '저상버스 운행' },
      { routeNo: '114번', dest: '마산시외버스터미널 방면', minutes: 11, isLowFloor: null, statusText: '차량유형 미확인' }
    ]
  },
  stop_terminal: {
    stopName: '마산시외버스터미널 정류장 (3790512)',
    asOf: '2026-11-26 14:10 (시연 샘플)',
    arrivals: [
      { routeNo: '100번', dest: '창원시청 방면', minutes: 2, isLowFloor: true, statusText: '저상버스 운행' },
      { routeNo: '710번', dest: '진해 방면', minutes: 6, isLowFloor: true, statusText: '저상버스 운행' },
      { routeNo: '162번', dest: '어시장·합포구청 방면', minutes: 12, isLowFloor: false, statusText: '일반버스 (계단 있음)' }
    ]
  },
  stop_unconnected: null // API 미연동 상태 검증용
};

// 마산 전동휠체어 급속충전기 샘플 데이터
const DEMO_CHARGERS = [
  {
    id: 'CHG-01',
    name: '내서읍 행정복지센터 1층 민원실 로비',
    address: '경남 창원시 마산회원구 내서읍 광려천서로 65',
    distanceM: 120,
    hours: '평일 09:00 ~ 18:00 (주말·공휴일 미운영)',
    phone: '055-225-6421',
    verifiedWaypoint: true,
    sourceDate: '2026-10-15'
  },
  {
    id: 'CHG-02',
    name: '마산시외버스터미널 1층 대합실 안내데스크 옆',
    address: '경남 창원시 마산회원구 합성남로 11',
    distanceM: 180,
    hours: '매일 06:00 ~ 22:00',
    phone: '055-256-1621',
    verifiedWaypoint: true,
    sourceDate: '2026-10-15'
  },
  {
    id: 'CHG-03',
    name: '마산회원구청 종합민원실 입구',
    address: '경남 창원시 마산회원구 3·15대로 558',
    distanceM: 1450,
    hours: '평일 09:00 ~ 18:00',
    phone: '055-230-4211',
    verifiedWaypoint: false,
    sourceDate: '2026-10-15'
  },
  {
    id: 'CHG-04',
    name: '마산역 대합실 고객지원실 앞',
    address: '경남 창원시 마산회원구 마산역광장로 18',
    distanceM: 1820,
    hours: '매일 05:30 ~ 23:30',
    phone: '055-293-7788',
    verifiedWaypoint: false,
    sourceDate: '2026-10-15'
  }
];
