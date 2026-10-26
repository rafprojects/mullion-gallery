/**
 * P80-A: the overlays, proved where the things that matter are observable.
 *
 * The unit suite can say which container an element was portaled into and
 * which attribute it carries. It cannot say whether the popup is above a
 * host's sticky header, whether the ring actually paints, whether a token
 * resolved, or where focus went after Escape. All four are here, and the last
 * one is the defect the product has today: Mantine returns focus to a trigger
 * it can no longer see once the trigger is inside the gallery shadow root.
 *
 * The fixture is `src/ui/showcase/mount.tsx` with `?overlays=1`, which appends
 * the overlay section. Without that parameter the page renders exactly what it
 * rendered before P80-A, so the existing snapshot baselines are untouched.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROOT_MARKUP = '<div id="root"></div>';
const SHOWCASE =
  '<div id="showcase"></div>\n    <script type="module" src="/src/ui/showcase/mount.tsx"></script>';

type Mount = 'shadow' | 'light';

async function serveShowcase(page: Page) {
  await page.route('**/ui-showcase*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    // Playwright reuses keep-alive sockets, and one the dev server has just closed resets (P80-F).
    const index = await (await route.fetch({ url: `${origin}/`, maxRetries: 2 })).text();
    if (!index.includes(ROOT_MARKUP)) {
      throw new Error(`dev index page no longer contains ${ROOT_MARKUP}; update the showcase fixture`);
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: index.replace(ROOT_MARKUP, SHOWCASE),
    });
  });
}

async function open(
  page: Page,
  {
    mount = 'shadow',
    theme = 'default-dark',
    host = '',
    extra = '',
  }: { mount?: Mount; theme?: string; host?: string; extra?: string } = {},
) {
  await serveShowcase(page);
  const hostParam = host ? `&host=${host}` : '';
  await page.goto(`/ui-showcase?overlays=1&mount=${mount}&chrome=lock&theme=${theme}${hostParam}${extra}`);
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-mullion-overlay-root]');
    return !!root?.shadowRoot?.querySelector('[data-testid="overlay-panel"]');
  });
}

/**
 * The showcase's inline set is inside the gallery shadow root on a shadow
 * mount. Playwright pierces open shadow roots for `locator`, so a test id is
 * addressable either way; this helper exists to say which tree is meant.
 */
const inline = (page: Page, id: string) => page.locator(`[data-testid="inline-${id}"]`);

test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await browser.newPage();
  try {
    await open(page);
  } finally {
    await page.close();
  }
});

// ---------------------------------------------------------------------------
// The portal container
// ---------------------------------------------------------------------------

/*
 * Two rules since P80-F. A modal or drawer goes to the overlay root, which is
 * how it escapes a hostile host. A menu, popover or tooltip goes to its
 * trigger's own root, because its ARIA and its Tab order are references to the
 * trigger and those do not resolve across a shadow boundary (P80-D).
 */
test.describe('where each overlay lands', () => {
  for (const mount of ['shadow', 'light'] as const) {
    test(`a modal opened from the ${mount} mount renders in the overlay root`, async ({ page }) => {
      await open(page, { mount });
      await inline(page, 'modal-trigger').click();

      const where = await page.evaluate(() => {
        const overlayRoot = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
        const popup = overlayRoot?.querySelector('.mullion-modal');
        return {
          inOverlayRoot: !!popup,
          directChildOfBody: !!document.body.querySelector(':scope > .mullion-modal'),
        };
      });
      expect(where.inOverlayRoot, 'the modal is not in the overlay root').toBe(true);
      expect(where.directChildOfBody, 'the modal leaked into document.body').toBe(false);
    });
  }

  for (const mount of ['shadow', 'light'] as const) {
    test(`a menu, a popover and a tooltip opened from the ${mount} mount land in the trigger's root, with its tokens`, async ({
      page,
    }) => {
      await open(page, { mount });
      const opens = [
        { trigger: 'menu-trigger', popup: '.mullion-menu', how: 'click' },
        { trigger: 'popover-trigger', popup: '.mullion-popover', how: 'click' },
        { trigger: 'tooltip-trigger', popup: '.mullion-tooltip', how: 'hover' },
      ] as const;

      for (const { trigger, popup, how } of opens) {
        await inline(page, trigger)[how]();
        await expect(page.locator(popup)).toBeVisible();
        const where = await page.locator(popup).evaluate((el, id) => {
          const host = document.querySelector('#showcase');
          const triggerEl = (host?.shadowRoot ?? document).querySelector(`[data-testid="${id}"]`);
          return {
            sameRoot: !!triggerEl && el.getRootNode() === triggerEl.getRootNode(),
            primary: getComputedStyle(el).getPropertyValue('--mullion-color-primary').trim(),
          };
        }, `inline-${trigger}`);
        expect(where.sameRoot, `${popup} is not in its trigger's root`).toBe(true);
        // A popup hoisted past the scope element, or into a bare body, reads no tokens.
        expect(where.primary, `the theme's tokens did not reach ${popup}`).toMatch(/^#/);
        await page.keyboard.press('Escape');
        await page.mouse.move(0, 0);
        await expect(page.locator(popup)).toHaveCount(0);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Popup typography (P80-G)
// ---------------------------------------------------------------------------

/*
 * The fixture ground sets no font, so it shows the page's body font (here the
 * dev index's system stack) and a popup that inherited its type would too. In
 * the product the overlay root inherits the host page's body font the same way.
 */
test('every popup sets the framework font rather than inheriting the page\'s', async ({ page }) => {
  await open(page, { extra: '&selects=1&managers=1' });
  const font = (selector: string) =>
    page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0]!.trim());

  expect(await font('[data-testid="inline-overlays"]'), 'the fixture ground already uses Inter, so this proves nothing').not.toMatch(/Inter/);
  const seen: Record<string, string> = {};
  await inline(page, 'menu-trigger').click();
  seen.menu = await font('.mullion-menu');
  await page.keyboard.press('Escape');
  await inline(page, 'popover-trigger').click();
  seen.popover = await font('.mullion-popover');
  await page.keyboard.press('Escape');
  await inline(page, 'select-trigger').click();
  seen.listbox = await font('.mullion-select-popup');
  await page.keyboard.press('Escape');
  await inline(page, 'modal-trigger').click();
  seen.modal = await font('.mullion-modal');
  await page.keyboard.press('Escape');
  await page.locator('[data-testid="notify-plain"]').click();
  seen.toast = await font('.mullion-toast');
  expect(seen).toEqual({ menu: 'Inter', popover: 'Inter', listbox: 'Inter', modal: 'Inter', toast: 'Inter' });
});

// ---------------------------------------------------------------------------
// What a modal hides
// ---------------------------------------------------------------------------

/*
 * Base UI hides the page behind a modal with `aria-hidden`, walking from
 * `document.body`, and that walk cannot enter the overlay root's shadow tree
 * where every modal lives. Before P80-F a stacked modal left both dialogs
 * exposed, and so did a same-commit pair. Asserted by role query, which honours
 * `aria-hidden`, rather than by what is in the DOM.
 */
test.describe('a modal hides what is behind it, inside the overlay root too', () => {
  const dialogNames = (page: Page) =>
    page.getByRole('dialog').evaluateAll((els) =>
      // A dialog mid-exit can detach between the query and this read; it is no longer exposed.
      els
        .filter((el) => el.isConnected)
        .map((el) => {
          const id = el.getAttribute('aria-labelledby');
          return id ? ((el.getRootNode() as ShadowRoot).getElementById(id)?.textContent ?? '') : '';
        }),
    );

  test('a stacked modal leaves only itself exposed, and closing it gives the lower one back', async ({ page }) => {
    await open(page);
    await inline(page, 'modal-trigger').click();
    await expect(page.getByRole('dialog', { name: 'inline modal' })).toBeVisible();
    await inline(page, 'stack-trigger').click();
    await expect(page.getByRole('dialog', { name: 'inline stacked modal' })).toBeVisible();
    await expect.poll(() => dialogNames(page)).toEqual(['inline stacked modal']);
    // The stack hides the lower dialog the moment the new one mounts, a frame before focus
    // arrives; an Escape in that frame closes the lower one, so wait for focus as a person would.
    await expect
      .poll(() =>
        page.evaluate(() => {
          let el: Element | null = document.activeElement;
          while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
          return el?.closest('[role="dialog"]')?.textContent?.includes('inside the stacked modal') ?? false;
        }),
      )
      .toBe(true);

    await page.keyboard.press('Escape');
    await expect.poll(() => dialogNames(page)).toEqual(['inline modal']);
  });

  test('two modals opened in one commit leave only the second exposed', async ({ page }) => {
    await open(page);
    await inline(page, 'pair-trigger').click();
    await expect.poll(() => dialogNames(page)).toEqual(['inline second of two']);
  });

  test('the chrome beside it in the overlay root is hidden, and the toast region is not', async ({ page }) => {
    await open(page, { extra: '&managers=1' });
    await expect(page.getByRole('button', { name: 'overlay modal' })).toHaveCount(1);
    await inline(page, 'modal-trigger').click();
    await expect(page.getByRole('dialog', { name: 'inline modal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'overlay modal' }), 'the overlay-root chrome is still exposed').toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Notifications' }), 'a toast behind the dialog would go unannounced').toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'overlay modal' })).toHaveCount(1);
  });
});

// ---------------------------------------------------------------------------
// Focus: the defect this phase exists to remove
// ---------------------------------------------------------------------------

test.describe('focus', () => {
  test('returns to a trigger inside the gallery shadow root after Escape', async ({ page }) => {
    await open(page, { mount: 'shadow' });
    const trigger = inline(page, 'modal-trigger');
    await trigger.focus();
    await trigger.click();
    await expect(page.locator('.mullion-modal')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.mullion-modal')).toBeHidden();

    // `document.activeElement` is the shadow HOST from the document's side, so
    // the check has to walk into the shadow root to see the real target. That
    // is exactly why this defect survives in the Mantine tree.
    const focused = await page.evaluate(() => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active?.getAttribute('data-testid') ?? active?.tagName ?? null;
    });
    expect(focused, 'focus did not return to the trigger across the shadow boundary').toBe(
      'inline-modal-trigger',
    );
  });

  test('is trapped inside an open drawer', async ({ page }) => {
    await open(page);
    await inline(page, 'drawer-trigger').click();
    await expect(page.locator('.mullion-drawer')).toBeVisible();

    /*
     * Tab well past the drawer's own stops; focus must never leave it.
     *
     * The pause matters and is not padding. Base UI contains focus by letting
     * the browser move it to a guard and then redirecting, which settles over
     * a frame or two. Pressing Tab with no gap outruns that: the first draft
     * of this test sent twelve presses back to back and recorded three stops
     * on real buttons behind the drawer, which reads as a broken trap and is
     * actually a synthetic-input race. At a human cadence all twelve stay in.
     */
    const stops: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(120);
      stops.push(
        await page.evaluate(() => {
          let active: Element | null = document.activeElement;
          while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
          if (!active) return 'none';
          return active.closest('.mullion-drawer')
            ? 'in'
            : `out:${active.tagName}:${(active.textContent ?? '').trim().slice(0, 20)}`;
        }),
      );
    }
    expect(stops.filter((s) => s !== 'in'), 'Tab escaped the drawer').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Dismissal
// ---------------------------------------------------------------------------

test.describe('dismissal', () => {
  test('Escape and an outside press both close a modal', async ({ page }) => {
    await open(page);

    await inline(page, 'modal-trigger').click();
    await expect(page.locator('.mullion-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mullion-modal')).toBeHidden();

    await inline(page, 'modal-trigger').click();
    await expect(page.locator('.mullion-modal')).toBeVisible();
    await page.locator('.mullion-overlay-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.mullion-modal')).toBeHidden();
  });

  test('Escape closes a menu and returns focus to its trigger', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.mullion-menu')).toBeHidden();

    const focused = await page.evaluate(() => {
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      return active?.getAttribute('data-testid') ?? null;
    });
    expect(focused).toBe('inline-menu-trigger');
  });
});

// ---------------------------------------------------------------------------
// The P77-B hostile host
// ---------------------------------------------------------------------------

test.describe('a hostile host page', () => {
  test('a transformed ancestor and a sticky header do not capture the overlays', async ({ page }) => {
    await open(page, { host: 'hostile' });
    await page.evaluate(() => window.scrollTo(0, 600));

    await inline(page, 'modal-trigger').click();
    const popup = page.locator('.mullion-modal');
    await expect(popup).toBeVisible();

    const geometry = await page.evaluate(() => {
      /*
       * The fixture renders inside the gallery shadow root on a shadow mount,
       * so `document.querySelector` cannot see the header: it has to be found
       * through the root. Missing that is what made the first draft of this
       * test report "no modal" when the modal was there all along.
       */
      const deepFind = (selector: string): Element | null => {
        const roots: Array<Document | ShadowRoot> = [document];
        for (let i = 0; i < roots.length; i += 1) {
          const root = roots[i]!;
          const hit = root.querySelector(selector);
          if (hit) return hit;
          root.querySelectorAll('*').forEach((el) => {
            if (el.shadowRoot) roots.push(el.shadowRoot);
          });
        }
        return null;
      };

      const el = deepFind('.mullion-modal');
      const header = deepFind('[data-testid="hostile-header"]');
      if (!el || !header) return null;

      const box = el.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      /*
       * `elementsFromPoint` on the document returns shadow HOSTS, so the test
       * is which host paints on top at the header's own position: the overlay
       * root must come before the gallery host in the hit list.
       */
      const stack = document.elementsFromPoint(headerBox.left + 8, headerBox.top + headerBox.height / 2);
      const overlayIndex = stack.findIndex((n) => n.hasAttribute?.('data-mullion-overlay-root'));
      const galleryIndex = stack.findIndex((n) => n.id === 'showcase');
      return {
        top: box.top,
        viewport: window.innerHeight,
        overlayIndex,
        galleryIndex,
      };
    });

    expect(geometry, 'the modal is not in the overlay root').not.toBeNull();
    // Resolved against the viewport, not against the transformed ancestor: a
    // captured `position: fixed` would put the popup 600px up the page.
    expect(geometry!.top).toBeGreaterThanOrEqual(-1);
    expect(geometry!.top).toBeLessThan(geometry!.viewport);
    expect(geometry!.overlayIndex, 'the overlay root does not paint at the header').toBeGreaterThanOrEqual(0);
    expect(
      geometry!.overlayIndex < geometry!.galleryIndex || geometry!.galleryIndex === -1,
      'the sticky header at z-index 9999 painted over the overlay',
    ).toBe(true);
  });

  /*
   * An anchored popup stays in its trigger's root since P80-F, so a host
   * page's clipping wrapper is now its ancestor too. The wrapper here is in the
   * document around the gallery host, as a WordPress theme's would be, and it
   * ends 8px below the trigger: the popup must flip above rather than be cut.
   */
  for (const which of ['menu', 'popover'] as const) {
    test(`a ${which} inside a clipping host wrapper flips into view rather than being cut`, async ({ page }) => {
      await open(page);
      const trigger = inline(page, `${which}-trigger`);
      await trigger.scrollIntoViewIfNeeded();
      await trigger.evaluate((t) => {
        const host = document.getElementById('showcase')!;
        const wrap = document.createElement('div');
        wrap.id = 'theme-wrap';
        host.parentNode!.insertBefore(wrap, host);
        wrap.appendChild(host);
        const bottom = t.getBoundingClientRect().bottom;
        Object.assign(wrap.style, {
          transform: 'translateZ(0)',
          position: 'relative',
          overflow: 'hidden',
          height: `${bottom - wrap.getBoundingClientRect().top + 8}px`,
        });
      });
      await trigger.click();
      const popup = page.locator(`.mullion-${which}`);
      await expect(popup).toBeVisible();
      await page.waitForTimeout(300);

      const fit = await popup.evaluate((el) => {
        const box = el.getBoundingClientRect();
        const wrap = document.getElementById('theme-wrap')!.getBoundingClientRect();
        const root = el.getRootNode() as ShadowRoot | Document;
        const hit = root.elementFromPoint(box.left + box.width / 2, box.bottom - 4);
        return { inside: box.top >= wrap.top - 1 && box.bottom <= wrap.bottom + 1, reached: !!hit && el.contains(hit) };
      });
      expect(fit.inside, `the ${which} extends past the clipping wrapper`).toBe(true);
      expect(fit.reached, `the ${which}'s far edge is not painted`).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// Tokens and the ring
// ---------------------------------------------------------------------------

test.describe('the overlays read tokens, not fallbacks', () => {
  test('a menu takes its ground and its border from the theme’s component tokens', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();

    const reading = await page.locator('.mullion-menu').evaluate((menu) => {
      const cs = getComputedStyle(menu);
      const toRgb = (value: string) => {
        const probe = document.createElement('div');
        probe.style.color = value;
        menu.appendChild(probe);
        const out = getComputedStyle(probe).color;
        probe.remove();
        return out;
      };
      return {
        background: cs.backgroundColor,
        expectedBackground: toRgb(cs.getPropertyValue('--mullion-menu-bg').trim()),
        borderToken: cs.getPropertyValue('--mullion-menu-bd').trim(),
      };
    });

    expect(reading.borderToken, 'the menu-bd token did not reach the popup').toMatch(/^#|^rgb/);
    expect(reading.background).toBe(reading.expectedBackground);
  });

  test('the scrim is the theme’s overlay token rather than a hard-coded black', async ({ page }) => {
    await open(page);
    await inline(page, 'modal-trigger').click();
    const backdrop = await page.evaluate(() => {
      const root = document.querySelector('[data-mullion-overlay-root]')?.shadowRoot;
      const el = root?.querySelector('.mullion-overlay-backdrop') as HTMLElement | null;
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { painted: cs.backgroundColor, token: cs.getPropertyValue('--mullion-backdrop').trim() };
    });
    expect(backdrop).not.toBeNull();
    expect(backdrop!.token, 'the backdrop token did not reach the backdrop').not.toBe('');
    expect(backdrop!.painted).not.toBe('rgba(0, 0, 0, 0)');
  });

  /** What a highlighted row paints: its ground, the rail, and the ring. */
  const rowMarks = (page: Page) =>
    page.locator('.mullion-menu-item[data-highlighted]').evaluate((row) => {
      const rail = getComputedStyle(row, '::before');
      return {
        background: getComputedStyle(row).backgroundColor,
        rail: rail.content !== 'none' ? rail.width : null,
        railColour: rail.backgroundColor,
        ring: /inset/.test(getComputedStyle(row).boxShadow),
      };
    });

  /*
   * One mark per input mode (P80-G, the designer's answer to question 5): the
   * pointer gets the rail and the keyboard gets the inset ring. Painted
   * together, the rail covered the ring's inner halo band on the leading edge.
   */
  test('a row the pointer highlights paints the rail and no ring, and its ground does not move', async ({
    page,
  }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    const items = page.locator('.mullion-menu-item');
    const before = await items.nth(1).evaluate((row) => getComputedStyle(row).backgroundColor);

    await items.nth(1).hover();
    await expect(items.nth(1)).toHaveAttribute('data-highlighted', '');
    const marks = await rowMarks(page);

    // The whole point of the rail: highlighting a row moves no ground, so
    // nothing painted on it can be measured against a ground it was not
    // audited on.
    expect(marks.background, 'highlighting the row moved its ground').toBe(before);
    expect(marks.rail, 'the rail is not painted').toBe('3px');
    expect(marks.railColour, 'the rail is not the audited stroke colour').not.toBe('rgba(0, 0, 0, 0)');
    expect(marks.ring, 'a pointer highlight painted the keyboard ring').toBe(false);
  });

  test('a row the keyboard highlights paints the ring and no rail', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.mullion-menu-item[data-highlighted]')).toHaveCount(1);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(150);
    const marks = await rowMarks(page);
    expect(marks.ring, 'the keyboard row has no ring').toBe(true);
    expect(marks.rail, 'the rail still paints under keyboard focus, over the ring\'s halo').toBeNull();
  });

  test('the inset ring on a menu row is painted, and not clipped', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');

    /*
     * Read back what was PAINTED, not what the inputs imply. The outset ring's
     * reach was reported as 10px by a test that added `outlineWidth`,
     * `outlineOffset` and the halo spread; the real figure is 6px, because the
     * outline sits inside the spread. This samples the row's own box instead.
     */
    const ring = await page.locator('.mullion-menu-item[data-highlighted]').evaluate((item) => {
      const menu = item.closest('.mullion-menu');
      if (!menu) return null;
      const cs = getComputedStyle(item);
      const ib = item.getBoundingClientRect();
      const mb = menu.getBoundingClientRect();
      return {
        variant: item.getAttribute('data-mullion-focus'),
        outline: cs.outlineStyle,
        boxShadow: cs.boxShadow,
        insetCount: (cs.boxShadow.match(/inset/g) ?? []).length,
        // An inset ring is drawn within the row's own box, so it cannot be cut
        // by the menu however little room the row has.
        roomLeft: +(ib.left - mb.left).toFixed(1),
        roomRight: +(mb.right - ib.right).toFixed(1),
        rowWidth: +ib.width.toFixed(1),
      };
    });

    expect(ring, 'no highlighted row').not.toBeNull();
    expect(ring!.variant).toBe('inset');
    expect(ring!.outline, 'the inset variant must not also draw an outset outline').toBe('none');
    expect(ring!.insetCount, 'three inset bands, halo core halo').toBe(3);
    // The row still has almost no clearance; that is the point of the variant.
    expect(ring!.roomLeft).toBeLessThan(6);
    expect(ring!.boxShadow).not.toBe('none');
  });

  test('a keyboard-highlighted menu item paints the two-tone ring', async ({ page }) => {
    await open(page);
    await inline(page, 'menu-trigger').click();
    await expect(page.locator('.mullion-menu')).toBeVisible();
    await page.keyboard.press('ArrowDown');

    const ring = await page.locator('.mullion-menu-item[data-highlighted]').evaluate((item) => {
      const cs = getComputedStyle(item);
      return {
        hasFocusAttr: item.hasAttribute('data-mullion-focus'),
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow,
        haloToken: cs.getPropertyValue('--mullion-color-focus-halo').trim(),
      };
    });

    expect(ring.hasFocusAttr, 'the item does not carry the attribute the ring rule keys on').toBe(true);
    /*
     * Both tones of the P77-F pair must be painted on a keyboard move. A row
     * takes the INSET variant, so the pair arrives as three inset bands rather
     * than an outline plus a halo: same two tokens, different geometry, and no
     * outset outline at all.
     */
    expect(ring.outlineStyle, 'the inset variant must not also draw an outline').toBe('none');
    expect(ring.haloToken, 'the halo token did not reach the item').toMatch(/^#[0-9a-f]{6}$/i);
    expect(ring.boxShadow, 'the ring is not painted at all').not.toBe('none');
    expect(ring.boxShadow, 'the pair is not drawn inward').toContain('inset');
  });
});

// ---------------------------------------------------------------------------
// The axe gate
// ---------------------------------------------------------------------------

/*
 * Scoped to the popup, not to the page.
 *
 * The showcase renders P79-C's whole presentational set beside the overlays,
 * and a full-page scan reports its violations rather than this track's: the
 * fixture's tone probe puts a link inside muted text at 1.11:1, which is
 * P79-C's and recorded with a home in the phase document. (`FileButton`'s
 * unnamed input was the other; P80-F fixed it and gates it in jsdom.) A
 * full-page gate belongs with the surfaces Phase 81 migrates, where the page
 * is a product screen rather than a fixture.
 */
test.describe('the axe gate', () => {
  /*
   * axe reads a plain array in `include` as a FRAME chain, not a shadow one, so
   * the `['[data-mullion-overlay-root]', selector]` form these gates used from
   * P80-A until P80-F matched nothing and passed on an empty scan. The shadow
   * chain is `fromShadowDom`, and every gate now proves it reached its target.
   */
  const inOverlayRoot = (selector: string) => ({ fromShadowDom: ['[data-mullion-overlay-root]', selector] as [string, string] });
  const inMount = (mount: Mount, selector: string) =>
    mount === 'shadow' ? { fromShadowDom: ['#showcase', selector] as [string, string] } : selector;

  type Results = Awaited<ReturnType<AxeBuilder['analyze']>>;
  const serious = (results: Results) =>
    results.violations
      .filter((v) => v.impact === 'critical' || v.impact === 'serious')
      .map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`);
  const reached = (results: Results, cls: string) =>
    [...results.passes, ...results.violations, ...results.incomplete]
      .flatMap((r) => r.nodes)
      .some((n) => n.html.includes(cls));

  /** Scan after the open transition: a popup mid-fade reads as a contrast failure. */
  const settle = (page: Page, cls: string) =>
    page.locator(`.${cls}`).evaluate((el) => Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished)));

  for (const which of ['modal', 'drawer'] as const) {
    test(`an open ${which} has no critical or serious violations`, async ({ page }) => {
      await open(page, { mount: 'light' });
      await inline(page, `${which}-trigger`).click();
      await expect(page.locator(`.mullion-${which}`)).toBeVisible();
      await settle(page, `mullion-${which}`);

      const results = await new AxeBuilder({ page }).include(inOverlayRoot('.mullion-overlay-popup')).analyze();
      expect(reached(results, `mullion-${which}`), `axe never reached the ${which}`).toBe(true);
      expect(serious(results), `axe found violations inside the ${which}`).toEqual([]);
    });
  }

  /*
   * Scanned with the trigger's section, because Base UI renders an `aria-owns`
   * span beside the trigger that pointed into another root until P80-F. Its
   * focus guards are excluded: `aria-hidden` spans with `tabindex="0"` that
   * hand focus on at once, which `aria-hidden-focus` cannot see (PHASE80, P80-A).
   */
  for (const mount of ['shadow', 'light'] as const) {
    for (const which of ['menu', 'popover'] as const) {
      test(`an open ${which} on the ${mount} mount, with its trigger, has no critical or serious violations`, async ({
        page,
      }) => {
        await open(page, { mount });
        await inline(page, `${which}-trigger`).click();
        await expect(page.locator(`.mullion-${which}`)).toBeVisible();
        await settle(page, `mullion-${which}`);

        const results = await new AxeBuilder({ page })
          .include(inMount(mount, '[data-testid="inline-overlays"]'))
          .include(inMount(mount, `.mullion-${which}`))
          .exclude(inMount(mount, '[data-base-ui-focus-guard]'))
          .analyze();
        expect(reached(results, `mullion-${which}`), `axe never reached the ${which}`).toBe(true);
        expect(serious(results), `axe found violations around the ${which}`).toEqual([]);
      });
    }
  }
});
