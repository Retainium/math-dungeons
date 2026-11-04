import {
  MISSIONS,
  levelAvailable,
  questionSpec,
} from '../src/missions';
import { generateQuestions } from '../src/questions';
import { defaultSettings } from '../src/settings';
import { describe, expect, it } from 'vitest';

describe('generateQuestions', () => {
  it('builds every operation for each table across the range', () => {
    const questions = generateQuestions({
      operations: ['add', 'sub', 'mult', 'div'],
      tables: [3],
      rangeStart: 0,
      rangeEnd: 2,
    });

    expect(questions).toEqual([
      { prompt: '3 + 0', answer: '3' },
      { prompt: '3 + 1', answer: '4' },
      { prompt: '3 + 2', answer: '5' },
      { prompt: '3 − 3', answer: '0' },
      { prompt: '4 − 3', answer: '1' },
      { prompt: '5 − 3', answer: '2' },
      { prompt: '3 × 0', answer: '0' },
      { prompt: '3 × 1', answer: '3' },
      { prompt: '3 × 2', answer: '6' },
      { prompt: '0 ÷ 3', answer: '0' },
      { prompt: '3 ÷ 3', answer: '1' },
      { prompt: '6 ÷ 3', answer: '2' },
    ]);
  });

  it('never produces negative or fractional answers', () => {
    const questions = generateQuestions({
      operations: ['sub', 'div'],
      tables: [1, 5, 12],
      rangeStart: 0,
      rangeEnd: 25,
    });

    for (const { answer } of questions) {
      expect(answer).toMatch(/^\d+$/);
    }
  });

  it('returns nothing for an empty spec instead of failing', () => {
    expect(generateQuestions({ operations: [], tables: [2], rangeStart: 0, rangeEnd: 5 })).toEqual(
      []
    );
    expect(
      generateQuestions({ operations: ['add'], tables: [], rangeStart: 0, rangeEnd: 5 })
    ).toEqual([]);
  });
});

describe('missions', () => {
  it('uses only the chosen table for a castle and every enabled table for the skull castle', () => {
    const settings = defaultSettings();
    settings.tables = settings.tables.map((_, index) => index < 2);
    const mult = MISSIONS.find((mission) => mission.id === 'mult');
    if (mult === undefined) throw new Error('mult mission missing');

    expect(questionSpec(mult, 7, settings).tables).toEqual([7]);
    expect(questionSpec(mult, 'boss', settings).tables).toEqual([1, 2]);
    expect(levelAvailable(7, settings)).toBe(false);
    expect(levelAvailable('boss', settings)).toBe(true);
  });
});
