/**
 * The e2e fixture for P79-C: the presentational set in every scope.
 *
 * `e2e/ui-showcase.spec.ts` serves the dev server's own index page with this
 * module spliced in, so the page carries Vite's transform (the React refresh
 * preamble, which a hand-written fixture page would lack) while `main.tsx`
 * finds no mount node and does nothing. Query parameters pick the combination:
 *
 *   ?mount=shadow|light   which tree the gallery renders in
 *   ?theme=<id>           the provider's theme
 *   ?chrome=lock|follow   what the nested provider paints
 *
 * A person can open it too, since P80-D: `src/ui/showcase/index.html` on the
 * dev server, with `?keyboard=1` turning every opt-in section on.
 *
 * Nothing in production imports this module, so it is absent from the build;
 * it is here rather than in `e2e/` so `tsc` and ESLint hold it to the same
 * rules as the components it renders.
 */

import { StrictMode, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { MullionProvider } from '../provider/MullionProvider';
import { useMullionPortal, useMullionScope } from '../provider/hooks';
import {
  ActionIcon,
  Alert,
  Box,
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
  Drawer,
  Menu,
  Accordion,
  Checkbox,
  ColorInput,
  Modal,
  MultiSelect,
  NumberInput,
  Pagination,
  PasswordInput,
  Confirmations,
  Notifications,
  Popover,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  Tabs,
  TagsInput,
  Textarea,
  TextInput,
  Tooltip,
  confirm,
  notify,
} from '../components';

const params = new URLSearchParams(window.location.search);
const useShadow = params.get('mount') !== 'light';
const themeId = params.get('theme') ?? 'default-dark';
const chromeMode = params.get('chrome') === 'follow' ? 'follow' : 'lock';
/**
 * P80-A's overlays are opt-in. Adding them to the default page would move the
 * ui-showcase and theme-qa snapshot baselines for a section most of those
 * checks do not look at, so `?overlays=1` appends them and every existing URL
 * renders exactly what it rendered before.
 */
/**
 * P80-D's keyboard suite, and the person running the screen-reader pass, want
 * every section at once plus fixtures nothing else needs. One flag turns them
 * all on, so no existing spec's page changes.
 */
const withKeyboard = params.get('keyboard') === '1';
const withOverlays = withKeyboard || params.get('overlays') === '1';
/**
 * P80-B's select family, opt-in for the same reason. A select's popup goes
 * somewhere different from an overlay's, so the browser suite needs triggers
 * that live in the scope under test.
 */
const withSelects = withKeyboard || params.get('selects') === '1';
/** P80-B's tabs, segmented control and accordion, opt-in for the same reason. */
const withChoice = withKeyboard || params.get('choice') === '1';
/**
 * P80-C's managers, opt-in for the same reason. Unlike every other section
 * these mount once rather than per-gallery: both stores are module singletons,
 * so a second viewport subscribed to the same manager would render every toast
 * twice and make each one a strict-mode violation to query.
 */
const withManagers = withKeyboard || params.get('managers') === '1';
/** P81-A: layout primitives nested inside ones that set every property, for the inheritance test. */
const withNesting = params.get('nesting') === '1';
/** `?host=hostile` reproduces the P77-B probe around the whole fixture. */
const hostileHost = params.get('host') === 'hostile';

/** Every focusable component in the set, so the ring walk has something to walk. */
function Focusables({ prefix }: { prefix: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <Group gap="sm" data-testid={`${prefix}-focusables`}>
      <Button>{prefix} button</Button>
      <Button variant="light" tone="danger">
        {prefix} danger
      </Button>
      <Button variant="outline" leftSection={<span aria-hidden>+</span>}>
        {prefix} outline
      </Button>
      <Button variant="default">{prefix} default</Button>
      <ActionIcon aria-label={`${prefix} icon`}>
        <span aria-hidden>★</span>
      </ActionIcon>
      <ActionIcon variant="filled" aria-label={`${prefix} filled icon`}>
        <span aria-hidden>★</span>
      </ActionIcon>
      <CloseButton aria-label={`${prefix} close`} />
      <UnstyledButton>{prefix} unstyled</UnstyledButton>
      <Chip checked={checked} onChange={setChecked}>
        {prefix} chip
      </Chip>
      <CopyButton value={prefix}>
        {({ copied, copy }) => (
          <Button variant="subtle" onClick={copy}>
            {copied ? 'copied' : `${prefix} copy`}
          </Button>
        )}
      </CopyButton>
      <FileButton onChange={() => undefined}>
        {(props) => (
          <Button variant="light" {...props}>
            {prefix} file
          </Button>
        )}
      </FileButton>
      <Anchor href="#top">{prefix} link</Anchor>
    </Group>
  );
}

/** The presentational set, rendered once per scope so each can be read on its own. */
function Gallery({ prefix }: { prefix: string }) {
  const [open, setOpen] = useState(false);
  const scope = useMullionScope();
  return (
    <Stack gap="md" padding="md" data-testid={`${prefix}-set`} data-scope-mode={scope.mode}>
      <Title order={2}>{prefix}</Title>
      <Text size="sm" tone="muted">
        theme {scope.themeId}, mode {scope.mode}
      </Text>
      <Focusables prefix={prefix} />
      <Group gap="xs">
        <Badge tone="success">live</Badge>
        <Badge tone="warning" variant="outline">
          draft
        </Badge>
        <Kbd>Esc</Kbd>
        <ColorSwatch color="#e5484d" />
        <Loader size="sm" label={`${prefix} loading`} />
      </Group>
      <Alert tone="info" title="An alert">
        Reads the info tone.
      </Alert>
      {/* P79-0: where a tone meets an element that did not declare one. */}
      <Alert tone="danger" data-testid={`${prefix}-tone-alert`}>
        <Text data-testid={`${prefix}-tone-plain`}>plain text inside a toned alert</Text>
      </Alert>
      <Text tone="muted" data-testid={`${prefix}-tone-muted`}>
        muted text with <Anchor href="#top" data-testid={`${prefix}-tone-anchor`}>a link</Anchor>
      </Text>
      <Button loading data-testid={`${prefix}-tone-loading`}>
        loading
      </Button>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
        <Paper withBorder padding="sm">
          <Text size="sm">bordered paper</Text>
        </Paper>
        <Card padding="sm" raised>
          <Card.Section withBorder padding="xs">
            <Text weight={600}>card section</Text>
          </Card.Section>
          <Text size="sm">card body</Text>
        </Card>
      </SimpleGrid>
      <Grid gap="sm">
        <Grid.Col span={8}>
          <Skeleton height={12} />
        </Grid.Col>
        <Grid.Col span={4}>
          <Skeleton height={12} />
        </Grid.Col>
      </Grid>
      <Divider label="table" labelPosition="left" />
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>name</Table.Th>
            <Table.Th>status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr>
            <Table.Td>a campaign</Table.Td>
            <Table.Td>live</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Button variant="subtle" onClick={() => setOpen((v) => !v)}>
        toggle {prefix} collapse
      </Button>
      <Collapse in={open}>
        <Text size="sm">collapsed content</Text>
      </Collapse>
      <Center paddingBlock="sm">
        <Image alt="a placeholder" src="/missing.png" width={80} height={40} radius="sm" />
      </Center>
      <VisuallyHidden>hidden to the eye, present to a reader</VisuallyHidden>
      {withOverlays && <Overlays prefix={prefix} />}
      {withSelects && <Selects prefix={prefix} />}
      {withChoice && <Choices prefix={prefix} />}
      {withChoice && <Toggles prefix={prefix} />}
      {withChoice && <Gaps prefix={prefix} />}
      {withNesting && <Nesting prefix={prefix} />}
      {withKeyboard && <KeyboardExtras prefix={prefix} />}
    </Stack>
  );
}

/**
 * P80-B: tabs, the segmented control and the accordion. The segmented
 * indicator is the part that cannot be proved in jsdom, which reports every
 * box as zero: its position comes from a measurement of the checked segment,
 * so a browser is the only place it means anything.
 */
function Choices({ prefix }: { prefix: string }) {
  const [view, setView] = useState('grid');
  const [tab, setTab] = useState<string | null>('one');
  return (
    <Stack gap="sm" padding="md" data-testid={`${prefix}-choices`}>
      <Divider label="choices" labelPosition="left" />
      <SegmentedControl
        aria-label={`${prefix} view mode`}
        data={['grid', 'list', 'map']}
        value={view}
        onChange={setView}
        data-testid={`${prefix}-segmented`}
      />
      <Tabs value={tab} onChange={setTab} data-testid={`${prefix}-tabs`}>
        <Tabs.List aria-label={`${prefix} sections`} data-testid={`${prefix}-tabs-list`}>
          <Tabs.Tab value="one" data-testid={`${prefix}-tab-one`}>
            first
          </Tabs.Tab>
          <Tabs.Tab value="two" data-testid={`${prefix}-tab-two`}>
            second tab
          </Tabs.Tab>
          <Tabs.Tab value="three">third</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">first panel</Tabs.Panel>
        <Tabs.Panel value="two">second panel</Tabs.Panel>
        <Tabs.Panel value="three">third panel</Tabs.Panel>
      </Tabs>
      <Accordion defaultValue="a" data-testid={`${prefix}-accordion`}>
        <Accordion.Item value="a">
          <Accordion.Control data-testid={`${prefix}-accordion-a`}>appearance</Accordion.Control>
          <Accordion.Panel>appearance body</Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="b">
          <Accordion.Control data-testid={`${prefix}-accordion-b`}>behaviour</Accordion.Control>
          <Accordion.Panel>behaviour body</Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

/**
 * P80-B: the two components Base UI does not ship. The picker's surface is
 * pointer-and-rect code of ours, so a browser is the only place its geometry
 * means anything.
 */
/**
 * An outer row and column that set every layout property, each holding an
 * inner one that sets none. Custom properties inherit, so an inner primitive
 * that read its parent's would spread its children or take its padding.
 */
function Nesting({ prefix }: { prefix: string }) {
  return (
    <Stack gap="xl" align="flex-end" padding="xl" data-testid={`${prefix}-nest-outer-stack`}>
      <Stack data-testid={`${prefix}-nest-inner-stack`}>
        <span>one</span>
        <span>two</span>
      </Stack>
      <Group justify="space-between" align="flex-end" wrap="nowrap" gap="xl" padding="lg" style={{ width: '40rem' }}>
        <Group data-testid={`${prefix}-nest-inner-group`} style={{ flex: '1 1 auto' }}>
          <span>one</span>
          <span>two</span>
        </Group>
        <span>end</span>
      </Group>
      <Text size="lg" weight={600} transform="uppercase" data-testid={`${prefix}-nest-outer-text`}>
        outer{' '}
        <Text span data-testid={`${prefix}-nest-inner-text`}>
          inner
        </Text>
      </Text>
      <Box padding="lg" data-testid={`${prefix}-nest-box`}>
        <span>padded</span>
      </Box>
      <Stack padding="xl" gap="xl">
        <Alert tone="info" data-testid={`${prefix}-nest-alert`}>
          an alert inside a padded stack
        </Alert>
      </Stack>
      <Group grow gap="sm" data-testid={`${prefix}-nest-grow`} style={{ width: '20rem' }}>
        <span style={{ whiteSpace: 'nowrap' }}>a label far wider than its equal share of the row</span>
        <span>short</span>
      </Group>
    </Stack>
  );
}

function Gaps({ prefix }: { prefix: string }) {
  const [page, setPage] = useState(4);
  const [colour, setColour] = useState('rgba(18, 52, 86, 0.5)');
  return (
    <Stack gap="sm" padding="md" data-testid={`${prefix}-gaps`}>
      <Divider label="gaps" labelPosition="left" />
      <Pagination
        value={page}
        onChange={setPage}
        total={20}
        aria-label={`${prefix} pages`}
        data-testid={`${prefix}-pagination`}
      />
      <ColorInput
        label={`${prefix} background colour`}
        value={colour}
        onChange={setColour}
        format="rgba"
        swatches={['#102530', '#0d1117', '#ffffff', 'transparent']}
        data-testid={`${prefix}-color-input`}
      />
    </Stack>
  );
}

/**
 * P80-B: the choice controls. The slider's thumb and its value bubble are the
 * parts a browser has to measure; jsdom reports every box as zero.
 */
function Toggles({ prefix }: { prefix: string }) {
  const [on, setOn] = useState(true);
  const [opacity, setOpacity] = useState(0.5);
  const [filter, setFilter] = useState('all');
  return (
    <Stack gap="sm" padding="md" data-testid={`${prefix}-toggles`}>
      <Divider label="toggles" labelPosition="left" />
      <Checkbox
        label={`${prefix} purge analytics`}
        description="cannot be undone"
        data-testid={`${prefix}-checkbox`}
      />
      <Checkbox label={`${prefix} select all`} indeterminate data-testid={`${prefix}-checkbox-mixed`} />
      <Switch
        label={`${prefix} backdrop blur`}
        description="blurs content behind open drawers"
        checked={on}
        onChange={setOn}
        data-testid={`${prefix}-switch`}
      />
      <Slider
        aria-label={`${prefix} opacity`}
        value={opacity}
        onChange={setOpacity}
        min={0}
        max={1}
        step={0.05}
        label={(v) => `${Math.round(v * 100)}%`}
        marks={[{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }]}
        data-testid={`${prefix}-slider`}
      />
      <Chip.Group multiple={false} value={filter} onChange={(v) => setFilter((v as string) || 'all')}>
        <Group gap="xs" data-testid={`${prefix}-chip-group`}>
          <Chip value="all">all</Chip>
          <Chip value="mine">mine</Chip>
          <Chip value="shared">shared</Chip>
        </Group>
      </Chip.Group>
    </Stack>
  );
}

/**
 * P80-D: the fixtures a keyboard contract needs and no earlier section has.
 * The input family has never been on this page, `MultiSelect` neither, and
 * the overlay menu is too short for typeahead and has no disabled item.
 */
function KeyboardExtras({ prefix }: { prefix: string }) {
  const [name, setName] = useState('');
  const [width, setWidth] = useState<number | null>(12);
  const [roles, setRoles] = useState<string[]>([]);
  const [picked, setPicked] = useState('none');
  return (
    <Stack gap="sm" padding="md" data-testid={`${prefix}-keyboard`}>
      <Divider label="keyboard extras" labelPosition="left" />
      <TextInput
        label={`${prefix} gallery name`}
        description="shown above the gallery"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        data-testid={`${prefix}-text-input`}
      />
      <Textarea label={`${prefix} caption`} minRows={2} data-testid={`${prefix}-textarea`} />
      <PasswordInput label={`${prefix} api key`} data-testid={`${prefix}-password`} />
      <NumberInput
        label={`${prefix} gap`}
        value={width}
        onChange={setWidth}
        min={0}
        max={20}
        step={2}
        unit="px"
        data-testid={`${prefix}-number`}
      />
      <MultiSelect
        label={`${prefix} roles`}
        data={SELECT_ROLES}
        value={roles}
        onChange={setRoles}
        placeholder="pick roles"
        data-testid={`${prefix}-multiselect`}
      />
      <Group gap="sm" align="center">
        <Menu>
          <Menu.Trigger render={<Button variant="outline" data-testid={`${prefix}-long-menu-trigger`} />}>
            {prefix} long menu
          </Menu.Trigger>
          <Menu.Content data-testid={`${prefix}-long-menu`}>
            <Menu.Item onClick={() => setPicked('archive')}>archive</Menu.Item>
            <Menu.Item onClick={() => setPicked('copy')}>copy link</Menu.Item>
            <Menu.Item disabled>disabled export</Menu.Item>
            <Menu.Item onClick={() => setPicked('rename')}>rename</Menu.Item>
            <Menu.Item onClick={() => setPicked('share')}>share</Menu.Item>
          </Menu.Content>
        </Menu>
        <Text size="sm" data-testid={`${prefix}-long-menu-picked`}>
          picked: {picked}
        </Text>
      </Group>
    </Stack>
  );
}

const SELECT_ROLES = [
  { value: 'admin', label: 'Administrator' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
];

const SELECT_FONTS = [
  { group: 'Recently used', items: [{ value: 'inter', label: 'Inter' }] },
  {
    group: 'System',
    items: [
      { value: 'system-ui', label: 'System UI' },
      { value: 'georgia', label: 'Georgia' },
    ],
  },
];

/**
 * P80-B: the select family. The triggers live in the scope under test, so the
 * decisive question is observable in a browser: does the listbox land in the
 * trigger's own root, and does arrowing to an option and pressing Enter pick
 * it? That is the contract every Mantine dropdown in the product fails today.
 */
function Selects({ prefix }: { prefix: string }) {
  const [role, setRole] = useState<string | null>(null);
  const [font, setFont] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  return (
    <Stack gap="sm" padding="md" data-testid={`${prefix}-selects`}>
      <Divider label="selects" labelPosition="left" />
      <Group gap="sm" align="flex-end">
        <Select
          label={`${prefix} role`}
          data={SELECT_ROLES}
          value={role}
          onChange={setRole}
          placeholder="pick a role"
          data-testid={`${prefix}-select-trigger`}
        />
        <Select
          label={`${prefix} font`}
          data={SELECT_FONTS}
          value={font}
          onChange={setFont}
          searchable
          searchPlaceholder="type to filter"
          nothingFoundMessage="no font matches that"
          data-testid={`${prefix}-select-search`}
        />
        <TagsInput
          label={`${prefix} tags`}
          value={tags}
          onChange={setTags}
          placeholder="type and press Enter"
          data-testid={`${prefix}-tags-input`}
        />
      </Group>
    </Stack>
  );
}

/**
 * P80-A: the overlays, each with a trigger the ring walk and the focus-return
 * check can address. The triggers live in the scope under test, so a modal
 * opened from inside the gallery shadow root has to return focus across that
 * boundary, which is the defect Mantine has today.
 */
function Overlays({ prefix }: { prefix: string }) {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  // P80-F item 2: a modal stacked on another a commit later, and two siblings opened in one commit.
  const [stacked, setStacked] = useState(false);
  const [pair, setPair] = useState(false);
  return (
    <Stack gap="sm" padding="md" data-testid={`${prefix}-overlays`}>
      <Divider label="overlays" labelPosition="left" />
      <Group gap="sm">
        <Button data-testid={`${prefix}-modal-trigger`} onClick={() => setModal(true)}>
          {prefix} modal
        </Button>
        <Button variant="light" data-testid={`${prefix}-drawer-trigger`} onClick={() => setDrawer(true)}>
          {prefix} drawer
        </Button>
        <Menu>
          <Menu.Trigger render={<Button variant="outline" data-testid={`${prefix}-menu-trigger`} />}>
            {prefix} menu
          </Menu.Trigger>
          <Menu.Content data-testid={`${prefix}-menu-content`}>
            <Menu.Item data-testid={`${prefix}-menu-item`}>first item</Menu.Item>
            <Menu.Item>second item</Menu.Item>
            <Menu.Divider />
            <Menu.Item tone="danger" data-testid={`${prefix}-menu-danger`}>
              delete
            </Menu.Item>
          </Menu.Content>
        </Menu>
        <Popover>
          <Popover.Trigger render={<Button variant="subtle" data-testid={`${prefix}-popover-trigger`} />}>
            {prefix} popover
          </Popover.Trigger>
          <Popover.Content width={240} padding="md" data-testid={`${prefix}-popover-content`}>
            <Text size="sm">popover body</Text>
            <Button variant="light">inside the popover</Button>
          </Popover.Content>
        </Popover>
        <Tooltip label={`${prefix} tooltip label`} openDelay={0}>
          <Button variant="default" data-testid={`${prefix}-tooltip-trigger`}>
            {prefix} tooltip
          </Button>
        </Tooltip>
        <Button variant="default" data-testid={`${prefix}-pair-trigger`} onClick={() => setPair(true)}>
          {prefix} two modals
        </Button>
      </Group>

      <Modal
        opened={modal}
        onClose={() => setModal(false)}
        title={`${prefix} modal`}
        data-testid={`${prefix}-modal`}
      >
        <Stack gap="sm">
          <Text size="sm">modal body</Text>
          <Button data-testid={`${prefix}-modal-inside`}>inside the modal</Button>
          <Button variant="light" data-testid={`${prefix}-stack-trigger`} onClick={() => setStacked(true)}>
            stack another
          </Button>
        </Stack>
      </Modal>

      <Modal opened={stacked} onClose={() => setStacked(false)} title={`${prefix} stacked modal`}>
        <Button data-testid={`${prefix}-stacked-inside`}>inside the stacked modal</Button>
      </Modal>

      <Modal opened={pair} onClose={() => setPair(false)} title={`${prefix} first of two`}>
        <Text size="sm">first</Text>
      </Modal>
      <Modal opened={pair} onClose={() => setPair(false)} title={`${prefix} second of two`}>
        <Text size="sm">second</Text>
      </Modal>

      <Drawer
        opened={drawer}
        onClose={() => setDrawer(false)}
        title={`${prefix} drawer`}
        position="right"
        data-testid={`${prefix}-drawer`}
      >
        <Stack gap="sm">
          <Text size="sm">drawer body</Text>
          <Button data-testid={`${prefix}-drawer-inside`}>inside the drawer</Button>
        </Stack>
      </Drawer>
    </Stack>
  );
}

/**
 * The chrome: a nested provider in lock or follow mode whose content is
 * portaled into the provider's container, which lives in the overlay root.
 * This is the case `adminChromeStyles()` exists to fake in the Mantine tree.
 */
/**
 * P80-C: the notification and confirmation managers. The triggers live here
 * rather than in `Gallery` because `Gallery` renders twice, and a duplicated
 * trigger is the strict-mode violation P80-B spent a batch scoping around.
 */
function Managers() {
  return (
    <Stack gap="sm" padding="md" data-testid="managers">
      <Divider label="managers" labelPosition="left" />
      <Group gap="sm">
        <Button
          data-testid="notify-success"
          onClick={() =>
            notify.show({ title: 'Layout saved', message: 'Your changes are live.', color: 'green' })
          }
        >
          success toast
        </Button>
        <Button
          data-testid="notify-danger"
          onClick={() =>
            notify.show({ title: 'Save failed', message: 'The server rejected it.', color: 'red', autoClose: false })
          }
        >
          persistent danger toast
        </Button>
        <Button
          data-testid="notify-plain"
          onClick={() => notify.show({ message: 'Ungrouped', color: 'gray', autoClose: false })}
        >
          plain toast
        </Button>
        <Button data-testid="notify-clean" onClick={() => notify.clean()}>
          clear toasts
        </Button>
        <Button
          data-testid="confirm-open"
          onClick={() =>
            void confirm({
              title: 'Discard changes?',
              children: 'You have unsaved changes. Discard them?',
              labels: { confirm: 'Discard', cancel: 'Keep editing' },
              confirmProps: { color: 'red' },
            })
          }
        >
          open confirm
        </Button>
      </Group>
    </Stack>
  );
}

function Chrome() {
  const container = useMullionPortal();
  return createPortal(
    <Container size="sm" padding="md" data-testid="overlay-panel" style={GROUND}>
      <Gallery prefix="overlay" />
    </Container>,
    container,
  );
}

/**
 * The ground. A gallery's background and text colour belong to the app, not
 * the framework: `global.scss` paints them under `.mullion-gallery` in the
 * real mount, and a framework component paints only its own surface. The
 * fixture is the app here, so it does the same job from the same tokens.
 */
const GROUND = {
  backgroundColor: 'var(--mullion-color-background)',
  color: 'var(--mullion-color-text)',
  minHeight: '100vh',
} as const;

function Showcase() {
  const body = (
    <Container size="lg" padding="md" style={GROUND}>
      <Gallery prefix="inline" />
      {withManagers && <Managers />}
      {withManagers && <Notifications label="Notifications" closeButtonLabel="Dismiss" />}
      {withManagers && <Confirmations />}
      <MullionProvider mode={chromeMode}>
        <Chrome />
      </MullionProvider>
    </Container>
  );
  if (!hostileHost) return body;
  /*
   * The P77-B probe: a transformed ancestor (which makes `position: fixed`
   * resolve against it rather than the viewport) and a sticky header above
   * every layer the scale defines. An overlay that is not portaled out of
   * here is clipped by the transform and covered by the header.
   */
  return (
    <div style={{ transform: 'translateZ(0)', position: 'relative' }} data-testid="hostile-host">
      <div
        data-testid="hostile-header"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          padding: '8px 16px',
          backgroundColor: 'var(--mullion-color-surface-raised)',
          color: 'var(--mullion-color-text)',
        }}
      >
        sticky header at z-index 9999
      </div>
      {body}
    </div>
  );
}

function overlayRoot(rootId: string): HTMLElement {
  const host = document.createElement('div');
  host.setAttribute('data-mullion-overlay-root', rootId);
  const shadow = host.attachShadow({ mode: 'open' });
  const target = document.createElement('div');
  target.setAttribute('data-mullion-portal', rootId);
  shadow.appendChild(target);
  document.body.appendChild(host);
  return target;
}

/**
 * Deliberately NOT `class="mullion-gallery"`. `main.tsx` is still on the page
 * and mounts the real app into any element with that class, which it did on
 * the first run of this fixture: two apps, two overlay roots and one contested
 * shadow root. The framework components need no `.mullion-gallery` ancestor,
 * because they read tokens rather than `global.scss`.
 */
const host = document.getElementById('showcase') ?? document.body.appendChild(document.createElement('div'));
host.id = 'showcase';

const rootId = 'showcase';
/** `?portal=provider` uses the provider's own container in the light DOM rather than an overlay root. */
const portal = params.get('portal') === 'provider' ? undefined : overlayRoot(rootId);

if (useShadow) {
  const shadow = host.attachShadow({ mode: 'open' });
  const mount = document.createElement('div');
  mount.setAttribute('data-mullion-mount', rootId);
  shadow.appendChild(mount);
  createRoot(mount).render(
    <StrictMode>
      <MullionProvider theme={themeId} scope={shadow} portal={portal} instanceId={rootId}>
        <Showcase />
      </MullionProvider>
    </StrictMode>,
  );
} else {
  const mount = document.createElement('div');
  mount.setAttribute('data-mullion-mount', rootId);
  host.appendChild(mount);
  createRoot(mount).render(
    <StrictMode>
      <MullionProvider theme={themeId} scope="document" portal={portal} instanceId={rootId}>
        <Showcase />
      </MullionProvider>
    </StrictMode>,
  );
}

/*
 * `?twin=1`: a second gallery root on the page with its own provider and its
 * own manager hosts, as a page with two shortcodes has (P80-F). One `notify` or
 * `confirm()` must still produce one toast or one dialog.
 */
if (params.get('twin') === '1') {
  const twinId = 'showcase-twin';
  const twinHost = document.body.appendChild(document.createElement('div'));
  twinHost.id = twinId;
  const twinShadow = twinHost.attachShadow({ mode: 'open' });
  const twinMount = twinShadow.appendChild(document.createElement('div'));
  createRoot(twinMount).render(
    <StrictMode>
      <MullionProvider theme={themeId} scope={twinShadow} portal={overlayRoot(twinId)} instanceId={twinId}>
        <Notifications label="Notifications" closeButtonLabel="Dismiss" />
        <Confirmations />
        <Text size="sm" data-testid="twin-ready">
          second gallery
        </Text>
      </MullionProvider>
    </StrictMode>,
  );
}
