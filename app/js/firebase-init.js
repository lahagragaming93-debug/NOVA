/**
 * NOVA — Initialisation du SDK Firebase
 *
 * Module unique d'initialisation : importé par tous les autres modules
 * pour récupérer les instances Auth et Firestore.
 *
 * SDK Firebase utilisé : v11 (modulaire ESM, via CDN gstatic).
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth }      from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';

import { firebaseConfig } from '../../firebase-config.js';

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
