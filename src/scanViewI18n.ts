import type {Lang} from './i18n';
export const scanViewCopy:Record<Lang,{camera:string;generic:string;zoom:string;hint:string}>={
 ko:{camera:'카메라 선택',generic:'카메라',zoom:'화면 확대',hint:'바코드가 작으면 2× · 흐리면 다른 후면 카메라'},
 en:{camera:'Choose camera',generic:'Camera',zoom:'View zoom',hint:'Small barcode? Try 2×. Blurry? Choose another rear camera.'},
 ja:{camera:'カメラ選択',generic:'カメラ',zoom:'画面拡大',hint:'小さい時は2× · ぼやける時は別の背面カメラ'},
 zh:{camera:'选择相机',generic:'相机',zoom:'画面放大',hint:'条码小可用2× · 模糊时换其他后置相机'}
};
