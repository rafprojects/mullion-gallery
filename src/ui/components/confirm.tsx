/**
 * The confirmation manager (P80-C): `confirm()` and `<Confirmations />`.
 *
 * Built on the framework's own `Modal` (P80-A) rather than on a second dialog
 * implementation, so a confirm inherits the focus trap, the return-focus fix and
 * the token-carrying portal container that track already proved.
 *
 * The call shape is `modals.openConfirmModal`'s: `title`, `children`, the
 * `labels` pair, `confirmProps`/`cancelProps` and the two callbacks. All six
 * production call sites pass some subset of exactly those, so Phase 81's
 * migration is a rename of the callee (Key Decision E).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Button } from './control';
import { Modal } from './overlay';
import { usePageHost } from './pageHost';
import type { UiTone } from './element';
import type { UiControlVariant } from './control';

/** The palette names the six call sites pass, mapped to the framework's roles. */
export type UiConfirmColor = 'red' | 'orange' | 'blue' | 'green' | 'gray';

const COLOR_TONES: Record<UiConfirmColor, UiTone> = {
  red: 'danger',
  orange: 'warning',
  blue: 'primary',
  green: 'success',
  gray: 'muted',
};

export interface UiConfirmButtonProps {
  color?: UiConfirmColor | undefined;
  tone?: UiTone | undefined;
  variant?: UiControlVariant | undefined;
  disabled?: boolean | undefined;
}

export interface UiConfirmOptions {
  title?: ReactNode;
  children?: ReactNode;
  labels: { confirm: ReactNode; cancel: ReactNode };
  confirmProps?: UiConfirmButtonProps | undefined;
  cancelProps?: UiConfirmButtonProps | undefined;
  onConfirm?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
  /** Dismissing by Escape, an outside press or the close button. */
  onClose?: (() => void) | undefined;
  closeOnEscape?: boolean | undefined;
  closeOnClickOutside?: boolean | undefined;
  withCloseButton?: boolean | undefined;
  closeButtonLabel?: string | undefined;
  /** The dialog's accessible name when it has no visible title. */
  'aria-label'?: string | undefined;
  /**
   * The dialog's width, as a CSS length. Deliberately not a scale step: the
   * `Modal` prop behind it is typed `UiSpacing`, and passing `"md"` there reads
   * as a sensible size while resolving to the ~16px *spacing* token, which
   * renders a dialog narrower than its own buttons.
   */
  size?: string | number | undefined;
}

interface ConfirmRecord extends UiConfirmOptions {
  id: string;
}

type Listener = (records: ConfirmRecord[]) => void;

let records: ConfirmRecord[] = [];
const listeners = new Set<Listener>();
let sequence = 0;

function emit(): void {
  const snapshot = records;
  listeners.forEach((listener) => listener(snapshot));
}

/*
 * Held until a host mounts, for the same reason the toast store buffers: a
 * `confirm()` raised during boot that silently never appears is a worse failure
 * than one that appears a tick late.
 */
const pending: (() => void)[] = [];

function enqueue(run: () => void): void {
  if (listeners.size > 0) {
    run();
    return;
  }
  pending.push(run);
}

function dismiss(id: string): void {
  records = records.filter((record) => record.id !== id);
  emit();
}

/**
 * Opens a confirmation dialog. The promise resolves `true` when confirmed and
 * `false` on cancel or dismissal, for code written after the migration; the six
 * existing call sites use the callbacks and can ignore it.
 */
export function confirm(options: UiConfirmOptions): Promise<boolean> {
  sequence += 1;
  const id = `mullion-confirm-${sequence}`;
  return new Promise<boolean>((resolve) => {
    const record: ConfirmRecord = {
      ...options,
      id,
      onConfirm: () => {
        options.onConfirm?.();
        resolve(true);
      },
      onCancel: () => {
        options.onCancel?.();
        resolve(false);
      },
      onClose: () => {
        options.onClose?.();
        resolve(false);
      },
    };
    enqueue(() => {
      records = [...records, record];
      emit();
    });
  });
}

/** Closes every open confirmation, as `modals.closeAll` does today. */
confirm.closeAll = function closeAll(): void {
  pending.length = 0;
  records.forEach((record) => record.onCancel?.());
  records = [];
  emit();
};

function toneOf(props: UiConfirmButtonProps | undefined, fallback: UiTone): UiTone {
  if (props?.tone !== undefined) return props.tone;
  if (props?.color !== undefined) return COLOR_TONES[props.color];
  return fallback;
}

function ConfirmDialog({ record }: { record: ConfirmRecord }) {
  const [opened, setOpened] = useState(true);

  /*
   * Closed by its own state first, then removed from the store, so the dialog
   * plays its exit transition instead of being unmounted mid-frame. The record
   * is dropped on the next tick rather than on a transition event: a dialog that
   * never gets one (reduced motion, jsdom) would otherwise leak forever.
   */
  const close = useCallback(
    (finish: (() => void) | undefined) => {
      setOpened(false);
      finish?.();
      queueMicrotask(() => dismiss(record.id));
    },
    [record.id],
  );

  const confirmTone = toneOf(record.confirmProps, 'primary');
  const cancelTone = toneOf(record.cancelProps, 'default');

  return (
    <Modal
      opened={opened}
      onClose={() => close(record.onClose)}
      className="mullion-confirm"
      withCloseButton={record.withCloseButton ?? false}
      {...(record.size !== undefined ? { size: record.size } : {})}
      {...(record.title !== undefined ? { title: record.title } : {})}
      {...(record['aria-label'] !== undefined ? { 'aria-label': record['aria-label'] } : {})}
      {...(record.closeButtonLabel !== undefined ? { closeButtonLabel: record.closeButtonLabel } : {})}
      {...(record.closeOnEscape !== undefined ? { closeOnEscape: record.closeOnEscape } : {})}
      {...(record.closeOnClickOutside !== undefined
        ? { closeOnClickOutside: record.closeOnClickOutside }
        : {})}
    >
      {record.children !== undefined ? (
        <div className="mullion-confirm-body">{record.children}</div>
      ) : null}
      <div className="mullion-confirm-actions">
        <Button
          variant={record.cancelProps?.variant ?? 'default'}
          tone={cancelTone}
          leftSection={false}
          {...(record.cancelProps?.disabled !== undefined
            ? { disabled: record.cancelProps.disabled }
            : {})}
          onClick={() => close(record.onCancel)}
        >
          {record.labels.cancel}
        </Button>
        <Button
          variant={record.confirmProps?.variant ?? 'filled'}
          tone={confirmTone}
          leftSection={false}
          {...(record.confirmProps?.disabled !== undefined
            ? { disabled: record.confirmProps.disabled }
            : {})}
          onClick={() => close(record.onConfirm)}
        >
          {record.labels.confirm}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Mount it near the provider, in every root if that is convenient. Everything
 * else calls `confirm()`. Only the first host mounted renders (`./pageHost`):
 * before P80-F a page with two galleries opened every confirmation twice.
 *
 * One at a time, in the order asked. Two confirmations raised in the same
 * commit render two sibling modal dialogs, and Base UI then marks each one's
 * portal `aria-hidden` on behalf of the other: measured in jsdom, that leaves
 * *neither* exposed to assistive technology, where opening them a commit apart
 * correctly exposes the topmost. Serialising removes that case, and a queue is
 * the better reading of a confirmation anyway, since the user answers one
 * question at a time. P80-F settled the underlying Modal behaviour: inside the
 * overlay root `./modalStack` exposes the topmost, and in a light-DOM container
 * a same-commit pair warns in development.
 */
export function Confirmations() {
  return usePageHost('confirmations') ? <ConfirmationsHost /> : null;
}

function ConfirmationsHost() {
  const [open, setOpen] = useState<ConfirmRecord[]>(records);

  useEffect(() => {
    const listener: Listener = (next) => setOpen(next);
    listeners.add(listener);
    while (pending.length > 0) pending.shift()?.();
    setOpen(records);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const current = open[0];
  return current ? <ConfirmDialog key={current.id} record={current} /> : null;
}
