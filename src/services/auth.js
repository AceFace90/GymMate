import AsyncStorage from '@react-native-async-storage/async-storage';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth as fbAuth, googleProvider } from './firebase';
import * as cloudSync from './cloudSync';
import { setActiveUserId } from './activeUser';

const USERS_KEY = 'gymmate_users';
const CURRENT_USER_KEY = 'gymmate_current_user';

export async function getAllUsers() {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getCurrentUser() {
  const raw = await AsyncStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveCurrentUser(user) {
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function clearCurrentUser() {
  await AsyncStorage.removeItem(CURRENT_USER_KEY);
}

export async function createLocalUser(name) {
  const users = await getAllUsers();
  const slug = name.toLowerCase().replace(/\s+/g, '_');
  const user = {
    id: 'local-' + Date.now(),
    name,
    email: `${slug}@gymmate.app`,
    google_id: null,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  return user;
}

export async function deleteUser(id) {
  const users = await getAllUsers();
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users.filter((u) => u.id !== id)));
  const current = await getCurrentUser();
  if (current?.id === id) await clearCurrentUser();
}

export function isGoogleUser(user) {
  return !!(user?.google_id && !user.google_id.startsWith('local-'));
}

// Maps a Firebase user object to our local gymmate user shape.
function fromFirebaseUser(fbUser) {
  return {
    id: 'google-' + fbUser.uid,
    google_id: fbUser.uid,
    name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Athlete',
    email: fbUser.email || null,
    photo_url: fbUser.photoURL || null,
    created_at: new Date().toISOString(),
  };
}

// Real Google sign-in via Firebase popup. Returns our local user shape and
// persists it as the current user. Reconciles local data with the cloud backup
// (push up on first sign-in / restore down on a new device). Throws on failure.
export async function signInWithGoogle() {
  const result = await signInWithPopup(fbAuth, googleProvider);
  const userData = fromFirebaseUser(result.user);
  // Scope all data reads/writes to this user BEFORE syncing, so we read/back up
  // this user's namespace — never another account's or the demo's data.
  setActiveUserId(userData.id);
  try {
    await cloudSync.syncOnSignIn(result.user.uid);
  } catch (e) {
    console.error('Cloud sync on sign-in failed (continuing with local data):', e);
  }
  return handleGoogleCallback(userData);
}

// Sign out of Firebase too (does not touch local profiles list).
// Backs up local data to the cloud first so the session's work isn't lost.
export async function signOutGoogle() {
  const uid = fbAuth.currentUser?.uid;
  if (uid) {
    try {
      await cloudSync.backupToCloud(uid);
    } catch (e) {
      console.error('Cloud backup on sign-out failed:', e);
    }
  }
  try { await signOut(fbAuth); } catch { /* already signed out */ }
  await clearCurrentUser();
}

// Back up the signed-in Google user's data to the cloud right now, if any.
// No-op for the demo user / local-only profiles (no Firebase session). Safe to
// call opportunistically (e.g. after completing a workout) so a session isn't
// lost if the tab is closed before sign-out. Never throws.
export async function backupCurrentUser() {
  const uid = fbAuth.currentUser?.uid;
  if (!uid) return;
  try {
    await cloudSync.backupToCloud(uid);
  } catch (e) {
    console.error('Cloud backup failed:', e);
  }
}

// Persists a Google user into the local users list + current user.
export async function handleGoogleCallback(userData) {
  const users = await getAllUsers();
  const existing = users.findIndex((u) => u.google_id === userData.google_id);
  if (existing >= 0) {
    users[existing] = { ...users[existing], ...userData };
  } else {
    users.push(userData);
  }
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  await saveCurrentUser(userData);
  return userData;
}
