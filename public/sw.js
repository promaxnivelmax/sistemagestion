// Caja La 52: guarda la página y sus archivos para abrir al instante. Los datos (ventas, clientes) siempre van a internet.
const V = 'caja-v22';
const BASE = ['/', '/index.html', '/styles.css?v=21', '/app.js?v=13', '/cli.js?v=11', '/hvd.js?v=4', '/tram.js?v=1', '/fz.js?v=7', '/favicon.svg'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(BASE)).catch(() => {})); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return; // la base de datos y los documentos no pasan por aquí
  const clave = r.mode === 'navigate' ? '/index.html' : r;
  e.respondWith(caches.open(V).then(async c => {
    const guardado = await c.match(clave);
    const red = fetch(r).then(res => { if (res.ok) c.put(clave, res.clone()); return res; });
    if (guardado) { e.waitUntil(red.catch(() => {})); return guardado; } // al instante; se actualiza por detrás
    return red;
  }));
});
