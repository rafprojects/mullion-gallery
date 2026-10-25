#!/usr/bin/env node
/**
 * Exact pixel comparison of two capture directories (P81-A).
 *
 * Reports, per PNG present in both, how many pixels differ at all and the
 * bounding box of the change. No tolerance and no antialiasing allowance: this
 * is for proving a change moved nothing, so any count above zero is a finding.
 * Pass `--out <dir>` to write a red-on-grey mask of each differing image.
 *
 *   node scripts/pixel-diff.mjs <before-dir> <after-dir> [--out <dir>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

// Playwright bundles pngjs; reusing it avoids a dependency for a dev tool.
const { PNG } = createRequire(import.meta.url)('playwright-core/lib/utilsBundle');

const [before, after] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outIndex = process.argv.indexOf('--out');
const out = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
if (!before || !after) {
  console.error('usage: pixel-diff.mjs <before-dir> <after-dir> [--out <dir>]');
  process.exit(2);
}

function* pngs(dir, rel = '') {
  for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = path.join(rel, entry.name);
    if (entry.isDirectory()) yield* pngs(dir, r);
    else if (entry.name.endsWith('.png')) yield r;
  }
}

const read = (file) => PNG.sync.read(fs.readFileSync(file));
let changed = 0;
let compared = 0;
const afterSet = new Set(pngs(after));

for (const rel of pngs(before)) {
  if (!afterSet.has(rel)) {
    console.log(`MISSING  ${rel} (not in after)`);
    changed++;
    continue;
  }
  afterSet.delete(rel);
  compared++;
  const a = read(path.join(before, rel));
  const b = read(path.join(after, rel));
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`SIZE     ${rel} ${a.width}x${a.height} -> ${b.width}x${b.height}`);
    changed++;
    continue;
  }
  let n = 0;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  const mask = out ? new PNG({ width: a.width, height: a.height }) : undefined;
  for (let i = 0; i < a.data.length; i += 4) {
    const same =
      a.data[i] === b.data[i] && a.data[i + 1] === b.data[i + 1] &&
      a.data[i + 2] === b.data[i + 2] && a.data[i + 3] === b.data[i + 3];
    if (mask) {
      const g = Math.round((a.data[i] + a.data[i + 1] + a.data[i + 2]) / 6) + 100;
      mask.data.set(same ? [g, g, g, 255] : [255, 0, 0, 255], i);
    }
    if (same) continue;
    n++;
    const p = i / 4;
    const x = p % a.width, y = Math.floor(p / a.width);
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  if (n === 0) continue;
  changed++;
  console.log(`DIFF     ${rel} ${n} px in [${x0},${y0}]-[${x1},${y1}]`);
  if (mask) {
    const target = path.join(out, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, PNG.sync.write(mask));
  }
}
for (const rel of afterSet) {
  console.log(`EXTRA    ${rel} (not in before)`);
  changed++;
}
console.log(`\n${compared} compared, ${changed} differ.`);
process.exit(changed > 0 ? 1 : 0);
