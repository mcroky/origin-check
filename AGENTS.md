# 프로젝트 작업 지침

개발 전에 아래 통합 문서를 읽고 이번 작업에 관련된 기준을 적용한다.

- E:/개인프로젝트/Roky Studio/PROJECT_BASELINE.md
- E:/개인프로젝트/Roky Studio/docs/GAMEDEV_SKILLS_GUIDE.md
- E:/개인프로젝트/Roky Studio/docs/GOOGLE_PLAY_READINESS.md

이 프로젝트는 일반 웹앱이다. 게임 엔진을 도입하지 않고 관련 UI·접근성·입력·성능 원칙만 적용한다.
계획은 PROJECT_PLAN.md, 실행법은 README.md, 실측 결과는 VALIDATION_REPORT.md에 있다.
React·TypeScript·Vite·Tesseract.js 기반 로컬 시제품을 구현했다. 정확한 설치 버전은 pnpm-lock.yaml을 따른다.

## 제품 판별 원칙

- 제조국, 브랜드 소재국, 원재료 원산지, 수출국, 수입업체 소재국을 구분한다.
- 바코드 접두사·브랜드명·외형만으로 제조국을 판정하지 않는다.
- 모든 결과는 출처, 원문 근거, 적용 제품/모델/로트 범위, 확인일과 연결한다.
- 근거 부족·제품 불일치·자료 상충을 정상 결과로 처리한다.
- OCR과 AI의 출력은 검토할 추출값이며 제조국의 독립적인 증명이 아니다.
- 사용자 제보를 검토 없이 공개 제품 DB의 확정 정보로 반영하지 않는다.
