/**
 * P79-B, study principle 2 and section 3.4: the three static rules every
 * framework stylesheet obeys, reported by file and line.
 *
 *  1. No colour literal. Colour travels as a `--mullion-*` token, so a
 *     literal in a sheet is a theme decision the theme cannot make. One sheet
 *     is exempt, `components/color.css`, and only for the literals the test
 *     names: a hue rail is the spectrum and a checkerboard means transparency,
 *     so neither is a theme's to choose.
 *  2. No `!important`. Component sheets sit in a cascade layer so consumer
 *     CSS wins; an important declaration would invert that.
 *  3. No ancestor colour-scheme selector. Scheme is a token and a declaration
 *     on the scope (principle 4), and an ancestor rule breaks under a portal.
 *  4. [P80-B] No reference to a `--mullion-*` token the engine does not emit
 *     and no sheet sets. A sheet reading an invented name paints nothing and
 *     says nothing: P80-A shipped four of them in one draft and P80-B two
 *     more, and both times the only thing that caught it was someone
 *     enumerating the emitter's output by hand. This is that step, standing.
 *
 * The scan covers every .css and .scss file under src/ui outside __tests__.
 * P79-C's component sheets land under this guard with no change here.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { buildTokenSheet } from '../provider/tokenSheet';
import { listThemes } from '../provider/registry';

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

/** Every .ts and .tsx under src/ui, for the inline custom properties they set. */
function walkSource(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== '__tests__') walkSource(full, out);
    } else if (/\.tsx?$/.test(name)) {
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
/**
 * [P80-B] The only sheet allowed a colour literal, and only the ones listed in
 * the test below: `color.css` draws the visible spectrum and a transparency
 * checkerboard, neither of which a theme owns.
 */
const LITERAL_EXEMPT_FILE = path.join('components', 'color.css');

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

  // A guard that scans nothing passes every rule below it, so the scan's own
  // reach is pinned: P79-C added seven component sheets and the focus rule
  // under `components/` and `styles/`, and all of them must be in the walk.
  it('scans every framework sheet, not just the ones it was written against', () => {
    const scanned = files.map((f) => path.relative(UI_DIR, f));
    expect(scanned).toContain(path.join('styles', 'base.css'));
    expect(scanned).toContain(path.join('styles', 'focus.css'));
    for (const family of [
      'layout',
      'surface',
      'typography',
      'control',
      'feedback',
      'display',
      'utility',
    ]) {
      expect(scanned, `${family}.css is not being scanned`).toContain(
        path.join('components', `${family}.css`),
      );
    }
  });

  it('contain no colour literal', () => {
    const offenders = offendersOf(files, COLOUR_LITERAL).filter(
      (entry) => !entry.startsWith(LITERAL_EXEMPT_FILE),
    );
    expect(offenders, 'colour is a token; read --mullion-* instead').toEqual([]);
  });

  /*
   * [P80-B] The one exemption, and it is narrow on purpose.
   *
   * `color.css` paints a hue rail and a transparency checkerboard. Neither is
   * a theme decision: a hue rail that is not the spectrum lies about what it
   * selects, and a checkerboard that takes a theme's colours stops reading as
   * "what is behind shows through" and starts reading as a colour. Everything
   * else in that file is a token like every other sheet.
   *
   * The exemption is pinned to the literals it was granted for, so it cannot
   * quietly widen into "colours are fine in this file".
   */
  it('grants the colour-literal exemption only to the spectrum and the checkerboard', () => {
    const allowed = new Set([
      'rgb(0 0 0)',
      'rgb(0 0 0 / 0)',
      'rgb(0 0 0 / 0.4)',
      'rgb(255 255 255)',
      'rgb(255 255 255 / 0)',
      'rgb(204 204 204)',
      '#ff0000',
      '#ffff00',
      '#00ff00',
      '#00ffff',
      '#0000ff',
      '#ff00ff',
    ]);
    const source = stripComments(
      readFileSync(path.join(UI_DIR, LITERAL_EXEMPT_FILE), 'utf8'),
    );
    const found = [
      ...source.matchAll(/#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)/gi),
    ].map((m) => m[0].trim());
    expect(found.length, 'the exempt file has no literals; remove the exemption').toBeGreaterThan(0);
    const unexpected = [...new Set(found.filter((literal) => !allowed.has(literal)))];
    expect(
      unexpected,
      'a new colour literal appeared in the exempt file; it needs a token or a reason',
    ).toEqual([]);
  });

  it('contain no !important', () => {
    expect(offendersOf(files, IMPORTANT), 'component sheets sit in a cascade layer; consumer CSS must be able to win').toEqual([]);
  });

  it('contain no ancestor colour-scheme selector', () => {
    expect(offendersOf(files, SCHEME_SELECTOR), 'scheme is a token and a color-scheme declaration on the scope').toEqual([]);
  });

  /*
   * [P80-B] Rule 4. Two classes of `--mullion-*` name are legitimate: a token
   * the engine emits, and a component-local property something sets. The
   * second class is mostly set INLINE from TSX through `customProperties`
   * (`--mullion-radius`, `--mullion-segment-left`, `--mullion-slider-mark`),
   * so the scan has to read the components as well as the sheets. Anything
   * else is a name nobody writes, and a rule reading one paints nothing and
   * reports nothing.
   */
  it('reference no --mullion-* name that nothing emits and nothing sets', () => {
    const emitted = new Set(
      [...buildTokenSheet(listThemes()[0]!, ':root').matchAll(/(--mullion-[a-z0-9-]+)\s*:/g)].map(
        (m) => m[1]!,
      ),
    );
    const sheets = files.map((f) => stripComments(readFileSync(f, 'utf8')));
    const written = new Set([
      ...sheets.flatMap((src) => [...src.matchAll(/(--mullion-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!)),
      ...walkSource(UI_DIR).flatMap((f) =>
        [...readFileSync(f, 'utf8').matchAll(/'(--mullion-[a-z0-9-]+)'/g)].map((m) => m[1]!),
      ),
    ]);

    const unknown: string[] = [];
    for (const [index, src] of sheets.entries()) {
      for (const match of src.matchAll(/var\(\s*(--mullion-[a-z0-9-]+)/g)) {
        const name = match[1]!;
        if (emitted.has(name) || written.has(name)) continue;
        unknown.push(`${path.relative(UI_DIR, files[index]!)}: ${name}`);
      }
    }
    expect(
      [...new Set(unknown)],
      'these names are read by a sheet and written by nothing',
    ).toEqual([]);
  });

  it('the token check can tell an invented name from a real one', () => {
    // The guard above is only worth having if it fails on a name that does not
    // exist, so the two halves of its input are asserted here directly.
    const emitted = new Set(
      [...buildTokenSheet(listThemes()[0]!, ':root').matchAll(/(--mullion-[a-z0-9-]+)\s*:/g)].map(
        (m) => m[1]!,
      ),
    );
    expect(emitted.has('--mullion-color-primary')).toBe(true);
    expect(emitted.has('--mullion-color-primary-fill'), 'P80-B read this name and it does not exist').toBe(false);
    expect(emitted.has('--mullion-primary-on-fill'), 'P80-B read this name and it does not exist').toBe(false);
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
