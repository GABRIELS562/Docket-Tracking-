import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { useAIAnalyticsStore } from './stores/aiAnalyticsStore';
import type { TenantId } from './pages/TenantSelectPage';
import { TENANTS } from './pages/TenantSelectPage';

// Lazy load pages for code splitting
// This reduces initial bundle size from ~565KB to ~200KB
const TenantSelectPage = lazy(() => import('./pages/TenantSelectPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const WarehouseSetupPage = lazy(() => import('./pages/WarehouseSetupPage'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Tenant initialization wrapper
 * Loads tenant from localStorage and initializes AI store
 */
function TenantProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  // Use individual selectors to avoid re-renders when unrelated state changes
  const setTenant = useAIAnalyticsStore((s) => s.setTenant);
  const currentTenant = useAIAnalyticsStore((s) => s.currentTenant);

  useEffect(() => {
    // Don't set tenant on landing page
    if (location.pathname === '/') return;

    // Load tenant from localStorage if not set
    if (!currentTenant) {
      const savedTenant = localStorage.getItem('selectedTenant') as TenantId | null;
      if (savedTenant && TENANTS[savedTenant]) {
        setTenant(savedTenant);
      }
    }
  }, [location.pathname, currentTenant, setTenant]);

  return <>{children}</>;
}

/**
 * Protected route wrapper - redirects to tenant selection if no tenant selected
 */
function RequireTenant({ children }: { children: React.ReactNode }) {
  const savedTenant = localStorage.getItem('selectedTenant');

  if (!savedTenant) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <TenantProvider>
      <Routes>
        {/* Root route structure */}
        <Route path="/">
          {/* Tenant Selection Landing Page - exact "/" match */}
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <TenantSelectPage />
              </Suspense>
            }
          />

          {/* Protected App Routes with Layout */}
          <Route
            element={
              <RequireTenant>
                <Layout />
              </RequireTenant>
            }
          >
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageLoader />}>
                  <DashboardPage />
                </Suspense>
              }
            />
            <Route
              path="search"
              element={
                <Suspense fallback={<PageLoader />}>
                  <SearchPage />
                </Suspense>
              }
            />
            <Route
              path="analytics"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AnalyticsPage />
                </Suspense>
              }
            />
            <Route
              path="admin"
              element={
                <Suspense fallback={<PageLoader />}>
                  <AdminPage />
                </Suspense>
              }
            />
            <Route
              path="setup"
              element={
                <Suspense fallback={<PageLoader />}>
                  <WarehouseSetupPage />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </TenantProvider>
  );
}

export default App;
