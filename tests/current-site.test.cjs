const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const assets = path.join(__dirname, '..', 'assets');
function loadScripts(names, globals = {}) {
  const context = vm.createContext(globals);
  for (const name of names) {
    vm.runInContext(fs.readFileSync(path.join(assets, name), 'utf8'), context, { filename: name });
  }
  return context;
}

function elementsWithValues(values) {
  const elements = new Map(Object.entries(values).map(([id, value]) => [id, {
    value,
    textContent: '',
    innerHTML: '',
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; delete this[name]; }
  }]));
  return { getElementById: (id) => {
    assert.ok(elements.has(id), `missing element: ${id}`);
    return elements.get(id);
  } };
}

test('시연 경로에서 막힌 후보를 제외하고 쉬운 길과 빠른 길을 비교한다', () => {
  const ctx = loadScripts(['data.js', 'logic.js']);
  const result = ctx.evaluateRoutes('masan_univ', 'naeseo_center', 'power_wheelchair');
  assert.equal(result.status, 'OK');
  assert.equal(result.easy.id, 'ROUTE-A-1');
  assert.equal(result.fast.id, 'ROUTE-A-2');
  assert.equal(result.easy.distanceM, 950);
  assert.equal(result.fast.distanceM, 780);
  assert.equal(result.excludedCandidates[0].id, 'ROUTE-A-3-BLOCKED');
  assert.ok(!result.easy.segments.some(segment => segment.status === 'blocked'));
  assert.ok(!result.fast.segments.some(segment => segment.status === 'blocked'));
});

test('역방향은 구간과 지도 좌표 순서가 뒤집히고 기기 속도에 따라 시간이 달라진다', () => {
  const ctx = loadScripts(['data.js', 'logic.js']);
  const forward = ctx.evaluateRoutes('masan_univ', 'naeseo_center', 'power_wheelchair');
  const reverse = ctx.evaluateRoutes('naeseo_center', 'masan_univ', 'manual_wheelchair');
  assert.equal(reverse.easy.segments[0].id, forward.easy.segments.at(-1).id);
  assert.equal(reverse.easy.segments[0].points, '510,150 380,210');
  assert.ok(reverse.easy.wheelchairMin > forward.easy.wheelchairMin);
});

test('동일 장소, 범위 밖, 알 수 없는 입력에 실제 경로를 만들어내지 않는다', () => {
  const ctx = loadScripts(['data.js', 'logic.js']);
  assert.equal(ctx.evaluateRoutes('masan_univ', 'masan_univ', 'stroller').status, 'INVALID_INPUT');
  assert.equal(ctx.evaluateRoutes('masan_univ', 'happo_office', 'stroller').status, 'OUT_OF_SCOPE');
  assert.equal(ctx.evaluateRoutes('masan_univ', 'naeseo_center', 'unknown').status, 'INVALID_INPUT');
});

test('배터리 수식과 경계값을 검증하고 잘못된 수치를 거부한다', () => {
  const ctx = loadScripts(['logic.js']);
  assert.equal(ctx.calculateBatteryRange(50, 25, 0.8), 8.5);
  assert.equal(ctx.calculateBatteryRange(0, 25, 1), 0);
  for (const args of [[-1, 25, 1], [101, 25, 1], [NaN, 25, 1], [50, 0, 1], [50, 101, 1], [50, Infinity, 1], [50, 25, NaN]]) {
    assert.equal(ctx.calculateBatteryRange(...args), null);
  }
});

test('배터리 입력을 비우거나 범위를 초과하면 화면에 오류를 표시한다', () => {
  const document = elementsWithValues({
    'input-battery-pct': '45', 'input-full-range': '25', 'select-env-factor': '0.8',
    'battery-result-box': ''
  });
  const ctx = loadScripts(['state.js', 'logic.js', 'battery-ui.js'], { document });
  ctx.renderBatterySection();
  assert.match(document.getElementById('battery-result-box').innerHTML, /7\.65 km/);
  document.getElementById('input-battery-pct').value = '';
  ctx.renderBatterySection();
  assert.match(document.getElementById('battery-result-box').textContent, /확인해 주세요/);
  assert.equal(document.getElementById('input-battery-pct').attributes['aria-invalid'], 'true');
  document.getElementById('input-battery-pct').value = '50';
  document.getElementById('input-full-range').value = '101';
  ctx.renderBatterySection();
  assert.equal(document.getElementById('input-full-range').attributes['aria-invalid'], 'true');
});

test('위치와 연락처를 지정하기 전에는 가짜 좌표나 연락처를 사용하지 않는다', () => {
  const document = elementsWithValues({
    'input-guardian-phone': '', 'sms-preview': '', 'link-call-guardian': '', 'link-sms-guardian': '',
    'loc-name': '', 'loc-coords': '', 'loc-accuracy': '', 'loc-time': ''
  });
  const ctx = loadScripts(['state.js', 'help-ui.js'], { document });
  ctx.updateLocationDisplay();
  assert.match(document.getElementById('sms-preview').value, /위치 미확인/);
  assert.equal(document.getElementById('loc-coords').textContent, '미확인');
  assert.equal(document.getElementById('link-call-guardian').href, undefined);
  document.getElementById('input-guardian-phone').value = '010-1234-5678';
  ctx.updateHelpSmsPreview();
  assert.equal(document.getElementById('link-call-guardian').href, 'tel:01012345678');
  document.getElementById('input-guardian-phone').value = 'abc01012345678';
  ctx.updateHelpSmsPreview();
  assert.equal(document.getElementById('link-call-guardian').href, undefined);
  assert.equal(document.getElementById('input-guardian-phone').attributes['aria-invalid'], 'true');
});

test('위치 조회는 버튼 클릭 후에만 요청하며 거부되면 위치를 미확인으로 유지한다', () => {
  const elements = new Map();
  const documentHandlers = {};
  const document = {
    documentElement: { dataset: {}, classList: { toggle() {} } },
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, {
        value: '', textContent: '', hidden: false, handlers: {},
        classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {},
        addEventListener(event, handler) { this.handlers[event] = handler; }
      });
      return elements.get(id);
    },
    querySelectorAll() { return []; },
    addEventListener(event, handler) { documentHandlers[event] = handler; }
  };
  let requests = 0;
  let latestError = '';
  const navigator = {
    onLine: true,
    geolocation: {
      getCurrentPosition(success, failure) {
        requests++;
        failure({ code: 1 });
      }
    }
  };
  const ctx = loadScripts(['state.js', 'app.js'], {
    document, navigator, window: { addEventListener() {} },
    showToast(message) { latestError = message; },
    updateLocationDisplay() {}, renderRouteResult() {}, renderTransportComparison() {},
    renderBatterySection() {}, renderBusArrivals() {}, renderChargers() {}, updateHelpSmsPreview() {}
  });
  documentHandlers.DOMContentLoaded();
  assert.equal(requests, 0);
  document.getElementById('btn-get-location').handlers.click();
  assert.equal(requests, 1);
  assert.equal(vm.runInContext('state.location', ctx), null);
  assert.match(latestError, /거부|실패/);
});
