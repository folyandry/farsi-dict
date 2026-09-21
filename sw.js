const CACHE='fa-dict-v2';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const sameOrigin=new URL(e.request.url).origin===self.location.origin;
  if(sameOrigin){
    // own files: network first, so a new version is picked up as soon as the phone is online
    e.respondWith(fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match(e.request).then(h=>h||caches.match('index.html'))));
  } else {
    // fonts and other external files: cache first
    e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{if(res&&(res.ok||res.type==='opaque')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return res;})));
  }
});
