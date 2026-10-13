import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { DEFAULT_THRESHOLDS } from '@/lib/utils';
import type { PoleThresholds } from '@/types';
import { Settings2, Save } from 'lucide-react';

interface Props {
  poleId: string;
  isAdmin: boolean;
  onSave?: (t: PoleThresholds) => void;
}

export function ThresholdPanel({ poleId: _poleId, isAdmin, onSave }: Props) {
  const [thresholds, setThresholds] = useState<PoleThresholds>({ ...DEFAULT_THRESHOLDS });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave?.(thresholds);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="w-4 h-4 text-electric-400" />
        <p className="text-sm font-semibold text-white">Alert Thresholds</p>
        {!isAdmin && <span className="text-xs text-gray-500 ml-auto">Admin only</span>}
      </div>

      <div className="space-y-3">
        <ThresholdInput
          label="Max Leakage Current"
          value={thresholds.leakageCurrent_mA}
          unit="mA"
          disabled={!isAdmin}
          onChange={(v) => setThresholds({ ...thresholds, leakageCurrent_mA: v })}
        />
        <ThresholdInput
          label="Min Voltage"
          value={thresholds.voltage_V_min}
          unit="V"
          disabled={!isAdmin}
          onChange={(v) => setThresholds({ ...thresholds, voltage_V_min: v })}
        />
        <ThresholdInput
          label="Max Voltage"
          value={thresholds.voltage_V_max}
          unit="V"
          disabled={!isAdmin}
          onChange={(v) => setThresholds({ ...thresholds, voltage_V_max: v })}
        />
        <ThresholdInput
          label="Max Moisture"
          value={thresholds.moisture_percent}
          unit="%"
          disabled={!isAdmin}
          onChange={(v) => setThresholds({ ...thresholds, moisture_percent: v })}
        />
        <ThresholdInput
          label="Max Load Current"
          value={thresholds.loadCurrent_A_max}
          unit="A"
          disabled={!isAdmin}
          onChange={(v) => setThresholds({ ...thresholds, loadCurrent_A_max: v })}
        />
      </div>

      {isAdmin && (
        <button
          onClick={handleSave}
          className={`mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            saved ? 'bg-safe/20 text-safe' : 'bg-electric-500/20 text-electric-400 hover:bg-electric-500/30'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Thresholds'}
        </button>
      )}
    </GlassCard>
  );
}

function ThresholdInput({ label, value, unit, disabled, onChange }: {
  label: string; value: number; unit: string; disabled: boolean; onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-40 focus:outline-none focus:border-electric-500/60"
        />
        <span className="text-xs text-gray-500 w-8">{unit}</span>
      </div>
    </div>
  );
}
