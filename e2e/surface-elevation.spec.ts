/**
 * P81-A: rule 13 on the framework's surfaces (COLOR-SPEC §8).
 *
 * A surface that steps up a rung carries `raised-bd`: the `borderStrong`
 * hairline on a light theme, nothing visible on a dark one, where the rung's
 * lightness does the work. A surface at the ceiling keeps its ground and takes
 * `border` as a divider. Measured in a browser, on one theme of each scheme.
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

for (const theme of ['default-light', 'default-dark'] as const) {
  test(`surfaces follow rule 13 (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&elevation=1&theme=${theme}&chrome=follow`);
    await page.getByTestId('inline-elev-panel').waitFor();
    const read = (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const cs = getComputedStyle(el);
        const token = (name: string) => {
          const probe = document.createElement('div');
          probe.style.color = `var(${name})`;
          el.appendChild(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        };
        return {
          ground: cs.backgroundColor,
          edge: cs.borderTopColor,
          edgeWidth: cs.borderTopWidth,
          surface: token('--mullion-color-surface'),
          raised: token('--mullion-color-surface-raised'),
          borderStrong: token('--mullion-color-border-strong'),
          border: token('--mullion-color-border'),
        };
      });
    const light = theme === 'default-light';
    const panel = await read('inline-elev-panel');
    expect(panel.ground).toBe(panel.surface);
    expect(panel.edgeWidth).toBe('1px');
    expect(panel.edge).toBe(light ? panel.borderStrong : 'rgba(0, 0, 0, 0)');

    const raised = await read('inline-elev-raised');
    expect(raised.ground).toBe(raised.raised);
    expect(raised.edge).toBe(light ? raised.borderStrong : 'rgba(0, 0, 0, 0)');

    const ceiling = await read('inline-elev-ceiling');
    expect(ceiling.ground).toBe(ceiling.raised);
    expect(ceiling.edge).toBe(ceiling.border);
  });
}
