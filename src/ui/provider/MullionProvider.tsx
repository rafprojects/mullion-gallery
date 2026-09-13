/**
 * `MullionProvider` (P79-A): one provider for scope, tokens, colour scheme,
 * portal container, lock and follow, persistence and runtime themes.
 *
 * It replaces five workarounds that exist because Mantine's provider does not
 * model a tree boundary: `ThemeContext`'s variable injection, `OverlayRootSync`,
 * `AdminChromeProvider`, `adminChromeStyles()` and the `--mullion-builder-*`
 * bridge. The rule that makes it work is simple: every element the provider
 * paints, inline children and portaled overlays alike, sits under an element
 * carrying this provider's tokens, and both the tokens and the component
 * sheet (P79-B, `../styles/uiStyles.ts`) arrive by stylesheet in whichever
 * tree that element is in. Nothing travels inline.
 *
 * Nested providers merge scope, never theme objects. A nested provider under
 * `mode="lock"` paints the brand palette (or its own `theme`) and under
 * `mode="follow"` paints whatever its parent paints, with an identical element
 * tree in both states so flipping the mode cannot unmount a subtree or drop
 * focus (the P76-F guarantee, by construction). Either way the switching API
 * it exposes is the root's: a theme selector inside locked chrome still
 * switches the gallery.
 */

import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { ThemeDefinition, ThemeExtension } from '@mullion/theme-engine';
import {
  MullionPortalContext,
  MullionScopeContext,
  MullionThemeContext,
  type MullionScopeMode,
  type MullionScopeValue,
  type MullionThemeManager,
} from './mullionContexts';
import {
  BRAND_THEME_ID,
  defineTheme,
  getThemeEntry,
  getThemesVersion,
  hasTheme,
  listThemes,
  resolveThemeId,
  subscribeThemes,
  type MullionThemeEntry,
} from './registry';
import { readStoredThemeId, storageKeyFor, writeStoredThemeId } from './persistence';
import { PORTAL_ATTR, SCOPE_ATTR, createScopeId, isShadowRoot, scopeSelector } from './scope';
import { attachSheet, buildTokenSheet, sheetRootOf, type SheetHandle, type SheetRoot } from './tokenSheet';
import { adoptUiStyles } from '../styles/uiStyles';

export type MullionScope = HTMLElement | ShadowRoot | 'document';
export type MullionMode = 'lock' | 'follow';

export interface MullionPersistence {
  /** Storage key; defaults to the key `ThemeContext` uses today. */
  key?: string | undefined;
  /** Defaults to true when `persistence` is given at all. */
  allowed?: boolean | undefined;
  /**
   * What the key is scoped by. Deliberately separate from `instanceId` and
   * never defaulted from it: `instanceId` identifies a React root, which is a
   * new value on every mount, while a saved theme choice has to outlive the
   * root and belongs to whatever the host considers one gallery. Omitted, the
   * key is unscoped and every instance on the page shares one choice.
   */
  scope?: string | undefined;
}

export interface MullionProviderProps {
  /**
   * A registered theme id, or a definition registered on first render through
   * `defineTheme`. A root provider treats it as the instance default, below a
   * persisted user choice; a locked nested provider paints exactly this theme.
   * Pass a definition by stable reference: it is re-registered, audits and
   * all, whenever its identity changes.
   */
  theme?: string | ThemeExtension | ThemeDefinition | undefined;
  /**
   * Where the token sheet is written and what the selector is: a shadow root
   * (`:host`), the document (`:root`), or an element (`[data-mullion-scope]`
   * stamped on it). Omitted, the provider renders a `display: contents`
   * wrapper carrying the attribute, so a nested provider needs no DOM of its own.
   */
  scope?: MullionScope | undefined;
  /** Nested providers only: `lock` paints the brand theme or `theme`; `follow` paints the parent's. */
  mode?: MullionMode | undefined;
  /**
   * The element overlays portal into. Omitted, the provider creates one
   * inside its parent's container, or under `document.body` at the root.
   * Fixed at mount.
   */
  portal?: HTMLElement | null | undefined;
  /** Root providers only. Omitted, nothing is read from or written to storage. */
  persistence?: MullionPersistence | undefined;
  /**
   * Host-injected initial-theme candidates in priority order, read once at
   * mount. The first that names a registered theme is used, below a persisted
   * user choice and `theme` and above the brand fallback. Injected rather than
   * read here so the framework carries no host coupling: the WordPress reads
   * live in `@/services/wpThemeId`.
   */
  themeCandidates?: (() => Array<string | null | undefined>) | undefined;
  /** Scopes the generated scope id. For the storage key, see `persistence.scope`. */
  instanceId?: string | undefined;
  children?: ReactNode;
}

const WRAPPER_STYLE: CSSProperties = { display: 'contents' };

function useRegisteredThemeId(theme: MullionProviderProps['theme']): string | undefined {
  return useMemo(() => {
    if (theme === undefined || typeof theme === 'string') return theme;
    const result = defineTheme(theme);
    if (result.ok) return result.id;
    console.warn(`[Mullion UI] Theme "${result.id}" refused:\n  - ${result.issues.join('\n  - ')}`);
    return undefined;
  }, [theme]);
}

export function MullionProvider({
  theme,
  scope,
  mode = 'lock',
  portal,
  persistence,
  instanceId,
  themeCandidates,
  children,
}: MullionProviderProps) {
  const parentManager = useContext(MullionThemeContext);
  const parentScope = useContext(MullionScopeContext);
  const parentPortal = useContext(MullionPortalContext);
  const isRoot = parentManager === null;

  const registryVersion = useSyncExternalStore(subscribeThemes, getThemesVersion, getThemesVersion);
  const propThemeId = useRegisteredThemeId(theme);

  // ── Switching state: only the root's is published, but hooks are unconditional ──
  const storageKey = storageKeyFor(persistence?.key, persistence?.scope);
  const persisted = persistence?.allowed ?? persistence !== undefined;
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (!persisted) return null;
    const stored = readStoredThemeId(storageKey);
    return stored && hasTheme(stored) ? stored : null;
  });
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Read once at mount: these are host reads (a global, a DOM attribute) whose
  // answer is fixed for the page, and re-reading them on a later render would
  // let a stale hint outrank a choice the user has since made.
  const [candidateId] = useState<string | null>(() => {
    for (const candidate of themeCandidates?.() ?? []) {
      if (candidate && hasTheme(candidate)) return candidate;
    }
    return null;
  });

  const setTheme = useCallback(
    (id: string) => {
      const resolved = resolveThemeId(id);
      setSelectedId(resolved);
      setPreviewId(null);
      if (persisted) writeStoredThemeId(storageKey, resolved);
    },
    [persisted, storageKey],
  );
  const setPreviewTheme = useCallback((id: string | null) => {
    if (id === null || hasTheme(id)) setPreviewId(id);
  }, []);

  // The initial-theme priority, unchanged from `ThemeContext`: a preview beats
  // everything, then the user's own choice (this session's or the stored one),
  // then the instance default, then a host hint, then the brand theme. Each
  // step has to be a registered theme to count, so an instance configured with
  // a theme that is no longer installed falls through to the host hint rather
  // than skipping it for the brand.
  const instanceDefaultId = propThemeId && hasTheme(propThemeId) ? propThemeId : null;
  const rootThemeId = resolveThemeId(previewId ?? selectedId ?? instanceDefaultId ?? candidateId);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- registryVersion is the store's change signal
  const themes = useMemo<MullionThemeEntry[]>(() => listThemes(), [registryVersion]);
  const ownManager = useMemo<MullionThemeManager>(
    () => ({
      themeId: rootThemeId,
      colorScheme: getThemeEntry(rootThemeId).colorScheme,
      previewThemeId: previewId,
      themes,
      persisted,
      setTheme,
      setPreviewTheme,
    }),
    [rootThemeId, previewId, themes, persisted, setTheme, setPreviewTheme],
  );
  const manager = parentManager ?? ownManager;

  // ── What this provider paints ──
  const scopeMode: MullionScopeMode = isRoot ? 'root' : mode;
  const paintedId = isRoot
    ? rootThemeId
    : mode === 'follow'
      ? (parentScope?.themeId ?? manager.themeId)
      : resolveThemeId(propThemeId ?? BRAND_THEME_ID);
  const entry = getThemeEntry(paintedId);

  const [scopeId] = useState(() => createScopeId(instanceId));
  const selector = isShadowRoot(scope) ? ':host' : scope === 'document' ? ':root' : scopeSelector(scopeId);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Portal container ──
  // Our own container carries the scope attribute from birth so a consumer
  // reading it during the first render already sees it; a caller-supplied
  // container is stamped in the effect below.
  const [ownContainer] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.setAttribute(PORTAL_ATTR, scopeId);
    el.setAttribute(SCOPE_ATTR, scopeId);
    return el;
  });
  const container = portal ?? ownContainer;

  useLayoutEffect(() => {
    if (!container || container !== ownContainer) return undefined;
    const parent = parentPortal ?? document.body;
    parent.appendChild(container);
    return () => container.remove();
  }, [container, ownContainer, parentPortal]);

  useLayoutEffect(() => {
    if (!container || container === ownContainer) return undefined;
    container.setAttribute(SCOPE_ATTR, scopeId);
    return () => container.removeAttribute(SCOPE_ATTR);
  }, [container, ownContainer, scopeId]);

  useLayoutEffect(() => {
    if (!scope || isShadowRoot(scope) || scope === 'document') return undefined;
    scope.setAttribute(SCOPE_ATTR, scopeId);
    return () => scope.removeAttribute(SCOPE_ATTR);
  }, [scope, scopeId]);

  // ── The sheets, written into every tree this provider paints ──
  // The component sheet (P79-B) is one list shared by every root on the page;
  // the token sheet is built per scope. Both go wherever the scope and the
  // portal container live, so nothing the provider paints is left unstyled.
  const handlesRef = useRef<SheetHandle[]>([]);
  const adoptedRef = useRef<Map<SheetRoot, () => void>>(new Map());
  // [P79-0] Written as a function the two effects below share. The layout
  // effect paints before the first frame; a passive effect repeats the pass
  // when a target had no tree yet, because a nested provider's container is
  // attached to its parent's before the parent's own layout effect has put
  // that one in the document. Every layout effect in the commit runs before
  // any passive one, so the second pass sees the finished tree.
  const paint = useCallback((): boolean => {
    const targets: Array<{ root: SheetRoot; selector: string }> = [];
    let complete = true;
    const add = (root: SheetRoot | null, sel: string) => {
      if (!root) complete = false;
      else if (!targets.some((t) => t.root === root && t.selector === sel)) targets.push({ root, selector: sel });
    };
    if (isShadowRoot(scope)) add(scope, ':host');
    else if (scope === 'document') add(document, ':root');
    else if (scope) add(sheetRootOf(scope), selector);
    else if (wrapperRef.current) add(sheetRootOf(wrapperRef.current), selector);
    if (container) add(sheetRootOf(container), scopeSelector(scopeId));

    const roots = new Set(targets.map((t) => t.root));
    for (const root of roots) {
      if (!adoptedRef.current.has(root)) adoptedRef.current.set(root, adoptUiStyles(root));
    }
    for (const [root, release] of adoptedRef.current) {
      if (!roots.has(root)) {
        release();
        adoptedRef.current.delete(root);
      }
    }

    const cssBySelector = new Map<string, string>();
    const cssFor = (sel: string) => {
      let css = cssBySelector.get(sel);
      if (css === undefined) {
        css = buildTokenSheet(entry, sel);
        cssBySelector.set(sel, css);
      }
      return css;
    };

    const next: SheetHandle[] = [];
    for (const t of targets) {
      const existing = handlesRef.current.find((h) => h.root === t.root && h.selector === t.selector);
      if (existing) {
        existing.update(cssFor(t.selector));
        next.push(existing);
      } else {
        next.push(attachSheet(t.root, scopeId, t.selector, cssFor(t.selector)));
      }
    }
    for (const h of handlesRef.current) {
      if (!next.includes(h)) h.remove();
    }
    handlesRef.current = next;
    return complete;
  }, [scope, selector, container, entry, scopeId]);

  const deferredRef = useRef(false);
  useLayoutEffect(() => {
    deferredRef.current = !paint();
  }, [paint]);
  useEffect(() => {
    if (!deferredRef.current) return;
    deferredRef.current = false;
    if (!paint() && import.meta.env.DEV) {
      // A caller-supplied container attached after this point is never painted:
      // the passes above run only on a prop or theme change.
      console.warn('[Mullion UI] A `portal` container is not attached to a document or shadow root; overlays in it will not receive this provider\'s tokens. Attach it before the provider mounts.');
    }
  }, [paint]);

  useLayoutEffect(
    () => () => {
      for (const h of handlesRef.current) h.remove();
      handlesRef.current = [];
      for (const release of adoptedRef.current.values()) release();
      adoptedRef.current.clear();
    },
    [],
  );

  const scopeValue = useMemo<MullionScopeValue>(
    () => ({ scopeId, selector, themeId: paintedId, colorScheme: entry.colorScheme, mode: scopeMode }),
    [scopeId, selector, paintedId, entry.colorScheme, scopeMode],
  );

  return (
    <MullionThemeContext.Provider value={manager}>
      <MullionScopeContext.Provider value={scopeValue}>
        <MullionPortalContext.Provider value={container}>
          {scope === undefined ? (
            <div ref={wrapperRef} data-mullion-scope={scopeId} style={WRAPPER_STYLE}>
              {children}
            </div>
          ) : (
            children
          )}
        </MullionPortalContext.Provider>
      </MullionScopeContext.Provider>
    </MullionThemeContext.Provider>
  );
}
