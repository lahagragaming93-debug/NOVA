/* ============================================================================
 * firebase-participants.js
 * Synchronisation des participants au quiz avec Firestore.
 * Doit être chargé APRÈS firebase-sync.js.
 * ============================================================================ */
(function(){
  if (!window.MC_SYNC){ console.error('[MC_PART] MC_SYNC non chargé'); return; }
  window.MC_PARTICIPANTS = MC_SYNC.create({
    collection: 'participants',
    storageKey: 'mc_participants_v1',
    idField: 'id',
    saveFnName: 'saveParticipants',
    renderFns: ['renderParticipantsList', 'renderPartButtons', 'renderGroupsDisplay'],
    logPrefix: '[MC_PART]'
  });
})();
