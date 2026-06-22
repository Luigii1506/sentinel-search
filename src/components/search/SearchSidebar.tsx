/**
 * SearchSidebar — rail del MODO BÚSQUEDA.
 *
 * Reemplaza por completo al nav principal cuando estás en /search (ver la
 * orquestación del morph en App.tsx → AuthenticatedLayout). Su trabajo:
 *
 *   1. Salida clara y rápida → "Volver al inicio" (regresa al nav normal).
 *   2. "Nueva búsqueda" → limpia la vista y enfoca el input.
 *   3. Historial en tarjetas con SNAPSHOT: al hacer clic se restaura el
 *      estado exacto (query + resultados) vía ?restore=<id> que SearchPage
 *      hidrata con useScreening.restoreSnapshot — sin red.
 *
 * Es un `motion.aside` fijo: vive dentro de un AnimatePresence en el layout,
 * así que entra "de arriba hacia abajo" y sale al volver al home.
 */
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  History,
  Trash2,
  X,
  Sparkles,
  Clock,
  Search as SearchIcon,
} from 'lucide-react';
import { cn, formatRelativeTime, getRiskColor } from '@/lib/utils';
import { easeWater, springRail, springSoft } from '@/lib/motion';
import { useSearchHistory, type SearchHistoryEntry } from '@/contexts/SearchHistoryContext';

const SOURCE_LEVEL_LABEL: Record<number, string> = {
  1: 'Crítico',
  2: 'Extendido',
  3: 'PEP',
  4: 'Completo',
  5: 'ML',
};

function HistoryCard({
  entry,
  active,
  onOpen,
  onRemove,
  index,
}: {
  entry: SearchHistoryEntry;
  active: boolean;
  onOpen: () => void;
  onRemove: () => void;
  index: number;
}) {
  const top = entry.results.slice(0, 2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.3, ease: easeWater } }}
      transition={{ delay: Math.min(index * 0.07, 0.6), duration: 0.7, ease: easeWater }}
      whileHover={{ y: -3, transition: springSoft }}
      className="group/card relative"
    >
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'w-full text-left rounded-xl p-3 transition-all duration-300',
          'border bg-foreground/[0.02] hover:bg-foreground/[0.05]',
          active
            ? 'border-brand-electric/60 ring-1 ring-brand-electric/40 bg-brand-electric/[0.06] shadow-[0_8px_30px_-12px] shadow-brand-electric/40'
            : 'border-foreground/10 hover:border-foreground/20',
        )}
      >
        {/* Query + meta */}
        <div className="flex items-start gap-2">
          <div
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
              active ? 'bg-brand-electric/15 text-brand-electric' : 'bg-foreground/5 text-muted-foreground',
            )}
          >
            <SearchIcon className="h-3 w-3" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-sm font-medium text-foreground">
              {entry.query}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(new Date(entry.timestamp).toISOString())}</span>
              <span aria-hidden>•</span>
              <span className="tabular-nums">{entry.resultCount}</span>
            </div>
          </div>
        </div>

        {/* Top hits preview */}
        {top.length > 0 ? (
          <div className="mt-2.5 space-y-1">
            {top.map((m) => (
              <div key={m.entity_id} className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getRiskColor(m.risk_level) }}
                />
                <span className="truncate text-xs text-muted-foreground">{m.name}</span>
              </div>
            ))}
            {entry.resultCount > top.length && (
              <div className="pl-3.5 text-[10px] text-muted-foreground/70">
                +{entry.resultCount - top.length} más
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2.5 text-xs text-muted-foreground/70 italic">Sin resultados</div>
        )}

        {/* Tags */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1">
          <span className="rounded-full border border-foreground/10 bg-foreground/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
            {SOURCE_LEVEL_LABEL[entry.sourceLevel] ?? `T${entry.sourceLevel}`}
          </span>
          {entry.engine === 'v2' ? (
            <span className="flex items-center gap-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-purple-300">
              <Sparkles className="h-2.5 w-2.5" /> ML
            </span>
          ) : (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-blue-300">
              v1
            </span>
          )}
        </div>
      </button>

      {/* Delete */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Eliminar del historial"
        className={cn(
          'absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-all',
          'opacity-0 group-hover/card:opacity-100 hover:bg-foreground/10 hover:text-red-400',
        )}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export function SearchSidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { entries, removeSearch, clearHistory } = useSearchHistory();
  const activeId = searchParams.get('restore');

  const goHome = () => {
    onNavigate?.();
    navigate('/');
  };

  const newSearch = () => {
    onNavigate?.();
    // ?fresh=<ts> fuerza un cambio de param en cada clic → SearchPage limpia.
    navigate(`/search?fresh=${Date.now()}`);
  };

  const openEntry = (id: string) => {
    onNavigate?.();
    navigate(`/search?restore=${id}`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Salida clara — volver al inicio */}
      <div className="border-b border-sidebar-border p-3">
        <button
          type="button"
          onClick={goHome}
          className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 transition-colors group-hover:border-brand-electric/40 group-hover:text-brand-electric">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span className="font-medium">{t('workspace.search.historySidebar.backHome')}</span>
        </button>
      </div>

      {/* Nueva búsqueda */}
      <div className="p-3">
        <button
          type="button"
          onClick={newSearch}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-blue to-brand-electric px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_-10px] shadow-brand-electric/60 transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          {t('workspace.search.historySidebar.newSearch')}
        </button>
      </div>

      {/* Header del historial */}
      <div className="flex items-center justify-between px-4 pb-1 pt-2">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          {t('workspace.search.historySidebar.title')}
          {entries.length > 0 && (
            <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 tabular-nums">
              {entries.length}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            aria-label={t('workspace.search.historySidebar.clearAll')}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Lista */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 pb-3 pt-1">
        {entries.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-4 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-foreground/10 bg-foreground/5 text-muted-foreground">
              <History className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {t('workspace.search.historySidebar.emptyTitle')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('workspace.search.historySidebar.emptyDescription')}
            </p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              index={i}
              active={activeId === entry.id}
              onOpen={() => openEntry(entry.id)}
              onRemove={() => removeSearch(entry.id)}
            />
          ))
        )}
      </nav>

      {/* Footer hint */}
      <div className="border-t border-sidebar-border px-4 py-2.5">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-brand-blue to-brand-electric">
            <SearchIcon className="h-3 w-3 text-white" />
          </span>
          Sentinel
        </Link>
      </div>
    </div>
  );
}

/** Rail fijo desktop — animado por AnimatePresence en el layout. */
export function SearchSidebar() {
  return (
    <motion.aside
      key="search-rail"
      initial={{ opacity: 0, y: -28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -28 }}
      transition={springRail}
      className={cn(
        'hidden lg:flex fixed inset-y-0 left-0 z-30 w-[264px] flex-col',
        'bg-sidebar border-r border-sidebar-border',
      )}
      aria-label="Historial de búsquedas"
    >
      <SearchSidebarBody />
    </motion.aside>
  );
}

export default SearchSidebar;
