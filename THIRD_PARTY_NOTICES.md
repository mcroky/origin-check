# 외부 자료·라이선스

## 추가 브랜드 검증 (v0.6.0)

타바스코·이금기·바릴라의 판매처 사진과 인쇄 표시 이미지 5장을 로컬 검증에 추가 사용했습니다. 개별 출처·해시·확인일은 `validation/quantity-brands/manifest.json`에 있습니다. 재배포 허락을 확인하지 못했으며, 타바스코 상세 페이지에는 오뚜기의 저작권·무단 복제 및 배포 금지 표기가 있습니다. 원본·변환본·사진이 포함된 캡처는 로컬 검증에만 보관하고 Git·`public/`·앱 배포물에서 제외합니다. 제조사·판매처의 제휴·인증을 의미하지 않습니다.

## 수입식품 이미지 추가 검증 (v0.4.0)

롯데마트 제타(https://lottemartzetta.com/) 공개 상품 이미지 12장을 로컬 품질 검증에 사용했습니다. 사진별 상품 페이지·이미지 URL·확인 시각·해시는 `validation/real-imports/manifest.json`에 있습니다. 이는 제조사·판매처의 제품 이미지이며, 자유로운 재배포 라이선스는 확인하지 못했습니다. Open Food Facts의 CC BY-SA 라이선스를 이 이미지에 적용하지 않습니다.

원본 이미지·변환본·해당 이미지가 포함된 화면 캡처는 로컬 검증에 한정하며 Git 제외 대상으로 관리합니다. `public/` 예제나 앱 배포물에는 포함하지 않습니다. 공개 배포·공유 전에 해당 권리를 별도 확인해야 합니다. 상표·패키지·표시사항 권리는 각 권리자에게 있으며 제휴·인증을 의미하지 않습니다.

식약처 조회 자료의 출처는 https://www.data.go.kr/data/15110214/openapi.do 이며, 조회 시각·조건·자료 원문을 검증 JSON에 기록했습니다. 인증키와 인증 URL은 포함하지 않았습니다.

## Open Food Facts

- 데이터 출처: https://world.openfoodfacts.org/
- API 안내: https://openfoodfacts.github.io/openfoodfacts-server/api/
- 데이터베이스: Open Database License (ODbL), https://opendatacommons.org/licenses/odbl/1-0/
- 개별 데이터 내용: Database Contents License, https://opendatacommons.org/licenses/dbcl/1-0/
- 제품 사진: Creative Commons Attribution-ShareAlike 3.0, https://creativecommons.org/licenses/by-sa/3.0/
- 사진에는 제3자의 상표·패키지 디자인이 포함될 수 있습니다. 이 앱이 제조사와 제휴하거나 인증받았다는 의미가 아닙니다.

`validation/off-production.json`, `validation/off-china.json`은 API 응답 스냅샷입니다. `src/products.json`은 한국 판매 표본의 식별 필드를 추린 데이터이며 ODbL 조건으로 제공합니다. 출처 데이터와 분리해 관리하며, 제조국을 추측하여 추가하지 않았습니다.

원본 사진별 업로더·출처 URL은 `validation/label-manifest.json`, `validation/benchmark-manifest.json`에 있습니다. OCR 결과와 비교용 잘라낸 이미지에도 해당 출처·사진 라이선스를 유지합니다.

시제품 예제:

| 파일 | 사진 기여자 | 제품·출처 | 변경 |
| --- | --- | --- | --- |
| public/samples/label.jpg | scholes8 | https://world.openfoodfacts.org/product/8801062633692 | 서버의 ingredients_en.15.full.jpg 그대로, UI에서 읽을 영역만 선택 |
| public/samples/china.jpg | macrofactor | https://world.openfoodfacts.org/product/6921804700269 | 원본 이미지 19.jpg 그대로, UI에서 읽을 영역만 선택 |

추가 대조 이미지:

- `validation/labels/5014276701115-13.jpg`: tk101, https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/501/427/670/1115/13.jpg
- `validation/labels/6921804700269-12.jpg`: arigreen, https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/692/180/470/0269/12.jpg
- `validation/labels/chili-2.jpg`: jiehong, https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/692/180/470/0269/2.jpg
- `validation/labels/chili-19.jpg`: macrofactor, https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/692/180/470/0269/19.jpg
- `validation/labels/chili-25.jpg`: macrofactor, https://openfoodfacts-images.s3.eu-west-3.amazonaws.com/data/692/180/470/0269/25.jpg

## OCR·앱 라이브러리

- Tesseract.js / Tesseract.js-core: Apache-2.0. https://github.com/naptha/tesseract.js
- Tesseract 언어 자료: https://github.com/naptha/tessdata / https://github.com/tesseract-ocr/tessdata_best
- 모델 다운로드 경로는 `scripts/prepare-ocr.mjs`, 파일 해시는 `validation/ocr-assets.json`에 기록합니다.
- React·Vite·TypeScript·Lucide 등 패키지는 각 배포본의 라이선스를 따릅니다. 버전은 pnpm-lock.yaml에 기록되어 있습니다.
- 배포하는 OCR 런타임의 동봉 라이선스 파일은 `public/ocr/licenses/`에 보관합니다.
