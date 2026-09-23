import { BACKUP_VERSION, CANONICAL_TABLES, normalizeToV3 } from '../backupFormat';

describe('normalizeToV3', () => {
  it('returns an empty v3 blob for null/undefined/dataless payloads', () => {
    expect(normalizeToV3(null)).toEqual({ version: BACKUP_VERSION, data: {} });
    expect(normalizeToV3(undefined)).toEqual({ version: BACKUP_VERSION, data: {} });
    expect(normalizeToV3({ version: 3 })).toEqual({ version: BACKUP_VERSION, data: {} });
  });

  it('maps legacy v1 camelCase library keys to canonical snake_case', () => {
    const v1 = {
      version: 1,
      data: {
        exercises: [{ id: 1 }],
        programs: [{ id: 2 }],
        programDays: [{ id: 3 }],
        programExercises: [{ id: 4 }],
      },
    };
    const out = normalizeToV3(v1);
    expect(out.version).toBe(3);
    expect(out.data).toEqual({
      exercises: [{ id: 1 }],
      programs: [{ id: 2 }],
      program_days: [{ id: 3 }],
      program_exercises: [{ id: 4 }],
    });
  });

  it('drops v1 keys that are not part of the library (sessions, counters, biometrics)', () => {
    const v1 = {
      version: 1,
      data: {
        exercises: [{ id: 1 }],
        sessions: [{ id: 99 }],
        sessionSets: [{ id: 98 }],
        counters: { sessions: 99 },
        biometrics: { weight: 80 },
      },
    };
    const out = normalizeToV3(v1);
    expect(out.data).toEqual({ exercises: [{ id: 1 }] });
    expect(out.data.sessions).toBeUndefined();
    expect(out.data.counters).toBeUndefined();
  });

  it('passes canonical v2/v3 payloads through, keeping only library tables', () => {
    const v3 = {
      version: 3,
      data: {
        exercises: [{ id: 1 }],
        programs: [{ id: 2 }],
        program_days: [{ id: 3 }],
        program_exercises: [{ id: 4 }],
        workout_sessions: [{ id: 5 }], // stray non-library table must be dropped
      },
    };
    const out = normalizeToV3(v3);
    expect(Object.keys(out.data).sort()).toEqual([...CANONICAL_TABLES].sort());
    expect(out.data.workout_sessions).toBeUndefined();
  });

  it('preserves asyncStorage sub-payload untouched when present', () => {
    const payload = {
      version: 3,
      data: { exercises: [] },
      asyncStorage: { biometrics: { weight: 75 }, units: 'metric' },
    };
    const out = normalizeToV3(payload);
    expect(out.asyncStorage).toEqual({ biometrics: { weight: 75 }, units: 'metric' });
  });

  it('ignores non-array table values (guards against corrupt blobs)', () => {
    const out = normalizeToV3({ version: 3, data: { exercises: 'not-an-array', programs: [{ id: 1 }] } });
    expect(out.data).toEqual({ programs: [{ id: 1 }] });
  });
});
