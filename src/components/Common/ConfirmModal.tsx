
import { Modal } from '@mantine/core';
import { Group, Stack, Text, Button } from '@/ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getMullionDebugProps, setMullionDebugDisplayName } from '@/utils/mullionDebug';

interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  /** The confirm button's role: `danger` for something destructive, `warning`, `success` or `primary`. */
  confirmTone?: 'danger' | 'warning' | 'success' | 'primary' | undefined;
  confirmAriaLabel?: string | undefined;
  loading?: boolean | undefined;
  /** Optional extra content rendered between the message and action buttons. */
  children?: ReactNode | undefined;
}

interface ConfirmModalContentProps {
  message: ReactNode;
  children?: ReactNode | undefined;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmTone: 'danger' | 'warning' | 'success' | 'primary';
  confirmAriaLabel?: string | undefined;
  loading: boolean;
}

function ConfirmModalContent({
  message,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  confirmTone,
  confirmAriaLabel,
  loading,
}: ConfirmModalContentProps) {
  const { t } = useTranslation('mullion');
  return (
    <Stack {...getMullionDebugProps('ConfirmModal', 'stack')}>
      {typeof message === 'string' ? <Text>{message}</Text> : message}
      {children}
      <Group {...getMullionDebugProps('ConfirmModal', 'actions')} justify="flex-end">
        <Button variant="default" onClick={onClose}>{t('common_cancel', 'Cancel')}</Button>
        <Button
          tone={confirmTone}
          onClick={onConfirm}
          loading={loading}
          aria-label={confirmAriaLabel}
        >
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  );
}

export function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmTone = 'danger',
  confirmAriaLabel,
  loading = false,
  children,
}: ConfirmModalProps) {
  return (
    <Modal
      {...getMullionDebugProps('ConfirmModal')}
      opened={opened}
      onClose={onClose}
      withinPortal={false}
      title={<span {...getMullionDebugProps('ConfirmModal', 'title')}>{title}</span>}
      closeButtonProps={getMullionDebugProps('ConfirmModal', 'close')}
      overlayProps={getMullionDebugProps('ConfirmModal', 'overlay')}
      padding="md"
    >
      <ConfirmModalContent
        message={message}
        children={children}
        onClose={onClose}
        onConfirm={onConfirm}
        confirmLabel={confirmLabel}
        confirmTone={confirmTone}
        confirmAriaLabel={confirmAriaLabel}
        loading={loading}
      />
    </Modal>
  );
}

setMullionDebugDisplayName(ConfirmModal, 'ConfirmModal');
setMullionDebugDisplayName(ConfirmModalContent, 'ConfirmModalContent');