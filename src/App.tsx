import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { Sidebar, TopbarMobile, useSidebarCollapse } from '@/components/Sidebar';
import { CommandPalette, useCommandPalette } from '@/components/CommandPalette';
import { cn } from '@/lib/utils';
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignUpPage } from '@/pages/auth/SignUpPage';
import { OAuthCallbackPage } from '@/pages/auth/OAuthCallbackPage';
import { HomePage } from '@/pages/workspace/HomePage';
import { SearchPage } from '@/pages/workspace/SearchPage';
import { EntityProfilePage } from '@/pages/entity/EntityProfilePage';
import { SourcesDashboardPage } from '@/pages/data/SourcesDashboardPage';
import { MonitoringPage } from '@/pages/insights/MonitoringPage';
import { OperationsPage } from '@/pages/insights/OperationsPage';
import { BulkScreeningPage } from '@/pages/workspace/BulkScreeningPage';
import { AuditPage } from '@/pages/data/AuditPage';
import { MergeReviewPage } from '@/pages/review/MergeReviewPage';
import { ComplianceDashboardPage } from '@/pages/compliance/ComplianceDashboardPage';
import { CaseDetailPage } from '@/pages/compliance/CaseDetailPage';
import ReportsPage from '@/pages/insights/ReportsPage';
import { AdverseMediaPage } from '@/pages/compliance/AdverseMediaPage';
import { FederatedSearchPage } from '@/pages/workspace/FederatedSearchPage';
import { ResolverReviewPage } from '@/pages/review/ResolverReviewPage';
import { ValidationReviewPage } from '@/pages/review/ValidationReviewPage';
import ApiKeysPage from '@/pages/admin/ApiKeysPage';
import UsersPage from '@/pages/admin/UsersPage';
import ActivityLogPage from '@/pages/insights/ActivityLogPage';
import WebhooksPage from '@/pages/admin/WebhooksPage';
import { YenteCatalogPage } from '@/pages/data/YenteCatalogPage';
import { RoleGate } from '@/components/RoleGate';
import { PublicOnlyRoute } from '@/components/PublicOnlyRoute';

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
      <Sidebar
        onToggleCommand={() => setOpen(true)}
        collapsed={collapsed}
        onToggleCollapse={toggle}
      />
      <TopbarMobile onToggleCommand={() => setOpen(true)} />
      <CommandPalette open={open} onOpenChange={setOpen} />
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
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicOnlyRoute>
                    <SignUpPage />
                  </PublicOnlyRoute>
                }
              />
              {/* OAuth callback: deliberately NOT wrapped in PublicOnlyRoute —
                  its whole job is to flip the user FROM anonymous TO
                  authenticated, so the guard would race the token write
                  and bounce us before we got to set the session. */}
              <Route path="/auth/callback" element={<OAuthCallbackPage />} />
              
              {/* Public Routes */}
              <Route
                path="/"
                element={
                  <AuthenticatedLayout>
                    <HomePage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/search"
                element={
                  <AuthenticatedLayout>
                    <SearchPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/entity/:id"
                element={
                  <AuthenticatedLayout>
                    <EntityProfilePage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/screening/bulk"
                element={
                  <AuthenticatedLayout>
                    <BulkScreeningPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/federated"
                element={
                  <AuthenticatedLayout>
                    <FederatedSearchPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/resolver-review"
                element={
                  <AuthenticatedLayout>
                    <ResolverReviewPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/validation-review"
                element={
                  <AuthenticatedLayout>
                    <ValidationReviewPage />
                  </AuthenticatedLayout>
                }
              />
              {/* Admin Routes - Public for now */}
              <Route
                path="/admin/users"
                element={
                  <AuthenticatedLayout>
                    <RoleGate minimumRole="admin">
                      <UsersPage />
                    </RoleGate>
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/api-keys"
                element={
                  <AuthenticatedLayout>
                    <RoleGate minimumRole="admin">
                      <ApiKeysPage />
                    </RoleGate>
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/activity-log"
                element={
                  <AuthenticatedLayout>
                    <RoleGate minimumRole="reviewer">
                      <ActivityLogPage />
                    </RoleGate>
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/webhooks"
                element={
                  <AuthenticatedLayout>
                    <RoleGate minimumRole="admin">
                      <WebhooksPage />
                    </RoleGate>
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/sources"
                element={
                  <AuthenticatedLayout>
                    <RoleGate minimumRole="admin">
                      <SourcesDashboardPage />
                    </RoleGate>
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/data/yente-catalog"
                element={
                  <AuthenticatedLayout>
                    <RoleGate minimumRole="admin">
                      <YenteCatalogPage />
                    </RoleGate>
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <AuthenticatedLayout>
                    <AuditPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/admin/merges"
                element={
                  <AuthenticatedLayout>
                    <MergeReviewPage />
                  </AuthenticatedLayout>
                }
              />
              
              {/* Adverse Media */}
              <Route
                path="/adverse-media"
                element={
                  <AuthenticatedLayout>
                    <AdverseMediaPage />
                  </AuthenticatedLayout>
                }
              />

              {/* Compliance */}
              <Route
                path="/compliance"
                element={
                  <AuthenticatedLayout>
                    <ComplianceDashboardPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/compliance/cases/:caseId"
                element={
                  <AuthenticatedLayout>
                    <CaseDetailPage />
                  </AuthenticatedLayout>
                }
              />

              {/* All Routes Public for now */}
              <Route
                path="/operations"
                element={
                  <AuthenticatedLayout>
                    <OperationsPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/monitoring"
                element={
                  <AuthenticatedLayout>
                    <MonitoringPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <AuthenticatedLayout>
                    <ReportsPage />
                  </AuthenticatedLayout>
                }
              />
              <Route
                path="/settings"
                element={
                  <AuthenticatedLayout>
                    <div className="pt-24 px-8">
                      <h1 className="text-2xl font-bold mb-4">Configuración</h1>
                      <p className="text-gray-400">Configuración del sistema (Próximamente)</p>
                    </div>
                  </AuthenticatedLayout>
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
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
