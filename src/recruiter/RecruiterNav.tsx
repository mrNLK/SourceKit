import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, Users, Kanban, Mail,
  ClipboardList, Bot, BarChart2, Settings, LogOut,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const NAV_ITEMS = [
  { path: '/recruiter', label: 'Command Center', icon: LayoutDashboard, exact: true },
  { path: '/recruiter/search', label: 'Search Lab', icon: Search },
  { path: '/recruiter/candidates', label: 'Candidate Intel', icon: Users },
  { path: '/recruiter/pipeline', label: 'Team Pipeline', icon: Kanban },
  { path: '/recruiter/outreach', label: 'Outreach Studio', icon: Mail },
  { path: '/recruiter/scorecards', label: 'Role Scorecards', icon: ClipboardList },
  { path: '/recruiter/agents', label: 'Agent Runs', icon: Bot },
  { path: '/recruiter/reports', label: 'Reports', icon: BarChart2 },
  { path: '/recruiter/settings', label: 'Settings', icon: Settings },
] as const;

export default function RecruiterNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--ros-bg-secondary)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: 'var(--ros-border)' }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--ros-accent-muted)' }}>
          <span className="text-xs font-bold font-mono" style={{ color: 'var(--ros-accent)' }}>SK</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--ros-text-primary)' }}>
            SourceKit
          </span>
          <span className="text-[10px] font-mono font-medium tracking-widest uppercase" style={{ color: 'var(--ros-accent)' }}>
            Recruiter OS
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
              style={{
                background: active ? 'var(--ros-accent-muted)' : 'transparent',
                color: active ? 'var(--ros-accent)' : 'var(--ros-text-secondary)',
                borderLeft: active ? '2px solid var(--ros-accent)' : '2px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = 'var(--ros-bg-hover)';
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="font-mono text-xs tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t space-y-1" style={{ borderColor: 'var(--ros-border)' }}>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors"
          style={{ color: 'var(--ros-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ros-text-secondary)'; e.currentTarget.style.background = 'var(--ros-bg-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ros-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Original SourceKit</span>
        </button>
        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono transition-colors"
          style={{ color: 'var(--ros-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ros-text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
