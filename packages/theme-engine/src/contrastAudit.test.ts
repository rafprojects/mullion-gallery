/**
 * P62-H: WCAG AA contrast gate for every bundled theme.
 *
 * Fails (blocking, in the fast Vitest CI job) if any theme's intended
 * text/background pair drops below AA. See contrastAudit.ts for the pair set.
 */
import { describe, it, expect } from 'vitest';
import { bundledThemeDefinitions } from './bundledThemes';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  auditThemeContrast,
  fixedOverlayChecks,
  AA_NORMAL_TEXT,
  LIGHTBOX_BACKDROP_OPACITY,
  OVERLAY_SCRIM_OPACITY,
} from './contrastAudit';
import { contrastRatio } from './validation';
import { resolveColors } from './colorGen';
import { deriveComponentTokens } from './componentTokens';
import type { ThemeColors } from './types';

describe('theme contrast — WCAG AA (P62-H)', () => {
  for (const def of bundledThemeDefinitions) {
    it(`${def.id}: intended text pairs meet AA (${AA_NORMAL_TEXT}:1)`, () => {
      // _base.json carries no colors, so each theme's block is complete at runtime.
      const failures = auditThemeContrast(def.colors as ThemeColors, def.colorScheme);
      const report = failures
        .map((f) => `  - ${f.label}: ${f.fg} on ${f.bg} = ${f.ratio.toFixed(2)}:1 (need ${f.minRatio}:1)`)
        .join('\n');
      expect(
        failures,
        `${def.id} has ${failures.length} contrast failure(s):\n${report}`,
      ).toHaveLength(0);
    });
  }
});

// [P81-A] The caption scrim is derived per theme: the smallest opacity at
// which the theme's text clears 4.5:1 over the worst photo, floored at 0.60
// (designer, 2026-10-26). The audit reads the token, so an override is audited.
describe('caption scrim (P81-A)', () => {
  const scrimFor = (id: string) => {
    const def = bundledThemeDefinitions.find((d) => d.id === id)!;
    const rc = resolveColors(def.colors as ThemeColors, def.colorScheme);
    return deriveComponentTokens(rc)['caption-scrim'];
  };

  it('derives the floor where the theme needs no more, and more where it does', () => {
    expect(scrimFor('default-dark')).toBe('60%');
    expect(scrimFor('catppuccin-latte')).toBe('81%');
    for (const def of bundledThemeDefinitions) {
      const percent = parseFloat(scrimFor(def.id));
      expect(percent, def.id).toBeGreaterThanOrEqual(60);
      expect(percent, def.id).toBeLessThanOrEqual(81);
    }
  });

  it('fails a theme that overrides the scrim below what its text needs', () => {
    const def = bundledThemeDefinitions.find((d) => d.id === 'catppuccin-latte')!;
    const failures = auditThemeContrast(def.colors as ThemeColors, def.colorScheme, AA_NORMAL_TEXT, {
      'caption-scrim': '60%',
    });
    expect(failures.map((f) => f.label)).toEqual(['text on a caption scrim (background at 60% over the worst photo)']);
  });
});

// [P81-A] The overlays no theme paints: one check for every theme at once,
// plus a guard that the components still paint the opacities audited here.
describe('fixed overlays (P81-A)', () => {
  it('white clears AA on the black caption scrim and on the lightbox backdrop', () => {
    for (const check of fixedOverlayChecks()) {
      expect(contrastRatio(check.fg, check.bg), check.label).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it('is what the components paint', () => {
    const src = (path: string) => readFileSync(join(__dirname, '../../..', path), 'utf8');
    const scrim = `rgba(0,0,0,${OVERLAY_SCRIM_OPACITY})`;
    expect(src('packages/shared-ui/src/Lightbox.tsx')).toContain(scrim);
    expect(src('packages/shared-ui/src/Lightbox.tsx')).toContain(`rgba(0,0,0,${LIGHTBOX_BACKDROP_OPACITY})`);
    expect(src('src/components/Admin/LayoutBuilder/MediaPickerSidebar.tsx')).toContain(scrim);
  });
});

