/**
 * Scope identity (P79-A). Every provider owns one id, stamped as
 * `data-mullion-scope` on the elements it paints and used as the selector of
 * its token sheet. Ids are generated CSS-safe so no escaping is needed in a
 * selector, which matters because jsdom has no `CSS.escape`.
 */

export const SCOPE_ATTR = 'data-mullion-scope';
export const PORTAL_ATTR = 'data-mullion-portal';

let counter = 0;

function sanitize(hint: string): string {
  return hint.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 40);
}

export function createScopeId(hint?: string | undefined): string {
  counter += 1;
  const safe = hint ? sanitize(hint) : '';
  return safe ? `mullion-${safe}-${counter}` : `mullion-${counter}`;
}

export function scopeSelector(scopeId: string): string {
  return `[${SCOPE_ATTR}="${scopeId}"]`;
}

export function isShadowRoot(value: unknown): value is ShadowRoot {
  return (
    typeof value === 'object'
    && value !== null
    && (value as Node).nodeType === 11
    && 'host' in value
  );
}
