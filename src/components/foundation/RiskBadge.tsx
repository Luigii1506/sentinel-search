import { AlertOctagon, AlertTriangle, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

/**
 * Per-level visual + a11y mapping.
 *
 * WCAG 2.2 §1.4.1 (Use of Color) forbids using color as the ONLY
 * indicator of state. Every variant ships:
 *   - color (background + text)
 *   - distinctive icon (AlertOctagon ≠ AlertCircle visually)
 *   - text label (the level name itself)
 *
 * This is the triple-redundancy pattern from Carbon Design System's
 * status-indicator pattern. Safe for color-blind users, screen readers,
 * and printed PDFs.
 */
const VARIANTS: Record<
  RiskLevel,
  { label: string; icon: LucideIcon; color: string; ring: string }
> = {
  critical: {
    label: 'Crítico',
    icon: AlertOctagon,
    color: 'bg-red-500/15 text-red-200 border-red-500/40',
    ring: 'ring-red-500/30',
  },
  high: {
    label: 'Alto',
    icon: AlertTriangle,
    color: 'bg-orange-500/15 text-orange-200 border-orange-500/40',
    ring: 'ring-orange-500/30',
  },
  medium: {
    label: 'Medio',
    icon: AlertCircle,
    color: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
    ring: 'ring-amber-500/30',
  },
  low: {
    label: 'Bajo',
    icon: CheckCircle2,
    color: 'bg-green-500/15 text-green-200 border-green-500/40',
    ring: 'ring-green-500/30',
  },
  unknown: {
    label: 'Sin clasificar',
    icon: HelpCircle,
    color: 'bg-navy-600 text-navy-100 border-navy-500',
    ring: 'ring-navy-500/30',
  },
};

interface RiskBadgeProps {
  level: RiskLevel;
  /** Override the default label ("Crítico", "Alto"…). Useful when you
   *  want to show "Riesgo alto" or a numeric score next to the label. */
  label?: string;
  /** sm = compact pill for table rows; md = inline badge; lg = card-prominent */
  size?: 'sm' | 'md' | 'lg';
  /** Show the icon (default true). Disable only when stacking many
   *  badges in tight space. */
  showIcon?: boolean;
  /** Render with a soft ring shadow to make the focus state stand out
   *  on a dense list. */
  withRing?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
} as const;

const ICON_SIZE = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
} as const;

export function RiskBadge({
  level,
  label,
  size = 'md',
  showIcon = true,
  withRing = false,
  className,
}: RiskBadgeProps) {
  const v = VARIANTS[level];
  const Icon = v.icon;
  const text = label ?? v.label;
  return (
    <span
      role="status"
      aria-label={`Riesgo: ${text}`}
      className={cn(
        'inline-flex items-center font-medium rounded-md border whitespace-nowrap',
        v.color,
        SIZE_CLASSES[size],
        withRing && `ring-1 ${v.ring}`,
        className,
      )}
    >
      {showIcon && <Icon className={ICON_SIZE[size]} aria-hidden="true" />}
      {text}
    </span>
  );
}

/**
 * Helper to coerce a numeric risk score (0–100) into a RiskLevel.
 * Thresholds match backend RiskLevel.from_score in app/core/enums.py
 * so the frontend never disagrees with the backend's classification.
 */
export function levelFromScore(score: number | null | undefined): RiskLevel {
  if (score === null || score === undefined) return 'unknown';
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}
