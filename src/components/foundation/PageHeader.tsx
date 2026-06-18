import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** H1 — keep under 60 chars. */
  title: string;
  /** Short context line under the title. Optional. */
  description?: string;
  /** Right-side icon block (lucide icon wrapped in a gradient pill). Optional. */
  icon?: ReactNode;
  /** Buttons / dropdowns aligned to the right of the title row. */
  actions?: ReactNode;
  /** Filter row rendered below the title. Use the project's filter primitives. */
  filters?: ReactNode;
  /** Override animation delay if this header is part of a staggered list. */
  delay?: number;
  className?: string;
}

/**
 * Page-level header. Replaces the ad-hoc h1 + p + button row each page
 * was reinventing. Use exactly one per route.
 *
 * Layout: icon | title+description | actions
 *         filters row spans full width below.
 *
 * Mobile: title and actions stack vertically (sm: layout = row).
 */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  filters,
  delay = 0,
  className,
}: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn('space-y-4', className)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {icon && <div className="shrink-0">{icon}</div>}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {filters && (
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      )}
    </motion.div>
  );
}
