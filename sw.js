// ponytail: network-first + cache fallback; bump C to force refresh of shell
const C = 'routeflow-v6'
const SHELL = ['./', './index.html', './app.js', './manifest.json', './icon.svg']
const API = /(router\.project-osrm\.org|photon\.komoot\.io|nominatim\.openstreetmap\.org)/

self.addEventListener('install', (e) => e.waitUntil(caches.open(C).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())))
self.addEventListener('activate', (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
)
self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || !r.url.startsWith('http') || API.test(r.url)) return
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(C).then((c) => c.put(r, copy)) }
        return res
      })
      .catch(() => caches.match(r, { ignoreSearch: r.mode === 'navigate' }))
  )
})
