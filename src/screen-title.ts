import type { ScreenFactory } from './app';
import { button, el, image } from './dom';
import { TROLL, sprite } from './sprites';
import { topBar } from './top-bar';

export const titleScreen: ScreenFactory = (context, life) => {
  const play = button(
    '▶ Play',
    () =>
      context.go(context.store.state.avatar === null ? { name: 'avatar' } : { name: 'missions' }),
    { className: 'btn--primary btn--large' }
  );
  play.dataset['autofocus'] = 'true';

  return el('section', { className: 'screen screen--hallway screen--title' }, [
    topBar(context, life),
    el('h1', { className: 'title' }, [
      image('./assets/images/title.png', 'Math Dungeons', 'title__image'),
    ]),
    sprite(TROLL, 'title__troll'),
    el('div', { className: 'menu' }, [
      play,
      button('⚙ Settings', () => context.go({ name: 'settings' }), { className: 'btn--secondary' }),
    ]),
  ]);
};
