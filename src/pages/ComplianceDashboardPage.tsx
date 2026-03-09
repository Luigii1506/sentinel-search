import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  Trash2,
  Plus,
  FileText,
  BarChart3,
  Users,
  Activity,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { complianceService } from '@/services/compliance';
import type {
  ComplianceCase,
  ComplianceAlert,
  WhitelistEntry,
  WatchlistEntry,
  ComplianceDashboard,
} from '@/services/compliance';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

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

// ── Stat Card ──

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-blue-400',
  bgColor = 'bg-blue-500/10',
}: {
  label: string;
  value: string | number;
  icon: typeof Shield;
  color?: string;
  bgColor?: string;
}) {
  return (
    <motion.div variants={itemVariants} className="glass rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-gray-400">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Cases Tab ──

function CasesTab() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-cases'],
    queryFn: () => complianceService.listCases({ limit: 50 }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const cases = data?.cases || [];

  if (cases.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Casos</h3>
        <p className="text-gray-400">No hay casos de investigación registrados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {cases.map((c: ComplianceCase) => (
        <motion.div
          key={c.id}
          variants={itemVariants}
          className="glass rounded-xl p-5 border-l-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
          style={{
            borderColor:
              c.priority === 'critical' ? '#ef4444' :
              c.priority === 'high' ? '#f97316' :
              c.priority === 'medium' ? '#eab308' : '#22c55e',
          }}
          onClick={() => navigate(`/compliance/cases/${c.id}`)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500 font-mono">{c.case_number}</span>
                <Badge variant="outline" className={cn('text-[10px]', statusColors[c.status])}>
                  {statusLabels[c.status] || c.status}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px]', priorityColors[c.priority])}>
                  {c.priority}
                </Badge>
                {c.sla_breached && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                    SLA Breach
                  </Badge>
                )}
              </div>
              <h4 className="text-white font-medium">{c.title}</h4>
              {c.entity_name && (
                <p className="text-sm text-gray-400 mt-1">Entidad: {c.entity_name}</p>
              )}
              {c.client_name && (
                <p className="text-xs text-gray-500">Cliente: {c.client_name}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleDateString('es-MX')}
                </p>
                {c.alerts_count > 0 && (
                  <Badge className="mt-1 bg-orange-500/20 text-orange-400 text-[10px]">
                    {c.alerts_count} alertas
                  </Badge>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          {c.tags && c.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {c.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ── Alerts Tab ──

function AlertsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: () => complianceService.listAlerts({ limit: 50 }),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  const alerts = data?.alerts || [];

  if (alerts.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Alertas</h3>
        <p className="text-gray-400">No hay alertas pendientes de revisión.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert: ComplianceAlert) => (
        <motion.div
          key={alert.id}
          variants={itemVariants}
          className="glass rounded-xl p-4"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
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
                    alert.decision === 'true_positive' ? 'bg-red-500/10 text-red-400' :
                    alert.decision === 'false_positive' ? 'bg-green-500/10 text-green-400' :
                    'bg-gray-500/10 text-gray-400'
                  )}>
                    {alert.decision === 'true_positive' ? 'TP' :
                     alert.decision === 'false_positive' ? 'FP' :
                     alert.decision}
                  </Badge>
                )}
              </div>
              <p className="text-white font-medium">{alert.matched_entity_name}</p>
              <p className="text-sm text-gray-400">
                Query: &quot;{alert.query_name}&quot; — Confianza: {Math.round(alert.match_confidence * 100)}%
              </p>
              {alert.matched_sources.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {alert.matched_sources.slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {new Date(alert.created_at).toLocaleDateString('es-MX')}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Whitelist Tab ──

function WhitelistTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-whitelist'],
    queryFn: () => complianceService.listWhitelist({ limit: 100 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => complianceService.removeFromWhitelist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-whitelist'] });
      toast.success('Entrada eliminada del whitelist');
    },
    onError: () => toast.error('Error al eliminar entrada'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const entries = data?.entries || [];

  if (entries.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Whitelist Vacío</h3>
        <p className="text-gray-400">
          No hay entradas de supresión. Los falsos positivos marcados aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400 mb-2">
        {data?.total || 0} entradas activas — Las búsquedas futuras omitirán estos matches.
      </p>
      {entries.map((entry: WhitelistEntry) => (
        <motion.div
          key={entry.id}
          variants={itemVariants}
          className="glass rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium">{entry.suppressed_entity_name}</span>
              {entry.is_permanent && (
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                  Permanente
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400">
              Query: &quot;{entry.query_name_normalized}&quot;
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Razón: {entry.reason}
            </p>
            {entry.expires_at && (
              <p className="text-xs text-gray-500">
                Expira: {new Date(entry.expires_at).toLocaleDateString('es-MX')}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMutation.mutate(entry.id)}
            disabled={removeMutation.isPending}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Watchlist Tab ──

function WatchlistTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-watchlist'],
    queryFn: () => complianceService.listWatchlist({ limit: 100 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => complianceService.removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-watchlist'] });
      toast.success('Entidad removida del monitoreo');
    },
    onError: () => toast.error('Error al remover entidad'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const entries = data?.entries || [];

  if (entries.length === 0) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Sin Monitoreo</h3>
        <p className="text-gray-400">
          No hay entidades bajo monitoreo continuo.
        </p>
      </div>
    );
  }

  const freqLabels: Record<string, string> = {
    realtime: 'Tiempo real',
    daily: 'Diario',
    weekly: 'Semanal',
    monthly: 'Mensual',
  };

  return (
    <div className="space-y-3">
      {entries.map((entry: WatchlistEntry) => (
        <motion.div
          key={entry.id}
          variants={itemVariants}
          className="glass rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium">{entry.entity_name}</span>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                {freqLabels[entry.monitoring_frequency] || entry.monitoring_frequency}
              </Badge>
              {entry.has_active_alerts && (
                <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                  Alertas activas
                </Badge>
              )}
              {entry.last_risk_level && (
                <Badge variant="outline" className={cn('text-[10px]',
                  entry.last_risk_level === 'critical' ? 'bg-red-500/10 text-red-400' :
                  entry.last_risk_level === 'high' ? 'bg-orange-500/10 text-orange-400' :
                  'bg-gray-500/10 text-gray-400'
                )}>
                  {entry.last_risk_level}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span>Screenings: {entry.total_screenings}</span>
              <span>Matches último: {entry.last_match_count}</span>
              {entry.last_screened_at && (
                <span>Último: {new Date(entry.last_screened_at).toLocaleDateString('es-MX')}</span>
              )}
              {entry.next_screen_at && (
                <span>Próximo: {new Date(entry.next_screen_at).toLocaleDateString('es-MX')}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMutation.mutate(entry.id)}
            disabled={removeMutation.isPending}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

// ── Create Case Dialog ──

function CreateCaseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [entityName, setEntityName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  const mutation = useMutation({
    mutationFn: () => complianceService.createCase({
      title,
      entity_name: entityName || undefined,
      priority,
      description: description || undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-cases'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
      toast.success('Caso creado exitosamente');
      onClose();
      setTitle(''); setEntityName(''); setPriority('medium'); setDescription(''); setTags('');
    },
    onError: () => toast.error('Error al crear caso'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Caso de Investigación</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-400">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Investigación coincidencia OFAC — Juan Pérez"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">Entidad</Label>
            <Input
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Nombre de la entidad (opcional)"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">Prioridad</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="critical" className="text-red-400">Critical</SelectItem>
                <SelectItem value="high" className="text-orange-400">High</SelectItem>
                <SelectItem value="medium" className="text-yellow-400">Medium</SelectItem>
                <SelectItem value="low" className="text-green-400">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400">Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del caso..."
              className="bg-white/5 border-white/10 text-white mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-gray-400">Tags (separados por coma)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="ej: pep, sanctions, high-risk"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={title.length < 3 || mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? 'Creando...' : 'Crear Caso'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Watchlist Dialog ──

function AddWatchlistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [entityName, setEntityName] = useState('');
  const [entityType, setEntityType] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [minConfidence, setMinConfidence] = useState('0.7');
  const [clientName, setClientName] = useState('');

  const mutation = useMutation({
    mutationFn: () => complianceService.addToWatchlist({
      entity_name: entityName,
      entity_type: entityType || undefined,
      monitoring_frequency: frequency,
      min_confidence: parseFloat(minConfidence),
      client_name: clientName || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-watchlist'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-dashboard'] });
      toast.success('Entidad agregada al monitoreo');
      onClose();
      setEntityName(''); setEntityType(''); setFrequency('daily'); setMinConfidence('0.7'); setClientName('');
    },
    onError: () => toast.error('Error al agregar al monitoreo'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar a Monitoreo Continuo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-400">Nombre de entidad *</Label>
            <Input
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Nombre a monitorear"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">Tipo de entidad</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="person" className="text-gray-300">Persona</SelectItem>
                <SelectItem value="company" className="text-gray-300">Empresa</SelectItem>
                <SelectItem value="vessel" className="text-gray-300">Embarcación</SelectItem>
                <SelectItem value="organization" className="text-gray-300">Organización</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400">Frecuencia de monitoreo</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1a] border-white/10">
                <SelectItem value="realtime" className="text-gray-300">Tiempo real</SelectItem>
                <SelectItem value="daily" className="text-gray-300">Diario</SelectItem>
                <SelectItem value="weekly" className="text-gray-300">Semanal</SelectItem>
                <SelectItem value="monthly" className="text-gray-300">Mensual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-400">Confianza mínima</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">Cliente (opcional)</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre del cliente"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={entityName.length < 2 || mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? 'Agregando...' : 'Agregar a Monitoreo'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Whitelist Dialog ──

function AddWhitelistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [queryName, setQueryName] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entityName, setEntityName] = useState('');
  const [reason, setReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => complianceService.addToWhitelist({
      query_name: queryName,
      suppressed_entity_id: entityId,
      suppressed_entity_name: entityName,
      reason,
      is_permanent: isPermanent,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-whitelist'] });
      toast.success('Entrada agregada al whitelist');
      onClose();
      setQueryName(''); setEntityId(''); setEntityName(''); setReason(''); setIsPermanent(false);
    },
    onError: () => toast.error('Error al agregar al whitelist'),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar al Whitelist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-400">Nombre de búsqueda (query) *</Label>
            <Input
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              placeholder="Ej: JUAN PEREZ GARCIA"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">ID de entidad a suprimir *</Label>
            <Input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="UUID de la entidad"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">Nombre de entidad *</Label>
            <Input
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="Nombre de la entidad a suprimir"
              className="bg-white/5 border-white/10 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-gray-400">Razón *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Razón para suprimir este match..."
              className="bg-white/5 border-white/10 text-white mt-1"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-permanent"
              checked={isPermanent}
              onChange={(e) => setIsPermanent(e.target.checked)}
              className="rounded bg-white/5 border-white/20"
            />
            <Label htmlFor="is-permanent" className="text-gray-400 cursor-pointer">
              Permanente (no expira)
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={queryName.length < 2 || !entityId || !entityName || reason.length < 5 || mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? 'Agregando...' : 'Agregar al Whitelist'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──

export function ComplianceDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [showAddWatchlist, setShowAddWatchlist] = useState(false);
  const [showAddWhitelist, setShowAddWhitelist] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['compliance-dashboard'],
    queryFn: () => complianceService.getDashboard(),
    refetchInterval: 60000,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Compliance Dashboard
            </h1>
            <p className="text-gray-400">
              Gestión de casos, alertas, whitelist y monitoreo continuo
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setShowCreateCase(true)}
              className="bg-blue-600 hover:bg-blue-700 gap-1"
            >
              <Plus className="w-4 h-4" />
              Nuevo Caso
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {dashboardLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </>
          ) : (
            <>
              <StatCard
                label="Casos Abiertos"
                value={dashboard?.cases?.open_cases ?? 0}
                icon={FileText}
                color="text-blue-400"
                bgColor="bg-blue-500/10"
              />
              <StatCard
                label="Alertas Pendientes"
                value={dashboard?.cases?.by_status?.open ?? 0}
                icon={AlertTriangle}
                color="text-orange-400"
                bgColor="bg-orange-500/10"
              />
              <StatCard
                label="Tasa FP"
                value={`${dashboard?.false_positives?.fp_rate ?? 0}%`}
                icon={XCircle}
                color="text-red-400"
                bgColor="bg-red-500/10"
              />
              <StatCard
                label="Entidades Monitoreadas"
                value={dashboard?.monitoring?.total_watched ?? 0}
                icon={Eye}
                color="text-purple-400"
                bgColor="bg-purple-500/10"
              />
            </>
          )}
        </motion.div>

        {/* FP/TP Stats Row */}
        {dashboard?.false_positives && dashboard.false_positives.total_decisions > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-5 mb-8"
          >
            <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Decisiones últimos {dashboard.false_positives.period_days} días
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-2xl font-bold text-white">{dashboard.false_positives.total_decisions}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{dashboard.false_positives.true_positives}</p>
                <p className="text-xs text-gray-500">Verdaderos Positivos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{dashboard.false_positives.false_positives}</p>
                <p className="text-xs text-gray-500">Falsos Positivos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{dashboard.false_positives.fp_rate}%</p>
                <p className="text-xs text-gray-500">Tasa FP</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{dashboard.false_positives.active_whitelist_entries}</p>
                <p className="text-xs text-gray-500">Whitelist Activos</p>
              </div>
            </div>
            {dashboard.false_positives.top_fp_entities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-xs text-gray-500 mb-2">Top entidades con más FP:</p>
                <div className="flex flex-wrap gap-2">
                  {dashboard.false_positives.top_fp_entities.slice(0, 5).map((e) => (
                    <Badge key={e.entity_name} variant="outline" className="text-xs bg-white/5 text-gray-400">
                      {e.entity_name} ({e.fp_count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white/5 border border-white/10 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">
                <FileText className="w-4 h-4 mr-2" />
                Casos
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-white/10">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Alertas
              </TabsTrigger>
              <TabsTrigger value="whitelist" className="data-[state=active]:bg-white/10">
                <Shield className="w-4 h-4 mr-2" />
                Whitelist
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="data-[state=active]:bg-white/10">
                <Eye className="w-4 h-4 mr-2" />
                Monitoreo
              </TabsTrigger>
            </TabsList>

            {/* Tab-specific actions */}
            {activeTab === 'watchlist' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddWatchlist(true)}
                className="gap-1 text-gray-400 border-white/10 hover:bg-white/5"
              >
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            )}
            {activeTab === 'whitelist' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddWhitelist(true)}
                className="gap-1 text-gray-400 border-white/10 hover:bg-white/5"
              >
                <Plus className="w-3 h-3" /> Agregar
              </Button>
            )}
          </div>

          <TabsContent value="overview">
            <CasesTab />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsTab />
          </TabsContent>

          <TabsContent value="whitelist">
            <WhitelistTab />
          </TabsContent>

          <TabsContent value="watchlist">
            <WatchlistTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateCaseDialog open={showCreateCase} onClose={() => setShowCreateCase(false)} />
      <AddWatchlistDialog open={showAddWatchlist} onClose={() => setShowAddWatchlist(false)} />
      <AddWhitelistDialog open={showAddWhitelist} onClose={() => setShowAddWhitelist(false)} />
    </div>
  );
}

export default ComplianceDashboardPage;
