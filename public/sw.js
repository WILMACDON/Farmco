/* Farmco service worker — offline shell + static assets only.
   Never intercept Inertia XHR (X-Inertia) or HTML navigations with cache-first,
   or the SPA can keep a stale document shell while a new page mounts on top. */
const CACHE = 'farmco-shell-v2'
const SHELL = ['/manifest.webmanifest', '/farmco-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => undefined)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Inertia page visits must hit the network for JSON — never serve cached HTML.
  if (request.headers.get('X-Inertia')) return

  // Full document navigations: network first, cache only as offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(request)))
    return
  }

  // Static assets / shell files: cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && (url.pathname.startsWith('/assets') || SHELL.includes(url.pathname))) {
          const clone = response.clone()
          void caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
    }),
  )
})
