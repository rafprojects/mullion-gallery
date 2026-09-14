/**
 * The select family (P80-B): `Select`, `MultiSelect` and `TagsInput`.
 *
 * **Where the listbox goes is the whole story of this module.** Every other
 * popup in the framework portals into `useMullionPortal()`, the container the
 * nearest provider paints (P79-A, P80-A). A listbox may not: a combobox wires
 * its trigger to its list with `aria-controls` and, when it has an input, with
 * `aria-activedescendant`, and an **ID reference cannot resolve across a shadow
 * boundary**. The shipped `overlay-root` portal mode puts popups in a second
 * shadow root, so that wiring would land in a different tree from the control
 * it describes. That is not a hypothesis: it is the confirmed, product-wide
 * defect that makes every Mantine dropdown keyboard-inoperable today, recorded
 * in PHASE80 and deferred to P81-B.
 *
 * So these components portal into the trigger's own root, resolved from the
 * trigger element at mount (`resolveListboxContainer`). The nearest scope
 * element is preferred, because it carries the tokens of the provider that
 * paints the trigger; the root node itself is the fallback, where the tokens
 * arrive through `:host`.
 *
 * **Two primitives behind three components.** A plain `Select` is Base UI's
 * `Select`, which is a listbox with no input and the accessibility that goes
 * with it. `searchable`, `MultiSelect` and `TagsInput` are Base UI's
 * `Combobox`, because all three render an input. Base UI's own guidance is to
 * use `Select` when no input is rendered, and the two have genuinely different
 * ARIA, so picking one for all four cases would make three of them wrong.
 */

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Combobox } from '@base-ui/react/combobox';
import { cx, focusableInset } from './element';
import { FieldShell, type FieldShellProps, type FieldStyleProps } from './field';
import { customProperties, spacingValue, type UiSpacing } from './scale';
import { uiLayer } from '../styles/layers';
import { SCOPE_ATTR } from '../provider/scope';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** One option. `label` is what the user reads, `value` what the caller stores. */
export interface UiSelectOption {
  value: string;
  label: string;
  disabled?: boolean | undefined;
}

/** A named run of options, rendered under a heading. */
export interface UiSelectGroup {
  group: string;
  items: ReadonlyArray<string | UiSelectOption>;
}

/**
 * What a call site passes. The three shapes are the three Mantine accepts,
 * because 26 files already spell them that way and the Typography font picker
 * and the theme selector both build the grouped one.
 */
export type UiSelectData = ReadonlyArray<string | UiSelectOption | UiSelectGroup>;

interface NormalisedGroup {
  /** Null for the ungrouped run, which renders with no heading. */
  group: string | null;
  items: UiSelectOption[];
}

/**
 * What the primitive is handed. Base UI filters and resolves labels from this,
 * and its two shapes are exclusive: a flat array of options, or an array of
 * groups each holding its own items. A list carrying even one group is passed
 * wholly grouped, with any loose run in an unlabelled group, because the
 * alternative is a list the primitive cannot filter.
 */
interface NormalisedData {
  groups: NormalisedGroup[];
  /** Every option, in order. `Select.Root`'s items, and our own label lookup. */
  flat: UiSelectOption[];
  grouped: boolean;
  /**
   * `items` for `Combobox.Root`, built through `Combobox.createItems`.
   *
   * A plain array is not enough. Without a collection the primitive can
   * stringify an ITEM for the filter but cannot resolve a selected VALUE back
   * to its label, so a searchable field showed `georgia` in its input after
   * picking Georgia. The collection is what carries both directions, and it
   * takes the flat or the grouped shape.
   */
  collection: ReturnType<typeof Combobox.createItems<UiSelectOption, string>>;
}

function toOption(entry: string | UiSelectOption): UiSelectOption {
  return typeof entry === 'string' ? { value: entry, label: entry } : entry;
}

function isGroup(entry: string | UiSelectOption | UiSelectGroup): entry is UiSelectGroup {
  return typeof entry === 'object' && 'group' in entry;
}

/**
 * Flatten `data` into groups, preserving order. Consecutive ungrouped entries
 * stay in one run rather than becoming a group each, so a mixed list renders
 * the way it reads.
 */
function normaliseData(data: UiSelectData): NormalisedGroup[] {
  const groups: NormalisedGroup[] = [];
  for (const entry of data) {
    if (isGroup(entry)) {
      groups.push({ group: entry.group, items: entry.items.map(toOption) });
      continue;
    }
    const last = groups[groups.length - 1];
    if (last && last.group === null) last.items.push(toOption(entry));
    else groups.push({ group: null, items: [toOption(entry)] });
  }
  return groups;
}

function prepare(data: UiSelectData): NormalisedData {
  const groups = normaliseData(data);
  const flat = groups.flatMap((g) => g.items);
  const grouped = groups.some((g) => g.group !== null);
  return {
    groups,
    flat,
    grouped,
    collection: grouped
      ? Combobox.createItems(
          groups.map((g) => ({ value: g.group ?? '', items: g.items })),
          COLLECTION_ACCESSORS,
        )
      : Combobox.createItems(flat, COLLECTION_ACCESSORS),
  };
}

/** One item is one option: its `value` identifies it and its `label` is read and matched. */
const COLLECTION_ACCESSORS = {
  getValue: (option: UiSelectOption) => option.value,
  getLabel: (option: UiSelectOption) => option.label,
};

// ---------------------------------------------------------------------------
// Where the popup mounts
// ---------------------------------------------------------------------------

/**
 * The container a listbox portals into: an element or root in the trigger's
 * own tree, so `aria-controls` and `aria-activedescendant` resolve.
 *
 * The nearest `[data-mullion-scope]` element is preferred over the root node
 * because a nested provider paints its subtree with its own tokens, and a
 * popup hoisted to the root would take the root provider's instead. When the
 * scope is a shadow root there is no such element and the root node is right:
 * the token sheet is keyed on `:host` there and reaches everything in it.
 */
export function resolveListboxContainer(el: Element): HTMLElement | ShadowRoot {
  const scoped = el.closest(`[${SCOPE_ATTR}]`);
  if (scoped instanceof HTMLElement) return scoped;
  const root = el.getRootNode();
  return root instanceof ShadowRoot ? root : document.body;
}

/**
 * Resolve the container once, from whichever element the ref lands on. The
 * popup renders only when open, which is at least one commit after the
 * trigger mounted, so the container is always resolved by the time a portal
 * reads it.
 */
function useListboxContainer(override: HTMLElement | null | undefined) {
  const [resolved, setResolved] = useState<HTMLElement | ShadowRoot | null>(null);
  const anchorRef = useCallback((el: HTMLElement | null) => {
    if (el) setResolved(resolveListboxContainer(el));
  }, []);
  return { container: override !== undefined ? override : resolved, anchorRef };
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

/** The trigger's chevron. `aria-hidden`: the control is already named. */
function ChevronIcon() {
  return (
    <svg className="mullion-select-chevron" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M4 6.5 L8 10.5 L12 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The selected-option mark. A shape, so selection does not rest on colour alone. */
function CheckIcon() {
  return (
    <svg className="mullion-select-check" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M3 8.5 L6.5 12 L13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface PopupChromeProps {
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
}

function popupStyle({ width, maxHeight }: PopupChromeProps) {
  return customProperties({
    '--mullion-select-popup-width': typeof width === 'number' ? `${width}px` : spacingValue(width),
    '--mullion-select-popup-max-height': maxHeight !== undefined ? `${maxHeight}px` : undefined,
    '--mullion-overlay-layer': uiLayer('dropdown'),
  });
}

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export interface SelectProps extends FieldShellProps, FieldStyleProps {
  data: UiSelectData;
  /** Controlled value. `null` is the empty state, as the 45 call sites spell it. */
  value?: string | null | undefined;
  defaultValue?: string | null | undefined;
  /** Handed the value, not an event: that is how every call site reads it. */
  onChange?: ((value: string | null) => void) | undefined;
  placeholder?: string | undefined;
  /**
   * Adds a button that returns the value to `null`. Requires a controlled
   * `value`: Base UI's `Select` has no clear part, so the button is ours and
   * it clears by calling `onChange`, which an uncontrolled select would not
   * hear. The one call site that sets it is controlled.
   */
  clearable?: boolean | undefined;
  clearLabel?: string | undefined;
  /** Renders an input and filters the list. A different primitive, see the module note. */
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
  /** Names the chevron beside a searchable field's input. */
  openLabel?: string | undefined;
  nothingFoundMessage?: ReactNode | undefined;
  name?: string | undefined;
  readOnly?: boolean | undefined;
  'aria-label'?: string | undefined;
  /** The popup's width. Defaults to the trigger's. */
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
  /** Overrides where the popup mounts. See the module note before using it. */
  container?: HTMLElement | null | undefined;
}

/**
 * Choose one value from a list.
 *
 * A selected option is marked by a check and by `primary-text`, and never by a
 * filled ground. That is standing rule 8 applied rather than a preference: a
 * filled row inside a scrolling popup is flush with the popup's edge, which
 * the rule calls a layout defect, and measured across the 23 bundled themes
 * the highlight rail would sit on that fill at 1.00:1 on ten of them, because
 * `primaryStroke` equals `primaryFill` whenever the fill already clears 3:1.
 * `primary-text` on `menu-bg` clears 4.5:1 on all 23, worst 4.54.
 */
export function Select({
  data,
  value,
  defaultValue,
  onChange,
  placeholder,
  clearable,
  clearLabel = 'Clear',
  searchable,
  searchPlaceholder,
  openLabel = 'Show options',
  nothingFoundMessage,
  name,
  readOnly,
  width,
  maxHeight,
  container,
  label,
  description,
  error,
  required,
  disabled,
  size,
  radius,
  leftSection,
  rightSection,
  className,
  style,
  ...rest
}: SelectProps) {
  const model = useMemo(() => prepare(data), [data]);
  const { container: target, anchorRef } = useListboxContainer(container);

  const shell = {
    label,
    description,
    error,
    required,
    disabled,
    size,
    radius,
    leftSection,
    rightSection,
    className,
    style,
  };

  if (searchable) {
    return (
      <SearchableSelect
        {...shell}
        {...rest}
        model={model}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={searchPlaceholder ?? placeholder}
        clearable={clearable}
        clearLabel={clearLabel}
        openLabel={openLabel}
        nothingFoundMessage={nothingFoundMessage}
        name={name}
        readOnly={readOnly}
        width={width}
        maxHeight={maxHeight}
        target={target}
        anchorRef={anchorRef}
      />
    );
  }

  return (
    <BaseSelect.Root<string, false>
      items={model.flat}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onChange ? { onValueChange: (next: string | null) => onChange(next) } : {})}
      {...(name !== undefined ? { name } : {})}
      {...(readOnly ? { readOnly: true } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(required ? { required: true } : {})}
      modal={false}
    >
      <FieldShell {...shell} variantClass="mullion-field-control-select">
        <BaseSelect.Trigger
          ref={anchorRef}
          className={cx('mullion-field-input', 'mullion-select-trigger')}
          {...focusableInset}
          {...rest}
        >
          <BaseSelect.Value className="mullion-select-value">
            {(selected: string | null) =>
              selected === null || selected === undefined
                ? <span className="mullion-select-placeholder">{placeholder ?? ''}</span>
                : (model.flat.find((o) => o.value === selected)?.label ?? String(selected))
            }
          </BaseSelect.Value>
          <BaseSelect.Icon className="mullion-select-icon">
            <ChevronIcon />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        {clearable && value !== null && value !== undefined && (
          <ClearButton label={clearLabel} onClear={() => onChange?.(null)} />
        )}
      </FieldShell>
      <BaseSelect.Portal container={target}>
        <BaseSelect.Positioner
          className="mullion-overlay-positioner"
          sideOffset={4}
          alignItemWithTrigger={false}
          style={popupStyle({ width, maxHeight })}
        >
          <BaseSelect.Popup className="mullion-select-popup">
            <BaseSelect.List className="mullion-select-list">
              {model.groups.map((group, index) =>
                group.group === null ? (
                  <SelectOptions key={`run-${index}`} items={group.items} />
                ) : (
                  <BaseSelect.Group key={group.group} className="mullion-select-group">
                    <BaseSelect.GroupLabel className="mullion-select-group-label">
                      {group.group}
                    </BaseSelect.GroupLabel>
                    <SelectOptions items={group.items} />
                  </BaseSelect.Group>
                ),
              )}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

function SelectOptions({ items }: { items: UiSelectOption[] }) {
  return (
    <>
      {items.map((option) => (
        <BaseSelect.Item
          key={option.value}
          value={option.value}
          className="mullion-select-item"
          {...(option.disabled ? { disabled: true } : {})}
          {...focusableInset}
        >
          <BaseSelect.ItemIndicator className="mullion-select-item-indicator">
            <CheckIcon />
          </BaseSelect.ItemIndicator>
          <BaseSelect.ItemText className="mullion-select-item-text">{option.label}</BaseSelect.ItemText>
        </BaseSelect.Item>
      ))}
    </>
  );
}

/** The clear affordance, inside the field's border so it shares the row. */
function ClearButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="mullion-select-clear" aria-label={label} onClick={onClear} {...focusableInset}>
      <svg viewBox="0 0 16 16" aria-hidden focusable="false">
        <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// The combobox forms
// ---------------------------------------------------------------------------

interface ComboboxShellProps extends FieldShellProps, FieldStyleProps {
  model: NormalisedData;
  placeholder?: string | undefined;
  nothingFoundMessage?: ReactNode | undefined;
  name?: string | undefined;
  readOnly?: boolean | undefined;
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
  target: HTMLElement | ShadowRoot | null;
  anchorRef: (el: HTMLElement | null) => void;
  'aria-label'?: string | undefined;
}

interface SearchableSelectProps extends ComboboxShellProps {
  value?: string | null | undefined;
  defaultValue?: string | null | undefined;
  onChange?: ((value: string | null) => void) | undefined;
  clearable?: boolean | undefined;
  clearLabel: string;
  openLabel: string;
}

/**
 * `Select searchable`. Base UI's `Combobox` in single mode: an input that
 * filters, a listbox, and `aria-activedescendant` wiring that only resolves
 * because the popup stays in the input's own root.
 */
function SearchableSelect({
  model,
  value,
  defaultValue,
  onChange,
  placeholder,
  clearable,
  clearLabel,
  openLabel,
  nothingFoundMessage,
  name,
  readOnly,
  width,
  maxHeight,
  target,
  anchorRef,
  label,
  description,
  error,
  required,
  disabled,
  size,
  radius,
  leftSection,
  rightSection,
  className,
  style,
  ...rest
}: SearchableSelectProps) {
  /*
   * No `itemToStringLabel` here or in `ChipCombobox`. Base UI already
   * stringifies a `{ value, label }` item by its label, and the argument it
   * hands that prop is the ITEM rather than the value: a lookup written
   * against the value stringifies every option as `[object Object]`, and the
   * filter then matches nothing. Found by typing into it in a browser.
   */
  return (
    <Combobox.Root<string, false, UiSelectOption>
      items={model.collection}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onChange ? { onValueChange: (next: string | null) => onChange(next) } : {})}
      {...(name !== undefined ? { name } : {})}
      {...(readOnly ? { readOnly: true } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(required ? { required: true } : {})}
      modal={false}
    >
      <FieldShell
        label={label}
        description={description}
        error={error}
        required={required}
        disabled={disabled}
        size={size}
        radius={radius}
        leftSection={leftSection}
        rightSection={rightSection}
        className={className}
        style={style}
        variantClass="mullion-field-control-select"
      >
        <Combobox.Input
          ref={anchorRef}
          className={cx('mullion-field-input', 'mullion-select-input')}
          {...(placeholder !== undefined ? { placeholder } : {})}
          {...focusableInset}
          {...rest}
        />
        {clearable && (
          <Combobox.Clear className="mullion-select-clear" aria-label={clearLabel} {...focusableInset}>
            <svg viewBox="0 0 16 16" aria-hidden focusable="false">
              <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </Combobox.Clear>
        )}
        {/*
          * The chevron is a pointer affordance and is out of the tab order:
          * the input it sits beside opens the same popup with Alt+ArrowDown,
          * so a tab stop here would be a second stop doing one thing. It
          * keeps an accessible name for anything that reaches it another way.
          */}
        <Combobox.Trigger className="mullion-select-icon" aria-label={openLabel} tabIndex={-1}>
          <ChevronIcon />
        </Combobox.Trigger>
      </FieldShell>
      <ComboboxPopup
        model={model}
        target={target}
        width={width}
        maxHeight={maxHeight}
        nothingFoundMessage={nothingFoundMessage}
      />
    </Combobox.Root>
  );
}

interface ComboboxPopupProps {
  model: NormalisedData;
  target: HTMLElement | ShadowRoot | null;
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
  nothingFoundMessage?: ReactNode | undefined;
}

/**
 * The listbox for all three combobox forms. Base UI filters `items` itself;
 * the groups are rendered from the unfiltered data and each option is skipped
 * when the filter drops it, which is what `Combobox.Collection` does for the
 * flat case and what a group needs done by hand.
 */
function ComboboxPopup({ model, target, width, maxHeight, nothingFoundMessage }: ComboboxPopupProps) {
  return (
    <Combobox.Portal container={target}>
      <Combobox.Positioner
        className="mullion-overlay-positioner"
        sideOffset={4}
        style={popupStyle({ width, maxHeight })}
      >
        <Combobox.Popup className="mullion-select-popup">
          {nothingFoundMessage !== undefined && (
            <Combobox.Empty className="mullion-select-empty">{nothingFoundMessage}</Combobox.Empty>
          )}
          <Combobox.List className="mullion-select-list">
            {model.grouped
              ? (group: { value: string; items: UiSelectOption[] }) => (
                  <ComboboxGroup key={group.value} group={group} />
                )
              : (option: UiSelectOption) => <ComboboxOption key={option.value} option={option} />}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}

/**
 * A heading and its run. `Combobox.Collection` renders the items of this group
 * that survive the filter, and Base UI drops the whole group when none do,
 * which is the behaviour a heading over an emptied run would get wrong. A
 * group with no name renders its items with no heading, which is how a loose
 * run travels in a list that is otherwise grouped.
 */
function ComboboxGroup({ group }: { group: { value: string; items: UiSelectOption[] } }) {
  const options = (
    <Combobox.Collection>
      {(option: UiSelectOption) => <ComboboxOption key={option.value} option={option} />}
    </Combobox.Collection>
  );
  if (group.value === '') {
    return (
      <Combobox.Group items={group.items} className="mullion-select-group">
        {options}
      </Combobox.Group>
    );
  }
  return (
    <Combobox.Group items={group.items} className="mullion-select-group">
      <Combobox.GroupLabel className="mullion-select-group-label">{group.value}</Combobox.GroupLabel>
      {options}
    </Combobox.Group>
  );
}

function ComboboxOption({ option }: { option: UiSelectOption }) {
  return (
    <Combobox.Item
      value={option.value}
      className="mullion-select-item"
      {...(option.disabled ? { disabled: true } : {})}
      {...focusableInset}
    >
      <Combobox.ItemIndicator className="mullion-select-item-indicator">
        <CheckIcon />
      </Combobox.ItemIndicator>
      <span className="mullion-select-item-text">{option.label}</span>
    </Combobox.Item>
  );
}

// ---------------------------------------------------------------------------
// MultiSelect and TagsInput
// ---------------------------------------------------------------------------

export interface MultiSelectProps extends FieldShellProps, FieldStyleProps {
  data: UiSelectData;
  value?: readonly string[] | undefined;
  defaultValue?: readonly string[] | undefined;
  onChange?: ((value: string[]) => void) | undefined;
  placeholder?: string | undefined;
  nothingFoundMessage?: ReactNode | undefined;
  name?: string | undefined;
  readOnly?: boolean | undefined;
  'aria-label'?: string | undefined;
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
  container?: HTMLElement | null | undefined;
  /** Names the remove control on each chip. `{label}` is replaced by the value. */
  removeLabel?: string | undefined;
}

/**
 * Choose several values. The chips live inside the field's border, which is
 * the control row the shell already draws, so nothing here computes a width
 * or forces a height to line them up.
 */
export function MultiSelect(props: MultiSelectProps) {
  const { data, ...rest } = props;
  const model = useMemo(() => prepare(data), [data]);
  return <ChipCombobox {...rest} model={model} />;
}

export interface TagsInputProps extends Omit<MultiSelectProps, 'data'> {
  /** Suggestions. A tags input accepts anything typed, with or without them. */
  data?: UiSelectData | undefined;
}

/**
 * Free-form tags. The same combobox, plus the one piece of behaviour Base UI
 * does not ship: Enter on a query that matches no highlighted item adds that
 * query as a value. Base UI's own creatable example routes this through a
 * dialog, which is a different interaction from the three call sites here.
 */
export function TagsInput({ data = [], ...rest }: TagsInputProps) {
  const model = useMemo(() => prepare(data), [data]);
  return <ChipCombobox {...rest} model={model} creatable />;
}

interface ChipComboboxProps extends Omit<MultiSelectProps, 'data'> {
  model: NormalisedData;
  creatable?: boolean | undefined;
}

function ChipCombobox({
  model,
  value,
  defaultValue,
  onChange,
  placeholder,
  nothingFoundMessage,
  name,
  readOnly,
  width,
  maxHeight,
  container,
  creatable,
  removeLabel = 'Remove {label}',
  label,
  description,
  error,
  required,
  disabled,
  size,
  radius,
  leftSection,
  rightSection,
  className,
  style,
  ...rest
}: ChipComboboxProps) {
  const { container: target, anchorRef } = useListboxContainer(container);
  const inputId = useId();
  const [query, setQuery] = useState('');
  /*
   * The component holds the value when the caller does not, so the chips and
   * the creatable path read one source in either mode. Rendering chips from
   * the `value` prop alone would show none at all for an uncontrolled field,
   * and the Enter-to-create handler would append to an empty array every time.
   */
  const [internal, setInternal] = useState<string[]>(() => [...(defaultValue ?? [])]);
  const current = useMemo(() => (value !== undefined ? [...value] : internal), [value, internal]);
  const commit = useCallback(
    (next: string[]) => {
      if (value === undefined) setInternal(next);
      onChange?.(next);
    },
    [value, onChange],
  );
  const labelOf = useCallback(
    (v: string) => model.flat.find((o) => o.value === v)?.label ?? v,
    [model],
  );

  /**
   * Enter adds the typed query when nothing in the list is highlighted, which
   * is the one behaviour a tags input has and a combobox does not. Deferred to
   * the primitive whenever an item is highlighted, so Enter still picks it.
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!creatable || event.key !== 'Enter' || event.defaultPrevented) return;
      const typed = query.trim();
      if (typed === '') return;
      const list = event.currentTarget.getAttribute('aria-controls');
      const highlighted = event.currentTarget.getAttribute('aria-activedescendant');
      if (list && highlighted) return;
      event.preventDefault();
      if (!current.includes(typed)) commit([...current, typed]);
      setQuery('');
    },
    [creatable, query, current, commit],
  );

  return (
    <Combobox.Root<string, true, UiSelectOption>
      multiple
      items={model.collection}
      inputValue={query}
      onInputValueChange={(next: string) => setQuery(next)}
      value={current}
      onValueChange={(next: string[]) => commit([...next])}
      {...(name !== undefined ? { name } : {})}
      {...(readOnly ? { readOnly: true } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(required ? { required: true } : {})}
      modal={false}
    >
      <FieldShell
        label={label !== undefined ? <label htmlFor={inputId}>{label}</label> : undefined}
        description={description}
        error={error}
        required={required}
        disabled={disabled}
        size={size}
        radius={radius}
        leftSection={leftSection}
        rightSection={rightSection}
        className={className}
        style={style}
        variantClass="mullion-field-control-chips"
      >
        <Combobox.Chips className="mullion-select-chips">
          {current.map((entry) => (
            <Combobox.Chip key={entry} className="mullion-select-chip" aria-label={labelOf(entry)}>
              <span className="mullion-select-chip-label">{labelOf(entry)}</span>
              <Combobox.ChipRemove
                className="mullion-select-chip-remove"
                aria-label={removeLabel.replace('{label}', labelOf(entry))}
              >
                <svg viewBox="0 0 16 16" aria-hidden focusable="false">
                  <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                </svg>
              </Combobox.ChipRemove>
            </Combobox.Chip>
          ))}
          <Combobox.Input
            id={inputId}
            ref={anchorRef}
            className={cx('mullion-field-input', 'mullion-select-input')}
            {...(placeholder !== undefined ? { placeholder } : {})}
            {...(creatable ? { onKeyDown } : {})}
            {...focusableInset}
            {...rest}
          />
        </Combobox.Chips>
      </FieldShell>
      <ComboboxPopup
        model={model}
        target={target}
        width={width}
        maxHeight={maxHeight}
        nothingFoundMessage={nothingFoundMessage}
      />
    </Combobox.Root>
  );
}
