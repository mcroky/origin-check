import type {Lang} from './i18n';

export const staticPreview=import.meta.env.VITE_DEPLOY_TARGET==='pages';
export const deploymentCopy:Record<Lang,{title:string;body:string;api:string;guide:string;credits:string;privacy:string;update:string}>={
 ko:{title:'공개 체험판',body:'사진 OCR·라벨 표시 확인·30개 식품 표본 검색을 사용할 수 있어요. 식약처 실시간 조회는 서버가 필요한 기능으로 이 공개판에서는 제공하지 않습니다. 사진의 인식 문구를 검토한 뒤 제조국·원료 표시를 확인하세요.',api:'공개 체험판에서는 식약처 조회를 제공하지 않습니다. 사진 OCR과 라벨 표시 확인은 사용할 수 있어요.',guide:'실시간 조회 실행 안내',credits:'자료 출처·라이선스',privacy:'공개판은 식약처로 검색어를 전송하지 않습니다. GitHub Pages에서 앱과 OCR 파일을 내려받으며, GitHub가 보안 목적으로 접속 IP를 기록할 수 있습니다.',update:'v0.9.0 · 2026-10-25\nGitHub Pages 공개 체험판을 추가했습니다. 기기 내 OCR·라벨 확인·표본 검색을 제공하며 실시간 식약처 조회는 로컬 서버에서 실행합니다. 실제 휴대전화 촬영 20장 평가는 미실시입니다.'},
 en:{title:'Public preview',body:'Try on-device OCR, label statements and a 30-product sample. Live MFDS lookup needs a server and is unavailable in this public preview. Review the photo text, then check manufacture and ingredient statements.',api:'Live MFDS lookup is unavailable in this public preview. Photo OCR and label-statement checks are available.',guide:'Run live lookup',credits:'Sources & licenses',privacy:'The public preview does not send search terms to MFDS. App and OCR files are served by GitHub Pages; GitHub may log visitor IP addresses for security.',update:'v0.9.0 · 2026-10-25\nPublished a GitHub Pages preview with on-device OCR, label checks and sample search. Live MFDS lookup runs with the local server. The 20-phone-photo evaluation has not run.'},
 ja:{title:'公開体験版',body:'端末内OCR・ラベル表示の確認・30製品の標本検索を試せます。食薬処のリアルタイム検索にはサーバーが必要なため、この公開版では利用できません。写真の文字を確認してから、製造国・原料表示を確認してください。',api:'公開体験版では食薬処検索を利用できません。写真OCRとラベル表示の確認は利用できます。',guide:'リアルタイム検索の実行方法',credits:'出典・ライセンス',privacy:'公開版は検索語を食薬処に送信しません。アプリとOCRファイルはGitHub Pagesから取得し、GitHubが安全管理のため接続IPを記録する場合があります。',update:'v0.9.0 · 2026年10月25日\nGitHub Pages体験版を公開。端末内OCR・表示確認・標本検索を利用できます。食薬処の実検索はローカルサーバーで実行します。携帯撮影20枚の評価は未実施です。'},
 zh:{title:'公开体验版',body:'可体验设备内OCR、标签标示核对及30种食品样本查询。食药处实时查询需要服务器，本公开版不提供。核对照片文字后，再核对制造国与原料标示。',api:'本公开体验版不提供食药处实时查询。可使用照片OCR及标签标示核对。',guide:'实时查询运行说明',credits:'来源与许可证',privacy:'公开版不会向食药处发送查询词。应用及OCR文件由GitHub Pages提供，GitHub可能为安全目的记录访问者IP。',update:'v0.9.0 · 2026年10月25日\n发布GitHub Pages体验版，提供设备内OCR、标签核对及样本查询。食药处实时查询需运行本地服务器。尚未开展20张手机实拍照片评估。'}
};

deploymentCopy.ko.update="v0.9.1 · 2026-10-26\n추출 점수가 같은 OCR 결과는 엔진 신뢰도를 비교해 선택합니다. 작은 글씨의 원료 원산지 문구 누락을 개선했습니다. 원료의 후보 국가를 완제품 제조국이나 실제 사용 원산지로 확정하지 않습니다.\n\n"+deploymentCopy.ko.update;
deploymentCopy.en.update="v0.9.1 · 2026-10-26\nEqual extraction scores now use OCR confidence to select the text. This recovers ingredient-origin text in a small-print label. Listed ingredient-source possibilities do not establish finished-product manufacture or the actual source used.\n\n"+deploymentCopy.en.update;
deploymentCopy.ja.update="v0.9.1 · 2026年10月26日\n抽出点数が同じ場合はOCRの信頼度で文字を選択し、小さい文字の原料産地表示の欠落を改善しました。原料の候補国を製品の製造国や実際に使用した産地とは断定しません。\n\n"+deploymentCopy.ja.update;
deploymentCopy.zh.update="v0.9.1 · 2026年10月26日\n提取分数相同时根据OCR置信度选择文字，改善小字原料产地标示的遗漏。原料候选来源国不代表成品制造国或实际使用的产地。\n\n"+deploymentCopy.zh.update;

deploymentCopy.ko.update="v0.10.0 · 2026-10-26\n원료 원산지를 제조국과 별도 카드에 표시합니다. 중국 직접 표시·후보 목록·부정 및 불명확 문구를 구분하고 검토한 원문을 함께 보관합니다. 화면 상단에서 버전과 업데이트를 확인할 수 있습니다.\n\n"+deploymentCopy.ko.update;
deploymentCopy.en.update="v0.10.0 · 2026-10-26\nIngredient origin now has a separate result card. Direct China statements, candidate lists and negative or unclear wording are distinguished with reviewed source text. Version and update checks appear at the top.\n\n"+deploymentCopy.en.update;
deploymentCopy.ja.update="v0.10.0 · 2026年10月26日\n原料原産地を製造国とは別のカードに表示。中国の直接表示・候補一覧・否定や不明な文言を区別し確認した原文を保持します。上部でバージョンと更新を確認できます。\n\n"+deploymentCopy.ja.update;
deploymentCopy.zh.update="v0.10.0 · 2026年10月26日\n原料原产地与制造国分卡显示，区分中国直接标示、候选列表及否定或不明确文字，并保留已核对原文。顶部可查看版本并检查更新。\n\n"+deploymentCopy.zh.update;

deploymentCopy.ko.update="v0.11.0 · 2026-10-26\n바코드를 카메라·사진·번호로 읽고 Open Food Facts 제품 정보를 실시간 조회합니다. 제조 장소와 원료 원산지를 구분하고 자료가 부족하면 같은 제품의 라벨 촬영으로 이어집니다. 공개 DB 자료는 보유 제품의 현재 라벨·로트와 대조가 필요합니다.\n\n"+deploymentCopy.ko.update;
deploymentCopy.en.update="v0.11.0 · 2026-10-26\nScan a barcode using camera, photo or number entry and look up live Open Food Facts records. Manufacture and ingredient sources stay separate; insufficient data leads to label photography. Public records still need comparison with the current label and batch.\n\n"+deploymentCopy.en.update;
deploymentCopy.ja.update="v0.11.0 · 2026年10月26日\nカメラ・写真・番号入力でバーコードを読みOpen Food Factsを実検索。製造場所と原料産地を分け、資料不足時はラベル撮影へ進めます。登録資料と現在の包装・ロットの照合は必要です。\n\n"+deploymentCopy.ja.update;
deploymentCopy.zh.update="v0.11.0 · 2026年10月26日\n通过相机、照片或号码读取条形码并实时查询Open Food Facts。区分制造地点与原料产地，资料不足时继续拍摄标签。公开资料仍需与当前包装及批次核对。\n\n"+deploymentCopy.zh.update;
deploymentCopy.ko.body="바코드 실시간 제품 조회·사진 OCR·라벨 표시 확인을 사용할 수 있어요. Open Food Facts 자료가 부족하면 라벨 촬영으로 이어집니다. 식약처 실시간 조회는 별도 서버가 필요하여 이 공개판에서는 제공하지 않습니다.";
deploymentCopy.en.body="Try live barcode product lookup, on-device OCR and label checks. Missing Open Food Facts data leads to label photography. Live MFDS lookup requires a separate server and is unavailable in this public preview.";
deploymentCopy.ja.body="バーコードの実検索・端末内OCR・ラベル確認を利用できます。Open Food Factsの資料が不足する場合はラベル撮影へ進めます。食薬処の実検索には別サーバーが必要で、この公開版では利用できません。";
deploymentCopy.zh.body="可使用条形码实时查询、设备内OCR及标签核对。Open Food Facts资料不足时可继续拍摄标签。食药处实时查询需要独立服务器，本公开版不提供。";

deploymentCopy.ko.update="v0.11.1 · 2026-10-26\n모바일 안내와 원문을 접어 주요 동작과 핵심 결과를 먼저 보여줍니다. 카메라 재생과 영상 프레임을 확인하고 재생·전환·기본 카메라 촬영 경로를 제공합니다. 작은 바코드 사진의 확대·여백·명암 보정을 추가했습니다.\n\n"+deploymentCopy.ko.update;

deploymentCopy.en.update="v0.11.1 · 2026-10-26\nMobile guidance and source details are collapsed to prioritize actions and key results. Camera startup checks playback and frames, with play, switch and native photo capture options. Small barcode photos gain enlargement, quiet-zone padding and contrast processing.\n\n"+deploymentCopy.en.update;

deploymentCopy.ja.update="v0.11.1 · 2026-10-26\nモバイルの説明と原文を折りたたみ、操作と主要な結果を優先。カメラの再生・映像を確認し、再生・切替・標準カメラ撮影を選べます。小さなバーコード写真の拡大・余白・明暗補正を追加。\n\n"+deploymentCopy.ja.update;

deploymentCopy.zh.update="v0.11.1 · 2026-10-26\n移动端折叠说明与原文，优先显示操作和主要结果。启动时确认相机播放及画面，提供播放、切换与系统相机拍摄。小尺寸条形码照片新增放大、留白和对比度处理。\n\n"+deploymentCopy.zh.update;

deploymentCopy.ko.update="v0.11.2 · 2026-10-26\n이름으로 구분 가능한 메인 후면 카메라를 우선 선택하고 직접 카메라를 고를 수 있게 했습니다. 1·2·3배 화면 확대와 실제 판독이 같은 중앙 영역을 사용합니다. 화면 확대는 광학 줌이나 초점 개선을 보장하지 않습니다.\n\n"+deploymentCopy.ko.update;

deploymentCopy.en.update="v0.11.2 · 2026-10-26\nPrefer a recognizable rear main camera and allow manual camera selection. The 1×/2×/3× view and barcode decoding use the same central frame region. View enlargement does not guarantee optical zoom or better focus.\n\n"+deploymentCopy.en.update;

deploymentCopy.ja.update="v0.11.2 · 2026-10-26\n名前から識別できる背面メインカメラを優先し、カメラを手動選択できます。1・2・3倍の画面拡大と読取に同じ中央領域を使います。光学ズームやピント改善を保証しません。\n\n"+deploymentCopy.ja.update;

deploymentCopy.zh.update="v0.11.2 · 2026-10-26\n优先选择名称可识别的后置主摄，并可手动选择相机。1、2、3倍画面放大和条码读取使用相同中央区域，不保证光学变焦或对焦改善。\n\n"+deploymentCopy.zh.update;

deploymentCopy.ko.update="v0.11.3 · 2026-10-26\n기종별 예외 없이 기본 후면 후보를 우선합니다. 메인·일반 광각 이름을 우선하고, 번호형 후면 이름은 목록의 첫 적합 후보를 사용합니다. 직접 선택한 카메라는 이 브라우저에 기억하며 자동 선택으로 되돌리면 삭제됩니다. 실제 물리 렌즈의 종류는 브라우저 정보만으로 항상 확정할 수 없습니다.\n\n"+deploymentCopy.ko.update;

deploymentCopy.en.update="v0.11.3 · 2026-10-26\nPrefer a primary rear candidate without model-specific rules. Main and ordinary wide labels take priority, followed by the first eligible numbered rear camera. Manual camera choices stay in this browser and can be cleared with Auto. Browser metadata does not always establish the physical lens type.\n\n"+deploymentCopy.en.update;

deploymentCopy.ja.update="v0.11.3 · 2026-10-26\n機種別の例外を使わず背面メイン候補を優先。メイン・通常広角名を優先し、番号型の背面名は最初の適切な候補を使用します。手動選択をこのブラウザに保存し、自動に戻すと削除。物理レンズの種類はブラウザ情報だけでは常に確定できません。\n\n"+deploymentCopy.ja.update;

deploymentCopy.zh.update="v0.11.3 · 2026-10-26\n不采用机型专用规则，优先后置主摄候选。先选主摄或普通广角名称，再选列表中首个合适的编号后置相机。手动选择仅在此浏览器保存，切回自动即可删除。浏览器信息并不总能确定物理镜头类型。\n\n"+deploymentCopy.zh.update;

deploymentCopy.ko.body="바코드로 국내 품목·원료 자료와 수입식품 신고 후보를 조회합니다. 등록 제조국과 원료 원산지는 구분하며 국가 정보가 없으면 확인 불가로 남깁니다. 사진 OCR도 기기에서 사용할 수 있습니다.";
deploymentCopy.ko.api="바코드 탭에서 국내 바코드·수입 신고자료를 조회할 수 있습니다. 이 사진·제품명 전용 조회 화면은 로컬 서버용입니다.";
deploymentCopy.ko.privacy="공식 조회 시 바코드·품목번호·제품명과 선택한 수입업체명을 Origin Check 조회 서버로 전송하며, 서버가 식품안전나라·식약처를 조회합니다. 사진·영상·OCR 원문은 보내지 않습니다. 응답은 서버 메모리에 최대 5분 재사용하며, 공유 호출량 제한에는 시간대별 해시 식별자와 회수만 저장하고 만료 후 주기적으로 삭제합니다. 인증키는 서버의 비밀 설정에만 보관합니다.";
deploymentCopy.ko.update="v0.12.0 · 2026-10-26\n국내 바코드 C005와 원료 C002를 품목보고번호로 연결하고, 수입식품의 두 신고자료 API를 별도 후보로 대조합니다. 제조국과 원료 문구를 분리하고 보유 제품의 라벨·로트 미대조 범위를 표시합니다. 조회 키는 배포 서버 비밀 환경변수로 관리합니다.\n\n"+deploymentCopy.ko.update;

deploymentCopy.en.body="Look up Korean product and ingredient records and import declaration candidates by barcode. Manufacture and ingredient origins stay separate; missing country data stays unknown. Photo OCR also runs on-device.";
deploymentCopy.en.api="Use the Barcode tab for Korean barcode and import declaration lookup. This photo/name-specific search screen uses the local server.";
deploymentCopy.en.privacy="Official lookup sends barcode, report number, product name and optional importer to the Origin Check server, which queries Food Safety Korea and MFDS. Photos, video and OCR text are not sent. Server memory may reuse responses for up to 5 minutes. Shared limits store time-bucketed hashes and counts, with periodic expiry cleanup. API keys remain server secrets.";
deploymentCopy.en.update="v0.12.0 · 2026-10-26\nC005 barcode identity joins C002 ingredients by report number. Two import declaration datasets remain separate candidates. Manufacture and ingredient wording retain separate evidence and current label/batch limits. Credentials are hosted server secrets.\n\n"+deploymentCopy.en.update;

deploymentCopy.ja.body="バーコードから国内品目・原料資料と輸入申告候補を検索。製造国と原料産地を分け、国の情報がなければ不明のままにします。写真OCRは端末内で実行します。";
deploymentCopy.ja.api="バーコードタブで国内番号・輸入申告を検索できます。この写真・名前専用画面はローカルサーバー用です。";
deploymentCopy.ja.privacy="公式検索時に番号・品目番号・製品名・任意の輸入業者名をOrigin Checkサーバーへ送り、サーバーが食薬処等を照会します。写真・映像・OCR原文は送信しません。応答は最大5分メモリで再利用。共有上限は時間帯別ハッシュと回数だけを保存し、期限後に定期削除します。認証キーはサーバーの秘密設定です。";
deploymentCopy.ja.update="v0.12.0 · 2026-10-26\nC005の番号とC002の原料を品目報告番号で連携。二つの輸入申告資料は別候補として照合し、製造国と原料の根拠を分離します。手元の包装・ロットとの未照合範囲を表示。キーはサーバー秘密設定です。\n\n"+deploymentCopy.ja.update;

deploymentCopy.zh.body="通过条码查询国内品目、原料及进口申报候选。制造国与原料产地分开，缺少国家资料时保持未知。照片OCR在设备内运行。";
deploymentCopy.zh.api="可在条码页查询国内条码和进口申报，此照片与名称专用页面使用本地服务器。";
deploymentCopy.zh.privacy="官方查询向Origin Check服务器发送条码、品目编号、产品名及可选进口商名，由服务器查询食药处等资料。不发送照片、视频或OCR原文。响应可在内存复用最多5分钟；共享限额只保存按时段变化的哈希和次数，并定期清理过期记录。密钥仅存于服务器秘密配置。";
deploymentCopy.zh.update="v0.12.0 · 2026-10-26\n按品目报告编号关联C005条码和C002原料，两个进口申报资料保持独立候选。制造国与原料依据分别保留，并注明未核对实物包装及批次。认证密钥由部署服务器保密保存。\n\n"+deploymentCopy.zh.update;
