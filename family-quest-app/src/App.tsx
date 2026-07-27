import { useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import { TasksProvider } from './context/TasksContext';
import { AuthPage } from './pages/AuthPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FamilySetupPage } from './pages/FamilySetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { PhotoGalleryPage } from './pages/PhotoGalleryPage';
import { HelpPage } from './pages/HelpPage';
import { Spinner } from './components/Spinner';
import { UndoSnackbar } from './components/UndoSnackbar';
import { InstallPromptBanner } from './components/InstallPromptBanner';
import { getLastPath, saveLastPath } from './lib/lastRoute';

function FullScreenLoading() {
  const { t } = useTranslation();
  return (
    <div className="screen loading-screen">
      <Spinner label={t('common.loading')} />
    </div>
  );
}

function RootGate() {
  const { session, initializing } = useAuth();
  const { family, loading: familyLoading } = useFamily();

  if (initializing) {
    return <FullScreenLoading />;
  }

  if (!session) {
    return <AuthPage />;
  }

  if (familyLoading) {
    return <FullScreenLoading />;
  }

  if (!family) {
    return <FamilySetupPage />;
  }

  return <DashboardPage />;
}

function ProtectedTaskDetail() {
  const { session, initializing } = useAuth();
  const { family, loading: familyLoading } = useFamily();

  if (initializing || familyLoading) {
    return <FullScreenLoading />;
  }
  if (!session) {
    return <Navigate to="/" replace />;
  }
  if (!family) {
    return <Navigate to="/" replace />;
  }
  return <TaskDetailPage />;
}

function ProtectedCalendar() {
  const { session, initializing } = useAuth();
  const { family, loading: familyLoading } = useFamily();

  if (initializing || familyLoading) {
    return <FullScreenLoading />;
  }
  if (!session) {
    return <Navigate to="/" replace />;
  }
  if (!family) {
    return <Navigate to="/" replace />;
  }
  return <CalendarPage />;
}

function ProtectedGallery() {
  const { session, initializing } = useAuth();
  const { family, loading: familyLoading } = useFamily();

  if (initializing || familyLoading) {
    return <FullScreenLoading />;
  }
  if (!session) {
    return <Navigate to="/" replace />;
  }
  if (!family) {
    return <Navigate to="/" replace />;
  }
  return <PhotoGalleryPage />;
}

// Android (Samsung Internet in particular) can kill the backgrounded tab
// while the native photo/file picker Activity is in front, then relaunch
// the PWA at the manifest's start_url ("/") instead of resuming the page
// the user was actually on -- landing them back on the dashboard mid-flow
// with no explanation. Persisting the last route and resuming it on a
// fresh boot that lands at "/" reproduces a normal "app remembers where
// you left off" experience regardless of why the OS restarted the page.
function ResumeLastRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    if (location.pathname === '/') {
      const lastPath = getLastPath();
      if (lastPath && lastPath !== '/') {
        navigate(lastPath, { replace: true });
      }
    }
    // Only ever runs once, on the first render after a full page load --
    // deliberately not re-checking on later in-app navigation back to "/".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveLastPath(location.pathname);
  }, [location.pathname]);

  return null;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootGate />} />
      <Route path="/task/:taskId" element={<ProtectedTaskDetail />} />
      <Route path="/calendar" element={<ProtectedCalendar />} />
      <Route path="/gallery" element={<ProtectedGallery />} />
      {/* No auth/family guard -- it's static instructions, and needs to be
          reachable from the login screen and family-setup screen too, both
          of which come before a session/family exist. */}
      <Route path="/help" element={<HelpPage />} />
      {/* No guard here either -- this is reached via the recovery link in
          the reset email, before any normal session/family exists yet. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ResumeLastRoute />
      <AuthProvider>
        <FamilyProvider>
          <TasksProvider>
            <AppRoutes />
            <UndoSnackbar />
          </TasksProvider>
        </FamilyProvider>
      </AuthProvider>
      <InstallPromptBanner />
    </BrowserRouter>
  );
}

export default App;
