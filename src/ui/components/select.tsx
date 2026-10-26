/**
 * The select family (P80-B): `Select`, `MultiSelect` and `TagsInput`.
 *
 * **Where the listbox goes is the whole story of this module.** P80-A's
 * overlays portalled into `useMullionPortal()`, the container the nearest
 * provider paints (P79-A). A listbox may not: a combobox wires
 * its trigger to its list with `aria-controls` and, when it has an input, with
 * `aria-activedescendant`, and an **ID reference cannot resolve across a shadow
 * boundary**. The shipped `overlay-root` portal mode puts popups in a second
 * shadow root, so that wiring would land in a different tree from the control
 * it describes. That is not a hypothesis: it is the confirmed, product-wide
 * defect that makes every Mantine dropdown keyboard-inoperable today, recorded
 * in PHASE80 and deferred to P81-B.
 *
 * So these components portal into the trigger's own root, resolved from the
 * trigger element at mount (`./anchor`). P80-F moved the menu, popover and
 * tooltip onto the same rule after P80-D measured what leaving cost them.
 *
 * **Two primitives behind three components.** A plain `Select` is Base UI's
 * `Select`, which is a listbox with no input and the accessibility that goes
 * with it. `searchable`, `MultiSelect` and `TagsInput` are Base UI's
 * `Combobox`, because all three render an input. Base UI's own guidance is to
 * use `Select` when no input is rendered, and the two have genuinely different
 * ARIA, so picking one for all four cases would make three of them wrong.
 *
 * **`Autocomplete` is the fourth form** (P81-A): free text with suggestions,
 * where the text is the value and choosing an option only fills it in. That is
 * Base UI's `Autocomplete`, whose parts are the combobox's, so it shares the
 * popup below.
 */

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Combobox } from '@base-ui/react/combobox';
import { Autocomplete as BaseAutocomplete } from '@base-ui/react/autocomplete';
import { cx, focusableInset } from './element';
import { FieldShell, type FieldShellProps, type FieldStyleProps } from './field';
import { customProperties, spacingValue, type UiSpacing } from './scale';
import { uiLayer } from '../styles/layers';
import { useAnchorContainer } from './anchor';
import { useUiLabels } from '../provider/hooks';
import { formatUiLabel } from '../provider/labels';

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

/**
 * Draws an option's content in place of its label. The check mark stays,
 * because it is how selection is shown, and the closed field still reads the
 * label.
 */
export type UiRenderOption = (item: { option: UiSelectOption }) => ReactNode;

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
// Shared chrome
// ---------------------------------------------------------------------------

/**
 * A listbox's name: the field's label, else the control's own `aria-label`.
 * Base UI names neither popup, and a listbox with no name was a P80-D finding.
 * The label is referenced by an id we choose, because Base UI's own label id
 * reaches the control only after an effect.
 */
type ListboxName = { 'aria-labelledby': string } | { 'aria-label': string } | Record<string, never>;

function listboxNameFor(label: ReactNode, labelId: string, ariaLabel: string | undefined): ListboxName {
  if (label !== undefined) return { 'aria-labelledby': labelId };
  return ariaLabel !== undefined ? { 'aria-label': ariaLabel } : {};
}

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

/** The clear and remove mark. */
function CrossIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path d="M4.5 4.5 L11.5 11.5 M11.5 4.5 L4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
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
  /** This and `openLabel` default to the provider's `labels`. */
  clearLabel?: string | undefined;
  /** Renders an input and filters the list. A different primitive, see the module note. */
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
  /** Names the chevron beside a searchable field's input. */
  openLabel?: string | undefined;
  nothingFoundMessage?: ReactNode | undefined;
  renderOption?: UiRenderOption | undefined;
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
  clearLabel,
  searchable,
  searchPlaceholder,
  openLabel,
  nothingFoundMessage,
  renderOption,
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
  const labels = useUiLabels();
  const model = useMemo(() => prepare(data), [data]);
  const { container: target, anchorRef } = useAnchorContainer(container);
  const labelId = useId();
  const triggerId = useId();
  const rowRef = useRef<HTMLDivElement>(null);
  const listboxName = listboxNameFor(label, labelId, rest['aria-label']);

  const shell = {
    labelId,
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
        clearLabel={clearLabel ?? labels.clear}
        openLabel={openLabel ?? labels.showOptions}
        nothingFoundMessage={nothingFoundMessage}
        renderOption={renderOption}
        name={name}
        readOnly={readOnly}
        width={width}
        maxHeight={maxHeight}
        target={target}
        anchorRef={anchorRef}
        listboxName={listboxName}
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
      {/*
        * The label names the trigger by id. Base UI's field pointed it at an id
        * nothing rendered, so a click on the label did nothing (P81-A).
        */}
      <FieldShell {...shell} labelFor={triggerId} controlRef={rowRef} variantClass="mullion-field-control-select">
        <BaseSelect.Trigger
          id={triggerId}
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
          <ClearButton label={clearLabel ?? labels.clear} onClear={() => onChange?.(null)} />
        )}
      </FieldShell>
      <BaseSelect.Portal container={target}>
        {/* Start-aligned on the field's row: a list wider than its field keeps the field's left edge (P81-A). */}
        <BaseSelect.Positioner
          anchor={rowRef}
          align="start"
          className="mullion-overlay-positioner"
          sideOffset={4}
          alignItemWithTrigger={false}
          style={popupStyle({ width, maxHeight })}
        >
          <BaseSelect.Popup className="mullion-select-popup">
            {/* Named as the trigger is: a listbox with no name was P80-D's finding. */}
            <BaseSelect.List className="mullion-select-list" {...listboxName}>
              {model.groups.map((group, index) =>
                group.group === null ? (
                  <SelectOptions key={`run-${index}`} items={group.items} renderOption={renderOption} />
                ) : (
                  <BaseSelect.Group key={group.group} className="mullion-select-group">
                    <BaseSelect.GroupLabel className="mullion-select-group-label">
                      {group.group}
                    </BaseSelect.GroupLabel>
                    <SelectOptions items={group.items} renderOption={renderOption} />
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

function SelectOptions({ items, renderOption }: { items: UiSelectOption[]; renderOption: UiRenderOption | undefined }) {
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
          <BaseSelect.ItemText className="mullion-select-item-text">
            {renderOption ? renderOption({ option }) : option.label}
          </BaseSelect.ItemText>
        </BaseSelect.Item>
      ))}
    </>
  );
}

/** The clear affordance, inside the field's border so it shares the row. */
function ClearButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button type="button" className="mullion-select-clear" aria-label={label} onClick={onClear} {...focusableInset}>
      <CrossIcon />
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
  renderOption?: UiRenderOption | undefined;
  name?: string | undefined;
  readOnly?: boolean | undefined;
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
  target: HTMLElement | ShadowRoot | null;
  anchorRef: (el: HTMLElement | null) => void;
  /** The field's label id, set on the label so parts outside the input can reference it. */
  labelId: string;
  listboxName: ListboxName;
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
  renderOption,
  name,
  readOnly,
  width,
  maxHeight,
  target,
  anchorRef,
  labelId,
  listboxName,
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
  const chevronId = useId();
  const rowRef = useRef<HTMLDivElement>(null);
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
        labelId={labelId}
        controlRef={rowRef}
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
            <CrossIcon />
          </Combobox.Clear>
        )}
        {/*
          * The chevron is a pointer affordance and is out of the tab order:
          * the input it sits beside opens the same popup with Alt+ArrowDown,
          * so a tab stop here would be a second stop doing one thing. It
          * keeps an accessible name for anything that reaches it another way:
          * its own label then the field's, since Base UI's field labelling alone
          * made it a second control with the input's exact name (P80-D).
          */}
        <Combobox.Trigger
          id={chevronId}
          className="mullion-select-icon"
          aria-label={openLabel}
          {...(label !== undefined ? { 'aria-labelledby': `${chevronId} ${labelId}` } : {})}
          tabIndex={-1}
        >
          <ChevronIcon />
        </Combobox.Trigger>
      </FieldShell>
      <ComboboxPopup
        anchor={rowRef}
        model={model}
        name={listboxName}
        target={target}
        width={width}
        maxHeight={maxHeight}
        nothingFoundMessage={nothingFoundMessage}
        renderOption={renderOption}
      />
    </Combobox.Root>
  );
}

interface ComboboxPopupProps {
  model: NormalisedData;
  name: ListboxName;
  target: HTMLElement | ShadowRoot | null;
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
  nothingFoundMessage?: ReactNode | undefined;
  renderOption?: UiRenderOption | undefined;
  /** Autocomplete only: told which option was chosen. The other forms read their value. */
  onPick?: ((value: string) => void) | undefined;
  /** The field's bordered row, so the list lines up with the field and not the control inside it. */
  anchor: React.RefObject<HTMLDivElement | null>;
}

/**
 * The listbox for all four combobox forms. Base UI filters `items` itself;
 * the groups are rendered from the unfiltered data and each option is skipped
 * when the filter drops it, which is what `Combobox.Collection` does for the
 * flat case and what a group needs done by hand.
 */
function ComboboxPopup({
  model,
  name,
  target,
  width,
  maxHeight,
  nothingFoundMessage,
  renderOption,
  onPick,
  anchor,
}: ComboboxPopupProps) {
  const optionProps = { renderOption, onPick };
  return (
    <Combobox.Portal container={target}>
      <Combobox.Positioner
        anchor={anchor}
        align="start"
        className="mullion-overlay-positioner"
        sideOffset={4}
        style={popupStyle({ width, maxHeight })}
      >
        <Combobox.Popup className="mullion-select-popup">
          {nothingFoundMessage !== undefined && (
            <Combobox.Empty className="mullion-select-empty">{nothingFoundMessage}</Combobox.Empty>
          )}
          <Combobox.List className="mullion-select-list" {...name}>
            {model.grouped
              ? (group: { value: string; items: UiSelectOption[] }) => (
                  <ComboboxGroup key={group.value} group={group} {...optionProps} />
                )
              : (item: UiSelectOption) => <ComboboxOption key={item.value} option={item} {...optionProps} />}
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
function ComboboxGroup({
  group,
  ...optionProps
}: { group: { value: string; items: UiSelectOption[] } } & Omit<ComboboxOptionProps, 'option'>) {
  const options = (
    <Combobox.Collection>
      {(item: UiSelectOption) => <ComboboxOption key={item.value} option={item} {...optionProps} />}
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

interface ComboboxOptionProps {
  option: UiSelectOption;
  renderOption?: UiRenderOption | undefined;
  onPick?: ((value: string) => void) | undefined;
}

function ComboboxOption({ option, renderOption, onPick }: ComboboxOptionProps) {
  const pressedHere = useRef(false);
  /*
   * Deferred, so the caller hears the text change Base UI commits first and
   * the choice second. The two presses mirror Base UI's own: a click, which
   * Enter also sends, and a press begun elsewhere and released here.
   */
  const pick = () => {
    if (onPick && !option.disabled) queueMicrotask(() => onPick(option.value));
  };
  const picking = onPick
    ? {
        onPointerDown: () => {
          pressedHere.current = true;
        },
        onClick: pick,
        onMouseUp: (event: React.MouseEvent<HTMLDivElement>) => {
          const began = pressedHere.current;
          pressedHere.current = false;
          if (!began && event.button === 0 && event.currentTarget.hasAttribute('data-highlighted')) pick();
        },
      }
    : {};
  return (
    <Combobox.Item
      // An autocomplete commits the option itself: its text is what lands in the field.
      value={onPick ? option : option.value}
      className="mullion-select-item"
      {...(option.disabled ? { disabled: true } : {})}
      {...(onPick ? { 'data-uncheckable': '' } : {})}
      {...picking}
      {...focusableInset}
    >
      {!onPick && (
        <Combobox.ItemIndicator className="mullion-select-item-indicator">
          <CheckIcon />
        </Combobox.ItemIndicator>
      )}
      <div className="mullion-select-item-text">{renderOption ? renderOption({ option }) : option.label}</div>
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
  /** Adds a button that removes every chip. */
  clearable?: boolean | undefined;
  /** This and `removeLabel` default to the provider's `labels`. */
  clearLabel?: string | undefined;
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
  /** Typing or pasting one of these adds what came before it as a tag. */
  splitChars?: readonly string[] | undefined;
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
  splitChars?: readonly string[] | undefined;
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
  splitChars,
  removeLabel,
  clearable,
  clearLabel,
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
  const labels = useUiLabels();
  const { container: target, anchorRef } = useAnchorContainer(container);
  const inputId = useId();
  const labelId = useId();
  const rowRef = useRef<HTMLDivElement>(null);
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

  /**
   * A split character turns everything before it into tags and keeps what
   * follows as the query, so a pasted `a, b, c` arrives as three tags and
   * typing `a,` adds one.
   */
  const onQueryChange = useCallback(
    (next: string) => {
      if (!creatable || !splitChars?.length || !splitChars.some((c) => next.includes(c))) {
        setQuery(next);
        return;
      }
      const parts = splitChars.reduce<string[]>((acc, c) => acc.flatMap((part) => part.split(c)), [next]);
      const remainder = parts.pop() ?? '';
      const added: string[] = [];
      for (const part of parts) {
        const tag = part.trim();
        if (tag !== '' && !current.includes(tag) && !added.includes(tag)) added.push(tag);
      }
      if (added.length > 0) commit([...current, ...added]);
      setQuery(remainder);
    },
    [creatable, splitChars, current, commit],
  );

  return (
    <Combobox.Root<string, true, UiSelectOption>
      multiple
      items={model.collection}
      inputValue={query}
      onInputValueChange={onQueryChange}
      value={current}
      onValueChange={(next: string[]) => commit([...next])}
      {...(name !== undefined ? { name } : {})}
      {...(readOnly ? { readOnly: true } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(required ? { required: true } : {})}
      modal={false}
    >
      <FieldShell
        labelId={labelId}
        controlRef={rowRef}
        // A label inside Field.Label's own <label> was invalid nesting (found in P80-F).
        labelFor={inputId}
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
        variantClass="mullion-field-control-chips"
      >
        <Combobox.Chips className="mullion-select-chips">
          {current.map((entry) => (
            <Combobox.Chip key={entry} className="mullion-select-chip" aria-label={labelOf(entry)}>
              <span className="mullion-select-chip-label">{labelOf(entry)}</span>
              <Combobox.ChipRemove
                className="mullion-select-chip-remove"
                aria-label={formatUiLabel(removeLabel ?? labels.remove, { label: labelOf(entry) })}
              >
                <CrossIcon />
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
        {clearable && (
          <Combobox.Clear
            className="mullion-select-clear"
            aria-label={clearLabel ?? labels.clear}
            {...focusableInset}
          >
            <CrossIcon />
          </Combobox.Clear>
        )}
      </FieldShell>
      <ComboboxPopup
        anchor={rowRef}
        model={model}
        name={listboxNameFor(label, labelId, rest['aria-label'])}
        target={target}
        width={width}
        maxHeight={maxHeight}
        nothingFoundMessage={nothingFoundMessage}
      />
    </Combobox.Root>
  );
}

// ---------------------------------------------------------------------------
// Autocomplete
// ---------------------------------------------------------------------------

export interface AutocompleteProps extends FieldShellProps, FieldStyleProps {
  /** Suggestions. */
  data: UiSelectData;
  /** The text in the field. */
  value?: string | undefined;
  defaultValue?: string | undefined;
  /** Handed the text as it is typed, and an option's label when one is chosen. */
  onChange?: ((value: string) => void) | undefined;
  /** Handed the chosen option's value, after `onChange` has had its label. */
  onOptionSubmit?: ((value: string) => void) | undefined;
  /**
   * Matches an option against the text. The default keeps options whose label
   * contains it; `null` shows `data` as given, for a caller that filters or
   * fetches its own.
   */
  filter?: ((option: UiSelectOption, query: string) => boolean) | null | undefined;
  renderOption?: UiRenderOption | undefined;
  nothingFoundMessage?: ReactNode | undefined;
  placeholder?: string | undefined;
  name?: string | undefined;
  readOnly?: boolean | undefined;
  'aria-label'?: string | undefined;
  /** Focus leaving the field, for a caller that settles free text then. */
  onBlur?: ((event: React.FocusEvent<HTMLInputElement>) => void) | undefined;
  width?: UiSpacing | number | undefined;
  maxHeight?: number | undefined;
  container?: HTMLElement | null | undefined;
}

/**
 * Base UI's root, typed by its props interface. Its two overloads split a flat
 * list from a grouped one, and `data` may be either.
 */
const AutocompleteRoot = BaseAutocomplete.Root as (
  props: BaseAutocomplete.Root.Props<UiSelectOption>,
) => React.JSX.Element;

/**
 * Free text with suggestions. Choosing an option fills the field with its
 * label and reports its value, so a caller that needs an identity (a user id,
 * a company slug) gets one without the text standing in for it. The popup
 * stays in the input's own root, as every form here does.
 */
export function Autocomplete({
  data,
  value,
  defaultValue,
  onChange,
  onOptionSubmit,
  filter,
  renderOption,
  nothingFoundMessage,
  placeholder,
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
}: AutocompleteProps) {
  const model = useMemo(() => prepare(data), [data]);
  const { container: target, anchorRef } = useAnchorContainer(container);
  const labelId = useId();
  const rowRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => model.groups.map((g) => ({ value: g.group ?? '', items: g.items })), [model]);
  const pick = useCallback((picked: string) => onOptionSubmit?.(picked), [onOptionSubmit]);

  return (
    <AutocompleteRoot
      items={model.grouped ? groups : model.flat}
      itemToStringValue={(option: UiSelectOption) => option.label}
      {...(value !== undefined ? { value } : {})}
      {...(defaultValue !== undefined ? { defaultValue } : {})}
      {...(onChange ? { onValueChange: (next: string) => onChange(next) } : {})}
      {...(filter !== undefined ? { filter } : {})}
      {...(name !== undefined ? { name } : {})}
      {...(readOnly ? { readOnly: true } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(required ? { required: true } : {})}
      openOnInputClick
      modal={false}
    >
      <FieldShell
        labelId={labelId}
        controlRef={rowRef}
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
        <BaseAutocomplete.Input
          ref={anchorRef}
          className={cx('mullion-field-input', 'mullion-select-input')}
          {...(placeholder !== undefined ? { placeholder } : {})}
          {...focusableInset}
          {...rest}
        />
      </FieldShell>
      <ComboboxPopup
        anchor={rowRef}
        model={model}
        name={listboxNameFor(label, labelId, rest['aria-label'])}
        target={target}
        width={width}
        maxHeight={maxHeight}
        nothingFoundMessage={nothingFoundMessage}
        renderOption={renderOption}
        onPick={pick}
      />
    </AutocompleteRoot>
  );
}
