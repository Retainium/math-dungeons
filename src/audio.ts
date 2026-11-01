import type { Store } from './store';

const SOUND_URLS = {
  boom: './assets/audio/boom.mp3',
  growl: './assets/audio/growl.mp3',
  whoosh: './assets/audio/whoosh.mp3',
} as const;

export type SoundName = keyof typeof SOUND_URLS;

const MUSIC_URL = './assets/audio/music.mp3';
const MUSIC_VOLUME = 0.4;

/**
 * Music and sound effects. Browsers block audio until the first user gesture,
 * so music starts from `unlock()`, which the app calls on the first pointer or key press.
 */
export class GameAudio {
  private readonly effects = new Map<SoundName, HTMLAudioElement>();
  private music: HTMLAudioElement | null = null;
  private unlocked = false;
  private hidden = false;

  constructor(private readonly store: Store) {
    store.subscribe(() => this.syncMusic());
  }

  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.syncMusic();
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.syncMusic();
  }

  play(name: SoundName): void {
    if (!this.store.state.sound) return;
    let effect = this.effects.get(name);
    if (effect === undefined) {
      effect = new Audio(SOUND_URLS[name]);
      this.effects.set(name, effect);
    }
    effect.currentTime = 0;
    void effect.play().catch(() => undefined);
  }

  private syncMusic(): void {
    const shouldPlay = this.unlocked && !this.hidden && this.store.state.music;
    if (!shouldPlay) {
      this.music?.pause();
      return;
    }
    if (this.music === null) {
      this.music = new Audio(MUSIC_URL);
      this.music.loop = true;
      this.music.volume = MUSIC_VOLUME;
    }
    if (this.music.paused) void this.music.play().catch(() => undefined);
  }
}
