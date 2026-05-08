/* ============================================================================
 * firebase-data.js
 * Helpers génériques pour lire/écrire dans Firestore + écouter en temps réel.
 * Doit être chargé APRÈS firebase-init.js.
 *
 * API publique (toutes les fonctions retournent des Promises) :
 *   MC_DATA.get(coll, id)              → lit un doc, renvoie son contenu ou null
 *   MC_DATA.getAll(coll)               → renvoie tous les docs d'une collection
 *   MC_DATA.set(coll, id, data)        → crée ou écrase un doc
 *   MC_DATA.update(coll, id, partial)  → met à jour partiellement un doc
 *   MC_DATA.delete(coll, id)           → supprime un doc
 *   MC_DATA.watch(coll, callback)      → s'abonne aux changements temps réel
 *   MC_DATA.watchOne(coll, id, cb)     → s'abonne à un doc précis
 *
 * Toutes les fonctions échouent silencieusement (warn console) si Firebase est
 * indisponible (CDN bloqué, offline strict). C'est aux fonctions appelantes
 * de gérer le fallback localStorage si nécessaire.
 * ============================================================================ */
(function(){
  window.MC_DATA = {
    available: function(){ return !!(window.MC_FB && window.MC_FB.db && window.MC_FB.available); },
    ready: function(){ return (window.MC_FB && window.MC_FB.ready) || Promise.resolve(false); }
  };

  function _db(){
    if (!window.MC_FB || !window.MC_FB.db){
      console.warn('[MC_DATA] Firestore indisponible');
      return null;
    }
    return window.MC_FB.db;
  }

  MC_DATA.get = function(coll, id){
    var db = _db();
    if (!db) return Promise.resolve(null);
    return db.collection(coll).doc(id).get()
      .then(function(snap){ return snap.exists ? snap.data() : null; })
      .catch(function(err){ console.error('[MC_DATA] get '+coll+'/'+id, err); return null; });
  };

  MC_DATA.getAll = function(coll){
    var db = _db();
    if (!db) return Promise.resolve([]);
    return db.collection(coll).get()
      .then(function(snap){
        var out = [];
        snap.forEach(function(doc){ var d = doc.data(); d._id = doc.id; out.push(d); });
        return out;
      })
      .catch(function(err){ console.error('[MC_DATA] getAll '+coll, err); return []; });
  };

  MC_DATA.set = function(coll, id, data){
    var db = _db();
    if (!db) return Promise.resolve(false);
    return db.collection(coll).doc(id).set(data, { merge: false })
      .then(function(){ return true; })
      .catch(function(err){ console.error('[MC_DATA] set '+coll+'/'+id, err); return false; });
  };

  MC_DATA.update = function(coll, id, partial){
    var db = _db();
    if (!db) return Promise.resolve(false);
    return db.collection(coll).doc(id).set(partial, { merge: true })
      .then(function(){ return true; })
      .catch(function(err){ console.error('[MC_DATA] update '+coll+'/'+id, err); return false; });
  };

  MC_DATA.delete = function(coll, id){
    var db = _db();
    if (!db) return Promise.resolve(false);
    return db.collection(coll).doc(id).delete()
      .then(function(){ return true; })
      .catch(function(err){ console.error('[MC_DATA] delete '+coll+'/'+id, err); return false; });
  };

  // Real-time listeners — callback appelée à chaque changement
  // Renvoie une fonction pour se désabonner
  MC_DATA.watch = function(coll, callback){
    var db = _db();
    if (!db) return function(){};
    try {
      return db.collection(coll).onSnapshot(function(snap){
        var out = [];
        snap.forEach(function(doc){ var d = doc.data(); d._id = doc.id; out.push(d); });
        try { callback(out); } catch(e){ console.error('[MC_DATA] watch callback', e); }
      }, function(err){ console.error('[MC_DATA] watch '+coll, err); });
    } catch(e){
      console.error('[MC_DATA] watch setup '+coll, e);
      return function(){};
    }
  };

  MC_DATA.watchOne = function(coll, id, callback){
    var db = _db();
    if (!db) return function(){};
    try {
      return db.collection(coll).doc(id).onSnapshot(function(snap){
        try { callback(snap.exists ? snap.data() : null); } catch(e){ console.error('[MC_DATA] watchOne callback', e); }
      }, function(err){ console.error('[MC_DATA] watchOne '+coll+'/'+id, err); });
    } catch(e){
      console.error('[MC_DATA] watchOne setup', e);
      return function(){};
    }
  };

  console.log('[MC_DATA] Helpers Firestore prêts');
})();
