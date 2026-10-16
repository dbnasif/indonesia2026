// Guarda la app en el celu para que abra sin señal. La versión cambia en cada
// publicación (build.py), así el celu baja los archivos nuevos cuando hay conexión.
const V = 'id26-16/10 00:51';
const SHELL = ['./', 'index.html', 'config.js', 'firebase-db.js', 'firebase-app-compat.js', 'firebase-auth-compat.js',
  'firebase-firestore-compat.js', 'xlsx.mini.min.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'privado.enc'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// La página y privado.enc: primero la red (para tener lo último), y si no hay
// señal o tarda más de 4 s, lo guardado. El resto: lo guardado, sin esperar a la red.
const fromNet = (req, key) => fetch(req).then(r => {
  if (r.ok) { const copy = r.clone(); caches.open(V).then(c => c.put(key || req, copy)); }
  return r;
});
self.addEventListener('fetch', ev => {
  const req = ev.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // Firebase va directo
  const page = req.mode === 'navigate';
  if (page || url.pathname.endsWith('/privado.enc')) {
    const key = page ? 'index.html' : req;
    ev.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match(key, { ignoreSearch: true }).then(r => { if (r && !done) { done = true; resolve(r); } return r; });
      const t = setTimeout(fallback, 4000);
      fromNet(page ? new Request('index.html', { cache: 'no-cache' }) : req, key)
        .then(r => { clearTimeout(t); if (!done) { done = true; resolve(r); } })
        .catch(() => { clearTimeout(t); fallback().then(r => { if (!r && !done) { done = true; resolve(Response.error()); } }); });
    }));
    return;
  }
  ev.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fromNet(req)));
});
