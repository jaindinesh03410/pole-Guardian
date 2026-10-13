import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { PoleLive, Pole, PoleThresholds } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_THRESHOLDS: PoleThresholds = {
  leakageCurrent_mA: 15,
  voltage_V_min: 200,
  voltage_V_max: 250,
  moisture_percent: 60,  // Changed from 70 to 60 (Relay 1 trips at ≥60%)
  loadCurrent_A_max: 10,
  liveWireFault: true,
};

/** Determine UI status from live data + thresholds */
export function getPoleStatus(
  live: PoleLive | null,
  thresholds: PoleThresholds = DEFAULT_THRESHOLDS
): Pole['uiStatus'] {
  if (!live) return 'offline';
  const age = Date.now() - live.lastUpdated;
  if (age > 30_000) return 'offline';
  if (live.faultDetected) return 'fault';
  
  // Critical faults
  if (live.leakageCurrent_mA > thresholds.leakageCurrent_mA) return 'fault';
  if (live.loadCurrent_A > thresholds.loadCurrent_A_max) return 'fault';
  if (live.voltage_V > thresholds.voltage_V_max) return 'fault';
  if (live.voltage_V < thresholds.voltage_V_min) return 'fault';
  
  // Warnings
  if (
    live.leakageCurrent_mA > thresholds.leakageCurrent_mA * 0.8 ||
    live.moisture_percent > thresholds.moisture_percent * 0.8 ||
    live.voltage_V > thresholds.voltage_V_max * 0.98 ||
    live.voltage_V < thresholds.voltage_V_min * 1.02 ||
    live.loadCurrent_A > thresholds.loadCurrent_A_max * 0.8
  )
    return 'warning';
  return 'safe';
}

export function statusColor(status: Pole['uiStatus']) {
  switch (status) {
    case 'safe': return 'text-safe';
    case 'warning': return 'text-warning';
    case 'fault': return 'text-fault';
    default: return 'text-gray-400';
  }
}

export function statusBorder(status: Pole['uiStatus']) {
  switch (status) {
    case 'safe': return 'border-safe/60';
    case 'warning': return 'border-warning/60';
    case 'fault': return 'border-fault/60';
    default: return 'border-gray-600';
  }
}

export function statusGlow(status: Pole['uiStatus']) {
  switch (status) {
    case 'safe': return 'shadow-[0_0_12px_rgba(34,197,94,0.35)]';
    case 'warning': return 'shadow-[0_0_12px_rgba(245,158,11,0.35)]';
    case 'fault': return 'shadow-[0_0_20px_rgba(239,68,68,0.5)]';
    default: return '';
  }
}

export function formatTs(ts: number) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5000) return 'just now';
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}
