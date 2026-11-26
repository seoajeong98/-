/**
 * 3. TRD 순수 판정 및 계산 함수
 */
/**
 * @param {number} distanceM 거리(m)
 * @param {number} speedKmh 시연 속도(km/h), 0보다 큰 값
 * @returns {number} 분 단위로 올림한 예상 시간
 */
function calcDurationMinutes(distanceM, speedKmh) {
  const durationSec = Math.ceil(distanceM / ((speedKmh * 1000) / 3600));
  return Math.max(1, Math.ceil(durationSec / 60));
}

/**
 * @param {string} originId 시연 출발지 ID
 * @param {string} destId 시연 도착지 ID
 * @param {string} deviceId 이동기기 ID
 * @param {boolean} excludeUnknown 미확인 구간이 있는 후보 제외 여부
 * @returns {object} 성공 시 status=OK와 easy·fast·제외 후보 목록, 실패 시 status와 message
 */
function evaluateRoutes(originId, destId, deviceId, excludeUnknown = false) {
  if (!Object.hasOwn(PLACES, originId) || !Object.hasOwn(PLACES, destId) || !Object.hasOwn(DEVICES, deviceId)) {
    return { status: 'INVALID_INPUT', message: '출발지, 도착지와 이동기기를 다시 선택해 주세요.' };
  }
  if (originId === destId) {
    return {
      status: 'INVALID_INPUT',
      message: '출발지와 도착지가 같습니다. 서로 다른 장소를 선택해 주세요.'
    };
  }

  const key = `${originId}__${destId}`;
  const scenario = DEMO_SCENARIOS[key];

  if (!scenario) {
    return {
      status: 'OUT_OF_SCOPE',
      message: '선택하신 구간에는 시연용 경로 데이터가 없습니다. 임의 직선 경로나 다른 구역 샘플로 대체하지 않습니다.'
    };
  }

  const device = DEVICES[deviceId];
  const validCandidates = [];
  const excludedCandidates = [];
  const excludedUnknownCandidates = [];

  scenario.candidates.forEach((cand) => {
    const hasBlocked = cand.segments.some((s) => s.status === 'blocked');
    const hasUnknown = cand.segments.some((s) => !['passable', 'caution', 'blocked'].includes(s.status));
    let distanceM = 0;
    let cautionLengthM = 0;
    let unknownLengthM = 0;

    cand.segments.forEach((s) => {
      distanceM += s.lengthM;
      if (s.status === 'caution') cautionLengthM += s.lengthM;
      if (!['passable', 'caution', 'blocked'].includes(s.status)) unknownLengthM += s.lengthM;
    });

    const enriched = {
      ...cand,
      distanceM,
      cautionLengthM,
      unknownLengthM,
      wheelchairMin: calcDurationMinutes(distanceM, device.speedKmh),
      walkingMin: calcDurationMinutes(distanceM, 4.0)
    };

    if (hasBlocked) {
      excludedCandidates.push(enriched);
    } else if (excludeUnknown && hasUnknown) {
      excludedUnknownCandidates.push(enriched);
    } else {
      validCandidates.push(enriched);
    }
  });

  if (validCandidates.length === 0) {
    if (excludedUnknownCandidates.length > 0) {
      return {
        status: 'NO_KNOWN_ROUTE',
        message: '진입 불가 및 미확인 구간을 제외하면 선택할 수 있는 시연 경로가 없습니다.',
        obstacles: scenario.areaBlockedSegments
      };
    }
    return {
      status: 'NO_VERIFIED_ROUTE',
      message: '모든 후보 경로에 진입 불가(계단·단차 등) 구간이 포함되어 추천 가능한 경로가 없습니다.',
      obstacles: scenario.areaBlockedSegments
    };
  }

  // 쉬운 길(easy): 미확인 구간 길이 최소 -> 주의 구간 길이 최소 -> 총거리 최소 -> ID 순
  const easySorted = [...validCandidates].sort((a, b) => {
    if (a.unknownLengthM !== b.unknownLengthM) return a.unknownLengthM - b.unknownLengthM;
    if (a.cautionLengthM !== b.cautionLengthM) return a.cautionLengthM - b.cautionLengthM;
    if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
    return a.id.localeCompare(b.id);
  });

  // 빠른 길(fast): 총 예상 시간(거리) 최소 -> ID 순
  const fastSorted = [...validCandidates].sort((a, b) => {
    if (a.wheelchairMin !== b.wheelchairMin) return a.wheelchairMin - b.wheelchairMin;
    if (a.distanceM !== b.distanceM) return a.distanceM - b.distanceM;
    return a.id.localeCompare(b.id);
  });

  const easy = easySorted[0];
  const fast = fastSorted[0];
  const sameRoute = easy.id === fast.id;

  return {
    status: 'OK',
    zoneTitle: scenario.zoneTitle,
    observedAt: scenario.observedAt,
    areaBlockedSegments: scenario.areaBlockedSegments,
    easy,
    fast,
    sameRoute,
    excludedCandidates,
    excludedUnknownCandidates
  };
}

/**
 * @param {number} pct 배터리 잔량(0~100)
 * @param {number} fullKm 완충 주행거리(0 초과~100km)
 * @param {number} envFactor 시연 환경계수(0.8 또는 1)
 * @returns {number|null} 소수 둘째 자리의 추정 거리(km), 잘못된 입력이면 null
 */
function calculateBatteryRange(pct, fullKm, envFactor) {
  if (!Number.isFinite(pct) || pct < 0 || pct > 100 ||
      !Number.isFinite(fullKm) || fullKm <= 0 || fullKm > 100 ||
      ![0.8, 1].includes(envFactor)) {
    return null;
  }
  const estimatedKm = fullKm * (pct / 100) * envFactor * 0.85;
  return Math.round(estimatedKm * 100) / 100;
}
