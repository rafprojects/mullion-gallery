
import type { CSSProperties } from 'react';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Select, type SelectProps } from '@/ui';

export type SpaceSelectItem = { value: string; label: string };

interface SpaceSelectorProps {
  data: SpaceSelectItem[];
  value: string;
  onChange: (value: string) => void;
  size?: SelectProps['size'];
  w?: number;
  style?: CSSProperties;
  'aria-label'?: string;
  disabled?: boolean;
}

export function SpaceSelector({
  data,
  value,
  onChange,
  size = 'sm',
  w,
  style,
  'aria-label': ariaLabel = 'Active space',
  disabled,
}: SpaceSelectorProps) {
  return (
    <Select
      data={data}
      value={value}
      onChange={(v) => onChange(v ?? 'all')}
      size={size}
      style={{ ...(w !== undefined && { width: uiRem(w / 16) }), ...style }}
      aria-label={ariaLabel}
      disabled={disabled ?? false}
    />
  );
}

setMullionDebugDisplayName(SpaceSelector, 'SpaceSelector');
