/**
 * 4. UI 렌더링 함수
 */
function showToast(message, type = 'info') {
  const box = document.getElementById('toast-box');
  const content = document.getElementById('toast-content');
  const text = document.getElementById('toast-text');

  box.classList.remove('hidden');
  text.textContent = message;

  content.className = 'p-3.5 rounded-xl border-2 font-bold text-sm flex items-center justify-between gap-3 shadow-sm ';
  if (type === 'error') {
    content.className += 'bg-rose-50 border-rose-300 text-rose-950';
  } else if (type === 'success') {
    content.className += 'bg-emerald-50 border-emerald-300 text-emerald-950';
  } else {
    content.className += 'bg-blue-50 border-blue-300 text-blue-950';
  }
}

function getStatusStyle(status) {
  switch (status) {
    case 'passable':
      return { label: '양호 (통행 가능)', color: '#16a34a', badgeBg: 'bg-emerald-100 text-emerald-900 border-emerald-300', icon: '🟢' };
    case 'caution':
      return { label: '주의 구간', color: '#ea580c', badgeBg: 'bg-orange-100 text-orange-900 border-orange-300', icon: '🟠' };
    case 'unknown':
      return { label: '정보 미확인', color: '#64748b', badgeBg: 'bg-slate-200 text-slate-800 border-slate-400', icon: '⚪' };
    case 'blocked':
      return { label: '진입 불가 (제외)', color: '#dc2626', badgeBg: 'bg-rose-100 text-rose-900 border-rose-300', icon: '⛔' };
    default:
      return { label: '미확인', color: '#64748b', badgeBg: 'bg-slate-100 text-slate-700', icon: '⚪' };
  }
}

// Tab 1: 경로 결과 렌더링
function renderRouteResult() {
  const container = document.getElementById('route-result-container');
  const res = evaluateRoutes(state.origin, state.destination, state.device, state.excludeUnknown);
  state.currentRouteResult = res;

  // 다른 탭(시간비교, 배터리)도 최신 경로 기준으로 동기화
  renderTransportComparison();
  renderBatterySection();

  if (res.status !== 'OK') {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border-2 border-rose-300 p-6 space-y-3 shadow-sm">
        <div class="flex items-center gap-2.5 text-rose-700 font-black text-lg">
          <span>🚫</span>
          <span>경로 확인 불가 (${res.status})</span>
        </div>
        <p class="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
          ${res.message}
        </p>
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <strong>안전 원칙 안내 (TRD 0절):</strong> 턱없이는 정보가 없다는 이유만으로 안전하다고 판단하지 않으며, 대안 데이터가 없으면 경로 확인 불가를 안내합니다. 상단의 <strong>'시범1'</strong> 또는 <strong>'시범2'</strong> 버튼을 눌러 샘플 구간을 시연해 보세요.
        </div>
      </div>
    `;
    return;
  }

  const activeCandidate = state.selectedRouteMode === 'fast' ? res.fast : res.easy;
  const originPlace = PLACES[state.origin];
  const destPlace = PLACES[state.destination];
  const device = DEVICES[state.device];

  // SVG 지도 폴리라인 생성
  const segmentLinesSvg = activeCandidate.segments.map((seg) => {
    const st = getStatusStyle(seg.status);
    // 선택 경로 기본 색상을 보여주되 주의/미확인 구간은 상태 색상을 우선 표시 (TRD 1.3 A.6)
    const strokeColor = seg.status === 'passable'
      ? (state.selectedRouteMode === 'fast' ? '#2563eb' : '#16a34a')
      : st.color;
    const dashAttr = !['passable', 'caution', 'blocked'].includes(seg.status) ? 'stroke-dasharray="6 6"' : '';
    return `
      <polyline
        points="${seg.points}"
        fill="none"
        stroke="${strokeColor}"
        stroke-width="9"
        stroke-linecap="round"
        stroke-linejoin="round"
        ${dashAttr}
      />
    `;
  }).join('');

  // 시범 구역 내 진입 불가(빨간색 + 금지 아이콘) 구간 SVG
  const blockedSvg = res.areaBlockedSegments.map((blk) => `
    <g>
      <polyline
        points="${blk.points}"
        fill="none"
        stroke="#dc2626"
        stroke-width="8"
        stroke-linecap="round"
        stroke-dasharray="4 4"
      />
      <circle cx="${blk.badgeX}" cy="${blk.badgeY}" r="14" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
      <text x="${blk.badgeX}" y="${blk.badgeY + 5}" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="900">⛔</text>
      <rect x="${blk.badgeX - 95}" y="${blk.badgeY - 38}" width="190" height="20" rx="6" fill="#7f1d1d" />
      <text x="${blk.badgeX}" y="${blk.badgeY - 24}" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">진입 불가: 계단·단차 회피</text>
    </g>
  `).join('');

  container.innerHTML = `
    <!-- 쉬운 길 vs 빠른 길 비교 선택 카드 -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span class="text-xs font-bold text-emerald-700">${res.zoneTitle}</span>
          <h3 class="text-lg font-extrabold text-slate-900">
            ${device.icon} ${device.label} 맞춤 추천 경로 비교
          </h3>
        </div>
        <div class="text-xs text-slate-500 font-semibold">
          샘플 기준: ${res.observedAt} | 실제 현장 검증 아님
        </div>
      </div>

      ${res.sameRoute ? `
        <div class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm font-bold">
          ℹ️ 현재 선택하신 조건에서는 <strong>쉬운 길과 빠른 길이 동일한 경로</strong>입니다.
        </div>
      ` : ''}

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <!-- 쉬운 길 카드 -->
        <button
          type="button"
          onclick="selectRouteMode('easy')"
          aria-pressed="${state.selectedRouteMode === 'easy'}"
          class="text-left p-4 rounded-2xl border-2 transition ${
            state.selectedRouteMode === 'easy'
              ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-200'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold">
              🟢 쉬운 길 (장벽 최소화)
            </span>
            ${state.selectedRouteMode === 'easy' ? '<span class="text-xs font-black text-emerald-700">선택됨 ✓</span>' : ''}
          </div>
          <div class="font-extrabold text-base text-slate-900 mt-1">${res.easy.name}</div>
          <div class="flex items-baseline gap-3 mt-2">
            <span class="text-2xl font-black text-emerald-700">약 ${res.easy.wheelchairMin}분</span>
            <span class="text-sm font-bold text-slate-600">총 ${res.easy.distanceM}m</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span class="px-2 py-0.5 rounded bg-orange-100 text-orange-900">주의 구간 ${res.easy.cautionLengthM}m</span>
            <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-800">미확인 구간 ${res.easy.unknownLengthM}m</span>
          </div>
        </button>

        <!-- 빠른 길 카드 -->
        <button
          type="button"
          onclick="selectRouteMode('fast')"
          aria-pressed="${state.selectedRouteMode === 'fast'}"
          class="text-left p-4 rounded-2xl border-2 transition ${
            state.selectedRouteMode === 'fast'
              ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-200'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-extrabold">
              🔵 빠른 길 (최단 소요시간)
            </span>
            ${state.selectedRouteMode === 'fast' ? '<span class="text-xs font-black text-blue-700">선택됨 ✓</span>' : ''}
          </div>
          <div class="font-extrabold text-base text-slate-900 mt-1">${res.fast.name}</div>
          <div class="flex items-baseline gap-3 mt-2">
            <span class="text-2xl font-black text-blue-700">약 ${res.fast.wheelchairMin}분</span>
            <span class="text-sm font-bold text-slate-600">총 ${res.fast.distanceM}m</span>
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
            <span class="px-2 py-0.5 rounded bg-orange-100 text-orange-900">주의 구간 ${res.fast.cautionLengthM}m</span>
            <span class="px-2 py-0.5 rounded bg-slate-200 text-slate-800">미확인 구간 ${res.fast.unknownLengthM}m</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 시범 구역 접근성 지도 및 범례 + 지도 실패 대체 검증 토글 -->
    <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 class="text-lg font-extrabold text-slate-900">시범 구간 접근성 지도 및 장애물 표시</h3>
          <p class="text-xs text-slate-600">색상뿐 아니라 아이콘·텍스트 범례를 함께 제공하여 시인성을 높였습니다.</p>
        </div>
        <!-- TRD 3.3 지도 SDK 실패 시 텍스트 대체 목록 검증 시나리오 토글 -->
        <label class="inline-flex items-center gap-2 text-xs font-bold bg-slate-100 px-3 py-2 rounded-xl border border-slate-300 cursor-pointer">
          <input type="checkbox" id="toggle-map-error" ${state.simulateMapError ? 'checked' : ''} onchange="toggleMapError(this.checked)" class="w-4 h-4 accent-rose-600" />
          <span>지도 로드 실패 시연 (텍스트 대체)</span>
        </label>
      </div>

      <!-- 접근성 상태 범례 -->
      <div class="flex flex-wrap items-center gap-2 sm:gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold">
        <span class="inline-flex items-center gap-1"><span class="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block"></span> 쉬운 길(양호)</span>
        <span class="inline-flex items-center gap-1"><span class="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block"></span> 빠른 길(양호)</span>
        <span class="inline-flex items-center gap-1"><span class="w-3.5 h-3.5 rounded-full bg-orange-600 inline-block"></span> 주의 구간(경사·폭)</span>
        <span class="inline-flex items-center gap-1"><span class="w-3.5 h-3.5 rounded-full bg-slate-500 inline-block"></span> 정보 미확인</span>
        <span class="inline-flex items-center gap-1 text-rose-700">⛔ 진입 불가(계단·단차 제외)</span>
      </div>

      <!-- 지도 뷰 또는 지도 실패 대체 화면 -->
      ${state.simulateMapError ? `
        <div class="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2">
          <div class="font-black text-base flex items-center gap-2">
            <span>⚠️</span>
            <span>지도 불러오기 실패 (SDK 오류 시연 모드)</span>
          </div>
          <p class="text-xs sm:text-sm">
            외부 지도 SDK 응답 지연 또는 네트워크 오류로 지도를 표시할 수 없습니다. TRD 장애 대응 원칙에 따라 아래 <strong>조사된 구간별 텍스트 상세 목록</strong>으로 경로를 안내합니다.
          </p>
        </div>
      ` : `
        <div class="relative w-full overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-100">
          <svg viewBox="0 0 600 265" class="w-full h-auto block" role="img" aria-label="시연용 경로 도식, 실제 지도가 아닙니다">
            <!-- 배경 격자 및 도로망 모식도 -->
            <rect width="600" height="265" fill="#f1f5f9" />
            <path d="M0 150 H600 M90 0 V265 M510 0 V265 M230 150 L230 265 M380 150 L380 265" stroke="#e2e8f0" stroke-width="14" />
            <path d="M0 235 Q300 225 600 240" fill="none" stroke="#bae6fd" stroke-width="16" />
            <text x="300" y="240" text-anchor="middle" fill="#0369a1" font-size="10" font-weight="700">시연용 도식 (실제 지도 아님)</text>

            <!-- 진입 불가(제외된 경로) 표시 -->
            ${blockedSvg}

            <!-- 선택된 추천 경로 구간 -->
            ${segmentLinesSvg}

            <!-- 출발지 마커 -->
            <g transform="translate(${originPlace.x}, ${originPlace.y})">
              <circle r="15" fill="#0f172a" stroke="#ffffff" stroke-width="3" />
              <text y="4" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="900">출발</text>
              <rect x="-70" y="20" width="140" height="22" rx="6" fill="#0f172a" />
              <text y="34" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">${originPlace.name}</text>
            </g>

            <!-- 도착지 마커 -->
            <g transform="translate(${destPlace.x}, ${destPlace.y})">
              <circle r="15" fill="#059669" stroke="#ffffff" stroke-width="3" />
              <text y="4" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="900">도착</text>
              <rect x="-80" y="20" width="160" height="22" rx="6" fill="#065f46" />
              <text y="34" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="700">${destPlace.name}</text>
            </g>
          </svg>
        </div>
      `}

      <!-- 구간별 상세 텍스트 목록 (지도와 항상 함께 제공) -->
      <div class="space-y-2.5 pt-2">
        <h4 class="font-extrabold text-sm sm:text-base text-slate-900">
          📋 선택 경로 구간별 상세 안내 (${activeCandidate.name})
        </h4>
        ${activeCandidate.segments.map((seg, idx) => {
          const st = getStatusStyle(seg.status);
          return `
            <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-black text-xs px-2 py-0.5 rounded bg-slate-800 text-white">구간 ${idx + 1}</span>
                  <span class="font-extrabold text-sm text-slate-900">${seg.name}</span>
                  <span class="text-xs font-bold px-2 py-0.5 rounded border ${st.badgeBg}">
                    ${st.icon} ${st.label}
                  </span>
                </div>
                <p class="text-xs sm:text-sm text-slate-700 font-medium">${seg.detail}</p>
              </div>
              <div class="text-sm font-black text-slate-800 shrink-0">
                거리 ${seg.lengthM}m
              </div>
            </div>
          `;
        }).join('')}

        <!-- 자동 제외된 진입 불가 구간 사유 표시 -->
        ${res.excludedCandidates.map((ex) => `
          <div class="p-3.5 rounded-xl border-2 border-rose-200 bg-rose-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-xs font-black px-2 py-0.5 rounded bg-rose-600 text-white">⛔ 추천 제외 경로</span>
                <span class="font-extrabold text-sm text-rose-950">${ex.name}</span>
              </div>
              <p class="text-xs text-rose-800 font-semibold">
                제외 사유: ${ex.segments.filter((s) => s.status === 'blocked').map((s) => s.detail).join(', ')}
              </p>
            </div>
            <span class="text-xs font-bold text-rose-700 shrink-0">자동 우회 처리됨</span>
          </div>
        `).join('')}
        ${res.excludedUnknownCandidates.map((ex) => `
          <div class="p-3.5 rounded-xl border-2 border-slate-300 bg-slate-50 text-sm text-slate-800">
            <strong>미확인 구간으로 제외:</strong> ${ex.name} (미확인 ${ex.unknownLengthM}m)
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
