const SCOPE=new URL(self.registration.scope);
const PREFIX=`origin-prototype-${SCOPE.pathname}-`;
const CACHE=`${PREFIX}v0.11.3`;
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./','./icon.svg','./manifest.webmanifest'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const request=event.request;const url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const relative=url.pathname.slice(SCOPE.pathname.length);
 if(relative.startsWith('api/')||url.pathname.startsWith('/api/')||relative==='updates.json')return;
 event.respondWith(fetch(request,request.mode==='navigate'?{cache:'no-cache'}:undefined).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(request,copy)));}return response;}).catch(async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(request);if(cached)return cached;if(request.mode==='navigate'){const shell=await cache.match(SCOPE.href);if(shell)return shell;}return new Response('Offline',{status:503});}));
});
