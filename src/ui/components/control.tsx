/**
 * Controls with no behaviour to buy (P79-C): `UnstyledButton`, `Button`,
 * `ActionIcon`, `CloseButton`, `Chip`, `FileButton` and `CopyButton`.
 *
 * Every one of them is a native `<button>`, `<label>` or `<input>`: there is
 * no keyboard handling, no focus management and no ARIA state machine here,
 * which is what puts them in this phase rather than in Phase 80. What they do
 * own is the focus attribute. Each renders through `ControlBase`, so the ring
 * rule in `../styles/focus.css` reaches every one of them by construction
 * rather than by a selector list someone has to remember to extend, which is
 * how P77-F's ring missed the Switch track twice.
 */

import { useCallback, useEffect, useState, type MouseEventHandler, type ReactNode } from 'react';
import {
  renderElement,
  cx,
  focusable,
  focusableSibling,
  type UiElementProps,
  type UiTone,
} from './element';
import { Loader } from './feedback';
import { customProperties, radiusValue, type UiRadius, type UiScaleStep } from './scale';

export type UiControlVariant = 'filled' | 'light' | 'outline' | 'subtle' | 'default' | 'transparent';

interface ControlBaseProps extends UiElementProps {
  type?: 'button' | 'submit' | 'reset' | undefined;
  disabled?: boolean | undefined;
  onClick?: MouseEventHandler<HTMLElement> | undefined;
  children?: ReactNode;
}

/**
 * The one place a framework control becomes an element. It stamps the focus
 * attribute and sets `type="button"`, which is the default every call site
 * wants and the one HTML gets wrong inside a form.
 */
function ControlBase({
  className,
  style,
  render,
  children,
  type = 'button',
  disabled,
  ...rest
}: ControlBaseProps & Record<string, unknown>) {
  return renderElement(
    'button',
    {
      ...rest,
      ...focusable,
      type,
      ...(disabled ? { disabled: true } : {}),
      ...(className !== undefined ? { className } : {}),
      ...(style ? { style } : {}),
      children,
    },
    render,
  );
}

export interface UnstyledButtonProps extends ControlBaseProps {
  children?: ReactNode;
}

/** A button with the browser's own styling removed and nothing put back. */
export function UnstyledButton({ className, ...rest }: UnstyledButtonProps) {
  return <ControlBase className={cx('mullion-unstyled-button', className)} {...rest} />;
}

export interface ButtonProps extends ControlBaseProps {
  variant?: UiControlVariant | undefined;
  size?: UiScaleStep | undefined;
  tone?: UiTone | undefined;
  radius?: UiRadius | undefined;
  /** Trade the label's vertical padding for a denser row, as Mantine's `compact-*` sizes do. */
  compact?: boolean | undefined;
  fullWidth?: boolean | undefined;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
  /** Swap the left section for a spinner and stop taking clicks. */
  loading?: boolean | undefined;
  children?: ReactNode;
}

export function Button({
  className,
  style,
  children,
  variant = 'filled',
  size = 'sm',
  tone = 'primary',
  radius,
  compact,
  fullWidth,
  leftSection,
  rightSection,
  loading,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <ControlBase
      className={cx('mullion-button', className)}
      data-variant={variant}
      data-size={size}
      data-mullion-tone={tone}
      {...(compact ? { 'data-compact': '' } : {})}
      {...(fullWidth ? { 'data-full-width': '' } : {})}
      {...(loading ? { 'data-loading': '' } : {})}
      disabled={disabled === true || loading === true}
      style={{ ...customProperties({ '--mullion-radius': radiusValue(radius) }), ...style }}
      {...rest}
    >
      {loading ? (
        <Loader className="mullion-button-section" size={size} />
      ) : leftSection ? (
        <span className="mullion-button-section">{leftSection}</span>
      ) : null}
      <span className="mullion-button-label">{children}</span>
      {rightSection ? <span className="mullion-button-section">{rightSection}</span> : null}
    </ControlBase>
  );
}

export interface ActionIconProps extends ControlBaseProps {
  variant?: UiControlVariant | undefined;
  size?: UiScaleStep | number | undefined;
  tone?: UiTone | undefined;
  radius?: UiRadius | undefined;
  loading?: boolean | undefined;
  /** Required in practice: the control has no text, so nothing else names it. */
  'aria-label'?: string | undefined;
  children?: ReactNode;
}

export function ActionIcon({
  className,
  style,
  children,
  variant = 'subtle',
  size = 'sm',
  tone = 'primary',
  radius,
  loading,
  disabled,
  ...rest
}: ActionIconProps) {
  const custom = typeof size === 'number' ? `${size}px` : undefined;
  return (
    <ControlBase
      className={cx('mullion-action-icon', className)}
      data-variant={variant}
      data-mullion-tone={tone}
      {...(custom === undefined ? { 'data-size': size } : {})}
      {...(loading ? { 'data-loading': '' } : {})}
      disabled={disabled === true || loading === true}
      style={{
        ...customProperties({
          '--mullion-control-size': custom,
          '--mullion-radius': radiusValue(radius),
        }),
        ...style,
      }}
      {...rest}
    >
      {loading ? <Loader size={custom ?? 16} /> : children}
    </ControlBase>
  );
}

export interface CloseButtonProps extends Omit<ActionIconProps, 'children'> {
  /** The accessible name. Defaults to "Close"; pass a translated string at every real call site. */
  'aria-label'?: string | undefined;
}

/**
 * The cross. It draws itself from two pseudo-elements rather than shipping an
 * icon, so an overlay's close affordance costs no icon import and follows the
 * control's own colour.
 */
export function CloseButton({ className, ...rest }: CloseButtonProps) {
  return (
    <ActionIcon
      className={cx('mullion-close-button', className)}
      aria-label={rest['aria-label'] ?? 'Close'}
      {...rest}
    />
  );
}

export interface ChipProps extends UiElementProps {
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  onChange?: ((checked: boolean) => void) | undefined;
  value?: string | undefined;
  name?: string | undefined;
  size?: UiScaleStep | undefined;
  tone?: UiTone | undefined;
  disabled?: boolean | undefined;
  children?: ReactNode;
}

/**
 * A checkbox wearing a pill. The input is real and visually hidden rather than
 * `display: none`, so it stays in the tab order and keeps its native
 * semantics; the ring is drawn on the label, which is the element with a box.
 */
export function Chip({
  className,
  style,
  checked,
  defaultChecked,
  onChange,
  value,
  name,
  size = 'sm',
  tone = 'primary',
  disabled,
  children,
  ...rest
}: ChipProps) {
  return (
    <label
      className={cx('mullion-chip', className)}
      data-size={size}
      data-mullion-tone={tone}
      {...(disabled ? { 'data-disabled': '' } : {})}
      {...(style ? { style } : {})}
      {...rest}
    >
      <input
        className="mullion-chip-input"
        type="checkbox"
        {...focusableSibling}
        {...(checked !== undefined ? { checked } : {})}
        {...(defaultChecked !== undefined ? { defaultChecked } : {})}
        {...(value !== undefined ? { value } : {})}
        {...(name !== undefined ? { name } : {})}
        {...(disabled ? { disabled: true } : {})}
        onChange={(event) => onChange?.(event.currentTarget.checked)}
      />
      <span className="mullion-chip-label">{children}</span>
    </label>
  );
}

export interface FileButtonProps {
  onChange: (files: File[]) => void;
  accept?: string | undefined;
  multiple?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Handed the props to spread onto whatever opens the picker. */
  children: (props: { onClick: () => void; disabled: boolean }) => ReactNode;
}

/**
 * A hidden `<input type="file">` and a way to open it. The render prop mirrors
 * the eight call sites already written against Mantine's, so the migration is
 * an import change. The input is reset after every pick, because choosing the
 * same file twice fires no `change` event otherwise.
 *
 * The element is held in state rather than a ref: the opener is handed to a
 * render prop called during render, and a closure over a ref read there is
 * what `react-hooks/refs` forbids. State costs one extra render on mount and
 * makes the dependency honest.
 */
export function FileButton({ onChange, accept, multiple, disabled, children }: FileButtonProps) {
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const open = useCallback(() => input?.click(), [input]);
  return (
    <>
      {children({ onClick: open, disabled: disabled === true })}
      <input
        ref={setInput}
        type="file"
        className="mullion-visually-hidden"
        tabIndex={-1}
        {...(accept !== undefined ? { accept } : {})}
        {...(multiple ? { multiple: true } : {})}
        {...(disabled ? { disabled: true } : {})}
        onChange={(event) => {
          onChange(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = '';
        }}
      />
    </>
  );
}

export interface CopyButtonProps {
  value: string;
  /** How long the copied state shows, in milliseconds. */
  timeout?: number | undefined;
  children: (props: { copied: boolean; copy: () => void }) => ReactNode;
}

/**
 * Copies `value` and reports whether it just did. The clipboard call is
 * guarded: a document without permission rejects, and a failed copy must leave
 * the button saying it did not copy rather than lying.
 *
 * The countdown is a counter and an effect rather than a timer in a ref. A
 * second copy increments it, so the effect re-runs and the window restarts,
 * and unmounting clears the timer through the effect's own cleanup.
 */
export function CopyButton({ value, timeout = 1000, children }: CopyButtonProps) {
  const [copies, setCopies] = useState(0);

  useEffect(() => {
    if (copies === 0) return undefined;
    const id = setTimeout(() => setCopies(0), timeout);
    return () => clearTimeout(id);
  }, [copies, timeout]);

  const copy = useCallback(() => {
    void Promise.resolve(navigator.clipboard?.writeText(value))
      .then(() => setCopies((n) => n + 1))
      .catch(() => setCopies(0));
  }, [value]);

  return <>{children({ copied: copies > 0, copy })}</>;
}
