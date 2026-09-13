/**
 * Mantine theme adapter.
 *
 * [P79-D] Theme management moved into the framework. `MullionProvider` owns
 * the registry, the initial-theme priority, switching, preview and persistence;
 * this context is what is left, and all it does is turn the framework's current
 * theme into the two Mantine-shaped values the app still needs: the
 * `MantineThemeOverride` and the pre-generated CSS variable string. Both come
 * from the Mantine adapter registry in `src/themes/index.ts`, and both die with
 * Mantine in Phase 81, at which point this file goes with them.
 *
 * `useTheme()` keeps its shape, so no consumer changed when the owner did.
 *
 * Context definition lives in themeContextDef.ts for Fast Refresh
 * compatibility. The useTheme() hook lives in hooks/useTheme.ts.
 *
 * Gold source: docs/THEME_SYSTEM_ASSESSMENT.md §3 & §4
 */

import { useMemo, type ReactNode } from 'react';
import type { ThemeMeta } from '@mullion/theme-engine';
import { useMullionTheme, type MullionThemeEntry } from '@/ui';
import { ThemeContext, type ThemeContextValue } from './themeContextDef';
import { getTheme } from '../themes/index';

export interface ThemeProviderProps {
  children: ReactNode;
}

/** The picker-facing shape, which the framework entry is a superset of. */
function toMeta(entry: MullionThemeEntry): ThemeMeta {
  return {
    id: entry.id,
    name: entry.name,
    colorScheme: entry.colorScheme,
    group: entry.group,
    description: entry.description,
    seasonal: entry.seasonal,
  };
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { themeId, colorScheme, themes, setTheme, setPreviewTheme } = useMullionTheme();

  // O(1) map lookup against the pre-computed adapter registry, memoised so the
  // Mantine override keeps its identity while the theme does.
  const entry = useMemo(() => getTheme(themeId), [themeId]);
  const availableThemes = useMemo(() => themes.map(toMeta), [themes]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      mantineTheme: entry.mantine,
      colorScheme,
      cssVars: entry.cssVars,
      availableThemes,
      setTheme,
      setPreviewTheme,
    }),
    [themeId, entry, colorScheme, availableThemes, setTheme, setPreviewTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
