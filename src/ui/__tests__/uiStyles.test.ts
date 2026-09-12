/**
 * P79-B: the registration list and its delivery. jsdom has no constructable
 * stylesheets, so the `<style>` fallback runs against the real module and the
 * shared-sheet path runs against a fresh module instance with the two
 * missing APIs stubbed, so both branches are covered.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  UI_STYLES_ATTR,
  adoptUiStyles,
  hasAdoptedUiStyles,
  listUiStyles,
  registerUiStyles,
  uiStylesText,
} from '../styles/uiStyles';

const fallbackIn = (root: Document | ShadowRoot) =>
  Array.from((root instanceof Document ? root.head : root).querySelectorAll(`style[${UI_STYLES_ATTR}]`));

afterEach(() => {
  fallbackIn(document).forEach((n) => n.remove());
});

describe('the registration list', () => {
  it('starts with the framework base sheet and keeps registration order', () => {
    expect(listUiStyles()[0]).toEqual({ id: 'ui/base', layer: undefined });
    expect(uiStylesText()).toContain('/* mullion: ui/base */');
    expect(uiStylesText()).toContain('@layer mullion.vendor, mullion.base, mullion.components;');

    registerUiStyles('test/one', '.one { gap: 1px; }');
    registerUiStyles('test/two', '.two { gap: 2px; }');
    const ids = listUiStyles().map((e) => e.id);
    expect(ids.indexOf('test/one')).toBeLessThan(ids.indexOf('test/two'));
    expect(uiStylesText().indexOf('.one {')).toBeLessThan(uiStylesText().indexOf('.two {'));
  });

  it('replaces a re-registered id in place rather than appending', () => {
    registerUiStyles('test/replace', '.r { gap: 1px; }');
    registerUiStyles('test/after', '.a { gap: 1px; }');
    registerUiStyles('test/replace', '.r { gap: 9px; }');
    const ids = listUiStyles().map((e) => e.id);
    expect(ids.filter((id) => id === 'test/replace')).toHaveLength(1);
    expect(ids.indexOf('test/replace')).toBeLessThan(ids.indexOf('test/after'));
    expect(uiStylesText()).toContain('.r { gap: 9px; }');
    expect(uiStylesText()).not.toContain('.r { gap: 1px; }');
  });

  it('wraps a sheet registered with a layer in that cascade layer', () => {
    registerUiStyles('test/layered', '.v { gap: 1px; }', { layer: 'mullion.vendor' });
    expect(listUiStyles().find((e) => e.id === 'test/layered')?.layer).toBe('mullion.vendor');
    expect(uiStylesText()).toContain('/* mullion: test/layered */\n@layer mullion.vendor {\n.v { gap: 1px; }\n}');
  });
});

describe('the <style> fallback', () => {
  it('adopts once per root, counts references, and leaves with the last release', () => {
    const releaseA = adoptUiStyles(document);
    const releaseB = adoptUiStyles(document);
    expect(fallbackIn(document)).toHaveLength(1);
    expect(fallbackIn(document)[0]?.textContent).toBe(uiStylesText());
    expect(hasAdoptedUiStyles(document)).toBe(true);

    releaseA();
    releaseA();
    expect(fallbackIn(document), 'a second release of the same reference is a no-op').toHaveLength(1);

    releaseB();
    expect(fallbackIn(document)).toHaveLength(0);
    expect(hasAdoptedUiStyles(document)).toBe(false);
  });

  it('writes into a shadow root and rewrites the text when a sheet registers later', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const release = adoptUiStyles(shadow);
    expect(fallbackIn(shadow)).toHaveLength(1);
    expect(fallbackIn(document)).toHaveLength(0);

    registerUiStyles('test/late', '.late { gap: 3px; }');
    expect(fallbackIn(shadow)[0]?.textContent).toContain('.late { gap: 3px; }');

    release();
    expect(fallbackIn(shadow)).toHaveLength(0);
    host.remove();
  });
});

describe('the shared constructable sheet', () => {
  function stubConstructable() {
    const texts = new WeakMap<CSSStyleSheet, string>();
    const replaceSync = vi.fn(function (this: CSSStyleSheet, css: string) {
      texts.set(this, css);
    });
    const proto = CSSStyleSheet.prototype as CSSStyleSheet & { replaceSync?: (css: string) => void };
    proto.replaceSync = replaceSync;
    const roots: Array<Document | ShadowRoot> = [];
    const adoptable = (root: Document | ShadowRoot) => {
      let adopted: CSSStyleSheet[] = [];
      Object.defineProperty(root, 'adoptedStyleSheets', {
        configurable: true,
        get: () => adopted,
        set: (v: CSSStyleSheet[]) => {
          adopted = v;
        },
      });
      roots.push(root);
      return root;
    };
    const restore = () => {
      delete proto.replaceSync;
      for (const root of roots) delete (root as { adoptedStyleSheets?: unknown }).adoptedStyleSheets;
    };
    return { texts, replaceSync, adoptable, restore };
  }

  it('builds one sheet per page, adopts it into every root, and rewrites it in place on registration', async () => {
    const stub = stubConstructable();
    vi.resetModules();
    try {
      const fresh = await import('../styles/uiStyles');
      const hostA = document.createElement('div');
      const hostB = document.createElement('div');
      document.body.append(hostA, hostB);
      const shadowA = stub.adoptable(hostA.attachShadow({ mode: 'open' }));
      const shadowB = stub.adoptable(hostB.attachShadow({ mode: 'open' }));

      const releaseA = fresh.adoptUiStyles(shadowA);
      const releaseB = fresh.adoptUiStyles(shadowB);
      expect(shadowA.adoptedStyleSheets).toHaveLength(1);
      expect(shadowB.adoptedStyleSheets).toHaveLength(1);
      expect(shadowA.adoptedStyleSheets[0], 'both roots hold the same parsed sheet').toBe(shadowB.adoptedStyleSheets[0]);
      expect(stub.replaceSync, 'parsed once for two roots').toHaveBeenCalledTimes(1);
      expect(fallbackIn(shadowA)).toHaveLength(0);

      fresh.registerUiStyles('test/shared-late', '.shared-late { gap: 4px; }');
      expect(stub.replaceSync).toHaveBeenCalledTimes(2);
      expect(stub.texts.get(shadowA.adoptedStyleSheets[0]!)).toContain('.shared-late { gap: 4px; }');

      releaseA();
      expect(shadowA.adoptedStyleSheets).toHaveLength(0);
      expect(shadowB.adoptedStyleSheets).toHaveLength(1);
      releaseB();
      expect(shadowB.adoptedStyleSheets).toHaveLength(0);
      hostA.remove();
      hostB.remove();
    } finally {
      stub.restore();
      vi.resetModules();
    }
  });
});
