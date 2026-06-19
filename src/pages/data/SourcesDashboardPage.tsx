import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  Activity,
  ExternalLink,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  Shield,
  Globe,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AppPage, PageHeader, ListPageSkeleton, MetricCard, CategoryBadge, categoryLabel } from '@/components/foundation';
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

const STATUS_CONFIG = {
  active: { labelKey: 'data.sources.status.active', icon: CheckCircle2, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  pending: { labelKey: 'data.sources.status.pending', icon: Clock, color: 'text-muted-foreground', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  error: { labelKey: 'data.sources.status.error', icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  stale: { labelKey: 'data.sources.status.stale', icon: AlertTriangle, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  disappeared: { labelKey: 'data.sources.status.disappeared', icon: Shield, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
  inactive: { labelKey: 'data.sources.status.inactive', icon: Shield, color: 'text-muted-foreground', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};

function effectiveStatus(source: SourceInfo): keyof typeof STATUS_CONFIG {
  if (source.is_active === false) return 'inactive';
  if (source.status in STATUS_CONFIG) return source.status as keyof typeof STATUS_CONFIG;
  return 'pending';
}

// ── Helpers ──

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

type TFunc = (key: string, options?: Record<string, unknown>) => string;

function formatDate(t: TFunc, dateStr?: string): string {
  if (!dateStr) return t('data.sources.date.never');
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return t('data.sources.date.minutesAgo');
  if (hours < 24) return t('data.sources.date.hoursAgo', { count: hours });
  if (days < 7) return t('data.sources.date.daysAgo', { count: days });
  return date.toLocaleDateString('es-MX');
}

// ── Source Detail Dialog ──

function SourceDetailDialog({ sourceId, children }: { sourceId: string; children: React.ReactNode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: detail, isLoading } = useSourceDetail(sourceId, open);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-foreground/10">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {isLoading ? t('data.sources.detail.loading') : detail?.display_name}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 bg-foreground/5" />
            <Skeleton className="h-48 bg-foreground/5" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-foreground/5">
                <p className="text-xs text-muted-foreground">{t('data.sources.detail.status')}</p>
                <Badge className={`${STATUS_CONFIG[detail.status as keyof typeof STATUS_CONFIG]?.bg} ${STATUS_CONFIG[detail.status as keyof typeof STATUS_CONFIG]?.color} mt-1`}>
                  {STATUS_CONFIG[detail.status as keyof typeof STATUS_CONFIG]?.labelKey
                    ? t(STATUS_CONFIG[detail.status as keyof typeof STATUS_CONFIG].labelKey)
                    : detail.status}
                </Badge>
              </div>
              <div className="p-3 rounded-lg bg-foreground/5">
                <p className="text-xs text-muted-foreground">{t('data.sources.detail.category')}</p>
                <p className="text-sm text-foreground capitalize">{categoryLabel(detail.category)}</p>
              </div>
              <div className="p-3 rounded-lg bg-foreground/5">
                <p className="text-xs text-muted-foreground">{t('data.sources.detail.country')}</p>
                <p className="text-sm text-foreground">{detail.country || 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-foreground/5">
                <p className="text-xs text-muted-foreground">{t('data.sources.detail.entities')}</p>
                <p className="text-sm text-foreground font-mono">{formatNumber(detail.bronze_count)}</p>
              </div>
            </div>

            {/* Conteos por Capa */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                {t('data.sources.detail.layerCounts')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#8B4513]/20 border border-[#8B4513]/30">
                  <p className="text-xs text-[#CD853F]">{t('data.sources.detail.layerBronze')}</p>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(detail.bronze_count)}</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30">
                  <p className="text-xs text-muted-foreground">{t('data.sources.detail.layerSilver')}</p>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(detail.silver_count)}</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">{t('data.sources.detail.layerGold')}</p>
                  <p className="text-2xl font-bold text-foreground">{formatNumber(detail.gold_count)}</p>
                </div>
              </div>
            </div>

            {/* Metricas 7d */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-700 dark:text-green-400" />
                {t('data.sources.detail.metrics7d')}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <p className="text-xs text-green-700 dark:text-green-400">{t('data.sources.detail.successJobs')}</p>
                  <p className="text-xl font-bold text-foreground">{detail.success_count_7d}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10">
                  <p className="text-xs text-red-600 dark:text-red-400">{t('data.sources.detail.failedJobs')}</p>
                  <p className="text-xl font-bold text-foreground">{detail.error_count_7d}</p>
                </div>
              </div>
            </div>

            {/* Recent Jobs */}
            {detail.recent_jobs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">{t('data.sources.detail.recentJobs')}</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detail.recent_jobs.map((job) => (
                    <div key={job.id} className="p-3 rounded-lg bg-foreground/5 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge className={
                          job.status === 'success' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                          job.status === 'failed' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }>
                          {job.status}
                        </Badge>
                        <span className="text-muted-foreground">{t('data.sources.detail.records', { count: job.records_inserted, formatted: formatNumber(job.records_inserted) })}</span>
                      </div>
                      {job.error_message && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{job.error_message}</p>
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
  const { t } = useTranslation();
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
        label: categoryLabel(key),
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
      const matchesStatus = statusFilter === 'all' || effectiveStatus(source) === statusFilter;
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
    return <ListPageSkeleton width="default" metricCards={5} rowCount={1} rowHeightClassName="h-96" />;
  }

  if (error) {
    return (
      <AppPage width="default">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('data.sources.errorState.title')}</h2>
          <p className="text-muted-foreground mb-2">{t('data.sources.errorState.description')}</p>
          <p className="text-sm text-muted-foreground mb-4">{(error as Error).message}</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.actions.retry')}
          </Button>
        </div>
      </AppPage>
    );
  }

  return (
    <AppPage width="default">
      <PageHeader
        title={t('data.sources.title')}
        description={
          data
            ? t('data.sources.description', { registered: data.total_registered, withData: data.total_with_data })
            : undefined
        }
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
        actions={
          <Button variant="outline" onClick={() => refetch()} className="border-foreground/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.actions.refresh')}
          </Button>
        }
      />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <MetricCard
            label={t('data.sources.metrics.registered')}
            icon={Server}
            value={data?.total_registered ?? 0}
          />
          <MetricCard
            label="Bronze"
            icon={Database}
            value={formatNumber(data?.total_bronze || 0)}
          />
          <MetricCard
            label="Silver"
            icon={Layers}
            value={formatNumber(data?.total_silver || 0)}
          />
          <MetricCard
            label="Gold"
            icon={Shield}
            value={formatNumber(data?.total_gold || 0)}
            accent="success"
          />
          <MetricCard
            label={t('data.sources.metrics.progress')}
            icon={Activity}
            value={`${progress}%`}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                : 'bg-foreground/5 text-muted-foreground border border-foreground/5 hover:bg-foreground/10'
            }`}
          >
            {t('data.sources.tabs.all', { count: data?.sources?.length || 0 })}
          </button>
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  : 'bg-foreground/5 text-muted-foreground border border-foreground/5 hover:bg-foreground/10'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('data.sources.filters.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card border-foreground/10 text-foreground"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
              <Activity className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('data.sources.filters.statusPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="bg-card border-foreground/10">
              <SelectItem value="all">{t('data.sources.filters.allStatuses')}</SelectItem>
              <SelectItem value="active">{t('data.sources.filters.statusActive', { count: data?.by_status?.active || 0 })}</SelectItem>
              <SelectItem value="pending">{t('data.sources.filters.statusPending', { count: data?.by_status?.pending || 0 })}</SelectItem>
              <SelectItem value="error">{t('data.sources.filters.statusError', { count: data?.by_status?.error || 0 })}</SelectItem>
              <SelectItem value="stale">{t('data.sources.filters.statusStale', { count: data?.by_status?.stale || 0 })}</SelectItem>
              <SelectItem value="inactive">{t('data.sources.filters.statusInactive')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={hasDataFilter} onValueChange={setHasDataFilter}>
            <SelectTrigger className="bg-card border-foreground/10 text-foreground">
              <Database className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('data.sources.filters.dataPlaceholder')} />
            </SelectTrigger>
            <SelectContent className="bg-card border-foreground/10">
              <SelectItem value="all">{t('data.sources.filters.dataAll')}</SelectItem>
              <SelectItem value="has_data">{t('data.sources.filters.dataHas')}</SelectItem>
              <SelectItem value="no_data">{t('data.sources.filters.dataNone')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:hidden space-y-3">
          {filteredSources.map((source: SourceInfo) => {
            const statusCfg = STATUS_CONFIG[effectiveStatus(source)] || STATUS_CONFIG.pending;
            const StatusIcon = statusCfg.icon;

            return (
              <Card key={source.source_id} className="bg-card border-foreground/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{source.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono break-all">{source.source_id}</p>
                    </div>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.border} border`}>
                      <StatusIcon className={`w-3 h-3 ${statusCfg.color}`} />
                      <span className={`text-[10px] ${statusCfg.color}`}>{t(statusCfg.labelKey)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <CategoryBadge category={source.category} />
                    {source.country ? (
                      <Badge variant="outline" className="text-[10px] bg-foreground/5 text-muted-foreground border-foreground/10">
                        {source.country}
                      </Badge>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-foreground/5 p-3">
                      <p className="text-[11px] text-muted-foreground">Bronze</p>
                      <p className="text-foreground font-mono">{source.bronze_count > 0 ? formatNumber(source.bronze_count) : '-'}</p>
                    </div>
                    <div className="rounded-lg bg-foreground/5 p-3">
                      <p className="text-[11px] text-muted-foreground">Silver</p>
                      <p className="text-foreground font-mono">{source.silver_count > 0 ? formatNumber(source.silver_count) : '-'}</p>
                    </div>
                    <div className="rounded-lg bg-foreground/5 p-3">
                      <p className="text-[11px] text-muted-foreground">Gold</p>
                      <p className="text-foreground font-mono">{source.gold_count > 0 ? formatNumber(source.gold_count) : '-'}</p>
                    </div>
                    <div className="rounded-lg bg-foreground/5 p-3">
                      <p className="text-[11px] text-muted-foreground">{t('data.sources.card.lastSync')}</p>
                      <p className="text-foreground">{formatDate(t, source.last_sync)}</p>
                    </div>
                  </div>

                  <SourceDetailDialog sourceId={source.source_id}>
                    <Button variant="outline" className="w-full border-foreground/10">
                      <Eye className="w-4 h-4 mr-2" />
                      {t('data.sources.card.viewDetail')}
                    </Button>
                  </SourceDetailDialog>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sources Table */}
        <div className="hidden md:block bg-card rounded-xl border border-foreground/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-foreground/5 border-b border-foreground/5">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3 w-8"></th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    {t('data.sources.table.source')}
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    {t('data.sources.table.category')}
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    {t('data.sources.table.country')}
                  </th>
                  <th className="text-right text-xs font-medium text-[#CD853F] uppercase tracking-wider px-3 py-3">
                    Bronze
                  </th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    Silver
                  </th>
                  <th className="text-right text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wider px-3 py-3">
                    Gold
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    {t('data.sources.table.risk')}
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    OS
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    {t('data.sources.table.sync')}
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3">
                    {t('data.sources.table.status')}
                  </th>
                  <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-3 w-10">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {filteredSources.map((source: SourceInfo, index: number) => {
                  const statusCfg = STATUS_CONFIG[effectiveStatus(source)] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const isExpanded = expandedRows.has(source.source_id);

                  return (
                    <AnimatePresence key={source.source_id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.005, 0.5) }}
                        className="hover:bg-foreground/5 transition-colors cursor-pointer"
                        onClick={() => toggleRow(source.source_id)}
                      >
                        <td className="px-3 py-2.5">
                          <button className="text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="min-w-[200px]">
                            <p className="text-sm font-medium text-foreground truncate">
                              {source.display_name}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">{source.source_id}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <CategoryBadge category={source.category} />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs text-muted-foreground font-mono">{source.country || '-'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-sm font-mono ${source.bronze_count > 0 ? 'text-[#CD853F]' : 'text-muted-foreground'}`}>
                            {source.bronze_count > 0 ? formatNumber(source.bronze_count) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-sm font-mono ${source.silver_count > 0 ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                            {source.silver_count > 0 ? formatNumber(source.silver_count) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-sm font-mono ${source.gold_count > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-muted-foreground'}`}>
                            {source.gold_count > 0 ? formatNumber(source.gold_count) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                            source.risk_score >= 80 ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                            source.risk_score >= 60 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400' :
                            'bg-green-500/10 text-green-700 dark:text-green-400'
                          }`}>
                            {source.risk_score}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {source.has_opensanctions ? (
                            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mx-auto" />
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-muted-foreground">{formatDate(t, source.last_sync)}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.border} border`}>
                            <StatusIcon className={`w-3 h-3 ${statusCfg.color}`} />
                            <span className={`text-[10px] ${statusCfg.color}`}>{t(statusCfg.labelKey)}</span>
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
                              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
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
                          className="bg-foreground/[0.02]"
                        >
                          <td colSpan={12} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                              {/* Importer */}
                              <div>
                                <p className="text-muted-foreground mb-1 text-xs uppercase">{t('data.sources.expanded.importer')}</p>
                                <p className="text-muted-foreground font-mono text-xs">
                                  {source.importer_type || 'N/A'}
                                </p>
                                <p className="text-muted-foreground text-xs mt-1">
                                  {source.schedule_frequency} · {t('data.sources.expanded.queue', { queue: source.queue || t('data.sources.expanded.queueDefault') })}
                                </p>
                                <p className="text-muted-foreground text-xs mt-1">
                                  {source.sync_strategy || t('data.sources.expanded.syncStrategyDefault')} · {source.freshness_class || t('data.sources.expanded.freshnessDefault')}
                                </p>
                              </div>

                              {/* PEP */}
                              <div>
                                <p className="text-muted-foreground mb-1 text-xs uppercase">{t('data.sources.expanded.pep')}</p>
                                {source.is_pep ? (
                                  <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs">PEP</Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">{t('data.sources.expanded.pepNo')}</span>
                                )}
                                <p className="text-muted-foreground text-xs mt-2">
                                  {source.is_active === false ? t('data.sources.expanded.inactiveScheduler') : source.is_critical ? t('data.sources.expanded.criticalSource') : t('data.sources.expanded.normalSource')}
                                </p>
                              </div>

                              {/* OS Links */}
                              <div>
                                <p className="text-muted-foreground mb-1 text-xs uppercase">OpenSanctions</p>
                                {source.os_url ? (
                                  <div className="space-y-1">
                                    <a
                                      href={source.os_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
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
                                        className="text-muted-foreground hover:text-muted-foreground text-xs flex items-center gap-1"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Download className="w-3 h-3" />
                                        {t('data.sources.expanded.dataUrl')}
                                      </a>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">N/A</span>
                                )}
                              </div>

                              {/* Smart Update URL */}
                              <div>
                                <p className="text-muted-foreground mb-1 text-xs uppercase">{t('data.sources.expanded.smartUpdateUrl')}</p>
                                {source.source_url ? (
                                  <a
                                    href={source.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-300 text-xs truncate block"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {source.source_url.length > 50
                                      ? source.source_url.substring(0, 50) + '...'
                                      : source.source_url}
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-xs">{t('data.sources.expanded.notConfigured')}</span>
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
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('data.sources.table.emptyTitle')}</p>
            </div>
          )}

          <div className="px-6 py-3 border-t border-foreground/5 text-sm text-muted-foreground flex justify-between">
            <span>{t('data.sources.table.showing', { shown: filteredSources.length, total: data?.sources?.length || 0 })}</span>
            <span>
              {t('data.sources.table.totals', {
                bronze: formatNumber(data?.total_bronze || 0),
                silver: formatNumber(data?.total_silver || 0),
                gold: formatNumber(data?.total_gold || 0),
              })}
            </span>
          </div>
        </div>
    </AppPage>
  );
}

export default SourcesDashboardPage;
