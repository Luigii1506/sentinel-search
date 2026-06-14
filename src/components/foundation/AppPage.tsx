/**
 * AppPage — single, canonical shell for every route under the
 * authenticated sidebar layout.
 *
 * Before this existed, every page hand-rolled its own
 *   `<div className="min-h-screen bg-brand-carbon pt-24 px-4 sm:px-6 lg:px-8 pb-12">`
 * with a different combination of pt-20 vs pt-24, p-4 vs p-6,
 * max-w-5xl vs 6xl vs 7xl, and space-y-3/4/6. The result was a UI that
 * felt subtly off as you navigated — headers sat at different
 * baselines, gutters jumped between routes, and section spacing was
 * inconsistent even within the same page.
 *
 * Using <AppPage>:
 *
 *   export function MyPage() {
 *     return (
 *       <AppPage>
 *         <PageHeader title="…" />
 *         <Section title="KPIs">
 *           <MetricCard … />
 *         </Section>
 *       </AppPage>
 *     );
 *   }
 *
 * The `width` prop controls the container — "default" (7xl) covers
 * 95% of pages; "narrow" (4xl) is for forms; "wide" (full) is for the
 * graph view. Don't reach for raw max-w-* on pages.
 *
 * IMPORTANT: do NOT add `pt-20` / `pt-24` anywhere — the sidebar
 * already reserves its column, and the lg+ layout starts at top:0. The
 * mobile topbar is sticky so it overlays content cleanly; no extra
 * padding needed.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppPageProps {
  children: ReactNode;
  /** Container width. Default is "default" (max-w-7xl), good for
   *  dashboards + tables. "narrow" suits forms / settings. "wide"
   *  drops the constraint entirely (useful for graph views). */
  width?: 'narrow' | 'default' | 'wide';
  /** Override the standard vertical rhythm. Default `space-y-6` —
   *  matches PageHeader + Section spacing. Reduce to `space-y-4`
   *  for dense dashboards. */
  spacing?: 'compact' | 'default' | 'loose';
  /** Inject className on the inner container (rare). */
  className?: string;
}

const WIDTH_CLASS = {
  narrow:  'max-w-4xl',
  default: 'max-w-7xl',
  wide:    'max-w-full',
} as const;

const SPACING_CLASS = {
  compact: 'space-y-4',
  default: 'space-y-6',
  loose:   'space-y-8',
} as const;

export function AppPage({
  children,
  width = 'default',
  spacing = 'default',
  className,
}: AppPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div
        className={cn(
          'mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8',
          WIDTH_CLASS[width],
          SPACING_CLASS[spacing],
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Section — second-level visual grouping inside a page.
 *
 * Use it for everything below <PageHeader>. The title renders at the
 * standardised size + weight so every page reads the same.
 *
 *   <Section title="Recientes" description="Últimas 24h" actions={<Button>…</Button>}>
 *     <DataTable … />
 *   </Section>
 *
 * Skip the section heading by passing `unstyled` if you just want the
 * vertical rhythm primitive.
 */
interface SectionProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  /** Button or other trailing action aligned to the right of the title. */
  actions?: ReactNode;
  /** Skip the title row entirely; useful for ad-hoc grouping. */
  unstyled?: boolean;
  className?: string;
}

export function Section({
  children,
  title,
  description,
  actions,
  unstyled,
  className,
}: SectionProps) {
  if (unstyled) {
    return <section className={cn('space-y-3', className)}>{children}</section>;
  }

  return (
    <section className={cn('space-y-3', className)}>
      {(title || actions) && (
        <header className="flex items-baseline justify-between gap-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-white tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-navy-200 mt-0.5">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
