/* ============================================================================
 * firebase-users.js
 * Synchronisation de la liste des utilisateurs avec Firestore.
 * Doit être chargé APRÈS firebase-data.js et AVANT app.js.
 *
 * Stratégie :
 *  - Maintient un cache local toujours à jour via un listener temps réel
 *  - Au premier boot avec Firebase actif, migre automatiquement les users
 *    présents en localStorage vers Firestore (one-shot)
 *  - Override window.saveUsers pour propager les écritures vers Firestore
 *    (en plus de localStorage, pour rester rétro-compatible)
 *  - Quand le cache change, déclenche un re-render des listes UI si possible
 *
 * Cette migration ne touche pas au système d'auth (login/password) — c'est
 * pour le prochain commit.
 * ============================================================================ */
(function(){
  var COLLECTION = 'users';
  var STORAGE_KEY = 'mc_users_v1'; // doit matcher MC_USERS_KEY dans app.js

  window.MC_USERS = {
    cache: [],
    listeners: [],
    bootDone: false,
    onChange: function(cb){ this.listeners.push(cb); }
  };

  function notifyChange(){
    MC_USERS.listeners.forEach(function(cb){
      try { cb(MC_USERS.cache); } catch(e){ console.error('[MC_USERS] listener error', e); }
    });
    // Live re-render des listes UI
    if (typeof renderUsersList === 'function'){ try { renderUsersList(); } catch(e){} }
    if (typeof applyAuthState === 'function'){ try { applyAuthState(); } catch(e){} }
    if (typeof updateUsersCount === 'function'){ try { updateUsersCount(); } catch(e){} }
  }

  function getLocalUsers(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function setLocalUsers(list){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch(e){}
  }

  // Cache initial = localStorage (synchrone, dispo immédiatement)
  MC_USERS.cache = getLocalUsers();

  if (!window.MC_FB || !window.MC_FB.available){
    console.warn('[MC_USERS] Firebase indispo, mode localStorage uniquement');
    MC_USERS.bootDone = true;
    return;
  }

  MC_FB.ready.then(function(ok){
    if (!ok){
      console.warn('[MC_USERS] Auth Firebase pas prête, fallback localStorage');
      MC_USERS.bootDone = true;
      return;
    }
    bootstrap();
  });

  function bootstrap(){
    MC_DATA.getAll(COLLECTION).then(function(remoteUsers){
      remoteUsers = remoteUsers.map(function(u){ delete u._id; return u; });
      var local = MC_USERS.cache;

      if (remoteUsers.length === 0 && local.length > 0){
        // Migration initiale : push localStorage vers Firestore
        console.log('[MC_USERS] Migration initiale : ' + local.length + ' users vers Firestore...');
        Promise.all(local.map(function(u){
          return MC_DATA.set(COLLECTION, u.username, u);
        })).then(function(){
          console.log('[MC_USERS] Migration terminée');
          startWatcher();
        });
      } else if (remoteUsers.length > 0){
        // Le cloud est la source de vérité : on synchronise localStorage
        console.log('[MC_USERS] Sync initial depuis Firestore (' + remoteUsers.length + ' users)');
        MC_USERS.cache = remoteUsers;
        setLocalUsers(remoteUsers);
        startWatcher();
        notifyChange();
      } else {
        // Les deux sont vides, on attend que app.js crée BoulaTV
        startWatcher();
      }
    });
  }

  function startWatcher(){
    MC_DATA.watch(COLLECTION, function(users){
      var clean = users.map(function(u){ delete u._id; return u; });
      MC_USERS.cache = clean;
      setLocalUsers(clean);
      MC_USERS.bootDone = true;
      console.log('[MC_USERS] Cache mis à jour : ' + clean.length + ' user(s)');
      notifyChange();
    });
  }

  // Wrapper de saveUsers pour propager vers Firestore
  // saveUsers est défini dans app.js qui charge plus tard. On poll jusqu'à dispo.
  function tryWrapSaveUsers(){
    if (typeof window.saveUsers !== 'function'){
      setTimeout(tryWrapSaveUsers, 50);
      return;
    }
    if (window.saveUsers._mcWrapped) return;
    var orig = window.saveUsers;
    window.saveUsers = function(list){
      // 1. Comportement legacy : écrire dans localStorage (et faire les notifs UI)
      orig.call(window, list);
      // 2. Diff vs cache pour push delta vers Firestore
      if (!window.MC_FB || !MC_FB.available) return;
      try {
        var prevKeys = MC_USERS.cache.map(function(u){ return u.username; });
        var newKeys  = list.map(function(u){ return u.username; });
        var toDelete = prevKeys.filter(function(k){ return newKeys.indexOf(k) === -1; });
        list.forEach(function(u){
          if (u && u.username) MC_DATA.set(COLLECTION, u.username, u);
        });
        toDelete.forEach(function(k){ MC_DATA.delete(COLLECTION, k); });
        MC_USERS.cache = list.slice();
      } catch(e){ console.error('[MC_USERS] saveUsers wrapper error', e); }
    };
    window.saveUsers._mcWrapped = true;
    console.log('[MC_USERS] saveUsers wrappé pour Firestore');

    // Re-sync forcée : si app.js a déjà créé des users en localStorage avant que
    // le wrapper soit en place (cas de initAdminUser au boot), on les pousse
    // vers Firestore maintenant.
    setTimeout(function(){
      if (!window.MC_FB || !MC_FB.available) return;
      var local = getLocalUsers();
      if (local.length === 0) return;
      // Compare avec ce qui est dans le cache cloud
      var cloudKeys = MC_USERS.cache.map(function(u){ return u.username; });
      var missing = local.filter(function(u){ return cloudKeys.indexOf(u.username) === -1; });
      if (missing.length > 0){
        console.log('[MC_USERS] Re-sync : ' + missing.length + ' user(s) localStorage → Firestore');
        missing.forEach(function(u){ if (u.username) MC_DATA.set(COLLECTION, u.username, u); });
      }
    }, 800);
  }
  tryWrapSaveUsers();

  // API publique pour manipulations directes (à privilégier dans le futur)
  MC_USERS.upsert = function(user){
    if (!user || !user.username) return Promise.reject(new Error('username manquant'));
    return MC_DATA.set(COLLECTION, user.username, user);
  };
  MC_USERS.remove = function(username){
    if (!username) return Promise.reject(new Error('username manquant'));
    return MC_DATA.delete(COLLECTION, username);
  };

  console.log('[MC_USERS] Module chargé, cache initial = ' + MC_USERS.cache.length + ' user(s)');
})();
