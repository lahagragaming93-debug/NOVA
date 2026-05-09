/* ============================================================================
 * firebase-init.js
 * Initialisation du SDK Firebase pour Master Clash.
 * Doit être chargé APRÈS les SDK firebase-app-compat / firebase-firestore-compat
 * / firebase-auth-compat, et AVANT app.js.
 *
 * Expose globalement :
 *   - window.MC_FB.app    : l'instance Firebase
 *   - window.MC_FB.db     : Firestore
 *   - window.MC_FB.auth   : Firebase Auth
 *   - window.MC_FB.ready  : Promise<boolean> résolue quand l'auth anonyme est prête
 *
 * Si Firebase n'est pas joignable (mode hors-ligne, CDN bloqué, CEF strict),
 * MC_FB.db et MC_FB.auth seront null et le site retombe sur le mode localStorage.
 * ============================================================================ */
(function(){
  // Master Clash partage le projet Firebase de NOVA (nova-association).
  // Ses collections sont préfixées "mc_" pour cohabiter avec celles de l'asso.
  var firebaseConfig = {
    apiKey: "AIzaSyCGli4QoC6IWXdKgnxWiVAC2zLZoDqqavM",
    authDomain: "nova-association.firebaseapp.com",
    projectId: "nova-association",
    storageBucket: "nova-association.firebasestorage.app",
    messagingSenderId: "642295385109",
    appId: "1:642295385109:web:76804c5d6afc67c619921c"
  };

  window.MC_FB = { app: null, db: null, auth: null, ready: null, available: false };

  if (typeof firebase === 'undefined' || !firebase.initializeApp){
    console.warn('[MC_FB] Firebase SDK absent — mode localStorage uniquement.');
    window.MC_FB.ready = Promise.resolve(false);
    return;
  }

  try {
    window.MC_FB.app = firebase.initializeApp(firebaseConfig);
    window.MC_FB.db = firebase.firestore();
    window.MC_FB.auth = firebase.auth();
    window.MC_FB.available = true;
    // Persistance offline : Firestore conserve un cache local pour fonctionner
    // même hors-ligne (utile pour CEF FiveM en cas de coupure réseau)
    try {
      window.MC_FB.db.enablePersistence({ synchronizeTabs: true })
        .catch(function(err){
          if (err.code === 'failed-precondition'){
            console.warn('[MC_FB] Plusieurs onglets ouverts — persistance offline désactivée.');
          } else if (err.code === 'unimplemented'){
            console.warn('[MC_FB] Navigateur sans support IndexedDB — pas de cache offline.');
          }
        });
    } catch(e){ /* OK : enablePersistence est best-effort */ }

    // Sign-in anonyme : tous les visiteurs ont un UID Firebase, même sans compte.
    // Permet aux règles de sécurité de différencier "connecté" vs "non connecté".
    // IMPORTANT : on attend d'abord de voir si une session nominale persiste
    // (cas où l'utilisateur s'est connecté avant). Sinon, on bascule en anonyme.
    window.MC_FB.ready = new Promise(function(resolve){
      var resolved = false;
      window.MC_FB.auth.onAuthStateChanged(function(user){
        if (user && !resolved){
          resolved = true;
          console.log('[MC_FB] Auth prête, uid=', user.uid, user.isAnonymous ? '(anonyme)' : '(compte)');
          resolve(true);
        }
      });
      // Laisse 600ms à Firebase pour restaurer une session persistée.
      // Si rien n'est restauré, on lance le sign-in anonyme.
      setTimeout(function(){
        if (resolved) return;
        if (window.MC_FB.auth.currentUser) return; // session restaurée pendant le wait
        window.MC_FB.auth.signInAnonymously().catch(function(err){
          console.error('[MC_FB] Sign-in anonyme échoué :', err);
          if (!resolved){ resolved = true; resolve(false); }
        });
      }, 600);
    });
    console.log('[MC_FB] Firebase initialisé — projet nova-association (collections mc_*)');
  } catch(e){
    console.error('[MC_FB] Erreur d\'initialisation Firebase :', e);
    window.MC_FB.available = false;
    window.MC_FB.ready = Promise.resolve(false);
  }
})();
