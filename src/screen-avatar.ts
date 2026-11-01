import type { ScreenFactory } from './app';
import { button, el } from './dom';
import { AVATAR_NAMES, AVATAR_SHEETS, sprite } from './sprites';
import { AVATARS, type Avatar } from './store';
import { topBar } from './top-bar';

export const avatarScreen: ScreenFactory = (context, life) => {
  let index = Math.max(0, AVATARS.indexOf(context.store.state.avatar ?? 'dude'));
  const current = (): Avatar => AVATARS[index] ?? 'dude';

  const holder = el('div', { className: 'avatar-picker__hero' });
  const name = el('p', { className: 'avatar-picker__name', attrs: { 'aria-live': 'polite' } });
  const render = (): void => {
    holder.replaceChildren(
      sprite(AVATAR_SHEETS[current()], 'avatar sprite--blink', AVATAR_NAMES[current()])
    );
    name.textContent = AVATAR_NAMES[current()];
  };
  const step = (delta: number): void => {
    index = (index + delta + AVATARS.length) % AVATARS.length;
    render();
  };
  render();

  const confirm = button(
    '✔ Choose',
    () => {
      context.store.update((data) => ({ ...data, avatar: current() }));
      context.go({ name: 'missions' });
    },
    { className: 'btn--primary btn--large' }
  );
  confirm.dataset['autofocus'] = 'true';

  return el('section', { className: 'screen screen--map' }, [
    topBar(context, life, { onBack: () => context.go({ name: 'title' }) }),
    el('h2', { className: 'heading', text: 'Choose your hero' }),
    el('div', { className: 'avatar-picker' }, [
      button('◀', () => step(-1), {
        className: 'btn--icon btn--round',
        ariaLabel: 'Previous hero',
      }),
      holder,
      button('▶', () => step(1), { className: 'btn--icon btn--round', ariaLabel: 'Next hero' }),
    ]),
    name,
    el('div', { className: 'menu' }, [confirm]),
  ]);
};
