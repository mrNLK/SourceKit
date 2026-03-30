import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import RecruiterNav from './RecruiterNav';
import '../recruiter/styles/recruiter-tokens.css';

export default function RecruiterLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="recruiter-os flex min-h-screen" style={{ background: 'var(--ros-bg-primary)', color: 'var(--ros-text-primary)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 fixed inset-y-0 left-0 z-40 border-r" style={{ borderColor: 'var(--ros-border)' }}>
        <RecruiterNav />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(10,10,15,0.8)', backdropFilter: 'blur(4px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-60 z-50 lg:hidden border-r" style={{ borderColor: 'var(--ros-border)' }}>
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-md"
              style={{ color: 'var(--ros-text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
            <RecruiterNav />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 lg:hidden flex items-center gap-3 px-4 py-3 border-b" style={{ background: 'var(--ros-bg-secondary)', borderColor: 'var(--ros-border)' }}>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md" style={{ color: 'var(--ros-text-secondary)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'var(--ros-accent-muted)' }}>
              <span className="text-[8px] font-bold font-mono" style={{ color: 'var(--ros-accent)' }}>SK</span>
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--ros-text-primary)' }}>Recruiter OS</span>
          </div>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
