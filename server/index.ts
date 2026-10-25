import {createServer} from 'node:http';
import {createMfdsHandler} from './handler.ts';
const server=createServer(createMfdsHandler(process.env.MFDS_SERVICE_KEY??''));
server.requestTimeout=15_000;server.headersTimeout=10_000;
server.listen(8787,'127.0.0.1',()=>console.log('MFDS API listening on http://127.0.0.1:8787 (key is never logged)'));
