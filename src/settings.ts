export const OPERATIONS = ['add', 'sub', 'mult', 'div'] as const;
export type Operation = (typeof OPERATIONS)[number];

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Times tables 1..TABLE_COUNT. */
export const TABLE_COUNT = 12;
export const RANGE_MIN = 0;
export const RANGE_MAX = 25;

export interface Settings {
  operations: Record<Operation, boolean>;
  /** `tables[i]` enables the table of `i + 1`. */
  tables: boolean[];
  rangeStart: number;
  rangeEnd: number;
  difficulty: Difficulty;
  hints: boolean;
}

export function defaultSettings(): Settings {
  return {
    operations: { add: true, sub: true, mult: true, div: true },
    tables: Array.from({ length: TABLE_COUNT }, () => true),
    rangeStart: 0,
    rangeEnd: 12,
    difficulty: 'easy',
    hints: true,
  };
}

export function cloneSettings(settings: Settings): Settings {
  return { ...settings, operations: { ...settings.operations }, tables: [...settings.tables] };
}

function enabledOperations(settings: Settings): Operation[] {
  return OPERATIONS.filter((operation) => settings.operations[operation]);
}

export function enabledTables(settings: Settings): number[] {
  return settings.tables.flatMap((enabled, index) => (enabled ? [index + 1] : []));
}

/** Why these settings can't produce a game, or null when they can. */
export function settingsProblem(settings: Settings): string | null {
  if (enabledOperations(settings).length === 0) return 'Pick at least one operation.';
  if (enabledTables(settings).length === 0) return 'Pick at least one number.';
  if (settings.rangeStart > settings.rangeEnd) return 'The range start must not be above its end.';
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInt(value: unknown, range: { min: number; max: number }, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/** Coerce untrusted (stored) data into valid settings, falling back to defaults per field. */
export function normalizeSettings(value: unknown): Settings {
  const defaults = defaultSettings();
  if (!isRecord(value)) return defaults;

  const operations = { ...defaults.operations };
  const rawOperations = value['operations'];
  if (isRecord(rawOperations)) {
    for (const operation of OPERATIONS) {
      const enabled = rawOperations[operation];
      if (typeof enabled === 'boolean') operations[operation] = enabled;
    }
  }

  const rawTables = value['tables'];
  const tables = defaults.tables.map((fallback, index) => {
    const enabled: unknown = Array.isArray(rawTables) ? rawTables.at(index) : undefined;
    return typeof enabled === 'boolean' ? enabled : fallback;
  });

  const rangeStart = clampInt(
    value['rangeStart'],
    { min: RANGE_MIN, max: RANGE_MAX },
    defaults.rangeStart
  );
  const rangeEnd = clampInt(
    value['rangeEnd'],
    { min: rangeStart, max: RANGE_MAX },
    Math.max(rangeStart, defaults.rangeEnd)
  );

  const rawDifficulty = value['difficulty'];
  const difficulty = DIFFICULTIES.find((option) => option === rawDifficulty) ?? defaults.difficulty;
  const rawHints = value['hints'];

  const settings: Settings = {
    operations,
    tables,
    rangeStart,
    rangeEnd,
    difficulty,
    hints: typeof rawHints === 'boolean' ? rawHints : defaults.hints,
  };
  return settingsProblem(settings) === null ? settings : defaults;
}
