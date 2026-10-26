import {useSyncExternalStore,type ReactNode} from 'react';
import type {Lang} from './i18n';
const query='(max-width: 600px)';
const snapshot=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia(query).matches;
function subscribe(listener:()=>void){if(typeof window==='undefined'||!window.matchMedia)return()=>{};const media=window.matchMedia(query);media.addEventListener('change',listener);return()=>media.removeEventListener('change',listener);}
export function useCompact(){return useSyncExternalStore(subscribe,snapshot,()=>false);}
export function CompactDetails({summary,children,className='',compact}:{summary:string;children:ReactNode;className?:string;compact?:boolean}){
 const mobile=useCompact();return (compact??mobile)?<details className={`compact-details ${className}`}><summary>{summary}</summary><div>{children}</div></details>:<div className={`expanded-details ${className}`}>{children}</div>;
}
export const compactCopy={
 ko:{about:'앱 안내',scanHelp:'개인정보·스캔 안내',manual:'번호 직접 입력',source:'원문·상세정보',reason:'판정 근거·상세정보',photos:'촬영 도움말',principles:'제조국·원료 구분 안내',privacy:'영상은 기기 처리 · 번호로 제품 조회',caveat:'공개 DB 정보 · 실물 라벨과 대조 필요',labelScope:'검토한 라벨 표시 · 진위는 미검증',matchScope:'신고 자료 대조 · 개별 로트는 미확인',photoHint:'제조국·원료 표시가 보이게 찍어주세요.'},
 en:{about:'About',scanHelp:'Privacy & scan help',manual:'Enter number',source:'Source & details',reason:'Evidence & details',photos:'Photo help',principles:'Manufacture vs ingredient origins',privacy:'Video stays on-device · lookup uses the number',caveat:'Public record · compare with your label',labelScope:'Reviewed label statement · authenticity not verified',matchScope:'Declaration comparison · batch not verified',photoHint:'Include manufacture and ingredient-origin statements.'},
 ja:{about:'アプリ案内',scanHelp:'プライバシー・読取案内',manual:'番号を入力',source:'原文・詳細',reason:'根拠・詳細',photos:'撮影のヒント',principles:'製造国・原料産地の区別',privacy:'映像は端末内 · 番号で検索',caveat:'公開DB資料 · 実物と照合が必要',labelScope:'確認した表示 · 真偽は未検証',matchScope:'申告資料と照合 · ロットは未確認',photoHint:'製造国・原料産地の表示を撮影してください。'},
 zh:{about:'应用说明',scanHelp:'隐私与扫描说明',manual:'输入号码',source:'原文与详情',reason:'依据与详情',photos:'拍摄提示',principles:'制造国与原料产地区别',privacy:'画面在设备内处理 · 用号码查询',caveat:'公开数据库资料 · 需核对实物标签',labelScope:'已核对标签标示 · 未验证真伪',matchScope:'与申报资料比对 · 未核实批次',photoHint:'请拍清制造国与原料产地标示。'}
} satisfies Record<Lang,Record<string,string>>;
