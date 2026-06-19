import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Key,
  Plus,
  RotateCw,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
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
  apiKeysService,
  type ApiKeyCreated,
  type ApiKeyRole,
  type ApiKeySummary,
} from '@/services/apiKeys';
import { AppPage, PageHeader, ConfirmAction, EmptyState, PanelSkeleton, StatusPill } from '@/components/foundation';
import { cn } from '@/lib/utils';

function formatDateOr(value: string | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  try {
    return format(new Date(value), 'dd/MM/yyyy HH:mm');
  } catch {
    return fallback;
  }
}

const ROLE_LABEL_KEY: Record<ApiKeyRole, string> = {
  admin: 'account.apiKeys.roleAdmin',
  analyst: 'account.apiKeys.roleAnalyst',
  readonly: 'account.apiKeys.roleReadonly',
};

const ROLE_COLOR: Record<ApiKeyRole, string> = {
  admin: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30',
  analyst: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30',
  readonly: 'bg-gray-500/10 text-muted-foreground border-gray-500/30',
};

export default function ApiKeysPage() {
  const { t } = useTranslation();
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
      toast.success(t('account.apiKeys.toastRevoked'));
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setRevokeTarget(null);
    },
    onError: () => toast.error(t('account.apiKeys.toastRevokeError')),
  });

  const rotateMutation = useMutation({
    mutationFn: (id: string) => apiKeysService.rotate(id),
    onSuccess: (created) => {
      toast.success(t('account.apiKeys.toastRotated'));
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      setNewKeyDisplay(created);
    },
    onError: () => toast.error(t('account.apiKeys.toastRotateError')),
  });

  return (
    <AppPage>
      <PageHeader
        title={t('account.apiKeys.title')}
        description={t('account.apiKeys.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-blue-500/30">
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        }
        actions={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Switch checked={includeRevoked} onCheckedChange={setIncludeRevoked} />
              {t('account.apiKeys.showRevoked')}
            </label>
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('account.apiKeys.newKey')}
            </Button>
          </>
        }
      />

        {/* Warning banner */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200/90">
              <strong className="text-amber-700 dark:text-amber-300">{t('account.apiKeys.warningStrong')}</strong>{t('account.apiKeys.warningBody')}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">
              {keys ? t('account.apiKeys.tableTitle', { count: `(${keys.length})` }) : t('account.apiKeys.tableTitleEmpty')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[0, 1, 2].map((i) => (
                  <PanelSkeleton
                    key={i}
                    className="rounded-lg border border-foreground/5 bg-foreground/[0.02] p-4"
                    lines={2}
                    titleWidthClassName="w-32"
                  />
                ))}
              </div>
            ) : !keys || keys.length === 0 ? (
              <EmptyState
                icon={Key}
                title={t('account.apiKeys.emptyTitle')}
                description={t('account.apiKeys.emptyDescription')}
                action={
                  <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('account.apiKeys.newKey')}
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-foreground/10 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t('account.apiKeys.columnClient')}</th>
                      <th className="px-4 py-3 font-medium">{t('account.apiKeys.columnPrefix')}</th>
                      <th className="px-4 py-3 font-medium">{t('account.apiKeys.columnRole')}</th>
                      <th className="px-4 py-3 font-medium">{t('account.apiKeys.columnCreated')}</th>
                      <th className="px-4 py-3 font-medium">{t('account.apiKeys.columnLastUsed')}</th>
                      <th className="px-4 py-3 font-medium">{t('account.apiKeys.columnExpires')}</th>
                      <th className="px-4 py-3 font-medium">{t('account.apiKeys.columnStatus')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('account.apiKeys.columnActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id} className="border-b border-foreground/5 hover:bg-foreground/5">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{k.client_name}</div>
                          {k.description && (
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                              {k.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-blue-600 dark:text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">
                            {k.key_prefix}…
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('text-xs', ROLE_COLOR[k.role])}>
                            {t(ROLE_LABEL_KEY[k.role])}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateOr(k.created_at)}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateOr(k.last_used_at, t('account.apiKeys.neverUsed'))}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDateOr(k.expires_at, t('account.apiKeys.noExpiry'))}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill
                            kind={k.is_active ? 'success' : 'neutral'}
                            label={k.is_active ? t('account.apiKeys.statusActive') : t('account.apiKeys.statusRevoked')}
                            size="sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {k.is_active && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-blue-600 dark:text-blue-300 hover:text-blue-200"
                                  onClick={() => rotateMutation.mutate(k.id)}
                                  disabled={rotateMutation.isPending}
                                >
                                  <RotateCw className="w-3.5 h-3.5 mr-1" />
                                  {t('account.apiKeys.rotate')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-red-600 dark:text-red-300 hover:text-red-200"
                                  onClick={() => setRevokeTarget(k)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  {t('account.apiKeys.revoke')}
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

      <ConfirmAction
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        variant="destructive"
        title={t('account.apiKeys.revokeTitle')}
        description={
          <>
            <strong className="text-foreground">{revokeTarget?.client_name}</strong>{t('account.apiKeys.revokeWarning')}
          </>
        }
        confirmLabel={t('account.apiKeys.revoke')}
        onConfirm={() => {
          if (!revokeTarget) return;
          return revokeMutation.mutateAsync(revokeTarget.id);
        }}
      />
    </AppPage>
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
  const { t } = useTranslation();
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
    onError: () => toast.error(t('account.apiKeys.toastCreateError')),
  });

  const canSubmit = clientName.trim().length >= 2 && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('account.apiKeys.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('account.apiKeys.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="client_name">{t('account.apiKeys.createClientLabel')}</Label>
            <Input
              id="client_name"
              placeholder={t('account.apiKeys.createClientPlaceholder')}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoFocus
            />
            <p className="text-[10px] text-muted-foreground">
              {t('account.apiKeys.createClientHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">{t('account.apiKeys.createRoleLabel')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as ApiKeyRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="readonly">{t('account.apiKeys.createRoleReadonly')}</SelectItem>
                <SelectItem value="analyst">{t('account.apiKeys.createRoleAnalyst')}</SelectItem>
                <SelectItem value="admin">{t('account.apiKeys.createRoleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">{t('account.apiKeys.createDescriptionLabel')}</Label>
            <Textarea
              id="description"
              placeholder={t('account.apiKeys.createDescriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expires">{t('account.apiKeys.createExpiresLabel')}</Label>
            <Input
              id="expires"
              type="number"
              min={1}
              placeholder={t('account.apiKeys.createExpiresPlaceholder')}
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('account.apiKeys.createExpiresHint')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? t('account.apiKeys.creating') : t('account.apiKeys.createSubmit')}
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
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!keyData) return;
    navigator.clipboard.writeText(keyData.api_key);
    setCopied(true);
    toast.success(t('account.apiKeys.toastCopied'));
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
            <Shield className="w-5 h-5 text-green-700 dark:text-green-400" />
            {t('account.apiKeys.createdTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('account.apiKeys.createdDescription')}
          </DialogDescription>
        </DialogHeader>

        {keyData && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t('account.apiKeys.clientLabel')}</Label>
              <div className="text-sm text-foreground font-medium">{keyData.client_name}</div>
            </div>

            <div className="space-y-1.5">
              <Label>{t('account.apiKeys.apiKeyLabel')}</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-foreground/10 font-mono text-sm text-blue-600 dark:text-blue-300 break-all">
                  {visible ? keyData.api_key : '•'.repeat(Math.min(keyData.api_key.length, 40))}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => setVisible((v) => !v)}
                  title={visible ? t('account.apiKeys.hideTitle') : t('account.apiKeys.showTitle')}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="icon" onClick={handleCopy} title={t('account.apiKeys.copyTitle')}>
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-3 flex items-start gap-2 text-xs text-amber-200/90">
                <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  {t('account.apiKeys.createdWarningPre')}<code className="font-mono">{keyData.key_prefix}…</code>
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
            {copied ? t('account.apiKeys.done') : t('account.apiKeys.copyFirst')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
