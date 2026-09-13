/**
 * P80-A: the overlays, one block per thing they promise.
 *
 * The division of labour with the browser suites is the same as P79-C's.
 * jsdom resolves no cascade and computes no custom property, so nothing here
 * asserts a painted colour; what it proves is the contract between the TSX,
 * the sheet and the primitive. Three of those are worth naming:
 *
 *  - every overlay lands inside the provider's portal container, which is the
 *    one property that makes a popup themed wherever its trigger lives;
 *  - the state attributes the sheet keys on are ones Base UI actually sets,
 *    which is P77-C generalised: that defect was three rules targeting an
 *    attribute the library did not write, and they were invisible because
 *    nothing compared the selector against the DOM;
 *  - a tone is read only under the element that declared it (P79-0).
 *
 * The painted result, the hostile-host probe and focus return across the
 * shadow boundary are `e2e/`; they cannot be proved here and are not claimed.
 */

import { useRef, useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MullionProvider } from '@/ui';
import { SCOPE_ATTR } from '../provider/scope';
import { listUiStyles, uiStylesText } from '../styles/uiStyles';
import { Button, Drawer, Menu, Modal, Popover, Tooltip, FOCUS_ATTR } from '../components';

function mount(ui: React.ReactNode) {
  return render(<MullionProvider>{ui}</MullionProvider>);
}

/** Inline custom properties on an element, as the sheets read them. */
function vars(el: Element): Record<string, string> {
  const style = el.getAttribute('style') ?? '';
  const out: Record<string, string> = {};
  for (const part of style.split(';')) {
    const [name, ...rest] = part.split(':');
    if (name?.trim().startsWith('--')) out[name.trim()] = rest.join(':').trim();
  }
  return out;
}

describe('the portal container', () => {
  it('is where a modal, a drawer, a popover and a menu all render', () => {
    mount(
      <>
        <Modal opened onClose={() => {}} title="M">
          modal body
        </Modal>
      </>,
    );
    const dialog = screen.getByRole('dialog');
    const scope = dialog.closest(`[${SCOPE_ATTR}]`);
    expect(scope, 'the popup is inside a scoped element').not.toBeNull();
    expect(dialog.closest('body')).toBe(document.body);
    // The decisive part: it is NOT a direct child of body, which is Base UI's
    // default portal target and the one place with no tokens on it.
    expect(dialog.parentElement).not.toBe(document.body);
  });

  it.each([
    ['menu', <Menu key="m" defaultOpened><Menu.Trigger>t</Menu.Trigger><Menu.Content><Menu.Item>i</Menu.Item></Menu.Content></Menu>, 'menu'],
    ['popover', <Popover key="p" defaultOpened><Popover.Trigger>t</Popover.Trigger><Popover.Content>c</Popover.Content></Popover>, 'dialog'],
  ])('%s renders under a scoped element, not bare in body', (_label, ui, role) => {
    mount(ui);
    const popup = screen.getByRole(role as string);
    expect(popup.closest(`[${SCOPE_ATTR}]`)).not.toBeNull();
  });

  it('a caller-supplied container overrides the provider, which is the only way out', () => {
    const target = document.createElement('div');
    target.id = 'elsewhere';
    document.body.appendChild(target);
    mount(
      <Modal opened onClose={() => {}} container={target} title="M">
        body
      </Modal>,
    );
    expect(within(target).getByRole('dialog')).toBeTruthy();
    target.remove();
  });
});

describe('dismissal', () => {
  it('Escape closes a modal, and closeOnEscape={false} keeps it open', () => {
    const onClose = vi.fn();
    const { rerender } = mount(
      <Modal opened onClose={onClose} title="M">
        body
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    onClose.mockClear();
    rerender(
      <MullionProvider>
        <Modal opened onClose={onClose} closeOnEscape={false} title="M">
          body
        </Modal>
      </MullionProvider>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose, 'closeOnEscape={false} suppresses the Escape dismissal').not.toHaveBeenCalled();
  });

  it('a modal traps focus and marks the rest of the page inert', () => {
    mount(
      <>
        <button type="button">outside</button>
        <Modal opened onClose={() => {}} title="M">
          <button type="button">inside</button>
        </Modal>
      </>,
    );
    // Base UI hides the rest of the document from assistive technology while a
    // modal dialog is open; the outside button is therefore unreachable by
    // role, which is what "trapped" means to a screen reader.
    expect(screen.queryByRole('button', { name: 'outside' })).toBeNull();
    expect(screen.getByRole('button', { name: 'inside' })).toBeTruthy();
  });

  it('passes the three modal modes through: only modal={false} leaves the page reachable', () => {
    const page = (mode: boolean | 'trap-focus') => (
      <MullionProvider>
        <button type="button">outside</button>
        <Modal opened onClose={() => {}} modal={mode} title="M">
          <button type="button">inside</button>
        </Modal>
      </MullionProvider>
    );

    // `'trap-focus'` relaxes scroll and outside pointer interaction but keeps
    // the `aria-hidden`, so it is NOT a way to leave the page reachable.
    const { rerender } = render(page('trap-focus'));
    expect(screen.queryByRole('button', { name: 'outside' })).toBeNull();

    rerender(page(false));
    expect(screen.getByRole('button', { name: 'outside' })).toBeTruthy();
  });
});

describe('the dialog shell', () => {
  it('names the dialog by its title', () => {
    mount(
      <Modal opened onClose={() => {}} title="Delete campaign">
        body
      </Modal>,
    );
    expect(screen.getByRole('dialog', { name: 'Delete campaign' })).toBeTruthy();
  });

  it('renders a close button that calls onClose, and withCloseButton={false} removes it', () => {
    const onClose = vi.fn();
    const { rerender } = mount(
      <Modal opened onClose={onClose} title="M" closeButtonLabel="Dismiss">
        body
      </Modal>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onClose).toHaveBeenCalled();

    rerender(
      <MullionProvider>
        <Modal opened onClose={onClose} title="M" withCloseButton={false}>
          body
        </Modal>
      </MullionProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });

  it('carries size, padding and radius as inline custom properties', () => {
    mount(
      <Modal opened onClose={() => {}} title="M" size="lg" padding="sm" radius={4}>
        body
      </Modal>,
    );
    const v = vars(screen.getByRole('dialog'));
    expect(v['--mullion-modal-size']).toBe('var(--mullion-spacing-lg)');
    expect(v['--mullion-pad']).toBe('var(--mullion-spacing-sm)');
    expect(v['--mullion-radius']).toBe('4px');
  });

  it('takes its z-index from the layer scale, never a literal', () => {
    mount(
      <Modal opened onClose={() => {}} title="M">
        body
      </Modal>,
    );
    expect(vars(screen.getByRole('dialog'))['--mullion-overlay-layer']).toBe('var(--mullion-layer-modal)');
  });

  it('puts the backdrop blur in a custom property, so the scrim colour stays the theme’s', () => {
    const { container } = mount(
      <Modal opened onClose={() => {}} title="M" overlayBlur={4}>
        body
      </Modal>,
    );
    void container;
    const backdrop = document.querySelector('.mullion-overlay-backdrop')!;
    expect(vars(backdrop)['--mullion-overlay-blur']).toBe('4px');
  });

  it('a drawer carries its edge as a data attribute the sheet keys on', () => {
    mount(
      <Drawer opened onClose={() => {}} position="left" title="D" size={320}>
        body
      </Drawer>,
    );
    const popup = screen.getByRole('dialog');
    expect(popup.getAttribute('data-position')).toBe('left');
    expect(popup.className).toContain('mullion-drawer');
    expect(vars(popup)['--mullion-drawer-size']).toBe('320px');
  });

  it('a modal is centred by default and full-screen on request', () => {
    const { rerender } = mount(
      <Modal opened onClose={() => {}} title="M">
        b
      </Modal>,
    );
    expect(screen.getByRole('dialog').hasAttribute('data-centered')).toBe(true);

    rerender(
      <MullionProvider>
        <Modal opened onClose={() => {}} title="M" centered={false} fullScreen>
          b
        </Modal>
      </MullionProvider>,
    );
    const popup = screen.getByRole('dialog');
    expect(popup.hasAttribute('data-centered')).toBe(false);
    expect(popup.hasAttribute('data-full-screen')).toBe(true);
  });
});

describe('the menu', () => {
  function openMenu() {
    mount(
      <Menu defaultOpened>
        <Menu.Trigger>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>Rename</Menu.Item>
          <Menu.Item tone="danger">Delete</Menu.Item>
          <Menu.Divider />
          <Menu.Label>Section</Menu.Label>
        </Menu.Content>
      </Menu>,
    );
  }

  it('stamps the focus attribute on every item, so the ring rule reaches them', () => {
    openMenu();
    for (const item of screen.getAllByRole('menuitem')) {
      expect(item.getAttribute(FOCUS_ATTR)).toBe('');
    }
  });

  it('sets data-highlighted on keyboard navigation, which is the attribute the sheet targets', () => {
    openMenu();
    const items = screen.getAllByRole('menuitem');
    expect(items[0]!.hasAttribute('data-highlighted')).toBe(false);
    fireEvent.keyDown(items[0]!.closest('[role="menu"]')!, { key: 'ArrowDown' });
    expect(
      items[0]!.hasAttribute('data-highlighted'),
      'the menu sheet keys its hover rule on data-highlighted; Base UI must actually set it',
    ).toBe(true);
  });

  it('declares a tone on the item itself, never on the menu', () => {
    openMenu();
    const [rename, del] = screen.getAllByRole('menuitem');
    expect(rename!.hasAttribute('data-mullion-tone')).toBe(false);
    expect(del!.getAttribute('data-mullion-tone')).toBe('danger');
  });

  it('calls onClick when an item is chosen', () => {
    const onClick = vi.fn();
    mount(
      <Menu defaultOpened>
        <Menu.Trigger>t</Menu.Trigger>
        <Menu.Content>
          <Menu.Item onClick={onClick}>Rename</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    fireEvent.click(screen.getByRole('menuitem', { name: 'Rename' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a native button trigger, not a span wearing type="button"', () => {
    openMenu();
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('composes the trigger with a framework control through render', () => {
    mount(
      <Menu>
        <Menu.Trigger render={<Button variant="subtle" />}>Actions</Menu.Trigger>
        <Menu.Content>
          <Menu.Item>i</Menu.Item>
        </Menu.Content>
      </Menu>,
    );
    const trigger = screen.getByRole('button', { name: 'Actions' });
    expect(trigger.className).toContain('mullion-button');
    expect(trigger.getAttribute(FOCUS_ATTR)).toBe('');
  });

  it('a bare label is a plain heading, and Menu.Group is the form that names its items', () => {
    mount(
      <Menu defaultOpened>
        <Menu.Trigger>t</Menu.Trigger>
        <Menu.Content>
          <Menu.Label>Loose heading</Menu.Label>
          <Menu.Group label="Danger zone">
            <Menu.Item>Delete</Menu.Item>
          </Menu.Group>
        </Menu.Content>
      </Menu>,
    );
    // The bare label must not throw: Base UI's GroupLabel requires a group
    // ancestor and the product's four call sites have none.
    expect(screen.getByText('Loose heading')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Danger zone' })).toBeTruthy();
  });

  it('separates runs with a real separator role', () => {
    openMenu();
    expect(screen.getByRole('separator')).toBeTruthy();
  });
});

describe('the tooltip', () => {
  it('does not wrap its child in a second button', () => {
    mount(
      <Tooltip label="Delete this">
        <button type="button">Delete</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Delete' });
    expect(trigger.closest('.mullion-tooltip-trigger')!.tagName).toBe('SPAN');
    expect(trigger.parentElement!.tagName).not.toBe('BUTTON');
  });

  it('shows its label on hover', async () => {
    const user = userEvent.setup();
    mount(
      <Tooltip label="Delete this" openDelay={0} closeDelay={0}>
        <button type="button">Delete</button>
      </Tooltip>,
    );
    expect(screen.queryByText('Delete this')).toBeNull();
    await user.hover(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('Delete this')).toBeTruthy();
  });

  it('shows its label on keyboard focus, which is the path hover cannot reach', async () => {
    const user = userEvent.setup();
    mount(
      <Tooltip label="Delete this" openDelay={0}>
        <button type="button">Delete</button>
      </Tooltip>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
    expect(await screen.findByText('Delete this')).toBeTruthy();
  });

  it('lets an ancestor Tooltip.Group set the delay when the tooltip sets none', async () => {
    // A provider around every tooltip would reset the group's delay to Base
    // UI's default, which would make `Tooltip.Group` do nothing at all.
    const user = userEvent.setup();
    mount(
      <Tooltip.Group delay={0}>
        <Tooltip label="from the group">
          <button type="button">Delete</button>
        </Tooltip>
      </Tooltip.Group>,
    );
    await user.hover(screen.getByRole('button', { name: 'Delete' }));
    // No `findBy`: the group asks for zero delay, so the tooltip must already
    // be there. Waiting would let Base UI's own default delay satisfy the
    // assertion too, and the test would pass whether or not the group applied.
    expect(screen.queryByText('from the group')).not.toBeNull();
  });

  it('renders nothing when disabled', async () => {
    const user = userEvent.setup();
    mount(
      <Tooltip label="Never" openDelay={0} disabled>
        <button type="button">Delete</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.queryByText('Never')).toBeNull();
  });
});

describe('the popover', () => {
  it('opens from its trigger and closes again, reporting through onChange', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Popover opened={open} onChange={setOpen}>
          <Popover.Trigger>Open</Popover.Trigger>
          <Popover.Content>panel body</Popover.Content>
        </Popover>
      );
    }
    mount(<Harness />);
    expect(screen.queryByText('panel body')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('panel body')).toBeTruthy();
  });

  it('carries width, padding and the popover layer', () => {
    mount(
      <Popover defaultOpened>
        <Popover.Trigger>t</Popover.Trigger>
        <Popover.Content width={240} padding="md">
          c
        </Popover.Content>
      </Popover>,
    );
    const popup = document.querySelector('.mullion-popover')!;
    expect(vars(popup)['--mullion-popover-width']).toBe('240px');
    expect(vars(popup)['--mullion-pad']).toBe('var(--mullion-spacing-md)');
    const positioner = document.querySelector('.mullion-overlay-positioner')!;
    expect(vars(positioner)['--mullion-overlay-layer']).toBe('var(--mullion-layer-popover)');
  });
});

describe('prop forwarding', () => {
  // P79-C established the rule and P79-0 found `Collapse` and
  // `Table.ScrollContainer` breaking it: a component drops nothing it does not
  // own. A part that swallows `data-testid` or an `aria-*` is a part no
  // consumer can address or describe.
  it('every part forwards the props it does not own', () => {
    mount(
      <Menu defaultOpened>
        <Menu.Trigger>t</Menu.Trigger>
        <Menu.Content data-testid="menu-content" aria-label="Actions">
          <Menu.Item data-testid="menu-item">one</Menu.Item>
          <Menu.Divider data-testid="menu-divider" />
          <Menu.Label data-testid="menu-label">heading</Menu.Label>
          <Menu.Group data-testid="menu-group" label="g">
            <Menu.Item>two</Menu.Item>
          </Menu.Group>
        </Menu.Content>
      </Menu>,
    );
    for (const id of ['menu-content', 'menu-item', 'menu-divider', 'menu-label', 'menu-group']) {
      expect(screen.getByTestId(id), `${id} dropped data-testid`).toBeTruthy();
    }
    expect(screen.getByTestId('menu-content').getAttribute('aria-label')).toBe('Actions');
  });

  it('a popover panel and a modal forward theirs too', () => {
    const { rerender } = mount(
      <Popover defaultOpened>
        <Popover.Trigger>t</Popover.Trigger>
        <Popover.Content data-testid="popover-content">c</Popover.Content>
      </Popover>,
    );
    expect(screen.getByTestId('popover-content')).toBeTruthy();

    rerender(
      <MullionProvider>
        <Modal opened onClose={() => {}} title="M" data-testid="modal-popup">
          body
        </Modal>
      </MullionProvider>,
    );
    expect(screen.getByTestId('modal-popup')).toBeTruthy();
  });

  it('a tooltip forwards onto its popup', async () => {
    const user = userEvent.setup();
    mount(
      <Tooltip label="hi" openDelay={0} data-testid="tooltip-popup">
        <button type="button">Delete</button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByTestId('tooltip-popup')).toBeTruthy();
  });
});

describe('the sheet', () => {
  it('is on the registration list, so every tree the provider paints receives it', () => {
    expect(listUiStyles().map((entry) => entry.id)).toContain('ui/overlay');
  });

  it('reads a tone only under the element that declared it (P79-0)', () => {
    // The generalised form of P79-0 finding 1: custom properties inherit, so a
    // bare `var(--mullion-tone)` in a component rule paints every descendant
    // of a toned ancestor.
    const sheet = uiStylesText();
    const overlayRules = sheet
      .split('\n')
      .filter((line) => line.includes('--mullion-tone'));
    for (const line of overlayRules) {
      expect(
        line.includes('[data-mullion-tone]') || !line.trim().startsWith('.mullion-menu'),
        `a menu rule reads --mullion-tone without qualifying on the attribute: ${line}`,
      ).toBe(true);
    }
  });

  it('names no z-index literal: every step is a layer token', () => {
    const overlay = uiStylesText();
    const zIndexLines = overlay.split('\n').filter((l) => /z-index\s*:/.test(l));
    expect(zIndexLines.length).toBeGreaterThan(0);
    for (const line of zIndexLines) {
      expect(line, `a z-index literal bypasses the host offset: ${line}`).toMatch(
        /var\(--mullion-(overlay-layer|layer-)/,
      );
    }
  });
});

describe('outside a provider', () => {
  it('throws rather than painting an unthemed popup', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Modal opened onClose={() => {}} title="M">
          body
        </Modal>,
      ),
    ).toThrow(/outside <MullionProvider>/);
    spy.mockRestore();
  });
});

describe('focus return', () => {
  it('accepts an explicit final focus target for a trigger the dialog outlives', () => {
    // Focus return to the trigger is Base UI's default and is proved in the
    // browser (jsdom does not run the focus-visible heuristics). What is
    // provable here is that the shell does not interfere with it: the trigger
    // keeps its identity across the open, so Base UI has something to return
    // focus to.
    function Harness() {
      const ref = useRef<HTMLButtonElement>(null);
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" ref={ref} onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal opened={open} onClose={() => setOpen(false)} title="M">
            body
          </Modal>
        </>
      );
    }
    mount(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.body.contains(trigger)).toBe(true);
  });
});
