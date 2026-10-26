/**
 * P81-A: the framework's controls keep Mantine's geometry, so a control moved
 * onto the framework is the size it was. Values read off Mantine's stylesheet:
 * button heights equal the input heights, padding grows 14/18/22/26/32px with
 * the size, a compact xs button is 22px tall with 7px padding, an action icon
 * is 18/22/28/34/44px and 28px by default. Radius `md`, label weight 600.
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

test('controls keep Mantine geometry', async ({ page }) => {
  test.setTimeout(90_000);
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1');
  await page.getByTestId('inline-btn-default').waitFor();
  const box = (id: string) =>
    page.getByTestId(id).evaluate((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, pad: parseFloat(cs.paddingLeft), radius: cs.borderTopLeftRadius, weight: cs.fontWeight };
    });

  const heights = { xs: 30, sm: 36, md: 42, lg: 50, xl: 60 };
  const pads = { xs: 14, sm: 18, md: 22, lg: 26, xl: 32 };
  for (const size of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    const b = await box(`inline-btn-${size}`);
    expect.soft(b.h, `button ${size} height`).toBeCloseTo(heights[size], 0);
    expect.soft(b.pad, `button ${size} padding`).toBeCloseTo(pads[size], 0);
  }
  const compact = await box('inline-btn-compact-xs');
  expect.soft(compact.h, 'compact xs height').toBeCloseTo(22, 0);
  expect.soft(compact.pad, 'compact xs padding').toBeCloseTo(7, 0);
  const plain = await box('inline-btn-default');
  expect.soft(plain.h).toBeCloseTo(36, 0);
  expect.soft(plain.radius, 'default radius md').toBe('8px');
  expect.soft(plain.weight, 'label weight').toBe('600');

  const icons = { xs: 18, sm: 22, md: 28, lg: 34, xl: 44 };
  for (const size of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    const a = await box(`inline-ai-${size}`);
    expect.soft(a.w, `action icon ${size}`).toBeCloseTo(icons[size], 0);
    expect.soft(a.h).toBeCloseTo(icons[size], 0);
  }
  expect.soft((await box('inline-ai-default')).w, 'action icon default md').toBeCloseTo(28, 0);
  expect.soft((await box('inline-ai-14')).w, 'numeric size in the basis').toBeCloseTo(14, 0);
});
