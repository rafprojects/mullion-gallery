
import { Tooltip } from '@mantine/core';
import { Group, Text, Paper, Button, ActionIcon } from '@/ui';
import { IconX, IconArchive, IconArchiveOff, IconFileZip, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';

export interface BulkActionsBarProps {
  selectedCount: number;
  /** True if at least one selected campaign is active (not archived). */
  hasActiveSelected: boolean;
  /** True if at least one selected campaign is archived. */
  hasArchivedSelected: boolean;
  isLoading: boolean;
  isExporting: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  hasActiveSelected,
  hasArchivedSelected,
  isLoading,
  isExporting,
  onArchive,
  onRestore,
  onExport,
  onDelete,
  onClearSelection,
}: BulkActionsBarProps) {
  const { t } = useTranslation('mullion');
  if (selectedCount === 0) return null;

  return (
    <Paper
      shadow="sm"
      padding="xs"
      radius="md"
      raised elevated
      style={{
        position: 'sticky',
        bottom: 12,
        zIndex: 10,
        background: 'var(--mantine-color-dark-7)',
        borderColor: 'var(--mantine-color-blue-6)',
      }}
    >
      <Group justify="space-between" wrap="wrap">
        <Group gap="xs" wrap="nowrap">
          <Tooltip label={t('admin_clear_selection', 'Clear selection')}>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={onClearSelection}
              aria-label={t('admin_clear_selection', 'Clear selection')}
            >
              <IconX size={14} />
            </ActionIcon>
          </Tooltip>
          <Text size="sm" weight={600}>
            {t('admin_bulk_selected', '{{count}} campaign selected', { count: selectedCount })}
          </Text>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <Button
            size="xs"
            tone="primary"
            variant="light"
            leftSection={<IconFileZip size={14} />}
            loading={isExporting}
            onClick={onExport}
          >
            {t('admin_export_zip', 'Export ZIP')}
          </Button>
          {hasActiveSelected && (
            <Button
              size="xs"
              tone="warning"
              variant="light"
              leftSection={<IconArchive size={14} />}
              loading={isLoading}
              onClick={onArchive}
            >
              {t('admin_archive', 'Archive')}
            </Button>
          )}
          {hasArchivedSelected && (
            <Button
              size="xs"
              tone="primary"
              variant={hasActiveSelected ? 'subtle' : 'light'}
              leftSection={<IconArchiveOff size={14} />}
              loading={isLoading}
              onClick={onRestore}
            >
              {t('admin_restore', 'Restore')}
            </Button>
          )}
          <Button
            size="xs"
            tone="danger"
            variant="light"
            leftSection={<IconTrash size={14} />}
            loading={isLoading}
            onClick={onDelete}
          >
            {t('admin_delete', 'Delete')}
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

setMullionDebugDisplayName(BulkActionsBar, 'AdminPanel:BulkActionsBar');
