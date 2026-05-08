/**
 * NOVA — Module Partenaires
 *
 * Modèle Firestore : collection `partenaires`
 *   - raisonSociale, secteur, representant, email, adresse
 *   - types: ['recompenses' | 'questions' | 'experiences' | 'visuel']
 *   - dateConvention: timestamp
 *   - statut: 'actif' | 'archive'
 *   - notes: string
 *   - userUid (optionnel — si le partenaire a un compte sur le site)
 *   - createdBy, createdAt, updatedAt
 */

import { db, auth } from './firebase-init.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

export const TYPES = Object.freeze({
  RECOMPENSES:  'recompenses',
  QUESTIONS:    'questions',
  EXPERIENCES:  'experiences',
  VISUEL:       'visuel'
});

export const TYPE_LABELS = Object.freeze({
  recompenses:  'Récompenses',
  questions:    'Questions',
  experiences:  'Expériences',
  visuel:       'Visuel'
});

export const SECTEURS = [
  'Alimentation', 'Automobile / Garage', 'Esthétique / Bien-être',
  'Événementiel / VIP', 'Sport / Loisirs', 'Commerce général',
  'Médias / Presse', 'Autre'
];

export function subscribeToPartenaires(callback) {
  const q = query(collection(db, 'partenaires'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    callback(items);
  }, (err) => {
    console.error(err);
    callback([], err);
  });
}

export async function addPartenaire(data) {
  const me = auth.currentUser;
  if (!me) throw new Error('Non connecté.');
  if (!data.raisonSociale?.trim()) throw new Error('La raison sociale est requise.');

  const dateConv = data.dateConvention instanceof Date ? data.dateConvention : new Date();

  return addDoc(collection(db, 'partenaires'), {
    raisonSociale: data.raisonSociale.trim(),
    secteur: (data.secteur || 'Autre').trim(),
    representant: (data.representant || '').trim(),
    email: (data.email || '').trim(),
    adresse: (data.adresse || '').trim(),
    types: Array.isArray(data.types) ? data.types : [],
    dateConvention: Timestamp.fromDate(dateConv),
    statut: data.statut || 'actif',
    notes: (data.notes || '').trim(),
    userUid: data.userUid || null,
    createdBy: me.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updatePartenaire(id, data) {
  const update = { updatedAt: serverTimestamp() };
  ['raisonSociale', 'secteur', 'representant', 'email', 'adresse', 'statut', 'notes'].forEach(k => {
    if (data[k] !== undefined) update[k] = (typeof data[k] === 'string' ? data[k].trim() : data[k]);
  });
  if (data.types !== undefined) update.types = Array.isArray(data.types) ? data.types : [];
  if (data.userUid !== undefined) update.userUid = data.userUid || null;
  if (data.dateConvention !== undefined) {
    const d = data.dateConvention instanceof Date ? data.dateConvention : new Date(data.dateConvention);
    update.dateConvention = Timestamp.fromDate(d);
  }
  return updateDoc(doc(db, 'partenaires', id), update);
}

export async function deletePartenaire(id) {
  return deleteDoc(doc(db, 'partenaires', id));
}

export function formatDate(d) {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
