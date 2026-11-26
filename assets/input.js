/**
 * @param {string} rawPct 배터리 잔량 입력 문자열
 * @param {string} rawRange 완충 주행거리 입력 문자열
 * @param {string} rawFactor 환경계수 선택 문자열
 * @returns {{pct: number, fullKm: number, envFactor: number, pctValid: boolean, rangeValid: boolean, factorValid: boolean}}
 * 빈 문자열은 0으로 변환하지 않고 유효하지 않은 값으로 처리한다.
 */
function parseBatteryInputs(rawPct, rawRange, rawFactor) {
  const toNumber = (value) => value.trim() === '' ? NaN : Number(value);
  const pct = toNumber(rawPct);
  const fullKm = toNumber(rawRange);
  const envFactor = toNumber(rawFactor);
  return {
    pct,
    fullKm,
    envFactor,
    pctValid: Number.isFinite(pct) && pct >= 0 && pct <= 100,
    rangeValid: Number.isFinite(fullKm) && fullKm > 0 && fullKm <= 100,
    factorValid: [0.8, 1].includes(envFactor)
  };
}

/**
 * @param {string} raw 보호자 전화번호 입력 문자열
 * @returns {string|null} 유효한 경우 숫자만 남긴 번호, 아니면 null
 */
function normalizeGuardianPhone(raw) {
  const phone = raw.trim();
  const digits = phone.replace(/[^0-9]/g, '');
  return /^[0-9 -]+$/.test(phone) && digits.length >= 9 && digits.length <= 11
    ? digits
    : null;
}
