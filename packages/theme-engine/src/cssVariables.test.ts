/**
 * Tests for src/themes/cssVariables.ts
 *
 * Covers: generateCssVariables — CSS custom property generation
 */

import { describe, it, expect } from 'vitest';
import { generateCssVariables, scaleRem } from './cssVariables';
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

  // [P81-A] Three spacing rungs below `xs`, optional in a definition.
  it('emits the tight spacing rungs, falling back to the base values', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-spacing-4xs: calc(0.125rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-spacing-3xs: calc(0.25rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-spacing-2xs: calc(0.375rem * var(--mullion-scale, 1));');
    const own = { ...def, spacing: { ...def.spacing, '2xs': '0.5rem' } };
    expect(generateCssVariables(rc, own)).toContain('--mullion-spacing-2xs: calc(0.5rem * var(--mullion-scale, 1));');
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
    expect(result).toContain('--mullion-font-size-xs: calc(0.75rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-font-size-sm: calc(0.875rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-font-size-md: calc(1rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-font-size-lg: calc(1.125rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-font-size-xl: calc(1.25rem * var(--mullion-scale, 1));');
  });

  it('emits the heading scale, size and line height per level', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const result = generateCssVariables(rc, def);
    expect(result).toContain('--mullion-heading-font-family:');
    expect(result).toContain('--mullion-heading-size-h1: calc(2rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-heading-line-height-h1: 1.3;');
    expect(result).toContain('--mullion-heading-size-h6: calc(0.875rem * var(--mullion-scale, 1));');
    expect(result).toContain('--mullion-heading-line-height-h6: 1.5;');
  });

  it('takes the type scale from the theme rather than a fixed scale', () => {
    const rc = makeResolvedColors();
    const def = makeThemeDef();
    const typography = def.typography as unknown as Record<string, unknown>;
    typography.fontSizes = { ...(typography.fontSizes as object), md: '1.5rem' };
    expect(generateCssVariables(rc, def)).toContain('--mullion-font-size-md: calc(1.5rem * var(--mullion-scale, 1));');
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

// P81-F: one token step is the same physical size on every host.
describe('scaleRem', () => {
  it('multiplies each rem length in a declaration by the prefix scale', () => {
    expect(scaleRem('--x-spacing-xs: 0.625rem;', '--x')).toBe('--x-spacing-xs: calc(0.625rem * var(--x-scale, 1));');
    expect(scaleRem('--x-pad: 0.5rem 1rem;', '--x')).toBe(
      '--x-pad: calc(0.5rem * var(--x-scale, 1)) calc(1rem * var(--x-scale, 1));',
    );
    expect(scaleRem('--x-neg: -2rem;', '--x')).toBe('--x-neg: calc(-2rem * var(--x-scale, 1));');
  });

  it('leaves px, em, colours and the property name alone', () => {
    for (const decl of ['--x-ring: 2px;', '--x-bp: 36em;', '--x-color-rem: #fff;', '--x-ms: 200ms;']) {
      expect(scaleRem(decl, '--x')).toBe(decl);
    }
  });
});

