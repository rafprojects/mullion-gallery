
import { Image, Modal } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { MediaItem } from '@/types';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Text, Box, ActionIcon } from '@/ui';

interface MediaLightboxModalProps {
  opened: boolean;
  onClose: () => void;
  imageItems: MediaItem[];
  lightboxIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

export function MediaLightboxModal({
  opened,
  onClose,
  imageItems,
  lightboxIndex,
  onPrev,
  onNext,
}: MediaLightboxModalProps) {
  const { t } = useTranslation('mullion');
  const currentItem = imageItems[lightboxIndex];
  const ariaLabel = t('admin_media_lb_aria', 'Media lightbox: {{caption}} ({{index}} of {{total}})', { caption: currentItem?.caption || t('admin_media_type_image', 'Image'), index: lightboxIndex + 1, total: imageItems.length });

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      padding={0}
      withCloseButton={false}
      centered
      styles={{ body: { background: 'color-mix(in srgb, var(--mullion-color-background) 90%, transparent)' } }}
      aria-label={ariaLabel}
    >
      {imageItems.length > 0 && currentItem && (
        <Box style={{ position: 'relative' }}>
          <Image
            src={currentItem.url}
            alt={currentItem.caption || t('admin_media_lb_alt', 'Media preview')}
            fit="contain"
            style={{ maxHeight: '80dvh' }}
          />
          <ActionIcon
            variant="filled"
            tone="default"
            style={{ position: 'absolute', top: uiRem(0.625), right: uiRem(0.625) }}
            onClick={onClose}
            aria-label={t('admin_media_lb_close', 'Close lightbox')}
          >
            <IconX size={18} />
          </ActionIcon>
          {imageItems.length > 1 && (
            <>
              <ActionIcon
                variant="filled"
                tone="default"
                style={{ position: 'absolute', left: uiRem(0.625), top: '50%', transform: 'translateY(-50%)' }}
                onClick={onPrev}
                aria-label={t('admin_media_lb_prev', 'Previous image')}
              >
                <IconChevronLeft size={20} />
              </ActionIcon>
              <ActionIcon
                variant="filled"
                tone="default"
                style={{ position: 'absolute', right: uiRem(0.625), top: '50%', transform: 'translateY(-50%)' }}
                onClick={onNext}
                aria-label={t('admin_media_lb_next', 'Next image')}
              >
                <IconChevronRight size={20} />
              </ActionIcon>
            </>
          )}
          <Box
            padding="md"
            // Theme text on a scrim of the theme's background that reaches the audited
            // opacity at the caption line (contrastAudit.ts). Muted ink cannot clear on
            // a scrim over an arbitrary photo, so the counter takes text too.
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              color: 'var(--mullion-color-text)',
              background:
                'linear-gradient(transparent, color-mix(in srgb, var(--mullion-color-background) var(--mullion-caption-scrim), transparent) var(--mullion-spacing-md))',
            }}
          >
            <Text size="sm">{currentItem.caption || t('admin_untitled', 'Untitled')}</Text>
            <Text size="xs">{lightboxIndex + 1} / {imageItems.length}</Text>
          </Box>
        </Box>
      )}
    </Modal>
  );
}

setMullionDebugDisplayName(MediaLightboxModal, 'AdminPanel:MediaLightboxModal');