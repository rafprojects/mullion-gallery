import { useCallback } from 'react';
import { ColorInput, type ColorInputProps } from '@/ui';
import { useBuilderDock } from './BuilderDockContext';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';

/**
 * Builder-specific ColorInput wrapper.
 *
 * Extends ColorInput with:
 * - Saved color swatches from workspace prefs (recently-used palette, persisted per root).
 * - The browser's EyeDropper where it exists (no-op where unsupported).
 * - Auto-saves any valid color change to the shared swatch list.
 *
 * Drop-in replacement for ColorInput inside the LayoutBuilder panels.
 */
export function BuilderColorInput({ onChangeEnd, withEyeDropper = true, ...rest }: ColorInputProps) {
  const { savedSwatches, addSwatch } = useBuilderDock();

  // Save the swatch only when the interaction ends (mouse-up on the picker or
  // blur after typing a complete value), not on every incremental drag tick.
  const handleChangeEnd = useCallback(
    (value: string) => {
      onChangeEnd?.(value);
      if (value.trim() && value.trim() !== '#') addSwatch(value);
    },
    [onChangeEnd, addSwatch],
  );

  return (
    <ColorInput
      {...rest}
      swatches={savedSwatches}
      withEyeDropper={withEyeDropper}
      onChangeEnd={handleChangeEnd}
    />
  );
}

setMullionDebugDisplayName(BuilderColorInput, 'LayoutBuilder:BuilderColorInput');
