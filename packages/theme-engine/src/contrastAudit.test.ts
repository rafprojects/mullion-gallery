/**
 * P62-H: WCAG AA contrast gate for every bundled theme.
 *
 * Fails (blocking, in the fast Vitest CI job) if any theme's intended
 * text/background pair drops below AA. See contrastAudit.ts for the pair set.
 */
import { describe, it, expect } from 'vitest';
import { bundledThemeDefinitions } from './bundledThemes';
import { auditThemeContrast, intendedContrastChecks, AA_NORMAL_TEXT } from './contrastAudit';
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

// [P81-A] The caption scrim's ground is the background over the photo that
// weakens the theme's text most: a white one under light text, a black one
// under dark text.
describe('caption scrim (P81-A)', () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return r! + g! + b!;
  };
  const scrim = (id: string) => {
    const def = bundledThemeDefinitions.find((d) => d.id === id)!;
    const checks = intendedContrastChecks(def.colors as ThemeColors, def.colorScheme);
    return {
      ground: checks.find((c) => c.label.startsWith('text on a caption scrim'))!.bg,
      background: checks.find((c) => c.label === 'text on background')!.bg,
    };
  };

  it('measures a dark theme over a white photo and a light theme over a black one', () => {
    const dark = scrim('default-dark');
    const light = scrim('default-light');
    expect(lum(dark.ground)).toBeGreaterThan(lum(dark.background));
    expect(lum(light.ground)).toBeLessThan(lum(light.background));
  });
});
