/**
 * The presentational set under the framework's own provider (P79-C).
 *
 * `parameters: { mullion: true }` swaps Storybook's decorator from Mantine's
 * provider to `MullionProvider`, so everything here renders against the
 * `--mullion-*` tokens and the framework's stylesheet with no Mantine in the
 * tree. The theme picker in the toolbar switches the provider's theme, which
 * is the thing worth looking at: nothing below names a colour, so every
 * surface, tone and ring should follow the theme without a second story.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Center,
  Chip,
  CloseButton,
  Collapse,
  ColorSwatch,
  Container,
  CopyButton,
  Divider,
  FileButton,
  Grid,
  Group,
  Image,
  Kbd,
  Loader,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
  VisuallyHidden,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Tabs,
  PasswordInput,
  Select,
  TagsInput,
  Textarea,
  TextInput,
  type UiControlVariant,
  type UiTone,
} from './index';

const TONES: UiTone[] = ['default', 'muted', 'primary', 'success', 'warning', 'danger', 'info'];
const VARIANTS: UiControlVariant[] = ['filled', 'light', 'outline', 'subtle', 'default', 'transparent'];
const STEPS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="sm">
      <Divider label={title} labelPosition="left" />
      {children}
    </Stack>
  );
}

const meta = {
  title: 'Framework/Presentational set',
  parameters: { mullion: true, layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inputs: Story = {
  name: 'Input family',
  render: function Inputs() {
    const [size, setSize] = useState<number | null>(16);
    const [unit, setUnit] = useState('px');
    return (
      <Stack gap="md" padding="md">
        <Section title="Text, password and multi-line">
          <TextInput label="Campaign title" placeholder="Summer 2026" description="Shown in the listing" />
          <TextInput label="Slug" defaultValue="summer-2026" error="Already taken" />
          <TextInput label="Disabled" defaultValue="Locked" disabled />
          <PasswordInput label="Password" placeholder="At least 12 characters" />
          <Textarea label="Notes" minRows={2} maxRows={6} placeholder="Grows as you type, up to six rows" />
        </Section>

        <Section title="Numbers, the stepper and the scrub label">
          <Group gap="md" align="flex-end">
            <NumberInput label="Columns" defaultValue={3} min={1} max={12} withControls />
            <NumberInput label="Gap" defaultValue={8} step={2} scrubbable description="Drag the label" />
          </Group>
        </Section>

        <Section title="The unit slot">
          <Text size="sm" tone="muted">
            The slot is inside the field&rsquo;s border, so it shares the border and the height with
            nothing to line up. A string is static text; a node is a control. The Typography panel
            needs the second form, and it is the reason this slot exists.
          </Text>
          <Group gap="md" align="flex-end">
            <NumberInput label="Static unit" defaultValue={24} unit="px" />
            <NumberInput
              label="Font size"
              value={size}
              onChange={setSize}
              scrubbable
              unit={
                <select
                  aria-label="Unit"
                  value={unit}
                  onChange={(e) => setUnit(e.currentTarget.value)}
                  style={{ border: 0, background: 'none', color: 'inherit', font: 'inherit' }}
                >
                  {['px', 'rem', 'em', '%'].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              }
            />
          </Group>
        </Section>

        <Section title="Sizes">
          {STEPS.map((step) => (
            <NumberInput key={step} size={step} label={`size ${step}`} defaultValue={12} unit="px" withControls />
          ))}
        </Section>
      </Stack>
    );
  },
};

export const RoleGlyphs: Story = {
  name: 'Role glyphs (CVD)',
  render: () => (
    <Stack gap="md" padding="md">
      <Section title="A status tone supplies its glyph by default">
        <Text size="sm" tone="muted">
          On the light palette under protanopia the success and warning washes are deltaE00 0.00
          apart. The glyph is the non-colour signal, and the silhouettes differ on purpose: four
          variations on a disc would measure identically and signal nothing. Check this story
          through a CVD simulator with the colour removed.
        </Text>
        <Group gap="xs">
          {(['success', 'warning', 'danger', 'info'] as const).map((tone) => (
            <Badge key={tone} tone={tone}>
              Tier 2
            </Badge>
          ))}
        </Group>
        <Group gap="sm">
          {(['success', 'warning', 'danger', 'info'] as const).map((tone) => (
            <Button key={tone} variant="light" tone={tone}>
              Continue
            </Button>
          ))}
        </Group>
        {(['success', 'warning', 'danger', 'info'] as const).map((tone) => (
          <Alert key={tone} tone={tone} title={`A ${tone} alert`}>
            The glyph takes the tone through currentColor, audited at the 3:1 non-text floor.
          </Alert>
        ))}
      </Section>
      <Section title="Declining it is a deliberate act">
        <Group gap="xs">
          <Badge tone="success" icon={false}>
            Passed
          </Badge>
          <Button variant="light" tone="danger" leftSection={false}>
            Delete campaign
          </Button>
        </Group>
        <Text size="sm" tone="muted">
          Both labels name the role, so the glyph is redundant and declined explicitly rather than
          by omission.
        </Text>
      </Section>
    </Stack>
  ),
};

export const Typography: Story = {
  render: () => (
    <Stack gap="md" padding="md">
      <Section title="Headings">
        {([1, 2, 3, 4, 5, 6] as const).map((order) => (
          <Title key={order} order={order}>
            Heading level {order}
          </Title>
        ))}
      </Section>
      <Section title="Type scale">
        {STEPS.map((size) => (
          <Text key={size} size={size}>
            The quick brown fox ({size})
          </Text>
        ))}
      </Section>
      <Section title="Tones">
        {TONES.map((tone) => (
          <Text key={tone} tone={tone}>
            {tone}
          </Text>
        ))}
      </Section>
      <Section title="Treatments">
        <Text weight={600}>Semibold</Text>
        <Text italic>Italic</Text>
        <Text font="mono">Monospace 0123456789</Text>
        <Text transform="uppercase">uppercase</Text>
        <Text truncate style={{ maxWidth: 240 }}>
          A single line that is far too long to fit into the space it has been given
        </Text>
        <Text lineClamp={2} style={{ maxWidth: 240 }}>
          Two lines and then an ellipsis, which is what a card description wants when the copy
          behind it is of no fixed length whatsoever and keeps going.
        </Text>
        <Group gap="xs">
          <Anchor href="#top">A link</Anchor>
          <Kbd>Esc</Kbd>
          <Kbd>Ctrl</Kbd>
        </Group>
      </Section>
    </Stack>
  ),
};

export const Layout: Story = {
  render: () => (
    <Stack gap="md" padding="md">
      <Section title="Stack and Group">
        <Group gap="sm">
          {STEPS.map((step) => (
            <Badge key={step}>{step}</Badge>
          ))}
        </Group>
        <Group justify="space-between">
          <Text>Left</Text>
          <Text>Right</Text>
        </Group>
        <Group grow>
          <Paper withBorder padding="sm">
            <Text size="sm">grow</Text>
          </Paper>
          <Paper withBorder padding="sm">
            <Text size="sm">grow</Text>
          </Paper>
          <Paper withBorder padding="sm">
            <Text size="sm">grow</Text>
          </Paper>
        </Group>
      </Section>
      <Section title="SimpleGrid, responsive">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
          {[1, 2, 3, 4].map((n) => (
            <Paper key={n} withBorder raised padding="sm">
              <Text size="sm">Cell {n}</Text>
            </Paper>
          ))}
        </SimpleGrid>
      </Section>
      <Section title="Grid, twelve columns">
        <Grid gap="sm">
          <Grid.Col span={8}>
            <Paper withBorder padding="sm">
              <Text size="sm">span 8</Text>
            </Paper>
          </Grid.Col>
          <Grid.Col span={4}>
            <Paper withBorder padding="sm">
              <Text size="sm">span 4</Text>
            </Paper>
          </Grid.Col>
        </Grid>
      </Section>
      <Section title="Center and Container">
        <Container size="sm" padding="sm">
          <Center paddingBlock="lg">
            <Text tone="muted">Centred inside a small container</Text>
          </Center>
        </Container>
      </Section>
    </Stack>
  ),
};

export const Surfaces: Story = {
  render: () => (
    <Stack gap="md" padding="md">
      <Section title="Paper">
        <Group>
          <Paper padding="md" withBorder>
            <Text size="sm">Bordered</Text>
          </Paper>
          <Paper padding="md" raised shadow="sm">
            <Text size="sm">Raised with a shadow</Text>
          </Paper>
        </Group>
      </Section>
      <Section title="Card with sections">
        <Card padding="md" withBorder style={{ maxWidth: 320 }}>
          <Card.Section withBorder padding="sm">
            <Text weight={600}>Card header</Text>
          </Card.Section>
          <Stack gap="xs" paddingBlock="sm">
            <Text size="sm" tone="muted">
              The section bleeds to the card edges by reading the card's own padding.
            </Text>
            <Group gap="xs">
              <Badge tone="success">Live</Badge>
              <Badge tone="warning" variant="outline">
                Draft
              </Badge>
            </Group>
          </Stack>
        </Card>
      </Section>
      <Section title="Divider">
        <Divider label="Left" labelPosition="left" />
        <Divider label="Centre" />
        <Divider />
        <Group gap="sm" style={{ height: 40 }}>
          <Text size="sm">Before</Text>
          <Divider orientation="vertical" />
          <Text size="sm">After</Text>
        </Group>
      </Section>
    </Stack>
  ),
};

export const Controls: Story = {
  render: function ControlsStory() {
    const [checked, setChecked] = useState(false);
    const [picked, setPicked] = useState<string>('none');
    return (
      <Stack gap="md" padding="md">
        <Section title="Button variants">
          {TONES.map((tone) => (
            <Group key={tone} gap="xs">
              {VARIANTS.map((variant) => (
                <Button key={variant} variant={variant} tone={tone}>
                  {variant}
                </Button>
              ))}
            </Group>
          ))}
        </Section>
        <Section title="Button sizes">
          <Group gap="xs" align="center">
            {STEPS.map((size) => (
              <Button key={size} size={size}>
                {size}
              </Button>
            ))}
            <Button compact>compact</Button>
          </Group>
          <Group gap="xs">
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <Button leftSection={<span aria-hidden>+</span>}>With a section</Button>
          </Group>
          <Button fullWidth>Full width</Button>
        </Section>
        <Section title="Icon controls">
          <Group gap="xs" align="center">
            {STEPS.map((size) => (
              <ActionIcon key={size} size={size} aria-label={`Icon ${size}`}>
                <span aria-hidden>★</span>
              </ActionIcon>
            ))}
            <ActionIcon loading aria-label="Busy" />
            <CloseButton aria-label="Close the panel" />
            <UnstyledButton>An unstyled button</UnstyledButton>
          </Group>
        </Section>
        <Section title="Chip, file and copy">
          <Group gap="sm" align="center">
            <Chip checked={checked} onChange={setChecked}>
              Selected: {String(checked)}
            </Chip>
            <FileButton onChange={(files) => setPicked(files.map((f) => f.name).join(', ') || 'none')}>
              {(props) => (
                <Button variant="default" {...props}>
                  Choose a file
                </Button>
              )}
            </FileButton>
            <Text size="sm" tone="muted">
              {picked}
            </Text>
            <CopyButton value="mullion">
              {({ copied, copy }) => (
                <Button variant="light" onClick={copy}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Section>
        <Section title="Focus ring">
          <Text size="sm" tone="muted">
            Tab through this story: every control paints a 2px core in the theme's primary stroke
            inside a 6px halo, from the one rule keyed on `data-mullion-focus`.
          </Text>
        </Section>
      </Stack>
    );
  },
};

export const Feedback: Story = {
  render: () => (
    <Stack gap="md" padding="md">
      <Section title="Alert">
        {TONES.map((tone) => (
          <Alert key={tone} tone={tone} title={tone} icon={<span aria-hidden>i</span>}>
            An alert in the {tone} tone.
          </Alert>
        ))}
      </Section>
      <Section title="Badge">
        <Group gap="xs">
          {TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </Group>
        <Group gap="xs" align="center">
          {STEPS.map((size) => (
            <Badge key={size} size={size}>
              {size}
            </Badge>
          ))}
        </Group>
      </Section>
      <Section title="Loader and Skeleton">
        <Group gap="md" align="center">
          {STEPS.map((size) => (
            <Loader key={size} size={size} label={`Loading ${size}`} />
          ))}
        </Group>
        <Stack gap="xs" style={{ maxWidth: 320 }}>
          <Skeleton width={120} height={12} />
          <Skeleton height={12} />
          <Skeleton width={48} circle />
        </Stack>
      </Section>
    </Stack>
  ),
};

export const DataAndUtilities: Story = {
  render: function DataStory() {
    const [open, setOpen] = useState(false);
    return (
      <Stack gap="md" padding="md">
        <Section title="Table">
          <Table.ScrollContainer minWidth={480}>
            <Table striped highlightOnHover withTableBorder verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Campaign</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Assets</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {[
                  ['Spring launch', 'Live', 42],
                  ['Archive 2025', 'Archived', 311],
                  ['Press kit', 'Draft', 8],
                ].map(([name, status, assets]) => (
                  <Table.Tr key={String(name)}>
                    <Table.Td>{name}</Table.Td>
                    <Table.Td>
                      <Badge tone={status === 'Live' ? 'success' : 'muted'}>{status}</Badge>
                    </Table.Td>
                    <Table.Td>{assets}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Section>
        <Section title="Swatches and images">
          <Group gap="xs">
            {['#e5484d', '#f5a524', '#30a46c', '#0091ff'].map((colour) => (
              <ColorSwatch key={colour} color={colour} />
            ))}
          </Group>
          <Image
            alt="A placeholder that will not load, so the fallback shows"
            src="/does-not-exist.png"
            fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90'%3E%3C/svg%3E"
            width={160}
            height={90}
            radius="md"
          />
        </Section>
        <Section title="Collapse and VisuallyHidden">
          <Button variant="light" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide' : 'Show'} the panel
          </Button>
          <Collapse in={open}>
            <Paper withBorder padding="md">
              <Text size="sm">
                Animated by grid-template-rows, so nothing measures the content.
              </Text>
            </Paper>
          </Collapse>
          <Text size="sm" tone="muted">
            There is a visually hidden note here.
            <VisuallyHidden> Read only by a screen reader.</VisuallyHidden>
          </Text>
        </Section>
      </Stack>
    );
  },
};

const FONTS = [
  {
    group: 'Recently used',
    items: [
      { value: 'inter', label: 'Inter' },
      { value: 'source-serif', label: 'Source Serif' },
    ],
  },
  {
    group: 'System',
    items: [
      { value: 'system-ui', label: 'System UI' },
      { value: 'georgia', label: 'Georgia' },
      { value: 'menlo', label: 'Menlo' },
    ],
  },
];

const ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'auditor', label: 'Auditor', disabled: true },
];

export const Selects: Story = {
  name: 'Select family',
  render: function Selects() {
    const [one, setOne] = useState<string | null>('editor');
    const [font, setFont] = useState<string | null>(null);
    const [many, setMany] = useState<string[]>(['editor', 'viewer']);
    const [tags, setTags] = useState<string[]>(['landscape']);
    return (
      <Stack gap="md" padding="md">
        <Section title="One value">
          <Text size="sm" tone="muted">
            The popup opens in the trigger&rsquo;s own root rather than the provider&rsquo;s overlay
            container, because a combobox names its list by id and an id reference cannot cross a
            shadow boundary. Arrow through it: the highlighted row takes a rail and the inset ring,
            and no ground in the popup moves.
          </Text>
          <Group gap="md" align="flex-end">
            <Select label="Role" data={ROLES} value={one} onChange={setOne} placeholder="Pick a role" />
            <Select label="Clearable" data={ROLES} value={one} onChange={setOne} clearable />
            <Select label="Disabled" data={ROLES} value="admin" disabled />
            <Select label="With an error" data={ROLES} error="Pick a role" />
          </Group>
        </Section>

        <Section title="Groups and search">
          <Group gap="md" align="flex-end">
            <Select label="Font" data={FONTS} value={font} onChange={setFont} placeholder="System UI" />
            <Select
              label="Font (searchable)"
              data={FONTS}
              searchable
              nothingFoundMessage="No font matches that"
              searchPlaceholder="Type to filter"
            />
          </Group>
        </Section>

        <Section title="Several values, and free-form tags">
          <Group gap="md" align="flex-start">
            <MultiSelect label="Roles" data={ROLES} value={many} onChange={setMany} placeholder="Add a role" />
            <TagsInput
              label="Tags"
              value={tags}
              onChange={setTags}
              placeholder="Type and press Enter"
              description="Anything typed becomes a tag"
            />
          </Group>
        </Section>

        <Section title="Sizes">
          <Group gap="md" align="flex-end">
            {STEPS.map((step) => (
              <Select key={step} size={step} label={step} data={ROLES} defaultValue="editor" />
            ))}
          </Group>
        </Section>
      </Stack>
    );
  },
};

export const Choices: Story = {
  name: 'Tabs, segments and disclosure',
  render: function Choices() {
    const [view, setView] = useState('grid');
    const [tab, setTab] = useState<string | null>('overview');
    return (
      <Stack gap="md" padding="md">
        <Section title="Segmented control">
          <Text size="sm" tone="muted">
            A radio group, which is the pattern for picking one value. The indicator carries a
            border rather than resting on an elevation step: measured over the 23 bundled themes,
            <code> surfaceRaised </code> is identical to <code> surface2 </code> on 21 of them.
          </Text>
          <Group gap="md" align="center">
            <SegmentedControl aria-label="View" data={['grid', 'list', 'map']} value={view} onChange={setView} />
            <SegmentedControl
              aria-label="Sizing"
              size="xs"
              data={[
                { value: 'fill', label: 'Fill' },
                { value: 'fit', label: 'Fit' },
                { value: 'manual', label: 'Manual', disabled: true },
              ]}
              defaultValue="fill"
            />
          </Group>
          <SegmentedControl aria-label="Full width" fullWidth data={['day', 'week', 'month']} defaultValue="week" />
        </Section>

        <Section title="Tabs">
          <Text size="sm" tone="muted">
            Arrow keys move focus and Enter selects. Selecting on focus would mount every panel on
            the way past, and the Admin Panel&rsquo;s seven tabs each load their own data.
          </Text>
          <Tabs value={tab} onChange={setTab}>
            <Tabs.List aria-label="Campaign sections">
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="media">Media</Tabs.Tab>
              <Tabs.Tab value="access">Access</Tabs.Tab>
              <Tabs.Tab value="archive" disabled>
                Archive
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="overview">
              <Text size="sm">The overview panel.</Text>
            </Tabs.Panel>
            <Tabs.Panel value="media">
              <Text size="sm">The media panel.</Text>
            </Tabs.Panel>
            <Tabs.Panel value="access">
              <Text size="sm">The access panel.</Text>
            </Tabs.Panel>
            <Tabs.Panel value="archive">
              <Text size="sm">The archive panel.</Text>
            </Tabs.Panel>
          </Tabs>
        </Section>

        <Section title="Accordion">
          <Text size="sm" tone="muted">
            Every header is its own tab stop. Roving focus was removed from this pattern by the
            Authoring Practices, and Base UI followed.
          </Text>
          <Accordion defaultValue="appearance">
            <Accordion.Item value="appearance">
              <Accordion.Control>Card appearance</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">Corner rounding, shadow and border.</Text>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="grid">
              <Accordion.Control rightSection={<Badge tone="primary">3</Badge>}>
                Grid and pagination
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">Columns, gaps and how many cards a page holds.</Text>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="locked" disabled>
              <Accordion.Control>Locked section</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm">Unreachable.</Text>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Section>
      </Stack>
    );
  },
};
