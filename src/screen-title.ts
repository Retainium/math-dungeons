import type { ScreenFactory } from './app';
import { button, el, image } from './dom';
import { needsPetCare, settlePets } from './pets';
import { TROLL, sprite } from './sprites';
import { topBar } from './top-bar';

export const titleScreen: ScreenFactory = (context, life) => {
  const now = Date.now();
  if (settlePets(context.store.state, now) !== context.store.state) {
    context.store.update((data) => settlePets(data, now));
  }

  const play = button(
    '▶ Play',
    () =>
      context.go(context.store.state.avatar === null ? { name: 'avatar' } : { name: 'missions' }),
    { className: 'btn--primary btn--large' }
  );
  play.dataset['autofocus'] = 'true';
  const petsLabel = needsPetCare(context.store.state, now) ? '🐉 Pets ❗' : '🐉 Pets';

  return el('section', { className: 'screen screen--hallway screen--title' }, [
    topBar(context, life, { showScore: true }),
    el('h1', { className: 'title' }, [
      image('./assets/images/title.png', 'Math Dungeons', 'title__image'),
    ]),
    sprite(TROLL, 'title__troll'),
    el('div', { className: 'menu' }, [
      play,
      button(petsLabel, () => context.go({ name: 'pets' }), { className: 'btn--secondary' }),
      button('⚙ Settings', () => context.go({ name: 'settings' }), { className: 'btn--secondary' }),
    ]),
  ]);
};
