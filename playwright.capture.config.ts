/**
 * P81-A: capture screenshots into a directory of your choosing, for an exact
 * before/after comparison with scripts/pixel-diff.mjs.
 *
 * The committed suites compare at a tolerance (theme-qa allows 10%), which is
 * right for catching regressions and wrong for proving a change moved nothing.
 * Run this with `--update-snapshots` once on each tree, then diff the two:
 *
 *   CAPTURE_DIR=/path/before npx playwright test -c playwright.capture.config.ts e2e/theme-qa.spec.ts --update-snapshots
 *   CAPTURE_DIR=/path/after  npx playwright test -c playwright.capture.config.ts e2e/theme-qa.spec.ts --update-snapshots
 *   node scripts/pixel-diff.mjs /path/before /path/after
 */
import { defineConfig } from '@playwright/test';
import base from './playwright.config';

const dir = process.env.CAPTURE_DIR;
if (!dir) throw new Error('Set CAPTURE_DIR to the directory the screenshots should land in.');

export default defineConfig({
  ...base,
  snapshotPathTemplate: `${dir}/{testFileName}/{arg}{ext}`,
  // Write every capture, matching or not, so each tree yields a full set.
  updateSnapshots: 'all',
});
