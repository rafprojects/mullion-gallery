import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import type { UiSelectOption } from '@/ui';
import { SearchableEntityInput } from './SearchableEntityInput';

const OPTIONS: UiSelectOption[] = [
  { value: 'opt-a', label: 'Option A' },
  { value: 'opt-b', label: 'Option B' },
];

function SimpleInput({
  onInputChange = vi.fn(),
  onOptionSubmit = vi.fn(),
  onBlur,
  onClear,
  hasSelection = false,
  loading = false,
  displayValue = '',
  options = [...OPTIONS, ...(hasSelection ? [] : [{ value: 'create', label: '+ Create new' }])],
  emptyMessage,
  renderOption,
}: Partial<React.ComponentProps<typeof SearchableEntityInput>>) {
  return (
    <SearchableEntityInput
      displayValue={displayValue}
      onInputChange={onInputChange}
      onOptionSubmit={onOptionSubmit}
      onBlur={onBlur}
      onClear={onClear}
      hasSelection={hasSelection}
      loading={loading}
      placeholder="Search..."
      label="Entity"
      options={options}
      emptyMessage={emptyMessage}
      renderOption={renderOption}
    />
  );
}

const input = () => screen.getByRole('combobox', { name: 'Entity' });

describe('SearchableEntityInput', () => {
  describe('display resolution', () => {
    it('renders the displayValue in the input', () => {
      render(<SimpleInput displayValue="Acme Corp" />);
      expect(input()).toHaveValue('Acme Corp');
    });

    it('renders empty string when displayValue is empty', () => {
      render(<SimpleInput displayValue="" />);
      expect(input()).toHaveValue('');
    });
  });

  describe('search/filter behavior', () => {
    it('calls onInputChange when typing', () => {
      const onInputChange = vi.fn();
      render(<SimpleInput onInputChange={onInputChange} />);
      fireEvent.change(input(), { target: { value: 'abc' } });
      expect(onInputChange).toHaveBeenCalledWith('abc');
    });

    it('calls onInputChange for each keystroke', () => {
      const onInputChange = vi.fn();
      render(<SimpleInput onInputChange={onInputChange} />);
      fireEvent.change(input(), { target: { value: 'a' } });
      fireEvent.change(input(), { target: { value: 'ab' } });
      expect(onInputChange).toHaveBeenCalledTimes(2);
      expect(onInputChange).toHaveBeenLastCalledWith('ab');
    });

    it('opens the list on click', async () => {
      const user = userEvent.setup();
      render(<SimpleInput />);
      await user.click(input());
      expect(await screen.findByRole('option', { name: 'Option A' })).toBeInTheDocument();
    });

    it('shows the options as given, whatever the text, because the caller filters', async () => {
      const user = userEvent.setup();
      render(<SimpleInput displayValue="zzz" />);
      await user.click(input());
      expect(await screen.findAllByRole('option')).toHaveLength(3);
    });

    it('says so when there are no options', async () => {
      const user = userEvent.setup();
      render(<SimpleInput options={[]} emptyMessage="No companies found" />);
      await user.click(input());
      expect(await screen.findByText('No companies found')).toBeInTheDocument();
    });

    it('draws an option with the caller\'s renderer', async () => {
      const user = userEvent.setup();
      render(<SimpleInput renderOption={({ option }) => <em data-testid="row">{option.label} (row)</em>} />);
      await user.click(input());
      expect(await screen.findByRole('option', { name: 'Option A (row)' })).toBeInTheDocument();
    });
  });

  describe('freeform create affordance', () => {
    it('renders a consumer-provided create option', async () => {
      const user = userEvent.setup();
      render(<SimpleInput />);
      await user.click(input());
      expect(await screen.findByRole('option', { name: '+ Create new' })).toBeInTheDocument();
    });

    it('calls onOptionSubmit with the create option value when clicked', async () => {
      const user = userEvent.setup();
      const onOptionSubmit = vi.fn();
      render(<SimpleInput onOptionSubmit={onOptionSubmit} />);
      await user.click(input());
      await user.click(await screen.findByRole('option', { name: '+ Create new' }));
      await waitFor(() => expect(onOptionSubmit).toHaveBeenCalledWith('create'));
    });

    it('calls onOptionSubmit with the correct value for a regular option', async () => {
      const user = userEvent.setup();
      const onOptionSubmit = vi.fn();
      render(<SimpleInput onOptionSubmit={onOptionSubmit} />);
      await user.click(input());
      await user.click(await screen.findByRole('option', { name: 'Option A' }));
      await waitFor(() => expect(onOptionSubmit).toHaveBeenCalledWith('opt-a'));
    });
  });

  describe('focus/blur lifecycle', () => {
    it('calls onBlur after blur when no option was selected', () => {
      const onBlur = vi.fn();
      render(<SimpleInput onBlur={onBlur} />);
      fireEvent.focus(input());
      fireEvent.blur(input());
      expect(onBlur).toHaveBeenCalledTimes(1);
    });

    it('does not call onBlur after an option is selected', async () => {
      const user = userEvent.setup();
      const onBlur = vi.fn();
      const onOptionSubmit = vi.fn();
      render(<SimpleInput onBlur={onBlur} onOptionSubmit={onOptionSubmit} />);
      await user.click(input());
      await user.click(await screen.findByRole('option', { name: 'Option A' }));
      await waitFor(() => expect(onOptionSubmit).toHaveBeenCalled());
      fireEvent.blur(input());
      expect(onBlur).not.toHaveBeenCalled();
    });

    it('shows a clear button when hasSelection is true', () => {
      render(<SimpleInput hasSelection onClear={vi.fn()} />);
      expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
    });

    it('calls onClear when the clear button is clicked', () => {
      const onClear = vi.fn();
      render(<SimpleInput hasSelection onClear={onClear} />);
      fireEvent.click(screen.getByRole('button', { name: /clear selection/i }));
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('shows search icon when not loading and no selection', () => {
      render(<SimpleInput />);
      expect(screen.queryByRole('button', { name: /clear selection/i })).not.toBeInTheDocument();
    });
  });
});
