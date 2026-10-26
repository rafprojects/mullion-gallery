import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, ActionIcon, Tooltip, ScrollArea, UnstyledButton } from '@mantine/core';
import { Stack, Group, Text } from '@/ui';
import { IconClockHour4, IconTrash } from '@tabler/icons-react';
import type { IDockviewPanelProps } from 'dockview';
import { useBuilderDock } from './BuilderDockContext';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';

// ── Component ────────────────────────────────────────────────

export function BuilderHistoryPanel(_props: IDockviewPanelProps) {
  const { t } = useTranslation('mullion');
  const { builder } = useBuilderDock();
  const { historyEntries, historyCurrentIndex, undo, redo, canUndo, canRedo, jumpToHistoryIndex, isHistoryTrimmed } =
    builder;

  /** Jump to a specific history index in one state transition (no stale-closure loop). */
  const handleJump = useCallback(
    (targetIndex: number) => {
      if (targetIndex !== historyCurrentIndex) jumpToHistoryIndex(targetIndex);
    },
    [historyCurrentIndex, jumpToHistoryIndex],
  );

  if (historyEntries.length === 0) {
    return (
      <Box
        p="md"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconClockHour4
          size={32}
          style={{ opacity: 0.5, marginBottom: 8 }}
        />
        <Text size="sm" tone="muted" align="center">
          {t('lb_hist_none', 'No history yet.')}
          <br />
          {t('lb_hist_none_hint', 'Make a change to see the history.')}
        </Text>
      </Box>
    );
  }

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }} p="xs">
      {/* Header */}
      <Group justify="space-between" style={{ marginBottom: 'var(--mullion-spacing-xs, var(--mantine-spacing-xs))' }} paddingInline={4}>
        <Text size="xs" weight={600} tone="muted" transform="uppercase">
          {t('lb_hist_title', 'History ({{count}})', { count: historyEntries.length })}
        </Text>
        <Group gap="3xs">
          <Tooltip label={t('lb_hist_undo_tt', 'Undo (Ctrl+Z)')}>
            <ActionIcon
              size="sm"
              variant="subtle"
              disabled={!canUndo}
              onClick={undo}
              aria-label={t('lb_hist_undo', 'Undo')}
            >
              {'↶'}
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t('lb_hist_redo_tt', 'Redo (Ctrl+Shift+Z)')}>
            <ActionIcon
              size="sm"
              variant="subtle"
              disabled={!canRedo}
              onClick={redo}
              aria-label={t('lb_hist_redo', 'Redo')}
            >
              {'↷'}
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Entry list */}
      <ScrollArea style={{ flex: 1 }} type="auto">
        <Stack gap={0}>
          {/* Show entries in reverse (most recent first) */}
          {[...historyEntries].reverse().map((entry, reversedIdx) => {
            const entryIdx = historyEntries.length - 1 - reversedIdx;
            const isCurrent = entryIdx === historyCurrentIndex;
            const isFuture = entryIdx > historyCurrentIndex;

            return (
              <UnstyledButton
                key={entry.id}
                data-testid={`history-entry-${entryIdx}`}
                onClick={() => handleJump(entryIdx)}
                style={{
                  borderRadius: 4,
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  background: isCurrent
                    ? 'var(--mantine-color-blue-light)'
                    : 'transparent',
                  opacity: isFuture ? 0.45 : 1,
                }}
                aria-label={t('lb_hist_jump_to', 'Jump to: {{label}}', { label: entry.label })}
              >
                <Text
                  size="xs"
                  weight={isCurrent ? 600 : 400}
                  {...(isCurrent ? { c: 'blue' as const } : {})}
                  truncate
                  style={{ flex: 1 }}
                >
                  {entry.label}
                </Text>
                <Text size="xs" tone="muted" style={{ flexShrink: 0 }}>
                  {new Date(entry.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </Text>
              </UnstyledButton>
            );
          })}

          {/* "Initial state" marker at the bottom */}
          <UnstyledButton
            data-testid="history-entry-initial"
            onClick={() => jumpToHistoryIndex(-1)}
            style={{
              borderRadius: 4,
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              opacity: historyCurrentIndex === -1 ? 1 : 0.45,
            }}
            aria-label={t('lb_hist_jump_initial', 'Jump to initial state')}
          >
            <Text size="xs" tone="muted" italic style={{ flex: 1 }}>
              {isHistoryTrimmed ? t('lb_hist_oldest', 'Oldest state') : t('lb_hist_initial', 'Initial state')}
            </Text>
            <IconTrash size={12} style={{ opacity: 0.5 }} />
          </UnstyledButton>
        </Stack>
      </ScrollArea>
    </Box>
  );
}

setMullionDebugDisplayName(BuilderHistoryPanel, 'LayoutBuilder:BuilderHistoryPanel');