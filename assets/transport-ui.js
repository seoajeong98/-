// Tab 2: 이동시간 비교 & 저상버스 렌더링
function renderTransportComparison() {
  const container = document.getElementById('transport-comparison-cards');
  const res = state.currentRouteResult;
  const device = DEVICES[state.device];

  if (!res || res.status !== 'OK') {
    container.innerHTML = `
      <div class="col-span-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 font-bold">
        먼저 '1. 맞춤 길찾기' 탭에서 유효한 마산 시범 구간 경로를 선택해 주세요.
      </div>
    `;
    return;
  }

  const route = state.selectedRouteMode === 'fast' ? res.fast : res.easy;
  const carHtml = state.includeCarApi
    ? `
      <div class="text-2xl font-black text-slate-900 mt-1">약 ${route.carDurationMin}분</div>
      <div class="text-xs text-slate-500 font-semibold mt-1">도로 기준 약 ${(route.distanceM * 1.15 / 1000).toFixed(1)}km</div>
      <div class="mt-2 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
        시연용 임의 자동차 시간 (실제 API 미연동)
      </div>
    `
    : `
      <div class="text-lg font-black text-slate-500 mt-2">자동차 시간 미제공</div>
      <div class="text-xs text-slate-500 mt-1">외부 Directions API 미연동 상태</div>
    `;

  container.innerHTML = `
    <div class="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40">
      <div class="text-xs font-extrabold text-emerald-800">${device.icon} 선택 기기 (${device.label})</div>
      <div class="text-2xl font-black text-emerald-700 mt-1">약 ${route.wheelchairMin}분</div>
      <div class="text-xs text-slate-600 font-semibold mt-1">경로 거리 ${route.distanceM}m · 시연속도 ${device.speedKmh}km/h</div>
      <div class="mt-2 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded">
        출처: 시연 경로 데이터 (${res.observedAt}, 실제 현장 검증 아님)
      </div>
    </div>

    <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50">
      <div class="text-xs font-extrabold text-slate-700">🚶 일반 도보 비교</div>
      <div class="text-2xl font-black text-slate-900 mt-1">약 ${route.walkingMin}분</div>
      <div class="text-xs text-slate-600 font-semibold mt-1">경로 거리 ${route.distanceM}m · 시연속도 4.0km/h</div>
      <div class="mt-2 text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2 py-1 rounded">
        출처: 시연 속도 추정치 (ORS 참고)
      </div>
    </div>

    <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50">
      <div class="text-xs font-extrabold text-slate-700">🚗 자동차 이동 비교</div>
      ${carHtml}
    </div>
  `;
}

function renderBusArrivals() {
  const stopId = document.getElementById('select-bus-stop').value;
  const listEl = document.getElementById('bus-arrival-list');
  const stopData = DEMO_BUS_DATA[stopId];

  if (!stopData) {
    listEl.innerHTML = `
      <div class="p-4 rounded-xl bg-slate-100 border border-slate-300 text-sm font-bold text-slate-700">
        ℹ️ 해당 정류장은 현재 TAGO 실시간 버스 API 미연동(NOT_CONNECTED) 상태로 도착 정보가 없습니다.
      </div>
    `;
    return;
  }

  listEl.innerHTML = `
    <div class="text-xs text-slate-500 font-bold mb-2">
      정류장: ${stopData.stopName} | 데이터 기준: ${stopData.asOf}
    </div>
    ${stopData.arrivals.map((bus) => {
      let badgeClass = 'bg-slate-200 text-slate-800';
      let icon = '❓';
      if (bus.isLowFloor === true) {
        badgeClass = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
        icon = '♿';
      } else if (bus.isLowFloor === false) {
        badgeClass = 'bg-rose-100 text-rose-900 border border-rose-300';
        icon = '⚠️';
      }
      return `
        <div class="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <span class="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-black text-sm">${bus.routeNo}</span>
            <div>
              <div class="font-extrabold text-sm text-slate-900">${bus.dest}</div>
              <span class="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded ${badgeClass}">
                ${icon} ${bus.statusText}
              </span>
            </div>
          </div>
          <div class="text-right">
            <div class="text-lg font-black text-blue-700">약 ${bus.minutes}분 후 도착</div>
            <div class="text-[11px] text-slate-400">시연 샘플 데이터</div>
          </div>
        </div>
      `;
    }).join('')}
  `;
}
