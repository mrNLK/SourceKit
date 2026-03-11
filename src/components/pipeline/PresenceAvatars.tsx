import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PresenceUser {
  id: string;
  email?: string;
}

interface PresenceAvatarsProps {
  users: PresenceUser[];
  maxVisible?: number;
}

const COLORS = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

function getInitials(email?: string): string {
  if (!email) return '?';
  const name = email.split('@')[0];
  return name.charAt(0).toUpperCase();
}

function getColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const PresenceAvatars = ({ users, maxVisible = 3 }: PresenceAvatarsProps) => {
  if (users.length === 0) return null;

  const visible = users.slice(0, maxVisible);
  const overflow = users.length - maxVisible;

  return (
    <TooltipProvider>
      <div className="flex -space-x-1.5">
        {visible.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div
                className={`w-5 h-5 rounded-full ${getColor(user.id)} flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-background animate-pulse`}
              >
                {getInitials(user.email)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {user.email || 'Team member'}
            </TooltipContent>
          </Tooltip>
        ))}
        {overflow > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground ring-2 ring-background">
                +{overflow}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {overflow} more viewing
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

export default PresenceAvatars;
