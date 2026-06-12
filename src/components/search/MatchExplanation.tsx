/**
 * MatchExplanation — muestra el "WHY" detrás de un match.
 *
 * Lista de razones que el backend computó (sancionado, PEP, network risk, etc.),
 * cada una con icono apropiado. Defensible para auditoría.
 */
import { cn } from '@/lib/utils';

interface MatchExplanationProps {
  reasons: string[];
  riskScore?: number | null;
  networkRisk?: number | null;
  className?: string;
}

export function MatchExplanation({
  reasons,
  riskScore,
  networkRisk,
  className,
}: MatchExplanationProps) {
  if (!reasons || reasons.length === 0) return null;

  return (
    <div className={cn('mt-2 space-y-1', className)}>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
        Razones del match
      </p>
      <ul className="space-y-0.5">
        {reasons.map((r, i) => (
          <li key={i} className="text-xs text-gray-300 leading-relaxed">
            {r}
          </li>
        ))}
        {networkRisk != null && networkRisk > 0 && (
          <li className="text-xs text-gray-500">
            Network risk score: <span className="font-mono">{(networkRisk * 100).toFixed(0)}%</span>
          </li>
        )}
        {riskScore != null && (
          <li className="text-xs text-gray-500">
            Risk score total: <span className="font-mono">{riskScore.toFixed(0)}/100</span>
          </li>
        )}
      </ul>
    </div>
  );
}

export default MatchExplanation;
