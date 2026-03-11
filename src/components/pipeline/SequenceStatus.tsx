import { Mail, Pause, Play, Check, AlertTriangle, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { SequenceEnrollment, OutreachSequence } from '@/hooks/useSequences';

interface SequenceStatusProps {
  enrollment: SequenceEnrollment;
  sequence?: OutreachSequence;
  onPause?: () => void;
  onResume?: () => void;
}

const STATUS_CONFIG = {
  active: { icon: Mail, color: 'text-primary', bg: 'bg-primary/10', label: 'Active' },
  paused: { icon: Pause, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Paused' },
  completed: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Done' },
  replied: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Replied' },
  bounced: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Bounced' },
};

const SequenceStatus = ({ enrollment, sequence, onPause, onResume }: SequenceStatusProps) => {
  const config = STATUS_CONFIG[enrollment.status] || STATUS_CONFIG.active;
  const Icon = config.icon;
  const totalSteps = (sequence?.steps as Array<unknown>)?.length || 0;
  const nextSend = enrollment.next_send_at ? new Date(enrollment.next_send_at) : null;
  const daysUntilNext = nextSend ? Math.max(0, Math.ceil((nextSend.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${config.bg} text-[10px] font-display`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <Icon className={`w-3 h-3 ${config.color}`} />
              <span className={config.color}>
                Step {enrollment.current_step + 1}/{totalSteps}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <p>{config.label}: {sequence?.name || 'Sequence'}</p>
              {daysUntilNext !== null && enrollment.status === 'active' && (
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Next send in {daysUntilNext}d
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
        {enrollment.status === 'active' && onPause && (
          <button onClick={onPause} className="text-muted-foreground hover:text-amber-400">
            <Pause className="w-2.5 h-2.5" />
          </button>
        )}
        {enrollment.status === 'paused' && onResume && (
          <button onClick={onResume} className="text-muted-foreground hover:text-primary">
            <Play className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </TooltipProvider>
  );
};

export default SequenceStatus;
