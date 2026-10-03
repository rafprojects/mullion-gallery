/**
 * Where an anchored popup mounts: in its trigger's own root (P80-B, P80-F).
 *
 * A listbox, a menu, a popover and a tooltip are each wired to their trigger
 * by more than position. `aria-controls`, `aria-activedescendant`,
 * `aria-labelledby` and `aria-describedby` are ID references, and **an ID
 * reference cannot resolve across a shadow boundary**. Base UI's focus guards
 * also find "the next tabbable after the trigger" from inside the popup's tree.
 * P80-D measured both failing for every popup portalled into the overlay root
 * from a trigger in another root: Tab could not leave an open menu or popover,
 * and an open menu had no name. The same components with trigger and popup in
 * one root passed.
 *
 * So these popups portal into the trigger's root, resolved from the trigger
 * element when it mounts. The nearest scope element is preferred, because it
 * carries the tokens of the provider that paints the trigger; the root node is
 * the fallback, where the tokens arrive through `:host`.
 *
 * The modal and the drawer are different and stay in the overlay root. They
 * trap focus and hide the rest of the page, so nothing outside them has to
 * resolve against them, and they are the surfaces a hostile host's transform
 * and sticky header actually break (P77-B).
 */

import { useCallback, useState } from 'react';
import { SCOPE_ATTR } from '../provider/scope';

/**
 * The container an anchored popup portals into: an element or root in the
 * trigger's own tree. A nested provider paints its subtree with its own
 * tokens, so a popup hoisted past its scope element would take the outer
 * provider's instead; in a shadow root the token sheet is keyed on `:host`.
 */
export function resolveAnchorContainer(el: Element): HTMLElement | ShadowRoot {
  const scoped = el.closest(`[${SCOPE_ATTR}]`);
  if (scoped instanceof HTMLElement) return scoped;
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root : document.body;
}

export interface AnchorContainer {
  /** `null` until the trigger mounts; Base UI's portal waits on an explicit `null`. */
  container: HTMLElement | ShadowRoot | null;
  /** The trigger's id as rendered, for a popup that is named by its trigger. */
  anchorId: string | null;
  /** Put this on the trigger. */
  anchorRef: (el: HTMLElement | null) => void;
}

/**
 * Resolve the container from whichever element the ref lands on. A caller's
 * `override` wins, which is how the harness pins a popup somewhere specific.
 * Until the trigger mounts the container is `null`, so a popup open on first
 * render waits one commit rather than flashing in the wrong root.
 */
export function useAnchorContainer(override?: HTMLElement | null | undefined): AnchorContainer {
  const [resolved, setResolved] = useState<{ container: HTMLElement | ShadowRoot; id: string | null } | null>(null);
  const anchorRef = useCallback((el: HTMLElement | null) => {
    if (el) setResolved({ container: resolveAnchorContainer(el), id: el.id || null });
  }, []);
  return {
    container: override !== undefined ? override : (resolved?.container ?? null),
    anchorId: resolved?.id ?? null,
    anchorRef,
  };
}
