import { useParams, useNavigate } from 'react-router-dom';
import { usePoleStore } from '@/store/poleStore';
import { useAuthStore } from '@/store/authStore';
import { SensorGauge } from '@/components/pole/SensorGauge';
import { LiveChart } from '@/components/pole/LiveChart';
import { HistoryChart } from '@/components/pole/HistoryChart';
import { DeviceHealthPanel } from '@/components/pole/DeviceHealthPanel';
import { ThresholdPanel } from '@/components/pole/ThresholdPanel';
import { GlassCard } from '@/components/ui/GlassCard';
import { LiveDot } from '@/components/ui/LiveDot';
import { Zap, Droplets, Activity, Thermometer, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function PoleDetailPage() {
  const { poleId } = useParams<{ poleId: string }>();
  const pole = usePoleStore((s) => s.poles[poleId ?? '']);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  if (!pole) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>Pole not found or not yet connected.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-electric-400 text-sm hover:underline">← Back</button>
      </div>
    );
  }

  const { live, meta, uiStatus } = pole;
  const isAdmin = user?.role === 'admin';

  const handleTestAlert = () => toast.error(`⚠ Test alert from ${meta.name}`, { duration: 4000 });
  const handleMarkResolved = () => {
    usePoleStore.getState().resolveFault(poleId ?? '');
    toast.success('Fault marked as resolved');
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <LiveDot status={uiStatus === 'offline' ? 'offline' : uiStatus === 'fault' ? 'fault' : 'online'} />
              <h1 className="text-xl font-bold text-white">{meta.name}</h1>
              <span className={cn(
                'text-xs font-bold uppercase px-2 py-0.5 rounded-full',
                uiStatus === 'fault' ? 'bg-fault/20 text-fault animate-pulse' :
                uiStatus === 'warning' ? 'bg-warning/20 text-warning' :
                uiStatus === 'safe' ? 'bg-safe/20 text-safe' : 'bg-gray-700 text-gray-400'
              )}>
                {uiStatus}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {meta.location.lat.toFixed(4)}, {meta.location.lng.toFixed(4)} · Installed {meta.installedOn}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleTestAlert}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-warning/20 border border-warning/30 text-warning hover:bg-warning/30 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Test Alert
          </button>
          {isAdmin && (
            <button
              onClick={handleMarkResolved}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-safe/20 border border-safe/30 text-safe hover:bg-safe/30 transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark Resolved
            </button>
          )}
        </div>
      </div>

      {/* Gauge row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SensorGauge
          label="Leakage Current"
          value={live.leakageCurrent_mA}
          min={0} max={30} unit="mA"
          warn={12} danger={15}
          icon={<AlertTriangle style={{ width: 16, height: 16 }} />}
        />
        <SensorGauge
          label="Load Current"
          value={live.loadCurrent_A}
          min={0} max={15} unit="A"
          warn={8} danger={12}
          icon={<Activity style={{ width: 16, height: 16 }} />}
        />
        <SensorGauge
          label="Voltage"
          value={live.voltage_V}
          min={180} max={270} unit="V"
          warn={245} danger={255}
          icon={<Zap style={{ width: 16, height: 16 }} />}
        />
        <SensorGauge
          label="Moisture"
          value={live.moisture_percent}
          min={0} max={100} unit="%"
          warn={60} danger={75}
          icon={<Droplets style={{ width: 16, height: 16 }} />}
        />
      </div>

      {/* Fault banner */}
      {live.faultDetected && (
        <GlassCard glow="fault" className="p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-fault animate-pulse" />
          <div>
            <p className="text-fault font-semibold text-sm">FAULT DETECTED</p>
            <p className="text-xs text-gray-300">
              Leakage current: {live.leakageCurrent_mA.toFixed(1)} mA · Moisture: {live.moisture_percent.toFixed(0)}%
            </p>
          </div>
        </GlassCard>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <LiveChart
          leakage={live.leakageCurrent_mA}
          voltage={live.voltage_V}
          load={live.loadCurrent_A}
          moisture={live.moisture_percent}
        />
        <HistoryChart poleId={poleId ?? ''} />
      </div>

      {/* Bottom panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <DeviceHealthPanel live={live} />
        <ThresholdPanel poleId={poleId ?? ''} isAdmin={isAdmin} />

        {/* Device temp extra */}
        <GlassCard className="p-4">
          <p className="text-sm font-semibold text-white mb-3">Pole Info</p>
          <div className="space-y-2 text-sm">
            <InfoRow label="Pole ID" value={poleId ?? ''} />
            <InfoRow label="Location" value={`${meta.location.lat}, ${meta.location.lng}`} />
            <InfoRow label="Installed" value={meta.installedOn} />
            <InfoRow label="ESP32 Temp" value={`${live.deviceTemp_C.toFixed(1)} °C`} icon={<Thermometer className="w-3.5 h-3.5 text-orange-400" />} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="flex items-center gap-1 text-xs text-gray-200">{icon}{value}</span>
    </div>
  );
}
