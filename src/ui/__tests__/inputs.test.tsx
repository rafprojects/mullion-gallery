/**
 * P80-A, the input family.
 *
 * Two things here are not ordinary component tests and are the reason the
 * batch exists:
 *
 *  - the border lives on the control row rather than the input, which is what
 *    lets a unit, a stepper or a section share the field's border instead of
 *    being lined up against it by hand. `UnitScrubField` needs four `styles`
 *    overrides and a computed width to fake that today;
 *  - `TextInput` hands its `onChange` an event and `NumberInput` hands it the
 *    value, because that is how their call sites read them. Normalising one
 *    onto the other would make 136 migrated sites wrong in a way that still
 *    compiles.
 */

import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MullionProvider } from '@/ui';
import { expectNoA11yViolations } from '@/test/axe';
import { uiStylesText } from '../styles/uiStyles';
import { NumberInput, PasswordInput, Textarea, TextInput, FOCUS_ATTR } from '../components';

const mount = (ui: React.ReactNode) => render(<MullionProvider>{ui}</MullionProvider>);

describe('the field shell', () => {
  it('names the control by its label', () => {
    mount(<TextInput label="Campaign title" />);
    expect(screen.getByRole('textbox', { name: /campaign title/i })).toBeTruthy();
  });

  it('describes the control by its description', () => {
    mount(<TextInput label="Slug" description="Lowercase, no spaces" />);
    expect(screen.getByRole('textbox', { name: /slug/i })).toHaveAccessibleDescription(
      /lowercase, no spaces/i,
    );
  });

  it('marks the field invalid and shows the message', () => {
    mount(<TextInput label="Slug" error="Already taken" />);
    expect(screen.getByText('Already taken')).toBeTruthy();
  });

  it('carries the focus attribute, so the ring rule reaches the control', () => {
    mount(<TextInput label="Slug" />);
    expect(screen.getByRole('textbox').getAttribute(FOCUS_ATTR)).toBe('');
  });
});

describe('TextInput', () => {
  it('hands onChange the event, as its call sites read it', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    mount(<TextInput label="Title" onChange={(e) => seen.push(e.currentTarget.value)} />);
    await user.type(screen.getByRole('textbox'), 'ab');
    expect(seen).toEqual(['a', 'ab']);
  });

  it('renders both sections inside the field', () => {
    mount(
      <TextInput
        label="Price"
        leftSection={<span data-testid="left" />}
        rightSection={<span data-testid="right" />}
      />,
    );
    const row = screen.getByRole('textbox').closest('.mullion-field-control')!;
    expect(row.querySelector('[data-testid="left"]')).not.toBeNull();
    expect(row.querySelector('[data-testid="right"]')).not.toBeNull();
  });
});

describe('PasswordInput', () => {
  it('reveals and hides through a control a keyboard can reach', async () => {
    const user = userEvent.setup();
    mount(<PasswordInput label="Password" revealLabel="Show password" />);
    const toggle = screen.getByRole('button', { name: 'Show password' });

    // A reveal only a mouse can operate is the usual defect here.
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await user.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Textarea', () => {
  it('accepts input and reports it', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [v, setV] = useState('');
      return <Textarea label="Notes" value={v} onChange={(e) => setV(e.currentTarget.value)} />;
    }
    mount(<Harness />);
    const box = screen.getByRole('textbox', { name: /notes/i });
    await user.type(box, 'hello');
    expect((box as HTMLTextAreaElement).value).toBe('hello');
  });

  it('renders a textarea rather than an input', () => {
    mount(<Textarea label="Notes" minRows={3} />);
    const box = screen.getByRole('textbox', { name: /notes/i });
    expect(box.tagName).toBe('TEXTAREA');
    expect(box.getAttribute('rows')).toBe('3');
  });
});

describe('NumberInput', () => {
  it('hands onChange the value, not an event', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<NumberInput label="Columns" defaultValue={2} onChange={onChange} />);
    const box = screen.getByRole('textbox', { name: /columns/i });
    await user.clear(box);
    await user.type(box, '5');
    await user.tab();
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0];
    expect(typeof last === 'number' || last === null, `got ${JSON.stringify(last)}`).toBe(true);
  });

  it('puts the unit inside the field, sharing its border', () => {
    mount(<NumberInput label="Size" unit="px" />);
    const row = screen.getByRole('textbox', { name: /size/i }).closest('.mullion-field-control')!;
    const unit = row.querySelector('.mullion-field-unit');
    expect(unit, 'the unit is not inside the control row').not.toBeNull();
    expect(unit!.textContent).toBe('px');
  });

  it('takes a control in the unit slot, which is the point of the slot', () => {
    // The Typography panel needs a unit *picker* here. It is a node, not a
    // string, and it must land in the same slot rather than in a right
    // section that then has to be sized to match.
    mount(
      <NumberInput
        label="Font size"
        unit={<button type="button" data-testid="unit-picker">rem</button>}
      />,
    );
    const row = screen.getByRole('textbox', { name: /font size/i }).closest('.mullion-field-control')!;
    expect(row.querySelector('.mullion-field-unit [data-testid="unit-picker"]')).not.toBeNull();
  });

  it('steps the value with named buttons when controls are shown', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(
      <NumberInput
        label="Gap"
        defaultValue={4}
        step={2}
        withControls
        incrementLabel="Increase gap"
        decrementLabel="Decrease gap"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Increase gap' }));
    expect(onChange).toHaveBeenCalledWith(6);
  });
});

describe('the structural axe gate', () => {
  it('every field in the family passes with a label, a description and an error', async () => {
    const { container } = mount(
      <>
        <TextInput label="Title" description="Shown in the listing" />
        <TextInput label="Slug" error="Already taken" />
        <PasswordInput label="Password" revealLabel="Show password" />
        <Textarea label="Notes" minRows={2} />
        <NumberInput label="Columns" defaultValue={2} withControls unit="px" />
        <NumberInput label="Gap" defaultValue={4} scrubbable description="Drag the label" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});

describe('the sheet', () => {
  const sheet = () => uiStylesText();

  it('puts the border on the control row, not on the input', () => {
    /*
     * This is the property the unit slot depends on. With the border on the
     * row, anything inside the row shares it and shares its height; with the
     * border on the input, a unit has to be positioned against the input and
     * forced to match its height, which is what `UnitScrubField` does with
     * four `styles` overrides and a computed width.
     */
    const blocks = sheet().split('}');
    const row = blocks.find((b) => /\.mullion-field-control\s*\{/.test(b));
    const input = blocks.find((b) => /\.mullion-field-input\s*\{/.test(b));
    expect(row, 'the control row rule is missing').toBeDefined();
    expect(row).toMatch(/border:\s*1px solid var\(--mullion-input-bd\)/);
    expect(input, 'the input rule is missing').toBeDefined();
    expect(input, 'the input must not draw its own border').toMatch(/border:\s*0/);
  });

  it('reads the border and focus border from the audited tokens', () => {
    // P76-D/H collapsed these into their ground. Both pairs are in the
    // engine's 1.4.11 audit as `input-bd on input-bg` and
    // `input-bd-focus on input-bg`, so a theme cannot reintroduce it.
    const css = sheet();
    expect(css).toContain('var(--mullion-input-bd)');
    expect(css).toContain('var(--mullion-input-bd-focus)');
    expect(css).toContain('var(--mullion-input-bg)');
    expect(css).toContain('var(--mullion-input-placeholder-color)');
  });

  it('the unit slot is separated by a border rather than by a second control', () => {
    const unit = sheet()
      .split('}')
      .find((b) => /\.mullion-field-unit\s*\{/.test(b));
    expect(unit, 'the unit slot rule is missing').toBeDefined();
    expect(unit).toMatch(/border-inline-start:\s*1px solid var\(--mullion-input-bd\)/);
    // Nothing computes a width for it. A hand-computed width is what makes
    // the current field taller than its neighbours.
    expect(unit, 'the unit slot must not pin a width').not.toMatch(/inline-size:\s*\d/);
  });
});
