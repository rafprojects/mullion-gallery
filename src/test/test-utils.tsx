import { type ReactElement, type PropsWithChildren, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeAccessibleName } from 'dom-accessibility-api';
import { MantineProvider, mergeThemeOverrides } from '@mantine/core';
import { createTestQueryClient } from '@/services/queryClient';
import { Confirmations, MullionProvider, Notifications } from '@/ui';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { theme } from '../theme';

// P62-H: mirror the app's global a11y component defaults (see main.tsx) so component-level
// axe tests reflect the real render — notably the Mantine CloseButton accessible name that
// main.tsx layers on at runtime. Without this the base theme leaves it unlabeled in tests.
const testTheme = mergeThemeOverrides(theme, {
  components: {
    CloseButton: { defaultProps: { 'aria-label': 'Close' } },
  },
});

function Providers({ themeId, children }: PropsWithChildren<{ themeId?: string | undefined }>) {
  const [queryClient] = useState(createTestQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {/* P79-D: the framework provider owns the theme, so `ThemeProvider` (now
          a Mantine adapter) has something to adapt. No `persistence`, so a test
          neither reads nor writes localStorage unless it asks to. */}
      <MullionProvider theme={themeId}>
        <ThemeProvider>
          <MantineProvider theme={testTheme} env="test">
            {/* The framework's page hosts, as main.tsx mounts them (P81-A). */}
            <Notifications label="Notifications" closeButtonLabel="Close" />
            <Confirmations />
            {children}
          </MantineProvider>
        </ThemeProvider>
      </MullionProvider>
    </QueryClientProvider>
  );
}

export interface RenderWithProvidersOptions extends RenderOptions {
  /**
   * Pin the root theme. The framework provider owns theme selection, and a
   * nested provider publishes the root's switching API rather than its own, so
   * a test that needs a particular theme sets it here and not inside `ui`.
   */
  themeId?: string | undefined;
}

const renderWithProviders = (
  ui: ReactElement,
  { themeId, ...options }: RenderWithProvidersOptions = {},
) =>
  render(ui, {
    wrapper: ({ children }: PropsWithChildren) => (
      <Providers themeId={themeId}>{children}</Providers>
    ),
    ...options,
  });

/**
 * A combobox by its exact name, inside a collapsed section too, as the label
 * query these tests used before did. Lists the names there are on a miss.
 */
function findCombobox(field: string | RegExp): HTMLElement {
  const all = screen.queryAllByRole('combobox', { hidden: true });
  const match = all.filter((el) => {
    const name = computeAccessibleName(el);
    return typeof field === 'string' ? name === field : field.test(name);
  });
  if (match.length !== 1) {
    throw new Error(`${match.length} comboboxes named ${String(field)}; there are: ${all.map((el) => JSON.stringify(computeAccessibleName(el))).join(', ')}`);
  }
  return match[0]!;
}

/**
 * Pick an option from a framework select, as a pointer does (P81-A). A bare
 * `fireEvent.click` opens a plain select but commits nothing and does not open
 * a searchable one, so select interactions go through user-event. `field` is
 * the control's accessible name, or the control itself.
 */
export async function pickOption(field: string | RegExp | HTMLElement, option: string | RegExp) {
  const user = userEvent.setup();
  const control = field instanceof HTMLElement ? field : findCombobox(field);
  await user.click(control);
  const list = await screen.findByRole('listbox');
  await user.click(within(list).getByRole('option', { name: option }));
}

/** What a framework select shows: a plain one's text, or a searchable one's input value. */
export function shownOption(field: string | RegExp) {
  const control = findCombobox(field);
  return control instanceof HTMLInputElement ? control.value : (control.textContent ?? '').trim();
}

export * from '@testing-library/react';
export { renderWithProviders as render };
