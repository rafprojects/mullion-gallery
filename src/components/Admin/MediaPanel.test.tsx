import { describe, it, expect, vi } from 'vitest';
import { useRef } from 'react';
import { render, screen, waitFor, pickOption, shownOption } from '../../test/test-utils';
import { MediaPanel } from './MediaPanel';
import type { CampaignSelectItem } from '@/components/Common/CampaignSelector';
import type { ApiClient } from '@/services/apiClient';
import type { useAdminZipTransfers } from '@/hooks/useAdminZipTransfers';

const campaignSelectData: CampaignSelectItem[] = [
  { value: '101', label: 'First Campaign' },
  { value: '102', label: 'Second Campaign' },
];

const zipTransfers = {
  mediaZipExporting: false,
  mediaZipImporting: false,
  exportMediaZip: vi.fn(),
  importMediaZip: vi.fn(),
} as unknown as ReturnType<typeof useAdminZipTransfers>;

function makeApiClient(): ApiClient {
  return new Proxy({}, {
    get() {
      return vi.fn().mockResolvedValue({ items: [], total: 0 });
    },
  }) as unknown as ApiClient;
}

const baseProps = {
  apiClient: makeApiClient(),
  campaignSelectData,
  zipTransfers,
  onNotify: vi.fn(),
  onCampaignsUpdated: vi.fn(),
  isSystemAdmin: true,
};

describe('MediaPanel (P72-E)', () => {
  it('default-selects the first campaign when active', async () => {
    render(<MediaPanel {...baseProps} active apiClient={makeApiClient()} />);
    // The campaign selector reflects the child-owned selection.
    await waitFor(() => expect(shownOption(/campaign/i)).toBe('First Campaign'));
  });

  it('does not auto-select a campaign while inactive (gating preserved)', async () => {
    render(<MediaPanel {...baseProps} active={false} apiClient={makeApiClient()} />);
    await new Promise((r) => setTimeout(r, 50));
    const shown = screen.queryAllByRole('combobox', { hidden: true }).map((el) => el.textContent ?? '');
    expect(shown.some((text) => text.includes('First Campaign'))).toBe(false);
  });

  it('owns its selection state — updating it does not re-render the parent (option b isolation)', async () => {
    const parentRenders = { count: 0 };
    const apiClient = makeApiClient();

    function Harness() {
      const renders = useRef(0);
      renders.current += 1;
      parentRenders.count = renders.current;
      return <MediaPanel {...baseProps} active apiClient={apiClient} />;
    }

    render(<Harness />);

    // The child's mount-time default-select drives the selection — proof its own
    // state changed at least once.
    await waitFor(() => expect(shownOption(/campaign/i)).toBe('First Campaign'));
    const rendersAfterMount = parentRenders.count;

    // Now drive a *user-initiated* selection change through the child. This is
    // the assertion that actually discriminates option (b) from (a): had the
    // selection stayed lifted in AdminPanel, this change would run through a
    // parent-owned setter and bump the parent's render count.
    await pickOption(/campaign/i, 'Second Campaign');

    await waitFor(() => expect(shownOption(/campaign/i)).toBe('Second Campaign'));
    expect(parentRenders.count).toBe(rendersAfterMount);
    expect(parentRenders.count).toBe(1);
  });
});
