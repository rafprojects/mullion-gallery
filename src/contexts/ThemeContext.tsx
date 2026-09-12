/**
 * Theme Provider — React component for runtime theme switching
 *
 * Provides:
 *  - Current theme ID and MantineThemeOverride
 *  - setTheme() for instant O(1) switching (Map lookup)
 *  - Available theme list for UI pickers
 *  - LocalStorage persistence (respects admin disable flag)
 *  - WP config injection reading
 *
 * [P79-A] The `--mullion-*` variable injection this context used to own
 * (shadow root and scoped document sheets) moved to `MullionProvider` in
 * `src/ui/provider`, which is the framework's one emitter for every tree.
 * The theme id, persistence and switching stay here until P79-D moves them.
 *
 * Context definition lives in themeContextDef.ts for Fast Refresh
 * compatibility. The useTheme() hook lives in hooks/useTheme.ts.
 *
 * Gold source: docs/THEME_SYSTEM_ASSESSMENT.md §3 & §4
 */

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { ThemeContext, type ThemeContextValue } from './themeContextDef';
import {
  getTheme,
  getAllThemeMeta,
  hasTheme,
  DEFAULT_THEME_ID,
  type ThemeEntry,
} from '../themes/index';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'mullion-theme-id';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine the initial theme ID from (in priority order):
 *  1. User's localStorage preference (if persistence allowed — user's choice wins)
 *  2. Per-instance admin-configured `defaultThemeId`
 *  3. Host-injected theme candidates (`resolveWpThemeIds`), first valid wins
 *  4. DEFAULT_THEME_ID fallback
 *
 * When persistence is disabled (admin locked theme), localStorage is
 * skipped and the injected theme takes precedence.
 *
 * [P51-D] The WordPress-specific candidate reads (`__mullionThemeId`,
 * `data-mullion-theme`, `__MULLION_CONFIG__.theme`) are injected via
 * `resolveWpThemeIds` so this context carries no direct WP coupling.
 */
function resolveInitialThemeId(
  allowPersistence: boolean,
  storageKey: string,
  defaultThemeId?: string,
  resolveWpThemeIds?: () => Array<string | null | undefined>,
): string {
  // 1. User's localStorage preference (when persistence is allowed)
  // Checked first so user's explicit choice overrides admin defaults
  if (allowPersistence && typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && hasTheme(stored)) {
        return stored;
      }
    } catch {
      // Storage blocked — fall through
    }
  }

  // 2. Per-instance admin-configured theme (e.g., space's theme setting)
  if (defaultThemeId && hasTheme(defaultThemeId)) {
    return defaultThemeId;
  }

  // 3. Host-injected theme candidates, in priority order — first valid wins.
  for (const candidate of resolveWpThemeIds?.() ?? []) {
    if (candidate && hasTheme(candidate)) {
      return candidate;
    }
  }

  // 4. Default fallback
  return DEFAULT_THEME_ID;
}

/**
 * Persist theme ID to localStorage (best-effort, never throws).
 */
function persistThemeId(id: string, storageKey = STORAGE_KEY): void {
  try {
    localStorage.setItem(storageKey, id);
  } catch {
    // Storage full or blocked — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface ThemeProviderProps {
  children: ReactNode;

  /**
   * Allow localStorage persistence of the user's theme choice.
   * Defaults to true. Set to false when WP admin has disabled
   * user theme overrides.
   */
  allowPersistence?: boolean | undefined;

  /**
   * Force a specific theme ID (overrides localStorage and WP config).
   * Used for preview mode or admin-controlled embedding.
   */
  forcedThemeId?: string | undefined;

  /**
   * Per-instance admin-configured theme (e.g., a space's theme setting).
   * Used as the initial theme when no localStorage preference exists,
   * but user can still override it (unlike forcedThemeId).
   */
  defaultThemeId?: string | undefined;

  /**
   * Scopes the localStorage key to `mullion-theme-id-{instanceId}` so that
   * each space on a multi-space page maintains independent user theme
   * preferences.
   */
  instanceId?: string | undefined;

  /**
   * Host-injected initial-theme candidates, in priority order. The first
   * candidate that resolves to a registered theme is used as the initial
   * theme (after localStorage and `defaultThemeId`). Kept injectable so the
   * theme context stays free of any WordPress (`window.__MULLION_*`) coupling —
   * see `@/services/wpThemeId`. [P51-D]
   */
  resolveWpThemeIds?: (() => Array<string | null | undefined>) | undefined;
}

export function ThemeProvider({
  children,
  allowPersistence = true,
  forcedThemeId,
  defaultThemeId,
  instanceId,
  resolveWpThemeIds,
}: ThemeProviderProps) {
  const storageKey = instanceId ? `${STORAGE_KEY}-${instanceId}` : STORAGE_KEY;
  const initialId = forcedThemeId ?? resolveInitialThemeId(allowPersistence, storageKey, defaultThemeId, resolveWpThemeIds);

  const [themeId, setThemeIdState] = useState<string>(initialId);
  const [previewThemeId, setPreviewThemeIdState] = useState<string | null>(null);

  // The effective theme ID: preview overrides saved, forced overrides all
  const effectiveThemeId = forcedThemeId ?? previewThemeId ?? themeId;

  // Lookup from the pre-computed registry — O(1), no re-computation
  const entry: ThemeEntry = useMemo(() => getTheme(effectiveThemeId), [effectiveThemeId]);

  // Available themes (static after startup, memoize once)
  const availableThemes = useMemo(() => getAllThemeMeta(), []);

  // setTheme handler — persists the theme as the saved choice
  const setTheme = useCallback(
    (id: string) => {
      const resolvedId = hasTheme(id) ? id : DEFAULT_THEME_ID;

      setThemeIdState(resolvedId);
      // Clear preview since the saved theme is now updated
      setPreviewThemeIdState(null);

      if (allowPersistence && !forcedThemeId) {
        persistThemeId(resolvedId, storageKey);
      }
    },
    [allowPersistence, forcedThemeId, storageKey],
  );

  // setPreviewTheme — instant visual switch without persisting
  const setPreviewTheme = useCallback(
    (id: string | null) => {
      if (id === null || hasTheme(id)) {
        setPreviewThemeIdState(id);
      }
    },
    [],
  );

  // Sync forced theme changes (e.g., admin changes during session)
  useEffect(() => {
    if (forcedThemeId && hasTheme(forcedThemeId)) {
      setThemeIdState(forcedThemeId);
    }
  }, [forcedThemeId]);

  // Context value — memoized to prevent unnecessary re-renders
  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId: effectiveThemeId,
      mantineTheme: entry.mantine,
      colorScheme: entry.meta.colorScheme,
      cssVars: entry.cssVars,
      availableThemes,
      setTheme,
      setPreviewTheme,
    }),
    [effectiveThemeId, entry, availableThemes, setTheme, setPreviewTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

