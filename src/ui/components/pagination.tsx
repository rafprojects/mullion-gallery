/**
 * Pagination (P80-B), one of the two components Base UI does not ship.
 *
 * It is ours in full, and it is cheap: a list of buttons and the arithmetic
 * that decides which page numbers to show. There is no ARIA state machine to
 * get wrong, which is why P78-B priced this gap as the small one. What it does
 * need is the part libraries usually miss: a `nav` with a name, a current page
 * marked with `aria-current`, and every control named for a screen reader that
 * reads "button 3" with no context.
 *
 * Each button is its own tab stop. The Authoring Practices treat pagination as
 * a set of links rather than a composite widget, so roving focus would be
 * wrong here in the way it is right for a tab bar.
 */

import { cx, focusable } from './element';
import type { FieldStyleProps } from './field';
import type { UiScaleStep } from './scale';
import { useUiLabels } from '../provider/hooks';
import { formatUiLabel } from '../provider/labels';

/** A gap in the run of page numbers. */
const DOTS = 'dots';

export interface PaginationProps extends FieldStyleProps {
  /** The current page, counting from 1, as the three call sites hold it. */
  value: number;
  onChange: (page: number) => void;
  /** How many pages there are. */
  total: number;
  /** Page numbers either side of the current one. */
  siblings?: number | undefined;
  /** Page numbers pinned at each end. */
  boundaries?: number | undefined;
  size?: UiScaleStep | undefined;
  disabled?: boolean | undefined;
  /**
   * Names the navigation region, so the landmark is never anonymous. This
   * and the three below default to the provider's `labels`.
   */
  'aria-label'?: string | undefined;
  previousLabel?: string | undefined;
  nextLabel?: string | undefined;
  /** Names a page button. `{page}` is replaced by the number. */
  pageLabel?: string | undefined;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(end - start + 1, 0) }, (_, i) => start + i);
}

/**
 * Which page numbers to show.
 *
 * Exported because it is the only part with a decision in it, and a run of
 * numbers with a gap in the wrong place is the classic defect here: the range
 * has to stay a constant width as the current page moves, or the control
 * reflows under the pointer between clicks.
 */
export function paginationRange(
  current: number,
  total: number,
  siblings = 1,
  boundaries = 1,
): Array<number | typeof DOTS> {
  const shown = siblings * 2 + 3 + boundaries * 2;
  if (shown >= total) return range(1, total);

  const left = Math.max(current - siblings, boundaries + 2);
  const right = Math.min(current + siblings, total - boundaries - 1);
  const showLeftDots = left > boundaries + 2;
  const showRightDots = right < total - boundaries - 1;

  if (!showLeftDots && showRightDots) {
    return [...range(1, siblings * 2 + boundaries + 2), DOTS, ...range(total - boundaries + 1, total)];
  }
  if (showLeftDots && !showRightDots) {
    return [...range(1, boundaries), DOTS, ...range(total - (siblings * 2 + boundaries + 1), total)];
  }
  return [
    ...range(1, boundaries),
    DOTS,
    ...range(left, right),
    DOTS,
    ...range(total - boundaries + 1, total),
  ];
}

/** A chevron, mirrored by the sheet for the previous control. */
function Chevron() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        d="M6 3.5 L10.5 8 L6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Move between pages of a list. */
export function Pagination({
  value,
  onChange,
  total,
  siblings,
  boundaries,
  size = 'sm',
  disabled,
  className,
  style,
  'aria-label': ariaLabel,
  previousLabel,
  nextLabel,
  pageLabel,
  ...rest
}: PaginationProps) {
  const labels = useUiLabels();
  const pages = paginationRange(value, total, siblings, boundaries);
  const go = (page: number) => {
    const next = Math.min(Math.max(page, 1), total);
    if (next !== value) onChange(next);
  };

  return (
    <nav
      className={cx('mullion-pagination', className)}
      data-size={size}
      aria-label={ariaLabel ?? labels.pagination}
      {...(style ? { style } : {})}
      {...rest}
    >
      <button
        type="button"
        className="mullion-pagination-control mullion-pagination-prev"
        aria-label={previousLabel ?? labels.previousPage}
        disabled={disabled || value <= 1}
        onClick={() => go(value - 1)}
        {...focusable}
      >
        <Chevron />
      </button>
      {pages.map((page, index) =>
        page === DOTS ? (
          // Not a button and not announced: it is a gap in a run of numbers,
          // and a screen reader reading "ellipsis" between pages says nothing.
          <span key={`dots-${index}`} className="mullion-pagination-dots" aria-hidden>
            &hellip;
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className="mullion-pagination-control"
            aria-label={formatUiLabel(pageLabel ?? labels.page, { page })}
            {...(page === value ? { 'aria-current': 'page', 'data-active': '' } : {})}
            disabled={disabled}
            onClick={() => go(page)}
            {...focusable}
          >
            {page}
          </button>
        ),
      )}
      <button
        type="button"
        className="mullion-pagination-control mullion-pagination-next"
        aria-label={nextLabel ?? labels.nextPage}
        disabled={disabled || value >= total}
        onClick={() => go(value + 1)}
        {...focusable}
      >
        <Chevron />
      </button>
    </nav>
  );
}
