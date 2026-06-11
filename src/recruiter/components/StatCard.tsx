interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: boolean;
}

export default function StatCard({ label, value, sublabel, accent }: StatCardProps) {
  return (
    <div
      className="rounded-lg border p-3 ros-fade-in"
      style={{ background: 'var(--ros-bg-card)', borderColor: 'var(--ros-border)' }}
    >
      <p className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: 'var(--ros-text-muted)' }}>
        {label}
      </p>
      <p
        className="text-2xl font-mono font-bold"
        style={{ color: accent ? 'var(--ros-accent)' : 'var(--ros-text-primary)' }}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--ros-text-muted)' }}>
          {sublabel}
        </p>
      )}
    </div>
  );
}
