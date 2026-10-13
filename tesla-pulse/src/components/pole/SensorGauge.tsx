/**
 * SVG arc gauge widget for a single sensor reading.
 */
import { cn } from '@/lib/utils';
import { AnimatedValue } from '@/components/ui/AnimatedValue';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  decimals?: number;
  danger?: number; // threshold where it turns red
  warn?: number;   // threshold where it turns amber
  icon?: React.ReactNode;
}

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const sx = cx + r * Math.cos(toRad(startDeg));
  const sy = cy + r * Math.sin(toRad(startDeg));
  const ex = cx + r * Math.cos(toRad(endDeg));
  const ey = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
}

export function SensorGauge({ label, value, min, max, unit, decimals = 1, danger, warn, icon }: Props) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const startAngle = 140;
  const sweepAngle = 260;
  const fillAngle = startAngle + sweepAngle * pct;

  const isRed = danger !== undefined && value >= danger;
  const isAmber = warn !== undefined && value >= warn && !isRed;
  const color = isRed ? '#ef4444' : isAmber ? '#f59e0b' : '#0ea5e9';

  const cx = 60, cy = 60, r = 46;

  return (
    <div className="flex flex-col items-center p-4 bg-white/5 rounded-xl border border-white/10">
      <svg width={120} height={90} viewBox="0 0 120 90" className="mb-1">
        {/* Track */}
        <path
          d={arc(cx, cy, r, startAngle, startAngle + sweepAngle)}
          fill="none"
          stroke="#1e293b"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={arc(cx, cy, r, startAngle, fillAngle)}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'all 0.4s ease' }}
        />
        {/* Center icon */}
        <foreignObject x={cx - 10} y={cy - 10} width={20} height={20}>
          <div className="flex items-center justify-center h-full" style={{ color }}>
            {icon}
          </div>
        </foreignObject>
      </svg>

      <AnimatedValue
        value={value}
        unit={unit}
        decimals={decimals}
        className={cn('text-2xl font-bold', isRed ? 'text-fault' : isAmber ? 'text-warning' : 'text-white')}
      />
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}
