/**
 * P80-B: pagination and the colour picker, the two components Base UI does not
 * ship and this framework therefore writes.
 *
 * Because the behaviour is ours, the tests carry more weight than they do for
 * a wrapper. Three things are pinned:
 *
 *  - the colour arithmetic round-trips, in every format a call site stores;
 *  - a value that is not a colour is left alone rather than coerced, which is
 *    the defect every colour field starts with;
 *  - the page range keeps a constant width as the current page moves, so the
 *    control does not reflow under the pointer between clicks.
 */

import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MullionProvider } from '@/ui';
import { expectNoA11yViolations } from '@/test/axe';
import { ColorInput, ColorPicker, Pagination, formatColor, paginationRange, parseColor } from '../components';

const mount = (ui: React.ReactNode) => render(<MullionProvider>{ui}</MullionProvider>);

describe('the colour arithmetic', () => {
  it.each([
    ['#ff0000', 'hex', '#ff0000'],
    ['#00ff00', 'hex', '#00ff00'],
    ['#123456', 'hex', '#123456'],
    ['#abc', 'hex', '#aabbcc'],
    ['rgb(18, 52, 86)', 'hex', '#123456'],
    ['rgba(18, 52, 86, 0.5)', 'rgba', 'rgba(18, 52, 86, 0.5)'],
    ['#12345680', 'hexa', '#12345680'],
  ] as const)('round-trips %s as %s', (input, format, expected) => {
    const parsed = parseColor(input);
    expect(parsed, `${input} did not parse`).not.toBeNull();
    expect(formatColor(parsed!, format)).toBe(expected);
  });

  it('reads the modern space-and-slash form the engine emits', () => {
    // `chroma-js` 3 writes `rgb(0 0 0 / 0.08)`, and a stored component token
    // can be in that form. A parser that only knew commas turned it into null,
    // which is how the P78-C sanitiser defect stayed hidden for two days.
    const parsed = parseColor('rgb(18 52 86 / 0.5)');
    expect(parsed).not.toBeNull();
    expect(formatColor(parsed!, 'rgba')).toBe('rgba(18, 52, 86, 0.5)');
  });

  it.each(['', '   ', 'not a colour', '#12', 'rgb(1, 2)', null, undefined])(
    'returns null for %s rather than guessing',
    (input) => {
      expect(parseColor(input as string)).toBeNull();
    },
  );

  it('keeps transparent as transparent rather than coercing it to black', () => {
    // `transparent` is a real stored value in this product's gradient stops.
    const parsed = parseColor('transparent');
    expect(parsed).not.toBeNull();
    expect(parsed!.a).toBe(0);
  });
});

describe('ColorPicker', () => {
  it('gives the surface a name and a value a screen reader can read', () => {
    mount(<ColorPicker value="#ff0000" surfaceLabel="Saturation and brightness" />);
    const surface = screen.getByRole('slider', { name: 'Saturation and brightness' });
    // There is no honest `aria-valuenow` for a point in a plane, so the
    // position is reported in words.
    expect(surface.getAttribute('aria-valuetext')).toMatch(/saturation 100%/i);
    expect(surface.getAttribute('aria-valuetext')).toMatch(/brightness 100%/i);
  });

  it('moves across the surface with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<ColorPicker value="#ff0000" onChange={onChange} />);
    screen.getByRole('slider', { name: /saturation/i }).focus();
    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    // One step left of full saturation is a slightly lighter red, not a jump.
    expect(onChange.mock.calls.at(-1)![0]).toMatch(/^#/);
    expect(onChange.mock.calls.at(-1)![0]).not.toBe('#ff0000');
  });

  it('offers hue and, for a format with alpha, opacity', () => {
    const { rerender } = mount(<ColorPicker value="#ff0000" format="hex" />);
    expect(screen.queryByRole('slider', { name: 'Opacity' })).toBeNull();
    expect(screen.getByRole('slider', { name: 'Hue' })).toBeTruthy();

    rerender(
      <MullionProvider>
        <ColorPicker value="rgba(255, 0, 0, 0.5)" format="rgba" />
      </MullionProvider>,
    );
    expect(screen.getByRole('slider', { name: 'Opacity' })).toBeTruthy();
  });

  it('names every swatch by the colour it sets', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<ColorPicker value="#ffffff" swatches={['#000000', '#ff0000']} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Use #ff0000' }));
    expect(onChange).toHaveBeenCalledWith('#ff0000');
  });

  it('keeps the hue when a colour loses it', async () => {
    /*
     * Black and white carry no hue, so a parsed value cannot report one. Left
     * alone, dragging the brightness to zero would snap the surface back to
     * red and the next drag would start from the wrong place.
     */
    const user = userEvent.setup();
    function Harness() {
      const [colour, setColour] = useState('#0000ff');
      return <ColorPicker value={colour} onChange={setColour} />;
    }
    mount(<Harness />);
    const hue = screen.getByRole('slider', { name: 'Hue' });
    expect(hue.getAttribute('aria-valuenow')).toBe('240');

    // Drag the brightness to nothing, which makes the colour black.
    const surface = screen.getByRole('slider', { name: /saturation/i });
    surface.focus();
    for (let i = 0; i < 12; i++) await user.keyboard('{Shift>}{ArrowDown}{/Shift}');
    await waitFor(() => expect(screen.getByRole('slider', { name: 'Hue' }).getAttribute('aria-valuenow')).toBe('240'));
  });
});

describe('ColorInput', () => {
  it('is a text field, which is what a keyboard and a screen reader use', () => {
    mount(<ColorInput label="Background colour" value="#123456" />);
    const field = screen.getByRole('textbox', { name: /background colour/i });
    expect((field as HTMLInputElement).value).toBe('#123456');
  });

  it('leaves a half-typed value alone rather than correcting it', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [colour, setColour] = useState('');
      return <ColorInput label="Colour" value={colour} onChange={setColour} />;
    }
    mount(<Harness />);
    const field = screen.getByRole('textbox');
    await user.type(field, '#ff');
    // Rewriting `#ff` into `#ffffff` under the cursor is the defect every
    // colour field starts with.
    expect((field as HTMLInputElement).value).toBe('#ff');
  });

  it('opens the picker from a named control', async () => {
    const user = userEvent.setup();
    mount(<ColorInput label="Colour" value="#123456" pickerLabel="Open the colour picker" />);
    await user.click(screen.getByRole('button', { name: 'Open the colour picker' }));
    const popup = await screen.findByRole('dialog');
    expect(within(popup).getByRole('slider', { name: 'Hue' })).toBeTruthy();
  });

  it('reports a change from the picker in the caller’s format', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(
      <ColorInput label="Colour" value="#123456" format="rgba" swatches={['#ff0000']} onChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: /open the colour picker/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Use #ff0000' }));
    expect(onChange).toHaveBeenCalledWith('rgba(255, 0, 0, 1)');
  });

  it('offers no eyedropper where the browser has none', () => {
    // jsdom has no `EyeDropper`, so the control must be absent rather than
    // present and throwing when pressed.
    mount(<ColorInput label="Colour" value="#123456" withEyeDropper />);
    expect(screen.queryByRole('button', { name: /pick a colour from the screen/i })).toBeNull();
  });
});

describe('paginationRange', () => {
  it('shows every page when they all fit', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps a constant width as the current page moves', () => {
    /*
     * The classic defect: a range that grows and shrinks makes the control
     * reflow under the pointer between clicks, so the next number is not where
     * the user aimed.
     */
    const widths = new Set<number>();
    for (let page = 1; page <= 20; page++) widths.add(paginationRange(page, 20).length);
    expect([...widths], `widths seen: ${[...widths].join(', ')}`).toHaveLength(1);
  });

  it('puts the gap on the side that has one', () => {
    expect(paginationRange(1, 20)).toContain('dots');
    expect(paginationRange(1, 20).indexOf('dots')).toBeGreaterThan(2);
    expect(paginationRange(20, 20).indexOf('dots')).toBeLessThan(3);
    expect(paginationRange(10, 20).filter((p) => p === 'dots')).toHaveLength(2);
  });
});

describe('Pagination', () => {
  it('is a named landmark whose current page is marked', () => {
    mount(<Pagination value={3} total={10} onChange={() => {}} aria-label="Campaign pages" />);
    const nav = screen.getByRole('navigation', { name: 'Campaign pages' });
    const current = within(nav).getByRole('button', { name: 'Page 3' });
    expect(current.getAttribute('aria-current')).toBe('page');
  });

  it('names every control, because "button 3" says nothing', () => {
    mount(<Pagination value={1} total={3} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeTruthy();
  });

  it('disables the ends rather than letting them run off', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Pagination value={1} total={3} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('does not report a change when the page is already current', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mount(<Pagination value={2} total={5} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('the structural axe gate', () => {
  it('the picker, the field and the pagination all pass', async () => {
    const { container } = mount(
      <>
        <ColorInput label="Background" value="rgba(18, 52, 86, 0.5)" format="rgba" swatches={['#000000']} />
        <ColorPicker value="#123456" format="rgba" swatches={['#000000', '#ffffff']} />
        <Pagination value={4} total={20} onChange={() => {}} aria-label="Pages" />
      </>,
    );
    await expectNoA11yViolations(container);
  });
});
