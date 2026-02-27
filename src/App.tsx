import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { AuthPage } from './pages/AuthPage'
import { track } from './lib/analytics'
import { cleanupStaleStorageKeys } from './lib/storageCleanup'

// Lazy-loaded page components for route-level code splitting
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })))
const ResearchPage = lazy(() => import('./pages/ResearchPage').then(m => ({ default: m.ResearchPage })))
const PipelinePage = lazy(() => import('./pages/PipelinePage').then(m => ({ default: m.PipelinePage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const WatchlistPage = lazy(() => import('./pages/WatchlistPage').then(m => ({ default: m.WatchlistPage })))
const BulkActionsPage = lazy(() => import('./pages/BulkActionsPage').then(m => ({ default: m.BulkActionsPage })))

// Clean up stale localStorage keys on app boot
cleanupStaleStorageKeys()

function PageTracker() {
  const location = useLocation()
  useEffect(() => {
    track('page_viewed', { path: location.pathname })
  }, [location.pathname])
  return null
}

function RouteSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-6 h-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PageTracker />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/" element={<Navigate to="/search" replace />} />
            <Route path="/search" element={<ErrorBoundary fallbackTitle="Search encountered an error"><Suspense fallback={<RouteSpinner />}><SearchPage /></Suspense></ErrorBoundary>} />
            <Route path="/research" element={<ErrorBoundary fallbackTitle="Research encountered an error"><Suspense fallback={<RouteSpinner />}><ResearchPage /></Suspense></ErrorBoundary>} />
            <Route path="/pipeline" element={<ErrorBoundary fallbackTitle="Pipeline encountered an error"><Suspense fallback={<RouteSpinner />}><PipelinePage /></Suspense></ErrorBoundary>} />
            <Route path="/history" element={<ErrorBoundary fallbackTitle="History encountered an error"><Suspense fallback={<RouteSpinner />}><HistoryPage /></Suspense></ErrorBoundary>} />
            <Route path="/watchlist" element={<ErrorBoundary fallbackTitle="Watchlist encountered an error"><Suspense fallback={<RouteSpinner />}><WatchlistPage /></Suspense></ErrorBoundary>} />
            <Route path="/bulk-actions" element={<ErrorBoundary fallbackTitle="Bulk Actions encountered an error"><Suspense fallback={<RouteSpinner />}><BulkActionsPage /></Suspense></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary fallbackTitle="Settings encountered an error"><Suspense fallback={<RouteSpinner />}><SettingsPage /></Suspense></ErrorBoundary>} />
            <Route path="/profile/:id" element={<ErrorBoundary fallbackTitle="Profile encountered an error"><Suspense fallback={<RouteSpinner />}><ProfilePage /></Suspense></ErrorBoundary>} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
