import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { DEFAULT_THEME_ID, getAllThemeMeta } from '@/themes/index';
import { MullionProvider } from '@/ui';

const { setPreviewThemeSpy } = vi.hoisted(() => ({
  setPreviewThemeSpy: vi.fn(),
}));

vi.mock('@/hooks/useTheme', async () => {
  const themes = await vi.importActual<typeof import('@/themes/index')>('@/themes/index');

  return {
    useTheme: () => ({
      themeId: themes.DEFAULT_THEME_ID,
      availableThemes: themes.getAllThemeMeta(),
      setPreviewTheme: setPreviewThemeSpy,
      setTheme: vi.fn(),
      colorScheme: 'dark' as const,
      cssVars: '',
      mantineTheme: {},
    }),
  };
});

import { ThemeSelector } from './ThemeSelector';

const allThemes = getAllThemeMeta();
const defaultTheme = allThemes.find((theme) => theme.id === DEFAULT_THEME_ID)!;
const alternateTheme = allThemes.find((theme) => theme.id !== DEFAULT_THEME_ID)!;

// [P79-D] The selector reads the registry through `useMullionTheme()`, so it
// needs the framework provider. `useTheme` stays mocked: this suite is about
// the widget, not about who owns the theme.
function wrapper({ children }: { children: ReactNode }) {
  return (
    <MullionProvider>
      <MantineProvider>{children}</MantineProvider>
    </MullionProvider>
  );
}

describe('ThemeSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    setPreviewThemeSpy.mockReset();
  });

  it('renders a Select with default label', () => {
    render(<ThemeSelector />, { wrapper });

    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a color theme. Preview applies instantly; saved when you click Save.'),
    ).toBeInTheDocument();
  });

  it('renders with custom label and description', () => {
    render(<ThemeSelector label="Color" description="Pick one" />, { wrapper });

    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByText('Pick one')).toBeInTheDocument();
  });

  it('uses the context theme when no controlled value is provided', () => {
    render(<ThemeSelector />, { wrapper });

    expect(screen.getByRole('combobox')).toHaveTextContent(defaultTheme.name);
  });

  it('prefers the controlled settings value over the theme context value', () => {
    render(<ThemeSelector value={alternateTheme.id} />, { wrapper });

    expect(screen.getByRole('combobox')).toHaveTextContent(alternateTheme.name);
  });

  it('applies live preview and reports the selected theme to settings state', async () => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();

    render(<ThemeSelector onThemeChange={onThemeChange} />, { wrapper });

    await user.click(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');
    const pick = within(list)
      .getAllByRole('option')
      .find((o) => [...o.querySelectorAll('*')].some((el) => el.textContent === alternateTheme.name))!;
    await user.click(pick);

    expect(setPreviewThemeSpy).toHaveBeenCalledWith(alternateTheme.id);
    expect(onThemeChange).toHaveBeenCalledWith(alternateTheme.id);
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent(alternateTheme.name));
  });

  it('shows each theme with its swatches and its description', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />, { wrapper });

    await user.click(screen.getByRole('combobox'));
    // By an element reading exactly the name: one theme's name can begin another's.
    const option = within(await screen.findByRole('listbox'))
      .getAllByRole('option')
      .find((o) => [...o.querySelectorAll('*')].some((el) => el.textContent === defaultTheme.name))!;
    expect(option, `no option is named ${defaultTheme.name}`).toBeTruthy();
    expect(option.querySelectorAll('.mullion-color-swatch').length).toBeGreaterThan(0);
    if (defaultTheme.description) expect(option).toHaveTextContent(defaultTheme.description);
  });

  it('keeps the theme list where its field can reach it by id', async () => {
    // What `withinPortal: false` was for: the gallery is shadow-mounted, and the list must share its root.
    const user = userEvent.setup();
    render(<ThemeSelector />, { wrapper });

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    const list = await screen.findByRole('listbox');
    expect(list.getRootNode()).toBe(trigger.getRootNode());
  });
});
