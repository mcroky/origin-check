import type {MfdsRecord} from '../server/mfds';
export type DomesticIdentity={barcode:string;reportNo:string;name:string;manufacturer:string;category:string;reportedAt:string;endedAt:string;closedAt:string};
export type DomesticLookup={code:string;records:DomesticIdentity[];total:number;bounded:boolean;source:string;retrievedAt:string;cached:boolean};
export type DomesticIngredient={reportNo:string;name:string;manufacturer:string;ingredients:string;changedAt:string};
export type DomesticDetail={identity:DomesticIdentity;ingredients:DomesticIngredient[];total:number;bounded:boolean;source:string;identitySource:string;retrievedAt:string;cached:boolean};
export type ImportCandidate={record:MfdsRecord;dataset:'current'|'legacy';source:string;retrievedAt:string;query:{name:string;language:'ko'|'en';importer:string};index:number};
export type ImportLookup={code:string;candidates:ImportCandidate[];failures:{dataset:string;error:string}[];bounded:boolean;retrievedAt:string};
