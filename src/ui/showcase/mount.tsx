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
} from '../components';

const params = new URLSearchParams(window.location.search);
const useShadow = params.get('mount') !== 'light';
const themeId = params.get('theme') ?? 'default-dark';
const chromeMode = params.get('chrome') === 'follow' ? 'follow' : 'lock';

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
    </Stack>
  );
}

/**
 * The chrome: a nested provider in lock or follow mode whose content is
 * portaled into the provider's container, which lives in the overlay root.
 * This is the case `adminChromeStyles()` exists to fake in the Mantine tree.
 */
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
  return (
    <Container size="lg" padding="md" style={GROUND}>
      <Gallery prefix="inline" />
      <MullionProvider mode={chromeMode}>
        <Chrome />
      </MullionProvider>
    </Container>
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
const portal = overlayRoot(rootId);

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
