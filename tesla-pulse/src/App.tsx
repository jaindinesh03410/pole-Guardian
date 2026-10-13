import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useRTDB } from '@/hooks/useRTDB';
import { useAuthStore } from '@/store/authStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { PoleDetailPage } from '@/pages/PoleDetailPage';
import { FaultsPage } from '@/pages/FaultsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SensorsPage } from '@/pages/SensorsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { MaintenancePage } from '@/pages/MaintenancePage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  // LOGIN BYPASS: auth check disabled — grants direct dashboard access
  return <>{children}</>;
}

export default function App() {
  useAuth(); // sets up onAuthStateChanged listener
  useRTDB(); // sets up Firebase Realtime Database listener

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#0d1428', border: '1px solid #1e3a5f', color: '#fff', fontSize: 13 },
          error: { style: { border: '1px solid rgba(239,68,68,0.5)', background: '#1a0a0a' } },
          success: { style: { border: '1px solid rgba(34,197,94,0.4)', background: '#0a1a0a' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        }>
          <Route index element={<OverviewPage />} />
          <Route path="pole/:poleId" element={<PoleDetailPage />} />
          <Route path="faults" element={<FaultsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="sensors" element={<SensorsPage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
