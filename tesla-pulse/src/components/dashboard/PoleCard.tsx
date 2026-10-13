import { useNavigate } from 'react-router-dom';
import type { Pole } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { LiveDot } from '@/components/ui/LiveDot';
import { AnimatedValue } from '@/components/ui/AnimatedValue';
import { statusBorder, timeAgo, cn } from '@/lib/utils';
import { Droplets, Zap, Activity, Battery } from 'lucide-react';

interface Props { pole: Pole }

export function PoleCard({ pole }: Props) {
  const navigate = useNavigate();
  const { live, meta, uiStatus } = pole;

  const glowMap = { safe: 'safe', warning: 'warning', fault: 'fault', offline: null } as const;

  return (
    <GlassCard
      glow={glowMap[uiStatus]}
      className={cn(
        'p-4 cursor-pointer hover:scale-[1.02] transition-transform duration-200 border-2',
        statusBorder(uiStatus)
      )}
      onClick={() => navigate(`/dashboard/pole/${pole.id}`)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LiveDot status={uiStatus === 'offline' ? 'offline' : uiStatus === 'fault' ? 'fault' : uiStatus === 'warning' ? 'warning' : 'online'} />
          <div>
            <span className="text-sm font-medium text-white truncate max-w-[140px] block">{meta.name}</span>
            {meta.area && <span className="text-[10px] text-gray-500">{meta.area}</span>}
          </div>
        </div>
        <span className={cn(
          'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
          uiStatus === 'safe' && 'bg-safe/20 text-safe',
          uiStatus === 'warning' && 'bg-warning/20 text-warning',
          uiStatus === 'fault' && 'bg-fault/20 text-fault animate-pulse',
          uiStatus === 'offline' && 'bg-gray-700 text-gray-400',
        )}>
          {uiStatus}
        </span>
      </div>

      {/* Sensor readings */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2">
          <Zap className="w-3.5 h-3.5 text-warning shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500">Leakage</p>
            <AnimatedValue value={live.leakageCurrent_mA} unit="mA" className="text-xs font-semibold text-white" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2">
          <Activity className="w-3.5 h-3.5 text-electric-400 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500">Voltage</p>
            <AnimatedValue value={live.voltage_V} unit="V" className="text-xs font-semibold text-white" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2">
          <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500">Moisture</p>
            <AnimatedValue value={live.moisture_percent} unit="%" decimals={0} className="text-xs font-semibold text-white" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white/5 rounded-lg p-2">
          <Battery className="w-3.5 h-3.5 text-safe shrink-0" />
          <div>
            <p className="text-[10px] text-gray-500">Battery</p>
            <AnimatedValue value={live.batteryLevel_percent} unit="%" decimals={0} className="text-xs font-semibold text-white" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-gray-600 mt-2 text-right">
        Updated {timeAgo(live.lastUpdated)}
      </p>
    </GlassCard>
  );
}
