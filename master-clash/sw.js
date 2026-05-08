/* ============================================================================
 * sw.js — Service Worker Master Clash
 * Stratégie :
 *   - HTML : network-first (toujours frais → nouveaux JS/CSS visibles immédiatement)
 *   - Assets locaux (CSS, JS, PNG, SVG) : stale-while-revalidate (rapide + auto-update)
 *   - Externe (CDN, fonts, Firebase) : passthrough réseau direct (pas de cache)
 *
 * Auto-update : à chaque push sur main, le navigateur détecte le nouveau sw.js,
 * l'installe en arrière-plan, et active la nouvelle version au prochain reload.
 * ============================================================================ */

var CACHE_VERSION = 'mc-v1';
var ASSET_CACHE = 'mc-assets-' + CACHE_VERSION;

// Préchargement minimal : on laisse le runtime cache faire le reste
self.addEventListener('install', function(e){
  // Active immédiatement la nouvelle version, sans attendre la fermeture des onglets
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    Promise.all([
      // Nettoyage des anciens caches
      caches.keys().then(function(names){
        return Promise.all(names.map(function(n){
          if (n !== ASSET_CACHE) return caches.delete(n);
        }));
      }),
      // Prend le contrôle de tous les onglets ouverts immédiatement
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  var url = new URL(req.url);

  // Ignore tout ce qui n'est pas GET (POST Firestore, etc.)
  if (req.method !== 'GET') return;

  // Externe (Firebase, Google Fonts, CDN cdnjs/jsdelivr, gstatic) : direct au réseau
  if (url.origin !== self.location.origin){
    return; // pas d'interception, le navigateur fait son travail normal
  }

  // HTML : network-first → toujours frais
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1){
    e.respondWith(
      fetch(req).then(function(res){
        // On ne cache pas le HTML pour éviter les versions périmées
        return res;
      }).catch(function(){
        // Fallback offline : on essaie de servir une version du cache
        return caches.match(req);
      })
    );
    return;
  }

  // Assets locaux (JS, CSS, PNG, SVG, ICO, manifest) : stale-while-revalidate
  e.respondWith(
    caches.open(ASSET_CACHE).then(function(cache){
      return cache.match(req).then(function(cached){
        var fetchPromise = fetch(req).then(function(networkRes){
          // Met à jour le cache en arrière-plan
          if (networkRes && networkRes.status === 200){
            cache.put(req, networkRes.clone());
          }
          return networkRes;
        }).catch(function(){ return cached; });
        // Renvoie le cache immédiatement si dispo, sinon attend le réseau
        return cached || fetchPromise;
      });
    })
  );
});
