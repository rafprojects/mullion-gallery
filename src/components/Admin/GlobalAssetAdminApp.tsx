import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { Confirmations, MullionProvider, Notifications, notify } from '@/ui';
import i18n from '@/i18n';

import { ApiClient } from '@/services/apiClient';
import { getWpNonce, setWpNonce, WP_NONCE_PATH } from '@/services/wpNonce';
import { createAppQueryClient } from '@/services/queryClient';
import { GlobalAssetManager } from '@/components/Admin/GlobalAssetManager';

function notifyMessage(message: { type: 'error' | 'success'; text: string }) {
  notify.show({
    color: message.type === 'error' ? 'red' : 'green',
    message: message.text,
  });
}

/**
 * P52-B — Standalone mount for the WP-admin "Asset Library" page
 * (#mullion-assets-admin).
 *
 * Renders only the GlobalAssetManager — not the full gallery App — wrapped in
 * the minimal provider tree it needs. Auth is cookie + REST nonce (read from
 * window.__MULLION_CONFIG__ by the HTTP transport). Mounts in light DOM (no shadow
 * root) to live inside wp-admin.
 */
export function mountGlobalAssets(host: HTMLElement): void {
  if (host.hasAttribute('data-mullion-mounted')) return;
  host.setAttribute('data-mullion-mounted', 'true');

  const apiBaseUrl = window.__MULLION_API_BASE__ ?? window.location.origin;
  const apiClient = new ApiClient({
    baseUrl: apiBaseUrl,
    getNonce: getWpNonce,
    setNonce: setWpNonce,
    noncePath: WP_NONCE_PATH,
  });
  const queryClient = createAppQueryClient();

  createRoot(host).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        {/*
          * P81-A: the framework's components need tokens and sheets, so the
          * wp-admin app gets a provider scoped to its host. The light default
          * matches the Mantine default theme this page has always rendered in.
          */}
        <MullionProvider theme="default-light" scope={host} instanceId="assets-admin">
          <MantineProvider>
            <Notifications label={i18n.t('common_notifications', 'Notifications')} closeButtonLabel={i18n.t('common_close', 'Close')} />
            <Confirmations />
              <GlobalAssetManager apiClient={apiClient} onNotify={notifyMessage} />
          </MantineProvider>
        </MullionProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
