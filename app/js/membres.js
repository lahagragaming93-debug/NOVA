/**
 * NOVA — Module Membres & Bénévoles
 *
 * Modèle Firestore : collection `membres`
 *   - displayName, inGameName, email (optionnel)
 *   - statut: 'fondateur' | 'actif' | 'benevole' | 'honneur'
 *   - dateAdhesion: timestamp
 *   - hasContract: boolean
 *   - contractRef: string (libre)
 *   - notes: string
 *   - createdBy, createdAt, updatedAt
 */

import { db, auth } from './firebase-init.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

export const STATUTS = Object.freeze({
  FONDATEUR: 'fondateur',
  ACTIF:     'actif',
  BENEVOLE:  'benevole',
  HONNEUR:   'honneur'
});

export const STATUT_LABELS = Object.freeze({
  fondateur: 'Membre fondateur',
  actif:     'Membre actif',
  benevole:  'Bénévole',
  honneur:   'Membre d\'honneur'
});

export const STATUT_COLORS = Object.freeze({
  fondateur: { bg: '#efe6cf', fg: '#8b7340' },
  actif:     { bg: '#e3ebdc', fg: '#4a6b3a' },
  benevole:  { bg: '#f5f1e6', fg: '#1f2d4a' },
  honneur:   { bg: '#f4e0e0', fg: '#8b3a3a' }
});

export function subscribeToMembres(callback) {
  const q = query(collection(db, 'membres'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    callback(items);
  }, (err) => {
    console.error(err);
    callback([], err);
  });
}

export async function addMembre(data) {
  const me = auth.currentUser;
  if (!me) throw new Error('Non connecté.');
  if (!data.displayName?.trim()) throw new Error('Le nom est requis.');
  if (!data.statut || !STATUT_LABELS[data.statut]) throw new Error('Statut invalide.');

  const dateAdhesion = data.dateAdhesion instanceof Date ? data.dateAdhesion : new Date();

  return addDoc(collection(db, 'membres'), {
    displayName: data.displayName.trim(),
    inGameName: (data.inGameName || '').trim(),
    email: (data.email || '').trim(),
    statut: data.statut,
    dateAdhesion: Timestamp.fromDate(dateAdhesion),
    hasContract: !!data.hasContract,
    contractRef: (data.contractRef || '').trim(),
    notes: (data.notes || '').trim(),
    createdBy: me.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateMembre(id, data) {
  const update = { updatedAt: serverTimestamp() };
  ['displayName', 'inGameName', 'email', 'statut', 'contractRef', 'notes'].forEach(k => {
    if (data[k] !== undefined) update[k] = (typeof data[k] === 'string' ? data[k].trim() : data[k]);
  });
  if (data.hasContract !== undefined) update.hasContract = !!data.hasContract;
  if (data.dateAdhesion !== undefined) {
    const d = data.dateAdhesion instanceof Date ? data.dateAdhesion : new Date(data.dateAdhesion);
    update.dateAdhesion = Timestamp.fromDate(d);
  }
  return updateDoc(doc(db, 'membres', id), update);
}

export async function deleteMembre(id) {
  return deleteDoc(doc(db, 'membres', id));
}

export function formatDate(d) {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
