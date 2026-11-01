import { el } from './dom';
import type { Avatar } from './store';

export interface SpriteSheet {
  url: string;
  frames: number;
  /** Frames laid out left to right (`row`) or top to bottom (`column`). */
  layout: 'row' | 'column';
  frameWidth: number;
  frameHeight: number;
}

export const TROLL: SpriteSheet = {
  url: './assets/images/troll.png',
  frames: 9,
  layout: 'row',
  frameWidth: 505,
  frameHeight: 526,
};

export const KNIFE: SpriteSheet = {
  url: './assets/images/knife.png',
  frames: 2,
  layout: 'row',
  frameWidth: 331,
  frameHeight: 696,
};

export const AVATAR_SHEETS: Record<Avatar, SpriteSheet> = {
  dude: {
    url: './assets/images/dude.png',
    frames: 3,
    layout: 'row',
    frameWidth: 453,
    frameHeight: 627,
  },
  dudette: {
    url: './assets/images/dudette.png',
    frames: 3,
    layout: 'column',
    frameWidth: 460,
    frameHeight: 627,
  },
};

export const AVATAR_NAMES: Record<Avatar, string> = { dude: 'Knight Max', dudette: 'Knight Mia' };

/**
 * A div showing one frame of a sprite sheet. Add `sprite--walk` or `sprite--blink`
 * to animate it (see styles.css).
 */
export function sprite(sheet: SpriteSheet, className: string, label?: string): HTMLDivElement {
  const node = el('div', {
    className: `sprite sprite--${sheet.layout} ${className}`,
    attrs: label === undefined ? { 'aria-hidden': 'true' } : { role: 'img', 'aria-label': label },
  });
  const size =
    sheet.layout === 'row' ? `${sheet.frames * 100}% 100%` : `100% ${sheet.frames * 100}%`;
  node.style.backgroundImage = `url("${sheet.url}")`;
  node.style.backgroundSize = size;
  node.style.aspectRatio = `${sheet.frameWidth} / ${sheet.frameHeight}`;
  node.style.setProperty('--frames', String(sheet.frames));
  return node;
}

export function setFrame(node: HTMLElement, sheet: SpriteSheet, frame: number): void {
  const position = sheet.frames <= 1 ? 0 : (frame / (sheet.frames - 1)) * 100;
  if (sheet.layout === 'row') {
    node.style.backgroundPosition = `${position}% 0%`;
  } else {
    node.style.backgroundPosition = `0% ${position}%`;
  }
}
