/* ============================================================================
 * firebase-budget.js
 * Synchronisation du budget (objet unique) et des allocations par bénéficiaire
 * (objet clé→valeur) avec Firestore.
 *
 * Le budget n'est pas une collection comme messages/users : c'est UN seul
 * document avec une structure { sections: [...] }. Idem pour les allocations.
 * On les stocke dans la collection 'config' avec des IDs fixes.
 * ============================================================================ */
(function(){
  var BUDGET_KEY_LS = 'mc_budget_v1';
  var ALLOC_KEY_LS  = 'mc_budget_alloc_v1';
  var BUDGET_DOC_ID = 'budget';
  var ALLOC_DOC_ID  = 'budget_allocs';
  var COLLECTION    = 'config';

  window.MC_BUDGET = { available: false };

  if (!window.MC_FB || !window.MC_FB.available){
    console.warn('[MC_BUD] Firebase indispo, mode localStorage');
    return;
  }
  if (!window.MC_DATA){
    console.error('[MC_BUD] MC_DATA non chargé');
    return;
  }

  function notify(){
    if (typeof window.renderBudget === 'function'){
      try { window.renderBudget(); } catch(e){ console.error('[MC_BUD] renderBudget', e); }
    }
  }

  function getLocalBudget(){
    try { return JSON.parse(localStorage.getItem(BUDGET_KEY_LS) || 'null'); }
    catch(e){ return null; }
  }
  function getLocalAllocs(){
    try { return JSON.parse(localStorage.getItem(ALLOC_KEY_LS) || '{}'); }
    catch(e){ return {}; }
  }
  function setLocalBudget(b){
    if (b) try { localStorage.setItem(BUDGET_KEY_LS, JSON.stringify(b)); } catch(e){}
  }
  function setLocalAllocs(a){
    try { localStorage.setItem(ALLOC_KEY_LS, JSON.stringify(a)); } catch(e){}
  }

  MC_FB.ready.then(function(ok){
    if (!ok) return;

    // Bootstrap du budget
    MC_DATA.get(COLLECTION, BUDGET_DOC_ID).then(function(remote){
      var local = getLocalBudget();
      if (!remote && local){
        console.log('[MC_BUD] migration budget local → cloud');
        MC_DATA.set(COLLECTION, BUDGET_DOC_ID, local);
      } else if (remote){
        console.log('[MC_BUD] sync budget depuis cloud');
        setLocalBudget(remote);
        notify();
      }
      // Watcher temps réel
      MC_DATA.watchOne(COLLECTION, BUDGET_DOC_ID, function(data){
        if (data){
          delete data._id;
          setLocalBudget(data);
          console.log('[MC_BUD] budget mis à jour depuis cloud');
          notify();
        }
      });
    });

    // Bootstrap des allocations
    MC_DATA.get(COLLECTION, ALLOC_DOC_ID).then(function(remote){
      var local = getLocalAllocs();
      var localKeys = Object.keys(local);
      if ((!remote || Object.keys(remote).length === 0) && localKeys.length > 0){
        console.log('[MC_BUD] migration allocations local → cloud');
        MC_DATA.set(COLLECTION, ALLOC_DOC_ID, local);
      } else if (remote && Object.keys(remote).length > 0){
        console.log('[MC_BUD] sync allocations depuis cloud');
        setLocalAllocs(remote);
        notify();
      }
      MC_DATA.watchOne(COLLECTION, ALLOC_DOC_ID, function(data){
        if (data){
          delete data._id;
          setLocalAllocs(data);
          console.log('[MC_BUD] allocations mises à jour depuis cloud');
          notify();
        }
      });
    });

    MC_BUDGET.available = true;
  });

  // Wrap des fonctions de sauvegarde globales
  function wrapSave(fnName, docId, getLocalFn, setLocalFn){
    var tries = 0;
    function tryWrap(){
      if (typeof window[fnName] !== 'function'){
        if (++tries > 200) return;
        setTimeout(tryWrap, 50);
        return;
      }
      if (window[fnName]._mcWrapped) return;
      var orig = window[fnName];
      window[fnName] = function(data){
        orig.call(window, data);
        if (!window.MC_FB || !MC_FB.available) return;
        try { MC_DATA.set(COLLECTION, docId, data || {}); }
        catch(e){ console.error('[MC_BUD] wrap '+fnName+' error', e); }
      };
      window[fnName]._mcWrapped = true;
      console.log('[MC_BUD]', fnName, 'wrappé');

      // Re-sync forcée
      setTimeout(function(){
        if (!window.MC_FB || !MC_FB.available) return;
        var local = getLocalFn();
        if (!local) return;
        if (Object.keys(local).length === 0) return;
        MC_DATA.get(COLLECTION, docId).then(function(remote){
          if (!remote || Object.keys(remote).length === 0){
            console.log('[MC_BUD] rattrapage', fnName, '→ cloud');
            MC_DATA.set(COLLECTION, docId, local);
          }
        });
      }, 800);
    }
    tryWrap();
  }
  wrapSave('saveBudget', BUDGET_DOC_ID, getLocalBudget, setLocalBudget);
  wrapSave('saveBudgetAllocs', ALLOC_DOC_ID, getLocalAllocs, setLocalAllocs);
})();
