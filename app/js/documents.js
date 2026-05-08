/**
 * NOVA — Module Documents & Templates
 *
 * Modèle Firestore : collection `documents`
 *   - type: 'recu_don' | 'facture' | 'convention' | 'contrat_engagement'
 *   - reference: string (auto-généré : NOVA-DON-2026-0001)
 *   - data: object (champs spécifiques au type)
 *   - createdBy: uid
 *   - createdByName: string
 *   - createdAt, updatedAt: timestamps
 *   - status: 'draft' | 'final'
 *   - targetUid: uid optionnel (destinataire si user du site)
 */

import { db, auth } from './firebase-init.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, orderBy, limit, where, getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

export const DOC_TYPES = Object.freeze({
  RECU_DON:           'recu_don',
  FACTURE:            'facture',
  CONVENTION:         'convention',
  CONTRAT_ENGAGEMENT: 'contrat_engagement'
});

export const TYPE_META = Object.freeze({
  recu_don: {
    label:    'Reçu de don',
    prefix:   'NOVA-DON',
    icon:     '✎',
    desc:     'Document remis à un donateur attestant la réception d\'un don sans contrepartie commerciale.'
  },
  facture: {
    label:    'Facture de prestation',
    prefix:   'NOVA-FACT',
    icon:     '$',
    desc:     'Facture émise à un partenaire au titre d\'une prestation (visibilité, mention).'
  },
  convention: {
    label:    'Convention de partenariat',
    prefix:   'NOVA-CONV',
    icon:     '◆',
    desc:     'Convention encadrant un partenariat entre NOVA et un tiers.'
  },
  contrat_engagement: {
    label:    'Contrat d\'engagement bénévole',
    prefix:   'NOVA-ENG',
    icon:     '⌘',
    desc:     'Contrat formalisant l\'engagement d\'un bénévole (Art. 8-1.5 du T.T.E.).'
  }
});

/**
 * Génère une nouvelle référence pour un document du type donné.
 * Format : NOVA-DON-2026-0042 (le numéro est auto-incrémenté au sein du type+année).
 */
export async function generateReference(type, year) {
  const meta = TYPE_META[type];
  if (!meta) throw new Error('Type invalide.');
  const y = year || new Date().getFullYear();

  // Récupère le dernier doc créé pour ce type+année afin de calculer le prochain numéro
  const q = query(
    collection(db, 'documents'),
    where('type', '==', type),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snap = await getDocs(q);
  const prefixYear = `${meta.prefix}-${y}-`;
  let maxNum = 0;
  snap.forEach(d => {
    const ref = d.data().reference || '';
    if (ref.startsWith(prefixYear)) {
      const num = parseInt(ref.slice(prefixYear.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });
  return `${prefixYear}${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Souscrit à la liste des documents (temps réel).
 */
export function subscribeToDocuments(callback) {
  const q = query(collection(db, 'documents'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    callback(items);
  }, (err) => {
    console.error(err);
    callback([], err);
  });
}

/**
 * Récupère un document (one-shot).
 */
export async function getDocument(id) {
  const snap = await getDoc(doc(db, 'documents', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Crée un nouveau document avec une référence auto-générée.
 */
export async function createDocument(type, data, { status = 'final', targetUid = null } = {}) {
  const me = auth.currentUser;
  if (!me) throw new Error('Non connecté.');
  if (!TYPE_META[type]) throw new Error('Type de document invalide.');

  const reference = await generateReference(type);
  const ref = await addDoc(collection(db, 'documents'), {
    type,
    reference,
    data: data || {},
    status,
    targetUid,
    createdBy: me.uid,
    createdByName: me.displayName || me.email || 'inconnu',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id: ref.id, reference };
}

export async function updateDocument(id, data) {
  return updateDoc(doc(db, 'documents', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

export async function deleteDocument(id) {
  return deleteDoc(doc(db, 'documents', id));
}

/**
 * Convertit un nombre en lettres (français, montants jusqu'au milliard).
 * Pour les reçus de don : « cent vingt-cinq dollars ».
 */
export function numberToWords(n) {
  if (n == null || isNaN(n)) return '';
  const sign = n < 0 ? 'moins ' : '';
  n = Math.abs(Math.floor(Number(n)));
  if (n === 0) return 'zéro';

  const u = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
             'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
             'dix-sept', 'dix-huit', 'dix-neuf'];
  const t = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  function below100(num) {
    if (num < 20) return u[num];
    const tens = Math.floor(num / 10), units = num % 10;
    if (tens === 7 || tens === 9) return t[tens] + (units === 1 && tens === 7 ? ' et ' : '-') + u[10 + units];
    if (tens === 8 && units === 0) return 'quatre-vingts';
    return t[tens] + (units === 0 ? '' : (units === 1 && tens !== 8 ? ' et un' : '-' + u[units]));
  }

  function below1000(num) {
    if (num < 100) return below100(num);
    const hundreds = Math.floor(num / 100), rest = num % 100;
    const hPart = hundreds === 1 ? 'cent' : u[hundreds] + ' cent' + (rest === 0 ? 's' : '');
    return hPart + (rest === 0 ? '' : ' ' + below100(rest));
  }

  let parts = [];
  const billion = Math.floor(n / 1e9);
  if (billion > 0) { parts.push(billion === 1 ? 'un milliard' : below1000(billion) + ' milliards'); n %= 1e9; }
  const million = Math.floor(n / 1e6);
  if (million > 0) { parts.push(million === 1 ? 'un million' : below1000(million) + ' millions'); n %= 1e6; }
  const thousand = Math.floor(n / 1e3);
  if (thousand > 0) {
    parts.push(thousand === 1 ? 'mille' : below1000(thousand) + ' mille');
    n %= 1e3;
  }
  if (n > 0) parts.push(below1000(n));

  return sign + parts.join(' ').trim();
}

export function formatDate(d) {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateLong(d) {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmt(n) {
  if (isNaN(n) || n == null) return '0,00 $';
  return Number(n).toLocaleString('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + ' $';
}
