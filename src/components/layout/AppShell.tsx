import { useState, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Search, FlaskConical, GitBranch, Settings } from 'lucide-react'
import { SourceKitLogo } from '@/components/ui/SourceKitLogo'

const NAV_HINTS_KEY = 'sourcekit-nav-hints-dismissed'

const tabs = [
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/research', icon: FlaskConical, label: 'Research', hintable: true },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

function loadHintsDismissed(): boolean {
  try {
    return localStorage.getItem(NAV_HINTS_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppShell() {
  const [hintsDismissed, setHintsDismissed] = useState(loadHintsDismissed)
  const location = useLocation()

  const dismissHints = useCallback(() => {
    if (!hintsDismissed) {
      localStorage.setItem(NAV_HINTS_KEY, 'true')
      setHintsDismissed(true)
    }
  }, [hintsDismissed])

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <SourceKitLogo size={32} />
          <h1 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
            <span style={{ color: '#9E9E9E' }}>Source</span>
            <span style={{ color: '#00BFA5' }}>Kit</span>
          </h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card safe-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs.map(({ to, icon: Icon, label, hintable }) => {
            const showPulse = hintable && !hintsDismissed && location.pathname !== to
            return (
              <NavLink
                key={to}
                to={to}
                onClick={dismissHints}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
                {showPulse && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
