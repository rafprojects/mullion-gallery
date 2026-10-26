/**
 * Tabs and the segmented control (P80-B).
 *
 * Both are "pick one of a row", and both are where P77-C found colours that had
 * never painted: the adapter set them as **inline** styles on the part, so a
 * sheet rule targeting the same property lost the cascade every time. Nothing
 * here is inline. Every state is a data attribute the sheet keys on and every
 * colour is a token, which is study principle 2 and the reason the P79-B
 * static tests can prove it.
 *
 * Their semantics are different and so are their primitives. A tab bar
 * switches between panels, so it is Base UI's `Tabs` with `role="tablist"` and
 * `aria-controls` wiring. A segmented control picks a value, so it is a radio
 * group: that is the ARIA Authoring Practices pattern for the interaction, and
 * it is also what Mantine renders, so nothing about the announcement changes
 * when the 27 call sites migrate.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Radio } from '@base-ui/react/radio';
import { cx, focusableInset } from './element';
import type { FieldStyleProps } from './field';
import { customProperties, type UiScaleStep } from './scale';

/**
 * False until a frame after mount.
 *
 * Every transitioned property animates once from its initial value when the
 * component sheet is adopted, which is after the element's first resolved
 * style. Ungated, both indicators in this module slid in from the left edge on
 * every page load; measured in Chromium, the segmented one read 27px wide and
 * 2px short of its segment mid-animation.
 */
function useReadyAfterFirstFrame(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

export interface TabsProps extends FieldStyleProps {
  children?: ReactNode;
  /** The active tab. `null` is "none selected", which is how the call sites hold it. */
  value?: string | null | undefined;
  defaultValue?: string | null | undefined;
  onChange?: ((value: string | null) => void) | undefined;
  orientation?: 'horizontal' | 'vertical' | undefined;
  'aria-label'?: string | undefined;
}

export interface TabsListProps extends FieldStyleProps {
  children?: ReactNode;
  /**
   * Lets the bar scroll when the tabs do not fit. It is off by default and it
   * is worth knowing why: `overflow-x: auto` computes the other axis to `auto`
   * as well, so a scrolling bar clips anything an item paints outside its box.
   * The P80-A tab bar lost its focus ring on three sides to exactly this. The
   * ring inside is the inset variant, which cannot be clipped, so the option
   * is safe here in a way it was not on the Mantine bar.
   */
  scrollable?: boolean | undefined;
  /**
   * Arrow keys select as they move, rather than only moving focus until Enter
   * or Space.
   *
   * Off by default, which is a deliberate change from what the product does
   * today. The Authoring Practices recommend manual activation when a panel is
   * expensive to show, and the Admin Panel's seven tabs each load their own
   * data: arrowing from Campaigns to Analytics would mount every panel on the
   * way. It also removes the confusion P80-A recorded on the live bar, where
   * focus and selection moved together and the focus ring read as a selection
   * mark.
   */
  activateOnFocus?: boolean | undefined;
  'aria-label'?: string | undefined;
}

export interface TabProps extends FieldStyleProps {
  children?: ReactNode;
  value: string;
  disabled?: boolean | undefined;
  /** Content before the label: an icon, a count. */
  leftSection?: ReactNode | undefined;
  rightSection?: ReactNode | undefined;
}

export interface TabsPanelProps extends FieldStyleProps {
  children?: ReactNode;
  value: string;
  /** Renders the panel while it is hidden, so its state survives a switch. */
  keepMounted?: boolean | undefined;
}

/** A set of panels and the bar that switches between them. */
export function Tabs({ children, value, defaultValue, onChange, orientation, className, style, ...rest }: TabsProps) {
  return (
    <BaseTabs.Root
      className={cx('mullion-tabs', className)}
      {...(style ? { style } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onChange ? { onValueChange: (next: unknown) => onChange((next ?? null) as string | null) } : {})}
      {...(orientation ? { orientation } : {})}
      {...rest}
    >
      {children}
    </BaseTabs.Root>
  );
}

/**
 * The bar. It carries the 1px rule the active underline seats on, and Base UI's
 * `Indicator` draws the underline itself: it publishes the active tab's box as
 * `--active-tab-left` and `--active-tab-width`, so the sheet moves one element
 * rather than this module measuring anything.
 *
 * The plan expected that measurement to be ours. It is not, for tabs.
 */
function TabsList({ children, scrollable, activateOnFocus, className, style, ...rest }: TabsListProps) {
  const ready = useReadyAfterFirstFrame();
  return (
    <BaseTabs.List
      className={cx('mullion-tabs-list', className)}
      {...(ready ? { 'data-ready': '' } : {})}
      {...(scrollable ? { 'data-scrollable': '' } : {})}
      {...(activateOnFocus !== undefined ? { activateOnFocus } : {})}
      {...(style ? { style } : {})}
      {...rest}
    >
      {children}
      <BaseTabs.Indicator className="mullion-tabs-indicator" />
    </BaseTabs.List>
  );
}

/**
 * One tab. The inset focus ring, because a tab sits flush against the bar's
 * edge and the bar may scroll: the outset ring reaches 6px and there is none
 * to reach into. The active tab's weight travels as a custom property rather
 * than a `font-weight` declaration on an inline style, which is the P77-C
 * defect the Mantine bar reintroduced as recently as P80-A.
 */
function Tab({ children, value, disabled, leftSection, rightSection, className, style, ...rest }: TabProps) {
  return (
    <BaseTabs.Tab
      value={value}
      className={cx('mullion-tabs-tab', className)}
      {...(disabled ? { disabled: true } : {})}
      {...(style ? { style } : {})}
      {...focusableInset}
      {...rest}
    >
      {leftSection !== undefined && <span className="mullion-tabs-tab-section">{leftSection}</span>}
      <span className="mullion-tabs-tab-label">{children}</span>
      {rightSection !== undefined && <span className="mullion-tabs-tab-section">{rightSection}</span>}
    </BaseTabs.Tab>
  );
}

function TabsPanel({ children, value, keepMounted, className, style, ...rest }: TabsPanelProps) {
  return (
    <BaseTabs.Panel
      value={value}
      className={cx('mullion-tabs-panel', className)}
      {...(keepMounted ? { keepMounted: true } : {})}
      {...(style ? { style } : {})}
      {...rest}
    >
      {children}
    </BaseTabs.Panel>
  );
}

Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panel = TabsPanel;

// ---------------------------------------------------------------------------
// SegmentedControl
// ---------------------------------------------------------------------------

/** One segment. A bare string is its own label, as 20 of the 27 call sites pass it. */
export type UiSegmentData = ReadonlyArray<string | { value: string; label: ReactNode; disabled?: boolean }>;

export interface SegmentedControlProps extends FieldStyleProps {
  data: UiSegmentData;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  size?: UiScaleStep | undefined;
  disabled?: boolean | undefined;
  /** Segments share the track's width equally instead of sizing to their labels. */
  fullWidth?: boolean | undefined;
  name?: string | undefined;
  'aria-label'?: string | undefined;
}

interface Segment {
  value: string;
  label: ReactNode;
  disabled?: boolean | undefined;
}

function toSegment(entry: UiSegmentData[number]): Segment {
  return typeof entry === 'string' ? { value: entry, label: entry } : entry;
}

/**
 * Pick one of a short, fixed list.
 *
 * The moving indicator is ours, and it is the one piece of measurement in this
 * module. Base UI ships an indicator for `Tabs` and none for a radio group, so
 * the checked segment's box is read here and published to the sheet as two
 * custom properties. Nothing else about the control is written: the roving
 * focus, the arrow keys and the radio semantics are Base UI's.
 *
 * Painting the checked segment's own ground instead would need no measurement,
 * and it was rejected because a ground that appears under the label is a fill
 * the label then has to be legible on, which is a new audited pair on every
 * theme. An indicator behind the track's own surface reuses one that exists.
 */
export function SegmentedControl({
  data,
  value,
  defaultValue,
  onChange,
  size = 'sm',
  disabled,
  fullWidth,
  name,
  className,
  style,
  ...rest
}: SegmentedControlProps) {
  const segments = data.map(toSegment);
  const trackRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const ready = useReadyAfterFirstFrame();

  /*
   * Measured from the rects rather than from `offsetLeft` and `offsetWidth`.
   * Those two round to whole pixels, and a segment whose real width is 50.45px
   * then gets a 50px indicator, which showed up in Chromium as a 4px
   * mismatch. The offset is taken along the INLINE axis so it agrees with the
   * `inset-inline-start` the sheet positions from, in either direction.
   */
  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const checked = track.querySelector<HTMLElement>('[data-checked]');
    if (!checked) {
      setBox(null);
      return;
    }
    const trackRect = track.getBoundingClientRect();
    const rect = checked.getBoundingClientRect();
    const rtl = getComputedStyle(track).direction === 'rtl';
    const start = rtl ? trackRect.right - rect.right : rect.left - trackRect.left;
    setBox({ left: start - track.clientLeft, width: rect.width });
  }, []);

  /*
   * A layout effect, so the indicator is in place before the first paint and
   * does not slide in from zero on mount. The observer covers a track that is
   * resized by its container or by a font that arrives late; a segment's own
   * label change re-runs it through the dependency on `value`.
   */
  useLayoutEffect(() => {
    measure();
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, value, defaultValue, data]);

  return (
    <RadioGroup
      ref={trackRef}
      className={cx('mullion-segmented', className)}
      data-size={size}
      {...(ready ? { 'data-ready': '' } : {})}
      {...(fullWidth ? { 'data-full-width': '' } : {})}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onChange ? { onValueChange: (next: unknown) => onChange(String(next)) } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(name !== undefined ? { name } : {})}
      style={{
        ...customProperties({
          '--mullion-segment-left': box ? `${box.left.toFixed(2)}px` : undefined,
          '--mullion-segment-width': box ? `${box.width.toFixed(2)}px` : undefined,
        }),
        ...style,
      }}
      {...rest}
    >
      {box && <span className="mullion-segmented-indicator" aria-hidden />}
      {segments.map((segment) => (
        <Radio.Root
          key={segment.value}
          value={segment.value}
          className="mullion-segmented-item"
          {...(segment.disabled ? { disabled: true } : {})}
          {...focusableInset}
        >
          <span
            className="mullion-segmented-item-label"
            {...(typeof segment.label === 'string' ? { 'data-text': segment.label } : {})}
          >
            {segment.label}
          </span>
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
