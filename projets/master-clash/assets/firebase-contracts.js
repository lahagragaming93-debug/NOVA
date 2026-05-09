/* ============================================================================
 * firebase-contracts.js
 * Synchronisation des contrats archivés (en attente + validés) avec Firestore.
 * Doit être chargé APRÈS firebase-sync.js.
 * ============================================================================ */
(function(){
  if (!window.MC_SYNC){ console.error('[MC_CTR] MC_SYNC non chargé'); return; }
  window.MC_CONTRACTS = MC_SYNC.create({
    collection: 'contracts',
    storageKey: 'mc_archives_v1',
    idField: 'id',
    saveFnName: 'saveArchives',
    renderFns: [
      'renderArchivesList',
      'updateArchivesCount',
      'refreshAdminStats',
      'refreshAdminNotifications'
    ],
    logPrefix: '[MC_CTR]'
  });
})();
