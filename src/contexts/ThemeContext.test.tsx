/**
 * The Mantine theme adapter (P79-D).
 *
 * Selection, persistence and the initial-theme priority moved to the framework
 * and are pinned in `src/ui/__tests__/themeSelection.test.tsx`. What is left
 * here is the adapter's own job: follow the framework's current theme and
 * publish the Mantine-shaped values the app still reads through `useTheme()`.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { MullionProvider, useMullionTheme, listThemes } from '@/ui';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from '../hooks/useTheme';
import { getTheme, DEFAULT_THEME_ID, getAllThemeMeta } from '../themes/index';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MullionProvider persistence={{}}>
      <ThemeProvider>{children}</ThemeProvider>
    </MullionProvider>
  );
}

describe('ThemeProvider (Mantine adapter)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('publishes the default theme with its Mantine override and variables', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.themeId).toBe(DEFAULT_THEME_ID);
    expect(result.current.mantineTheme).toBe(getTheme(DEFAULT_THEME_ID).mantine);
    expect(result.current.cssVars).toBeTruthy();
    expect(['light', 'dark']).toContain(result.current.colorScheme);
  });

  it('exposes the framework registry in the picker shape the app expects', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.availableThemes).toEqual(getAllThemeMeta());
    expect(result.current.availableThemes.map((m) => m.id)).toEqual(
      listThemes().map((t) => t.id),
    );
  });

  it('follows the framework when the theme changes', () => {
    const { result } = renderHook(
      () => ({ adapter: useTheme(), framework: useMullionTheme() }),
      { wrapper },
    );

    const other = result.current.adapter.availableThemes.find((t) => t.id !== DEFAULT_THEME_ID);
    expect(other).toBeDefined();

    act(() => result.current.framework.setTheme(other!.id));

    expect(result.current.adapter.themeId).toBe(other!.id);
    expect(result.current.adapter.mantineTheme).toBe(getTheme(other!.id).mantine);
    expect(result.current.adapter.cssVars).toBe(getTheme(other!.id).cssVars);
    expect(result.current.adapter.colorScheme).toBe(result.current.framework.colorScheme);
  });

  it('switches through the adapter, which is the framework switcher', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    const other = result.current.availableThemes.find((t) => t.id !== DEFAULT_THEME_ID);
    act(() => result.current.setTheme(other!.id));

    expect(result.current.themeId).toBe(other!.id);
    expect(localStorage.getItem('mullion-theme-id')).toBe(other!.id);
  });

  // The adapter sits above every Mantine consumer in the tree, so an unstable
  // context value re-renders all of them on any parent render. Asserting the
  // override's identity is not enough: that object comes from the registry map
  // and is stable however the adapter is written.
  it('publishes a stable context value while the theme does not change', () => {
    const { result, rerender } = renderHook(() => useTheme(), { wrapper });

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
