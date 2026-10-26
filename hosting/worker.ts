import handler from 'vinext/server/fetch-handler';
import {createOfficialHandler} from '../core/server/originApi';
import {sqlBudget,type SqlStore} from '../core/server/originQuota';
import {runWithConnectorBinding} from '../lib/connector-context';
let official:ReturnType<typeof createOfficialHandler>|undefined;
export default {
 fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){
  if(new URL(request.url).pathname.startsWith('/api/origin/')){
   if(!env.DB)return new Response('{"error":"QUOTA_NOT_CONFIGURED"}',{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
   official??=createOfficialHandler({mfdsKey:env.MFDS_SERVICE_KEY??'',foodSafetyKey:env.FOODSAFETY_SERVICE_KEY??'',budget:sqlBudget(env.DB as unknown as SqlStore)});
   return official(request);
  }
  return runWithConnectorBinding(undefined,()=>handler.fetch(request,env,ctx));
 }
};
