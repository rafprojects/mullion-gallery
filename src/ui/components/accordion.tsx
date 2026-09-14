/**
 * The accordion (P80-B), 58 items across 15 files and every one of them a
 * settings section.
 *
 * Base UI owns the disclosure behaviour: the header button, the `aria-expanded`
 * and `aria-controls` wiring, and the panel's open and closed heights. This
 * module supplies the composition the call sites already spell (`Item`,
 * `Control`, `Panel`), the chevron, and a sheet that reads tokens.
 *
 * **Each header is its own tab stop, and there is no arrow-key navigation.**
 * That is the current Authoring Practices pattern: roving focus was removed
 * from the accordion in w3c/aria-practices#3434, and Base UI followed, which
 * is why its `orientation` and `loopFocus` props are deprecated no-ops. It is
 * a behavioural change from what the product does today and it is the one the
 * guidance now asks for.
 *
 * `Control` rather than Base UI's `Trigger`, because that is the name 58 call
 * sites use and because the vendor's vocabulary does not become the
 * framework's (P78-A). The header element is still Base UI's, so the heading
 * level and the button semantics are not ours to get wrong.
 */

import type { ReactNode } from 'react';
import { Accordion as BaseAccordion } from '@base-ui/react/accordion';
import { cx, focusable } from './element';
import type { FieldStyleProps } from './field';
import { customProperties, radiusValue, type UiRadius } from './scale';

/** Where the chevron sits relative to the label. */
export type UiChevronPosition = 'left' | 'right';

export interface AccordionProps extends FieldStyleProps {
  children?: ReactNode;
  /** Open items. A string for one, an array for several. */
  value?: string | string[] | null | undefined;
  defaultValue?: string | string[] | null | undefined;
  onChange?: ((value: string[]) => void) | undefined;
  /** More than one item open at a time. Four of the fifteen call sites set it. */
  multiple?: boolean | undefined;
  /**
   * `separated` gives each item its own bordered card, which is what all
   * twelve call sites that set a variant ask for; `contained` stacks them in
   * one. The default is `separated` for that reason.
   */
  variant?: 'separated' | 'contained' | undefined;
  chevronPosition?: UiChevronPosition | undefined;
  radius?: UiRadius | undefined;
  disabled?: boolean | undefined;
}

export interface AccordionItemProps extends FieldStyleProps {
  children?: ReactNode;
  value: string;
  disabled?: boolean | undefined;
}

export interface AccordionControlProps extends FieldStyleProps {
  children?: ReactNode;
  /** Content before the label, after the chevron when the chevron leads. */
  leftSection?: ReactNode | undefined;
  /** Content at the trailing edge: a count, a badge, a reset control. */
  rightSection?: ReactNode | undefined;
  disabled?: boolean | undefined;
}

export interface AccordionPanelProps extends FieldStyleProps {
  children?: ReactNode;
  /** Renders the panel while closed, so a form inside it keeps its state. */
  keepMounted?: boolean | undefined;
}

/** The chevron. `aria-hidden`: the header button already announces its state. */
function ChevronIcon() {
  return (
    <svg className="mullion-accordion-chevron" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M4 6.5 L8 10.5 L12 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A stack of sections, each of which opens. */
export function Accordion({
  children,
  value,
  defaultValue,
  onChange,
  multiple,
  variant = 'separated',
  chevronPosition = 'right',
  radius,
  disabled,
  className,
  style,
  ...rest
}: AccordionProps) {
  return (
    <BaseAccordion.Root
      className={cx('mullion-accordion', className)}
      data-variant={variant}
      data-chevron={chevronPosition}
      style={{ ...customProperties({ '--mullion-radius': radiusValue(radius) }), ...style }}
      {...(value !== undefined && value !== null ? { value: toArray(value) } : {})}
      {...(defaultValue !== undefined && defaultValue !== null ? { defaultValue: toArray(defaultValue) } : {})}
      {...(onChange ? { onValueChange: (next: unknown[]) => onChange(next.map(String)) } : {})}
      {...(multiple !== undefined ? { multiple } : {})}
      {...(disabled ? { disabled: true } : {})}
      {...rest}
    >
      {children}
    </BaseAccordion.Root>
  );
}

/** One value or several, as Base UI wants them. A single string is the common case. */
function toArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

function AccordionItem({ children, value, disabled, className, style, ...rest }: AccordionItemProps) {
  return (
    <BaseAccordion.Item
      value={value}
      className={cx('mullion-accordion-item', className)}
      {...(disabled ? { disabled: true } : {})}
      {...(style ? { style } : {})}
      {...rest}
    >
      {children}
    </BaseAccordion.Item>
  );
}

/**
 * The header and its button, in one part because every call site passes a
 * label and nothing else. The heading element is Base UI's `Header`, so the
 * document outline stays right without a call site choosing a level.
 *
 * The OUTSET ring, unlike a menu row or a tab: a control is the full width of
 * an item that is itself inside a gap, so the 6px the ring reaches is there.
 */
function AccordionControl({
  children,
  leftSection,
  rightSection,
  disabled,
  className,
  style,
  ...rest
}: AccordionControlProps) {
  return (
    <BaseAccordion.Header className="mullion-accordion-header">
      <BaseAccordion.Trigger
        className={cx('mullion-accordion-control', className)}
        {...(disabled ? { disabled: true } : {})}
        {...(style ? { style } : {})}
        {...focusable}
        {...rest}
      >
        <ChevronIcon />
        {leftSection !== undefined && <span className="mullion-accordion-section">{leftSection}</span>}
        <span className="mullion-accordion-label">{children}</span>
        {rightSection !== undefined && <span className="mullion-accordion-section">{rightSection}</span>}
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  );
}

function AccordionPanel({ children, keepMounted, className, style, ...rest }: AccordionPanelProps) {
  return (
    <BaseAccordion.Panel
      className={cx('mullion-accordion-panel', className)}
      {...(keepMounted ? { keepMounted: true } : {})}
      {...(style ? { style } : {})}
      {...rest}
    >
      <div className="mullion-accordion-content">{children}</div>
    </BaseAccordion.Panel>
  );
}

Accordion.Item = AccordionItem;
Accordion.Control = AccordionControl;
Accordion.Panel = AccordionPanel;
