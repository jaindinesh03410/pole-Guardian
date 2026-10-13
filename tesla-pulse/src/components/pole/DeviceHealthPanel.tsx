import type { PoleLive } from '@/types';
import { GlassCard } from '@/components/ui/GlassCard';
import { Battery, Thermometer, Wifi, Clock } from 'lucide-react';
import { AnimatedValue } from '@/components/ui/AnimatedValue';
import { formatTs } from '@/lib/utils';

interface Props { live: PoleLive }

export function DeviceHealthPanel({ live }: Props) {
  const battColor = live.batteryLevel_percent > 50 ? 'text-safe' : live.batteryLevel_percent > 20 ? 'text-warning' : 'text-fault';
  const signalPct = Math.round(Math.min(100, Math.max(0, (live.signalStrength + 100) * 2)));

  return (
    <GlassCard className="p-4">
      <p className="text-sm font-semibold text-white mb-3">Device Health</p>
      <div className="space-y-3">
        <HealthRow icon={<Battery className="w-4 h-4" />} label="Battery" color={battColor}>
          <AnimatedValue value={live.batteryLevel_percent} unit="%" decimals={0} className={`text-sm font-bold ${battColor}`} />
          <div className="w-full h-1.5 rounded-full bg-white/10 mt-1">
            <div className={`h-full rounded-full transition-all duration-500 ${live.batteryLevel_percent > 50 ? 'bg-safe' : live.batteryLevel_percent > 20 ? 'bg-warning' : 'bg-fault'}`}
              style={{ width: `${live.batteryLevel_percent}%` }} />
          </div>
        </HealthRow>

        <HealthRow icon={<Thermometer className="w-4 h-4 text-orange-400" />} label="Device Temp" color="text-orange-400">
          <AnimatedValue value={live.deviceTemp_C} unit="°C" className="text-sm font-bold text-white" />
        </HealthRow>

        <HealthRow icon={<Wifi className="w-4 h-4 text-electric-400" />} label="Signal" color="text-electric-400">
          <span className="text-sm font-bold text-white">{live.signalStrength} dBm</span>
          <span className="text-xs text-gray-500 ml-1">({signalPct}%)</span>
        </HealthRow>

        <HealthRow icon={<Clock className="w-4 h-4 text-gray-400" />} label="Last Seen" color="text-gray-400">
          <span className="text-xs text-gray-300">{formatTs(live.lastUpdated)}</span>
        </HealthRow>
      </div>
    </GlassCard>
  );
}

function HealthRow({ icon, label, color, children }: { icon: React.ReactNode; label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={color}>{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}
