// Bump the version whenever this file changes, to clear old caches
const CACHE = 'home-v2';

// Third-party static files (styles script, fonts, icon) are served from the device and refreshed in the background
const STATIC_HOSTS = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn-icons-png.flaticon.com'];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // App pages: always try the network first (so updates show up immediately), fall back to the saved copy when offline
  if (req.mode === 'navigate' || (url.origin === self.location.origin && url.pathname !== '/sw.js')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Static third-party files: answer instantly from cache, refresh in the background
  if (STATIC_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          const network = fetch(req)
            .then((res) => {
              if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
          event.waitUntil(network.catch(() => {}));
          return hit || network;
        })
      )
    );
  }

  // Everything else (Supabase data) goes straight to the network, untouched
});
