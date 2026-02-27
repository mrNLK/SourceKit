import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppShell } from './components/layout/AppShell'
import { AuthPage } from './pages/AuthPage'
import { SearchPage } from './pages/SearchPage'
import { ResearchPage } from './pages/ResearchPage'
import { PipelinePage } from './pages/PipelinePage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfilePage } from './pages/ProfilePage'
import { HistoryPage } from './pages/HistoryPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { BulkActionsPage } from './pages/BulkActionsPage'
import { track } from './lib/analytics'

function PageTracker() {
  const location = useLocation()
  useEffect(() => {
    track('page_viewed', { path: location.pathname })
  }, [location.pathname])
  return null
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
            <Route path="/search" element={<ErrorBoundary fallbackTitle="Search encountered an error"><SearchPage /></ErrorBoundary>} />
            <Route path="/research" element={<ErrorBoundary fallbackTitle="Research encountered an error"><ResearchPage /></ErrorBoundary>} />
            <Route path="/pipeline" element={<ErrorBoundary fallbackTitle="Pipeline encountered an error"><PipelinePage /></ErrorBoundary>} />
            <Route path="/history" element={<ErrorBoundary fallbackTitle="History encountered an error"><HistoryPage /></ErrorBoundary>} />
            <Route path="/watchlist" element={<ErrorBoundary fallbackTitle="Watchlist encountered an error"><WatchlistPage /></ErrorBoundary>} />
            <Route path="/bulk-actions" element={<ErrorBoundary fallbackTitle="Bulk Actions encountered an error"><BulkActionsPage /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary fallbackTitle="Settings encountered an error"><SettingsPage /></ErrorBoundary>} />
            <Route path="/profile/:id" element={<ErrorBoundary fallbackTitle="Profile encountered an error"><ProfilePage /></ErrorBoundary>} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
