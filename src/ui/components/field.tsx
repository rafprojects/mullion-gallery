/**
 * The field shell (P80-A, extracted in P80-B).
 *
 * One label, description and error composition, shared by every control that
 * wears a field: the text family in `./input` and the select family in
 * `./select`. What P76-D/H proved dangerous was Mantine rendering all six
 * input *controls* through one `Input`, so a border change reached every one
 * at once. The label block is not that: it is the part every field genuinely
 * has in common, and giving each component its own copy would guarantee they
 * drift apart on the exact properties an audit names.
 *
 * The border lives on the CONTROL ROW rather than on the control, which is
 * what lets a unit, a stepper, a chevron or a run of chips sit inside the
 * field's border and share its height by construction.
 */

import type { ReactNode, Ref } from 'react';
import { Field } from '@base-ui/react/field';
import { cx, type UiElementProps } from './element';
import { customProperties, radiusValue, type UiRadius, type UiScaleStep } from './scale';

/**
 * `className` and `style` without the polymorphic `render`. Our `UiRender`
 * function form allows `--mullion-*` custom properties in `style` and Base
 * UI's types it as a plain `CSSProperties`, so the two function forms are not
 * interchangeable; these components forward to the primitive's parts rather
 * than through `renderElement`.
 */
export type FieldStyleProps = Omit<UiElementProps, 'render'>;

/** What every field carries around its control. */
export interface FieldShellProps {
  label?: ReactNode | undefined;
  description?: ReactNode | undefined;
  /** A string renders the message; `true` marks the field invalid without one. */
  error?: ReactNode | boolean | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  size?: UiScaleStep | undefined;
  radius?: UiRadius | undefined;
  /** Content inside the field's border, before the control. */
  leftSection?: ReactNode | undefined;
  /** Content inside the field's border, after the control. */
  rightSection?: ReactNode | undefined;
}

export type FieldShellInternal = FieldShellProps &
  FieldStyleProps & {
    children: ReactNode;
    /** Added to the control row so a component can style its own shape. */
    variantClass?: string | undefined;
    /** Rendered after the control row, inside the field. Where a popup mounts. */
    after?: ReactNode | undefined;
    /** The label's id, for a part outside the control that is named by it: a listbox. */
    labelId?: string | undefined;
    /** The control the label points at, when it is not the field's own control. */
    labelFor?: string | undefined;
    /** The bordered row, for a popup that lines up with the field rather than its control. */
    controlRef?: Ref<HTMLDivElement> | undefined;
  };

/**
 * Label, control, description and error in one place.
 *
 * The composition is ours rather than the primitive's default because the
 * order and the wrapper are what the sheet styles: the control sits in a
 * bordered row that also holds the two sections, so an affordance inside the
 * field shares the field's border rather than drawing its own. That is the
 * seam `UnitScrubField` currently fakes with four `styles` overrides.
 */
export function FieldShell({
  label,
  description,
  error,
  required,
  disabled,
  size = 'sm',
  radius,
  leftSection,
  rightSection,
  className,
  style,
  children,
  variantClass,
  after,
  labelId,
  labelFor,
  controlRef,
}: FieldShellInternal) {
  const invalid = error !== undefined && error !== false;
  return (
    <Field.Root
      className={cx('mullion-field', className)}
      data-size={size}
      {...(invalid ? { invalid: true } : {})}
      {...(disabled ? { disabled: true } : {})}
      style={{ ...customProperties({ '--mullion-radius': radiusValue(radius) }), ...style }}
    >
      {label !== undefined && (
        <Field.Label
          className="mullion-field-label"
          {...(labelId !== undefined ? { id: labelId } : {})}
          {...(labelFor !== undefined ? { htmlFor: labelFor } : {})}
        >
          {label}
          {required && (
            <span className="mullion-field-required" aria-hidden>
              *
            </span>
          )}
        </Field.Label>
      )}
      {/* Label, description, input, error: what you need before typing comes first (designer, 2026-10-26). */}
      {description !== undefined && (
        <Field.Description className="mullion-field-description">{description}</Field.Description>
      )}
      <div ref={controlRef} className={cx('mullion-field-control', variantClass)}>
        {leftSection !== undefined && <span className="mullion-field-section">{leftSection}</span>}
        {children}
        {rightSection !== undefined && <span className="mullion-field-section">{rightSection}</span>}
      </div>
      {typeof error !== 'boolean' && error !== undefined && (
        <Field.Error className="mullion-field-error" match>
          {error}
        </Field.Error>
      )}
      {after}
    </Field.Root>
  );
}
