/**
 * NOVA — Module Messagerie
 *
 * Gestion des threads de discussion entre membres.
 * Chaque thread = une conversation entre 2+ participants identifiés par leur UID.
 *
 * Modèle Firestore :
 *   threads/{tid}                              ← document thread
 *     - participants: [uid, uid, ...]          (tous les participants peuvent lire/écrire)
 *     - subject: string
 *     - createdBy: uid
 *     - createdAt, lastActivity
 *     - lastMessagePreview: string             (les ~80 1ers caractères du dernier msg)
 *     - lastMessageBy: uid
 *     - readBy: [uid, ...]                     (liste de ceux qui ont lu le dernier état)
 *
 *   threads/{tid}/messages/{mid}               ← sous-collection
 *     - body: string
 *     - from: uid
 *     - createdAt: timestamp
 */

import { db, auth } from './firebase-init.js';
import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, onSnapshot, serverTimestamp, arrayUnion,
  limit
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

const PREVIEW_LENGTH = 100;

/* =========================================================================
   THREADS
   ========================================================================= */

/**
 * Souscrit à la liste des threads où l'utilisateur courant est participant.
 * Les threads sont triés par lastActivity descendante (les plus récents en haut).
 *
 * @param {string} uid - UID de l'utilisateur courant
 * @param {(threads: Array, error?: Error) => void} callback
 * @returns {function} unsubscribe
 */
export function subscribeToMyThreads(uid, callback) {
  if (!uid) {
    callback([], new Error('UID requis'));
    return () => {};
  }
  const q = query(
    collection(db, 'threads'),
    where('participants', 'array-contains', uid),
    orderBy('lastActivity', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const threads = [];
    snap.forEach(d => threads.push({ id: d.id, ...d.data() }));
    callback(threads);
  }, (err) => {
    console.error('Erreur souscription threads :', err);
    callback([], err);
  });
}

/**
 * Souscrit aux messages d'un thread (triés par date croissante).
 * @param {string} threadId
 * @param {(messages: Array) => void} callback
 * @returns {function} unsubscribe
 */
export function subscribeToMessages(threadId, callback) {
  const q = query(
    collection(db, 'threads', threadId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const messages = [];
    snap.forEach(d => messages.push({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

/**
 * Récupère un thread (one-shot).
 */
export async function getThread(threadId) {
  const snap = await getDoc(doc(db, 'threads', threadId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Crée un nouveau thread + envoie le premier message.
 * @param {{ participants: string[], subject: string, firstMessage: string }} args
 * @returns {Promise<string>} l'ID du thread créé
 */
export async function createThread({ participants, subject, firstMessage }) {
  const me = auth.currentUser;
  if (!me) throw new Error('Vous devez être connecté.');
  if (!Array.isArray(participants) || participants.length < 1) {
    throw new Error('Au moins un destinataire est requis.');
  }
  if (!subject?.trim()) throw new Error('Le sujet est requis.');
  if (!firstMessage?.trim()) throw new Error('Le message est requis.');

  // S'assurer que le créateur fait partie des participants
  const allParticipants = Array.from(new Set([me.uid, ...participants]));
  const preview = firstMessage.trim().slice(0, PREVIEW_LENGTH);

  // Crée le thread
  const threadRef = await addDoc(collection(db, 'threads'), {
    participants: allParticipants,
    subject: subject.trim(),
    createdBy: me.uid,
    createdAt: serverTimestamp(),
    lastActivity: serverTimestamp(),
    lastMessagePreview: preview,
    lastMessageBy: me.uid,
    readBy: [me.uid]  // l'expéditeur a "lu" son propre message
  });

  // Crée le premier message dans la sous-collection
  await addDoc(collection(db, 'threads', threadRef.id, 'messages'), {
    body: firstMessage.trim(),
    from: me.uid,
    createdAt: serverTimestamp()
  });

  return threadRef.id;
}

/**
 * Envoie un message dans un thread existant.
 */
export async function sendMessage(threadId, body) {
  const me = auth.currentUser;
  if (!me) throw new Error('Vous devez être connecté.');
  if (!body?.trim()) throw new Error('Le message ne peut pas être vide.');

  const preview = body.trim().slice(0, PREVIEW_LENGTH);

  // Ajoute le message dans la sous-collection
  await addDoc(collection(db, 'threads', threadId, 'messages'), {
    body: body.trim(),
    from: me.uid,
    createdAt: serverTimestamp()
  });

  // Met à jour le thread (last activity, preview, reset readBy à l'expéditeur seulement)
  await updateDoc(doc(db, 'threads', threadId), {
    lastActivity: serverTimestamp(),
    lastMessagePreview: preview,
    lastMessageBy: me.uid,
    readBy: [me.uid]
  });
}

/**
 * Marque un thread comme lu par l'utilisateur courant.
 */
export async function markThreadAsRead(threadId) {
  const me = auth.currentUser;
  if (!me) return;
  await updateDoc(doc(db, 'threads', threadId), {
    readBy: arrayUnion(me.uid)
  });
}

/**
 * Compte les threads non-lus pour un utilisateur (one-shot, pour badge initial).
 */
export async function countUnreadThreads(uid) {
  const q = query(
    collection(db, 'threads'),
    where('participants', 'array-contains', uid),
    limit(50)
  );
  const snap = await getDocs(q);
  let count = 0;
  snap.forEach(d => {
    const t = d.data();
    if (!Array.isArray(t.readBy) || !t.readBy.includes(uid)) count++;
  });
  return count;
}

/* =========================================================================
   HELPERS
   ========================================================================= */

/**
 * Formatte un timestamp Firestore en chaîne lisible.
 * Si moins de 24h : heure (ex. "14:32")
 * Si moins d'une semaine : jour + heure (ex. "Lun 14:32")
 * Sinon : date complète (ex. "08/05/2026")
 */
export function formatMsgTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const oneDay = 24 * 3600 * 1000;
  const oneWeek = 7 * oneDay;

  if (diffMs < oneDay) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } else if (diffMs < oneWeek) {
    const day = d.toLocaleDateString('fr-FR', { weekday: 'short' });
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${time}`;
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Récupère les UIDs et displayNames des autres participants (hors moi).
 */
export function otherParticipants(thread, myUid) {
  if (!thread || !Array.isArray(thread.participants)) return [];
  return thread.participants.filter(uid => uid !== myUid);
}

/**
 * Indique si un thread est non-lu pour l'utilisateur donné.
 */
export function isUnread(thread, uid) {
  if (!thread || !uid) return false;
  return !Array.isArray(thread.readBy) || !thread.readBy.includes(uid);
}
