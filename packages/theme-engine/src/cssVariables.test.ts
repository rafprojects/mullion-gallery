/**
 * Tests for src/themes/cssVariables.ts
 *
 * Covers: generateCssVariables — CSS custom property generation
 */

import { describe, it, expect } from 'vitest';
import { generateCssVariables } from './cssVariables';
import { resolveColors } from './colorGen';
import type { ThemeDefinition, ThemeColors } from './types';
import baseDefaults from './definitions/_base.json';
import defaultDarkDef from './definitions/default-dark.json';

function makeResolvedColors() {
  const colors: ThemeColors = (defaultDarkDef as Record<string, unknown>).colors as ThemeColors;
  return resolveColors(colors, 'dark');
}

function makeThemeDef(): ThemeDefinition {
  const base = JSON.parse(JSON.stringify(baseDefaults));
  const ext = JSON.parse(JSON.stringify(defaultDarkDef));
  // Simple deep merge
  const merged = { ...base, ...ext, colors: ext.colors };
  return merged as unknown as ThemeDefinition;
}

// ---------------------------------------------------------------------------
// generateCssVariables
// ---------------------------------------------------------------------------

describe('generateCssVariables', () => {
  it('returns a string containing a CSS rule', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain(':host {');
    expect(result).toContain('}');
  });

  it('uses custom selector when provided', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def, '.my-root');
    expect(result).toContain('.my-root {');
  });

  it('includes surface-raised and border-strong variables (P74-N)', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-color-surface-raised:');
    expect(result).toContain('#1a3542');
    expect(result).toContain('--mullion-color-border-strong:');
    expect(result).toContain('#648284');
  });

  it('includes --mullion-color-background variable', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-color-background:');
    expect(result).toContain('#08141b');
  });

  it('includes --mullion-color-text variable', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-color-text:');
    expect(result).toContain('#eef8fb');
  });

  it('includes --mullion-color-primary variable', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-color-primary:');
    expect(result).toContain(`--mullion-color-primary: ${rc.primaryFill}`);
    expect(result).toContain(`--mullion-color-primary-stroke: ${rc.primaryStroke}`);
    expect(result).toContain(`--mullion-color-primary-on: ${rc.primaryOnFill}`);
    expect(result).toContain(`--mullion-color-focus-halo: ${rc.focusHalo}`);
  });

  it('includes all 10 primary shade variables', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    for (let i = 0; i < 10; i++) {
      expect(result).toContain(`--mullion-color-primary-${i}:`);
    }
  });

  it('includes spacing variables', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-spacing-xs:');
    expect(result).toContain('--mullion-spacing-md:');
    expect(result).toContain('--mullion-spacing-xl:');
  });

  it('includes radius variables', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-radius-sm:');
    expect(result).toContain('--mullion-radius-md:');
  });

  it('includes shadow variables', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-shadow-xs:');
    expect(result).toContain('--mullion-shadow-lg:');
  });

  it('includes typography variables', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-font-family:');
    expect(result).toContain('--mullion-font-family-mono:');
  });

  it('includes color-scheme meta variable', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-color-scheme: dark');
  });

  it('includes semantic color variables', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-color-success:');
    expect(result).toContain('--mullion-color-warning:');
    expect(result).toContain('--mullion-color-error:');
    expect(result).toContain('--mullion-color-info:');
    expect(result).toContain('--mullion-color-accent:');
  });

  // [P79-C] The framework's Text and Title read the type scale as tokens.
  // Every theme has carried `typography.fontSizes` and `typography.headings`
  // since the engine was written, and until now only the Mantine adapter
  // could see them, so a theme that set its own sizes reached Mantine
  // components and nothing else.
  it('emits the type scale from the definition', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-font-size-xs: 0.75rem;');
    expect(result).toContain('--mullion-font-size-sm: 0.875rem;');
    expect(result).toContain('--mullion-font-size-md: 1rem;');
    expect(result).toContain('--mullion-font-size-lg: 1.125rem;');
    expect(result).toContain('--mullion-font-size-xl: 1.25rem;');
  });

  it('emits the heading scale, size and line height per level', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-heading-font-family:');
    expect(result).toContain('--mullion-heading-size-h1: 2rem;');
    expect(result).toContain('--mullion-heading-line-height-h1: 1.3;');
    expect(result).toContain('--mullion-heading-size-h6: 0.875rem;');
    expect(result).toContain('--mullion-heading-line-height-h6: 1.5;');
  });

  it('takes the type scale from the theme rather than a fixed scale', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const typography = def.typography as unknown as Record<string, unknown>;
    typography.fontSizes = { ...(typography.fontSizes as object), md: '1.5rem' };
    expect(generateCssVariables(rc, def)).toContain('--mullion-font-size-md: 1.5rem;');
  });

  it('falls back to "none" / "inherit" / "monospace" when shadow/typography values are undefined (lines 89-97)', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    // Clear shadow and typography values to trigger the ?? fallback branches
    const defAny = def as unknown as Record<string, unknown>;
    defAny.shadows = { xs: null, sm: null, md: null, lg: null, xl: null };
    defAny.typography = { fontFamily: null, fontFamilyMono: null };
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-shadow-xs: none');
    expect(result).toContain('--mullion-font-family: inherit');
    expect(result).toContain('--mullion-font-family-mono: monospace');
    // [P79-C] The type scale degrades the same way: a definition missing its
    // typography section reaches this function from `defineTheme`, and an
    // inherited size is a worse render than the theme's own, not a crash.
    expect(result).toContain('--mullion-font-size-md: inherit');
    expect(result).toContain('--mullion-heading-size-h1: inherit');
    expect(result).toContain('--mullion-heading-line-height-h1: normal');
  });
});
