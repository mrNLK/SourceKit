import { useState, useCallback } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Search, FlaskConical, GitBranch, Settings, Clock, Bookmark, CheckSquare, List, Menu, X, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useWatchlist } from '@/hooks/useWatchlist'

const sidebarItems = [
  { to: '/search', icon: Search, label: 'New Search' },
  { to: '/research', icon: FlaskConical, label: 'Research' },
  { to: '/pipeline', icon: GitBranch, label: 'Pipeline' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/watchlist', icon: Bookmark, label: 'Watchlist', showBadge: true },
  { to: '/bulk-actions', icon: CheckSquare, label: 'Bulk Actions' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const { watchlistCount } = useWatchlist()
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex h-screen h-[100dvh] bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0f0f14] border-r border-border shrink-0">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border/50">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">SK</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground">SourceKit</h1>
        </div>

        <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
          {sidebarItems.map(({ to, icon: Icon, label, showBadge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-[#00e5a0]'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{label}</span>
              {showBadge && watchlistCount > 0 && (
                <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  {watchlistCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-border/50 space-y-2">
          {user && (
            <p className="text-xs text-muted-foreground truncate px-3">{user.email}</p>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={closeMobile} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-[#0f0f14] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">SK</span>
                </div>
                <h1 className="text-lg font-semibold text-foreground">SourceKit</h1>
              </div>
              <button onClick={closeMobile} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto">
              {sidebarItems.map(({ to, icon: Icon, label, showBadge }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/15 text-[#00e5a0]'
                        : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }`
                  }
                >
                  <Icon className="w-4.5 h-4.5 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {showBadge && watchlistCount > 0 && (
                    <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      {watchlistCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="px-3 py-3 border-t border-border/50 space-y-2">
              {user && (
                <p className="text-xs text-muted-foreground truncate px-3">{user.email}</p>
              )}
              <button
                onClick={() => { signOut(); closeMobile() }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
              >
                <LogOut className="w-4.5 h-4.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <header className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)} className="p-1 text-muted-foreground hover:text-foreground">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs">SK</span>
            </div>
            <span className="font-semibold text-foreground">SourceKit</span>
          </div>
          <div className="w-7" /> {/* spacer */}
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
