/**
 * NOVA — Module Comptabilité multi-user
 *
 * Modèle Firestore : collection `transactions`
 *   - type: 'don' | 'subvention' | 'prestation' | 'autre' | 'charge_deductible' | 'charge_non_deductible'
 *   - categorie: string (libre)
 *   - libelle: string
 *   - montant: number (toujours positif)
 *   - date: timestamp (date de l'opération)
 *   - year: number (calculé depuis date)
 *   - week: number (semaine ISO 1-53)
 *   - weekKey: string ("2026-S20")
 *   - createdBy: uid
 *   - createdAt, updatedAt: timestamps
 *
 * Conformité T.T.E. :
 *   - Calcul du résultat fiscal selon Art. 4-2.4
 *   - Tranches d'imposition Art. 4-3.2
 *   - Suivi plafond 50 000 $ HORS DONS / 4 semaines (Art. 8-1.4)
 */

import { db, auth } from './firebase-init.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

/* =========================================================================
   CONSTANTES
   ========================================================================= */

export const TX_TYPES = Object.freeze({
  DON:                  'don',
  SUBVENTION:           'subvention',
  PRESTATION:           'prestation',
  AUTRE:                'autre',
  CHARGE_DEDUCTIBLE:    'charge_deductible',
  CHARGE_NON_DEDUCT:    'charge_non_deductible'
});

export const TYPE_LABELS = Object.freeze({
  don:                   'Don',
  subvention:            'Subvention',
  prestation:            'Prestation',
  autre:                 'Autre entrée',
  charge_deductible:     'Charge déductible',
  charge_non_deductible: 'Charge non-déductible'
});

export const TYPE_COLORS = Object.freeze({
  don:                   { bg: '#e3ebdc', fg: '#4a6b3a' }, // vert
  subvention:            { bg: '#efe6cf', fg: '#8b7340' }, // or
  prestation:            { bg: '#f5f1e6', fg: '#1f2d4a' }, // navy
  autre:                 { bg: '#f5f1e6', fg: '#1f2d4a' }, // navy
  charge_deductible:     { bg: '#f8ecc8', fg: '#b87c00' }, // jaune
  charge_non_deductible: { bg: '#f4e0e0', fg: '#8b3a3a' }  // rouge
});

export const TYPE_DESCRIPTIONS = Object.freeze({
  don:                   'Apport sans contrepartie commerciale (hors plafond Art. 8-1.4)',
  subvention:            'Apport public — non imposable (Art. 4-2.16)',
  prestation:            'Apport avec contrepartie (visibilité, mention) — imposable, compte plafond',
  autre:                 'Bénéfices d\'événements, ventes annexes — imposables',
  charge_deductible:     'Dépenses admises en déduction (Art. 4-2.5 à 4-2.12)',
  charge_non_deductible: 'Dépenses non-déductibles (Art. 4-2.17 obligatoire)'
});

const TYPES_RECETTES = ['don', 'subvention', 'prestation', 'autre'];
const TYPES_DEPENSES = ['charge_deductible', 'charge_non_deductible'];

/* =========================================================================
   HELPERS DATE / SEMAINE ISO
   ========================================================================= */

/**
 * Numéro de semaine ISO 8601 (1-53), où la semaine 1 est celle qui contient le 1er jeudi.
 */
export function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Année ISO (peut différer de l'année calendaire fin/début d'année).
 */
export function getISOYear(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  return d.getFullYear();
}

/**
 * Clé de semaine au format "YYYY-Sxx" (ex: "2026-S20").
 */
export function getWeekKey(date) {
  const d = new Date(date);
  return `${getISOYear(d)}-S${String(getISOWeek(d)).padStart(2, '0')}`;
}

/**
 * Formate une date pour affichage.
 */
export function formatDate(d) {
  if (!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Formate un montant en monnaie ($).
 */
export function fmt(n) {
  if (isNaN(n) || n == null) return '0,00 $';
  return Number(n).toLocaleString('fr-FR', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  }) + ' $';
}

/* =========================================================================
   CRUD TRANSACTIONS
   ========================================================================= */

/**
 * Souscrit aux transactions d'une année (temps réel).
 */
export function subscribeToTransactions(year, callback) {
  const q = query(
    collection(db, 'transactions'),
    where('year', '==', year),
    orderBy('date', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const txs = [];
    snap.forEach(d => txs.push({ id: d.id, ...d.data() }));
    callback(txs);
  }, (err) => {
    console.error('Erreur souscription transactions :', err);
    callback([], err);
  });
}

/**
 * Ajoute une transaction.
 * @param {{ type, categorie, libelle, montant, date }} data - date = Date JS
 */
export async function addTransaction(data) {
  const me = auth.currentUser;
  if (!me) throw new Error('Vous devez être connecté.');
  if (!data.type || !TYPE_LABELS[data.type]) throw new Error('Type invalide.');
  if (!data.libelle?.trim()) throw new Error('Le libellé est requis.');
  if (!data.montant || data.montant <= 0) throw new Error('Le montant doit être positif.');
  if (!data.date) throw new Error('La date est requise.');

  const dateObj = data.date instanceof Date ? data.date : new Date(data.date);

  return addDoc(collection(db, 'transactions'), {
    type: data.type,
    categorie: (data.categorie || '').trim(),
    libelle: data.libelle.trim(),
    montant: Number(data.montant),
    date: Timestamp.fromDate(dateObj),
    year: getISOYear(dateObj),
    week: getISOWeek(dateObj),
    weekKey: getWeekKey(dateObj),
    createdBy: me.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

/**
 * Met à jour une transaction.
 */
export async function updateTransaction(id, data) {
  const update = { updatedAt: serverTimestamp() };
  if (data.type !== undefined) update.type = data.type;
  if (data.categorie !== undefined) update.categorie = (data.categorie || '').trim();
  if (data.libelle !== undefined) update.libelle = data.libelle.trim();
  if (data.montant !== undefined) update.montant = Number(data.montant);
  if (data.date !== undefined) {
    const dateObj = data.date instanceof Date ? data.date : new Date(data.date);
    update.date = Timestamp.fromDate(dateObj);
    update.year = getISOYear(dateObj);
    update.week = getISOWeek(dateObj);
    update.weekKey = getWeekKey(dateObj);
  }
  return updateDoc(doc(db, 'transactions', id), update);
}

export async function deleteTransaction(id) {
  return deleteDoc(doc(db, 'transactions', id));
}

/* =========================================================================
   AGRÉGATIONS / CALCULS FISCAUX
   ========================================================================= */

/**
 * Calcule les sous-totaux par type pour une liste de transactions.
 */
export function sumByType(transactions) {
  const sums = {
    don: 0, subvention: 0, prestation: 0, autre: 0,
    charge_deductible: 0, charge_non_deductible: 0
  };
  transactions.forEach(tx => {
    if (sums[tx.type] !== undefined) sums[tx.type] += Number(tx.montant) || 0;
  });
  return sums;
}

/**
 * Agrège par semaine ISO. Retourne un map weekKey → { sums, ca, resultat, ... }
 */
export function aggregateByWeek(transactions) {
  const byWeek = {};
  transactions.forEach(tx => {
    const k = tx.weekKey || getWeekKey(tx.date.toDate ? tx.date.toDate() : new Date(tx.date));
    if (!byWeek[k]) {
      byWeek[k] = {
        weekKey: k,
        year: tx.year,
        week: tx.week,
        transactions: [],
        sums: { don: 0, subvention: 0, prestation: 0, autre: 0, charge_deductible: 0, charge_non_deductible: 0 }
      };
    }
    byWeek[k].transactions.push(tx);
    if (byWeek[k].sums[tx.type] !== undefined) byWeek[k].sums[tx.type] += Number(tx.montant) || 0;
  });

  // Calculs fiscaux par semaine
  Object.values(byWeek).forEach(w => {
    const s = w.sums;
    w.ca = s.prestation + s.autre;                     // Chiffre d'affaires hebdo (Art. 4-2.1)
    w.charges = s.charge_deductible;                   // Charges déductibles
    w.resultat = w.ca - w.charges;                     // Résultat imposable
    w.tranche = computeBracket(w.ca);
    w.taux = TAX_BRACKETS[w.tranche].rate;
    w.impot = w.resultat > 0 ? Math.round(w.resultat * w.taux * 100) / 100 : 0;
    // Chiffre généré hors dons (compte plafond Art. 8-1.4)
    w.horsDons = w.ca + s.subvention;
  });

  return byWeek;
}

/**
 * Calcule, pour chaque semaine, le cumul du chiffre généré hors dons sur 4 semaines glissantes.
 * @param {Object} byWeek - résultat de aggregateByWeek
 * @returns {Array} liste triée par weekKey ascendant, chaque élément a un champ cumul4
 */
export function computeRollingCumul(byWeek) {
  const sorted = Object.values(byWeek).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
  for (let i = 0; i < sorted.length; i++) {
    const start = Math.max(0, i - 3);
    let cumul = 0;
    for (let j = start; j <= i; j++) cumul += sorted[j].horsDons;
    sorted[i].cumul4 = cumul;
    sorted[i].plafondStatut = cumul > 50000 ? 'depassement'
                            : cumul > 40000 ? 'vigilance'
                            : 'ok';
  }
  return sorted;
}

/* === BARÈME T.T.E. Art. 4-3.2 === */

export const TAX_BRACKETS = [
  { max: 10000,    rate: 0.00 },  // Tranche 0
  { max: 50000,    rate: 0.10 },  // Tranche 1
  { max: 100000,   rate: 0.19 },  // Tranche 2
  { max: 250000,   rate: 0.28 },  // Tranche 3
  { max: 500000,   rate: 0.36 },  // Tranche 4
  { max: Infinity, rate: 0.46 }   // Tranche 5
];

/**
 * Détermine la tranche (0-5) selon le CA.
 */
export function computeBracket(ca) {
  for (let i = 0; i < TAX_BRACKETS.length; i++) {
    if (ca <= TAX_BRACKETS[i].max) return i;
  }
  return TAX_BRACKETS.length - 1;
}

/* =========================================================================
   EXPORT CSV
   ========================================================================= */

function csvEscape(s) {
  if (s == null) return '';
  const str = String(s);
  if (str.includes('"') || str.includes(',') || str.includes(';') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Génère un CSV (séparateur point-virgule, format européen) à partir d'une liste
 * de transactions. Inclut un onglet de synthèse hebdomadaire en fin de fichier.
 *
 * @param {Array} transactions - liste des transactions de l'année
 * @param {number} year
 * @returns {string} contenu CSV (avec BOM UTF-8 pour Excel FR)
 */
export function exportTransactionsToCSV(transactions, year) {
  const lines = [];
  lines.push(`COMPTABILITÉ NOVA — Exercice ${year}`);
  lines.push(`Exporté le : ${new Date().toLocaleString('fr-FR')}`);
  lines.push('');

  // === BLOC 1 : Liste détaillée ===
  lines.push('=== Détail des opérations ===');
  lines.push(['Date', 'Semaine ISO', 'Type', 'Catégorie', 'Libellé', 'Montant ($)']
    .map(csvEscape).join(';'));
  const sorted = transactions.slice().sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const db = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return da - db;
  });
  sorted.forEach(tx => {
    const dateStr = formatDate(tx.date);
    const montantStr = (Number(tx.montant) || 0).toFixed(2).replace('.', ',');
    lines.push([
      dateStr,
      tx.weekKey || '',
      TYPE_LABELS[tx.type] || tx.type,
      tx.categorie || '',
      tx.libelle || '',
      montantStr
    ].map(csvEscape).join(';'));
  });
  lines.push('');

  // === BLOC 2 : Totaux par type ===
  const totals = sumByType(transactions);
  lines.push('=== Totaux par type ===');
  lines.push(['Type', 'Total ($)'].map(csvEscape).join(';'));
  Object.entries(TYPE_LABELS).forEach(([type, label]) => {
    const val = (totals[type] || 0).toFixed(2).replace('.', ',');
    lines.push([label, val].map(csvEscape).join(';'));
  });
  lines.push('');

  // === BLOC 3 : Synthèse hebdo (avec calculs fiscaux) ===
  const byWeek = aggregateByWeek(transactions);
  const weeks = computeRollingCumul(byWeek);
  if (weeks.length > 0) {
    lines.push('=== Synthèse hebdomadaire (T.T.E. Art. 4) ===');
    lines.push(['Semaine', 'Don', 'Subvention', 'Prestation', 'Autre', 'Charges déd.',
                'Charges non-déd.', 'CA hebdo', 'Résultat', 'Tranche', 'Taux', 'Impôt',
                'Hors dons', 'Cumul 4 sem.', 'Plafond']
      .map(csvEscape).join(';'));
    weeks.forEach(w => {
      const fmtN = n => (Number(n) || 0).toFixed(2).replace('.', ',');
      lines.push([
        w.weekKey,
        fmtN(w.sums.don),
        fmtN(w.sums.subvention),
        fmtN(w.sums.prestation),
        fmtN(w.sums.autre),
        fmtN(w.sums.charge_deductible),
        fmtN(w.sums.charge_non_deductible),
        fmtN(w.ca),
        fmtN(w.resultat),
        `T${w.tranche}`,
        fmtN(w.taux * 100) + '%',
        fmtN(w.impot),
        fmtN(w.horsDons),
        fmtN(w.cumul4),
        w.plafondStatut.toUpperCase()
      ].map(csvEscape).join(';'));
    });
  }

  // BOM UTF-8 pour qu'Excel FR ouvre correctement les accents
  return '﻿' + lines.join('\r\n');
}

/**
 * Déclenche le téléchargement d'un fichier CSV depuis le navigateur.
 */
export function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
