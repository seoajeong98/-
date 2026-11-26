// Tab 3: 배터리 계산 및 충전소 목록 렌더링
function renderBatterySection() {
  const pctInput = document.getElementById('input-battery-pct');
  const rangeInput = document.getElementById('input-full-range');
  const parsed = parseBatteryInputs(pctInput.value, rangeInput.value, document.getElementById('select-env-factor').value);
  const { pct, fullKm, envFactor } = parsed;
  const resultBox = document.getElementById('battery-result-box');

  const estKm = calculateBatteryRange(pct, fullKm, envFactor);
  pctInput.setAttribute('aria-invalid', String(!parsed.pctValid));
  rangeInput.setAttribute('aria-invalid', String(!parsed.rangeValid));
  if (!parsed.pctValid || !parsed.rangeValid || !parsed.factorValid || estKm === null) {
    resultBox.className = 'rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-rose-900 font-bold text-sm';
    resultBox.textContent = '⚠️ 배터리 잔량(0~100%), 완충 주행거리(0 초과~100km)와 환경 조건을 확인해 주세요.';
    return;
  }

  const res = state.currentRouteResult;
  let routeCompareHtml = '<p class="text-xs text-slate-600">유효한 경로가 선택되면 편도·왕복 도달 가능 여부를 자동 판정합니다.</p>';

  if (res && res.status === 'OK') {
    const route = state.selectedRouteMode === 'fast' ? res.fast : res.easy;
    const oneWayKm = route.distanceM / 1000;
    const roundTripKm = oneWayKm * 2;

    let oneWayBadge = '';
    if (estKm > oneWayKm * 1.2) {
      oneWayBadge = `<span class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold">✅ 계산상 편도 가능 (여유 양호)</span>`;
    } else if (estKm >= oneWayKm) {
      oneWayBadge = `<span class="px-2.5 py-1 rounded-lg bg-amber-500 text-amber-950 text-xs font-extrabold">⚠️ 계산상 편도 가능 (여유 부족 경고)</span>`;
    } else {
      oneWayBadge = `<span class="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-extrabold">⛔ 편도 도달 불가 (충전 필요)</span>`;
    }

    const roundBadge = estKm >= roundTripKm
      ? `<span class="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-extrabold">🔄 계산상 왕복 가능 (${roundTripKm.toFixed(2)}km)</span>`
      : `<span class="px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800 text-xs font-extrabold">왕복 여유 부족 (${roundTripKm.toFixed(2)}km 필요)</span>`;

    routeCompareHtml = `
      <div class="pt-2 border-t border-slate-200/80 space-y-2">
        <div class="text-xs sm:text-sm font-bold text-slate-800">
          선택 경로 편도 거리: <strong>${oneWayKm.toFixed(2)}km (${route.distanceM}m)</strong>
        </div>
        <div class="flex flex-wrap gap-2">
          ${oneWayBadge}
          ${roundBadge}
        </div>
      </div>
    `;
  }

  resultBox.className = 'rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-4 sm:p-5 space-y-3';
  resultBox.innerHTML = `
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <span class="text-xs font-extrabold text-emerald-800">시연 공식 적용 예상 주행거리</span>
        <div class="text-3xl font-black text-emerald-700 mt-0.5">약 ${estKm.toFixed(2)} km</div>
      </div>
      <div class="text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
        계산식: ${fullKm}km × (${pct}/100) × ${envFactor} × 0.85
      </div>
    </div>
    ${routeCompareHtml}
  `;
}

function renderChargers() {
  const listEl = document.getElementById('charger-list');
  listEl.innerHTML = DEMO_CHARGERS.map((chg) => `
    <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3">
      <div class="space-y-1.5">
        <div class="flex items-start justify-between gap-2">
          <h4 class="font-extrabold text-sm sm:text-base text-slate-900">${chg.name}</h4>
          <span class="text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-900 shrink-0">
            약 ${chg.distanceM}m
          </span>
        </div>
        <p class="text-xs text-slate-600">${chg.address}</p>
        <p class="text-xs font-semibold text-slate-700">🕒 운영시간: ${chg.hours}</p>
        <div>
          ${chg.verifiedWaypoint
            ? '<span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">시연 데이터의 경유 지점 (실제 확인 필요)</span>'
            : '<span class="inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">시연 경유 경로 없음 (직접 확인 필요)</span>'}
        </div>
      </div>
      <div class="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
        <span class="text-slate-500">기준일: ${chg.sourceDate}</span>
        <a href="tel:${chg.phone.replace(/-/g, '')}" class="font-extrabold text-emerald-700 hover:underline">
          📞 ${chg.phone} 전화 확인
        </a>
      </div>
    </div>
  `).join('');
}
