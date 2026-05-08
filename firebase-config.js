/**
 * NOVA — Configuration Firebase
 *
 * Ces clés sont publiques côté client (par design Firebase).
 * La sécurité repose sur les Security Rules Firestore + l'authentification utilisateur,
 * pas sur le secret de cette configuration.
 *
 * Référence : https://firebase.google.com/docs/projects/api-keys
 */

export const firebaseConfig = {
  apiKey: "AIzaSyCGli4QoC6IWXdKgnxWiVAC2zLZoDqqavM",
  authDomain: "nova-association.firebaseapp.com",
  projectId: "nova-association",
  storageBucket: "nova-association.firebasestorage.app",
  messagingSenderId: "642295385109",
  appId: "1:642295385109:web:76804c5d6afc67c619921c"
};
