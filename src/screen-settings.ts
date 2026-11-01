import type { ScreenFactory } from './app';
import { button, el } from './dom';
import {
  DIFFICULTIES,
  OPERATIONS,
  RANGE_MAX,
  RANGE_MIN,
  TABLE_COUNT,
  cloneSettings,
  defaultSettings,
  settingsProblem,
  type Difficulty,
  type Operation,
  type Settings,
} from './settings';
import { topBar } from './top-bar';

const OPERATION_LABELS: Record<Operation, string> = { add: '+', sub: '−', mult: '×', div: '÷' };
const OPERATION_NAMES: Record<Operation, string> = {
  add: 'Addition',
  sub: 'Subtraction',
  mult: 'Multiplication',
  div: 'Division',
};
const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

function pressable(label: string, ariaLabel: string, onToggle: () => void): HTMLButtonElement {
  return button(label, onToggle, { className: 'chip', ariaLabel });
}

function setPressed(node: HTMLButtonElement, pressed: boolean): void {
  node.setAttribute('aria-pressed', String(pressed));
}

function fieldset(
  legend: string,
  children: readonly HTMLElement[],
  className = 'chips'
): HTMLElement {
  return el('fieldset', { className: 'field' }, [
    el('legend', { className: 'field__legend', text: legend }),
    el('div', { className }, children),
  ]);
}

export const settingsScreen: ScreenFactory = (context, life) => {
  let draft: Settings = cloneSettings(context.store.state.settings);
  const leave = (): void => context.go({ name: 'title' });

  const operationButtons = OPERATIONS.map((operation) =>
    pressable(OPERATION_LABELS[operation], OPERATION_NAMES[operation], () => {
      draft.operations[operation] = !draft.operations[operation];
      render();
    })
  );
  const tableButtons = Array.from({ length: TABLE_COUNT }, (_, index) =>
    pressable(String(index + 1), `Number ${index + 1}`, () => {
      draft.tables[index] = !draft.tables[index];
      render();
    })
  );

  const stepper = (
    label: string,
    read: () => number,
    write: (value: number) => void
  ): [HTMLElement, HTMLOutputElement] => {
    const output = el('output', { className: 'stepper__value', attrs: { 'aria-live': 'polite' } });
    const change = (delta: number): void => {
      write(Math.min(RANGE_MAX, Math.max(RANGE_MIN, read() + delta)));
      render();
    };
    const node = el(
      'div',
      { className: 'stepper', attrs: { role: 'group', 'aria-label': label } },
      [
        el('span', { className: 'stepper__label', text: label }),
        button('−', () => change(-1), {
          className: 'btn--icon',
          ariaLabel: `Lower ${label.toLowerCase()}`,
        }),
        output,
        button('+', () => change(1), {
          className: 'btn--icon',
          ariaLabel: `Raise ${label.toLowerCase()}`,
        }),
      ]
    );
    return [node, output];
  };
  const [startStepper, startValue] = stepper(
    'From',
    () => draft.rangeStart,
    (value) => {
      draft.rangeStart = value;
      draft.rangeEnd = Math.max(draft.rangeEnd, value);
    }
  );
  const [endStepper, endValue] = stepper(
    'To',
    () => draft.rangeEnd,
    (value) => {
      draft.rangeEnd = value;
      draft.rangeStart = Math.min(draft.rangeStart, value);
    }
  );

  const difficultyButtons = DIFFICULTIES.map((difficulty) =>
    pressable(DIFFICULTY_LABELS[difficulty], `${DIFFICULTY_LABELS[difficulty]} difficulty`, () => {
      draft.difficulty = difficulty;
      render();
    })
  );
  const hintsButton = pressable('Show hints', 'Show the answer when the troll gets close', () => {
    draft.hints = !draft.hints;
    render();
  });

  const problem = el('p', { className: 'notice', attrs: { role: 'status' } });
  const save = button(
    '✔ Save',
    () => {
      if (settingsProblem(draft) !== null) return;
      const saved = cloneSettings(draft);
      context.store.update((data) => ({ ...data, settings: saved }));
      leave();
    },
    { className: 'btn--primary' }
  );

  function render(): void {
    OPERATIONS.forEach((operation, index) => {
      const node = operationButtons[index];
      if (node !== undefined) setPressed(node, draft.operations[operation]);
    });
    tableButtons.forEach((node, index) => setPressed(node, draft.tables[index] === true));
    DIFFICULTIES.forEach((difficulty, index) => {
      const node = difficultyButtons[index];
      if (node !== undefined) setPressed(node, draft.difficulty === difficulty);
    });
    setPressed(hintsButton, draft.hints);
    startValue.textContent = String(draft.rangeStart);
    endValue.textContent = String(draft.rangeEnd);
    const issue = settingsProblem(draft);
    problem.textContent = issue ?? '';
    save.disabled = issue !== null;
  }
  render();

  return el('section', { className: 'screen screen--hallway' }, [
    topBar(context, life, { onBack: leave }),
    el('div', { className: 'panel settings' }, [
      el('h2', { className: 'heading', text: 'Settings' }),
      fieldset('Operations', operationButtons),
      fieldset('Numbers', tableButtons, 'chips chips--grid'),
      fieldset('Paired with', [startStepper, endStepper], 'steppers'),
      fieldset('Troll speed', difficultyButtons),
      fieldset('Help', [hintsButton]),
      problem,
      el('div', { className: 'settings__actions' }, [
        button(
          'Reset',
          () => {
            draft = defaultSettings();
            render();
          },
          { className: 'btn--secondary' }
        ),
        button('Cancel', leave, { className: 'btn--secondary' }),
        save,
      ]),
    ]),
  ]);
};
