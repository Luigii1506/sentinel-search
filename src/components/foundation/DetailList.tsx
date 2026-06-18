/**
 * DetailList — semantic key-value display, the dl/dt/dd of our design
 * system.
 *
 *   <DetailList>
 *     <DetailRow label="ID interno" value={entity.id} copyable mono />
 *     <DetailRow label="País" value={entity.country} />
 *     <DetailRow label="Fecha de nacimiento" value={entity.birth_date}>
 *       <RiskBadge level="medium" size="sm" />
 *     </DetailRow>
 *     <DetailRow label="Notas" value={notes} wrap />
 *   </DetailList>
 *
 * Today EntityProfilePage and CaseDetailPage each have ~30 lines of
 * inline `<div className="flex justify-between"><span>…</span>…</div>`
 * to render the same thing. This is one of those atoms where the
 * payoff isn't reuse — it's *correctness*: the moment we want to add
 * a copy button to "internal ID" everywhere, it's a one-line change
 * (`copyable`) instead of grepping the codebase.
 *
 * Layout:
 *   - 2-col grid on md+ (label | value) with tabular alignment
 *   - stacked on mobile (label above value, both full-width)
 *
 * Semantics:
 *   - <dl>/<dt>/<dd> so screen readers announce the term-definition
 *     relationship. Visual styling lives in className, not in the tag.
 */
import { useState, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailListProps {
  children: ReactNode;
  /** Tighter rows for dense panels (e.g., a tooltip-sized popover). */
  dense?: boolean;
  className?: string;
}

export function DetailList({ children, dense, className }: DetailListProps) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 md:grid-cols-[max-content_1fr] gap-x-6',
        dense ? 'gap-y-1.5' : 'gap-y-3',
        className,
      )}
    >
      {children}
    </dl>
  );
}

interface DetailRowProps {
  label: string;
  /** Primitive value rendered inside <dd>. For composite content (badges,
   *  links, a list of chips) pass via `children` instead and leave
   *  `value` undefined. */
  value?: string | number | null | undefined;
  /** Optional content rendered AFTER `value` in the same <dd>. Useful
   *  for badges or supplementary chips. If you have no `value` at all,
   *  pass the whole composition here. */
  children?: ReactNode;
  /** Show a copy-to-clipboard icon next to the value. Only takes effect
   *  when `value` is a non-empty string. */
  copyable?: boolean;
  /** Render value in a monospace font — IDs, hashes, codes. */
  mono?: boolean;
  /** Allow the value to wrap across multiple lines. Default is truncate
   *  + tooltip, which is right for IDs and bad for notes. */
  wrap?: boolean;
  /** Placeholder rendered in italic gray when value is null/undefined/''. */
  emptyText?: string;
  className?: string;
}

export function DetailRow({
  label,
  value,
  children,
  copyable,
  mono,
  wrap,
  emptyText = '—',
  className,
}: DetailRowProps) {
  const isEmpty = value === null || value === undefined || value === '';
  return (
    <>
      <dt className={cn('text-xs uppercase tracking-wider text-muted-foreground self-start md:pt-0.5', className)}>
        {label}
      </dt>
      <dd className={cn('text-sm text-foreground flex items-center gap-2 min-w-0', wrap ? 'flex-wrap' : '')}>
        {isEmpty ? (
          <span className="italic text-muted-foreground">{emptyText}</span>
        ) : (
          <span
            className={cn(
              'min-w-0',
              !wrap && 'truncate',
              mono && 'font-mono text-[13px]',
            )}
            // Show the full value on hover when it's truncated — the only
            // affordance we have to indicate that a clipped string has more.
            title={!wrap && typeof value === 'string' ? value : undefined}
          >
            {value}
          </span>
        )}
        {copyable && typeof value === 'string' && value && <CopyButton value={value} />}
        {children}
      </dd>
    </>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Reset to the copy icon after a beat so the user knows future
      // clicks will copy again. 1.2s reads as "I saw your click" without
      // looking stuck.
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API can throw on insecure origins or unfocused docs.
      // Silently no-op — the value is still selectable.
    }
  };
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? 'Copiado' : 'Copiar al portapapeles'}
      className="shrink-0 text-muted-foreground hover:text-electric-300 transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
