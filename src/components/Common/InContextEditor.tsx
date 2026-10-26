import { forwardRef, useCallback, type ReactNode } from 'react';
import { ScrollArea } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { getMullionDebugProps, setMullionDebugDisplayName } from '@/utils/mullionDebug';
import { uiRem, Box, ActionIcon, Popover } from '@/ui';

interface InContextEditorProps {
  /** Position relative to the nearest positioned parent, or `inline` to sit in its parent's flow. */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'inline';
  /** Only show when true (typically isAdmin && showInContextEditors). */
  visible?: boolean;
  /** Popup content — form fields for the relevant settings. */
  children: ReactNode;
}

interface InContextEditorToggleProps extends React.ComponentPropsWithoutRef<'button'> {
  onToggle: () => void;
}

const InContextEditorToggle = forwardRef<HTMLButtonElement, InContextEditorToggleProps>(
  ({ onToggle, style, children, onClick, ...actionIconProps }, ref) => {
    const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
      onClick?.(event);
      if (!event.defaultPrevented) {
        onToggle();
      }
    };

    return (
      <ActionIcon
        {...getMullionDebugProps('InContextEditor', 'toggle')}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...(actionIconProps as any)}
        ref={ref}
        variant="filled"
        tone="primary"
        size="sm"
        radius="xl"
        onClick={handleClick}
        title="Edit settings"
        aria-label="Edit settings"
        style={{ opacity: 0.85, ...style }}
      >
        {children ?? <IconSettings size={14} />}
      </ActionIcon>
    );
  },
);

setMullionDebugDisplayName(InContextEditorToggle, 'InContextEditorToggle');

interface InContextEditorContentProps {
  children: ReactNode;
}

function InContextEditorContent({ children }: InContextEditorContentProps) {
  return (
    <Popover.Content
      side="bottom"
      align="end"
      width={340}
      style={{ backdropFilter: 'blur(8px)' }}
      {...getMullionDebugProps('InContextEditor', 'dropdown')}
    >
      <ScrollArea.Autosize {...getMullionDebugProps('InContextEditor', 'content')} style={{ maxHeight: uiRem(25) }}>
        {children}
      </ScrollArea.Autosize>
    </Popover.Content>
  );
}

const positionStyles: Record<string, React.CSSProperties> = {
  'top-right': { position: 'absolute', top: 8, right: 8, zIndex: 10 },
  'top-left': { position: 'absolute', top: 8, left: 8, zIndex: 10 },
  'bottom-right': { position: 'absolute', bottom: 8, right: 8, zIndex: 10 },
  inline: { display: 'inline-flex', position: 'relative', zIndex: 10 },
};

/**
 * Admin-only floating gear icon that opens a popover for live editing of
 * nearby settings.  Rendered inside gallery/card/viewer components; only
 * visible when `visible` is true.
 */
export function InContextEditor({
  position = 'top-right',
  visible = false,
  children,
}: InContextEditorProps) {
  const [opened, { toggle, close }] = useDisclosure(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { close(); e.stopPropagation(); }
    },
    [close],
  );

  if (!visible) return null;

  return (
    <Box {...getMullionDebugProps('InContextEditor', 'anchor')} style={positionStyles[position]} onKeyDown={handleKeyDown}>
      <Popover
        {...getMullionDebugProps('InContextEditor')}
        opened={opened}
        onChange={(next) => {
          if (!next) close();
        }}
      >
        <Popover.Trigger render={<InContextEditorToggle onToggle={toggle} />} />
        <InContextEditorContent>{children}</InContextEditorContent>
      </Popover>
    </Box>
  );
}

setMullionDebugDisplayName(InContextEditor, 'InContextEditor');