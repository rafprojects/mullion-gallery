/**
 * P77-A: static guards for the style-delivery contract.
 *
 * The contract (docs/guides/STYLING_GUIDE.md, "Style delivery contract")
 * says which delivery mechanism reaches which tree. Three of its rules can be
 * checked without a browser, and each check here was mutation-tested when it
 * landed (see the P77-A notes in docs/PHASE77_REPORT.md):
 *
 *  1. `global.scss` is delivered to the gallery tree only (shadow root under
 *     the shipped mount, document under a light mount). A selector in it that
 *     is not scoped under `.mullion-gallery` is either dead for portaled
 *     chrome or a leak into the host page, so every selector must carry that
 *     ancestor. P77-C moved the last unscoped rules to chrome-portable.scss.
 *  2. Every CSS module must be registered in `src/appStyles.ts`, the app's
 *     entries in the framework's one style list (P79-B). Vite injects module
 *     CSS into the document only; a module not on the list is silently dead
 *     in the gallery shadow root and in the overlay root. The document-only
 *     exemption P77-A carried is gone: since P77-I portaled chrome paints in
 *     the overlay root, so the one module it exempted was dead there too.
 *  3. Mantine's `styles` prop is inline style. Nested keys such as `'&:hover'`
 *     are dropped by the DOM without error (P76-I-1), so no component-level
 *     `styles={...}` may carry one. This extends the adapter-level guard in
 *     src/themes/__tests__/adapter.test.ts to the 14 call sites in components.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';

const SRC = path.resolve(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * Selector preludes from compiled (flat) CSS. Sass output has no nesting, so a
 * `{` is preceded either by an at-rule prelude or a selector list.
 */
function selectorsOf(css: string): string[] {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: string[] = [];
  let buf = '';
  for (const ch of noComments) {
    if (ch === '{') {
      const prelude = buf.trim();
      if (prelude && !prelude.startsWith('@')) out.push(prelude.replace(/\s+/g, ' '));
      buf = '';
    } else if (ch === '}' || ch === ';') {
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. global.scss is gallery-tree only
// ---------------------------------------------------------------------------

describe('global.scss reaches only the gallery tree', () => {
  const file = path.join(SRC, 'styles', 'global.scss');
  const css = sass.compileString(readFileSync(file, 'utf8'), { loadPaths: [path.dirname(file)] }).css;
  const selectors = selectorsOf(css);

  it('compiles to a non-trivial rule set', () => {
    expect(selectors.length).toBeGreaterThan(10);
  });

  // P77-C emptied the known-dead allowlist this test used to carry; the three
  // Mantine state rules now live in chrome-portable.scss.
  it('scopes every selector under .mullion-gallery', () => {
    const offenders: string[] = [];
    for (const list of selectors) {
      for (const sel of list.split(',').map((s) => s.trim())) {
        const scoped = sel === '.mullion-gallery' || sel.startsWith('.mullion-gallery ') || sel.startsWith('.mullion-gallery.') || sel.startsWith('.mullion-gallery__') || sel.startsWith('.mullion-gallery--') || sel.startsWith('.mullion-gallery:');
        if (!scoped) offenders.push(sel);
      }
    }
    expect(offenders, 'unscoped global.scss selectors cannot reach portaled chrome and leak into the host page under a light mount; Mantine overrides belong in chrome-portable.scss').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. CSS modules are on the one style list
// ---------------------------------------------------------------------------

describe('CSS modules are registered on the style list', () => {
  const modules = walk(SRC)
    .filter((f) => f.endsWith('.module.scss'))
    .map((f) => path.relative(SRC, f).split(path.sep).join('/'))
    .sort();
  const appStylesSource = readFileSync(path.join(SRC, 'appStyles.ts'), 'utf8');
  const registered = (rel: string) => appStylesSource.includes(`'./${rel}?inline'`);

  it('finds the module files', () => {
    expect(modules.length).toBeGreaterThan(3);
  });

  it('registers every module in appStyles.ts', () => {
    const unregistered = modules.filter((m) => !registered(m));
    expect(
      unregistered,
      'a CSS module not registered in src/appStyles.ts reaches only the document, never the gallery shadow root or the overlay root',
    ).toEqual([]);
  });

  it('registers no module that does not exist', () => {
    const referenced = Array.from(appStylesSource.matchAll(/'\.\/([^']+\.module\.scss)\?inline'/g), (m) => m[1]!);
    expect(referenced.length).toBeGreaterThan(3);
    expect(referenced.filter((m) => !modules.includes(m))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 3. No component-level styles={} carries a nested selector
// ---------------------------------------------------------------------------

/** Returns the balanced `{...}` blocks that follow every `styles={` in a source file. */
function stylesPropBlocks(source: string): string[] {
  const blocks: string[] = [];
  const re = /\bstyles=\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    let depth = 1;
    let i = m.index + m[0].length;
    const start = i;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
      i += 1;
    }
    blocks.push(source.slice(start, i - 1));
  }
  return blocks;
}

describe('component styles props contain no nested selectors', () => {
  // Keys like '&:hover', '&::before', ':focus-visible', '[data-active]'.
  const NESTED_KEY = /['"`]\s*(&|:{1,2}[a-z-]+|\[data-)/;
  const files = walk(SRC).filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx') && !f.endsWith('.stories.tsx'));

  it('scans the component tree', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('finds no nested key inside any styles={...} block', () => {
    const offenders: string[] = [];
    for (const f of files) {
      for (const block of stylesPropBlocks(readFileSync(f, 'utf8'))) {
        const hit = NESTED_KEY.exec(block);
        if (hit) offenders.push(`${path.relative(SRC, f)}: ${hit[0].trim()}`);
      }
    }
    expect(
      offenders,
      'Mantine styles={} is inline style; a pseudo-selector or attribute key is dropped silently. Use vars or classNames + chrome-portable.scss',
    ).toEqual([]);
  });
});
