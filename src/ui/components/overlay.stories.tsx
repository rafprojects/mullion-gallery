/**
 * The overlays under the framework's own provider (P80-A).
 *
 * `parameters: { mullion: true }` swaps Storybook's decorator from Mantine's
 * provider to `MullionProvider`, so every popup here portals into the
 * provider's container and reads `--mullion-*` tokens with no Mantine in the
 * tree. Switching the theme in the toolbar is the thing worth doing: nothing
 * below names a colour, so a drawer, a menu's hover tint and a tooltip should
 * all follow the theme without a second story.
 *
 * These are also the stories the manual keyboard pass is run against
 * (Key Decision C): open each one, tab through it, Escape out of it, and
 * check that focus lands back on the control that opened it.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Button,
  Drawer,
  Group,
  Menu,
  Modal,
  Paper,
  Popover,
  Stack,
  Text,
  Title,
  Tooltip,
  type UiDrawerSide,
} from './index';

const meta = {
  title: 'Framework/Overlays',
  parameters: { mullion: true, layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Modals: Story = {
  render: () => {
    const [plain, setPlain] = useState(false);
    const [wide, setWide] = useState(false);
    const [full, setFull] = useState(false);
    const [stubborn, setStubborn] = useState(false);
    return (
      <Stack gap="md" padding="md">
        <Title order={3}>Modal</Title>
        <Group gap="sm">
          <Button onClick={() => setPlain(true)}>Open</Button>
          <Button variant="light" onClick={() => setWide(true)}>
            Wide, left-aligned
          </Button>
          <Button variant="outline" onClick={() => setFull(true)}>
            Full screen
          </Button>
          <Button variant="subtle" onClick={() => setStubborn(true)}>
            No outside dismissal
          </Button>
        </Group>

        <Modal opened={plain} onClose={() => setPlain(false)} title="Delete campaign">
          <Stack gap="sm">
            <Text size="sm">
              Tab through this dialog: focus should stay inside it, and Escape should
              return focus to the button that opened it.
            </Text>
            <Group gap="sm">
              <Button variant="subtle" onClick={() => setPlain(false)}>
                Cancel
              </Button>
              <Button tone="danger" onClick={() => setPlain(false)}>
                Delete
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Modal
          opened={wide}
          onClose={() => setWide(false)}
          title="A wider dialog"
          size={720}
          centered={false}
          padding="lg"
        >
          <Text size="sm">Sized in pixels and pinned near the top rather than centred.</Text>
        </Modal>

        <Modal opened={full} onClose={() => setFull(false)} title="Full screen" fullScreen>
          <Text size="sm">The popup fills the viewport and drops its corner radius.</Text>
        </Modal>

        <Modal
          opened={stubborn}
          onClose={() => setStubborn(false)}
          title="Escape only"
          closeOnClickOutside={false}
        >
          <Text size="sm">
            Clicking the scrim does nothing. Escape still works, because a dialog with no
            keyboard exit is a WCAG 2.1.2 failure.
          </Text>
        </Modal>
      </Stack>
    );
  },
};

export const Drawers: Story = {
  render: () => {
    const [side, setSide] = useState<UiDrawerSide | null>(null);
    const sides: UiDrawerSide[] = ['left', 'right', 'top', 'bottom'];
    return (
      <Stack gap="md" padding="md">
        <Title order={3}>Drawer</Title>
        <Group gap="sm">
          {sides.map((s) => (
            <Button key={s} variant="light" onClick={() => setSide(s)}>
              {s}
            </Button>
          ))}
          <Button variant="outline" onClick={() => setSide('right')}>
            Blurred scrim
          </Button>
        </Group>
        <Drawer
          opened={side !== null}
          onClose={() => setSide(null)}
          position={side ?? 'right'}
          title={`Drawer from the ${side ?? 'right'}`}
          overlayBlur={4}
        >
          <Stack gap="sm">
            <Text size="sm">
              The panel slides out of the edge it is anchored to. The scrim colour is the
              theme&rsquo;s `overlay-bg` token; only the blur is a prop.
            </Text>
            <Button variant="subtle" onClick={() => setSide(null)}>
              Close
            </Button>
          </Stack>
        </Drawer>
      </Stack>
    );
  },
};

export const Menus: Story = {
  render: () => (
    <Stack gap="md" padding="md">
      <Title order={3}>Menu</Title>
      <Text size="sm" tone="muted">
        Arrow keys move the highlight, Home and End jump, and typing matches a label.
        Only a keyboard move paints the focus ring; a pointer hover paints the tint alone.
      </Text>
      <Group gap="sm">
        <Menu>
          <Menu.Trigger render={<Button variant="light" />}>Actions</Menu.Trigger>
          <Menu.Content>
            <Menu.Item>Rename</Menu.Item>
            <Menu.Item>Duplicate</Menu.Item>
            <Menu.Item disabled>Archive</Menu.Item>
            <Menu.Divider />
            <Menu.Group label="Danger zone">
              <Menu.Item tone="danger">Delete</Menu.Item>
            </Menu.Group>
          </Menu.Content>
        </Menu>

        <Menu>
          <Menu.Trigger render={<Button variant="outline" />}>With sections</Menu.Trigger>
          <Menu.Content width={240}>
            <Menu.Label>Loose heading</Menu.Label>
            <Menu.Item leftSection={<span aria-hidden>★</span>} rightSection={<Text size="xs" tone="muted">⌘S</Text>}>
              Save
            </Menu.Item>
            <Menu.Item leftSection={<span aria-hidden>⎘</span>}>Copy link</Menu.Item>
          </Menu.Content>
        </Menu>
      </Group>
    </Stack>
  ),
};

export const PopoversAndTooltips: Story = {
  render: () => (
    <Stack gap="md" padding="md">
      <Title order={3}>Popover</Title>
      <Group gap="sm">
        <Popover>
          <Popover.Trigger render={<Button variant="light" />}>Open panel</Popover.Trigger>
          <Popover.Content width={280} padding="md">
            <Stack gap="xs">
              <Text size="sm" weight={600}>
                Anchored panel
              </Text>
              <Text size="sm" tone="muted">
                Focus moves into the panel and Escape returns it to the trigger.
              </Text>
            </Stack>
          </Popover.Content>
        </Popover>

        <Popover>
          <Popover.Trigger render={<Button variant="outline" />}>Top aligned</Popover.Trigger>
          <Popover.Content side="top" align="start" padding="sm">
            <Text size="sm">Placed above, aligned to the start edge.</Text>
          </Popover.Content>
        </Popover>
      </Group>

      <Title order={3}>Tooltip</Title>
      <Group gap="sm">
        <Tooltip label="Saves without closing the panel">
          <Button variant="light">Hover or focus me</Button>
        </Tooltip>
        <Tooltip label="Opens immediately" openDelay={0}>
          <Button variant="subtle">No delay</Button>
        </Tooltip>
        <Tooltip label="Below the control" side="bottom">
          <Button variant="outline">Below</Button>
        </Tooltip>
      </Group>
      <Text size="sm" tone="muted">
        Tab to each button: the tooltip should appear on keyboard focus, not only on hover.
      </Text>
    </Stack>
  ),
};

export const InsideAScrolledHost: Story = {
  name: 'Hostile host',
  render: () => (
    <div style={{ transform: 'translateZ(0)', position: 'relative' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          padding: '0.5rem 1rem',
          background: 'var(--mullion-color-surface-raised)',
          borderBottom: '1px solid var(--mullion-color-border)',
        }}
      >
        <Text size="sm">A sticky header at z-index 9999, inside a transformed ancestor.</Text>
      </div>
      <Stack gap="md" padding="md">
        <Text size="sm" tone="muted">
          The P77-B probe, as a story. A transformed ancestor makes `position: fixed`
          resolve against it rather than the viewport, which is what breaks a popup that
          is not portaled out. Every overlay here should still cover the header and sit
          against the viewport.
        </Text>
        <div style={{ blockSize: '120vh' }} />
        <Group gap="sm">
          <Menu>
            <Menu.Trigger render={<Button variant="light" />}>Menu</Menu.Trigger>
            <Menu.Content>
              <Menu.Item>Still positioned correctly</Menu.Item>
            </Menu.Content>
          </Menu>
          <Tooltip label="Above the sticky header" openDelay={0}>
            <Button variant="outline">Tooltip</Button>
          </Tooltip>
        </Group>
        <Paper withBorder padding="md">
          <Text size="sm">Scroll the page, then open each overlay.</Text>
        </Paper>
      </Stack>
    </div>
  ),
};
