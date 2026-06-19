/**
 * GridBackdrop — subtle blueprint grid used as a page background.
 *
 * Theme-aware via the --grid-line CSS variable (dark lines on light bg,
 * light lines on dark bg), so it reads in both themes. Renders as an
 * absolute layer; the parent must be `relative` and content should sit
 * in a `relative z-10` layer above it.
 */
import { cn } from '@/lib/utils';

export function GridBackdrop({
  className,
  /** Grid cell size in px. */
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 z-0', className)}
      style={{
        backgroundImage:
          'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
