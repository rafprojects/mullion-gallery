/**
 * ThemeSelector — Admin theme picker with live preview swatches
 *
 * Renders a grouped Select of every registered theme, with colour-swatch
 * previews and catalogue-backed descriptions. Choosing one previews it
 * instantly; the Settings panel saves it.
 *
 * [P79-D] The themes, their grouping, their order and their swatches all come
 * from the framework registry through `useMullionTheme()`, which reads the same
 * catalogue the WordPress settings field does. This file no longer knows where
 * a theme is stored or how one is described.
 *
 * Usage:
 * ```tsx
 * <ThemeSelector />
 * ```
 *
 * Gold source: docs/THEME_SYSTEM_ASSESSMENT.md §12
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  Group,
  Text,
  ColorSwatch,
  Stack,
  type SelectProps,
} from '@mantine/core';
import { useTheme } from '@/hooks/useTheme';
import { groupThemes, themeSwatches, useMullionTheme } from '@/ui';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ThemeSelectorProps {
  /** Controlled selected theme ID from settings state */
  value?: string | undefined;
  /** Override Select label (default: "Theme") */
  label?: string | undefined;
  /** Override Select description */
  description?: string | undefined;
  /** Additional Select props pass-through */
  selectProps?: Partial<SelectProps>;
  /** Called when the user selects a theme (for settings staging) */
  onThemeChange?: (themeId: string) => void;
}

export function ThemeSelector({
  value,
  label,
  description,
  selectProps,
  onThemeChange,
}: ThemeSelectorProps) {
  const { t } = useTranslation('mullion');
  const effectiveLabel = label ?? t('admin_theme_label', 'Theme');
  const effectiveDescription = description ?? t('admin_theme_desc', 'Choose a color theme. Preview applies instantly; saved when you click Save.');
  const { themeId, setPreviewTheme } = useTheme();
  const { themes } = useMullionTheme();
  const resolvedValue = value ?? themeId;
  const { comboboxProps, ...restSelectProps } = selectProps ?? {};

  // Local state ensures the dropdown reflects the selection immediately,
  // even if the MantineProvider re-render introduced by setPreviewTheme
  // causes the Select to lose its controlled value momentarily.
  const [localValue, setLocalValue] = useState(resolvedValue);

  // Keep in sync when context themeId changes externally (e.g. on reset)
  useEffect(() => { setLocalValue(resolvedValue); }, [resolvedValue]);

  const data = groupThemes(themes)
    .map(({ group, themes: inGroup }) => ({
      group,
      items: inGroup.map((t) => ({ value: t.id, label: t.name })),
    }))
    .filter((g) => g.items.length > 0);

  const renderOption: SelectProps['renderOption'] = ({ option }) => {
    const swatches = themeSwatches(option.value);
    const meta = themes.find((m) => m.id === option.value);
    // Catalogue-backed description; a runtime theme falls back to a scheme hint
    const desc = meta?.description ?? (meta?.colorScheme === 'dark' ? t('admin_theme_dark', 'Dark theme') : t('admin_theme_light', 'Light theme'));

    return (
      <Group gap="sm" wrap="nowrap">
        <Group gap={4} style={{ flexShrink: 0 }}>
          {swatches.map((color, i) => (
            <ColorSwatch key={i} color={color} size={14} />
          ))}
        </Group>
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" fw={500} truncate>
            {option.label}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {desc}
          </Text>
        </Stack>
      </Group>
    );
  };

  return (
    <Select
      label={effectiveLabel}
      description={effectiveDescription}
      value={localValue}
      onChange={(value) => {
        if (value) {
          setLocalValue(value);
          setPreviewTheme(value);
          onThemeChange?.(value);
        }
      }}
      data={data}
      renderOption={renderOption}
      allowDeselect={false}
      // Keep the dropdown in the same tree as the shadow-root modal so
      // preview updates and styling stay scoped to the active gallery instance.
      comboboxProps={{ ...comboboxProps, withinPortal: false }}
      {...restSelectProps}
    />
  );
}

setMullionDebugDisplayName(ThemeSelector, 'AdminPanel:ThemeSelector');
