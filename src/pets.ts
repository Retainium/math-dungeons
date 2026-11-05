export const MAX_PETS = 3;
export const PET_PRICE = 30;
export const FOOD_PRICE = 5;

const HOUR_MS = 60 * 60 * 1000;
/** Unfed this long and the pet runs away. */
export const RUN_AWAY_MS = 3 * 24 * HOUR_MS;
/** Fed this recently and the pet is too full to eat. */
const FULL_MS = 2 * HOUR_MS;
/** Below this fullness the pet looks hungry and the game nags. */
const HUNGRY_BELOW = 1 / 3;

export const DRAGON_COLORS = ['green', 'purple', 'red', 'blue'] as const;
export type DragonColor = (typeof DRAGON_COLORS)[number];

export const PET_NAMES = [
  'Ember',
  'Spark',
  'Pebble',
  'Sprout',
  'Ziggy',
  'Blaze',
  'Mochi',
  'Comet',
  'Pickle',
  'Nugget',
  'Biscuit',
  'Scales',
] as const;

const MAX_NAME_LENGTH = 12;

export interface Pet {
  id: string;
  name: string;
  color: DragonColor;
  /** Epoch milliseconds. */
  lastFed: number;
}

export interface PetState {
  score: number;
  pets: Pet[];
  /** Names of pets that ran away and haven't been told about yet. */
  runaways: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePet(value: unknown, now: number): Pet | null {
  if (!isRecord(value)) return null;
  const { id, name, color, lastFed } = value;
  const dragonColor = DRAGON_COLORS.find((option) => option === color);
  if (
    typeof id !== 'string' ||
    id === '' ||
    typeof name !== 'string' ||
    name.trim() === '' ||
    dragonColor === undefined ||
    typeof lastFed !== 'number' ||
    !Number.isFinite(lastFed)
  ) {
    return null;
  }
  return {
    id,
    name: name.trim().slice(0, MAX_NAME_LENGTH),
    color: dragonColor,
    lastFed: Math.min(lastFed, now),
  };
}

export function parsePets(value: unknown, now: number): Pet[] {
  if (!Array.isArray(value)) return [];
  const pets: Pet[] = [];
  for (const item of value) {
    const pet = parsePet(item, now);
    if (pet !== null && !pets.some((other) => other.id === pet.id)) pets.push(pet);
  }
  return pets.slice(0, MAX_PETS);
}

export function parseRunaways(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((name): name is string => typeof name === 'string' && name !== '');
}

/** 1 just after a meal, falling to 0 when the pet runs away. */
export function fullness(pet: Pet, now: number): number {
  const elapsed = Math.max(0, now - pet.lastFed);
  return Math.max(0, 1 - elapsed / RUN_AWAY_MS);
}

export function isHungry(pet: Pet, now: number): boolean {
  return fullness(pet, now) < HUNGRY_BELOW;
}

export function isFull(pet: Pet, now: number): boolean {
  return now - pet.lastFed < FULL_MS;
}

export function needsPetCare(state: PetState, now: number): boolean {
  return state.runaways.length > 0 || state.pets.some((pet) => isHungry(pet, now));
}

/** Moves pets that went unfed too long into `runaways`. Returns `state` itself when nothing changed. */
export function settlePets<T extends PetState>(state: T, now: number): T {
  const gone = state.pets.filter((pet) => fullness(pet, now) <= 0);
  if (gone.length === 0) return state;
  return {
    ...state,
    pets: state.pets.filter((pet) => !gone.includes(pet)),
    runaways: [...state.runaways, ...gone.map((pet) => pet.name)],
  };
}

export function canAdopt(state: PetState): boolean {
  return state.pets.length < MAX_PETS && state.score >= PET_PRICE;
}

export function adopt<T extends PetState>(
  state: T,
  choice: { id: string; name: string; color: DragonColor },
  now: number
): T {
  if (!canAdopt(state)) return state;
  const name = choice.name.trim().slice(0, MAX_NAME_LENGTH);
  if (name === '') return state;
  return {
    ...state,
    score: state.score - PET_PRICE,
    pets: [...state.pets, { id: choice.id, name, color: choice.color, lastFed: now }],
  };
}

export type FeedProblem = 'missing' | 'full' | 'poor';

export function feedProblem(state: PetState, petId: string, now: number): FeedProblem | null {
  const pet = state.pets.find((candidate) => candidate.id === petId);
  if (pet === undefined) return 'missing';
  if (isFull(pet, now)) return 'full';
  if (state.score < FOOD_PRICE) return 'poor';
  return null;
}

export function feed<T extends PetState>(state: T, petId: string, now: number): T {
  if (feedProblem(state, petId, now) !== null) return state;
  return {
    ...state,
    score: state.score - FOOD_PRICE,
    pets: state.pets.map((pet) => (pet.id === petId ? { ...pet, lastFed: now } : pet)),
  };
}

/** A name none of the current pets has, so they can be told apart. */
export function suggestName(pets: readonly Pet[], random: () => number = Math.random): string {
  const taken = new Set(pets.map((pet) => pet.name));
  const free = PET_NAMES.filter((name) => !taken.has(name));
  const pool = free.length > 0 ? free : PET_NAMES;
  return pool[Math.floor(random() * pool.length)] ?? PET_NAMES[0];
}

export function nextPetId(pets: readonly Pet[], now: number): string {
  let id = `pet-${now.toString(36)}`;
  while (pets.some((pet) => pet.id === id)) id += 'x';
  return id;
}
