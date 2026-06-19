/**
 * Right-rail evidence panel — Sayari / ComplyAdvantage Mesh pattern.
 *
 * Why this exists: master-detail layouts in compliance tools (search
 * results, watchlists, case queues) need a way to preview a row
 * without leaving the list. A modal blocks the queue; an inline drawer
 * preserves context. This is the inline drawer.
 *
 * Composition:
 *   <EvidencePanel
 *     open={selectedId !== null}
 *     onClose={() => setSelectedId(null)}
 *     title="Larry Dean Harmon"
 *     subtitle="US_FINCEN_ENFORCEMENT"
 *     actions={<Button>Ver perfil completo</Button>}
 *   >
 *     <RiskScoreGauge ... />
 *     <Section title="Sanciones">…</Section>
 *   </EvidencePanel>
 *
 * Layout:
 *   - md and up:  fixed right-rail 420px, content scrolls vertically.
 *                 Press Esc or click the close button to dismiss.
 *   - below md:   full-screen Sheet from the right (delegates to the
 *                 existing shadcn Sheet primitive).
 *
 * It does NOT trap focus when open on desktop (that would break
 * keyboard nav from the list); on mobile the Sheet primitive handles
 * focus trap correctly.
 */
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface EvidencePanelProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Action buttons rendered at the bottom of the panel.
   *  Most common: "Ver perfil completo" linking to /entity/:id */
  actions?: ReactNode;
  /** Right-rail width on desktop. Default 420px. */
  width?: number;
  children: ReactNode;
  className?: string;
}

export function EvidencePanel({
  open,
  onClose,
  title,
  subtitle,
  actions,
  width = 420,
  children,
  className,
}: EvidencePanelProps) {
  const { t } = useTranslation();
  // Esc to close on desktop. (Sheet handles it on mobile.)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* ───────── Mobile: full-screen Sheet from right ───────── */}
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="md:hidden w-full sm:max-w-md p-0 bg-card border-l border-border"
        >
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-foreground text-base">{title}</SheetTitle>
            {subtitle && (
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            )}
          </SheetHeader>
          <div className="overflow-y-auto p-4 flex-1">{children}</div>
          {actions && (
            <div className="p-4 border-t border-border flex gap-2 justify-end">
              {actions}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ───────── Desktop: persistent right rail ───────── */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="evidence-rail"
            initial={{ x: width, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: width, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            style={{ width }}
            aria-label="Detalle de evidencia"
            className={cn(
              'hidden md:flex fixed top-0 right-0 z-40 h-screen flex-col',
              'bg-card border-l border-border shadow-2xl',
              className,
            )}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground truncate">{title}</h2>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label={t('components.foundation.evidenceClose')}
                className="-mt-1 -mr-2 shrink-0 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {children}
            </div>

            {/* Sticky actions */}
            {actions && (
              <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-end gap-2 bg-card">
                {actions}
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * Section divider used inside <EvidencePanel>. Common heading + spacing
 * so child sections (Sanciones, PEP, Direcciones, Documentos) read as
 * a stack of consistently styled blocks.
 */
export function EvidenceSection({
  title,
  count,
  children,
  className,
}: {
  title: ReactNode;
  count?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</h3>
        {count !== undefined && (
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      <div className="text-sm text-muted-foreground">{children}</div>
    </section>
  );
}
