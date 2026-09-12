/**
 * The token sheet and how it reaches a tree (P79-A).
 *
 * `buildTokenSheet` turns a registry entry into one CSS rule block for a scope
 * selector: every `--mullion-*` custom property the engine emits plus the
 * `color-scheme` declaration. Colour scheme is a token and a declaration on
 * the scope, never an ancestor attribute (study principle 4), which is what
 * makes the P76-D/H class of defect impossible for a portaled subtree.
 *
 * `attachSheet` writes CSS into a document or shadow root, preferring a
 * constructable stylesheet where the tree supports `adoptedStyleSheets` and
 * falling back to a `<style>` element. P79-B generalises this to the
 * component sheets; the token sheet is per scope and small.
 */

import { generateCssVariables } from '@mullion/theme-engine';
import type { MullionThemeEntry } from './registry';

export type SheetRoot = Document | ShadowRoot;

export interface SheetHandle {
  readonly root: SheetRoot;
  readonly selector: string;
  update(css: string): void;
  remove(): void;
}

/** Data attribute carried by the `<style>` fallback so a tree can be inspected. */
export const TOKEN_SHEET_ATTR = 'data-mullion-tokens';

export function buildTokenSheet(entry: MullionThemeEntry, selector: string): string {
  const vars = generateCssVariables(entry.resolved, entry.definition, selector);
  return `${vars}\n${selector} {\n  color-scheme: ${entry.colorScheme};\n}`;
}

function supportsAdoptedSheets(root: SheetRoot): boolean {
  return (
    'adoptedStyleSheets' in root
    && typeof CSSStyleSheet !== 'undefined'
    && typeof CSSStyleSheet.prototype.replaceSync === 'function'
  );
}

export function attachSheet(root: SheetRoot, key: string, selector: string, css: string): SheetHandle {
  if (supportsAdoptedSheets(root)) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    return {
      root,
      selector,
      update: (next) => sheet.replaceSync(next),
      remove: () => {
        root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== sheet);
      },
    };
  }

  const doc = root instanceof Document ? root : root.ownerDocument;
  const style = doc.createElement('style');
  style.setAttribute(TOKEN_SHEET_ATTR, key);
  style.textContent = css;
  (root instanceof Document ? root.head : root).appendChild(style);
  return {
    root,
    selector,
    update: (next) => {
      if (style.textContent !== next) style.textContent = next;
    },
    remove: () => style.remove(),
  };
}

/**
 * The root a node's sheet must live in, or null while the node is detached.
 * A detached element's root node is the element itself, which cannot hold a
 * stylesheet, so callers wait for attachment instead of writing into it.
 */
export function sheetRootOf(node: Node): SheetRoot | null {
  const root = node.getRootNode();
  if (root instanceof Document) return root;
  if (typeof ShadowRoot !== 'undefined' && root instanceof ShadowRoot) return root;
  return null;
}
