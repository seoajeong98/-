/**
 * 5. 이벤트 바인딩 및 초기화
 */
function selectRouteMode(mode) {
  state.selectedRouteMode = mode;
  renderRouteResult();
}

function toggleMapError(checked) {
  state.simulateMapError = checked;
  renderRouteResult();
}

document.addEventListener('DOMContentLoaded', () => {
  const networkNotice = document.getElementById('network-notice');
  function updateNetworkNotice() {
    const stylingFailed = document.documentElement.dataset.styleUnavailable === 'true';
    networkNotice.hidden = navigator.onLine && !stylingFailed;
    networkNotice.textContent = stylingFailed
      ? '화면 스타일을 불러오지 못했습니다. 기본 화면과 시연 데이터로 표시합니다. 연결을 확인하고 새로고침해 주세요.'
      : '네트워크에 연결되지 않았습니다. 실시간 API는 연동되지 않았으며 저장된 시연 데이터만 표시합니다.';
  }
  updateNetworkNotice();
  window.addEventListener('offline', updateNetworkNotice);
  window.addEventListener('online', updateNetworkNotice);

  // 큰 글씨 토글
  const btnLargeText = document.getElementById('btn-large-text');
  btnLargeText.addEventListener('click', () => {
    state.largeText = !state.largeText;
    document.documentElement.classList.toggle('large-text', state.largeText);
    btnLargeText.setAttribute('aria-pressed', String(state.largeText));
    document.getElementById('large-text-label').textContent = state.largeText ? '기본 글씨로' : '큰 글씨 켜기';
    showToast(state.largeText ? '큰 글씨 모드가 활성화되었습니다.' : '기본 글씨 크기로 전환되었습니다.', 'info');
  });

  // 토스트 닫기
  document.getElementById('toast-close').addEventListener('click', () => {
    document.getElementById('toast-box').classList.add('hidden');
  });

  // 탭 전환
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      state.activeTab = target;

      document.querySelectorAll('.tab-btn').forEach((b) => {
        const isActive = b.dataset.tab === target;
        b.setAttribute('aria-selected', String(isActive));
        b.className = isActive
          ? 'tab-btn flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-base bg-emerald-600 text-white shadow-sm transition'
          : 'tab-btn flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-sm sm:text-base bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
      });

      ['route', 'transport', 'battery', 'help'].forEach((panelId) => {
        document.getElementById(`panel-${panelId}`).classList.toggle('hidden', panelId !== target);
      });
    });
  });

  // 이동기기 선택
  document.querySelectorAll('.device-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.device = btn.dataset.device;
      document.querySelectorAll('.device-btn').forEach((b) => {
        const selected = b.dataset.device === state.device;
        b.className = selected
          ? 'device-btn p-3 rounded-xl border-2 border-emerald-600 bg-emerald-50 text-emerald-950 text-left transition'
          : 'device-btn p-3 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-left transition';
      });
      renderRouteResult();
    });
  });

  // 출발지·도착지 바꾸기
  document.getElementById('btn-swap-places').addEventListener('click', () => {
    const originEl = document.getElementById('select-origin');
    const destEl = document.getElementById('select-destination');
    const temp = originEl.value;
    originEl.value = destEl.value;
    destEl.value = temp;
    state.origin = originEl.value;
    state.destination = destEl.value;
    renderRouteResult();
  });

  // 시연 프리셋 버튼
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('select-origin').value = btn.dataset.o;
      document.getElementById('select-destination').value = btn.dataset.d;
      state.origin = btn.dataset.o;
      state.destination = btn.dataset.d;
      state.selectedRouteMode = 'easy';
      renderRouteResult();
      const ok = state.currentRouteResult.status === 'OK';
      showToast(ok ? '선택한 시범 시나리오 경로가 적용되었습니다.' : state.currentRouteResult.message, ok ? 'success' : 'error');
    });
  });

  // 길찾기 실행 버튼
  document.getElementById('btn-find-route').addEventListener('click', () => {
    state.origin = document.getElementById('select-origin').value;
    state.destination = document.getElementById('select-destination').value;
    state.selectedRouteMode = 'easy';
    renderRouteResult();
    const ok = state.currentRouteResult.status === 'OK';
    showToast(ok ? '선택된 이동기기 기준으로 시범 구간 경로를 탐색했습니다.' : state.currentRouteResult.message, ok ? 'success' : 'error');
  });

  // Tab 2 이벤트
  document.getElementById('toggle-car-api').addEventListener('change', (e) => {
    state.includeCarApi = e.target.checked;
    renderTransportComparison();
  });
  document.getElementById('select-bus-stop').addEventListener('change', renderBusArrivals);

  // Tab 3 배터리 이벤트
  const inputPct = document.getElementById('input-battery-pct');
  const rangePct = document.getElementById('range-battery-pct');
  inputPct.addEventListener('input', () => {
    const pct = Number(inputPct.value);
    if (inputPct.value.trim() !== '' && Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      rangePct.value = inputPct.value;
    }
    renderBatterySection();
  });
  rangePct.addEventListener('input', () => {
    inputPct.value = rangePct.value;
    renderBatterySection();
  });
  document.getElementById('input-full-range').addEventListener('input', renderBatterySection);
  document.getElementById('select-env-factor').addEventListener('change', renderBatterySection);

  // Tab 4 위치 확인 및 도움 요청 이벤트
  document.getElementById('btn-get-location').addEventListener('click', () => {
    const request = ++state.locationRequest;
    state.location = null;
    document.getElementById('select-manual-location').value = '';
    updateLocationDisplay();
    if (!navigator.geolocation) {
      showToast('이 브라우저에서는 위치 확인 기능을 지원하지 않습니다. 아래에서 수동으로 선택해 주세요.', 'error');
      return;
    }
    showToast('브라우저 위치 권한을 요청하고 있습니다...', 'info');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (request !== state.locationRequest) return;
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        const acc = Math.round(pos.coords.accuracy);
        const now = new Date().toLocaleTimeString('ko-KR');

        state.location = {
          name: `GPS 측정 좌표 (창원시 마산 생활권 확인 필요)`,
          coords: `${lat}, ${lng}`,
          accuracy: `약 ±${acc}m`,
          time: now
        };
        updateLocationDisplay();
        showToast('현재 GPS 좌표가 확인되었습니다.', 'success');
      },
      () => {
        if (request !== state.locationRequest) return;
        showToast('위치 권한이 거부되었거나 측정에 실패했습니다. 아래 수동 위치 선택을 이용해 주세요.', 'error');
      },
      { timeout: 5000 }
    );
  });

  document.getElementById('select-manual-location').addEventListener('change', (e) => {
    state.locationRequest++;
    if (!e.target.value) {
      state.location = null;
      updateLocationDisplay();
      return;
    }
    const [name, coords] = e.target.value.split('|');
    state.location = {
      name: `${name} (시연용 수동 선택, 실제 위치 확인 필요)`,
      coords,
      accuracy: '수동 지점 선택',
      time: new Date().toLocaleTimeString('ko-KR')
    };
    updateLocationDisplay();
  });

  document.getElementById('input-guardian-phone').addEventListener('input', updateHelpSmsPreview);

  document.getElementById('btn-copy-sms').addEventListener('click', async () => {
    const textarea = document.getElementById('sms-preview');
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      textarea.select();
      showToast('자동 복사가 지원되지 않습니다. 선택된 내용을 직접 복사해 주세요.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(textarea.value);
      showToast('도움 요청 문자 내용이 클립보드에 복사되었습니다.', 'success');
    } catch (error) {
      textarea.select();
      showToast('복사 권한이 없거나 복사에 실패했습니다. 선택된 내용을 직접 복사해 주세요.', 'error');
    }
  });

  // 초기 렌더링 실행
  renderRouteResult();
  renderBusArrivals();
  renderChargers();
  updateHelpSmsPreview();
});
