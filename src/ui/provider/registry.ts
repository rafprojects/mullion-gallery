/**
 * Framework theme registry (P79-A).
 *
 * Engine-only: every theme is merged onto the base defaults, validated,
 * resolved through `resolveColors` and audited, with no Mantine adapter in
 * the pipeline. That is what lets `MullionProvider` resolve a theme without
 * the app registry in `src/themes/index.ts`, which keeps serving Mantine
 * until Phase 81 deletes it. Study principle 8: the audits are guards, so
 * `defineTheme` refuses a theme that fails them rather than warning.
 */

import {
  auditThemeContrast,
  auditUiContrast,
  baseThemeDefaults,
  bundledThemeDefinitions,
  resolveColors,
  validateTheme,
  type ResolvedColors,
  type ThemeDefinition,
  type ThemeExtension,
} from '@mullion/theme-engine';

/** The Mullion brand theme: what `mode="lock"` paints and the fallback for an unknown id. */
export const BRAND_THEME_ID = 'default-dark';

export interface MullionThemeEntry {
  id: string;
  name: string;
  colorScheme: 'light' | 'dark';
  definition: ThemeDefinition;
  resolved: ResolvedColors;
  /** True for a theme registered at runtime through `defineTheme`. */
  custom: boolean;
}

export type DefineThemeResult =
  | { ok: true; id: string }
  | { ok: false; id: string; issues: string[] };

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge an extension onto the base defaults. Extension values win, arrays
 * are replaced, and a null extension value means "use the base default" so an
 * extension cannot punch a hole through a required section.
 */
function mergeOntoBase(base: PlainObject, extension: PlainObject): PlainObject {
  const result: PlainObject = { ...base };
  for (const key of Object.keys(extension)) {
    const extVal = extension[key];
    if (extVal === null) continue;
    const baseVal = result[key];
    result[key] = isPlainObject(extVal) && isPlainObject(baseVal)
      ? mergeOntoBase(baseVal, extVal)
      : extVal;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Audits
// ---------------------------------------------------------------------------

function auditIssues(def: ThemeDefinition): string[] {
  const issues: string[] = [];
  for (const f of auditThemeContrast(def.colors, def.colorScheme)) {
    issues.push(`text contrast: ${f.label} is ${f.ratio.toFixed(2)}:1, needs ${f.minRatio}:1`);
  }
  for (const f of auditUiContrast(def.colors, def.colorScheme, undefined, def.componentTokens ?? {})) {
    issues.push(`non-text contrast: ${f.label} is ${f.ratio.toFixed(2)}:1, needs ${f.minRatio}:1`);
  }
  return issues;
}

function validationIssues(merged: unknown): string[] {
  try {
    validateTheme(merged);
    return [];
  } catch (err) {
    return [err instanceof Error ? err.message : String(err)];
  }
}

// ---------------------------------------------------------------------------
// Store and subscription
// ---------------------------------------------------------------------------

const entries = new Map<string, MullionThemeEntry>();
const listeners = new Set<() => void>();
let version = 0;

/**
 * Deferred so `defineTheme` is safe to call during render (a provider given a
 * definition registers it there). The entry is in the map immediately, which
 * is what that render reads; subscribers learn of it a microtask later.
 */
function notify(): void {
  queueMicrotask(() => {
    version += 1;
    for (const listener of listeners) listener();
  });
}

function buildEntry(def: ThemeDefinition, custom: boolean): MullionThemeEntry {
  return {
    id: def.id,
    name: def.name,
    colorScheme: def.colorScheme,
    definition: def,
    resolved: resolveColors(def.colors, def.colorScheme),
    custom,
  };
}

/**
 * Register a theme at runtime. The extension is merged onto the base defaults,
 * validated and audited; a theme that fails either step is not registered and
 * the result names every issue. Re-defining an id replaces the entry and
 * every mounted provider re-renders.
 */
export function defineTheme(input: ThemeExtension | ThemeDefinition): DefineThemeResult {
  const id = typeof input?.id === 'string' ? input.id : 'unknown';
  const merged = mergeOntoBase(baseThemeDefaults, input as unknown as PlainObject);
  const invalid = validationIssues(merged);
  if (invalid.length > 0) return { ok: false, id, issues: invalid };

  const def = merged as unknown as ThemeDefinition;
  const failed = auditIssues(def);
  if (failed.length > 0) return { ok: false, id: def.id, issues: failed };

  entries.set(def.id, buildEntry(def, true));
  notify();
  return { ok: true, id: def.id };
}

export function hasTheme(id: string): boolean {
  return entries.has(id);
}

/** Resolve an id to a registered one, falling back to the brand theme. */
export function resolveThemeId(id: string | null | undefined): string {
  return id && entries.has(id) ? id : BRAND_THEME_ID;
}

/** Look up a theme entry, falling back to the brand theme for an unknown id. */
export function getThemeEntry(id: string | null | undefined): MullionThemeEntry {
  const entry = entries.get(resolveThemeId(id));
  if (!entry) {
    throw new Error(`[Mullion UI] Brand theme "${BRAND_THEME_ID}" is not registered`);
  }
  return entry;
}

/** Every registered theme, bundled first in registration order, then custom in definition order. */
export function listThemes(): MullionThemeEntry[] {
  return Array.from(entries.values());
}

/** Subscribe to registry changes; the returned function unsubscribes. */
export function subscribeThemes(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Monotonic counter bumped on every registry change, for `useSyncExternalStore`. */
export function getThemesVersion(): number {
  return version;
}

// ---------------------------------------------------------------------------
// Bundled registration, once at module load
// ---------------------------------------------------------------------------

function registerBundled(): void {
  for (const ext of bundledThemeDefinitions) {
    const merged = mergeOntoBase(baseThemeDefaults, ext as unknown as PlainObject);
    const invalid = validationIssues(merged);
    if (invalid.length > 0) {
      console.error(`[Mullion UI] Skipping invalid bundled theme "${ext.id}": ${invalid.join('; ')}`);
      continue;
    }
    const def = merged as unknown as ThemeDefinition;
    // The engine's own test suite already holds every bundled theme to both
    // audits, so a failure here is a build defect rather than a runtime one;
    // report it without removing a shipped theme from the product.
    if (import.meta.env.DEV) {
      const failed = auditIssues(def);
      if (failed.length > 0) {
        console.warn(`[Mullion UI] Bundled theme "${def.id}" fails audits: ${failed.join('; ')}`);
      }
    }
    entries.set(def.id, buildEntry(def, false));
  }
  if (!entries.has(BRAND_THEME_ID)) {
    console.error(`[Mullion UI] Brand theme "${BRAND_THEME_ID}" failed to register`);
  }
}

registerBundled();
