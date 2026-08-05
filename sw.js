/* ALDINEICAR Service Worker — cache estático + rede para API */
const CACHE_NAME = 'aldineicar-v25';
const ASSETS = [
  './',
  './index.html',
  './style.min.css',
  './script.min.js',
  './manifest.json'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS).catch(function (err) {
        console.warn('[SW] cache.addAll parcial:', err);
        // tenta um a um para não falhar o install inteiro
        return Promise.all(
          ASSETS.map(function (url) {
            return cache.add(url).catch(function (e) {
              console.warn('[SW] falhou', url, e);
            });
          })
        );
      });
    }).then(function () {
      return self.skipWaiting().then(function() {
        return self.clients.matchAll({ type: 'window' }).then(function(clients) {
          clients.forEach(function(c) { try { c.postMessage({ type: 'SW_UPDATED' }); } catch (e) {} });
        });
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function isApiOuCdn(url) {
  try {
    var u = new URL(url);
    // Supabase, CDNs, Mercado Pago, APIs externas → sempre rede
    if (u.hostname.indexOf('supabase') >= 0) return true;
    if (u.hostname.indexOf('cdn.jsdelivr') >= 0) return true;
    if (u.hostname.indexOf('cdnjs') >= 0) return true;
    if (u.hostname.indexOf('mercadopago') >= 0) return true;
    if (u.hostname.indexOf('googleapis') >= 0) return true;
    if (u.hostname.indexOf('gstatic') >= 0) return true;
    if (u.hostname.indexOf('qrserver') >= 0) return true;
  } catch (e) {}
  return false;
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var url = req.url;

  // APIs / CDNs: só rede (não cacheia dados sensíveis nem libs dinâmicas)
  if (isApiOuCdn(url)) {
    event.respondWith(
      fetch(req).catch(function () {
        return new Response(JSON.stringify({ offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Navegação (HTML): rede primeiro, fallback cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put('./index.html', copy);
          });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (cached) {
            return cached || caches.match(req);
          });
        })
    );
    return;
  }

  // Estáticos: cache primeiro, atualiza em background
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(req, copy);
            });
          }
          return res;
        })
        .catch(function () {
          return cached;
        });
      return cached || network;
    })
  );
});
