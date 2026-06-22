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
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { springRail } from '@/lib/motion';
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
  BarChart3,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
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
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';

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

// `title` and `label` hold i18n keys (resolved with t() at render), not
// display strings — so the nav re-localizes when the language switches.
const NAV: NavGroup[] = [
  {
    // Everyone with an account sees these.
    title: 'nav.groups.workspace',
    items: [
      { path: '/',               label: 'nav.home',           icon: LayoutDashboard, shortcut: 'G H' },
      { path: '/search',         label: 'nav.search',         icon: Search,          shortcut: 'G S' },
      { path: '/screening/bulk', label: 'nav.bulkScreening',  icon: Upload,          shortcut: 'G B', minRole: 'analyst' },
      { path: '/federated',      label: 'nav.federatedSearch', icon: Globe,          shortcut: 'G F' },
    ],
  },
  {
    // KYC analysts working day-to-day cases.
    title: 'nav.groups.compliance',
    minRole: 'analyst',
    items: [
      { path: '/compliance',    label: 'nav.casesWatchlist', icon: Shield,    shortcut: 'G C' },
      { path: '/adverse-media', label: 'nav.adverseMedia',   icon: Newspaper },
    ],
  },
  {
    // Compliance reviewers / team leads — read-mostly oversight.
    title: 'nav.groups.insights',
    minRole: 'reviewer',
    items: [
      { path: '/operations',          label: 'nav.operations',  icon: Activity },
      { path: '/admin/activity-log',  label: 'nav.activityLog', icon: ClipboardList, minRole: 'admin' },
      { path: '/monitoring',          label: 'nav.monitoring',  icon: Activity },
      { path: '/reports',             label: 'nav.reports',     icon: BarChart3 },
    ],
  },
  {
    // Entity-resolution queues — manual review of edge cases.
    title: 'nav.groups.dataReview',
    minRole: 'reviewer',
    items: [
      { path: '/admin/merges',             label: 'nav.mergeReview',      icon: GitMerge },
      { path: '/admin/resolver-review',    label: 'nav.resolverReview',   icon: GitBranchPlus },
      { path: '/admin/validation-review',  label: 'nav.validationReview', icon: ShieldCheck },
    ],
  },
  {
    // Data-ops surfaces — sources, health, catalog.
    title: 'nav.groups.dataManagement',
    minRole: 'admin',
    items: [
      { path: '/admin/sources',      label: 'nav.sourcesDashboard', icon: Database },
      { path: '/admin/audit',        label: 'nav.sourcesAudit',     icon: FileSearch },
      { path: '/data/yente-catalog', label: 'nav.yenteCatalog',     icon: Server },
    ],
  },
  {
    // Account / billing / integrations.
    title: 'nav.groups.system',
    minRole: 'admin',
    items: [
      { path: '/admin/users',    label: 'nav.users',    icon: UsersIcon, shortcut: 'G U' },
      { path: '/admin/api-keys', label: 'nav.apiKeys',  icon: Key,       shortcut: 'G K' },
      { path: '/admin/webhooks', label: 'nav.webhooks', icon: Webhook },
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
  const { t } = useTranslation();
  const location = useLocation();
  const isActive =
    location.pathname === item.path ||
    (item.path !== '/' && location.pathname.startsWith(item.path));
  const Icon = item.icon;
  const label = t(item.label);

  const content = (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm',
        isActive
          ? 'bg-primary/10 text-foreground border-l-2 border-primary dark:border-brand-electric pl-[10px]'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon className={cn('shrink-0 w-4 h-4', isActive && 'text-primary dark:text-brand-electric')} aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          {label}
          {item.shortcut && (
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
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
    return <div className="h-px bg-border mx-3 my-2" />;
  }
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
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
  const { t } = useTranslation();
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
            'flex items-center gap-2 px-4 py-4 border-b border-border',
            collapsed && 'justify-center px-0',
          )}
        >
          <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-brand-blue to-brand-electric flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold text-foreground">Sentinel</span>
          )}
        </Link>

        {/* Command palette trigger — replaces a search box at the top */}
        <div className={cn('px-3 pt-3', collapsed && 'px-2')}>
          <button
            type="button"
            onClick={onToggleCommand}
            aria-label={t('sidebar.openCommand')}
            className={cn(
              'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
              'bg-muted hover:bg-secondary text-muted-foreground text-sm transition-colors',
              collapsed && 'justify-center px-0',
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CommandIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!collapsed && <span className="truncate">{t('sidebar.commandPalette')}</span>}
            </div>
            {!collapsed && (
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground">
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
              {idx > 0 && <SectionLabel collapsed={collapsed}>{t(group.title)}</SectionLabel>}
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

        {/* Bottom rail: usage + health + theme toggle + user */}
        <div className={cn('border-t border-border p-2 space-y-2', collapsed && 'px-2')}>
          {!collapsed && (
            <div className="flex items-center justify-around px-1">
              <UsageIndicator />
              <HealthIndicator />
            </div>
          )}

          <LanguageToggle collapsed={collapsed} />
          <ThemeToggle collapsed={collapsed} />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('sidebar.userMenu')}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-brand-blue to-brand-electric text-white text-xs">
                      {getInitials(
                        `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
                        user.email ||
                        user.username,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-xs font-medium text-foreground truncate">
                        {user.first_name || user.email || user.username}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {user.role}
                      </div>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-xs text-muted-foreground">{t('sidebar.signedInAs')}</div>
                  <div className="text-sm font-medium text-foreground truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-300 focus:text-red-200">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('sidebar.logout')}
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
  const { t } = useTranslation();
  return (
    <motion.aside
      key="nav-rail"
      initial={{ opacity: 0, y: -28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -28 }}
      transition={springRail}
      className={cn(
        'hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col',
        'bg-sidebar border-r border-sidebar-border',
        'transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      )}
      aria-label={t('sidebar.mainNav')}
    >
      <SidebarBody collapsed={collapsed} onToggleCommand={onToggleCommand} />

      {/* Collapse toggle on the right edge */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        className={cn(
          'absolute -right-3 top-20 z-40',
          'w-6 h-6 rounded-full bg-muted border border-border',
          'flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary',
          'transition-colors shadow-sm',
        )}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </motion.aside>
  );
}

/** Mobile topbar — minimal, hamburger opens the drawer with full sidebar.
 *  collapse props ignored on mobile (the drawer is always full width). */
export function TopbarMobile({ onToggleCommand }: { onToggleCommand: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        'lg:hidden sticky top-0 z-30',
        'flex items-center justify-between gap-2 h-14 px-3',
        'bg-sidebar/95 backdrop-blur-xl border-b border-sidebar-border',
      )}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('sidebar.openMenu')}>
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-[280px] bg-sidebar border-r border-sidebar-border"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{t('sidebar.nav')}</SheetTitle>
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
        <span className="text-sm font-semibold text-foreground">Sentinel</span>
      </Link>

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCommand}
        aria-label={t('sidebar.openSearch')}
      >
        <Search className="w-4.5 h-4.5" />
      </Button>
    </header>
  );
}

export { useSidebarCollapse };
