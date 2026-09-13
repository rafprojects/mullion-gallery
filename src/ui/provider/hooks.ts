/**
 * Consumer hooks for `MullionProvider` (P79-A). Each throws outside a provider:
 * a framework component with no tokens to read is a bug, and a silent fallback
 * would paint it wrong without saying so.
 */

import { useContext } from 'react';
import {
  MullionPortalContext,
  MullionScopeContext,
  MullionThemeContext,
  type MullionScopeValue,
  type MullionThemeManager,
} from './mullionContexts';

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
