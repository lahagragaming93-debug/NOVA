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

  // ⚠ Force le refresh du token Firebase pour que .email soit dispo dans
  // request.auth.token côté Firestore Security Rules. Sans ça, lors du tout
  // premier setDoc juste après inscription, le token peut ne pas avoir d'email
  // → la règle bootstrap-admin (isPresidentEmail) refuse alors role='president'.
  await userCred.user.getIdToken(true);

  // Détermine le rôle initial : président si email président, sinon utilisateur
  const role = (email === PRESIDENT_EMAIL) ? ROLES.PRESIDENT : ROLES.UTILISATEUR;

  // Crée le profil dans Firestore (collection "users", id = uid)
  // Si l'écriture en role='president' est refusée par les règles (cas extrême
  // où le token n'a toujours pas l'email malgré le refresh), on retombe sur
  // role='utilisateur' pour ne pas bloquer la création du profil.
  try {
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
  } catch (err) {
    if (role === ROLES.PRESIDENT) {
      console.warn('Création président refusée, fallback utilisateur :', err);
      await setDoc(doc(db, 'users', userCred.user.uid), {
        uid:         userCred.user.uid,
        username:    cleanUsername,
        email,
        displayName: finalDisplayName,
        role:        ROLES.UTILISATEUR,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp()
      });
      return { uid: userCred.user.uid, role: ROLES.UTILISATEUR, displayName: finalDisplayName };
    }
    throw err;
  }
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
 * Si le profil n'existe pas (cas de bug d'inscription : Auth créé mais doc manquant),
 * on tente de le créer à la volée à partir des informations Firebase Auth.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return snap.data();

  // ===== FALLBACK : doc manquant — on tente de le créer =====
  const me = auth.currentUser;
  if (me && me.uid === uid && me.email) {
    try {
      const username    = emailToUsername(me.email);
      const displayName = me.displayName || username;
      const role        = (me.email === PRESIDENT_EMAIL) ? ROLES.PRESIDENT : ROLES.UTILISATEUR;
      await setDoc(doc(db, 'users', uid), {
        uid,
        username,
        email:       me.email,
        displayName,
        role,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp()
      });
      console.info('Profil Firestore créé à la volée pour', me.email);
      // Re-fetch le doc fraîchement créé
      const newSnap = await getDoc(doc(db, 'users', uid));
      return newSnap.exists() ? newSnap.data() : null;
    } catch (err) {
      console.warn('Échec auto-création profil :', err);
      // Si la création en president échoue (token sans email), retombe sur utilisateur
      try {
        await setDoc(doc(db, 'users', uid), {
          uid,
          username:    emailToUsername(me.email),
          email:       me.email,
          displayName: me.displayName || emailToUsername(me.email),
          role:        ROLES.UTILISATEUR,
          createdAt:   serverTimestamp(),
          updatedAt:   serverTimestamp()
        });
        const fbSnap = await getDoc(doc(db, 'users', uid));
        return fbSnap.exists() ? fbSnap.data() : null;
      } catch (err2) {
        console.error('Auto-création profil totalement échouée :', err2);
        return null;
      }
    }
  }
  return null;
}

/**
 * Met à jour le profil utilisateur (champs autorisés à l'utilisateur lui-même).
 * @param {string} uid
 * @param {{ displayName?, avatar? }} updates
 */
export async function updateMyProfile(uid, updates) {
  const me = auth.currentUser;
  if (!me || me.uid !== uid) throw new Error('Non autorisé.');
  const data = { updatedAt: serverTimestamp() };
  if (updates.displayName !== undefined) data.displayName = String(updates.displayName).trim();
  if (updates.avatar !== undefined) data.avatar = updates.avatar; // base64 ou null

  // Met à jour le doc Firestore
  await setDoc(doc(db, 'users', uid), data, { merge: true });

  // Met aussi à jour Firebase Auth pour displayName (utile pour les badges/threads)
  if (updates.displayName !== undefined) {
    await updateProfile(me, { displayName: data.displayName });
  }
}

/**
 * Resize + compresse une image (File) en base64 JPEG de taille maxSize.
 * Retourne une Promise<string> avec le data URL.
 */
export function compressImage(file, maxSize = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) return reject(new Error('Le fichier doit être une image.'));
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'));
    img.onload = () => {
      // ratio de redimensionnement (max maxSize sur la plus grande dimension)
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > 950 * 1024) {
          return reject(new Error('Image trop lourde après compression. Choisis une image plus petite.'));
        }
        resolve(dataUrl);
      } catch (err) { reject(err); }
    };
    img.onerror = () => reject(new Error('Image invalide.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Génère un avatar SVG par défaut (initiales sur fond doré ou navy) en data-URL.
 */
export function defaultAvatarDataUrl(name) {
  const initials = String(name || '?').trim().split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <rect width="128" height="128" fill="#1F2D4A"/>
    <circle cx="64" cy="64" r="58" fill="none" stroke="#8B7340" stroke-width="2"/>
    <text x="64" y="80" text-anchor="middle" font-family="Cormorant Garamond, Garamond, serif" font-weight="700" font-size="50" fill="#FBF9F3">${initials || '?'}</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
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
