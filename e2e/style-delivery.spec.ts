/**
 * P77-A, rewritten for P79-B: the style-delivery contract, checked against
 * the live page.
 *
 * Since P79-B there is one registration list (`src/appStyles.ts` on top of
 * the framework's `src/ui/styles/uiStyles.ts`), built once per page into a
 * constructable stylesheet that `MullionProvider` adopts into every tree it
 * paints. This spec proves, in the browser, that the list reaches the gallery
 * shadow root, the overlay root and a light-mount document; that the three
 * roots on a page share one parsed sheet object; and that the rules paint,
 * not merely arrive: the drawer's active tab, the Theme select's checked
 * option, and a CSS module whose only consumer portals into the overlay root.
 *
 * Reading note: `root.styleSheets` lists `<style>` and `<link>` sheets only.
 * Adopted sheets live in `root.adoptedStyleSheets`, and a helper that forgets
 * the second list reports every framework rule as missing.
 */

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const STYLES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'styles');

function compiledSelectors(file: string): string[] {
  const full = path.join(STYLES_DIR, file);
  const css = sass.compileString(readFileSync(full, 'utf8'), { loadPaths: [STYLES_DIR] }).css;
  const out: string[] = [];
  let buf = '';
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
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

const CHROME_PORTABLE = compiledSelectors('chrome-portable.scss');
const GLOBAL = compiledSelectors('global.scss');

async function installAdminSession(page: Page) {
  await page.addInitScript(() => {
    const g = window as Window & {
      __MULLION_AUTH_PROVIDER__?: string;
      __MULLION_API_BASE__?: string;
      __MULLION_CONFIG__?: Record<string, unknown>;
    };
    g.__MULLION_AUTH_PROVIDER__ = 'wp-jwt';
    g.__MULLION_API_BASE__ = 'http://127.0.0.1:5173';
    g.__MULLION_CONFIG__ = { enableJwt: true, restNonce: 'test-nonce' };
    localStorage.setItem('mullion_access_token', 'fake-token');
    localStorage.setItem('mullion_user', JSON.stringify({ id: '1', email: 'admin@example.com', role: 'admin' }));
  });
  const json = (body: unknown) => (route: { fulfill: (r: { status: number; contentType: string; body: string }) => Promise<void> }) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/wp-json/jwt-auth/v1/token/validate', json({}));
  await page.route('**/wp-json/mullion-gallery/v1/permissions', json({ campaignIds: [], isAdmin: true }));
  // The shipped default: chrome locked to the brand palette. See the
  // theme-qa fixture trap noted in e2e/theme-qa.spec.ts.
  await page.route('**/wp-json/mullion-gallery/v1/settings', json({
    theme: 'default-dark',
    authBarDisplayMode: 'floating',
    settingsDrawerBlurEnabled: false,
    advancedSettingsEnabled: true,
    applyThemeEverywhere: false,
  }));
  await page.route('**/wp-json/mullion-gallery/v1/campaigns**', json({ items: [] }));
  await page.route('**/wp-json/mullion-gallery/v1/spaces', json(ONE_SPACE));
  await page.route('**/wp-json/mullion-gallery/v1/**templates**', json([]));
}

async function openSettingsDrawer(page: Page) {
  await page.getByRole('button', { name: 'Admin menu' }).click();
  await page.getByRole('button', { name: /^Settings$/ }).click();
  await expect(page.getByRole('tab', { name: 'Appearance' })).toBeVisible();
}

type Tree = 'document' | 'shadow' | 'overlay';

/** Every selector text reachable from a tree's sheets, element-held and adopted alike, whitespace-normalised. */
async function selectorsIn(page: Page, tree: Tree): Promise<string[]> {
  return page.evaluate((which) => {
    const out: string[] = [];
    const walk = (rules: CSSRuleList) => {
      for (const r of rules) {
        if ('selectorText' in r && typeof r.selectorText === 'string') out.push(r.selectorText.replace(/\s+/g, ' ').trim());
        if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
      }
    };
    const root: Document | ShadowRoot | null | undefined = which === 'document'
      ? document
      : which === 'overlay'
        ? document.querySelector('[data-mullion-overlay-root]')?.shadowRoot
        : document.getElementById('root')?.shadowRoot;
    for (const s of [...(root?.styleSheets ?? []), ...(root?.adoptedStyleSheets ?? [])]) {
      try { walk(s.cssRules); } catch { /* cross-origin sheet */ }
    }
    return out;
  }, tree);
}

/**
 * The framework's shared sheet is recognisable by its first rule: the cascade
 * layer statement from src/ui/styles/base.css. Per tree: how many adopted
 * sheets start with it, whether any hand-written `<style data-mullion>` copy
 * survives, and whether the fallback `<style>` was used instead.
 */
async function sheetShape(page: Page) {
  return page.evaluate(() => {
    const isFramework = (s: CSSStyleSheet) => {
      const first = s.cssRules[0];
      return !!first && first.constructor.name === 'CSSLayerStatementRule'
        && Array.from((first as CSSLayerStatementRule).nameList).join(',') === 'mullion.vendor,mullion.base,mullion.components';
    };
    const describe = (root: Document | ShadowRoot | null | undefined) => {
      if (!root) return null;
      const frameworkSheets = root.adoptedStyleSheets.filter(isFramework);
      const parent = root instanceof Document ? root.head : root;
      return {
        adopted: root.adoptedStyleSheets.length,
        frameworkSheets: frameworkSheets.length,
        legacyCopies: parent.querySelectorAll('style[data-mullion]').length,
        fallbacks: parent.querySelectorAll('style[data-mullion-ui-styles]').length,
      };
    };
    const gallery = document.getElementById('root')?.shadowRoot;
    const overlay = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
    const sharedObject = !!gallery && !!overlay
      && gallery.adoptedStyleSheets.some(isFramework)
      && gallery.adoptedStyleSheets.filter(isFramework)[0] === overlay.adoptedStyleSheets.filter(isFramework)[0];
    return { document: describe(document), gallery: describe(gallery), overlay: describe(overlay), sharedObject };
  });
}

const ONE_SPACE = [{
  id: 1, slug: 'main', name: 'Main', isolationMode: 'open', isDefault: true, archived: false, grantCount: 0, userLevel: 'admin',
}];

const missingFrom = (haystack: string[], needles: string[]) => needles.filter((n) => !haystack.includes(n));

test.describe('style delivery contract', () => {
  test('the compiled fixtures are non-trivial', () => {
    expect(CHROME_PORTABLE.length).toBeGreaterThan(1);
    expect(GLOBAL.length).toBeGreaterThan(10);
  });

  test('shadow mount: chrome-portable reaches both trees, global.scss only the shadow root', async ({ page }) => {
    await installAdminSession(page);
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => !!document.getElementById('root')?.shadowRoot)).toBe(true);
    await openSettingsDrawer(page);

    // P77-I flipped the shipped default to the overlay root, so the drawer no
    // longer renders under document.body. Pin where it actually is: inside the
    // overlay root's shadow tree, whose host is a direct child of body. Both
    // halves matter. The shadow tree is what blocks host-page CSS, and the
    // body-level host is what keeps the drawer out of any transformed ancestor
    // (the containing-block failure P77-B measured for option (a)).
    const placement = await page.evaluate(() => {
      const host = document.querySelector('[data-mullion-overlay-root]');
      const dialog = document.querySelector('[role="dialog"]')
        ?? host?.shadowRoot?.querySelector('[role="dialog"]');
      return {
        hostExists: !!host,
        hostIsBodyChild: host?.parentElement === document.body,
        dialogInOverlay: !!dialog && !!host && dialog.getRootNode() === host.shadowRoot,
        dialogInDocument: !!dialog && dialog.getRootNode() === document,
      };
    });
    expect(placement.hostExists, 'the overlay root must exist under the shipped default').toBe(true);
    expect(placement.hostIsBodyChild, 'the overlay root host must be a direct child of body').toBe(true);
    expect(placement.dialogInOverlay, 'the Settings drawer must render inside the overlay root').toBe(true);
    expect(placement.dialogInDocument, 'the drawer must no longer render directly in the document').toBe(false);

    const doc = await selectorsIn(page, 'document');
    const shadow = await selectorsIn(page, 'shadow');
    const overlay = await selectorsIn(page, 'overlay');

    expect(missingFrom(doc, CHROME_PORTABLE), 'chrome-portable.scss selectors missing from the document (main.tsx import, kept for the wp-admin apps)').toEqual([]);
    expect(missingFrom(shadow, CHROME_PORTABLE), 'chrome-portable.scss selectors missing from the shadow root (appStyles.ts entry)').toEqual([]);
    expect(missingFrom(overlay, CHROME_PORTABLE), 'chrome-portable.scss selectors missing from the overlay root, which is the tree the drawer paints in').toEqual([]);

    expect(missingFrom(shadow, GLOBAL), 'global.scss selectors missing from the shadow root').toEqual([]);
    // What the overlay root bought: global.scss now reaches portaled chrome.
    // Before P77-B this was the defect class behind P76-I-2 and P77-C.
    expect(missingFrom(overlay, GLOBAL), 'global.scss selectors missing from the overlay root').toEqual([]);
    expect(GLOBAL.filter((s) => doc.includes(s)), 'global.scss must not be loaded into the document under a shadow mount').toEqual([]);
  });

  // P79-B: the acceptance criterion "one parsed sheet per page rather than
  // one per mount", measured. The gallery root and the overlay root hold the
  // same CSSStyleSheet object; neither carries a hand-written copy any more;
  // Chromium has constructable sheets, so the `<style>` fallback is unused.
  test('shadow mount: the gallery root and the overlay root adopt one shared framework sheet', async ({ page }) => {
    await installAdminSession(page);
    await page.goto('/');
    await openSettingsDrawer(page);
    const shape = await sheetShape(page);
    expect(shape.gallery).toEqual({ adopted: expect.any(Number), frameworkSheets: 1, legacyCopies: 0, fallbacks: 0 });
    expect(shape.overlay).toEqual({ adopted: expect.any(Number), frameworkSheets: 1, legacyCopies: 0, fallbacks: 0 });
    expect(shape.sharedObject, 'both roots must hold the same parsed sheet').toBe(true);
    expect(shape.document?.frameworkSheets, 'under a shadow mount the document is not a painted tree').toBe(0);

    // Dockview's sheet was overlay-only until P79-B; one list means it is in
    // the gallery tree too, where nothing reads it, and still in the overlay.
    const shadow = await selectorsIn(page, 'shadow');
    const overlay = await selectorsIn(page, 'overlay');
    expect(shadow.filter((s) => s.includes('.dv-')).length).toBeGreaterThan(100);
    expect(overlay.filter((s) => s.includes('.dv-')).length).toBeGreaterThan(100);
  });

  // P79-B finding: TemplatePickerModal.module.scss was listed as document-only
  // because the modal used to portal to document.body. Since P77-I it paints
  // in the overlay root, where that module never arrived: the hover glow on
  // the template cards was dead in the shipped mount. One list fixes it; this
  // measures the paint rather than the sheet list.
  test('shadow mount: a CSS module consumed only by portaled chrome paints in the overlay root', async ({ page }) => {
    await installAdminSession(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Admin menu' }).click();
    await page.getByRole('button', { name: 'Admin Panel' }).click();
    await expect(page.getByRole('tab', { name: 'Campaigns' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Active space' }).click();
    await page.getByRole('option', { name: /Main/ }).click();
    await page.getByRole('button', { name: 'Create new campaign' }).click();

    const dialog = page.getByRole('dialog', { name: /starting point/i });
    await expect(dialog).toBeVisible();
    const card = dialog.locator('.mantine-Card-root').first();
    const painted = await card.evaluate((el) => ({
      inOverlay: el.getRootNode() === document.querySelector('[data-mullion-overlay-root]')?.shadowRoot,
      moduleClass: /card/.test(el.className),
      transitionProperty: getComputedStyle(el).transitionProperty,
    }));
    expect(painted.inOverlay, 'the picker must render inside the overlay root').toBe(true);
    expect(painted.moduleClass, 'the card must carry the module class').toBe(true);
    expect(painted.transitionProperty, 'the module rule must paint: transition from TemplatePickerModal.module.scss').toContain('box-shadow');
    expect(painted.transitionProperty).toContain('transform');
  });

  // P77-C: the rules moved out of global.scss must not only be present in the
  // document, they must paint. The Theme select's checked option and the
  // drawer's active tab are the two parts a reader can see.
  test('shadow mount: the moved state rules paint on portaled chrome', async ({ page }) => {
    await installAdminSession(page);
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => !!document.getElementById('root')?.shadowRoot)).toBe(true);
    await openSettingsDrawer(page);
    const dialog = page.getByRole('dialog', { name: /^Settings/ });

    const activeTab = dialog.getByRole('tab', { name: 'Appearance' });
    await expect(activeTab).toHaveAttribute('data-active', 'true');
    const tab = await activeTab.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        color: cs.color,
        borderBottomColor: cs.borderBottomColor,
        activeVar: cs.getPropertyValue('--mullion-tabs-tab-active-color').trim(),
        tabsColor: cs.getPropertyValue('--tabs-color').trim(),
      };
    });
    const hexToRgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
    expect(tab.activeVar, 'the adapter must put the active colour on the Tabs root').toMatch(/^#/);
    expect(tab.color).toBe(hexToRgb(tab.activeVar));
    expect(tab.borderBottomColor).toBe(hexToRgb(tab.tabsColor));

    await dialog.getByRole('combobox', { name: 'Theme' }).click();
    const checked = page.locator('.mullion-mantine-select-option[data-checked]').first();
    await expect(checked).toBeVisible();
    const option = await checked.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        background: cs.backgroundColor,
        color: cs.color,
        bgVar: cs.getPropertyValue('--mullion-select-option-checked-bg').trim(),
        colorVar: cs.getPropertyValue('--mullion-select-option-checked-color').trim(),
      };
    });
    expect(option.bgVar, 'the adapter must put the checked pair on the dropdown').toMatch(/^#/);
    expect(option.background).toBe(hexToRgb(option.bgVar));
    expect(option.color).toBe(hexToRgb(option.colorVar));
  });

  test('light mount: chrome-portable and global.scss both reach the document', async ({ page }) => {
    await installAdminSession(page);
    await page.goto('/?shadow=0');
    await expect(page.getByRole('button', { name: 'Admin menu' })).toBeVisible();
    await openSettingsDrawer(page);

    const hasShadow = await page.evaluate(() => !!document.getElementById('root')?.shadowRoot);
    expect(hasShadow).toBe(false);

    const doc = await selectorsIn(page, 'document');
    expect(missingFrom(doc, CHROME_PORTABLE)).toEqual([]);
    expect(missingFrom(doc, GLOBAL), 'global.scss reaches a light-mount document through the adopted framework sheet').toEqual([]);

    // The document is the painted tree under a light mount, so it adopts the
    // shared sheet exactly once; the Vite-injected document copies remain for
    // the wp-admin apps until P81-B.
    const shape = await sheetShape(page);
    expect(shape.document).toEqual({ adopted: expect.any(Number), frameworkSheets: 1, legacyCopies: 0, fallbacks: 0 });
  });
});
