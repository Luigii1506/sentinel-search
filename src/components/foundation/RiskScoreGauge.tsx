/**
 * Risk score visualization — Sentinel's most regulator-facing pixel.
 *
 * Compliance research (ComplyAdvantage Mesh, ComplyCube, Sayari, NN/g)
 * converged on three rules every score visualization must satisfy:
 *
 *   1. The level (critical/high/medium/low) must be readable in <1s.
 *      → traffic-light color + distinctive icon + label.
 *   2. The score must be EXPLAINABLE — "easily visible methodologies"
 *      (ComplyAdvantage) so an auditor can defend the decision.
 *      → optional breakdown panel listing the factors that contributed.
 *   3. WCAG 1.4.1: color must never be the only signal.
 *      → triple redundancy delegated to <RiskBadge>.
 *
 * Render variants:
 *   - "compact" (default): 88px radial dial + level pill, slot in a card.
 *   - "hero":              160px dial + breakdown rendered side-by-side.
 *                          Use on EntityProfilePage header.
 *
 * Pure SVG; no chart dependency. Animates the arc stroke on mount.
 */
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RiskBadge, levelFromScore, type RiskLevel } from './RiskBadge';

export interface RiskFactor {
  label: string;
  /** Weight 0–100. Renders as a horizontal bar so factors are visually
   *  comparable. Negative values render as a green bar (mitigations). */
  weight: number;
  /** Optional helper text that appears under the label. Keep ≤ 80 chars. */
  detail?: string;
}

interface RiskScoreGaugeProps {
  /** 0–100. null/undefined renders the "unknown" state. */
  score: number | null | undefined;
  /** Override the level if the backend already computed it
   *  (avoids client/server drift on edge cases). */
  level?: RiskLevel;
  /** Compact = inline dial; hero = large dial + breakdown rendered side-by-side. */
  variant?: 'compact' | 'hero';
  /** Optional methodology breakdown. Render with variant="hero" for the
   *  best layout, but supported on compact too (appears below). */
  factors?: RiskFactor[];
  /** Optional citation / source line under the score. */
  caption?: string;
  className?: string;
}

const LEVEL_COLOR: Record<RiskLevel, { stroke: string; glow: string }> = {
  critical: { stroke: '#EF4444', glow: 'rgba(239, 68, 68, 0.35)' },
  high:     { stroke: '#F97316', glow: 'rgba(249, 115, 22, 0.30)' },
  medium:   { stroke: '#EAB308', glow: 'rgba(234, 179, 8, 0.25)' },
  low:      { stroke: '#22C55E', glow: 'rgba(34, 197, 94, 0.20)' },
  unknown:  { stroke: '#3F6594', glow: 'rgba(63, 101, 148, 0.15)' },
};

function Dial({
  score,
  level,
  size,
}: {
  score: number | null | undefined;
  level: RiskLevel;
  size: number;
}) {
  // Geometry — a 3/4 ring (270°) reading left-to-right top.
  const stroke = size * 0.1;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75; // 270° sweep
  const safeScore = score ?? 0;
  const pct = Math.max(0, Math.min(100, safeScore)) / 100;
  const filled = arcLength * pct;
  const color = LEVEL_COLOR[level];

  return (
    <div
      className="relative"
      style={{ width: size, height: size, filter: `drop-shadow(0 0 12px ${color.glow})` }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(31, 111, 235, 0.15)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Filled arc */}
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`0 ${circumference}`}
          animate={{ strokeDasharray: `${filled} ${circumference}` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          transform={`rotate(135 ${cx} ${cy})`}
        />
      </svg>
      {/* Numeric centerpiece */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-semibold text-foreground tabular-nums" style={{ fontSize: size * 0.32 }}>
          {score === null || score === undefined ? '—' : Math.round(safeScore)}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          / 100
        </div>
      </div>
    </div>
  );
}

function FactorBar({ factor }: { factor: RiskFactor }) {
  const isMitigation = factor.weight < 0;
  const magnitude = Math.min(100, Math.abs(factor.weight));
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground font-medium truncate">{factor.label}</span>
        <span
          className={cn(
            'tabular-nums shrink-0 text-[11px]',
            isMitigation ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground',
          )}
        >
          {isMitigation ? '−' : '+'}
          {magnitude.toFixed(0)}
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${magnitude}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full',
            isMitigation ? 'bg-green-500' : 'bg-brand-electric',
          )}
        />
      </div>
      {factor.detail && (
        <p className="text-[11px] text-muted-foreground leading-snug">{factor.detail}</p>
      )}
    </div>
  );
}

export function RiskScoreGauge({
  score,
  level,
  variant = 'compact',
  factors,
  caption,
  className,
}: RiskScoreGaugeProps) {
  const resolvedLevel = level ?? levelFromScore(score);
  const size = variant === 'hero' ? 160 : 88;

  return (
    <div
      role="status"
      aria-label={`Risk score: ${score ?? 'unknown'} out of 100`}
      className={cn(
        'flex gap-5',
        variant === 'hero' ? 'flex-col md:flex-row md:items-start' : 'flex-col items-center',
        className,
      )}
    >
      {/* Dial + level pill */}
      <div className="flex flex-col items-center gap-2 shrink-0">
        <Dial score={score} level={resolvedLevel} size={size} />
        <RiskBadge level={resolvedLevel} size={variant === 'hero' ? 'md' : 'sm'} />
        {caption && (
          <div className="text-[10px] text-muted-foreground text-center max-w-[200px]">
            {caption}
          </div>
        )}
      </div>

      {/* Factor breakdown */}
      {factors && factors.length > 0 && (
        <div className="flex-1 min-w-0 space-y-3 max-w-md">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Factores de riesgo
          </div>
          <div className="space-y-3">
            {factors.map((f, i) => (
              <FactorBar key={`${f.label}-${i}`} factor={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
