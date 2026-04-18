import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts';
import { PageLayout } from '../layouts';
import Analytics from '../pages/Analytics';
import Settings from '../pages/Settings';
import type { AppData } from '../hooks/useAppData';

interface AppRoutesProps {
  zones: AppData['zones'];
  readers: AppData['readers'];
  dockets: AppData['dockets'];
  notifications: AppData['notifications'];
}

export default function AppRoutes({ zones, readers, dockets, notifications }: AppRoutesProps) {
  return (
    <Routes>
      {/* Dashboard (3D View) */}
      <Route
        path="/"
        element={
          <MainLayout
            zones={zones}
            readers={readers}
            dockets={dockets}
            notifications={notifications}
          />
        }
      />

      {/* Analytics Page */}
      <Route
        path="/analytics"
        element={
          <PageLayout>
            <Analytics />
          </PageLayout>
        }
      />

      {/* Settings Page */}
      <Route
        path="/settings"
        element={
          <PageLayout>
            <Settings />
          </PageLayout>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
