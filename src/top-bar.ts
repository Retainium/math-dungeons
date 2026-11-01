import type { Context } from './app';
import { button, el, image, type Lifetime } from './dom';

interface TopBarOptions {
  onBack?: () => void;
  showScore?: boolean;
}

const TOGGLES = {
  sound: { label: 'Sound effects', icon: '🔊' },
  music: { label: 'Music', icon: '🎵' },
} as const;

function toggle(context: Context, life: Lifetime, key: keyof typeof TOGGLES): HTMLButtonElement {
  const { store } = context;
  const { label, icon } = TOGGLES[key];
  const node = button(icon, () => store.update((data) => ({ ...data, [key]: !data[key] })), {
    className: 'btn--icon',
    ariaLabel: label,
  });
  const sync = (): void => {
    node.setAttribute('aria-pressed', String(store.state[key]));
    node.classList.toggle('is-off', !store.state[key]);
  };
  sync();
  life.onClose(store.subscribe(sync));
  return node;
}

function scoreBadge(context: Context, life: Lifetime): HTMLElement {
  const value = el('span', { className: 'score__value', text: String(context.store.state.score) });
  const badge = el('div', { className: 'score', attrs: { 'aria-label': 'Gold' } }, [
    image('./assets/images/money-bag.svg', '', 'score__bag'),
    value,
  ]);
  life.onClose(
    context.store.subscribe((data) => {
      value.textContent = String(data.score);
    })
  );
  return badge;
}

export function topBar(context: Context, life: Lifetime, options: TopBarOptions = {}): HTMLElement {
  return el('div', { className: 'top-bar' }, [
    el('div', { className: 'top-bar__group' }, [
      toggle(context, life, 'sound'),
      toggle(context, life, 'music'),
    ]),
    options.showScore === true ? scoreBadge(context, life) : null,
    options.onBack !== undefined
      ? button('↩', options.onBack, { className: 'btn--icon', ariaLabel: 'Back' })
      : el('span', { className: 'top-bar__spacer' }),
  ]);
}
