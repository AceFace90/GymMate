import { isoWeekKey, bucketWeeklyVolume } from '../dateBuckets';

describe('isoWeekKey', () => {
  it('formats a mid-year date as YYYY-Www (zero-padded)', () => {
    // 2026-03-04 is a Wednesday in ISO week 10 of 2026.
    expect(isoWeekKey('2026-03-04 10:30:00')).toBe('2026-W10');
  });

  it('accepts a date-only string', () => {
    expect(isoWeekKey('2026-03-04')).toBe('2026-W10');
  });

  it('uses the ISO week-year, not the calendar year, near a year boundary', () => {
    // 2021-01-01 is a Friday belonging to ISO week 53 of 2020.
    expect(isoWeekKey('2021-01-01')).toBe('2020-W53');
    // 2023-01-01 is a Sunday belonging to ISO week 52 of 2022.
    expect(isoWeekKey('2023-01-01')).toBe('2022-W52');
    // 2026-12-31 is a Thursday in ISO week 53 of 2026.
    expect(isoWeekKey('2026-12-31')).toBe('2026-W53');
  });

  it('returns empty string for missing/invalid input', () => {
    expect(isoWeekKey(null)).toBe('');
    expect(isoWeekKey('')).toBe('');
    expect(isoWeekKey('not-a-date')).toBe('');
  });
});

describe('bucketWeeklyVolume', () => {
  it('groups sets by ISO week and sums volume', () => {
    const rows = [
      { session_id: 1, started_at: '2026-03-02 09:00:00', reps: 10, weight_kg: 100 }, // W10
      { session_id: 1, started_at: '2026-03-02 09:10:00', reps: 5, weight_kg: 100 },  // W10, same session
      { session_id: 2, started_at: '2026-03-09 09:00:00', reps: 8, weight_kg: 50 },   // W11
    ];
    const out = bucketWeeklyVolume(rows);
    expect(out).toEqual([
      { week: '2026-W10', sessions: 1, total_sets: 2, total_volume: 1500 },
      { week: '2026-W11', sessions: 1, total_sets: 1, total_volume: 400 },
    ]);
  });

  it('counts distinct sessions per week', () => {
    const rows = [
      { session_id: 1, started_at: '2026-03-02', reps: 1, weight_kg: 10 },
      { session_id: 2, started_at: '2026-03-03', reps: 1, weight_kg: 10 },
    ];
    expect(bucketWeeklyVolume(rows)[0]).toMatchObject({ week: '2026-W10', sessions: 2, total_sets: 2 });
  });

  it('treats null reps/weight as zero volume', () => {
    const rows = [{ session_id: 1, started_at: '2026-03-02', reps: null, weight_kg: null }];
    expect(bucketWeeklyVolume(rows)[0].total_volume).toBe(0);
  });

  it('returns results sorted by week ascending', () => {
    const rows = [
      { session_id: 2, started_at: '2026-03-09', reps: 1, weight_kg: 1 },
      { session_id: 1, started_at: '2026-03-02', reps: 1, weight_kg: 1 },
    ];
    expect(bucketWeeklyVolume(rows).map((w) => w.week)).toEqual(['2026-W10', '2026-W11']);
  });

  it('skips rows with an unparseable date', () => {
    const rows = [{ session_id: 1, started_at: 'garbage', reps: 1, weight_kg: 1 }];
    expect(bucketWeeklyVolume(rows)).toEqual([]);
  });
});
