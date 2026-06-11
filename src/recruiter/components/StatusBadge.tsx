import { STAGE_CONFIG, CONTACT_STATUS_CONFIG, AGENT_RUN_STATUS_CONFIG } from '../lib/constants';
import type { PipelineStage, ContactStatus, AgentRunStatus, ATSSyncStatus } from '../lib/types';

interface StageBadgeProps {
  stage: PipelineStage;
}

export function StageBadge({ stage }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage];
  return (
    <span className={`inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${config.color} ${config.bgColor} ${config.borderColor}`}>
      {config.label}
    </span>
  );
}

interface ContactBadgeProps {
  status: ContactStatus;
}

export function ContactBadge({ status }: ContactBadgeProps) {
  const config = CONTACT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-mono ${config.color}`}>
      {config.label}
    </span>
  );
}

interface RunStatusBadgeProps {
  status: AgentRunStatus;
}

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const config = AGENT_RUN_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${config.color} ${config.bgColor}`}>
      {status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse mr-1.5" />}
      {config.label}
    </span>
  );
}

interface ATSBadgeProps {
  status: ATSSyncStatus;
}

export function ATSBadge({ status }: ATSBadgeProps) {
  const colors: Record<ATSSyncStatus, string> = {
    not_synced: 'text-zinc-500',
    synced: 'text-blue-400',
    sync_failed: 'text-red-400',
  };
  const labels: Record<ATSSyncStatus, string> = {
    not_synced: 'Not synced',
    synced: 'ATS synced',
    sync_failed: 'Sync failed',
  };
  return (
    <span className={`text-[10px] font-mono ${colors[status]}`}>{labels[status]}</span>
  );
}

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const colors = {
    high: 'text-emerald-400 bg-emerald-500/15',
    medium: 'text-amber-400 bg-amber-500/15',
    low: 'text-zinc-400 bg-zinc-500/15',
  };
  return (
    <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${colors[priority]}`}>
      {priority}
    </span>
  );
}
