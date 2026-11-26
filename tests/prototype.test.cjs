const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'previous', 'index.html'), 'utf8');
const script = html.match(/<script>\s*(\/\/ 1\. 기기별 제원[\s\S]*?)<\/script>/);
assert.ok(script, 'prototype application script should exist');

function createApp(geolocation = null) {
  const elements = new Map();
  const selectors = new Map();

  function createElement() {
    const classes = new Set();
    return {
      _value: '',
      get value() { return this._value; },
      set value(value) { this._value = String(value); },
      textContent: '',
      innerHTML: '',
      className: '',
      disabled: false,
      href: '',
      attributes: {},
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          const shouldAdd = force === undefined ? !classes.has(name) : force;
          if (shouldAdd) classes.add(name);
          else classes.delete(name);
          return shouldAdd;
        }
      },
      setAttribute(name, value) { this.attributes[name] = String(value); },
      getAttribute(name) { return this.attributes[name] ?? null; }
    };
  }

  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement());
      return elements.get(id);
    },
    querySelectorAll() { return []; }
  };
  const context = vm.createContext({
    document,
    window: {},
    navigator: geolocation ? { geolocation } : {},
    setTimeout: () => 1,
    clearTimeout: () => {}
  });
  vm.runInContext(script[1], context);

  document.getElementById('batteryNumInput').value = '65';
  document.getElementById('batterySlider').value = '65';
  document.getElementById('maxRangeInput').value = '25';
  vm.runInContext('state.batteryPercent = 65', context);

  return { context, document };
}

test('battery calculator accepts 0% and reports zero range without clamping', () => {
  const { context, document } = createApp();
  context.syncBatteryInput('0');
  assert.equal(vm.runInContext('state.batteryPercent', context), 0);
  assert.equal(document.getElementById('batterySlider').value, '0');
  assert.equal(document.getElementById('estimatedRangeText').textContent, '0.0 km');
  assert.equal(document.getElementById('batReachBadge').textContent, '잔량 0% · 즉시 충전 필요');
});

test('battery estimate uses the documented flat and slope factors', () => {
  const { context, document } = createApp();
  context.syncBatteryInput('50');
  assert.equal(document.getElementById('estimatedRangeText').textContent, '10.6 km');

  context.setTerrainFactor(0.8);
  assert.equal(document.getElementById('estimatedRangeText').textContent, '8.5 km');
});

test('invalid range is not silently replaced by the 25 km default', () => {
  const { context, document } = createApp();
  document.getElementById('maxRangeInput').value = '0';
  context.calculateBattery();
  assert.equal(vm.runInContext('state.maxRangeKm', context), 25);
  assert.equal(document.getElementById('estimatedRangeText').textContent, '—');
  assert.equal(document.getElementById('maxRangeInput').getAttribute('aria-invalid'), 'true');
  assert.match(document.getElementById('batteryInputError').textContent, /0 초과/);
});

test('blank and out-of-range battery input is reported instead of coerced', () => {
  const { context, document } = createApp();
  context.syncBatteryInput('');
  assert.equal(vm.runInContext('state.batteryPercent', context), 65);
  assert.equal(document.getElementById('batteryNumInput').getAttribute('aria-invalid'), 'true');
  assert.match(document.getElementById('batteryInputError').textContent, /0~100/);

  context.syncBatteryInput('101');
  assert.equal(vm.runInContext('state.batteryPercent', context), 65);
  assert.equal(document.getElementById('batterySlider').value, '65');
});

test('demo fast routes intersect blocked markers and cannot be selected', () => {
  const { context, document } = createApp();
  for (const preset of vm.runInContext('Object.values(ROUTE_PRESETS)', context)) {
    assert.equal(context.routeHasBlockedSegment(preset.fast, preset.markers), true);
    assert.equal(context.routeHasBlockedSegment(preset.easy, preset.markers), false);
  }

  context.updateRouteMetrics();
  assert.equal(document.getElementById('cardFastRoute').disabled, true);
  assert.equal(document.getElementById('fastTimeText').textContent, '선택 불가');
  context.renderMap();
  assert.equal(document.getElementById('mapRoutesLayer').innerHTML.includes('M 55,75 L 165,75'), false);

  context.selectRouteType('fast');
  assert.equal(vm.runInContext('state.routeType', context), 'easy');
  assert.match(document.getElementById('toastMessage').textContent, /선택할 수 없습니다/);
});

test('custom place names do not pretend to return a searched route', () => {
  const { context, document } = createApp();
  document.getElementById('originInput').value = '임의 출발지';
  document.getElementById('destInput').value = '임의 도착지';
  context.searchCustomRoute();
  assert.match(document.getElementById('toastMessage').textContent, /검색되지 않았습니다/);
  assert.match(document.getElementById('toastMessage').textContent, /시범 경로를 그대로 표시/);
});

test('GPS action uses an explicit browser permission request and real coordinates', () => {
  const geolocation = {
    getCurrentPosition(success, error, options) {
      assert.equal(options.maximumAge, 0);
      success({ coords: { latitude: 35.2, longitude: 128.5 } });
    }
  };
  const { context, document } = createApp(geolocation);
  context.refreshGpsLocation();
  assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext('state.currentLocation', context))), {
    latitude: 35.2,
    longitude: 128.5
  });
  assert.match(document.getElementById('gpsCoordsText').textContent, /35\.20000.*128\.50000/);
  assert.match(document.getElementById('currentGpsAddress').textContent, /주소 변환 미연동/);
});

test('GPS denial does not substitute a fabricated sample location', () => {
  const geolocation = {
    getCurrentPosition(success, error) { error({ code: 1 }); }
  };
  const { context, document } = createApp(geolocation);
  context.refreshGpsLocation();
  assert.equal(vm.runInContext('state.currentLocation', context), null);
  assert.match(document.getElementById('toastMessage').textContent, /권한이 거부되었습니다/);
});

test('location copying requires permission and copies only the device coordinates', async () => {
  const { context, document } = createApp();
  await context.copyCurrentCoordinates();
  assert.match(document.getElementById('toastMessage').textContent, /먼저 위치 사용/);

  vm.runInContext('state.currentLocation = { latitude: 35.2, longitude: 128.5 }', context);
  let copied = '';
  context.navigator.clipboard = { async writeText(value) { copied = value; } };
  await context.copyCurrentCoordinates();
  assert.equal(copied, '35.20000, 128.50000');
  assert.match(document.getElementById('toastMessage').textContent, /외부로 전송되지는 않았습니다/);
});

test('SOS actions open an explicit phone link or clearly remain an unsent draft', () => {
  const { context, document } = createApp();
  context.triggerEmergencyAction('119');
  assert.equal(document.getElementById('sosCallLink').href, 'tel:119');
  assert.match(document.getElementById('sosModalDesc').textContent, /직접 신고/);
  assert.match(document.getElementById('sosModalDesc').textContent, /자동 전송되지 않습니다/);

  context.triggerEmergencyAction('guardian');
  assert.equal(document.getElementById('sosCallLink').classList.contains('hidden'), true);
  assert.match(document.getElementById('sosModalDesc').textContent, /문자를 전송하지 않습니다/);
  context.confirmSosSimulation();
  assert.match(document.getElementById('toastMessage').textContent, /문자는 전송되지 않았습니다/);
});

test('guardian message draft can be copied without claiming it was sent', async () => {
  let copied = '';
  const geolocation = null;
  const { context, document } = createApp(geolocation);
  context.navigator.clipboard = {
    async writeText(text) { copied = text; }
  };
  context.triggerEmergencyAction('guardian');
  await context.copyEmergencyDraft();
  assert.match(copied, /도움 요청/);
  assert.match(document.getElementById('toastMessage').textContent, /직접 붙여넣어 보내세요/);
});
