import {useState} from 'react';
import type {Lang} from './i18n';
import {APP_VERSION,isNewerVersion} from './release';
export const releaseCopy={
 ko:{check:'최신 버전 확인',checking:'확인 중',current:'현재 공개 버전입니다.',available:'새 버전이 있습니다.',failed:'버전 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.',reload:'새 버전으로 다시 열기',loss:'다시 열면 현재 사진과 수정 문구는 지워집니다.',action:'제조국·원료 표시 확인',manufacture:'완제품 제조국',ocr:'선택한 OCR 언어'},
 en:{check:'Check for updates',checking:'Checking',current:'You are running the public version.',available:'An update is available.',failed:'Could not check the release. Please retry later.',reload:'Reopen with the new version',loss:'Reopening clears the current photo and edited text.',action:'Check manufacture & ingredient labels',manufacture:'Finished-product manufacture',ocr:'Selected OCR language'},
 ja:{check:'最新版を確認',checking:'確認中',current:'現在の公開版です。',available:'新しい版があります。',failed:'バージョンを確認できません。後で再試行してください。',reload:'新しい版で開き直す',loss:'開き直すと現在の写真と修正した文字は消えます。',action:'製造国・原料表示を確認',manufacture:'完成品の製造国',ocr:'選択したOCR言語'},
 zh:{check:'检查更新',checking:'检查中',current:'正在运行当前公开版本。',available:'有新版本可用。',failed:'无法确认版本，请稍后重试。',reload:'用新版本重新打开',loss:'重新打开会清除当前照片和修改文字。',action:'核对制造国与原料标示',manufacture:'成品制造国',ocr:'所选OCR语言'}
};
export function ReleaseNotice({lang}:{lang:Lang}){
 const t=releaseCopy[lang];const [status,setStatus]=useState<'idle'|'checking'|'current'|'available'|'failed'>('idle');const [latest,setLatest]=useState('');
 async function check(){setStatus('checking');try{
  const response=await fetch(`${import.meta.env.BASE_URL}updates.json`,{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error();
  const releases:unknown=await response.json();const version=Array.isArray(releases)&&typeof releases[0]?.version==='string'?releases[0].version:'';
  if(version===APP_VERSION)setStatus('current');else if(isNewerVersion(version,APP_VERSION)){setLatest(version);setStatus('available');}else throw Error();
  if('serviceWorker'in navigator)void navigator.serviceWorker.getRegistration().then(r=>r?.update()).catch(()=>{});
 }catch{setStatus('failed');}}
 return <div className="release-notice"><strong>v{APP_VERSION}</strong><button onClick={()=>void check()} disabled={status==='checking'}>{status==='checking'?t.checking:t.check}</button>{status!=='idle'&&status!=='checking'&&<p role="status">{t[status]}{status==='available'&&<> v{latest}<button onClick={()=>location.reload()}>{t.reload}</button><small>{t.loss}</small></>}</p>}</div>;
}
