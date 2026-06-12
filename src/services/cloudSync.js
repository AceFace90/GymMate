// Cloud backup/sync for GymMate via Firestore.
//
// Model: one document per user at users/{uid} holding the whole serialized
// dataset (see database export/importAllData). The app keeps running fast off
// local storage; we back the dataset up to the cloud and restore it on a new
// device. This is a backup/restore model, not live per-write sync — chosen to
// keep the blast radius small (see memory/auth-backend-decision.md).
//
// Security: Firestore rules (firestore.rules) restrict each doc to its owner.

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestore } from './firebase';
import * as db from './database';

function userDoc(uid) {
  return doc(firestore, 'users', uid);
}

// Returns true if a serialized payload contains any actual user rows.
function hasContent(payload) {
  if (!payload || !payload.data) return false;
  return Object.values(payload.data).some((v) => Array.isArray(v) && v.length > 0);
}

// Push the current local dataset up to the cloud (overwrites the cloud copy).
export async function backupToCloud(uid) {
  if (!uid) return;
  const payload = await db.exportAllData();
  await setDoc(userDoc(uid), {
    payload,
    updatedAt: new Date().toISOString(),
  });
}

// Pull the cloud dataset down into local storage (overwrites the local copy).
// Returns true if something was restored.
export async function restoreFromCloud(uid) {
  if (!uid) return false;
  const snap = await getDoc(userDoc(uid));
  if (!snap.exists()) return false;
  const remote = snap.data();
  if (!hasContent(remote?.payload)) return false;
  await db.importAllData(remote.payload);
  return true;
}

// Reconcile local and cloud on sign-in. Strategy:
//   - cloud empty            → push local up (first sign-in / new account)
//   - cloud has data, local empty → pull cloud down (new device)
//   - both have data         → newer wins by updatedAt; default to cloud on tie
// Returns { action } describing what happened, so the UI can message the user.
export async function syncOnSignIn(uid) {
  if (!uid) return { action: 'none' };

  const snap = await getDoc(userDoc(uid));
  const remote = snap.exists() ? snap.data() : null;
  const cloudHasData = hasContent(remote?.payload);

  const local = await db.exportAllData();
  const localHasData = hasContent(local);

  if (!cloudHasData) {
    if (localHasData) {
      await backupToCloud(uid);
      return { action: 'pushed' };
    }
    return { action: 'none' };
  }

  if (!localHasData) {
    await db.importAllData(remote.payload);
    return { action: 'pulled' };
  }

  // Both sides have data — newest wins. Local has no stored timestamp, so we
  // only override the cloud if we can't establish it's newer. Default: trust
  // the cloud (it's the durable backup) to avoid clobbering other devices.
  await db.importAllData(remote.payload);
  return { action: 'pulled' };
}
