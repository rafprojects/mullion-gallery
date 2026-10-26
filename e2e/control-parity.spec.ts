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
 * Wait for the page's transitions to finish first.
 */
async function settle(page: Page) {
  await page.evaluate(async () => {
    // A transition starts a frame after its starting style goes, so let two frames pass first.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    // Every shadow root, since dialogs portal into the overlay root rather than the showcase's.
    const roots = [...document.querySelectorAll('*')].flatMap((el) => (el.shadowRoot ? [el.shadowRoot] : []));
    // Loaders and skeletons loop for ever, so only finite animations are waited on.
    const animations = [...document.getAnimations(), ...roots.flatMap((r) => r.getAnimations())].filter(
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


// [P81-A] Sign-off, 2026-10-26: a checked switch keeps `primaryFill` as its
// ground with a `primaryOnFill` thumb, and its edge takes `primaryStroke`,
// because the track is the control's outline and the fill misses 3:1 on
// default-dark. A segment reserves its 600 width, so choosing one moves nothing.
for (const theme of ['default-light', 'default-dark'] as const) {
  test(`a checked switch draws its edge in primaryStroke (${theme})`, async ({ page }) => {
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&controls=1&theme=${theme}&chrome=follow`);
    const sw = page.getByTestId('inline-switch-sm');
    await sw.click();
    await settle(page);
    const got = await sw.evaluate((el) => {
      const token = (name: string) => {
        const probe = document.createElement('div');
        probe.style.color = `var(${name})`;
        el.parentElement!.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      return {
        edge: getComputedStyle(el).borderTopColor,
        ground: getComputedStyle(el).backgroundColor,
        thumb: getComputedStyle(el.querySelector('.mullion-switch-thumb')!).backgroundColor,
        stroke: token('--mullion-color-primary-stroke'),
        fill: token('--mullion-color-primary'),
        on: token('--mullion-color-primary-on'),
      };
    });
    expect.soft(got.edge, 'edge').toBe(got.stroke);
    expect.soft(got.ground, 'ground').toBe(got.fill);
    expect.soft(got.thumb, 'thumb').toBe(got.on);
  });
}

test('choosing a segment does not move the others', async ({ page }) => {
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1&theme=default-light&chrome=follow');
  const seg = page.getByTestId('inline-segmented-sm');
  await settle(page);
  const widths = () =>
    seg.evaluate((el) => [...el.querySelectorAll('.mullion-segmented-item')].map((i) => i.getBoundingClientRect().width));
  const before = await widths();
  await seg.getByText('Two').click();
  await settle(page);
  const after = await widths();
  for (const [i, w] of before.entries()) expect.soft(after[i], `segment ${i}`).toBeCloseTo(w, 1);
});

// [P81-A] The framework's one slider (designer, 2026-10-26): a 14px thumb on
// `surface` with a 2px `primaryStroke` ring, the filled track in
// `primaryStroke` and the rest in `border`, a 24px drag target inside the
// 20px row, mark labels centred on their values, and rule 16 when disabled.
for (const theme of ['default-light', 'default-dark'] as const) {
  test(`the slider follows the designer's table (${theme})`, async ({ page }) => {
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&controls=1&theme=${theme}&chrome=follow`);
    // elementFromPoint only sees the viewport, so bring the slider into it.
    await page.getByTestId('inline-slider').scrollIntoViewIfNeeded();
    await settle(page);
    const got = await page.evaluate(() => {
      const root = document.getElementById('showcase')!.shadowRoot!;
      const read = (id: string) => {
        const s = root.querySelector(`[data-testid="${id}"]`)!;
        const part = (c: string) => s.querySelector(`.mullion-slider-${c}`) as HTMLElement;
        const thumb = getComputedStyle(part('thumb'));
        return {
          thumbSize: part('thumb').getBoundingClientRect().width,
          ring: thumb.borderTopColor,
          ringWidth: thumb.borderTopWidth,
          thumbGround: thumb.backgroundColor,
          filled: getComputedStyle(part('indicator')).backgroundColor,
          unfilled: getComputedStyle(part('track')).backgroundColor,
          opacity: getComputedStyle(s).opacity,
        };
      };
      const token = (name: string) => {
        const probe = document.createElement('div');
        probe.style.color = `var(${name})`;
        root.querySelector('[data-testid="inline-slider"]')!.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      const slider = root.querySelector('[data-testid="inline-slider"]')!;
      const control = slider.querySelector('.mullion-slider-control')!.getBoundingClientRect();
      const thumb = slider.querySelector('.mullion-slider-thumb')!.getBoundingClientRect();
      const mark = [...slider.querySelectorAll('.mullion-slider-mark')].find((m) => m.textContent === '50')!;
      const markBox = mark.getBoundingClientRect();
      // 1.5px outside the 20px row, away from the thumb, is still the control: the marks row below is not.
      const onControl = (y: number) =>
        root.elementFromPoint(control.left + 8, y)?.closest('.mullion-slider-control') === slider.querySelector('.mullion-slider-control');
      return {
        live: read('inline-slider'),
        disabled: read('inline-slider-disabled'),
        rowHeight: control.height,
        above: onControl(control.top - 1.5),
        below: onControl(control.bottom + 1.5),
        markOffset: markBox.left + markBox.width / 2 - (thumb.left + thumb.width / 2),
        stroke: token('--mullion-color-primary-stroke'),
        surface: token('--mullion-color-surface'),
        border: token('--mullion-color-border'),
        strong: token('--mullion-color-border-strong'),
      };
    });
    expect.soft(got.live.thumbSize, 'thumb').toBeCloseTo(14, 1);
    expect.soft(got.live.ringWidth, 'ring width').toBe('2px');
    expect.soft(got.live.ring, 'ring').toBe(got.stroke);
    expect.soft(got.live.thumbGround, 'thumb ground').toBe(got.surface);
    expect.soft(got.live.filled, 'filled track').toBe(got.stroke);
    expect.soft(got.live.unfilled, 'unfilled track').toBe(got.border);
    expect.soft(got.rowHeight, 'the row stays 20px').toBeCloseTo(20, 1);
    expect.soft(got.above, 'drag target reaches above the row').toBe(true);
    expect.soft(got.below, 'drag target reaches below the row').toBe(true);
    expect.soft(got.markOffset, 'mark centred on its value').toBeCloseTo(0, 0);
    expect.soft(got.disabled.ring, 'disabled ring').toBe(got.strong);
    expect.soft(got.disabled.filled, 'disabled filled track').toBe(got.strong);
    expect.soft(got.disabled.unfilled, 'disabled unfilled track').toBe(got.border);
    expect.soft(got.disabled.opacity, 'disabled opacity').toBe('1');
  });
}

// [P81-A] The fields, by Mantine measured live in the settings drawer and by
// the designer's answers (2026-10-26): label, then description, then input,
// 5px apart; 8px corners; the label 12px at xs and 14px at sm, 500 and `text`;
// padding a third of the height; stacked steppers 17px and 24px wide, out of
// the tab order, `textMuted` chevrons behind a `border` divider; a disabled
// field recessed by rule 16; a `bare` field that reserves its edge at rest.
const FIELDS = {
  xs: { height: 30, label: 12, input: 12, pad: 10, stepper: 17, chevron: 10 },
  sm: { height: 36, label: 14, input: 14, pad: 12, stepper: 24, chevron: 14 },
} as const;

test('fields take Mantine geometry and the designer order', async ({ page }) => {
  test.setTimeout(90_000);
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1&theme=default-light&chrome=follow');
  await page.getByTestId('inline-number-sm').waitFor();
  await settle(page);
  for (const [size, want] of Object.entries(FIELDS)) {
    const got = await page.evaluate((size) => {
      const root = document.getElementById('showcase')!.shadowRoot!;
      const token = (name: string) => {
        const probe = document.createElement('div');
        probe.style.color = `var(${name})`;
        root.firstElementChild!.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      const field = (id: string) => root.querySelector(`[data-testid="${id}"]`)!.closest('.mullion-field')!;
      const box = (el: Element | null) => el!.getBoundingClientRect();
      const read = (id: string) => {
        const f = field(id);
        const label = f.querySelector('.mullion-field-label')!;
        const control = f.querySelector('.mullion-field-control')!;
        const input = f.querySelector('.mullion-field-input')!;
        return {
          label: box(label),
          labelSize: parseFloat(getComputedStyle(label).fontSize),
          labelWeight: getComputedStyle(label).fontWeight,
          labelInk: getComputedStyle(label).color,
          desc: box(f.querySelector('.mullion-field-description')),
          control: box(control),
          radius: getComputedStyle(control).borderTopLeftRadius,
          inputSize: parseFloat(getComputedStyle(input).fontSize),
          pad: parseFloat(getComputedStyle(input).paddingInlineStart),
        };
      };
      const num = field(`inline-number-${size}`);
      const steppers = num.querySelector('.mullion-field-steppers') as HTMLElement | null;
      const buttons = steppers ? [...steppers.querySelectorAll('button')] : [];
      return {
        text: read(`inline-field-${size}`),
        number: read(`inline-number-${size}`),
        stepper: steppers
          ? {
              width: steppers.getBoundingClientRect().width,
              divider: getComputedStyle(steppers).borderInlineStartColor,
              count: buttons.length,
              tabbable: buttons.filter((b) => b.tabIndex >= 0).length,
              hidden: buttons.every((b) => b.getAttribute('aria-hidden') === 'true'),
              ink: getComputedStyle(buttons[0]!).color,
              chevron: buttons[0]!.querySelector('svg')!.getBoundingClientRect().width,
            }
          : null,
        textInk: token('--mullion-color-text'),
        muted: token('--mullion-color-text-muted'),
        border: token('--mullion-color-border'),
      };
    }, size);
    const at = `(${size})`;
    for (const kind of ['text', 'number'] as const) {
      const f = got[kind];
      expect.soft(f.desc.top, `${kind} description above the input ${at}`).toBeLessThan(f.control.top);
      expect.soft(f.desc.top - f.label.bottom, `${kind} label to description ${at}`).toBeCloseTo(5, 1);
      expect.soft(f.control.top - f.desc.bottom, `${kind} description to input ${at}`).toBeCloseTo(5, 1);
      expect.soft(f.control.height, `${kind} height ${at}`).toBeCloseTo(want.height, 1);
      expect.soft(f.radius, `${kind} radius ${at}`).toBe('8px');
      expect.soft(f.labelSize, `${kind} label size ${at}`).toBe(want.label);
      expect.soft(f.labelWeight, `${kind} label weight ${at}`).toBe('500');
      expect.soft(f.labelInk, `${kind} label ink ${at}`).toBe(got.textInk);
      expect.soft(f.inputSize, `${kind} input size ${at}`).toBe(want.input);
      expect.soft(f.pad, `${kind} input padding ${at}`).toBeCloseTo(want.pad, 1);
    }
    expect.soft(got.stepper, `steppers on by default ${at}`).not.toBeNull();
    if (got.stepper) {
      expect.soft(got.stepper.width, `stepper width ${at}`).toBeCloseTo(want.stepper, 1);
      expect.soft(got.stepper.count, `two chevrons ${at}`).toBe(2);
      expect.soft(got.stepper.tabbable, `steppers out of the tab order ${at}`).toBe(0);
      expect.soft(got.stepper.hidden, `steppers hidden from assistive tech ${at}`).toBe(true);
      expect.soft(got.stepper.ink, `chevron ink ${at}`).toBe(got.muted);
      expect.soft(got.stepper.divider, `stepper divider ${at}`).toBe(got.border);
      expect.soft(got.stepper.chevron, `chevron size ${at}`).toBeCloseTo(want.chevron, 1);
    }
  }
});

for (const theme of ['default-light', 'default-dark'] as const) {
  test(`a disabled field is recessed and a bare field reserves its edge (${theme})`, async ({ page }) => {
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&controls=1&theme=${theme}&chrome=follow`);
    await page.getByTestId('inline-bare').waitFor();
    await settle(page);
    const read = () =>
      page.evaluate(() => {
        const root = document.getElementById('showcase')!.shadowRoot!;
        const token = (name: string) => {
          const probe = document.createElement('div');
          probe.style.color = `var(${name})`;
          root.firstElementChild!.appendChild(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        };
        const control = (id: string) =>
          root.querySelector(`[data-testid="${id}"]`)!.closest('.mullion-field')!.querySelector('.mullion-field-control') as HTMLElement;
        const c = (id: string) => getComputedStyle(control(id));
        const disabledInput = getComputedStyle(control('inline-number-disabled').querySelector('.mullion-field-input')!);
        return {
          disabled: { ground: c('inline-number-disabled').backgroundColor, edge: c('inline-number-disabled').borderTopColor, ink: disabledInput.color, opacity: c('inline-number-disabled').opacity },
          bare: { ground: c('inline-bare').backgroundColor, edge: c('inline-bare').borderTopColor, width: c('inline-bare').borderTopWidth, box: control('inline-bare').getBoundingClientRect() },
          plain: { ground: c('inline-plain').backgroundColor, focusEdge: token('--mullion-input-bd-focus') },
          background: token('--mullion-color-background'),
          border: token('--mullion-color-border'),
          strong: token('--mullion-color-border-strong'),
        };
      });
    const rest = await read();
    expect.soft(rest.disabled.ground, 'disabled ground').toBe(rest.background);
    expect.soft(rest.disabled.edge, 'disabled edge').toBe(rest.border);
    expect.soft(rest.disabled.ink, 'disabled ink').toBe(rest.strong);
    expect.soft(rest.disabled.opacity, 'disabled opacity').toBe('1');
    expect.soft(rest.bare.ground, 'bare ground at rest').toBe('rgba(0, 0, 0, 0)');
    expect.soft(rest.bare.edge, 'bare edge at rest').toBe('rgba(0, 0, 0, 0)');
    expect.soft(rest.bare.width, 'bare edge reserved').toBe('1px');

    const bare = page.getByTestId('inline-bare');
    await bare.hover();
    await expect.poll(async () => (await read()).bare.edge, { message: 'bare hover edge' }).toBe(rest.border);
    await bare.focus();
    await expect.poll(async () => (await read()).bare.ground, { message: 'bare focus ground' }).toBe(rest.plain.ground);
    const focused = await read();
    expect.soft(focused.bare.edge, 'bare focus edge').toBe(rest.plain.focusEdge);
    expect.soft(focused.bare.box.x, 'nothing moves on focus').toBeCloseTo(rest.bare.box.x, 1);
    expect.soft(focused.bare.box.width, 'nothing moves on focus').toBeCloseTo(rest.bare.box.width, 1);
  });
}

// [P81-A] Rule 16 for the toggles: a disabled switch or checkbox is recessed
// (`background` ground, `border` edge, `borderStrong` ink and label), not faded.
for (const theme of ['default-light', 'default-dark'] as const) {
  test(`disabled toggles are recessed (${theme})`, async ({ page }) => {
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&controls=1&theme=${theme}&chrome=follow`);
    await page.getByTestId('inline-switch-disabled').waitFor();
    await settle(page);
    const got = await page.evaluate(() => {
      const root = document.getElementById('showcase')!.shadowRoot!;
      const token = (name: string) => {
        const probe = document.createElement('div');
        probe.style.color = `var(${name})`;
        root.firstElementChild!.appendChild(probe);
        const value = getComputedStyle(probe).color;
        probe.remove();
        return value;
      };
      const read = (id: string, mark: string) => {
        const control = root.querySelector(`[data-testid="${id}"]`) as HTMLElement;
        const field = control.closest('.mullion-toggle')!;
        const cs = getComputedStyle(control);
        return {
          ground: cs.backgroundColor,
          edge: cs.borderTopColor,
          mark: getComputedStyle(control.querySelector(mark)!).backgroundColor,
          markInk: getComputedStyle(control.querySelector(mark)!).color,
          label: getComputedStyle(field.querySelector('.mullion-toggle-label')!).color,
          opacity: getComputedStyle(field.querySelector('.mullion-toggle-row')!).opacity,
        };
      };
      return {
        off: read('inline-switch-disabled', '.mullion-switch-thumb'),
        on: read('inline-switch-disabled-on', '.mullion-switch-thumb'),
        box: read('inline-checkbox-disabled-on', '.mullion-checkbox-indicator'),
        background: token('--mullion-color-background'),
        border: token('--mullion-color-border'),
        strong: token('--mullion-color-border-strong'),
      };
    });
    for (const [name, c] of Object.entries({ off: got.off, on: got.on, box: got.box })) {
      expect.soft(c.ground, `${name} ground`).toBe(got.background);
      expect.soft(c.edge, `${name} edge`).toBe(got.border);
      expect.soft(c.label, `${name} label`).toBe(got.strong);
      expect.soft(c.opacity, `${name} opacity`).toBe('1');
    }
    expect.soft(got.off.mark, 'thumb').toBe(got.strong);
    expect.soft(got.on.mark, 'thumb when on').toBe(got.strong);
    expect.soft(got.box.markInk, 'check mark').toBe(got.strong);
  });
}

// [P81-A] Mantine's sections are a square the field's height wide, 36px at
// `sm`, and the input is padded by exactly that inside its 1px border, so the
// text starts 37px from the outer edge. The gallery's visitor-facing search
// showed the framework's text further in.
test('a field section is a square the height of the field', async ({ page }) => {
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1&theme=default-light&chrome=follow');
  const input = page.getByTestId('inline-sectioned');
  await input.waitFor();
  await settle(page);
  const got = await input.evaluate((el) => {
    const control = el.closest('.mullion-field-control')!.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const sections = [...el.closest('.mullion-field-control')!.querySelectorAll('.mullion-field-section')].map((s) => s.getBoundingClientRect().width);
    return {
      textStart: box.left + parseFloat(cs.paddingInlineStart) - control.left,
      textEnd: control.right - (box.right - parseFloat(cs.paddingInlineEnd)),
      sections,
      height: control.height,
    };
  });
  expect.soft(got.sections, 'each section is as wide as the field is tall').toEqual([36, 36]);
  expect.soft(got.textStart, 'text starts after the left section').toBeCloseTo(37, 0);
  expect.soft(got.textEnd, 'text ends before the right section').toBeCloseTo(37, 0);
});

// [P81-A] The password reveal (sign-off, 2026-10-26): the eye and the eye
// with a slash, named "Show password" with `aria-pressed`, in a 24px target.
test('the password reveal is a 24px eye that reports its state', async ({ page }) => {
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1&theme=default-light&chrome=follow');
  const field = page.getByTestId('inline-password');
  await field.waitFor();
  const reveal = page.locator('.mullion-field', { has: field }).getByRole('button', { name: 'Show password' });
  const read = () =>
    reveal.evaluate((el) => ({
      size: [el.getBoundingClientRect().width, el.getBoundingClientRect().height],
      pressed: el.getAttribute('aria-pressed'),
      icon: el.querySelector('svg')?.getAttribute('data-icon') ?? null,
    }));
  const before = await read();
  expect.soft(before.size, '24px target').toEqual([24, 24]);
  expect.soft(before.pressed).toBe('false');
  expect.soft(before.icon).toBe('eye');
  await reveal.click();
  const after = await read();
  expect.soft(after.pressed).toBe('true');
  expect.soft(after.icon).toBe('eye-off');
  await expect(field).toHaveAttribute('type', 'text');
});

// [P81-A] Sign-off, 2026-10-26: an off switch's thumb is `textMuted`, so its
// position shows. `surface` on the `surface2` track was 1.02 to 1.23:1.
for (const theme of ['default-light', 'default-dark'] as const) {
  test(`an off switch shows its thumb (${theme})`, async ({ page }) => {
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&controls=1&theme=${theme}&chrome=follow`);
    const sw = page.getByTestId('inline-switch-off');
    await sw.waitFor();
    await settle(page);
    const got = await sw.evaluate((el) => {
      const probe = document.createElement('div');
      probe.style.color = 'var(--mullion-color-text-muted)';
      el.parentElement!.appendChild(probe);
      const muted = getComputedStyle(probe).color;
      probe.remove();
      const thumb = el.querySelector('.mullion-switch-thumb')!;
      return { thumb: getComputedStyle(thumb).backgroundColor, size: thumb.getBoundingClientRect().width, muted };
    });
    expect.soft(got.thumb).toBe(got.muted);
    expect.soft(got.size, 'the same size as when on').toBeCloseTo(14, 1);
  });
}

// [P81-A] Dialogs at Mantine's geometry, read off its stylesheet: named widths
// 320, 380, 440, 620 and 780 with 440 the default for a modal and a drawer; a
// modal 5dvh from the top unless centred; a header at least 60px tall. And the
// two animations users choose today: a kind and a duration, with Mantine's
// `onExitTransitionEnd` once a dialog has finished closing.
test('dialogs take Mantine widths and placement', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&dialogs=1&theme=default-light&chrome=follow');
  const widths: Record<string, number> = { xs: 320, sm: 380, md: 440, lg: 620, xl: 780, default: 440, drawer: 440, 'drawer-lg': 620 };
  for (const [key, width] of Object.entries(widths)) {
    await page.getByTestId(`inline-open-${key}`).click();
    const dialog = page.getByTestId(`inline-dialog-${key}`);
    await dialog.waitFor();
    await settle(page);
    const got = await dialog.evaluate((el) => ({
      box: el.getBoundingClientRect(),
      header: el.querySelector('.mullion-overlay-header')!.getBoundingClientRect().height,
    }));
    expect.soft(got.box.width, `${key} width`).toBeCloseTo(width, 0);
    expect.soft(got.header, `${key} header`).toBeGreaterThanOrEqual(60);
    if (key === 'default') expect.soft(got.box.top, 'a modal sits 5dvh from the top').toBeCloseTo(45, 0);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  }
  await page.getByTestId('inline-open-centered').click();
  const centred = await page.getByTestId('inline-dialog-centered').evaluate((el) => {
    const b = el.getBoundingClientRect();
    return b.top + b.height / 2;
  });
  expect.soft(centred, 'centred when asked').toBeCloseTo(450, 0);
});

test('a dialog takes a transition kind and duration, and reports its exit', async ({ page }) => {
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&dialogs=1&theme=default-light&chrome=follow');
  await page.getByTestId('inline-open-fade').click();
  const dialog = page.getByTestId('inline-dialog-fade');
  await dialog.waitFor();
  const got = await dialog.evaluate((el) => ({
    kind: el.getAttribute('data-transition'),
    duration: getComputedStyle(el).transitionDuration,
  }));
  expect.soft(got.kind).toBe('fade');
  expect.soft(got.duration.split(',')[0]!.trim()).toBe('0.12s');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId('inline-dialogs')).toHaveAttribute('data-exits', '1');
});

// [P81-A] The designer's dialog (2026-10-26): one backdrop, black at 0.60, as
// `--mullion-backdrop`; the edge is `raised-bd` by rule 13; the medium shadow;
// an 18px, 600 title at the heading line height; and a divider under the
// header only once the body has scrolled under it.
for (const theme of ['default-light', 'default-dark'] as const) {
  test(`a dialog follows the designer's answers (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await serveShowcase(page);
    await page.goto(`/ui-showcase?mount=shadow&dialogs=1&theme=${theme}&chrome=follow`);
    await page.getByTestId('inline-open-long').click();
    const dialog = page.getByTestId('inline-dialog-long');
    await dialog.waitFor();
    await settle(page);
    const read = () =>
      dialog.evaluate((el) => {
        const token = (name: string) => {
          const probe = document.createElement('div');
          probe.style.color = `var(${name})`;
          el.appendChild(probe);
          const value = getComputedStyle(probe).color;
          probe.remove();
          return value;
        };
        const header = el.querySelector('.mullion-overlay-header')!;
        const title = el.querySelector('.mullion-overlay-title')!;
        const backdrop = el.getRootNode() instanceof ShadowRoot
          ? (el.getRootNode() as ShadowRoot).querySelector('.mullion-overlay-backdrop')!
          : document.querySelector('.mullion-overlay-backdrop')!;
        const shadowProbe = document.createElement('div');
        shadowProbe.style.boxShadow = 'var(--mullion-shadow-md)';
        el.appendChild(shadowProbe);
        const shadowMd = getComputedStyle(shadowProbe).boxShadow;
        shadowProbe.remove();
        return {
          edge: getComputedStyle(el).borderTopColor,
          edgeWidth: getComputedStyle(el).borderTopWidth,
          shadow: getComputedStyle(el).boxShadow,
          shadowMd,
          titleSize: getComputedStyle(title).fontSize,
          titleWeight: getComputedStyle(title).fontWeight,
          titleLine: parseFloat(getComputedStyle(title).lineHeight) / parseFloat(getComputedStyle(title).fontSize),
          divider: getComputedStyle(header).borderBottomStyle,
          dividerInk: getComputedStyle(header).borderBottomColor,
          backdrop: getComputedStyle(backdrop).backgroundColor,
          backdropToken: getComputedStyle(backdrop).getPropertyValue('--mullion-backdrop').trim(),
          raisedBd: token('--mullion-raised-bd'),
          border: token('--mullion-color-border'),
        };
      });
    const rest = await read();
    expect.soft(rest.edgeWidth, 'edge width').toBe('1px');
    expect.soft(rest.edge, 'edge is raised-bd').toBe(rest.raisedBd);
    expect.soft(rest.shadow, 'the medium shadow').toBe(rest.shadowMd);
    expect.soft(rest.titleSize).toBe('18px');
    expect.soft(rest.titleWeight).toBe('600');
    expect.soft(rest.titleLine, 'heading line height, not 1').toBeGreaterThan(1.3);
    expect.soft(rest.backdrop, 'black at 0.60').toBe('rgba(0, 0, 0, 0.6)');
    expect.soft(rest.backdropToken, 'one token').not.toBe('');
    // The edge is reserved and transparent at rest, so the body does not move when it appears.
    expect.soft(rest.dividerInk, 'no divider at rest').toBe('rgba(0, 0, 0, 0)');

    await dialog.locator('.mullion-overlay-body').evaluate((body) => body.scrollTo(0, 200));
    await expect.poll(async () => (await read()).dividerInk, { message: 'a divider once scrolled' }).toBe(rest.border);
  });
}


// [P81-A] WCAG 2.2's 24px target for the small icon buttons (designer,
// 2026-10-26, first for the viewer's gears): an 18px `xs` and a 22px `sm`
// keep their drawn size and take a band out to 24px, so nothing around them
// moves. Checked at the band's edge, half a pixel in.
test('small icon buttons have a 24px target', async ({ page }) => {
  await serveShowcase(page);
  await page.goto('/ui-showcase?mount=shadow&controls=1&theme=default-light&chrome=follow');
  for (const [size, drawn] of [['xs', 18], ['sm', 22]] as const) {
    const icon = page.getByTestId(`inline-ai-${size}`);
    await icon.scrollIntoViewIfNeeded();
    const got = await icon.evaluate((el, drawn) => {
      const box = el.getBoundingClientRect();
      const reach = (24 - drawn) / 2;
      const root = el.getRootNode() as ShadowRoot;
      const at = (x: number, y: number) => root.elementFromPoint(x, y)?.closest('.mullion-action-icon') === el;
      const cy = box.top + box.height / 2;
      const cx = box.left + box.width / 2;
      return {
        width: box.width,
        left: at(box.left - reach + 0.5, cy),
        right: at(box.right + reach - 0.5, cy),
        top: at(cx, box.top - reach + 0.5),
        beyond: at(box.left - reach - 1.5, cy),
      };
    }, drawn);
    expect.soft(got.width, `${size} keeps its drawn size`).toBeCloseTo(drawn, 1);
    expect.soft([got.left, got.right, got.top], `${size} reaches 24px`).toEqual([true, true, true]);
    expect.soft(got.beyond, `${size} goes no further`).toBe(false);
  }
});
