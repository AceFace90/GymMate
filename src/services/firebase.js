// Firebase initialization — Auth + Firestore for Google sign-in and cloud backup.
//
// This config is NOT secret: Firebase web config is meant to ship in client code.
// Security is enforced by Firestore rules (see firestore.rules), not by hiding this.
//
// Decision rationale lives in memory/auth-backend-decision.md. Firebase replaces the
// old (never-built) Express/Render/Postgres backend referenced in ARCHITECTURE.md §2.

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCEImaMLJVn62xVkcqfaUwrmiie2AfeCTg',
  authDomain: 'gymmate-ef56f.firebaseapp.com',
  projectId: 'gymmate-ef56f',
  storageBucket: 'gymmate-ef56f.firebasestorage.app',
  messagingSenderId: '314608647854',
  appId: '1:314608647854:web:8454752ce7b0a4b7ffb73f',
  measurementId: 'G-5J0XBQGFRQ',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
