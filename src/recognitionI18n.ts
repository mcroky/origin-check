import type {Lang} from './i18n';
export const recognitionCopy:Record<Lang,{assist:string;attempts:string;sourceName:string;contextual:string;cancel:string;ocr:string}>={
 ko:{assist:'오탈자 검색 보조 · 0건 또는 검색식 오류 시 읽힌 단어로 최대 3회 조회',attempts:'실제 조회한 검색어',sourceName:'식약처 표기 제안 · OCR 원문을 고치지 않음',contextual:'라벨 문맥에서 복구한 후보 · 확인 필요',cancel:'조회 취소',ocr:'원본·확대·명암 보강과 표·용량 영역 재인식을 기기에서 비교합니다. OCR 원문과 식약처 표기 제안은 별도입니다.'},
 en:{assist:'Typo search help · up to 3 observed-term queries for no results or query errors',attempts:'Queries actually sent',sourceName:'MFDS spelling suggestion · original OCR preserved',contextual:'Recovered from label context · review needed',cancel:'Cancel search',ocr:'Compare original, enhanced, table-region and focused quantity OCR on device. OCR and MFDS spelling suggestions remain separate.'},
 ja:{assist:'誤字検索補助 · 0件や検索式エラー時に読んだ単語で最大3回検索',attempts:'実際に送信した検索語',sourceName:'食薬処の表記候補 · OCR原文は保持',contextual:'ラベル文脈から復元した候補 · 要確認',cancel:'検索を中止',ocr:'原本・補正・表と内容量の部分読取を端末内で比較します。OCR原文と資料の表記候補は別に保持します。'},
 zh:{assist:'误字查询辅助 · 零结果或查询式错误时按读到的词最多查询3次',attempts:'实际发送的查询词',sourceName:'食药处名称建议 · 保留OCR原文',contextual:'从标签上下文恢复的候选 · 需核对',cancel:'取消查询',ocr:'在设备内比较原图、增强、表格及净含量区域重读。OCR原文与食药处名称建议分别保留。'}
};
