import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navigation } from '@/components/Navigation';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { EntityProfilePage } from '@/pages/EntityProfilePage';

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
      <main className="pt-16">
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
          <div className="min-h-screen bg-[#0a0a0a] text-white">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              
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

              {/* Protected Routes */}
              <Route
                path="/monitoring"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <div className="pt-24 px-8">
                        <h1 className="text-2xl font-bold mb-4">Monitoreo</h1>
                        <p className="text-gray-400">Dashboard de monitoreo en tiempo real (Próximamente)</p>
                      </div>
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <div className="pt-24 px-8">
                        <h1 className="text-2xl font-bold mb-4">Reportes</h1>
                        <p className="text-gray-400">Generación de reportes de cumplimiento (Próximamente)</p>
                      </div>
                    </AuthenticatedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <AuthenticatedLayout>
                      <div className="pt-24 px-8">
                        <h1 className="text-2xl font-bold mb-4">Configuración</h1>
                        <p className="text-gray-400">Configuración del sistema (Próximamente)</p>
                      </div>
                    </AuthenticatedLayout>
                  </ProtectedRoute>
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
