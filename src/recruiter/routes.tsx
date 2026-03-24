import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';

// Lazy-load all recruiter pages for code splitting
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const SearchLab = lazy(() => import('./pages/SearchLab'));
const CandidateIntelList = lazy(() => import('./pages/CandidateIntelList'));
const CandidateIntelProfile = lazy(() => import('./pages/CandidateIntelProfile'));
const TeamPipeline = lazy(() => import('./pages/TeamPipeline'));
const OutreachStudio = lazy(() => import('./pages/OutreachStudio'));
const RoleScorecardList = lazy(() => import('./pages/RoleScorecardList'));
const RoleScorecardDetail = lazy(() => import('./pages/RoleScorecardDetail'));
const AgentRuns = lazy(() => import('./pages/AgentRuns'));
const Reports = lazy(() => import('./pages/Reports'));
const RecruiterSettings = lazy(() => import('./pages/RecruiterSettings'));

function RecruiterLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--ros-border)', borderTopColor: 'var(--ros-accent)' }}
      />
    </div>
  );
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RecruiterLoading />}>{children}</Suspense>;
}

export const recruiterRoutes = (
  <>
    <Route index element={<Lazy><CommandCenter /></Lazy>} />
    <Route path="search" element={<Lazy><SearchLab /></Lazy>} />
    <Route path="candidates" element={<Lazy><CandidateIntelList /></Lazy>} />
    <Route path="candidates/:id" element={<Lazy><CandidateIntelProfile /></Lazy>} />
    <Route path="pipeline" element={<Lazy><TeamPipeline /></Lazy>} />
    <Route path="outreach" element={<Lazy><OutreachStudio /></Lazy>} />
    <Route path="scorecards" element={<Lazy><RoleScorecardList /></Lazy>} />
    <Route path="scorecards/:id" element={<Lazy><RoleScorecardDetail /></Lazy>} />
    <Route path="agents" element={<Lazy><AgentRuns /></Lazy>} />
    <Route path="reports" element={<Lazy><Reports /></Lazy>} />
    <Route path="settings" element={<Lazy><RecruiterSettings /></Lazy>} />
  </>
);
