import {createServer} from 'node:http';
import {createMfdsHandler} from './handler.ts';
import {createOfficialNodeHandler} from './officialNode.ts';
const mfds=createMfdsHandler(process.env.MFDS_SERVICE_KEY??''),official=createOfficialNodeHandler(process.env.MFDS_SERVICE_KEY??'',process.env.FOODSAFETY_SERVICE_KEY??'');
const server=createServer((req,res)=>void((req.url??'').startsWith('/api/origin/')?official(req,res):mfds(req,res)));
server.requestTimeout=15_000;server.headersTimeout=10_000;
server.listen(8787,'127.0.0.1',()=>console.log('MFDS API listening on http://127.0.0.1:8787 (key is never logged)'));
