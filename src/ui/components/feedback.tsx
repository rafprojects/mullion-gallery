/**
 * Feedback primitives (P79-C): `Alert`, `Badge`, `Loader` and `Skeleton`.
 *
 * All four take a `tone` rather than a colour name. The 52 `Badge color="blue"`
 * and the `Alert color="red"` sites in the codebase name a Mantine palette
 * entry, which is a colour a theme cannot redirect; a tone resolves through
 * the theme's semantic tokens instead, so a theme that wants a different red
 * for errors gets one everywhere at once.
 */

import type { ReactNode } from 'react';
import { renderElement, cx, type UiElementProps, type UiTone } from './element';
import {
  customProperties,
  splitPadding,
  radiusValue,
  type UiPaddingProps,
  type UiRadius,
  type UiScaleStep,
} from './scale';

export type UiSurfaceVariant = 'filled' | 'light' | 'outline';

export interface AlertProps extends UiElementProps, UiPaddingProps {
  title?: ReactNode;
  icon?: ReactNode;
  tone?: UiTone | undefined;
  variant?: UiSurfaceVariant | undefined;
  children?: ReactNode;
}

export function Alert({
  className,
  style,
  render,
  children,
  title,
  icon,
  tone = 'info',
  variant = 'light',
  ...props
}: AlertProps) {
  const [pad, rest] = splitPadding(props);
  return renderElement(
    'div',
    {
      ...rest,
      role: 'alert',
      className: cx('mullion-alert', className),
      'data-mullion-tone': tone,
      'data-variant': variant,
      style: { ...customProperties(pad), ...style },
      children: (
        <>
          {icon ? <span className="mullion-alert-icon">{icon}</span> : null}
          <div className="mullion-alert-body">
            {title ? <div className="mullion-alert-title">{title}</div> : null}
            {children}
          </div>
        </>
      ),
    },
    render,
  );
}

export interface BadgeProps extends UiElementProps {
  size?: UiScaleStep | undefined;
  tone?: UiTone | undefined;
  variant?: UiSurfaceVariant | undefined;
  radius?: UiRadius | undefined;
  children?: ReactNode;
}

export function Badge({
  className,
  style,
  render,
  children,
  size = 'sm',
  tone = 'primary',
  variant = 'light',
  radius,
  ...rest
}: BadgeProps) {
  return renderElement(
    'span',
    {
      ...rest,
      className: cx('mullion-badge', className),
      'data-mullion-tone': tone,
      'data-variant': variant,
      'data-size': size,
      style: { ...customProperties({ '--mullion-radius': radiusValue(radius) }), ...style },
      children,
    },
    render,
  );
}

export interface LoaderProps extends UiElementProps {
  size?: UiScaleStep | number | string | undefined;
  tone?: UiTone | undefined;
  /** The accessible name. Omit it only where a visible label already says the same thing. */
  label?: string | undefined;
}

/**
 * A spinner drawn with a border and one keyframe, so nothing loads an SVG and
 * nothing measures. The animation reads `--mullion-duration-slow`, which the
 * token sheet zeroes under `prefers-reduced-motion: reduce` (P79-B), so the
 * preference is honoured without a rule here.
 */
export function Loader({ className, style, render, size = 'md', tone, label, ...rest }: LoaderProps) {
  const diameter = typeof size === 'number' ? `${size}px` : undefined;
  return renderElement(
    'span',
    {
      ...rest,
      className: cx('mullion-loader', className),
      role: 'status',
      ...(label ? { 'aria-label': label } : {}),
      ...(tone ? { 'data-mullion-tone': tone } : {}),
      ...(diameter === undefined && typeof size === 'string' ? { 'data-size': size } : {}),
      style: { ...customProperties({ '--mullion-loader-size': diameter }), ...style },
    },
    render,
  );
}

export interface SkeletonProps extends UiElementProps {
  width?: number | string | undefined;
  height?: number | string | undefined;
  radius?: UiRadius | undefined;
  circle?: boolean | undefined;
  /** When false the skeleton renders its children instead of the placeholder. */
  visible?: boolean | undefined;
  children?: ReactNode;
}

const length = (value: number | string | undefined): string | undefined =>
  typeof value === 'number' ? `${value}px` : value;

export function Skeleton({
  className,
  style,
  render,
  children,
  width,
  height,
  radius,
  circle,
  visible = true,
  ...rest
}: SkeletonProps) {
  if (!visible) return <>{children}</>;
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-skeleton', className),
      'aria-hidden': 'true',
      ...(circle ? { 'data-circle': '' } : {}),
      style: {
        ...customProperties({
          '--mullion-skeleton-width': length(width),
          '--mullion-skeleton-height': length(height),
          '--mullion-radius': radiusValue(radius),
        }),
        ...style,
      },
      children,
    },
    render,
  );
}
