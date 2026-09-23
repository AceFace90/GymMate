// Pure, dependency-free helpers shared by the sync layer. Kept out of
// workoutSync.js (which imports firebase) so they can be unit-tested without
// initializing Firebase.

// workout_sessions_cloud.clientId is canonically the bare Firebase uid — the
// trainer read-path strips 'google-' before querying. Callers pass mixed forms
// (bare uid vs 'google-<uid>'), so normalize to bare uid everywhere we
// write/query to avoid cross-form duplicate docs.
export function bareUid(id) {
  return id && id.startsWith('google-') ? id.slice(7) : id;
}

// Format a Date as local wall-clock 'YYYY-MM-DD HH:MM:SS' — the shared on-device
// timestamp format (see database.web.js now() / native datetime('now','localtime')).
export function toLocalWallClock(date) {
  if (!date) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}
