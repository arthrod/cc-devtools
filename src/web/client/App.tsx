import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';
import { useSSE } from './hooks/useSSE.js';
import { PageErrorBoundary } from './components/common/PageErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import { useAppStore } from './stores/appStore';
import { syncTokenToVibeTunnel } from './services/api.service';

// Lazy load heavy pages for better initial bundle size
const KanbanPage = lazy(() => import('./pages/KanbanPage').then(m => ({ default: m.KanbanPage })));
const EditorPage = lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage })));
const ConsolePage = lazy(() => import('./pages/ConsolePage').then(m => ({ default: m.ConsolePage })));
const MemoryExplorer = lazy(() => import('./pages/MemoryExplorer').then(m => ({ default: m.MemoryExplorer })));
const PlanExplorer = lazy(() => import('./pages/PlanExplorer').then(m => ({ default: m.PlanExplorer })));
const FileRunnerPage = lazy(() => import('./pages/FileRunnerPage').then(m => ({ default: m.FileRunnerPage })));

/**
 * Protected route component that requires authentication.
 */
interface ProtectedRouteProps {
  children: JSX.Element;
}

function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Main application component managing routing and authentication.
 *
 * Routes:
 * - /login - Authentication page
 * - / - Redirects to /kanban
 * - /kanban - Kanban board (protected)
 * - /editor - Code editor (protected)
 * - /console - Remote terminal console (protected)
 * - /memory - Memory explorer (protected)
 * - /plans - Plan explorer (protected)
 * - /file-runner - Per-file runner (protected)
 */
export function App(): JSX.Element {
  // Initialize SSE connection for real-time updates
  useSSE();

  const darkMode = useAppStore((state) => state.darkMode);
  const directoryName = useAppStore((state) => state.directoryName);
  const fetchSystemInfo = useAppStore((state) => state.fetchSystemInfo);

  // Initialize dark mode, system info, and VibeTunnel auth sync on mount
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Sync existing auth token to VibeTunnel localStorage for WebSocket auth
    syncTokenToVibeTunnel();

    void fetchSystemInfo();
  }, [darkMode, fetchSystemInfo]);

  // Update document title when project name changes
  useEffect(() => {
    const projectName = directoryName ?? 'CC-DevTools';
    document.title = `${projectName} - CC-DevTools`;
  }, [directoryName]);

  const loadingFallback = (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
        <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
      </div>
    </div>
  );

  return (
    <PageErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/"
            element={<Navigate to="/kanban" replace />}
          />
          <Route
            path="/kanban"
            element={
              <PageErrorBoundary>
                <Suspense fallback={loadingFallback}>
                  <KanbanPage />
                </Suspense>
              </PageErrorBoundary>
            }
          />
          <Route
            path="/editor"
            element={
              <PageErrorBoundary>
                <Suspense fallback={loadingFallback}>
                  <EditorPage />
                </Suspense>
              </PageErrorBoundary>
            }
          />
          <Route
            path="/console"
            element={
              <PageErrorBoundary>
                <Suspense fallback={loadingFallback}>
                  <ConsolePage />
                </Suspense>
              </PageErrorBoundary>
            }
          />
          <Route
            path="/memory"
            element={
              <PageErrorBoundary>
                <Suspense fallback={loadingFallback}>
                  <MemoryExplorer />
                </Suspense>
              </PageErrorBoundary>
            }
          />
          <Route
            path="/plans"
            element={
              <PageErrorBoundary>
                <Suspense fallback={loadingFallback}>
                  <PlanExplorer />
                </Suspense>
              </PageErrorBoundary>
            }
          />
          <Route
            path="/file-runner"
            element={
              <PageErrorBoundary>
                <Suspense fallback={loadingFallback}>
                  <FileRunnerPage />
                </Suspense>
              </PageErrorBoundary>
            }
          />
        </Route>
        <Route
          path="*"
          element={
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  404
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Page not found
                </p>
              </div>
            </div>
          }
        />
      </Routes>
    </PageErrorBoundary>
  );
}
