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

  // Préfixe namespace : MC partage le projet Firebase nova-association avec NOVA
  // et d'autres projets de l'asso. Toutes les collections MC sont préfixées "mc_"
  // pour éviter toute collision (ex : NOVA a aussi une collection "users").
  var NS = 'mc_';
  function _ns(coll){
    if (typeof coll !== 'string' || !coll) return coll;
    return coll.indexOf(NS) === 0 ? coll : NS + coll;
  }

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
    var c = _ns(coll);
    return db.collection(c).doc(id).get()
      .then(function(snap){ return snap.exists ? snap.data() : null; })
      .catch(function(err){ console.error('[MC_DATA] get '+c+'/'+id, err); return null; });
  };

  MC_DATA.getAll = function(coll){
    var db = _db();
    if (!db) return Promise.resolve([]);
    var c = _ns(coll);
    return db.collection(c).get()
      .then(function(snap){
        var out = [];
        snap.forEach(function(doc){ var d = doc.data(); d._id = doc.id; out.push(d); });
        return out;
      })
      .catch(function(err){ console.error('[MC_DATA] getAll '+c, err); return []; });
  };

  MC_DATA.set = function(coll, id, data){
    var db = _db();
    if (!db) return Promise.resolve(false);
    var c = _ns(coll);
    return db.collection(c).doc(id).set(data, { merge: false })
      .then(function(){ return true; })
      .catch(function(err){ console.error('[MC_DATA] set '+c+'/'+id, err); return false; });
  };

  MC_DATA.update = function(coll, id, partial){
    var db = _db();
    if (!db) return Promise.resolve(false);
    var c = _ns(coll);
    return db.collection(c).doc(id).set(partial, { merge: true })
      .then(function(){ return true; })
      .catch(function(err){ console.error('[MC_DATA] update '+c+'/'+id, err); return false; });
  };

  MC_DATA.delete = function(coll, id){
    var db = _db();
    if (!db) return Promise.resolve(false);
    var c = _ns(coll);
    return db.collection(c).doc(id).delete()
      .then(function(){ return true; })
      .catch(function(err){ console.error('[MC_DATA] delete '+c+'/'+id, err); return false; });
  };

  // Real-time listeners — callback appelée à chaque changement
  // Renvoie une fonction pour se désabonner
  MC_DATA.watch = function(coll, callback){
    var db = _db();
    if (!db) return function(){};
    var c = _ns(coll);
    try {
      return db.collection(c).onSnapshot(function(snap){
        var out = [];
        snap.forEach(function(doc){ var d = doc.data(); d._id = doc.id; out.push(d); });
        try { callback(out); } catch(e){ console.error('[MC_DATA] watch callback', e); }
      }, function(err){ console.error('[MC_DATA] watch '+c, err); });
    } catch(e){
      console.error('[MC_DATA] watch setup '+c, e);
      return function(){};
    }
  };

  MC_DATA.watchOne = function(coll, id, callback){
    var db = _db();
    if (!db) return function(){};
    var c = _ns(coll);
    try {
      return db.collection(c).doc(id).onSnapshot(function(snap){
        try { callback(snap.exists ? snap.data() : null); } catch(e){ console.error('[MC_DATA] watchOne callback', e); }
      }, function(err){ console.error('[MC_DATA] watchOne '+c+'/'+id, err); });
    } catch(e){
      console.error('[MC_DATA] watchOne setup', e);
      return function(){};
    }
  };

  console.log('[MC_DATA] Helpers Firestore prêts');
})();
