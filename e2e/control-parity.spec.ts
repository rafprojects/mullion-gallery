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


/**
 * Colours ease in from their initial values when the component sheet is
 * adopted, so a reading taken straight after load can land mid-transition.
 * Wait for the showcase's transitions to finish first.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    const root = document.getElementById('showcase')?.shadowRoot;
    // Loaders and skeletons loop for ever, so only finite animations are waited on.
    const animations = [...document.getAnimations(), ...(root?.getAnimations() ?? [])].filter(
      (a) => a.effect?.getTiming().iterations !== Infinity,
    );
    await Promise.all(animations.map((a) => a.finished.catch(() => undefined)));
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

// [P81-A] A disabled control is recessed one rung, the same in every variant
// and tone: `background` ground, `border` edge, `borderStrong` ink, no opacity
// (designer, 2026-10-26). A loading control keeps its own look.
for (const theme of ['default-light', 'default-dark'] as const) {
  test(`disabled controls are recessed (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&controls=1&theme=${theme}&chrome=follow`);
    await page.getByTestId('inline-btn-disabled').waitFor();
    await settle(page);
    const read = (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const cs = getComputedStyle(el);
        const token = (name: string) => {
          const probe = document.createElement('div');
          probe.style.color = `var(${name})`;
          el.parentElement!.appendChild(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        };
        return {
          ground: cs.backgroundColor,
          edge: cs.borderTopColor,
          ink: cs.color,
          opacity: cs.opacity,
          tabbable: el.matches(':disabled') ? 'disabled' : 'enabled',
          background: token('--mullion-color-background'),
          border: token('--mullion-color-border'),
          borderStrong: token('--mullion-color-border-strong'),
        };
      });
    for (const id of ['inline-btn-disabled', 'inline-ai-disabled']) {
      const c = await read(id);
      expect.soft(c.ground, `${id} ground`).toBe(c.background);
      expect.soft(c.edge, `${id} edge`).toBe(c.border);
      expect.soft(c.ink, `${id} ink`).toBe(c.borderStrong);
      expect.soft(c.opacity, `${id} opacity`).toBe('1');
      expect.soft(c.tabbable, `${id} out of the tab order`).toBe('disabled');
    }
    const loading = await read('inline-btn-loading');
    expect(loading.ground, 'a loading button keeps its fill').not.toBe(loading.background);
    expect(loading.opacity).toBe('1');
  });
}

// [P81-A] The chip, by the designer's table (2026-10-26): one look, `light`.
// Unchecked: surface, border, text. Checked: the primary wash, primaryStroke,
// text, and a 2px check mark. Hover adds: an unchecked edge goes to
// borderStrong, a checked wash to wash-strong with its edge kept (sign-off,
// 2026-10-26). Mantine's 28px at sm, and the width holds when checked.
for (const theme of ['default-light', 'default-dark'] as const) {
  test(`chips follow the designer's table (${theme})`, async ({ page }) => {
    test.setTimeout(90_000);
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&controls=1&theme=${theme}&chrome=follow`);
    await page.getByTestId('inline-chip-on').waitFor();
    await settle(page);
    const read = (id: string) =>
      page.getByTestId(id).evaluate((chip) => {
        const label = chip.querySelector('.mullion-chip-label') as HTMLElement;
        const check = chip.querySelector('.mullion-chip-check') as HTMLElement | null;
        const cs = getComputedStyle(label);
        const token = (name: string) => {
          const probe = document.createElement('div');
          probe.style.color = `var(${name})`;
          chip.appendChild(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        };
        return {
          ground: cs.backgroundColor,
          edge: cs.borderTopColor,
          ink: cs.color,
          height: label.getBoundingClientRect().height,
          width: label.getBoundingClientRect().width,
          checkShown: check !== null && getComputedStyle(check).display !== 'none',
          checkStroke: check?.querySelector('path')?.getAttribute('stroke-width') ?? null,
          washStrong: (() => {
            const probe = document.createElement('div');
            probe.style.backgroundColor = 'var(--mullion-tone-wash-strong)';
            chip.querySelector('.mullion-chip-label')!.appendChild(probe);
            const value = getComputedStyle(probe).backgroundColor;
            probe.remove();
            return value;
          })(),
          surface: token('--mullion-color-surface'),
          border: token('--mullion-color-border'),
          text: token('--mullion-color-text'),
          stroke: token('--mullion-color-primary-stroke'),
          strong: token('--mullion-color-border-strong'),
        };
      });
    const off = await read('inline-chip-off');
    expect.soft(off.ground).toBe(off.surface);
    expect.soft(off.edge).toBe(off.border);
    expect.soft(off.ink).toBe(off.text);
    expect.soft(off.checkShown, 'no check when unchecked').toBe(false);
    expect.soft(off.height, 'Mantine sm height').toBeCloseTo(28, 1);

    const on = await read('inline-chip-on');
    expect.soft(on.ground, 'checked ground is a wash, not the surface').not.toBe(on.surface);
    expect.soft(on.edge).toBe(on.stroke);
    expect.soft(on.ink).toBe(on.text);
    expect.soft(on.checkShown, 'a check mark when checked').toBe(true);
    expect.soft(on.checkStroke, 'stroke 4 on the 24 grid: 2px at 12px').toBe('4');
    expect.soft(on.width, 'same width checked and unchecked').toBeCloseTo(off.width, 0);

    // Keyboard focus draws the inset ring on the label, as on every flush control.
    await page.getByTestId('inline-chip-off').locator('input').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    const ring = await page
      .getByTestId('inline-chip-off')
      .locator('.mullion-chip-label')
      .evaluate((el) => getComputedStyle(el).boxShadow);
    expect.soft(ring, 'inset ring on the label').toContain('inset');

    // The edge eases over the fast duration, so wait for it to settle.
    await page.getByTestId('inline-chip-off').hover();
    await expect.poll(async () => (await read('inline-chip-off')).edge, { message: 'hover edge' }).toBe(off.strong);

    await page.getByTestId('inline-chip-on').hover();
    await expect
      .poll(async () => (await read('inline-chip-on')).ground, { message: 'checked hover ground' })
      .toBe(on.washStrong);
    const onHover = await read('inline-chip-on');
    expect.soft(onHover.edge, 'checked hover keeps its edge').toBe(on.stroke);
    expect.soft(onHover.ink).toBe(on.text);
  });
}

// [P81-A] The toggles and the segmented control at Mantine's geometry, read off
// its stylesheet at a 16px root: checkbox 16/20, switch track 32x16 and 38x20
// with a 12/14 thumb, 12px from control to label, the description on the
// label's column, and a segmented track with 4px padding, an 8px radius and
// items padded 6/10. The framework keeps its own colours and the switch's border.
const TOGGLES = {
  xs: { box: 16, track: [32, 16], thumb: 12, segPad: 6 },
  sm: { box: 20, track: [38, 20], thumb: 14, segPad: 10 },
} as const;

test('toggles and the segmented control take Mantine geometry', async ({ page }) => {
  test.setTimeout(90_000);
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1&theme=default-light&chrome=follow');
  await page.getByTestId('inline-switch-sm').waitFor();
    await settle(page);
  for (const [size, want] of Object.entries(TOGGLES)) {
    const got = await page.evaluate((size) => {
      const root = document.getElementById('showcase')!.shadowRoot!;
      // A toggle puts its attributes on the control; the field is its ancestor.
      const cb = root.querySelector(`[data-testid="inline-checkbox-${size}"]`)!.closest('.mullion-toggle')!;
      const sw = root.querySelector(`[data-testid="inline-switch-${size}"]`)!.closest('.mullion-toggle')!;
      const seg = root.querySelector(`[data-testid="inline-segmented-${size}"]`) as HTMLElement;
      const r = (el: Element, sel: string) => el.querySelector(sel)!.getBoundingClientRect();
      // Where the text starts, which padding moves and the element's box does not.
      const text = (el: Element, sel: string) => {
        const range = document.createRange();
        range.selectNodeContents(el.querySelector(sel)!);
        return range.getBoundingClientRect();
      };
      const item = seg.querySelector('.mullion-segmented-item') as HTMLElement;
      return {
        box: r(cb, '.mullion-checkbox'),
        cbLabel: text(cb, '.mullion-toggle-label'),
        cbDesc: text(cb, '.mullion-toggle-description'),
        track: r(sw, '.mullion-switch'),
        thumb: r(sw, '.mullion-switch-thumb'),
        swLabel: text(sw, '.mullion-toggle-label'),
        swDesc: text(sw, '.mullion-toggle-description'),
        cbRow: r(cb, '.mullion-toggle-row'),
        fieldDescMargin: getComputedStyle(
          root.querySelector(`[data-testid="inline-field-${size}"]`)!.closest('.mullion-field')!.querySelector('.mullion-field-description')!,
        ).marginBlockStart,
        cbDescBox: r(cb, '.mullion-toggle-description'),
        seg: seg.getBoundingClientRect(),
        segRadius: getComputedStyle(seg).borderTopLeftRadius,
        indicator: r(seg, '.mullion-segmented-indicator'),
        itemPad: parseFloat(getComputedStyle(item).paddingInlineStart),
      };
    }, size);
    const at = `(${size})`;
    expect.soft(got.box.width, `checkbox ${at}`).toBeCloseTo(want.box, 1);
    expect.soft(got.box.height, `checkbox ${at}`).toBeCloseTo(want.box, 1);
    expect.soft(got.cbLabel.left - got.box.right, `checkbox to label ${at}`).toBeCloseTo(12, 1);
    expect.soft(got.cbDesc.left, `checkbox description on the label column ${at}`).toBeCloseTo(got.cbLabel.left, 1);
    // Half the xs spacing under the row, as Mantine's description margin; a paragraph's own margin would add 12px.
    expect.soft(got.cbDescBox.top - got.cbRow.bottom, `description gap ${at}`).toBeCloseTo(5, 1);
    expect.soft(got.fieldDescMargin, `field description has no paragraph margin ${at}`).toBe('0px');
    expect.soft(got.track.width, `switch track width ${at}`).toBeCloseTo(want.track[0], 1);
    expect.soft(got.track.height, `switch track height ${at}`).toBeCloseTo(want.track[1], 1);
    expect.soft(got.thumb.width, `switch thumb ${at}`).toBeCloseTo(want.thumb, 1);
    expect.soft(got.thumb.top - got.track.top, `switch thumb centred ${at}`).toBeCloseTo((want.track[1] - want.thumb) / 2, 1);
    expect.soft(got.swLabel.left - got.track.right, `switch to label ${at}`).toBeCloseTo(12, 1);
    expect.soft(got.swDesc.left, `switch description on the label column ${at}`).toBeCloseTo(got.swLabel.left, 1);
    expect.soft(got.segRadius, `segmented radius ${at}`).toBe('8px');
    expect.soft(got.indicator.top - got.seg.top, `segmented padding ${at}`).toBeCloseTo(4, 1);
    expect.soft(got.itemPad, `segmented item padding ${at}`).toBeCloseTo(want.segPad, 1);
  }
});

// The checked thumb sits at the far end with the same inset as at rest.
test('a checked switch thumb mirrors its resting inset', async ({ page }) => {
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1&theme=default-light&chrome=follow');
  const sw = page.getByTestId('inline-switch-sm');
  const read = () =>
    sw.evaluate((el) => {
      const t = el.getBoundingClientRect();
      const th = el.querySelector('.mullion-switch-thumb')!.getBoundingClientRect();
      return { start: th.left - t.left, end: t.right - th.right };
    });
  const rest = await read();
  await sw.click();
  await expect.poll(async () => (await read()).end).toBeCloseTo(rest.start, 1);
});

