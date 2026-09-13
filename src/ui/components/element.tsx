/**
 * The one way a framework component renders its host element (P79-C).
 *
 * Every presentational component ends in `renderElement`, which gives all of
 * them the same escape hatch: `render` takes the element (or a function
 * returning one) to render instead of the default tag, with the component's
 * own class, style and attributes merged in. Base UI, chosen in P78-B, spells
 * polymorphism the same way, so Phase 80's behavioural components inherit one
 * convention rather than a second one.
 *
 * Class names and inline custom properties merge; every other prop on the
 * supplied element wins, because a caller who spelled out `type="submit"` or
 * an `aria-label` meant it. React 19 passes `ref` as an ordinary prop, so
 * `cloneElement` carries it with the rest.
 */

import { cloneElement, isValidElement, createElement, type CSSProperties, type ReactElement } from 'react';

/** A style object that may also carry `--mullion-*` custom properties. */
export type UiStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;

export interface UiRenderProps {
  className?: string | undefined;
  style?: UiStyle | undefined;
  [key: string]: unknown;
}

/**
 * Render something other than the component's default element. Either an
 * element to clone (`render={<a href="..." />}`) or a function handed the
 * props the component would have rendered.
 */
export type UiRender = ReactElement | ((props: UiRenderProps) => ReactElement);

export interface UiElementProps {
  className?: string | undefined;
  style?: UiStyle | undefined;
  render?: UiRender | undefined;
}

function joinClasses(...values: Array<string | false | undefined>): string | undefined {
  const parts = values.filter((v): v is string => typeof v === 'string' && v.length > 0);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

function mergeProps(ours: UiRenderProps, theirs: UiRenderProps): UiRenderProps {
  const merged: UiRenderProps = { ...ours, ...theirs };
  const className = joinClasses(ours.className, theirs.className);
  if (className !== undefined) merged.className = className;
  else delete merged.className;
  if (ours.style || theirs.style) merged.style = { ...ours.style, ...theirs.style };
  return merged;
}

/**
 * Render `props` as `tag`, or through `render` when one is given. Callers pass
 * the props they would have spread onto the default element; the class and the
 * inline custom properties survive whichever branch runs.
 */
export function renderElement(
  tag: string,
  props: UiRenderProps,
  render: UiRender | undefined,
): ReactElement {
  if (typeof render === 'function') return render(props);
  if (isValidElement(render)) {
    return cloneElement(render, mergeProps(props, render.props as UiRenderProps));
  }
  return createElement(tag, props);
}

/** Join class names, dropping the empty ones. Exported because every component needs it. */
export { joinClasses as cx };

// ---------------------------------------------------------------------------
// Focus
// ---------------------------------------------------------------------------

/**
 * Every framework element that can take focus carries this attribute, and the
 * one rule in `../styles/focus.css` is keyed on it. P77-F had to write the
 * ring as a list of Mantine selectors and the list was incomplete twice; an
 * attribute stamped by the components themselves cannot miss a component that
 * uses them.
 */
export const FOCUS_ATTR = 'data-mullion-focus';

/** Spread onto any element the framework expects to be focusable. */
export const focusable = { [FOCUS_ATTR]: '' } as const;

/**
 * Spread onto a focusable element whose visible box is its next sibling, which
 * is how a clipped checkbox and its label work. The ring is drawn on the
 * sibling and suppressed on the input itself.
 */
export const focusableSibling = { [FOCUS_ATTR]: 'sibling' } as const;

/**
 * The tones a component may paint. Each is a data attribute read by the
 * component sheet, which resolves it to a token: colour never travels as a
 * prop value and never appears in a component's TSX (study principle 2).
 */
export type UiTone = 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
