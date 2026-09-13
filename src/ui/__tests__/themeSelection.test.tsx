/**
 * Theme selection (P79-D): the behaviour that moved out of `ThemeContext`.
 *
 * The initial-theme priority, persistence, the admin lock and the per-instance
 * storage key are the plugin's contract with its users, so they are pinned here
 * against the framework rather than against the adapter that used to own them.
 * The priority order and the scoped key had no test before this track; the
 * acceptance criteria said they were covered by the existing suite and they
 * were not.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { MullionProvider, useMullionTheme, BRAND_THEME_ID, listThemes } from '@/ui';
import type { MullionPersistence } from '@/ui';

const OTHER = 'tokyo-night';
const INSTANCE_DEFAULT = 'nord';
const CANDIDATE = 'github-light';

function wrap(props: {
  theme?: string;
  persistence?: MullionPersistence;
  themeCandidates?: () => Array<string | null | undefined>;
  instanceId?: string;
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MullionProvider {...props}>{children}</MullionProvider>;
  };
}

function renderManager(props: Parameters<typeof wrap>[0] = {}) {
  return renderHook(() => useMullionTheme(), { wrapper: wrap(props) });
}

describe('theme selection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('initial theme priority', () => {
    it('falls back to the brand theme when nothing names one', () => {
      const { result } = renderManager();
      expect(result.current.themeId).toBe(BRAND_THEME_ID);
    });

    it('uses a host candidate when there is no instance default', () => {
      const { result } = renderManager({ themeCandidates: () => [CANDIDATE] });
      expect(result.current.themeId).toBe(CANDIDATE);
    });

    it('takes the first host candidate that names a registered theme', () => {
      const { result } = renderManager({
        themeCandidates: () => [null, 'no-such-theme', CANDIDATE, OTHER],
      });
      expect(result.current.themeId).toBe(CANDIDATE);
    });

    it('prefers the instance default over a host candidate', () => {
      const { result } = renderManager({
        theme: INSTANCE_DEFAULT,
        themeCandidates: () => [CANDIDATE],
      });
      expect(result.current.themeId).toBe(INSTANCE_DEFAULT);
    });

    it('falls through to the host candidate when the instance default is not registered', () => {
      const { result } = renderManager({
        theme: 'a-theme-that-was-uninstalled',
        themeCandidates: () => [CANDIDATE],
      });
      expect(result.current.themeId).toBe(CANDIDATE);
    });

    it('prefers a stored choice over both the instance default and a host candidate', () => {
      localStorage.setItem('mullion-theme-id', OTHER);
      const { result } = renderManager({
        theme: INSTANCE_DEFAULT,
        themeCandidates: () => [CANDIDATE],
        persistence: {},
      });
      expect(result.current.themeId).toBe(OTHER);
    });

    it('ignores a stored choice that names an unregistered theme', () => {
      localStorage.setItem('mullion-theme-id', 'no-such-theme');
      const { result } = renderManager({ theme: INSTANCE_DEFAULT, persistence: {} });
      expect(result.current.themeId).toBe(INSTANCE_DEFAULT);
    });
  });

  describe('switching', () => {
    it('switches theme via setTheme', () => {
      const { result } = renderManager();
      act(() => result.current.setTheme(OTHER));
      expect(result.current.themeId).toBe(OTHER);
    });

    it('falls back to the brand theme for an unknown id', () => {
      const { result } = renderManager();
      act(() => result.current.setTheme('totally-invalid-theme-id'));
      expect(result.current.themeId).toBe(BRAND_THEME_ID);
    });

    it('reports a colour scheme for the current theme', () => {
      const { result } = renderManager();
      expect(['light', 'dark']).toContain(result.current.colorScheme);
    });

    it('lists every registered theme', () => {
      const { result } = renderManager();
      expect(result.current.themes).toEqual(listThemes());
      expect(result.current.themes.length).toBeGreaterThan(0);
    });

    it('previews without disturbing the chosen theme, and clears on a real switch', () => {
      const { result } = renderManager({ persistence: {} });
      act(() => result.current.setTheme(OTHER));
      act(() => result.current.setPreviewTheme(CANDIDATE));

      expect(result.current.themeId).toBe(CANDIDATE);
      expect(result.current.previewThemeId).toBe(CANDIDATE);
      expect(localStorage.getItem('mullion-theme-id')).toBe(OTHER);

      act(() => result.current.setPreviewTheme(null));
      expect(result.current.themeId).toBe(OTHER);
    });
  });

  describe('persistence', () => {
    it('persists the chosen theme', () => {
      const { result } = renderManager({ persistence: {} });
      act(() => result.current.setTheme(OTHER));
      expect(localStorage.getItem('mullion-theme-id')).toBe(OTHER);
    });

    it('restores the stored theme on mount', () => {
      localStorage.setItem('mullion-theme-id', OTHER);
      const { result } = renderManager({ persistence: {} });
      expect(result.current.themeId).toBe(OTHER);
    });

    it('switches but does not store when the admin has locked the theme', () => {
      const { result } = renderManager({ persistence: { allowed: false } });
      act(() => result.current.setTheme(OTHER));

      expect(result.current.themeId).toBe(OTHER);
      expect(result.current.persisted).toBe(false);
      expect(localStorage.getItem('mullion-theme-id')).toBeNull();
    });

    it('ignores a stored choice when persistence is not asked for', () => {
      localStorage.setItem('mullion-theme-id', OTHER);
      const { result } = renderManager({ theme: INSTANCE_DEFAULT });
      expect(result.current.themeId).toBe(INSTANCE_DEFAULT);
    });
  });

  describe('per-instance storage key', () => {
    it('scopes the key by the persistence scope, not the provider id', () => {
      // The gallery scopes its tokens per React root and its saved choice per
      // space: a remount changes the first and must not change the second.
      const { result } = renderManager({
        instanceId: 'react-root-7',
        persistence: { scope: 'space-42' },
      });
      act(() => result.current.setTheme(OTHER));

      expect(localStorage.getItem('mullion-theme-id-space-42')).toBe(OTHER);
      expect(localStorage.getItem('mullion-theme-id-react-root-7')).toBeNull();
      expect(localStorage.getItem('mullion-theme-id')).toBeNull();
    });

    it('keeps two instances independent', () => {
      const first = renderManager({ persistence: { scope: 'space-1' } });
      const second = renderManager({ persistence: { scope: 'space-2' } });

      act(() => first.result.current.setTheme(OTHER));
      act(() => second.result.current.setTheme(CANDIDATE));

      expect(localStorage.getItem('mullion-theme-id-space-1')).toBe(OTHER);
      expect(localStorage.getItem('mullion-theme-id-space-2')).toBe(CANDIDATE);
      expect(first.result.current.themeId).toBe(OTHER);
      expect(second.result.current.themeId).toBe(CANDIDATE);
    });

    // Regression: the first draft defaulted the storage scope to `instanceId`,
    // which is the React root id. On a page with no space that turned the
    // unscoped key into a per-mount one, so every stored choice read back empty
    // on the next load. The e2e caught it; this pins it.
    it('leaves the key unscoped when no scope is given, whatever the provider id is', () => {
      const { result } = renderManager({ instanceId: 'react-root-9', persistence: {} });
      act(() => result.current.setTheme(OTHER));

      expect(localStorage.getItem('mullion-theme-id')).toBe(OTHER);
      expect(localStorage.getItem('mullion-theme-id-react-root-9')).toBeNull();
    });
  });
});
