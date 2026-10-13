import { useState } from 'react';
import { usePoleStore } from '@/store/poleStore';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AnimatedValue } from '@/components/ui/AnimatedValue';
import {
  Zap, Activity, Droplets, Battery, Wifi,
  ShieldCheck, ShieldAlert, Cpu, Radio,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { timeAgo, cn } from '@/lib/utils';

// ─── Sensor config — colour used ONLY for accent, icon and progress fill ──────
// Background stays dark/neutral. Colour signals identity, not intensity.
type SensorKey = 'voltage' | 'moisture' | 'zmct1' | 'zmct2' | 'battery' | 'signal';

interface SensorCfg {
  label: string;
  sub: string;
  unit: string;
  decimals: number;
  icon: React.ElementType;
  accent: string;          // single accent colour per sensor
  spec: string[];
}

const SENSORS: Record<SensorKey, SensorCfg> = {
  zmct1:       { label: 'ZMCT1 Current',    sub: 'ZMCT101B Sensor 1',  unit: 'mA', decimals: 1, icon: Zap,           accent: '#06b6d4', spec: ['GPIO 34','Trip at >200mA','Relay 2 control'] },
  zmct2:       { label: 'ZMCT2 Current',    sub: 'ZMCT101B Sensor 2',  unit: 'mA', decimals: 1, icon: Zap,           accent: '#0ea5e9', spec: ['GPIO 35','Trip at >200mA','Relay 2 control'] },
  voltage:     { label: 'AC Voltage',       sub: 'ZMPT101B Sensor',    unit: 'V',  decimals: 1, icon: Activity,      accent: '#818cf8', spec: ['GPIO 33','Trip at >250V','Relay 3 control'] },
  moisture:    { label: 'Soil Moisture',    sub: 'Capacitive Sensor',  unit: '%',  decimals: 0, icon: Droplets,      accent: '#22d3ee', spec: ['GPIO 32','Trip at ≥60%','Relay 1 control'] },
  battery:     { label: 'Battery Health',   sub: 'Power Supply',       unit: '%',  decimals: 0, icon: Battery,       accent: '#4ade80', spec: ['LiFePO4 cell','Solar backup','Min 20%'] },
  signal:      { label: 'WiFi Signal',      sub: 'ESP32 Radio',        unit: 'dBm',decimals: 0, icon: Wifi,          accent: '#a78bfa', spec: ['2.4 GHz band','-30 excellent','-80 weak'] },
};

// ─── SVG Arc gauge — clean, no glow spam ──────────────────────────────────────
function arcD(cx: number, cy: number, r: number, aDeg: number, bDeg: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const ax = cx + r * Math.cos(rad(aDeg)), ay = cy + r * Math.sin(rad(aDeg));
  const bx = cx + r * Math.cos(rad(bDeg)), by = cy + r * Math.sin(rad(bDeg));
  return `M ${ax} ${ay} A ${r} ${r} 0 ${bDeg - aDeg > 180 ? 1 : 0} 1 ${bx} ${by}`;
}

function ArcGauge({ pct, accent, status }: { pct: number; accent: string; status: 'safe'|'warning'|'fault' }) {
  const cx = 52, cy = 52, r = 40, start = 145, sweep = 250;
  const fill = start + sweep * Math.min(1, Math.max(0, pct));
  const col = status === 'fault' ? '#ef4444' : status === 'warning' ? '#f59e0b' : accent;
  return (
    <svg width={104} height={88} viewBox="0 0 104 88" className="overflow-visible">
      {/* Track */}
      <path d={arcD(cx, cy, r, start, start + sweep)}
        fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} strokeLinecap="round" />
      {/* Threshold tick at 80% */}
      <path d={arcD(cx, cy, r, start + sweep * 0.8, start + sweep * 0.8 + 1)}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={12} strokeLinecap="round" />
      {/* Fill */}
      {pct > 0 && (
        <path d={arcD(cx, cy, r, start, fill)}
          fill="none" stroke={col} strokeWidth={8} strokeLinecap="round"
          style={{ transition: 'all 0.5s ease' }}
        />
      )}
      {/* Pct label */}
      <text x={cx} y={cy + 6} textAnchor="middle" fill="rgba(255,255,255,0.5)"
        fontSize={10} fontWeight="500">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

// ─── Horizontal bar — shows range with safe zone ──────────────────────────────
function RangeBar({ pct, accent, status }: { pct: number; accent: string; status: 'safe'|'warning'|'fault' }) {
  const col = status === 'fault' ? '#ef4444' : status === 'warning' ? '#f59e0b' : accent;
  const w = Math.min(100, Math.max(0, pct * 100));
  return (
    <div className="relative w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
      {/* Safe zone marker at 80% */}
      <div className="absolute top-0 bottom-0 w-px bg-white/20" style={{ left: '80%' }} />
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${w}%`, backgroundColor: col }}
      />
    </div>
  );
}

// ─── Tiny live dot ────────────────────────────────────────────────────────────
function LiveDot({ accent }: { accent: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className="animate-ping absolute h-full w-full rounded-full opacity-50"
        style={{ backgroundColor: accent }} />
      <span className="relative rounded-full h-2 w-2" style={{ backgroundColor: accent }} />
    </span>
  );
}

// ─── Tooltip on hover ─────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50
          whitespace-nowrap text-[10px] text-white bg-gray-900 border border-white/10
          px-2 py-1 rounded-md shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4
            border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// ─── Status chip ──────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: 'safe'|'warning'|'fault' }) {
  const map = {
    safe:    'text-emerald-400 bg-emerald-400/10',
    warning: 'text-amber-400  bg-amber-400/10',
    fault:   'text-red-400    bg-red-400/10',
  };
  return (
    <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase', map[status])}>
      {status === 'safe' ? 'Normal' : status}
    </span>
  );
}

// ─── Individual sensor card ───────────────────────────────────────────────────
interface CardProps {
  cfg: SensorCfg;
  skey: SensorKey;
  value: number;
  min: number; max: number;
  status: 'safe'|'warning'|'fault';
  threshold: string;
  lastUpdate: number;
}

function SensorCard({ cfg, value, min, max, status, threshold, lastUpdate }: CardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = cfg.icon;
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const accentCol = status === 'fault' ? '#ef4444' : status === 'warning' ? '#f59e0b' : cfg.accent;

  return (
    <div
      className={cn(
        'group rounded-xl border bg-[#0d1428] transition-all duration-200 cursor-pointer select-none',
        status === 'fault'
          ? 'border-red-500/40 hover:border-red-400/70'
          : status === 'warning'
          ? 'border-amber-500/30 hover:border-amber-400/60'
          : 'border-white/[0.08] hover:border-white/20',
      )}
      style={{
        boxShadow: expanded
          ? `0 0 0 1px ${accentCol}33, 0 8px 32px rgba(0,0,0,0.4)`
          : undefined,
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Thin top accent line */}
      <div className="h-[2px] rounded-t-xl transition-all duration-300"
        style={{ backgroundColor: expanded ? accentCol : 'transparent', opacity: expanded ? 1 : 0 }} />

      <div className="p-4">
        {/* Row 1: icon + label + status + info */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-lg bg-white/[0.05] shrink-0">
            <Icon className="w-4 h-4" style={{ color: accentCol }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white leading-tight truncate">{cfg.label}</p>
            <p className="text-[10px] text-gray-500 truncate">{cfg.sub}</p>
          </div>
          <StatusChip status={status} />
          <Tooltip text={threshold}>
            <Info className="w-3 h-3 text-gray-600 hover:text-gray-400 transition-colors shrink-0" />
          </Tooltip>
        </div>

        {/* Row 2: gauge + value side-by-side */}
        <div className="flex items-center gap-3 mb-3">
          <ArcGauge pct={pct} accent={cfg.accent} status={status} />
          <div className="flex-1">
            <AnimatedValue
              value={value}
              unit={cfg.unit}
              decimals={cfg.decimals}
              className="text-[28px] font-bold text-white leading-none"
            />
            <div className="flex items-center gap-1.5 mt-2">
              <LiveDot accent={accentCol} />
              <span className="text-[10px] text-gray-500">Live · {timeAgo(lastUpdate)}</span>
            </div>
          </div>
        </div>

        {/* Row 3: range bar */}
        <RangeBar pct={pct} accent={cfg.accent} status={status} />

        {/* Expand/collapse specs */}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-gray-600">{threshold}</span>
          <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
            {expanded ? <><ChevronUp className="w-3 h-3"/>Less</> : <><ChevronDown className="w-3 h-3"/>Specs</>}
          </span>
        </div>

        {/* Expanded spec panel */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1">
            {cfg.spec.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accentCol }} />
                <span className="text-[10px] text-gray-400">{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fault status card ────────────────────────────────────────────────────────
function FaultStatusCard({ faultDetected, lastUpdate }: { faultDetected: boolean; lastUpdate: number }) {
  const col = faultDetected ? '#ef4444' : '#4ade80';
  return (
    <div className={cn(
      'rounded-xl border bg-[#0d1428] p-4 flex flex-col gap-3',
      faultDetected ? 'border-red-500/40' : 'border-white/[0.08]',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/[0.05]">
            {faultDetected
              ? <ShieldAlert className="w-4 h-4 text-red-400" />
              : <ShieldCheck  className="w-4 h-4 text-emerald-400" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-white leading-tight">Hardware Fault</p>
            <p className="text-[10px] text-gray-500">ESP32 detection</p>
          </div>
        </div>
        <StatusChip status={faultDetected ? 'fault' : 'safe'} />
      </div>

      {/* Status display */}
      <div className="flex flex-col items-center gap-2 py-3">
        <div className="relative">
          {/* Outer ring — only when fault */}
          {faultDetected && (
            <div className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: col }} />
          )}
          <div className="w-14 h-14 rounded-full flex items-center justify-center relative"
            style={{ backgroundColor: `${col}15`, border: `1px solid ${col}40` }}>
            {faultDetected
              ? <ShieldAlert className="w-7 h-7 text-red-400" />
              : <ShieldCheck  className="w-7 h-7 text-emerald-400" />}
          </div>
        </div>
        <p className="text-base font-bold tracking-widest" style={{ color: col }}>
          {faultDetected ? 'FAULT' : 'NORMAL'}
        </p>
        <p className="text-[10px] text-gray-500 text-center leading-relaxed">
          {faultDetected
            ? 'Live wire fault detected.\nImmediate action required.'
            : 'All systems operating normally.'}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-2">
        <LiveDot accent={col} />
        <span className="text-[10px] text-gray-500">{timeAgo(lastUpdate)}</span>
      </div>
    </div>
  );
}

// ─── Summary strip above the grid ────────────────────────────────────────────
function SummaryStrip({ faultCount, warnCount, total }: { faultCount: number; warnCount: number; total: number }) {
  const ok = total - faultCount - warnCount;
  return (
    <div className="flex items-center gap-4 text-xs text-gray-400">
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
        {ok} Normal
      </span>
      {warnCount > 0 && (
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          {warnCount} Warning
        </span>
      )}
      {faultCount > 0 && (
        <span className="flex items-center gap-1.5 text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block animate-pulse" />
          {faultCount} Fault
        </span>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SensorsPage() {
  const poles = Object.values(usePoleStore((s) => s.poles));
  const activePoles = poles.filter((p) => p.meta.area === 'Rajwada');

  if (activePoles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="p-4 rounded-full bg-white/5 border border-white/10">
          <Cpu className="w-8 h-8 text-gray-600" />
        </div>
        <p className="text-sm text-gray-500">No active sensors detected.</p>
        <p className="text-xs text-gray-600">Click "Simulate Live" or connect ESP32 hardware.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Live Sensor Readings"
        subtitle="Real-time data from ZMCT101B, ACS712 and ESP32 — click any card to see specs"
      />

      {activePoles.map((pole) => {
        const l = pole.live;

        const statuses: Record<SensorKey | 'fault', 'safe'|'warning'|'fault'> = {
          zmct1:       (l.zmct1_current_mA ?? 0) > 200 ? 'fault' : (l.zmct1_current_mA ?? 0) > 150 ? 'warning' : 'safe',
          zmct2:       (l.zmct2_current_mA ?? 0) > 200 ? 'fault' : (l.zmct2_current_mA ?? 0) > 150 ? 'warning' : 'safe',
          voltage:    (l.voltage_V > 250 || l.voltage_V < 200) ? 'fault' : 'safe',
          moisture:    l.moisture_percent    > 60 ? 'fault' : l.moisture_percent    > 50 ? 'warning' : 'safe',
          battery:     l.batteryLevel_percent < 20 ? 'warning' : 'safe',
          signal:      l.signalStrength      < -80 ? 'warning' : 'safe',
          fault:       l.faultDetected ? 'fault' : 'safe',
        };

        const allStatuses = Object.values(statuses);
        const faultCount  = allStatuses.filter((s) => s === 'fault').length;
        const warnCount   = allStatuses.filter((s) => s === 'warning').length;

        return (
          <div key={pole.id} className="space-y-4">
            {/* Pole header */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Radio className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{pole.meta.name}</h3>
                  <p className="text-[10px] text-gray-500">
                    {pole.meta.area} · {pole.meta.location.lat.toFixed(4)}, {pole.meta.location.lng.toFixed(4)}
                  </p>
                </div>
              </div>
              <SummaryStrip faultCount={faultCount} warnCount={warnCount} total={allStatuses.length} />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {l.zmct1_current_mA !== undefined && (
                <SensorCard
                  cfg={SENSORS.zmct1} skey="zmct1"
                  value={l.zmct1_current_mA} min={0} max={400}
                  status={statuses.zmct1} threshold="Trip: >200 mA" lastUpdate={l.lastUpdated}
                />
              )}
              {l.zmct2_current_mA !== undefined && (
                <SensorCard
                  cfg={SENSORS.zmct2} skey="zmct2"
                  value={l.zmct2_current_mA} min={0} max={400}
                  status={statuses.zmct2} threshold="Trip: >200 mA" lastUpdate={l.lastUpdated}
                />
              )}
              <SensorCard
                cfg={SENSORS.voltage} skey="voltage"
                value={l.voltage_V} min={180} max={270}
                status={statuses.voltage} threshold="Trip: >250 V" lastUpdate={l.lastUpdated}
              />
              <SensorCard
                cfg={SENSORS.moisture} skey="moisture"
                value={l.moisture_percent} min={0} max={100}
                status={statuses.moisture} threshold="Trip: ≥60%" lastUpdate={l.lastUpdated}
              />
              <SensorCard
                cfg={SENSORS.battery} skey="battery"
                value={l.batteryLevel_percent} min={0} max={100}
                status={statuses.battery} threshold="Min: 20%" lastUpdate={l.lastUpdated}
              />
              <SensorCard
                cfg={SENSORS.signal} skey="signal"
                value={Math.abs(l.signalStrength)} min={0} max={100}
                status={statuses.signal} threshold="Good: <70 dBm" lastUpdate={l.lastUpdated}
              />
              <FaultStatusCard faultDetected={l.faultDetected} lastUpdate={l.lastUpdated} />
            </div>
          </div>
        );
      })}

      {/* Hardware reference — compact table */}
      <div className="rounded-xl border border-white/[0.07] bg-[#0d1428]">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Cpu className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-white">Hardware Specifications</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-white/[0.05]">
          {(Object.entries(SENSORS) as [SensorKey, SensorCfg][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className="p-4 group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color: cfg.accent }} />
                  <span className="text-[11px] font-semibold text-white">{cfg.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 mb-1">{cfg.sub}</p>
                {cfg.spec.map((s, i) => (
                  <p key={i} className="text-[10px] text-gray-600 leading-relaxed">· {s}</p>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
