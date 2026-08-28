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
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { AccountDeletionPendingScreen } from './pages/AccountDeletionPendingScreen';
import { BirthdayRequiredScreen } from './pages/BirthdayRequiredScreen';
import { APP_MODE } from './lib/appMode';
import { ensurePurchasesConfigured } from './lib/purchases';
import { hideAdsBanner, initAdsForProfile, showAdsBannerIfNeeded } from './lib/ads';
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
  const { session, initializing, profile, profileLoading } = useAuth();
  const { family, loading: familyLoading } = useFamily();

  // Ads/purchases setup -- family-quest-app only, no-op on web/PWA and
  // no-op for business-quest-app (see each function's own APP_MODE-
  // independent native-platform check; the APP_MODE guard here just skips
  // the calls entirely rather than relying on that). Hooks must run
  // unconditionally before RootGate's early returns below, so the actual
  // "is there anything to do yet" checks live inside each effect body.
  useEffect(() => {
    if (APP_MODE !== 'family' || !session?.user) return;
    void ensurePurchasesConfigured(session.user.id);
  }, [session]);

  useEffect(() => {
    if (APP_MODE !== 'family' || !profile) return;
    void initAdsForProfile(profile);
  }, [profile]);

  // Banner is tied to this component's lifecycle -- shown only while the
  // dashboard root route is mounted, hidden on task detail/calendar/gallery
  // (separate routes that unmount RootGate) and re-shown on return. A
  // deliberately simple starting behavior rather than a global overlay.
  useEffect(() => {
    if (APP_MODE !== 'family') return;
    void showAdsBannerIfNeeded(family ?? null);
    return () => {
      void hideAdsBanner();
    };
  }, [family]);

  if (initializing) {
    return <FullScreenLoading />;
  }

  if (!session) {
    return <AuthPage />;
  }

  // Checked before familyLoading/family below -- a pending-deletion account
  // has nothing else worth loading, and this must never flash the real
  // dashboard first, so it waits on profileLoading rather than treating a
  // still-null profile as "not pending" (schema.sql section 43).
  if (profileLoading) {
    return <FullScreenLoading />;
  }

  if (profile?.deletion_requested_at) {
    return <AccountDeletionPendingScreen />;
  }

  // family-quest-app only (APP_MODE) -- see BirthdayRequiredScreen and
  // MONETIZATION_DESIGN.md section 1. Covers both new accounts that somehow
  // skipped signup's birthday field and every account created before it
  // existed at all.
  if (APP_MODE === 'family' && !profile?.birthday) {
    return <BirthdayRequiredScreen />;
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
      {/* Same reasoning as /help -- linked from the signup form and from
          Settings, both reachable before a session/family exists. */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      {/* No guard here either -- this is reached via the recovery link in
          the reset email, before any normal session/family exists yet. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// global.css's `img { -webkit-touch-callout: none; ... }` handles iOS
// Safari's long-press "Save Image"/"Copy" menu, but that property is
// WebKit-only -- Android Chrome (and other Chromium-based mobile browsers)
// fire a real `contextmenu` event on a long-press instead, which CSS alone
// can't suppress (2026-08 feedback: "길게 탭하는걸로 이미지 복사할수있는
// 버그"). One document-level listener, filtered to <img> targets, covers
// every image in the app without touching each component individually.
function BlockImageContextMenu() {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ResumeLastRoute />
      <BlockImageContextMenu />
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
