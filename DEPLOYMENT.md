# 공개 체험판 배포

- 주소: https://mcroky.github.io/origin-check/
- 저장소: https://github.com/mcroky/origin-check
- 스튜디오: https://mcroky.github.io/roky-studio/
- 버전: 0.9.0 / 2026-10-25

GitHub Pages는 정적 호스팅입니다. `pnpm build:pages`는 `/origin-check/` 경로에 맞춰 빌드하고, 식약처 상태·검색 요청과 조회 입력 UI를 제거한 공개 체험판을 만듭니다. 사진 OCR·라벨 원문 검토·국가 표시 분석·JSON 내려받기·30개 표본 검색을 제공합니다. 화면 상단과 조회 영역에 제한을 네 언어로 표시합니다.

실시간 식약처 대조는 기존 로컬 실행(`pnpm dev` + 서버 전용 `.env.local`)에서 사용할 수 있습니다. 인증키를 `VITE_` 변수나 GitHub Pages에 넣지 마세요. 공개 실시간 기능의 다음 단계는 별도 Node 서버 호스팅과 HTTPS·호출량 제한·운영 모니터링입니다. 서버 호스팅은 이번 정적 배포에 포함하지 않았습니다. 발급·실행은 [MFDS_SETUP.md](MFDS_SETUP.md)를 따릅니다.

## 재배포

`main`에 push하면 `.github/workflows/pages.yml`이 고정 잠금 파일로 설치 → 테스트 → Pages 빌드 → 배포 파일 검사 → GitHub Pages 배포를 실행합니다. 저장소 Pages 설정은 GitHub Actions 모드입니다. OCR 런타임·언어 모델은 `public/ocr/`에 포함하여 첫 실행 때 외부 모델 CDN이 필요하지 않습니다.

```sh
pnpm test
pnpm build:pages
node scripts/check-pages.mjs
pnpm exec vite preview --mode pages
```

`pnpm build`와 `pnpm dev`는 로컬 식약처 연동 모드를 유지합니다. 서비스워커 캐시는 앱 경로별로 분리하며 다른 스튜디오 프로젝트나 API 응답을 캐시하지 않습니다.

## 공개 파일 범위

앱 소스·설정·문서·테스트·OCR 코드/모델·허가된 OFF 샘플 사진 두 장을 공개합니다. `.env*`(`.env.example` 제외), `validation/`, `.publish/`, `node_modules/`는 Git에서 제외합니다. 검증용 판매처 사진·변환본·그 사진을 포함한 캡처는 공개하지 않습니다. `public/credits.html`에서 OFF 사진별 기여자·CC BY-SA 3.0·표본 DB의 ODbL·의존성 라이선스를 확인할 수 있습니다.

실제 휴대전화 촬영 20장 평가는 사진이 없어 미실시입니다. 기존 개발 표본의 성공 사례를 일반 정확도로 표현하지 않습니다. Android 실기기·AAB·Google Play 출시는 이번 배포에서 수행하지 않았습니다.

## 스튜디오 등록

스튜디오의 기존 미커밋 작업을 보존하기 위해 `.publish/studio`의 별도 clone에서 앱 카드·제작 썸네일·프로젝트 수 9개·업데이트 카드·의견 폼 선택지를 추가합니다. `updates.mjs`는 공개 `updates.json`을 읽어 이후 업데이트를 갱신합니다.

참고: [Vite 정적 배포](https://vite.dev/guide/static-deploy), [GitHub Pages Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
