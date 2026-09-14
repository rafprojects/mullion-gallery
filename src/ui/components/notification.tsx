/**
 * The notification manager (P80-C): `notify` and `<Notifications />`.
 *
 * The store is a module singleton rather than a hook, because every one of the
 * 42 production call sites raises its toast from a callback rather than from a
 * component's render: error handlers, mutation callbacks, file readers. A hook
 * could not reach any of them. Base UI's `createToastManager` is built for that
 * exact case and `<Notifications />` subscribes to it, so the call shape the
 * codebase already uses survives the migration unchanged (Key Decision E).
 *
 * The viewport portals into `useMullionPortal()` like every other overlay. A
 * toast has no trigger, so none of P80-B's reasoning about keeping a popup in
 * its trigger's root applies: nothing references it by id across a shadow
 * boundary, and the overlay root is the container that carries the tokens.
 */

import { Toast } from '@base-ui/react/toast';
import type { ToastRootToastObject } from '@base-ui/react/toast';
import { useEffect, type ReactNode } from 'react';
import type { UiTone } from './element';
import { CloseButton } from './control';
import { customProperties } from './scale';
import { resolveRoleGlyph } from './roleGlyph';
import { uiLayer } from '../styles/layers';
import { useMullionPortal } from '../provider/hooks';

/** Where the stack sits. Mantine's spelling, so a migrated call reads the same. */
export type UiNotifyPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * The six Mantine palette names the codebase actually passes, and nothing else.
 *
 * Deliberately not `string`: a migration that reaches for `teal` should fail to
 * compile rather than silently paint an untoned toast. The mapping is to the
 * framework's roles, which is what carries the glyph and the audited contrast.
 */
export type UiNotifyColor = 'green' | 'red' | 'gray' | 'blue' | 'orange' | 'yellow';

const COLOR_TONES: Record<UiNotifyColor, UiTone> = {
  green: 'success',
  red: 'danger',
  gray: 'muted',
  blue: 'info',
  orange: 'warning',
  yellow: 'warning',
};

export interface UiNotifyOptions {
  /**
   * Reusing an id updates that toast in place and restarts its timer.
   *
   * Mantine instead ignores a `show` whose id is already on screen. The one
   * call site that passes an id fires once per idle cycle, so nothing in this
   * codebase can tell the difference, and upserting is the less surprising of
   * the two: silently dropping a notification is how a stale message survives.
   */
  id?: string | undefined;
  title?: ReactNode;
  message?: ReactNode;
  /** A Mantine palette name, mapped to a role. Ignored when `tone` is given. */
  color?: UiNotifyColor | undefined;
  /** The framework's own vocabulary, for code written after the migration. */
  tone?: UiTone | undefined;
  /**
   * Milliseconds, or `false` to keep it up until dismissed.
   *
   * `0` also means "keep it up". Mantine reads `0` as a zero-length timer and
   * dismisses on the next tick, which is a live defect at the one call site
   * that passes it (`useBroadcastStaleness`); reproducing that here would carry
   * the defect across the migration.
   */
  autoClose?: number | false | undefined;
  withCloseButton?: boolean | undefined;
  /** An explicit icon, or `false` to decline a role tone's default glyph. */
  icon?: ReactNode | false | undefined;
  /** `high` also mirrors the toast into a `role="alert"` region. */
  priority?: 'low' | 'high' | undefined;
  onClose?: (() => void) | undefined;
}

/** What the visual reads back off the toast; not part of the caller's surface. */
interface ToastData extends Record<string, unknown> {
  tone: UiTone;
  withCloseButton: boolean;
  icon: ReactNode | false | undefined;
}

function resolveTone(options: UiNotifyOptions): UiTone {
  if (options.tone !== undefined) return options.tone;
  if (options.color !== undefined) return COLOR_TONES[options.color];
  return 'default';
}

/** Base UI reads `0` as "never dismiss", which is the meaning both spellings want. */
function resolveTimeout(autoClose: number | false | undefined): number | undefined {
  if (autoClose === undefined) return undefined;
  if (autoClose === false) return 0;
  return autoClose <= 0 ? 0 : autoClose;
}

function toAddOptions(options: UiNotifyOptions) {
  const data: ToastData = {
    tone: resolveTone(options),
    withCloseButton: options.withCloseButton ?? true,
    icon: options.icon,
  };
  const timeout = resolveTimeout(options.autoClose);
  return {
    ...(options.title !== undefined ? { title: options.title } : {}),
    ...(options.message !== undefined ? { description: options.message } : {}),
    ...(timeout !== undefined ? { timeout } : {}),
    ...(options.priority !== undefined ? { priority: options.priority } : {}),
    ...(options.onClose !== undefined ? { onClose: options.onClose } : {}),
    data,
  };
}

const manager = Toast.createToastManager();

/*
 * A toast raised before the viewport mounts.
 *
 * `createToastManager` emits to whatever is subscribed at the time and keeps
 * nothing, so a `show()` during app boot would be dropped in silence. Mantine's
 * store holds it and renders it when the container appears; this buffer keeps
 * that behaviour, because "the error notification sometimes does not appear" is
 * the worst class of regression a migration can introduce.
 */
let mounted = 0;
const pending: (() => void)[] = [];

function enqueue(run: () => void): void {
  if (mounted > 0) {
    run();
    return;
  }
  pending.push(run);
}

function flushPending(): void {
  while (pending.length > 0) pending.shift()?.();
}

let sequence = 0;

/**
 * The imperative store. `show`, `update`, `hide` and `clean` are named and
 * shaped as the Mantine calls they replace, including `update` taking the id
 * inside its options object rather than as a first argument.
 */
export const notify = {
  /** Returns the toast's id, generated when the caller does not supply one. */
  show(options: UiNotifyOptions = {}): string {
    sequence += 1;
    const id = options.id ?? `mullion-toast-${sequence}`;
    enqueue(() => manager.add({ id, ...toAddOptions(options) }));
    return id;
  },

  update(options: UiNotifyOptions & { id: string }): string {
    const { id } = options;
    enqueue(() => manager.update(id, toAddOptions(options)));
    return id;
  },

  hide(id: string): string {
    enqueue(() => manager.close(id));
    return id;
  },

  clean(): void {
    pending.length = 0;
    enqueue(() => manager.close());
  },
};

export interface NotificationsProps {
  /** Overrides the provider's container. For the harness, as elsewhere. */
  container?: HTMLElement | null | undefined;
  /** Mantine's default, kept so the stack does not move during the migration. */
  position?: UiNotifyPosition | undefined;
  /** How many are shown at once. Mantine's default is five. */
  limit?: number | undefined;
  /** The default dismissal delay. Mantine's default is four seconds. */
  timeout?: number | undefined;
  /**
   * The live region's accessible name.
   *
   * Required rather than optional: Base UI defaults it to the English literal
   * "Notifications", which would be the one untranslated string in a framework
   * whose whole point is that chrome is translatable.
   */
  label: string;
  closeButtonLabel?: string | undefined;
  zIndex?: string | number | undefined;
}

/**
 * The visual. Base UI owns the timers, the swipe-to-dismiss, the F6 focus jump
 * and the live-region plumbing; this supplies the glyph, the tone attribute and
 * the classes.
 */
function NotificationItem({
  toast,
  closeButtonLabel,
}: {
  toast: ToastRootToastObject<ToastData>;
  closeButtonLabel: string | undefined;
}) {
  const data = toast.data;
  const tone: UiTone = data?.tone ?? 'default';
  const glyph = resolveRoleGlyph(tone, data?.icon);

  return (
    <Toast.Root toast={toast} className="mullion-toast" data-mullion-tone={tone}>
      {glyph ? <span className="mullion-toast-icon">{glyph}</span> : null}
      <div className="mullion-toast-body">
        {toast.title !== undefined && toast.title !== null ? (
          <Toast.Title className="mullion-toast-title" />
        ) : null}
        {toast.description !== undefined && toast.description !== null ? (
          <Toast.Description className="mullion-toast-message" />
        ) : null}
      </div>
      {data?.withCloseButton !== false ? (
        <Toast.Close
          /*
           * Base UI hides the close button from assistive technology until the
           * viewport is expanded, which suits a collapsed stack where only the
           * front toast is readable. This stack is a plain column with every
           * toast visible, so hiding a focusable button would be both wrong and
           * an `aria-hidden-focus` violation.
           */
          aria-hidden={false}
          render={
            <CloseButton
              variant="subtle"
              className="mullion-toast-close"
              {...(closeButtonLabel !== undefined ? { 'aria-label': closeButtonLabel } : {})}
            />
          }
        />
      ) : null}
    </Toast.Root>
  );
}

function NotificationList({ closeButtonLabel }: { closeButtonLabel: string | undefined }) {
  const { toasts } = Toast.useToastManager<ToastData>();
  return (
    <>
      {toasts.map((toast) => (
        <NotificationItem key={toast.id} toast={toast} closeButtonLabel={closeButtonLabel} />
      ))}
    </>
  );
}

/**
 * Mount once, near the provider. Everything else calls `notify`.
 *
 * One store, so two galleries on one page render the same toast in both
 * viewports. That is what Mantine does today from its own module-level store,
 * so the migration changes nothing; it is written down because this codebase
 * has multi-instance defects of exactly this shape and the property should not
 * have to be rediscovered.
 */
export function Notifications({
  container,
  position = 'bottom-right',
  limit = 5,
  timeout = 4000,
  label,
  closeButtonLabel,
  zIndex,
}: NotificationsProps) {
  const provided = useMullionPortal();
  const target = container !== undefined ? container : provided;

  useEffect(() => {
    mounted += 1;
    flushPending();
    return () => {
      mounted -= 1;
    };
  }, []);

  return (
    <Toast.Provider toastManager={manager} limit={limit} timeout={timeout}>
      <Toast.Portal container={target}>
        <Toast.Viewport
          className="mullion-toast-viewport"
          aria-label={label}
          data-position={position}
          style={customProperties({ '--mullion-overlay-layer': zIndex ?? uiLayer('notification') })}
        >
          <NotificationList closeButtonLabel={closeButtonLabel} />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
