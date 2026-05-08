/**
 * NOVA — Helper notification header
 *
 * Gère le badge de messages non-lus dans le header des pages app.
 * Souscrit aux threads de l'utilisateur en temps réel et met à jour le compteur.
 */

import { subscribeToMyThreads, isUnread } from './messages.js';

let unsubscribe = null;

/**
 * Attache le badge de notification au header.
 * @param {string} uid - UID de l'utilisateur courant
 * @param {object} [options]
 * @param {string} [options.linkSelector='.header-msg-badge'] - sélecteur du badge
 * @param {string} [options.countSelector='#header-msg-count'] - sélecteur du compteur
 */
export function attachHeaderNotif(uid, options = {}) {
  if (!uid) return;
  const linkSel = options.linkSelector || '.header-msg-badge';
  const countSel = options.countSelector || '#header-msg-count';

  const link = document.querySelector(linkSel);
  const count = document.querySelector(countSel);
  if (!link || !count) return;

  // Détache une éventuelle souscription précédente
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }

  unsubscribe = subscribeToMyThreads(uid, (threads) => {
    const unreadCount = threads.filter(t => isUnread(t, uid)).length;
    if (unreadCount > 0) {
      count.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      link.classList.add('has-unread');
      link.title = `${unreadCount} message${unreadCount > 1 ? 's' : ''} non-lu${unreadCount > 1 ? 's' : ''}`;
    } else {
      count.textContent = '';
      link.classList.remove('has-unread');
      link.title = 'Messagerie';
    }
  });
}

export function detachHeaderNotif() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
}
