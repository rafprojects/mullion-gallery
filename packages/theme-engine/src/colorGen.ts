/**
 * Color Generation Utilities
 *
 * Shade arrays are generated in OKLCH (P75-F) with chroma-reduction gamut
 * mapping into sRGB. `deriveDarkTuple` still interpolates in LAB.
 *
 * Gold source: docs/THEME_SYSTEM_ASSESSMENT.md §2.4
 */

import chroma from 'chroma-js';
import type { ColorShorthand, ThemeColors, ResolvedColors, PrimaryShade } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of shades Mantine expects per color tuple */
const SHADE_COUNT = 10;

/**
 * OKLCH lightness endpoints for the 10-step array (lightest → darkest).
 *
 * Chosen explicitly in P75-F (the HSL generator used the same numbers as
 * HSL L%, which is a different quantity). Light starts higher so shade 0
 * is a wash; both schemes share a 0.25 floor so the dark end stays a
 * colored shade rather than near-black (HSL 10% on Rig Cyan was OKLCH
 * L≈0.25). Dark shade 0 is 0.85 so dark themes don't open on a pastel.
 */
const LIGHTNESS_RANGE_LIGHT = [0.95, 0.25] as const;
const LIGHTNESS_RANGE_DARK = [0.85, 0.25] as const;

/**
 * Last-resort index pair if no ramp rung clears the ink-safe criterion.
 * Omitted `primaryShade` now derives by criterion (P75-F); this remains
 * the historical Mantine default for callers that want a constant.
 */
export const DEFAULT_PRIMARY_SHADE: PrimaryShade = { light: 6, dark: 5 };

/** WCAG AA normal-text bar — the COLOR-SPEC.md §2 primaryShade criterion. */
export const PRIMARY_SHADE_CONTRAST_MIN = 4.5;

/** WCAG 1.4.11 non-text contrast bar for affordance borders / indicators. */
export const UI_CONTRAST_MIN = 3;

/** Binary-search iterations for chroma reduction (~1e-7 C resolution). */
const GAMUT_SEARCH_ITERS = 24;

/**
 * Surfaces darker than this are not a usable "lightest surface" for the
 * ink-safe half of the primaryShade criterion (a dark fill cannot clear
 * 4.5:1 against a dark panel *and* 4.5:1 under white text).
 */
const LIGHT_GROUND_L_MIN = 0.5;

/** Chromatic `text` is not a surface stand-in (e.g. Halloween orange). */
const NEUTRAL_INK_CHROMA_MAX = 0.08;

// ---------------------------------------------------------------------------
// Core generators
// ---------------------------------------------------------------------------

/**
 * Convert OKLCH to an sRGB hex, reducing chroma (holding L and H) until
 * the color is inside the sRGB gamut. Channel-clipping is not used —
 * it shifts hue (P75-F / COLOR-SPEC.md round 3).
 */
export function mapOklchToSrgbHex(L: number, C: number, H: number): string {
  const hue = Number.isFinite(H) ? H : 0;
  const chromaC = Number.isFinite(C) && C > 0 ? C : 0;
  if (!chroma.oklch(L, chromaC, hue).clipped()) {
    return chroma.oklch(L, chromaC, hue).hex();
  }
  let lo = 0;
  let hi = chromaC;
  for (let i = 0; i < GAMUT_SEARCH_ITERS; i++) {
    const mid = (lo + hi) / 2;
    if (chroma.oklch(L, mid, hue).clipped()) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return chroma.oklch(L, lo, hue).hex();
}

/**
 * Generate a 10-step shade array for a given base color.
 *
 * Steps OKLCH lightness linearly between scheme endpoints, holding the
 * base chroma and hue, then gamut-maps each rung into sRGB by reducing
 * chroma. The `colorScheme` param adjusts the lightness range so that
 * dark themes don't produce washed-out pastels at the low indices.
 *
 * @param base - CSS-compatible color string (hex/rgb/hsl)
 * @param colorScheme - 'light' | 'dark' to adjust lightness mapping
 * @returns Tuple of 10 hex strings
 */
export function generateColorScale(
  base: string,
  colorScheme: 'light' | 'dark' = 'dark',
): string[] {
  const [, baseC, baseH] = chroma(base).oklch();
  const [lightMax, lightMin] =
    colorScheme === 'light' ? LIGHTNESS_RANGE_LIGHT : LIGHTNESS_RANGE_DARK;

  const shades: string[] = [];
  for (let i = 0; i < SHADE_COUNT; i++) {
    const L = lightMax - ((lightMax - lightMin) / (SHADE_COUNT - 1)) * i;
    shades.push(mapOklchToSrgbHex(L, baseC, baseH));
  }

  return shades;
}

/**
 * Apply alpha transparency to a color.
 *
 * @param color - CSS-compatible color string
 * @param alpha - 0–1 opacity value
 * @returns rgba() string
 */
export function withAlpha(color: string, alpha: number): string {
  return chroma(color).alpha(alpha).css();
}

// ---------------------------------------------------------------------------
// Dark tuple derivation
// ---------------------------------------------------------------------------

/**
 * Derive Mantine's `dark` color tuple from the theme palette so that
 * surface colors stay coherent with the overall palette.
 *
 * Mantine uses dark[0] for the lightest text and dark[7] as the main
 * surface background. We interpolate between the theme's text and
 * background colors in LAB space to create a smooth ramp.
 *
 * @param text      - Primary text color (lightest in dark themes)
 * @param surface   - Primary surface color (used at dark[7])
 * @param background - Body background (used at dark[8-9])
 * @returns 10-element hex array
 */
export function deriveDarkTuple(
  text: string,
  surface: string,
  background: string,
): string[] {
  // Build a scale from text (light) → surface → background (darkest)
  const scale = chroma
    .scale([text, surface, background])
    .mode('lab')
    .colors(SHADE_COUNT);

  return scale.map((c) => chroma(c).hex());
}

/**
 * Derive a 3:1 affordance-border color (P74-N / P75-G).
 *
 * Holds hue, eases chroma slightly, and steps lightness toward mid-grey
 * until WCAG 1.4.11's 3:1 bar clears against `surface` *and* every extra
 * ground (`resolveColors` passes surface2 and surfaceRaised — elevated form
 * chrome and menus/popovers, the grounds `intendedUiContrastChecks` samples).
 * Must not alias to `border`, which is often a decorative divider below 3:1.
 */
export function deriveBorderStrong(
  surface: string,
  alsoAgainst: readonly string[] = [],
): string {
  const base = chroma(surface);
  const [l, c, h] = base.lch();
  const towardMid = l < 50 ? 1 : -1;
  const grounds = [surface, ...alsoAgainst];
  let best = surface;
  // Past the first 50 lightness units only if nothing cleared: a mid-tone raised ground
  // (P80-G) can need more, and a theme that cleared earlier keeps its exact value.
  for (let i = 1; i <= 200; i++) {
    const t = i / 100;
    const L = l + towardMid * t * 50;
    if (L < 0 || L > 100) break;
    const C = c * Math.max(0, 1 - 0.2 * t);
    const hex = chroma.lch(L, Math.max(0, C), h).hex();
    best = hex;
    if (grounds.every((g) => chroma.contrast(hex, g) >= UI_CONTRAST_MIN)) {
      return hex;
    }
  }
  return best;
}

/** The least step a raised ground makes on a dark theme, ΔE00: the side-by-side visibility floor. */
export const RAISED_STEP_MIN = 2.0;

/** The least a decorative `border` sits from any ground it is drawn on (designer, 2026-10-06). */
export const BORDER_FLOOR_MIN = 3.5;

/** A theme's raised ground and the two intermediates that sit between it and `surface`. */
export interface Elevation {
  surfaceRaised: string;
  surface2: string;
  surface3: string;
}

/** Strictly lighter than `base`, by at least the visibility floor. */
function stepsAbove(color: string, base: string): boolean {
  return chroma(color).get('lab.l') > chroma(base).get('lab.l') && chroma.deltaE(color, base) >= RAISED_STEP_MIN;
}

/**
 * Resolve the elevation ladder above `surface` (P80-G, revised 2026-10-07).
 *
 * An authored `surfaceRaised` always wins, and a light theme that does not
 * author one takes `surface`. A dark theme that does not author one keeps the
 * rung it already ships: the value the old fallback gave it, its own
 * `surface2`, when that is at least ΔE00 2.0 above `surface`. Its `surface2`
 * and `surface3` are then re-derived as the intermediates rule 13 says they are,
 * because the homage ports authored `surface2` as the rung itself, which is
 * what made the menu the colour of the panel under it. Only neutral fills move.
 *
 * The first version of P80-G lifted the raised ground to `surface3` instead,
 * and the before-and-after table showed the cost: the accent re-selected on ten
 * dark homages and role text on twelve, by up to ΔE00 11. The designer reversed
 * it on 2026-10-07. That lift survives as the fallback for a theme with no rung
 * of its own, which no bundled theme needs.
 */
export function resolveElevation(colors: ThemeColors, colorScheme: 'light' | 'dark'): Elevation {
  const between = (raised: string): Elevation => {
    const stops = labStops(colors.surface, raised, 4);
    return { surfaceRaised: raised, surface2: stops[1]!, surface3: stops[2]! };
  };
  const keepingAuthored = (raised: string): Elevation => {
    const derived = between(raised);
    return {
      surfaceRaised: raised,
      surface2: colors.surface2 ?? derived.surface2,
      surface3: colors.surface3 ?? derived.surface3,
    };
  };

  if (colors.surfaceRaised) return keepingAuthored(colors.surfaceRaised);
  if (colorScheme === 'light') return keepingAuthored(colors.surface);
  if (colors.surface2 && stepsAbove(colors.surface2, colors.surface)) return between(colors.surface2);
  return keepingAuthored(liftRaised(colors));
}

/**
 * A raised ground for a dark theme whose palette has no rung above `surface`.
 *
 * The next authored rung, `surface3`, when it sits ΔE00 2.0 above `surface2`.
 * Where that rung is too light to carry role-coloured text at 4.5:1, or an
 * authored `borderStrong` at 3:1, the ground stops at the highest point from
 * `surface2` toward it that keeps both. With no usable rung at all, one is
 * derived by stepping lightness up. Moving the ground this way re-selects every
 * chromatic token against it, so it is the last resort, not the default.
 */
function liftRaised(colors: ThemeColors): string {
  const s2Of = (raised: string) => colors.surface2 ?? labStops(colors.surface, raised, 4)[1]!;
  const raisedEnough = (raised: string) => stepsAbove(raised, s2Of(raised));
  // The lightest text rung each role can take; if it cannot read on a ground, no rung can.
  // The fallbacks are `resolveColors`'s own, so the check sees the roles that will render.
  const primary = primaryBase(colors);
  const roleCeilings = [
    primary, colors.success, colors.warning ?? '#f59e0b', colors.error ?? '#ef4444', colors.info ?? primary, colors.accent ?? primary,
  ].map((base) => generateColorScale(base, 'dark')[0]!);
  const carries = (raised: string) =>
    roleCeilings.every((rung) => chroma.contrast(rung, raised) >= TEXT_FLOOR) &&
    (!colors.borderStrong || chroma.contrast(colors.borderStrong, raised) >= UI_CONTRAST_MIN);

  if (colors.surface3 && raisedEnough(colors.surface3)) {
    if (carries(colors.surface3)) return colors.surface3;
    if (colors.surface2) {
      for (let i = 19; i >= 1; i--) {
        const stop = chroma.mix(colors.surface2, colors.surface3, i / 20, 'lab').hex();
        if (raisedEnough(stop) && carries(stop)) return stop;
      }
    }
  }

  const start = colors.surface3 ?? colors.surface2 ?? colors.surface;
  const [l, c, h] = chroma(start).lch();
  for (let i = 1; i <= 200; i++) {
    const candidate = chroma.lch(Math.min(100, l + i * 0.5), c, h).hex();
    if (raisedEnough(candidate)) return candidate;
  }
  return chroma.lch(Math.min(100, l + 100), c, h).hex();
}

/** The text floor a role-coloured label must clear on a raised ground (WCAG 1.4.3). */
const TEXT_FLOOR = 4.5;

/**
 * Keep a decorative `border` visible on every ground it is drawn on (P80-G).
 *
 * The designer's rule, 2026-10-06: `border` sits at least ΔE00 3.5 from each
 * ground, a floor set just under the tightest pair the default themes ship
 * (default-dark, 3.84). An authored value that falls under it is stepped in
 * lightness away from the grounds, lighter on a dark theme and darker on a
 * light one, holding hue and chroma, until it clears them all. The ladder never
 * moves, only `border`. It must stay distinguishable from `borderStrong`, which
 * has a different job; if there is no room before that, the authored value is
 * returned unchanged and `auditBorderFloor` fails the theme by name.
 */
export function deriveBorderFloor(
  border: string,
  grounds: readonly string[],
  borderStrong: string,
  colorScheme: 'light' | 'dark',
): string {
  const clearsAll = (hex: string) => grounds.every((g) => chroma.deltaE(hex, g) >= BORDER_FLOOR_MIN);
  if (clearsAll(border)) return border;
  const [l, c, h] = chroma(border).lch();
  const direction = colorScheme === 'dark' ? 1 : -1;
  for (let i = 1; i <= 200; i++) {
    const L = l + direction * i * 0.25;
    if (L < 0 || L > 100) break;
    const candidate = chroma.lch(L, c, h).hex();
    if (chroma.deltaE(candidate, borderStrong) < BORDER_FLOOR_MIN) break;
    if (clearsAll(candidate)) return candidate;
  }
  return border;
}

/** The grounds a decorative `border` is drawn on: page, panel, striped row, and menu or tooltip. */
export function borderGrounds(rc: Pick<ResolvedColors, 'background' | 'surface' | 'surface2' | 'surfaceRaised'>): string[] {
  return [rc.background, rc.surface, rc.surface2, rc.surfaceRaised];
}

/**
 * Derive the focus-ring halo (P77-F): a neutral drawn from the theme's own
 * ground hue, stepped toward whichever pole clears `minRatio` against the ring
 * core (`primaryStroke`). The colour scheme only picks which pole to try
 * first; it does not determine the answer, because the pole is a function of
 * the core's lightness rather than of the scheme (designer sign-off,
 * 2026-09-11). Five bundled dark themes have accents light enough that a light
 * halo cannot separate from the core, and they correctly resolve dark.
 *
 * Do not raise `minRatio`. The halo can never exceed pure white or pure black
 * against the core, and the lowest such ceiling across the bundled themes is
 * 3.07 (`catppuccin-latte`), so 3 is essentially the system maximum. Any
 * higher target forces themes onto the opposite pole, where the halo lands on
 * top of its own surface: at 4 it flips eight themes and collapses their
 * halo-to-surface contrast from 12-17 down to 1.05-1.62. Guarded by
 * "the 3:1 pair target is at the system ceiling" in colorGen.test.ts.
 */
export function deriveFocusHalo(
  core: string,
  background: string,
  colorScheme: 'light' | 'dark',
  minRatio: number = UI_CONTRAST_MIN,
): string {
  const hue = chroma(background).lch()[2];
  const h = Number.isFinite(hue) ? hue : 0;
  const ramp = (pole: 'light' | 'dark'): { hex: string; ratio: number } => {
    const start = pole === 'light' ? 96 : 12;
    const end = pole === 'light' ? 100 : 0;
    let best = { hex: chroma.lch(start, 4, h).hex(), ratio: 0 };
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const hex = chroma.lch(start + (end - start) * t, 4 * (1 - t), h).hex();
      const ratio = chroma.contrast(hex, core);
      if (ratio > best.ratio) best = { hex, ratio };
      if (ratio >= minRatio) return { hex, ratio };
    }
    return best;
  };
  const preferred = ramp(colorScheme === 'dark' ? 'light' : 'dark');
  if (preferred.ratio >= minRatio) return preferred.hex;
  const opposite = ramp(colorScheme === 'dark' ? 'dark' : 'light');
  return opposite.ratio > preferred.ratio ? opposite.hex : preferred.hex;
}

function labStops(from: string, to: string, count: number): string[] {
  return chroma.scale([from, to]).mode('lab').colors(count).map((c) => chroma(c).hex());
}

function oklchL(color: string): number {
  return chroma(color).oklch()[0];
}

function oklchC(color: string): number {
  const c = chroma(color).oklch()[1];
  return Number.isFinite(c) ? c : 0;
}

function primaryBase(colors: ThemeColors): string {
  return typeof colors.primary === 'string'
    ? colors.primary
    : (colors.primary as { base: string }).base;
}

/**
 * Ground used for the ink-safe half of the primaryShade criterion
 * (COLOR-SPEC.md §2): 4.5:1 against the theme's lightest surface.
 *
 * Dark themes have no light surface token. The spec measured Rig Cyan
 * against a light ground (`#e8f7fc` / `text`); using the panel itself
 * makes the dual criterion empty. Fall back to near-neutral light ink,
 * then white.
 */
export function inkContrastGround(colors: ThemeColors): string {
  const candidates = [
    colors.background,
    colors.surface,
    colors.surfaceRaised,
    colors.surface2,
    colors.surface3,
  ].filter((c): c is string => typeof c === 'string');

  let lightest = candidates[0] ?? '#ffffff';
  let lightestL = oklchL(lightest);
  for (const c of candidates) {
    const L = oklchL(c);
    if (L > lightestL) {
      lightest = c;
      lightestL = L;
    }
  }
  if (lightestL >= LIGHT_GROUND_L_MIN) {
    return lightest;
  }
  if (oklchL(colors.text) >= LIGHT_GROUND_L_MIN && oklchC(colors.text) < NEUTRAL_INK_CHROMA_MAX) {
    return colors.text;
  }
  return '#ffffff';
}

/**
 * Lightest ramp index that clears 4.5:1 against `ground` *and* 4.5:1
 * under white text. Equivalent to the last passing rung walking from
 * the dark end — the COLOR-SPEC.md §2 criterion, expressed as an array
 * index (never a Tailwind rung name).
 */
export function selectPrimaryShadeIndex(ramp: readonly string[], ground: string): number {
  for (let i = 0; i < ramp.length; i++) {
    const hex = ramp[i]!;
    if (
      chroma.contrast(hex, ground) >= PRIMARY_SHADE_CONTRAST_MIN
      && chroma.contrast('#ffffff', hex) >= PRIMARY_SHADE_CONTRAST_MIN
    ) {
      return i;
    }
  }
  return ramp.length - 1;
}

/**
 * Derive `{light, dark}` primaryShade indices against the OKLCH ramps
 * for this palette. Used when a theme omits the field, and to re-derive
 * shipped JSON in P75-F.
 */
export function derivePrimaryShade(colors: ThemeColors): PrimaryShade {
  const base = primaryBase(colors);
  const ground = inkContrastGround(colors);
  return {
    light: selectPrimaryShadeIndex(generateColorScale(base, 'light'), ground),
    dark: selectPrimaryShadeIndex(generateColorScale(base, 'dark'), ground),
  };
}

function contrastPasses(fg: string, bg: string, minRatio: number): boolean {
  return chroma.contrast(fg, bg) >= minRatio;
}

/**
 * Nearest ramp index that clears `minRatio` against every `surfaces` colour.
 * Keeps `preferred` when it already passes (P75-E: no regression on themes
 * that were already fine). Tie at the same distance: step toward more
 * contrast (darker on light surfaces, lighter on dark).
 */
export function selectUiContrastIndex(
  ramp: readonly string[],
  surfaces: readonly string[],
  preferred: number,
  minRatio: number = UI_CONTRAST_MIN,
): number {
  const n = ramp.length;
  if (n === 0) return 0;
  const start = Math.min(Math.max(0, preferred), n - 1);
  const grounds = surfaces.length > 0 ? surfaces : ['#ffffff'];
  const passes = (i: number): boolean =>
    grounds.every((s) => contrastPasses(ramp[i]!, s, minRatio));

  if (passes(start)) return start;

  const meanL =
    grounds.reduce((sum, s) => sum + oklchL(s), 0) / grounds.length;
  const surfaceIsLight = meanL >= LIGHT_GROUND_L_MIN;

  for (let d = 1; d < n; d++) {
    const hi = start + d;
    const lo = start - d;
    const ordered = surfaceIsLight ? [hi, lo] : [lo, hi];
    for (const i of ordered) {
      if (i >= 0 && i < n && passes(i)) return i;
    }
  }

  let best = start;
  let bestScore = 0;
  for (let i = 0; i < n; i++) {
    const score = grounds.reduce((sum, s) => sum + chroma.contrast(ramp[i]!, s), 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Color resolution pipeline
// ---------------------------------------------------------------------------

/**
 * Expand a ColorShorthand into a 10-step hex array.
 *
 * - If already a plain string, generates the full scale from it.
 * - If an object with base/shades, respects the shades count hint
 *   (currently we always produce 10 for Mantine compatibility).
 */
function expandShorthand(
  value: ColorShorthand,
  colorScheme: 'light' | 'dark',
): string[] {
  if (typeof value === 'string') {
    return generateColorScale(value, colorScheme);
  }
  return generateColorScale(value.base, colorScheme);
}

/**
 * Resolve an entire ThemeColors block into concrete, expanded values.
 *
 * - `primary` is expanded into a 10-step array.
 * - `dark` tuple is derived automatically if not explicitly provided.
 * - Optional accent colors fall back to the primary base color.
 *
 * @param colors - Raw ThemeColors from JSON definition
 * @param colorScheme - Light or dark base scheme
 * @returns Fully resolved color set ready for the adapter
 */
export function resolveColors(
  colors: ThemeColors,
  colorScheme: 'light' | 'dark',
): ResolvedColors {
  const primaryHex = primaryBase(colors);

  const primaryArray = expandShorthand(colors.primary, colorScheme);

  const dark = colors.dark && colors.dark.length === SHADE_COUNT
    ? colors.dark
    : deriveDarkTuple(colors.text, colors.surface, colors.background);

  // P80-G: the raised rung and the intermediates below it (see `resolveElevation`).
  const { surfaceRaised, surface2, surface3 } = resolveElevation(colors, colorScheme);

  const textMuted2 = colors.textMuted2
    ?? chroma.mix(colors.text, colors.textMuted, 0.65, 'lab').hex();

  // Every ground `intendedUiContrastChecks` samples for borderStrong must be
  // passed here, or a theme that authors an out-of-bracket `surface2` could
  // fail the 23-theme 1.4.11 audit on a value the engine itself derived.
  const borderStrong = colors.borderStrong
    ?? deriveBorderStrong(colors.surface, [surface2, surfaceRaised]);

  const primaryShade = colors.primaryShade ?? derivePrimaryShade(colors);
  const fillIndex = Math.min(
    Math.max(0, primaryShade[colorScheme]),
    SHADE_COUNT - 1,
  );
  const primaryFill = primaryArray[fillIndex]!;
  const strokeIndex = selectUiContrastIndex(
    primaryArray,
    [colors.surface, surface2, surfaceRaised],
    fillIndex,
  );
  const primaryStroke = primaryArray[strokeIndex]!;
  const primaryOnFill =
    chroma.contrast('#ffffff', primaryFill) >= chroma.contrast('#000000', primaryFill)
      ? '#ffffff'
      : '#000000';
  const focusHalo = deriveFocusHalo(primaryStroke, colors.background, colorScheme);

  const border = deriveBorderFloor(
    colors.border,
    borderGrounds({ background: colors.background, surface: colors.surface, surface2, surfaceRaised }),
    borderStrong,
    colorScheme,
  );

  return {
    background: colors.background,
    surface: colors.surface,
    surface2,
    surface3,
    surfaceRaised,

    text: colors.text,
    textMuted: colors.textMuted,
    textMuted2,

    border,
    borderStrong,

    primary: primaryArray,
    primaryShade,
    primaryFill,
    primaryFillIndex: fillIndex,
    primaryStroke,
    primaryOnFill,
    focusHalo,

    success: colors.success,
    warning: colors.warning ?? '#f59e0b',
    error: colors.error ?? '#ef4444',
    info: colors.info ?? primaryHex,

    accent: colors.accent ?? primaryHex,
    accentGreen: colors.accentGreen ?? colors.success,
    accentPurple: colors.accentPurple ?? '#a855f7',

    dark,
  };
}
