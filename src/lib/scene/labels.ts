import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export type LabelVariant = 'item' | 'micro' | 'axis' | 'gold';

export interface TagOptions {
  variant?: LabelVariant;
  /** alternate vertical offset to reduce horizontal collisions */
  raised?: boolean;
}

/**
 * Screen-space HTML label. Constant on-screen size, real typography —
 * the difference between a tech demo and something you'd show someone.
 */
export function makeTag(lines: string[], opts: TagOptions = {}): CSS2DObject {
  const outer = document.createElement('div');
  const el = document.createElement('div');
  el.className = `lbl lbl-${opts.variant ?? 'item'}${opts.raised ? ' lbl-raised' : ''}`;
  lines.forEach((line, i) => {
    const span = document.createElement('div');
    span.className = i === 0 ? 'lbl-t' : 'lbl-s';
    span.textContent = line;
    el.appendChild(span);
  });
  outer.appendChild(el);
  const obj = new CSS2DObject(outer);
  obj.center.set(0.5, 1);
  return obj;
}
