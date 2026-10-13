/**
 * Mock data simulator — pushes fake sensor data into the app store so you can
 * demo the dashboard without a real ESP32 connected.
 * Toggle via the "Simulate Live Data" button in the header.
 */
import { usePoleStore } from '@/store/poleStore';
import type { PoleLive, PoleMeta } from '@/types';

const MOCK_POLES: { id: string; meta: PoleMeta }[] = [
  // Rajwada Area - ACTIVE (Hardware connected)
  { id: 'pole_rajwada_01', meta: { name: 'Pole 01 - Main Line', location: { lat: 22.7176, lng: 75.8572 }, installedOn: '2026-01-15', status: 'online', area: 'Rajwada' } },
  { id: 'pole_rajwada_02', meta: { name: 'Pole 02 - Distribution', location: { lat: 22.7180, lng: 75.8578 }, installedOn: '2026-01-20', status: 'online', area: 'Rajwada' } },
  
  // Vijaynagar Area - INACTIVE (Dummy)
  { id: 'pole_vijaynagar_01', meta: { name: 'Pole 01 - VN Square', location: { lat: 22.7533, lng: 75.8937 }, installedOn: '2025-11-10', status: 'offline', area: 'Vijaynagar' } },
  { id: 'pole_vijaynagar_02', meta: { name: 'Pole 02 - AB Road', location: { lat: 22.7540, lng: 75.8945 }, installedOn: '2025-11-12', status: 'offline', area: 'Vijaynagar' } },
  { id: 'pole_vijaynagar_03', meta: { name: 'Pole 03 - Bhanwarkuan', location: { lat: 22.7520, lng: 75.8920 }, installedOn: '2025-11-15', status: 'offline', area: 'Vijaynagar' } },
  
  // Airport Area - INACTIVE (Dummy)
  { id: 'pole_airport_01', meta: { name: 'Pole 01 - Terminal Gate', location: { lat: 22.7217, lng: 75.8011 }, installedOn: '2025-12-01', status: 'offline', area: 'Airport' } },
  { id: 'pole_airport_02', meta: { name: 'Pole 02 - Parking Area', location: { lat: 22.7225, lng: 75.8020 }, installedOn: '2025-12-05', status: 'offline', area: 'Airport' } },
];

// Per-pole internal state for realistic drifting values
const state: Record<string, PoleLive> = {};

function jitter(base: number, range: number) {
  return parseFloat((base + (Math.random() - 0.5) * range * 2).toFixed(2));
}

function initPoleState(_id: string): PoleLive {
  return {
    leakageCurrent_mA: jitter(5, 3),
    loadCurrent_A: jitter(3.5, 1),
    voltage_V: jitter(228, 5),
    moisture_percent: jitter(35, 10),
    faultDetected: false,
    deviceTemp_C: jitter(32, 4),
    batteryLevel_percent: jitter(80, 10),
    signalStrength: jitter(-65, 10),
    lastUpdated: Date.now(),
  };
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let faultCycle = 0;

export function startSimulator() {
  console.log('🚀 Starting simulator with', MOCK_POLES.length, 'poles');
  
  // initialise all poles (active + inactive)
  MOCK_POLES.forEach(({ id, meta }) => {
    console.log('Initializing pole:', id, meta.area, meta.location);
    if (!state[id]) {
      // Only Rajwada poles get real data, others stay offline
      if (meta.area === 'Rajwada') {
        state[id] = initPoleState(id);
      } else {
        // Inactive poles - no live data
        state[id] = {
          leakageCurrent_mA: 0,
          loadCurrent_A: 0,
          voltage_V: 0,
          moisture_percent: 0,
          faultDetected: false,
          deviceTemp_C: 0,
          batteryLevel_percent: 0,
          signalStrength: -999,
          lastUpdated: Date.now() - 600_000, // 10 min old = offline
        };
      }
    }
    usePoleStore.getState().upsertPole(id, meta, state[id]);
  });
  
  console.log('✅ All poles initialized, starting interval');

  intervalId = setInterval(() => {
    faultCycle++;

    MOCK_POLES.forEach(({ id, meta }) => {
      // Only update Rajwada poles (real hardware)
      if (meta.area !== 'Rajwada') {
        // Keep dummy poles offline - don't update timestamp
        return;
      }

      const prev = state[id];

      // Drift values slightly each tick
      let live: PoleLive = {
        leakageCurrent_mA: Math.max(0, jitter(prev.leakageCurrent_mA, 0.8)),
        loadCurrent_A: Math.max(0, jitter(prev.loadCurrent_A, 0.3)),
        voltage_V: jitter(prev.voltage_V, 1.5),
        moisture_percent: Math.min(100, Math.max(0, jitter(prev.moisture_percent, 2))),
        faultDetected: false,
        deviceTemp_C: jitter(prev.deviceTemp_C, 0.5),
        batteryLevel_percent: Math.min(100, Math.max(0, prev.batteryLevel_percent - 0.05)),
        signalStrength: jitter(prev.signalStrength, 2),
        lastUpdated: Date.now(),
      };

      // Rain-water scenario: High moisture causes leakage in both poles
      // Pole 01: Primary leakage source (water logging at base)
      if (id === 'pole_rajwada_01' && faultCycle % 20 === 0) {
        live.moisture_percent = jitter(85, 5); // Very high moisture due to rain
        live.leakageCurrent_mA = jitter(18, 3); // Dangerous leakage
        live.faultDetected = true;
      }

      // Pole 02: Secondary effect (line-to-ground leakage between poles)
      if (id === 'pole_rajwada_02' && faultCycle % 25 === 0) {
        live.moisture_percent = jitter(75, 5); // High moisture
        live.leakageCurrent_mA = jitter(16, 2); // Leakage from line fault
        live.faultDetected = true;
      }

      // Gradual moisture increase on both poles (simulating rain)
      if (faultCycle % 5 === 0) {
        live.moisture_percent = Math.min(100, live.moisture_percent + 0.5);
      }

      state[id] = live;
      usePoleStore.getState().upsertPole(id, meta, live);
    });
  }, 2000); // simulate ESP32 pushing every 2s
}

export function stopSimulator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  usePoleStore.getState().clearPoles();
}

export function isSimulatorRunning() {
  return intervalId !== null;
}
