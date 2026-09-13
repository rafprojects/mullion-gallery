/**
 * How CSS physically reaches a tree (P79-A, generalised in P79-B).
 *
 * Two shapes. `attachSheet` gives one root its own sheet, updated in place,
 * which is what the per-scope token sheet needs. `adoptSharedSheet` puts one
 * `CSSStyleSheet` built once per page into as many roots as ask for it, which
 * is what the framework's component sheet needs (`uiStyles.ts`). Both prefer
 * `adoptedStyleSheets` and fall back to a `<style>` element where the tree or
 * the browser lacks constructable sheets; jsdom 25 is one such environment.
 */

export type SheetRoot = Document | ShadowRoot;

export interface SheetHandle {
  readonly root: SheetRoot;
  readonly selector: string;
  update(css: string): void;
  remove(): void;
}

export function supportsAdoptedSheets(root: SheetRoot): boolean {
  return (
    'adoptedStyleSheets' in root
    && typeof CSSStyleSheet !== 'undefined'
    && typeof CSSStyleSheet.prototype.replaceSync === 'function'
  );
}

/** Where a `<style>` fallback is appended: the head of a document, the shadow root itself. */
export function styleParentOf(root: SheetRoot): Document['head'] | ShadowRoot {
  return root instanceof Document ? root.head : root;
}

export function createStyleElement(root: SheetRoot, attr: string, key: string, css: string): HTMLStyleElement {
  const doc = root instanceof Document ? root : root.ownerDocument;
  const style = doc.createElement('style');
  style.setAttribute(attr, key);
  style.textContent = css;
  return style;
}

/** A sheet owned by one root, keyed by `attr=key` in the fallback so a tree can be inspected. */
export function attachSheet(root: SheetRoot, attr: string, key: string, selector: string, css: string): SheetHandle {
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

  const style = createStyleElement(root, attr, key, css);
  styleParentOf(root).appendChild(style);
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
