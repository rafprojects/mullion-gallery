import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Autocomplete, Loader, type AutocompleteProps, type UiRenderOption, type UiSelectOption } from '@/ui';
import { IconSearch, IconTrash } from '@tabler/icons-react';

export interface SearchableEntityInputProps {
  displayValue: string;
  onInputChange: (value: string) => void;
  onOptionSubmit: (value: string) => void;
  /** The suggestions, already filtered or fetched: they are shown as given. */
  options: UiSelectOption[];
  /** Draws an option; its label is still what lands in the field. */
  renderOption?: UiRenderOption | undefined;
  /** Shown in the list when there are no options. */
  emptyMessage?: ReactNode | undefined;
  hasSelection?: boolean | undefined;
  onClear?: (() => void) | undefined;
  loading?: boolean | undefined;
  onBlur?: (() => void) | undefined;
  label?: ReactNode | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  size?: AutocompleteProps['size'];
}

/**
 * A search field whose text is free and whose options carry an identity: a
 * user id, a company slug. [P81-A] On the framework's `Autocomplete`, whose
 * list stays in the input's own root, so the keyboard reaches it inside a
 * shadow-mounted gallery. The blur delay that kept Mantine's options
 * clickable is gone: pressing an option no longer takes focus from the input.
 */
export function SearchableEntityInput({
  displayValue,
  onInputChange,
  onOptionSubmit,
  options,
  renderOption,
  emptyMessage,
  hasSelection,
  onClear,
  loading,
  onBlur,
  label,
  placeholder,
  required,
  size,
}: SearchableEntityInputProps) {
  const { t } = useTranslation('mullion');
  // A blur straight after a pick is not the free-text blur a caller settles on.
  const committedRef = useRef(false);
  return (
    <Autocomplete
      label={label}
      placeholder={placeholder}
      required={required ?? false}
      {...(size !== undefined && { size })}
      value={displayValue}
      onChange={(next) => {
        committedRef.current = false;
        onInputChange(next);
      }}
      onOptionSubmit={(picked) => {
        committedRef.current = true;
        onOptionSubmit(picked);
      }}
      onBlur={() => {
        if (!committedRef.current) onBlur?.();
        committedRef.current = false;
      }}
      data={options}
      filter={null}
      renderOption={renderOption}
      nothingFoundMessage={emptyMessage}
      rightSection={
        hasSelection ? (
          <ActionIcon size="sm" variant="subtle" aria-label={t('admin_clear_selection', 'Clear selection')} onClick={onClear}>
            <IconTrash size={14} />
          </ActionIcon>
        ) : loading ? (
          <Loader size={16} />
        ) : (
          <IconSearch size={16} aria-hidden />
        )
      }
    />
  );
}
