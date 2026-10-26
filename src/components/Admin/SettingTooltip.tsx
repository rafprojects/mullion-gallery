import type { ReactNode } from 'react';
import { Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Group, ActionIcon } from '@/ui';

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
      <Tooltip label={tooltip} multiline style={{ width: uiRem(17.5) }} withArrow position="top">
        <ActionIcon variant="transparent" size="xs" aria-label={tooltip} tabIndex={0}>
          <IconInfoCircle size={14} />
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}

setMullionDebugDisplayName(SettingTooltip, 'SettingTooltip');
