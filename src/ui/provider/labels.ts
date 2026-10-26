/**
 * The names the framework gives its own controls (P81-A).
 *
 * A clear button, a chip's remove control or a colour surface has an
 * accessible name that no call site writes, so the framework supplies it, and
 * until now it supplied it in English in every locale. A root provider takes
 * the translated set as `labels` and every nested provider inherits it. A
 * component's own label prop still wins, so a call site that names a control
 * more precisely keeps doing so.
 *
 * A template names its slots in single braces (`{label}`), which the caller's
 * translation layer leaves alone when it interpolates each slot with itself.
 */

export interface UiLabels {
  /** A close button with no name of its own. */
  close: string;
  /** Clears a select or a chip field. */
  clear: string;
  /** The chevron beside a searchable field's input. */
  showOptions: string;
  /** A chip's remove control. `{label}` is the chip. */
  remove: string;
  showPassword: string;
  increment: string;
  decrement: string;
  openColorPicker: string;
  pickFromScreen: string;
  /** A colour picker's swatch. `{color}` is the swatch's value. */
  useColor: string;
  /** The saturation and brightness surface. */
  colorSurface: string;
  /** The surface's position. `{saturation}` and `{brightness}` are percentages. */
  colorSurfaceValue: string;
  hue: string;
  opacity: string;
  pagination: string;
  previousPage: string;
  nextPage: string;
  /** `{page}` is the page number. */
  page: string;
}

/** The English set, and what a component renders with no provider labels at all. */
export const UI_LABELS_EN: UiLabels = {
  close: 'Close',
  clear: 'Clear',
  showOptions: 'Show options',
  remove: 'Remove {label}',
  showPassword: 'Show password',
  increment: 'Increment',
  decrement: 'Decrement',
  openColorPicker: 'Open the color picker',
  pickFromScreen: 'Pick a color from the screen',
  useColor: 'Use {color}',
  colorSurface: 'Saturation and brightness',
  colorSurfaceValue: 'Saturation {saturation}%, brightness {brightness}%',
  hue: 'Hue',
  opacity: 'Opacity',
  pagination: 'Pagination',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  page: 'Page {page}',
};

/** Fills a template's `{slot}`s. A slot with no value is left as written. */
export function formatUiLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, slot: string) =>
    slot in values ? String(values[slot]) : match,
  );
}
