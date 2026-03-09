import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { complianceService } from '@/services/compliance';
import type { ComplianceAlert } from '@/services/compliance';

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/10 text-green-400 border-green-500/30',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  in_review: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  pending_decision: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  escalated: 'bg-red-500/10 text-red-400 border-red-500/30',
  closed: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
  archived: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

const statusLabels: Record<string, string> = {
  open: 'Abierto',
  in_review: 'En Revisión',
  pending_decision: 'Pendiente',
  escalated: 'Escalado',
  closed: 'Cerrado',
  archived: 'Archivado',
};

const eventTypeIcons: Record<string, typeof Clock> = {
  created: FileText,
  status_change: RefreshCw,
  decision_made: Scale,
  note_added: MessageSquare,
  alert_linked: AlertTriangle,
  assigned: User,
  escalated: TrendingUp,
};

const eventTypeLabels: Record<string, string> = {
  created: 'Caso creado',
  status_change: 'Estado actualizado',
  decision_made: 'Decisión registrada',
  note_added: 'Nota agregada',
  alert_linked: 'Alerta vinculada',
  assigned: 'Caso asignado',
  escalated: 'Caso escalado',
};

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('alerts');
  const [noteContent, setNoteContent] = useState('');
  const [decisionDialog, setDecisionDialog] = useState<ComplianceAlert | null>(null);
  const [decisionType, setDecisionType] = useState<string>('');
  const [decisionReason, setDecisionReason] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['compliance-case', caseId],
    queryFn: () => complianceService.getCase(caseId!),
    enabled: !!caseId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, resolution }: { status: string; resolution?: string }) =>
      complianceService.updateCaseStatus(caseId!, status, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-cases'] });
      toast.success('Estado actualizado');
      setNewStatus('');
    },
    onError: () => toast.error('Error al actualizar estado'),
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
      complianceService.makeDecision(caseId!, data as any),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['compliance-case', caseId] });
      queryClient.invalidateQueries({ queryKey: ['compliance-alerts'] });
      if (result.whitelist_created) {
        toast.success('Decisión registrada — Whitelist creado automáticamente');
        queryClient.invalidateQueries({ queryKey: ['compliance-whitelist'] });
      } else {
        toast.success('Decisión registrada');
      }
      setDecisionDialog(null);
      setDecisionType('');
      setDecisionReason('');
    },
    onError: () => toast.error('Error al registrar decisión'),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl text-white mb-2">Caso no encontrado</h2>
          <Button variant="ghost" onClick={() => navigate('/compliance')} className="text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>
      </div>
    );
  }

  const alerts = caseData.alerts || [];
  const decisions = caseData.decisions || [];
  const notes = caseData.notes || [];
  const timeline = caseData.timeline || [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <Button
          variant="ghost"
          onClick={() => navigate('/compliance')}
          className="text-gray-400 hover:text-white mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Compliance
        </Button>

        {/* Case Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-gray-500 font-mono">{caseData.case_number}</span>
                <Badge variant="outline" className={cn('text-xs', statusColors[caseData.status])}>
                  {statusLabels[caseData.status] || caseData.status}
                </Badge>
                <Badge variant="outline" className={cn('text-xs', priorityColors[caseData.priority])}>
                  {caseData.priority}
                </Badge>
                {caseData.sla_breached && (
                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                    SLA Breach
                  </Badge>
                )}
                {caseData.sar_filed && (
                  <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                    SAR Filed
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-white">{caseData.title}</h1>
              {caseData.description && (
                <p className="text-gray-400 mt-2 text-sm">{caseData.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/5">
            {caseData.entity_name && (
              <div>
                <p className="text-xs text-gray-500">Entidad</p>
                <p className="text-sm text-white">{caseData.entity_name}</p>
              </div>
            )}
            {caseData.client_name && (
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="text-sm text-white">{caseData.client_name}</p>
              </div>
            )}
            {caseData.risk_score != null && (
              <div>
                <p className="text-xs text-gray-500">Risk Score</p>
                <p className="text-sm text-white">{caseData.risk_score}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Creado</p>
              <p className="text-sm text-white">{formatDateTime(caseData.created_at)}</p>
            </div>
          </div>

          {/* Status Update */}
          {caseData.status !== 'closed' && caseData.status !== 'archived' && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Cambiar estado..." />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1a] border-white/10">
                  <SelectItem value="in_review" className="text-gray-300">En Revisión</SelectItem>
                  <SelectItem value="pending_decision" className="text-gray-300">Pendiente</SelectItem>
                  <SelectItem value="escalated" className="text-gray-300">Escalar</SelectItem>
                  <SelectItem value="closed" className="text-gray-300">Cerrar</SelectItem>
                </SelectContent>
              </Select>
              {newStatus && (
                <Button
                  size="sm"
                  onClick={() => statusMutation.mutate({ status: newStatus })}
                  disabled={statusMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Actualizar
                </Button>
              )}
            </div>
          )}

          {caseData.tags && caseData.tags.length > 0 && (
            <div className="flex gap-1 mt-4">
              {caseData.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="alerts" className="data-[state=active]:bg-white/10">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alertas
              {alerts.length > 0 && (
                <Badge className="ml-2 bg-orange-500/20 text-orange-400 text-[10px]">
                  {alerts.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="decisions" className="data-[state=active]:bg-white/10">
              <Scale className="w-4 h-4 mr-2" />
              Decisiones
              {decisions.length > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 text-[10px]">
                  {decisions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-white/10">
              <MessageSquare className="w-4 h-4 mr-2" />
              Notas
              {notes.length > 0 && (
                <Badge className="ml-2 bg-gray-500/20 text-gray-400 text-[10px]">
                  {notes.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-white/10">
              <Clock className="w-4 h-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            {alerts.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Alertas</h3>
                <p className="text-gray-400">Este caso no tiene alertas vinculadas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert: ComplianceAlert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={cn('text-[10px]',
                            alert.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            alert.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                            'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                          )}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-white/5 text-gray-400">
                            {alert.alert_type}
                          </Badge>
                          {alert.decision && (
                            <Badge variant="outline" className={cn('text-[10px]',
                              alert.decision === 'true_positive' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                              alert.decision === 'false_positive' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                              alert.decision === 'escalate' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                              'bg-gray-500/10 text-gray-400 border-gray-500/30'
                            )}>
                              {alert.decision === 'true_positive' ? 'True Positive' :
                               alert.decision === 'false_positive' ? 'False Positive' :
                               alert.decision === 'escalate' ? 'Escalado' :
                               alert.decision}
                            </Badge>
                          )}
                        </div>
                        <p className="text-white font-medium">{alert.matched_entity_name}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Query: &quot;{alert.query_name}&quot;
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>Confianza: {Math.round(alert.match_confidence * 100)}%</span>
                          {alert.match_type && <span>Tipo: {alert.match_type}</span>}
                          {alert.entity_risk_level && <span>Riesgo: {alert.entity_risk_level}</span>}
                        </div>
                        {alert.matched_sources.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {alert.matched_sources.map((s) => (
                              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                        {alert.decision_reason && (
                          <div className="mt-3 p-3 rounded-lg bg-white/5">
                            <p className="text-xs text-gray-500 mb-1">Razón de decisión:</p>
                            <p className="text-sm text-gray-300">{alert.decision_reason}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-xs text-gray-500">{formatDateTime(alert.created_at)}</p>
                        {!alert.decision && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDecisionDialog(alert)}
                            className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                          >
                            <Scale className="w-3 h-3 mr-1" />
                            Decidir
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Decisions Tab */}
          <TabsContent value="decisions">
            {decisions.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Scale className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Decisiones</h3>
                <p className="text-gray-400">No se han tomado decisiones en este caso.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {decisions.map((d: any) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className={cn('text-xs',
                            d.decision === 'true_positive' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                            d.decision === 'false_positive' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                            d.decision === 'escalate' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                            'bg-gray-500/10 text-gray-400 border-gray-500/30'
                          )}>
                            {d.decision === 'true_positive' ? 'True Positive' :
                             d.decision === 'false_positive' ? 'False Positive' :
                             d.decision === 'escalate' ? 'Escalado' :
                             d.decision === 'inconclusive' ? 'Inconcluso' :
                             d.decision}
                          </Badge>
                          {d.requires_approval && (
                            <Badge variant="outline" className={cn('text-[10px]',
                              d.approval_status === 'approved' ? 'bg-green-500/10 text-green-400' :
                              d.approval_status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                              'bg-amber-500/10 text-amber-400'
                            )}>
                              {d.approval_status || 'Pendiente aprobación'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm">{d.reason}</p>
                      </div>
                      <p className="text-xs text-gray-500">{formatDateTime(d.created_at)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes">
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Agregar nota</h3>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Escribe una nota sobre este caso..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 mb-3"
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={() => noteContent.trim() && noteMutation.mutate(noteContent.trim())}
                  disabled={!noteContent.trim() || noteMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="w-3 h-3 mr-2" />
                  {noteMutation.isPending ? 'Guardando...' : 'Agregar Nota'}
                </Button>
              </div>

              {/* Notes List */}
              {notes.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Sin notas aún.</p>
                </div>
              ) : (
                notes.map((note: any) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        {note.is_internal && (
                          <Badge variant="outline" className="text-[10px] bg-white/5 text-gray-500">
                            Interna
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{formatDateTime(note.created_at)}</p>
                    </div>
                    <p className="text-gray-300 text-sm whitespace-pre-wrap">{note.content}</p>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            {timeline.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">Sin Actividad</h3>
                <p className="text-gray-400">No hay eventos registrados en el timeline.</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-white/10" />
                <div className="space-y-0">
                  {timeline.map((event: any, i: number) => {
                    const EventIcon = eventTypeIcons[event.event_type] || Clock;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative pl-14 py-4"
                      >
                        <div className="absolute left-3 w-7 h-7 rounded-full bg-[#0a0a0a] border-2 border-white/10 flex items-center justify-center">
                          <EventIcon className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="glass rounded-lg p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white">
                              {eventTypeLabels[event.event_type] || event.event_type}
                            </span>
                            <span className="text-xs text-gray-500">{formatDateTime(event.created_at)}</span>
                          </div>
                          {event.details && (
                            <p className="text-sm text-gray-400">{event.details}</p>
                          )}
                          {event.old_value && event.new_value && (
                            <div className="flex items-center gap-2 mt-1 text-xs">
                              <span className="text-gray-500">{event.old_value}</span>
                              <ChevronRight className="w-3 h-3 text-gray-600" />
                              <span className="text-white">{event.new_value}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Decision Dialog */}
      <Dialog open={!!decisionDialog} onOpenChange={(open) => !open && setDecisionDialog(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Tomar Decisión</DialogTitle>
          </DialogHeader>
          {decisionDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-sm text-gray-400">Entidad:</p>
                <p className="text-white font-medium">{decisionDialog.matched_entity_name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Query: &quot;{decisionDialog.query_name}&quot; — Confianza: {Math.round(decisionDialog.match_confidence * 100)}%
                </p>
                {decisionDialog.matched_sources.length > 0 && (
                  <div className="flex gap-1 mt-2">
                    {decisionDialog.matched_sources.map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">{s}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Decisión</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'true_positive', label: 'True Positive', color: 'border-red-500/50 hover:bg-red-500/10', activeColor: 'bg-red-500/20 border-red-500' },
                    { value: 'false_positive', label: 'False Positive', color: 'border-green-500/50 hover:bg-green-500/10', activeColor: 'bg-green-500/20 border-green-500' },
                    { value: 'escalate', label: 'Escalar', color: 'border-orange-500/50 hover:bg-orange-500/10', activeColor: 'bg-orange-500/20 border-orange-500' },
                    { value: 'inconclusive', label: 'Inconcluso', color: 'border-gray-500/50 hover:bg-gray-500/10', activeColor: 'bg-gray-500/20 border-gray-500' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDecisionType(opt.value)}
                      className={cn(
                        'p-3 rounded-lg border-2 text-sm font-medium transition-all',
                        decisionType === opt.value
                          ? opt.activeColor + ' text-white'
                          : opt.color + ' text-gray-300 border-white/10'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Razón (requerida)</label>
                <Textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder="Describe la razón de tu decisión..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                  rows={3}
                />
              </div>

              {decisionType === 'false_positive' && (
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                  <p className="text-xs text-green-400">
                    <Shield className="w-3 h-3 inline mr-1" />
                    Al marcar como False Positive, se creará automáticamente una entrada en el whitelist
                    para suprimir futuras alertas de este par query-entidad.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
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
                      toast.error('Selecciona una decisión y proporciona una razón (mín. 5 caracteres)');
                      return;
                    }
                    decisionMutation.mutate({
                      alert_id: decisionDialog.id,
                      decision: decisionType,
                      reason: decisionReason,
                    });
                  }}
                  disabled={!decisionType || decisionReason.length < 5 || decisionMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {decisionMutation.isPending ? 'Guardando...' : 'Confirmar Decisión'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CaseDetailPage;
