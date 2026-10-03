/**
 * Hiding the page behind the topmost modal inside a shadow root (P80-F).
 *
 * Base UI hides everything outside an open modal with `aria-hidden`, walking
 * the light DOM from `document.body`. That walk cannot enter a shadow root: a
 * popup inside one is kept by keeping its host, and nothing else inside the
 * host is touched. Every modal the product ships portals into the overlay
 * root, which is a shadow root, so measured in Chrome on 2026-10-02 a modal
 * stacked on another left both exposed, and so did two opened in one commit
 * and any other chrome in the overlay root. A confirm raised from inside a
 * modal is the everyday case.
 *
 * This finishes the walk Base UI cannot make, and only there. Inside the
 * topmost modal's shadow root, everything not on the path to that modal or to
 * a live region is marked `aria-hidden`, which is what Base UI does in the
 * light DOM; live regions stay exposed for the same reason Base UI keeps them,
 * so a toast raised behind a dialog is still announced. One owner recomputes
 * the whole set on every open and close, so there are no counters to drift.
 *
 * In a light-DOM container Base UI's walk is the whole story, including its
 * one defect: two modals opened in the same commit each hide the other, and
 * Base UI exposes no hook to stop it. That case warns in development.
 */

const stack: Element[] = [];
let hiddenByUs: Element[] = [];
let openedThisTick = 0;

/** Elements that are never content, so there is nothing to hide. */
const INERT_TAGS = new Set(['style', 'script', 'link', 'template']);

function recompute(): void {
  for (const el of hiddenByUs) el.removeAttribute('aria-hidden');
  hiddenByUs = [];

  const top = stack[stack.length - 1];
  const root = top?.isConnected ? top.getRootNode() : null;
  if (!top || !(root instanceof ShadowRoot)) return;

  // Kept whole: the modal and every live region. Kept as a path: their ancestors.
  const whole = new Set<Element>([top, ...Array.from(root.querySelectorAll('[aria-live]'))]);
  const path = new Set<Node>();
  for (const el of whole) {
    for (let node: Node | null = el.parentNode; node && node !== root; node = node.parentNode) path.add(node);
  }

  const walk = (parent: ParentNode) => {
    for (const child of Array.from(parent.children)) {
      if (whole.has(child) || INERT_TAGS.has(child.localName)) continue;
      if (path.has(child)) {
        walk(child);
      } else if (!child.hasAttribute('aria-hidden')) {
        child.setAttribute('aria-hidden', 'true');
        hiddenByUs.push(child);
      }
    }
  };
  walk(root);
}

/**
 * Register an open modal by the node its portal put in the container, and get
 * back the function that unregisters it. The last registered is topmost,
 * which is the order a stacked modal and a same-commit pair both mount in.
 */
export function registerModal(portalNode: Element): () => void {
  stack.push(portalNode);
  recompute();

  if (import.meta.env.DEV && !(portalNode.getRootNode() instanceof ShadowRoot)) {
    openedThisTick += 1;
    if (openedThisTick === 1) {
      queueMicrotask(() => {
        openedThisTick = 0;
      });
    } else {
      console.warn(
        '[Mullion UI] Two modal dialogs opened in the same commit. Outside a shadow root each hides the other from assistive technology (P80-F). Open the second from the first, or queue it as confirm() does.',
      );
    }
  }

  return () => {
    const index = stack.lastIndexOf(portalNode);
    if (index !== -1) stack.splice(index, 1);
    recompute();
  };
}
