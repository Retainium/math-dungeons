import type { QuestionSpec } from './questions';
import { enabledTables, type Operation, type Settings } from './settings';

export interface Mission {
  id: string;
  label: string;
  operations: readonly Operation[];
}

export const MISSIONS: readonly Mission[] = [
  { id: 'add', label: '+', operations: ['add'] },
  { id: 'sub', label: '−', operations: ['sub'] },
  { id: 'mult', label: '×', operations: ['mult'] },
  { id: 'div', label: '÷', operations: ['div'] },
  { id: 'add-sub', label: '+ −', operations: ['add', 'sub'] },
  { id: 'mult-div', label: '× ÷', operations: ['mult', 'div'] },
  { id: 'all', label: '+ − × ÷', operations: ['add', 'sub', 'mult', 'div'] },
];

/** A castle on the level map: one times table, or the skull castle mixing every enabled table. */
export type Level = number | 'boss';

export function missionAvailable(mission: Mission, settings: Settings): boolean {
  return mission.operations.every((operation) => settings.operations[operation]);
}

export function levelAvailable(level: Level, settings: Settings): boolean {
  return level === 'boss' || settings.tables[level - 1] === true;
}

export function levelKey(mission: Mission, level: Level): string {
  return `${mission.id}:${level}`;
}

export function questionSpec(mission: Mission, level: Level, settings: Settings): QuestionSpec {
  return {
    operations: mission.operations,
    tables: level === 'boss' ? enabledTables(settings) : [level],
    rangeStart: settings.rangeStart,
    rangeEnd: settings.rangeEnd,
  };
}
