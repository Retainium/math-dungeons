import type { Context, ScreenFactory } from './app';
import { button, el, image, prefersReducedMotion, type Lifetime } from './dom';
import { MISSIONS, levelKey, questionSpec, type Level, type Mission } from './missions';
import { generateQuestions } from './questions';
import { MAX_STARS, Round, applyPoints } from './round';
import { starsText } from './screen-level-map';
import type { Difficulty } from './settings';
import { AVATAR_SHEETS, KNIFE, TROLL, setFrame, sprite } from './sprites';
import { topBar } from './top-bar';
import { createWheel, type TapPoint } from './wheel';

/** How long the troll takes to reach you. */
const APPROACH_MS: Record<Difficulty, number> = { easy: 12_000, normal: 8_000, hard: 6_000 };
/** Share of the approach after which the hint bubble shows the answer. */
const HINT_AT = 0.6;
const THROW_MS = 750;
/** Near-even speed with a slight slowdown at the end, so the whole flight and spin read. */
const THROW_EASING = 'cubic-bezier(0.3, 0.3, 0.45, 1)';
const AFTER_RIGHT_MS = 1_300;
const AFTER_WRONG_MS = 1_900;
const VICTORY_STARS = 3;

/** Knife flight, as fractions of the stage box: thrown from near the bottom, misses fly off top-left. */
const KNIFE_START_FROM_BOTTOM = 0.2;
const KNIFE_MISS = { x: -0.1, y: 0.2 };
/** The troll's gut, just above its belt (which sits at about 0.67 of the sprite height). */
const TROLL_AIM_Y = 0.6;
/** The art is drawn hilt up, so a hit must end on an odd half turn to stick point up. */
const KNIFE_SPIN = { hit: 540, miss: 140 };
const KNIFE_HIT_SCALE = { min: 0.3, ofTroll: 0.6 };
const KNIFE_MISS_SCALE = 0.8;

/** Troll pose: vertical centre (% of stage height) and scale, far and near. */
const FAR = { y: 22, scale: 0.22 };
const NEAR = { y: 56, scale: 1.15 };

function trollTransform(pose: { y: number; scale: number }): string {
  return `translate(-50%, -50%) translateY(${pose.y}cqh) scale(${pose.scale})`;
}

type Phase = 'asking' | 'resolving' | 'finished';

function resultTitle(round: Round): string {
  if (round.stars >= VICTORY_STARS) return 'Victory!';
  return round.answered === 0 ? 'No answers' : 'Keep practising!';
}

function results(
  context: Context,
  round: Round,
  { mission, level, best }: { mission: Mission; level: Level; best: number }
): HTMLElement {
  const avatar = context.store.state.avatar ?? 'dude';
  const again = button(
    '↻ Play again',
    () => context.go({ name: 'battle', missionId: mission.id, level }),
    { className: 'btn--primary' }
  );
  again.dataset['autofocus'] = 'true';
  const title = resultTitle(round);
  return el(
    'div',
    {
      className: 'results panel',
      attrs: { role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Results' },
    },
    [
      el('h2', { className: 'heading', text: title }),
      sprite(AVATAR_SHEETS[avatar], 'results__avatar sprite--blink'),
      el('p', {
        className: 'results__stars',
        text: starsText(round.stars),
        attrs: { 'aria-label': `${round.stars} of ${MAX_STARS} stars` },
      }),
      el('p', { className: 'results__tally', text: `${round.right} right · ${round.wrong} wrong` }),
      best > 0 ? el('p', { className: 'results__best', text: `Best: ${starsText(best)}` }) : null,
      el('div', { className: 'menu' }, [
        again,
        button('Map', () => context.go({ name: 'map', missionId: mission.id }), {
          className: 'btn--secondary',
        }),
      ]),
    ]
  );
}

function emptyState(context: Context, life: Lifetime, mission: Mission): HTMLElement {
  return el('section', { className: 'screen screen--hallway' }, [
    topBar(context, life, { onBack: () => context.go({ name: 'map', missionId: mission.id }) }),
    el('div', { className: 'panel' }, [
      el('p', {
        className: 'notice',
        text: 'There are no questions for this castle with the current settings.',
      }),
      button('⚙ Settings', () => context.go({ name: 'settings' }), { className: 'btn--primary' }),
    ]),
  ]);
}

export const battleScreen: ScreenFactory = (context, life, route) => {
  if (route.name !== 'battle') throw new Error('battleScreen needs a battle route');
  const found = MISSIONS.find((candidate) => candidate.id === route.missionId) ?? MISSIONS[0];
  if (found === undefined) throw new Error('No missions defined');
  const mission: Mission = found;
  const { level } = route;
  const { settings } = context.store.state;
  const questions = generateQuestions(questionSpec(mission, level, settings));
  if (questions.length === 0) return emptyState(context, life, mission);

  const round = new Round(questions);
  const reducedMotion = prefersReducedMotion();
  const approachMs = APPROACH_MS[settings.difficulty];
  let phase: Phase = 'asking';
  let approach: Animation | null = null;
  /** The defeat fade holds opacity at 0 until cancelled, overriding inline styles. */
  let defeat: Animation | null = null;

  const backdrop = image('./assets/images/hallway.png', '', 'battle__backdrop');
  const troll = sprite(TROLL, 'troll');
  const knife = sprite(KNIFE, 'knife');
  const hintText = el('span', { className: 'hint__text' });
  const hint = el('div', { className: 'hint', attrs: { 'aria-hidden': 'true' } }, [
    image('./assets/images/hint-bubble.svg', '', 'hint__bubble'),
    hintText,
  ]);
  const prompt = el('p', { className: 'question__prompt' });
  const answer = el('p', { className: 'question__answer' });
  const announcer = el('p', { className: 'visually-hidden', attrs: { 'aria-live': 'assertive' } });
  const question = el('div', { className: 'question' }, [prompt, answer]);
  const stage = el('div', { className: 'battle' });

  const wheel = createWheel(life, (digit, from) => enter(digit, from));

  const setHint = (visible: boolean): void => {
    hint.classList.toggle('is-visible', visible);
  };

  const resetKnife = (): void => {
    knife.getAnimations().forEach((animation) => animation.cancel());
    setFrame(knife, KNIFE, 0);
    knife.style.opacity = '1';
  };

  const startQuestion = (): void => {
    const next = round.next();
    if (next === null) {
      finish();
      return;
    }
    phase = 'asking';
    resetKnife();
    setHint(false);
    hintText.textContent = next.answer;
    prompt.textContent = `${next.prompt} =`;
    answer.textContent = '?';
    answer.className = 'question__answer';
    announcer.textContent = `${next.prompt.replace('−', 'minus').replace('×', 'times').replace('÷', 'divided by')} equals?`;
    stage.classList.remove('is-hurt');
    wheel.setEnabled(true);

    approach?.cancel();
    defeat?.cancel();
    defeat = null;
    troll.style.opacity = '1';
    troll.classList.add('sprite--walk');
    approach = life.animate(
      troll,
      [{ transform: trollTransform(FAR) }, { transform: trollTransform(NEAR) }],
      { duration: approachMs, easing: 'ease-in', fill: 'forwards' }
    );
    approach.finished.then(timeOut, () => undefined);
  };

  const trollCenter = (): TapPoint => {
    const rect = troll.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height * TROLL_AIM_Y };
  };

  const throwKnife = (from: TapPoint | null, hit: boolean): Promise<void> => {
    const box = stage.getBoundingClientRect();
    const start = from ?? {
      x: box.left + box.width / 2,
      y: box.bottom - box.height * KNIFE_START_FROM_BOTTOM,
    };
    const target = hit
      ? trollCenter()
      : { x: box.left + box.width * KNIFE_MISS.x, y: box.top + box.height * KNIFE_MISS.y };
    const trollScale = troll.getBoundingClientRect().width / box.width;
    const spin = hit ? KNIFE_SPIN.hit : KNIFE_SPIN.miss;
    const scale = hit
      ? Math.max(KNIFE_HIT_SCALE.min, trollScale * KNIFE_HIT_SCALE.ofTroll)
      : KNIFE_MISS_SCALE;
    const local = (point: TapPoint): string => `${point.x - box.left}px, ${point.y - box.top}px`;
    context.audio.play('whoosh');
    const animation = life.animate(
      knife,
      [
        { transform: `translate(${local(start)}) translate(-50%, -50%) rotate(0deg) scale(1)` },
        {
          transform: `translate(${local(target)}) translate(-50%, -50%) rotate(${spin}deg) scale(${scale})`,
        },
      ],
      { duration: reducedMotion ? 1 : THROW_MS, easing: THROW_EASING, fill: 'forwards' }
    );
    return animation.finished.then(
      () => undefined,
      () => undefined
    );
  };

  const award = (verdict: 'right' | 'wrong'): void => {
    context.store.update((data) => ({ ...data, score: applyPoints(data.score, verdict) }));
  };

  const hurt = (): void => {
    stage.classList.add('is-hurt');
    context.audio.play('boom');
    troll.classList.remove('sprite--walk');
    setFrame(troll, TROLL, 0);
  };

  const settle = (verdict: 'right' | 'wrong', from: TapPoint | null): void => {
    phase = 'resolving';
    wheel.setEnabled(false);
    setHint(false);
    approach?.pause();
    const current = round.question;
    const correct = current?.answer ?? '';
    answer.textContent = verdict === 'right' ? `${round.input} ✔` : `${round.input} ✘`;
    answer.classList.add(verdict === 'right' ? 'is-right' : 'is-wrong');
    if (verdict === 'wrong') prompt.textContent = `${current?.prompt ?? ''} = ${correct}`;
    announcer.textContent =
      verdict === 'right' ? 'Correct!' : `Not quite. The answer is ${correct}.`;
    award(verdict);

    void throwKnife(from, verdict === 'right').then(() => {
      if (life.isClosed) return;
      if (verdict === 'right') {
        setFrame(knife, KNIFE, 1);
        context.audio.play('growl');
        troll.classList.remove('sprite--walk');
        defeat = life.animate(troll, [{ opacity: 1 }, { opacity: 0 }], {
          duration: 600,
          fill: 'forwards',
        });
        life.animate(knife, [{ opacity: 1 }, { opacity: 0 }], {
          duration: 600,
          delay: 200,
          fill: 'forwards',
        });
        life.later(AFTER_RIGHT_MS, startQuestion);
      } else {
        knife.style.opacity = '0';
        hurt();
        approach?.finish();
        life.later(AFTER_WRONG_MS, startQuestion);
      }
    });
  };

  function timeOut(): void {
    if (phase !== 'asking' || life.isClosed) return;
    phase = 'resolving';
    round.timeOut();
    wheel.setEnabled(false);
    setHint(false);
    const current = round.question;
    prompt.textContent = `${current?.prompt ?? ''} = ${current?.answer ?? ''}`;
    answer.textContent = '⌛';
    answer.classList.add('is-wrong');
    announcer.textContent = `Too slow! The answer is ${current?.answer ?? ''}.`;
    award('wrong');
    hurt();
    life.later(AFTER_WRONG_MS, startQuestion);
  }

  function enter(digit: string, from: TapPoint | null): void {
    if (phase !== 'asking') return;
    const verdict = round.enter(digit);
    answer.textContent = round.input === '' ? '?' : round.input;
    if (verdict !== 'pending') settle(verdict, from);
  }

  function finish(): void {
    phase = 'finished';
    approach?.cancel();
    wheel.setEnabled(false);
    const key = levelKey(mission, level);
    const best = Math.max(round.stars, context.store.state.bestStars[key] ?? 0);
    context.store.update((data) => ({ ...data, bestStars: { ...data.bestStars, [key]: best } }));
    stage.classList.add('is-finished');
    const panel = results(context, round, { mission, level, best });
    stage.append(panel);
    panel.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }

  life.listen(document, 'keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      enter(event.key, null);
    } else if (event.key === 'Backspace' && phase === 'asking') {
      event.preventDefault();
      round.erase();
      answer.textContent = round.input === '' ? '?' : round.input;
    } else if (event.key === 'ArrowLeft') {
      wheel.turn(-1);
    } else if (event.key === 'ArrowRight') {
      wheel.turn(1);
    }
  });

  life.listen(document, 'visibilitychange', () => {
    if (phase !== 'asking' || approach === null) return;
    if (document.hidden) approach.pause();
    else approach.play();
  });

  let frame = 0;
  const watchHint = (): void => {
    if (life.isClosed) return;
    if (settings.hints && phase === 'asking' && approach !== null) {
      const elapsed = Number(approach.currentTime ?? 0);
      setHint(elapsed / approachMs >= HINT_AT);
    }
    frame = window.requestAnimationFrame(watchHint);
  };
  frame = window.requestAnimationFrame(watchHint);
  life.onClose(() => window.cancelAnimationFrame(frame));

  stage.append(
    backdrop,
    troll,
    hint,
    question,
    knife,
    wheel.element,
    el('div', { className: 'battle__flash', attrs: { 'aria-hidden': 'true' } })
  );

  startQuestion();

  return el(
    'section',
    {
      className: 'screen screen--battle',
      attrs: { 'aria-label': `Battle: mission ${mission.label}` },
    },
    [
      stage,
      topBar(context, life, {
        onBack: () => context.go({ name: 'map', missionId: mission.id }),
        showScore: true,
      }),
      announcer,
    ]
  );
};
