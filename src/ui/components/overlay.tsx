/**
 * The overlays (P80-A): `Modal`, `Drawer`, `Popover`, `Tooltip` and `Menu`.
 *
 * These are the first framework components with interaction behaviour, and
 * none of that behaviour is ours. Base UI (P78-B) owns the focus trap, the
 * scroll lock, the dismissal rules, the roving focus in a menu and the
 * anchor positioning; this module supplies the portal container, the class
 * names, the focus attribute and the token-reading sheet, and nothing else.
 * That limit is the study's principle 6: the moment a wrapper starts writing
 * its own focus trap it inherits the class of defect this codebase has
 * already shipped twice.
 *
 * The one rule that makes these correct where Mantine's are not: every
 * overlay portals into `useMullionPortal()`, the container the nearest
 * provider created and painted with its own tokens (P79-A). A popup is
 * therefore inside an element carrying the tokens it reads, whatever tree the
 * trigger lives in, so nothing has to be mirrored inline across the boundary
 * the way `adminChromeStyles()` does today.
 */

import { Dialog } from '@base-ui/react/dialog';
import { Popover as BasePopover } from '@base-ui/react/popover';
import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { Separator as BaseSeparator } from '@base-ui/react/separator';
import type { ReactElement, ReactNode } from 'react';
import { cx, focusableInset, type UiElementProps } from './element';
import { CloseButton } from './control';
import { customProperties, radiusValue, spacingValue, type UiRadius, type UiSpacing } from './scale';
import { uiLayer, type UiLayer } from '../styles/layers';
import { useMullionPortal } from '../provider/hooks';

/**
 * `className` and `style`, without the polymorphic `render`.
 *
 * Our `UiRender` (P79-C) allows a function whose `style` may carry
 * `--mullion-*` custom properties; Base UI's `render` types that argument as
 * a plain `CSSProperties`, so the function forms are not interchangeable.
 * The overlays forward `render` straight to the primitive rather than through
 * `renderElement`, so they take the element form, which both accept and which
 * is what composition actually uses: `render={<Button />}`.
 */
type OverlayStyleProps = Omit<UiElementProps, 'render'>;

/** The side of the anchor a positioned overlay sits on. */
export type UiSide = 'top' | 'bottom' | 'left' | 'right';
/** Alignment along that side. */
export type UiAlign = 'start' | 'center' | 'end';
/** Which edge a drawer slides in from. */
export type UiDrawerSide = 'left' | 'right' | 'top' | 'bottom';

/**
 * Where an overlay portals to. Callers pass nothing; the provider's container
 * is the answer in every shipped case. The prop exists for the test harness
 * and for a host that has to place a popup somewhere specific, and it is the
 * only way any of these components can leave the provider's tokens behind.
 */
interface PortalProps {
  container?: HTMLElement | null | undefined;
}

/**
 * Resolve the container once per overlay. `useMullionPortal` throws outside a
 * provider, which is the right failure: an overlay with no token-carrying
 * container paints unthemed, and doing that silently is the defect this whole
 * phase exists to remove.
 */
function usePortalContainer(override: HTMLElement | null | undefined): HTMLElement | null {
  const provided = useMullionPortal();
  return override !== undefined ? override : provided;
}

/**
 * The z-index for a step, as an inline custom property the sheet reads. Chrome
 * never writes a literal (P79-C): the token is
 * `calc(var(--mullion-layer-host-offset, 0) + N)`, so the WordPress admin bar
 * can push every overlay down by raising one variable.
 */
function layerStyle(step: UiLayer, zIndex: string | number | undefined) {
  return customProperties({ '--mullion-overlay-layer': zIndex ?? uiLayer(step) });
}

// ---------------------------------------------------------------------------
// Modal and Drawer
// ---------------------------------------------------------------------------

interface DialogCommonProps extends OverlayStyleProps, PortalProps {
  /** Controlled open state. Named as the 26 Mantine call sites spell it. */
  opened: boolean;
  onClose: () => void;
  title?: ReactNode | undefined;
  /** Rendered instead of a visible title, for a dialog whose heading is graphical. */
  'aria-label'?: string | undefined;
  padding?: UiSpacing | undefined;
  radius?: UiRadius | undefined;
  withCloseButton?: boolean | undefined;
  closeButtonLabel?: string | undefined;
  closeOnEscape?: boolean | undefined;
  closeOnClickOutside?: boolean | undefined;
/**
   * Base UI's three modes, passed through rather than remapped.
   *
   * `true` (the default) traps focus, locks scroll and hides the rest of the
   * page from assistive technology. `'trap-focus'` keeps the focus trap and
   * the `aria-hidden`, but leaves outside pointer interaction and page scroll
   * alone. `false` does none of it, so the page stays fully reachable and the
   * dialog can be tabbed out of; that is a deliberate choice a caller has to
   * make, not a default. An earlier draft mapped `false` onto `'trap-focus'`
   * and documented it as "leaves the page interactive", which was wrong in
   * the way that matters: `'trap-focus'` still hides the page from a screen
   * reader.
   */
  modal?: boolean | 'trap-focus' | undefined;
  /**
   * Pixels of backdrop blur. The Settings drawer and the gallery config
   * editor both drive this from a saved user setting, so it is a prop rather
   * than a constant. The scrim's colour and opacity are the `overlay-bg`
   * token and are the theme's.
   */
  overlayBlur?: number | undefined;
  zIndex?: string | number | undefined;
  children?: ReactNode;
}

export interface ModalProps extends DialogCommonProps {
  /** A scale step, a number of pixels, or any CSS length. */
  size?: UiSpacing | undefined;
  centered?: boolean | undefined;
  fullScreen?: boolean | undefined;
}

/**
 * The shared body of both dialogs. Modal and Drawer differ by their class and
 * their sizing custom property, so the parts, the dismissal wiring and the
 * heading composition are written once.
 */
function DialogShell({
  opened,
  onClose,
  title,
  padding,
  radius,
  withCloseButton = true,
  closeButtonLabel,
  closeOnEscape = true,
  closeOnClickOutside = true,
  modal = true,
  overlayBlur,
  zIndex,
  container,
  className,
  style,
  children,
  popupClassName,
  layer,
  sizeVars,
  dataAttrs,
  ...rest
}: DialogCommonProps & {
  popupClassName: string;
  layer: UiLayer;
  sizeVars: Record<string, string | number | undefined>;
  dataAttrs?: Record<string, string | boolean | undefined>;
}) {
  const target = usePortalContainer(container);
  const vars = customProperties({
    ...sizeVars,
    '--mullion-pad': spacingValue(padding),
    '--mullion-radius': radiusValue(radius),
  });

  return (
    <Dialog.Root
      open={opened}
      onOpenChange={(next, details) => {
        if (next) return;
        if (!closeOnEscape && details.reason === 'escape-key') return;
        if (!closeOnClickOutside && details.reason === 'outside-press') return;
        onClose();
      }}
      modal={modal}
    >
      <Dialog.Portal container={target}>
        <Dialog.Backdrop
          className="mullion-overlay-backdrop"
          style={{
            ...layerStyle(layer, zIndex),
            ...customProperties({
              '--mullion-overlay-blur': overlayBlur !== undefined ? `${overlayBlur}px` : undefined,
            }),
          }}
        />
        <Dialog.Popup
          className={cx('mullion-overlay-popup', popupClassName, className)}
          style={{ ...layerStyle(layer, zIndex), ...vars, ...style }}
          {...dataAttrs}
          {...rest}
        >
          {(title !== undefined || withCloseButton) && (
            <header className="mullion-overlay-header">
              {title !== undefined ? (
                <Dialog.Title className="mullion-overlay-title">{title}</Dialog.Title>
              ) : (
                <span />
              )}
              {withCloseButton && (
                <Dialog.Close
                  render={
                    <CloseButton
                      variant="subtle"
                      {...(closeButtonLabel !== undefined ? { 'aria-label': closeButtonLabel } : {})}
                    />
                  }
                />
              )}
            </header>
          )}
          <div className="mullion-overlay-body">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * A centred dialog. Focus is trapped, Escape and an outside press dismiss it,
 * and focus returns to the trigger on close even when the trigger is inside
 * the gallery shadow root, which is the defect the product has today.
 */
export function Modal({ size, centered = true, fullScreen, ...rest }: ModalProps) {
  return (
    <DialogShell
      popupClassName="mullion-modal"
      layer="modal"
      sizeVars={{ '--mullion-modal-size': spacingValue(size) }}
      dataAttrs={{
        ...(centered ? { 'data-centered': true } : {}),
        ...(fullScreen ? { 'data-full-screen': true } : {}),
      }}
      {...rest}
    />
  );
}

export interface DrawerProps extends DialogCommonProps {
  /** Which edge the panel slides in from. */
  position?: UiDrawerSide | undefined;
  /** The panel's thickness along its sliding axis. */
  size?: UiSpacing | undefined;
}

/**
 * A panel anchored to one edge. It is Base UI's `Dialog` with a different
 * resting position rather than its `Drawer`, which is a swipe-dismissible
 * mobile sheet: the bake-off measured this shape (P78-B) and the product's
 * two drawers are settings panels, not sheets.
 */
export function Drawer({ position = 'right', size, ...rest }: DrawerProps) {
  return (
    <DialogShell
      popupClassName="mullion-drawer"
      layer="modal"
      sizeVars={{ '--mullion-drawer-size': spacingValue(size) }}
      dataAttrs={{ 'data-position': position }}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

export interface TooltipProps extends OverlayStyleProps, PortalProps {
  /** The tooltip text. Every one of the 115 call sites passes this. */
  label: ReactNode;
  children: ReactNode;
  side?: UiSide | undefined;
  align?: UiAlign | undefined;
  offset?: number | undefined;
  openDelay?: number | undefined;
  closeDelay?: number | undefined;
  disabled?: boolean | undefined;
  zIndex?: string | number | undefined;
}

/**
 * A hover and focus label on its child.
 *
 * Base UI 1.8.0 puts `delay` on `TooltipProvider` and not on the root, so a
 * per-tooltip delay means a provider per tooltip. That is a context value and
 * nothing more, and it keeps `openDelay` meaning what it means at the 16 call
 * sites that set one. `Tooltip.Group` is the shared-delay form for a toolbar
 * where the second tooltip should appear instantly.
 */
export function Tooltip({
  label,
  children,
  side = 'top',
  align = 'center',
  offset = 6,
  openDelay,
  closeDelay,
  disabled,
  container,
  zIndex,
  className,
  style,
  ...rest
}: TooltipProps) {
  const target = usePortalContainer(container);

  const body = (
    <BaseTooltip.Root {...(disabled ? { disabled: true } : {})}>
        {/*
          * A span, not a button: the 115 call sites wrap a control that is
          * already focusable, and a button around a button is invalid. Base UI
          * adds no `type` or `tabindex` to a tooltip trigger it is told to
          * render as a span, and focus events from the real control inside it
          * bubble to this element, so a keyboard focus still opens the tooltip.
          */}
        <BaseTooltip.Trigger render={<span className="mullion-tooltip-trigger" />}>
          {children}
        </BaseTooltip.Trigger>
        <BaseTooltip.Portal container={target}>
          <BaseTooltip.Positioner
            className="mullion-overlay-positioner"
            side={side}
            align={align}
            sideOffset={offset}
            style={layerStyle('tooltip', zIndex)}
          >
            <BaseTooltip.Popup className={cx('mullion-tooltip', className)} style={style} {...rest}>
              {label}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );

  /*
   * Only wrap when this tooltip sets a delay of its own. Wrapping every
   * tooltip in a provider would silently override an ancestor `Tooltip.Group`,
   * which is the only reason that component exists: a provider with no `delay`
   * resets to Base UI's default rather than inheriting the group's.
   */
  if (openDelay === undefined && closeDelay === undefined) return body;
  return (
    <BaseTooltip.Provider
      {...(openDelay !== undefined ? { delay: openDelay } : {})}
      {...(closeDelay !== undefined ? { closeDelay } : {})}
    >
      {body}
    </BaseTooltip.Provider>
  );
}

export interface TooltipGroupProps {
  children?: ReactNode;
  delay?: number | undefined;
  closeDelay?: number | undefined;
}

/** A shared delay for a run of tooltips: once one has opened, its neighbours open instantly. */
function TooltipGroup({ children, delay, closeDelay }: TooltipGroupProps) {
  return (
    <BaseTooltip.Provider
      {...(delay !== undefined ? { delay } : {})}
      {...(closeDelay !== undefined ? { closeDelay } : {})}
    >
      {children}
    </BaseTooltip.Provider>
  );
}

Tooltip.Group = TooltipGroup;

// ---------------------------------------------------------------------------
// Popover
// ---------------------------------------------------------------------------

export interface PopoverProps extends PortalProps {
  children?: ReactNode;
  opened?: boolean | undefined;
  defaultOpened?: boolean | undefined;
  onChange?: ((opened: boolean) => void) | undefined;
  /** `true` locks scroll and makes the page inert, as a dialog does. */
  modal?: boolean | undefined;
}

export interface PopoverContentProps extends OverlayStyleProps, PortalProps {
  render?: ReactElement | undefined;
  children?: ReactNode;
  side?: UiSide | undefined;
  align?: UiAlign | undefined;
  offset?: number | undefined;
  /** The dropdown's width: a scale step, pixels, or any CSS length. */
  width?: UiSpacing | undefined;
  padding?: UiSpacing | undefined;
  radius?: UiRadius | undefined;
  zIndex?: string | number | undefined;
}

/**
 * An anchored panel. Compound because both call-site shapes in the product
 * already are: a trigger and a dropdown that have to be addressed separately.
 * The parts take our names rather than Mantine's, per the boundary's rule
 * that a vendor's vocabulary does not become the framework's.
 */
export function Popover({ children, opened, defaultOpened, onChange, modal }: PopoverProps) {
  return (
    <BasePopover.Root
      {...(opened !== undefined ? { open: opened } : {})}
      {...(defaultOpened !== undefined ? { defaultOpen: defaultOpened } : {})}
      {...(onChange ? { onOpenChange: (next: boolean) => onChange(next) } : {})}
      {...(modal !== undefined ? { modal } : {})}
    >
      {children}
    </BasePopover.Root>
  );
}

/**
 * The element the panel anchors to.
 *
 * With no `render` this is a native `<button>`, which is Base UI's default and
 * the only form that is announced as a button without extra ARIA. An earlier
 * draft rendered a `<span>` here and Base UI, still assuming a native button,
 * stamped `type="button"` on it with no `role`: invalid markup and an
 * unannounced control. Compose with `render={<Button />}` instead.
 */
function PopoverTrigger({ children, render }: { children?: ReactNode; render?: ReactElement | undefined }) {
  return (
    <BasePopover.Trigger className="mullion-popover-trigger" {...(render ? { render } : {})}>
      {children}
    </BasePopover.Trigger>
  );
}

function PopoverContent({
  children,
  side = 'bottom',
  align = 'center',
  offset = 6,
  width,
  padding,
  radius,
  container,
  zIndex,
  className,
  style,
  render,
  ...rest
}: PopoverContentProps) {
  const target = usePortalContainer(container);
  const vars = customProperties({
    '--mullion-popover-width': spacingValue(width),
    '--mullion-pad': spacingValue(padding),
    '--mullion-radius': radiusValue(radius),
  });

  return (
    <BasePopover.Portal container={target}>
      <BasePopover.Positioner
        className="mullion-overlay-positioner"
        side={side}
        align={align}
        sideOffset={offset}
        style={layerStyle('popover', zIndex)}
      >
        <BasePopover.Popup
          className={cx('mullion-popover', className)}
          style={{ ...vars, ...style }}
          {...(render ? { render } : {})}
          {...rest}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

Popover.Trigger = PopoverTrigger;
Popover.Content = PopoverContent;

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export interface MenuProps extends PortalProps {
  children?: ReactNode;
  opened?: boolean | undefined;
  defaultOpened?: boolean | undefined;
  onChange?: ((opened: boolean) => void) | undefined;
  /** Arrow keys wrap from the last item to the first. */
  loop?: boolean | undefined;
  modal?: boolean | undefined;
}

export interface MenuContentProps extends OverlayStyleProps, PortalProps {
  children?: ReactNode;
  side?: UiSide | undefined;
  align?: UiAlign | undefined;
  offset?: number | undefined;
  width?: UiSpacing | undefined;
  radius?: UiRadius | undefined;
  zIndex?: string | number | undefined;
}

export interface MenuItemProps extends OverlayStyleProps {
  render?: ReactElement | undefined;
  children?: ReactNode;
  onClick?: (() => void) | undefined;
  disabled?: boolean | undefined;
  /** Content before the label: an icon, a swatch. */
  leftSection?: ReactNode | undefined;
  /** Content after the label: a shortcut hint, a chevron. */
  rightSection?: ReactNode | undefined;
  /** The tone the item paints, for a destructive action. */
  tone?: 'default' | 'danger' | undefined;
  /** Keep the menu open after a press, for a toggle. */
  closeOnClick?: boolean | undefined;
}

/**
 * A dropdown of commands. Base UI owns the roving focus, the typeahead and the
 * Home and End keys; the sheet owns what `data-highlighted` looks like.
 */
export function Menu({ children, opened, defaultOpened, onChange, loop, modal }: MenuProps) {
  return (
    <BaseMenu.Root
      {...(opened !== undefined ? { open: opened } : {})}
      {...(defaultOpened !== undefined ? { defaultOpen: defaultOpened } : {})}
      {...(onChange ? { onOpenChange: (next: boolean) => onChange(next) } : {})}
      {...(loop !== undefined ? { loopFocus: loop } : {})}
      {...(modal !== undefined ? { modal } : {})}
    >
      {children}
    </BaseMenu.Root>
  );
}

/** The control that opens the menu. A native `<button>` unless `render` says otherwise. */
function MenuTrigger({ children, render }: { children?: ReactNode; render?: ReactElement | undefined }) {
  return (
    <BaseMenu.Trigger className="mullion-menu-trigger" {...(render ? { render } : {})}>
      {children}
    </BaseMenu.Trigger>
  );
}

function MenuContent({
  children,
  side = 'bottom',
  align = 'start',
  offset = 6,
  width,
  radius,
  container,
  zIndex,
  className,
  style,
  ...rest
}: MenuContentProps) {
  const target = usePortalContainer(container);
  const vars = customProperties({
    '--mullion-menu-width': spacingValue(width),
    '--mullion-radius': radiusValue(radius),
  });

  return (
    <BaseMenu.Portal container={target}>
      <BaseMenu.Positioner
        className="mullion-overlay-positioner"
        side={side}
        align={align}
        sideOffset={offset}
        style={layerStyle('dropdown', zIndex)}
      >
        <BaseMenu.Popup
          className={cx('mullion-menu', className)}
          style={{ ...vars, ...style }}
          {...rest}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

/**
 * One command. It carries the focus attribute because Base UI moves real DOM
 * focus through the list, so arrowing to an item is a keyboard focus change
 * and WCAG 2.4.7 asks for an indicator; that is also what the product does
 * today, where `.mantine-focus-auto:focus-visible` reaches every menu item.
 *
 * The INSET variant, because a row is flush with the menu's content edge and
 * the menu is `overflow: auto`: the outset ring reaches 6px and the row has
 * 1px, so 5px of it was cut on each inline edge. A row's ground is `menu-bg`,
 * a neutral, so the inset pair is in bounds (rule 8).
 */
function MenuItem({
  children,
  onClick,
  disabled,
  leftSection,
  rightSection,
  tone,
  closeOnClick,
  className,
  style,
  render,
  ...rest
}: MenuItemProps) {
  return (
    <BaseMenu.Item
      className={cx('mullion-menu-item', className)}
      {...(style ? { style } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...(onClick ? { onClick: () => onClick() } : {})}
      {...(closeOnClick !== undefined ? { closeOnClick } : {})}
      {...(tone ? { 'data-mullion-tone': tone } : {})}
      {...(render ? { render } : {})}
      {...focusableInset}
      {...rest}
    >
      {leftSection !== undefined && <span className="mullion-menu-item-section">{leftSection}</span>}
      <span className="mullion-menu-item-label">{children}</span>
      {rightSection !== undefined && <span className="mullion-menu-item-section">{rightSection}</span>}
    </BaseMenu.Item>
  );
}

/**
 * A non-interactive heading over a run of items.
 *
 * A plain element rather than Base UI's `GroupLabel`, which throws unless it
 * is inside a `Menu.Group`; the four `Menu.Label` call sites in the product
 * are bare headings with no group around them, and a component that throws at
 * its existing call sites is not a migration path. The accessible form, where
 * the heading actually names the items it heads, is `Menu.Group label=...`.
 */
function MenuLabel({ children, className, style, ...rest }: OverlayStyleProps & { children?: ReactNode }) {
  return (
    <div className={cx('mullion-menu-label', className)} {...(style ? { style } : {})} {...rest}>
      {children}
    </div>
  );
}

/**
 * A rule between runs of items. Base UI's menu has no separator part, so this
 * is the standalone `Separator` primitive, which is what carries the
 * `role="separator"` a menu's grouping needs.
 */
function MenuDivider({ className, style, ...rest }: OverlayStyleProps) {
  return (
    <BaseSeparator className={cx('mullion-menu-divider', className)} {...(style ? { style } : {})} {...rest} />
  );
}

export interface MenuGroupProps extends OverlayStyleProps {
  children?: ReactNode;
  /** The heading for this group. Rendered as the group's accessible name. */
  label?: ReactNode | undefined;
}

/**
 * Groups a run of items under one heading, so a screen reader announces the
 * heading as the group's name rather than reading it as a stray line. This is
 * the form that carries the `aria-labelledby` wiring; `Menu.Label` on its own
 * is only a visual heading.
 */
function MenuGroup({ children, label, className, style, ...rest }: MenuGroupProps) {
  return (
    <BaseMenu.Group className={cx('mullion-menu-group', className)} {...(style ? { style } : {})} {...rest}>
      {label !== undefined && (
        <BaseMenu.GroupLabel className="mullion-menu-label">{label}</BaseMenu.GroupLabel>
      )}
      {children}
    </BaseMenu.Group>
  );
}

Menu.Trigger = MenuTrigger;
Menu.Content = MenuContent;
Menu.Item = MenuItem;
Menu.Label = MenuLabel;
Menu.Divider = MenuDivider;
Menu.Group = MenuGroup;
