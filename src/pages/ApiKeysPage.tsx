import { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Key,
  Plus,
  RotateCw,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  apiKeysService,
  type ApiKeyCreated,
  type ApiKeyRole,
  type ApiKeySummary,
} from '@/services/apiKeys';
import { cn } from '@/lib/utils';

function formatDateOr(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return fallback;
  }
}

const ROLE_LABEL: Record<ApiKeyRole, string> = {
  admin: 'Admin',
  analyst: 'Analista',
  readonly: 'Solo lectura',
};

const ROLE_COLOR: Record<ApiKeyRole, string> = {
  admin: 'bg-red-500/10 text-red-300 border-red-500/30',
  analyst: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  readonly: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
};

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeySummary | null>(null);
  const [newKeyDisplay, setNewKeyDisplay] = useState<ApiKeyCreated | null>(null);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys', { includeRevoked }],
    queryFn: () => apiKeysService.list({ include_revoked: includeRevoked }),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiKeysService.revoke(id),
    onSuccess: () => {
      toast.success('API key revocada');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setRevokeTarget(null);
    },
    onError: () => toast.error('No se pudo revocar la key'),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => apiKeysService.rotate(id),
    onSuccess: (created) => {
      toast.success('Key rotada — copia la nueva ahora');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyDisplay(created);
    },
    onError: () => toast.error('No se pudo rotar la key'),
  });

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
              <Key className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">API Keys</h1>
              <p className="text-sm text-gray-400">
                Administra las llaves de acceso al API para cada cliente y rol.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <Switch checked={includeRevoked} onCheckedChange={setIncludeRevoked} />
              Mostrar revocadas
            </label>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva key
            </Button>
          </div>
        </motion.div>

        {/* Warning banner */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200/90">
              <strong className="text-amber-300">Importante:</strong> la key completa
              se muestra una sola vez al crearla o rotarla. Cópiala y guárdala en
              un gestor seguro — no podrás verla de nuevo.
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Keys {keys ? `(${keys.length})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : !keys || keys.length === 0 ? (
              <div className="p-12 text-center">
                <Key className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Aún no hay API keys.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Prefix</th>
                      <th className="px-4 py-3 font-medium">Rol</th>
                      <th className="px-4 py-3 font-medium">Creada</th>
                      <th className="px-4 py-3 font-medium">Último uso</th>
                      <th className="px-4 py-3 font-medium">Expira</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{k.client_name}</div>
                          {k.description && (
                            <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">
                              {k.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                            {k.key_prefix}…
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('text-xs', ROLE_COLOR[k.role])}>
                            {ROLE_LABEL[k.role]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {formatDateOr(k.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {formatDateOr(k.last_used_at, 'Nunca')}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {formatDateOr(k.expires_at, 'Sin caducidad')}
                        </td>
                        <td className="px-4 py-3">
                          {k.is_active ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Activa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                              <Clock className="w-3.5 h-3.5" />
                              Revocada
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {k.is_active && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-blue-300 hover:text-blue-200"
                                  onClick={() => rotateMutation.mutate(k.id)}
                                  disabled={rotateMutation.isPending}
                                >
                                  <RotateCw className="w-3.5 h-3.5 mr-1" />
                                  Rotar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-red-300 hover:text-red-200"
                                  onClick={() => setRevokeTarget(k)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Revocar
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(created) => {
          setCreateOpen(false);
          setNewKeyDisplay(created);
          queryClient.invalidateQueries({ queryKey: ['api-keys'] });
        }}
      />

      <NewKeyDialog
        keyData={newKeyDisplay}
        onClose={() => setNewKeyDisplay(null)}
      />

      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar esta API key?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-white">{revokeTarget?.client_name}</strong> dejará
              de poder hacer requests inmediatamente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
            >
              Revocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ──────────── Create Dialog ────────────

function CreateKeyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (key: ApiKeyCreated) => void;
}) {
  const [clientName, setClientName] = useState('');
  const [role, setRole] = useState<ApiKeyRole>('analyst');
  const [description, setDescription] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('');

  const createMutation = useMutation({
    mutationFn: () =>
      apiKeysService.create({
        client_name: clientName.trim(),
        role,
        description: description.trim() || undefined,
        expires_in_days: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
      }),
    onSuccess: (created) => {
      setClientName('');
      setRole('analyst');
      setDescription('');
      setExpiresInDays('');
      onCreated(created);
    },
    onError: () => toast.error('No se pudo crear la key'),
  });

  const canSubmit = clientName.trim().length >= 2 && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva API key</DialogTitle>
          <DialogDescription>
            La key completa se mostrará una sola vez en la siguiente pantalla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="client_name">Nombre del cliente *</Label>
            <Input
              id="client_name"
              placeholder="ej. banco_x_prod"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-gray-500">
              Identificador interno. Usa snake_case (sin espacios).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ApiKeyRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="readonly">Solo lectura — search only</SelectItem>
                <SelectItem value="analyst">Analista — search + casos</SelectItem>
                <SelectItem value="admin">Admin — full access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              placeholder="ej. Integración de KYC para banca corporativa"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expires">Expira en días (opcional)</Label>
            <Input
              id="expires"
              type="number"
              min={1}
              placeholder="ej. 90"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
            <p className="text-[10px] text-gray-500">
              Vacío = sin caducidad. Recomendado: 90 días con rotación automática.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? 'Creando…' : 'Crear key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────── New Key Display (copy-once) ────────────

function NewKeyDialog({
  keyData,
  onClose,
}: {
  keyData: ApiKeyCreated | null;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!keyData) return;
    navigator.clipboard.writeText(keyData.api_key);
    setCopied(true);
    toast.success('Key copiada al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open={!!keyData}
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
            <Shield className="w-5 h-5 text-green-400" />
            API key creada
          </DialogTitle>
          <DialogDescription>
            Esta es la única vez que verás la key completa. Cópiala ahora y
            guárdala en un gestor seguro.
          </DialogDescription>
        </DialogHeader>

        {keyData && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <div className="text-sm text-white font-medium">{keyData.client_name}</div>
            </div>

            <div className="space-y-1.5">
              <Label>API key</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 font-mono text-sm text-blue-300 break-all">
                  {visible ? keyData.api_key : '•'.repeat(Math.min(keyData.api_key.length, 40))}
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
              <CardContent className="p-3 flex items-start gap-2 text-xs text-amber-200/90">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  Una vez que cierres este diálogo, la key se ocultará para siempre.
                  Solo podrás ver el prefix <code className="font-mono">{keyData.key_prefix}…</code>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => {
              setVisible(false);
              setCopied(false);
              onClose();
            }}
            disabled={!copied}
          >
            {copied ? 'Listo' : 'Copia la key primero'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
