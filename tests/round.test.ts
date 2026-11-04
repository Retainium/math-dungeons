import type { Question } from '../src/questions';
import { MAX_STARS, Round, applyPoints } from '../src/round';
import { describe, expect, it } from 'vitest';

const QUESTIONS: Question[] = [
  { prompt: '6 × 2', answer: '12' },
  { prompt: '2 + 1', answer: '3' },
];

function inOrder(): number {
  return 0.999;
}

describe('Round', () => {
  it('accepts a multi-digit answer digit by digit', () => {
    const round = new Round([{ prompt: '6 × 2', answer: '12' }], { random: inOrder });
    round.next();

    expect(round.enter('1')).toBe('pending');
    expect(round.enter('2')).toBe('right');
    expect(round.right).toBe(1);
  });

  it('fails as soon as a digit departs from the answer', () => {
    const round = new Round([{ prompt: '6 × 2', answer: '12' }], { random: inOrder });
    round.next();

    expect(round.enter('3')).toBe('wrong');
    expect(round.wrong).toBe(1);
  });

  it('resolves each question once, ignoring input after the verdict', () => {
    const round = new Round([{ prompt: '2 + 1', answer: '3' }], { random: inOrder });
    round.next();
    round.enter('3');

    expect(round.enter('3')).toBe('pending');
    round.timeOut();
    expect(round.right).toBe(1);
    expect(round.wrong).toBe(0);
  });

  it('lets the player erase a digit before the answer is complete', () => {
    const round = new Round([{ prompt: '6 × 2', answer: '12' }], { random: inOrder });
    round.next();
    round.enter('1');
    round.erase();

    expect(round.input).toBe('');
    expect(round.enter('1')).toBe('pending');
  });

  it('asks a missed question once more, then ends', () => {
    const round = new Round([{ prompt: '2 + 1', answer: '3' }], { random: inOrder });

    expect(round.next()?.prompt).toBe('2 + 1');
    round.timeOut();
    expect(round.next()?.prompt).toBe('2 + 1');
    round.enter('4');
    expect(round.next()).toBeNull();
    expect(round.wrong).toBe(2);
  });

  it('caps the round length', () => {
    const many = Array.from({ length: 50 }, (_, index) => ({
      prompt: `${index} + 0`,
      answer: String(index),
    }));
    const round = new Round(many, { length: 3 });
    let asked = 0;
    for (let current = round.next(); current !== null; current = round.next()) {
      for (const digit of current.answer) round.enter(digit);
      asked++;
    }
    expect(asked).toBe(3);
  });

  it('scores zero stars when nothing was answered, instead of dividing by zero', () => {
    const round = new Round(QUESTIONS);

    expect(round.stars).toBe(0);
  });

  it('gives full stars for a perfect round', () => {
    const round = new Round(QUESTIONS);
    for (let current = round.next(); current !== null; current = round.next()) {
      for (const digit of current.answer) round.enter(digit);
    }

    expect(round.stars).toBe(MAX_STARS);
  });
});

describe('applyPoints', () => {
  it('never lets the score go below zero', () => {
    expect(applyPoints(1, 'wrong')).toBe(0);
    expect(applyPoints(0, 'right')).toBe(3);
  });
});
