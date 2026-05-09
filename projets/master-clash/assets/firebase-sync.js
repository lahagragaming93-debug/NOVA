/* ============================================================================
 * firebase-sync.js
 * Helper générique pour synchroniser une collection localStorage ↔ Firestore.
 * Doit être chargé APRÈS firebase-data.js.
 *
 * Usage typique :
 *   window.MC_MESSAGES = MC_SYNC.create({
 *     collection: 'messages',
 *     storageKey: 'mc_messages_v1',
 *     idField: 'id',
 *     saveFnName: 'saveMessages',
 *     renderFns: ['renderMessagesList', 'renderInbox'],
 *     logPrefix: '[MC_MSG]'
 *   });
 *
 * Le syncer expose :
 *   - cache : array des items
 *   - bootDone : true quand la 1re sync est faite
 *   - upsert(item) / remove(id) : helpers de manipulation
 * ============================================================================ */
(function(){
  window.MC_SYNC = {};

  MC_SYNC.create = function(opts){
    var prefix = opts.logPrefix || ('[MC_SYNC ' + opts.collection + ']');
    var syncer = {
      cache: [],
      bootDone: false,
      collection: opts.collection,
      idField: opts.idField || 'id'
    };

    function getLocal(){
      try { return JSON.parse(localStorage.getItem(opts.storageKey) || '[]'); }
      catch(e){ return []; }
    }
    function setLocal(list){
      try { localStorage.setItem(opts.storageKey, JSON.stringify(list)); } catch(e){}
    }
    function notify(){
      (opts.renderFns || []).forEach(function(name){
        if (typeof window[name] === 'function'){
          try { window[name](); } catch(e){ console.error(prefix, 'render '+name, e); }
        }
      });
    }
    function startWatcher(){
      MC_DATA.watch(opts.collection, function(items){
        var clean = items.map(function(it){ delete it._id; return it; });
        syncer.cache = clean;
        setLocal(clean);
        syncer.bootDone = true;
        console.log(prefix, 'cache mis à jour :', clean.length, 'item(s)');
        notify();
      });
    }
    function bootstrap(){
      MC_DATA.getAll(opts.collection).then(function(remote){
        remote = remote.map(function(it){ delete it._id; return it; });
        var local = syncer.cache;
        if (remote.length === 0 && local.length > 0){
          console.log(prefix, 'migration', local.length, 'item(s) → cloud');
          Promise.all(local.map(function(it){
            return it[syncer.idField] ? MC_DATA.set(opts.collection, it[syncer.idField], it) : null;
          })).then(startWatcher);
        } else if (remote.length > 0){
          console.log(prefix, 'sync depuis cloud :', remote.length, 'item(s)');
          syncer.cache = remote;
          setLocal(remote);
          startWatcher();
          notify();
        } else {
          startWatcher();
        }
      });
    }

    // Cache initial = localStorage (synchrone)
    syncer.cache = getLocal();

    if (!window.MC_FB || !window.MC_FB.available){
      console.warn(prefix, 'Firebase indispo, mode localStorage');
      syncer.bootDone = true;
      return syncer;
    }

    MC_FB.ready.then(function(ok){
      if (!ok){ syncer.bootDone = true; return; }
      bootstrap();
    });

    // Wrap de la fonction de sauvegarde globale (saveMessages, saveParticipants, etc.)
    if (opts.saveFnName){
      var tries = 0;
      function tryWrap(){
        if (typeof window[opts.saveFnName] !== 'function'){
          if (++tries > 200){ console.warn(prefix, opts.saveFnName, 'jamais trouvée'); return; }
          setTimeout(tryWrap, 50);
          return;
        }
        if (window[opts.saveFnName]._mcWrapped) return;
        var orig = window[opts.saveFnName];
        window[opts.saveFnName] = function(list){
          orig.call(window, list);
          if (!window.MC_FB || !MC_FB.available) return;
          try {
            var prevIds = syncer.cache.map(function(it){ return it[syncer.idField]; });
            var newIds = list.map(function(it){ return it[syncer.idField]; });
            var toDelete = prevIds.filter(function(id){ return id && newIds.indexOf(id) === -1; });
            list.forEach(function(it){
              if (it && it[syncer.idField]) MC_DATA.set(opts.collection, it[syncer.idField], it);
            });
            toDelete.forEach(function(id){ MC_DATA.delete(opts.collection, id); });
            syncer.cache = list.slice();
          } catch(e){ console.error(prefix, 'wrap save error', e); }
        };
        window[opts.saveFnName]._mcWrapped = true;
        console.log(prefix, opts.saveFnName, 'wrappé pour Firestore');

        // Re-sync forcée pour rattraper les écritures faites avant le wrap
        setTimeout(function(){
          if (!window.MC_FB || !MC_FB.available) return;
          var local = getLocal();
          if (local.length === 0) return;
          var cloudIds = syncer.cache.map(function(it){ return it[syncer.idField]; });
          var missing = local.filter(function(it){
            return it[syncer.idField] && cloudIds.indexOf(it[syncer.idField]) === -1;
          });
          if (missing.length > 0){
            console.log(prefix, 'rattrapage', missing.length, 'item(s) localStorage → cloud');
            missing.forEach(function(it){ MC_DATA.set(opts.collection, it[syncer.idField], it); });
          }
        }, 800);
      }
      tryWrap();
    }

    syncer.upsert = function(item){
      if (!item || !item[syncer.idField]) return Promise.reject(new Error('idField manquant'));
      return MC_DATA.set(opts.collection, item[syncer.idField], item);
    };
    syncer.remove = function(id){
      return MC_DATA.delete(opts.collection, id);
    };

    return syncer;
  };
})();
