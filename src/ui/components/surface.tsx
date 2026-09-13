/**
 * Surfaces (P79-C): `Paper`, `Card` and `Divider`.
 *
 * A surface is the framework's one statement about elevation: a background
 * from the theme's surface ladder, a radius, an optional border and an
 * optional shadow. Nothing here picks a colour; the ladder is `--mullion-color-
 * surface` and `--mullion-color-surface-raised`, and a raised surface says so
 * with `raised` rather than by naming a grey.
 */

import type { ReactNode } from 'react';
import { renderElement, cx, type UiElementProps } from './element';
import {
  customProperties,
  splitPadding,
  radiusValue,
  shadowValue,
  type UiPaddingProps,
  type UiRadius,
  type UiSpacing,
} from './scale';

export interface PaperProps extends UiElementProps, UiPaddingProps {
  radius?: UiRadius | undefined;
  shadow?: UiSpacing | undefined;
  withBorder?: boolean | undefined;
  /** Sit one rung up the surface ladder, for a panel over a panel. */
  raised?: boolean | undefined;
  children?: ReactNode;
}

/** Everything a surface sets, plus whatever else the caller passed, forwarded. */
function surfaceProps(props: Omit<PaperProps, 'render' | 'children'>, base: string) {
  const { className, style, radius, shadow, withBorder, raised, ...withPadding } = props;
  const [pad, rest] = splitPadding(withPadding);
  return {
    ...rest,
    className: cx(base, className),
    ...(withBorder ? { 'data-with-border': '' } : {}),
    ...(raised ? { 'data-raised': '' } : {}),
    style: {
      ...customProperties({
        ...pad,
        '--mullion-radius': radiusValue(radius),
        '--mullion-shadow': shadowValue(shadow),
      }),
      ...style,
    },
  };
}

export function Paper({ render, children, ...props }: PaperProps) {
  return renderElement('div', { ...surfaceProps(props, 'mullion-paper'), children }, render);
}

export interface CardProps extends PaperProps {
  children?: ReactNode;
}

export interface CardSectionProps extends UiElementProps, UiPaddingProps {
  /** Draw a separator below the section. */
  withBorder?: boolean | undefined;
  children?: ReactNode;
}

/**
 * A full-bleed band inside a card. It cancels the card's inline padding with a
 * negative margin read from the same custom property the card set, so the two
 * cannot drift apart the way a hardcoded inset would.
 */
function CardSection({ className, style, render, children, withBorder, ...props }: CardSectionProps) {
  const [pad, rest] = splitPadding(props);
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-card-section', className),
      ...(withBorder ? { 'data-with-border': '' } : {}),
      style: { ...customProperties(pad), ...style },
      children,
    },
    render,
  );
}

function CardRoot({ render, children, ...props }: CardProps) {
  return renderElement('div', { ...surfaceProps(props, 'mullion-card'), children }, render);
}

export const Card = Object.assign(CardRoot, { Section: CardSection });

export interface DividerProps extends UiElementProps {
  orientation?: 'horizontal' | 'vertical' | undefined;
  /** Text set into the rule. Horizontal only; a vertical divider ignores it. */
  label?: ReactNode;
  labelPosition?: 'left' | 'center' | 'right' | undefined;
}

export function Divider({
  className,
  style,
  render,
  orientation = 'horizontal',
  label,
  labelPosition = 'center',
  ...rest
}: DividerProps) {
  const vertical = orientation === 'vertical';
  const showLabel = label !== undefined && label !== null && label !== false && !vertical;
  return renderElement(
    'div',
    {
      ...rest,
      role: 'separator',
      'aria-orientation': orientation,
      className: cx('mullion-divider', className),
      'data-orientation': orientation,
      ...(showLabel ? { 'data-label-position': labelPosition } : {}),
      ...(style ? { style } : {}),
      children: showLabel ? <span className="mullion-divider-label">{label}</span> : undefined,
    },
    render,
  );
}
