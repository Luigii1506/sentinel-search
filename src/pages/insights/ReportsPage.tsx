import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  AlertTriangle,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { complianceService } from '@/services/compliance';
import type { ComplianceReport } from '@/services/compliance';
import { AppPage, PageHeader, ListPageSkeleton, MetricCard, EmptyState, SectionCard } from '@/components/foundation';
import { Card, CardContent } from '@/components/ui/card';

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  high: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const statusLabels: Record<string, string> = {
    open: t('insights.reports.caseStatus.open'),
    in_review: t('insights.reports.caseStatus.in_review'),
    escalated: t('insights.reports.caseStatus.escalated'),
    closed_tp: t('insights.reports.caseStatus.closed_tp'),
    closed_fp: t('insights.reports.caseStatus.closed_fp'),
    closed_inconclusive: t('insights.reports.caseStatus.closed_inconclusive'),
    sar_filed: t('insights.reports.caseStatus.sar_filed'),
  };
  const [period, setPeriod] = useState('30');

  const { data: report, isLoading } = useQuery<ComplianceReport>({
    queryKey: ['compliance-report', period],
    queryFn: () => complianceService.getComplianceReport(parseInt(period)),
    staleTime: 60_000,
  });

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${period}d-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <ListPageSkeleton width="default" metricCards={4} rowCount={4} rowHeightClassName="h-64" showFilters={false} />;
  }

  return (
    <AppPage width="default">
      <PageHeader
        title={t('insights.reports.title')}
        description={t('insights.reports.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
        actions={
          <>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-full sm:w-[160px] bg-card border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('insights.reports.period.last7')}</SelectItem>
                <SelectItem value="30">{t('insights.reports.period.last30')}</SelectItem>
                <SelectItem value="90">{t('insights.reports.period.last90')}</SelectItem>
                <SelectItem value="365">{t('insights.reports.period.lastYear')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}>
              <Download className="w-4 h-4 mr-2" />
              {t('common.actions.export')}
            </Button>
          </>
        }
      />

      {report && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard
              icon={AlertTriangle}
              label={t('insights.reports.kpi.alertsGenerated')}
              value={report.alerts.total}
              className="bg-card border-foreground/5"
            />
            <MetricCard
              icon={Shield}
              label={t('insights.reports.kpi.casesCreated')}
              value={report.cases.total}
              className="bg-card border-foreground/5"
            />
            <MetricCard
              icon={CheckCircle}
              label={t('insights.reports.kpi.slaCompliance')}
              value={`${report.cases.sla_compliance_pct}%`}
              accent={report.cases.sla_compliance_pct >= 90 ? 'success' : 'red'}
              className="bg-card border-foreground/5"
            />
            <MetricCard
              icon={XCircle}
              label={t('insights.reports.kpi.fpRate')}
              value={`${report.decisions.fp_rate_pct}%`}
              accent={report.decisions.fp_rate_pct <= 30 ? 'success' : 'amber'}
              className="bg-card border-foreground/5"
            />
          </div>

          {/* Detail Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alertas por Severidad */}
            <SectionCard title={t('insights.reports.sections.alertsBySeverity')} icon={AlertTriangle}>
              <div className="space-y-3">
                {Object.entries(report.alerts.by_severity).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <Badge variant="outline" className={cn('text-xs', severityColors[severity])}>
                      {severity.toUpperCase()}
                    </Badge>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', {
                            'bg-red-500': severity === 'critical',
                            'bg-orange-500': severity === 'high',
                            'bg-yellow-500': severity === 'medium',
                            'bg-blue-500': severity === 'low',
                          })}
                          style={{ width: `${Math.min((count / Math.max(report.alerts.total, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono text-foreground w-12 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(report.alerts.by_severity).length === 0 && (
                  <EmptyState
                    icon={CheckCircle}
                    title={t('insights.reports.empty.noAlerts')}
                    tone="success"
                  />
                )}
              </div>
            </SectionCard>

            {/* Casos por Estado */}
            <SectionCard title={t('insights.reports.sections.casesByStatus')} icon={Shield}>
              <div className="space-y-3">
                {Object.entries(report.cases.by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground w-32">{statusLabels[status] || status}</span>
                    <div className="flex-1 mx-4">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min((count / Math.max(report.cases.total, 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-mono text-foreground w-12 text-right">{count}</span>
                  </div>
                ))}
                {Object.keys(report.cases.by_status).length === 0 && (
                  <EmptyState icon={Shield} title={t('insights.reports.empty.noCases')} />
                )}
              </div>
            </SectionCard>

            {/* Decisiones */}
            <SectionCard title={t('insights.reports.sections.analystDecisions')} icon={TrendingUp}>
              {report.decisions.total > 0 ? (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">{report.decisions.true_positive}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t('insights.reports.decisions.truePositives')}</div>
                    </div>
                    <div className="flex-1 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{report.decisions.false_positive}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t('insights.reports.decisions.falsePositives')}</div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground">{t('insights.reports.decisions.fpRateLabel')} </span>
                    <span className={cn('text-lg font-bold', {
                      'text-green-700 dark:text-green-400': report.decisions.fp_rate_pct <= 30,
                      'text-yellow-700 dark:text-yellow-400': report.decisions.fp_rate_pct > 30 && report.decisions.fp_rate_pct <= 60,
                      'text-red-600 dark:text-red-400': report.decisions.fp_rate_pct > 60,
                    })}>
                      {report.decisions.fp_rate_pct}%
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyState icon={TrendingUp} title={t('insights.reports.empty.noDecisions')} />
              )}
            </SectionCard>

            {/* Métricas Operativas */}
            <SectionCard title={t('insights.reports.sections.operationalMetrics')} icon={Clock}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('insights.reports.operational.avgResolution')}</span>
                  <span className="text-sm font-mono text-foreground">
                    {report.cases.avg_resolution_hours
                      ? `${report.cases.avg_resolution_hours}h`
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('insights.reports.operational.sarsFiled')}</span>
                  <span className="text-sm font-mono text-foreground">{report.cases.sar_filed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('insights.reports.operational.monitoredEntities')}</span>
                  <span className="text-sm font-mono text-foreground">{report.monitoring.watchlist_active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('insights.reports.operational.activeWhitelist')}</span>
                  <span className="text-sm font-mono text-foreground">{report.monitoring.whitelist_active}</span>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Top Entities */}
          {report.top_entities.length > 0 && (
            <Card className="mt-6 bg-card border-foreground/5">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {t('insights.reports.topEntities.title')}
                </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 px-3">#</th>
                      <th className="text-left py-2 px-3">{t('insights.reports.topEntities.entity')}</th>
                      <th className="text-right py-2 px-3">{t('insights.reports.topEntities.alerts')}</th>
                      <th className="text-right py-2 px-3">{t('insights.reports.topEntities.riskScore')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_entities.map((entity, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-2 px-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-3 text-foreground font-medium">{entity.name}</td>
                        <td className="py-2 px-3 text-right font-mono">{entity.alert_count}</td>
                        <td className="py-2 px-3 text-right">
                          <Badge variant="outline" className={cn('text-xs', {
                            'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30': entity.max_risk >= 90,
                            'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30': entity.max_risk >= 70 && entity.max_risk < 90,
                            'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30': entity.max_risk >= 40 && entity.max_risk < 70,
                            'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30': entity.max_risk < 40,
                          })}>
                            {entity.max_risk}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </CardContent>
            </Card>
          )}

          {/* Generated timestamp */}
          <div className="mt-4 text-xs text-muted-foreground text-right">
            {t('insights.reports.generatedAt', { date: new Date(report.generated_at).toLocaleString('es-MX') })}
          </div>
        </>
      )}
    </AppPage>
  );
}
