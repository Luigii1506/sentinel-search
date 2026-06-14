/**
 * ⌘K command palette — Linear/Stripe/Vercel-style global launcher.
 *
 * Three sections:
 *   - Pages: jump to any route the current user can see (RoleGate-aware)
 *   - Búsqueda: type a name, hit Enter, navigate to /search?q=…
 *   - Acciones: shortcuts for new key, new webhook, sign out, etc.
 *
 * Global activation: ⌘K (macOS) / Ctrl+K (Windows/Linux). The hook is
 * registered once at the app shell level so any page can rely on it.
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Upload,
  Database,
  Activity,
  ClipboardList,
  GitMerge,
  GitBranchPlus,
  ShieldCheck,
  Newspaper,
  Globe,
  Key,
  Webhook,
  Shield,
  Settings,
  BarChart3,
  LogOut,
  Plus,
  ArrowRight,
  Server,
  FileSearch,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Role } from '@/hooks/usePermissions';

interface PaletteAction {
  id: string;
  label: string;
  icon: typeof Search;
  shortcut?: string;
  minRole?: Role;
  group: 'pages' | 'actions';
  /** Either navigate to a path, or run a function. */
  to?: string;
  run?: () => void | Promise<void>;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { atLeast } = usePermissions();
  const [query, setQuery] = useState('');

  // ── Define all commands ──
  // Keep in sync with the NAV groups in Sidebar.tsx. When you add a
  // route there, mirror it here so users can reach it via ⌘K too.
  const allActions: PaletteAction[] = [
    // Workspace
    { id: 'p-home',        label: 'Home',              icon: LayoutDashboard, group: 'pages', to: '/' },
    { id: 'p-search',      label: 'Búsqueda',          icon: Search,          group: 'pages', to: '/search',         shortcut: 'G S' },
    { id: 'p-bulk',        label: 'Bulk Screening',    icon: Upload,          group: 'pages', to: '/screening/bulk', shortcut: 'G B' },
    { id: 'p-federated',   label: 'Federated Search',  icon: Globe,           group: 'pages', to: '/federated',      shortcut: 'G F' },

    // Compliance (analyst+)
    { id: 'p-compliance',  label: 'Cases & Watchlist', icon: Shield,    group: 'pages', to: '/compliance',      shortcut: 'G C', minRole: 'analyst' },
    { id: 'p-adverse',     label: 'Adverse Media',     icon: Newspaper, group: 'pages', to: '/adverse-media',                    minRole: 'analyst' },

    // Insights (reviewer+)
    { id: 'p-operations',  label: 'Operaciones',  icon: Activity,       group: 'pages', to: '/operations',         minRole: 'reviewer' },
    { id: 'p-activity',    label: 'Activity Log', icon: ClipboardList,  group: 'pages', to: '/admin/activity-log', minRole: 'reviewer' },
    { id: 'p-monitoring',  label: 'Monitoring',   icon: Activity,       group: 'pages', to: '/monitoring',         minRole: 'reviewer' },
    { id: 'p-reports',     label: 'Reportes',     icon: BarChart3,      group: 'pages', to: '/reports',            minRole: 'reviewer' },

    // Data Review (reviewer+)
    { id: 'p-merges',      label: 'Merge Review',      icon: GitMerge,       group: 'pages', to: '/admin/merges',             minRole: 'reviewer' },
    { id: 'p-resolver',    label: 'Resolver Review',   icon: GitBranchPlus,  group: 'pages', to: '/admin/resolver-review',    minRole: 'reviewer' },
    { id: 'p-validation',  label: 'Validation Review', icon: ShieldCheck,    group: 'pages', to: '/admin/validation-review',  minRole: 'reviewer' },

    // Data Management (admin)
    { id: 'p-sources',     label: 'Sources Dashboard', icon: Database,   group: 'pages', to: '/admin/sources',        minRole: 'admin' },
    { id: 'p-audit',       label: 'Sources Audit',     icon: FileSearch, group: 'pages', to: '/admin/audit',          minRole: 'admin' },
    { id: 'p-yente',       label: 'Yente Catalog',     icon: Server,     group: 'pages', to: '/data/yente-catalog',   minRole: 'admin' },

    // System (admin)
    { id: 'p-api-keys',    label: 'API Keys',  icon: Key,      group: 'pages', to: '/admin/api-keys', shortcut: 'G K', minRole: 'admin' },
    { id: 'p-webhooks',    label: 'Webhooks',  icon: Webhook,  group: 'pages', to: '/admin/webhooks',                  minRole: 'admin' },
    { id: 'p-settings',    label: 'Settings',  icon: Settings, group: 'pages', to: '/settings',                        minRole: 'admin' },

    // Actions (role-gated)
    { id: 'a-new-key',     label: 'Crear nueva API Key', icon: Plus,   group: 'actions', to: '/admin/api-keys', minRole: 'admin' },
    { id: 'a-new-webhook', label: 'Crear nuevo Webhook', icon: Plus,   group: 'actions', to: '/admin/webhooks', minRole: 'admin' },
    { id: 'a-logout',      label: 'Cerrar sesión',       icon: LogOut, group: 'actions', run: () => logout() },
  ];

  const visible = allActions.filter((a) => !a.minRole || atLeast(a.minRole));
  const pages   = visible.filter((a) => a.group === 'pages');
  const actions = visible.filter((a) => a.group === 'actions');

  const runAction = useCallback(
    async (action: PaletteAction) => {
      onOpenChange(false);
      setQuery('');
      if (action.run) await action.run();
      else if (action.to) navigate(action.to);
    },
    [navigate, onOpenChange],
  );

  // Quick "search this name" action — appears when query is a real string.
  const trimmed = query.trim();
  const showSearchShortcut = trimmed.length >= 2;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar páginas, entidades o acciones…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        {showSearchShortcut && (
          <>
            <CommandGroup heading="Búsqueda">
              <CommandItem
                value={`__search__${trimmed}`}
                onSelect={() => {
                  onOpenChange(false);
                  setQuery('');
                  navigate(`/search?q=${encodeURIComponent(trimmed)}`);
                }}
              >
                <Search className="mr-2 h-4 w-4 text-electric-400" />
                <span>Buscar “{trimmed}” en sanciones</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-navy-200" />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Páginas">
          {pages.map((a) => {
            const Icon = a.icon;
            return (
              <CommandItem
                key={a.id}
                value={`${a.label} ${a.to ?? ''}`}
                onSelect={() => runAction(a)}
              >
                <Icon className="mr-2 h-4 w-4 text-navy-100" />
                <span>{a.label}</span>
                {a.shortcut && (
                  <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-navy-200">
                    {a.shortcut}
                  </kbd>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {actions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Acciones">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem key={a.id} value={a.label} onSelect={() => runAction(a)}>
                    <Icon className="mr-2 h-4 w-4 text-navy-100" />
                    <span>{a.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Hook that binds ⌘K / Ctrl+K globally. Returns the open state +
 * setter so the same trigger can be wired to a button (sidebar) and
 * to the keyboard shortcut at once.
 *
 * Avoids fighting browser shortcuts: ignores when an editable element
 * (input, textarea, contenteditable) is focused unless the user
 * explicitly pressed Cmd/Ctrl.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (!isToggle) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return { open, setOpen };
}
