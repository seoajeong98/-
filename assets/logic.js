/**
 * 3. TRD 순수 판정 및 계산 함수
 */
// 소요시간 계산: ceil(distanceM / (speedKmh * 1000 / 3600)) -> 분 단위 올림
function calcDurationMinutes(distanceM, speedKmh) {
  const durationSec = Math.ceil(distanceM / ((speedKmh * 1000) / 3600));
  return Math.max(1, Math.ceil(durationSec / 60));
}

// TRD 1.3 A.4~5 경로 후보 평가 및 쉬운 길 / 빠른 길 선정
function evaluateRoutes(originId, destId, deviceId) {
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

  scenario.candidates.forEach((cand) => {
    const hasBlocked = cand.segments.some((s) => s.status === 'blocked');
    let distanceM = 0;
    let cautionLengthM = 0;
    let unknownLengthM = 0;

    cand.segments.forEach((s) => {
      distanceM += s.lengthM;
      if (s.status === 'caution') cautionLengthM += s.lengthM;
      if (s.status === 'unknown') unknownLengthM += s.lengthM;
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
    } else {
      validCandidates.push(enriched);
    }
  });

  if (validCandidates.length === 0) {
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
    excludedCandidates
  };
}

// TRD 1.3 C.2 배터리 주행거리 공식
function calculateBatteryRange(pct, fullKm, envFactor) {
  if (!Number.isFinite(pct) || pct < 0 || pct > 100 ||
      !Number.isFinite(fullKm) || fullKm <= 0 || fullKm > 100 ||
      ![0.8, 1].includes(envFactor)) {
    return null;
  }
  const estimatedKm = fullKm * (pct / 100) * envFactor * 0.85;
  return Math.round(estimatedKm * 100) / 100;
}
