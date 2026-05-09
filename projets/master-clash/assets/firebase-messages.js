/* ============================================================================
 * firebase-messages.js
 * Synchronisation des conversations (messages) avec Firestore.
 * Doit être chargé APRÈS firebase-sync.js.
 *
 * Permet à BoulaTV et aux partenaires de voir les mêmes threads en temps réel
 * sur tous leurs appareils (PC, tablette FiveM, mobile).
 * ============================================================================ */
(function(){
  if (!window.MC_SYNC){ console.error('[MC_MSG] MC_SYNC non chargé'); return; }
  window.MC_MESSAGES = MC_SYNC.create({
    collection: 'messages',
    storageKey: 'mc_messages_v1',
    idField: 'id',
    saveFnName: 'saveMessages',
    renderFns: [
      'renderMessagesList',
      'renderInbox',
      'renderThreadView',
      'refreshUserMsgBadge',
      'refreshAdminNotifications'
    ],
    logPrefix: '[MC_MSG]'
  });
})();
