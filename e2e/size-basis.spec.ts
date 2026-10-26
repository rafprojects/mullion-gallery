/**
 * P81-F: one token step is the same physical size on every host.
 *
 * `rem` resolves against `<html>` however deep the shadow root is, so a host
 * theme that sets `html { font-size: 62.5% }` used to shrink the whole product
 * to 62.5% of its design size. This mounts each surface at a 16px root and at
 * a 10px one and compares bounding rectangles, which is a measurement rather
 * than arithmetic over computed styles. The chip's height comes from rem
 * literals in `control.css`, so it covers the build-time transform as well as
 * the token sheet.
 */
import { expect, test, type Page } from '@playwright/test';

const ROOT_MARKUP = '<div id="root"></div>';
const SHOWCASE =
  '<div id="showcase"></div>\n    <script type="module" src="/src/ui/showcase/mount.tsx"></script>';

/**
 * Serve the dev index with the host's root rule in `<head>`, where a theme's
 * stylesheet puts it, and optionally with the showcase spliced in. An init
 * script cannot do this: the document it sees is replaced when the HTML parses.
 */
async function serve(page: Page, rootFontSize: string | null, showcase: boolean) {
  await page.route(/\/(ui-showcase.*)?(\?.*)?$/, async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    const origin = new URL(route.request().url()).origin;
    let index = await (await route.fetch({ url: `${origin}/`, maxRetries: 2 })).text();
    if (showcase) {
      if (!index.includes(ROOT_MARKUP)) {
        throw new Error(`dev index page no longer contains ${ROOT_MARKUP}; update the showcase fixture`);
      }
      index = index.replace(ROOT_MARKUP, SHOWCASE);
    }
    if (rootFontSize !== null) {
      index = index.replace('<head>', `<head>\n    <style>html { font-size: ${rootFontSize}; }</style>`);
    }
    await route.fulfill({ status: 200, contentType: 'text/html', body: index });
  });
}

async function rootPx(page: Page): Promise<number> {
  return page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
}

interface Box {
  label: string;
  value: number;
}

/**
 * The gap between the first two rendered children of each flex container
 * matched, and the height of each control matched, in every tree on the page.
 */
async function measure(page: Page, flex: string, controls: string): Promise<Box[]> {
  return page.evaluate(
    ({ flex, controls }) => {
      const roots: (Document | ShadowRoot)[] = [document];
      document.querySelectorAll('*').forEach((el) => {
        if (el.shadowRoot) roots.push(el.shadowRoot);
      });
      const out: { label: string; value: number }[] = [];
      for (const root of roots) {
        root.querySelectorAll(flex).forEach((el, i) => {
          const kids = [...el.children].filter((k) => (k as HTMLElement).offsetParent !== null);
          if (kids.length < 2 || i > 7) return;
          const a = kids[0]!.getBoundingClientRect();
          const b = kids[1]!.getBoundingClientRect();
          const row = getComputedStyle(el).flexDirection.startsWith('row');
          out.push({ label: `gap ${i} ${el.className}`, value: row ? b.left - a.right : b.top - a.bottom });
        });
        root.querySelectorAll(controls).forEach((el, i) => {
          if (i > 9 || (el as HTMLElement).offsetParent === null) return;
          out.push({ label: `height ${i} ${el.className}`, value: el.getBoundingClientRect().height });
        });
      }
      return out.map((b) => ({ ...b, value: Math.round(b.value * 100) / 100 }));
    },
    { flex, controls },
  );
}

function expectSameSize(at16: Box[], at10: Box[]) {
  expect(at16.length).toBeGreaterThan(4);
  expect(at10.map((b) => b.label)).toEqual(at16.map((b) => b.label));
  for (const [i, box] of at16.entries()) {
    expect.soft(at10[i]!.value, box.label).toBeCloseTo(box.value, 0);
  }
}

test.describe('size basis (P81-F)', () => {
  for (const mount of ['shadow', 'light'] as const) {
    test(`framework components keep their design size on a 62.5% root, ${mount} mount`, async ({ browser }) => {
      test.setTimeout(120_000);
      const sizes: Box[][] = [];
      for (const root of [null, '62.5%']) {
        const page = await browser.newPage();
        await serve(page, root, true);
        await page.goto(`/ui-showcase?mount=${mount}`);
        await page.locator('[data-testid="inline-set"]').first().waitFor({ state: 'attached' });
        expect(await rootPx(page)).toBe(root === null ? 16 : 10);
        sizes.push(await measure(page, '.mullion-stack, .mullion-group', '.mullion-button, .mullion-action-icon, .mullion-chip-label'));
        await page.close();
      }
      expectSameSize(sizes[0]!, sizes[1]!);
    });
  }

  test('the product gallery keeps its design size on a 62.5% root', async ({ browser }) => {
    test.setTimeout(120_000);
    const sizes: Box[][] = [];
    for (const root of [null, '62.5%']) {
      const page = await browser.newPage();
      await serve(page, root, false);
      await page.goto('/');
      await page.waitForFunction(() =>
        [...document.querySelectorAll('*')].some((el) => el.shadowRoot?.querySelector('.mullion-group')),
      );
      expect(await rootPx(page)).toBe(root === null ? 16 : 10);
      sizes.push(await measure(page, '.mullion-group, .mullion-stack', '.mantine-Button-root, .mantine-Chip-label'));
      await page.close();
    }
    expectSameSize(sizes[0]!, sizes[1]!);
  });
});
