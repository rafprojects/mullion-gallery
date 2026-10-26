import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { BuilderColorInput } from './BuilderColorInput';

const mockAddSwatch = vi.fn();

vi.mock('./BuilderDockContext', () => ({
  useBuilderDock: () => ({
    savedSwatches: ['#ff0000', '#00ff00'],
    addSwatch: mockAddSwatch,
  }),
}));

/** A parent that holds the value, as every builder panel does: the field is controlled. */
function Holder({ initial, onChangeEnd }: { initial: string; onChangeEnd?: (value: string) => void }) {
  const [value, setValue] = useState(initial);
  return <BuilderColorInput value={value} onChange={setValue} onChangeEnd={onChangeEnd} />;
}

describe('BuilderColorInput (P57-C)', () => {
  it('renders without crashing', () => {
    render(<BuilderColorInput value="#123456" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls addSwatch via onChangeEnd when a non-empty color is committed', () => {
    const onChangeEnd = vi.fn();
    render(<Holder initial="" onChangeEnd={onChangeEnd} />);

    const input = screen.getByRole('textbox');
    // blur the input to trigger onChangeEnd
    fireEvent.change(input, { target: { value: '#abcdef' } });
    fireEvent.blur(input);

    expect(mockAddSwatch).toHaveBeenCalledWith('#abcdef');
    expect(onChangeEnd).toHaveBeenCalledWith('#abcdef');
  });

  it('does not call addSwatch when the committed value is empty', () => {
    mockAddSwatch.mockClear();
    render(<Holder initial="#123" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(mockAddSwatch).not.toHaveBeenCalled();
  });
});
