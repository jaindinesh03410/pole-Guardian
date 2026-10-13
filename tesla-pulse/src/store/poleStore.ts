import { create } from 'zustand';
import type { Pole, PoleLive, PoleMeta, AlertFeedItem, FaultEvent } from '@/types';
import { getPoleStatus, DEFAULT_THRESHOLDS } from '@/lib/utils';
import { sendTelegramAlert } from '@/lib/telegramService';

interface PoleStore {
  poles: Record<string, Pole>;
  alertFeed: AlertFeedItem[];
  activeFaults: FaultEvent[];
  connected: boolean;
  simulatorActive: boolean;

  upsertPole: (id: string, meta: PoleMeta, live: PoleLive) => void;
  clearPoles: () => void;
  setConnected: (v: boolean) => void;
  setSimulatorActive: (v: boolean) => void;
  pushAlert: (item: AlertFeedItem) => void;
  addFaultEvent: (event: FaultEvent) => void;
  resolveFault: (faultId: string) => void;
}

export const usePoleStore = create<PoleStore>((set, get) => ({
  poles: {},
  alertFeed: [],
  activeFaults: [],
  connected: true,
  simulatorActive: false,

  upsertPole: (id, meta, live) => {
    const prevPoles = get().poles;
    const prev = prevPoles[id];
    const uiStatus = getPoleStatus(live, DEFAULT_THRESHOLDS);

    // ─── FAULT DETECTION ────────────────────────────────────────────────────

    // 1. Leakage current fault
    if (live.leakageCurrent_mA > DEFAULT_THRESHOLDS.leakageCurrent_mA && (!prev || prev.live.leakageCurrent_mA <= DEFAULT_THRESHOLDS.leakageCurrent_mA)) {
      const alert: AlertFeedItem = {
        id: `${id}-leakage-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `🚨 CRITICAL: ${meta.name} — Leakage current ${live.leakageCurrent_mA.toFixed(1)} mA (Threshold: ${DEFAULT_THRESHOLDS.leakageCurrent_mA} mA)`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-leakage-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'leakage',
        value: live.leakageCurrent_mA,
        unit: 'mA',
        resolved: false,
        severity: 'critical',
      });
    }

    // 2. ZMCT1 Overcurrent fault
    if ((live.zmct1_current_mA ?? 0) > 200 && (!prev || (prev.live.zmct1_current_mA ?? 0) <= 200)) {
      const alert: AlertFeedItem = {
        id: `${id}-zmct1-overcurrent-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `⚡ CRITICAL: ${meta.name} — ZMCT1 Overcurrent ${live.zmct1_current_mA?.toFixed(1)} mA (Threshold: 200 mA) - Relay 2 TRIPPED`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-zmct1-overcurrent-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'overcurrent',
        value: live.zmct1_current_mA ?? 0,
        unit: 'mA',
        resolved: false,
        severity: 'critical',
      });
    }

    // 3. ZMCT2 Overcurrent fault
    if ((live.zmct2_current_mA ?? 0) > 200 && (!prev || (prev.live.zmct2_current_mA ?? 0) <= 200)) {
      const alert: AlertFeedItem = {
        id: `${id}-zmct2-overcurrent-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `⚡ CRITICAL: ${meta.name} — ZMCT2 Overcurrent ${live.zmct2_current_mA?.toFixed(1)} mA (Threshold: 200 mA) - Relay 2 TRIPPED`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-zmct2-overcurrent-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'overcurrent',
        value: live.zmct2_current_mA ?? 0,
        unit: 'mA',
        resolved: false,
        severity: 'critical',
      });
    }

    // 4. Overcurrent fault (legacy - loadCurrent_A)
    if (live.loadCurrent_A > DEFAULT_THRESHOLDS.loadCurrent_A_max && (!prev || prev.live.loadCurrent_A <= DEFAULT_THRESHOLDS.loadCurrent_A_max)) {
      const alert: AlertFeedItem = {
        id: `${id}-overcurrent-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `⚡ CRITICAL: ${meta.name} — Overcurrent detected ${live.loadCurrent_A.toFixed(1)} A (Max: ${DEFAULT_THRESHOLDS.loadCurrent_A_max} A)`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-overcurrent-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'overcurrent',
        value: live.loadCurrent_A,
        unit: 'A',
        resolved: false,
        severity: 'critical',
      });
    }

    // 5. Overvoltage fault
    if (live.voltage_V > DEFAULT_THRESHOLDS.voltage_V_max && (!prev || prev.live.voltage_V <= DEFAULT_THRESHOLDS.voltage_V_max)) {
      const alert: AlertFeedItem = {
        id: `${id}-overvoltage-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `⚠️ HIGH: ${meta.name} — Overvoltage ${live.voltage_V.toFixed(1)} V (Max: ${DEFAULT_THRESHOLDS.voltage_V_max} V)`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-overvoltage-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'overvoltage',
        value: live.voltage_V,
        unit: 'V',
        resolved: false,
        severity: 'high',
      });
    }

    // 6. Undervoltage fault
    if (live.voltage_V < DEFAULT_THRESHOLDS.voltage_V_min && (!prev || prev.live.voltage_V >= DEFAULT_THRESHOLDS.voltage_V_min)) {
      const alert: AlertFeedItem = {
        id: `${id}-undervoltage-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `⚠️ HIGH: ${meta.name} — Undervoltage ${live.voltage_V.toFixed(1)} V (Min: ${DEFAULT_THRESHOLDS.voltage_V_min} V)`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-undervoltage-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'undervoltage',
        value: live.voltage_V,
        unit: 'V',
        resolved: false,
        severity: 'high',
      });
    }

    // 7. High moisture fault (Relay 1 trips at ≥60%)
    if (live.moisture_percent > DEFAULT_THRESHOLDS.moisture_percent && (!prev || prev.live.moisture_percent <= DEFAULT_THRESHOLDS.moisture_percent)) {
      const alert: AlertFeedItem = {
        id: `${id}-moisture-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `💧 HIGH: ${meta.name} — High moisture ${live.moisture_percent.toFixed(0)}% (Threshold: ${DEFAULT_THRESHOLDS.moisture_percent}%) - Relay 1 TRIPPED`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-moisture-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'moisture',
        value: live.moisture_percent,
        unit: '%',
        resolved: false,
        severity: 'medium',
      });
    }

    // 6. Live wire fault detection (faultDetected flag from ESP32)
    if (live.faultDetected && (!prev || !prev.live.faultDetected)) {
      const alert: AlertFeedItem = {
        id: `${id}-livewire-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `🔴 CRITICAL: ${meta.name} — LIVE WIRE FAULT DETECTED! Immediate action required.`,
        timestamp: Date.now(),
        type: 'fault',
      };
      get().pushAlert(alert);
      get().addFaultEvent({
        id: `${id}-livewire-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        timestamp: Date.now(),
        type: 'livewire',
        value: live.leakageCurrent_mA,
        unit: 'mA',
        resolved: false,
        severity: 'critical',
      });
    }

    // detect recovery
    if (!live.faultDetected && prev?.live.faultDetected) {
      get().pushAlert({
        id: `${id}-recovered-${Date.now()}`,
        poleId: id,
        poleName: meta.name,
        message: `✅ ${meta.name} — Fault cleared, status normal`,
        timestamp: Date.now(),
        type: 'resolved',
      });
    }

    set((state) => ({
      poles: {
        ...state.poles,
        [id]: { id, meta, live, uiStatus },
      },
    }));
  },

  clearPoles: () => set({ poles: {} }),
  setConnected: (v) => set({ connected: v }),
  setSimulatorActive: (v) => set({ simulatorActive: v }),

  pushAlert: (item) =>
    set((state) => ({
      alertFeed: [item, ...state.alertFeed].slice(0, 100),
    })),

  addFaultEvent: (event) => {
    // Fire-and-forget Telegram alert
    sendTelegramAlert(event).catch(() => {/* silently swallow */});
    set((state) => ({
      activeFaults: [event, ...state.activeFaults],
    }));
  },

  resolveFault: (faultId) =>
    set((state) => ({
      activeFaults: state.activeFaults.map((f) =>
        f.id === faultId ? { ...f, resolved: true, resolvedAt: Date.now() } : f
      ),
    })),
}));
