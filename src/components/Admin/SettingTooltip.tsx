import type { ReactNode } from 'react';
import { IconInfoCircle } from '@tabler/icons-react';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Group, ActionIcon, Tooltip } from '@/ui';

interface SettingTooltipProps {
  label: ReactNode;
  tooltip: string;
  enabled: boolean;
}

export function SettingTooltip({ label, tooltip, enabled }: SettingTooltipProps) {
  if (!enabled) return <>{label}</>;
  return (
    <Group gap="3xs" render={<span />} wrap="nowrap" style={{ display: 'inline-flex' }}>
      {label}
      <Tooltip label={tooltip} style={{ width: uiRem(17.5) }} side="top">
        <ActionIcon variant="transparent" size="xs" aria-label={tooltip} tabIndex={0}>
          <IconInfoCircle size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

setMullionDebugDisplayName(SettingTooltip, 'SettingTooltip');
