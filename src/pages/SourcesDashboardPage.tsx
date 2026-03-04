import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Server,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Activity,
  ExternalLink,
  Download,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  Shield,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSources } from '@/hooks/useSources';
import { useSourceDetail } from '@/hooks/useSourceDetail';
import type { SourceInfo } from '@/types/api';

// ── Constantes ──

const CATEGORY_LABELS: Record<string, string> = {
  SANCTIONS: 'Sanciones',
  PEP: 'PEP',
  DEBARMENT: 'Inhabilitados',
  REGULATORY: 'Regulatorio',
  LAW_ENFORCEMENT: 'Fuerza Publica',
  TAX: 'Fiscal',
  OTHER: 'Otros',
  TERRORISM: 'Terrorismo',
  FINANCIAL_DISCLOSURE: 'Divulgacion',
  CORPORATE: 'Corporativo',
  UBO: 'UBO',
  LEGAL: 'Legal',
  MEDIA: 'Media',
  // lowercase fallback
  sanctions: 'Sanciones',
  pep: 'PEP',
  debarment: 'Inhabilitados',
  regulatory: 'Regulatorio',
  law_enforcement: 'Fuerza Publica',
  tax: 'Fiscal',
  other: 'Otros',
  terrorism: 'Terrorismo',
};

const CATEGORY_COLORS: Record<string, string> = {
  SANCTIONS: 'bg-red-500/10 text-red-400 border-red-500/20',
  PEP: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  DEBARMENT: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  REGULATORY: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  LAW_ENFORCEMENT: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  TAX: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  OTHER: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  TERRORISM: 'bg-red-600/10 text-red-500 border-red-600/20',
  FINANCIAL_DISCLOSURE: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  CORPORATE: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  UBO: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  LEGAL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MEDIA: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  // lowercase fallback
  sanctions: 'bg-red-500/10 text-red-400 border-red-500/20',
  pep: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  debarment: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  regulatory: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  law_enforcement: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  tax: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  other: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  terrorism: 'bg-red-600/10 text-red-500 border-red-600/20',
};

const STATUS_CONFIG = {
  active: { label: 'Activo', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  pending: { label: 'Pendiente', icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  error: { label: 'Error', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  stale: { label: 'Desactualizado', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

// ── Helpers ──

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Nunca';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Hace minutos';
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString('es-MX');
}

// ── Source Detail Dialog ──

function SourceDetailDialog({ sourceId, children }: { sourceId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { data: detail, isLoading } = useSourceDetail(sourceId, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#1a1a1a] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            {isLoading ? 'Cargando...' : detail?.display_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 bg-white/5" />
            <Skeleton className="h-48 bg-white/5" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Estado</p>
                <Badge className={`${STATUS_CONFIG[detail.status as keyof typeof STATUS_CONFIG]?.bg} ${STATUS_CONFIG[detail.status as keyof typeof STATUS_CONFIG]?.color} mt-1`}>
                  {STATUS_CONFIG[detail.status as keyof typeof STATUS_CONFIG]?.label || detail.status}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Categoria</p>
                <p className="text-sm text-white capitalize">{CATEGORY_LABELS[detail.category] || detail.category}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Pais</p>
                <p className="text-sm text-white">{detail.country || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-xs text-gray-500">Entidades</p>
                <p className="text-sm text-white font-mono">{formatNumber(detail.bronze_count)}</p>
              </div>
            </div>

            {/* Conteos por Capa */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Conteos por Capa
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#8B4513]/20 border border-[#8B4513]/30">
                  <p className="text-xs text-[#CD853F]">Bronze (Raw)</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(detail.bronze_count)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30">
                  <p className="text-xs text-gray-400">Silver (Clean)</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(detail.silver_count)}</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-400">Gold (Unified)</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(detail.gold_count)}</p>
                </div>
              </div>
            </div>

            {/* Metricas 7d */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400" />
                Metricas (7 dias)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <p className="text-xs text-green-400">Jobs Exitosos</p>
                  <p className="text-xl font-bold text-white">{detail.success_count_7d}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <p className="text-xs text-red-400">Jobs Fallidos</p>
                  <p className="text-xl font-bold text-white">{detail.error_count_7d}</p>
                </div>
              </div>
            </div>

            {/* Recent Jobs */}
            {detail.recent_jobs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-white">Jobs Recientes</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detail.recent_jobs.map((job) => (
                    <div key={job.id} className="p-3 rounded-lg bg-white/5 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge className={
                          job.status === 'success' ? 'bg-green-500/10 text-green-400' :
                          job.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                          'bg-blue-500/10 text-blue-400'
                        }>
                          {job.status}
                        </Badge>
                        <span className="text-gray-500">{formatNumber(job.records_inserted)} registros</span>
                      </div>
                      {job.error_message && (
                        <p className="text-xs text-red-400 mt-1">{job.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──

export function SourcesDashboardPage() {
  const { data, isLoading, error, refetch } = useSources();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hasDataFilter, setHasDataFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Tabs por categoria con conteos
  const categoryTabs = useMemo(() => {
    if (!data?.sources) return [];
    const counts: Record<string, number> = {};
    data.sources.forEach((s: SourceInfo) => {
      const cat = s.category;
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        label: CATEGORY_LABELS[key] || key,
        count,
      }));
  }, [data]);

  const filteredSources = useMemo(() => {
    if (!data?.sources) return [];

    return data.sources.filter((source: SourceInfo) => {
      const matchesSearch =
        source.source_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (source.os_dataset || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (source.country || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeTab === 'all' || source.category === activeTab;
      const matchesStatus = statusFilter === 'all' || source.status === statusFilter;
      const matchesData = hasDataFilter === 'all' ||
        (hasDataFilter === 'has_data' && source.bronze_count > 0) ||
        (hasDataFilter === 'no_data' && source.bronze_count === 0);

      return matchesSearch && matchesCategory && matchesStatus && matchesData;
    });
  }, [data, searchQuery, activeTab, statusFilter, hasDataFilter]);

  const progress = data ? Math.round((data.total_with_data / data.total_registered) * 100) : 0;

  const toggleRow = (sourceId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(sourceId)) {
      newExpanded.delete(sourceId);
    } else {
      newExpanded.add(sourceId);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-28 bg-white/5" />
            ))}
          </div>
          <Skeleton className="h-96 bg-white/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 px-8">
        <div className="max-w-7xl mx-auto text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error al cargar fuentes</h2>
          <p className="text-gray-400 mb-2">No se pudieron obtener los datos</p>
          <p className="text-sm text-gray-500 mb-4">{(error as Error).message}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard de Fuentes</h1>
                <p className="text-gray-400">
                  {data?.total_registered} fuentes registradas · {data?.total_with_data} con datos
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => refetch()} className="border-white/10">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                Registradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{data?.total_registered}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-[#CD853F] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                Bronze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(data?.total_bronze || 0)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Silver
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(data?.total_silver || 0)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-yellow-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Gold
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(data?.total_gold || 0)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1a1a1a] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Progreso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{progress}%</div>
              <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'
            }`}
          >
            Todas ({data?.sources?.length || 0})
          </button>
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Buscar por nombre, source_id, dataset, pais..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-white/10 text-white"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-[#1a1a1a] border-white/10 text-white">
              <Activity className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all">Todos los status</SelectItem>
              <SelectItem value="active">Activo ({data?.by_status?.active || 0})</SelectItem>
              <SelectItem value="pending">Pendiente ({data?.by_status?.pending || 0})</SelectItem>
              <SelectItem value="error">Error ({data?.by_status?.error || 0})</SelectItem>
              <SelectItem value="stale">Desactualizado ({data?.by_status?.stale || 0})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={hasDataFilter} onValueChange={setHasDataFilter}>
            <SelectTrigger className="bg-[#1a1a1a] border-white/10 text-white">
              <Database className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Datos" />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="has_data">Con datos</SelectItem>
              <SelectItem value="no_data">Sin datos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sources Table */}
        <div className="bg-[#1a1a1a] rounded-xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3 w-8"></th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3">
                    Fuente
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3">
                    Cat
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3">
                    Pais
                  </th>
                  <th className="text-right text-xs font-medium text-[#CD853F] uppercase tracking-wider px-3 py-3">
                    Bronze
                  </th>
                  <th className="text-right text-xs font-medium text-gray-300 uppercase tracking-wider px-3 py-3">
                    Silver
                  </th>
                  <th className="text-right text-xs font-medium text-yellow-400 uppercase tracking-wider px-3 py-3">
                    Gold
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3">
                    Risk
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3">
                    OS
                  </th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3">
                    Sync
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3">
                    Status
                  </th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider px-3 py-3 w-10">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSources.map((source: SourceInfo, index: number) => {
                  const statusCfg = STATUS_CONFIG[source.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const isExpanded = expandedRows.has(source.source_id);

                  return (
                    <AnimatePresence key={source.source_id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.005, 0.5) }}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => toggleRow(source.source_id)}
                      >
                        <td className="px-3 py-2.5">
                          <button className="text-gray-500 hover:text-white">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="min-w-[200px]">
                            <p className="text-sm font-medium text-white truncate">
                              {source.display_name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">{source.source_id}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${CATEGORY_COLORS[source.category] || CATEGORY_COLORS.other || CATEGORY_COLORS.OTHER}`}
                          >
                            {CATEGORY_LABELS[source.category] || source.category}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs text-gray-400 font-mono">{source.country || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-sm font-mono ${source.bronze_count > 0 ? 'text-[#CD853F]' : 'text-gray-600'}`}>
                            {source.bronze_count > 0 ? formatNumber(source.bronze_count) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-sm font-mono ${source.silver_count > 0 ? 'text-gray-300' : 'text-gray-600'}`}>
                            {source.silver_count > 0 ? formatNumber(source.silver_count) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-sm font-mono ${source.gold_count > 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                            {source.gold_count > 0 ? formatNumber(source.gold_count) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            source.risk_score >= 80 ? 'bg-red-500/10 text-red-400' :
                            source.risk_score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                            'bg-green-500/10 text-green-400'
                          }`}>
                            {source.risk_score}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {source.has_opensanctions ? (
                            <Globe className="w-3.5 h-3.5 text-blue-400 mx-auto" />
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-gray-400">{formatDate(source.last_sync)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.border} border`}>
                            <StatusIcon className={`w-3 h-3 ${statusCfg.color}`} />
                            <span className={`text-[10px] ${statusCfg.color}`}>{statusCfg.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <SourceDetailDialog sourceId={source.source_id}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            </Button>
                          </SourceDetailDialog>
                        </td>
                      </motion.tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-white/[0.02]"
                        >
                          <td colSpan={12} className="px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                              {/* Importer */}
                              <div>
                                <p className="text-gray-500 mb-1 text-xs uppercase">Importer</p>
                                <p className="text-gray-300 font-mono text-xs">
                                  {source.importer_type || 'N/A'}
                                </p>
                                <p className="text-gray-500 text-xs mt-1">
                                  {source.schedule_frequency} · cola: {source.queue || 'default'}
                                </p>
                              </div>

                              {/* PEP */}
                              <div>
                                <p className="text-gray-500 mb-1 text-xs uppercase">PEP</p>
                                {source.is_pep ? (
                                  <Badge className="bg-purple-500/10 text-purple-400 text-xs">PEP</Badge>
                                ) : (
                                  <span className="text-gray-600 text-xs">No</span>
                                )}
                              </div>

                              {/* OS Links */}
                              <div>
                                <p className="text-gray-500 mb-1 text-xs uppercase">OpenSanctions</p>
                                {source.os_url ? (
                                  <div className="space-y-1">
                                    <a
                                      href={source.os_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {source.os_dataset}
                                    </a>
                                    {source.os_data_url && (
                                      <a
                                        href={source.os_data_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-400 hover:text-gray-300 text-xs flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Download className="w-3 h-3" />
                                        Data URL
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-600 text-xs">N/A</span>
                                )}
                              </div>

                              {/* Smart Update URL */}
                              <div>
                                <p className="text-gray-500 mb-1 text-xs uppercase">Smart Update URL</p>
                                {source.source_url ? (
                                  <a
                                    href={source.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 text-xs truncate block"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {source.source_url.length > 50
                                      ? source.source_url.substring(0, 50) + '...'
                                      : source.source_url}
                                  </a>
                                ) : (
                                  <span className="text-gray-600 text-xs">No configurada</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredSources.length === 0 && (
            <div className="text-center py-12">
              <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No se encontraron fuentes</p>
            </div>
          )}

          <div className="px-6 py-3 border-t border-white/5 text-sm text-gray-500 flex justify-between">
            <span>Mostrando {filteredSources.length} de {data?.sources?.length || 0} fuentes</span>
            <span>
              Bronze: {formatNumber(data?.total_bronze || 0)} · Silver: {formatNumber(data?.total_silver || 0)} · Gold: {formatNumber(data?.total_gold || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SourcesDashboardPage;
