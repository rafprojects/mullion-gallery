/**
 * P79-C: the presentational set, one block per thing the components promise.
 *
 * jsdom computes no custom properties and resolves no cascade, so nothing here
 * asserts a painted colour. What it can prove is the contract between the TSX
 * and the sheets: which class an element carries, which data attribute a
 * variant becomes, and which inline custom property a prop value lands in.
 * The painted result is `e2e/ui-showcase.spec.ts` and the ring walk in
 * `e2e/theme-qa.spec.ts`.
 */

import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { listUiStyles, uiStylesText } from '../styles/uiStyles';
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
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
  FOCUS_ATTR,
} from '../components';

/** The inline custom properties an element carries, as the sheets read them. */
function vars(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  const style = (el as HTMLElement).style;
  for (let i = 0; i < style.length; i++) {
    const name = style.item(i);
    if (name.startsWith('--')) out[name] = style.getPropertyValue(name).trim();
  }
  return out;
}

describe('layout primitives', () => {
  it('render a scale step as a token and a number as pixels', () => {
    const { container } = render(
      <>
        <Stack gap="md" data-testid="scale" />
        <Stack gap={4} data-testid="pixels" />
        <Stack gap="0.5em" data-testid="raw" />
      </>,
    );
    const [scale, pixels, raw] = Array.from(container.querySelectorAll('.mullion-stack'));
    expect(vars(scale!)['--mullion-gap']).toBe('var(--mullion-spacing-md)');
    expect(vars(pixels!)['--mullion-gap']).toBe('4px');
    expect(vars(raw!)['--mullion-gap']).toBe('0.5em');
  });

  it('put alignment on the element rather than in a rule per combination', () => {
    const { container } = render(<Group align="center" justify="space-between" wrap="nowrap" grow />);
    const group = container.querySelector('.mullion-group')!;
    expect(vars(group)).toMatchObject({
      '--mullion-align': 'center',
      '--mullion-justify': 'space-between',
      '--mullion-wrap': 'nowrap',
    });
    expect(group.hasAttribute('data-grow')).toBe(true);
  });

  it('resolve all three padding props into the one idiom the sheets read', () => {
    const { container } = render(<Center padding="sm" paddingBlock={12} paddingInline="1rem" />);
    expect(vars(container.querySelector('.mullion-center')!)).toEqual({
      '--mullion-pad': 'var(--mullion-spacing-sm)',
      '--mullion-pad-block': '12px',
      '--mullion-pad-inline': '1rem',
    });
  });

  it('leave the style attribute off entirely when no prop sets a value', () => {
    const { container } = render(<Stack />);
    expect(container.querySelector('.mullion-stack')!.hasAttribute('style')).toBe(false);
  });

  it('give Box no class, because it has no rule', () => {
    const { container } = render(<Box padding="md">content</Box>);
    const box = container.firstElementChild!;
    expect(box.className).toBe('');
    expect(vars(box)['--mullion-pad']).toBe('var(--mullion-spacing-md)');
  });

  it('map Container sizes through their own scale, not the spacing one', () => {
    const { container } = render(
      <>
        <Container size="sm" />
        <Container size={800} />
        <Container fluid />
      </>,
    );
    const [step, px, fluid] = Array.from(container.querySelectorAll('.mullion-container'));
    expect(vars(step!)['--mullion-container-size']).toBe('48rem');
    expect(vars(px!)['--mullion-container-size']).toBe('800px');
    expect(fluid!.hasAttribute('data-fluid')).toBe(true);
  });

  it('carry a Grid column span and a SimpleGrid column count per breakpoint', () => {
    const { container } = render(
      <>
        <Grid gap="sm">
          <Grid.Col span={4} />
        </Grid>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xs" />
      </>,
    );
    expect(vars(container.querySelector('.mullion-grid-col')!)['--mullion-grid-span']).toBe('4');
    const simple = vars(container.querySelector('.mullion-simple-grid')!);
    expect(simple['--mullion-cols']).toBe('1');
    expect(simple['--mullion-cols-md']).toBe('3');
    expect(simple['--mullion-cols-sm']).toBeUndefined();
  });
});

describe('typography', () => {
  it('turns the colour role into an attribute and never into a value', () => {
    const { container } = render(<Text tone="muted">quiet</Text>);
    const text = container.querySelector('.mullion-text')!;
    expect(text.getAttribute('data-mullion-tone')).toBe('muted');
    expect(text.getAttribute('style')).toBeNull();
  });

  it('reads the theme type scale for a scale step and passes anything else through', () => {
    const { container } = render(
      <>
        <Text size="sm" />
        <Text size="10px" />
      </>,
    );
    const [step, raw] = Array.from(container.querySelectorAll('.mullion-text'));
    expect(vars(step!)['--mullion-font-size']).toBe('var(--mullion-font-size-sm)');
    expect(vars(raw!)['--mullion-font-size']).toBe('10px');
  });

  it('renders a span when asked, and flags truncation and clamping for the sheet', () => {
    const { container } = render(
      <>
        <Text span truncate>
          one line
        </Text>
        <Text lineClamp={2}>two lines</Text>
      </>,
    );
    const [truncated, clamped] = Array.from(container.querySelectorAll('.mullion-text'));
    expect(truncated!.tagName).toBe('SPAN');
    expect(truncated!.hasAttribute('data-truncate')).toBe(true);
    expect(clamped!.tagName).toBe('P');
    expect(vars(clamped!)['--mullion-line-clamp']).toBe('2');
  });

  it('lets a Title sit at one outline level and paint another', () => {
    render(
      <Title order={3} size={5}>
        Section
      </Title>,
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading.tagName).toBe('H3');
    expect(heading.getAttribute('data-level')).toBe('5');
  });

  it('makes an Anchor focusable to the framework and underlines on hover by default', () => {
    render(<Anchor href="https://example.com">link</Anchor>);
    const anchor = screen.getByRole('link');
    expect(anchor.getAttribute(FOCUS_ATTR)).toBe('');
    expect(anchor.getAttribute('data-underline')).toBe('hover');
  });

  it('renders Kbd as the element that means it', () => {
    const { container } = render(<Kbd>Esc</Kbd>);
    expect(container.querySelector('kbd')!.className).toBe('mullion-kbd');
  });
});

describe('surfaces', () => {
  it('says raised rather than naming a grey', () => {
    const { container } = render(<Paper raised withBorder radius="lg" shadow="sm" padding="md" />);
    const paper = container.querySelector('.mullion-paper')!;
    expect(paper.hasAttribute('data-raised')).toBe(true);
    expect(paper.hasAttribute('data-with-border')).toBe(true);
    expect(vars(paper)).toMatchObject({
      '--mullion-radius': 'var(--mullion-radius-lg)',
      '--mullion-shadow': 'var(--mullion-shadow-sm)',
    });
  });

  it('renders a card section as a part of the card', () => {
    const { container } = render(
      <Card padding="md">
        <Card.Section withBorder>header</Card.Section>
      </Card>,
    );
    const section = container.querySelector('.mullion-card-section')!;
    expect(section.hasAttribute('data-with-border')).toBe(true);
    expect(section.parentElement!.className).toBe('mullion-card');
  });

  it('gives a divider a separator role and drops the label when vertical', () => {
    render(
      <>
        <Divider label="Position" labelPosition="left" />
        <Divider orientation="vertical" label="ignored" />
      </>,
    );
    const [horizontal, vertical] = screen.getAllByRole('separator');
    expect(horizontal!.getAttribute('data-label-position')).toBe('left');
    expect(horizontal!.textContent).toBe('Position');
    expect(vertical!.getAttribute('aria-orientation')).toBe('vertical');
    expect(vertical!.hasAttribute('data-label-position')).toBe(false);
    expect(vertical!.textContent).toBe('');
  });
});

describe('controls', () => {
  it('default to type="button" and stamp the focus attribute', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute(FOCUS_ATTR)).toBe('');
  });

  it('keep an explicit type, because a submit button in a form means it', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button').getAttribute('type')).toBe('submit');
  });

  it('turn variant, size and tone into attributes the sheet reads', () => {
    render(
      <Button variant="light" size="xs" tone="danger" compact fullWidth>
        Delete
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button.getAttribute('data-variant')).toBe('light');
    expect(button.getAttribute('data-size')).toBe('xs');
    expect(button.getAttribute('data-mullion-tone')).toBe('danger');
    expect(button.hasAttribute('data-compact')).toBe(true);
    expect(button.hasAttribute('data-full-width')).toBe(true);
  });

  it('swap the left section for a spinner while loading, and stop taking clicks', () => {
    const onClick = vi.fn();
    render(
      <Button loading leftSection={<span>icon</span>} onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button');
    expect(button.hasAttribute('data-loading')).toBe(true);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.querySelector('.mullion-loader')).not.toBeNull();
    expect(screen.queryByText('icon')).toBeNull();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('take a numeric ActionIcon size as a length rather than a scale step', () => {
    render(
      <>
        <ActionIcon aria-label="step" size="lg" />
        <ActionIcon aria-label="pixels" size={18} />
      </>,
    );
    expect(screen.getByLabelText('step').getAttribute('data-size')).toBe('lg');
    const pixels = screen.getByLabelText('pixels');
    expect(pixels.hasAttribute('data-size')).toBe(false);
    expect(vars(pixels)['--mullion-control-size']).toBe('18px');
  });

  it('name the close button even when nobody passes a label', () => {
    render(<CloseButton />);
    expect(screen.getByRole('button', { name: 'Close' }).className).toContain('mullion-close-button');
  });

  it('keep the chip input real, in the tab order, and drawing its ring on the label', () => {
    const onChange = vi.fn();
    render(<Chip onChange={onChange}>Draft</Chip>);
    const input = screen.getByRole('checkbox');
    expect(input.getAttribute(FOCUS_ATTR)).toBe('sibling');
    expect(input.nextElementSibling!.className).toBe('mullion-chip-label');
    fireEvent.click(input);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('open the file picker from the render prop and reset it so the same file fires again', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FileButton onChange={onChange} accept="image/*">
        {(props) => <Button {...props}>Upload</Button>}
      </FileButton>,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));
    expect(click).toHaveBeenCalledTimes(1);
    fireEvent.change(input, { target: { files: [] } });
    expect(onChange).toHaveBeenCalledWith([]);
    expect(input.value).toBe('');
  });

  it('report a copy that worked and one that did not', async () => {
    const writeText = vi.fn<(value: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(
      <CopyButton value="token" timeout={5}>
        {({ copied, copy }) => (
          <Button onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
        )}
      </CopyButton>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith('token');

    writeText.mockRejectedValueOnce(new Error('denied'));
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('leave UnstyledButton with nothing but the reset', () => {
    render(<UnstyledButton>bare</UnstyledButton>);
    expect(screen.getByRole('button').className).toBe('mullion-unstyled-button');
  });
});

describe('feedback and display', () => {
  it('give an alert its role, its tone and its parts', () => {
    render(
      <Alert tone="danger" title="Failed" icon={<span>!</span>}>
        body
      </Alert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('data-mullion-tone')).toBe('danger');
    expect(alert.getAttribute('data-variant')).toBe('light');
    expect(alert.querySelector('.mullion-alert-title')!.textContent).toBe('Failed');
    expect(alert.querySelector('.mullion-alert-icon')!.textContent).toBe('!');
  });

  it('default a badge to the primary tone in the light variant', () => {
    const { container } = render(<Badge>New</Badge>);
    const badge = container.querySelector('.mullion-badge')!;
    expect(badge.getAttribute('data-mullion-tone')).toBe('primary');
    expect(badge.getAttribute('data-variant')).toBe('light');
    expect(badge.getAttribute('data-size')).toBe('sm');
  });

  it('name a loader for a screen reader when it is the only thing on screen', () => {
    render(<Loader label="Loading campaigns" size={32} />);
    const loader = screen.getByRole('status');
    expect(loader.getAttribute('aria-label')).toBe('Loading campaigns');
    expect(vars(loader)['--mullion-loader-size']).toBe('32px');
  });

  it('hide a skeleton from the accessibility tree and show children once it is not visible', () => {
    const { container, rerender } = render(
      <Skeleton width={80} circle>
        <span>ready</span>
      </Skeleton>,
    );
    const skeleton = container.querySelector('.mullion-skeleton')!;
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.hasAttribute('data-circle')).toBe(true);
    rerender(
      <Skeleton visible={false}>
        <span>ready</span>
      </Skeleton>,
    );
    expect(container.querySelector('.mullion-skeleton')).toBeNull();
    expect(screen.getByText('ready')).toBeTruthy();
  });

  it('fall back when an image fails, and only when a fallback was given', () => {
    const { container, rerender } = render(
      <Image src="/broken.png" fallbackSrc="/placeholder.png" alt="a campaign" />,
    );
    const image = container.querySelector('img')!;
    fireEvent.error(image);
    expect(image.getAttribute('src')).toBe('/placeholder.png');

    rerender(<Image src="/also-broken.png" alt="a campaign" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/also-broken.png');

    // [P79-0] The component's own error handler was replacing the caller's.
    const onError = vi.fn();
    rerender(<Image src="/x.png" fallbackSrc="/y.png" alt="a campaign" onError={onError} />);
    fireEvent.error(container.querySelector('img')!);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(container.querySelector('img')!.getAttribute('src')).toBe('/y.png');
  });

  it('carries a swatch colour inline, the one colour the framework takes as a prop', () => {
    const { container } = render(<ColorSwatch color="#ff0055" size={16} />);
    expect(vars(container.querySelector('.mullion-color-swatch')!)).toMatchObject({
      '--mullion-swatch-color': '#ff0055',
      '--mullion-swatch-size': '16px',
    });
  });

  it('keeps the compound table spelling the codebase already uses', () => {
    const { container } = render(
      <Table.ScrollContainer minWidth={640} data-testid="scroller">
        <Table striped highlightOnHover withTableBorder verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td>Row</Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>,
    );
    const table = container.querySelector('table')!;
    expect(table.getAttribute('data-spacing')).toBe('xs');
    expect(table.hasAttribute('data-striped')).toBe(true);
    expect(table.hasAttribute('data-hover')).toBe(true);
    expect(container.querySelector('th')!.className).toBe('mullion-table-th');
    expect(container.querySelector('td')!.className).toBe('mullion-table-td');
    expect(vars(container.querySelector('.mullion-table-scroll')!)['--mullion-table-min-width']).toBe(
      '640px',
    );
    expect(container.querySelector('.mullion-table-scroll')!.getAttribute('data-testid')).toBe('scroller');
  });
});

describe('structural utilities', () => {
  it('clips visually hidden content instead of removing it', () => {
    render(<VisuallyHidden>skip to content</VisuallyHidden>);
    expect(screen.getByText('skip to content').className).toBe('mullion-visually-hidden');
  });

  it('flags a collapse open or closed and hides the closed one from assistive tech', () => {
    const { container, rerender } = render(
      <Collapse in={false} data-testid="filters">
        <button type="button">inside</button>
      </Collapse>,
    );
    const collapse = container.querySelector('.mullion-collapse')!;
    expect(collapse.hasAttribute('data-open')).toBe(false);
    expect(collapse.getAttribute('aria-hidden')).toBe('true');
    // [P79-0] Closed content is clipped rather than removed, so it has to be
    // inert or its button stays a tab stop behind a zero-height box.
    expect(collapse.hasAttribute('inert')).toBe(true);
    expect(collapse.getAttribute('data-testid')).toBe('filters');
    rerender(<Collapse in duration={120}>shown</Collapse>);
    const open = container.querySelector('.mullion-collapse')!;
    expect(open.hasAttribute('data-open')).toBe(true);
    expect(open.hasAttribute('aria-hidden')).toBe(false);
    expect(open.hasAttribute('inert')).toBe(false);
    expect(vars(open)['--mullion-collapse-duration']).toBe('120ms');
  });
});

describe('props the framework does not own', () => {
  // Found by building the e2e showcase: every component that reads padding
  // props took them out of the prop bag by reading `...rest` and then never
  // forwarded what was left, so a `data-testid` or an `aria-label` on a
  // layout primitive vanished. Worse, the ones that did forward `rest` put
  // `padding="md"` on the element as an attribute.
  it('forwards what it was given and keeps its own props off the element', () => {
    const { container } = render(
      <Stack padding="md" gap="sm" align="center" data-testid="passed" aria-label="a stack" id="s1" />,
    );
    const stack = container.querySelector('.mullion-stack')!;
    expect(stack.getAttribute('data-testid')).toBe('passed');
    expect(stack.getAttribute('aria-label')).toBe('a stack');
    expect(stack.getAttribute('id')).toBe('s1');
    for (const own of ['padding', 'gap', 'align', 'justify', 'paddingblock', 'paddinginline']) {
      expect(stack.hasAttribute(own), `${own} leaked onto the element as an attribute`).toBe(false);
    }
  });

  it('does the same for every component that takes padding', () => {
    const { container } = render(
      <>
        <Box padding="sm" data-testid="box" />
        <Group padding="sm" data-testid="group" />
        <Center padding="sm" data-testid="center" />
        <Container padding="sm" data-testid="container" />
        <Grid padding="sm" data-testid="grid" />
        <SimpleGrid padding="sm" data-testid="simple-grid" />
        <Paper padding="sm" data-testid="paper" />
        <Card padding="sm" data-testid="card" />
        <Alert padding="sm" data-testid="alert" />
      </>,
    );
    for (const id of [
      'box',
      'group',
      'center',
      'container',
      'grid',
      'simple-grid',
      'paper',
      'card',
      'alert',
    ]) {
      const el = container.querySelector(`[data-testid="${id}"]`);
      expect(el, `${id} dropped the caller's data-testid`).not.toBeNull();
      expect(el!.hasAttribute('padding'), `${id} leaked padding as an attribute`).toBe(false);
      expect(
        (el as HTMLElement).style.getPropertyValue('--mullion-pad'),
        `${id} did not read the padding prop`,
      ).toBe('var(--mullion-spacing-sm)');
    }
  });

  it('keeps a card section bleeding and forwarding at once', () => {
    const { container } = render(
      <Card padding="md">
        <Card.Section paddingBlock="xs" data-testid="section" aria-label="header" />
      </Card>,
    );
    const section = container.querySelector('[data-testid="section"]') as HTMLElement;
    expect(section.getAttribute('aria-label')).toBe('header');
    expect(section.hasAttribute('paddingblock')).toBe(false);
    expect(section.style.getPropertyValue('--mullion-pad-block')).toBe('var(--mullion-spacing-xs)');
  });
});

describe('the render escape hatch', () => {
  it('renders the supplied element with the component class merged in', () => {
    render(<Text render={<label className="mine" htmlFor="field" />}>Label</Text>);
    const label = screen.getByText('Label');
    expect(label.tagName).toBe('LABEL');
    expect(label.className).toBe('mullion-text mine');
    expect(label.getAttribute('for')).toBe('field');
  });

  it('lets the supplied element win every prop but the class and the custom properties', () => {
    render(
      <Button render={<a href="/go" aria-label="go elsewhere" />} tone="danger">
        Go
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'go elsewhere' });
    expect(link.getAttribute('href')).toBe('/go');
    expect(link.getAttribute('data-mullion-tone')).toBe('danger');
    expect(link.getAttribute(FOCUS_ATTR)).toBe('');
  });

  it('merges the two style objects rather than letting one replace the other', () => {
    const { container } = render(
      <Stack gap="md" render={<section style={{ color: 'red' }} />} />,
    );
    const section = container.querySelector('section')!;
    expect(vars(section)['--mullion-gap']).toBe('var(--mullion-spacing-md)');
    expect(section.style.color).toBe('red');
  });

  it('hands the props to a render function', () => {
    const seen: Array<Record<string, unknown>> = [];
    render(
      <Group
        gap="sm"
        render={(props) => {
          seen.push(props);
          return <nav {...props} />;
        }}
      />,
    );
    expect(seen[0]!.className).toBe('mullion-group');
    expect(screen.getByRole('navigation')).toBeTruthy();
  });

  it('carries a ref through, because React 19 passes it as a prop', () => {
    const ref = createRef<HTMLElement>();
    render(<Text render={<span ref={ref} />}>held</Text>);
    expect(ref.current!.tagName).toBe('SPAN');
  });
});

describe('the component sheets on the framework list', () => {
  it('registers every family, after the base sheet and with the focus rule last', () => {
    const ids = listUiStyles().map((entry) => entry.id);
    expect(ids[0]).toBe('ui/base');
    for (const family of [
      'ui/layout',
      'ui/surface',
      'ui/typography',
      'ui/control',
      'ui/feedback',
      'ui/display',
      'ui/utility',
    ]) {
      expect(ids, `${family} is not registered`).toContain(family);
      expect(ids.indexOf(family)).toBeGreaterThan(ids.indexOf('ui/base'));
      expect(
        ids.indexOf('ui/tones'),
        'the tone ladder is the vocabulary every component sheet reads, so it registers first',
      ).toBeLessThan(ids.indexOf(family));
      expect(
        ids.indexOf('ui/focus'),
        'the ring must come after every component sheet, or a focusable Card loses its halo to its own elevation',
      ).toBeGreaterThan(ids.indexOf(family));
    }
  });

  it('writes every component rule into the components layer', () => {
    const text = uiStylesText();
    // The one selector that is not scoped by a `.mullion-*` class carries the
    // namespace instead, because under a light mount this sheet is adopted
    // into the document alongside the host page's own markup.
    expect(text).toContain('@layer mullion.components {');
    expect(text).toContain("[data-mullion-tone='muted']");
    expect(text).not.toMatch(/(?<!mullion-)\[data-tone=/);
  });

  // [P79-0] Custom properties inherit, so the ladder's outputs reach every
  // descendant of the element that declared the tone. A component must read
  // `--mullion-tone` only under its own attribute: the first draft read it
  // bare, so an un-toned Text inside a danger Alert painted red, an Anchor
  // inside a muted Text went muted, and a Loader inside a filled Button drew
  // the text rung on the fill.
  it('reads a tone only on the element that declared it', () => {
    const text = uiStylesText();
    const block = (selector: string) => {
      const match = text.match(new RegExp(`\\n  ${selector.replace(/[.[\]]/g, '\\$&')} \\{([^}]*)\\}`));
      expect(match, `${selector} has no rule`).not.toBeNull();
      return match![1]!;
    };
    for (const component of ['.mullion-text', '.mullion-title', '.mullion-anchor', '.mullion-loader']) {
      expect(block(component), `${component} reads the tone without declaring one`).not.toContain('--mullion-tone');
    }
    expect(text).toContain('.mullion-text[data-mullion-tone],');
    expect(text).toContain('.mullion-anchor[data-mullion-tone] {\n    color: var(--mullion-tone);');
    expect(block('.mullion-loader[data-mullion-tone]')).toContain('var(--mullion-tone)');
    // Link text is text: the default is the 4.5:1 rung, not the 3:1 stroke.
    expect(block('.mullion-anchor')).toContain('color: var(--mullion-primary-text);');
    // A spinner inside a control is part of it and takes its ink.
    expect(text).toContain('.mullion-button .mullion-loader,\n  .mullion-action-icon .mullion-loader {\n    color: inherit;');
  });

  it('keeps the ring on one attribute rather than a list of component selectors', () => {
    const text = uiStylesText();
    expect(text).toContain("[data-mullion-focus='']:focus-visible");
    expect(text).toContain("[data-mullion-focus='sibling']:focus-visible + *");
    expect(text).toContain('outline: var(--mullion-focus-ring-width) solid var(--mullion-color-primary-stroke);');
    expect(text).toContain('outline-offset: var(--mullion-focus-ring-offset);');
    expect(text).toContain('box-shadow: 0 0 0 var(--mullion-focus-halo-width) var(--mullion-color-focus-halo);');
  });
});
