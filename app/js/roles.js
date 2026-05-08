/**
 * NOVA — Définition des rôles et permissions
 *
 * Le système de rôles est appliqué côté UI (pour afficher/masquer les modules)
 * ET côté Firestore (via les Security Rules) pour la sécurité réelle.
 */

export const ROLES = Object.freeze({
  PRESIDENT:   'president',
  TRESORIER:   'tresorier',
  SECRETAIRE:  'secretaire',
  UTILISATEUR: 'utilisateur',
  PARTENAIRE:  'partenaire'
});

export const ROLE_LABELS = Object.freeze({
  president:   'Président',
  tresorier:   'Trésorier',
  secretaire:  'Secrétaire',
  utilisateur: 'Utilisateur',
  partenaire:  'Partenaire'
});

/**
 * Email du président (admin) — bootstrap automatique.
 * Quiconque s'inscrit avec cet email devient automatiquement président
 * (peu importe l'ordre d'inscription).
 */
export const PRESIDENT_EMAIL = 'a.beauchamp@nova-association.com';

/**
 * Domaine email utilisé pour convertir un identifiant en email Firebase.
 * Ex : "A.Beauchamp" → "a.beauchamp@nova-association.com"
 */
export const EMAIL_DOMAIN = '@nova-association.com';

/**
 * Permissions par défaut pour chaque rôle.
 * Andrew (président) pourra modifier cette matrice plus tard via l'onglet Admin.
 *
 * Format des permissions : "module:action"
 *   modules : compta, documents, membres, partenaires, journal, admin
 *   actions : read, write, delete
 *
 * Le wildcard '*' = tous les droits.
 */
export const DEFAULT_PERMISSIONS = Object.freeze({
  president: ['*'],
  tresorier: [
    'compta:read', 'compta:write',
    'documents:read', 'documents:write',
    'membres:read',
    'partenaires:read', 'partenaires:write',
    'journal:read'
  ],
  secretaire: [
    'compta:read',
    'documents:read', 'documents:write',
    'membres:read', 'membres:write',
    'partenaires:read', 'partenaires:write',
    'journal:read'
  ],
  utilisateur: [
    'documents:read'
  ],
  partenaire: [
    'documents:read',
    'partenaires:read'  // peut voir sa propre fiche partenaire
  ]
});

/**
 * Vérifie si un rôle a une permission.
 * @param {string} role - le rôle de l'utilisateur
 * @param {string} perm - la permission au format "module:action"
 * @returns {boolean}
 */
export function hasPermission(role, perm) {
  const perms = DEFAULT_PERMISSIONS[role] || [];
  if (perms.includes('*')) return true;
  if (perms.includes(perm)) return true;
  // Vérification wildcard sur le module : "compta:*"
  const [module] = perm.split(':');
  if (perms.includes(`${module}:*`)) return true;
  return false;
}

/**
 * Convertit un identifiant utilisateur en email Firebase.
 * Ex : "A.Beauchamp" → "a.beauchamp@nova-association.com"
 */
export function usernameToEmail(username) {
  const clean = String(username || '').trim().toLowerCase().replace(/\s+/g, '.');
  return clean + EMAIL_DOMAIN;
}

/**
 * Extrait l'identifiant d'un email Firebase.
 * Ex : "a.beauchamp@nova-association.com" → "a.beauchamp"
 */
export function emailToUsername(email) {
  const e = String(email || '');
  if (e.endsWith(EMAIL_DOMAIN)) {
    return e.slice(0, -EMAIL_DOMAIN.length);
  }
  return e.split('@')[0];
}
