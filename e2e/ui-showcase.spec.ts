/**
 * P79-C: the presentational set, proved where it actually paints.
 *
 * jsdom computes no custom properties and resolves no cascade, so the unit
 * suite can only assert which attribute an element carries. Everything that
 * matters about this track is a computed value, and all of it is here: that
 * the component sheet reaches each of the three trees the provider paints,
 * that a component's colour resolves to the theme's token rather than to a
 * fallback, and that every focusable control paints the P77-F ring pair.
 *
 * The page is the dev server's own index with the showcase module spliced in
 * (`src/ui/showcase/mount.tsx`), so Vite's transform is present and
 * `main.tsx` finds no mount node and does nothing.
 */

import { test, expect, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every bundled theme, read from the engine's definitions rather than listed here. */
const BUNDLED_THEMES = readdirSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'theme-engine', 'src', 'definitions'),
)
  .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
  .map((file) => file.replace('.json', ''));

const ROOT_MARKUP = '<div id="root"></div>';
const SHOWCASE =
  '<div id="showcase"></div>\n    <script type="module" src="/src/ui/showcase/mount.tsx"></script>';

type Mount = 'shadow' | 'light';
type Chrome = 'lock' | 'follow';

async function serveShowcase(page: Page) {
  await page.route('**/ui-showcase*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    const index = await (await route.fetch({ url: `${origin}/` })).text();
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

/**
 * Vite dev transforms on demand, and this fixture's module graph (the whole
 * component set, the provider and the theme engine) is compiled on its first
 * request. The first three navigations of the first run exceeded the 30s test
 * timeout on a cold server and every one after it took under a second, so the
 * graph is warmed once here rather than by giving every test a budget it does
 * not need.
 */
test.beforeAll(async ({ browser }) => {
  test.setTimeout(180_000);
  const page = await browser.newPage();
  try {
    await serveShowcase(page);
    await page.goto('/ui-showcase');
    await page.waitForFunction(
      () => {
        const host = document.querySelector('[data-mullion-overlay-root]');
        return !!host?.shadowRoot?.querySelector('[data-testid="overlay-panel"]');
      },
      undefined,
      { timeout: 150_000 },
    );
  } finally {
    await page.close();
  }
});

async function open(page: Page, mount: Mount, chrome: Chrome, theme = 'default-dark') {
  await serveShowcase(page);
  await page.goto(`/ui-showcase?mount=${mount}&chrome=${chrome}&theme=${theme}`);
  // The inline set lives inside the shadow root on a shadow mount, so wait on
  // the overlay panel, which is in the overlay root either way.
  await page.waitForFunction(() => {
    const host = document.querySelector('[data-mullion-overlay-root]');
    return !!host?.shadowRoot?.querySelector('[data-testid="overlay-panel"]');
  });
}

// ---------------------------------------------------------------------------
// Reach: the component sheet in every tree the provider paints
// ---------------------------------------------------------------------------

/** Every rule text a tree holds, adopted sheets included. */
function sheetTextOf(page: Page, where: 'gallery' | 'overlay' | 'document') {
  return page.evaluate((target) => {
    const rootOf = (): DocumentOrShadowRoot | null => {
      if (target === 'document') return document;
      if (target === 'overlay') {
        return document.querySelector('[data-mullion-overlay-root]')?.shadowRoot ?? null;
      }
      return document.getElementById('showcase')?.shadowRoot ?? document;
    };
    const root = rootOf();
    if (!root) return null;
    const sheets = [
      ...Array.from(root.adoptedStyleSheets ?? []),
      ...Array.from((root as unknown as { styleSheets?: StyleSheetList }).styleSheets ?? []),
    ];
    return sheets
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules).map((rule) => rule.cssText);
        } catch {
          return [];
        }
      })
      .join('\n');
  }, where);
}

test.describe('the component sheet reaches every tree', () => {
  for (const mount of ['shadow', 'light'] as const) {
    test(`gallery tree and overlay root carry the framework rules (${mount} mount)`, async ({ page }) => {
      await open(page, mount, 'lock');

      for (const tree of ['gallery', 'overlay'] as const) {
        const css = await sheetTextOf(page, tree);
        expect(css, `${tree} has no stylesheet at all`).not.toBeNull();
        expect(css, `the layer order is missing from the ${tree} tree`).toContain('@layer mullion.vendor, mullion.base, mullion.components');
        expect(css, `the layout sheet is missing from the ${tree} tree`).toContain('.mullion-stack');
        expect(css, `the control sheet is missing from the ${tree} tree`).toContain('.mullion-button');
        expect(css, `the focus rule is missing from the ${tree} tree`).toContain('data-mullion-focus');
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Tokens: a component's colour resolves to the theme's, not to a fallback
// ---------------------------------------------------------------------------

interface Reading {
  muted: string;
  mutedToken: string;
  surface: string;
  surfaceToken: string;
  fontSize: string;
  fontSizeToken: string;
  gap: string;
  gapToken: string;
}

function readTokens(page: Page, scope: 'inline' | 'overlay') {
  return page.evaluate((prefix) => {
    const root: ParentNode =
      prefix === 'overlay'
        ? (document.querySelector('[data-mullion-overlay-root]')!.shadowRoot as ParentNode)
        : (document.getElementById('showcase')?.shadowRoot ?? document);
    const set = root.querySelector(`[data-testid="${prefix}-set"]`)!;
    const muted = set.querySelector('.mullion-text[data-mullion-tone="muted"]')!;
    const paper = set.querySelector('.mullion-paper')!;
    const stack = set.querySelector('.mullion-stack') ?? set;
    const scoped = getComputedStyle(set as HTMLElement);
    const read = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
    return {
      muted: getComputedStyle(muted).color,
      mutedToken: read(muted, '--mullion-color-text-muted'),
      surface: getComputedStyle(paper).backgroundColor,
      surfaceToken: read(paper, '--mullion-color-surface'),
      fontSize: getComputedStyle(muted).fontSize,
      fontSizeToken: read(muted, '--mullion-font-size-sm'),
      gap: getComputedStyle(stack as HTMLElement).rowGap,
      gapToken: scoped.getPropertyValue('--mullion-spacing-md').trim(),
    } satisfies Reading;
  }, scope);
}

const hexToRgb = (hex: string) =>
  `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;

test.describe('components read tokens rather than fallbacks', () => {
  for (const mount of ['shadow', 'light'] as const) {
    for (const scope of ['inline', 'overlay'] as const) {
      test(`${scope} set resolves colour, type and spacing from the theme (${mount} mount)`, async ({ page }) => {
        await open(page, mount, 'lock');
        const r = await readTokens(page, scope);

        // A missing token paints the CSS-wide initial value, which is the
        // P76 class of defect: the assertion is that the painted value is
        // the token's, not merely that something was painted.
        expect(r.mutedToken, 'the muted text token did not reach the element').toMatch(/^#[0-9a-f]{6}$/i);
        expect(r.muted).toBe(hexToRgb(r.mutedToken));
        expect(r.surfaceToken).toMatch(/^#[0-9a-f]{6}$/i);
        expect(r.surface).toBe(hexToRgb(r.surfaceToken));

        // The type scale is new in P79-C: the engine emitted no font-size
        // token before this track, so `Text size="sm"` had nothing to read.
        expect(r.fontSizeToken, 'the type scale did not reach the element').not.toBe('');
        expect(parseFloat(r.fontSize)).toBeCloseTo(parseFloat(r.fontSizeToken) * 16, 1);
        expect(r.gapToken).not.toBe('');
      });
    }
  }

  test('two themes paint two different sets of values', async ({ page }) => {
    await open(page, 'shadow', 'lock', 'github-light');
    const light = await readTokens(page, 'inline');
    await open(page, 'shadow', 'lock', 'tokyo-night');
    const dark = await readTokens(page, 'inline');
    expect(light.surface).not.toBe(dark.surface);
    expect(light.muted).not.toBe(dark.muted);
  });
});

// ---------------------------------------------------------------------------
// Contrast of the tone model, across every bundled theme
// ---------------------------------------------------------------------------

/**
 * The framework's whole colour API is seven tones times six variants, and
 * every one of those pairs is text on a ground. Nothing audits them: the
 * engine's `auditUiContrast` knows which Mantine variable an affordance reads,
 * and these are not Mantine's. So the check is the painted result, on probe
 * elements built from the same classes and attributes the components render,
 * across all 23 bundled themes.
 *
 * This found three things on the first draft, all of them recorded in the
 * P79-C notes: `filled` paired the draw rung with the fill's ink (2.55:1 on
 * tokyo-night), the role colours had no text rung at all (3.90:1 for a danger
 * label on github-light), and no hover mix of the fill is safe on every theme.
 */
test('every tone and variant clears the 4.5:1 text floor on every bundled theme', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await serveShowcase(page);

  const failures: string[] = [];
  for (const theme of BUNDLED_THEMES) {
    await page.goto(`/ui-showcase?mount=shadow&chrome=lock&theme=${theme}`);
    await page.waitForFunction(
      () => !!document.getElementById('showcase')?.shadowRoot?.querySelector('.mullion-button'),
      undefined,
      { timeout: 60_000 },
    );
    const rows = await page.evaluate(() => {
      const root = document.getElementById('showcase')!.shadowRoot!;
      /**
       * Chromium reports a `color-mix()` result as `color(srgb 0.94 0.87 0.87)`
       * and everything else as `rgb(240, 222, 222)`. Reading the first form's
       * floats as 0-255 makes every mixed ground look nearly black, which is
       * exactly the false alarm this check raised the first time it ran.
       */
      const channels = (colour: string) => {
        const srgb = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(colour);
        if (srgb) return [1, 2, 3].map((i) => Number(srgb[i]) * 255);
        return colour.match(/[\d.]+/g)!.slice(0, 3).map(Number);
      };
      const luminance = (colour: string) => {
        const linear = channels(colour).map((v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
      };
      const ratio = (a: string, b: string) => {
        const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
        return (hi! + 0.05) / (lo! + 0.05);
      };

      const set = root.querySelector('[data-testid="inline-set"]') as HTMLElement;
      const container = set.closest('.mullion-container') as HTMLElement;
      const ground = getComputedStyle(container).backgroundColor;
      const probe = document.createElement('div');
      root.appendChild(probe);

      /**
       * What a variant's ground becomes on hover. A custom property reads back
       * as the text it was declared with, `color-mix(...)` included, so the
       * value is resolved by giving it to a child element as a real
       * background and reading that back. `filled` deliberately does not move
       * its ground, so it has none to report.
       */
      const resolve = (parent: HTMLElement, value: string): string => {
        const probeChild = document.createElement('span');
        probeChild.style.backgroundColor = value;
        parent.appendChild(probeChild);
        const resolved = getComputedStyle(probeChild).backgroundColor;
        probeChild.remove();
        return resolved;
      };
      const hoverGround = (variant: string, el: HTMLElement): string | null => {
        if (variant === 'light') return resolve(el, 'var(--mullion-tone-wash-strong)');
        if (variant === 'outline' || variant === 'subtle') return resolve(el, 'var(--mullion-color-surface2)');
        if (variant === 'default') return resolve(el, 'var(--mullion-color-surface2)');
        return null;
      };

      const out: Array<{ what: string; ratio: number; floor?: number }> = [];
      const tones = ['default', 'muted', 'primary', 'success', 'warning', 'danger', 'info'];
      const variants = ['filled', 'light', 'outline', 'subtle', 'default', 'transparent'];
      for (const tone of tones) {
        for (const variant of variants) {
          const button = document.createElement('button');
          button.className = 'mullion-button';
          button.setAttribute('data-variant', variant);
          button.setAttribute('data-size', 'sm');
          button.setAttribute('data-mullion-tone', tone);
          button.textContent = 'label';
          probe.appendChild(button);
          const cs = getComputedStyle(button);
          const bg = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? ground : cs.backgroundColor;
          out.push({ what: `button ${variant}/${tone}`, ratio: ratio(cs.color, bg) });

          // The hover ground too: a pair that is legible at rest and not on
          // hover is a pair that fails while the pointer is on it. The rules
          // are read off the sheet rather than simulated, because a probe
          // element cannot be hovered.
          const hoverBg = hoverGround(variant, button);
          if (hoverBg) {
            out.push({ what: `button ${variant}/${tone} :hover`, ratio: ratio(cs.color, hoverBg) });
          }
        }
        // Icons answer to 1.4.11's 3:1 rather than 1.4.3's 4.5:1, so they are
        // the one place a tone may sit on a tint of itself.
        for (const variant of variants) {
          const icon = document.createElement('button');
          icon.className = 'mullion-action-icon';
          icon.setAttribute('data-variant', variant);
          icon.setAttribute('data-size', 'sm');
          icon.setAttribute('data-mullion-tone', tone);
          probe.appendChild(icon);
          const cs = getComputedStyle(icon);
          const bg = cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? ground : cs.backgroundColor;
          out.push({ what: `icon ${variant}/${tone}`, ratio: ratio(cs.color, bg), floor: 3 });
        }

        // `Text` is the component that paints a tone straight onto the ground,
        // which is the case the role's text rung exists for.
        const text = document.createElement('p');
        text.className = 'mullion-text';
        text.setAttribute('data-mullion-tone', tone);
        text.textContent = 'label';
        probe.appendChild(text);
        out.push({
          what: `text ${tone}`,
          ratio: ratio(getComputedStyle(text).color, ground),
        });
      }
      probe.remove();
      return out;
    });

    for (const row of rows) {
      const floor = row.floor ?? 4.5;
      if (row.ratio < floor) {
        failures.push(`${theme}: ${row.what} = ${row.ratio.toFixed(2)} (floor ${floor})`);
      }
    }
  }

  expect(
    failures,
    `these tone and variant pairs fall under their contrast floor:\n${failures.join('\n')}`,
  ).toEqual([]);
});

// ---------------------------------------------------------------------------
// The P77-F ring walk, against framework components
// ---------------------------------------------------------------------------

interface Ring {
  where: string;
  colour: string;
  width: string;
  offset: string;
  halo: string;
  haloVar: string;
  strokeVar: string;
}

/**
 * Tab through the page and record every painted ring. Unlike the Mantine walk
 * in theme-qa.spec.ts this one reads the tokens off the ringed element and
 * compares the paint to them, so it holds for any theme without a table of
 * expected colours.
 */
async function walk(page: Page): Promise<Ring[]> {
  const rings: Ring[] = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const found = await page.evaluate(() => {
      const deepActive = (): Element | null => {
        let a: Element | null = document.activeElement;
        while (a && (a as HTMLElement).shadowRoot?.activeElement) {
          a = (a as HTMLElement).shadowRoot!.activeElement;
        }
        return a;
      };
      const el = deepActive() as HTMLElement | null;
      if (!el) return null;
      const out: Ring[] = [];
      // The framework draws the ring on the focused element, or on its next
      // sibling where the control is a clipped input (the chip).
      for (const [label, node] of [
        ['self', el],
        ['sibling', el.nextElementSibling],
      ] as const) {
        if (!node) continue;
        const cs = getComputedStyle(node as HTMLElement);
        if (cs.outlineStyle === 'solid' && parseFloat(cs.outlineWidth) >= 2) {
          out.push({
            where: `${label}:${(node as HTMLElement).className || node.nodeName}`,
            colour: cs.outlineColor,
            width: cs.outlineWidth,
            offset: cs.outlineOffset,
            halo: cs.boxShadow,
            haloVar: cs.getPropertyValue('--mullion-color-focus-halo').trim(),
            strokeVar: cs.getPropertyValue('--mullion-color-primary-stroke').trim(),
          });
        }
      }
      return out.length ? out : null;
    });
    if (found) rings.push(...found);
  }
  return rings;
}

test.describe('focus ring on framework components', () => {
  for (const mount of ['shadow', 'light'] as const) {
    for (const chrome of ['lock', 'follow'] as const) {
      test(`every framework control paints the two-tone ring (${mount} mount, chrome ${chrome})`, async ({
        page,
      }) => {
        await open(page, mount, chrome);
        await page.addStyleTag({
          content: '*,*::before,*::after{transition:none !important;animation:none !important}',
        });

        const rings = await walk(page);

        // The walk must actually have produced rings, or this proves nothing.
        // The set has twelve focusables in each of two scopes.
        expect(rings.length, 'no focus rings were painted; the walk found nothing to check').toBeGreaterThan(10);

        const noStroke = rings.filter((r) => !/^#[0-9a-f]{6}$/i.test(r.strokeVar));
        expect(
          noStroke,
          `the primary-stroke token did not reach:\n${noStroke.map((r) => '  - ' + r.where).join('\n')}`,
        ).toEqual([]);
        const wrongCore = rings.filter((r) => r.colour !== hexToRgb(r.strokeVar));
        expect(
          wrongCore,
          `these rings do not paint the primary-stroke token:\n${wrongCore
            .map((r) => `  - ${r.where}: ${r.colour} vs ${r.strokeVar}`)
            .join('\n')}`,
        ).toEqual([]);

        const noHalo = rings.filter((r) => !/^#[0-9a-f]{6}$/i.test(r.haloVar));
        expect(
          noHalo,
          `the focus-halo token did not reach:\n${noHalo.map((r) => '  - ' + r.where).join('\n')}`,
        ).toEqual([]);
        const badHalo = rings.filter((r) => r.halo !== `${hexToRgb(r.haloVar)} 0px 0px 0px 6px`);
        expect(
          badHalo,
          `these rings do not paint the 6px halo in the theme token:\n${badHalo
            .map((r) => `  - ${r.where}: ${r.halo}`)
            .join('\n')}`,
        ).toEqual([]);

        expect(
          rings.every((r) => r.width === '2px'),
          'the ring core must stay 2px on every control',
        ).toBe(true);
        expect(
          rings.every((r) => r.offset === '2px'),
          'the ring offset must stay 2px on every control',
        ).toBe(true);
      });
    }
  }

  // The walk above runs on default-dark. The ring is theme-independent by
  // construction (it reads two tokens), and this is the check that says so:
  // github-light resolves a different pair and the paint must follow.
  test('the ring follows the theme, not a fixed pair of colours', async ({ page }) => {
    await open(page, 'shadow', 'lock', 'github-light');
    await page.addStyleTag({
      content: '*,*::before,*::after{transition:none !important;animation:none !important}',
    });

    const rings = await walk(page);
    expect(rings.length).toBeGreaterThan(10);

    const wrongCore = rings.filter((r) => r.colour !== hexToRgb(r.strokeVar));
    expect(
      wrongCore,
      `these rings do not paint github-light's primary stroke:\n${wrongCore
        .map((r) => `  - ${r.where}: ${r.colour} vs ${r.strokeVar}`)
        .join('\n')}`,
    ).toEqual([]);
    const badHalo = rings.filter((r) => r.halo !== `${hexToRgb(r.haloVar)} 0px 0px 0px 6px`);
    expect(badHalo).toEqual([]);

    // And the pair really is a different one, or this proves nothing.
    await open(page, 'shadow', 'lock', 'default-dark');
    const darkStroke = await page.evaluate(
      () =>
        getComputedStyle(document.getElementById('showcase')!.shadowRoot!.querySelector('.mullion-button')!)
          .getPropertyValue('--mullion-color-primary-stroke')
          .trim(),
    );
    expect(rings[0]!.strokeVar).not.toBe(darkStroke);
  });

  test('the chip draws its ring on the label, not on its clipped input', async ({ page }) => {
    await open(page, 'shadow', 'lock');
    const reading = await page.evaluate(() => {
      const root = document.getElementById('showcase')!.shadowRoot!;
      const input = root.querySelector('.mullion-chip-input') as HTMLInputElement;
      input.focus();
      const label = input.nextElementSibling as HTMLElement;
      return {
        inputOutline: getComputedStyle(input).outlineStyle,
        labelOutline: getComputedStyle(label).outlineStyle,
        labelWidth: getComputedStyle(label).outlineWidth,
      };
    });
    expect(reading.inputOutline).toBe('none');
    expect(reading.labelOutline).toBe('solid');
    expect(reading.labelWidth).toBe('2px');
  });
});

// ---------------------------------------------------------------------------
// Lock and follow, and the host-safe layer
// ---------------------------------------------------------------------------

test('lock paints the brand palette in the overlay and follow paints the gallery theme', async ({
  page,
}) => {
  await open(page, 'shadow', 'lock', 'tokyo-night');
  const locked = await readTokens(page, 'overlay');
  const lockedInline = await readTokens(page, 'inline');
  await open(page, 'shadow', 'follow', 'tokyo-night');
  const followed = await readTokens(page, 'overlay');

  expect(followed.surface, 'a follower must paint what the gallery paints').toBe(lockedInline.surface);
  expect(locked.surface, 'a locked chrome must not paint the gallery theme').not.toBe(
    lockedInline.surface,
  );
});

// [P79-0] Custom properties inherit, so a tone declared on one element reaches
// every descendant. A component reads `--mullion-tone` only under its own
// attribute; the first draft read it bare, and all three of these painted the
// wrong colour.
test('a tone stops at the element that declared it', async ({ page }) => {
  await open(page, 'shadow', 'lock', 'github-light');
  const reading = await page.evaluate(() => {
    const set = document.getElementById('showcase')!.shadowRoot!.querySelector('[data-testid="inline-set"]')!;
    const by = (id: string) => set.querySelector(`[data-testid="inline-${id}"]`) as HTMLElement;
    const colour = (el: HTMLElement) => getComputedStyle(el).color;
    const token = (el: HTMLElement, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
    const hexToRgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
    const alert = by('tone-alert');
    const button = by('tone-loading');
    const loader = button.querySelector('.mullion-loader') as HTMLElement;
    return {
      plainInAlert: colour(by('tone-plain')),
      alertInk: colour(alert),
      dangerText: hexToRgb(token(alert, '--mullion-error-text')),
      anchorInMuted: colour(by('tone-anchor')),
      primaryText: hexToRgb(token(alert, '--mullion-primary-text')),
      mutedText: hexToRgb(token(alert, '--mullion-color-text-muted')),
      loaderTop: getComputedStyle(loader).borderTopColor,
      buttonInk: colour(button),
    };
  });
  expect(reading.plainInAlert, 'un-toned text takes the alert body\'s ink').toBe(reading.alertInk);
  expect(reading.plainInAlert).not.toBe(reading.dangerText);
  expect(reading.anchorInMuted, 'a link inside muted text keeps its own colour').toBe(reading.primaryText);
  expect(reading.anchorInMuted).not.toBe(reading.mutedText);
  expect(reading.loaderTop, 'a loading button\'s spinner is drawn in the button\'s ink').toBe(reading.buttonInk);
});

test('the layer scale reads the host offset instead of declaring it', async ({ page }) => {
  await open(page, 'shadow', 'lock');
  const reading = await page.evaluate(() => {
    const set = document
      .getElementById('showcase')!
      .shadowRoot!.querySelector('[data-testid="inline-set"]') as HTMLElement;
    const before = {
      offset: getComputedStyle(set).getPropertyValue('--mullion-layer-host-offset').trim(),
      modal: getComputedStyle(set).getPropertyValue('--mullion-layer-modal').trim(),
    };
    // What the WordPress embed does when the admin bar is showing: one
    // declaration on the document, above every tree the provider paints.
    const style = document.createElement('style');
    style.textContent = ':root{--mullion-layer-host-offset:100000;}';
    document.head.appendChild(style);
    const after = getComputedStyle(set).getPropertyValue('--mullion-layer-modal').trim();
    return { before, after };
  });

  // Nothing declares the offset on the scope, so the host's value inherits in.
  expect(reading.before.offset).toBe('');
  expect(reading.before.modal).toBe('calc(0 + 500)');
  expect(
    reading.after,
    'a host offset set above the gallery must reach the layer scale inside it',
  ).toBe('calc(100000 + 500)');
});
