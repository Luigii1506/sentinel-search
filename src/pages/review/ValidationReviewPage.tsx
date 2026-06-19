import { useEffect, useState } from 'react';
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
      toast.success(`Alerta ${variables.resolution === 'accept' ? 'aceptada' : variables.resolution === 'dismiss' ? 'descartada' : 'en cuarentena'}`);
      setSelectedAlert(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['validation-alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['validation-alert-stats'] }),
      ]);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Error resolving alert');
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
        title="Cola de validacion"
        description="Alertas del consensus engine que requieren revisión humana"
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
        actions={
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isFetching}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refrescar
          </Button>
        }
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="Alertas abiertas" value={stats.alerts_by_status.open ?? 0} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label="Resueltas" value={stats.alerts_by_status.resolved ?? 0} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label="Entidades auditadas" value={stats.total_entities_audited.toLocaleString()} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label="Aceptadas alta conf." value={(stats.evidence_by_decision.accepted_high ?? 0).toLocaleString()} className="bg-foreground/5 border-foreground/10" />
          <MetricCard label="Marcadas + rechazadas" value={((stats.evidence_by_decision.flagged_review ?? 0) + (stats.evidence_by_decision.rejected ?? 0)).toLocaleString()} accent="amber" className="bg-foreground/5 border-foreground/10" />
        </div>
      )}

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'open' | 'resolved')}>
            <TabsList>
              <TabsTrigger value="open">Abiertas</TabsTrigger>
              <TabsTrigger value="resolved">Resueltas</TabsTrigger>
            </TabsList>
          </Tabs>
          <select className="border rounded px-3 py-1.5 text-sm bg-background" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="">Todas las severidades</option>
            <option value="critical">Critica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <span className="text-sm text-muted-foreground ml-auto">{alerts.length} alerta{alerts.length !== 1 && 's'}</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PanelSkeleton className="rounded-xl border border-foreground/5 bg-foreground/[0.02] p-6" lines={4} />
            ) : alerts.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Sin alertas" description="No hay alertas que coincidan con los filtros actuales." />
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
              <span>Evidencia</span>
              {selectedAlert && (
                <Button size="sm" variant="outline" onClick={() => navigate(`/entity/${selectedAlert.entity_id}`)}>
                  <ExternalLink className="w-4 h-4 mr-1" /> Ver entidad
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAlert ? (
              <p className="text-muted-foreground text-sm">Selecciona una alerta para ver la evidencia</p>
            ) : evidenceLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : evidence ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{evidence.entity.canonical_name}</h3>
                  <p className="text-xs text-muted-foreground">{evidence.entity.is_pep ? 'PEP' : 'Non-PEP'} · {evidence.entity.countries?.join(', ')}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Selected alert</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="font-medium">{selectedAlert.alert_type}</p>
                    <p className="text-muted-foreground mt-1">{selectedAlert.description}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Evidencia history ({evidence.evidence.length})</h4>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {evidence.evidence.slice(0, 20).map((ev) => (
                      <div key={ev.id} className="p-2 border rounded text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{ev.role_claim || '(no role)'}</span>
                          <Badge variant="outline" className="shrink-0">{ev.decision} · {(ev.confidence * 100).toFixed(0)}%</Badge>
                        </div>
                        {ev.reasoning && <p className="text-muted-foreground mt-1 line-clamp-2">{ev.reasoning}</p>}
                        <p className="text-muted-foreground mt-1">{ev.sources_supporting?.length || 0} support · {ev.sources_contradicting?.length || 0} contradict</p>
                      </div>
                    ))}
                  </div>
                </div>
                {statusFilter === 'open' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button size="sm" variant="default" onClick={() => resolveMutation.mutate({ alertId: selectedAlert.id, resolution: 'accept' })} disabled={resolveMutation.isPending}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Aceptar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => resolveMutation.mutate({ alertId: selectedAlert.id, resolution: 'quarantine' })} disabled={resolveMutation.isPending}>
                      <Trash2 className="w-4 h-4 mr-1" /> Cuarentena
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ alertId: selectedAlert.id, resolution: 'dismiss' })} disabled={resolveMutation.isPending}>
                      <XCircle className="w-4 h-4 mr-1" /> Descartar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay evidencia disponible</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppPage>
  );
}

export default ValidationReviewPage;
