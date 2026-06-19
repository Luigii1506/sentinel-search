import { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Database,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Server,
  Wifi,
  HardDrive,
  Search,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';
import {
  AppPage,
  EmptyState,
  HealthDot,
  ListPageSkeleton,
  MetricCard,
  PanelSkeleton,
  PageHeader,
  Section,
  SectionCard,
} from '@/components/foundation';
import { staggerContainer, fadeUpItem } from '@/lib/motion';
import type {
  MonitoringOverviewResponse,
} from '@/types/api';

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const MonitoringJobsSection = lazy(() => import('@/components/monitoring/MonitoringJobsSection'));

export function MonitoringPage() {
  const { t } = useTranslation();
  const { data: overview, isLoading: jobsLoading, error: jobsError, refetch: refetchJobs } = useQuery<MonitoringOverviewResponse>({
    queryKey: ['admin', 'monitoring', 'overview'],
    queryFn: () => adminService.getMonitoringOverview(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
  });

  if (jobsLoading) {
    return <ListPageSkeleton metricCards={4} rowCount={2} rowHeightClassName="h-96" />;
  }

  if (jobsError) {
    return (
      <AppPage>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t('insights.monitoring.error.title')}</h2>
          <p className="text-muted-foreground mb-4">{t('insights.monitoring.error.description')}</p>
          <Button onClick={() => refetchJobs()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('common.actions.retry')}
          </Button>
        </div>
      </AppPage>
    );
  }

  const jobs = overview?.jobs;
  const health = overview?.system_health;
  const detailed = overview?.detailed_health;
  const freshness = overview?.freshness_slo;
  const dataQuality = overview?.data_quality;
  const taskDlq = overview?.task_dlq;
  const redisDurability = overview?.redis_durability;
  const disappeared = overview?.disappeared_sources;
  const runtimeHealth = overview?.runtime_health;

  const stats = jobs?.stats || {};
  const running = stats.running || 0;
  const success = (stats.success || 0) + (stats.completed || 0);
  const failed = stats.failed || 0;
  const pending = stats.pending || 0;
  const totalJobs = running + success + failed + pending;

  const counts = detailed?.counts;
  const services = health?.services;
  const freshnessBreached = freshness?.total_breached || 0;
  const freshnessNeverSynced = freshness?.total_never_synced || 0;
  const taskDeadLetters = taskDlq?.stats?.dead_letter || 0;
  const disappearedMarked = disappeared?.marked_disappeared?.length || 0;
  const mappingCoverage = dataQuality?.ratios?.mapping_coverage ?? 0;
  const goldDedup = dataQuality?.ratios?.gold_dedup ?? 0;
  const topViolations = freshness?.violations?.slice(0, 5) || [];
  const topDlq = taskDlq?.dead_letters?.slice(0, 5) || [];
  const runtimeAlerting = runtimeHealth?.alerting_sources || 0;
  const changedNotMaterialized = runtimeHealth?.sources?.filter((item) => item.changed_not_materialized).length || 0;
  const runtimeTracked = runtimeHealth?.total_sources || 0;
  const snapshotsHealth = overview?.snapshots_health;
  const snapshotsStale = snapshotsHealth?.stale_snapshots || 0;
  const snapshotsCritical = snapshotsHealth?.critical_snapshots || 0;
  const dataQualitySnapshot = snapshotsHealth?.snapshots?.find((s) => s.scope === 'data_quality');
  const dataQualityAgeSeconds = dataQualitySnapshot?.age_seconds ?? null;

  const entityMetricCards = counts ? [
    { label: 'Bronze', value: formatNumber(counts.bronze), icon: Layers, iconClassName: 'text-amber-700 dark:text-amber-400' },
    { label: 'Silver', value: formatNumber(counts.silver), icon: Layers, iconClassName: 'text-muted-foreground' },
    { label: 'Gold', value: formatNumber(counts.gold), icon: Layers, iconClassName: 'text-yellow-700 dark:text-yellow-400' },
  ] : [];

  const jobMetricCards = [
    { label: t('insights.monitoring.jobs.running'), value: running, icon: Play, iconClassName: 'text-blue-600 dark:text-blue-400' },
    { label: t('insights.monitoring.jobs.success'), value: success, icon: CheckCircle2, iconClassName: 'text-green-700 dark:text-green-400' },
    { label: t('insights.monitoring.jobs.failed'), value: failed, icon: XCircle, iconClassName: 'text-red-600 dark:text-red-400' },
    { label: t('insights.monitoring.jobs.totalJobs'), value: totalJobs, icon: TrendingUp, iconClassName: 'text-purple-600 dark:text-purple-400' },
  ];

  const operationalMetricCards = [
    { label: t('insights.monitoring.operational.sloBreached'), value: freshnessBreached, icon: AlertCircle, iconClassName: 'text-orange-700 dark:text-orange-400' },
    { label: t('insights.monitoring.operational.neverSynced'), value: freshnessNeverSynced, icon: Clock, iconClassName: 'text-muted-foreground' },
    { label: t('insights.monitoring.operational.coverage'), value: `${Math.round(mappingCoverage * 100)}%`, icon: Database, iconClassName: 'text-green-700 dark:text-green-400' },
    { label: t('insights.monitoring.operational.dedupGold'), value: `${Math.round(goldDedup * 100)}%`, icon: Layers, iconClassName: 'text-yellow-700 dark:text-yellow-400' },
    { label: t('insights.monitoring.operational.dlqTasks'), value: taskDeadLetters, icon: XCircle, iconClassName: 'text-red-600 dark:text-red-400' },
    { label: t('insights.monitoring.operational.disappeared'), value: disappearedMarked, icon: AlertCircle, iconClassName: 'text-fuchsia-600 dark:text-fuchsia-400' },
    { label: t('insights.monitoring.operational.runtime'), value: runtimeTracked, icon: Server, iconClassName: 'text-cyan-700 dark:text-cyan-400' },
    { label: t('insights.monitoring.operational.alerting'), value: runtimeAlerting, icon: AlertCircle, iconClassName: 'text-red-600 dark:text-red-400' },
    { label: t('insights.monitoring.operational.pendingChange'), value: changedNotMaterialized, icon: RefreshCw, iconClassName: 'text-amber-700 dark:text-amber-400' },
  ];

  const formatRelativeAge = (seconds: number | null | undefined): string => {
    if (seconds == null) return t('insights.monitoring.relativeAge.noData');
    if (seconds < 60) return t('insights.monitoring.relativeAge.seconds', { count: seconds });
    if (seconds < 3600) return t('insights.monitoring.relativeAge.minutes', { count: Math.floor(seconds / 60) });
    if (seconds < 86400) return t('insights.monitoring.relativeAge.hours', { count: Math.floor(seconds / 3600) });
    return t('insights.monitoring.relativeAge.days', { count: Math.floor(seconds / 86400) });
  };

  return (
    <AppPage>
      <PageHeader
        title={t('insights.monitoring.title')}
        description={t('insights.monitoring.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
        actions={
          <>
            {dataQualitySnapshot && (
              <div
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                  dataQualitySnapshot.is_critical
                    ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300'
                    : dataQualitySnapshot.is_stale
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-foreground/10 bg-foreground/5 text-muted-foreground'
                }`}
                title={dataQualitySnapshot.computed_at ? t('insights.monitoring.snapshotAt', { date: dataQualitySnapshot.computed_at }) : t('insights.monitoring.noSnapshot')}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  dataQualitySnapshot.is_critical
                    ? 'bg-red-400'
                    : dataQualitySnapshot.is_stale
                      ? 'bg-amber-400'
                      : 'bg-green-400'
                }`} />
                <span>{t('insights.monitoring.dataLabel')} {formatRelativeAge(dataQualityAgeSeconds)}</span>
              </div>
            )}
            <Button variant="outline" onClick={() => refetchJobs()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.actions.refresh')}
            </Button>
          </>
        }
      />

        {services && (
          <Section title={<span className="flex items-center gap-2"><Server className="w-5 h-5 text-muted-foreground" />{t('insights.monitoring.sections.services')}</span>} className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4"
            >
              <Card className="bg-card border-foreground/5"><CardContent className="p-4 flex items-center gap-3"><HealthDot status={services.api?.status} label="API" icon={Server} detail={services.api?.status === 'ok' ? t('insights.monitoring.services.operational') : t('common.states.error')} variant="card" /></CardContent></Card>
              <Card className="bg-card border-foreground/5"><CardContent className="p-4 flex items-center gap-3"><HealthDot status={services.database?.status} label="PostgreSQL" icon={HardDrive} detail={`${services.database?.latency_ms ?? '-'}ms`} variant="card" /></CardContent></Card>
              <Card className="bg-card border-foreground/5"><CardContent className="p-4 flex items-center gap-3"><HealthDot status={services.redis?.status} label="Redis" icon={Wifi} detail={`${services.redis?.latency_ms ?? '-'}ms`} variant="card" /></CardContent></Card>
              <Card className="bg-card border-foreground/5"><CardContent className="p-4 flex items-center gap-3"><HealthDot status={services.opensearch?.status} label="OpenSearch" icon={Search} detail={`${services.opensearch?.latency_ms ?? '-'}ms`} variant="card" /></CardContent></Card>
            </motion.div>
          </Section>
        )}

        <Section title={t('insights.monitoring.sections.volumeAndJobs')} className="mb-8">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
            {entityMetricCards.map((item) => (
              <motion.div key={item.label} variants={fadeUpItem}>
                <MetricCard label={item.label} value={item.value} icon={item.icon} className="bg-card border-foreground/5" />
              </motion.div>
            ))}
            {jobMetricCards.map((item) => (
              <motion.div key={item.label} variants={fadeUpItem}>
                <MetricCard label={item.label} value={item.value} icon={item.icon} className="bg-card border-foreground/5" />
              </motion.div>
            ))}
          </motion.div>
        </Section>

        <Section title={t('insights.monitoring.sections.operationalSignals')} description={snapshotsCritical > 0 ? t('insights.monitoring.snapshots.critical', { count: snapshotsCritical }) : snapshotsStale > 0 ? t('insights.monitoring.snapshots.stale', { count: snapshotsStale }) : t('insights.monitoring.snapshots.healthy')} className="mb-8">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10">
            {operationalMetricCards.map((item) => (
              <motion.div key={item.label} variants={fadeUpItem}>
                <MetricCard label={item.label} value={item.value} icon={item.icon} className="bg-card border-foreground/5" />
              </motion.div>
            ))}
            <motion.div variants={fadeUpItem}>
              <MetricCard
                label={t('insights.monitoring.operational.snapshots')}
                value={`${(snapshotsHealth?.total_snapshots || 0) - snapshotsStale}/${snapshotsHealth?.total_snapshots || 0}`}
                icon={HardDrive}
                className={snapshotsCritical > 0 ? 'bg-card border-red-500/30' : snapshotsStale > 0 ? 'bg-card border-amber-500/30' : 'bg-card border-foreground/5'}
              />
            </motion.div>
          </motion.div>
        </Section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SectionCard title={t('insights.monitoring.freshness.title')} className="h-full">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-foreground/5 p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('insights.monitoring.freshness.evaluatedSources')}</p>
                  <p className="text-xl font-bold text-foreground">{freshness?.total_sources || 0}</p>
                </div>
                <div className="rounded-lg bg-foreground/5 p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('insights.monitoring.freshness.redisDurability')}</p>
                  <p className="text-sm font-medium text-foreground">
                    {redisDurability?.connected
                      ? `${redisDurability.aof_enabled ? 'AOF on' : 'AOF off'} / ${redisDurability.rdb_enabled ? 'RDB on' : 'RDB off'}`
                      : t('insights.monitoring.relativeAge.noData')}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-3">{t('insights.monitoring.freshness.topSloViolations')}</p>
                <div className="space-y-2">
                  {topViolations.length > 0 ? topViolations.map((item) => (
                    <div key={item.source_id} className="rounded-lg bg-foreground/5 p-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-foreground font-medium">{item.source_id}</p>
                        <p className="text-xs text-muted-foreground">
                          Tier {item.tier} · {item.age_hours.toFixed(1)}h · SLO {item.slo_hours}h
                        </p>
                      </div>
                      <Badge className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20">
                        {item.status}
                      </Badge>
                    </div>
                  )) : (
                    <EmptyState
                      icon={CheckCircle2}
                      title={t('insights.monitoring.freshness.emptyTitle')}
                      description={t('insights.monitoring.freshness.emptyDescription')}
                      tone="success"
                      className="p-6 sm:p-6"
                    />
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('insights.monitoring.dlq.title')} className="h-full">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-foreground/5 p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('insights.monitoring.dlq.silverUnmapped')}</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(dataQuality?.counts?.silver_unmapped || 0)}</p>
                </div>
                <div className="rounded-lg bg-foreground/5 p-3">
                  <p className="text-xs text-muted-foreground mb-1">{t('insights.monitoring.dlq.goldScreenable')}</p>
                  <p className="text-xl font-bold text-foreground">{formatNumber(dataQuality?.counts?.gold_screenable || 0)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-3">{t('insights.monitoring.dlq.topDeadLetters')}</p>
                <div className="space-y-2">
                  {topDlq.length > 0 ? topDlq.map((item) => (
                    <div key={item.id} className="rounded-lg bg-foreground/5 p-3">
                      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{item.source || item.task_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.step} · {item.task_name}</p>
                        </div>
                        <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                          {item.attempts}/{item.max_attempts}
                        </Badge>
                      </div>
                      {item.last_error && (
                        <p className="text-xs text-red-600 dark:text-red-300/80 mt-2 truncate">{item.last_error}</p>
                      )}
                    </div>
                  )) : (
                    <EmptyState
                      icon={CheckCircle2}
                      title={t('insights.monitoring.dlq.emptyTitle')}
                      description={t('insights.monitoring.dlq.emptyDescription')}
                      tone="success"
                      className="p-6 sm:p-6"
                    />
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        <Suspense
          fallback={
            <div className="space-y-6">
              <PanelSkeleton lines={5} className="min-h-[220px]" />
              <PanelSkeleton lines={8} className="min-h-[320px]" />
            </div>
          }
        >
          <MonitoringJobsSection jobs={jobs} />
        </Suspense>
    </AppPage>
  );
}

export default MonitoringPage;
