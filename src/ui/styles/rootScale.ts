/**
 * The size basis (P81-F): one token step is the same physical size on every host.
 *
 * Every length the framework owns is written in rem, and `rem` resolves against
 * `<html>` however deep the shadow root is, so a host theme that sets
 * `html { font-size: 62.5% }` would shrink the whole product to 62.5% of its
 * design size. The fix is Mantine's: tokens are `rem * scale`, and the scale is
 * set so that one rem renders at the size the design assumed.
 *
 * The scale is the user's default font size over the root's, not 16 over the
 * root's. On a host that leaves the root alone the two are equal and the scale
 * is exactly 1, so nothing moves; a user who has raised their browser's default
 * keeps that preference, because only the host's override is cancelled.
 */

import { useSyncExternalStore } from 'react';

/** The custom property every scaled length reads. Undeclared means 1. */
export const SCALE_VAR = '--mullion-scale';

/**
 * A rem length in the framework's basis, for an inline style. `uiRem(0.25)` is
 * a quarter of a design rem on every host; outside a provider it falls back to
 * plain rem, which is what it was before P81-F.
 */
export function uiRem(rem: number): string {
  return `calc(${rem}rem * var(${SCALE_VAR}, 1))`;
}

/**
 * Measure the scale for a document. `font-size: medium` resolves to the
 * user's default size whatever the host's stylesheets say, and `!important`
 * on an inline style beats any host rule that targets the probe.
 */
export function measureRootScale(doc: Document = document): number {
  const root = doc.documentElement;
  const view = doc.defaultView;
  if (!root || !view) return 1;
  const probe = doc.createElement('div');
  probe.style.setProperty('position', 'absolute', 'important');
  probe.style.setProperty('visibility', 'hidden', 'important');
  probe.style.setProperty('font-size', 'medium', 'important');
  root.appendChild(probe);
  const medium = parseFloat(view.getComputedStyle(probe).fontSize);
  probe.remove();
  const rootSize = parseFloat(view.getComputedStyle(root).fontSize);
  if (!(medium > 0) || !(rootSize > 0)) return 1;
  // Four places is well under a hundredth of a pixel at any real size, and it
  // keeps the value stable enough that a repeat measurement does not repaint.
  return Math.round((medium / rootSize) * 10000) / 10000;
}

// One measurement per page, shared by every provider. A host whose root size
// follows a media query changes it on resize, and a late stylesheet changes
// it on load, so both re-measure.
let current: number | undefined;
const listeners = new Set<() => void>();

function remeasure() {
  const next = measureRootScale();
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) {
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('load', remeasure);
    }
  };
}

function getSnapshot(): number {
  if (current === undefined) current = measureRootScale();
  return current;
}

/** The page's scale, re-rendering when the host's root size changes. */
export function useRootScale(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 1);
}
