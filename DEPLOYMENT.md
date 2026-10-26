# 공개 체험판 배포

## v0.12.0 · 2026-10-26

프런트엔드는 기존 GitHub Pages, 공식 조회 서버는 https://origin-check-api.svscorpai1.chatgpt.site 이다. Sites project_id는 hosting/manifest.json에 기록했다. 두 키는 Sites 서버 비밀 환경변수로 등록했고 프런트엔드나 Git 저장소에 넣지 않는다. Worker는 D1 원자 카운터로 공유 예산을 적용한다. C005/C002 각 시간당 60·일일 240회, 수입자료 각 시간당 200·일일 1,000회, 방문자 해시별 15분당 30회이다. 서버 메모리 캐시는 5분이며 장애·인증 오류는 캐시하지 않는다. 소스 변경 시 scripts/prepare-hosted-api.mjs로 분리된 Sites 체크아웃에 동기화한 뒤 동일 Site로 빌드·게시한다. 기존 사진 전용 식약처 UI는 로컬 전용이며 새 공식 조회는 바코드 탭에서 제공한다.


## v0.11.3 · 2026-10-26

기본 후면 후보 선택과 브라우저 내 사용자 선택 기억을 반영한다. 새 버전에서는 모델별·고정 번호 규칙을 쓰지 않으며 확대 기능은 모바일 보조 메뉴에 배치한다. 공개 업데이트 피드를 통해 스튜디오 카드에 최신 버전이 반영된다. 선택한 카메라 식별값·이름만 브라우저에 저장하고 자동 선택 복귀로 삭제한다. 사진·영상·카메라 목록은 새로 전송하지 않는다.


## v0.11.2 · 2026-10-26

후면 카메라 선택·1/2/3배 중앙 영역 확대를 추가했다. 공개 업데이트 피드와 앱·서비스워커 버전을 함께 갱신한다. 카메라 선택은 브라우저가 노출하는 기기 목록 범위에 한정되며 실제 기기별 메인 렌즈 선택 성공을 주장하지 않는다. 스튜디오 업데이트 카드는 기존 updates.json 연동을 사용한다.


## v0.11.1 · 2026-10-26

모바일 안내 접기, 카메라 재생·프레임 확인, 카메라 전환·기본 카메라 촬영과 작은 바코드 사진 보정을 포함한다. 공개 업데이트 피드와 서비스워커 캐시를 같은 버전으로 갱신한다. 기기 영상 검증은 별도이며 브라우저 제어 런타임 초기화 오류로 이번 변경의 화면 조작 검증은 미실시다.


- 주소: https://mcroky.github.io/origin-check/
- 저장소: https://github.com/mcroky/origin-check
- 스튜디오: https://mcroky.github.io/roky-studio/
- 버전: 0.12.0 / 2026-10-26 (첫 공개 0.9.0 / 2026-10-25)

v0.11.0부터 기본 화면은 바코드 탭입니다. 카메라·사진·번호 입력 후 공개 식품 DB를 실시간 조회하고, 자료가 부족하면 라벨 카메라로 이동합니다. 식약처 API는 계속 별도 로컬 서버 전용입니다. 빌드 시 설치된 의존성의 라이선스 고지를 재생성하며 바코드 디코더는 외부 CDN 대신 앱의 별도 청크로 제공합니다.

v0.10.0부터 원료 원산지 카드를 별도로 제공합니다. 새 공개본을 처음 받을 때 한 번 새로고침하고 화면 위의 `v0.10.0`을 확인하세요. 이후에는 `최신 버전 확인`에서 갱신 여부를 확인하고 직접 다시 열 수 있습니다. 다시 열면 현재 사진·수정 문구는 지워집니다. 사진의 인식 문구를 재확인한 뒤 `제조국·원료 표시 확인`을 눌러야 새 결과를 만듭니다.

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
