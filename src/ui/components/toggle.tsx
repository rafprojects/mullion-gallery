/**
 * The choice controls (P80-B): `Checkbox`, `Switch` and `Slider`.
 *
 * Base UI owns every keypress: Space on a checkbox or a switch, and the
 * slider's arrows, Home, End and the page keys that move by `largeStep`. This
 * module supplies the label composition, the classes and a sheet reading
 * tokens, and one piece of behaviour the primitive does not ship: the slider's
 * value tooltip, which 38 call sites format themselves.
 *
 * **`onChange` hands over the value, not the event**, for all three. The 76
 * `Switch` and 11 `Checkbox` call sites read `event.currentTarget.checked`
 * today, so every one of them has to change at migration. That is deliberate:
 * `Chip` has handed a boolean since P79-C and the two controls do the same
 * thing, and a site left unconverted does not compile, because a `boolean` has
 * no `currentTarget`. The input family kept the event shape for the opposite
 * reason: there the call sites were already split between the two shapes.
 */

import type { ReactNode } from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { Slider as BaseSlider } from '@base-ui/react/slider';
import { Field } from '@base-ui/react/field';
import { cx, focusable } from './element';
import type { FieldStyleProps } from './field';
import { customProperties, type UiScaleStep } from './scale';

/** What a checkbox and a switch share: a label, an optional description, a state. */
interface ToggleProps extends FieldStyleProps {
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  checked?: boolean | undefined;
  defaultChecked?: boolean | undefined;
  /** The new state, not an event. See the module note. */
  onChange?: ((checked: boolean) => void) | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  required?: boolean | undefined;
  size?: UiScaleStep | undefined;
  name?: string | undefined;
  value?: string | undefined;
  'aria-label'?: string | undefined;
}

/**
 * The label wraps the control, which is Base UI's simplest labelling pattern
 * and the reason its `Checkbox.Root` and `Switch.Root` render a `span` rather
 * than a button. `Field.Root` is what carries the description to the control's
 * `aria-describedby`, so nothing here writes an id relationship by hand: that
 * is the association P80-A's `NumberInput` got wrong once, and the way not to
 * get it wrong is to let the primitive own it.
 */
function ToggleShell({
  label,
  description,
  size = 'sm',
  disabled,
  className,
  style,
  variantClass,
  children,
}: {
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  size?: UiScaleStep | undefined;
  disabled?: boolean | undefined;
  variantClass: string;
  children: ReactNode;
} & FieldStyleProps) {
  return (
    <Field.Root
      className={cx('mullion-toggle', variantClass, className)}
      data-size={size}
      {...(disabled ? { disabled: true } : {})}
      {...(style ? { style } : {})}
    >
      <Field.Label className="mullion-toggle-row">
        {children}
        {label !== undefined && <span className="mullion-toggle-label">{label}</span>}
      </Field.Label>
      {description !== undefined && (
        <Field.Description className="mullion-toggle-description">{description}</Field.Description>
      )}
    </Field.Root>
  );
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

export interface CheckboxProps extends ToggleProps {
  /** Neither checked nor unchecked: the "some of the rows" state a header uses. */
  indeterminate?: boolean | undefined;
}

/** A check mark and a dash, drawn rather than typed so they scale with the box. */
function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M3.5 8.5 L6.5 11.5 L12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M4 8 H12" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

/** A box that is on, off, or neither. */
export function Checkbox({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled,
  readOnly,
  required,
  indeterminate,
  size,
  name,
  value,
  className,
  style,
  ...rest
}: CheckboxProps) {
  return (
    <ToggleShell
      label={label}
      description={description}
      size={size}
      disabled={disabled}
      className={className}
      style={style}
      variantClass="mullion-toggle-checkbox"
    >
      <BaseCheckbox.Root
        className="mullion-checkbox"
        {...(checked !== undefined ? { checked } : {})}
        {...(defaultChecked !== undefined ? { defaultChecked } : {})}
        {...(onChange ? { onCheckedChange: (next: boolean) => onChange(next) } : {})}
        {...(disabled ? { disabled: true } : {})}
        {...(readOnly ? { readOnly: true } : {})}
        {...(required ? { required: true } : {})}
        {...(indeterminate ? { indeterminate: true } : {})}
        {...(name !== undefined ? { name } : {})}
        {...(value !== undefined ? { value } : {})}
        {...focusable}
        {...rest}
      >
        <BaseCheckbox.Indicator className="mullion-checkbox-indicator" keepMounted>
          {indeterminate ? <DashGlyph /> : <CheckGlyph />}
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>
    </ToggleShell>
  );
}

// ---------------------------------------------------------------------------
// Switch
// ---------------------------------------------------------------------------

export type SwitchProps = ToggleProps;

/** A track and a thumb. The same state as a checkbox, announced as a switch. */
export function Switch({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled,
  readOnly,
  required,
  size,
  name,
  value,
  className,
  style,
  ...rest
}: SwitchProps) {
  return (
    <ToggleShell
      label={label}
      description={description}
      size={size}
      disabled={disabled}
      className={className}
      style={style}
      variantClass="mullion-toggle-switch"
    >
      <BaseSwitch.Root
        className="mullion-switch"
        {...(checked !== undefined ? { checked } : {})}
        {...(defaultChecked !== undefined ? { defaultChecked } : {})}
        {...(onChange ? { onCheckedChange: (next: boolean) => onChange(next) } : {})}
        {...(disabled ? { disabled: true } : {})}
        {...(readOnly ? { readOnly: true } : {})}
        {...(required ? { required: true } : {})}
        {...(name !== undefined ? { name } : {})}
        {...(value !== undefined ? { value } : {})}
        {...focusable}
        {...rest}
      >
        <BaseSwitch.Thumb className="mullion-switch-thumb" />
      </BaseSwitch.Root>
    </ToggleShell>
  );
}

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

/** A labelled position on the track. */
export interface UiSliderMark {
  value: number;
  label?: ReactNode | undefined;
}

export interface SliderProps extends FieldStyleProps {
  value?: number | undefined;
  defaultValue?: number | undefined;
  /** The value, not an event, as all 56 call sites read it. */
  onChange?: ((value: number) => void) | undefined;
  /** Called once when the drag or the key repeat settles. */
  onChangeEnd?: ((value: number) => void) | undefined;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  /** How far PageUp and PageDown move. Defaults to ten steps. */
  largeStep?: number | undefined;
  /**
   * Formats the value shown over the thumb while it is dragged or focused.
   * 38 call sites pass one, mostly to add a unit.
   */
  label?: ((value: number) => ReactNode) | undefined;
  /** Keeps the value visible rather than showing it only while in use. */
  labelAlwaysOn?: boolean | undefined;
  marks?: readonly UiSliderMark[] | undefined;
  size?: UiScaleStep | undefined;
  disabled?: boolean | undefined;
  name?: string | undefined;
  /**
   * Names the slider. It goes on the THUMB, not on the root: Base UI renders
   * the root as a `role="group"` and puts the slider itself in a visually
   * hidden `<input type="range">` inside the thumb, so a label on the root
   * names the group and leaves the control unnamed. The unit tests found this
   * the same way P80-A's `NumberInput` defect was found, by failing to query
   * the control by name.
   */
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
}

/**
 * One value along a track.
 *
 * The tooltip over the thumb is the one piece of behaviour written here, and it
 * is written rather than wrapped because Base UI has no such part: the call
 * sites format the value themselves (`(v) => `${v}%``), and a part that only
 * printed the raw number would serve none of them. It is `aria-hidden`,
 * because the thumb already carries the value in `aria-valuenow` and
 * `aria-valuetext`; a second announcement would be a duplicate.
 */
export function Slider({
  value,
  defaultValue,
  onChange,
  onChangeEnd,
  min = 0,
  max = 100,
  step = 1,
  largeStep,
  label,
  labelAlwaysOn,
  marks,
  size = 'sm',
  disabled,
  name,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: SliderProps) {
  const current = value ?? defaultValue ?? min;
  const percent = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <BaseSlider.Root
      className={cx('mullion-slider', className)}
      data-size={size}
      {...(labelAlwaysOn ? { 'data-label-always': '' } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onChange ? { onValueChange: (next: number) => onChange(next) } : {})}
      {...(onChangeEnd ? { onValueCommitted: (next: number) => onChangeEnd(next) } : {})}
      min={min}
      max={max}
      step={step}
      {...(largeStep !== undefined ? { largeStep } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(name !== undefined ? { name } : {})}
      {...(style ? { style } : {})}
      {...rest}
    >
      <BaseSlider.Control className="mullion-slider-control">
        <BaseSlider.Track className="mullion-slider-track">
          <BaseSlider.Indicator className="mullion-slider-indicator" />
          <BaseSlider.Thumb
            className="mullion-slider-thumb"
            {...(ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {})}
            {...(ariaLabelledBy !== undefined ? { 'aria-labelledby': ariaLabelledBy } : {})}
            {...focusable}
          >
            {label && (
              <span className="mullion-slider-value" aria-hidden>
                {label(current)}
              </span>
            )}
          </BaseSlider.Thumb>
        </BaseSlider.Track>
      </BaseSlider.Control>
      {marks && marks.length > 0 && (
        <div className="mullion-slider-marks" aria-hidden>
          {marks.map((mark) => (
            <span
              key={mark.value}
              className="mullion-slider-mark"
              style={customProperties({ '--mullion-slider-mark': `${percent(mark.value)}%` })}
            >
              {mark.label ?? mark.value}
            </span>
          ))}
        </div>
      )}
    </BaseSlider.Root>
  );
}