import {
  RANGE_MAX,
  defaultSettings,
  normalizeSettings,
  settingsProblem,
} from '../src/settings';
import { describe, expect, it } from 'vitest';

describe('normalizeSettings', () => {
  it('falls back to defaults for missing or malformed data', () => {
    expect(normalizeSettings(null)).toEqual(defaultSettings());
    expect(normalizeSettings('nope')).toEqual(defaultSettings());
  });

  it('keeps valid fields and clamps out-of-range numbers', () => {
    const settings = normalizeSettings({
      operations: { add: false, sub: true, mult: 'yes', div: true },
      tables: [false, true],
      rangeStart: 4,
      rangeEnd: 999,
      difficulty: 'hard',
      hints: false,
    });

    expect(settings.operations).toEqual({ add: false, sub: true, mult: true, div: true });
    expect(settings.tables.slice(0, 3)).toEqual([false, true, true]);
    expect(settings.rangeStart).toBe(4);
    expect(settings.rangeEnd).toBe(RANGE_MAX);
    expect(settings.difficulty).toBe('hard');
    expect(settings.hints).toBe(false);
  });

  it('never yields settings that cannot produce a game', () => {
    const settings = normalizeSettings({
      operations: { add: false, sub: false, mult: false, div: false },
    });

    expect(settingsProblem(settings)).toBeNull();
  });
});

describe('settingsProblem', () => {
  it('requires an operation and a number', () => {
    const settings = defaultSettings();
    settings.tables = settings.tables.map(() => false);

    expect(settingsProblem(settings)).toBe('Pick at least one number.');
  });
});
