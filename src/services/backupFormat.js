// Shared, platform-neutral definition of the cloud backup blob format.
//
// Both database.js (native/SQLite) and database.web.js (localStorage) serialize
// the local dataset to this shape for the users/{uid} cloud doc, and read it
// back. Keeping the format in one place is what lets a backup made on web
// restore on native and vice-versa.
//
// v3 (current):
//   { version: 3, data: { <canonical library tables> } }
// where table keys are snake_case (matching the SQL table names and the row
// column names, which are already snake_case on both platforms).
//
// The blob carries only the program/exercise LIBRARY. Workout sessions are NOT
// in the blob — they live in the workout_sessions_cloud collection and are
// restored via workoutSync.restoreSessionsFromCloud on every sync path, so
// duplicating them here would be redundant. Biometrics and preferences travel
// separately in the cloud doc's `asyncStorage` sub-payload (see cloudSync.js).
//
// History:
//   v1 — web only: camelCase table keys, also included sessions/sessionSets/
//        counters/biometrics in `data`.
//   v2 — native only: snake_case keys, library-only (sessions already excluded).
//   v3 — unified: snake_case keys, library-only, written by both platforms.

export const BACKUP_VERSION = 3;

// Canonical (v3) table keys, in dependency order (parents before children) so a
// straight insert satisfies foreign keys.
export const CANONICAL_TABLES = ['exercises', 'programs', 'program_days', 'program_exercises'];

// Legacy web (v1) camelCase blob keys → canonical snake_case. Keys absent here
// (sessions, sessionSets, counters, biometrics) are intentionally dropped on
// normalize: sessions come from workout_sessions_cloud, counters are recomputed
// locally after import, biometrics travel in asyncStorage.
const V1_KEY_TO_CANONICAL = {
  exercises: 'exercises',
  programs: 'programs',
  programDays: 'program_days',
  programExercises: 'program_exercises',
};

// Normalize any historical payload (v1 web / v2 native / v3) to the v3 shape:
//   { version: 3, data: { <canonical tables> }, asyncStorage? }
// Only the canonical library tables are carried through; unknown/legacy keys are
// dropped. asyncStorage is passed through untouched if present.
export function normalizeToV3(payload) {
  if (!payload || !payload.data) return { version: BACKUP_VERSION, data: {} };

  const data = {};
  if (payload.version === 1) {
    // Web v1 used camelCase keys — map the library tables across.
    for (const [v1Key, canonical] of Object.entries(V1_KEY_TO_CANONICAL)) {
      if (Array.isArray(payload.data[v1Key])) data[canonical] = payload.data[v1Key];
    }
  } else {
    // v2 (native) and v3 already use canonical snake_case keys.
    for (const table of CANONICAL_TABLES) {
      if (Array.isArray(payload.data[table])) data[table] = payload.data[table];
    }
  }

  const result = { version: BACKUP_VERSION, data };
  if (payload.asyncStorage) result.asyncStorage = payload.asyncStorage;
  return result;
}
