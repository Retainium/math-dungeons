import { MAX_STARS } from './round';
import { normalizeSettings, type Settings } from './settings';

export const AVATARS = ['dude', 'dudette'] as const;
export type Avatar = (typeof AVATARS)[number];

export interface SaveData {
  avatar: Avatar | null;
  score: number;
  /** Best star count per `levelKey`. */
  bestStars: Record<string, number>;
  settings: Settings;
  sound: boolean;
  music: boolean;
}

const STORAGE_KEY = 'math-dungeons:save:v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSave(raw: string | null): SaveData {
  let value: unknown = null;
  try {
    value = raw === null ? null : JSON.parse(raw);
  } catch {
    value = null;
  }
  const data = isRecord(value) ? value : {};

  const avatar = AVATARS.find((option) => option === data['avatar']) ?? null;
  const score = data['score'];
  const bestStars: Record<string, number> = {};
  const rawStars = data['bestStars'];
  if (isRecord(rawStars)) {
    for (const [key, stars] of Object.entries(rawStars)) {
      if (
        typeof stars === 'number' &&
        Number.isInteger(stars) &&
        stars >= 0 &&
        stars <= MAX_STARS
      ) {
        bestStars[key] = stars;
      }
    }
  }
  const sound = data['sound'];
  const music = data['music'];

  return {
    avatar,
    score: typeof score === 'number' && Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0,
    bestStars,
    settings: normalizeSettings(data['settings']),
    sound: typeof sound === 'boolean' ? sound : true,
    music: typeof music === 'boolean' ? music : true,
  };
}

function readStorage(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export type Listener = (data: SaveData) => void;

export class Store {
  private data: SaveData = parseSave(readStorage());
  private readonly listeners = new Set<Listener>();

  get state(): SaveData {
    return this.data;
  }

  update(change: (draft: SaveData) => SaveData): void {
    this.data = change(this.data);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage can be full or blocked (private mode, sandboxed frames); the game still works unsaved.
    }
    for (const listener of this.listeners) listener(this.data);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
