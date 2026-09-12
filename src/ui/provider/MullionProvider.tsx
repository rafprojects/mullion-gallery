/**
 * `MullionProvider` (P79-A): one provider for scope, tokens, colour scheme,
 * portal container, lock and follow, persistence and runtime themes.
 *
 * It replaces five workarounds that exist because Mantine's provider does not
 * model a tree boundary: `ThemeContext`'s variable injection, `OverlayRootSync`,
 * `AdminChromeProvider`, `adminChromeStyles()` and the `--mullion-builder-*`
 * bridge. The rule that makes it work is simple: every element the provider
 * paints, inline children and portaled overlays alike, sits under an element
 * carrying this provider's tokens, and those tokens arrive by stylesheet in
 * whichever tree that element is in. Nothing travels inline.
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

export type MullionScope = HTMLElement | ShadowRoot | 'document';
export type MullionMode = 'lock' | 'follow';

export interface MullionPersistence {
  /** Storage key; defaults to the key `ThemeContext` uses today. */
  key?: string | undefined;
  /** Defaults to true when `persistence` is given at all. */
  allowed?: boolean | undefined;
}

export interface MullionProviderProps {
  /**
   * A registered theme id, or a definition registered on first render through
   * `defineTheme`. A root provider treats it as the instance default, below a
   * persisted user choice; a locked nested provider paints exactly this theme.
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
  /** Scopes the storage key and the generated scope id per gallery instance. */
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
  children,
}: MullionProviderProps) {
  const parentManager = useContext(MullionThemeContext);
  const parentScope = useContext(MullionScopeContext);
  const parentPortal = useContext(MullionPortalContext);
  const isRoot = parentManager === null;

  const registryVersion = useSyncExternalStore(subscribeThemes, getThemesVersion, getThemesVersion);
  const propThemeId = useRegisteredThemeId(theme);

  // ── Switching state: only the root's is published, but hooks are unconditional ──
  const storageKey = storageKeyFor(persistence?.key, instanceId);
  const persisted = persistence?.allowed ?? persistence !== undefined;
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (!persisted) return null;
    const stored = readStoredThemeId(storageKey);
    return stored && hasTheme(stored) ? stored : null;
  });
  const [previewId, setPreviewId] = useState<string | null>(null);

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

  const rootThemeId = resolveThemeId(previewId ?? selectedId ?? propThemeId);
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

  // ── The token sheet, written into every tree this provider paints ──
  const handlesRef = useRef<SheetHandle[]>([]);
  useLayoutEffect(() => {
    const targets: Array<{ root: SheetRoot; selector: string }> = [];
    const add = (root: SheetRoot | null, sel: string) => {
      if (root && !targets.some((t) => t.root === root && t.selector === sel)) targets.push({ root, selector: sel });
    };
    if (isShadowRoot(scope)) add(scope, ':host');
    else if (scope === 'document') add(document, ':root');
    else if (scope) add(sheetRootOf(scope), selector);
    else if (wrapperRef.current) add(sheetRootOf(wrapperRef.current), selector);
    if (container) add(sheetRootOf(container), scopeSelector(scopeId));

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
  }, [scope, selector, container, entry, scopeId]);

  useLayoutEffect(
    () => () => {
      for (const h of handlesRef.current) h.remove();
      handlesRef.current = [];
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
