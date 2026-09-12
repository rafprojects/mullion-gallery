/**
 * The three contexts `MullionProvider` publishes (P79-A). Kept apart from the
 * component for Fast Refresh, and apart from each other because they change
 * at different rates: the manager on a theme switch, the scope on a mode flip,
 * the portal container never after mount.
 */

import { createContext } from 'react';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import type { MullionThemeEntry } from './registry';

/**
 * The switching API, owned by the root provider and passed through unchanged
 * by every nested one. A theme selector rendered inside locked chrome still
 * switches the gallery theme, which is what the product does today.
 */
export interface MullionThemeManager {
  /** The theme the gallery is on: the preview if one is active, else the selection. */
  themeId: string;
  colorScheme: 'light' | 'dark';
  /** The active preview, or null. */
  previewThemeId: string | null;
  /** Every registered theme, live: `defineTheme` appends to it. */
  themes: MullionThemeEntry[];
  /** Whether choices are written to storage. */
  persisted: boolean;
  /** Switch and, when persistence is allowed, save. An unknown id falls back to the brand theme. */
  setTheme: (id: string) => void;
  /** Switch without saving; null clears the preview. An unknown id is ignored. */
  setPreviewTheme: (id: string | null) => void;
}

export type MullionScopeMode = 'root' | 'lock' | 'follow';

/** What the nearest provider paints its subtree with. */
export interface MullionScopeValue {
  scopeId: string;
  /** The selector its token sheet is keyed on. */
  selector: string;
  /** The theme this subtree resolves tokens from; equals the manager's under `follow`. */
  themeId: string;
  colorScheme: 'light' | 'dark';
  mode: MullionScopeMode;
}

export const MullionThemeContext = createContext<MullionThemeManager | null>(null);
setMullionDebugDisplayName(MullionThemeContext, 'MullionThemeContext');

export const MullionScopeContext = createContext<MullionScopeValue | null>(null);
setMullionDebugDisplayName(MullionScopeContext, 'MullionScopeContext');

/** The element overlays portal into: it carries the nearest provider's tokens. */
export const MullionPortalContext = createContext<HTMLElement | null>(null);
setMullionDebugDisplayName(MullionPortalContext, 'MullionPortalContext');
