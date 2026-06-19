import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, ExternalLink, Loader2, Trash2, ShieldCheck } from 'lucide-react';
import { validationService, type ValidationAlert } from '@/services/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppPage, EmptyState, MetricCard, PageHeader, PanelSkeleton } from '@/components/foundation';
import { toast } from 'sonner';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-blue-500 text-white',
};

export function ValidationReviewPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [selectedAlert, setSelectedAlert] = useState<ValidationAlert | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: alertsRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['validation-alerts', statusFilter, severityFilter],
    queryFn: () =>
      validationService.listAlerts({
        status: statusFilter,
        severity: (severityFilter as any) || undefined,
        limit: 200,
      }),
    refetchOnWindowFocus: false,
  });

  const { data: stats } = useQuery({
    queryKey: ['validation-alert-stats'],
    queryFn: () => validationService.getStats(),
    refetchOnWindowFocus: false,
  });

  const { data: evidence, isLoading: evidenceLoading } = useQuery({
    queryKey: ['validation-evidence', selectedAlert?.entity_id],
    queryFn: () => validationService.getEntityEvidence(selectedAlert!.entity_id, 100),
    enabled: Boolean(selectedAlert?.entity_id),
    refetchOnWindowFocus: false,
  });

  const resolveMutation = useMutation({
    mutationFn: ({ alertId, resolution }: { alertId: string; resolution: 'accept' | 'dismiss' | 'quarantine' }) =>
      validationService.resolveAlert(alertId, resolution),
    onSuccess: async (_data, variables) => {
      const resolutionLabel =
        variables.resolution === 'accept'
          ? t('review.validation.resolution.accepted')
          : variables.resolution === 'dismiss'
            ? t('review.validation.resolution.dismissed')
            : t('review.validation.resolution.quarantined');
      toast.success(t('review.validation.toast.alertResolved', { resolution: resolutionLabel }));
      setSelectedAlert(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['validation-alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['validation-alert-stats'] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.message || t('review.validation.toast.resolveError'));
    },
  });

  const alerts = alertsRes?.alerts ?? [];

  useEffect(() => {
    if (selectedAlert && !alerts.some((alert) => alert.id === selectedAlert.id)) {
      setSelectedAlert(null);
    }
  }, [alerts, selectedAlert]);

  return (
    <AppPage>
      <PageHeader
        title={t('review.validation.title')}
        description={t('review.validation.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
        actions={
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
            <RefreshCw className="w-4 h-4 mr-2" /> {t('common.actions.refresh')}
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label={t('review.validation.stats.openAlerts')} value={stats.alerts_by_status.open ?? 0} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label={t('review.validation.stats.resolved')} value={stats.alerts_by_status.resolved ?? 0} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label={t('review.validation.stats.entitiesAudited')} value={stats.total_entities_audited.toLocaleString()} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label={t('review.validation.stats.acceptedHighConf')} value={(stats.evidence_by_decision.accepted_high ?? 0).toLocaleString()} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label={t('review.validation.stats.flaggedRejected')} value={((stats.evidence_by_decision.flagged_review ?? 0) + (stats.evidence_by_decision.rejected ?? 0)).toLocaleString()} accent="amber" className="bg-foreground/5 border-foreground/10" />
        </div>
      )}

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'open' | 'resolved')}>
            <TabsList>
              <TabsTrigger value="open">{t('review.validation.tabs.open')}</TabsTrigger>
              <TabsTrigger value="resolved">{t('review.validation.tabs.resolved')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <select className="border rounded px-3 py-1.5 text-sm bg-background" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">{t('review.validation.severity.all')}</option>
            <option value="critical">{t('common.risk.critical')}</option>
            <option value="high">{t('common.risk.high')}</option>
            <option value="medium">{t('common.risk.medium')}</option>
            <option value="low">{t('common.risk.low')}</option>
          </select>
          <span className="text-sm text-muted-foreground ml-auto">{t('review.validation.alertCount', { count: alerts.length })}</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('review.validation.alertsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={4} />
            ) : alerts.length === 0 ? (
              <EmptyState icon={AlertTriangle} title={t('review.validation.emptyTitle')} description={t('review.validation.emptyDescription')} />
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {alerts.map((a) => (
                  <div key={a.id} onClick={() => setSelectedAlert(a)} className={`p-3 border rounded cursor-pointer hover:bg-accent transition ${selectedAlert?.id === a.id ? 'bg-accent border-primary' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{a.canonical_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                      </div>
                      <Badge className={SEVERITY_COLORS[a.severity] || ''}>{a.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{a.alert_type} · {new Date(a.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('review.validation.evidence')}</span>
              {selectedAlert && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/entity/${selectedAlert.entity_id}`)}>
                  <ExternalLink className="w-4 h-4 mr-1" /> {t('review.validation.viewEntity')}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAlert ? (
              <p className="text-muted-foreground text-sm">{t('review.validation.selectAlertPrompt')}</p>
            ) : evidenceLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : evidence ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{evidence.entity.canonical_name}</h3>
                  <p className="text-xs text-muted-foreground">{evidence.entity.is_pep ? 'PEP' : t('review.validation.nonPep')} · {evidence.entity.countries?.join(', ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t('review.validation.selectedAlert')}</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="font-medium">{selectedAlert.alert_type}</p>
                    <p className="text-muted-foreground mt-1">{selectedAlert.description}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">{t('review.validation.evidenceHistory', { count: evidence.evidence.length })}</h4>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {evidence.evidence.slice(0, 20).map((ev) => (
                      <div key={ev.id} className="p-2 border rounded text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{ev.role_claim || t('review.validation.noRole')}</span>
                          <Badge variant="outline" className="shrink-0">{ev.decision} · {(ev.confidence * 100).toFixed(0)}%</Badge>
                        </div>
                        {ev.reasoning && <p className="text-muted-foreground mt-1 line-clamp-2">{ev.reasoning}</p>}
                        <p className="text-muted-foreground mt-1">{t('review.validation.supportContradict', { support: ev.sources_supporting?.length || 0, contradict: ev.sources_contradicting?.length || 0 })}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {statusFilter === 'open' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="default" onClick={() => resolveMutation.mutate({ alertId: selectedAlert.id, resolution: 'accept' })} disabled={resolveMutation.isPending}>
                      <CheckCircle className="w-4 h-4 mr-1" /> {t('review.validation.actions.accept')}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => resolveMutation.mutate({ alertId: selectedAlert.id, resolution: 'quarantine' })} disabled={resolveMutation.isPending}>
                      <Trash2 className="w-4 h-4 mr-1" /> {t('review.validation.actions.quarantine')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ alertId: selectedAlert.id, resolution: 'dismiss' })} disabled={resolveMutation.isPending}>
                      <XCircle className="w-4 h-4 mr-1" /> {t('review.validation.actions.dismiss')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('review.validation.noEvidence')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}

export default ValidationReviewPage;
