import {createMfdsClient,ApiError} from '../server/mfds.ts';
const client=createMfdsClient(process.env.MFDS_SERVICE_KEY??'');
if(!client.configured){console.log('NOT_CONFIGURED: .env.local의 MFDS_SERVICE_KEY에 키를 저장한 뒤 다시 실행하세요.');process.exitCode=1;}
else{
 try{const name=process.argv[2]||'야마후쿠 청 매실';const result=await client.search({name,language:'ko',importer:'',page:1});
 console.log(JSON.stringify({status:'OK',total:result.total,returned:result.records.length,withManufacturingCountry:result.records.filter(r=>r.manufacturingCountry.trim()).length,retrievedAt:result.retrievedAt,source:result.source,note:result.records.length?'실제 응답 연결 확인. 검색 후보와 구매 제품의 일치는 별도 확인 필요.':'정상 응답이나 해당 검색어의 자료 없음. 다른 제품명으로 재조회 필요.'},null,2));
 }catch(error){console.error(error instanceof ApiError?error.code:'CHECK_FAILED');process.exitCode=1;}
}
