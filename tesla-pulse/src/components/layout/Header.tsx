import { Wifi, WifiOff, Play, Square, Bell } from 'lucide-react';
import { usePoleStore } from '@/store/poleStore';
import { startSimulator, stopSimulator } from '@/lib/mockSimulator';
import { cn } from '@/lib/utils';

export function Header() {
  const { connected, simulatorActive, setSimulatorActive, alertFeed } = usePoleStore();
  const unresolvedCount = alertFeed.filter((a) => a.type === 'fault').length;

  const toggleSimulator = () => {
    if (simulatorActive) {
      stopSimulator();
      setSimulatorActive(false);
    } else {
      setSimulatorActive(true);
      startSimulator();
    }
  };

  return (
    <header className="h-14 border-b border-white/10 bg-navy-800/80 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        {/* Connection status */}
        <div className={cn('flex items-center gap-1.5 text-xs', connected ? 'text-safe' : 'text-fault')}>
          {connected
            ? <><Wifi className="w-3.5 h-3.5" /> <span>Live</span></>
            : <><WifiOff className="w-3.5 h-3.5" /> <span className="animate-pulse">Reconnecting...</span></>
          }
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Alert bell */}
        <button className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
          <Bell className="w-4 h-4" />
          {unresolvedCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-fault text-[10px] text-white flex items-center justify-center font-bold">
              {unresolvedCount > 9 ? '9+' : unresolvedCount}
            </span>
          )}
        </button>

        {/* Simulator toggle */}
        <button
          onClick={toggleSimulator}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200',
            simulatorActive
              ? 'bg-fault/20 border-fault/40 text-fault hover:bg-fault/30'
              : 'bg-electric-500/20 border-electric-500/40 text-electric-400 hover:bg-electric-500/30'
          )}
        >
          {simulatorActive ? <><Square className="w-3 h-3" /> Stop Sim</> : <><Play className="w-3 h-3" /> Simulate Live</>}
        </button>
      </div>
    </header>
  );
}
