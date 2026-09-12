/**
 * Component tokens and framework constants (P78-C).
 *
 * The adapter derives per-component colours from the resolved palette inside
 * 31 Mantine override blocks: the checkbox border from `borderStrong`, tab
 * colours from `textMuted` and `text`, option checked colours from
 * `primaryFill` and `primaryOnFill`, input focus from `primaryStroke`. Those
 * are theme decisions living in a translation layer, which is why the 1.4.11
 * audit has to know which Mantine variable an affordance reads in order to
 * audit it.
 *
 * The in-house framework will read tokens rather than an adapter, so the
 * derivations move here, where the audits can name them. Nothing reads these
 * yet: the adapter stays authoritative until Phase 81 deletes it, and this
 * tier is emitted alongside the role tokens so Phase 79 has something to read
 * on its first day.
 *
 * Two tiers, and the difference matters. **Component tokens** derive from role
 * tokens per theme and a theme may override one. **Framework constants** are
 * fixed: geometry and timing that no theme varies, so a theme cannot make the
 * focus ring invisible by making it thin.
 */

import { generateColorScale, selectUiContrastIndex, withAlpha } from './colorGen';
import chroma from 'chroma-js';
import type { ResolvedColors } from './types';

// ---------------------------------------------------------------------------
// Component tokens
// ---------------------------------------------------------------------------

/**
 * Every component token, with the role token it derives from. Each entry is
 * the same decision the adapter makes today, lifted verbatim so this tier
 * describes what already renders rather than a redesign of it.
 *
 * `control-height-*` is the exception and is marked below: it has no role
 * token to derive from, so it carries Mantine's measured scale as a default.
 */
export const COMPONENT_TOKEN_DERIVATIONS = {
  // Inputs. Lifted from the adapter's `Input.vars` block, which writes these
  // as variables rather than inline styles so the focus rule can win (P76-I).
  'input-bd': (rc) => rc.borderStrong,
  'input-bd-focus': (rc) => rc.primaryStroke,
  'input-bg': (rc) => rc.surface2,
  'input-color': (rc) => rc.text,
  'input-placeholder-color': (rc) => rc.textMuted2,

  // Tabs. Lifted from `Tabs.vars`; the resting and active label colours are
  // ours, the indicator is Mantine's `--tabs-color` (P77-C).
  'tab-color': (rc) => rc.textMuted,
  'tab-active-color': (rc) => rc.text,
  'tab-indicator-color': (rc) => rc.primaryStroke,

  // Select options. Lifted from `Select.styles`, where the checked pair rides
  // on the dropdown as custom properties because the dropdown may be portaled.
  'option-checked-bg': (rc) => rc.primaryFill,
  'option-checked-color': (rc) => rc.primaryOnFill,

  // Menu and Select dropdowns. Lifted from `Menu.styles.dropdown` and
  // `Select.styles.dropdown`, which set the same pair. The audit needs these
  // to name the ground an affordance sits on inside a portaled dropdown.
  'menu-bg': (rc) => rc.surfaceRaised,
  'menu-bd': (rc) => rc.border,

  // Menu item hover. NOT a lift: the adapter has no menu hover derivation and
  // Mantine's default supplies it today. The surface ladder cannot express it
  // either, because a menu dropdown already sits at `surfaceRaised`, the top
  // rung. An alpha overlay of the text colour is the only form that reads on
  // both schemes, and it matches how `Table.tr` already uses `withAlpha`.
  'menu-hover-bg': (rc) => withAlpha(rc.text, 0.08),

  // Switch track. Lifted from `Switch.styles.track`.
  'switch-track-bg': (rc) => rc.surface2,
  'switch-track-bd': (rc) => rc.borderStrong,

  // Checkbox resting border. Lifted from `Checkbox.vars`; it travels as a
  // variable because an inline border-color outranks Mantine's checked rule
  // and leaves a ring around every checked box (P76-I-2).
  'checkbox-bd': (rc) => rc.borderStrong,

  // Table row hover. Lifted from `Table.vars`. `surfaceRaised` rather than
  // `surface2`, which is three points from `surface` on default-dark and
  // imperceptible even at full opacity (P76-I-2).
  'table-hover-bg': (rc) => rc.surfaceRaised,

  // [P79-C] The rung of each role that is legible as TEXT on the theme's
  // grounds. `primaryStroke` is contrast-selected at the 1.4.11 non-text
  // floor of 3:1 (P75-E), which is right for the focus ring and a border and
  // is not enough for a label; the semantic colours were never selected at
  // all, because until the framework had a tone model nothing painted text in
  // them. Measured on the first draft: `Button variant="light" tone="danger"`
  // came to 3.90:1 on github-light. Each of these is the nearest rung of the
  // role's own ramp that clears 4.5:1 against every ground, so a theme's red
  // stays red and becomes readable rather than being replaced.
  'primary-text': (rc) => textRung(rc.primaryStroke, rc),
  'success-text': (rc) => textRung(rc.success, rc),
  'warning-text': (rc) => textRung(rc.warning, rc),
  'error-text': (rc) => textRung(rc.error, rc),
  'info-text': (rc) => textRung(rc.info, rc),
  'accent-text': (rc) => textRung(rc.accent, rc),

  // [P79-C] The ink that reads on each semantic colour used as a fill. The
  // engine already picks one for `primaryFill` (`primaryOnFill` in
  // `colorGen`); these are the same pick for the four semantic roles, which
  // had none because nothing had ever filled with them. Measured need: the
  // framework's `filled` button and badge paint the tone and put text on it,
  // and on tokyo-night the pair the first draft used came to 2.55:1.
  'success-on': (rc) => onColor(rc.success),
  'warning-on': (rc) => onColor(rc.warning),
  'error-on': (rc) => onColor(rc.error),
  'info-on': (rc) => onColor(rc.info),
  'accent-on': (rc) => onColor(rc.accent),
} as const satisfies Record<string, (rc: ResolvedColors) => string>;

/** Black or white, whichever reads better on `fill`. The same rule `primaryOnFill` uses. */
function onColor(fill: string): string {
  return chroma.contrast('#ffffff', fill) >= chroma.contrast('#000000', fill) ? '#ffffff' : '#000000';
}

/** The 1.4.3 text floor. The role's hue is kept; only its rung moves. */
const TEXT_CONTRAST_MIN = 4.5;

/**
 * The nearest rung of `base`'s own ramp that reads as text on every ground
 * the theme puts text on. `selectUiContrastIndex` does the walk; all this
 * adds is the ramp (a single role colour is not one) and the starting rung,
 * which is whichever is closest to the colour the theme actually declared.
 */
function textRung(base: string, rc: ResolvedColors): string {
  const scheme = chroma(rc.background).luminance() < 0.5 ? 'dark' : 'light';
  const ramp = generateColorScale(base, scheme);
  let preferred = 0;
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < ramp.length; i++) {
    const distance = chroma.distance(ramp[i]!, base);
    if (distance < closest) {
      closest = distance;
      preferred = i;
    }
  }
  const grounds = [rc.background, rc.surface, rc.surface2, rc.surfaceRaised];
  return ramp[selectUiContrastIndex(ramp, grounds, preferred, TEXT_CONTRAST_MIN)]!;
}

export type ComponentTokenName = keyof typeof COMPONENT_TOKEN_DERIVATIONS;

/**
 * Control heights. Measured from the installed `@mantine/core` stylesheet
 * rather than recalled: `--input-height-*` and `--button-height-*` agree
 * exactly on all five rungs. Mantine's `var(--mantine-scale)` multiplier is
 * dropped because the framework has no such global.
 *
 * These sit with the component tokens rather than the constants because a
 * theme may legitimately want a denser or looser control scale, but they are
 * fixed defaults rather than derivations: no role token describes a height.
 */
export const CONTROL_HEIGHTS = {
  'control-height-xs': '1.875rem',
  'control-height-sm': '2.25rem',
  'control-height-md': '2.625rem',
  'control-height-lg': '3.125rem',
  'control-height-xl': '3.75rem',
} as const;

export type ControlHeightName = keyof typeof CONTROL_HEIGHTS;

/** Every name a theme may override in `ThemeDefinition.componentTokens`. */
export type ComponentTokenKey = ComponentTokenName | ControlHeightName;

/**
 * Resolve the component-token tier for one theme. `overrides` comes from the
 * theme JSON and wins over the derivation, which is the whole point of the
 * tier being data rather than code.
 */
export function deriveComponentTokens(
  rc: ResolvedColors,
  overrides: Partial<Record<ComponentTokenKey, string>> = {},
): Record<ComponentTokenKey, string> {
  const resolved = {} as Record<ComponentTokenKey, string>;

  for (const name of Object.keys(COMPONENT_TOKEN_DERIVATIONS) as ComponentTokenName[]) {
    resolved[name] = overrides[name] ?? COMPONENT_TOKEN_DERIVATIONS[name](rc);
  }
  for (const name of Object.keys(CONTROL_HEIGHTS) as ControlHeightName[]) {
    resolved[name] = overrides[name] ?? CONTROL_HEIGHTS[name];
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Framework constants
// ---------------------------------------------------------------------------

/**
 * The layer scale. Every layer is offset by `--mullion-layer-host-offset`,
 * which a host may raise to escape its own furniture: `#wpadminbar` is
 * `position: fixed` at `z-index: 99999` and covers the Settings drawer header
 * for every logged-in admin on the front end. The embed sets the offset from
 * PHP (P79-C) and the Settings drawer reads `--mullion-layer-modal`, so the
 * header clears the bar.
 */
const LAYER_STEPS = {
  'layer-base': 1,
  'layer-raised': 10,
  'layer-sticky': 100,
  'layer-dropdown': 300,
  'layer-overlay': 400,
  'layer-modal': 500,
  'layer-popover': 600,
  'layer-tooltip': 700,
  'layer-notification': 800,
} as const;

/**
 * Fixed across every theme. Geometry and timing are not palette decisions, and
 * keeping them out of the per-theme tier is what stops a theme from making the
 * focus ring invisible by making it thin.
 *
 * Takes the prefix as a required argument because the layer steps refer to the
 * host offset by name, and the namespace is parametrized for external
 * consumers of this package (P51-L). Hardcoding `--mullion` would silently
 * break every layer for a consumer that picked its own, and importing the
 * default from `cssVariables` would make the two modules a runtime cycle.
 */
export function frameworkConstants(prefix: string): Record<string, string> {
  return {
    // P77-F: the ring is a pair, a 2px core with a 6px halo spread so 2px
    // shows inside the outline's offset and 2px outside it. Lifted from the
    // focus-ring block in `src/styles/chrome-portable.scss`, where the
    // geometry is constant across themes and only the colours resolve.
    'focus-ring-width': '2px',
    'focus-ring-offset': '2px',
    'focus-halo-width': '6px',

    // Lifted from the durations already in use across our stylesheets: 150ms
    // and 200ms are the two that appear. `slow` is the one extrapolation.
    'duration-fast': '150ms',
    'duration-base': '200ms',
    'duration-slow': '300ms',

    // `layer-host-offset` is deliberately NOT declared here. Every step reads
    // it through `var(..., 0)`, so a host that sets it above the gallery (the
    // WordPress embed does, when the admin bar is showing) inherits into every
    // tree. Declaring `0` on the scope would shadow the host's value for
    // everything inside it, which is the P79-C finding that made the admin
    // bar fix work at all.
    ...Object.fromEntries(
      Object.entries(LAYER_STEPS).map(([name, step]) => [
        name,
        `calc(var(${prefix}-layer-host-offset, 0) + ${step})`,
      ]),
    ),
  };
}
