/**
 * Sentinel sidebar — Linear-inspired desktop nav, drawer on mobile.
 *
 * Layout responsibilities:
 *   - Persistent vertical nav on lg+ (240px expanded, 60px collapsed)
 *   - Off-canvas drawer on < lg, controlled by a hamburger in the
 *     compact topbar (TopbarMobile component below)
 *   - User pill at the bottom with usage indicator + health + menu
 *   - Cmd+K hint above the bottom rail to advertise the command palette
 *
 * State plumbing kept here (Zustand-free) — collapse pref persists to
 * localStorage so the user's chrome preference survives reloads.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User as UserIcon,
  Command as CommandIcon,
  Server,
  FileSearch,
  Users as UsersIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn, getInitials } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions, type Role } from '@/hooks/usePermissions';
import { HealthIndicator } from '@/components/HealthIndicator';
import { UsageIndicator } from '@/components/UsageIndicator';

// ────────────────────────────── Nav config ──────────────────────────────
//
// CANONICAL NAVIGATION STRUCTURE
//
// Goal: every page in the app reachable from the sidebar, grouped by
// domain, and the visibility filtered by role so the same component
// renders a viewer's compact nav AND an admin's complete nav without
// duplicating markup.
//
// Role tiers (mirrors backend RBAC, hierarchical via usePermissions):
//   readonly  → least privileged; can search but nothing else
//   viewer    → readonly + dashboards
//   analyst   → viewer + Compliance (cases / watchlist / adverse media)
//   reviewer  → analyst + Insights + Data Review (audit, merges)
//   admin     → reviewer + Data Management + System (keys, webhooks, sources)
//
// To add a page:
//   1. Add the route in App.tsx wrapped in <RoleGate minimumRole="…" />
//   2. Add an entry below to the matching group with the same minRole
//   3. Mirror it in CommandPalette.tsx's allActions array
//
// To add a NEW group: append a NavGroup at the bottom and pick the
// smallest minRole — the group disappears for users who can't see any
// of its items.

interface NavItem {
  path: string;
  label: string;
  icon: typeof Search;
  minRole?: Role;
  /** Optional kbd hint for the tooltip when collapsed. */
  shortcut?: string;
}

interface NavGroup {
  title: string;
  /** When set, the whole group hides for users below this rank. Each
   *  item's own minRole still applies on top — pick the loosest role
   *  here and tighten per-item if needed. */
  minRole?: Role;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    // Everyone with an account sees these.
    title: 'Workspace',
    items: [
      { path: '/',               label: 'Home',           icon: LayoutDashboard, shortcut: 'G H' },
      { path: '/search',         label: 'Búsqueda',       icon: Search,          shortcut: 'G S' },
      { path: '/screening/bulk', label: 'Bulk Screening', icon: Upload,          shortcut: 'G B' },
      { path: '/federated',      label: 'Federated Search', icon: Globe,         shortcut: 'G F' },
    ],
  },
  {
    // KYC analysts working day-to-day cases.
    title: 'Compliance',
    minRole: 'analyst',
    items: [
      { path: '/compliance',    label: 'Cases & Watchlist', icon: Shield,    shortcut: 'G C' },
      { path: '/adverse-media', label: 'Adverse Media',     icon: Newspaper },
    ],
  },
  {
    // Compliance reviewers / team leads — read-mostly oversight.
    title: 'Insights',
    minRole: 'reviewer',
    items: [
      { path: '/operations',          label: 'Operaciones',  icon: Activity },
      { path: '/admin/activity-log',  label: 'Activity Log', icon: ClipboardList },
      { path: '/monitoring',          label: 'Monitoring',   icon: Activity },
      { path: '/reports',             label: 'Reportes',     icon: BarChart3 },
    ],
  },
  {
    // Entity-resolution queues — manual review of edge cases.
    title: 'Data Review',
    minRole: 'reviewer',
    items: [
      { path: '/admin/merges',             label: 'Merge Review',      icon: GitMerge },
      { path: '/admin/resolver-review',    label: 'Resolver Review',   icon: GitBranchPlus },
      { path: '/admin/validation-review',  label: 'Validation Review', icon: ShieldCheck },
    ],
  },
  {
    // Data-ops surfaces — sources, health, catalog.
    title: 'Data Management',
    minRole: 'admin',
    items: [
      { path: '/admin/sources',     label: 'Sources Dashboard', icon: Database },
      { path: '/admin/audit',       label: 'Sources Audit',     icon: FileSearch },
      { path: '/data/yente-catalog', label: 'Yente Catalog',    icon: Server },
    ],
  },
  {
    // Account / billing / integrations.
    title: 'System',
    minRole: 'admin',
    items: [
      { path: '/admin/users',    label: 'Users',    icon: UsersIcon, shortcut: 'G U' },
      { path: '/admin/api-keys', label: 'API Keys', icon: Key,       shortcut: 'G K' },
      { path: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
      { path: '/settings',       label: 'Settings', icon: Settings },
    ],
  },
];

// ──────────────────────────── Collapse state ────────────────────────────

const COLLAPSE_KEY = 'sentinel:sidebar:collapsed';

function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  });
  useEffect(() => {
    window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);
  return { collapsed, toggle: () => setCollapsed((c) => !c) };
}

// ────────────────────────────── Item primitive ──────────────────────────────

function NavLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const isActive =
    location.pathname === item.path ||
    (item.path !== '/' && location.pathname.startsWith(item.path));
  const Icon = item.icon;

  const content = (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
        isActive
          ? 'bg-brand-blue/15 text-white border-l-2 border-brand-electric pl-[10px]'
          : 'text-navy-100 hover:text-white hover:bg-navy-700',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className={cn('shrink-0 w-4 h-4', isActive && 'text-electric-400')} aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {item.label}
          {item.shortcut && (
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-navy-100">
              {item.shortcut}
            </kbd>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }
  return content;
}

function SectionLabel({ children, collapsed }: { children: ReactNode; collapsed: boolean }) {
  if (collapsed) {
    return <div className="h-px bg-navy-600 mx-3 my-2" />;
  }
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider text-navy-200">
      {children}
    </div>
  );
}

// ──────────────────────────── Sidebar body ────────────────────────────

function SidebarBody({
  collapsed,
  onNavigate,
  onToggleCommand,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  onToggleCommand: () => void;
}) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { atLeast } = usePermissions();

  // Filter once per role change: drop groups the user can't see, then
  // drop items within visible groups that the user can't see (per-item
  // override of the group's minRole). Empty groups disappear entirely.
  const visibleGroups = NAV
    .filter((g) => !g.minRole || atLeast(g.minRole))
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.minRole || atLeast(it.minRole)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Brand */}
        <Link
          to="/"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2 px-4 py-4 border-b border-navy-600',
            collapsed && 'justify-center px-0',
          )}
        >
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-brand-blue to-brand-electric flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-white">Sentinel</span>
          )}
        </Link>

        {/* Command palette trigger — replaces a search box at the top */}
        <div className={cn('px-3 pt-3', collapsed && 'px-2')}>
          <button
            type="button"
            onClick={onToggleCommand}
            aria-label="Abrir paleta de comandos"
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
              'bg-navy-700 hover:bg-navy-600 text-navy-100 text-sm transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CommandIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">Buscar o saltar…</span>}
            </div>
            {!collapsed && (
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-navy-800 text-navy-200">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Main nav — grouped by domain, filtered by role */}
        <nav
          aria-label="Sidebar navigation"
          className={cn('flex-1 overflow-y-auto py-2 px-2 space-y-0.5', collapsed && 'px-2')}
        >
          {visibleGroups.map((group, idx) => (
            <div key={group.title}>
              {/* First group renders without a label so the brand + ⌘K
                  flow naturally into the first nav item. */}
              {idx > 0 && <SectionLabel collapsed={collapsed}>{group.title}</SectionLabel>}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  item={item}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom rail: usage + health + user */}
        <div className={cn('border-t border-navy-600 p-2 space-y-2', collapsed && 'px-2')}>
          {!collapsed && (
            <div className="flex items-center justify-around px-1">
              <UsageIndicator />
              <HealthIndicator />
            </div>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Menú de usuario"
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-navy-700 transition-colors',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-electric text-white text-xs">
                      {getInitials(`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs font-medium text-white truncate">
                        {user.first_name || user.email}
                      </div>
                      <div className="text-[10px] text-navy-200 truncate">
                        {user.role}
                      </div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-xs text-navy-100">Sesión iniciada como</div>
                  <div className="text-sm font-medium text-white truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-300 focus:text-red-200">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ──────────────────────────── Public exports ────────────────────────────

interface SidebarProps {
  onToggleCommand: () => void;
  /** Controlled — App owns the state so <main> can adjust its left
   *  padding in lockstep with the sidebar width. */
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/** Desktop sidebar — persistent, fixed-left. Includes the collapse toggle
 *  on the outer edge. State is controlled by the layout. */
export function Sidebar({ onToggleCommand, collapsed, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col',
        'bg-brand-carbon border-r border-navy-600',
        'transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      )}
      aria-label="Navegación principal"
    >
      <SidebarBody collapsed={collapsed} onToggleCommand={onToggleCommand} />

      {/* Collapse toggle on the right edge */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
        className={cn(
          'absolute -right-3 top-20 z-40',
          'w-6 h-6 rounded-full bg-navy-700 border border-navy-500',
          'flex items-center justify-center text-navy-100 hover:text-white hover:bg-navy-600',
          'transition-colors shadow-sm',
        )}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}

/** Mobile topbar — minimal, hamburger opens the drawer with full sidebar.
 *  collapse props ignored on mobile (the drawer is always full width). */
export function TopbarMobile({ onToggleCommand }: { onToggleCommand: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        'lg:hidden sticky top-0 z-30',
        'flex items-center justify-between gap-2 h-14 px-3',
        'bg-brand-carbon/95 backdrop-blur-xl border-b border-navy-600',
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menú">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-[280px] bg-brand-carbon border-r border-navy-600"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <SidebarBody
            collapsed={false}
            onNavigate={() => setOpen(false)}
            onToggleCommand={() => {
              setOpen(false);
              onToggleCommand();
            }}
          />
        </SheetContent>
      </Sheet>

      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-blue to-brand-electric flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">Sentinel</span>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCommand}
        aria-label="Abrir búsqueda"
      >
        <Search className="w-4.5 h-4.5" />
      </Button>
    </header>
  );
}

export { useSidebarCollapse };
