import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { AuthProvider, useAuth } from './context/AuthContext';
import { FamilyProvider, useFamily } from './context/FamilyContext';
import { TasksProvider } from './context/TasksContext';
import { AuthPage } from './pages/AuthPage';
import { FamilySetupPage } from './pages/FamilySetupPage';
import { DashboardPage } from './pages/DashboardPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { CalendarPage } from './pages/CalendarPage';
import { Spinner } from './components/Spinner';
import { UndoSnackbar } from './components/UndoSnackbar';

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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootGate />} />
      <Route path="/task/:taskId" element={<ProtectedTaskDetail />} />
      <Route path="/calendar" element={<ProtectedCalendar />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FamilyProvider>
          <TasksProvider>
            <AppRoutes />
            <UndoSnackbar />
          </TasksProvider>
        </FamilyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
