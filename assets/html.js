/**
 * HTML 텍스트 또는 따옴표로 묶인 속성에 넣을 값을 이스케이프한다.
 * URL 스킴이나 데이터의 정확성 검증은 별도로 필요하다.
 * @param {string|number} value
 * @returns {string}
 */
function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

/**
 * @param {unknown} points SVG 도식에 사용할 좌표 쌍
 * @returns {boolean} 유한한 숫자 쌍이 두 개 이상이면 true
 */
function isValidPolylinePoints(points) {
  if (typeof points !== 'string' || points.length > 2048 || points.trim() === '') return false;
  const pairs = points.trim().split(/\s+/);
  const pairPattern = /^-?(?:\d+(?:\.\d+)?|\.\d+),-?(?:\d+(?:\.\d+)?|\.\d+)$/;
  return pairs.length >= 2 && pairs.every((pair) =>
    pairPattern.test(pair) && pair.split(',').every((value) => Number.isFinite(Number(value)))
  );
}
