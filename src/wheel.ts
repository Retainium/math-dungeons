import { button, el, image, type Lifetime } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';
const FULL_TURN_DEG = 360;
const HALF_TURN_DEG = FULL_TURN_DEG / 2;
const SLICES = 20;
const SLICE_DEG = FULL_TURN_DEG / SLICES;
/** In wheel.png, digit i sits half a slice clockwise of `i * SLICE_DEG` from 12 o'clock. */
const DIGIT_OFFSET_DEG = SLICE_DEG / 2;
/** Art is 600px wide and the wheel's rim sits at radius 230. */
const VIEW = 600;
interface Ring {
  inner: number;
  outer: number;
}
/** Where a tap counts: a little more forgiving than the digits, but not past the rim. */
const HIT_RING: Ring = { inner: 125, outer: 245 };
/** The band the digits are drawn in, which lights up on a tap. */
const DIGIT_RING: Ring = { inner: 150, outer: 228 };
/** Pointer travel (px) before a press counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 8;

function polar(radius: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / HALF_TURN_DEG;
  return [VIEW / 2 + radius * Math.sin(radians), VIEW / 2 - radius * Math.cos(radians)];
}

function wedgePath(centerDeg: number, { inner, outer }: Ring): string {
  const from = centerDeg - SLICE_DEG / 2;
  const to = centerDeg + SLICE_DEG / 2;
  const [ox1, oy1] = polar(outer, from);
  const [ox2, oy2] = polar(outer, to);
  const [ix2, iy2] = polar(inner, to);
  const [ix1, iy1] = polar(inner, from);
  return [
    `M ${ox1} ${oy1}`,
    `A ${outer} ${outer} 0 0 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${inner} ${inner} 0 0 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

function svgPath(d: string, className: string): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', className);
  return path;
}

export interface Wheel {
  element: HTMLElement;
  /** Turn by whole slices; positive is clockwise. */
  turn: (slices: number) => void;
  setEnabled: (enabled: boolean) => void;
}

export interface TapPoint {
  x: number;
  y: number;
}

export function createWheel(
  life: Lifetime,
  onDigit: (digit: string, from: TapPoint) => void
): Wheel {
  let rotation = 0;
  let enabled = true;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${VIEW} ${VIEW}`);
  svg.setAttribute('class', 'wheel__hits');
  svg.setAttribute('aria-hidden', 'true');
  const glows: SVGPathElement[] = [];
  for (let slice = 0; slice < SLICES; slice++) {
    const centerDeg = slice * SLICE_DEG + DIGIT_OFFSET_DEG;
    const glow = svgPath(wedgePath(centerDeg, DIGIT_RING), 'wheel__glow');
    const wedge = svgPath(wedgePath(centerDeg, HIT_RING), 'wheel__wedge');
    wedge.dataset['digit'] = String(slice % 10);
    wedge.dataset['slice'] = String(slice);
    glows.push(glow);
    svg.append(glow, wedge);
  }

  const disc = el('div', { className: 'wheel__disc' }, [
    image('./assets/images/wheel.png', '', 'wheel__art'),
    svg,
  ]);
  const applyRotation = (animated: boolean): void => {
    disc.classList.toggle('is-dragging', !animated);
    disc.style.transform = `rotate(${rotation}deg)`;
  };
  const snap = (): void => {
    rotation = Math.round(rotation / SLICE_DEG) * SLICE_DEG;
    applyRotation(true);
  };

  const flash = (wedge: SVGElement): void => {
    const glow = glows[Number(wedge.dataset['slice'])];
    if (glow === undefined) return;
    life.animate(glow, [{ fillOpacity: 0.6 }, { fillOpacity: 0 }], {
      duration: 350,
      easing: 'ease-out',
    });
  };

  const center = (): TapPoint => {
    const rect = disc.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };
  const angleOf = (event: PointerEvent): number => {
    const { x, y } = center();
    return (Math.atan2(event.clientY - y, event.clientX - x) * HALF_TURN_DEG) / Math.PI;
  };

  let press: {
    id: number;
    x: number;
    y: number;
    angle: number;
    start: number;
    dragging: boolean;
    wedge: Element | null;
  } | null = null;

  disc.addEventListener('pointerdown', (event) => {
    if (!enabled || press !== null) return;
    const target = event.target instanceof Element ? event.target.closest('.wheel__wedge') : null;
    press = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      angle: angleOf(event),
      start: rotation,
      dragging: false,
      wedge: target,
    };
    disc.setPointerCapture(event.pointerId);
  });
  disc.addEventListener('pointermove', (event) => {
    if (press?.id !== event.pointerId) return;
    if (
      !press.dragging &&
      Math.hypot(event.clientX - press.x, event.clientY - press.y) > DRAG_THRESHOLD
    ) {
      press.dragging = true;
    }
    if (press.dragging) {
      let delta = angleOf(event) - press.angle;
      if (delta > HALF_TURN_DEG) delta -= FULL_TURN_DEG;
      if (delta < -HALF_TURN_DEG) delta += FULL_TURN_DEG;
      rotation = press.start + delta;
      applyRotation(false);
    }
  });
  const release = (event: PointerEvent, cancelled: boolean): void => {
    if (press?.id !== event.pointerId) return;
    const { dragging, wedge } = press;
    press = null;
    if (dragging) {
      snap();
      return;
    }
    if (!(wedge instanceof SVGElement)) return;
    const digit = wedge.dataset['digit'];
    if (!cancelled && enabled && digit !== undefined) {
      flash(wedge);
      onDigit(digit, { x: event.clientX, y: event.clientY });
    }
  };
  disc.addEventListener('pointerup', (event) => release(event, false));
  disc.addEventListener('pointercancel', (event) => release(event, true));

  const turn = (slices: number): void => {
    rotation += slices * SLICE_DEG;
    snap();
  };

  const element = el('div', { className: 'wheel' }, [
    disc,
    button('⟲', () => turn(-1), {
      className: 'btn--icon wheel__turn wheel__turn--left',
      ariaLabel: 'Turn wheel left',
    }),
    button('⟳', () => turn(1), {
      className: 'btn--icon wheel__turn wheel__turn--right',
      ariaLabel: 'Turn wheel right',
    }),
  ]);
  applyRotation(true);

  return {
    element,
    turn,
    setEnabled: (value) => {
      enabled = value;
      element.classList.toggle('is-disabled', !value);
    },
  };
}
