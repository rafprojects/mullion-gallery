/**
 * Theme catalog sync (P79-D).
 *
 * `packages/theme-engine/src/definitions/_catalog.json` is the source of
 * truth: the framework registry reads it through the engine, so the theme
 * selector and the WordPress settings field describe themes identically.
 * WordPress cannot import from the package, so it keeps its own copy at
 * `wp-plugin/mullion-gallery/theme-catalog.json`, written by this script.
 *
 *   node scripts/theme-catalog.mjs            write the WordPress copy
 *   node scripts/theme-catalog.mjs --check    fail if it is out of date
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'packages/theme-engine/src/definitions/_catalog.json';
const COPY = 'wp-plugin/mullion-gallery/theme-catalog.json';

const check = process.argv.includes('--check');
const source = readFileSync(join(root, SOURCE), 'utf8');

if (!check) {
  writeFileSync(join(root, COPY), source);
  console.log(`theme-catalog: wrote ${COPY} from ${SOURCE}`);
  process.exit(0);
}

let copy;
try {
  copy = readFileSync(join(root, COPY), 'utf8');
} catch {
  console.error(`theme-catalog: ${COPY} is missing. Run \`npm run themes:catalog\`.`);
  process.exit(1);
}

if (copy !== source) {
  console.error(
    `theme-catalog: ${COPY} does not match ${SOURCE}.\n` +
      'The engine copy is the source of truth. Run `npm run themes:catalog` and commit the result.',
  );
  process.exit(1);
}

console.log(`theme-catalog: ${COPY} matches ${SOURCE}`);
