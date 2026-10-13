import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { usePoleHistory, type HistoryRange } from '@/hooks/usePoleHistory';
import { format } from 'date-fns';

const RANGES: HistoryRange[] = ['1h', '24h', '7d', '30d'];

interface Props { poleId: string }

export function HistoryChart({ poleId }: Props) {
  const [range, setRange] = useState<HistoryRange>('24h');
  const { logs, loading } = usePoleHistory(poleId, range);

  const fmt = range === '1h' ? 'HH:mm:ss' : range === '24h' ? 'HH:mm' : 'MMM d';

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white">Historical Trends</p>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                range === r
                  ? 'bg-electric-500/30 text-electric-400 border border-electric-500/40'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm animate-pulse">
          Loading historical data...
        </div>
      ) : logs.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
          No historical data for this range
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={logs}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => format(v, fmt)}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              stroke="#1e293b"
            />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} stroke="#1e293b" width={35} />
            <Tooltip
              contentStyle={{ background: '#0d1428', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }}
              labelFormatter={(v) => format(Number(v), 'MMM d, HH:mm')}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Line type="monotone" dataKey="leakageCurrent_mA" name="Leakage (mA)" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line type="monotone" dataKey="voltage_V" name="Voltage (V)" stroke="#0ea5e9" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line type="monotone" dataKey="moisture_percent" name="Moisture (%)" stroke="#38bdf8" dot={false} strokeWidth={1.5} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
