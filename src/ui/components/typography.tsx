/**
 * Typography primitives (P79-C): `Text`, `Title`, `Anchor` and `Kbd`.
 *
 * `Text` is the most-used component in the codebase (418 call sites in 92
 * files) and the props here are the ones those sites actually spell: `size`,
 * a colour role, a weight, alignment, truncation and a line clamp. The colour
 * role is a `data-mullion-tone` attribute the sheet resolves to a token, so the 233
 * `c="dimmed"` sites become `tone="muted"` and the value stops being a colour
 * name that only one palette understands.
 *
 * The type scale comes from the theme: P79-C made the engine emit
 * `--mullion-font-size-*` and `--mullion-heading-*`, which every theme JSON
 * has carried since the engine was written and only the Mantine adapter could
 * read.
 */

import type { ReactNode } from 'react';
import { renderElement, cx, focusable, type UiElementProps, type UiTone } from './element';
import { customProperties, fontSizeValue, type UiFontSize } from './scale';

type TextAlign = 'left' | 'center' | 'right' | 'justify' | 'start' | 'end';

export interface TextProps extends UiElementProps {
  size?: UiFontSize | undefined;
  tone?: UiTone | undefined;
  /** 400 to 700, or any CSS `font-weight` value. */
  weight?: number | string | undefined;
  align?: TextAlign | undefined;
  transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none' | undefined;
  /** One line, ellipsised. */
  truncate?: boolean | undefined;
  /** Ellipsise after this many lines. */
  lineClamp?: number | undefined;
  italic?: boolean | undefined;
  /** Read the theme's monospace family instead of its body family. */
  font?: 'body' | 'mono' | undefined;
  /** Render a `<span>` rather than a `<p>`. */
  span?: boolean | undefined;
  children?: ReactNode;
}

export function Text({
  className,
  style,
  render,
  children,
  size,
  tone,
  weight,
  align,
  transform,
  truncate,
  lineClamp,
  italic,
  font,
  span,
  ...rest
}: TextProps) {
  return renderElement(
    span ? 'span' : 'p',
    {
      ...rest,
      className: cx('mullion-text', className),
      ...(tone ? { 'data-mullion-tone': tone } : {}),
      ...(font === 'mono' ? { 'data-font': 'mono' } : {}),
      ...(italic ? { 'data-italic': '' } : {}),
      ...(truncate ? { 'data-truncate': '' } : {}),
      ...(lineClamp !== undefined ? { 'data-clamp': '' } : {}),
      style: {
        ...customProperties({
          '--mullion-font-size': fontSizeValue(size),
          '--mullion-font-weight': weight,
          '--mullion-text-align': align,
          '--mullion-text-transform': transform,
          '--mullion-line-clamp': lineClamp,
        }),
        ...style,
      },
      children,
    },
    render,
  );
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface TitleProps extends UiElementProps {
  /** The heading level, which sets both the tag and the default size. */
  order?: HeadingLevel | undefined;
  /** Paint a different level than the tag, for a heading that must sit lower in the outline than it looks. */
  size?: HeadingLevel | undefined;
  tone?: UiTone | undefined;
  align?: TextAlign | undefined;
  children?: ReactNode;
}

export function Title({
  className,
  style,
  render,
  children,
  order = 1,
  size,
  tone,
  align,
  ...rest
}: TitleProps) {
  const level = size ?? order;
  return renderElement(
    `h${order}`,
    {
      ...rest,
      className: cx('mullion-title', className),
      'data-level': String(level),
      ...(tone ? { 'data-mullion-tone': tone } : {}),
      style: { ...customProperties({ '--mullion-text-align': align }), ...style },
      children,
    },
    render,
  );
}

export interface AnchorProps extends UiElementProps {
  href?: string | undefined;
  target?: string | undefined;
  rel?: string | undefined;
  size?: UiFontSize | undefined;
  tone?: UiTone | undefined;
  /** Show the underline only on hover and focus. */
  underline?: 'always' | 'hover' | 'never' | undefined;
  children?: ReactNode;
}

export function Anchor({
  className,
  style,
  render,
  children,
  size,
  tone,
  underline = 'hover',
  ...rest
}: AnchorProps) {
  return renderElement(
    'a',
    {
      ...rest,
      ...focusable,
      className: cx('mullion-anchor', className),
      'data-underline': underline,
      ...(tone ? { 'data-mullion-tone': tone } : {}),
      style: { ...customProperties({ '--mullion-font-size': fontSizeValue(size) }), ...style },
      children,
    },
    render,
  );
}

export interface KbdProps extends UiElementProps {
  children?: ReactNode;
}

export function Kbd({ className, style, render, children, ...rest }: KbdProps) {
  return renderElement(
    'kbd',
    { ...rest, className: cx('mullion-kbd', className), ...(style ? { style } : {}), children },
    render,
  );
}
