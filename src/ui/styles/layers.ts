/**
 * The layer scale, as a value an element can be given (P79-C).
 *
 * The theme engine emits one token per step, each of them
 * `calc(var(--mullion-layer-host-offset, 0) + N)`. A host that has furniture
 * of its own raises the offset and every layer moves with it: the WordPress
 * embed sets it when the admin bar is showing, which is what stops the bar
 * covering the Settings drawer header (P78-C shipped the token, this track
 * gave it a reader).
 *
 * Nothing in the plugin should write a z-index literal for chrome. Reading a
 * step by name says what the element is instead of what number it happens to
 * need, and it is the only form the host offset can reach.
 */

export type UiLayer =
  | 'base'
  | 'raised'
  | 'sticky'
  | 'dropdown'
  | 'overlay'
  | 'modal'
  | 'popover'
  | 'tooltip'
  | 'notification';

/** The token reference for one step, for a `z-index` or a component's `zIndex` prop. */
export function uiLayer(step: UiLayer): string {
  return `var(--mullion-layer-${step})`;
}
