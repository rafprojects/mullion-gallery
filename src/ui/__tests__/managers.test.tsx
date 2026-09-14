/**
 * P80-C: the notification and confirmation managers.
 *
 * The thing these prove that a render test cannot is the *store*: both are
 * module singletons called from plain functions, so the contract is "a call
 * made anywhere reaches the mounted host, including a call made before the host
 * exists". Mantine's store holds a pre-mount `show`; Base UI's manager emits to
 * current subscribers and keeps nothing, so the buffer that closes that gap is
 * ours and is tested here rather than assumed.
 *
 * As in P80-A, nothing here asserts a painted colour: jsdom resolves no cascade.
 * What is asserted is that the sheet's state selectors name attributes the
 * primitive actually writes, read out of the sheet rather than restated, which
 * is the strong form P80-B had to adopt after keying a rule on `data-selected`
 * where Base UI writes `data-active`.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MullionProvider } from '@/ui';
import { SCOPE_ATTR } from '../provider/scope';
import { Confirmations, Notifications, confirm, notify } from '../components';

const SHEET = readFileSync(path.resolve(__dirname, '../components/notification.css'), 'utf8');

function mountNotifications(props: Partial<React.ComponentProps<typeof Notifications>> = {}) {
  return render(
    <MullionProvider>
      <Notifications label="Notifications" closeButtonLabel="Dismiss" {...props} />
    </MullionProvider>,
  );
}

afterEach(() => {
  act(() => {
    notify.clean();
    confirm.closeAll();
  });
});

describe('notify, as a store', () => {
  it('shows a toast with its title and message', async () => {
    mountNotifications();
    act(() => {
      notify.show({ title: 'Saved', message: 'Layout saved' });
    });
    expect(await screen.findByText('Saved')).toBeTruthy();
    expect(screen.getByText('Layout saved')).toBeTruthy();
  });

  it('returns an id, and hide() with it removes that toast and no other', async () => {
    mountNotifications();
    let first = '';
    act(() => {
      first = notify.show({ message: 'first' });
      notify.show({ message: 'second' });
    });
    await screen.findByText('first');

    act(() => {
      notify.hide(first);
    });
    await waitFor(() => expect(screen.queryByText('first')).toBeNull());
    expect(screen.getByText('second')).toBeTruthy();
  });

  it('update() takes the id inside its options, as the Mantine call it replaces does', async () => {
    mountNotifications();
    let id = '';
    act(() => {
      id = notify.show({ message: 'before' });
    });
    await screen.findByText('before');

    act(() => {
      notify.update({ id, message: 'after' });
    });
    expect(await screen.findByText('after')).toBeTruthy();
    expect(screen.queryByText('before')).toBeNull();
  });

  it('clean() removes every toast', async () => {
    mountNotifications();
    act(() => {
      notify.show({ message: 'a' });
      notify.show({ message: 'b' });
    });
    await screen.findByText('a');

    act(() => {
      notify.clean();
    });
    await waitFor(() => expect(screen.queryByText('a')).toBeNull());
    expect(screen.queryByText('b')).toBeNull();
  });

  /*
   * The buffer. Base UI's `createToastManager` emits to whoever is subscribed at
   * the time and holds nothing, so without this the toast is dropped in silence
   * and the user simply never sees the error they caused.
   */
  it('holds a toast raised before the viewport mounts and shows it on mount', async () => {
    act(() => {
      notify.show({ message: 'raised during boot' });
    });
    mountNotifications();
    expect(await screen.findByText('raised during boot')).toBeTruthy();
  });
});

describe('notify, option mapping', () => {
  it.each([
    ['green', 'success'],
    ['red', 'danger'],
    ['gray', 'muted'],
    ['blue', 'info'],
    ['orange', 'warning'],
    ['yellow', 'warning'],
  ] as const)('color=%s becomes tone=%s', async (color, tone) => {
    mountNotifications();
    act(() => {
      notify.show({ message: `c-${color}`, color });
    });
    const text = await screen.findByText(`c-${color}`);
    expect(text.closest('.mullion-toast')?.getAttribute('data-mullion-tone')).toBe(tone);
  });

  it('a role tone carries its glyph, and icon={false} declines it', async () => {
    mountNotifications();
    act(() => {
      notify.show({ message: 'with', color: 'red' });
      notify.show({ message: 'without', color: 'red', icon: false });
    });
    const withGlyph = (await screen.findByText('with')).closest('.mullion-toast');
    const withoutGlyph = screen.getByText('without').closest('.mullion-toast');
    expect(withGlyph?.querySelector('.mullion-role-glyph')).not.toBeNull();
    expect(withoutGlyph?.querySelector('.mullion-role-glyph')).toBeNull();
  });

  it('withCloseButton={false} drops the close button; the default keeps it', async () => {
    mountNotifications();
    act(() => {
      notify.show({ message: 'keeps' });
      notify.show({ message: 'drops', withCloseButton: false });
    });
    const keeps = (await screen.findByText('keeps')).closest('.mullion-toast')!;
    const drops = screen.getByText('drops').closest('.mullion-toast')!;
    expect(within(keeps as HTMLElement).getByRole('button', { name: 'Dismiss' })).toBeTruthy();
    expect(within(drops as HTMLElement).queryByRole('button')).toBeNull();
  });

  /*
   * `autoClose: 0` is the interesting one. Mantine reads it as a zero-length
   * timer and dismisses on the next tick, which is a live defect at the one call
   * site that passes it; both spellings mean "keep it up" here.
   */
  it.each([
    ['false', false as const],
    ['zero', 0],
  ])('autoClose=%s keeps the toast up', async (_label, autoClose) => {
    vi.useFakeTimers();
    try {
      mountNotifications();
      act(() => {
        notify.show({ message: 'persistent', autoClose });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20_000);
      });
      expect(screen.getByText('persistent')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a numeric autoClose dismisses at its own delay and not before', async () => {
    vi.useFakeTimers();
    try {
      mountNotifications();
      act(() => {
        notify.show({ message: 'timed', autoClose: 3000 });
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(screen.getByText('timed')).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      expect(screen.queryByText('timed')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('the toast, as a rendered thing', () => {
  it('lands inside the provider scope, not bare in body', async () => {
    mountNotifications();
    act(() => {
      notify.show({ message: 'placed' });
    });
    const toast = (await screen.findByText('placed')).closest('.mullion-toast')!;
    expect(toast.closest(`[${SCOPE_ATTR}]`)).not.toBeNull();
    expect(toast.parentElement).not.toBe(document.body);
  });

  it('a caller-supplied container overrides the provider', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    mountNotifications({ container: target });
    act(() => {
      notify.show({ message: 'elsewhere' });
    });
    await waitFor(() => expect(within(target).getByText('elsewhere')).toBeTruthy());
    target.remove();
  });

  it('the viewport is a polite live region named by the label prop, not by Base UI English', async () => {
    mountNotifications({ label: 'Benachrichtigungen' });
    act(() => {
      notify.show({ message: 'announced' });
    });
    const viewport = await screen.findByRole('region', { name: 'Benachrichtigungen' });
    expect(viewport.getAttribute('aria-live')).toBe('polite');
    expect(viewport.className).toContain('mullion-toast-viewport');
  });

  /*
   * The strong form of the P77-C guard: the attribute names are read out of the
   * sheet, so a rule retargeted at an attribute Base UI does not write fails
   * here rather than painting nothing in a browser.
   */
  it('every toast state selector in the sheet names an attribute the primitive writes', async () => {
    const selectors = [...SHEET.matchAll(/\.mullion-toast\[(data-[a-z-]+)\]/g)].map((m) => m[1]!);
    expect(new Set(selectors)).toEqual(
      new Set(['data-starting-style', 'data-ending-style', 'data-limited']),
    );

    mountNotifications({ limit: 1 });
    act(() => {
      notify.show({ message: 'front' });
      notify.show({ message: 'behind' });
    });
    await screen.findByText('behind');
    const limited = screen.getByText('front').closest('.mullion-toast')!;
    expect(limited.hasAttribute('data-limited')).toBe(true);
  });

  it('the tone attribute the sheet keys on is on the toast that declares it', async () => {
    const toneSelectors = [...SHEET.matchAll(/\.mullion-toast\[data-mullion-tone='([a-z]+)'\]/g)].map(
      (m) => m[1]!,
    );
    expect(toneSelectors).toContain('danger');

    mountNotifications();
    act(() => {
      notify.show({ message: 'toned', color: 'red' });
    });
    const toast = (await screen.findByText('toned')).closest('.mullion-toast')!;
    expect(toast.getAttribute('data-mullion-tone')).toBe('danger');
  });
});

// ---------------------------------------------------------------------------
// confirm()
// ---------------------------------------------------------------------------

function mountConfirmations() {
  return render(
    <MullionProvider>
      <Confirmations />
    </MullionProvider>,
  );
}

const LABELS = { confirm: 'Delete', cancel: 'Cancel' };

describe('confirm()', () => {
  it('renders a dialog with the title, body and both labels', async () => {
    mountConfirmations();
    act(() => {
      void confirm({ title: 'Delete asset?', children: 'This cannot be undone.', labels: LABELS });
    });
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete asset?')).toBeTruthy();
    expect(within(dialog).getByText('This cannot be undone.')).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('the confirm button fires onConfirm and resolves true; the dialog closes', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    mountConfirmations();
    let resolved: boolean | undefined;
    act(() => {
      void confirm({ labels: LABELS, onConfirm, 'aria-label': 'c' }).then((v) => {
        resolved = v;
      });
    });
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(resolved).toBe(true));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('the cancel button fires onCancel and resolves false', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    mountConfirmations();
    let resolved: boolean | undefined;
    act(() => {
      void confirm({ labels: LABELS, onCancel, 'aria-label': 'c' }).then((v) => {
        resolved = v;
      });
    });
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(resolved).toBe(false));
  });

  /*
   * Dismissal is not cancellation as far as the caller's callbacks go: Mantine
   * fires `onCancel` for a cancel press and `onClose` for a dismissal, and the
   * draft-restore call site relies on the difference (cancel discards the draft).
   */
  it('Escape fires onClose rather than onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onClose = vi.fn();
    mountConfirmations();
    act(() => {
      void confirm({ labels: LABELS, onCancel, onClose, 'aria-label': 'c' });
    });
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it.each([
    ['red', 'danger'],
    ['orange', 'warning'],
    ['blue', 'primary'],
  ] as const)('confirmProps color=%s tones the confirm button %s', async (color, tone) => {
    mountConfirmations();
    act(() => {
      void confirm({ labels: LABELS, confirmProps: { color }, 'aria-label': 'c' });
    });
    const button = await screen.findByRole('button', { name: 'Delete' });
    expect(button.getAttribute('data-mullion-tone')).toBe(tone);
  });

  it('holds a confirm raised before the host mounts', async () => {
    act(() => {
      void confirm({ title: 'Early', labels: LABELS });
    });
    mountConfirmations();
    expect(await screen.findByText('Early')).toBeTruthy();
  });

  it('lands inside the provider scope', async () => {
    mountConfirmations();
    act(() => {
      void confirm({ labels: LABELS, 'aria-label': 'placed' });
    });
    const dialog = await screen.findByRole('dialog');
    expect(dialog.closest(`[${SCOPE_ATTR}]`)).not.toBeNull();
    expect(dialog.parentElement).not.toBe(document.body);
  });

  /*
   * The queue, and the reason for it. Two sibling modal dialogs each mark the
   * other's portal `aria-hidden`, which leaves neither exposed; rendering one
   * at a time means that arrangement never occurs. The assertion is on the
   * exposed dialog, not merely on the DOM, because a dialog present but hidden
   * from assistive technology is the defect this guards.
   */
  it('queues a second confirm rather than opening two dialogs at once', async () => {
    const user = userEvent.setup();
    const onFirst = vi.fn();
    mountConfirmations();
    act(() => {
      void confirm({ title: 'One', labels: LABELS, onConfirm: onFirst });
      void confirm({ title: 'Two', labels: LABELS });
    });

    const first = await screen.findByRole('dialog');
    expect(within(first).getByText('One')).toBeTruthy();
    expect(screen.queryByText('Two')).toBeNull();

    await user.click(within(first).getByRole('button', { name: 'Delete' }));
    expect(onFirst).toHaveBeenCalledTimes(1);

    const second = await screen.findByRole('dialog');
    expect(within(second).getByText('Two')).toBeTruthy();
  });

  it('closeAll() cancels every open confirm', async () => {
    const onCancel = vi.fn();
    mountConfirmations();
    act(() => {
      void confirm({ title: 'Gone', labels: LABELS, onCancel });
    });
    await screen.findByText('Gone');

    act(() => {
      confirm.closeAll();
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
