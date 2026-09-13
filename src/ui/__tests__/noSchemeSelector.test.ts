/**
 * P79-A static guard, study principle 4: colour scheme is a token and a
 * `color-scheme` declaration on the scope, never an ancestor attribute
 * selector. A rule keyed on `[data-…-color-scheme]` fails the moment the
 * element is portaled away from the ancestor carrying it, which is the
 * P76-D/H class of defect. Nothing under src/ui may contain one, in source
 * or in the sheet the provider emits.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { getThemeEntry, listThemes } from '../provider/registry';
import { buildTokenSheet } from '../provider/tokenSheet';

const UI_DIR = path.resolve(__dirname, '..');
const SCHEME_SELECTOR = /\[\s*data-[\w-]*scheme\b/i;
const SCHEME_ATTRIBUTE = /data-[\w-]*-color-scheme/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') walk(full, out);
    } else if (/\.(tsx?|s?css)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

describe('no ancestor colour-scheme selector in the framework', () => {
  const files = walk(UI_DIR);

  it('scans the framework sources', () => {
    expect(files.map((f) => path.relative(UI_DIR, f))).toContain(path.join('provider', 'MullionProvider.tsx'));
  });

  it('finds no [data-*scheme] selector and no data-*-color-scheme attribute in any source file', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (SCHEME_SELECTOR.test(line) || SCHEME_ATTRIBUTE.test(line)) {
          offenders.push(`${path.relative(UI_DIR, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(offenders, 'colour scheme is a token plus a color-scheme declaration on the scope, never an ancestor attribute').toEqual([]);
  });

  it('emits the scheme as a token and a declaration, with no attribute selector, for every theme', () => {
    for (const entry of listThemes()) {
      for (const selector of [':host', ':root', '[data-mullion-scope="probe"]']) {
        const css = buildTokenSheet(getThemeEntry(entry.id), selector);
        expect(css).toContain(`--mullion-color-scheme: ${entry.colorScheme};`);
        expect(css).toContain(`color-scheme: ${entry.colorScheme};`);
        expect(css).not.toMatch(SCHEME_SELECTOR);
        expect(css).not.toMatch(SCHEME_ATTRIBUTE);
      }
    }
  });
});
