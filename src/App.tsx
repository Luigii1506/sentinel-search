import { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { useSidebarCollapse } from '@/hooks/useSidebarCollapse';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { ListPageSkeleton } from '@/components/foundation';
import { cn } from '@/lib/utils';
import { RoleGate } from '@/components/RoleGate';
import { PublicOnlyRoute } from '@/components/PublicOnlyRoute';
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

const Sidebar = lazyNamedPage(() => import('@/components/Sidebar'), 'Sidebar');
const TopbarMobile = lazyNamedPage(() => import('@/components/Sidebar'), 'TopbarMobile');
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
// ⌘K / Ctrl+K works on any route (the hook also binds the global
// keydown listener once).
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useCommandPalette();
  const { collapsed, toggle } = useSidebarCollapse();

  return (
    <>
      <Suspense fallback={null}>
        <Sidebar
          onToggleCommand={() => setOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={toggle}
        />
        <TopbarMobile onToggleCommand={() => setOpen(true)} />
      </Suspense>
      {open ? (
        <Suspense fallback={null}>
          <CommandPalette open={open} onOpenChange={setOpen} />
        </Suspense>
      ) : null}
      <main
        className={cn(
          'min-h-screen transition-[padding] duration-200',
          collapsed ? 'lg:pl-[60px]' : 'lg:pl-[240px]',
        )}
      >
        {children}
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
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-brand-carbon text-white">
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
                  background: '#1a1a1a',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#fff',
                },
              }}
            />
          </div>
        </Router>
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
