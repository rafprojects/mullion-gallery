import React from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import type { Preview } from '@storybook/react-vite';
import { MullionProvider } from '../src/ui';

/**
 * Two providers, chosen per story.
 *
 * A story marked `parameters: { mullion: true }` renders under
 * `MullionProvider` alone: the framework's components read `--mullion-*`
 * tokens and its own stylesheet, and putting Mantine's provider around them
 * would prove the wrong thing (P79-C). Every other story keeps Mantine's
 * provider, because every other story still renders Mantine components.
 * Phase 81 deletes the second branch with the last of them.
 */
const preview: Preview = {
  globalTypes: {
    mullionTheme: {
      description: 'Framework theme (stories under MullionProvider)',
      defaultValue: 'default-dark',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['default-dark', 'default-light', 'tokyo-night', 'github-light', 'high-contrast'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const body = (
        <div style={{ padding: 16 }}>
          <Story />
        </div>
      );
      if (context.parameters.mullion) {
        return (
          <MullionProvider theme={context.globals.mullionTheme as string} scope="document">
            {body}
          </MullionProvider>
        );
      }
      return <MantineProvider defaultColorScheme="light">{body}</MantineProvider>;
    },
  ],
  parameters: {
    layout: 'padded',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
};

export default preview;
