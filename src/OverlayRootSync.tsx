import { useEffect } from 'react';
import { useMantineTheme } from '@mantine/core';
import { syncOverlayMantineVars, type PortalTarget } from './portalTarget';

/**
 * P77-B: keeps the overlay root's copy of Mantine's variables current. Renders
 * nothing; must sit inside the `MantineProvider` whose theme it mirrors. No-op
 * unless the portal mode is `overlay-root`. The `--mullion-*` token sheet it
 * also mirrored until P79-A is now written by `MullionProvider`; this survives
 * only until Phase 81 removes Mantine's own variables.
 */
export function OverlayRootSync({
  portal,
  colorScheme,
}: {
  portal: PortalTarget;
  colorScheme: 'light' | 'dark';
}) {
  const theme = useMantineTheme();

  useEffect(() => {
    syncOverlayMantineVars(portal, theme, colorScheme);
  }, [portal, theme, colorScheme]);

  return null;
}
