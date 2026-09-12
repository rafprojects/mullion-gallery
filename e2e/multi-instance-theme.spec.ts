/**
 * P79-A: two gallery instances on one page hold two independent token sets.
 *
 * jsdom cannot compute custom properties, so the unit suite proves each tree
 * holds its own sheet and this spec proves the values actually resolve. The
 * page is served by a route so no fixture file has to exist for it: the dev
 * server's own index page, as Vite transforms it (so the React refresh
 * preamble is present), with `#root` replaced by two `.mullion-gallery`
 * hosts that each carry a per-instance theme in their config. Expected
 * values are read from the theme JSON rather than recalled, and
 * `colors.background` is emitted verbatim, so a computed
 * `--mullion-color-background` is a decisive per-theme fingerprint.
 */

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFINITIONS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'packages',
  'theme-engine',
  'src',
  'definitions',
);

function background(themeId: string): string {
  const def = JSON.parse(readFileSync(path.join(DEFINITIONS, `${themeId}.json`), 'utf8')) as {
    colors: { background: string };
  };
  return def.colors.background.toLowerCase();
}

const THEME_A = 'tokyo-night';
const THEME_B = 'github-light';

const ROOT_MARKUP = '<div id="root"></div>';
const HOSTS = `
  <div class="mullion-gallery" id="gallery-a" data-mullion-config='{"theme":"${THEME_A}"}'></div>
  <div class="mullion-gallery" id="gallery-b" data-mullion-config='{"theme":"${THEME_B}"}'></div>
`;

interface Reading {
  hostBackground: string;
  hostScheme: string;
  insideBackground: string | null;
  overlayBackground: string | null;
}

async function serveTwoInstances(page: Page) {
  await page.route('**/two-instances*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    const index = await (await route.fetch({ url: `${origin}/` })).text();
    if (!index.includes(ROOT_MARKUP)) {
      throw new Error(`dev index page no longer contains ${ROOT_MARKUP}; update the two-instance fixture`);
    }
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: index.replace(ROOT_MARKUP, HOSTS),
    });
  });
  await page.route('**/wp-json/mullion-gallery/v1/campaigns**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) }),
  );
}

function read(page: Page, id: string): Promise<Reading | null> {
  return page.evaluate((hostId) => {
    const host = document.getElementById(hostId);
    if (!host) return null;
    const token = (el: Element | null | undefined, name: string) =>
      el ? getComputedStyle(el).getPropertyValue(name).trim().toLowerCase() : null;
    // Under a shadow mount the app renders in the host's shadow root; under a
    // light mount it renders directly under the host.
    const inside = host.shadowRoot?.querySelector('[data-mullion-mount]') ?? host.firstElementChild;
    const overlay = document
      .querySelector(`[data-mullion-overlay-root="${hostId}"]`)
      ?.shadowRoot?.querySelector('[data-mullion-scope]');
    return {
      hostBackground: token(host, '--mullion-color-background') ?? '',
      hostScheme: token(host, '--mullion-color-scheme') ?? '',
      insideBackground: token(inside, '--mullion-color-background'),
      overlayBackground: token(overlay, '--mullion-color-background'),
    };
  }, id);
}

async function readBoth(page: Page): Promise<{ a: Reading; b: Reading }> {
  await expect
    .poll(async () => {
      const a = await read(page, 'gallery-a');
      const b = await read(page, 'gallery-b');
      return !!a?.hostBackground && !!b?.hostBackground;
    })
    .toBe(true);
  return { a: (await read(page, 'gallery-a'))!, b: (await read(page, 'gallery-b'))! };
}

test.describe('two instances, two themes', () => {
  test('shadow mount: each host resolves its own tokens, inside its tree and in its overlay root', async ({ page }) => {
    await serveTwoInstances(page);
    await page.goto('/two-instances');
    const { a, b } = await readBoth(page);

    expect(a.hostBackground).toBe(background(THEME_A));
    expect(b.hostBackground).toBe(background(THEME_B));
    expect(a.hostScheme).toBe('dark');
    expect(b.hostScheme).toBe('light');

    // The value inside each shadow tree is the host's, not the other instance's.
    expect(a.insideBackground).toBe(a.hostBackground);
    expect(b.insideBackground).toBe(b.hostBackground);

    // Each overlay root carries its own instance's tokens (the P77-B/I default).
    expect(a.overlayBackground).toBe(a.hostBackground);
    expect(b.overlayBackground).toBe(b.hostBackground);

    // No bleed onto the host page.
    const pageBackground = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--mullion-color-background').trim(),
    );
    expect(pageBackground).toBe('');

    // P79-B: two mounts, four roots of ours, one parsed component sheet. The
    // FUTURE_TASKS constructable-stylesheet entry named multi-shortcode pages
    // as the case that pays for duplicated copies; this is that case.
    const sharing = await page.evaluate(() => {
      const roots = [
        document.getElementById('gallery-a')?.shadowRoot,
        document.getElementById('gallery-b')?.shadowRoot,
        document.querySelector('[data-mullion-overlay-root="gallery-a"]')?.shadowRoot,
        document.querySelector('[data-mullion-overlay-root="gallery-b"]')?.shadowRoot,
      ];
      const framework = roots.map((r) => r?.adoptedStyleSheets.find((s) => s.cssRules[0]?.constructor.name === 'CSSLayerStatementRule') ?? null);
      return {
        rootsFound: roots.filter(Boolean).length,
        sheetsFound: framework.filter(Boolean).length,
        distinctObjects: new Set(framework.filter(Boolean)).size,
        handWrittenCopies: roots.reduce((n, r) => n + (r?.querySelectorAll('style[data-mullion]').length ?? 0), 0),
      };
    });
    expect(sharing).toEqual({ rootsFound: 4, sheetsFound: 4, distinctObjects: 1, handWrittenCopies: 0 });
  });

  test('light mount: each host carries its own scope attribute and tokens, and the page is untouched', async ({ page }) => {
    await serveTwoInstances(page);
    await page.goto('/two-instances?shadow=0');
    const { a, b } = await readBoth(page);

    expect(a.hostBackground).toBe(background(THEME_A));
    expect(b.hostBackground).toBe(background(THEME_B));
    expect(a.insideBackground).toBe(a.hostBackground);
    expect(b.insideBackground).toBe(b.hostBackground);

    const scopes = await page.evaluate(() => [
      document.getElementById('gallery-a')?.getAttribute('data-mullion-scope'),
      document.getElementById('gallery-b')?.getAttribute('data-mullion-scope'),
      getComputedStyle(document.body).getPropertyValue('--mullion-color-background').trim(),
    ]);
    expect(scopes[0]).toMatch(/^mullion-/);
    expect(scopes[1]).toMatch(/^mullion-/);
    expect(scopes[0]).not.toBe(scopes[1]);
    expect(scopes[2]).toBe('');
  });
});
