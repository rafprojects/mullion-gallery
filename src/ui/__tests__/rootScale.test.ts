/**
 * P81-F: the size basis. jsdom computes no font sizes, so the measurement is
 * proved against a stubbed `getComputedStyle`; the e2e spec
 * `e2e/size-basis.spec.ts` measures the real thing on a 62.5% root.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { measureRootScale, uiRem } from '../styles/rootScale';

function stubSizes(medium: string, root: string) {
  const real = window.getComputedStyle.bind(window);
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
    const style = real(el);
    const fontSize = el === document.documentElement ? root : medium;
    return { ...style, fontSize } as CSSStyleDeclaration;
  });
}

afterEach(() => vi.restoreAllMocks());

describe('measureRootScale', () => {
  it('is the user default over the root, so a 62.5% host root is cancelled', () => {
    stubSizes('16px', '10px');
    expect(measureRootScale()).toBe(1.6);
  });

  it('is exactly 1 on a host that leaves the root alone, whatever the user default', () => {
    stubSizes('20px', '20px');
    expect(measureRootScale()).toBe(1);
  });

  it('falls back to 1 when either size cannot be read, and leaves no probe behind', () => {
    stubSizes('', '10px');
    const before = document.documentElement.children.length;
    expect(measureRootScale()).toBe(1);
    expect(document.documentElement.children.length).toBe(before);
  });
});

describe('uiRem', () => {
  it('writes a rem length in the framework basis, plain rem outside a provider', () => {
    expect(uiRem(0.25)).toBe('calc(0.25rem * var(--mullion-scale, 1))');
  });
});
