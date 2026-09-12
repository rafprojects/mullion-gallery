/**
 * The token sheet (P79-A, P79-B).
 *
 * `buildTokenSheet` turns a registry entry into one CSS rule block for a scope
 * selector: every `--mullion-*` custom property the engine emits plus the
 * `color-scheme` declaration. Colour scheme is a token and a declaration on
 * the scope, never an ancestor attribute (study principle 4), which is what
 * makes the P76-D/H class of defect impossible for a portaled subtree.
 *
 * P79-B adds the one motion switch the study asks for: under
 * `prefers-reduced-motion: reduce` the scope's duration tokens become zero,
 * so every component honours the preference by reading the token it already
 * reads. Delivery lives in `../styles/sheets.ts`; the token sheet is per
 * scope and small, the component sheet is per page (`../styles/uiStyles.ts`).
 */

import { frameworkConstants, generateCssVariables } from '@mullion/theme-engine';
import type { MullionThemeEntry } from './registry';
import { attachSheet as attachAny, type SheetHandle, type SheetRoot } from '../styles/sheets';

export { sheetRootOf, type SheetHandle, type SheetRoot } from '../styles/sheets';

/** Data attribute carried by the `<style>` fallback so a tree can be inspected. */
export const TOKEN_SHEET_ATTR = 'data-mullion-tokens';

const PREFIX = '--mullion';
const DURATION_TOKENS = Object.keys(frameworkConstants(PREFIX)).filter((name) => name.startsWith('duration-'));

export function buildTokenSheet(entry: MullionThemeEntry, selector: string): string {
  const vars = generateCssVariables(entry.resolved, entry.definition, selector);
  const zeroed = DURATION_TOKENS.map((name) => `    ${PREFIX}-${name}: 0ms;`).join('\n');
  return [
    vars,
    `${selector} {\n  color-scheme: ${entry.colorScheme};\n}`,
    `@media (prefers-reduced-motion: reduce) {\n  ${selector} {\n${zeroed}\n  }\n}`,
  ].join('\n');
}

export function attachSheet(root: SheetRoot, key: string, selector: string, css: string): SheetHandle {
  return attachAny(root, TOKEN_SHEET_ATTR, key, selector, css);
}
