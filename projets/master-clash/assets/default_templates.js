/* ============================================================================
 * default_templates.js
 * Templates par défaut des contrats Master Clash, extraits de contrats.html.
 * Sert de fallback / valeur initiale pour le système d'édition stocké en
 * localStorage. Chaque template est un objet décrivant la structure d'un
 * contrat sous forme de blocs typés.
 * ============================================================================
 *
 * Modèle d'un contrat :
 *   {
 *     id, label, icon, ref,
 *     sectorSubs: [string, string],          // sous-titres "ct-sub" du header
 *     blocks: [Block, ...],
 *     signature: { organizerLabel, partnerLabel },
 *     footer: string
 *   }
 *
 * Types de blocs supportés :
 *   - { type: 'h3', text }
 *   - { type: 'h4', text, optional? }
 *   - { type: 'p',  html }
 *   - { type: 'inlineP', segments: [{kind:'text',value} | {kind:'input',input}, ...], optional? }
 *   - { type: 'fieldLabel', text }
 *   - { type: 'textarea',   input: { placeholder?, value? } }
 *   - { type: 'fieldRow', fields: [{label, input}, ...] }
 *   - { type: 'ul', items: [string, ...] }
 *   - { type: 'checkboxes', items: [{label, checked}, ...] }
 *
 * Forme d'un input :
 *   { type: 'text'|'number'|'date', placeholder?, value?, optional? }
 * ========================================================================== */

var DEFAULT_CONTRACT_TEMPLATES = [

  /* =====================================================================
   * 1) Contrat Esthétique
   * ===================================================================== */
  {
    id: 'est',
    label: 'Contrat Esthétique',
    icon: '💆',
    ref: 'MC-EST-2026',
    sectorSubs: [
      'Secteur Esthétique — Master Clash',
      'État de San Andreas'
    ],
    blocks: [
      { type: 'h3', text: 'Préambule' },
      { type: 'p',  html: 'Le présent contrat est conclu entre l\'<strong>Association NOVA</strong> (Nouvelle Organisation Vie Associative), organisatrice de l\'événement <strong>Master Clash</strong> (ci-après « l\'Organisateur ») et le Partenaire ci-après désigné, en vue de la fourniture de prestations esthétiques (coiffure, tatouage, soins) dans le cadre de l\'événement Master Clash.' },

      { type: 'h3', text: 'Identification du partenaire' },
      { type: 'fieldRow', fields: [
        { label: 'Raison sociale', input: { type: 'text', placeholder: 'Nom de l\'enseigne' } },
        { label: 'Téléphone',      input: { type: 'text', placeholder: 'Numéro de téléphone' } }
      ]},

      { type: 'h3', text: 'Article 1 — Engagements du Partenaire' },

      { type: 'h4', text: '1.1 Bons de coiffure' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Le Partenaire s\'engage à fournir ' },
        { kind: 'input', input: { type: 'number', placeholder: 'N' } },
        { kind: 'text',  value: ' bons de coiffure d\'une valeur unitaire de ' },
        { kind: 'input', input: { type: 'number', value: '300' } },
        { kind: 'text',  value: ' $ chacun.' }
      ]},

      { type: 'h4', text: '1.2 Bons de tatouage / esthétique' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Le Partenaire s\'engage à fournir ' },
        { kind: 'input', input: { type: 'number', placeholder: 'N' } },
        { kind: 'text',  value: ' bons d\'une valeur unitaire de ' },
        { kind: 'input', input: { type: 'number', placeholder: '$' } },
        { kind: 'text',  value: ' $ chacun.' }
      ]},
      { type: 'fieldLabel', text: 'Prestation à préciser' },
      { type: 'textarea',   input: { placeholder: 'Détail de la prestation couverte par le bon (ex: tatouage taille moyenne, soin du visage, manucure...)' } },

      { type: 'h4', text: '1.3 Acceptation des bons officiels' },
      { type: 'p',  html: 'Le Partenaire s\'engage à <strong>accepter et détruire</strong> les bons officiels Master Clash après chaque utilisation, conformément à la planche officielle annexée.' },

      { type: 'h4', text: '1.4 Contribution financière (optionnelle)', optional: true },
      { type: 'inlineP', optional: true, segments: [
        { kind: 'text',  value: 'Contribution financière complémentaire à la production : ' },
        { kind: 'input', input: { type: 'number', placeholder: '0', optional: true } },
        { kind: 'text',  value: ' $ — ' },
        { kind: 'input', input: { type: 'text',   placeholder: 'Mode de versement', optional: true } }
      ]},

      { type: 'h3', text: 'Article 2 — Contreparties offertes par l\'Organisateur' },
      { type: 'ul', items: [
        'Mention explicite du Partenaire lors de chaque remise de lot esthétique.',
        'Visibilité sur l\'ensemble des supports de communication officiels de l\'événement.',
        'Possibilité d\'intégrer une question sponsorisée durant la Manche 1 (sur accord).',
        'Bilan de visibilité post-événement fourni sur demande.'
      ]},

      { type: 'h3', text: 'Article 3 — Conditions générales' },
      { type: 'ul', items: [
        { html: 'Validité des bons : ', input: { type: 'text', placeholder: 'ex: 90 jours après l\'événement' } },
        'Usage unique, non cessible, non échangeable contre du numéraire.',
        { html: 'Contrat conclu pour <strong>une (1) édition</strong> de Master Clash, renouvelable par avenant écrit.' },
        'Tout litige sera tranché à l\'amiable, à défaut par les juridictions compétentes de San Andreas.'
      ]}
    ],
    signature: {
      organizerLabel: 'Pour l\'Association NOVA (Organisateur)',
      partnerLabel:   'Pour le Partenaire'
    },
    footer: 'MASTER CLASH × ASSOCIATION NOVA — Document officiel — Réf. MC-EST-2026 — État de San Andreas'
  },

  /* =====================================================================
   * 2) Contrat Garage
   * ===================================================================== */
  {
    id: 'gar',
    label: 'Contrat Garage',
    icon: '🔧',
    ref: 'MC-GAR-2026',
    sectorSubs: [
      'Secteur Garage — Master Clash',
      'État de San Andreas'
    ],
    blocks: [
      { type: 'h3', text: 'Préambule' },
      { type: 'p',  html: 'Le présent contrat est conclu entre l\'<strong>Association NOVA</strong> (Nouvelle Organisation Vie Associative), organisatrice de l\'événement <strong>Master Clash</strong> et le Partenaire ci-après désigné, en vue de la fourniture de prestations de réparation, entretien et tuning automobile dans le cadre de l\'événement Master Clash.' },

      { type: 'h3', text: 'Identification du partenaire' },
      { type: 'fieldRow', fields: [
        { label: 'Raison sociale', input: { type: 'text', placeholder: 'Nom du garage' } },
        { label: 'Téléphone',      input: { type: 'text', placeholder: 'Numéro de téléphone' } }
      ]},

      { type: 'h3', text: 'Article 1 — Engagements du Partenaire' },

      { type: 'h4', text: '1.1 Bons de réparation' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Le Partenaire s\'engage à fournir ' },
        { kind: 'input', input: { type: 'number', placeholder: 'N' } },
        { kind: 'text',  value: ' bons de réparation d\'une valeur unitaire de ' },
        { kind: 'input', input: { type: 'number', placeholder: '$' } },
        { kind: 'text',  value: ' $ chacun.' }
      ]},

      { type: 'h4', text: '1.2 Prestations couvertes' },
      { type: 'ul', items: [
        'Réparation mécanique & carrosserie.',
        'Entretien courant (vidange, freinage, pneumatiques).',
        'Lavage intérieur / extérieur.',
        'Tuning et personnalisation esthétique.'
      ]},
      { type: 'p', html: 'Si la valeur de la prestation excède le montant du bon, la différence est à la charge du bénéficiaire.' },

      { type: 'h4', text: '1.3 Contribution financière à la production (optionnelle)', optional: true },
      { type: 'fieldRow', optional: true, fields: [
        { label: 'Montant',          input: { type: 'number', placeholder: '$',                  optional: true }, suffix: ' $' },
        { label: 'Mode de versement', input: { type: 'text',   placeholder: 'Virement / espèces', optional: true } },
        { label: 'Date limite',      input: { type: 'date',                                       optional: true } }
      ]},

      { type: 'h4', text: '1.4 Don en cash brut (optionnel)', optional: true },
      { type: 'inlineP', optional: true, segments: [
        { kind: 'text',  value: 'Don en numéraire pour la dotation des finalistes : ' },
        { kind: 'input', input: { type: 'number', placeholder: '$', optional: true } },
        { kind: 'text',  value: ' $' }
      ]},

      { type: 'h3', text: 'Article 2 — Contreparties offertes par l\'Organisateur' },
      { type: 'ul', items: [
        { html: 'Mention <strong>« Partenaire Production »</strong> en cas de contribution financière.' },
        'Visibilité renforcée sur l\'ensemble des supports officiels.',
        'Mention lors des remises de lot et bilans post-événement.',
        'Possibilité d\'intégrer une question sponsorisée.'
      ]},

      { type: 'h3', text: 'Article 3 — Conditions générales' },
      { type: 'ul', items: [
        { html: 'Validité des bons : ', input: { type: 'text', placeholder: 'ex: 90 jours après l\'événement' } },
        'Usage unique, non cessible.',
        'Contrat conclu pour une (1) édition.',
        'Litiges : règlement amiable, à défaut juridictions de San Andreas.'
      ]}
    ],
    signature: {
      organizerLabel: 'Pour l\'Association NOVA (Organisateur)',
      partnerLabel:   'Pour le Partenaire'
    },
    footer: 'MASTER CLASH × ASSOCIATION NOVA — Document officiel — Réf. MC-GAR-2026 — État de San Andreas'
  },

  /* =====================================================================
   * 3) Contrat Restaurant
   * ===================================================================== */
  {
    id: 'res',
    label: 'Contrat Restaurant',
    icon: '🍽️',
    ref: 'MC-RES-2026',
    sectorSubs: [
      'Secteur Restauration — Master Clash',
      'État de San Andreas'
    ],
    blocks: [
      { type: 'h3', text: 'Préambule' },
      { type: 'p',  html: 'Le présent contrat est conclu entre l\'<strong>Association NOVA</strong> (Nouvelle Organisation Vie Associative), organisatrice de l\'événement <strong>Master Clash</strong> et l\'Établissement de restauration ci-après désigné, en vue de la fourniture de bons repas dans le cadre de l\'événement Master Clash.' },

      { type: 'h3', text: 'Identification de l\'établissement' },
      { type: 'fieldRow', fields: [
        { label: 'Raison sociale', input: { type: 'text', placeholder: 'Nom du restaurant' } },
        { label: 'Téléphone',      input: { type: 'text', placeholder: 'Numéro de téléphone' } }
      ]},

      { type: 'h3', text: 'Article 1 — Engagements de l\'Établissement' },

      { type: 'h4', text: '1.1 Bons repas' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'L\'Établissement s\'engage à fournir ' },
        { kind: 'input', input: { type: 'number', placeholder: 'N' } },
        { kind: 'text',  value: ' bons repas d\'une valeur unitaire de ' },
        { kind: 'input', input: { type: 'number', value: '1100' } },
        { kind: 'text',  value: ' $ chacun.' }
      ]},

      { type: 'h4', text: '1.2 Composition d\'un bon' },
      { type: 'p',  html: 'Chaque bon repas équivaut à un <strong>menu complet pour 10 personnes</strong> incluant :' },
      { type: 'ul', items: [
        'Une entrée par convive.',
        'Un plat principal par convive.',
        'Un dessert par convive.'
      ]},

      { type: 'h4', text: '1.3 Boissons' },
      { type: 'checkboxes', items: [
        { label: 'Boissons incluses',     checked: false },
        { label: 'Boissons non incluses', checked: true  }
      ]},

      { type: 'h4', text: '1.4 Modalités d\'utilisation' },
      { type: 'ul', items: [
        { html: '<strong>Réservation préalable obligatoire</strong> par le bénéficiaire auprès de l\'Établissement.' },
        { html: 'L\'Établissement s\'engage à <strong>détruire les bons après usage</strong>.' },
        'Les bons sont nominatifs et non cessibles.'
      ]},

      { type: 'h3', text: 'Article 2 — Contreparties offertes par l\'Organisateur' },
      { type: 'ul', items: [
        'Mention de l\'Établissement lors de chaque remise de bon repas.',
        'Visibilité sur tous les supports de communication officiels.',
        'Possibilité d\'intégrer une question sponsorisée.',
        'Bilan de visibilité post-événement.'
      ]},

      { type: 'h3', text: 'Article 3 — Conditions générales' },
      { type: 'ul', items: [
        { html: 'Validité des bons : ', input: { type: 'text', placeholder: 'ex: 6 mois après l\'événement' } },
        'Usage unique, non cessible, non remboursable.',
        'Contrat conclu pour une (1) édition.'
      ]}
    ],
    signature: {
      organizerLabel: 'Pour l\'Association NOVA (Organisateur)',
      partnerLabel:   'Pour l\'Établissement'
    },
    footer: 'MASTER CLASH × ASSOCIATION NOVA — Document officiel — Réf. MC-RES-2026 — État de San Andreas'
  },

  /* =====================================================================
   * 4) Contrat Maze Event
   * ===================================================================== */
  {
    id: 'maze',
    label: 'Contrat Maze Event',
    icon: '🚁',
    ref: 'MC-MAZE-2026',
    sectorSubs: [
      'Maze Event — Expériences Prestige',
      'État de San Andreas'
    ],
    blocks: [
      { type: 'h3', text: 'Préambule' },
      { type: 'p',  html: 'Le présent contrat est conclu entre l\'<strong>Association NOVA</strong> (Nouvelle Organisation Vie Associative), organisatrice de l\'événement <strong>Master Clash</strong> et la société <strong>Maze Event</strong>, en vue de la fourniture de baptêmes hélicoptère destinés aux finalistes de l\'événement Master Clash.' },

      { type: 'h3', text: 'Identification de Maze Event' },
      { type: 'fieldRow', fields: [
        { label: 'Raison sociale', input: { type: 'text', value: 'Maze Event' } },
        { label: 'Téléphone',      input: { type: 'text', placeholder: 'Numéro de téléphone' } }
      ]},

      { type: 'h3', text: 'Article 1 — Engagements de Maze Event' },

      { type: 'h4', text: '1.1 Baptêmes hélicoptère' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Maze Event s\'engage à fournir ' },
        { kind: 'html',  value: '<strong>4 sessions</strong>' },
        { kind: 'text',  value: ' baptême hélicoptère d\'une durée de ' },
        { kind: 'html',  value: '<strong>15 minutes</strong>' },
        { kind: 'text',  value: ' chacune, valeur unitaire ' },
        { kind: 'input', input: { type: 'number', value: '2000' } },
        { kind: 'text',  value: ' $.' }
      ]},

      { type: 'h4', text: '1.2 Contenu de chaque session' },
      { type: 'ul', items: [
        'Briefing sécurité & consignes de vol.',
        'Vol panoramique au-dessus de Los Santos.',
        'Atterrissage sécurisé & débriefing.'
      ]},

      { type: 'h4', text: '1.3 Capacité par session' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Capacité maximale par vol : ' },
        { kind: 'input', input: { type: 'number', placeholder: 'ex: 3' } },
        { kind: 'text',  value: ' passager(s).' }
      ]},

      { type: 'h4', text: '1.4 Planning' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Sessions programmées ' },
        { kind: 'html',  value: '<strong>après l\'événement</strong>' },
        { kind: 'text',  value: ' selon disponibilités, valables ' },
        { kind: 'input', input: { type: 'text', placeholder: 'ex: 6 mois' } },
        { kind: 'text',  value: '.' }
      ]},

      { type: 'h4', text: '1.5 Présence événementielle (optionnelle)', optional: true },
      { type: 'checkboxes', optional: true, items: [
        { label: 'Banner / kakemono sur site',     checked: false },
        { label: 'Représentant Maze Event présent', checked: false }
      ]},

      { type: 'h3', text: 'Article 2 — Contreparties offertes par l\'Organisateur' },
      { type: 'ul', items: [
        { html: 'Positionnement <strong>« Partenaire Expériences Prestige »</strong>.' },
        { html: 'Mention dédiée lors de la <strong>finale</strong> de Master Clash.' },
        'Communication post-événement avec mise en avant des bénéficiaires.',
        'Visibilité maximale sur tous les supports officiels.'
      ]},

      { type: 'h3', text: 'Article 3 — Clause de sécurité' },
      { type: 'p',  html: '<strong>Maze Event est seule responsable</strong> de la conduite, de la sécurité et de l\'assurance des vols. L\'Organisateur ne saurait être tenu responsable d\'incidents survenus pendant les sessions.' }
    ],
    signature: {
      organizerLabel: 'Pour l\'Association NOVA (Organisateur)',
      partnerLabel:   'Pour Maze Event'
    },
    footer: 'MASTER CLASH × ASSOCIATION NOVA — Document officiel — Réf. MC-MAZE-2026 — État de San Andreas'
  },

  /* =====================================================================
   * 5) Contrat MFA Pilotage
   * ===================================================================== */
  {
    id: 'mfa',
    label: 'Contrat MFA Pilotage',
    icon: '🏎️',
    ref: 'MC-MFA-2026',
    sectorSubs: [
      'MFA — Sport & Performance',
      'État de San Andreas'
    ],
    blocks: [
      { type: 'h3', text: 'Préambule' },
      { type: 'p',  html: 'Le présent contrat est conclu entre l\'<strong>Association NOVA</strong> (Nouvelle Organisation Vie Associative), organisatrice de l\'événement <strong>Master Clash</strong> et l\'écurie <strong>MFA (Motorsport / Pilotage)</strong>, en vue de la fourniture de stages de pilotage automobile destinés aux qualifiés de Manche 2 et finalistes de l\'événement Master Clash.' },

      { type: 'h3', text: 'Identification de la MFA' },
      { type: 'fieldRow', fields: [
        { label: 'Raison sociale', input: { type: 'text', value: 'MFA' } },
        { label: 'Téléphone',      input: { type: 'text', placeholder: 'Numéro de téléphone' } }
      ]},

      { type: 'h3', text: 'Article 1 — Engagements de la MFA' },

      { type: 'h4', text: '1.1 Sessions pilotage' },
      { type: 'p',  html: 'La MFA s\'engage à fournir <strong>12 sessions</strong> de pilotage automobile, soit :' },
      { type: 'ul', items: [
        { html: '<strong>8 sessions</strong> pour les qualifiés de Manche 2.' },
        { html: '<strong>4 sessions</strong> pour les finalistes de la Grande Finale.' }
      ]},
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Durée par session : ' },
        { kind: 'html',  value: '<strong>15 minutes</strong>' },
        { kind: 'text',  value: ', valeur unitaire ' },
        { kind: 'input', input: { type: 'number', value: '1000' } },
        { kind: 'text',  value: ' $.' }
      ]},

      { type: 'h4', text: '1.2 Contenu de chaque session' },
      { type: 'ul', items: [
        'Briefing technique & consignes de sécurité.',
        'Mise à disposition de l\'équipement (combinaison, casque).',
        'Session de pilotage sur circuit.',
        'Debriefing post-session avec instructeur.'
      ]},

      { type: 'h4', text: '1.3 Véhicule(s) & circuit' },
      { type: 'fieldRow', fields: [
        { label: 'Véhicule(s) mis à disposition', input: { type: 'text', placeholder: 'Modèles' } },
        { label: 'Circuit utilisé',                input: { type: 'text', placeholder: 'Nom du circuit' } }
      ]},

      { type: 'h4', text: '1.4 Planning' },
      { type: 'inlineP', segments: [
        { kind: 'text',  value: 'Sessions programmées ' },
        { kind: 'html',  value: '<strong>après l\'événement</strong>' },
        { kind: 'text',  value: ' selon disponibilités, valables ' },
        { kind: 'input', input: { type: 'text', placeholder: 'ex: 6 mois' } },
        { kind: 'text',  value: '.' }
      ]},

      { type: 'h4', text: '1.5 Présence événementielle (optionnelle)', optional: true },
      { type: 'checkboxes', optional: true, items: [
        { label: 'Banner / véhicule MFA exposé', checked: false },
        { label: 'Représentant MFA présent',      checked: false }
      ]},

      { type: 'h3', text: 'Article 2 — Contreparties offertes par l\'Organisateur' },
      { type: 'ul', items: [
        { html: 'Positionnement <strong>« Partenaire Sport &amp; Performance »</strong>.' },
        'Mention de la MFA à chaque remise de bon stage pilotage.',
        'Possibilité d\'intégrer une question sponsorisée (thème automobile / motorsport).',
        'Visibilité renforcée sur tous les supports officiels.'
      ]},

      { type: 'h3', text: 'Article 3 — Clause de sécurité' },
      { type: 'p',  html: '<strong>La MFA est seule responsable</strong> de l\'encadrement, de la sécurité et de l\'assurance des sessions de pilotage. L\'Organisateur ne saurait être tenu responsable d\'incidents survenus pendant les stages.' }
    ],
    signature: {
      organizerLabel: 'Pour l\'Association NOVA (Organisateur)',
      partnerLabel:   'Pour la MFA'
    },
    footer: 'MASTER CLASH × ASSOCIATION NOVA — Document officiel — Réf. MC-MFA-2026 — État de San Andreas'
  }

];

/* Expose pour usage en module si jamais on bascule plus tard */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DEFAULT_CONTRACT_TEMPLATES;
}
