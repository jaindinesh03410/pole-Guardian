/**
 * Auto-scrolling live chart showing last 60 data points.
 * Appends new points without re-mounting the chart.
 */
import { useRef, useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';

interface DataPoint {
  ts: number;
  leakage: number;
  voltage: number;
  load: number;
  moisture: number;
}

interface Props {
  leakage: number;
  voltage: number;
  load: number;
  moisture: number;
}

const MAX_POINTS = 60;

export function LiveChart({ leakage, voltage, load, moisture }: Props) {
  const [data, setData] = useState<DataPoint[]>([]);
  const lastTs = useRef(0);

  useEffect(() => {
    const now = Date.now();
    if (now - lastTs.current < 1500) return; // debounce
    lastTs.current = now;

    setData((prev) => {
      const next = [...prev, { ts: now, leakage, voltage, load, moisture }];
      return next.slice(-MAX_POINTS);
    });
  }, [leakage, voltage, load, moisture]);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <p className="text-xs text-gray-400 mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-electric-400 animate-pulse" />
        Live stream — last 60 readings
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="ts"
            tickFormatter={(v) => format(v, 'HH:mm:ss')}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            stroke="#1e293b"
          />
          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} stroke="#1e293b" width={35} />
          <Tooltip
            contentStyle={{ background: '#0d1428', border: '1px solid #1e3a5f', borderRadius: 8, fontSize: 11 }}
            labelFormatter={(v) => format(Number(v), 'HH:mm:ss')}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          <Line type="monotone" dataKey="leakage" name="Leakage (mA)" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="load" name="Load (A)" stroke="#0ea5e9" dot={false} strokeWidth={2} isAnimationActive={false} />
          <Line type="monotone" dataKey="moisture" name="Moisture (%)" stroke="#38bdf8" dot={false} strokeWidth={1.5} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
