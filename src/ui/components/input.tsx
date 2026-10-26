/**
 * The input family (P80-A): `TextInput`, `Textarea`, `PasswordInput` and
 * `NumberInput`.
 *
 * These are where P76-D/H collapsed the borders and P76-I-1 killed the focus
 * indicator, and the reason both were possible is that Mantine renders all six
 * of its input components through one `Input`, so the adapter's single entry
 * reached every one of them at once. Reproducing that coupling is not a goal:
 * each component here composes Base UI's `Field` parts itself, and a change to
 * one reaches one.
 *
 * Every state that used to need an inline colour is a token read by a data
 * attribute (study principle 2). The border, the focus border, the ground and
 * the placeholder are `input-bd`, `input-bd-focus`, `input-bg` and
 * `input-placeholder-color` from the engine's component tier, which is the
 * tier the 1.4.11 audit can name.
 *
 * `ColorInput` is deliberately absent. Base UI ships no colour picker (P78-B
 * recorded the gap when it picked the primitive), a saturation-and-hue surface
 * is a component in its own right, and P80-B owns writing or vendoring it.
 */

import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { Field } from '@base-ui/react/field';
import { NumberField } from '@base-ui/react/number-field';
import { cx, focusable } from './element';
import { ActionIcon } from './control';
import { FieldShell, type FieldShellProps, type FieldStyleProps } from './field';
import { customProperties, radiusValue } from './scale';
import { useUiLabels } from '../provider/hooks';

// ---------------------------------------------------------------------------
// TextInput and PasswordInput
// ---------------------------------------------------------------------------

export interface TextInputProps extends FieldShellProps, FieldStyleProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  /**
   * The change event, as the 80 call sites read it: `e.currentTarget.value`.
   * `NumberInput` differs and hands the value straight through, because that
   * is how its call sites read it and normalising one onto the other would
   * make every migrated site wrong in a way that still compiles.
   */
  onChange?: ((event: ChangeEvent<HTMLInputElement>) => void) | undefined;
  placeholder?: string | undefined;
  /** `PasswordInput` is the field to reach for; `'password'` is here so it can set it. */
  type?: 'text' | 'email' | 'url' | 'search' | 'tel' | 'password' | 'datetime-local' | undefined;
  /**
   * `bare` is a field edited in place, such as a title: no ground or edge at
   * rest, with both reserved so nothing moves, an edge on hover and the
   * ordinary field once focused (designer, 2026-10-26). There is no `filled`.
   */
  variant?: 'default' | 'bare' | undefined;
  name?: string | undefined;
  readOnly?: boolean | undefined;
  autoComplete?: string | undefined;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement> | undefined;
  onBlur?: React.FocusEventHandler<HTMLInputElement> | undefined;
  onFocus?: React.FocusEventHandler<HTMLInputElement> | undefined;
  onClick?: React.MouseEventHandler<HTMLInputElement> | undefined;
  autoFocus?: boolean | undefined;
  /** Names the input over its visible label, as Mantine let it. */
  'aria-label'?: string | undefined;
}

/** A single-line text field. */
export const TextInput = forwardRef(function TextInput(
  {
    label,
    description,
    error,
    required,
    disabled,
    size,
    radius,
    leftSection,
    rightSection,
    className,
    style,
    variant,
    ...input
  }: TextInputProps,
  ref: Ref<HTMLInputElement>,
) {
  return (
    <FieldShell
      {...{ label, description, error, required, disabled, size, radius, leftSection, rightSection, className, style }}
      {...(variant === 'bare' ? { variantClass: 'mullion-field-control-bare' } : {})}
    >
      <Field.Control
        ref={ref}
        className="mullion-field-input"
        {...focusable}
        {...(disabled ? { disabled: true } : {})}
        {...(required ? { required: true } : {})}
        {...input}
        // An explicit aria-label names the input, as it did under Mantine; Base UI's label link would outrank it.
        {...(input['aria-label'] !== undefined ? { 'aria-labelledby': undefined } : {})}
      />
    </FieldShell>
  );
});

export interface PasswordInputProps extends Omit<TextInputProps, 'type'> {
  /** The accessible name of the reveal toggle. Defaults to the provider's `labels`. */
  revealLabel?: string | undefined;
}

/**
 * A password field with a reveal toggle.
 *
 * The toggle is a real `ActionIcon` in the right section rather than a bare
 * glyph, so it is focusable, has an accessible name and takes the same ring as
 * every other control. A reveal that only a mouse can reach is the usual
 * defect here.
 */
/** The eye, struck through once the password shows: the icons people recognise for this. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      focusable={false}
      data-icon={off ? 'eye-off' : 'eye'}
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12 C5 6.5 8.5 4.5 12 4.5 C15.5 4.5 19 6.5 22 12 C19 17.5 15.5 19.5 12 19.5 C8.5 19.5 5 17.5 2 12 Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4 L20 20" />}
    </svg>
  );
}

export const PasswordInput = forwardRef(function PasswordInput(
  { revealLabel, rightSection, ...rest }: PasswordInputProps,
  ref: Ref<HTMLInputElement>,
) {
  const labels = useUiLabels();
  const [revealed, setRevealed] = useState(false);
  return (
    <TextInput
      ref={ref}
      type={revealed ? 'text' : 'password'}
      {...rest}
      rightSection={
        <>
          {rightSection}
          {/* A 24px target, since a control inside a field has no spacing exception (designer, 2026-10-26). */}
          <ActionIcon
            variant="subtle"
            size={24}
            aria-label={revealLabel ?? labels.showPassword}
            aria-pressed={revealed}
            onClick={() => setRevealed((v) => !v)}
          >
            <EyeIcon off={revealed} />
          </ActionIcon>
        </>
      }
    />
  );
});

// ---------------------------------------------------------------------------
// Textarea
// ---------------------------------------------------------------------------

export interface TextareaProps extends FieldShellProps, FieldStyleProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((event: ChangeEvent<HTMLTextAreaElement>) => void) | undefined;
  placeholder?: string | undefined;
  name?: string | undefined;
  readOnly?: boolean | undefined;
  /** Grow with the content between these two, in rows. */
  minRows?: number | undefined;
  maxRows?: number | undefined;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement> | undefined;
}

/**
 * A multi-line field that grows with its content.
 *
 * The autosize is ours: the study's section 4 names it as behavioural code the
 * framework writes rather than buys, because no headless primitive ships it.
 * It measures by resetting the height and reading `scrollHeight`, which is the
 * one approach that does not need a hidden replica element to stay in sync.
 */
export const Textarea = forwardRef(function Textarea(
  {
    label,
    description,
    error,
    required,
    disabled,
    size,
    radius,
    leftSection,
    rightSection,
    className,
    style,
    minRows = 2,
    maxRows,
    value,
    onChange,
    ...rest
  }: TextareaProps,
  ref: Ref<HTMLTextAreaElement>,
) {
  const own = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = own.current;
    if (!el) return;
    // Reset first: a textarea's scrollHeight never shrinks below its current
    // height, so measuring without this makes the field one-way.
    el.style.height = 'auto';
    const line = parseFloat(getComputedStyle(el).lineHeight) || 0;
    const padding = el.offsetHeight - el.clientHeight;
    const min = line * minRows + padding;
    const max = maxRows ? line * maxRows + padding : Number.POSITIVE_INFINITY;
    el.style.height = `${Math.min(Math.max(el.scrollHeight, min), max)}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [minRows, maxRows]);

  useLayoutEffect(resize, [resize, value]);

  return (
    <FieldShell
      {...{ label, description, error, required, disabled, size, radius, leftSection, rightSection, className, style }}
      variantClass="mullion-field-control-multiline"
    >
      <Field.Control
        render={
          <textarea
            ref={(node: HTMLTextAreaElement | null) => {
              own.current = node;
              if (typeof ref === 'function') ref(node);
              else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
            }}
            rows={minRows}
          />
        }
        className="mullion-field-input"
        {...focusable}
        {...(disabled ? { disabled: true } : {})}
        {...(required ? { required: true } : {})}
        {...(value !== undefined ? { value } : {})}
        onChange={((event: ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(event);
          resize();
          // Field.Control types its handler for an `input`; the rendered
          // element here is a `textarea`, so the cast describes what actually
          // fires rather than what the generic default assumes.
        }) as unknown as React.ChangeEventHandler<HTMLInputElement>}
        {...(rest as unknown as Record<string, unknown>)}
      />
    </FieldShell>
  );
});

// ---------------------------------------------------------------------------
// NumberInput
// ---------------------------------------------------------------------------

/** What a call site may put on the input itself: its name for assistive tech and its handlers. */
type NumberInputAttributes = Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'aria-label' | 'aria-labelledby' | 'name' | 'autoFocus' | 'onBlur' | 'onFocus' | 'onKeyDown'
>;

export interface NumberInputProps extends FieldShellProps, FieldStyleProps, NumberInputAttributes {
  value?: number | null | undefined;
  defaultValue?: number | null | undefined;
  /** The value, not an event: this is how the 136 call sites read it. */
  onChange?: ((value: number | null) => void) | undefined;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  placeholder?: string | undefined;
  readOnly?: boolean | undefined;
  /** Maximum digits after the decimal point. */
  decimalScale?: number | undefined;
  /**
   * The unit slot: a first-class part inside the field's border.
   *
   * A string renders as static text. A node renders as given, which is how a
   * unit *picker* lives inside the field. This exists because
   * `UnitScrubField` posts an unstyled `Select` into a Mantine
   * `rightSection`, sized by a hand-computed width and held together by four
   * `styles` overrides forcing `height: 100%`; the seam shows and the field
   * is taller than its neighbours. The slot is the reason that component can
   * be rewritten rather than ported, and it is the named blocker for P81-B's
   * Typography panel redesign.
   */
  unit?: ReactNode | undefined;
  /**
   * The steppers. `stacked` chevrons at the right edge by default, as Mantine
   * drew them, out of the tab order because the arrow keys are the keyboard
   * path (designer, 2026-10-26). `flank` puts a minus before the value and a
   * plus after it, focusable, for the rare call site that wants them.
   */
  controls?: 'stacked' | 'flank' | 'none' | undefined;
  /** Names for the stepper buttons. Default to the provider's `labels`. */
  incrementLabel?: string | undefined;
  decrementLabel?: string | undefined;
  /**
   * Drag the label horizontally to change the value. Base UI's `ScrubArea`
   * owns the pointer capture, the cursor teleport and the sensitivity, all of
   * which `UnitScrubField` currently hand-rolls.
   */
  scrubbable?: boolean | undefined;
}

/** A stepper's chevron, drawn in the stepper's ink. */
function Chevron({ up }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable={false}>
      <path
        d={up ? 'M6 15 L12 9 L18 15' : 'M6 9 L12 15 L18 9'}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A numeric field with an optional unit slot and stepper. */
export function NumberInput({
  label,
  description,
  error,
  required,
  disabled,
  size,
  radius,
  leftSection,
  rightSection,
  className,
  style,
  value,
  defaultValue,
  onChange,
  min,
  max,
  step,
  placeholder,
  readOnly,
  decimalScale,
  unit,
  controls = 'stacked',
  incrementLabel,
  decrementLabel,
  scrubbable,
  ...attributes
}: NumberInputProps) {
  const labels = useUiLabels();
  const invalid = error !== undefined && error !== false;
  /*
   * Base UI's `NumberField` has no `Label` part, so the association is ours to
   * make. The first draft rendered the label as a bare `span` and the control
   * had no accessible name at all: a screen reader announced an unlabelled
   * spin button, and the unit tests could not find it by name either, which is
   * how it was caught. An explicit `id` and a real `<label for>` is the form
   * that cannot come apart.
   */
  const inputId = useId();
  const describedBy: string[] = [];
  const flank = controls === 'flank';
  if (description !== undefined) describedBy.push(`${inputId}-description`);
  if (typeof error !== 'boolean' && error !== undefined) describedBy.push(`${inputId}-error`);

  return (
    <NumberField.Root
      className={cx('mullion-field', className)}
      id={inputId}
      data-size={size ?? 'sm'}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined && defaultValue !== null ? { defaultValue } : {})}
      {...(onChange ? { onValueChange: (next: number | null) => onChange(next) } : {})}
      {...(min !== undefined ? { min } : {})}
      {...(max !== undefined ? { max } : {})}
      {...(step !== undefined ? { step } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(readOnly ? { readOnly: true } : {})}
      {...(required ? { required: true } : {})}
      // Ungrouped, as Mantine showed it: a pixel width reads 1200, not 1,200.
      format={{ useGrouping: false, ...(decimalScale !== undefined ? { maximumFractionDigits: decimalScale } : {}) }}
      style={{ ...customProperties({ '--mullion-radius': radiusValue(radius) }), ...style }}
    >
      {label !== undefined &&
        (scrubbable ? (
          <NumberField.ScrubArea className="mullion-field-label mullion-field-label-scrub">
            <label htmlFor={inputId}>{label}</label>
            <NumberField.ScrubAreaCursor />
          </NumberField.ScrubArea>
        ) : (
          <label className="mullion-field-label" htmlFor={inputId}>
            {label}
            {required && (
              <span className="mullion-field-required" aria-hidden>
                *
              </span>
            )}
          </label>
        ))}
      {description !== undefined && (
        <span className="mullion-field-description" id={`${inputId}-description`}>
          {description}
        </span>
      )}
      <NumberField.Group
        className={cx('mullion-field-control', invalid && 'mullion-field-control-invalid')}
      >
        {leftSection !== undefined && <span className="mullion-field-section">{leftSection}</span>}
        {flank && (
          <NumberField.Decrement
            className="mullion-field-step"
            aria-label={decrementLabel ?? labels.decrement}
            {...focusable}
          >
            <span aria-hidden>&minus;</span>
          </NumberField.Decrement>
        )}
        <NumberField.Input
          {...attributes}
          id={inputId}
          className="mullion-field-input"
          {...focusable}
          {...(describedBy.length > 0 ? { 'aria-describedby': describedBy.join(' ') } : {})}
          {...(placeholder !== undefined ? { placeholder } : {})}
        />
        {/*
         * The unit sits inside the field's border and shares its height, so
         * there is no second control to line up and no seam to hide.
         */}
        {unit !== undefined && <span className="mullion-field-unit">{unit}</span>}
        {flank && (
          <NumberField.Increment
            className="mullion-field-step"
            aria-label={incrementLabel ?? labels.increment}
            {...focusable}
          >
            <span aria-hidden>+</span>
          </NumberField.Increment>
        )}
        {controls === 'stacked' && (
          <span className="mullion-field-steppers">
            <NumberField.Increment className="mullion-field-stepper" tabIndex={-1} aria-hidden>
              <Chevron up />
            </NumberField.Increment>
            <NumberField.Decrement className="mullion-field-stepper" tabIndex={-1} aria-hidden>
              <Chevron />
            </NumberField.Decrement>
          </span>
        )}
        {rightSection !== undefined && <span className="mullion-field-section">{rightSection}</span>}
      </NumberField.Group>
      {typeof error !== 'boolean' && error !== undefined && (
        <span className="mullion-field-error" id={`${inputId}-error`}>
          {error}
        </span>
      )}
    </NumberField.Root>
  );
}
