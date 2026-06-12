// Per-user data namespacing.
//
// All app data (workouts, programs, biometrics) lives under localStorage keys.
// Historically those keys were fixed (e.g. `gymmate_sessions`), so every user —
// including the "Super Woman" demo — shared one dataset. That leaked one user's
// data into another's view AND into their cloud backup (see
// memory/local-data-not-user-scoped.md).
//
// Fix: prefix every data key with the active user's id. Set the active user
// (setActiveUserId) BEFORE any data read or cloud sync runs — i.e. as soon as
// we know who is logged in (App init, sign-in flow, demo seed).

let activeUserId = null;

export function setActiveUserId(id) {
  activeUserId = id || null;
}

export function getActiveUserId() {
  return activeUserId;
}

// Namespace a base storage key for the active user, e.g.
//   nsKey('gymmate_sessions') -> 'gymmate_u_google-abc123_sessions'
// Before login (no active user) we fall back to the bare key so pre-auth
// reads still work and the one-time legacy upgrade can find old data.
export function nsKey(baseKey) {
  if (!activeUserId) return baseKey;
  // baseKey is always 'gymmate_<thing>'; splice the user id after the prefix.
  const rest = baseKey.startsWith('gymmate_') ? baseKey.slice('gymmate_'.length) : baseKey;
  return `gymmate_u_${activeUserId}_${rest}`;
}
