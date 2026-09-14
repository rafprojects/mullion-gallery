/**
 * The notification and confirmation managers under the framework's own
 * provider (P80-C).
 *
 * `parameters: { mullion: true }` swaps Storybook's decorator from Mantine's
 * provider to `MullionProvider`, so the toast viewport portals into the
 * provider's container and reads `--mullion-*` tokens with no Mantine in the
 * tree. Switching the theme in the toolbar is the thing worth doing: nothing
 * below names a colour.
 *
 * These are the stories the manual keyboard pass is run against (Key Decision
 * C). Two things are worth trying that a mouse will not find:
 *
 *  - **F6** moves focus into the toast stack from anywhere on the page, which
 *    is Base UI's own affordance and the only keyboard route to a toast's
 *    close button. Escape leaves it again.
 *  - a toast's dismissal timer pauses while the stack is hovered or focused,
 *    so a keyboard user is not racing a four-second clock to reach the button.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Button,
  Confirmations,
  Group,
  Notifications,
  Stack,
  Text,
  Title,
  confirm,
  notify,
} from './index';

const meta = {
  title: 'Framework/Managers',
  parameters: { mullion: true, layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Toasts: Story = {
  render: () => (
    <Stack gap="md" padding="md">
      <Title order={3}>notify</Title>
      <Text size="sm" tone="muted">
        Press F6 to move focus into the stack, then Escape to leave it. The
        dismissal timer pauses while the stack is hovered or focused.
      </Text>
      <Group gap="sm">
        <Button
          onClick={() =>
            notify.show({ title: 'Layout saved', message: '"Hero grid" saved.', color: 'green' })
          }
        >
          Success
        </Button>
        <Button
          variant="light"
          onClick={() =>
            notify.show({
              title: 'Save failed',
              message: 'The server rejected the request.',
              color: 'red',
              autoClose: false,
            })
          }
        >
          Error, persistent
        </Button>
        <Button
          variant="light"
          onClick={() =>
            notify.show({
              title: 'Template updated in another tab',
              message: 'Close and reopen to load the latest version.',
              color: 'yellow',
              autoClose: false,
            })
          }
        >
          Warning
        </Button>
        <Button
          variant="light"
          onClick={() => notify.show({ message: 'Draft restored.', color: 'blue' })}
        >
          Info, message only
        </Button>
        <Button
          variant="outline"
          onClick={() => notify.show({ message: 'Ungrouped', color: 'gray', autoClose: 2500 })}
        >
          Neutral
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            notify.show({
              title: 'Session expiring soon',
              message: 'You will be signed out in 120 seconds due to inactivity.',
              color: 'orange',
              autoClose: false,
              priority: 'high',
            })
          }
        >
          High priority
        </Button>
        <Button variant="subtle" onClick={() => notify.clean()}>
          Clear all
        </Button>
      </Group>
      <Notifications label="Notifications" closeButtonLabel="Dismiss" />
    </Stack>
  ),
};

/**
 * The six shapes the codebase actually opens today, so the migration has a
 * before-and-after to look at rather than a generic example.
 */
export const ConfirmDialogs: Story = {
  render: () => {
    const [last, setLast] = useState('nothing yet');
    return (
      <Stack gap="md" padding="md">
        <Title order={3}>confirm</Title>
        <Text size="sm" tone="muted">
          Last answer: {last}
        </Text>
        <Group gap="sm">
          <Button
            onClick={() =>
              void confirm({
                title: 'Discard changes?',
                children: 'You have unsaved changes. Discard them?',
                labels: { confirm: 'Discard', cancel: 'Keep editing' },
                confirmProps: { color: 'red' },
              }).then((ok) => setLast(ok ? 'discarded' : 'kept editing'))
            }
          >
            Destructive
          </Button>
          <Button
            variant="light"
            onClick={() =>
              void confirm({
                title: 'Unsaved settings found',
                children: 'You have unsaved settings changes from 5 minutes ago. Restore them?',
                labels: { confirm: 'Restore', cancel: 'Discard' },
                confirmProps: { color: 'blue' },
              }).then((ok) => setLast(ok ? 'restored' : 'discarded'))
            }
          >
            Restore a draft
          </Button>
          <Button
            variant="light"
            onClick={() =>
              void confirm({
                title: 'Draft conflict detected',
                children:
                  'This template was saved in another session after your draft was created. Restoring will overwrite those changes.',
                labels: { confirm: 'Restore draft', cancel: 'Discard' },
                confirmProps: { color: 'orange' },
              }).then((ok) => setLast(ok ? 'restored over the conflict' : 'discarded'))
            }
          >
            Conflict
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void confirm({
                title: 'First question',
                children: 'Two raised at once queue rather than stacking.',
                labels: { confirm: 'Next', cancel: 'Stop' },
              });
              void confirm({
                title: 'Second question',
                children: 'This one waited for the first to be answered.',
                labels: { confirm: 'Done', cancel: 'Stop' },
              });
            }}
          >
            Two at once
          </Button>
        </Group>
        <Confirmations />
      </Stack>
    );
  },
};
