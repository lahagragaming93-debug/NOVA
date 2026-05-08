/* ============================================================================
 * lazy-libs.js — Chargement à la demande des grosses libs (jsPDF, html2canvas, qrcode)
 *
 * Avant : les 3 libs étaient chargées sur TOUTES les pages (~900 KB inutiles
 * sur l'accueil, le règlement, le budget, etc. qui n'en ont pas besoin).
 *
 * Maintenant : les libs sont chargées dynamiquement uniquement quand on en a
 * réellement besoin (export PDF, screenshot PNG, génération QR code).
 *
 * Usage :
 *   MC_LIBS.load('html2canvas').then(function(){ html2canvas(...); });
 *   MC_LIBS.load(['jspdf','html2canvas']).then(function(){ ... });
 * ============================================================================ */
(function(){
  var URLS = {
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
    jspdf:       'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    qrcode:      'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js'
  };
  var loaded = {};
  var loading = {};

  function loadOne(name){
    if (loaded[name]) return Promise.resolve(true);
    if (loading[name]) return loading[name];
    var url = URLS[name];
    if (!url) return Promise.reject(new Error('Lib inconnue : ' + name));
    loading[name] = new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = function(){
        loaded[name] = true;
        delete loading[name];
        console.log('[MC_LIBS] Chargée :', name);
        resolve(true);
      };
      s.onerror = function(){
        delete loading[name];
        console.error('[MC_LIBS] Échec :', name);
        reject(new Error('Échec chargement ' + name));
      };
      document.head.appendChild(s);
    });
    return loading[name];
  }

  window.MC_LIBS = {
    load: function(name){
      if (Array.isArray(name)) return Promise.all(name.map(loadOne));
      return loadOne(name);
    },
    isLoaded: function(name){ return !!loaded[name]; }
  };

  // Prefetch automatique sur les pages qui utilisent ces libs
  // (le DOMContentLoaded garantit que document.body.dataset.page est lu après init)
  function prefetch(){
    var page = (document.body && document.body.dataset && document.body.dataset.page) || '';
    var heavyPages = { contrats: 1, profil: 1, admin: 1, 'template-editor': 1 };
    if (heavyPages[page]){
      MC_LIBS.load(['html2canvas', 'jspdf', 'qrcode']).catch(function(){ /* silencieux */ });
    } else if (page === 'participants' || page === 'budget'){
      // Ces pages peuvent générer des PDFs/PNG occasionnellement → preload léger
      MC_LIBS.load('html2canvas').catch(function(){});
    }
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', prefetch);
  } else {
    prefetch();
  }
})();
