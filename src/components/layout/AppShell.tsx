import { useState, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Search, FlaskConical, GitBranch, Settings, MessageSquare } from 'lucide-react'
import { useCandidates } from '@/hooks/useCandidates'

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
  const { allCandidates } = useCandidates()
  const pipelineCount = allCandidates.length

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
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">SK</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">SourceKit</h1>
        </div>
        <a
          href="https://github.com/mrNLK/SourceProof/issues/new?labels=feedback&title=Feedback"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-secondary"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Feedback</span>
        </a>
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
                {to === '/pipeline' && pipelineCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1">
                    {pipelineCount}
                  </span>
                )}
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
