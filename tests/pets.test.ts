import {
  DRAGON_COLORS,
  FOOD_PRICE,
  MAX_PETS,
  PET_NAMES,
  PET_PRICE,
  RUN_AWAY_MS,
  adopt,
  canAdopt,
  feed,
  feedProblem,
  fullness,
  isFull,
  isHungry,
  needsPetCare,
  nextPetId,
  parsePets,
  parseRunaways,
  settlePets,
  suggestName,
  type Pet,
  type PetState,
} from '../src/pets';
import { describe, expect, it } from 'vitest';

const NOW = 1_700_000_000_000;

function pet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: 'pet-1',
    name: 'Ember',
    color: 'green',
    lastFed: NOW,
    ...overrides,
  };
}

function state(overrides: Partial<PetState> = {}): PetState {
  return { score: 100, pets: [], runaways: [], ...overrides };
}

describe('parsePets', () => {
  it('keeps valid pets and drops junk, duplicates and extras', () => {
    const pets = parsePets(
      [
        pet(),
        { id: 'pet-1', name: 'Copy', color: 'red', lastFed: NOW },
        { id: 'pet-2', name: '  Spark  ', color: 'purple', lastFed: NOW + 10_000 },
        { nope: true },
        pet({ id: 'pet-3', name: 'Pebble', color: 'blue' }),
        pet({ id: 'pet-4', name: 'Ziggy', color: 'red' }),
      ],
      NOW
    );

    expect(pets).toEqual([
      pet(),
      pet({ id: 'pet-2', name: 'Spark', color: 'purple', lastFed: NOW }),
      pet({ id: 'pet-3', name: 'Pebble', color: 'blue' }),
    ]);
  });

  it('returns an empty list for missing data', () => {
    expect(parsePets(null, NOW)).toEqual([]);
    expect(parseRunaways('nope')).toEqual([]);
  });
});

describe('hunger', () => {
  it('is full right after a meal and hungry after two days', () => {
    const fed = pet({ lastFed: NOW });
    const peckish = pet({ lastFed: NOW - RUN_AWAY_MS / 2 });
    const starving = pet({ lastFed: NOW - RUN_AWAY_MS * 0.8 });

    expect(isFull(fed, NOW)).toBe(true);
    expect(isHungry(fed, NOW)).toBe(false);
    expect(fullness(fed, NOW)).toBe(1);

    expect(isFull(peckish, NOW)).toBe(false);
    expect(isHungry(peckish, NOW)).toBe(false);
    expect(fullness(peckish, NOW)).toBeCloseTo(0.5);

    expect(isHungry(starving, NOW)).toBe(true);
    expect(fullness(starving, NOW)).toBeCloseTo(0.2);
  });

  it('moves unfed pets into the runaway list', () => {
    const kept = pet({ id: 'stay', lastFed: NOW });
    const gone = pet({ id: 'gone', name: 'Spark', lastFed: NOW - RUN_AWAY_MS });
    const next = settlePets(state({ pets: [kept, gone] }), NOW);

    expect(next.pets).toEqual([kept]);
    expect(next.runaways).toEqual(['Spark']);
  });

  it('returns the same object when nobody ran away', () => {
    const current = state({ pets: [pet()] });
    expect(settlePets(current, NOW)).toBe(current);
  });
});

describe('shop', () => {
  it('adopts a dragon when there is gold and a free bed', () => {
    const next = adopt(state({ score: PET_PRICE }), { id: 'pet-1', name: ' Ember ', color: 'red' }, NOW);

    expect(next.score).toBe(0);
    expect(next.pets).toEqual([pet({ color: 'red' })]);
    expect(canAdopt(next)).toBe(false);
  });

  it('refuses to adopt without gold, a name, or a free bed', () => {
    const poor = state({ score: PET_PRICE - 1 });
    const nameless = state({ score: PET_PRICE });
    const full = state({
      pets: [pet({ id: 'a' }), pet({ id: 'b' }), pet({ id: 'c' })],
    });

    expect(canAdopt(poor)).toBe(false);
    expect(adopt(poor, { id: 'x', name: 'Ember', color: 'green' }, NOW)).toBe(poor);
    expect(adopt(nameless, { id: 'x', name: '   ', color: 'green' }, NOW)).toBe(nameless);
    expect(canAdopt(full)).toBe(false);
    expect(full.pets).toHaveLength(MAX_PETS);
  });

  it('feeds a hungry dragon and blocks a second snack', () => {
    const hungry = state({
      score: FOOD_PRICE,
      pets: [pet({ lastFed: NOW - RUN_AWAY_MS / 2 })],
    });
    const fed = feed(hungry, 'pet-1', NOW);

    expect(fed.score).toBe(0);
    expect(fed.pets[0]?.lastFed).toBe(NOW);
    expect(feedProblem(fed, 'pet-1', NOW)).toBe('full');
    expect(feed(fed, 'pet-1', NOW)).toBe(fed);
    expect(feedProblem(hungry, 'missing', NOW)).toBe('missing');
    expect(feedProblem(state({ score: 0, pets: [pet({ lastFed: NOW - RUN_AWAY_MS / 2 })] }), 'pet-1', NOW)).toBe(
      'poor'
    );
  });
});

describe('names', () => {
  it('picks an unused name from the list', () => {
    const taken = [pet({ name: PET_NAMES[0] })];
    expect(suggestName(taken, () => 0)).toBe(PET_NAMES[1]);
  });

  it('makes a unique id', () => {
    expect(nextPetId([pet({ id: `pet-${NOW.toString(36)}` })], NOW)).toBe(`pet-${NOW.toString(36)}x`);
  });

  it('flags hungry pets and unread runaways as needing care', () => {
    expect(needsPetCare(state(), NOW)).toBe(false);
    expect(needsPetCare(state({ runaways: ['Ember'] }), NOW)).toBe(true);
    expect(
      needsPetCare(state({ pets: [pet({ lastFed: NOW - RUN_AWAY_MS * 0.8 })] }), NOW)
    ).toBe(true);
  });

  it('keeps the colour list complete', () => {
    expect(DRAGON_COLORS).toEqual(['green', 'purple', 'red', 'blue']);
  });
});
