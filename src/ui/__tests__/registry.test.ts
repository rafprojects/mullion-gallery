/**
 * P79-A: the framework theme registry. Engine-only, so the entries it holds
 * are definitions and resolved colours rather than Mantine overrides, and
 * `defineTheme` is a guard: a theme that fails validation or either contrast
 * audit is refused with its issues, not registered with a warning.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  bundledThemeCatalog,
  bundledThemeDefinitions,
  type ThemeExtension,
} from '@mullion/theme-engine';
import {
  BRAND_THEME_ID,
  defineTheme,
  getThemeEntry,
  getThemesVersion,
  hasTheme,
  listThemes,
  listThemeGroups,
  resolveThemeId,
  subscribeThemes,
  themeSwatches,
} from '../provider/registry';

const tokyoNight = bundledThemeDefinitions.find((t) => t.id === 'tokyo-night')!;

function customFrom(base: ThemeExtension, id: string, colors: Partial<ThemeExtension['colors']> = {}): ThemeExtension {
  return { ...base, id, name: `Custom ${id}`, colors: { ...base.colors, ...colors } };
}

describe('framework theme registry', () => {
  it('registers every bundled theme, with the brand theme among them', () => {
    const ids = listThemes().map((t) => t.id);
    expect(ids).toHaveLength(bundledThemeDefinitions.length);
    expect(new Set(ids)).toEqual(new Set(bundledThemeDefinitions.map((t) => t.id)));
    expect(hasTheme(BRAND_THEME_ID)).toBe(true);
    expect(listThemes().every((t) => !t.custom)).toBe(true);
  });

  // [P79-D] `listThemes()` moved from registration order to catalogue order,
  // which is what a picker shows and what the WordPress settings field shows.
  it('lists themes in catalogue order', () => {
    const ids = listThemes().map((t) => t.id);
    const catalogued = [...bundledThemeCatalog]
      .sort((a, b) => (a.displayOrder !== b.displayOrder
        ? a.displayOrder - b.displayOrder
        : a.name.localeCompare(b.name)))
      .map((entry) => entry.id);
    expect(ids).toEqual(catalogued);
  });

  it('carries the catalogue description and group onto every bundled theme', () => {
    for (const entry of listThemes()) {
      const listed = bundledThemeCatalog.find((c) => c.id === entry.id)!;
      expect(entry.group).toBe(listed.group);
      expect(entry.description).toBe(listed.description);
      expect(entry.seasonal).toBe(listed.seasonal);
    }
  });

  it('groups themes in catalogue order, groups ordered by their first theme', () => {
    const groups = listThemeGroups();
    expect(groups.flatMap((g) => g.themes.map((t) => t.id))).toEqual(
      listThemes().map((t) => t.id),
    );
    expect(groups[0]?.group).toBe('Default');
    expect(new Set(groups.map((g) => g.group)).size).toBe(groups.length);
  });

  it('describes a runtime theme as Custom and sorts it last', () => {
    const id = 'catalogue-absent-theme';
    expect(defineTheme(customFrom(tokyoNight, id)).ok).toBe(true);

    const entry = getThemeEntry(id);
    expect(entry.group).toBe('Custom');
    expect(entry.custom).toBe(true);
    expect(entry.description).toBe('Dark theme');
    expect(listThemes().at(-1)?.id).toBe(id);
    expect(listThemeGroups().at(-1)?.group).toBe('Custom');
  });

  // [P79-D] The acceptance criterion is that a lookup stays O(1). A timing
  // assertion would be flaky; identity is the property that would actually
  // break if someone made the getter recompute, so that is what is pinned.
  it('returns the same entry object on every lookup', () => {
    const first = getThemeEntry('nord');
    expect(getThemeEntry('nord')).toBe(first);
    expect(listThemes().find((t) => t.id === 'nord')).toBe(first);
    expect(first.resolved).toBe(getThemeEntry('nord').resolved);
  });

  it('reads swatches off the definition, not the resolved ramp', () => {
    const swatches = themeSwatches('tokyo-night');
    expect(swatches).toHaveLength(5);
    expect(swatches[0]).toBe(tokyoNight.colors!.background);
    expect(swatches.every((c) => typeof c === 'string' && c.length > 0)).toBe(true);
  });

  it('holds resolved colours and the merged definition, not a Mantine override', () => {
    const entry = getThemeEntry('tokyo-night');
    expect(entry.colorScheme).toBe('dark');
    expect(entry.definition.colors.background).toBe(tokyoNight.colors!.background);
    expect(entry.resolved.primary).toHaveLength(10);
    expect(entry.resolved.primaryStroke).toMatch(/^#/);
    expect(entry).not.toHaveProperty('mantine');
  });

  it('falls back to the brand theme for an unknown id', () => {
    expect(resolveThemeId('no-such-theme')).toBe(BRAND_THEME_ID);
    expect(resolveThemeId(undefined)).toBe(BRAND_THEME_ID);
    expect(getThemeEntry('no-such-theme').id).toBe(BRAND_THEME_ID);
  });

  it('defineTheme registers a valid theme as custom and notifies subscribers', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeThemes(listener);
    const before = getThemesVersion();

    const result = defineTheme(customFrom(tokyoNight, 'custom-ok'));
    expect(result).toEqual({ ok: true, id: 'custom-ok' });
    expect(hasTheme('custom-ok')).toBe(true);
    expect(getThemeEntry('custom-ok').custom).toBe(true);

    // The entry is readable at once; the change signal is deferred a microtask
    // so a provider may register during render without updating a subscriber
    // mid-render.
    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getThemesVersion()).toBe(before + 1);
    unsubscribe();
  });

  it('defineTheme refuses a structurally invalid theme and names the issue', () => {
    const result = defineTheme({ id: 'custom-broken', name: 'Broken', colorScheme: 'dark', colors: { background: 'not-a-colour' } } as ThemeExtension);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.id).toBe('custom-broken');
    expect(result.issues.join('\n')).toMatch(/background/);
    expect(hasTheme('custom-broken')).toBe(false);
  });

  it('defineTheme refuses a theme whose text fails the 1.4.3 audit', () => {
    // Text two steps from the background: structurally valid, unreadable.
    const result = defineTheme(customFrom(tokyoNight, 'custom-low-contrast', { text: '#1c1d28', textMuted: '#1c1d28' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.startsWith('text contrast:'))).toBe(true);
    expect(hasTheme('custom-low-contrast')).toBe(false);
  });

  it('defineTheme refuses a theme whose component tokens fail the 1.4.11 audit', () => {
    const result = defineTheme({
      ...customFrom(tokyoNight, 'custom-faint-border'),
      componentTokens: { 'input-bd': '#1a1b26' },
    } as ThemeExtension);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.startsWith('non-text contrast:'))).toBe(true);
    expect(hasTheme('custom-faint-border')).toBe(false);
  });

  it('re-defining an id replaces the entry', () => {
    defineTheme(customFrom(tokyoNight, 'custom-replace'));
    const first = getThemeEntry('custom-replace');
    defineTheme({ ...customFrom(tokyoNight, 'custom-replace'), name: 'Renamed' });
    const second = getThemeEntry('custom-replace');
    expect(second).not.toBe(first);
    expect(second.name).toBe('Renamed');
    expect(listThemes().filter((t) => t.id === 'custom-replace')).toHaveLength(1);
  });
});
