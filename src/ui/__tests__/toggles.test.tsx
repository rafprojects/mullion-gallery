/**
 * P80-B: the choice controls, and `Chip.Group`.
 *
 * Two things here are the reason the batch exists rather than ordinary
 * component tests:
 *
 *  - **`onChange` hands over the value, not the event.** 76 `Switch` and 11
 *    `Checkbox` call sites read `event.currentTarget.checked` today, so every
 *    one changes at migration. The tests pin the new shape so it cannot drift
 *    back halfway;
 *  - **the state each rule keys on is one the primitive writes.** P77-C
 *    shipped three rules against an attribute Mantine never set, and this
 *    batch's own tab bar did it again, so the guard reads the attribute name
 *    out of the sheet and asserts the rendered control carries it.
 */

import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MullionProvider } from '@/ui';
import { expectNoA11yViolations } from '@/test/axe';
import { uiStylesText } from '../styles/uiStyles';
import { Checkbox, Chip, Slider, Switch } from '../components';

const mount = (ui: React.ReactNode) => render(<MullionProvider>{ui}</MullionProvider>);

describe('Checkbox', () => {
  it('is named by its label and described by its description', () => {
    mount(<Checkbox label="Purge analytics" description="Cannot be undone" />);
    const box = screen.getByRole('checkbox', { name: /purge analytics/i });
    expect(box).toHaveAccessibleDescription(/cannot be undone/i);
  });

  it('hands onChange the new state, not an event', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Checkbox label="Enabled" onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles on Space, which is the keyboard contract', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Checkbox label="Enabled" onChange={onChange} />);
    screen.getByRole('checkbox').focus();
    await user.keyboard(' ');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(true));
  });

  it('announces the third state rather than showing it only in the mark', () => {
    // A header checkbox over a partly selected list. `aria-checked="mixed"` is
    // the part a screen reader uses; the dash is the sighted half.
    mount(<Checkbox label="Select all" indeterminate />);
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('mixed');
  });
});

describe('Switch', () => {
  it('is announced as a switch, not a checkbox', () => {
    mount(<Switch label="Optimize on upload" />);
    expect(screen.getByRole('switch', { name: /optimize on upload/i })).toBeTruthy();
  });

  it('hands onChange the new state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Switch label="Blur" checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('carries its description to the control, without writing an id by hand', () => {
    mount(<Switch label="Blur" description="Blurs content behind open drawers" />);
    expect(screen.getByRole('switch')).toHaveAccessibleDescription(/blurs content/i);
  });
});

describe('Slider', () => {
  it('names the control, not the group around it', () => {
    /*
     * Base UI renders the root as a `role="group"` and the slider itself as a
     * visually hidden `<input type="range">` inside the thumb, so `aria-label`
     * on the root names the group and leaves the control unnamed. The first
     * draft did exactly that, and this is the query that found it.
     */
    mount(<Slider aria-label="Opacity" value={0.5} min={0} max={1} step={0.05} />);
    const thumb = screen.getByRole('slider', { name: 'Opacity' });
    expect(thumb.getAttribute('aria-valuenow')).toBe('0.5');
    // The range comes from the native `min` and `max`, which is stronger than
    // the ARIA pair: it cannot disagree with what the control accepts.
    expect(thumb.getAttribute('min')).toBe('0');
    expect(thumb.getAttribute('max')).toBe('1');
    expect(thumb.getAttribute('step')).toBe('0.05');
  });

  it('hands onChange the value and steps with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Slider aria-label="Gap" value={10} min={0} max={100} step={5} onChange={onChange} />);
    screen.getByRole('slider').focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(15));
  });

  it('moves by largeStep on the page keys, which is the APG contract', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Slider aria-label="Gap" value={50} min={0} max={100} step={1} largeStep={20} onChange={onChange} />);
    screen.getByRole('slider').focus();
    await user.keyboard('{PageUp}');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(70));
  });

  it('goes to the ends on Home and End', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Slider aria-label="Gap" value={50} min={0} max={100} onChange={onChange} />);
    screen.getByRole('slider').focus();
    await user.keyboard('{Home}');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(0));
    await user.keyboard('{End}');
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(100));
  });

  it('formats its own value label, which is what 38 call sites pass', () => {
    const { container } = mount(
      <Slider aria-label="Centre" value={40} label={(v) => `${v}%`} />,
    );
    const value = container.querySelector('.mullion-slider-value');
    expect(value?.textContent).toBe('40%');
    // The thumb already carries the number in `aria-valuenow`; a second
    // announcement would be a duplicate.
    expect(value?.getAttribute('aria-hidden')).toBe('true');
  });

  it('places each mark by its position in the range', () => {
    const { container } = mount(
      <Slider aria-label="Opacity" value={0.5} min={0} max={1} step={0.05} marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]} />,
    );
    const marks = Array.from(container.querySelectorAll('.mullion-slider-mark'));
    expect(marks).toHaveLength(3);
    expect((marks[1] as HTMLElement).style.getPropertyValue('--mullion-slider-mark')).toBe('50%');
  });
});

describe('Chip.Group', () => {
  it('renders radios when only one chip may be chosen', () => {
    mount(
      <Chip.Group multiple={false} value="all">
        <Chip value="all">All</Chip>
        <Chip value="mine">Mine</Chip>
      </Chip.Group>,
    );
    // Radios, not checkboxes: that is what gives the group arrow keys and one
    // tab stop from the platform rather than from code here.
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
  });

  it('hands onChange a string for single choice and an array for multiple', async () => {
    const user = userEvent.setup();
    const single = vi.fn();
    const many = vi.fn();
    const { rerender } = mount(
      <Chip.Group multiple={false} value="all" onChange={single}>
        <Chip value="all">All</Chip>
        <Chip value="mine">Mine</Chip>
      </Chip.Group>,
    );
    await user.click(screen.getByRole('radio', { name: 'Mine' }));
    expect(single).toHaveBeenCalledWith('mine');

    rerender(
      <MullionProvider>
        <Chip.Group value={['a']} onChange={many}>
          <Chip value="a">A</Chip>
          <Chip value="b">B</Chip>
        </Chip.Group>
      </MullionProvider>,
    );
    await user.click(screen.getByRole('checkbox', { name: 'B' }));
    expect(many).toHaveBeenCalledWith(['a', 'b']);
  });

  it('leaves a lone chip exactly as P79-C built it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <Chip
          checked={on}
          onChange={(next) => {
            setOn(next);
            onChange(next);
          }}
        >
          Solo
        </Chip>
      );
    }
    mount(<Harness />);
    const chip = screen.getByRole('checkbox', { name: 'Solo' });
    await user.click(chip);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('works uncontrolled', async () => {
    const user = userEvent.setup();
    mount(
      <Chip.Group multiple={false} defaultValue="all">
        <Chip value="all">All</Chip>
        <Chip value="mine">Mine</Chip>
      </Chip.Group>,
    );
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Mine' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Mine' })).toBeChecked());
    expect(screen.getByRole('radio', { name: 'All' })).not.toBeChecked();
  });
});

describe('the structural axe gate', () => {
  it('every control passes with a label, a description and a disabled state', async () => {
    const { container } = mount(
      <>
        <Checkbox label="Purge" description="Cannot be undone" />
        <Checkbox label="Select all" indeterminate />
        <Checkbox label="Locked" disabled />
        <Switch label="Blur" description="Blurs content behind drawers" />
        <Switch label="Off" checked={false} onChange={() => {}} />
        <Slider aria-label="Opacity" value={0.5} min={0} max={1} step={0.05} label={(v) => `${v}`} marks={[{ value: 0, label: '0' }]} />
        <Chip.Group multiple={false} value="all">
          <Chip value="all">All</Chip>
          <Chip value="mine">Mine</Chip>
        </Chip.Group>
      </>,
    );
    await expectNoA11yViolations(container);
  });
});

describe('the sheet', () => {
  const blocks = () => uiStylesText().split('}');

  it.each([
    ['the checkbox', '.mullion-checkbox', () => screen.getByRole('checkbox')],
    ['the switch', '.mullion-switch', () => screen.getByRole('switch')],
  ])('keys %s’s checked rule on an attribute the primitive writes', (_name, selector, pick) => {
    const escaped = selector.replace('.', '\\.');
    const rule = blocks().find((b) =>
      new RegExp(`${escaped}\\[(data-[a-z-]+)\\][^{]*\\{[^}]*background-color`).test(`${b}}`),
    );
    expect(rule, `no checked rule found for ${selector}`).toBeDefined();
    const attr = new RegExp(`${escaped}\\[(data-[a-z-]+)\\]`).exec(rule!)?.[1];
    expect(attr).toBeTruthy();

    mount(
      <>
        <Checkbox label="A" checked onChange={() => {}} />
        <Switch label="B" checked onChange={() => {}} />
      </>,
    );
    expect(
      pick().hasAttribute(attr!),
      `the sheet styles ${selector}[${attr}] and the checked control does not carry it`,
    ).toBe(true);
  });

  it('paints a checked control with the audited fill pair', () => {
    // `primaryOnFill` is the ink the engine derives against `primaryFill`, so
    // the mark on a checked box and the thumb on a checked track are the one
    // pair already audited for a filled control.
    const css = uiStylesText();
    expect(css).toContain('var(--mullion-color-primary)');
    expect(css).toContain('var(--mullion-color-primary-on)');
  });

  it('reads the switch track and the checkbox border from their own tokens', () => {
    const css = uiStylesText();
    expect(css).toContain('var(--mullion-switch-track-bg)');
    expect(css).toContain('var(--mullion-switch-track-bd)');
    expect(css).toContain('var(--mullion-checkbox-bd)');
  });

  it('stills every transition under prefers-reduced-motion', () => {
    const css = uiStylesText();
    const escaped = '\\.mullion-switch-thumb';
    const reduced = new RegExp(
      `prefers-reduced-motion[^@]*${escaped}[^@]*?\\{[^}]*transition:\\s*none`,
      's',
    );
    expect(reduced.test(css), 'the switch thumb keeps animating under reduced motion').toBe(true);
  });

  it('hides the value bubble rather than fading it to nothing', () => {
    /*
     * An element at `opacity: 0` is still rendered as far as axe is concerned:
     * it composited this bubble against the page and reported a 1.01:1
     * contrast failure on text nobody can see. `visibility` removes it from
     * that calculation and from the accessibility tree in one declaration. The
     * transition went with it, because a transitioned property animates once
     * from its initial value when the component sheet is adopted, which made
     * the bubble fade out on every page load.
     */
    const rule = blocks().find((b) => /\.mullion-slider-value\s*\{/.test(b));
    expect(rule, 'the value bubble rule is missing').toBeDefined();
    expect(rule).toMatch(/visibility:\s*hidden/);
    expect(rule, 'the bubble must not transition from its initial value').not.toMatch(/transition:/);
  });

  it('reaches the focus inside the thumb rather than the thumb itself', () => {
    /*
     * The focus target is a visually hidden `<input type="range">` INSIDE the
     * thumb, so `.mullion-slider-thumb:focus-visible` matches nothing, and
     * Base UI's `data-focused` is a Field state a standalone slider never
     * gets. Both were tried; `:has(:focus-visible)` is what works.
     */
    const css = uiStylesText();
    expect(css).toContain('.mullion-slider-thumb:has(:focus-visible) .mullion-slider-value');
    expect(css).toContain('.mullion-slider-thumb[data-dragging] .mullion-slider-value');
    expect(css, 'a bare :focus-visible on the thumb matches nothing').not.toMatch(
      /\.mullion-slider-thumb:focus-visible\s/,
    );
  });
});
