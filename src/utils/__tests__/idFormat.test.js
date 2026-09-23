import { bareUid, toLocalWallClock } from '../idFormat';

describe('bareUid', () => {
  it('strips the google- prefix', () => {
    expect(bareUid('google-abc123')).toBe('abc123');
  });

  it('leaves an already-bare uid unchanged', () => {
    expect(bareUid('abc123')).toBe('abc123');
  });

  it('does not strip google- when it appears mid-string', () => {
    expect(bareUid('xgoogle-abc')).toBe('xgoogle-abc');
  });

  it('passes through falsy ids without throwing', () => {
    expect(bareUid(null)).toBe(null);
    expect(bareUid(undefined)).toBe(undefined);
    expect(bareUid('')).toBe('');
  });
});

describe('toLocalWallClock', () => {
  it('formats a Date as zero-padded local YYYY-MM-DD HH:MM:SS', () => {
    // Construct in local time so the assertion is timezone-independent.
    const d = new Date(2026, 0, 5, 9, 3, 7); // 2026-01-05 09:03:07 local
    expect(toLocalWallClock(d)).toBe('2026-01-05 09:03:07');
  });

  it('pads a two-digit month and day / midnight correctly', () => {
    const d = new Date(2026, 10, 30, 0, 0, 0); // 2026-11-30 00:00:00 local
    expect(toLocalWallClock(d)).toBe('2026-11-30 00:00:00');
  });

  it('returns null for a falsy date', () => {
    expect(toLocalWallClock(null)).toBe(null);
    expect(toLocalWallClock(undefined)).toBe(null);
  });
});
