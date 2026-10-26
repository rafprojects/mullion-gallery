
import { Table } from '@mantine/core';
import { Text, Badge } from '@/ui';
import type { AuditEntry } from '@/services/adminQuery';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';

const SEVERITY_TONES = {
  info: 'info',
  warning: 'warning',
  error: 'danger',
} as const;

interface AuditEventRowProps {
  entry: AuditEntry;
  showCampaignCol?: boolean;
}

export function AuditEventRow({ entry, showCampaignCol = false }: AuditEventRowProps) {
  const summary = entry.summary || entry.action;
  const resource = entry.resourceLabel || entry.resourceType || '';
  const actor = entry.actorLogin || (entry.userId ? String(entry.userId) : '—');
  const severityTone = SEVERITY_TONES[entry.severity ?? 'info'] ?? 'info';

  return (
    <Table.Tr>
      <Table.Td>{new Date(entry.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>
        <Text size="sm">{summary}</Text>
        {resource && <Text size="xs" tone="muted">{resource}</Text>}
      </Table.Td>
      <Table.Td>
        <Badge tone={severityTone} variant="light" size="xs">
          {entry.severity ?? 'info'}
        </Badge>
      </Table.Td>
      {showCampaignCol && (
        <Table.Td>
          <Text size="xs">{entry.campaignId ?? '—'}</Text>
        </Table.Td>
      )}
      <Table.Td>{actor}</Table.Td>
      <Table.Td>
        <Text size="xs" lineClamp={1}>
          {Object.keys(entry.details ?? {}).length > 0 ? JSON.stringify(entry.details) : '—'}
        </Text>
      </Table.Td>
    </Table.Tr>
  );
}

setMullionDebugDisplayName(AuditEventRow, 'AdminPanel:AuditEventRow');
