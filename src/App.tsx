import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { easeWater } from '@/lib/motion';
import i18n from '@/i18n';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { SearchHistoryProvider } from '@/contexts/SearchHistoryContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { ListPageSkeleton } from '@/components/foundation';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/RoleGate';
import { PublicOnlyRoute } from '@/components/PublicOnlyRoute';
import { Sidebar, TopbarMobile } from '@/components/Sidebar';
import { SearchSidebar } from '@/components/search/SearchSidebar';
import type { Role } from '@/hooks/usePermissions';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function lazyNamedPage<TModule extends Record<string, unknown>>(
  loader: () => Promise<TModule>,
  exportName: keyof TModule,
) {
  return lazy(async () => {
    const module = await loader();
    return { default: module[exportName] as ComponentType<any> };
  });
}

const CommandPalette = lazyNamedPage(() => import('@/components/CommandPalette'), 'CommandPalette');
const LoginPage = lazyNamedPage(() => import('@/pages/auth/LoginPage'), 'LoginPage');
const SignUpPage = lazyNamedPage(() => import('@/pages/auth/SignUpPage'), 'SignUpPage');
const OAuthCallbackPage = lazyNamedPage(() => import('@/pages/auth/OAuthCallbackPage'), 'OAuthCallbackPage');

const HomePage = lazyNamedPage(() => import('@/pages/workspace/HomePage'), 'HomePage');
const SearchPage = lazyNamedPage(() => import('@/pages/workspace/SearchPage'), 'SearchPage');
const EntityProfilePage = lazyNamedPage(() => import('@/pages/entity/EntityProfilePage'), 'EntityProfilePage');
const SourcesDashboardPage = lazyNamedPage(() => import('@/pages/data/SourcesDashboardPage'), 'SourcesDashboardPage');
const MonitoringPage = lazyNamedPage(() => import('@/pages/insights/MonitoringPage'), 'MonitoringPage');
const OperationsPage = lazyNamedPage(() => import('@/pages/insights/OperationsPage'), 'OperationsPage');
const BulkScreeningPage = lazyNamedPage(() => import('@/pages/workspace/BulkScreeningPage'), 'BulkScreeningPage');
const AuditPage = lazyNamedPage(() => import('@/pages/data/AuditPage'), 'AuditPage');
const MergeReviewPage = lazyNamedPage(() => import('@/pages/review/MergeReviewPage'), 'MergeReviewPage');
const ComplianceDashboardPage = lazyNamedPage(() => import('@/pages/compliance/ComplianceDashboardPage'), 'ComplianceDashboardPage');
const CaseDetailPage = lazyNamedPage(() => import('@/pages/compliance/CaseDetailPage'), 'CaseDetailPage');
const ReportsPage = lazy(() => import('@/pages/insights/ReportsPage'));
const AdverseMediaPage = lazyNamedPage(() => import('@/pages/compliance/AdverseMediaPage'), 'AdverseMediaPage');
const FederatedSearchPage = lazyNamedPage(() => import('@/pages/workspace/FederatedSearchPage'), 'FederatedSearchPage');
const ResolverReviewPage = lazyNamedPage(() => import('@/pages/review/ResolverReviewPage'), 'ResolverReviewPage');
const ValidationReviewPage = lazyNamedPage(() => import('@/pages/review/ValidationReviewPage'), 'ValidationReviewPage');
const ApiKeysPage = lazy(() => import('@/pages/admin/ApiKeysPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const ActivityLogPage = lazy(() => import('@/pages/insights/ActivityLogPage'));
const WebhooksPage = lazy(() => import('@/pages/admin/WebhooksPage'));
const YenteCatalogPage = lazyNamedPage(() => import('@/pages/data/YenteCatalogPage'), 'YenteCatalogPage');

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(async () => {
      const module = await import('@tanstack/react-query-devtools');
      return { default: module.ReactQueryDevtools };
    })
  : null;

function RouteLoadingFallback() {
  return (
    <ListPageSkeleton
      showMetrics={false}
      showFilters={false}
      rowCount={4}
      rowHeightClassName="h-24"
    />
  );
}

// Layout component for authenticated pages.
//
// Shell: persistent sidebar (240/60px) on lg+, off-canvas drawer + slim
// topbar on < lg. CommandPalette is mounted at the layout level so
// ⌘K / Ctrl+K works on any route.
//
// MODO BÚSQUEDA: en /search el nav principal se reemplaza por completo por
// el SearchSidebar (historial). El morph es un AnimatePresence sobre el rail
// fijo + una transición suave del padding de <main> (el centro "crece" de
// ancho), y un reveal de arriba-hacia-abajo del contenido en cada ruta.
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useCommandPalette();
  const { collapsed, toggle } = useSidebarCollapse();
  const location = useLocation();
  const isSearchMode = location.pathname === '/search';

  // Rail width: 264px en modo búsqueda (SearchSidebar), 60/240 en nav normal.
  // Clases estáticas para que Tailwind JIT las genere.
  const railPadding = isSearchMode
    ? 'lg:pl-[264px]'
    : collapsed
      ? 'lg:pl-[60px]'
      : 'lg:pl-[240px]';

  return (
    <>
      {/* Desktop rail — morphs nav ⇄ historial */}
      <AnimatePresence initial={false}>
        {isSearchMode ? (
          <SearchSidebar key="search-rail" />
        ) : (
          <Sidebar
            key="nav-rail"
            onToggleCommand={() => setOpen(true)}
            collapsed={collapsed}
            onToggleCollapse={toggle}
          />
        )}
      </AnimatePresence>

      <TopbarMobile onToggleCommand={() => setOpen(true)} />

      {open ? (
        <Suspense fallback={null}>
          <CommandPalette open={open} onOpenChange={setOpen} />
        </Suspense>
      ) : null}

      <main
        className={cn(
          'min-h-screen transition-[padding] duration-[1100ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
          railPadding,
        )}
      >
        {/* Reveal de contenido por ruta — de arriba hacia abajo, fluido. */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: easeWater }}
        >
          {children}
        </motion.div>
      </main>
    </>
  );
}

function GuardedPage({
  children,
  minimumRole = 'readonly',
}: {
  children: React.ReactNode;
  minimumRole?: Role;
}) {
  return (
    <AuthenticatedLayout>
      <RoleGate minimumRole={minimumRole} redirectOnDenied>
        <Suspense fallback={<RouteLoadingFallback />}>
          {children}
        </Suspense>
      </RoleGate>
    </AuthenticatedLayout>
  );
}

function App() {
  // Backend data (entity profiles, relationships, search…) is localized via
  // the `lang` query param sent on every request. React Query caches by key
  // (which doesn't include lang), so when the UI language changes we must
  // invalidate cached queries to refetch in the new language.
  useEffect(() => {
    const handler = () => queryClient.invalidateQueries();
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SearchHistoryProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              {/* Guest-only routes: redirect to / if already authenticated */}
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <Suspense fallback={<RouteLoadingFallback />}>
                      <LoginPage />
                    </Suspense>
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <Suspense fallback={<RouteLoadingFallback />}>
                      <SignUpPage />
                    </Suspense>
                  </PublicOnlyRoute>
                }
              />
              {/* OAuth callback: deliberately NOT wrapped in PublicOnlyRoute —
                  its whole job is to flip the user FROM anonymous TO
                  authenticated, so the guard would race the token write
                  and bounce us before we got to set the session. */}
              <Route
                path="/auth/callback"
                element={
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <OAuthCallbackPage />
                  </Suspense>
                }
              />
              
              {/* Public Routes */}
              <Route
                path="/"
                element={
                  <GuardedPage>
                    <HomePage />
                  </GuardedPage>
                }
              />
              <Route
                path="/search"
                element={
                  <GuardedPage>
                    <SearchPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/entity/:id"
                element={
                  <GuardedPage>
                    <EntityProfilePage />
                  </GuardedPage>
                }
              />
              <Route
                path="/screening/bulk"
                element={
                  <GuardedPage minimumRole="analyst">
                    <BulkScreeningPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/federated"
                element={
                  <GuardedPage>
                    <FederatedSearchPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/resolver-review"
                element={
                  <GuardedPage minimumRole="reviewer">
                    <ResolverReviewPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/validation-review"
                element={
                  <GuardedPage minimumRole="reviewer">
                    <ValidationReviewPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <GuardedPage minimumRole="admin">
                    <UsersPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/api-keys"
                element={
                  <GuardedPage minimumRole="admin">
                    <ApiKeysPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/activity-log"
                element={
                  <GuardedPage minimumRole="admin">
                    <ActivityLogPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/webhooks"
                element={
                  <GuardedPage minimumRole="admin">
                    <WebhooksPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/sources"
                element={
                  <GuardedPage minimumRole="admin">
                    <SourcesDashboardPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/data/yente-catalog"
                element={
                  <GuardedPage minimumRole="admin">
                    <YenteCatalogPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <GuardedPage minimumRole="admin">
                    <AuditPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/admin/merges"
                element={
                  <GuardedPage minimumRole="reviewer">
                    <MergeReviewPage />
                  </GuardedPage>
                }
              />
              
              {/* Adverse Media */}
              <Route
                path="/adverse-media"
                element={
                  <GuardedPage minimumRole="analyst">
                    <AdverseMediaPage />
                  </GuardedPage>
                }
              />

              {/* Compliance */}
              <Route
                path="/compliance"
                element={
                  <GuardedPage minimumRole="analyst">
                    <ComplianceDashboardPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/compliance/cases/:caseId"
                element={
                  <GuardedPage minimumRole="analyst">
                    <CaseDetailPage />
                  </GuardedPage>
                }
              />

              <Route
                path="/operations"
                element={
                  <GuardedPage minimumRole="reviewer">
                    <OperationsPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/monitoring"
                element={
                  <GuardedPage minimumRole="reviewer">
                    <MonitoringPage />
                  </GuardedPage>
                }
              />
              <Route
                path="/reports"
                element={
                  <GuardedPage minimumRole="reviewer">
                    <ReportsPage />
                  </GuardedPage>
                }
              />              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  color: 'hsl(var(--popover-foreground))',
                },
              }}
            />
          </div>
        </Router>
        </SearchHistoryProvider>
      </AuthProvider>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}

export default App;
