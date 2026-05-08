/**
 * NOVA — Module d'authentification
 *
 * Gère :
 *   - inscription (avec attribution automatique du rôle)
 *   - connexion / déconnexion
 *   - récupération du profil utilisateur depuis Firestore
 *   - écoute des changements de session
 *
 * Convention : les utilisateurs voient un identifiant ("A.Beauchamp")
 * mais Firebase utilise un email ("a.beauchamp@nova-association.com").
 * La conversion est gérée par usernameToEmail / emailToUsername.
 */

import { auth, db } from './firebase-init.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

import {
  ROLES, PRESIDENT_EMAIL,
  usernameToEmail, emailToUsername
} from './roles.js';

/**
 * Inscription d'un nouvel utilisateur.
 * Crée un compte Firebase Auth + un document utilisateur dans Firestore.
 * Si l'email correspond à PRESIDENT_EMAIL, l'utilisateur est promu président
 * automatiquement (mécanisme de bootstrap admin).
 *
 * @param {string} username - identifiant choisi (ex: "A.Beauchamp")
 * @param {string} password
 * @param {string} displayName - nom affichage (peut être identique à username)
 * @returns {Promise<{uid: string, role: string, displayName: string}>}
 */
export async function register(username, password, displayName) {
  const cleanUsername = String(username || '').trim();
  if (!cleanUsername) throw new Error('L\'identifiant est requis.');
  if (!password || password.length < 6) {
    throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
  }

  const email = usernameToEmail(cleanUsername);
  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  // Met à jour le displayName Firebase Auth
  const finalDisplayName = displayName?.trim() || cleanUsername;
  await updateProfile(userCred.user, { displayName: finalDisplayName });

  // Détermine le rôle initial : président si email président, sinon utilisateur
  const role = (email === PRESIDENT_EMAIL) ? ROLES.PRESIDENT : ROLES.UTILISATEUR;

  // Crée le profil dans Firestore (collection "users", id = uid)
  await setDoc(doc(db, 'users', userCred.user.uid), {
    uid:         userCred.user.uid,
    username:    cleanUsername,
    email,
    displayName: finalDisplayName,
    role,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp()
  });

  return { uid: userCred.user.uid, role, displayName: finalDisplayName };
}

/**
 * Connexion par identifiant + mot de passe.
 * @param {string} username
 * @param {string} password
 */
export async function login(username, password) {
  const email = usernameToEmail(username);
  const userCred = await signInWithEmailAndPassword(auth, email, password);
  return userCred.user;
}

/**
 * Déconnexion.
 */
export function logout() {
  return signOut(auth);
}

/**
 * Écoute les changements d'état d'authentification.
 * Le callback reçoit (firebaseUser | null).
 */
export function onAuthChange(cb) {
  return onAuthStateChanged(auth, cb);
}

/**
 * Récupère le profil complet de l'utilisateur depuis Firestore.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Traduit les codes d'erreur Firebase Auth en messages français.
 */
export function authErrorMessage(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cet identifiant est déjà utilisé. Essaie de te connecter à la place.';
    case 'auth/invalid-email':
      return 'L\'identifiant n\'est pas valide. Utilise des lettres, points et traits-d\'union.';
    case 'auth/weak-password':
      return 'Le mot de passe est trop faible (6 caractères minimum).';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Identifiant ou mot de passe incorrect.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Patiente quelques minutes.';
    case 'auth/network-request-failed':
      return 'Problème de connexion réseau. Vérifie ta connexion internet.';
    default:
      return error?.message || 'Une erreur est survenue. Réessaie.';
  }
}
