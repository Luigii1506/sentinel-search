import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { Navigation } from '@/components/Navigation';
import { LoginPage } from '@/pages/LoginPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { EntityProfilePage } from '@/pages/EntityProfilePage';
import { SourcesDashboardPage } from '@/pages/SourcesDashboardPage';
import { MonitoringPage } from '@/pages/MonitoringPage';
import { OperationsPage } from '@/pages/OperationsPage';
import { BulkScreeningPage } from '@/pages/BulkScreeningPage';
import { AuditPage } from '@/pages/AuditPage';
import { MergeReviewPage } from '@/pages/MergeReviewPage';
import { ComplianceDashboardPage } from '@/pages/ComplianceDashboardPage';
import { CaseDetailPage } from '@/pages/CaseDetailPage';
import ReportsPage from '@/pages/ReportsPage';
import { AdverseMediaPage } from '@/pages/AdverseMediaPage';
import { FederatedSearchPage } from '@/pages/FederatedSearchPage';
import { ResolverReviewPage } from '@/pages/ResolverReviewPage';
import { ValidationReviewPage } from '@/pages/ValidationReviewPage';
import ApiKeysPage from '@/pages/ApiKeysPage';
import ActivityLogPage from '@/pages/ActivityLogPage';
import WebhooksPage from '@/pages/WebhooksPage';
import { RoleGate } from '@/components/RoleGate';

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

// Layout component for authenticated pages
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <main className="pt-14 sm:pt-16">
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
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              
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
                    <SourcesDashboardPage />
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
