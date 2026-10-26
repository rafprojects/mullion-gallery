/**
 * P30-E — Builder History Dropdown
 *
 * A lightweight history surface rendered directly in the modal header bar,
 * replacing the dedicated dock tab from P19-B. Accepts history state as
 * explicit props so it can live outside the BuilderDockContext provider.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ScrollArea,
} from '@mantine/core';
import { IconClockHour4, IconTrash } from '@tabler/icons-react';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Stack, Text, Box, ActionIcon, UnstyledButton, Popover, Tooltip } from '@/ui';

// ── Types ────────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  label: string;
  timestamp: number;
}

export interface BuilderHistoryDropdownProps {
  historyEntries: HistoryEntry[];
  historyCurrentIndex: number;
  isHistoryTrimmed: boolean;
  onJump: (index: number) => void;
  /** Optional controlled open state — lets the menu bar open the dropdown imperatively. */
  opened?: boolean;
  onOpenedChange?: (open: boolean) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BuilderHistoryDropdown({
  historyEntries,
  historyCurrentIndex,
  isHistoryTrimmed,
  onJump,
  opened: openedProp,
  onOpenedChange,
}: BuilderHistoryDropdownProps) {
  const { t } = useTranslation('mullion');
  const [openedLocal, setOpenedLocal] = useState(false);
  const isControlled = openedProp !== undefined;
  const opened = isControlled ? openedProp : openedLocal;
  const setOpened = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const resolved = typeof next === 'function' ? next(opened) : next;
      if (isControlled) { onOpenedChange?.(resolved); } else { setOpenedLocal(resolved); }
    },
    [isControlled, onOpenedChange, opened],
  );

  const handleJump = useCallback(
    (index: number) => {
      onJump(index);
      setOpened(false);
    },
    [onJump, setOpened],
  );

  const count = historyEntries.length;

  return (
    <Popover opened={opened} onChange={setOpened} keepMounted>
      {/* The trigger toggles the popover and reports its state itself (P81-A). */}
      <Tooltip label={t('lb_hist_title', 'History ({{count}})', { count })}>
        <Popover.Trigger render={<ActionIcon variant="subtle" aria-label={t('lb_histd_open', 'Open history')} />}>
          <IconClockHour4 size={18} />
        </Popover.Trigger>
      </Tooltip>

      <Popover.Content side="bottom" align="start" width={280} style={{ padding: '0' }}>
        {/* Header */}
        <Box paddingInline="sm" style={{ paddingTop: 'var(--mullion-spacing-xs, var(--mantine-spacing-xs))', paddingBottom: uiRem(0.25), borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Text size="xs" weight={600} tone="muted" transform="uppercase">
            {t('lb_hist_title', 'History ({{count}})', { count })}
          </Text>
        </Box>

        {count === 0 ? (
          /* Empty state */
          <Box padding="md" style={{ textAlign: 'center' }}>
            <IconClockHour4 size={24} style={{ opacity: 0.4, marginBottom: 6 }} />
            <Text size="sm" tone="muted">
              {t('lb_hist_none', 'No history yet.')}
              <br />
              {t('lb_histd_none_hint', 'Make a change to see history.')}
            </Text>
          </Box>
        ) : (
          <ScrollArea style={{ maxHeight: 300 }} type="auto">
            <Stack gap={0} paddingBlock={4}>
              {/* Entries in reverse order (newest first) */}
              {[...historyEntries].reverse().map((entry, reversedIdx) => {
                const entryIdx = historyEntries.length - 1 - reversedIdx;
                const isCurrent = entryIdx === historyCurrentIndex;
                const isFuture = entryIdx > historyCurrentIndex;

                return (
                  <UnstyledButton
                    key={entry.id}
                    data-testid={`history-dropdown-entry-${entryIdx}`}
                    onClick={() => handleJump(entryIdx)}
                    aria-label={t('lb_hist_jump_to', 'Jump to: {{label}}', { label: entry.label })}
                    style={{
                      borderRadius: 4,
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: isCurrent
                        ? 'var(--mantine-color-blue-light)'
                        : 'transparent',
                      opacity: isFuture ? 0.45 : 1,
                    }}
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

              {/* Initial / oldest state sentinel */}
              <UnstyledButton
                data-testid="history-dropdown-entry-initial"
                onClick={() => handleJump(-1)}
                aria-label={t('lb_hist_jump_initial', 'Jump to initial state')}
                style={{
                  borderRadius: 4,
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: historyCurrentIndex === -1 ? 1 : 0.45,
                }}
              >
                <Text size="xs" tone="muted" italic style={{ flex: 1 }}>
                  {isHistoryTrimmed ? t('lb_hist_oldest', 'Oldest state') : t('lb_hist_initial', 'Initial state')}
                </Text>
                <IconTrash size={12} style={{ opacity: 0.5 }} />
              </UnstyledButton>
            </Stack>
          </ScrollArea>
        )}
      </Popover.Content>
    </Popover>
  );
}

setMullionDebugDisplayName(BuilderHistoryDropdown, 'LayoutBuilder:BuilderHistoryDropdown');
