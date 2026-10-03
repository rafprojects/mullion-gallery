/**
 * P80-B: the select family.
 *
 * Three things here are not ordinary component tests and are the reason the
 * batch exists:
 *
 *  - **the listbox stays in the trigger's root.** A combobox wires its control
 *    to its list with ID-referenced ARIA, and an ID reference cannot resolve
 *    across a shadow boundary. The product's shipped `overlay-root` portal
 *    default puts popups in a second shadow root, which is the confirmed cause
 *    of every Mantine dropdown in the product being keyboard-inoperable. These
 *    components must not reproduce it, so the root is asserted rather than
 *    assumed;
 *  - **the sheet's state attributes are ones Base UI actually sets.** P77-C
 *    shipped a rule keyed on a `data-checked` Mantine never wrote, and nothing
 *    caught it because nothing compared the selector against the DOM. The
 *    guard below reads the attribute name out of the sheet and asserts the
 *    rendered option carries it, so renaming either half fails;
 *  - **no rule moves a row's ground.** That is the property P80-A's rail
 *    bought for the menu, and the select popup keeps it.
 */

import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MullionProvider } from '@/ui';
import { expectNoA11yViolations } from '@/test/axe';
import { PORTAL_ATTR, SCOPE_ATTR } from '../provider/scope';
import { uiStylesText } from '../styles/uiStyles';
import { MultiSelect, Select, TagsInput } from '../components';

const FRUIT = [
  { value: 'gala', label: 'Gala' },
  { value: 'fuji', label: 'Fuji' },
  { value: 'pink', label: 'Pink Lady' },
];

const mount = (ui: React.ReactNode) => render(<MullionProvider>{ui}</MullionProvider>);

/** The combobox control, whichever primitive drew it. */
const control = () => screen.getByRole('combobox');

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(control());
  return screen.findByRole('listbox');
}

describe('Select', () => {
  it('names the control by its label and shows the placeholder', () => {
    mount(<Select label="Apple" placeholder="Pick one" data={FRUIT} />);
    expect(screen.getByRole('combobox', { name: /apple/i })).toBeTruthy();
    expect(screen.getByText('Pick one')).toBeTruthy();
  });

  it('renders the label of the selected value, not the value', () => {
    mount(<Select label="Apple" data={FRUIT} value="pink" />);
    expect(screen.getByRole('combobox', { name: /apple/i }).textContent).toContain('Pink Lady');
  });

  it('accepts the three data shapes the call sites use', async () => {
    const user = userEvent.setup();
    mount(
      <Select
        label="Mixed"
        data={[{ group: 'Apples', items: FRUIT }, { group: 'Other', items: ['Pear'] }]}
      />,
    );
    const list = await open(user);
    expect(within(list).getByText('Apples')).toBeTruthy();
    expect(within(list).getByText('Pear')).toBeTruthy();
  });

  it('hands onChange the value, not an event', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Select label="Apple" data={FRUIT} onChange={onChange} />);
    const list = await open(user);
    await user.click(within(list).getByRole('option', { name: 'Fuji' }));
    expect(onChange).toHaveBeenCalledWith('fuji');
  });

  it('clears to null through a named control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Select label="Apple" data={FRUIT} value="fuji" clearable clearLabel="Clear apple" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Clear apple' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('a searchable field', () => {
  it('shows the label of the selected value, not the value', async () => {
    /*
     * The regression this guards was found by typing into it in a browser.
     * Without a `Combobox.createItems` collection the primitive can stringify
     * an item for the filter but cannot resolve a selected value back to its
     * label, so picking Georgia left `georgia` in the input.
     */
    const user = userEvent.setup();
    mount(<Select label="Font" searchable data={[{ value: 'georgia', label: 'Georgia' }, ...FRUIT]} />);
    const list = await open(user);
    await user.click(within(list).getByRole('option', { name: 'Georgia' }));
    await waitFor(() => expect((control() as HTMLInputElement).value).toBe('Georgia'));
  });

  it('filters on the label rather than the value', async () => {
    const user = userEvent.setup();
    mount(<Select label="Font" searchable data={[{ value: 'georgia', label: 'Georgia' }, ...FRUIT]} />);
    await open(user);
    await user.type(control(), 'georg');
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option').textContent).toContain('Georgia');
  });
});

describe('names (P80-F)', () => {
  // Both gaps were found by P80-D's accessibility snapshots.
  it.each([
    ['Select', <Select key="s" label="Fruit" data={FRUIT} />],
    ['Select searchable', <Select key="ss" label="Fruit" searchable data={FRUIT} />],
    ['MultiSelect', <MultiSelect key="m" label="Fruit" data={FRUIT} />],
  ])('%s names its listbox as its field is named', async (_label, ui) => {
    const user = userEvent.setup();
    mount(ui);
    await user.click(control());
    expect(await screen.findByRole('listbox', { name: 'Fruit' })).toBeTruthy();
  });

  it('a chip field\'s label is one label that still points at its input', async () => {
    const user = userEvent.setup();
    const { container } = mount(<MultiSelect label="Fruit" data={FRUIT} />);
    expect(container.ownerDocument.querySelector('label label'), 'a label nested in a label').toBeNull();
    await user.click(screen.getByText('Fruit'));
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Fruit' }));
  });

  it('a searchable field has one control with the field\'s name, not two', () => {
    mount(<Select label="Fruit" searchable data={FRUIT} openLabel="Show options" />);
    expect(screen.getAllByRole('combobox', { name: 'Fruit' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Fruit' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show options Fruit' })).toBeTruthy();
  });
});

describe('the keyboard contract', () => {
  it('opens on ArrowDown, moves the highlight and commits on Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Select label="Apple" data={FRUIT} onChange={onChange} />);

    control().focus();
    await user.keyboard('{ArrowDown}');
    const list = await screen.findByRole('listbox');
    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(3));

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalled();
    expect(typeof onChange.mock.calls.at(-1)![0]).toBe('string');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} />);
    const trigger = control();
    await open(user);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it('moves DOM focus into the list rather than pointing at it by id', async () => {
    /*
     * The distinction matters: Base UI's Select navigates by moving real
     * focus, so the highlight survives a popup in another tree, while its
     * Combobox navigates with `aria-activedescendant`, which does not. Both
     * are covered, and this is the half that says which mechanism is in use.
     */
    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} />);
    control().focus();
    await user.keyboard('{ArrowDown}');
    const list = await screen.findByRole('listbox');
    await waitFor(() => expect(list.contains(document.activeElement)).toBe(true));
  });
});

describe('where the listbox mounts', () => {
  it('is the trigger\'s own root, not the provider\'s overlay container', async () => {
    /*
     * The binding constraint on this track. `aria-controls` on the trigger is
     * an ID reference; if the list is in another root it names nothing.
     */
    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} />);
    const trigger = control();
    const list = await open(user);
    expect(list.getRootNode()).toBe(trigger.getRootNode());
  });

  it('puts the list where aria-controls can find it', async () => {
    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} />);
    const trigger = control();
    const list = await open(user);
    const id = trigger.getAttribute('aria-controls');
    expect(id, 'the trigger names its list').toBeTruthy();
    const root = trigger.getRootNode() as Document | ShadowRoot;
    expect(root.getElementById(id!), 'the named element resolves in the trigger\'s root').not.toBeNull();
    expect(list.id === id || list.closest(`#${CSS.escape(id!)}`) !== null).toBe(true);
  });

  it('is not the container every other popup uses', async () => {
    /*
     * The distinguishing assertion, and the one a mutation can fail. Under a
     * light mount every container is in the same document, so comparing root
     * nodes cannot tell the overlay container from the trigger's tree; the
     * browser suite does that across a real shadow boundary. What is decidable
     * here is that this popup went somewhere else than `useMullionPortal()`,
     * which is where the modal, drawer, popover, tooltip and menu all go.
     */
    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} />);
    const list = await open(user);
    const overlayContainer = document.querySelector(`[${PORTAL_ATTR}]`);
    expect(overlayContainer, 'the provider did not create its portal container').not.toBeNull();
    expect(
      overlayContainer!.contains(list),
      'the listbox was portaled into the overlay container, where an id reference cannot reach it',
    ).toBe(false);
  });

  it('lands under a scoped element, so it carries the provider\'s tokens', async () => {
    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} />);
    const list = await open(user);
    expect(list.closest(`[${SCOPE_ATTR}]`)).not.toBeNull();
  });

  it('honours an explicit container, which is the only way out', async () => {
    const user = userEvent.setup();
    const host = document.createElement('div');
    host.setAttribute('data-explicit', '');
    document.body.appendChild(host);
    mount(<Select label="Apple" data={FRUIT} container={host} />);
    const list = await open(user);
    expect(host.contains(list)).toBe(true);
    host.remove();
  });
});

describe('the selected-option rule (P77-C generalised)', () => {
  it('keys on the attribute Base UI writes, read out of the sheet itself', async () => {
    const rule = uiStylesText()
      .split('}')
      .find((block) => /\.mullion-select-item\[data-[a-z-]+\]\s*\{[^}]*--mullion-primary-text/.test(`${block}}`));
    expect(rule, 'no selected-option rule reads a colour token').toBeDefined();
    const attr = /\.mullion-select-item\[(data-[a-z-]+)\]/.exec(rule!)?.[1];
    expect(attr).toBeTruthy();

    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} value="fuji" />);
    const list = await open(user);
    const selected = within(list).getByRole('option', { name: 'Fuji' });
    expect(
      selected.hasAttribute(attr!),
      `the sheet styles [${attr}] and the rendered option does not carry it`,
    ).toBe(true);
  });

  it('marks selection with a shape as well as a colour', async () => {
    const user = userEvent.setup();
    mount(<Select label="Apple" data={FRUIT} value="fuji" />);
    const list = await open(user);
    const selected = within(list).getByRole('option', { name: 'Fuji' });
    expect(selected.querySelector('.mullion-select-item-indicator')).not.toBeNull();
  });
});

describe('MultiSelect', () => {
  it('shows a chip per value, each with a named remove control', () => {
    mount(<MultiSelect label="Apples" data={FRUIT} value={['fuji', 'pink']} />);
    expect(screen.getByRole('button', { name: 'Remove Fuji' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Pink Lady' })).toBeTruthy();
  });

  it('hands onChange an array of values', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<MultiSelect label="Apples" data={FRUIT} value={[]} onChange={onChange} />);
    const list = await open(user);
    await user.click(within(list).getByRole('option', { name: 'Gala' }));
    expect(onChange).toHaveBeenCalledWith(['gala']);
  });
});

describe('TagsInput', () => {
  it('adds what was typed on Enter, which is the one behaviour the primitive lacks', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [tags, setTags] = useState<string[]>([]);
      return <TagsInput label="Tags" value={tags} onChange={setTags} />;
    }
    mount(<Harness />);
    await user.click(control());
    await user.keyboard('landscape{Enter}');
    expect(await screen.findByRole('button', { name: 'Remove landscape' })).toBeTruthy();
  });

  it('works uncontrolled, which is where chips are easiest to lose', async () => {
    // Rendering chips from the `value` prop alone showed none at all for an
    // uncontrolled field, and the create handler appended to an empty array
    // every time. The component holds the value when the caller does not.
    const user = userEvent.setup();
    mount(<TagsInput label="Tags" defaultValue={['portrait']} />);
    expect(screen.getByRole('button', { name: 'Remove portrait' })).toBeTruthy();
    await user.click(control());
    await user.keyboard('macro{Enter}');
    expect(await screen.findByRole('button', { name: 'Remove macro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove portrait' })).toBeTruthy();
  });

  it('does not add a blank tag', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<TagsInput label="Tags" value={[]} onChange={onChange} />);
    await user.click(control());
    await user.keyboard('   {Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('the structural axe gate', () => {
  it('every form in the family passes with a label, a description and an error', async () => {
    const { container } = mount(
      <>
        <Select label="Apple" data={FRUIT} description="Pick the one you want" />
        <Select label="Pear" data={FRUIT} error="Required" />
        <Select label="Search" data={FRUIT} searchable />
        <MultiSelect label="Apples" data={FRUIT} value={['fuji']} />
        <TagsInput label="Tags" value={['landscape']} />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});

describe('the sheet', () => {
  const blocks = () => uiStylesText().split('}');

  it('never moves a highlighted row\'s ground', () => {
    /*
     * P80-A's rail, kept. A tint on the highlight is how a semantic colour
     * ends up measured against a ground nobody audited, and it cost three
     * rounds of correspondence in the menu. The mutation this catches is a
     * `background-color` added to the highlight rule.
     */
    const offenders = blocks().filter(
      (b) => /\.mullion-select-item\[data-highlighted\]\s*\{/.test(b) && /background/.test(b),
    );
    expect(offenders, `a rule tints the highlighted row: ${offenders.join('\n')}`).toHaveLength(0);
  });

  it('marks the highlighted row with a rail in the ring\'s own colour', () => {
    const rail = blocks().find((b) => /\.mullion-select-item\[data-highlighted\]::before\s*\{/.test(b));
    expect(rail, 'the highlight rail is missing').toBeDefined();
    expect(rail).toMatch(/background-color:\s*var\(--mullion-color-primary-stroke\)/);
  });

  it('reads the popup ground and border from the audited menu tokens', () => {
    const popup = blocks().find((b) => /\.mullion-select-popup\s*\{/.test(b));
    expect(popup).toMatch(/background-color:\s*var\(--mullion-menu-bg\)/);
    expect(popup).toMatch(/border:\s*1px solid var\(--mullion-menu-bd\)/);
  });

  it('never fills a selected row, because a filled row cannot carry the rail', () => {
    // Measured: `primaryStroke` equals `primaryFill` on 10 of the 23 bundled
    // themes, so a rail on a filled row is 1.00:1 and invisible.
    const selected = blocks().find((b) => /\.mullion-select-item\[data-selected\]\s*\{/.test(b));
    expect(selected, 'the selected-row rule is missing').toBeDefined();
    expect(selected, 'a selected row must not take a ground').not.toMatch(/background/);
  });

  it('does not pin a popup width', () => {
    const popup = blocks().find((b) => /\.mullion-select-popup\s*\{/.test(b));
    expect(popup).toMatch(/inline-size:\s*var\(--mullion-select-popup-width, var\(--anchor-width\)\)/);
  });
});
