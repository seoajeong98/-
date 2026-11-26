// Tab 4: 도움 요청 문자 및 링크 동기화
function updateHelpSmsPreview() {
  const phone = document.getElementById('input-guardian-phone').value.trim();
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const validPhone = /^[0-9 -]+$/.test(phone) && cleanPhone.length >= 9 && cleanPhone.length <= 11;
  const locationText = state.location
    ? `위치: ${state.location.name}\n좌표: ${state.location.coords}`
    : '위치 미확인: 직접 위치를 확인해 입력해 주세요.';
  const smsText = `[턱없이 도움요청 초안] 이동에 도움이 필요합니다.\n${locationText}`;

  document.getElementById('sms-preview').value = smsText;
  const phoneInput = document.getElementById('input-guardian-phone');
  phoneInput.setAttribute('aria-invalid', String(phone !== '' && !validPhone));
  const call = document.getElementById('link-call-guardian');
  const sms = document.getElementById('link-sms-guardian');
  for (const link of [call, sms]) {
    link.setAttribute('aria-disabled', String(!validPhone));
    if (!validPhone) link.removeAttribute('href');
  }
  if (validPhone) {
    call.href = `tel:${cleanPhone}`;
    sms.href = `sms:${cleanPhone}?body=${encodeURIComponent(smsText)}`;
  }
}

function updateLocationDisplay() {
  const location = state.location;
  document.getElementById('loc-name').textContent = location ? location.name : '미확인';
  document.getElementById('loc-coords').textContent = location ? location.coords : '미확인';
  document.getElementById('loc-accuracy').textContent = location ? location.accuracy : '미확인';
  document.getElementById('loc-time').textContent = location ? location.time : '미측정';
  updateHelpSmsPreview();
}
