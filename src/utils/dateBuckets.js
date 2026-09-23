// Pure, dependency-free date-bucketing helpers shared by both DB layers so
// weekly-volume analytics group identically on web and native. Kept storage-
// agnostic (operates on plain rows) and unit-testable.

// ISO-8601 week key 'YYYY-Www' for a local wall-clock timestamp string
// ('YYYY-MM-DD HH:MM:SS' or an ISO date). Uses the ISO week-year (not the
// calendar year) so weeks near a year boundary sort and label correctly —
// e.g. 2026-01-01 can belong to '2025-W53'. Computed in UTC from the date part
// to avoid DST/offset drift. Returns '' for a missing/invalid input.
export function isoWeekKey(startedAt) {
  if (!startedAt) return '';
  const [y, m, d] = String(startedAt).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;           // Mon=1 … Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - day); // move to the Thursday of this week
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

// Aggregate completed-set rows into weekly-volume buckets. Each row needs
// { session_id, started_at, reps, weight_kg }. Returns one entry per ISO week
// (ascending) as { week, sessions, total_sets, total_volume }. Callers filter
// rows to completed sets in completed sessions within the desired window; this
// only buckets and sums, so web and native produce identical output.
export function bucketWeeklyVolume(rows) {
  const byWeek = {};
  for (const r of rows) {
    const week = isoWeekKey(r.started_at);
    if (!week) continue;
    if (!byWeek[week]) byWeek[week] = { week, sessions: new Set(), total_sets: 0, total_volume: 0 };
    byWeek[week].sessions.add(r.session_id);
    byWeek[week].total_sets += 1;
    byWeek[week].total_volume += (r.reps || 0) * (r.weight_kg || 0);
  }
  return Object.values(byWeek)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({ week: w.week, sessions: w.sessions.size, total_sets: w.total_sets, total_volume: w.total_volume }));
}
