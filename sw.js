const CACHE = 'tidal-cathedral-v16';
const LOCAL = ['./', './index.html', './style.css', './main.js', './mesh.js', './terrain.js', './cathedral.js',
  './character.js', './shaders.js', './renderer.js', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './layout.js','./walkways.js','./ornament.js','./materials-68.webp','./craft-46.webp',
  './surfaces.js','./furnishings.js','./surfaces-40.webp','./stained-glass.webp','./altarpiece.webp','./cover.webp',
  './decor.js','./chapels.js','./decor-52.webp','./crypt.js','./landcover.js','./terrain-68.webp',
  './fabric.js','./fabric-68.webp','./props.js','./props-68.webp',
  './under.js','./depths.js','./under-68.webp',
  './city.js','./citydata.js','./citybuild.js','./city-68.webp'];
const detailPaths=new Set(['./materials-204.webp','./craft-118.webp','./surfaces-104.webp','./decor-136.webp','./terrain-172.webp','./fabric-136.webp','./props-136.webp','./under-136.webp','./city-136.webp']
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
