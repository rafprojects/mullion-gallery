import { useMemo } from 'react';
import {
  Loader,
  Pagination,
} from '@mantine/core';
import {
  IconArchive, IconArchiveOff, IconChevronDown, IconCopy, IconDownload, IconEdit,
  IconFileZip, IconLayoutGrid, IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { AccessSummaryItem, AdminCampaign } from '@/services/adminQuery';
import type { CampaignActionsHandle } from '@/hooks/useAdminCampaignActions';
import { describeCampaignGalleryOverrides, hasCampaignGalleryOverrides } from '@/utils/campaignGalleryOverrides';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Group, Stack, Text, Box, Center, Badge, Card, Button, Checkbox, Menu, Tooltip } from '@/ui';

// Returns an i18next key + English default so the caller can translate in render.
function scheduleLabel(publishAt?: string, unpublishAt?: string): { key: string; text: string; tone: 'info' | 'warning' | 'danger' } | null {
  const now = Date.now();
  if (publishAt && new Date(publishAt).getTime() > now) return { key: 'admin_sched_scheduled', text: 'Scheduled', tone: 'info' };
  if (unpublishAt) {
    const end = new Date(unpublishAt).getTime();
    if (end <= now) return { key: 'admin_sched_expired', text: 'Expired', tone: 'danger' };
    if (end - now < 86_400_000) return { key: 'admin_sched_expiring', text: 'Expiring soon', tone: 'warning' };
  }
  return null;
}

interface Props {
  isLoading: boolean;
  error: string | null;
  campaigns: AdminCampaign[];
  campaignActions: CampaignActionsHandle;
  grantSummary?: Map<number, AccessSummaryItem> | undefined;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function CampaignsMobileList({
  isLoading,
  error,
  campaigns,
  campaignActions,
  grantSummary,
  page,
  totalPages,
  total,
  onPageChange,
}: Props) {
  const { t } = useTranslation('mullion');
  const {
    selectedCampaignIds,
    handleToggleCampaignSelect,
    handleEdit,
    setDuplicateSource,
    handleExportCampaign,
    handleBinaryExportCampaign,
    binaryExportingIds,
    setConfirmRestore,
    setConfirmArchive,
    setConfirmDelete,
    restoringIds,
    archivingIds,
    deletingIds,
  } = campaignActions;

  const cards = useMemo(() => {
    return campaigns.map((c) => {
      const cid = String(c.id);
      const isSelected = selectedCampaignIds.has(cid);
      const sched = scheduleLabel(c.publishAt, c.unpublishAt);
      const summary = grantSummary?.get(Number(c.id));
      const galleryOverrideSummary = describeCampaignGalleryOverrides(c);

      return (
        <Card
          key={c.id}
          raised elevated
          radius="md"
          padding="sm"
          data-selected={isSelected || undefined}
          style={{ borderColor: isSelected ? 'var(--mantine-color-blue-5)' : undefined }}
        >
          <Stack gap="2xs">
            {/* Title row */}
            <Group gap="2xs" justify="space-between" wrap="nowrap">
              <Group gap="2xs" style={{ flex: 1, minWidth: 0 }}>
                <Checkbox
                  checked={isSelected}
                  onChange={() => handleToggleCampaignSelect(cid)}
                  aria-label={t('admin_select_item', 'Select {{title}}', { title: c.title })}
                  size="xs"
                />
                <Text weight={600} size="sm" truncate style={{ flex: 1 }}>{c.title}</Text>
                {hasCampaignGalleryOverrides(c) && (
                  <Tooltip label={t('admin_custom_gallery', 'Custom gallery: {{summary}}', { summary: galleryOverrideSummary.join(', ') || t('admin_nested_overrides', 'Nested overrides') })}>
                    <Box render={<span />} role="img" aria-label={t('admin_custom_gallery', 'Custom gallery: {{summary}}', { summary: galleryOverrideSummary.join(', ') || t('admin_nested_overrides', 'Nested overrides') })} style={{ display: 'inline-flex' }}>
                      <IconLayoutGrid size={13} color="var(--mantine-color-violet-5)" aria-hidden />
                    </Box>
                  </Tooltip>
                )}
              </Group>
            </Group>

            {/* Description */}
            {c.description && (
              <Text size="xs" tone="muted" lineClamp={2}>{c.description}</Text>
            )}

            {/* Badges */}
            <Group gap="3xs" wrap="wrap">
              <Badge size="xs" variant="filled" tone={c.status === 'active' ? 'success' : c.status === 'archived' ? 'default' : 'warning'}>
                {c.status}
              </Badge>
              <Badge tone="default" size="xs" variant="light">{c.visibility}</Badge>
              {sched && <Badge size="xs" variant="light" tone={sched.tone}>{t(sched.key, sched.text)}</Badge>}
              {c.companyId && <Badge tone="default" size="xs" variant="outline">{c.companyId}</Badge>}
              {summary !== undefined && (
                <Tooltip label={t('admin_grant_count', '{{count}} grant', { count: summary.grantCount })}>
                  <Badge tone="default" size="xs" variant="light">{t('admin_grants_badge', '{{count}} grants', { count: summary.grantCount })}</Badge>
                </Tooltip>
              )}
            </Group>

            {/* Actions */}
            <Group gap="xs" wrap="wrap" style={{ marginTop: uiRem(0.125) }}>
              <Button size="xs" variant="outline" leftSection={<IconEdit size={12} />} onClick={() => handleEdit(c)}>
                {t('admin_edit', 'Edit')}
              </Button>
              <Tooltip label={t('admin_clone', 'Clone')}>
                <Button size="xs" variant="subtle" leftSection={<IconCopy size={12} />} onClick={() => setDuplicateSource(c)} aria-label={t('admin_duplicate_item', 'Duplicate {{title}}', { title: c.title })}>
                  {t('admin_clone', 'Clone')}
                </Button>
              </Tooltip>
              <Menu>
                <Menu.Trigger render={<Button size="xs"
                    variant="subtle"
                    leftSection={<IconDownload size={12} />}
                    rightSection={<IconChevronDown size={11} />}
                    loading={binaryExportingIds.has(cid)}
                    aria-label={t('admin_export_item', 'Export {{title}}', { title: c.title })} />}>
                    {t('admin_export', 'Export')}
                  </Menu.Trigger>
                <Menu.Content width={210} side="bottom" align="end">
                  <Menu.Item leftSection={<IconFileZip size={14} />} onClick={() => void handleBinaryExportCampaign(c)}>
                    {t('admin_export_zip_media', 'Export as ZIP (includes media)')}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => void handleExportCampaign(c)}>
                    {t('admin_export_json', 'Export as JSON (data only)')}
                  </Menu.Item>
                </Menu.Content>
              </Menu>
              {c.status === 'archived' ? (
                <Button size="xs" tone="primary" leftSection={<IconArchiveOff size={12} />} loading={restoringIds.has(cid)} onClick={() => setConfirmRestore(c)}>
                  {t('admin_restore', 'Restore')}
                </Button>
              ) : (
                <Button size="xs" tone="warning" variant="light" leftSection={<IconArchive size={12} />} loading={archivingIds.has(cid)} onClick={() => setConfirmArchive(c)}>
                  {t('admin_archive', 'Archive')}
                </Button>
              )}
              <Tooltip label={t('admin_perm_delete', 'Permanently delete')}>
                <Button size="xs" tone="danger" variant="subtle" leftSection={<IconTrash size={12} />} loading={deletingIds.has(cid)} onClick={() => setConfirmDelete(c)} aria-label={t('admin_perm_delete_item', 'Permanently delete {{title}}', { title: c.title })}>
                  {t('admin_delete', 'Delete')}
                </Button>
              </Tooltip>
            </Group>
          </Stack>
        </Card>
      );
    });
  }, [
    campaigns, selectedCampaignIds, grantSummary,
    handleToggleCampaignSelect, handleEdit, setDuplicateSource,
    handleExportCampaign, handleBinaryExportCampaign, binaryExportingIds,
    setConfirmRestore, setConfirmArchive, setConfirmDelete,
    restoringIds, archivingIds, deletingIds, t,
  ]);

  if (error) return <Text tone="danger" role="alert">{error}</Text>;

  if (isLoading) {
    return <Center paddingBlock="xl"><Loader size="sm" /></Center>;
  }

  return (
    <>
      <Stack gap="sm">{cards}</Stack>
      {totalPages > 1 && (
        <Group justify="space-between" style={{ marginTop: 'var(--mullion-spacing-md, var(--mantine-spacing-md))' }}>
          <Text size="sm" tone="muted">{t('admin_campaign_count', '{{count}} campaigns', { count: total })}</Text>
          <Pagination value={page} onChange={onPageChange} total={totalPages} size="sm" />
        </Group>
      )}
    </>
  );
}

setMullionDebugDisplayName(CampaignsMobileList, 'AdminPanel:CampaignsMobileList');
