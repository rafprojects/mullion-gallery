import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { CompanyCombobox } from './CompanyCombobox';
import type { CompanyInfo } from '@/services/adminQuery';

const companies: CompanyInfo[] = [
  { id: 1, name: 'Acme Corp', slug: 'acme-corp', campaignCount: 3, activeCampaigns: 2, archivedCampaigns: 1, accessGrantCount: 0, campaigns: [] },
  { id: 2, name: 'Beta Ltd', slug: 'beta-ltd', campaignCount: 1, activeCampaigns: 1, archivedCampaigns: 0, accessGrantCount: 0, campaigns: [] },
];

describe('CompanyCombobox', () => {
  it('resolves slug to display name on mount', () => {
    render(<CompanyCombobox value="acme-corp" onChange={vi.fn()} companies={companies} />);
    expect(screen.getByRole('combobox')).toHaveValue('Acme Corp');
  });

  it('filters by name substring', async () => {
    render(<CompanyCombobox value="" onChange={vi.fn()} companies={companies} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('acme');
    expect(await screen.findByRole('option', { name: 'Acme Corp' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Beta Ltd' })).not.toBeInTheDocument();
  });

  it('filters by slug substring', async () => {
    render(<CompanyCombobox value="" onChange={vi.fn()} companies={companies} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('beta-ltd');
    expect(await screen.findByRole('option', { name: 'Beta Ltd' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Acme Corp' })).not.toBeInTheDocument();
  });

  it('suppresses the Create option when typed value exactly matches an existing slug', async () => {
    render(<CompanyCombobox value="" onChange={vi.fn()} companies={companies} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('acme-corp');
    await screen.findByRole('option', { name: 'Acme Corp' });
    expect(screen.queryByText(/\+ Create/)).not.toBeInTheDocument();
  });

  it('suppresses the Create option when typed value exactly matches an existing name', async () => {
    render(<CompanyCombobox value="" onChange={vi.fn()} companies={companies} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('Acme Corp');
    await screen.findByRole('option', { name: 'Acme Corp' });
    expect(screen.queryByText(/\+ Create/)).not.toBeInTheDocument();
  });

  it('shows the Create option for genuinely new input', async () => {
    render(<CompanyCombobox value="" onChange={vi.fn()} companies={companies} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('New Company');
    expect(await screen.findByText(/\+ Create/)).toBeInTheDocument();
  });

  it('calls onChange with the slug when selecting an existing company', async () => {
    const onChange = vi.fn();
    render(<CompanyCombobox value="" onChange={onChange} companies={companies} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('Acme');
    const option = await screen.findByRole('option', { name: 'Acme Corp' });
    fireEvent.click(option);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('acme-corp'));
  });

  it('calls onChange with the raw text when creating a new company', async () => {
    const onChange = vi.fn();
    render(<CompanyCombobox value="" onChange={onChange} companies={companies} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('New Startup');
    const createOption = await screen.findByText(/\+ Create/);
    fireEvent.click(createOption);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('New Startup'));
  });

  it('does not call onChange while typing (only on selection or blur)', () => {
    const onChange = vi.fn();
    render(<CompanyCombobox value="" onChange={onChange} companies={companies} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Ac' } });
    fireEvent.change(input, { target: { value: 'Acm' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('resolves typed company name to slug on blur', () => {
    const onChange = vi.fn();
    render(<CompanyCombobox value="" onChange={onChange} companies={companies} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Acme Corp' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('acme-corp');
  });

  it('resolves typed company slug to slug on blur', () => {
    const onChange = vi.fn();
    render(<CompanyCombobox value="" onChange={onChange} companies={companies} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'acme-corp' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('acme-corp');
  });

  it('passes raw text on blur when typing a new company name', () => {
    const onChange = vi.fn();
    render(<CompanyCombobox value="" onChange={onChange} companies={companies} />);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Brand New Co' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith('Brand New Co');
  });

  it('does not call onChange twice when selecting an option then blurring', async () => {
    const onChange = vi.fn();
    render(<CompanyCombobox value="" onChange={onChange} companies={companies} />);
    const user = userEvent.setup();
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('Acme');
    const option = await screen.findByRole('option', { name: 'Acme Corp' });
    fireEvent.click(option);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('acme-corp');
  });
});
