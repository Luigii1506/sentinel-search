import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  Plus,
  FileText,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { AppPage, PageHeader, EmptyState, MetricCard } from '@/components/foundation';
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
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  high: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30',
  medium: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  low: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  in_review: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  pending_decision: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  escalated: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  closed: 'bg-gray-500/10 text-muted-foreground border-gray-500/30',
  archived: 'bg-gray-500/10 text-muted-foreground border-gray-500/20',
};

// ── Stat Card ──

// ── Cases Tab ──

function CasesTab() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      <EmptyState
        icon={FileText}
        title={t('compliance.cases.empty.title')}
        description={t('compliance.cases.empty.description')}
      />
    );
  }

  return (
    <div className="space-y-3">
      {cases.map((c: ComplianceCase) => (
        <motion.div
          key={c.id}
          variants={itemVariants}
          className="glass rounded-xl p-5 border-l-4 cursor-pointer hover:bg-foreground/[0.02] transition-colors"
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
                <span className="text-xs text-muted-foreground font-mono">{c.case_number}</span>
                <Badge variant="outline" className={cn('text-[10px]', statusColors[c.status])}>
                  {t(`compliance.caseStatus.${c.status}`, { defaultValue: c.status })}
                </Badge>
                <Badge variant="outline" className={cn('text-[10px]', priorityColors[c.priority])}>
                  {c.priority}
                </Badge>
                {c.sla_breached && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                    SLA Breach
                  </Badge>
                )}
              </div>
              <h4 className="text-foreground font-medium">{c.title}</h4>
              {c.entity_name && (
                <p className="text-sm text-muted-foreground mt-1">{t('compliance.cases.entity')}: {c.entity_name}</p>
              )}
              {c.client_name && (
                <p className="text-xs text-muted-foreground">{t('compliance.cases.client')}: {c.client_name}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('es-MX')}
                </p>
                {c.alerts_count > 0 && (
                  <Badge className="mt-1 bg-orange-500/20 text-orange-700 dark:text-orange-400 text-[10px]">
                    {t('compliance.cases.alertsCount', { count: c.alerts_count })}
                  </Badge>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
          {c.tags && c.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {c.tags.map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground">
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
  const { t } = useTranslation();
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
      <EmptyState
        icon={CheckCircle}
        title={t('compliance.alerts.empty.title')}
        description={t('compliance.alerts.empty.description')}
        tone="success"
      />
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
                  alert.severity === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' :
                  alert.severity === 'high' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30' :
                  'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                )}>
                  {alert.severity}
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-foreground/5 text-muted-foreground">
                  {alert.alert_type}
                </Badge>
                {alert.decision && (
                  <Badge variant="outline" className={cn('text-[10px]',
                    alert.decision === 'true_positive' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                    alert.decision === 'false_positive' ? 'bg-green-500/10 text-green-700 dark:text-green-400' :
                    'bg-gray-500/10 text-muted-foreground'
                  )}>
                    {alert.decision === 'true_positive' ? 'TP' :
                     alert.decision === 'false_positive' ? 'FP' :
                     alert.decision}
                  </Badge>
                )}
              </div>
              <p className="text-foreground font-medium">{alert.matched_entity_name}</p>
              <p className="text-sm text-muted-foreground">
                {t('compliance.alerts.query')}: &quot;{alert.query_name}&quot; — {t('compliance.alerts.confidence')}: {Math.round(alert.match_confidence * 100)}%
              </p>
              {alert.matched_sources.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {alert.matched_sources.slice(0, 3).map((s) => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/5 text-muted-foreground">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-whitelist'],
    queryFn: () => complianceService.listWhitelist({ limit: 100 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => complianceService.removeFromWhitelist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-whitelist'] });
      toast.success(t('compliance.whitelist.toast.removed'));
    },
    onError: () => toast.error(t('compliance.whitelist.toast.removeError')),
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
      <EmptyState
        icon={Shield}
        title={t('compliance.whitelist.empty.title')}
        description={t('compliance.whitelist.empty.description')}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-2">
        {t('compliance.whitelist.activeSummary', { count: data?.total || 0 })}
      </p>
      {entries.map((entry: WhitelistEntry) => (
        <motion.div
          key={entry.id}
          variants={itemVariants}
          className="glass rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-foreground font-medium">{entry.suppressed_entity_name}</span>
              {entry.is_permanent && (
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  {t('compliance.whitelist.permanent')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('compliance.alerts.query')}: &quot;{entry.query_name_normalized}&quot;
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('compliance.whitelist.reason')}: {entry.reason}
            </p>
            {entry.expires_at && (
              <p className="text-xs text-muted-foreground">
                {t('compliance.whitelist.expires')}: {new Date(entry.expires_at).toLocaleDateString('es-MX')}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMutation.mutate(entry.id)}
            disabled={removeMutation.isPending}
            className="text-red-600 dark:text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['compliance-watchlist'],
    queryFn: () => complianceService.listWatchlist({ limit: 100 }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => complianceService.removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-watchlist'] });
      toast.success(t('compliance.watchlist.toast.removed'));
    },
    onError: () => toast.error(t('compliance.watchlist.toast.removeError')),
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
      <EmptyState
        icon={Eye}
        title={t('compliance.watchlist.empty.title')}
        description={t('compliance.watchlist.empty.description')}
      />
    );
  }

  const freqLabels: Record<string, string> = {
    realtime: t('compliance.watchlist.frequency.realtime'),
    daily: t('compliance.watchlist.frequency.daily'),
    weekly: t('compliance.watchlist.frequency.weekly'),
    monthly: t('compliance.watchlist.frequency.monthly'),
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
              <span className="text-foreground font-medium">{entry.entity_name}</span>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                {freqLabels[entry.monitoring_frequency] || entry.monitoring_frequency}
              </Badge>
              {entry.has_active_alerts && (
                <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30">
                  {t('compliance.watchlist.activeAlerts')}
                </Badge>
              )}
              {entry.last_risk_level && (
                <Badge variant="outline" className={cn('text-[10px]',
                  entry.last_risk_level === 'critical' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                  entry.last_risk_level === 'high' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-400' :
                  'bg-gray-500/10 text-muted-foreground'
                )}>
                  {entry.last_risk_level}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>{t('compliance.watchlist.screenings')}: {entry.total_screenings}</span>
              <span>{t('compliance.watchlist.lastMatches')}: {entry.last_match_count}</span>
              {entry.last_screened_at && (
                <span>{t('compliance.watchlist.last')}: {new Date(entry.last_screened_at).toLocaleDateString('es-MX')}</span>
              )}
              {entry.next_screen_at && (
                <span>{t('compliance.watchlist.next')}: {new Date(entry.next_screen_at).toLocaleDateString('es-MX')}</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeMutation.mutate(entry.id)}
            disabled={removeMutation.isPending}
            className="text-red-600 dark:text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
  const { t } = useTranslation();
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
      toast.success(t('compliance.createCase.toast.created'));
      onClose();
      setTitle(''); setEntityName(''); setPriority('medium'); setDescription(''); setTags('');
    },
    onError: () => toast.error(t('compliance.createCase.toast.error')),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-foreground/10 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('compliance.createCase.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">{t('compliance.createCase.fields.title')} *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('compliance.createCase.placeholders.title')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.createCase.fields.entity')}</Label>
            <Input
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder={t('compliance.createCase.placeholders.entity')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.createCase.fields.priority')}</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-foreground/5 border-foreground/10 text-foreground mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                <SelectItem value="critical" className="text-red-600 dark:text-red-400">{t('common.risk.critical')}</SelectItem>
                <SelectItem value="high" className="text-orange-700 dark:text-orange-400">{t('common.risk.high')}</SelectItem>
                <SelectItem value="medium" className="text-yellow-700 dark:text-yellow-400">{t('common.risk.medium')}</SelectItem>
                <SelectItem value="low" className="text-green-700 dark:text-green-400">{t('common.risk.low')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.createCase.fields.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('compliance.createCase.placeholders.description')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
              rows={3}
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.createCase.fields.tags')}</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t('compliance.createCase.placeholders.tags')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">{t('common.actions.cancel')}</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={title.length < 3 || mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? t('compliance.createCase.creating') : t('compliance.createCase.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Watchlist Dialog ──

function AddWatchlistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
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
      toast.success(t('compliance.addWatchlist.toast.added'));
      onClose();
      setEntityName(''); setEntityType(''); setFrequency('daily'); setMinConfidence('0.7'); setClientName('');
    },
    onError: () => toast.error(t('compliance.addWatchlist.toast.error')),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-foreground/10 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('compliance.addWatchlist.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWatchlist.fields.entityName')} *</Label>
            <Input
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder={t('compliance.addWatchlist.placeholders.entityName')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWatchlist.fields.entityType')}</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="bg-foreground/5 border-foreground/10 text-foreground mt-1">
                <SelectValue placeholder={t('compliance.addWatchlist.placeholders.select')} />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                <SelectItem value="person" className="text-muted-foreground">{t('common.entityType.person')}</SelectItem>
                <SelectItem value="company" className="text-muted-foreground">{t('common.entityType.company')}</SelectItem>
                <SelectItem value="vessel" className="text-muted-foreground">{t('common.entityType.vessel')}</SelectItem>
                <SelectItem value="organization" className="text-muted-foreground">{t('common.entityType.organization')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWatchlist.fields.frequency')}</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger className="bg-foreground/5 border-foreground/10 text-foreground mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-foreground/10">
                <SelectItem value="realtime" className="text-muted-foreground">{t('compliance.watchlist.frequency.realtime')}</SelectItem>
                <SelectItem value="daily" className="text-muted-foreground">{t('compliance.watchlist.frequency.daily')}</SelectItem>
                <SelectItem value="weekly" className="text-muted-foreground">{t('compliance.watchlist.frequency.weekly')}</SelectItem>
                <SelectItem value="monthly" className="text-muted-foreground">{t('compliance.watchlist.frequency.monthly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWatchlist.fields.minConfidence')}</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={minConfidence}
              onChange={(e) => setMinConfidence(e.target.value)}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWatchlist.fields.client')}</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t('compliance.addWatchlist.placeholders.client')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">{t('common.actions.cancel')}</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={entityName.length < 2 || mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? t('compliance.addWatchlist.adding') : t('compliance.addWatchlist.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Whitelist Dialog ──

function AddWhitelistDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
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
      toast.success(t('compliance.addWhitelist.toast.added'));
      onClose();
      setQueryName(''); setEntityId(''); setEntityName(''); setReason(''); setIsPermanent(false);
    },
    onError: () => toast.error(t('compliance.addWhitelist.toast.error')),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-foreground/10 text-foreground max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('compliance.addWhitelist.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWhitelist.fields.queryName')} *</Label>
            <Input
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              placeholder={t('compliance.addWhitelist.placeholders.queryName')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWhitelist.fields.entityId')} *</Label>
            <Input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={t('compliance.addWhitelist.placeholders.entityId')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWhitelist.fields.entityName')} *</Label>
            <Input
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder={t('compliance.addWhitelist.placeholders.entityName')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
            />
          </div>
          <div>
            <Label className="text-muted-foreground">{t('compliance.addWhitelist.fields.reason')} *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('compliance.addWhitelist.placeholders.reason')}
              className="bg-foreground/5 border-foreground/10 text-foreground mt-1"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is-permanent"
              checked={isPermanent}
              onChange={(e) => setIsPermanent(e.target.checked)}
              className="rounded bg-foreground/5 border-foreground/20"
            />
            <Label htmlFor="is-permanent" className="text-muted-foreground cursor-pointer">
              {t('compliance.addWhitelist.permanent')}
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">{t('common.actions.cancel')}</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={queryName.length < 2 || !entityId || !entityName || reason.length < 5 || mutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {mutation.isPending ? t('compliance.addWhitelist.adding') : t('compliance.addWhitelist.submit')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──

export function ComplianceDashboardPage() {
  const { t } = useTranslation();
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
    <AppPage>
        <PageHeader
          title={t('compliance.dashboard.title')}
          description={t('compliance.dashboard.description')}
          icon={
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-brand-blue/30">
              <Shield className="w-6 h-6 text-electric-700 dark:text-electric-400" aria-hidden="true" />
            </div>
          }
          actions={
            <Button
              size="sm"
              onClick={() => setShowCreateCase(true)}
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              {t('compliance.dashboard.newCase')}
            </Button>
          }
        />

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
              <MetricCard
                label={t('compliance.dashboard.metrics.openCases')}
                value={dashboard?.cases?.open_cases ?? 0}
                icon={FileText}
                className="glass rounded-xl"
              />
              <MetricCard
                label={t('compliance.dashboard.metrics.pendingAlerts')}
                value={dashboard?.cases?.by_status?.open ?? 0}
                icon={AlertTriangle}
                accent="amber"
                className="glass rounded-xl"
              />
              <MetricCard
                label={t('compliance.dashboard.metrics.fpRate')}
                value={`${dashboard?.false_positives?.fp_rate ?? 0}%`}
                icon={XCircle}
                accent="red"
                className="glass rounded-xl"
              />
              <MetricCard
                label={t('compliance.dashboard.metrics.monitoredEntities')}
                value={dashboard?.monitoring?.total_watched ?? 0}
                icon={Eye}
                className="glass rounded-xl"
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
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('compliance.dashboard.decisions.title', { count: dashboard.false_positives.period_days })}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-2xl font-bold text-foreground">{dashboard.false_positives.total_decisions}</p>
                <p className="text-xs text-muted-foreground">{t('compliance.dashboard.decisions.total')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{dashboard.false_positives.true_positives}</p>
                <p className="text-xs text-muted-foreground">{t('compliance.dashboard.decisions.truePositives')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dashboard.false_positives.false_positives}</p>
                <p className="text-xs text-muted-foreground">{t('compliance.dashboard.decisions.falsePositives')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{dashboard.false_positives.fp_rate}%</p>
                <p className="text-xs text-muted-foreground">{t('compliance.dashboard.metrics.fpRate')}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{dashboard.false_positives.active_whitelist_entries}</p>
                <p className="text-xs text-muted-foreground">{t('compliance.dashboard.decisions.activeWhitelist')}</p>
              </div>
            </div>
            {dashboard.false_positives.top_fp_entities.length > 0 && (
              <div className="mt-4 pt-4 border-t border-foreground/5">
                <p className="text-xs text-muted-foreground mb-2">{t('compliance.dashboard.decisions.topFp')}</p>
                <div className="flex flex-wrap gap-2">
                  {dashboard.false_positives.top_fp_entities.slice(0, 5).map((e) => (
                    <Badge key={e.entity_name} variant="outline" className="text-xs bg-foreground/5 text-muted-foreground">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="bg-foreground/5 border border-foreground/10 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-foreground/10">
                <FileText className="w-4 h-4 mr-2" />
                {t('compliance.tabs.cases')}
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-foreground/10">
                <AlertTriangle className="w-4 h-4 mr-2" />
                {t('compliance.tabs.alerts')}
              </TabsTrigger>
              <TabsTrigger value="whitelist" className="data-[state=active]:bg-foreground/10">
                <Shield className="w-4 h-4 mr-2" />
                {t('compliance.tabs.whitelist')}
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="data-[state=active]:bg-foreground/10">
                <Eye className="w-4 h-4 mr-2" />
                {t('compliance.tabs.watchlist')}
              </TabsTrigger>
            </TabsList>

            {/* Tab-specific actions */}
            {activeTab === 'watchlist' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddWatchlist(true)}
                className="gap-1 text-muted-foreground border-foreground/10 hover:bg-foreground/5 w-full sm:w-auto"
              >
                <Plus className="w-3 h-3" /> {t('common.actions.add')}
              </Button>
            )}
            {activeTab === 'whitelist' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddWhitelist(true)}
                className="gap-1 text-muted-foreground border-foreground/10 hover:bg-foreground/5 w-full sm:w-auto"
              >
                <Plus className="w-3 h-3" /> {t('common.actions.add')}
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

      {/* Dialogs */}
      <CreateCaseDialog open={showCreateCase} onClose={() => setShowCreateCase(false)} />
      <AddWatchlistDialog open={showAddWatchlist} onClose={() => setShowAddWatchlist(false)} />
      <AddWhitelistDialog open={showAddWhitelist} onClose={() => setShowAddWhitelist(false)} />
    </AppPage>
  );
}

export default ComplianceDashboardPage;
