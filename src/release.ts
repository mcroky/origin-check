import packageInfo from '../package.json';
export const APP_VERSION=packageInfo.version;
export function isNewerVersion(next:string,current:string){
 const valid=(s:string)=>/^\d{1,6}\.\d{1,6}\.\d{1,6}$/u.test(s);
 if(!valid(next)||!valid(current))return false;
 const a=next.split('.').map(Number),b=current.split('.').map(Number);
 for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;
}
