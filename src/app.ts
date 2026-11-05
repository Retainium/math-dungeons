import type { GameAudio } from './audio';
import { Lifetime } from './dom';
import type { Level } from './missions';
import type { Store } from './store';

export type Route =
  | { name: 'title' }
  | { name: 'settings' }
  | { name: 'avatar' }
  | { name: 'missions' }
  | { name: 'pets' }
  | { name: 'map'; missionId: string }
  | { name: 'battle'; missionId: string; level: Level };

export interface Context {
  store: Store;
  audio: GameAudio;
  go: (route: Route) => void;
}

export type ScreenFactory = (context: Context, life: Lifetime, route: Route) => HTMLElement;

/** Shows one screen at a time; closing a screen cancels everything it started. */
export class App {
  private life: Lifetime | null = null;
  private readonly context: Context;

  constructor(
    private readonly stage: HTMLElement,
    services: { store: Store; audio: GameAudio },
    private readonly screens: (route: Route) => ScreenFactory
  ) {
    this.context = { ...services, go: (route): void => this.go(route) };
  }

  go(route: Route): void {
    this.life?.close();
    const life = new Lifetime();
    this.life = life;
    const screen = this.screens(route)(this.context, life, route);
    this.stage.replaceChildren(screen);
    const focusTarget =
      screen.querySelector<HTMLElement>('[data-autofocus]') ??
      screen.querySelector<HTMLElement>('button:not([disabled])');
    focusTarget?.focus({ preventScroll: true });
  }
}
