/**
 * The colour picker (P80-B), the second and larger of the two gaps Base UI
 * does not fill. P78-B priced it when it chose the primitive and called it
 * "the expensive one, a component in its own right".
 *
 * Three things are ours here and each is named as behavioural code: the
 * saturation-and-value surface, the colour arithmetic, and the parsing of what
 * a caller has stored. Everything with an established keyboard contract is
 * still the primitive's: the hue and alpha sliders are the framework's
 * `Slider`, which is Base UI's, so they arrive with arrows, Home, End and the
 * page keys rather than with a second implementation of them.
 *
 * **The keyboard path is the text field, not the surface.** A two-dimensional
 * gradient has no ARIA pattern that expresses it, so the field accepts and
 * reports the value in the caller's own format and is what a keyboard or a
 * screen reader uses. The surface is an enhancement on top: it takes focus and
 * arrow keys, and it reports its position through `aria-valuetext` in words,
 * because there is no honest `aria-valuenow` for a point in a plane.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { cx, focusable } from './element';
import { FieldShell, type FieldShellProps, type FieldStyleProps } from './field';
import { Popover } from './overlay';
import { Slider } from './toggle';
import { customProperties } from './scale';
import { useUiLabels } from '../provider/hooks';
import { formatUiLabel } from '../provider/labels';

// ---------------------------------------------------------------------------
// Colour arithmetic
// ---------------------------------------------------------------------------

/** How a value is written back to the caller. */
export type UiColorFormat = 'hex' | 'hexa' | 'rgb' | 'rgba';

export interface UiHsva {
  /** 0 to 360. */
  h: number;
  /** 0 to 1. */
  s: number;
  /** 0 to 1. */
  v: number;
  /** 0 to 1. */
  a: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round = (value: number) => Math.round(value * 255);

function hsvaToRgba({ h, s, v, a }: UiHsva) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  return { r: round(r + m), g: round(g + m), b: round(b + m), a };
}

function rgbaToHsva(r: number, g: number, b: number, a: number): UiHsva {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = 60 * (((gg - bb) / d) % 6);
    else if (max === gg) h = 60 * ((bb - rr) / d + 2);
    else h = 60 * ((rr - gg) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max, a };
}

const hex2 = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');

/** The value as the caller's format spells it. */
export function formatColor(hsva: UiHsva, format: UiColorFormat): string {
  const { r, g, b, a } = hsvaToRgba(hsva);
  switch (format) {
    case 'hex':
      return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
    case 'hexa':
      return `#${hex2(r)}${hex2(g)}${hex2(b)}${hex2(a * 255)}`;
    case 'rgb':
      return `rgb(${r}, ${g}, ${b})`;
    default:
      return `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
  }
}

/**
 * Whatever the caller stored, as HSVA. Null when it is not a colour this
 * understands, which includes the empty string and `transparent`: those are
 * real stored values in this product and must not be coerced into black.
 */
export function parseColor(input: string | null | undefined): UiHsva | null {
  if (!input) return null;
  const value = input.trim().toLowerCase();
  if (value === 'transparent') return { h: 0, s: 0, v: 0, a: 0 };

  const hex = /^#([0-9a-f]{3,8})$/.exec(value);
  if (hex) {
    const digits = hex[1]!;
    const expand = (d: string) => parseInt(d.length === 1 ? d + d : d, 16);
    if (digits.length === 3 || digits.length === 4) {
      return rgbaToHsva(
        expand(digits[0]!),
        expand(digits[1]!),
        expand(digits[2]!),
        digits.length === 4 ? expand(digits[3]!) / 255 : 1,
      );
    }
    if (digits.length === 6 || digits.length === 8) {
      return rgbaToHsva(
        parseInt(digits.slice(0, 2), 16),
        parseInt(digits.slice(2, 4), 16),
        parseInt(digits.slice(4, 6), 16),
        digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
      );
    }
    return null;
  }

  // Both the legacy comma form and the modern space-and-slash form, because
  // the engine emits the second one and a stored value may be either.
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value);
  if (rgb) {
    const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some(Number.isNaN)) return null;
    return rgbaToHsva(parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1);
  }
  return null;
}

const BLACK: UiHsva = { h: 0, s: 0, v: 0, a: 1 };

// ---------------------------------------------------------------------------
// ColorPicker
// ---------------------------------------------------------------------------

export interface ColorPickerProps extends FieldStyleProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  /** Called when a drag or a key repeat settles, for an expensive consumer. */
  onChangeEnd?: ((value: string) => void) | undefined;
  format?: UiColorFormat | undefined;
  /** Preset colours under the picker. */
  swatches?: readonly string[] | undefined;
  /** This and the three below default to the provider's `labels`. */
  swatchLabel?: string | undefined;
  surfaceLabel?: string | undefined;
  hueLabel?: string | undefined;
  alphaLabel?: string | undefined;
}

/** How far one arrow key moves across the saturation surface, as a fraction. */
const SURFACE_STEP = 0.01;
const SURFACE_LARGE_STEP = 0.1;

/**
 * A saturation-and-value surface, a hue slider and, when the format carries
 * alpha, an alpha slider.
 *
 * The surface is the one piece of pointer code in the framework that is not
 * the primitive's, because no primitive has a two-dimensional control. It is
 * kept to what that requires: a pointer capture, a rect read, and the same
 * arithmetic the keyboard path uses.
 */
export function ColorPicker({
  value,
  defaultValue,
  onChange,
  onChangeEnd,
  format = 'hex',
  swatches,
  swatchLabel,
  surfaceLabel,
  hueLabel,
  alphaLabel,
  className,
  style,
  ...rest
}: ColorPickerProps) {
  const labels = useUiLabels();
  const withAlpha = format === 'hexa' || format === 'rgba';
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<UiHsva>(() => parseColor(defaultValue) ?? BLACK);
  /*
   * The hue is remembered separately, in state rather than a ref, because a
   * parsed value loses it: black and white have no hue to store. Without this
   * the surface snaps back to red the moment a caller drags the brightness to
   * zero, and the next drag starts from the wrong place.
   */
  const [hue, setHue] = useState(() => (parseColor(value ?? defaultValue) ?? BLACK).h);
  const parsed = useMemo(() => (controlled ? (parseColor(value) ?? BLACK) : null), [controlled, value]);
  const base = parsed ?? internal;
  const hasHue = base.s > 0 && base.v > 0;
  const current = useMemo<UiHsva>(() => ({ ...base, h: hasHue ? base.h : hue }), [base, hasHue, hue]);

  useEffect(() => {
    if (hasHue) setHue(base.h);
  }, [hasHue, base.h]);

  const emit = useCallback(
    (next: UiHsva, settled: boolean) => {
      // Always remember the hue the user is on, even when the colour they land
      // on cannot carry it.
      setHue(next.h);
      if (!controlled) setInternal(next);
      const formatted = formatColor(next, format);
      onChange?.(formatted);
      if (settled) onChangeEnd?.(formatted);
    },
    [controlled, format, onChange, onChangeEnd],
  );

  // ── The surface ──
  const surfaceRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const readPoint = useCallback(
    (clientX: number, clientY: number, settled: boolean) => {
      const el = surfaceRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = clamp((clientX - rect.left) / rect.width, 0, 1);
      const v = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
      emit({ ...current, s, v }, settled);
    },
    [current, emit],
  );

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    readPoint(event.clientX, event.clientY, false);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    readPoint(event.clientX, event.clientY, false);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    readPoint(event.clientX, event.clientY, true);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? SURFACE_LARGE_STEP : SURFACE_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    emit(
      { ...current, s: clamp(current.s + move[0], 0, 1), v: clamp(current.v + move[1], 0, 1) },
      true,
    );
  };

  const solidHue = formatColor({ h: current.h, s: 1, v: 1, a: 1 }, 'hex');
  const opaque = formatColor({ ...current, a: 1 }, 'hex');

  return (
    <div
      className={cx('mullion-color-picker', className)}
      style={{
        ...customProperties({
          '--mullion-color-hue': solidHue,
          '--mullion-color-current': opaque,
          '--mullion-color-x': `${current.s * 100}%`,
          '--mullion-color-y': `${(1 - current.v) * 100}%`,
        }),
        ...style,
      }}
      {...rest}
    >
      <div
        ref={surfaceRef}
        className="mullion-color-surface"
        role="slider"
        tabIndex={0}
        aria-label={surfaceLabel ?? labels.colorSurface}
        aria-valuetext={formatUiLabel(labels.colorSurfaceValue, {
          saturation: Math.round(current.s * 100),
          brightness: Math.round(current.v * 100),
        })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onKeyDown={onKeyDown}
        {...focusable}
      >
        <span className="mullion-color-thumb" aria-hidden />
      </div>

      <Slider
        aria-label={hueLabel ?? labels.hue}
        className="mullion-color-hue"
        value={Math.round(current.h)}
        min={0}
        max={360}
        step={1}
        largeStep={30}
        onChange={(h) => emit({ ...current, h }, false)}
        onChangeEnd={(h) => emit({ ...current, h }, true)}
      />

      {withAlpha && (
        <Slider
          aria-label={alphaLabel ?? labels.opacity}
          className="mullion-color-alpha"
          value={Number(current.a.toFixed(2))}
          min={0}
          max={1}
          step={0.01}
          largeStep={0.1}
          onChange={(a) => emit({ ...current, a }, false)}
          onChangeEnd={(a) => emit({ ...current, a }, true)}
        />
      )}

      {swatches && swatches.length > 0 && (
        <div className="mullion-color-picker-swatches">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className="mullion-color-picker-swatch"
              style={customProperties({ '--mullion-swatch': swatch })}
              aria-label={formatUiLabel(swatchLabel ?? labels.useColor, { color: swatch })}
              onClick={() => emit(parseColor(swatch) ?? BLACK, true)}
              {...focusable}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorInput
// ---------------------------------------------------------------------------

export interface ColorInputProps extends FieldShellProps, FieldStyleProps {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  onChangeEnd?: ((value: string) => void) | undefined;
  format?: UiColorFormat | undefined;
  placeholder?: string | undefined;
  swatches?: readonly string[] | undefined;
  /** Offers the browser's colour dropper where it exists, and nothing where it does not. */
  withEyeDropper?: boolean | undefined;
  /** This and the next default to the provider's `labels`. */
  eyeDropperLabel?: string | undefined;
  pickerLabel?: string | undefined;
  'aria-label'?: string | undefined;
  children?: ReactNode;
}

interface EyeDropperApi {
  open: () => Promise<{ sRGBHex: string }>;
}

/**
 * A field that holds a colour, with the picker behind a swatch.
 *
 * The text input is the value: it is what a keyboard types into, what a screen
 * reader reads, and what the caller's format round-trips through. A typed
 * value that does not parse is left alone rather than corrected, because
 * rewriting someone's half-typed `#ff` into `#ff0000` under the cursor is the
 * defect every colour field starts with.
 */
export function ColorInput({
  value,
  defaultValue,
  onChange,
  onChangeEnd,
  format = 'hex',
  placeholder,
  swatches,
  withEyeDropper,
  eyeDropperLabel,
  pickerLabel,
  label,
  description,
  error,
  required,
  disabled,
  size,
  radius,
  className,
  style,
  ...rest
}: ColorInputProps) {
  const labels = useUiLabels();
  const inputId = useId();
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? '');
  const text = controlled ? (value ?? '') : internal;
  const parsed = useMemo(() => parseColor(text), [text]);

  const commit = useCallback(
    (next: string, settled: boolean) => {
      if (!controlled) setInternal(next);
      onChange?.(next);
      if (settled) onChangeEnd?.(next);
    },
    [controlled, onChange, onChangeEnd],
  );

  const dropper = typeof window !== 'undefined' && 'EyeDropper' in window;

  return (
    <FieldShell
      label={label}
      // The input is ours, not the primitive's, so the label names it by id (P80-F's nesting fix).
      labelFor={inputId}
      description={description}
      error={error}
      required={required}
      disabled={disabled}
      size={size}
      radius={radius}
      className={cx('mullion-color-field', className)}
      style={style}
      variantClass="mullion-field-control-color"
      leftSection={
        <Popover>
          <Popover.Trigger
            render={
              <button
                type="button"
                className="mullion-color-preview"
                aria-label={pickerLabel ?? labels.openColorPicker}
                disabled={disabled}
                style={customProperties({ '--mullion-swatch': parsed ? formatColor(parsed, 'rgba') : 'transparent' })}
                {...focusable}
              />
            }
          />
          <Popover.Content padding="xs" width={260}>
            <ColorPicker
              value={text}
              format={format}
              onChange={(next) => commit(next, false)}
              onChangeEnd={(next) => commit(next, true)}
              {...(swatches ? { swatches } : {})}
            />
          </Popover.Content>
        </Popover>
      }
      rightSection={
        withEyeDropper && dropper ? (
          <button
            type="button"
            className="mullion-color-dropper"
            aria-label={eyeDropperLabel ?? labels.pickFromScreen}
            disabled={disabled}
            onClick={() => {
              const Api = (window as unknown as { EyeDropper: new () => EyeDropperApi }).EyeDropper;
              void new Api()
                .open()
                .then((result) => {
                  const picked = parseColor(result.sRGBHex);
                  if (picked) commit(formatColor(picked, format), true);
                })
                // The user dismissing the dropper rejects the promise, which is
                // not an error and must not reach an error boundary.
                .catch(() => undefined);
            }}
            {...focusable}
          >
            <svg viewBox="0 0 16 16" aria-hidden focusable="false">
              <path
                d="M10.5 2.5 L13.5 5.5 M12 4 L6 10 L4 12.5 L3.5 12 L6 10 M4.5 11.5 L2.5 13.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : undefined
      }
    >
      <input
        id={inputId}
        className="mullion-field-input mullion-color-text"
        type="text"
        spellCheck={false}
        autoComplete="off"
        value={text}
        {...(placeholder !== undefined ? { placeholder } : {})}
        {...(disabled ? { disabled: true } : {})}
        onChange={(event) => commit(event.currentTarget.value, false)}
        onBlur={(event) => commit(event.currentTarget.value, true)}
        {...focusable}
        {...rest}
      />
    </FieldShell>
  );
}
