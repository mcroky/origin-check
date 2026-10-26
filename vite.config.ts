import {defineConfig,loadEnv,type Plugin} from 'vite';
import react from '@vitejs/plugin-react';
import {createMfdsHandler} from './server/handler.ts';
import {createOfficialNodeHandler} from './server/officialNode.ts';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),['MFDS_','FOODSAFETY_']);
 const handler=createMfdsHandler(process.env.MFDS_SERVICE_KEY??env.MFDS_SERVICE_KEY??'');
 const official=createOfficialNodeHandler(process.env.MFDS_SERVICE_KEY??env.MFDS_SERVICE_KEY??'',process.env.FOODSAFETY_SERVICE_KEY??env.FOODSAFETY_SERVICE_KEY??'');
 const api:Plugin={name:'local-mfds-api',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/origin/'))void official(req,res);else if(req.url?.startsWith('/api/mfds/'))void handler(req,res);else next();});},configurePreviewServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/origin/'))void official(req,res);else if(req.url?.startsWith('/api/mfds/'))void handler(req,res);else next();});}};
 return {plugins:[react(),api],base:mode==='pages'?'/origin-check/':'./',define:{'import.meta.env.VITE_DEPLOY_TARGET':JSON.stringify(mode==='pages'?'pages':'local')},server:{host:'127.0.0.1',port:5173,strictPort:true},build:{chunkSizeWarningLimit:700}};
});
