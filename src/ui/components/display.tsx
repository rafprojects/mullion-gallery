/**
 * Display primitives (P79-C): `Image`, `ColorSwatch` and `Table`.
 *
 * `Table` keeps the compound spelling the codebase already uses, because
 * `Table.Td` appears 178 times and `Table.Th` 154; renaming those is migration
 * cost that buys nothing. `Table.ScrollContainer` is the one part that is not
 * a table element: it is the horizontal scroller the 20 wide tables in the
 * admin panel sit in.
 */

import { useState, type ReactNode } from 'react';
import { renderElement, cx, type UiElementProps } from './element';
import { customProperties, radiusValue, type UiRadius, type UiScaleStep } from './scale';

export interface ImageProps extends UiElementProps {
  src?: string | undefined;
  alt: string;
  /** Shown when `src` fails to load. Without one a failed image renders an empty box. */
  fallbackSrc?: string | undefined;
  loading?: 'eager' | 'lazy' | undefined;
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down' | undefined;
  radius?: UiRadius | undefined;
  width?: number | string | undefined;
  height?: number | string | undefined;
}

const length = (value: number | string | undefined): string | undefined =>
  typeof value === 'number' ? `${value}px` : value;

export function Image({
  className,
  style,
  render,
  src,
  fallbackSrc,
  fit,
  radius,
  width,
  height,
  ...rest
}: ImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = failed && fallbackSrc !== undefined ? fallbackSrc : src;
  return renderElement(
    'img',
    {
      ...rest,
      ...(resolved !== undefined ? { src: resolved } : {}),
      className: cx('mullion-image', className),
      onError: () => setFailed(true),
      style: {
        ...customProperties({
          '--mullion-image-fit': fit,
          '--mullion-image-width': length(width),
          '--mullion-image-height': length(height),
          '--mullion-radius': radiusValue(radius),
        }),
        ...style,
      },
    },
    render,
  );
}

export interface ColorSwatchProps extends UiElementProps {
  /**
   * The colour to show. This is the one prop in the framework that takes a
   * colour value, because the swatch's whole job is to display one the user
   * picked; it travels as an inline custom property, never into a sheet.
   */
  color: string;
  size?: number | string | undefined;
  radius?: UiRadius | undefined;
  children?: ReactNode;
}

export function ColorSwatch({
  className,
  style,
  render,
  color,
  size = 24,
  radius,
  children,
  ...rest
}: ColorSwatchProps) {
  return renderElement(
    'span',
    {
      ...rest,
      className: cx('mullion-color-swatch', className),
      style: {
        ...customProperties({
          '--mullion-swatch-color': color,
          '--mullion-swatch-size': length(size),
          '--mullion-radius': radiusValue(radius),
        }),
        ...style,
      },
      children,
    },
    render,
  );
}

interface TablePartProps extends UiElementProps {
  children?: ReactNode;
}

function part(tag: string, className: string) {
  return function TablePart({ className: extra, style, render, children, ...rest }: TablePartProps) {
    return renderElement(
      tag,
      {
        ...rest,
        className: cx(className, extra),
        ...(style ? { style } : {}),
        children,
      },
      render,
    );
  };
}

export interface TableScrollContainerProps extends UiElementProps {
  /** The width below which the table scrolls instead of squashing. */
  minWidth?: number | string | undefined;
  children?: ReactNode;
}

function TableScrollContainer({
  className,
  style,
  render,
  minWidth,
  children,
}: TableScrollContainerProps) {
  return renderElement(
    'div',
    {
      className: cx('mullion-table-scroll', className),
      style: {
        ...customProperties({ '--mullion-table-min-width': length(minWidth) }),
        ...style,
      },
      children: <div className="mullion-table-scroll-inner">{children}</div>,
    },
    render,
  );
}

export interface TableProps extends UiElementProps {
  striped?: boolean | undefined;
  highlightOnHover?: boolean | undefined;
  withTableBorder?: boolean | undefined;
  withColumnBorders?: boolean | undefined;
  verticalSpacing?: UiScaleStep | undefined;
  children?: ReactNode;
}

function TableRoot({
  className,
  style,
  render,
  children,
  striped,
  highlightOnHover,
  withTableBorder,
  withColumnBorders,
  verticalSpacing = 'sm',
  ...rest
}: TableProps) {
  return renderElement(
    'table',
    {
      ...rest,
      className: cx('mullion-table', className),
      'data-spacing': verticalSpacing,
      ...(striped ? { 'data-striped': '' } : {}),
      ...(highlightOnHover ? { 'data-hover': '' } : {}),
      ...(withTableBorder ? { 'data-with-border': '' } : {}),
      ...(withColumnBorders ? { 'data-column-borders': '' } : {}),
      ...(style ? { style } : {}),
      children,
    },
    render,
  );
}

export const Table = Object.assign(TableRoot, {
  Thead: part('thead', 'mullion-table-thead'),
  Tbody: part('tbody', 'mullion-table-tbody'),
  Tfoot: part('tfoot', 'mullion-table-tfoot'),
  Tr: part('tr', 'mullion-table-tr'),
  Th: part('th', 'mullion-table-th'),
  Td: part('td', 'mullion-table-td'),
  Caption: part('caption', 'mullion-table-caption'),
  ScrollContainer: TableScrollContainer,
});
