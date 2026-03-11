interface ActivitySparklineProps {
  data: number[];
  width?: number;
  height?: number;
  trend?: 'up' | 'down' | 'flat';
}

const ActivitySparkline = ({ data, width = 80, height = 20, trend = 'flat' }: ActivitySparklineProps) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  const color = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : '#fbbf24';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ActivitySparkline;
