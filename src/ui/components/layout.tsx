/**
 * Layout primitives (P79-C): `Box`, `Stack`, `Group`, `Center`, `Container`,
 * `Grid` and `SimpleGrid`.
 *
 * Each takes a small prop set and renders it as inline custom properties, so
 * the value travels with the element into whichever tree it is portaled to
 * (study 3.4). Geometry is the only thing these own: no colour, no font, no
 * `!important`, and nothing that reads an ancestor. Mantine's full style-prop
 * surface is deliberately not reproduced; `m`, `w`, `h`, `pos` and the
 * responsive object form migrate to `className` in Phase 81.
 */

import type { ReactNode } from 'react';
import { renderElement, cx, type UiElementProps } from './element';
import {
  customProperties,
  splitPadding,
  spacingValue,
  type UiPaddingProps,
  type UiSpacing,
} from './scale';

type Align = 'stretch' | 'center' | 'flex-start' | 'flex-end' | 'baseline';
type Justify =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

interface FlexProps extends UiElementProps, UiPaddingProps {
  gap?: UiSpacing | undefined;
  align?: Align | undefined;
  justify?: Justify | undefined;
  children?: ReactNode;
}

/**
 * The custom properties a flex primitive sets, and the props it passes
 * through. Everything the caller spelled that is not one of ours reaches the
 * element: a `data-testid`, an `aria-label`, an `id`, a handler.
 */
function flexProps<T extends FlexProps>(
  props: T,
): [Record<string, string | number | undefined>, Omit<T, keyof FlexProps>] {
  const { gap, align, justify, ...withPadding } = props;
  const [pad, rest] = splitPadding(withPadding);
  return [
    { ...pad, '--mullion-gap': spacingValue(gap), '--mullion-align': align, '--mullion-justify': justify },
    rest as Omit<T, keyof FlexProps>,
  ];
}

// ---------------------------------------------------------------------------
// Box
// ---------------------------------------------------------------------------

export interface BoxProps extends UiElementProps, UiPaddingProps {
  children?: ReactNode;
}

/**
 * A plain block with the framework's padding props and the `render` escape
 * hatch. It carries no class of its own: there is nothing to style, and a
 * class with no rule behind it is a selector waiting to be given meaning
 * somewhere it should not have any.
 */
export function Box({ className, style, render, children, ...props }: BoxProps) {
  const [pad, rest] = splitPadding(props);
  return renderElement(
    'div',
    {
      ...rest,
      ...(className !== undefined ? { className } : {}),
      style: { ...customProperties(pad), ...style },
      children,
    },
    render,
  );
}

// ---------------------------------------------------------------------------
// Stack and Group
// ---------------------------------------------------------------------------

export type StackProps = FlexProps;

/** A column. `gap` takes a scale step, a number of pixels or any CSS length. */
export function Stack({ className, style, render, children, ...props }: StackProps) {
  const [vars, rest] = flexProps(props);
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-stack', className),
      style: { ...customProperties(vars), ...style },
      children,
    },
    render,
  );
}

export interface GroupProps extends FlexProps {
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse' | undefined;
  /** Every child takes an equal share of the free space. */
  grow?: boolean | undefined;
}

/** A row. Wraps by default, which is what 42 of the measured call sites ask for explicitly. */
export function Group({ className, style, render, children, grow, wrap, ...props }: GroupProps) {
  const [vars, rest] = flexProps(props);
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-group', className),
      ...(grow ? { 'data-grow': '' } : {}),
      style: {
        ...customProperties({ ...vars, '--mullion-wrap': wrap }),
        ...style,
      },
      children,
    },
    render,
  );
}

// ---------------------------------------------------------------------------
// Center
// ---------------------------------------------------------------------------

export interface CenterProps extends FlexProps {
  /** Centre as an inline box rather than a block. */
  inline?: boolean | undefined;
}

export function Center({ className, style, render, children, inline, ...props }: CenterProps) {
  const [vars, rest] = flexProps(props);
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-center', className),
      ...(inline ? { 'data-inline': '' } : {}),
      style: { ...customProperties(vars), ...style },
      children,
    },
    render,
  );
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export interface ContainerProps extends UiElementProps, UiPaddingProps {
  /** Maximum content width: a scale step, a number of pixels, or any CSS length. */
  size?: UiSpacing | undefined;
  /** Fill the available width, ignoring `size`. */
  fluid?: boolean | undefined;
  children?: ReactNode;
}

/** Container sizes are layout, not spacing, so they have their own scale rather than reusing the spacing tokens. */
const CONTAINER_SIZES: Record<string, string> = {
  xs: '40rem',
  sm: '48rem',
  md: '64rem',
  lg: '75rem',
  xl: '90rem',
};

export function Container({
  className,
  style,
  render,
  children,
  size,
  fluid,
  ...props
}: ContainerProps) {
  const [pad, rest] = splitPadding(props);
  const width =
    size === undefined
      ? undefined
      : typeof size === 'number'
        ? `${size}px`
        : (CONTAINER_SIZES[size] ?? size);
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-container', className),
      ...(fluid ? { 'data-fluid': '' } : {}),
      style: {
        ...customProperties({ ...pad, '--mullion-container-size': width }),
        ...style,
      },
      children,
    },
    render,
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export interface GridProps extends UiElementProps, UiPaddingProps {
  gap?: UiSpacing | undefined;
  children?: ReactNode;
}

export interface GridColProps extends UiElementProps {
  /** Columns spanned, out of twelve. */
  span?: number | undefined;
  children?: ReactNode;
}

function GridCol({ className, style, render, children, span, ...rest }: GridColProps) {
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-grid-col', className),
      style: { ...customProperties({ '--mullion-grid-span': span }), ...style },
      children,
    },
    render,
  );
}

function GridRoot({ className, style, render, children, gap, ...props }: GridProps) {
  const [pad, rest] = splitPadding(props);
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-grid', className),
      style: {
        ...customProperties({ ...pad, '--mullion-gap': spacingValue(gap) }),
        ...style,
      },
      children,
    },
    render,
  );
}

/** A twelve-column grid. `Grid.Col` takes the span, as the two call sites already spell it. */
export const Grid = Object.assign(GridRoot, { Col: GridCol });

// ---------------------------------------------------------------------------
// SimpleGrid
// ---------------------------------------------------------------------------

/**
 * Breakpoints are constants in the sheet, not tokens. A media query cannot
 * read a custom property, so the theme's `breakpoints` block could never have
 * reached one; no bundled theme overrides it, and the values here are those.
 */
export type UiResponsiveCols = number | Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl', number>>;

export interface SimpleGridProps extends UiElementProps, UiPaddingProps {
  /** A column count, or one per breakpoint. */
  cols?: UiResponsiveCols | undefined;
  spacing?: UiSpacing | undefined;
  children?: ReactNode;
}

export function SimpleGrid({
  className,
  style,
  render,
  children,
  cols = 1,
  spacing,
  ...props
}: SimpleGridProps) {
  const [pad, rest] = splitPadding(props);
  const per = typeof cols === 'number' ? { base: cols } : cols;
  return renderElement(
    'div',
    {
      ...rest,
      className: cx('mullion-simple-grid', className),
      style: {
        ...customProperties({
          ...pad,
          '--mullion-gap': spacingValue(spacing),
          '--mullion-cols': per.base,
          '--mullion-cols-sm': per.sm,
          '--mullion-cols-md': per.md,
          '--mullion-cols-lg': per.lg,
          '--mullion-cols-xl': per.xl,
        }),
        ...style,
      },
      children,
    },
    render,
  );
}
