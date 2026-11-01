import type { Context, ScreenFactory } from './app';
import { button, el, type Lifetime } from './dom';
import { MISSIONS, missionAvailable } from './missions';
import { AVATAR_NAMES, AVATAR_SHEETS, sprite } from './sprites';
import { topBar } from './top-bar';

function heroButton(context: Context): HTMLElement {
  const avatar = context.store.state.avatar ?? 'dude';
  const node = button('', () => context.go({ name: 'avatar' }), {
    className: 'hero-button',
    ariaLabel: `Change hero (${AVATAR_NAMES[avatar]})`,
  });
  node.append(sprite(AVATAR_SHEETS[avatar], 'hero-button__sprite'));
  return node;
}

export function missionHeader(
  context: Context,
  life: Lifetime,
  { onBack, title }: { onBack: () => void; title: string }
): HTMLElement[] {
  return [
    topBar(context, life, { onBack, showScore: true }),
    el('div', { className: 'screen__heading-row' }, [
      heroButton(context),
      el('h2', { className: 'heading', text: title }),
    ]),
  ];
}

export const missionsScreen: ScreenFactory = (context, life) => {
  const { settings } = context.store.state;
  const options = MISSIONS.map((mission) => {
    const available = missionAvailable(mission, settings);
    const node = button(mission.label, () => context.go({ name: 'map', missionId: mission.id }), {
      className: `mission mission--${mission.id}`,
      ariaLabel: available
        ? `Mission ${mission.label}`
        : `Mission ${mission.label}, turned off in settings`,
      disabled: !available,
    });
    return node;
  });

  return el('section', { className: 'screen screen--map' }, [
    ...missionHeader(context, life, {
      onBack: () => context.go({ name: 'title' }),
      title: 'Choose your mission',
    }),
    el('div', { className: 'missions' }, options),
    options.every((option) => option.disabled)
      ? el('p', {
          className: 'notice',
          text: 'Every mission is turned off. Turn some on in Settings.',
        })
      : null,
  ]);
};
