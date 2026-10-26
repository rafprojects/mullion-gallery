/**
 * The role glyphs (P80-A), drawn by the designer and delivered 2026-09-14.
 *
 * **Why these exist.** A `light` control carries its role in a 14% tint, which
 * is a sevenfold dilution of the role's chroma, and dichromatic vision then
 * collapses what is left. Measured on the shipped light palette: the success
 * and warning washes are ΔE00 **0.00** apart under protanopia, and success
 * against error is 1.83 under deuteranopia. Four identical beige chips.
 *
 * **Why the fix is not a better colour.** At *full* chroma the same pairs sit
 * at 2.7 to 8.8 under CVD, so no ink escapes it: red-green roles are the
 * classic case WCAG 1.4.1 exists for. The only channels that survive are
 * **shape** and **words**, which is why a role-coloured rail or border was
 * considered and rejected — it would be a signal measuring 2.7 instead of
 * 0.00, and neither is a signal.
 *
 * **Why the silhouettes differ.** That is the requirement rather than a
 * detail: four variations on a disc would measure identically and signal
 * nothing. A stroked cross, a stroked check, a filled triangle and a filled
 * disc are distinguishable by outline alone at 12px.
 *
 * They paint in `currentColor`, so they take the tone their element already
 * declares, and that pairing is audited at 1.4.11's 3:1 non-text floor by
 * `washIconChecks` in the engine (worst 4.24 at rest, 3.82 on hover).
 *
 * `aria-hidden` throughout: the glyph is a redundant signal beside the label,
 * never the accessible name. A screen-reader user has the text.
 */

import type { ReactElement } from 'react';
import type { UiTone } from './element';

/** The four tones that carry a status meaning and therefore need a non-colour signal. */
const ROLE_TONES = ['success', 'warning', 'danger', 'info'] as const;

export type UiRoleTone = (typeof ROLE_TONES)[number];

/** True when a tone is a status role rather than an emphasis (`primary`) or a neutral. */
export function isRoleTone(tone: UiTone | undefined): tone is UiRoleTone {
  return tone !== undefined && (ROLE_TONES as readonly string[]).includes(tone);
}

const SHARED = {
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
  className: 'mullion-role-glyph',
} as const;

/** The check's stroke, shared by the success glyph and the chip's check mark. */
const CHECK_PATH = (
  <path
    d="M4.8 12.6 L9.8 17.6 L19.2 6.2"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

/** A stroked check. */
function SuccessGlyph() {
  return <svg {...SHARED}>{CHECK_PATH}</svg>;
}

/**
 * The same check as a plain selection mark, which carries no tone: it draws
 * in the ink of whatever holds it (designer, 2026-10-26).
 */
export function CheckMark({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable={false} {...(className ? { className } : {})}>
      {CHECK_PATH}
    </svg>
  );
}

/** A filled triangle with a bang. */
function WarningGlyph() {
  return (
    <svg {...SHARED}>
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M12 2.6 C12.62 2.6 13.19 2.93 13.5 3.46 L22.7 19.4 C23.32 20.47 22.55 21.8 21.31 21.8 L2.69 21.8 C1.45 21.8 0.68 20.47 1.3 19.4 L10.5 3.46 C10.81 2.93 11.38 2.6 12 2.6 Z M10.9 8.6 h2.2 v6.2 h-2.2 z M10.9 16.5 h2.2 v2.4 h-2.2 z"
      />
    </svg>
  );
}

/** A stroked cross. */
function DangerGlyph() {
  return (
    <svg {...SHARED}>
      <path
        d="M6.4 6.4 L17.6 17.6 M17.6 6.4 L6.4 17.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A filled disc with an i. */
function InfoGlyph() {
  return (
    <svg {...SHARED}>
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M12 2.2 A9.8 9.8 0 1 0 12 21.8 A9.8 9.8 0 1 0 12 2.2 Z M10.9 5.9 h2.2 v2.4 h-2.2 z M10.9 10.2 h2.2 v7.6 h-2.2 z"
      />
    </svg>
  );
}

const GLYPHS: Record<UiRoleTone, () => ReactElement> = {
  success: SuccessGlyph,
  warning: WarningGlyph,
  danger: DangerGlyph,
  info: InfoGlyph,
};

/**
 * The glyph for a tone, or `null` when the tone carries no status meaning.
 *
 * Callers pass what the consumer gave them: an explicit node wins, `false`
 * declines the default, and `undefined` takes it. The default is the signal
 * and the opt-out is a deliberate act, which is the shape the designer asked
 * for — a developer whose label already names the role declines it on purpose
 * rather than by omission.
 */
export function resolveRoleGlyph(
  tone: UiTone | undefined,
  icon: React.ReactNode | false | undefined,
): React.ReactNode {
  if (icon === false) return null;
  if (icon !== undefined && icon !== null) return icon;
  if (!isRoleTone(tone)) return null;
  const Glyph = GLYPHS[tone];
  return <Glyph />;
}
