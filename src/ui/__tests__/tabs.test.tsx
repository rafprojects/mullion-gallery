/**
 * P80-B: tabs, the segmented control and the accordion.
 *
 * These three are where P77-C found rules that had never painted, and all
 * three losses had one cause: the adapter set the colour as an INLINE style on
 * the part, so a sheet rule on the same property could not win. What is worth
 * guarding is therefore not "the colour is right" but "the state the sheet
 * keys on is a state the primitive sets, and nothing sets it inline".
 *
 * The keyboard contracts are the ARIA Authoring Practices ones: a tab list is
 * one tab stop with arrow keys inside it, a segmented control is a radio group
 * with the same, and an accordion's headers take arrow keys too.
 */

import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MullionProvider } from '@/ui';
import { expectNoA11yViolations } from '@/test/axe';
import { uiStylesText } from '../styles/uiStyles';
import { Accordion, SegmentedControl, Tabs } from '../components';

const mount = (ui: React.ReactNode) => render(<MullionProvider>{ui}</MullionProvider>);

function TabFixture({ onChange }: { onChange?: (v: string | null) => void } = {}) {
  return (
    <Tabs defaultValue="one" {...(onChange ? { onChange } : {})}>
      <Tabs.List aria-label="Sections">
        <Tabs.Tab value="one">First</Tabs.Tab>
        <Tabs.Tab value="two">Second</Tabs.Tab>
        <Tabs.Tab value="three" disabled>
          Third
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="one">first panel</Tabs.Panel>
      <Tabs.Panel value="two">second panel</Tabs.Panel>
      <Tabs.Panel value="three">third panel</Tabs.Panel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('wires the tab list, the tabs and their panels', () => {
    mount(<TabFixture />);
    const list = screen.getByRole('tablist', { name: 'Sections' });
    expect(within(list).getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tabpanel').textContent).toBe('first panel');
  });

  it('is one tab stop, with the arrow keys inside it and Enter to select', async () => {
    /*
     * Manual activation, which is a deliberate change from the product's
     * current behaviour: arrowing moves focus and Enter selects. The Authoring
     * Practices ask for this when a panel is expensive, and the Admin Panel's
     * seven tabs each load their own data.
     */
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<TabFixture onChange={onChange} />);
    const tabs = screen.getAllByRole('tab');

    tabs[0]!.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(tabs[1]));
    expect(onChange, 'moving focus must not select').not.toHaveBeenCalled();

    await user.keyboard('{Enter}');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('two'));
  });

  it('selects as it moves when the caller asks for it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(
      <Tabs defaultValue="one" onChange={onChange}>
        <Tabs.List aria-label="S" activateOnFocus>
          <Tabs.Tab value="one">First</Tabs.Tab>
          <Tabs.Tab value="two">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">first</Tabs.Panel>
        <Tabs.Panel value="two">second</Tabs.Panel>
      </Tabs>,
    );
    screen.getByRole('tab', { name: 'First' }).focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('two'));
  });

  it('lets a disabled tab be reached but not selected', async () => {
    /*
     * Base UI keeps a disabled tab focusable and marks it `aria-disabled`,
     * rather than removing it from the sequence. That is the accessible
     * choice: a keyboard user discovers that the tab exists and is
     * unavailable, instead of it silently not being there.
     */
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<TabFixture onChange={onChange} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs[2]!.getAttribute('aria-disabled')).toBe('true');

    tabs[1]!.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(document.activeElement).toBe(tabs[2]));
    await user.keyboard('{Enter}');
    expect(onChange, 'a disabled tab was selected').not.toHaveBeenCalledWith('three');
  });

  it('shows the panel of the tab that is selected', async () => {
    const user = userEvent.setup();
    mount(<TabFixture />);
    await user.click(screen.getByRole('tab', { name: 'Second' }));
    await waitFor(() => expect(screen.getByRole('tabpanel').textContent).toBe('second panel'));
  });

  it('keeps a panel mounted when asked, so its state survives a switch', async () => {
    const user = userEvent.setup();
    mount(
      <Tabs defaultValue="one">
        <Tabs.List aria-label="S">
          <Tabs.Tab value="one">First</Tabs.Tab>
          <Tabs.Tab value="two">Second</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one" keepMounted>
          <span data-testid="kept" />
        </Tabs.Panel>
        <Tabs.Panel value="two">second</Tabs.Panel>
      </Tabs>,
    );
    await user.click(screen.getByRole('tab', { name: 'Second' }));
    expect(screen.queryByTestId('kept'), 'the kept panel unmounted').not.toBeNull();
  });
});

describe('SegmentedControl', () => {
  const DATA = ['grid', 'list', 'map'];

  it('is a radio group, which is the pattern for picking one value', () => {
    mount(<SegmentedControl data={DATA} defaultValue="grid" aria-label="View" />);
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'grid' }).getAttribute('aria-checked')).toBe('true');
  });

  it('accepts bare strings and labelled objects, as its call sites pass both', () => {
    mount(
      <SegmentedControl
        aria-label="Mode"
        data={['auto', { value: 'manual', label: 'By hand' }]}
        defaultValue="auto"
      />,
    );
    expect(screen.getByRole('radio', { name: 'auto' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'By hand' })).toBeTruthy();
  });

  it('hands onChange the value and moves with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<SegmentedControl data={DATA} defaultValue="grid" onChange={onChange} aria-label="View" />);
    screen.getByRole('radio', { name: 'grid' }).focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('list'));
    expect(onChange.mock.calls.every(([v]) => typeof v === 'string')).toBe(true);
  });

  it('does not animate the indicator into place on mount', () => {
    /*
     * Found in Chromium: the indicator slid in from zero width at the left
     * edge on every mount, because its first resolved style has no
     * measurement in it and the transition then ran from that. The transition
     * is gated on `data-ready`, which arrives a frame later, and this pins the
     * mechanism rather than the appearance.
     */
    const { container } = mount(<SegmentedControl data={DATA} defaultValue="grid" aria-label="View" />);
    const group = container.querySelector('.mullion-segmented') as HTMLElement;
    expect(group.hasAttribute('data-ready'), 'the transition is live on the first render').toBe(false);
  });

  it('turns the transition on once it has measured', async () => {
    const { container } = mount(<SegmentedControl data={DATA} defaultValue="grid" aria-label="View" />);
    const group = container.querySelector('.mullion-segmented') as HTMLElement;
    await waitFor(() => expect(group.hasAttribute('data-ready')).toBe(true));
  });

  it('publishes the checked segment’s box, which is what moves the indicator', async () => {
    const user = userEvent.setup();
    const { container } = mount(<SegmentedControl data={DATA} defaultValue="grid" aria-label="View" />);
    const group = container.querySelector('.mullion-segmented') as HTMLElement;
    // jsdom reports every box as zero, so what is assertable here is that the
    // properties are written at all and that they follow the checked segment.
    // The painted position is measured in `e2e/ui-selects.spec.ts`.
    expect(group.style.getPropertyValue('--mullion-segment-width')).not.toBe('');
    await user.click(screen.getByRole('radio', { name: 'map' }));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'map' }).hasAttribute('data-checked')).toBe(true),
    );
  });
});

describe('Accordion', () => {
  function AccordionFixture(props: { multiple?: boolean }) {
    return (
      <Accordion defaultValue="a" {...props}>
        <Accordion.Item value="a">
          <Accordion.Control>Appearance</Accordion.Control>
          <Accordion.Panel>appearance body</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Control>Behaviour</Accordion.Control>
          <Accordion.Panel>behaviour body</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    );
  }

  it('gives every section a header button that reports its state', () => {
    mount(<AccordionFixture />);
    expect(screen.getByRole('button', { name: 'Appearance' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Behaviour' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes the open section when another opens, unless multiple is set', async () => {
    const user = userEvent.setup();
    const { rerender } = mount(<AccordionFixture />);
    await user.click(screen.getByRole('button', { name: 'Behaviour' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Appearance' }).getAttribute('aria-expanded')).toBe('false'),
    );

    rerender(
      <MullionProvider>
        <AccordionFixture multiple />
      </MullionProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Appearance' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Appearance' }).getAttribute('aria-expanded')).toBe('true'),
    );
  });

  it('hands onChange an array of open values in both modes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(
      <Accordion multiple defaultValue={['a']} onChange={onChange}>
        <Accordion.Item value="a">
          <Accordion.Control>A</Accordion.Control>
          <Accordion.Panel>a</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Control>B</Accordion.Control>
          <Accordion.Panel>b</Accordion.Panel>
        </Accordion.Item>
      </Accordion>,
    );
    await user.click(screen.getByRole('button', { name: 'B' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(Array.isArray(onChange.mock.calls.at(-1)![0])).toBe(true);
    expect(onChange.mock.calls.at(-1)![0]).toContain('b');
  });

  it('takes a single string value, which is how seven call sites hold it', () => {
    mount(
      <Accordion value="b">
        <Accordion.Item value="a">
          <Accordion.Control>A</Accordion.Control>
          <Accordion.Panel>a</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Control>B</Accordion.Control>
          <Accordion.Panel>b</Accordion.Panel>
        </Accordion.Item>
      </Accordion>,
    );
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('gives every header its own tab stop, which is the current APG pattern', async () => {
    /*
     * Roving focus was removed from the accordion pattern in
     * w3c/aria-practices#3434 and Base UI followed, so `orientation` and
     * `loopFocus` are deprecated no-ops there. Headers are reached with Tab,
     * not with the arrow keys, and this is the assertion that says so rather
     * than a comment claiming it.
     */
    const user = userEvent.setup();
    mount(<AccordionFixture />);
    const first = screen.getByRole('button', { name: 'Appearance' });
    const second = screen.getByRole('button', { name: 'Behaviour' });
    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement, 'an arrow key must not move between headers').toBe(first);
    await user.tab();
    await waitFor(() => expect(document.activeElement).toBe(second));
  });
});

describe('the structural axe gate', () => {
  it('all three pass with labels, a disabled item and a closed section', async () => {
    function Harness() {
      const [tab, setTab] = useState<string | null>('one');
      return (
        <>
          <Tabs value={tab} onChange={setTab}>
            <Tabs.List aria-label="Sections">
              <Tabs.Tab value="one">First</Tabs.Tab>
              <Tabs.Tab value="two" disabled>
                Second
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="one">first</Tabs.Panel>
            <Tabs.Panel value="two">second</Tabs.Panel>
          </Tabs>
          <SegmentedControl aria-label="View" data={['grid', 'list']} defaultValue="grid" />
          <Accordion defaultValue="a">
            <Accordion.Item value="a">
              <Accordion.Control>Open one</Accordion.Control>
              <Accordion.Panel>body</Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="b">
              <Accordion.Control>Closed one</Accordion.Control>
              <Accordion.Panel>body</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </>
      );
    }
    const { container } = mount(<Harness />);
    await expectNoA11yViolations(container);
  });
});

describe('the sheet', () => {
  const blocks = () => uiStylesText().split('}');

  it('carries the active tab’s weight as a property, not as a declaration', () => {
    /*
     * The P77-C defect, and it was reintroduced in `chrome-portable.scss` as
     * recently as P80-A: `styles.tab.fontWeight` is an inline style that
     * outranks any sheet rule, so a rule setting `font-weight` on the active
     * tab would never paint. A custom property has nothing to outrank.
     */
    const active = blocks().find((b) => /\.mullion-tabs-tab\[data-[a-z-]+\]\s*\{[^}]*--mullion-tabs-tab-weight/.test(`${b}}`));
    expect(active, 'the active-tab rule is missing').toBeDefined();
    expect(active, 'the active tab must not declare a weight directly').not.toMatch(
      /\n\s*font-weight:/,
    );
  });

  it.each([
    ['a tab', '.mullion-tabs-tab', '--mullion-tabs-tab-weight', () => screen.getAllByRole('tab')[0]!],
    ['a segment', '.mullion-segmented-item', '--mullion-segment-weight', () => screen.getAllByRole('radio')[0]!],
    ['an accordion control', '.mullion-accordion-control', 'rotate\\(180deg\\)', () => screen.getAllByRole('button')[0]!],
  ])('keys %s’s active rule on an attribute the primitive writes', (_name, selector, marker, pick) => {
    /*
     * P77-C generalised, and it caught a real one in this batch: the tab's
     * active rule was written against `data-selected` and Base UI writes
     * `data-active`, so it never painted. Grepping the sheet for a colour is
     * not enough; the attribute name has to be read back out of the rule and
     * compared against the DOM.
     */
    const escaped = selector.replace('.', '\\.');
    // The attribute may head a descendant selector (the accordion's chevron
    // turns under `[data-panel-open]`), so the match stops at the brace rather
    // than requiring one immediately.
    const rule = blocks().find((b) =>
      new RegExp(`${escaped}\\[(data-[a-z-]+)\\][^{]*\\{[^}]*${marker}`).test(`${b}}`),
    );
    expect(rule, `no active-state rule found for ${selector}`).toBeDefined();
    const attr = new RegExp(`${escaped}\\[(data-[a-z-]+)\\]`).exec(rule!)?.[1];
    expect(attr).toBeTruthy();

    mount(
      <>
        <Tabs defaultValue="one">
          <Tabs.List aria-label="S">
            <Tabs.Tab value="one">First</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">first</Tabs.Panel>
        </Tabs>
        <SegmentedControl aria-label="V" data={['grid']} defaultValue="grid" />
        <Accordion defaultValue="a">
          <Accordion.Item value="a">
            <Accordion.Control>A</Accordion.Control>
            <Accordion.Panel>a</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </>,
    );
    expect(
      pick().hasAttribute(attr!),
      `the sheet styles ${selector}[${attr}] and the active element does not carry it`,
    ).toBe(true);
  });

  it('reads every tab colour from the audited tier', () => {
    const css = uiStylesText();
    expect(css).toContain('var(--mullion-tab-color)');
    expect(css).toContain('var(--mullion-tab-active-color)');
    expect(css).toContain('var(--mullion-tab-indicator-color)');
  });

  it('moves the tab indicator from Base UI’s own measurement', () => {
    const rule = blocks().find((b) => /\.mullion-tabs-indicator\s*\{/.test(b));
    expect(rule).toMatch(/var\(--active-tab-width\)/);
    expect(rule).toMatch(/var\(--active-tab-left\)/);
  });

  it('gives the segmented indicator a border, because a ground step is invisible', () => {
    /*
     * Measured over the 23 bundled themes: `surfaceRaised` is identical to
     * `surface2` on 21 of them (deltaE00 0.00), so an indicator distinguished
     * only by its ground would not be visible. `border-strong` on `surface2`
     * clears 3:1 on all 23 because the engine audits that pair.
     */
    const rule = blocks().find((b) => /\.mullion-segmented-indicator\s*\{/.test(b));
    expect(rule, 'the segmented indicator rule is missing').toBeDefined();
    expect(rule).toMatch(/border:\s*1px solid var\(--mullion-color-border-strong\)/);
  });

  it('stills every transition under prefers-reduced-motion', () => {
    const css = uiStylesText();
    for (const selector of ['.mullion-tabs-indicator', '.mullion-segmented-indicator', '.mullion-accordion-panel']) {
      const escaped = selector.replace('.', '\\.');
      const reduced = new RegExp(
        `prefers-reduced-motion[^@]*${escaped}\\s*\\{[^}]*transition:\\s*none`,
        's',
      );
      expect(reduced.test(css), `${selector} keeps animating under reduced motion`).toBe(true);
    }
  });

  it('animates the accordion panel on Base UI’s measured height', () => {
    const rule = blocks().find((b) => /\.mullion-accordion-panel\s*\{/.test(b));
    expect(rule).toMatch(/block-size:\s*var\(--accordion-panel-height\)/);
  });
});
