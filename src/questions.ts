import type { Operation } from './settings';

export interface Question {
  prompt: string;
  answer: string;
}

export interface QuestionSpec {
  operations: readonly Operation[];
  /** Each table is the fixed operand: `7 × j`, `7 + j`, `(7 + j) − 7`, `(7 × j) ÷ 7`. */
  tables: readonly number[];
  rangeStart: number;
  rangeEnd: number;
}

function question(operation: Operation, table: number, other: number): Question {
  switch (operation) {
    case 'add':
      return { prompt: `${table} + ${other}`, answer: String(table + other) };
    case 'sub':
      return { prompt: `${table + other} − ${table}`, answer: String(other) };
    case 'mult':
      return { prompt: `${table} × ${other}`, answer: String(table * other) };
    case 'div':
      return { prompt: `${table * other} ÷ ${table}`, answer: String(other) };
  }
}

/** Every question the spec allows, without duplicates. Answers are never negative. */
export function generateQuestions(spec: QuestionSpec): Question[] {
  const seen = new Set<string>();
  const questions: Question[] = [];
  for (const operation of spec.operations) {
    for (const table of spec.tables) {
      if (table < 1) continue;
      for (let other = spec.rangeStart; other <= spec.rangeEnd; other++) {
        const next = question(operation, table, other);
        if (seen.has(next.prompt)) continue;
        seen.add(next.prompt);
        questions.push(next);
      }
    }
  }
  return questions;
}
