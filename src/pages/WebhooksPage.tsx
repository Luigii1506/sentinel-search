import { useState } from 'react';
import { motion } from 'framer-motion';
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
import { Skeleton } from '@/components/ui/skeleton';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  webhooksService,
  ALL_EVENTS,
  type Webhook,
  type WebhookCreated,
  type WebhookEvent,
} from '@/services/webhooks';
import { AppPage } from '@/components/foundation';
import { cn } from '@/lib/utils';

export default function WebhooksPage() {
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
      toast.success('Webhook eliminado');
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('No se pudo eliminar'),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => webhooksService.test(id),
    onSuccess: (data) => {
      if (data.status === 'success' || data.status === 'delivered') {
        toast.success('Evento de prueba enviado');
      } else {
        toast.warning(`Test devolvió: ${data.status}${data.detail ? ` - ${data.detail}` : ''}`);
      }
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: () => toast.error('Test failed'),
  });

  return (
    <AppPage>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <WebhookIcon className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Webhooks</h1>
              <p className="text-sm text-gray-400">
                Notificaciones HTTP a sistemas internos cuando ocurren eventos críticos.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nuevo webhook
          </Button>
        </motion.div>

        {/* How it works */}
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200/90 space-y-2">
              <div>
                Cada webhook recibe un <strong>POST</strong> con JSON cuando ocurre uno
                de los eventos suscritos. El payload incluye un header{' '}
                <code className="font-mono text-xs px-1 py-0.5 rounded bg-blue-500/10">X-Sentinel-Signature</code>{' '}
                con HMAC-SHA256 firmado con el secret del webhook.
              </div>
              <div className="text-xs text-blue-300/70">
                Reintento: 3 intentos con backoff exponencial. Si los 3 fallan, el webhook
                se marca como degraded y verás failure_count incrementado.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Webhooks registrados {webhooks ? `(${webhooks.length})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : !webhooks || webhooks.length === 0 ? (
              <div className="p-12 text-center">
                <WebhookIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-1">Aún no hay webhooks configurados.</p>
                <p className="text-xs text-gray-500">
                  Crea uno para recibir notificaciones cuando matches críticos ocurran.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {webhooks.map((w) => (
                  <div key={w.id} className="p-4 hover:bg-white/5 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-white font-medium">{w.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            w.is_active
                              ? 'bg-green-500/10 text-green-300 border-green-500/30'
                              : 'bg-gray-500/10 text-gray-300 border-gray-500/30',
                          )}
                        >
                          {w.is_active ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {w.failure_count > 0 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-300 border-amber-500/30 gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {w.failure_count} fallos
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono truncate">{w.url}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {w.events.map((e) => (
                          <Badge
                            key={e}
                            variant="outline"
                            className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/30"
                          >
                            {e}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-4 text-[11px] text-gray-500">
                        {w.last_triggered ? (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Último disparo:{' '}
                            {formatDistanceToNow(new Date(w.last_triggered), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-600">Nunca disparado</span>
                        )}
                        {w.created_at && (
                          <span>Creado: {format(new Date(w.created_at), 'dd/MM/yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-blue-300 hover:text-blue-200"
                        onClick={() => testMutation.mutate(w.id)}
                        disabled={testMutation.isPending}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Test
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-red-300 hover:text-red-200"
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-white">{deleteTarget?.name}</strong> dejará de
              recibir eventos inmediatamente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    onError: () => toast.error('No se pudo crear el webhook'),
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
          <DialogTitle>Nuevo webhook</DialogTitle>
          <DialogDescription>
            El secret se mostrará una sola vez después de crear el webhook.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              placeholder="ej. Slack #compliance-alerts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">URL *</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-[10px] text-gray-500">
              Debe responder 2xx en &lt;5s. Si falla, reintenta hasta 3 veces.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Eventos a suscribir *</Label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
              {ALL_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedEvents.includes(ev.id)}
                    onCheckedChange={() => toggleEvent(ev.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium font-mono">{ev.id}</div>
                    <div className="text-xs text-gray-500">{ev.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!canSubmit} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? 'Creando…' : 'Crear webhook'}
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
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.secret);
    setCopied(true);
    toast.success('Secret copiado');
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
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            Webhook creado
          </DialogTitle>
          <DialogDescription>
            Guarda el secret ahora — se usa para validar la firma HMAC en cada payload.
            No podrás verlo de nuevo.
          </DialogDescription>
        </DialogHeader>

        {data && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Webhook</Label>
              <div className="text-sm text-white">{data.name}</div>
            </div>

            <div className="space-y-1.5">
              <Label>Signing secret</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 font-mono text-sm text-purple-300 break-all">
                  {visible ? data.secret : '•'.repeat(40)}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setVisible((v) => !v)}
                  title={visible ? 'Ocultar' : 'Mostrar'}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="icon" onClick={handleCopy} title="Copiar">
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-3 text-xs text-amber-200/90 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    Para validar el origen del request en tu endpoint:
                    <pre className="mt-2 p-2 rounded bg-black/40 text-amber-300 overflow-x-auto">
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
            {copied ? 'Listo' : 'Copia el secret primero'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
