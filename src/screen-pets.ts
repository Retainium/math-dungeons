import type { Context, ScreenFactory } from './app';
import { button, el, prefersReducedMotion, type Lifetime } from './dom';
import { dragonArt } from './dragon';
import {
  DRAGON_COLORS,
  FOOD_PRICE,
  MAX_PETS,
  PET_PRICE,
  adopt,
  canAdopt,
  feed,
  feedProblem,
  fullness,
  isHungry,
  nextPetId,
  settlePets,
  suggestName,
  type DragonColor,
  type Pet,
} from './pets';
import { topBar } from './top-bar';

const COLOR_NAMES: Record<DragonColor, string> = {
  green: 'Green',
  purple: 'Purple',
  red: 'Red',
  blue: 'Blue',
};

const NEW_TAB = 'new';
const LAP_STEPS = 24;
const LAPS = 2;
const RUN_MS = 2600;

/** Keyframes for running laps of an oval that starts and ends where the pet stands. */
function lapKeyframes(width: number, height: number): Keyframe[] {
  const frames: Keyframe[] = [];
  const steps = LAP_STEPS * LAPS;
  const radiusX = width * 0.4;
  const radiusY = height * 0.12;
  for (let step = 0; step <= steps; step++) {
    const angle = (step / LAP_STEPS) * 2 * Math.PI;
    const x = radiusX * Math.sin(angle);
    const y = -radiusY * (1 - Math.cos(angle)) - Math.abs(Math.sin(angle * 4)) * height * 0.04;
    const depth = 1 - 0.18 * ((1 - Math.cos(angle)) / 2);
    const facing = Math.cos(angle) >= 0 ? 1 : -1;
    frames.push({
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(facing * depth).toFixed(3)}, ${depth.toFixed(3)})`,
    });
  }
  return frames;
}

function tummyLabel(pet: Pet, now: number): string {
  const level = fullness(pet, now);
  if (level > 0.85) return 'Full and happy';
  if (!isHungry(pet, now)) return 'A little peckish';
  return level < 0.15 ? 'Starving! Feed me or I’ll run away!' : 'Hungry!';
}

function settle(context: Context): void {
  const now = Date.now();
  if (settlePets(context.store.state, now) !== context.store.state) {
    context.store.update((data) => settlePets(data, now));
  }
}

function petPen(
  color: DragonColor,
  label: string,
  onTap: () => void
): {
  node: HTMLElement;
  pet: HTMLButtonElement;
  art: SVGSVGElement;
  layer: HTMLElement;
  bubble: HTMLElement;
} {
  const art = dragonArt(color, 'pet__art');
  const pet = button('', onTap, { className: 'pet', ariaLabel: label });
  pet.append(art);
  const layer = el('div', { className: 'pen__floats', attrs: { 'aria-hidden': 'true' } });
  const bubble = el('p', { className: 'pen__bubble', attrs: { 'aria-live': 'polite' } });
  const node = el('div', { className: 'pen' }, [bubble, layer, pet]);
  return { node, pet, art, layer, bubble };
}

function petTab(
  id: string,
  label: string,
  ariaLabel: string,
  selected: string,
  onSelect: (id: string) => void
): HTMLButtonElement {
  const node = button(label, () => onSelect(id), { className: 'chip pet-tab', ariaLabel });
  node.setAttribute('role', 'tab');
  node.setAttribute('aria-selected', String(selected === id));
  node.setAttribute('aria-pressed', String(selected === id));
  return node;
}

function cqwPx(value: number): number {
  const stage = document.querySelector('.stage');
  return ((stage?.clientWidth ?? 400) / 100) * value;
}

function floatUp(life: Lifetime, layer: HTMLElement, text: string, xCqw: number): void {
  const node = el('span', { className: 'pen__float', text });
  node.style.left = `${cqwPx(xCqw)}px`;
  layer.append(node);
  const rise = cqwPx(22);
  const animation = life.animate(
    node,
    [
      { transform: 'translateY(0) scale(0.6)', opacity: 0 },
      { transform: `translateY(${-rise * 0.28}px) scale(1)`, opacity: 1, offset: 0.25 },
      { transform: `translateY(${-rise}px) scale(1.1)`, opacity: 0 },
    ],
    { duration: 1300, easing: 'ease-out' }
  );
  const remove = (): void => node.remove();
  animation.addEventListener('finish', remove);
  animation.addEventListener('cancel', remove);
}

export const petsScreen: ScreenFactory = (context, life) => {
  const { store } = context;
  settle(context);

  let selected: string = store.state.pets[0]?.id ?? NEW_TAB;
  let draftColor: DragonColor = DRAGON_COLORS[0];
  let draftName = suggestName(store.state.pets);
  let busy = false;

  const chooseTab = (id: string): void => {
    if (busy || selected === id) return;
    selected = id;
    render();
  };

  const notice = el('div', { attrs: { role: 'status' } });
  const tabs = el('div', { className: 'pet-tabs', attrs: { role: 'tablist' } });
  const body = el('div', { className: 'pets__body' });

  function renderNotice(): void {
    const { runaways } = store.state;
    if (runaways.length === 0) {
      notice.replaceChildren();
      return;
    }
    const names = runaways.join(' and ');
    notice.replaceChildren(
      el('div', { className: 'panel pets__runaway' }, [
        el('p', { className: 'pets__runaway-face', text: '😢' }),
        el('p', {
          className: 'pets__runaway-text',
          text: `${names} ran away because you didn’t feed ${runaways.length > 1 ? 'them' : 'it'}.`,
        }),
        button('OK', () => store.update((data) => ({ ...data, runaways: [] })), {
          className: 'btn--secondary',
        }),
      ])
    );
  }

  function renderTabs(): void {
    const now = Date.now();
    const { pets } = store.state;
    const nodes = pets.map((pet) => {
      const hungry = isHungry(pet, now);
      const label = hungry ? `${pet.name} ❗` : pet.name;
      return petTab(pet.id, label, hungry ? `${pet.name}, hungry` : pet.name, selected, chooseTab);
    });
    if (pets.length < MAX_PETS) {
      nodes.push(petTab(NEW_TAB, '＋ New', 'Adopt a new dragon', selected, chooseTab));
    }
    tabs.replaceChildren(...nodes);
  }

  function say(bubble: HTMLElement, text: string): void {
    bubble.textContent = text;
    const dip = cqwPx(2);
    life.animate(
      bubble,
      [
        { opacity: 0, transform: `translate(-50%, ${dip}px) scale(0.8)` },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.15 },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)', offset: 0.8 },
        { opacity: 0, transform: 'translate(-50%, 0) scale(1)' },
      ],
      { duration: 1800, easing: 'ease-out' }
    );
  }

  function renderPet(pet: Pet): HTMLElement[] {
    const view = petPen(pet.color, `Pat ${pet.name}`, () => pat());
    const meterFill = el('span', { className: 'tummy__fill' });
    const meter = el('div', { className: 'tummy', attrs: { role: 'meter', 'aria-label': 'Tummy' } }, [
      meterFill,
    ]);
    const status = el('p', { className: 'pets__status' });
    const feedButton = button(`🍖 Feed  ${FOOD_PRICE}`, () => eat(), {
      className: 'btn--primary pets__action',
      ariaLabel: `Feed ${pet.name} for ${FOOD_PRICE} gold`,
    });
    const patButton = button('🤚 Pat', () => pat(), {
      className: 'btn--secondary pets__action',
      ariaLabel: `Pat ${pet.name}`,
    });

    const current = (): Pet | undefined => store.state.pets.find((candidate) => candidate.id === pet.id);

    function refresh(): void {
      const latest = current();
      if (latest === undefined) return;
      const now = Date.now();
      const level = fullness(latest, now);
      meterFill.style.width = `${Math.round(level * 100)}%`;
      meter.classList.toggle('is-low', isHungry(latest, now));
      meter.setAttribute('aria-valuenow', String(Math.round(level * 100)));
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
      status.textContent = tummyLabel(latest, now);
      view.art.classList.toggle('is-hungry', isHungry(latest, now));
      feedButton.disabled = busy || store.state.score < FOOD_PRICE;
      patButton.disabled = busy;
    }

    function finish(): void {
      busy = false;
      view.art.classList.remove('is-happy');
      refresh();
      renderTabs();
    }

    function hearts(count: number): void {
      for (let index = 0; index < count; index++) {
        life.later(index * 220, () => floatUp(life, view.layer, '💖', 30 + Math.random() * 26));
      }
    }

    function pat(): void {
      if (busy) return;
      busy = true;
      refresh();
      view.art.classList.add('is-happy');
      context.audio.play('whoosh');
      hearts(5);
      if (prefersReducedMotion()) {
        life.later(1200, finish);
        return;
      }
      const box = view.pet.getBoundingClientRect();
      const run = life.animate(view.pet, lapKeyframes(box.width, box.height), {
        duration: RUN_MS,
        easing: 'linear',
      });
      run.addEventListener('finish', finish);
    }

    function eat(): void {
      if (busy) return;
      const problem = feedProblem(store.state, pet.id, Date.now());
      if (problem === 'full') {
        say(view.bubble, `${pet.name} is full! 😋`);
        return;
      }
      if (problem !== null) return;
      busy = true;
      store.update((data) => feed(data, pet.id, Date.now()));
      refresh();
      const food = el('span', { className: 'pen__food', text: '🍖', attrs: { 'aria-hidden': 'true' } });
      view.node.append(food);
      const drop = life.animate(
        food,
        [
          { transform: `translate(0, ${-cqwPx(30)}px) rotate(-30deg)`, opacity: 0 },
          { transform: `translate(0, ${-cqwPx(16)}px) rotate(0deg)`, opacity: 1, offset: 0.4 },
          { transform: 'translate(0, 0) rotate(20deg) scale(0.4)', opacity: 0 },
        ],
        { duration: 700, easing: 'ease-in' }
      );
      const done = (): void => {
        food.remove();
        view.art.classList.add('is-happy');
        say(view.bubble, 'Yum! 😋');
        hearts(3);
        life.animate(
          view.art,
          [{ transform: 'scale(1)' }, { transform: 'scale(1.08, 0.92)' }, { transform: 'scale(1)' }],
          { duration: 220, iterations: 3 }
        );
        life.later(1100, finish);
      };
      drop.addEventListener('finish', done);
      drop.addEventListener('cancel', () => food.remove());
    }

    refresh();

    return [
      el('h2', { className: 'pets__name', text: pet.name }),
      view.node,
      meter,
      status,
      el('div', { className: 'pets__actions' }, [feedButton, patButton]),
    ];
  }

  function renderShop(): HTMLElement[] {
    const { state } = store;
    const view = petPen(draftColor, `${COLOR_NAMES[draftColor]} dragon`, () => {
      floatUp(life, view.layer, '✨', 40);
    });
    const colors = DRAGON_COLORS.map((color) => {
      const node = button('', () => {
        draftColor = color;
        render();
      }, { className: `chip swatch swatch--${color}`, ariaLabel: `${COLOR_NAMES[color]} dragon` });
      node.setAttribute('aria-pressed', String(color === draftColor));
      return node;
    });
    const full = state.pets.length >= MAX_PETS;
    const poor = state.score < PET_PRICE;
    const adoptButton = button(
      `Adopt for ${PET_PRICE}`,
      () => {
        if (!canAdopt(store.state)) return;
        const now = Date.now();
        const id = nextPetId(store.state.pets, now);
        store.update((data) => adopt(data, { id, name: draftName, color: draftColor }, now));
        selected = id;
        draftName = suggestName(store.state.pets);
        render();
      },
      { className: 'btn--primary', disabled: !canAdopt(state) }
    );

    let reason = '';
    if (full) reason = `You already have ${MAX_PETS} dragons. That’s a lot of mouths to feed!`;
    else if (poor) reason = `You need ${PET_PRICE} gold. Win battles to earn more!`;

    return [
      el('h2', { className: 'pets__name', text: 'Adopt a baby dragon' }),
      view.node,
      el('div', { className: 'pets__name-row' }, [
        el('span', { className: 'pets__draft-name', text: draftName }),
        button(
          '🎲',
          () => {
            draftName = suggestName([...store.state.pets, { id: '', name: draftName, color: draftColor, lastFed: 0 }]);
            render();
          },
          { className: 'btn--icon btn--secondary', ariaLabel: 'Pick another name' }
        ),
      ]),
      el('div', { className: 'chips swatches' }, colors),
      adoptButton,
      el('p', {
        className: 'notice pets__hint',
        text: reason === '' ? 'Feed your dragon at least every 3 days or it will run away!' : reason,
      }),
    ];
  }

  function render(): void {
    if (selected !== NEW_TAB && !store.state.pets.some((pet) => pet.id === selected)) {
      selected = store.state.pets[0]?.id ?? NEW_TAB;
    }
    if (selected === NEW_TAB && store.state.pets.length >= MAX_PETS) {
      selected = store.state.pets[0]?.id ?? NEW_TAB;
    }
    busy = false;
    renderNotice();
    renderTabs();
    const pet = store.state.pets.find((candidate) => candidate.id === selected);
    body.replaceChildren(...(pet === undefined ? renderShop() : renderPet(pet)));
  }

  let petIds = store.state.pets.map((pet) => pet.id).join();
  life.onClose(
    store.subscribe((data) => {
      renderNotice();
      const ids = data.pets.map((pet) => pet.id).join();
      if (ids !== petIds) {
        petIds = ids;
        render();
      }
    })
  );
  life.listen(document, 'visibilitychange', () => {
    if (!document.hidden) settle(context);
  });

  render();

  return el('section', { className: 'screen screen--hallway screen--pets' }, [
    topBar(context, life, { onBack: () => context.go({ name: 'title' }), showScore: true }),
    el('h1', { className: 'heading', text: '🐉 Dragon Den' }),
    notice,
    tabs,
    el('div', { className: 'panel pets' }, [body]),
  ]);
};
