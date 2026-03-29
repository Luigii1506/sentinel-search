import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitMerge,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Shield,
  Globe,
  Clock,
  Users,
  Building2,
  Ship,
  Plane,
  X,
  TrendingUp,
  Database,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMergeReview, useMergeDetail, usePrefetchMerge } from '@/hooks/useMergeReview';
import type { MergedEntitySummary, MergeChildInfo, MergeReviewSortBy } from '@/types/api';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 50;

const METHOD_LABELS: Record<string, string> = {
  cross_source_merge: 'Cross-Source',
  gold_dedup_merge: 'Gold Dedup',
  ENTITY_RESOLUTION_V4: 'ER v4',
  SINGLE_RECORD_V4: 'Single Record',
  exact_dedup_merge: 'Exact Dedup',
};

const METHOD_COLORS: Record<string, string> = {
  cross_source_merge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  gold_dedup_merge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ENTITY_RESOLUTION_V4: 'bg-green-500/20 text-green-400 border-green-500/30',
  SINGLE_RECORD_V4: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  exact_dedup_merge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

const ENTITY_TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos', icon: Users },
  { value: 'Person', label: 'Persona', icon: Users },
  { value: 'Organization', label: 'Organización', icon: Building2 },
  { value: 'Vessel', label: 'Embarcación', icon: Ship },
  { value: 'Aircraft', label: 'Aeronave', icon: Plane },
];

function confidenceColor(conf: number | undefined | null): string {
  if (conf == null) return 'text-gray-400';
  if (conf >= 0.95) return 'text-green-400';
  if (conf >= 0.88) return 'text-yellow-400';
  if (conf >= 0.80) return 'text-orange-400';
  return 'text-red-400';
}

function confidenceBg(conf: number | undefined | null): string {
  if (conf == null) return 'bg-gray-500/10';
  if (conf >= 0.95) return 'bg-green-500/10';
  if (conf >= 0.88) return 'bg-yellow-500/10';
  if (conf >= 0.80) return 'bg-orange-500/10';
  return 'bg-red-500/10';
}

function formatConfidence(conf: number | undefined | null): string {
  if (conf == null) return '-';
  return `${(conf * 100).toFixed(1)}%`;
}

function formatDate(date: string | undefined | null): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

function formatNumber(num: number): string {
  return num.toLocaleString('es-MX');
}

// Expandable row detail component
function MergeDetailPanel({ entityId }: { entityId: string }) {
  const { data, isLoading, error } = useMergeDetail(entityId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="px-6 py-4 space-y-3">
        <Skeleton className="h-4 w-48 bg-white/5" />
        <Skeleton className="h-20 w-full bg-white/5" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-6 py-4 text-red-400 text-sm">
        Error cargando detalle: {(error as Error)?.message || 'Sin datos'}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="px-6 py-4 bg-white/[0.02] border-t border-white/5"
    >
      {/* Gold entity summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">Tipo</p>
          <p className="text-sm text-white">{data.entity_type || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Paises</p>
          <p className="text-sm text-white">
            {data.countries?.join(', ') || 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Nacimiento</p>
          <p className="text-sm text-white">{data.birth_date || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">PEP</p>
          <p className="text-sm text-white">
            {data.is_current_pep ? (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                {data.pep_category || 'PEP'}
              </Badge>
            ) : (
              'No'
            )}
          </p>
        </div>
      </div>

      {/* All names */}
      {data.all_names.length > 1 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Todos los nombres ({data.all_names.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {data.all_names.map((name, i) => (
              <Badge key={i} variant="outline" className="text-xs bg-white/5 text-gray-300 border-white/10">
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Silver children table */}
      <div className="mt-3">
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
          Silver Entities Mapeados ({data.children.length})
        </p>
        <div className="rounded-lg border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Fuente</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Nombre</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">External ID</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-2">Metodo</th>
                <th className="text-right text-xs font-medium text-gray-400 px-3 py-2">Confianza</th>
                <th className="text-right text-xs font-medium text-gray-400 px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.children.map((child: MergeChildInfo, idx: number) => (
                <tr key={child.silver_id || idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="text-xs bg-white/5 text-gray-300 border-white/10">
                      {child.source}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-gray-300">
                    {child.name || child.name_normalized || '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs truncate max-w-[200px]">
                    {child.external_id || '-'}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={`text-xs ${METHOD_COLORS[child.match_method || ''] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
                    >
                      {METHOD_LABELS[child.match_method || ''] || child.match_method || '-'}
                    </Badge>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-xs ${confidenceColor(child.match_confidence)}`}>
                    {formatConfidence(child.match_confidence)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500 text-xs">
                    {formatDate(child.matched_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-white/10 text-gray-400 hover:text-white"
          onClick={() => navigate(`/entity/${data.entity_id}`)}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Ver Perfil Completo
        </Button>
      </div>
    </motion.div>
  );
}

// Stat card component
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color,
  subtitle 
}: { 
  title: string; 
  value: number; 
  icon: LucideIcon;
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className={`bg-white/5 border-white/5 ${color}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{formatNumber(value)}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-white/5`}>
            <Icon className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MergeReviewPage() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState<MergeReviewSortBy>('confidence_asc');
  const [matchMethod, setMatchMethod] = useState<string>('all');
  const [minSources, setMinSources] = useState(2);
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState<string>('all');
  const [minConfidence, setMinConfidence] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const prefetchMerge = usePrefetchMerge();

  const { data, isLoading, isFetching, error, refetch } = useMergeReview({
    limit: pageSize,
    offset: page * pageSize,
    min_sources: minSources,
    sort_by: sortBy,
    match_method: matchMethod === 'all' ? undefined : matchMethod,
    source_filter: sourceFilter || undefined,
    search: search || undefined,
    entity_type: entityType === 'all' ? undefined : entityType,
    min_confidence: minConfidence ? parseInt(minConfidence) / 100 : undefined,
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 0;
    return Math.ceil(data.total / pageSize);
  }, [data?.total, pageSize]);

  const toggleRow = useCallback((entityId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(entityId)) {
        next.delete(entityId);
      } else {
        next.add(entityId);
        // Prefetch detail data
        prefetchMerge(entityId);
      }
      return next;
    });
  }, [prefetchMerge]);

  const clearFilters = useCallback(() => {
    setMatchMethod('all');
    setMinSources(2);
    setSourceFilter('');
    setSearch('');
    setEntityType('all');
    setMinConfidence('');
    setPage(0);
  }, []);

  const hasActiveFilters = matchMethod !== 'all' || minSources !== 2 || 
    sourceFilter || search || entityType !== 'all' || minConfidence;

  const stats = data?.stats || {};
  const meta = data?.meta || data?._meta;

  // Calculate page info
  const startItem = data?.entities?.length ? page * pageSize + 1 : 0;
  const endItem = Math.min((page + 1) * pageSize, data?.total || 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 px-4 sm:px-6 lg:px-8 pb-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <GitMerge className="w-7 h-7 text-purple-400" />
              Merge Review
            </h1>
            <p className="text-gray-400 mt-1">
              Auditar entidades Gold con multiples fuentes fusionadas
            </p>
          </div>
          <div className="flex items-center gap-3">
            {meta?.elapsed_ms && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
                      <Clock className="w-3.5 h-3.5" />
                      {String(meta.elapsed_ms)}ms
                      {!!meta.cached_count && (
                        <span className="text-green-400">(cached)</span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#1a1a1a] border-white/10">
                    Tiempo de respuesta del servidor
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
              className="border-white/10 text-gray-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Stats cards */}
        {page === 0 && Object.keys(stats).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Total Merges"
              value={stats.total_merged_entities || 0}
              icon={Database}
              color="border-white/10"
            />
            <StatCard
              title="Cross-Source"
              value={stats.cross_source_merges || 0}
              icon={GitMerge}
              color="border-blue-500/20"
            />
            <StatCard
              title="Entity Resolution"
              value={stats.er_v4_merges || 0}
              icon={TrendingUp}
              color="border-green-500/20"
            />
            <StatCard
              title="Deduplicación"
              value={(stats.gold_dedup_merges || 0) + (stats.exact_dedup_merges || 0)}
              icon={CheckCircle2}
              color="border-orange-500/20"
            />
          </div>
        )}

        {/* Filters */}
        <Card className="bg-white/5 border-white/5 mb-6">
          <CardContent className="p-4">
            {/* Primary filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filtros</span>
              </div>

              {/* Search by name */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 w-[250px] bg-white/5 border-white/10 text-gray-300 placeholder:text-gray-600"
                />
              </div>

              <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(0); }}>
                <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-gray-300">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  {ENTITY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as MergeReviewSortBy); setPage(0); }}>
                <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-gray-300">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value="confidence_asc">Confianza (menor)</SelectItem>
                  <SelectItem value="confidence_desc">Confianza (mayor)</SelectItem>
                  <SelectItem value="sources_desc">Mas fuentes</SelectItem>
                  <SelectItem value="recent">Mas recientes</SelectItem>
                  <SelectItem value="name_asc">Nombre A-Z</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={showAdvancedFilters || hasActiveFilters ? 'text-primary-400' : 'text-gray-400'}
              >
                Avanzados
                {hasActiveFilters && (
                  <span className="ml-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    !
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-red-400"
                >
                  <X className="w-4 h-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* Advanced filters */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-white/10 overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={matchMethod} onValueChange={(v) => { setMatchMethod(v); setPage(0); }}>
                      <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-gray-300">
                        <SelectValue placeholder="Metodo" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="all">Todos los metodos</SelectItem>
                        <SelectItem value="cross_source_merge">Cross-Source</SelectItem>
                        <SelectItem value="gold_dedup_merge">Gold Dedup</SelectItem>
                        <SelectItem value="ENTITY_RESOLUTION_V4">ER v4</SelectItem>
                        <SelectItem value="exact_dedup_merge">Exact Dedup</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={String(minSources)} onValueChange={(v) => { setMinSources(Number(v)); setPage(0); }}>
                      <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-gray-300">
                        <SelectValue placeholder="Min fuentes" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1a1a] border-white/10">
                        <SelectItem value="2">2+ fuentes</SelectItem>
                        <SelectItem value="3">3+ fuentes</SelectItem>
                        <SelectItem value="5">5+ fuentes</SelectItem>
                        <SelectItem value="10">10+ fuentes</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <Globe className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Filtrar por fuente..."
                        value={sourceFilter}
                        onChange={(e) => { setSourceFilter(e.target.value); setPage(0); }}
                        className="pl-9 w-[180px] bg-white/5 border-white/10 text-gray-300 placeholder:text-gray-600"
                      />
                    </div>

                    <div className="relative">
                      <Shield className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Confianza min %"
                        value={minConfidence}
                        onChange={(e) => { setMinConfidence(e.target.value); setPage(0); }}
                        className="pl-9 w-[150px] bg-white/5 border-white/10 text-gray-300 placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Main table */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-white/5 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <Card className="bg-red-500/5 border-red-500/10">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-400 font-medium">Error cargando datos</p>
              <p className="text-red-400/60 text-sm mt-1">
                {(error as Error)?.message || 'Error desconocido'}
              </p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-4 border-red-500/20 text-red-400 hover:bg-red-500/10"
              >
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : !data?.entities?.length ? (
          <Card className="bg-white/5 border-white/5">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <p className="text-gray-300 font-medium">No hay merges con estos filtros</p>
              <p className="text-gray-500 text-sm mt-1">
                Ajusta los filtros para ver mas resultados
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="rounded-xl border border-white/5 overflow-hidden bg-white/[0.02]">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/5">
                  <tr>
                    <th className="w-8 px-3 py-3" />
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Nombre Canonico</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Tipo</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Fuentes</th>
                    <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Metodos</th>
                    <th className="text-center text-xs font-medium text-gray-400 px-3 py-3">Mappings</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-3 py-3">Min Conf.</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-3 py-3">Avg Conf.</th>
                    <th className="text-right text-xs font-medium text-gray-400 px-3 py-3">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.entities.map((entity: MergedEntitySummary, index: number) => {
                    const isExpanded = expandedRows.has(entity.entity_id);
                    const EntityTypeIcon = ENTITY_TYPE_OPTIONS.find(t => t.value === entity.entity_type)?.icon || Users;
                    
                    return (
                      <>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(index * 0.01, 0.3) }}
                          className={`cursor-pointer transition-colors ${
                            isExpanded ? 'bg-white/5' : 'hover:bg-white/[0.03]'
                          }`}
                          onClick={() => toggleRow(entity.entity_id)}
                        >
                          <td className="px-3 py-3">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-500" />
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white font-medium truncate max-w-[300px]">
                                {entity.canonical_name}
                              </span>
                              {entity.is_current_pep && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Shield className="w-3.5 h-3.5 text-yellow-400" />
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-[#1a1a1a] border-white/10">
                                      PEP: {entity.pep_category}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            {entity.all_names.length > 1 && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[300px]">
                                +{entity.all_names.length - 1} nombres
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2 text-gray-300">
                              <EntityTypeIcon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">{entity.entity_type || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {entity.all_sources.slice(0, 3).map((src) => (
                                <Badge
                                  key={src}
                                  variant="outline"
                                  className="text-[10px] bg-white/5 text-gray-300 border-white/10"
                                >
                                  {src}
                                </Badge>
                              ))}
                              {entity.all_sources.length > 3 && (
                                <Badge variant="outline" className="text-[10px] bg-white/5 text-gray-500 border-white/10">
                                  +{entity.all_sources.length - 3}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {entity.merge_methods.map((method) => (
                                <Badge
                                  key={method}
                                  variant="outline"
                                  className={`text-[10px] ${METHOD_COLORS[method] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}
                                >
                                  {METHOD_LABELS[method] || method}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-sm text-white font-mono">
                              {entity.mapping_count}
                            </span>
                          </td>
                          <td className={`px-3 py-3 text-right font-mono text-sm ${confidenceColor(entity.min_confidence)}`}>
                            <span className={`px-1.5 py-0.5 rounded ${confidenceBg(entity.min_confidence)}`}>
                              {formatConfidence(entity.min_confidence)}
                            </span>
                          </td>
                          <td className={`px-3 py-3 text-right font-mono text-sm ${confidenceColor(entity.avg_confidence)}`}>
                            {formatConfidence(entity.avg_confidence)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={`text-sm font-mono ${
                              entity.risk_score >= 80 ? 'text-red-400' :
                              entity.risk_score >= 60 ? 'text-orange-400' :
                              entity.risk_score >= 40 ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {entity.risk_score}
                            </span>
                          </td>
                        </motion.tr>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <AnimatePresence>
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <MergeDetailPanel entityId={entity.entity_id} />
                                </motion.div>
                              </AnimatePresence>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between mt-4 px-2 gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  Mostrando {formatNumber(startItem)}-{formatNumber(endItem)} de{' '}
                  {formatNumber(data.total)} entidades
                </p>
                
                <Select 
                  value={String(pageSize)} 
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}
                >
                  <SelectTrigger className="w-[120px] bg-white/5 border-white/10 text-gray-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/10">
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={String(size)}>
                        {size} / página
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {/* Page numbers */}
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 2) {
                      pageNum = i;
                    } else if (page > totalPages - 3) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        disabled={isLoading}
                        className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-400 hover:bg-white/10'
                        } disabled:opacity-50`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                  className="text-gray-400 hover:text-white disabled:opacity-30"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MergeReviewPage;
