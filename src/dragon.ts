import type { DragonColor } from './pets';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Faces right; colours come from the `dragon--<color>` class. Static markup, so innerHTML is safe. */
const DRAGON_MARKUP = `
  <g class="dragon__ink">
    <path class="dragon__wing dragon__wing--far" d="M80 66 C78 50 84 36 96 28 C96 40 102 46 108 50 C102 54 96 60 92 68 Z" />
    <path class="dragon__body" d="M50 90 C32 96 18 88 14 74 C12 66 20 62 23 70 C26 80 36 84 48 80 Z" />
    <path class="dragon__wing" d="M10 60 L24 64 L15 76 Z" />
    <ellipse class="dragon__body" cx="62" cy="111" rx="8" ry="7" />
    <ellipse class="dragon__body" cx="76" cy="86" rx="31" ry="25" />
    <path class="dragon__spike" d="M50 72 L48 60 L58 66 Z M60 64 L60 52 L69 60 Z M72 61 L74 49 L81 58 Z" />
    <ellipse class="dragon__belly" cx="88" cy="92" rx="16" ry="16" />
    <path class="dragon__line" d="M78 86 H98 M77 94 H99 M80 102 H96" />
    <path class="dragon__wing dragon__wing--near" d="M70 70 C58 54 46 46 34 44 C40 52 42 58 42 64 C48 62 54 64 58 70 C62 66 66 66 70 70 Z" />
    <ellipse class="dragon__body" cx="74" cy="112" rx="9" ry="7.5" />
    <ellipse class="dragon__body" cx="98" cy="112" rx="9" ry="7.5" />
    <path class="dragon__horn" d="M98 38 L92 20 L106 33 Z M112 33 L116 15 L122 33 Z" />
    <circle class="dragon__body" cx="110" cy="54" r="22" />
    <ellipse class="dragon__body" cx="130" cy="63" rx="15" ry="11.5" />
    <circle class="dragon__cheek" cx="120" cy="66" r="4.5" />
    <circle class="dragon__dot" cx="139" cy="58" r="1.8" />
    <path class="dragon__line dragon__mouth dragon__mouth--smile" d="M122 69 Q131 75 140 67" />
    <path class="dragon__line dragon__mouth dragon__mouth--frown" d="M124 73 Q131 67 139 72" />
    <g class="dragon__eye">
      <ellipse class="dragon__eye-white" cx="114" cy="50" rx="7" ry="8" />
      <circle class="dragon__dot" cx="116" cy="51" r="4" />
      <circle class="dragon__shine" cx="117.6" cy="48.6" r="1.5" />
    </g>
    <path class="dragon__line dragon__eye-happy" d="M107 52 Q114 43 121 52" />
    <path class="dragon__line dragon__brow" d="M107 39 L120 43" />
  </g>
`;

export function dragonArt(color: DragonColor, className = ''): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 160 130');
  svg.setAttribute('class', `dragon dragon--${color} ${className}`.trim());
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = DRAGON_MARKUP;
  return svg;
}
