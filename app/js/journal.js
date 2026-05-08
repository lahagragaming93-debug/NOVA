/**
 * NOVA — Module Journal d'activité (audit log)
 *
 * Modèle Firestore : collection `journal`
 *   - actor: uid de l'auteur
 *   - actorName: displayName de l'auteur (cache)
 *   - actorRole: rôle au moment de l'action
 *   - action: string (ex: "user_role_changed", "transaction_created", "thread_created")
 *   - target: string (id de la cible — uid, txId, etc.)
 *   - details: object (libre, infos contextuelles)
 *   - timestamp: serverTimestamp
 *
 * Le journal est en append-only : pas de update ni delete autorisé.
 */

import { db, auth } from './firebase-init.js';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

export const ACTION_LABELS = Object.freeze({
  user_registered:      'Inscription',
  user_role_changed:    'Changement de rôle',
  user_deleted:         'Suppression d\'utilisateur',
  transaction_created:  'Opération comptable créée',
  transaction_updated:  'Opération comptable modifiée',
  transaction_deleted:  'Opération comptable supprimée',
  thread_created:       'Nouvelle conversation',
  message_sent:         'Message envoyé',
  membre_created:       'Nouveau membre enregistré',
  membre_updated:       'Membre modifié',
  membre_deleted:       'Membre supprimé',
  partenaire_created:   'Nouveau partenaire enregistré',
  partenaire_updated:   'Partenaire modifié',
  partenaire_deleted:   'Partenaire supprimé'
});

/**
 * Crée une entrée de journal. À appeler depuis les autres modules.
 */
export async function logEvent(action, { target, details, actorName, actorRole } = {}) {
  const me = auth.currentUser;
  if (!me) return;
  try {
    await addDoc(collection(db, 'journal'), {
      actor: me.uid,
      actorName: actorName || me.displayName || me.email || 'inconnu',
      actorRole: actorRole || null,
      action,
      target: target || null,
      details: details || {},
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn('Journal logEvent failed :', err);
  }
}

/**
 * Souscrit aux N dernières entrées du journal.
 */
export function subscribeToJournal(callback, n = 200) {
  const q = query(collection(db, 'journal'), orderBy('timestamp', 'desc'), limit(n));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    callback(items);
  }, (err) => {
    console.error(err);
    callback([], err);
  });
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
