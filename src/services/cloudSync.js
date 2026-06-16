// Cloud backup/sync for GymMate via Firestore.
//
// Model: one document per user at users/{uid} holding the whole serialized
// dataset (see database export/importAllData). The app keeps running fast off
// local storage; we back the dataset up to the cloud and restore it on a new
// device. This is a backup/restore model, not live per-write sync — chosen to
// keep the blast radius small (see memory/auth-backend-decision.md).
//
// Security: Firestore rules (firestore.rules) restrict each doc to its owner.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestore } from './firebase';
import * as db from './database';
import { nsKey } from './activeUser';

// AsyncStorage keys that should be backed up (all are namespaced per user via nsKey)
const ASYNC_STORAGE_KEYS = [
  'gymmate_biometrics',  // Profile data (name, age, sex, height, weight, etc.)
  'gymmate_units',        // Metric/Imperial preference
];

function userDoc(uid) {
  return doc(firestore, 'users', uid);
}

// We remember the cloud's `updatedAt` we last reconciled with (per user, via
// nsKey). On the next sign-in this lets us tell "the cloud changed on another
// device since we last synced" (cloud is newer → pull) apart from "we hold the
// latest baseline plus maybe newer local edits" (→ push), instead of always
// letting the cloud win and clobbering local work.
const SYNC_MARKER = 'gymmate_last_sync';

async function getLastSync() {
  try { return await AsyncStorage.getItem(nsKey(SYNC_MARKER)); } catch { return null; }
}

async function setLastSync(updatedAt) {
  try { if (updatedAt) await AsyncStorage.setItem(nsKey(SYNC_MARKER), updatedAt); } catch { /* best effort */ }
}

// Returns true if a serialized payload contains any actual user rows or AsyncStorage data.
function hasContent(payload) {
  if (!payload) return false;
  if (payload.data && Object.values(payload.data).some((v) => Array.isArray(v) && v.length > 0)) {
    return true;
  }
  if (payload.asyncStorage && Object.keys(payload.asyncStorage).length > 0) {
    return true;
  }
  return false;
}

// Push the current local dataset up to the cloud (overwrites the cloud copy).
export async function backupToCloud(uid) {
  if (!uid) return;
  const payload = await db.exportAllData();

  // Also back up AsyncStorage data (profile, units preference, etc.)
  const asyncStorage = {};
  for (const key of ASYNC_STORAGE_KEYS) {
    try {
      const value = await AsyncStorage.getItem(nsKey(key));
      if (value) asyncStorage[key] = value;
    } catch (e) {
      console.error(`Failed to backup AsyncStorage key ${key}:`, e);
    }
  }
  payload.asyncStorage = asyncStorage;

  const updatedAt = new Date().toISOString();
  await setDoc(userDoc(uid), { payload, updatedAt });
  // We are now in sync with the copy we just wrote.
  await setLastSync(updatedAt);
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

  // Restore AsyncStorage data (profile, units preference, etc.)
  if (remote.payload.asyncStorage) {
    for (const [key, value] of Object.entries(remote.payload.asyncStorage)) {
      try {
        await AsyncStorage.setItem(nsKey(key), value);
      } catch (e) {
        console.error(`Failed to restore AsyncStorage key ${key}:`, e);
      }
    }
  }

  await setLastSync(remote.updatedAt);
  return true;
}

// Reconcile local and cloud on sign-in. Strategy:
//   - cloud empty                 → push local up (first sign-in / new account)
//   - cloud has data, local empty → pull cloud down (new device)
//   - both have data              → use the last-sync marker:
//       · cloud unchanged since we last synced → our local is the same baseline
//         (possibly with newer edits) → push local up
//       · cloud changed since (another device backed up) → pull cloud down
//       · no marker (first reconcile on this device) → pull (cloud is the
//         durable source of truth; avoids clobbering other devices)
// Returns { action } describing what happened, so the UI can message the user.
export async function syncOnSignIn(uid) {
  console.log('[cloudSync] syncOnSignIn called with uid:', uid);
  if (!uid) return { action: 'none' };

  const snap = await getDoc(userDoc(uid));
  const remote = snap.exists() ? snap.data() : null;
  const cloudHasData = hasContent(remote?.payload);
  console.log('[cloudSync] Cloud has data:', cloudHasData);
  console.log('[cloudSync] Remote asyncStorage keys:', remote?.payload?.asyncStorage ? Object.keys(remote.payload.asyncStorage) : 'none');

  const local = await db.exportAllData();
  const localHasData = hasContent(local);
  console.log('[cloudSync] Local has data:', localHasData);

  if (!cloudHasData) {
    if (localHasData) {
      console.log('[cloudSync] Action: PUSH (cloud empty, local has data)');
      await backupToCloud(uid);
      return { action: 'pushed' };
    }
    console.log('[cloudSync] Action: NONE (both empty)');
    return { action: 'none' };
  }

  if (!localHasData) {
    console.log('[cloudSync] Action: PULL (local empty, cloud has data)');
    await db.importAllData(remote.payload);
    // Restore AsyncStorage data too
    if (remote.payload.asyncStorage) {
      console.log('[cloudSync] Restoring AsyncStorage data...');
      for (const [key, value] of Object.entries(remote.payload.asyncStorage)) {
        try {
          const namespacedKey = nsKey(key);
          console.log('[cloudSync] Restoring:', key, '→', namespacedKey);
          await AsyncStorage.setItem(namespacedKey, value);
        } catch (e) {
          console.error(`Failed to restore AsyncStorage key ${key}:`, e);
        }
      }
    }
    await setLastSync(remote.updatedAt);
    return { action: 'pulled' };
  }

  // Both sides have data — decide with the per-device sync marker.
  const lastSync = await getLastSync();
  console.log('[cloudSync] Both have data. lastSync:', lastSync, 'remote.updatedAt:', remote.updatedAt);
  if (lastSync && remote.updatedAt && lastSync === remote.updatedAt) {
    // Cloud hasn't moved since we last synced → our local holds that baseline
    // (and maybe newer local edits). Push so we don't lose recent local work.
    console.log('[cloudSync] Action: PUSH (cloud unchanged since last sync)');
    await backupToCloud(uid);
    return { action: 'pushed' };
  }

  // Cloud changed elsewhere (or we have no baseline) → trust the durable cloud.
  console.log('[cloudSync] Action: PULL (cloud changed or no baseline)');
  await db.importAllData(remote.payload);
  // Restore AsyncStorage data too
  if (remote.payload.asyncStorage) {
    console.log('[cloudSync] Restoring AsyncStorage data...');
    for (const [key, value] of Object.entries(remote.payload.asyncStorage)) {
      try {
        const namespacedKey = nsKey(key);
        console.log('[cloudSync] Restoring:', key, '→', namespacedKey);
        await AsyncStorage.setItem(namespacedKey, value);
      } catch (e) {
        console.error(`Failed to restore AsyncStorage key ${key}:`, e);
      }
    }
  }
  await setLastSync(remote.updatedAt);
  return { action: 'pulled' };
}
