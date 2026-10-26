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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type MouseEventHandler,
  type ReactNode,
} from 'react';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import {
  renderElement,
  cx,
  focusable,
  focusableSibling,
  type UiElementProps,
  type UiTone,
} from './element';
import { Loader } from './feedback';
import { uiRem } from '../styles/rootScale';
import { resolveRoleGlyph } from './roleGlyph';
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
  /**
   * Content before the label. Omitted, a status tone supplies its role glyph;
   * pass `false` to decline it. Most toned buttons name their action in the
   * label and will decline it, but they decline it on purpose.
   */
  leftSection?: ReactNode | false;
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
  const glyph = resolveRoleGlyph(tone, leftSection);
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
      ) : glyph ? (
        <span className="mullion-button-section">{glyph}</span>
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
  // Mantine's default icon button is md, 28px; so is its close button (P81-A).
  size = 'md',
  tone = 'primary',
  radius,
  loading,
  disabled,
  ...rest
}: ActionIconProps) {
  // A number is pixels in the size basis, as Mantine's `rem(size)` read it (P81-A).
  const custom = typeof size === 'number' ? uiRem(size / 16) : undefined;
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
      {loading ? <Loader size={typeof size === 'number' ? size : 16} /> : children}
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

/**
 * [P80-B] What a `Chip.Group` tells the chips under it.
 *
 * Null when a chip stands alone, which is the case P79-C built and which keeps
 * working unchanged: a lone chip is its own checkbox with its own `checked`.
 */
interface ChipGroupValue {
  value: string[];
  multiple: boolean;
  name: string;
  toggle: (value: string, checked: boolean) => void;
}

const ChipGroupContext = createContext<ChipGroupValue | null>(null);
setMullionDebugDisplayName(ChipGroupContext, 'ChipGroupContext');

export interface ChipGroupProps {
  children?: ReactNode;
  /** A string for single choice, an array for multiple. */
  value?: string | string[] | null | undefined;
  defaultValue?: string | string[] | undefined;
  /** Handed the new selection: a string (or `''`) for single, an array for multiple. */
  onChange?: ((value: never) => void) | undefined;
  /** More than one chip at a time. Two of the four call sites set it false explicitly. */
  multiple?: boolean | undefined;
}

/**
 * [P80-B] Several chips sharing one value.
 *
 * Ours rather than a primitive's, and the reason is the markup: a chip is
 * already a real `<input>` inside a `<label>`, so a group only has to say which
 * input type to render and hold the value. Under `multiple={false}` the chips
 * become radios, which is what gives the group arrow keys and one tab stop for
 * free from the platform; under `multiple` they stay checkboxes. Wrapping Base
 * UI's `RadioGroup` or `CheckboxGroup` would mean replacing the chip's own
 * element, which nothing here needs.
 */
export function ChipGroup({ children, value, defaultValue, onChange, multiple = true }: ChipGroupProps) {
  const name = useId();
  const [internal, setInternal] = useState<string[]>(() => toValues(defaultValue));
  const controlled = value !== undefined;
  const current = controlled ? toValues(value) : internal;

  const toggle = useCallback(
    (entry: string, checked: boolean) => {
      const next = multiple
        ? checked
          ? [...current, entry]
          : current.filter((v) => v !== entry)
        : checked
          ? [entry]
          : [];
      if (!controlled) setInternal(next);
      // The shape a call site gets back matches the shape it passed in, which
      // is how Mantine's group reads and how all four call sites read it.
      (onChange as ((v: string | string[]) => void) | undefined)?.(
        multiple ? next : (next[0] ?? ''),
      );
    },
    [multiple, current, controlled, onChange],
  );

  const context = useMemo<ChipGroupValue>(
    () => ({ value: current, multiple, name, toggle }),
    [current, multiple, name, toggle],
  );

  return <ChipGroupContext.Provider value={context}>{children}</ChipGroupContext.Provider>;
}

function toValues(value: string | string[] | null | undefined): string[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? [...value] : [value];
}

/** No `render`: the chip is a fixed label-and-input pair, so there is no single element to swap. */
export interface ChipProps extends Omit<UiElementProps, 'render'> {
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
  /*
   * [P80-B] Inside a group the chip takes its state from the group and becomes
   * a radio when the group is single-choice, which is what hands the platform
   * the arrow keys and one tab stop. Outside a group nothing changes from
   * P79-C: it is its own checkbox with its own `checked`.
   */
  const group = useContext(ChipGroupContext);
  const grouped = group !== null && value !== undefined;
  const isChecked = grouped ? group.value.includes(value) : checked;

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
        type={grouped && !group.multiple ? 'radio' : 'checkbox'}
        {...focusableSibling}
        {...(isChecked !== undefined ? { checked: isChecked } : {})}
        {...(!grouped && defaultChecked !== undefined ? { defaultChecked } : {})}
        {...(value !== undefined ? { value } : {})}
        {...(grouped ? { name: group.name } : name !== undefined ? { name } : {})}
        {...(disabled ? { disabled: true } : {})}
        onChange={(event) => {
          if (grouped) group.toggle(value, event.currentTarget.checked);
          onChange?.(event.currentTarget.checked);
        }}
      />
      <span className="mullion-chip-label">{children}</span>
    </label>
  );
}

/*
 * Attached rather than exported alone, because all four call sites spell it
 * `Chip.Group`. The standalone export exists so the barrel can name the type.
 */
Chip.Group = ChipGroup;

export interface FileButtonProps {
  onChange: (files: File[]) => void;
  accept?: string | undefined;
  multiple?: boolean | undefined;
  disabled?: boolean | undefined;
  /**
   * Given a function that clears the picker, as Mantine's was. The input
   * already clears after every pick, so this exists for the call sites that
   * reset it explicitly after handling a file (P81-A).
   */
  resetRef?: { current: (() => void) | null } | undefined;
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
export function FileButton({ onChange, accept, multiple, disabled, resetRef, children }: FileButtonProps) {
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  const open = useCallback(() => input?.click(), [input]);
  useEffect(() => {
    if (!resetRef) return undefined;
    resetRef.current = () => {
      if (input) input.value = '';
    };
    return () => {
      resetRef.current = null;
    };
  }, [resetRef, input]);
  return (
    <>
      {children({ onClick: open, disabled: disabled === true })}
      {/* Out of the tab order and the accessibility tree: the caller's button is the control. */}
      <input
        ref={setInput}
        type="file"
        className="mullion-visually-hidden"
        tabIndex={-1}
        aria-hidden
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
