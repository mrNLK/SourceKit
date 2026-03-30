import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center ros-fade-in">
      {icon && <div className="mb-4" style={{ color: 'var(--ros-text-muted)' }}>{icon}</div>}
      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--ros-text-secondary)' }}>{title}</h3>
      <p className="text-xs max-w-sm" style={{ color: 'var(--ros-text-muted)' }}>{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
