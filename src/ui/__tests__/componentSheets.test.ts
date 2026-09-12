/**
 * P79-B, study principle 2 and section 3.4: the three static rules every
 * framework stylesheet obeys, reported by file and line.
 *
 *  1. No colour literal. Colour travels as a `--mullion-*` token, so a
 *     literal in a sheet is a theme decision the theme cannot make.
 *  2. No `!important`. Component sheets sit in a cascade layer so consumer
 *     CSS wins; an important declaration would invert that.
 *  3. No ancestor colour-scheme selector. Scheme is a token and a declaration
 *     on the scope (principle 4), and an ancestor rule breaks under a portal.
 *
 * The scan covers every .css and .scss file under src/ui outside __tests__.
 * P79-C's component sheets land under this guard with no change here.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const UI_DIR = path.resolve(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') walk(full, out);
    } else if (/\.s?css$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** Blank out comments while keeping every newline, so line numbers survive. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, lead: string) => lead + ' '.repeat(m.length - lead.length));
}

const NAMED_COLOURS = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black', 'blanchedalmond', 'blue',
  'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk',
  'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki',
  'darkmagenta', 'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
  'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia', 'gainsboro',
  'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow', 'grey', 'honeydew', 'hotpink', 'indianred',
  'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral',
  'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow', 'lime',
  'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
  'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue',
  'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip',
  'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue',
  'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue',
  'slategray', 'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise',
  'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen',
];

/** A literal colour anywhere a declaration value could carry one. `transparent` and `currentColor` are not colours a theme owns. */
const COLOUR_LITERAL = new RegExp(
  [
    '#[0-9a-f]{3}(?:[0-9a-f]{1,5})?\\b',
    '\\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\\s*\\(',
    `:[^;{}]*\\b(?:${NAMED_COLOURS.join('|')})\\b`,
  ].join('|'),
  'i',
);
const IMPORTANT = /!\s*important/i;
const SCHEME_SELECTOR = /\[\s*data-[\w-]*scheme\b/i;

function offendersOf(files: string[], pattern: RegExp): string[] {
  const out: string[] = [];
  for (const file of files) {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n');
    lines.forEach((line, i) => {
      const hit = pattern.exec(line);
      if (hit) out.push(`${path.relative(UI_DIR, file)}:${i + 1}: ${hit[0].trim()}`);
    });
  }
  return out;
}

describe('framework component sheets', () => {
  const files = walk(UI_DIR);

  it('scans at least the base sheet', () => {
    expect(files.map((f) => path.relative(UI_DIR, f))).toContain(path.join('styles', 'base.css'));
  });

  it('contain no colour literal', () => {
    expect(offendersOf(files, COLOUR_LITERAL), 'colour is a token; read --mullion-* instead').toEqual([]);
  });

  it('contain no !important', () => {
    expect(offendersOf(files, IMPORTANT), 'component sheets sit in a cascade layer; consumer CSS must be able to win').toEqual([]);
  });

  it('contain no ancestor colour-scheme selector', () => {
    expect(offendersOf(files, SCHEME_SELECTOR), 'scheme is a token and a color-scheme declaration on the scope').toEqual([]);
  });

  it('the literal pattern catches each form it claims to', () => {
    expect(COLOUR_LITERAL.test('  color: #fff;')).toBe(true);
    expect(COLOUR_LITERAL.test('  border-color: rgba(0, 0, 0, 0.1);')).toBe(true);
    expect(COLOUR_LITERAL.test('  background: oklch(60% 0.1 200);')).toBe(true);
    expect(COLOUR_LITERAL.test('  color: white;')).toBe(true);
    expect(COLOUR_LITERAL.test('  color: var(--mullion-color-text);')).toBe(false);
    expect(COLOUR_LITERAL.test('  background: transparent;')).toBe(false);
    expect(COLOUR_LITERAL.test('  outline-color: currentColor;')).toBe(false);
    expect(COLOUR_LITERAL.test('  box-shadow: 0 0 0 6px var(--mullion-color-focus-halo, transparent);')).toBe(false);
  });
});
