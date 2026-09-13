/**
 * P79-A: `MullionProvider`, one responsibility per block.
 *
 * jsdom does not compute custom properties, so reach is asserted on the sheet
 * each tree holds (the `<style>` fallback, see tokenSheet.test.ts) and the
 * attribute each element carries; the browser-side proof that the values
 * resolve is `e2e/multi-instance-theme.spec.ts`.
 */

import { StrictMode, useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemeExtension } from '@mullion/theme-engine';
import { MullionProvider, useMullionPortal, useMullionScope, useMullionTheme } from '@/ui';
import { BRAND_THEME_ID, getThemeEntry } from '../provider/registry';
import { TOKEN_SHEET_ATTR } from '../provider/tokenSheet';
import { SCOPE_ATTR } from '../provider/scope';
import { UI_STYLES_ATTR, hasAdoptedUiStyles } from '../styles/uiStyles';

const bg = (id: string) => `--mullion-color-background: ${getThemeEntry(id).resolved.background};`;

function sheetsIn(root: Document | ShadowRoot): string[] {
  const parent = root instanceof Document ? root.head : root;
  return Array.from(parent.querySelectorAll(`style[${TOKEN_SHEET_ATTR}]`)).map((s) => s.textContent ?? '');
}

function sheetFor(root: Document | ShadowRoot, selector: string): string | undefined {
  return sheetsIn(root).find((css) => css.startsWith(`${selector} {`));
}

/** P79-B: the component sheet's `<style>` fallback, one per adopted root. */
function uiSheetsIn(root: Document | ShadowRoot): HTMLStyleElement[] {
  const parent = root instanceof Document ? root.head : root;
  return Array.from(parent.querySelectorAll(`style[${UI_STYLES_ATTR}]`));
}

function makeShadowHost(): { host: HTMLDivElement; shadow: ShadowRoot; mount: HTMLDivElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const mount = document.createElement('div');
  shadow.appendChild(mount);
  return { host, shadow, mount };
}

function Probe({ id = 'probe' }: { id?: string }) {
  const scope = useMullionScope();
  const manager = useMullionTheme();
  const portal = useMullionPortal();
  return (
    <span
      data-testid={id}
      data-painted={scope.themeId}
      data-scheme={scope.colorScheme}
      data-mode={scope.mode}
      data-manager-theme={manager.themeId}
      data-portal={portal.getAttribute(SCOPE_ATTR) ?? ''}
    />
  );
}

function Switcher({ to, preview = false }: { to: string; preview?: boolean }) {
  const { setTheme, setPreviewTheme } = useMullionTheme();
  return (
    <button type="button" onClick={() => (preview ? setPreviewTheme(to) : setTheme(to))}>
      switch
    </button>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  document.head.querySelectorAll(`style[${TOKEN_SHEET_ATTR}]`).forEach((n) => n.remove());
  document.body.querySelectorAll('[data-mullion-portal]').forEach((n) => n.remove());
});

// ---------------------------------------------------------------------------
// The component sheet (P79-B): one list, adopted into every root painted
// ---------------------------------------------------------------------------

describe('MullionProvider component sheet', () => {
  it('adopts the list into the scope root and the container root, once each', () => {
    const gallery = makeShadowHost();
    const overlay = makeShadowHost();
    const { unmount } = render(
      <MullionProvider theme="tokyo-night" scope={gallery.shadow} portal={overlay.mount}>
        <MullionProvider mode="lock">
          <Probe />
        </MullionProvider>
      </MullionProvider>,
      { container: gallery.mount },
    );
    expect(uiSheetsIn(gallery.shadow), 'the gallery tree').toHaveLength(1);
    expect(uiSheetsIn(overlay.shadow), 'the overlay root, where the nested container also lives').toHaveLength(1);
    expect(uiSheetsIn(document), 'nothing in the document under a shadow mount').toHaveLength(0);
    expect(uiSheetsIn(gallery.shadow)[0]?.textContent).toContain('@layer mullion.vendor, mullion.base, mullion.components;');

    unmount();
    expect(uiSheetsIn(gallery.shadow)).toHaveLength(0);
    expect(uiSheetsIn(overlay.shadow)).toHaveLength(0);
    expect(hasAdoptedUiStyles(gallery.shadow)).toBe(false);
    gallery.host.remove();
    overlay.host.remove();
  });

  it('adopts the list into the document under a light mount and shares it between two mounts', () => {
    const hostA = document.createElement('div');
    const hostB = document.createElement('div');
    document.body.append(hostA, hostB);
    const a = render(
      <MullionProvider theme="tokyo-night" scope={hostA}>
        <Probe id="a" />
      </MullionProvider>,
      { container: hostA },
    );
    const b = render(
      <MullionProvider theme="github-light" scope={hostB}>
        <Probe id="b" />
      </MullionProvider>,
      { container: hostB },
    );
    expect(uiSheetsIn(document), 'two providers, one sheet in the document').toHaveLength(1);
    a.unmount();
    expect(uiSheetsIn(document), 'the sheet stays while a provider still holds it').toHaveLength(1);
    b.unmount();
    expect(uiSheetsIn(document)).toHaveLength(0);
    hostA.remove();
    hostB.remove();
  });
});

// ---------------------------------------------------------------------------
// Scope: the four cases
// ---------------------------------------------------------------------------

describe('MullionProvider scope', () => {
  it('shadow root: writes the :host token sheet into the shadow root and nothing into the document root', () => {
    const { host, shadow, mount } = makeShadowHost();
    // Queries come from the render result: `screen` cannot see into a shadow root.
    const { getByTestId } = render(
      <MullionProvider theme="tokyo-night" scope={shadow}>
        <Probe />
      </MullionProvider>,
      { container: mount },
    );

    const css = sheetFor(shadow, ':host');
    expect(css).toContain(bg('tokyo-night'));
    expect(css).toContain('color-scheme: dark;');
    expect(sheetsIn(document).some((s) => s.startsWith(':root'))).toBe(false);
    expect(getByTestId('probe').dataset.painted).toBe('tokyo-night');
    host.remove();
  });

  it('element: stamps the scope attribute on the element and keys the document sheet on it', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const { unmount } = render(
      <MullionProvider theme="github-light" scope={el}>
        <Probe />
      </MullionProvider>,
      { container: el },
    );

    const id = el.getAttribute(SCOPE_ATTR);
    expect(id).toMatch(/^mullion-/);
    const css = sheetFor(document, `[${SCOPE_ATTR}="${id}"]`);
    expect(css).toContain(bg('github-light'));
    expect(css).toContain('color-scheme: light;');
    expect(sheetsIn(document).some((s) => s.startsWith(':root'))).toBe(false);

    unmount();
    expect(el.hasAttribute(SCOPE_ATTR)).toBe(false);
    expect(sheetsIn(document)).toEqual([]);
    el.remove();
  });

  it('document: keys the sheet on :root', () => {
    render(
      <MullionProvider theme="material-dark" scope="document">
        <Probe />
      </MullionProvider>,
    );
    expect(sheetFor(document, ':root')).toContain(bg('material-dark'));
  });

  it('omitted: renders a display:contents wrapper carrying the scope attribute', () => {
    const { container } = render(
      <MullionProvider theme="nord">
        <Probe />
      </MullionProvider>,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.style.display).toBe('contents');
    const id = wrapper.getAttribute(SCOPE_ATTR);
    expect(sheetFor(document, `[${SCOPE_ATTR}="${id}"]`)).toContain(bg('nord'));
  });
});

// ---------------------------------------------------------------------------
// Portal container
// ---------------------------------------------------------------------------

describe('MullionProvider portal', () => {
  it('creates a body-level container by default that carries the scope attribute and its sheet', () => {
    render(
      <MullionProvider theme="tokyo-night" scope="document">
        <Probe />
      </MullionProvider>,
    );
    const container = document.body.querySelector('[data-mullion-portal]') as HTMLElement;
    expect(container.parentElement).toBe(document.body);
    const id = container.getAttribute(SCOPE_ATTR)!;
    expect(screen.getByTestId('probe').dataset.portal).toBe(id);
    expect(sheetFor(document, `[${SCOPE_ATTR}="${id}"]`)).toContain(bg('tokyo-night'));
  });

  it('writes its sheet into a caller-supplied container in another shadow root (the overlay root)', () => {
    const gallery = makeShadowHost();
    const overlay = makeShadowHost();
    const { getByTestId, rerender } = render(
      <MullionProvider theme="cyberpunk" scope={gallery.shadow} portal={overlay.mount}>
        <Probe />
      </MullionProvider>,
      { container: gallery.mount },
    );

    const id = overlay.mount.getAttribute(SCOPE_ATTR)!;
    expect(id).toMatch(/^mullion-/);
    expect(sheetFor(gallery.shadow, ':host')).toContain(bg('cyberpunk'));
    expect(sheetFor(overlay.shadow, `[${SCOPE_ATTR}="${id}"]`)).toContain(bg('cyberpunk'));
    expect(document.body.querySelector('[data-mullion-portal]')).toBeNull();
    // A supplied container is stamped after the first commit; the probe sees
    // it on its next render.
    rerender(
      <MullionProvider theme="cyberpunk" scope={gallery.shadow} portal={overlay.mount}>
        <Probe />
      </MullionProvider>,
    );
    expect(getByTestId('probe').dataset.portal).toBe(id);
    gallery.host.remove();
    overlay.host.remove();
  });

  it('nests a child container inside the parent container', () => {
    render(
      <MullionProvider theme="tokyo-night" scope="document">
        <MullionProvider mode="lock">
          <Probe />
        </MullionProvider>
      </MullionProvider>,
    );
    const containers = document.body.querySelectorAll('[data-mullion-portal]');
    expect(containers).toHaveLength(2);
    const [outer, inner] = Array.from(containers) as HTMLElement[];
    expect(inner!.parentElement).toBe(outer);
    expect(screen.getByTestId('probe').dataset.portal).toBe(inner!.getAttribute(SCOPE_ATTR));
    expect(sheetFor(document, `[${SCOPE_ATTR}="${inner!.getAttribute(SCOPE_ATTR)}"]`)).toContain(bg(BRAND_THEME_ID));
  });
});

// ---------------------------------------------------------------------------
// Switching
// ---------------------------------------------------------------------------

describe('MullionProvider switching', () => {
  it('updates the sheet in place on setTheme rather than replacing the element', () => {
    const { shadow, mount, host } = makeShadowHost();
    const { getByRole, getByTestId } = render(
      <MullionProvider theme="tokyo-night" scope={shadow}>
        <Probe />
        <Switcher to="github-light" />
      </MullionProvider>,
      { container: mount },
    );
    const before = shadow.querySelector(`style[${TOKEN_SHEET_ATTR}]`);
    act(() => getByRole('button').click());
    const after = shadow.querySelector(`style[${TOKEN_SHEET_ATTR}]`);
    expect(after).toBe(before);
    expect(after?.textContent).toContain(bg('github-light'));
    expect(after?.textContent).toContain('color-scheme: light;');
    expect(getByTestId('probe').dataset.painted).toBe('github-light');
    host.remove();
  });

  it('previews without changing the selection and clears on null', () => {
    function Clear() {
      const { setPreviewTheme } = useMullionTheme();
      return <button type="button" onClick={() => setPreviewTheme(null)}>clear</button>;
    }
    render(
      <MullionProvider theme="tokyo-night" scope="document" persistence={{}}>
        <Probe />
        <Switcher to="nord" preview />
        <Clear />
      </MullionProvider>,
    );
    act(() => screen.getByRole('button', { name: 'switch' }).click());
    expect(screen.getByTestId('probe').dataset.painted).toBe('nord');
    expect(localStorage.getItem('mullion-theme-id')).toBeNull();
    act(() => screen.getByRole('button', { name: 'clear' }).click());
    expect(screen.getByTestId('probe').dataset.painted).toBe('tokyo-night');
  });

  it('falls back to the brand theme for an unknown id and ignores an unknown preview', () => {
    render(
      <MullionProvider theme="tokyo-night" scope="document">
        <Probe />
        <Switcher to="no-such" />
      </MullionProvider>,
    );
    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('probe').dataset.painted).toBe(BRAND_THEME_ID);
  });

  it('follows a changed theme prop while nothing has been selected', () => {
    const { rerender } = render(
      <MullionProvider theme="tokyo-night" scope="document">
        <Probe />
      </MullionProvider>,
    );
    rerender(
      <MullionProvider theme="github-light" scope="document">
        <Probe />
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe('github-light');
    expect(sheetFor(document, ':root')).toContain(bg('github-light'));
  });
});

// ---------------------------------------------------------------------------
// Lock and follow
// ---------------------------------------------------------------------------

describe('MullionProvider lock and follow', () => {
  function Chrome({ mode, probes = true }: { mode: 'lock' | 'follow'; probes?: boolean }) {
    return (
      <MullionProvider theme="github-light" scope="document">
        {probes && <Probe id="gallery" />}
        <MullionProvider mode={mode}>
          {probes && <Probe id="chrome" />}
          <input aria-label="inside chrome" />
          <Switcher to="nord" />
        </MullionProvider>
      </MullionProvider>
    );
  }

  it('lock paints the brand theme and follow paints the gallery theme', () => {
    const { rerender, container } = render(<Chrome mode="lock" />);
    const wrapper = container.querySelector(`[${SCOPE_ATTR}]`) as HTMLElement;
    const nestedSelector = `[${SCOPE_ATTR}="${wrapper.getAttribute(SCOPE_ATTR)}"]`;

    expect(screen.getByTestId('chrome').dataset.painted).toBe(BRAND_THEME_ID);
    expect(screen.getByTestId('chrome').dataset.mode).toBe('lock');
    expect(sheetFor(document, nestedSelector)).toContain(bg(BRAND_THEME_ID));
    expect(sheetFor(document, nestedSelector)).toContain('color-scheme: dark;');

    rerender(<Chrome mode="follow" />);
    expect(screen.getByTestId('chrome').dataset.painted).toBe('github-light');
    expect(screen.getByTestId('chrome').dataset.mode).toBe('follow');
    expect(sheetFor(document, nestedSelector)).toContain(bg('github-light'));
    expect(sheetFor(document, nestedSelector)).toContain('color-scheme: light;');
  });

  it('renders an identical element tree in both modes and keeps focus across the flip (P76-F)', () => {
    const { rerender, container } = render(<Chrome mode="lock" probes={false} />);
    const input = screen.getByLabelText('inside chrome');
    input.focus();
    expect(document.activeElement).toBe(input);
    const lockTree = container.innerHTML;
    expect(lockTree).toContain('data-mullion-scope=');

    rerender(<Chrome mode="follow" probes={false} />);
    expect(container.innerHTML).toBe(lockTree);
    expect(screen.getByLabelText('inside chrome')).toBe(input);
    expect(document.activeElement).toBe(input);
  });

  it('exposes the root switching API inside locked chrome: setTheme changes the gallery, not the lock', () => {
    render(<Chrome mode="lock" />);
    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('gallery').dataset.painted).toBe('nord');
    expect(screen.getByTestId('chrome').dataset.painted).toBe(BRAND_THEME_ID);
    expect(screen.getByTestId('chrome').dataset.managerTheme).toBe('nord');
  });

  it('a locked nested provider paints its own theme when given one', () => {
    render(
      <MullionProvider theme="github-light" scope="document">
        <MullionProvider mode="lock" theme="cyberpunk">
          <Probe />
        </MullionProvider>
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe('cyberpunk');
  });

  it('follow inherits from the nearest scope, so a follower under a lock paints the lock', () => {
    render(
      <MullionProvider theme="github-light" scope="document">
        <MullionProvider mode="lock" theme="cyberpunk">
          <MullionProvider mode="follow">
            <Probe />
          </MullionProvider>
        </MullionProvider>
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe('cyberpunk');
  });
});

// ---------------------------------------------------------------------------
// Per-instance scoping
// ---------------------------------------------------------------------------

describe('MullionProvider per-instance scoping', () => {
  it('two providers on one page hold two token sets with no bleed', () => {
    const a = makeShadowHost();
    const b = makeShadowHost();
    const first = render(
      <MullionProvider theme="tokyo-night" scope={a.shadow} instanceId="a">
        <Probe id="a" />
      </MullionProvider>,
      { container: a.mount },
    );
    const second = render(
      <MullionProvider theme="github-light" scope={b.shadow} instanceId="b">
        <Probe id="b" />
      </MullionProvider>,
      { container: b.mount },
    );

    expect(sheetFor(a.shadow, ':host')).toContain(bg('tokyo-night'));
    expect(sheetFor(a.shadow, ':host')).not.toContain(bg('github-light'));
    expect(sheetFor(b.shadow, ':host')).toContain(bg('github-light'));
    expect(sheetFor(b.shadow, ':host')).not.toContain(bg('tokyo-night'));
    expect(sheetsIn(a.shadow)).toHaveLength(1);
    expect(sheetsIn(b.shadow)).toHaveLength(1);
    expect(first.getByTestId('a').dataset.portal).toMatch(/^mullion-a-/);
    expect(second.getByTestId('b').dataset.portal).toMatch(/^mullion-b-/);
    a.host.remove();
    b.host.remove();
  });

  // [P79-D] The storage key is scoped by `persistence.scope`, not by
  // `instanceId`. P79-A used `instanceId` for both because it had one id to
  // work with; the app has two, and the React root id this one carries is a
  // new value on every mount. See the P79-D notes, finding 1.
  it('scopes the storage key by the persistence scope, not the provider id', () => {
    render(
      <MullionProvider
        theme="tokyo-night"
        scope="document"
        persistence={{ scope: 'one' }}
        instanceId="react-root-1"
      >
        <Switcher to="nord" />
      </MullionProvider>,
    );
    act(() => screen.getByRole('button').click());
    expect(localStorage.getItem('mullion-theme-id-one')).toBe('nord');
    expect(localStorage.getItem('mullion-theme-id-react-root-1')).toBeNull();
    expect(localStorage.getItem('mullion-theme-id')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe('MullionProvider persistence', () => {
  it('restores a stored choice above the theme prop when allowed', () => {
    localStorage.setItem('mullion-theme-id', 'nord');
    render(
      <MullionProvider theme="tokyo-night" scope="document" persistence={{}}>
        <Probe />
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe('nord');
  });

  it('ignores a stored id that is not registered', () => {
    localStorage.setItem('mullion-theme-id', 'gone');
    render(
      <MullionProvider theme="tokyo-night" scope="document" persistence={{}}>
        <Probe />
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe('tokyo-night');
  });

  it('neither reads nor writes storage when persistence is omitted or disallowed', () => {
    localStorage.setItem('mullion-theme-id', 'nord');
    const { unmount } = render(
      <MullionProvider theme="tokyo-night" scope="document">
        <Probe />
        <Switcher to="cyberpunk" />
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe('tokyo-night');
    act(() => screen.getByRole('button').click());
    expect(localStorage.getItem('mullion-theme-id')).toBe('nord');
    unmount();

    render(
      <MullionProvider theme="tokyo-night" scope="document" persistence={{ key: 'k', allowed: false }}>
        <Switcher to="cyberpunk" />
      </MullionProvider>,
    );
    act(() => screen.getByRole('button').click());
    expect(localStorage.getItem('k')).toBeNull();
  });

  it('writes to a custom key', () => {
    render(
      <MullionProvider theme="tokyo-night" scope="document" persistence={{ key: 'custom-key' }}>
        <Switcher to="cyberpunk" />
      </MullionProvider>,
    );
    act(() => screen.getByRole('button').click());
    expect(localStorage.getItem('custom-key')).toBe('cyberpunk');
  });
});

// ---------------------------------------------------------------------------
// Runtime themes
// ---------------------------------------------------------------------------

describe('MullionProvider runtime themes', () => {
  const custom: ThemeExtension = {
    ...getThemeEntry('tokyo-night').definition,
    id: 'runtime-ok',
    name: 'Runtime',
  };

  it('registers a definition passed as the theme prop and paints it', async () => {
    function Count() {
      const { themes } = useMullionTheme();
      return <span data-testid="count">{themes.length}</span>;
    }
    render(
      <MullionProvider theme={custom} scope="document">
        <Probe />
        <Count />
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe('runtime-ok');
    expect(sheetFor(document, ':root')).toContain(bg('runtime-ok'));
    await act(async () => {});
    expect(getThemeEntry('runtime-ok').custom).toBe(true);
    expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThan(23);
  });

  it('refuses a definition that fails the audits, warns, and paints the brand theme', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bad: ThemeExtension = {
      ...custom,
      id: 'runtime-bad',
      colors: { ...custom.colors, text: '#1c1d28', textMuted: '#1c1d28' },
    };
    render(
      <MullionProvider theme={bad} scope="document">
        <Probe />
      </MullionProvider>,
    );
    expect(screen.getByTestId('probe').dataset.painted).toBe(BRAND_THEME_ID);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('runtime-bad'));
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// Hooks and teardown
// ---------------------------------------------------------------------------

describe('MullionProvider hooks and teardown', () => {
  it('hooks throw outside a provider', () => {
    const silence = vi.spyOn(console, 'error').mockImplementation(() => {});
    function Naked() {
      useMullionTheme();
      return null;
    }
    expect(() => render(<Naked />)).toThrow(/useMullionTheme\(\) was called outside/);
    silence.mockRestore();
  });

  it('removes every sheet and its container on unmount', () => {
    const { shadow, mount, host } = makeShadowHost();
    const { unmount } = render(
      <MullionProvider theme="tokyo-night" scope={shadow}>
        <Probe />
      </MullionProvider>,
      { container: mount },
    );
    expect(sheetsIn(shadow)).toHaveLength(1);
    expect(document.body.querySelector('[data-mullion-portal]')).not.toBeNull();
    unmount();
    expect(sheetsIn(shadow)).toHaveLength(0);
    expect(sheetsIn(document)).toHaveLength(0);
    expect(document.body.querySelector('[data-mullion-portal]')).toBeNull();
    host.remove();
  });

  it('survives StrictMode double-mounting without duplicating sheets', () => {
    const { shadow, mount, host } = makeShadowHost();
    function Spy() {
      useEffect(() => undefined, []);
      return <Probe />;
    }
    render(
      <StrictMode>
        <MullionProvider theme="tokyo-night" scope={shadow}>
          <Spy />
        </MullionProvider>
      </StrictMode>,
      { container: mount },
    );
    expect(sheetsIn(shadow)).toHaveLength(1);
    expect(document.body.querySelectorAll('[data-mullion-portal]')).toHaveLength(1);
    host.remove();
  });
});
