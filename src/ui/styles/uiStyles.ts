/**
 * The registration list and the one sheet it builds (P79-B, study 3.5).
 *
 * Every stylesheet the framework or the app wants in a tree is registered
 * here, in cascade order, and `MullionProvider` adopts the concatenation into
 * every root it paints: the gallery shadow root, the overlay root, or the
 * document under a light mount. One `CSSStyleSheet` is built per page and
 * shared between roots where `adoptedStyleSheets` exists; otherwise each root
 * gets a `<style>` element with the same text. Either way there is one list,
 * so a sheet cannot reach one tree and miss another, which was the whole
 * P77-A contract in one sentence.
 *
 * The framework registers its own sheets at module load; the app registers
 * the vendor and structural sheets it still needs in `src/appStyles.ts`. A
 * registration after adoption rewrites the shared sheet in place, so a lazily
 * loaded chunk can add to the list without touching any root.
 */

import baseCss from './base.css?inline';
import { createStyleElement, styleParentOf, supportsAdoptedSheets, type SheetRoot } from './sheets';

export interface UiStyleSheetOptions {
  /**
   * Wrap the sheet in a named cascade layer. Layered declarations lose to
   * unlayered ones whatever their specificity or order, which is what lets a
   * vendor sheet be adopted (cascading after every `<style>` in the tree)
   * without outranking the runtime sheets that vendor relies on coming later:
   * Mantine's variables sheet overrides defaults its `styles.css` declares at
   * the same selector. Measured in P79-B; see docs/PHASE79_REPORT.md.
   */
  layer?: string | undefined;
}

interface UiStyleSheetEntry {
  id: string;
  css: string;
  layer: string | undefined;
}

/** Data attribute carried by the `<style>` fallback so a tree can be inspected. */
export const UI_STYLES_ATTR = 'data-mullion-ui-styles';

const entries: UiStyleSheetEntry[] = [];
let text: string | null = null;
let shared: CSSStyleSheet | null = null;
const adopted = new Map<SheetRoot, { count: number; style: HTMLStyleElement | null }>();

function wrap(entry: UiStyleSheetEntry): string {
  const body = entry.layer ? `@layer ${entry.layer} {\n${entry.css}\n}` : entry.css;
  return `/* mullion: ${entry.id} */\n${body}`;
}

/** The concatenated text of every registered sheet, in registration order. */
export function uiStylesText(): string {
  if (text === null) text = entries.map(wrap).join('\n');
  return text;
}

/** Registered ids in cascade order, for tests and inspection. */
export function listUiStyles(): ReadonlyArray<{ id: string; layer: string | undefined }> {
  return entries.map(({ id, layer }) => ({ id, layer }));
}

function rewriteAdopted(): void {
  const next = uiStylesText();
  if (shared) shared.replaceSync(next);
  for (const state of adopted.values()) {
    if (state.style && state.style.textContent !== next) state.style.textContent = next;
  }
}

/**
 * Add a sheet to the list, or replace the one already registered under the
 * same id in place (a hot-reloaded module re-registers). Every root that has
 * adopted the list is updated at once.
 */
export function registerUiStyles(id: string, css: string, options: UiStyleSheetOptions = {}): void {
  const entry: UiStyleSheetEntry = { id, css, layer: options.layer };
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) entries.push(entry);
  else entries[index] = entry;
  text = null;
  rewriteAdopted();
}

function sharedSheet(): CSSStyleSheet {
  if (!shared) {
    shared = new CSSStyleSheet();
    shared.replaceSync(uiStylesText());
  }
  return shared;
}

/**
 * Put the list into a root. Reference counted per root, so nested providers
 * sharing a tree adopt once and the sheet leaves with the last of them. The
 * returned function releases this caller's reference and is safe to call twice.
 */
export function adoptUiStyles(root: SheetRoot): () => void {
  let state = adopted.get(root);
  if (!state) {
    let style: HTMLStyleElement | null = null;
    if (supportsAdoptedSheets(root)) {
      const sheet = sharedSheet();
      if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
    } else {
      style = createStyleElement(root, UI_STYLES_ATTR, 'list', uiStylesText());
      styleParentOf(root).appendChild(style);
    }
    state = { count: 0, style };
    adopted.set(root, state);
  }
  state.count += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const current = adopted.get(root);
    if (!current) return;
    current.count -= 1;
    if (current.count > 0) return;
    adopted.delete(root);
    if (current.style) current.style.remove();
    else if (shared) root.adoptedStyleSheets = root.adoptedStyleSheets.filter((s) => s !== shared);
  };
}

/** True while at least one caller holds the list in this root. */
export function hasAdoptedUiStyles(root: SheetRoot): boolean {
  return adopted.has(root);
}

registerUiStyles('ui/base', baseCss);
