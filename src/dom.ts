type Child = Node | string | null | undefined | false;

interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  onClick?: () => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: readonly Child[] = []
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attrs ?? {})) node.setAttribute(name, value);
  const { onClick } = options;
  if (onClick !== undefined) node.addEventListener('click', () => onClick());
  for (const child of children) {
    if (typeof child === 'string' || child instanceof Node) node.append(child);
  }
  return node;
}

export function button(
  label: string,
  onClick: () => void,
  options: { className?: string; ariaLabel?: string; disabled?: boolean } = {}
): HTMLButtonElement {
  const node = el('button', {
    className: `btn ${options.className ?? ''}`.trim(),
    text: label,
    attrs: {
      type: 'button',
      ...(options.ariaLabel !== undefined ? { 'aria-label': options.ariaLabel } : {}),
    },
    onClick,
  });
  node.disabled = options.disabled === true;
  return node;
}

export function image(src: string, alt: string, className?: string): HTMLImageElement {
  return el('img', {
    ...(className !== undefined ? { className } : {}),
    attrs: { src, alt, draggable: 'false' },
  });
}

/** Timers and animations owned by a screen, all cancelled together when it closes. */
export class Lifetime {
  private readonly timers = new Set<number>();
  private readonly animations = new Set<Animation>();
  private readonly cleanups: Array<() => void> = [];
  private closed = false;

  get isClosed(): boolean {
    return this.closed;
  }

  later(ms: number, callback: () => void): void {
    if (this.closed) return;
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (!this.closed) callback();
    }, ms);
    this.timers.add(id);
  }

  clearTimers(): void {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers.clear();
  }

  animate(target: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation {
    const animation = target.animate(keyframes, options);
    this.animations.add(animation);
    const forget = (): void => {
      this.animations.delete(animation);
    };
    animation.addEventListener('finish', forget);
    animation.addEventListener('cancel', forget);
    return animation;
  }

  listen<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    handler: (event: WindowEventMap[K]) => void
  ): void;
  listen<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    handler: (event: DocumentEventMap[K]) => void
  ): void;
  listen(target: EventTarget, type: string, handler: (event: Event) => void): void {
    target.addEventListener(type, handler);
    this.cleanups.push(() => target.removeEventListener(type, handler));
  }

  onClose(cleanup: () => void): void {
    this.cleanups.push(cleanup);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.clearTimers();
    for (const animation of this.animations) animation.cancel();
    this.animations.clear();
    for (const cleanup of this.cleanups.splice(0)) cleanup();
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
