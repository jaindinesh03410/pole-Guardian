import { usePoleStore } from '@/store/poleStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { Activity, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

export function StatStrip() {
  const poles = usePoleStore((s) => s.poles);
  const list = Object.values(poles);

  const total = list.length;
  const online = list.filter((p) => p.uiStatus !== 'offline').length;
  const faults = list.filter((p) => p.uiStatus === 'fault').length;
  const healthAvg = list.length
    ? Math.round(list.reduce((sum, p) => {
        const h = p.uiStatus === 'safe' ? 100 : p.uiStatus === 'warning' ? 60 : p.uiStatus === 'fault' ? 20 : 0;
        return sum + h;
      }, 0) / list.length)
    : 0;

  const stats = [
    { label: 'Total Poles', value: total, icon: Zap, color: 'text-electric-400' },
    { label: 'Online', value: online, icon: Activity, color: 'text-safe' },
    { label: 'Active Faults', value: faults, icon: AlertTriangle, color: faults > 0 ? 'text-fault' : 'text-gray-400' },
    { label: 'Avg Health', value: `${healthAvg}%`, icon: CheckCircle, color: healthAvg > 70 ? 'text-safe' : healthAvg > 40 ? 'text-warning' : 'text-fault' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <GlassCard key={label} className="p-4 flex items-center gap-4" glow={label === 'Active Faults' && faults > 0 ? 'fault' : null}>
          <div className={`p-2.5 rounded-lg bg-white/5 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
