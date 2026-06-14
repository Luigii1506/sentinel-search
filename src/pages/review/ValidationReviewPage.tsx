/**
 * ValidationReviewPage — Cola de validation_alerts pendientes.
 *
 * Las alertas vienen del consensus engine cuando una claim de PEP queda en
 * FLAGGED_REVIEW o REJECTED. Operador debe decidir: aceptar, descartar o quarantine.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, XCircle, RefreshCw, Loader2, ExternalLink,
  Shield, Trash2,
} from 'lucide-react';
import {
  validationService,
  type ValidationAlert,
  type ValidationStats,
  type EntityEvidenceResponse,
} from '@/services/validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
  low: 'bg-blue-500 text-white',
};

export function ValidationReviewPage() {
  const [alerts, setAlerts] = useState<ValidationAlert[]>([]);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved'>('open');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<ValidationAlert | null>(null);
  const [evidence, setEvidence] = useState<EntityEvidenceResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        validationService.listAlerts({
          status: statusFilter,
          severity: (severityFilter as any) || undefined,
          limit: 200,
        }),
        validationService.getStats(),
      ]);
      setAlerts(alertsRes.alerts);
      setStats(statsRes);
    } catch (err: any) {
      toast.error(err?.message || 'Error loading alerts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDetail = async (alert: ValidationAlert) => {
    setSelectedAlert(alert);
    setEvidenceLoading(true);
    setEvidence(null);
    try {
      const ev = await validationService.getEntityEvidence(alert.entity_id, 100);
      setEvidence(ev);
    } catch (err: any) {
      toast.error(err?.message || 'Error loading evidence');
    } finally {
      setEvidenceLoading(false);
    }
  };

  const resolve = async (resolution: 'accept' | 'dismiss' | 'quarantine') => {
    if (!selectedAlert) return;
    setResolving(true);
    try {
      await validationService.resolveAlert(selectedAlert.id, resolution);
      toast.success(`Alert ${resolution}ed`);
      setSelectedAlert(null);
      setEvidence(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || 'Error resolving alert');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" /> Validation Review Queue
          </h1>
          <p className="text-muted-foreground">
            Alertas del consensus engine que requieren revisión humana
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats panel */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Open alerts</p>
            <p className="text-2xl font-bold">{stats.alerts_by_status.open ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold">{stats.alerts_by_status.resolved ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Entities audited</p>
            <p className="text-2xl font-bold">{stats.total_entities_audited.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Accepted high-conf</p>
            <p className="text-2xl font-bold">{(stats.evidence_by_decision.accepted_high ?? 0).toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Flagged + rejected</p>
            <p className="text-2xl font-bold">
              {((stats.evidence_by_decision.flagged_review ?? 0) + (stats.evidence_by_decision.rejected ?? 0)).toLocaleString()}
            </p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>
          </Tabs>
          <select
            className="border rounded px-3 py-1.5 text-sm bg-background"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="text-sm text-muted-foreground ml-auto">
            {alerts.length} alert{alerts.length !== 1 && 's'}
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts list */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>No alerts matching current filters.</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => openDetail(a)}
                    className={`p-3 border rounded cursor-pointer hover:bg-accent transition ${
                      selectedAlert?.id === a.id ? 'bg-accent border-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{a.canonical_name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                      </div>
                      <Badge className={SEVERITY_COLORS[a.severity] || ''}>{a.severity}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.alert_type} · {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Evidence</span>
              {selectedAlert && (
                <Button
                  size="sm" variant="outline"
                  onClick={() => navigate(`/entity/${selectedAlert.entity_id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" /> View entity
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedAlert ? (
              <p className="text-muted-foreground text-sm">Select an alert to see evidence</p>
            ) : evidenceLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : evidence ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{evidence.entity.canonical_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {evidence.entity.is_pep ? 'PEP' : 'Non-PEP'} · {evidence.entity.countries?.join(', ')}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Selected alert</h4>
                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="font-medium">{selectedAlert.alert_type}</p>
                    <p className="text-muted-foreground mt-1">{selectedAlert.description}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Evidence history ({evidence.evidence.length})
                  </h4>
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {evidence.evidence.slice(0, 20).map((ev) => (
                      <div key={ev.id} className="p-2 border rounded text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{ev.role_claim || '(no role)'}</span>
                          <Badge variant="outline" className="shrink-0">
                            {ev.decision} · {(ev.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        {ev.reasoning && (
                          <p className="text-muted-foreground mt-1 line-clamp-2">{ev.reasoning}</p>
                        )}
                        <p className="text-muted-foreground mt-1">
                          {ev.sources_supporting?.length || 0} support · {ev.sources_contradicting?.length || 0} contradict
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {statusFilter === 'open' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm" variant="default"
                      onClick={() => resolve('accept')}
                      disabled={resolving}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm" variant="destructive"
                      onClick={() => resolve('quarantine')}
                      disabled={resolving}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Quarantine
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => resolve('dismiss')}
                      disabled={resolving}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Dismiss
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No evidence available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ValidationReviewPage;
