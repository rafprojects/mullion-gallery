/**
 * P81-A: a layout primitive keeps its own defaults inside one that sets them.
 *
 * Every per-instance value is an inline custom property, and custom
 * properties inherit, so an inner `Group` with no `justify` used to read its
 * parent's `space-between`. That shipped for one commit as the gallery's
 * filter chips spreading across the row. Measured in a browser, because jsdom
 * does not resolve custom properties through the cascade.
 */
import { expect, test, type Page } from '@playwright/test';

const ROOT_MARKUP = '<div id="root"></div>';
const SHOWCASE =
  '<div id="showcase"></div>\n    <script type="module" src="/src/ui/showcase/mount.tsx"></script>';

async function serveShowcase(page: Page) {
  await page.route('**/ui-showcase*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    const index = await (await route.fetch({ url: `${origin}/`, maxRetries: 2 })).text();
    if (!index.includes(ROOT_MARKUP)) {
      throw new Error(`dev index page no longer contains ${ROOT_MARKUP}; update the showcase fixture`);
    }
    await route.fulfill({ status: 200, contentType: 'text/html', body: index.replace(ROOT_MARKUP, SHOWCASE) });
  });
}

for (const mount of ['shadow', 'light'] as const) {
  test(`nested layout primitives keep their own defaults (${mount} mount)`, async ({ page }) => {
    test.setTimeout(90_000);
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=${mount}&nesting=1`);
    const inner = page.getByTestId('inline-nest-inner-group');
    await inner.waitFor();
    const read = (testId: string) =>
      page.getByTestId(testId).evaluate((el) => {
        const cs = getComputedStyle(el);
        const kids = [...el.children].map((k) => k.getBoundingClientRect());
        return {
          justify: cs.justifyContent,
          align: cs.alignItems,
          wrap: cs.flexWrap,
          padding: cs.paddingTop,
          gap: el.classList.contains('mullion-group') ? kids[1]!.left - kids[0]!.right : kids[1]!.top - kids[0]!.bottom,
        };
      });
    const group = await read('inline-nest-inner-group');
    expect(group).toMatchObject({ justify: 'flex-start', align: 'center', wrap: 'wrap', padding: '0px' });
    // The default gap is `md`, 16px at this root.
    expect(group.gap).toBeCloseTo(16, 0);
    const stack = await read('inline-nest-inner-stack');
    expect(stack).toMatchObject({ justify: 'flex-start', align: 'stretch', padding: '0px' });
    expect(stack.gap).toBeCloseTo(16, 0);
  });
}
