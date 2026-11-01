import type { ScreenFactory } from './app';
import { el, image } from './dom';
import { MISSIONS, levelAvailable, levelKey, type Level } from './missions';
import { MAX_STARS } from './round';
import { missionHeader } from './screen-missions';
import { TABLE_COUNT } from './settings';

export function starsText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(MAX_STARS - stars);
}

export const levelMapScreen: ScreenFactory = (context, life, route) => {
  const mission =
    MISSIONS.find((candidate) => route.name === 'map' && candidate.id === route.missionId) ??
    MISSIONS[0];
  if (mission === undefined) throw new Error('No missions defined');
  const { settings, bestStars } = context.store.state;

  const castle = (level: Level): HTMLButtonElement => {
    const available = levelAvailable(level, settings);
    const best = bestStars[levelKey(mission, level)];
    const isBoss = level === 'boss';
    const label = isBoss ? 'Skull castle: every number' : `Castle ${level}`;
    const node = el(
      'button',
      {
        className: `castle ${isBoss ? 'castle--boss' : ''}`,
        attrs: {
          type: 'button',
          'aria-label': `${label}${available ? '' : ', turned off in settings'}${best === undefined ? '' : `, best ${best} of ${MAX_STARS} stars`}`,
        },
        onClick: () => context.go({ name: 'battle', missionId: mission.id, level }),
      },
      [
        image(
          isBoss ? './assets/images/skull-castle.png' : './assets/images/little-castle.png',
          '',
          'castle__image'
        ),
        isBoss ? null : el('span', { className: 'castle__number', text: String(level) }),
        best === undefined
          ? null
          : el('span', { className: 'castle__stars', text: starsText(best) }),
      ]
    );
    node.disabled = !available;
    return node;
  };

  const tables = Array.from({ length: TABLE_COUNT }, (_, index) => castle(index + 1));

  return el('section', { className: 'screen screen--map' }, [
    ...missionHeader(context, life, {
      onBack: () => context.go({ name: 'missions' }),
      title: `Mission ${mission.label}`,
    }),
    el('div', { className: 'level-map' }, [
      castle('boss'),
      el('div', { className: 'level-map__grid' }, tables),
    ]),
  ]);
};
