import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  AlertTriangle,
  Activity,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  webhooksService,
  ALL_EVENTS,
  type Webhook,
  type WebhookCreated,
  type WebhookEvent,
} from '@/services/webhooks';
import { AppPage, PageHeader, ConfirmAction, EmptyState, PanelSkeleton, StatusPill } from '@/components/foundation';

export default function WebhooksPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [secretDisplay, setSecretDisplay] = useState<WebhookCreated | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Webhook | null>(null);

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhooksService.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhooksService.remove(id),
    onSuccess: () => {
      toast.success(t('account.webhooks.toastDeleted'));
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error(t('account.webhooks.toastDeleteError')),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => webhooksService.test(id),
    onSuccess: (data) => {
      if (data.status === 'success' || data.status === 'delivered') {
        toast.success(t('account.webhooks.toastTestSent'));
      } else {
        toast.warning(
          data.detail
            ? t('account.webhooks.toastTestWarningDetail', { status: data.status, detail: data.detail })
            : t('account.webhooks.toastTestWarning', { status: data.status }),
        );
      }
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: () => toast.error(t('account.webhooks.toastTestError')),
  });

  return (
    <AppPage>
      <PageHeader
        title={t('account.webhooks.title')}
        description={t('account.webhooks.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <WebhookIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        }
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('account.webhooks.newWebhook')}
          </Button>
        }
      />

        {/* How it works */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200/90 space-y-2">
              <div>
                {t('account.webhooks.howItWorksBody')}<strong>{t('account.webhooks.httpMethod')}</strong>{t('account.webhooks.howItWorksMid')}
                <code className="font-mono text-xs px-1 py-0.5 rounded bg-blue-500/10">X-Sentinel-Signature</code>
                {t('account.webhooks.howItWorksEnd')}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-300/70">
                {t('account.webhooks.retryNote')}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              {webhooks ? t('account.webhooks.tableTitle', { count: `(${webhooks.length})` }) : t('account.webhooks.tableTitleEmpty')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => (
                  <PanelSkeleton
                    key={i}
                    className="rounded-lg border border-foreground/5 bg-foreground/[0.02] p-4"
                    lines={3}
                    titleWidthClassName="w-40"
                  />
                ))}
              </div>
            ) : !webhooks || webhooks.length === 0 ? (
              <EmptyState
                icon={WebhookIcon}
                title={t('account.webhooks.emptyTitle')}
                description={t('account.webhooks.emptyDescription')}
                action={
                  <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('account.webhooks.newWebhook')}
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-foreground/5">
                {webhooks.map((w) => (
                  <div key={w.id} className="p-4 hover:bg-foreground/5 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-foreground font-medium">{w.name}</span>
                        <StatusPill
                          kind={w.is_active ? 'success' : 'neutral'}
                          label={w.is_active ? t('account.webhooks.statusActive') : t('account.webhooks.statusInactive')}
                          size="sm"
                        />
                        {w.failure_count > 0 && (
                          <StatusPill
                            kind="warning"
                            label={t('account.webhooks.failures', { count: w.failure_count })}
                            size="sm"
                          />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">{w.url}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {w.events.map((e) => (
                          <Badge
                            key={e}
                            variant="outline"
                            className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30"
                          >
                            {e}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-4 text-[11px] text-muted-foreground">
                        {w.last_triggered ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t('account.webhooks.lastTriggered', {
                              time: formatDistanceToNow(new Date(w.last_triggered), {
                                addSuffix: true,
                                locale: es,
                              }),
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t('account.webhooks.neverTriggered')}</span>
                        )}
                        {w.created_at && (
                          <span>{t('account.webhooks.createdAt', { date: format(new Date(w.created_at), 'dd/MM/yyyy') })}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-blue-600 dark:text-blue-300 hover:text-blue-200"
                        onClick={() => testMutation.mutate(w.id)}
                        disabled={testMutation.isPending}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        {t('account.webhooks.test')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-red-600 dark:text-red-300 hover:text-red-200"
                        onClick={() => setDeleteTarget(w)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      <CreateWebhookDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => {
          setCreateOpen(false);
          setSecretDisplay(created);
          queryClient.invalidateQueries({ queryKey: ['webhooks'] });
        }}
      />

      <SecretDialog data={secretDisplay} onClose={() => setSecretDisplay(null)} />

      <ConfirmAction
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        variant="destructive"
        title={t('account.webhooks.deleteTitle')}
        description={
          <>
            <strong className="text-foreground">{deleteTarget?.name}</strong>{t('account.webhooks.deleteWarning')}
          </>
        }
        confirmLabel={t('common.actions.delete')}
        onConfirm={() => {
          if (!deleteTarget) return;
          return deleteMutation.mutateAsync(deleteTarget.id);
        }}
      />
    </AppPage>
  );
}

// ──────────── Create Dialog ────────────

function CreateWebhookDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (w: WebhookCreated) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);

  const createMutation = useMutation({
    mutationFn: () =>
      webhooksService.create({
        name: name.trim(),
        url: url.trim(),
        events: selectedEvents,
      }),
    onSuccess: (w) => {
      setName('');
      setUrl('');
      setSelectedEvents([]);
      onCreated(w);
    },
    onError: () => toast.error(t('account.webhooks.toastCreateError')),
  });

  const toggleEvent = (id: WebhookEvent) =>
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );

  const canSubmit =
    name.trim().length >= 2 &&
    url.trim().startsWith('http') &&
    selectedEvents.length > 0 &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('account.webhooks.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('account.webhooks.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">{t('account.webhooks.nameLabel')}</Label>
            <Input
              id="name"
              placeholder={t('account.webhooks.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">{t('account.webhooks.urlLabel')}</Label>
            <Input
              id="url"
              type="url"
              placeholder={t('account.webhooks.urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('account.webhooks.urlHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t('account.webhooks.eventsLabel')}</Label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
              {ALL_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-foreground/5 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedEvents.includes(ev.id)}
                    onCheckedChange={() => toggleEvent(ev.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-medium font-mono">{ev.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {t(`account.webhooks.events.${ev.id.replace(/\./g, '_')}.description`)}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? t('account.webhooks.creating') : t('account.webhooks.createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────── Secret Display ────────────

function SecretDialog({
  data,
  onClose,
}: {
  data: WebhookCreated | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.secret);
    setCopied(true);
    toast.success(t('account.webhooks.toastSecretCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={!!data}
      onOpenChange={(open) => {
        if (!open) {
          setVisible(false);
          setCopied(false);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-700 dark:text-green-400" />
            {t('account.webhooks.createdTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('account.webhooks.createdDescription')}
          </DialogDescription>
        </DialogHeader>

        {data && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t('account.webhooks.webhookLabel')}</Label>
              <div className="text-sm text-foreground">{data.name}</div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('account.webhooks.secretLabel')}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-foreground/10 font-mono text-sm text-purple-600 dark:text-purple-300 break-all">
                  {visible ? data.secret : '•'.repeat(40)}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setVisible((v) => !v)}
                  title={visible ? t('account.webhooks.hideTitle') : t('account.webhooks.showTitle')}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="icon" onClick={handleCopy} title={t('account.webhooks.copyTitle')}>
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-3 text-xs text-amber-200/90 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    {t('account.webhooks.validateNote')}
                    <pre className="mt-2 p-2 rounded bg-black/40 text-amber-700 dark:text-amber-300 overflow-x-auto">
{`hmac.compare_digest(
  hmac.new(secret, body, 'sha256').hexdigest(),
  request.headers['X-Sentinel-Signature']
)`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose} disabled={!copied}>
            {copied ? t('account.webhooks.done') : t('account.webhooks.copyFirst')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
