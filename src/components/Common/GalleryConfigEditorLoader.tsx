
import { Loader } from '@mantine/core';
import { setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Stack, Text, Center } from '@/ui';

interface GalleryConfigEditorLoaderProps {
  minHeight?: number;
  message?: string;
}

export function GalleryConfigEditorLoader({
  minHeight = 220,
  message = 'Loading gallery config editor...',
}: GalleryConfigEditorLoaderProps) {
  return (
    <Center paddingBlock="xl" style={{ minHeight: uiRem(minHeight / 16) }}>
      <Stack align="center" gap="xs">
        <Loader size="sm" />
        <Text size="sm" tone="muted">
          {message}
        </Text>
      </Stack>
    </Center>
  );
}

setMullionDebugDisplayName(GalleryConfigEditorLoader, 'GalleryConfigEditorLoader');