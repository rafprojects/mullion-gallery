/**
 * Consumer hooks for `MullionProvider` (P79-A). Each throws outside a provider:
 * a framework component with no tokens to read is a bug, and a silent fallback
 * would paint it wrong without saying so.
 */

import { useContext } from 'react';
import {
  MullionLabelsContext,
  MullionPortalContext,
  MullionScopeContext,
  MullionThemeContext,
  type MullionScopeValue,
  type MullionThemeManager,
} from './mullionContexts';
import type { UiLabels } from './labels';

function missing(hook: string): never {
  throw new Error(`[Mullion UI] ${hook}() was called outside <MullionProvider>`);
}

/** The switching API: current theme, the registry, `setTheme` and `setPreviewTheme`. */
export function useMullionTheme(): MullionThemeManager {
  return useContext(MullionThemeContext) ?? missing('useMullionTheme');
}

/** What the nearest provider paints with: scope id, selector, theme and mode. */
export function useMullionScope(): MullionScopeValue {
  return useContext(MullionScopeContext) ?? missing('useMullionScope');
}

/** The container overlays should portal into. It carries the nearest provider's tokens. */
export function useMullionPortal(): HTMLElement {
  return useContext(MullionPortalContext) ?? missing('useMullionPortal');
}

/**
 * The framework's own control names (P81-A). Unlike the three above it does
 * not throw: a name is never wrong in English, only untranslated.
 */
export function useUiLabels(): UiLabels {
  return useContext(MullionLabelsContext);
}
