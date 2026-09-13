/**
 * P79-0: the portal target under `shadow` mode is attached at creation.
 *
 * `MullionProvider` writes a token sheet into the tree its container lives in,
 * and it does so in a layout effect that runs before the effects of the
 * component that created the target. A target attached in an effect was
 * therefore detached when the provider first saw it, and a nested provider's
 * container inside it went unpainted. The overlay-root and document modes were
 * never affected: the first attaches its target to a shadow root of its own
 * at creation, the second hands Mantine no target at all.
 */

import { StrictMode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePortalTarget } from './portalTarget';

function shadowHost(): { host: HTMLDivElement; shadow: ShadowRoot } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return { host, shadow: host.attachShadow({ mode: 'open' }) };
}

describe('usePortalTarget in shadow mode', () => {
  it('hands out a target that is already inside the shadow root', () => {
    const { host, shadow } = shadowHost();
    let seenAtRender: Node | null = null;
    const { result, unmount } = renderHook(() => {
      const portal = usePortalTarget('shadow', 'r1', shadow);
      // What a provider rendered as a child sees during its own first commit.
      seenAtRender ??= portal.target?.getRootNode() ?? null;
      return portal;
    });

    expect(seenAtRender).toBe(shadow);
    expect(result.current.target?.parentNode).toBe(shadow);
    expect(result.current.target?.getAttribute('data-mullion-portal')).toBe('r1');
    unmount();
    expect(shadow.querySelector('[data-mullion-portal]')).toBeNull();
    host.remove();
  });

  it('leaves one target in the tree under StrictMode, and re-attaches after its simulated unmount', () => {
    const { host, shadow } = shadowHost();
    const { result } = renderHook(() => usePortalTarget('shadow', 'r2', shadow), { wrapper: StrictMode });
    expect(shadow.querySelectorAll('[data-mullion-portal]')).toHaveLength(1);
    expect(result.current.target?.isConnected).toBe(true);
    host.remove();
  });

  it('gives the overlay-root mode a target inside its own shadow root at creation, as before', () => {
    const { host, shadow } = shadowHost();
    const { result, unmount } = renderHook(() => usePortalTarget('overlay-root', 'r3', shadow));
    const root = result.current.target?.getRootNode();
    expect(root).toBeInstanceOf(ShadowRoot);
    expect((root as ShadowRoot).host.getAttribute('data-mullion-overlay-root')).toBe('r3');
    expect(result.current.overlay?.host.isConnected).toBe(true);
    unmount();
    expect(document.querySelector('[data-mullion-overlay-root]')).toBeNull();
    host.remove();
  });
});
