import { useState } from "react";
import { Search, Clock, Kanban, Bookmark, Settings, LogOut, Zap, Menu, X, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWatchlist } from "@/hooks/useWatchlist";

export type ActiveTab = "search" | "history" | "pipeline" | "watchlist" | "bulk" | "settings";

interface DashboardLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
  { id: "search", label: "New Search", icon: Search },
  { id: "history", label: "History", icon: Clock },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "bulk", label: "Bulk Actions", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

const DashboardLayout = ({ activeTab, onTabChange, children }: DashboardLayoutProps) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count: watchlistCount } = useWatchlist();

  const handleNav = (tab: ActiveTab) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center glow-sm">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <span className="font-display text-sm font-semibold tracking-tight text-foreground">
          SourceKit
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="font-display text-xs tracking-wide flex-1 text-left">{item.label}</span>
              {item.id === "watchlist" && watchlistCount > 0 && (
                <span className="ml-auto text-[10px] font-display font-semibold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                  {watchlistCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border px-3 py-4 space-y-2">
        <div className="px-3 py-1.5">
          <p className="text-[11px] font-display text-muted-foreground truncate">
            user@sourcekit.dev
          </p>
        </div>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="font-display text-xs tracking-wide">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-64 shrink-0 bg-card border-r border-border fixed inset-y-0 left-0 z-40">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className={`flex-1 ${!isMobile ? "ml-64" : ""}`}>
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-display text-sm font-semibold text-foreground">SourceKit</span>
            </div>
          </header>
        )}

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
