const CACHE = 'tidal-cathedral-v7';
const LOCAL = ['./', './index.html', './style.css', './main.js', './mesh.js', './terrain.js', './cathedral.js',
  './character.js', './shaders.js', './renderer.js', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './layout.js','./walkways.js','./ornament.js','./materials-128.webp','./craft-112.webp',
  './surfaces.js','./furnishings.js','./surfaces-96.webp','./stained-glass.webp','./altarpiece.webp','./cover.webp',
  './decor.js','./chapels.js','./decor-96.webp'];
const detailPaths=new Set(['./materials-384.webp','./craft-288.webp','./surfaces-256.webp','./decor-256.webp']
  .map(name=>new URL(name,self.location.href).pathname));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(LOCAL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(key => key.startsWith('tidal-cathedral-') && key !== CACHE).map(key => caches.delete(key)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try {
      const response=await fetch(event.request);
      if(response.ok&&detailPaths.has(new URL(event.request.url).pathname)){
        const cache=await caches.open(CACHE);
        await cache.put(event.request,response.clone()).catch(()=>{});
      }
      return response;
    } catch (failure) {
      const saved = await caches.match(event.request, { cacheName: CACHE });
      if (saved) return saved;
      if (event.request.mode === 'navigate') return await caches.match('./', { cacheName: CACHE }) || Response.error();
      return Response.error();
    }
  })());
});
