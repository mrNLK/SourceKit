import { useState } from "react";
import { Search, Clock, Kanban, Bookmark, Settings, LogOut, Menu, X, Users, Sparkles, Crown } from "lucide-react";
import sourcekitLogo from "@/assets/sourcekit-bare.svg";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

export type ActiveTab = "search" | "research" | "history" | "pipeline" | "watchlist" | "bulk" | "settings";

interface DashboardLayoutProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: ActiveTab; label: string; icon: React.ElementType; tip: string }[] = [
  { id: "research", label: "New Search", icon: Sparkles, tip: "Build a sourcing strategy from a role or job description" },
  { id: "search", label: "Results", icon: Search, tip: "View search results and score candidates" },
  { id: "history", label: "History", icon: Clock, tip: "Your past searches and research sessions" },
  { id: "pipeline", label: "Pipeline", icon: Kanban, tip: "Active recruiting funnel \u2014 candidates you're pursuing now" },
  { id: "watchlist", label: "Watchlist", icon: Bookmark, tip: "Tracking list for candidates to revisit later" },
  { id: "bulk", label: "Bulk Actions", icon: Users, tip: "AI-powered batch operations on pipeline candidates" },
  { id: "settings", label: "Settings", icon: Settings, tip: "Configure API keys, webhooks, and integrations" },
];

const DashboardLayout = ({ activeTab, onTabChange, children }: DashboardLayoutProps) => {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { count: watchlistCount } = useWatchlist();
  const { subscription } = useSubscription();

  const handleNav = (tab: ActiveTab) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <img src={sourcekitLogo} alt="SourceKit" className="w-7 h-7" />
        <span className="font-display text-sm font-semibold tracking-tight">
          <span className="text-muted-foreground">Source</span><span className="text-primary">Kit</span>
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
              title={item.tip}
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

      {/* Usage indicator */}
      {subscription && (
        <div className="px-4 pb-3">
          {subscription.plan === 'pro' ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-display font-semibold text-primary">Pro</span>
            </div>
          ) : (
            <div className="px-3 py-2.5 rounded-lg bg-secondary border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-display font-medium ${
                  subscription.searches_remaining !== null && subscription.searches_remaining <= 0
                    ? 'text-destructive'
                    : subscription.searches_remaining !== null && subscription.searches_remaining <= 3
                      ? 'text-warning'
                      : 'text-muted-foreground'
                }`}>
                  {subscription.searches_used} / {subscription.search_limit ?? 10} searches
                </span>
              </div>
              <Progress
                value={(subscription.searches_used / (subscription.search_limit ?? 10)) * 100}
                className="h-1.5"
              />
            </div>
          )}
        </div>
      )}

      {/* Bottom section */}
      <div className="border-t border-border px-3 py-4 space-y-2">
        <div className="px-3 py-1.5">
          <p className="text-[11px] font-display text-muted-foreground truncate">
            user@sourcekit.dev
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
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
              <img src={sourcekitLogo} alt="SourceKit" className="w-5 h-5" />
              <span className="font-display text-sm font-semibold">
                <span className="text-muted-foreground">Source</span><span className="text-primary">Kit</span>
              </span>
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
