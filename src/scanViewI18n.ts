import type {Lang} from './i18n';
export const scanViewCopy:Record<Lang,{camera:string;generic:string;zoom:string;hint:string;auto:string;remember:string}>={
 ko:{camera:'카메라 선택',generic:'카메라',zoom:'화면 확대',hint:'다른 렌즈가 열리면 카메라 선택에서 변경하세요.',auto:'자동 · 기본 후면 우선',remember:'직접 고른 카메라만 이 브라우저에 기억합니다. 자동 선택으로 되돌리면 삭제됩니다.'},
 en:{camera:'Choose camera',generic:'Camera',zoom:'View zoom',hint:'Wrong lens? Change it under Choose camera.',auto:'Auto · prefer primary rear',remember:'Your manual camera choice is saved only in this browser. Select Auto to remove it.'},
 ja:{camera:'カメラ選択',generic:'カメラ',zoom:'画面拡大',hint:'別のレンズが開いた場合はカメラを変更してください。',auto:'自動 · 背面メインを優先',remember:'手動で選んだカメラだけをこのブラウザに保存します。自動選択に戻すと削除します。'},
 zh:{camera:'选择相机',generic:'相机',zoom:'画面放大',hint:'若打开了其他镜头，请更换相机。',auto:'自动 · 优先后置主摄',remember:'手动选择的相机仅保存在此浏览器中，改回自动选择即可删除。'}
};
