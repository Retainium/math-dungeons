import type { Question } from './questions';

export type Verdict = 'pending' | 'right' | 'wrong';

const ROUND_LENGTH = 10;
export const MAX_STARS = 5;
const POINTS_RIGHT = 3;
const POINTS_WRONG = -2;

export interface RoundOptions {
  /** Questions asked once each; missed ones come back once more at the end. */
  length?: number;
  random?: () => number;
}

function sample<T>(items: readonly T[], count: number, random: () => number): T[] {
  return items
    .map((item) => ({ item, key: random() }))
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map(({ item }) => item);
}

/**
 * One battle: a fixed set of questions, answered digit by digit.
 * Each question resolves exactly once (right, wrong or timed out).
 */
export class Round {
  private readonly queue: Question[];
  private readonly retried = new Set<string>();
  private current: Question | null = null;
  private typed = '';
  private resolved = true;
  private rightCount = 0;
  private wrongCount = 0;

  constructor(questions: readonly Question[], options: RoundOptions = {}) {
    this.queue = sample(questions, options.length ?? ROUND_LENGTH, options.random ?? Math.random);
  }

  get question(): Question | null {
    return this.current;
  }

  get input(): string {
    return this.typed;
  }

  get right(): number {
    return this.rightCount;
  }

  get wrong(): number {
    return this.wrongCount;
  }

  get answered(): number {
    return this.rightCount + this.wrongCount;
  }

  /** Advance to the next question; null once the round is over. */
  next(): Question | null {
    this.current = this.queue.shift() ?? null;
    this.typed = '';
    this.resolved = this.current === null;
    return this.current;
  }

  /** Add a digit. A wrong prefix fails immediately; the full answer succeeds. */
  enter(digit: string): Verdict {
    if (this.resolved || this.current === null || !/^\d$/.test(digit)) return 'pending';
    this.typed += digit;
    const { answer } = this.current;
    if (!answer.startsWith(this.typed)) return this.resolve('wrong');
    return this.typed === answer ? this.resolve('right') : 'pending';
  }

  erase(): void {
    if (!this.resolved) this.typed = this.typed.slice(0, -1);
  }

  timeOut(): void {
    if (!this.resolved) this.resolve('wrong');
  }

  /** 0..MAX_STARS for the share of answers that were right. */
  get stars(): number {
    if (this.answered === 0) return 0;
    return Math.floor((this.rightCount / this.answered) * MAX_STARS);
  }

  private resolve(verdict: 'right' | 'wrong'): Verdict {
    this.resolved = true;
    if (verdict === 'right') {
      this.rightCount++;
    } else {
      this.wrongCount++;
      const missed = this.current;
      if (missed !== null && !this.retried.has(missed.prompt)) {
        this.retried.add(missed.prompt);
        this.queue.push(missed);
      }
    }
    return verdict;
  }
}

export function applyPoints(score: number, verdict: 'right' | 'wrong'): number {
  return Math.max(0, score + (verdict === 'right' ? POINTS_RIGHT : POINTS_WRONG));
}
