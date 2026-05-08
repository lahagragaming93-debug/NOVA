/**
 * NOVA — Générateur de la comptabilité Excel
 * Produit : COMPTABILITE_NOVA.xlsx
 *
 * Usage :  node generate-compta.js
 *
 * Le fichier généré contient 4 feuilles :
 *   1. Tableau de bord (KPI annuels, statut plafond)
 *   2. Saisie (toutes les transactions de l'année — log)
 *   3. Suivi hebdo (récap auto par semaine, formules SUMIFS, calcul fiscal)
 *   4. Référence T.T.E. (rappel des articles applicables)
 *
 * Conforme T.T.E. FlashFA — Chapitres IV et VIII.
 */

const ExcelJS = require('exceljs');
const path = require('path');

// === PALETTE NOVA ===
const C = {
  navy:        'FF1F2D4A',
  cream:       'FFFBF9F3',
  creamAlt:    'FFF5F1E6',
  gold:        'FF8B7340',
  goldSoft:    'FFB89C5E',
  goldBg:      'FFEFE6CF',
  rule:        'FFD4C8A8',
  ink:         'FF1A1A1A',
  inkSoft:     'FF3A3A3A',
  muted:       'FF6B6356',
  red:         'FF8B3A3A',
  redBg:       'FFF4E0E0',
  green:       'FF4A6B3A',
  greenBg:     'FFE3EBDC',
  yellow:      'FFB87C00',
  yellowBg:    'FFF8ECC8'
};

// === STYLES RÉUTILISABLES ===
const fillSolid = (color) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: color } });
const borderThin = (color = C.rule) => ({ style: 'thin', color: { argb: color } });
const borderMed = (color = C.gold) => ({ style: 'medium', color: { argb: color } });

const styleTitleHero = {
  font: { name: 'Cambria', size: 22, bold: true, color: { argb: C.navy } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};

const styleSubtitle = {
  font: { name: 'Cambria', italic: true, size: 11, color: { argb: C.muted } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};

const styleSectionHeader = {
  font: { name: 'Cambria', bold: true, size: 12, color: { argb: C.cream } },
  fill: fillSolid(C.navy),
  alignment: { horizontal: 'left', vertical: 'middle', indent: 1 },
  border: { top: borderMed(), bottom: borderMed() }
};

const styleColHeader = {
  font: { name: 'Cambria', bold: true, size: 10, color: { argb: C.cream } },
  fill: fillSolid(C.navy),
  alignment: { horizontal: 'left', vertical: 'middle', indent: 1, wrapText: true },
  border: {
    top: borderThin(C.navy), bottom: borderThin(C.navy),
    left: borderThin(C.navy), right: borderThin(C.navy)
  }
};

const styleData = {
  font: { name: 'Calibri', size: 10, color: { argb: C.ink } },
  alignment: { vertical: 'middle' },
  border: {
    bottom: borderThin(C.rule),
    left: borderThin(C.rule), right: borderThin(C.rule)
  }
};

const styleAmount = {
  font: { name: 'Calibri', size: 10, color: { argb: C.ink } },
  alignment: { horizontal: 'right', vertical: 'middle' },
  numFmt: '#,##0.00 "$"',
  border: { bottom: borderThin(C.rule), left: borderThin(C.rule), right: borderThin(C.rule) }
};

const styleAmountStrong = {
  ...styleAmount,
  font: { name: 'Calibri', size: 11, bold: true, color: { argb: C.navy } },
  fill: fillSolid(C.creamAlt)
};

const styleKPILabel = {
  font: { name: 'Cambria', size: 9, color: { argb: C.muted } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};

const styleKPIValue = {
  font: { name: 'Cambria', size: 16, bold: true, color: { argb: C.navy } },
  alignment: { horizontal: 'left', vertical: 'middle' },
  numFmt: '#,##0.00 "$"'
};

const styleKPISub = {
  font: { name: 'Cambria', italic: true, size: 9, color: { argb: C.muted } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};

const styleNote = {
  font: { name: 'Cambria', italic: true, size: 9, color: { argb: C.muted } },
  alignment: { horizontal: 'left', vertical: 'middle', wrapText: true }
};

const styleInputCell = {
  font: { name: 'Calibri', size: 11, bold: true, color: { argb: C.navy } },
  fill: fillSolid(C.goldBg),
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: { top: borderThin(C.gold), bottom: borderThin(C.gold), left: borderThin(C.gold), right: borderThin(C.gold) }
};

// === WORKBOOK ===
const wb = new ExcelJS.Workbook();
wb.creator = 'NOVA — Nouvelle Organisation Vie Associative';
wb.lastModifiedBy = 'NOVA';
wb.created = new Date();
wb.modified = new Date();
wb.properties = {
  date1904: false
};

// Common page setup
const pageSetup = {
  paperSize: 9, // A4
  orientation: 'landscape',
  fitToPage: true,
  fitToWidth: 1,
  fitToHeight: 0,
  margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
};

// ====================================================================
// FEUILLE 0 — TUTORIEL (1ère feuille à l'ouverture)
// ====================================================================
const tuto = wb.addWorksheet('Tutoriel', {
  views: [{ showGridLines: false, state: 'normal' }],
  pageSetup
});
tuto.properties.defaultRowHeight = 18;
tuto.columns = [{ width: 3 }, { width: 22 }, { width: 28 }, { width: 28 }, { width: 28 }, { width: 22 }, { width: 3 }];

// Bandeau titre
tuto.mergeCells('B2:F2');
tuto.getCell('B2').value = 'TUTORIEL — Comptabilité NOVA';
tuto.getCell('B2').style = {
  font: { name: 'Cambria', size: 24, bold: true, color: { argb: C.navy } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};
tuto.getRow(2).height = 38;

tuto.mergeCells('B3:F3');
tuto.getCell('B3').value = 'Mode d\'emploi à destination du Trésorier de l\'Association NOVA';
tuto.getCell('B3').style = styleSubtitle;

tuto.mergeCells('B4:F4');
tuto.getCell('B4').value = 'À lire impérativement avant la première saisie. Conforme au T.T.E. — Chapitres IV et VIII.';
tuto.getCell('B4').style = {
  font: { name: 'Cambria', italic: true, size: 10, color: { argb: C.gold } },
  border: { bottom: borderMed() }
};
tuto.getRow(4).height = 22;

let tr = 6; // ligne courante

const sectionTitle = (text) => {
  tuto.mergeCells(`B${tr}:F${tr}`);
  const cell = tuto.getCell(`B${tr}`);
  cell.value = text;
  cell.style = styleSectionHeader;
  tuto.getRow(tr).height = 24;
  tr++;
};

const para = (text, opts = {}) => {
  tuto.mergeCells(`B${tr}:F${tr}`);
  const cell = tuto.getCell(`B${tr}`);
  cell.value = text;
  cell.style = {
    font: { name: 'Cambria', size: 10.5, color: { argb: C.inkSoft }, bold: opts.bold || false },
    alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
    fill: opts.bg ? fillSolid(opts.bg) : undefined
  };
  tuto.getRow(tr).height = opts.height || 22;
  tr++;
};

const blank = () => { tr++; };

// === SECTION 1 ===
sectionTitle('1. À QUOI SERT CE FICHIER ?');
para('Ce fichier est l\'outil de comptabilité interne de l\'Association NOVA. Il sert à :');
para('• enregistrer toutes les opérations financières (recettes et dépenses) au fil de l\'eau ;', { height: 18 });
para('• calculer automatiquement le résultat fiscal hebdomadaire (à reporter sur le site IRS chaque Mardi) ;', { height: 18 });
para('• surveiller le plafond légal de 50 000 $ HORS DONS sur 4 semaines (Art. 8-1.4 T.T.E.) ;', { height: 18 });
para('• conserver une comptabilité régulière, opposable en cas de contrôle (Art. 4-5.2 T.T.E.).', { height: 18 });
blank();

// === SECTION 2 ===
sectionTitle('2. LES 4 FEUILLES DU FICHIER');

const sheetsTable = [
  ['Feuille', 'À quoi elle sert', 'Qui la remplit ?'],
  ['Tableau de bord', 'Vue d\'ensemble annuelle (KPI, statut plafond)', 'Auto — sélectionne juste l\'année'],
  ['Saisie', 'Journal de toutes les opérations de l\'année', 'TOI (le Trésorier) — au fil de l\'eau'],
  ['Suivi hebdo', 'Récap auto par semaine + calcul fiscal', 'Auto — formules SUMIFS'],
  ['Référence T.T.E.', 'Articles applicables, en consultation', 'Lecture seule']
];

sheetsTable.forEach((row, i) => {
  // Col B = nom, Col C-D mergées = description, Col E-F mergées = qui remplit
  tuto.getCell(`B${tr}`).value = row[0];
  tuto.mergeCells(`C${tr}:D${tr}`);
  tuto.getCell(`C${tr}`).value = row[1];
  tuto.mergeCells(`E${tr}:F${tr}`);
  tuto.getCell(`E${tr}`).value = row[2];

  if (i === 0) {
    [`B${tr}`, `C${tr}`, `E${tr}`].forEach(addr => { tuto.getCell(addr).style = styleColHeader; });
  } else {
    tuto.getCell(`B${tr}`).style = { font: { name: 'Cambria', bold: true, size: 10.5, color: { argb: C.navy } }, alignment: { vertical: 'middle', indent: 1 }, border: { bottom: borderThin() } };
    tuto.getCell(`C${tr}`).style = { font: { name: 'Cambria', size: 10, color: { argb: C.inkSoft } }, alignment: { vertical: 'middle', wrapText: true, indent: 1 }, border: { bottom: borderThin() } };
    tuto.getCell(`E${tr}`).style = { font: { name: 'Cambria', italic: true, size: 10, color: { argb: C.muted } }, alignment: { vertical: 'middle', wrapText: true, indent: 1 }, border: { bottom: borderThin() } };
  }
  tuto.getRow(tr).height = i === 0 ? 24 : 26;
  tr++;
});
blank();

// === SECTION 3 ===
sectionTitle('3. WORKFLOW HEBDOMADAIRE (À MÉMORISER)');
para('Le T.T.E. impose un calendrier strict (Art. 4-3.3 et 4-3.4). Voici le rituel à respecter chaque semaine :');

const workflow = [
  ['LUNDI → DIMANCHE', 'Saisir au fur et à mesure dans la feuille « Saisie » chaque opération de la semaine. Date, type, libellé, montant.', C.greenBg],
  ['DIMANCHE soir', 'Vérification finale : toutes les opérations de la semaine sont-elles saisies ? Toutes les pièces justificatives sont-elles archivées ?', C.creamAlt],
  ['LUNDI', 'Le suivi hebdo est figé pour la semaine écoulée. Aller voir la ligne de la semaine (colonne « Sem. »).', C.creamAlt],
  ['MARDI avant 21h', 'DÉCLARATION FISCALE sur le site de l\'IRS. Reporter : CA hebdo, Résultat imposable, Tranche, Impôt.', C.yellowBg],
  ['MERCREDI avant 21h', 'PAIEMENT de l\'impôt sur le site de l\'IRS. Conserver le justificatif de paiement.', C.yellowBg],
  ['Dès Jeudi', 'Saisir les nouvelles opérations de la semaine en cours.', C.greenBg]
];

workflow.forEach(([when, what, bg]) => {
  tuto.getCell(`B${tr}`).value = when;
  tuto.getCell(`B${tr}`).style = {
    font: { name: 'Cambria', bold: true, size: 10, color: { argb: C.navy } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    fill: fillSolid(bg),
    border: { top: borderThin(), bottom: borderThin(), left: borderThin(), right: borderThin() }
  };
  tuto.mergeCells(`C${tr}:F${tr}`);
  tuto.getCell(`C${tr}`).value = what;
  tuto.getCell(`C${tr}`).style = {
    font: { name: 'Cambria', size: 10, color: { argb: C.inkSoft } },
    alignment: { vertical: 'middle', wrapText: true, indent: 1 },
    fill: fillSolid(bg),
    border: { top: borderThin(), bottom: borderThin(), right: borderThin() }
  };
  tuto.getRow(tr).height = 30;
  tr++;
});
blank();

// === SECTION 4 ===
sectionTitle('4. COMMENT SAISIR UNE OPÉRATION (PAS À PAS)');
para('Pour chaque opération financière (recette ou dépense), tu vas dans la feuille « Saisie » et tu remplis une nouvelle ligne :');

const steps = [
  ['1.', 'Date',      'Date exacte de l\'opération (jj/mm/aaaa).'],
  ['—',  'Année',     'AUTO — calculée depuis la Date. Colonne grisée. NE PAS REMPLIR.'],
  ['—',  'Semaine',   'AUTO — calculée depuis la Date (semaine ISO 8601, lundi au dimanche). Colonne grisée. NE PAS REMPLIR.'],
  ['2.', 'Type',      'Choisir DANS LA LISTE DÉROULANTE (cf. Section 5 ci-dessous pour le bon choix).'],
  ['3.', 'Catégorie', 'Précision libre (ex. « Avocat », « Restaurant », « Visibilité partenaire »). Aide à filtrer.'],
  ['4.', 'Libellé',   'Description courte et claire (ex. « Honoraires Maître Dupont — rédaction contrats »).'],
  ['5.', 'Montant',   'Montant TTC en dollars. Toujours positif. C\'est le « type » qui indique recette ou dépense.']
];

steps.forEach(([n, lbl, desc]) => {
  tuto.getCell(`B${tr}`).value = n;
  tuto.getCell(`B${tr}`).style = {
    font: { name: 'Cambria', bold: true, size: 12, color: { argb: C.gold } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  };
  tuto.getCell(`C${tr}`).value = lbl;
  tuto.getCell(`C${tr}`).style = {
    font: { name: 'Cambria', bold: true, size: 10.5, color: { argb: C.navy } },
    alignment: { vertical: 'middle', indent: 1 }
  };
  tuto.mergeCells(`D${tr}:F${tr}`);
  tuto.getCell(`D${tr}`).value = desc;
  tuto.getCell(`D${tr}`).style = {
    font: { name: 'Cambria', size: 10, color: { argb: C.inkSoft } },
    alignment: { vertical: 'middle', wrapText: true, indent: 1 }
  };
  tuto.getRow(tr).height = 28;
  tr++;
});
blank();

// === SECTION 5 ===
sectionTitle('5. LES 6 TYPES D\'OPÉRATIONS (LE PLUS IMPORTANT)');
para('Bien choisir le TYPE est CRITIQUE : c\'est ce qui détermine si l\'opération est imposable et si elle compte dans le plafond 50k$.');

const types = [
  ['don',                     'Apport SANS contrepartie commerciale (numéraire ou nature)', 'NON',  'NON (hors plafond — Art. 8-1.4)', C.greenBg, C.green],
  ['subvention',              'Apport public (Gouverneur, État, autre institution)',       'NON (Art. 4-2.16)', 'OUI', C.goldBg, C.gold],
  ['prestation',              'Partenariat AVEC contrepartie (logo, mention, visibilité)', 'OUI',  'OUI', C.creamAlt, C.navy],
  ['autre',                   'Bénéfice direct d\'événement (billetterie, vente annexe)',  'OUI (Art. 4-2.2)', 'OUI', C.creamAlt, C.navy],
  ['charge_deductible',       'Dépense admise en déduction (avocat, production, etc.)',    '(réduit le résultat imposable)', '—', C.yellowBg, C.yellow],
  ['charge_non_deductible',   'Dépense NON déductible (Art. 4-2.17 obligatoire)',          '(à déclarer mais non déductible)', '—', C.redBg, C.red]
];

// Header
['Type', 'Quand l\'utiliser', 'Imposable ?', 'Compte plafond 50k$ ?'].forEach((h, i) => {
  const col = ['B','C','D','E'][i];
  tuto.getCell(`${col}${tr}`).value = h;
  tuto.getCell(`${col}${tr}`).style = styleColHeader;
});
tuto.getRow(tr).height = 24;
tr++;

types.forEach(([type, when, imp, plaf, bg, fg]) => {
  tuto.getCell(`B${tr}`).value = type;
  tuto.getCell(`B${tr}`).style = {
    font: { name: 'Consolas', bold: true, size: 10, color: { argb: fg } },
    fill: fillSolid(bg),
    alignment: { vertical: 'middle', indent: 1 },
    border: { bottom: borderThin(), left: borderThin(), right: borderThin() }
  };
  tuto.getCell(`C${tr}`).value = when;
  tuto.getCell(`C${tr}`).style = {
    font: { name: 'Cambria', size: 10, color: { argb: C.inkSoft } },
    alignment: { vertical: 'middle', wrapText: true, indent: 1 },
    border: { bottom: borderThin(), right: borderThin() }
  };
  tuto.getCell(`D${tr}`).value = imp;
  tuto.getCell(`D${tr}`).style = {
    font: { name: 'Cambria', size: 10, italic: true, color: { argb: C.muted } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: { bottom: borderThin(), right: borderThin() }
  };
  tuto.getCell(`E${tr}`).value = plaf;
  tuto.getCell(`E${tr}`).style = {
    font: { name: 'Cambria', size: 10, italic: true, color: { argb: C.muted } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: { bottom: borderThin(), right: borderThin() }
  };
  tuto.getRow(tr).height = 32;
  tr++;
});
blank();

// === SECTION 6 ===
sectionTitle('6. LE PLAFOND 50 000 $ — POURQUOI C\'EST CRITIQUE');
para('L\'Article 8-1.4 du T.T.E. dispose qu\'au-dessus de 50 000 $ HORS DONS de chiffre généré par la vie associative sur 4 déclarations consécutives, le statut d\'association est RETIRÉ.');
blank();
para('Conséquence concrète : NOVA serait requalifiée en entreprise classique → fin de la souplesse associative, fiscalité d\'entreprise pleine.', { bold: true, bg: C.redBg });
blank();
para('Le « Suivi hebdo » surveille ce plafond automatiquement. La colonne « Statut plafond » affiche :');
para('• ✓ OK (vert)  — moins de 80 % du plafond, tout va bien.', { bg: C.greenBg, height: 18 });
para('• ⚠ VIGILANCE (jaune)  — entre 80 % et 100 % du plafond, ralentir les prestations sponsorisées.', { bg: C.yellowBg, height: 18 });
para('• ⚠ DÉPASSEMENT (rouge)  — plus de 50k$, alerter le Président IMMÉDIATEMENT et arrêter d\'encaisser des prestations cette semaine. Si dépassement 4 semaines de suite : retrait du statut.', { bg: C.redBg, height: 28 });
blank();

// === SECTION 7 ===
sectionTitle('7. ERREURS À NE JAMAIS COMMETTRE');
para('• Oublier une opération : la compta doit être complète. Une opération non saisie = pièce manquante en cas de contrôle.', { height: 22 });
para('• Confondre « don » et « prestation » : un partenaire qui exige une mention contre son apport = prestation, pas don.', { height: 22 });
para('• Antidater ou postdater : la date doit refléter la réalité. L\'IRS croise avec d\'autres sources.', { height: 22 });
para('• Oublier la section « charges non-déductibles » : sa non-tenue est sanctionnée d\'une amende de 4 000 $ (Art. 4-2.17).', { height: 22 });
para('• Garder le compte en déficit 4 semaines de suite : l\'État peut remettre la gérance (Art. 4-5.4).', { height: 22 });
blank();

// === SECTION 8 ===
sectionTitle('8. EN CAS DE DOUTE');
para('• Pour un type d\'opération douteux : poser la question au Président avant de saisir.', { height: 20 });
para('• Pour une question fiscale technique : consulter la feuille « Référence T.T.E. » de ce fichier.', { height: 20 });
para('• Pour un contrôle IRS : ne jamais répondre seul. Avertir le Président qui activera le protocole de récusation (Art. 18 des statuts).', { height: 20 });
para('• En cas de soupçon de blanchiment ou d\'irrégularité : avertir le Président et le Bureau IMMÉDIATEMENT — délai de réaction : 72 h maximum (Art. 4-5.3).', { height: 22, bg: C.redBg, bold: true });
blank();

// === FIN ===
tuto.mergeCells(`B${tr}:F${tr}`);
tuto.getCell(`B${tr}`).value = '— Fin du tutoriel — Bonne tenue de la comptabilité NOVA. —';
tuto.getCell(`B${tr}`).style = {
  font: { name: 'Cambria', italic: true, size: 11, color: { argb: C.gold } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: { top: borderMed() }
};
tuto.getRow(tr).height = 24;

// ====================================================================
// FEUILLE 1 — TABLEAU DE BORD
// ====================================================================
const dash = wb.addWorksheet('Tableau de bord', {
  views: [{ showGridLines: false, state: 'normal' }],
  pageSetup
});

dash.properties.defaultRowHeight = 18;
dash.columns = [
  { width: 3 }, { width: 28 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 22 }, { width: 3 }
];

// Bandeau titre
dash.mergeCells('B2:F2');
dash.getCell('B2').value = 'NOVA';
dash.getCell('B2').style = {
  font: { name: 'Cambria', size: 28, bold: true, color: { argb: C.navy }, },
  alignment: { horizontal: 'left', vertical: 'middle' }
};
dash.getRow(2).height = 38;

dash.mergeCells('B3:F3');
dash.getCell('B3').value = 'Nouvelle Organisation Vie Associative — État de San Andreas';
dash.getCell('B3').style = styleSubtitle;

dash.mergeCells('B4:F4');
dash.getCell('B4').value = 'Comptabilité associative — Conforme au T.T.E. (Chap. IV & VIII)';
dash.getCell('B4').style = {
  font: { name: 'Cambria', italic: true, size: 10, color: { argb: C.gold } },
  border: { bottom: borderMed() }
};
dash.getRow(4).height = 22;

// Sélecteur année
dash.getCell('B6').value = 'Année comptable';
dash.getCell('B6').style = styleKPILabel;
dash.getCell('C6').value = 2026;
dash.getCell('C6').style = styleInputCell;
dash.getCell('C6').name = 'AnneeComptable';

// KPI cards (4 cartes)
const kpiRow = 9;
const kpis = [
  { col: 'B', label: 'Total dons (annuel)', formula: '=SUMIFS(Saisie!G:G,Saisie!B:B,C6,Saisie!D:D,"don")', sub: 'Hors plafond — Art. 8-1.4' },
  { col: 'C', label: 'Total subventions', formula: '=SUMIFS(Saisie!G:G,Saisie!B:B,C6,Saisie!D:D,"subvention")', sub: 'Non imposables — Art. 4-2.16' },
  { col: 'D', label: "Chiffre d'affaires annuel", formula: '=SUMIFS(Saisie!G:G,Saisie!B:B,C6,Saisie!D:D,"prestation")+SUMIFS(Saisie!G:G,Saisie!B:B,C6,Saisie!D:D,"autre")', sub: 'Prestations + autres entrées' },
  { col: 'E', label: 'Total dépenses', formula: '=SUMIFS(Saisie!G:G,Saisie!B:B,C6,Saisie!D:D,"charge_deductible")+SUMIFS(Saisie!G:G,Saisie!B:B,C6,Saisie!D:D,"charge_non_deductible")', sub: 'Toutes catégories' }
];

kpis.forEach(k => {
  dash.getCell(`${k.col}${kpiRow}`).value = k.label;
  dash.getCell(`${k.col}${kpiRow}`).style = {
    ...styleKPILabel,
    fill: fillSolid(C.creamAlt),
    border: { left: { style: 'thick', color: { argb: C.gold } }, top: borderThin(), bottom: borderThin() }
  };
  dash.getCell(`${k.col}${kpiRow + 1}`).value = { formula: k.formula };
  dash.getCell(`${k.col}${kpiRow + 1}`).style = {
    ...styleKPIValue,
    fill: fillSolid(C.creamAlt),
    border: { left: { style: 'thick', color: { argb: C.gold } } }
  };
  dash.getCell(`${k.col}${kpiRow + 2}`).value = k.sub;
  dash.getCell(`${k.col}${kpiRow + 2}`).style = {
    ...styleKPISub,
    fill: fillSolid(C.creamAlt),
    border: { left: { style: 'thick', color: { argb: C.gold } }, bottom: borderThin() }
  };
});
dash.getRow(kpiRow + 1).height = 26;

// Section : Plafond 50k$ — situation
dash.mergeCells('B14:F14');
dash.getCell('B14').value = 'SUIVI DU PLAFOND ASSOCIATIF — Article 8-1.4 du T.T.E.';
dash.getCell('B14').style = styleSectionHeader;
dash.getRow(14).height = 22;

dash.getCell('B15').value = 'Plafond légal :';
dash.getCell('B15').style = styleKPILabel;
dash.getCell('C15').value = 50000;
dash.getCell('C15').style = { ...styleAmount, font: { name: 'Calibri', bold: true, color: { argb: C.gold } } };

dash.getCell('B16').value = 'Cumul max sur 4 semaines (année) :';
dash.getCell('B16').style = styleKPILabel;
dash.getCell('C16').value = { formula: "=MAX('Suivi hebdo'!O5:O56)" };
dash.getCell('C16').style = styleAmountStrong;

dash.getCell('B17').value = 'Statut :';
dash.getCell('B17').style = styleKPILabel;
dash.getCell('C17').value = { formula: '=IF(C16>50000,"⚠ DÉPASSEMENT — risque de retrait du statut",IF(C16>40000,"⚠ VIGILANCE — > 80% du plafond","✓ Conforme"))' };
dash.getCell('C17').style = {
  font: { name: 'Cambria', bold: true, size: 11, color: { argb: C.navy } },
  alignment: { vertical: 'middle' }
};

// Conditional formatting on C17
dash.addConditionalFormatting({
  ref: 'C17',
  rules: [
    { type: 'containsText', operator: 'containsText', text: 'DÉPASSEMENT', style: { font: { color: { argb: C.cream } }, fill: fillSolid(C.red) } },
    { type: 'containsText', operator: 'containsText', text: 'VIGILANCE', style: { font: { color: { argb: C.cream } }, fill: fillSolid(C.yellow) } },
    { type: 'containsText', operator: 'containsText', text: 'Conforme', style: { font: { color: { argb: C.cream } }, fill: fillSolid(C.green) } }
  ]
});

// Mode d'emploi
dash.mergeCells('B19:F19');
dash.getCell('B19').value = "MODE D'EMPLOI";
dash.getCell('B19').style = styleSectionHeader;
dash.getRow(19).height = 22;

const guide = [
  '1. Saisir l\'année dans la cellule jaune ci-dessus (C6).',
  '2. Aller dans la feuille « Saisie » et enregistrer toutes les opérations de la semaine (date, type, catégorie, libellé, montant).',
  '3. La feuille « Suivi hebdo » se met à jour automatiquement (formules SUMIFS et calcul fiscal selon les tranches T.T.E.).',
  '4. Vérifier la colonne « Statut plafond » : si DÉPASSEMENT pendant 4 semaines consécutives, risque de retrait du statut associatif (Art. 8-1.4).',
  '5. Pour chaque déclaration fiscale (Mardi avant 21h sur le site de l\'IRS), reporter les valeurs de la ligne « Suivi hebdo » correspondante.',
  '6. Conserver toutes les pièces justificatives (Art. 4-5.2). Sanctions sévères en cas de comptabilité irrégulière (jusqu\'à saisie 50% du compte sur le gérant).'
];

guide.forEach((line, i) => {
  const row = 20 + i;
  dash.mergeCells(`B${row}:F${row}`);
  dash.getCell(`B${row}`).value = line;
  dash.getCell(`B${row}`).style = {
    font: { name: 'Cambria', size: 10, color: { argb: C.inkSoft } },
    alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 }
  };
  dash.getRow(row).height = 22;
});

// ====================================================================
// FEUILLE 2 — SAISIE
// ====================================================================
const saisie = wb.addWorksheet('Saisie', {
  views: [{ state: 'frozen', xSplit: 0, ySplit: 4, showGridLines: false }],
  pageSetup
});

saisie.columns = [
  { header: 'Date', key: 'date', width: 14 },
  { header: 'Année', key: 'annee', width: 10 },
  { header: 'Semaine', key: 'semaine', width: 11 },
  { header: 'Type', key: 'type', width: 22 },
  { header: 'Catégorie', key: 'categorie', width: 32 },
  { header: 'Libellé', key: 'libelle', width: 50 },
  { header: 'Montant', key: 'montant', width: 16 }
];

// Titre
saisie.mergeCells('A1:G1');
saisie.getCell('A1').value = 'NOVA — Journal des opérations comptables';
saisie.getCell('A1').style = {
  font: { name: 'Cambria', size: 16, bold: true, color: { argb: C.navy } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};
saisie.getRow(1).height = 30;

saisie.mergeCells('A2:G2');
saisie.getCell('A2').value = '⚠ Saisir UNIQUEMENT les colonnes Date / Type / Catégorie / Libellé / Montant. Les colonnes grisées « Année » et « Semaine » sont calculées automatiquement à partir de la Date — NE PAS LES MODIFIER.';
saisie.getCell('A2').style = {
  font: { name: 'Cambria', italic: true, size: 10, color: { argb: C.gold }, bold: true },
  alignment: { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 }
};
saisie.getRow(2).height = 24;

// Headers row 4
const saisieHeaderRow = 4;
['Date', 'Année', 'Semaine', 'Type', 'Catégorie', 'Libellé', 'Montant'].forEach((h, i) => {
  const cell = saisie.getCell(saisieHeaderRow, i + 1);
  cell.value = h;
  cell.style = styleColHeader;
});
saisie.getRow(saisieHeaderRow).height = 22;

// Pré-remplir avec quelques formules dans les premières lignes
const NB_LIGNES_SAISIE = 200;
const styleAuto = {
  font: { name: 'Calibri', size: 10, italic: true, color: { argb: C.muted } },
  fill: fillSolid('FFEFEDE5'),
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: { bottom: borderThin(C.rule), left: borderThin(C.rule), right: borderThin(C.rule) }
};

for (let r = 5; r <= 4 + NB_LIGNES_SAISIE; r++) {
  // Date — saisie libre par utilisateur
  saisie.getCell(`A${r}`).style = { ...styleData, numFmt: 'dd/mm/yyyy' };
  // Année — formule auto à partir de la date (case grisée = auto, ne pas toucher)
  saisie.getCell(`B${r}`).value = { formula: `IF(A${r}="","",YEAR(A${r}))` };
  saisie.getCell(`B${r}`).style = styleAuto;
  // Semaine — formule auto WEEKNUM mode 21 = ISO 8601 (compatible toutes versions Excel)
  saisie.getCell(`C${r}`).value = { formula: `IF(A${r}="","",WEEKNUM(A${r},21))` };
  saisie.getCell(`C${r}`).style = styleAuto;
  // Type — validation
  saisie.getCell(`D${r}`).style = styleData;
  // Catégorie
  saisie.getCell(`E${r}`).style = styleData;
  // Libellé
  saisie.getCell(`F${r}`).style = styleData;
  // Montant
  saisie.getCell(`G${r}`).style = styleAmount;
}

// Data validation pour Type
saisie.dataValidations.add(`D5:D${4 + NB_LIGNES_SAISIE}`, {
  type: 'list',
  allowBlank: true,
  formulae: ['"don,subvention,prestation,autre,charge_deductible,charge_non_deductible"'],
  showErrorMessage: true,
  errorTitle: 'Type invalide',
  error: 'Choisir un type dans la liste : don, subvention, prestation, autre, charge_deductible, charge_non_deductible'
});

// Conditional formatting par type (couleur de fond)
const typeColors = [
  { text: 'don',                     bg: C.greenBg,  fg: C.green },
  { text: 'subvention',              bg: C.goldBg,   fg: C.gold },
  { text: 'prestation',              bg: C.creamAlt, fg: C.navy },
  { text: 'autre',                   bg: C.creamAlt, fg: C.navy },
  { text: 'charge_deductible',       bg: C.yellowBg, fg: C.yellow },
  { text: 'charge_non_deductible',   bg: C.redBg,    fg: C.red }
];

typeColors.forEach(tc => {
  saisie.addConditionalFormatting({
    ref: `D5:D${4 + NB_LIGNES_SAISIE}`,
    rules: [{
      type: 'cellIs', operator: 'equal',
      formulae: [`"${tc.text}"`],
      style: { fill: fillSolid(tc.bg), font: { color: { argb: tc.fg }, bold: true } }
    }]
  });
});

// Auto-filter
saisie.autoFilter = {
  from: { row: 4, column: 1 },
  to:   { row: 4 + NB_LIGNES_SAISIE, column: 7 }
};

// ====================================================================
// FEUILLE 3 — SUIVI HEBDO
// ====================================================================
const suivi = wb.addWorksheet('Suivi hebdo', {
  views: [{ state: 'frozen', xSplit: 0, ySplit: 4, showGridLines: false }],
  pageSetup: { ...pageSetup, orientation: 'landscape' }
});

const cols = [
  { header: 'Sem.',          key: 'sem',          width: 8 },
  { header: 'Dons',          key: 'dons',         width: 13 },
  { header: 'Subventions',   key: 'subv',         width: 13 },
  { header: 'Prestations',   key: 'prest',        width: 13 },
  { header: 'Autres entrées',key: 'autres',       width: 13 },
  { header: 'Charges déduct.',key: 'cdeduct',     width: 14 },
  { header: 'Charges non-déduct.',key: 'cnondeduct',width: 16 },
  { header: 'CA hebdo',      key: 'ca',           width: 13 },
  { header: 'Résultat impos.',key: 'resultat',    width: 14 },
  { header: 'Tranche',       key: 'tranche',      width: 9 },
  { header: 'Taux',          key: 'taux',         width: 9 },
  { header: 'Impôt à payer', key: 'impot',        width: 14 },
  { header: 'Hors dons (sem.)',key: 'horsdons',   width: 14 },
  { header: 'Cumul 4 sem.',  key: 'cumul4',       width: 14 },
  { header: 'Statut plafond',key: 'statut',       width: 18 }
];
suivi.columns = cols;

// Titre
suivi.mergeCells('A1:O1');
suivi.getCell('A1').value = 'NOVA — Suivi comptable hebdomadaire';
suivi.getCell('A1').style = {
  font: { name: 'Cambria', size: 16, bold: true, color: { argb: C.navy } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};
suivi.getRow(1).height = 30;

suivi.mergeCells('A2:B2');
suivi.getCell('A2').value = 'Année :';
suivi.getCell('A2').style = { ...styleKPILabel, alignment: { horizontal: 'right', vertical: 'middle' } };
suivi.getCell('C2').value = { formula: "='Tableau de bord'!C6" };
suivi.getCell('C2').style = {
  font: { name: 'Cambria', size: 12, bold: true, color: { argb: C.navy } },
  alignment: { horizontal: 'center', vertical: 'middle' },
  fill: fillSolid(C.goldBg),
  border: { top: borderThin(C.gold), bottom: borderThin(C.gold), left: borderThin(C.gold), right: borderThin(C.gold) }
};

suivi.mergeCells('D2:O2');
suivi.getCell('D2').value = 'Calculs automatiques basés sur la feuille « Saisie ». Tranches d\'imposition selon Art. 4-3.2 du T.T.E.';
suivi.getCell('D2').style = styleNote;

// Headers row 4
suivi.getRow(4).eachCell({ includeEmpty: false }, (cell) => { cell.style = styleColHeader; });
suivi.getRow(4).height = 30;

// Re-write headers (eachCell may not have caught all if columns blank initially)
cols.forEach((c, i) => {
  const cell = suivi.getCell(4, i + 1);
  cell.value = c.header;
  cell.style = styleColHeader;
});

// 52 weeks
for (let w = 1; w <= 52; w++) {
  const r = 4 + w; // row 5..56

  // Sem
  suivi.getCell(r, 1).value = w;
  suivi.getCell(r, 1).style = {
    ...styleData,
    font: { name: 'Cambria', bold: true, size: 10, color: { argb: C.gold } },
    alignment: { horizontal: 'center', vertical: 'middle' }
  };

  // Dons (B)
  suivi.getCell(r, 2).value = { formula: `=SUMIFS(Saisie!$G:$G,Saisie!$B:$B,$C$2,Saisie!$C:$C,$A${r},Saisie!$D:$D,"don")` };
  suivi.getCell(r, 2).style = styleAmount;
  // Subventions (C)
  suivi.getCell(r, 3).value = { formula: `=SUMIFS(Saisie!$G:$G,Saisie!$B:$B,$C$2,Saisie!$C:$C,$A${r},Saisie!$D:$D,"subvention")` };
  suivi.getCell(r, 3).style = styleAmount;
  // Prestations (D)
  suivi.getCell(r, 4).value = { formula: `=SUMIFS(Saisie!$G:$G,Saisie!$B:$B,$C$2,Saisie!$C:$C,$A${r},Saisie!$D:$D,"prestation")` };
  suivi.getCell(r, 4).style = styleAmount;
  // Autres (E)
  suivi.getCell(r, 5).value = { formula: `=SUMIFS(Saisie!$G:$G,Saisie!$B:$B,$C$2,Saisie!$C:$C,$A${r},Saisie!$D:$D,"autre")` };
  suivi.getCell(r, 5).style = styleAmount;
  // Charges déductibles (F)
  suivi.getCell(r, 6).value = { formula: `=SUMIFS(Saisie!$G:$G,Saisie!$B:$B,$C$2,Saisie!$C:$C,$A${r},Saisie!$D:$D,"charge_deductible")` };
  suivi.getCell(r, 6).style = styleAmount;
  // Charges non-déductibles (G)
  suivi.getCell(r, 7).value = { formula: `=SUMIFS(Saisie!$G:$G,Saisie!$B:$B,$C$2,Saisie!$C:$C,$A${r},Saisie!$D:$D,"charge_non_deductible")` };
  suivi.getCell(r, 7).style = styleAmount;
  // CA hebdo (H) = D + E
  suivi.getCell(r, 8).value = { formula: `=D${r}+E${r}` };
  suivi.getCell(r, 8).style = styleAmountStrong;
  // Résultat imposable (I) = H - F
  suivi.getCell(r, 9).value = { formula: `=H${r}-F${r}` };
  suivi.getCell(r, 9).style = styleAmountStrong;
  // Tranche (J)
  suivi.getCell(r, 10).value = { formula: `=IF(H${r}>500000,5,IF(H${r}>250000,4,IF(H${r}>100000,3,IF(H${r}>50000,2,IF(H${r}>10000,1,0)))))` };
  suivi.getCell(r, 10).style = {
    ...styleData,
    alignment: { horizontal: 'center', vertical: 'middle' },
    font: { name: 'Cambria', bold: true, size: 10, color: { argb: C.gold } }
  };
  // Taux (K)
  suivi.getCell(r, 11).value = { formula: `=CHOOSE(J${r}+1,0,0.1,0.19,0.28,0.36,0.46)` };
  suivi.getCell(r, 11).style = {
    ...styleData,
    alignment: { horizontal: 'center', vertical: 'middle' },
    numFmt: '0%',
    font: { name: 'Cambria', size: 10, color: { argb: C.muted } }
  };
  // Impôt (L) = MAX(0, I*K)
  suivi.getCell(r, 12).value = { formula: `=MAX(0,I${r}*K${r})` };
  suivi.getCell(r, 12).style = {
    ...styleAmount,
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: C.red } }
  };
  // Hors dons sem (M) = H + C  (CA + Subventions, hors dons)
  suivi.getCell(r, 13).value = { formula: `=H${r}+C${r}` };
  suivi.getCell(r, 13).style = styleAmount;
  // Cumul 4 sem (N) = SUM des 4 dernières semaines de la colonne M (avec gestion début d'année)
  suivi.getCell(r, 14).value = { formula: `=SUM(OFFSET($M$5,MAX(0,ROW()-8),0,MIN(4,ROW()-4),1))` };
  suivi.getCell(r, 14).style = styleAmountStrong;
  // Statut (O)
  suivi.getCell(r, 15).value = { formula: `=IF(N${r}>50000,"⚠ DÉPASSEMENT",IF(N${r}>40000,"⚠ VIGILANCE","✓ OK"))` };
  suivi.getCell(r, 15).style = {
    font: { name: 'Cambria', bold: true, size: 10 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { bottom: borderThin(C.rule), left: borderThin(C.rule), right: borderThin(C.rule) }
  };
}

// Conditional formatting sur la colonne Statut (O)
suivi.addConditionalFormatting({
  ref: 'O5:O56',
  rules: [
    { type: 'containsText', operator: 'containsText', text: 'DÉPASSEMENT', style: { font: { color: { argb: C.cream }, bold: true }, fill: fillSolid(C.red) } },
    { type: 'containsText', operator: 'containsText', text: 'VIGILANCE',   style: { font: { color: { argb: C.cream }, bold: true }, fill: fillSolid(C.yellow) } },
    { type: 'containsText', operator: 'containsText', text: 'OK',          style: { font: { color: { argb: C.cream }, bold: true }, fill: fillSolid(C.green) } }
  ]
});

// Conditional formatting Cumul 4 sem (N) — barre colorée selon valeur
suivi.addConditionalFormatting({
  ref: 'N5:N56',
  rules: [
    { type: 'cellIs', operator: 'greaterThan', formulae: ['50000'], style: { font: { color: { argb: C.red }, bold: true } } },
    { type: 'cellIs', operator: 'between',     formulae: ['40000','50000'], style: { font: { color: { argb: C.yellow }, bold: true } } }
  ]
});

// Ligne TOTAL annuel
const totalRow = 58;
suivi.getCell(`A${totalRow}`).value = 'TOTAL';
suivi.getCell(`A${totalRow}`).style = {
  font: { name: 'Cambria', bold: true, size: 11, color: { argb: C.cream } },
  fill: fillSolid(C.navy),
  alignment: { horizontal: 'center', vertical: 'middle' },
  border: { top: borderMed(), bottom: borderMed(), left: borderMed(), right: borderMed() }
};
['B','C','D','E','F','G','H','I','L','M'].forEach(col => {
  suivi.getCell(`${col}${totalRow}`).value = { formula: `=SUM(${col}5:${col}56)` };
  suivi.getCell(`${col}${totalRow}`).style = {
    ...styleAmountStrong,
    font: { name: 'Calibri', size: 11, bold: true, color: { argb: C.cream } },
    fill: fillSolid(C.navy),
    border: { top: borderMed(), bottom: borderMed(), left: borderThin(C.navy), right: borderThin(C.navy) }
  };
});

// ====================================================================
// FEUILLE 4 — RÉFÉRENCE T.T.E.
// ====================================================================
const ref = wb.addWorksheet('Référence T.T.E.', {
  views: [{ showGridLines: false }],
  pageSetup
});

ref.columns = [
  { width: 3 }, { width: 18 }, { width: 90 }, { width: 3 }
];

ref.mergeCells('B2:C2');
ref.getCell('B2').value = 'Référentiel T.T.E. — Articles applicables à NOVA';
ref.getCell('B2').style = {
  font: { name: 'Cambria', size: 16, bold: true, color: { argb: C.navy } },
  alignment: { horizontal: 'left', vertical: 'middle' }
};
ref.getRow(2).height = 30;

ref.mergeCells('B3:C3');
ref.getCell('B3').value = 'Code des Taxes, du Travail et des Entreprises — Serveur FlashFA';
ref.getCell('B3').style = styleSubtitle;

const refData = [
  { section: 'CHAPITRE VIII — ASSOCIATIONS', items: [
    ['8-1.1', 'Association = but non lucratif obligatoire. Aucune rémunération possible aux responsables ou membres.'],
    ['8-1.2', 'Déclaration obligatoire auprès de la Vie Civile + officialisation par le Gouvernement de San Andreas.'],
    ['8-1.3', 'Déclaration des revenus et mouvements monétaires (mêmes obligations que les entreprises).'],
    ['8-1.4', '⚠ PLAFOND : > 50 000 $ HORS DONS sur 4 déclarations consécutives → retrait du statut d\'association.'],
    ['8-1.5', 'Bénévoles = contrat d\'engagement associatif obligatoire.'],
    ['8-1.6', 'Mêmes règles fiscales que les entreprises (Chap. IV).'],
    ['8-1.7', 'Déductions associatives : 1 garage + 1 stockage 1,5 t (ou bureau) + véhicules à valider IRS.']
  ]},
  { section: 'CHAPITRE IV-II — CALCUL DU RÉSULTAT', items: [
    ['4-2.1',  'CA hebdomadaire — semaine = Lundi 00h00 → Dimanche 23h59.'],
    ['4-2.2',  'Autres entrées incluent les bénéfices liés aux évènements (imposables).'],
    ['4-2.4',  'Résultat imposable = (CA + Autres entrées) − Charges déductibles.'],
    ['4-2.8',  'Frais avocat déductibles, max 30 000 $.'],
    ['4-2.10', 'Nourriture employés déductible, max 750 $/employé.'],
    ['4-2.11', 'Frais immobilier — déductibilité limitée à certains types d\'entreprises. Pour NOVA : à valider IRS (Art. 8-1.7). Sinon amende 4 000 $.'],
    ['4-2.12', 'Frais véhicule — déductibilité limitée. Pour NOVA : à valider IRS. Sinon amende 4 000 $.'],
    ['4-2.16', '⭐ SUBVENTIONS NON IMPOSABLES (à exploiter via demande au Gouverneur).'],
    ['4-2.17', 'Section "Dépenses non-déductibles" obligatoire à remplir. Sinon amende 4 000 $.']
  ]},
  { section: 'CHAPITRE IV-III — IMPÔTS', items: [
    ['4-3.1', 'Impôts payés chaque semaine sur revenu imposable de la semaine précédente.'],
    ['4-3.2', 'Tranches : 0% (≤10k$), 10% (10-50k), 19% (50-100k), 28% (100-250k), 36% (250-500k), 46% (>500k).'],
    ['4-3.3', '📅 Déclaration : avant Mardi 21h.'],
    ['4-3.4', '💰 Paiement : avant Mercredi 21h.']
  ]},
  { section: 'CHAPITRE IV-IV — PÉNALITÉS DE RETARD', items: [
    ['4-4.1', '24h retard +10% | 48h +20% | 72h +30% | 96h +40%.']
  ]},
  { section: 'CHAPITRE IV-V — SANCTIONS', items: [
    ['4-5.1', 'Compta inexistante → fermeture administrative + sanctions gérant/co-gérant.'],
    ['4-5.2', 'Compta irrégulière, 4 paliers d\'amende : 5%, 7%, 10%, fermeture. Saisie commune : 50% gérant + 35% co-gérant + 15% matériel.'],
    ['4-5.3', '⚠ Suspicion blanchiment : 72h pour justifier, sinon 45% du compte saisi (65% gérant + 25% co-gérant).'],
    ['4-5.4', '4 semaines de résultat déficitaire → l\'État peut remettre la gérance.']
  ]}
];

let curRow = 5;
refData.forEach(grp => {
  ref.mergeCells(`B${curRow}:C${curRow}`);
  ref.getCell(`B${curRow}`).value = grp.section;
  ref.getCell(`B${curRow}`).style = styleSectionHeader;
  ref.getRow(curRow).height = 22;
  curRow++;

  grp.items.forEach(item => {
    ref.getCell(`B${curRow}`).value = `Art. ${item[0]}`;
    ref.getCell(`B${curRow}`).style = {
      font: { name: 'Cambria', bold: true, size: 10, color: { argb: C.gold } },
      alignment: { horizontal: 'left', vertical: 'top', indent: 1 },
      border: { bottom: borderThin(), left: borderThin(), right: borderThin() }
    };
    ref.getCell(`C${curRow}`).value = item[1];
    ref.getCell(`C${curRow}`).style = {
      font: { name: 'Cambria', size: 10, color: { argb: C.inkSoft } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 },
      border: { bottom: borderThin(), right: borderThin() }
    };
    ref.getRow(curRow).height = 26;
    curRow++;
  });
  curRow++; // espace entre groupes
});

// ====================================================================
// SAUVEGARDE
// ====================================================================
const outPath = path.join(__dirname, 'COMPTABILITE_NOVA.xlsx');
wb.xlsx.writeFile(outPath)
  .then(() => {
    console.log(`✓ Fichier généré : ${outPath}`);
  })
  .catch(err => {
    console.error('✗ Erreur :', err);
    process.exit(1);
  });
