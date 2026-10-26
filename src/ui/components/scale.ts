/**
 * Prop values to token references (P79-C).
 *
 * A scale name resolves to the theme's token, a number to sixteenths of a
 * design rem, and any other string passes through with its rem lengths in the
 * same basis, which is the reading Mantine gives `gap`, `p` and `radius`. Keeping that reading is what makes
 * Phase 81's codemod mechanical: `gap="md"` and `gap={4}` both mean here what
 * they mean now, so a migrated call site does not have to be re-measured.
 *
 * The values land as inline custom properties on the element rather than as
 * declarations, so they travel with it into any tree (study 3.4). No colour
 * is ever a value here: colour is a token read by the sheet, never a prop.
 */

import { uiRem } from '../styles/rootScale';

/** The five rungs every scale in a theme definition carries. */
export type UiScaleStep = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const STEPS: readonly string[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Spacing alone has rungs below `xs` (P81-A): 2px, 4px and 6px. */
export type UiSpacingStep = '4xs' | '3xs' | '2xs' | UiScaleStep;
const SPACING_STEPS: readonly string[] = ['4xs', '3xs', '2xs', ...STEPS];

export type UiSpacing = UiSpacingStep | number | string;
export type UiRadius = UiScaleStep | number | string;
export type UiFontSize = UiScaleStep | number | string;

function scaled(group: string, value: UiSpacing | undefined): string | undefined {
  if (value === undefined) return undefined;
  // [P81-F] A number is read as Mantine reads it, in sixteenths of a rem, and
  // in the tokens' basis, so a number and a token scale together on any host.
  if (typeof value === 'number') return uiRem(value / 16);
  if ((group === 'spacing' ? SPACING_STEPS : STEPS).includes(value)) return `var(--mullion-${group}-${value})`;
  return scaledLength(value);
}

/** Any rem length in a raw value takes the scale too, so `"1rem"` is a design rem; px and em are untouched. */
export function scaledLength(value: string): string {
  return value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n: string) => uiRem(Number(n)));
}

/** `"md"` becomes the spacing token, `4` a quarter of a design rem, `"1rem"` one design rem. */
export const spacingValue = (value: UiSpacing | undefined): string | undefined =>
  scaled('spacing', value);

export const radiusValue = (value: UiRadius | undefined): string | undefined =>
  scaled('radius', value);

export const fontSizeValue = (value: UiFontSize | undefined): string | undefined =>
  scaled('font-size', value);

/** A shadow step, or any raw `box-shadow` value. */
export const shadowValue = (value: UiSpacing | undefined): string | undefined =>
  scaled('shadow', value);

/**
 * Drop the undefined entries from an inline custom-property block. React
 * ignores an undefined value, but an empty object still renders `style=""`,
 * and the delivery tests read the attribute.
 */
export function customProperties(
  entries: Record<string, string | number | undefined>,
): Record<string, string | number> | undefined {
  const out: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(entries)) {
    if (value !== undefined) out[name] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

// ---------------------------------------------------------------------------
// Padding
// ---------------------------------------------------------------------------

/**
 * The padding half of the layout prop set. Three props rather than the study's
 * single `padding` because the measured call sites are dominated by the axis
 * form: `py` outnumbers `p` on `Center`, `Container` and `Text`. Logical
 * properties, so a right-to-left locale needs no second spelling.
 */
export interface UiPaddingProps {
  padding?: UiSpacing | undefined;
  paddingBlock?: UiSpacing | undefined;
  paddingInline?: UiSpacing | undefined;
}

/** The inline custom properties a layout sheet reads for padding. */
export function paddingVars(props: UiPaddingProps): Record<string, string | undefined> {
  return {
    '--mullion-pad': spacingValue(props.padding),
    '--mullion-pad-block': spacingValue(props.paddingBlock),
    '--mullion-pad-inline': spacingValue(props.paddingInline),
  };
}

/**
 * Take the padding props out of a prop bag and hand back what is left.
 *
 * Every component that accepts padding also forwards whatever else it was
 * given straight to the DOM: `data-testid`, `aria-*`, `id`, a handler. Reading
 * the padding props without removing them puts `padding="md"` on the element
 * as an attribute, and dropping the rest loses the caller's `data-testid`.
 * Both were defects in this track's first draft, which is why this is one
 * function rather than a destructure repeated in nine components.
 */
export function splitPadding<T extends UiPaddingProps>(
  props: T,
): [Record<string, string | undefined>, Omit<T, keyof UiPaddingProps>] {
  const { padding, paddingBlock, paddingInline, ...rest } = props;
  return [paddingVars({ padding, paddingBlock, paddingInline }), rest];
}
