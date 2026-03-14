import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  Shield,
  Send,
  ChevronRight,
  Scale,
  TrendingUp,
  User,
  RefreshCw,
  ExternalLink,
  Gavel,
  FileWarning,
  Ban,
  HelpCircle,
  ArrowUpRight,
  CircleDot,
  Download,
  Printer,
  Hash,
  Building2,
  CalendarDays,
  Globe,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { complianceService } from '@/services/compliance';
import type { ComplianceAlert } from '@/services/compliance';
import { generateSarPdf } from '@/services/sarPdfExport';

// ── Mappings ──

const priorityConfig: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critico', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  high: { label: 'Alto', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  medium: { label: 'Medio', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  low: { label: 'Bajo', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open: { label: 'Abierto', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: CircleDot },
  in_review: { label: 'En Revision', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Scale },
  escalated: { label: 'Escalado', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', icon: ArrowUpRight },
  closed_tp: { label: 'Confirmado', color: 'bg-red-500/10 text-red-400 border-red-500/30', icon: AlertTriangle },
  closed_fp: { label: 'Descartado', color: 'bg-green-500/10 text-green-400 border-green-500/30', icon: CheckCircle },
  closed_inconclusive: { label: 'Inconcluso', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: HelpCircle },
  sar_filed: { label: 'SAR Presentado', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: FileWarning },
};

const decisionConfig: Record<string, { label: string; description: string; color: string; bgColor: string; icon: typeof Clock }> = {
  true_positive: {
    label: 'Verdadero Positivo',
    description: 'La persona coincide con la lista — requiere accion regulatoria',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 border-red-500/20',
    icon: AlertTriangle,
  },
  false_positive: {
    label: 'Falso Positivo',
    description: 'No es la misma persona — descartado y agregado a whitelist',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 border-green-500/20',
    icon: CheckCircle,
  },
  escalate: {
    label: 'Escalado',
    description: 'Requiere revision de un supervisor o MLRO',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    icon: ArrowUpRight,
  },
  inconclusive: {
    label: 'Inconcluso',
    description: 'Informacion insuficiente para determinar',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10 border-gray-500/20',
    icon: HelpCircle,
  },
};

const eventTypeConfig: Record<string, { label: string; icon: typeof Clock }> = {
  created: { label: 'Caso creado', icon: FileText },
  status_changed: { label: 'Estado actualizado', icon: RefreshCw },
  decision_made: { label: 'Decision registrada', icon: Gavel },
  note_added: { label: 'Nota agregada', icon: MessageSquare },
  alert_linked: { label: 'Alerta vinculada', icon: AlertTriangle },
  assigned: { label: 'Caso asignado', icon: User },
  escalated: { label: 'Caso escalado', icon: TrendingUp },
};

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  const diffDays = Math.floor(diffHrs / 24);
  return `Hace ${diffDays}d`;
}

// ── Component ──

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [noteContent, setNoteContent] = useState('');
  const [decisionDialog, setDecisionDialog] = useState<ComplianceAlert | null>(null);
  const [decisionType, setDecisionType] = useState<string>('');
  const [decisionReason, setDecisionReason] = useState('');
  const [showSarReport, setShowSarReport] = useState(false);
  const [sarReference, setSarReference] = useState('');
  const [showFileSarDialog, setShowFileSarDialog] = useState(false);
  const sarReportRef = useRef<HTMLDivElement>(null);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['compliance-case', caseId],
    queryFn: () => complianceService.getCase(caseId!),
    enabled: !!caseId,
  });

  const noteMutation = useMutation({
    mutationFn: (content: string) => complianceService.addNote(caseId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-case', caseId] });
      toast.success('Nota agregada');
      setNoteContent('');
    },
    onError: () => toast.error('Error al agregar nota'),
  });

  const decisionMutation = useMutation({
    mutationFn: (data: { alert_id: string; decision: string; reason: string }) =>
      complianceService.makeDecision(caseId!, data as Parameters<typeof complianceService.makeDecision>[1]),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-cases'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-alerts'] });
      if (result.whitelist_created) {
        toast.success('Whitelist creado — futuras alertas de este match seran suprimidas');
        queryClient.invalidateQueries({ queryKey: ['compliance-whitelist'] });
      } else {
        toast.success('Decision registrada');
      }
      setDecisionDialog(null);
      setDecisionType('');
      setDecisionReason('');
    },
    onError: () => toast.error('Error al registrar decision'),
  });

  // SAR Report
  const { data: sarReport, isLoading: sarLoading, refetch: fetchSarReport } = useQuery({
    queryKey: ['sar-report', caseId],
    queryFn: () => complianceService.getSARReport(caseId!),
    enabled: false, // Only fetch on demand
  });

  const fileSarMutation = useMutation({
    mutationFn: (reference: string) => complianceService.fileSAR(caseId!, reference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-case', caseId] });
      toast.success('SAR/ROS registrado exitosamente');
      setShowFileSarDialog(false);
      setSarReference('');
    },
    onError: () => toast.error('Error al registrar SAR'),
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  // Not found
  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Caso no encontrado</h2>
          <Button variant="ghost" onClick={() => navigate('/compliance')} className="text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </div>
    );
  }

  const alerts: ComplianceAlert[] = caseData.alerts || [];
  const notes: Array<Record<string, unknown>> = caseData.notes || [];
  const timeline: Array<Record<string, unknown>> = caseData.timeline || [];
  const decisions: Array<Record<string, unknown>> = caseData.decisions || [];
  const isClosed = caseData.status?.startsWith('closed') || caseData.status === 'sar_filed';
  const pendingAlerts = alerts.filter((a) => !a.decision);
  const decidedAlerts = alerts.filter((a) => a.decision);
  const status = statusConfig[caseData.status] || statusConfig.open;
  const priority = priorityConfig[caseData.priority] || priorityConfig.medium;
  const StatusIcon = status.icon;

  // Find the primary decision (most recent)
  const primaryDecision = decisions.length > 0 ? decisions[decisions.length - 1] : null;
  const primaryDecisionConfig = primaryDecision
    ? decisionConfig[String(primaryDecision.decision)] || null
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate('/compliance')}
          className="text-gray-400 hover:text-white mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Compliance
        </Button>

        {/* ═══════════════════════════════════════════
            RESOLUTION BANNER (only when case is closed)
            ═══════════════════════════════════════════ */}
        {isClosed && primaryDecisionConfig && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'rounded-2xl p-6 mb-6 border',
              primaryDecisionConfig.bgColor,
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', primaryDecisionConfig.bgColor)}>
                <primaryDecisionConfig.icon className={cn('w-6 h-6', primaryDecisionConfig.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className={cn('text-lg font-semibold', primaryDecisionConfig.color)}>
                    {primaryDecisionConfig.label}
                  </h2>
                  {caseData.closed_at && (
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(caseData.closed_at)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  {primaryDecisionConfig.description}
                </p>

                {/* Decision reason */}
                {primaryDecision?.reason && (
                  <div className="bg-black/20 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-1">Razon del analista:</p>
                    <p className="text-sm text-gray-300">{String(primaryDecision.reason)}</p>
                  </div>
                )}

                {/* Action items for True Positive */}
                {caseData.status === 'closed_tp' && !caseData.sar_filed && (
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <FileWarning className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span className="text-sm text-amber-400">
                        Accion pendiente: Presentar Reporte de Operacion Sospechosa (SAR/ROS)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { fetchSarReport(); setShowSarReport(true); }}
                        className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Ver Reporte
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowFileSarDialog(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Presentar SAR
                      </Button>
                    </div>
                  </div>
                )}
                {caseData.sar_filed && (
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-blue-400">SAR/ROS presentado ante el regulador</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { fetchSarReport(); setShowSarReport(true); }}
                      className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Ver Reporte
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            CASE HEADER
            ═══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-6"
        >
          {/* Top row: number + badges */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 font-mono">{caseData.case_number}</span>
              <Badge variant="outline" className={cn('text-xs gap-1', status.color)}>
                <StatusIcon className="w-3 h-3" />
                {status.label}
              </Badge>
              <Badge variant="outline" className={cn('text-xs', priority.color)}>
                {priority.label}
              </Badge>
              {caseData.sla_breached && (
                <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30 animate-pulse">
                  SLA Vencido
                </Badge>
              )}
            </div>
            {caseData.entity_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/entity/${caseData.entity_id}`)}
                className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Ver Entidad
              </Button>
            )}
          </div>

          {/* Entity name — the main subject */}
          <h1 className="text-2xl font-bold text-white mb-1">
            {caseData.entity_name || caseData.title}
          </h1>
          {caseData.description && (
            <p className="text-sm text-gray-500">{caseData.description}</p>
          )}

          {/* Key info grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Riesgo</p>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  (caseData.risk_score || 0) >= 90 ? 'bg-red-400' :
                  (caseData.risk_score || 0) >= 70 ? 'bg-orange-400' :
                  (caseData.risk_score || 0) >= 40 ? 'bg-yellow-400' : 'bg-green-400'
                )} />
                <span className="text-sm text-white font-mono">{Math.round(caseData.risk_score || 0)}/100</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Alertas</p>
              <p className="text-sm text-white">
                {decidedAlerts.length}/{alerts.length} revisadas
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">Creado</p>
              <p className="text-sm text-white">{formatDateTime(caseData.created_at)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-1">
                {isClosed ? 'Cerrado' : 'SLA'}
              </p>
              <p className="text-sm text-white">
                {isClosed
                  ? formatDateTime(caseData.closed_at)
                  : caseData.sla_deadline
                    ? formatDateTime(caseData.sla_deadline)
                    : '-'
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════
            ALERTS SECTION
            ═══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            Coincidencias detectadas
            <span className="text-xs text-gray-500 font-normal">({alerts.length})</span>
          </h2>

          {alerts.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500/50 mx-auto mb-3" />
              <p className="text-gray-500">Sin alertas vinculadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: ComplianceAlert) => {
                const alertDecision = alert.decision ? decisionConfig[alert.decision] : null;
                const AlertDecisionIcon = alertDecision?.icon || HelpCircle;

                return (
                  <div key={alert.id} className="glass rounded-xl overflow-hidden">
                    {/* Alert decision strip */}
                    {alertDecision && (
                      <div className={cn('px-5 py-2.5 flex items-center gap-2 border-b border-white/5', alertDecision.bgColor)}>
                        <AlertDecisionIcon className={cn('w-4 h-4', alertDecision.color)} />
                        <span className={cn('text-sm font-medium', alertDecision.color)}>
                          {alertDecision.label}
                        </span>
                        {alert.decided_at && (
                          <span className="text-xs text-gray-500 ml-auto">
                            {formatDateTime(alert.decided_at)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Entity matched */}
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-white font-medium truncate">{alert.matched_entity_name}</p>
                            <Badge variant="outline" className={cn('text-[10px] flex-shrink-0',
                              alert.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                              alert.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                              'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                            )}>
                              {alert.severity === 'critical' ? 'Critico' :
                               alert.severity === 'high' ? 'Alto' : 'Medio'}
                            </Badge>
                          </div>

                          {/* Match details — clean layout */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm mb-3">
                            <div>
                              <span className="text-gray-500">Busqueda: </span>
                              <span className="text-gray-300">"{alert.query_name}"</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Confianza: </span>
                              <span className={cn('font-mono',
                                alert.match_confidence >= 0.9 ? 'text-red-400' :
                                alert.match_confidence >= 0.7 ? 'text-orange-400' : 'text-yellow-400'
                              )}>
                                {Math.round(alert.match_confidence * 100)}%
                              </span>
                            </div>
                            {alert.entity_risk_score != null && (
                              <div>
                                <span className="text-gray-500">Riesgo: </span>
                                <span className="text-gray-300 font-mono">{alert.entity_risk_score}</span>
                              </div>
                            )}
                          </div>

                          {/* Sources as readable chips */}
                          {alert.matched_sources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {alert.matched_sources.map((s) => (
                                <span
                                  key={s}
                                  className="text-[11px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400/70 border border-blue-500/10"
                                >
                                  {s.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Decision reason inline */}
                          {alert.decision_reason && (
                            <div className="mt-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                              <p className="text-xs text-gray-500 mb-1">Razon:</p>
                              <p className="text-sm text-gray-300">{alert.decision_reason}</p>
                            </div>
                          )}
                        </div>

                        {/* Decision button — only for pending alerts on open cases */}
                        {!alert.decision && !isClosed && (
                          <div className="ml-4 flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => setDecisionDialog(alert)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Gavel className="w-3.5 h-3.5 mr-1.5" />
                              Decidir
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Progress indicator — only for open cases */}
          {alerts.length > 0 && !isClosed && (
            <div className="mt-4 glass rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Progreso de revision</span>
                <span className="text-xs text-gray-400">{decidedAlerts.length}/{alerts.length}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${alerts.length ? (decidedAlerts.length / alerts.length) * 100 : 0}%` }}
                />
              </div>
              {pendingAlerts.length === 0 && decidedAlerts.length > 0 && (
                <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Todas las alertas revisadas — el caso se cerrara automaticamente
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* ═══════════════════════════════════════════
            TIMELINE (always visible — tells the story of the case)
            ═══════════════════════════════════════════ */}
        {timeline.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Historial
            </h2>
            <div className="glass rounded-xl p-5">
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-white/10" />
                <div className="space-y-0">
                  {timeline.map((event, i) => {
                    const eventType = String(event.event_type || 'created');
                    const config = eventTypeConfig[eventType] || { label: eventType, icon: Clock };
                    const EventIcon = config.icon;
                    const details = event.details as Record<string, unknown> | null;

                    // Build a human-readable description
                    let description = '';
                    if (eventType === 'decision_made' && details?.decision) {
                      const dc = decisionConfig[String(details.decision)];
                      description = dc ? dc.label : String(details.decision);
                    } else if (eventType === 'status_changed' && details?.reason) {
                      description = String(details.reason);
                    } else if (eventType === 'created' && details?.priority) {
                      description = `Prioridad: ${priorityConfig[String(details.priority)]?.label || details.priority}`;
                    }

                    return (
                      <div key={i} className="relative pl-10 py-2.5">
                        <div className={cn(
                          'absolute left-1 w-[22px] h-[22px] rounded-full flex items-center justify-center z-10',
                          'bg-[#0a0a0a] border border-white/10',
                        )}>
                          <EventIcon className="w-3 h-3 text-gray-500" />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm text-gray-300">{config.label}</span>
                            {description && (
                              <span className="text-sm text-gray-500 ml-2">— {description}</span>
                            )}
                          </div>
                          <span className="text-[11px] text-gray-600 flex-shrink-0 ml-4">
                            {formatDateTime(event.created_at as string)}
                          </span>
                        </div>
                        {event.old_value && event.new_value && (
                          <div className="flex items-center gap-2 mt-1 text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                              {statusConfig[String(event.old_value)]?.label || String(event.old_value)}
                            </span>
                            <ChevronRight className="w-3 h-3 text-gray-600" />
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-white">
                              {statusConfig[String(event.new_value)]?.label || String(event.new_value)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════
            NOTES SECTION
            ═══════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            Notas
            {notes.length > 0 && (
              <span className="text-xs text-gray-500 font-normal">({notes.length})</span>
            )}
          </h2>

          {/* Add note form */}
          {!isClosed && (
            <div className="glass rounded-xl p-4 mb-3">
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Agregar una nota al caso..."
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 mb-3 min-h-[80px]"
                rows={2}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => noteContent.trim() && noteMutation.mutate(noteContent.trim())}
                  disabled={!noteContent.trim() || noteMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-3 h-3 mr-2" />
                  {noteMutation.isPending ? 'Guardando...' : 'Agregar nota'}
                </Button>
              </div>
            </div>
          )}

          {notes.length === 0 && isClosed ? null : notes.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Sin notas aun</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map((note) => (
                <div key={String(note.id)} className="glass rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {formatDateTime(note.created_at as string)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap pl-8">
                    {String(note.content || '')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════
          DECISION DIALOG
          ═══════════════════════════════════════════ */}
      <Dialog open={!!decisionDialog} onOpenChange={(open) => !open && setDecisionDialog(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Tomar Decision</DialogTitle>
          </DialogHeader>
          {decisionDialog && (
            <div className="space-y-5">
              {/* Context card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="text-white font-medium mb-1">{decisionDialog.matched_entity_name}</p>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span>Busqueda: "{decisionDialog.query_name}"</span>
                  <span className="text-gray-600">|</span>
                  <span className={cn('font-mono',
                    decisionDialog.match_confidence >= 0.9 ? 'text-red-400' :
                    decisionDialog.match_confidence >= 0.7 ? 'text-orange-400' : 'text-yellow-400'
                  )}>
                    {Math.round(decisionDialog.match_confidence * 100)}% confianza
                  </span>
                </div>
                {decisionDialog.matched_sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {decisionDialog.matched_sources.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary decisions */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Decision</p>
                <div className="grid grid-cols-2 gap-2">
                  {/* True Positive */}
                  <button
                    onClick={() => setDecisionType('true_positive')}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      decisionType === 'true_positive'
                        ? 'bg-red-500/15 border-red-500/60 text-white'
                        : 'border-white/10 text-gray-300 hover:bg-red-500/5 hover:border-red-500/20'
                    )}
                  >
                    <AlertTriangle className={cn('w-5 h-5 mb-2',
                      decisionType === 'true_positive' ? 'text-red-400' : 'text-gray-500'
                    )} />
                    <span className="text-sm font-medium block">Verdadero Positivo</span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      Coincide — requiere accion
                    </span>
                  </button>

                  {/* False Positive */}
                  <button
                    onClick={() => setDecisionType('false_positive')}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      decisionType === 'false_positive'
                        ? 'bg-green-500/15 border-green-500/60 text-white'
                        : 'border-white/10 text-gray-300 hover:bg-green-500/5 hover:border-green-500/20'
                    )}
                  >
                    <CheckCircle className={cn('w-5 h-5 mb-2',
                      decisionType === 'false_positive' ? 'text-green-400' : 'text-gray-500'
                    )} />
                    <span className="text-sm font-medium block">Falso Positivo</span>
                    <span className="text-[11px] text-gray-500 block mt-0.5">
                      No es la persona
                    </span>
                  </button>
                </div>

                {/* Secondary decisions */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => setDecisionType('escalate')}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      decisionType === 'escalate'
                        ? 'bg-orange-500/15 border-orange-500/60 text-white'
                        : 'border-white/10 text-gray-300 hover:bg-orange-500/5 hover:border-orange-500/20'
                    )}
                  >
                    <span className="text-sm font-medium">Escalar</span>
                    <span className="text-[11px] text-gray-500 block">Requiere supervisor</span>
                  </button>
                  <button
                    onClick={() => setDecisionType('inconclusive')}
                    className={cn(
                      'p-3 rounded-xl border-2 text-left transition-all',
                      decisionType === 'inconclusive'
                        ? 'bg-gray-500/15 border-gray-500/60 text-white'
                        : 'border-white/10 text-gray-300 hover:bg-gray-500/5 hover:border-gray-500/20'
                    )}
                  >
                    <span className="text-sm font-medium">Inconcluso</span>
                    <span className="text-[11px] text-gray-500 block">Info insuficiente</span>
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                  Justificacion (requerida)
                </label>
                <Textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Describe la razon de tu decision..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  rows={3}
                />
              </div>

              {/* Contextual warnings */}
              {decisionType === 'false_positive' && (
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/15 flex items-start gap-2">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-400/80">
                    Se creara un whitelist automaticamente para suprimir futuras alertas de este match.
                  </p>
                </div>
              )}
              {decisionType === 'true_positive' && (
                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400/80">
                    El caso se cerrara como confirmado. Deberas evaluar si se requiere presentar un SAR/ROS al regulador.
                  </p>
                </div>
              )}
              {decisionType === 'escalate' && (
                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/15 flex items-start gap-2">
                  <ArrowUpRight className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-400/80">
                    El caso se marcara como escalado. Un supervisor debera tomar la decision final.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button
                  variant="ghost"
                  onClick={() => setDecisionDialog(null)}
                  className="text-gray-400"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!decisionType || decisionReason.length < 5) {
                      toast.error('Selecciona una decision y justifica (min. 5 caracteres)');
                      return;
                    }
                    decisionMutation.mutate({
                      alert_id: decisionDialog.id,
                      decision: decisionType,
                      reason: decisionReason,
                    });
                  }}
                  disabled={!decisionType || decisionReason.length < 5 || decisionMutation.isPending}
                  className={cn(
                    'transition-colors',
                    decisionType === 'true_positive' ? 'bg-red-600 hover:bg-red-700' :
                    decisionType === 'false_positive' ? 'bg-green-600 hover:bg-green-700' :
                    decisionType === 'escalate' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  {decisionMutation.isPending ? 'Guardando...' : 'Confirmar Decision'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          SAR REPORT DIALOG
          ═══════════════════════════════════════════ */}
      <Dialog open={showSarReport} onOpenChange={setShowSarReport}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg flex items-center gap-2">
                <FileWarning className="w-5 h-5 text-amber-400" />
                Reporte de Actividad Sospechosa (SAR/ROS)
              </DialogTitle>
            </div>
          </DialogHeader>

          {sarLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : sarReport ? (
            <div ref={sarReportRef} className="space-y-5 py-2">
              {/* Report header */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Reporte SAR/ROS</p>
                    <p className="text-lg font-semibold text-white mt-1">
                      {(sarReport as any).sar_report?.case?.case_number || caseData.case_number}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Generado</p>
                    <p className="text-sm text-gray-300">
                      {formatDateTime((sarReport as any).sar_report?.generated_at)}
                    </p>
                  </div>
                </div>
                {(sarReport as any).sar_report?.case?.sar_reference && (
                  <div className="flex items-center gap-2 pt-2 border-t border-amber-500/10">
                    <Hash className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm text-amber-400">
                      Referencia: {(sarReport as any).sar_report.case.sar_reference}
                    </span>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Sujeto Investigado
                </h3>
                <div className="glass rounded-xl p-4">
                  <p className="text-white font-medium text-lg mb-2">
                    {(sarReport as any).sar_report?.subject?.entity_name || caseData.entity_name}
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {(sarReport as any).sar_report?.subject?.entity_type && (
                      <div>
                        <span className="text-gray-500">Tipo: </span>
                        <span className="text-gray-300">{(sarReport as any).sar_report.subject.entity_type}</span>
                      </div>
                    )}
                    {(sarReport as any).sar_report?.subject?.client_name && (
                      <div>
                        <span className="text-gray-500">Cliente: </span>
                        <span className="text-gray-300">{(sarReport as any).sar_report.subject.client_name}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Riesgo: </span>
                      <span className={cn('font-mono',
                        ((sarReport as any).sar_report?.case?.risk_score || 0) >= 70 ? 'text-red-400' : 'text-yellow-400'
                      )}>
                        {(sarReport as any).sar_report?.case?.risk_score || caseData.risk_score}/100
                        {' '}({(sarReport as any).sar_report?.case?.risk_level || caseData.risk_level})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Prioridad: </span>
                      <span className="text-gray-300">
                        {priorityConfig[(sarReport as any).sar_report?.case?.priority]?.label || caseData.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary stats */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ListChecks className="w-4 h-4" />
                  Resumen
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {(sarReport as any).sar_report?.summary?.total_alerts || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Alertas</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {(sarReport as any).sar_report?.summary?.true_positives || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Verdaderos Positivos</p>
                  </div>
                  <div className="glass rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {((sarReport as any).sar_report?.summary?.sources_involved || []).length}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Fuentes</p>
                  </div>
                </div>
              </div>

              {/* Sources involved */}
              {((sarReport as any).sar_report?.summary?.sources_involved || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Listas y Fuentes donde aparece
                  </h3>
                  <div className="glass rounded-xl p-4">
                    <div className="flex flex-wrap gap-2">
                      {((sarReport as any).sar_report?.summary?.sources_involved || []).map((s: string) => (
                        <span
                          key={s}
                          className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/15"
                        >
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Alerts detail */}
              {((sarReport as any).sar_report?.alerts || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Detalle de Alertas
                  </h3>
                  <div className="space-y-2">
                    {((sarReport as any).sar_report?.alerts || []).map((alert: any, i: number) => (
                      <div key={i} className="glass rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{alert.matched_entity}</span>
                          {alert.decision && (
                            <Badge variant="outline" className={cn('text-[10px]',
                              decisionConfig[alert.decision]?.bgColor || ''
                            )}>
                              <span className={decisionConfig[alert.decision]?.color}>
                                {decisionConfig[alert.decision]?.label || alert.decision}
                              </span>
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                          <div>Busqueda: "{alert.query_name}"</div>
                          <div>Confianza: <span className="font-mono text-white">{Math.round((alert.match_confidence || 0) * 100)}%</span></div>
                          <div>Riesgo: <span className="font-mono text-white">{alert.risk_score}</span></div>
                          <div>Tipo: {alert.alert_type}</div>
                        </div>
                        {alert.decision_reason && (
                          <div className="mt-2 p-2 rounded bg-white/[0.03] text-sm text-gray-400">
                            <span className="text-gray-500">Razon: </span>{alert.decision_reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Decisions */}
              {((sarReport as any).sar_report?.decisions || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Gavel className="w-4 h-4" />
                    Decisiones Formales
                  </h3>
                  <div className="space-y-2">
                    {((sarReport as any).sar_report?.decisions || []).map((dec: any, i: number) => (
                      <div key={i} className="glass rounded-xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn('font-medium', decisionConfig[dec.decision]?.color || 'text-white')}>
                            {decisionConfig[dec.decision]?.label || dec.decision}
                          </span>
                          <span className="text-xs text-gray-500">{formatDateTime(dec.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-400">{dec.reason}</p>
                        {dec.analyst_role && (
                          <p className="text-xs text-gray-500 mt-1">Rol: {dec.analyst_role}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {((sarReport as any).sar_report?.timeline || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Cronologia
                  </h3>
                  <div className="glass rounded-xl p-4">
                    <div className="space-y-2">
                      {((sarReport as any).sar_report?.timeline || []).map((event: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
                          <span className="text-gray-300">
                            {eventTypeConfig[event.event]?.label || event.event}
                          </span>
                          <span className="text-xs text-gray-500">{formatDateTime(event.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Notes (non-internal only) */}
              {((sarReport as any).sar_report?.notes || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Notas
                  </h3>
                  <div className="glass rounded-xl p-4 space-y-3">
                    {((sarReport as any).sar_report?.notes || []).map((note: any, i: number) => (
                      <div key={i} className="text-sm">
                        <p className="text-gray-300">{note.content}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDateTime(note.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Case info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Informacion del Caso
                </h3>
                <div className="glass rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Estado: </span>
                      <span className="text-gray-300">
                        {statusConfig[(sarReport as any).sar_report?.case?.status]?.label || (sarReport as any).sar_report?.case?.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Resolucion: </span>
                      <span className="text-gray-300">{(sarReport as any).sar_report?.case?.resolution || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Creado: </span>
                      <span className="text-gray-300">{formatDateTime((sarReport as any).sar_report?.case?.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Cerrado: </span>
                      <span className="text-gray-300">{formatDateTime((sarReport as any).sar_report?.case?.closed_at)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">SLA: </span>
                      <span className={cn('text-gray-300',
                        (sarReport as any).sar_report?.case?.sla_breached ? 'text-red-400' : ''
                      )}>
                        {(sarReport as any).sar_report?.case?.sla_breached ? 'Vencido' : 'Dentro de plazo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      try {
                        generateSarPdf(sarReport as any);
                        toast.success('PDF generado');
                      } catch {
                        toast.error('Error al generar PDF');
                      }
                    }}
                    className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Descargar PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const json = JSON.stringify((sarReport as any).sar_report, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `SAR_${caseData.case_number}_${new Date().toISOString().slice(0,10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Reporte descargado');
                    }}
                    className="text-gray-400 border-white/10 hover:bg-white/5"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    JSON
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowSarReport(false)}
                    className="text-gray-400"
                  >
                    Cerrar
                  </Button>
                  {!caseData.sar_filed && (
                    <Button
                      onClick={() => { setShowSarReport(false); setShowFileSarDialog(true); }}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Presentar SAR
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <XCircle className="w-12 h-12 text-red-400/50 mx-auto mb-3" />
              <p className="text-gray-400">No se pudo generar el reporte</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════
          FILE SAR DIALOG
          ═══════════════════════════════════════════ */}
      <Dialog open={showFileSarDialog} onOpenChange={setShowFileSarDialog}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-amber-400" />
              Registrar SAR/ROS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-400">
              Ingresa el numero de referencia del Reporte de Operacion Sospechosa
              presentado ante la autoridad reguladora (UIF/FinCEN).
            </p>

            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                Numero de referencia SAR/ROS
              </label>
              <Input
                value={sarReference}
                onChange={(e) => setSarReference(e.target.value)}
                placeholder="Ej: ROS-2026-00145 o SAR-20260314-001"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-400/80">
                <p className="font-medium mb-1">Esta accion es irreversible</p>
                <p>El caso se marcara como "SAR Presentado" y se registrara
                  en el historial de auditoria con fecha y referencia.</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setShowFileSarDialog(false)}
                className="text-gray-400"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (sarReference.trim().length < 3) {
                    toast.error('Ingresa un numero de referencia valido (min. 3 caracteres)');
                    return;
                  }
                  fileSarMutation.mutate(sarReference.trim());
                }}
                disabled={sarReference.trim().length < 3 || fileSarMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {fileSarMutation.isPending ? 'Registrando...' : 'Confirmar Presentacion'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseDetailPage;
