import { type ReactElement, type PropsWithChildren, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { MantineProvider, mergeThemeOverrides } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { createTestQueryClient } from '@/services/queryClient';
import { MullionProvider } from '@/ui';
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
            <ModalsProvider>{children}</ModalsProvider>
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

export * from '@testing-library/react';
export { renderWithProviders as render };
