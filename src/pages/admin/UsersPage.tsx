/**
 * /admin/users — manage user accounts and their roles.
 *
 * Renders every user in the system, lets an admin change their role,
 * toggle is_active, or revoke entirely. The current user cannot
 * demote themselves (would lock them out instantly) — that's enforced
 * by graying the row's role select.
 *
 * Schema: AppUser from src/services/users.ts. Role tier ordering
 * mirrors usePermissions → admin > reviewer > analyst > viewer > readonly.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AppPage,
  PageHeader,
  DataTable,
  EmptyState,
  SkeletonTable,
  type DataTableColumn,
} from '@/components/foundation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  usersService,
  type AppUser,
  type UserRoleName,
} from '@/services/users';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: { value: UserRoleName; labelKey: string; descriptionKey: string }[] = [
  { value: 'admin',    labelKey: 'account.users.roleAdminLabel',    descriptionKey: 'account.users.roleAdminDescription' },
  { value: 'reviewer', labelKey: 'account.users.roleReviewerLabel', descriptionKey: 'account.users.roleReviewerDescription' },
  { value: 'analyst',  labelKey: 'account.users.roleAnalystLabel',  descriptionKey: 'account.users.roleAnalystDescription' },
  { value: 'viewer',   labelKey: 'account.users.roleViewerLabel',   descriptionKey: 'account.users.roleViewerDescription' },
  { value: 'readonly', labelKey: 'account.users.roleReadonlyLabel', descriptionKey: 'account.users.roleReadonlyDescription' },
];

const ROLE_COLOR: Record<UserRoleName, string> = {
  admin:    'bg-red-500/10 text-red-200 border-red-500/40',
  reviewer: 'bg-purple-500/10 text-purple-200 border-purple-500/40',
  analyst:  'bg-electric-500/10 text-electric-200 border-electric-500/40',
  viewer:   'bg-amber-500/10 text-amber-200 border-amber-500/40',
  readonly: 'bg-secondary text-muted-foreground border-border',
};

function formatDate(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback;
  try {
    return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: es });
  } catch {
    return fallback;
  }
}

export default function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

  const { data: users, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => usersService.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof usersService.update>[1] }) =>
      usersService.update(id, payload),
    onSuccess: () => {
      toast.success(t('account.users.toastUpdated'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || t('account.users.toastUpdateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.remove(id),
    onSuccess: () => {
      toast.success(t('account.users.toastDeleted'));
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error(t('account.users.toastDeleteError')),
  });

  const isCurrentUser = (u: AppUser) =>
    currentUser?.id === u.id || currentUser?.email === u.email;

  const columns: DataTableColumn<AppUser>[] = [
    {
      id: 'username',
      header: t('account.users.columnUser'),
      primary: true,
      cell: (u) => (
        <div className="space-y-0.5">
          <div className="text-sm font-medium text-foreground flex items-center gap-2">
            {u.username}
            {isCurrentUser(u) && (
              <Badge variant="outline" className="text-[10px] bg-electric-500/10 text-electric-200 border-electric-500/40">
                {t('account.users.you')}
              </Badge>
            )}
          </div>
          {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
        </div>
      ),
    },
    {
      id: 'role',
      header: t('account.users.columnRole'),
      cell: (u) => (
        <Select
          value={u.role}
          disabled={isCurrentUser(u) || updateMutation.isPending}
          onValueChange={(value) =>
            updateMutation.mutate({ id: u.id, payload: { role: value as UserRoleName } })
          }
        >
          <SelectTrigger
            className={cn(
              'h-7 min-w-[120px] text-xs',
              ROLE_COLOR[u.role],
            )}
            aria-label={t('account.users.roleAria', { username: u.username })}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex flex-col">
                  <span className="text-sm">{t(opt.labelKey)}</span>
                  <span className="text-[11px] text-muted-foreground">{t(opt.descriptionKey)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'status',
      header: t('account.users.columnStatus'),
      cell: (u) => (
        u.is_active ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('account.users.statusActive')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <XCircle className="w-3.5 h-3.5" />
            {t('account.users.statusInactive')}
          </span>
        )
      ),
    },
    {
      id: 'api_key',
      header: t('account.users.columnApiKey'),
      hideOnMobile: true,
      cell: (u) => (
        u.api_key_name
          ? <code className="font-mono text-[11px] text-electric-200">{u.api_key_name}</code>
          : <span className="text-xs text-muted-foreground">—</span>
      ),
    },
    {
      id: 'created',
      header: t('account.users.columnCreated'),
      hideOnMobile: true,
      cell: (u) => <span className="text-xs text-muted-foreground">{formatDate(u.created_at)}</span>,
    },
    {
      id: 'last_login',
      header: t('account.users.columnLastLogin'),
      cell: (u) => <span className="text-xs text-muted-foreground">{formatDate(u.last_login, t('account.users.neverLoggedIn'))}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            disabled={isCurrentUser(u) || updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({ id: u.id, payload: { is_active: !u.is_active } })
            }
            aria-label={u.is_active
              ? t('account.users.deactivateAria', { username: u.username })
              : t('account.users.activateAria', { username: u.username })}
          >
            {u.is_active ? t('account.users.deactivate') : t('account.users.activate')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-red-600 dark:text-red-300 hover:text-red-200"
            disabled={isCurrentUser(u)}
            onClick={() => setDeleteTarget(u)}
            aria-label={t('account.users.deleteAria', { username: u.username })}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppPage>
      <PageHeader
        title={t('account.users.title')}
        description={t('account.users.description')}
        icon={
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-brand-blue/20 to-brand-electric/20 border border-brand-blue/30">
            <Users className="w-6 h-6 text-electric-700 dark:text-electric-400" aria-hidden="true" />
          </div>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
              aria-label={t('account.users.refreshAria')}
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
              {t('account.users.refresh')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              {t('account.users.newUser')}
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <DataTable<AppUser>
            data={users ?? []}
            columns={columns}
            getRowId={(u) => u.id}
            loading={isLoading}
            loadingPlaceholder={<SkeletonTable rows={6} columns={['w-40', 'w-24', 'w-20', 'w-32', 'w-32', 'w-32']} />}
            empty={
              <EmptyState
                icon={Users}
                title={t('account.users.emptyTitle')}
                description={t('account.users.emptyDescription')}
                action={
                  <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    {t('account.users.newUser')}
                  </Button>
                }
              />
            }
          />
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('account.users.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteTarget?.username}</strong>{t('account.users.deleteWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('common.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppPage>
  );
}

// ──────────── Create User Dialog ────────────

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRoleName>('readonly');

  const createMutation = useMutation({
    mutationFn: () =>
      usersService.create({
        username: username.trim().toLowerCase(),
        email: email.trim() || undefined,
        password,
        role,
      }),
    onSuccess: () => {
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('readonly');
      toast.success(t('account.users.toastCreated'));
      onCreated();
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || t('account.users.toastCreateError'));
    },
  });

  const canSubmit =
    username.trim().length >= 3 &&
    password.length >= 8 &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('account.users.createTitle')}</DialogTitle>
          <DialogDescription>
            {t('account.users.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-username">{t('account.users.createUsernameLabel')}</Label>
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder={t('account.users.createUsernamePlaceholder')}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-email">{t('account.users.createEmailLabel')}</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('account.users.createEmailPlaceholder')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t('account.users.createPasswordLabel')}</Label>
            <Input
              id="new-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('account.users.createPasswordPlaceholder')}
            />
            <p className="text-[10px] text-muted-foreground">
              {t('account.users.createPasswordHint')}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-role">{t('account.users.columnRole')}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRoleName)}>
              <SelectTrigger id="new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col">
                      <span className="text-sm">{t(opt.labelKey)}</span>
                      <span className="text-[11px] text-muted-foreground">{t(opt.descriptionKey)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? t('account.users.creating') : t('account.users.createSubmit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
