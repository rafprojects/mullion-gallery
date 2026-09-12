/**
 * P79-A: the token sheet and its delivery. jsdom 25 has neither
 * `adoptedStyleSheets` nor `CSSStyleSheet.prototype.replaceSync`, so the
 * `<style>` fallback is what most of the suite exercises; the constructable
 * path is proved here against a stubbed root so both branches are covered.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getThemeEntry } from '../provider/registry';
import { TOKEN_SHEET_ATTR, attachSheet, buildTokenSheet, sheetRootOf } from '../provider/tokenSheet';

describe('buildTokenSheet', () => {
  it('emits every engine token under the selector plus the color-scheme declaration', () => {
    const entry = getThemeEntry('github-light');
    const css = buildTokenSheet(entry, '[data-mullion-scope="x"]');
    expect(css).toContain('[data-mullion-scope="x"] {');
    expect(css).toContain(`--mullion-color-background: ${entry.resolved.background};`);
    expect(css).toContain(`--mullion-color-primary-stroke: ${entry.resolved.primaryStroke};`);
    expect(css).toContain('--mullion-focus-ring-width: 2px;');
    expect(css).toContain('--mullion-color-scheme: light;');
    expect(css).toMatch(/\[data-mullion-scope="x"\] \{\n {2}color-scheme: light;\n\}$/);
  });

  it('keys on :host for a shadow root and on :root for the document', () => {
    const entry = getThemeEntry('default-dark');
    expect(buildTokenSheet(entry, ':host')).toMatch(/^:host \{/);
    expect(buildTokenSheet(entry, ':root')).toMatch(/^:root \{/);
  });
});

describe('attachSheet', () => {
  afterEach(() => {
    document.head.querySelectorAll(`style[${TOKEN_SHEET_ATTR}]`).forEach((n) => n.remove());
  });

  it('falls back to a <style> element in the document head and updates it in place', () => {
    const handle = attachSheet(document, 'k1', ':root', ':root { --a: 1; }');
    const style = document.head.querySelector(`style[${TOKEN_SHEET_ATTR}="k1"]`);
    expect(style?.textContent).toBe(':root { --a: 1; }');

    handle.update(':root { --a: 2; }');
    expect(document.head.querySelector(`style[${TOKEN_SHEET_ATTR}="k1"]`)).toBe(style);
    expect(style?.textContent).toBe(':root { --a: 2; }');

    handle.remove();
    expect(document.head.querySelector(`style[${TOKEN_SHEET_ATTR}="k1"]`)).toBeNull();
  });

  it('falls back to a <style> element inside a shadow root', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const handle = attachSheet(shadow, 'k2', ':host', ':host { --b: 1; }');
    expect(shadow.querySelector(`style[${TOKEN_SHEET_ATTR}="k2"]`)?.textContent).toBe(':host { --b: 1; }');
    handle.remove();
    expect(shadow.querySelector('style')).toBeNull();
    host.remove();
  });

  it('adopts a constructable sheet where the root supports it, and un-adopts on remove', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    let adopted: CSSStyleSheet[] = [];
    Object.defineProperty(shadow, 'adoptedStyleSheets', {
      configurable: true,
      get: () => adopted,
      set: (v: CSSStyleSheet[]) => {
        adopted = v;
      },
    });
    const texts = new WeakMap<CSSStyleSheet, string>();
    const replaceSync = vi.fn(function (this: CSSStyleSheet, css: string) {
      texts.set(this, css);
    });
    const proto = CSSStyleSheet.prototype as CSSStyleSheet & { replaceSync?: (css: string) => void };
    const had = proto.replaceSync;
    proto.replaceSync = replaceSync;
    try {
      const handle = attachSheet(shadow, 'k3', ':host', ':host { --c: 1; }');
      expect(adopted).toHaveLength(1);
      expect(texts.get(adopted[0]!)).toBe(':host { --c: 1; }');
      expect(shadow.querySelector('style')).toBeNull();

      handle.update(':host { --c: 2; }');
      expect(adopted).toHaveLength(1);
      expect(texts.get(adopted[0]!)).toBe(':host { --c: 2; }');

      handle.remove();
      expect(adopted).toHaveLength(0);
    } finally {
      if (had) proto.replaceSync = had;
      else delete proto.replaceSync;
      host.remove();
    }
  });
});

describe('sheetRootOf', () => {
  it('returns the document or shadow root of an attached node and null for a detached one', () => {
    const el = document.createElement('div');
    expect(sheetRootOf(el)).toBeNull();
    document.body.appendChild(el);
    expect(sheetRootOf(el)).toBe(document);
    const shadow = el.attachShadow({ mode: 'open' });
    const inner = document.createElement('span');
    shadow.appendChild(inner);
    expect(sheetRootOf(inner)).toBe(shadow);
    el.remove();
  });
});
