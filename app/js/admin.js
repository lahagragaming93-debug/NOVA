/**
 * NOVA — Module Administration
 *
 * Permet au président de :
 *   - Lister tous les utilisateurs
 *   - Modifier le rôle de chaque utilisateur
 *
 * Sécurité : appliquée côté Firestore rules (seul le président peut écrire le champ role).
 */

import { db } from './firebase-init.js';
import {
  collection, doc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

/**
 * Souscrit à la liste des utilisateurs (temps réel).
 * @param {(users: Array) => void} callback
 * @returns {function} unsubscribe
 */
export function subscribeToUsers(callback) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    callback(users);
  }, (error) => {
    console.error('Erreur souscription users :', error);
    callback([], error);
  });
}

/**
 * Met à jour le rôle d'un utilisateur.
 * Le président est le seul autorisé à le faire (vérifié par Firestore rules).
 */
export async function updateUserRole(uid, newRole) {
  await updateDoc(doc(db, 'users', uid), {
    role: newRole,
    updatedAt: serverTimestamp()
  });
}

/**
 * Supprime le profil d'un utilisateur (collection users uniquement).
 * Note : le compte Firebase Auth doit être supprimé manuellement dans la console.
 */
export async function deleteUserProfile(uid) {
  await deleteDoc(doc(db, 'users', uid));
}

/**
 * Formatte un timestamp Firestore en chaîne lisible.
 */
export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
