/**
 * Theme choice persistence (P79-A). Best effort and never throws: storage can
 * be blocked, full or absent, and a theme preference is not worth an error.
 * The default key matches what `ThemeContext` writes today so P79-D can move
 * the live behaviour over without losing anyone's saved choice.
 */

export const DEFAULT_STORAGE_KEY = 'mullion-theme-id';

/**
 * [P79-D] `scope` is the id the key is scoped by, which is not always the
 * provider's `instanceId`: the gallery scopes its tokens per React root but
 * saves a theme choice per space, so a visitor's choice survives a remount.
 */
export function storageKeyFor(key: string | undefined, scope: string | undefined): string {
  const base = key ?? DEFAULT_STORAGE_KEY;
  return scope ? `${base}-${scope}` : base;
}

export function readStoredThemeId(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStoredThemeId(key: string, id: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, id);
  } catch {
    // Storage blocked or full: the choice still applies for this session.
  }
}
