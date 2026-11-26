/**
 * 2. 전역 상태 관리
 */
const state = {
  activeTab: 'route',
  largeText: false,
  device: 'power_wheelchair',
  origin: 'masan_univ',
  destination: 'naeseo_center',
  selectedRouteMode: 'easy', // 'easy' | 'fast'
  excludeUnknown: false,
  simulateMapError: false,   // TRD 1.4 지도 SDK 로드 실패 시뮬레이션
  includeCarApi: true,
  currentRouteResult: null,
  location: null,
  locationRequest: 0
};
