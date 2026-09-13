/**
 * Structural utilities (P79-C): `VisuallyHidden` and `Collapse`.
 *
 * `Collapse` animates with `grid-template-rows` rather than by measuring the
 * content, so there is no ResizeObserver, no layout read and nothing to get
 * wrong when the content changes while open. It reads the duration token, so
 * `prefers-reduced-motion: reduce` zeroes the transition through the token
 * sheet (P79-B) and the content simply appears.
 */

import type { ReactNode } from 'react';
import { renderElement, cx, type UiElementProps } from './element';
import { customProperties } from './scale';

export interface VisuallyHiddenProps extends UiElementProps {
  children?: ReactNode;
}

/** Present to a screen reader, absent to the eye. Still focusable, unlike `display: none`. */
export function VisuallyHidden({ className, style, render, children, ...rest }: VisuallyHiddenProps) {
  return renderElement(
    'span',
    {
      ...rest,
      className: cx('mullion-visually-hidden', className),
      ...(style ? { style } : {}),
      children,
    },
    render,
  );
}

export interface CollapseProps extends UiElementProps {
  /** Whether the content is shown. Named `in` to match the one call site already written. */
  in?: boolean | undefined;
  /** Milliseconds. Defaults to the theme's base duration token. */
  duration?: number | undefined;
  children?: ReactNode;
}

export function Collapse({ className, style, render, children, in: open, duration, ...rest }: CollapseProps) {
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-collapse', className),
      'data-open': open ? '' : undefined,
      // Closed content is clipped, not removed, so without `inert` its
      // controls would stay in the tab order behind a zero-height box.
      ...(open ? {} : { 'aria-hidden': 'true', inert: true }),
      style: {
        ...customProperties({
          '--mullion-collapse-duration': duration === undefined ? undefined : `${duration}ms`,
        }),
        ...style,
      },
      children: <div className="mullion-collapse-inner">{children}</div>,
    },
    render,
  );
}
