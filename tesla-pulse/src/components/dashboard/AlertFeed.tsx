import { usePoleStore } from '@/store/poleStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { timeAgo, cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

const typeStyles = {
  fault: { icon: AlertTriangle, color: 'text-fault', bg: 'bg-fault/10' },
  warning: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/10' },
  info: { icon: Info, color: 'text-electric-400', bg: 'bg-electric-400/10' },
  resolved: { icon: CheckCircle, color: 'text-safe', bg: 'bg-safe/10' },
};

export function AlertFeed() {
  const feed = usePoleStore((s) => s.alertFeed);

  return (
    <GlassCard className="flex flex-col h-full p-4">
      <SectionHeader title="Live Alert Feed" subtitle="Real-time events" />
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {feed.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-8">No alerts yet — system nominal</p>
        )}
        {feed.map((item) => {
          const { icon: Icon, color, bg } = typeStyles[item.type];
          return (
            <div
              key={item.id}
              className={cn('flex items-start gap-2 p-2.5 rounded-lg text-xs', bg)}
            >
              <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', color)} />
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 leading-snug">{item.message}</p>
                <p className="text-gray-500 mt-0.5">{timeAgo(item.timestamp)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
