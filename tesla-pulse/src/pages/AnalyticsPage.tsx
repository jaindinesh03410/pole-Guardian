import { usePoleStore } from '@/store/poleStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, LineChart, Line, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

export function AnalyticsPage() {
  const poles = Object.values(usePoleStore((s) => s.poles));
  
  // Filter only Rajwada poles (the 2 active ones)
  const activePoles = poles.filter((p) => p.meta.area === 'Rajwada');
  const pole1 = activePoles.find((p) => p.id.includes('01'));
  const pole2 = activePoles.find((p) => p.id.includes('02'));

  if (!pole1 || !pole2) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Click "Simulate Live" to see Pole 1 vs Pole 2 analytics
      </div>
    );
  }

  // Comparison data for side-by-side bars
  const comparisonData = [
    {
      metric: 'Leakage (mA)',
      'Pole 1': parseFloat(pole1.live.leakageCurrent_mA.toFixed(1)),
      'Pole 2': parseFloat(pole2.live.leakageCurrent_mA.toFixed(1)),
      threshold: 15,
    },
    {
      metric: 'Voltage (V)',
      'Pole 1': parseFloat(pole1.live.voltage_V.toFixed(1)),
      'Pole 2': parseFloat(pole2.live.voltage_V.toFixed(1)),
      threshold: 230,
    },
    {
      metric: 'Moisture (%)',
      'Pole 1': parseFloat(pole1.live.moisture_percent.toFixed(0)),
      'Pole 2': parseFloat(pole2.live.moisture_percent.toFixed(0)),
      threshold: 70,
    },
    {
      metric: 'Load (A)',
      'Pole 1': parseFloat(pole1.live.loadCurrent_A.toFixed(1)),
      'Pole 2': parseFloat(pole2.live.loadCurrent_A.toFixed(1)),
      threshold: 5,
    },
  ];

  // Radar chart for risk profile comparison
  const radarData = [
    { 
      metric: 'Leakage Risk', 
      'Pole 1': Math.min(100, (pole1.live.leakageCurrent_mA / 15) * 100),
      'Pole 2': Math.min(100, (pole2.live.leakageCurrent_mA / 15) * 100),
    },
    { 
      metric: 'Moisture Level', 
      'Pole 1': pole1.live.moisture_percent,
      'Pole 2': pole2.live.moisture_percent,
    },
    { 
      metric: 'Voltage Stability', 
      'Pole 1': 100 - Math.min(100, Math.abs(pole1.live.voltage_V - 230) * 2),
      'Pole 2': 100 - Math.min(100, Math.abs(pole2.live.voltage_V - 230) * 2),
    },
    { 
      metric: 'Load Level', 
      'Pole 1': Math.min(100, (pole1.live.loadCurrent_A / 10) * 100),
      'Pole 2': Math.min(100, (pole2.live.loadCurrent_A / 10) * 100),
    },
    { 
      metric: 'Device Health', 
      'Pole 1': pole1.live.batteryLevel_percent,
      'Pole 2': pole2.live.batteryLevel_percent,
    },
  ];

  // Status indicators
  const getColor = (value: number, threshold: number, type: 'leakage' | 'voltage' | 'moisture' | 'load') => {
    if (type === 'leakage' || type === 'moisture') {
      return value >= threshold ? '#ef4444' : value >= threshold * 0.8 ? '#f59e0b' : '#22c55e';
    }
    if (type === 'voltage') {
      const diff = Math.abs(value - 230);
      return diff > 20 ? '#ef4444' : diff > 10 ? '#f59e0b' : '#22c55e';
    }
    return value > 8 ? '#f59e0b' : '#22c55e';
  };

  const tooltip = {
    contentStyle: { background: '#0d1428', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 },
  };

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="Pole 1 vs Pole 2 — Live Comparison" 
        subtitle="Rajwada Area Real-time Analytics" 
      />

      {/* Quick Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard className="p-5" glow={pole1.uiStatus === 'fault' ? 'fault' : pole1.uiStatus === 'warning' ? 'warning' : 'safe'}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-white">Pole 1 — Main Line</h3>
              <p className="text-xs text-gray-400">Primary Connection Point</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              pole1.uiStatus === 'fault' ? 'bg-fault/20 text-fault animate-pulse' :
              pole1.uiStatus === 'warning' ? 'bg-warning/20 text-warning' : 'bg-safe/20 text-safe'
            }`}>
              {pole1.uiStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Leakage" value={`${pole1.live.leakageCurrent_mA.toFixed(1)} mA`} color={getColor(pole1.live.leakageCurrent_mA, 15, 'leakage')} />
            <Stat label="Voltage" value={`${pole1.live.voltage_V.toFixed(1)} V`} color={getColor(pole1.live.voltage_V, 230, 'voltage')} />
            <Stat label="Moisture" value={`${pole1.live.moisture_percent.toFixed(0)}%`} color={getColor(pole1.live.moisture_percent, 70, 'moisture')} />
            <Stat label="Load" value={`${pole1.live.loadCurrent_A.toFixed(1)} A`} color={getColor(pole1.live.loadCurrent_A, 5, 'load')} />
          </div>
        </GlassCard>

        <GlassCard className="p-5" glow={pole2.uiStatus === 'fault' ? 'fault' : pole2.uiStatus === 'warning' ? 'warning' : 'safe'}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-bold text-white">Pole 2 — Distribution</h3>
              <p className="text-xs text-gray-400">Secondary Branch Line</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              pole2.uiStatus === 'fault' ? 'bg-fault/20 text-fault animate-pulse' :
              pole2.uiStatus === 'warning' ? 'bg-warning/20 text-warning' : 'bg-safe/20 text-safe'
            }`}>
              {pole2.uiStatus}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Leakage" value={`${pole2.live.leakageCurrent_mA.toFixed(1)} mA`} color={getColor(pole2.live.leakageCurrent_mA, 15, 'leakage')} />
            <Stat label="Voltage" value={`${pole2.live.voltage_V.toFixed(1)} V`} color={getColor(pole2.live.voltage_V, 230, 'voltage')} />
            <Stat label="Moisture" value={`${pole2.live.moisture_percent.toFixed(0)}%`} color={getColor(pole2.live.moisture_percent, 70, 'moisture')} />
            <Stat label="Load" value={`${pole2.live.loadCurrent_A.toFixed(1)} A`} color={getColor(pole2.live.loadCurrent_A, 5, 'load')} />
          </div>
        </GlassCard>
      </div>

      {/* Side-by-side comparison chart */}
      <GlassCard className="p-5">
        <p className="text-sm font-semibold text-white mb-4">📊 Direct Comparison — Key Metrics</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={comparisonData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#1e293b" />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} stroke="#1e293b" width={40} />
            <Tooltip {...tooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Pole 1" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Pole 2" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Radar comparison */}
        <GlassCard className="p-5">
          <p className="text-sm font-semibold text-white mb-4">🎯 Risk Profile Radar</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Pole 1" dataKey="Pole 1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.25} />
              <Radar name="Pole 2" dataKey="Pole 2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Line-to-line fault indicator */}
        <GlassCard className="p-5">
          <p className="text-sm font-semibold text-white mb-4">⚡ Line-to-Ground Leakage Status</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-gray-300">Pole 1 → Ground</span>
              <div className="flex items-center gap-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-safe to-fault"
                  style={{ width: 120, clipPath: `inset(0 ${100 - Math.min(100, (pole1.live.leakageCurrent_mA / 20) * 100)}% 0 0)` }}
                />
                <span className={`text-xs font-bold ${pole1.live.leakageCurrent_mA > 15 ? 'text-fault' : 'text-safe'}`}>
                  {pole1.live.leakageCurrent_mA.toFixed(1)} mA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-gray-300">Pole 2 → Ground</span>
              <div className="flex items-center gap-2">
                <div 
                  className="h-2 rounded-full bg-gradient-to-r from-safe to-fault"
                  style={{ width: 120, clipPath: `inset(0 ${100 - Math.min(100, (pole2.live.leakageCurrent_mA / 20) * 100)}% 0 0)` }}
                />
                <span className={`text-xs font-bold ${pole2.live.leakageCurrent_mA > 15 ? 'text-fault' : 'text-safe'}`}>
                  {pole2.live.leakageCurrent_mA.toFixed(1)} mA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-gray-300">Inter-Pole Difference</span>
              <span className="text-xs font-bold text-electric-400">
                {Math.abs(pole1.live.leakageCurrent_mA - pole2.live.leakageCurrent_mA).toFixed(1)} mA
              </span>
            </div>

            {(pole1.live.faultDetected || pole2.live.faultDetected) && (
              <div className="p-3 bg-fault/10 border border-fault/30 rounded-lg">
                <p className="text-xs text-fault font-semibold">⚠ FAULT DETECTED</p>
                <p className="text-xs text-gray-300 mt-1">
                  {pole1.live.faultDetected && 'Pole 1: High leakage current detected. '}
                  {pole2.live.faultDetected && 'Pole 2: Line-to-ground fault detected.'}
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2 bg-white/5 rounded-lg">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color }}>{value}</p>
    </div>
  );
}
