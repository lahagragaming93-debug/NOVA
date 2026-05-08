/* ============================================================================
 * sw-register.js — Enregistrement du Service Worker
 * Doit être chargé dans toutes les pages.
 *
 * - Enregistre le SW au load
 * - Détecte une nouvelle version disponible et la force-active immédiatement
 *   pour que les modifs JS/CSS soient visibles sans Ctrl+F5
 * ============================================================================ */
(function(){
  if (!('serviceWorker' in navigator)){
    console.warn('[MC_SW] Service Worker non supporté');
    return;
  }
  // Le SW est servi depuis la racine du site (chemin absolu)
  // Sur GitHub Pages : /MASTER-CLASH/sw.js
  var swPath = (location.pathname.replace(/\/[^/]*$/, '/') || '/') + 'sw.js';

  window.addEventListener('load', function(){
    navigator.serviceWorker.register(swPath, { scope: './' })
      .then(function(reg){
        console.log('[MC_SW] Enregistré, scope:', reg.scope);
        // Détection de nouvelle version
        reg.addEventListener('updatefound', function(){
          var newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', function(){
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller){
              console.log('[MC_SW] Nouvelle version disponible — activation auto');
              // skipWaiting est déjà appelé dans le SW, mais on force le contrôle
            }
          });
        });
        // Vérifier les mises à jour à intervalles réguliers (toutes les 5 min si onglet actif)
        setInterval(function(){ reg.update().catch(function(){}); }, 5 * 60 * 1000);
      })
      .catch(function(err){ console.warn('[MC_SW] Échec enregistrement:', err); });

    // Recharge auto quand le nouveau SW prend le contrôle (après skipWaiting)
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if (refreshing) return;
      refreshing = true;
      console.log('[MC_SW] Nouvelle version active — rechargement');
      location.reload();
    });
  });
})();
