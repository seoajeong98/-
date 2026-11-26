# 턱없이

이동약자들을 위한 간편 길찾기 웹사이트입니다. `index.html`은 마산 시범 구간과 정적 예시 데이터를 사용하는 프로토타입이며, 실제 경로·버스·충전소 API는 아직 연동되지 않았습니다.

## 테스트

Node.js가 설치되어 있다면 저장소 루트에서 아래 명령으로 배터리 경계값, 시범 경로 차단, 위치 권한 처리, 도움 요청 문구의 회귀 테스트를 실행합니다.

```sh
node --test tests/prototype.test.cjs
```

위 테스트는 브라우저 UI·실제 GPS·외부 API·현장 안전성을 검증하지 않습니다.

## 배포

`main` 브랜치에 변경 사항을 푸시하면 GitHub Actions가 GitHub Pages를 활성화하고 자동 배포합니다. 첫 배포가 완료되면 Pages URL은 저장소의 **Settings → Pages**와 Actions 실행 결과에서 확인할 수 있습니다.
