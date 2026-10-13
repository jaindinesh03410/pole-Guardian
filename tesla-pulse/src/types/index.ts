// ─── Pole live sensor data (mirrors RTDB structure) ───────────────────────────
export interface PoleLive {
  leakageCurrent_mA: number;
  loadCurrent_A: number;
  voltage_V: number;
  moisture_percent: number;
  faultDetected: boolean;
  deviceTemp_C: number;
  batteryLevel_percent: number;
  signalStrength: number; // dBm (negative)
  lastUpdated: number;    // Unix ms
  // Additional raw sensor readings from ESP32
  zmct1_current_mA?: number;  // ZMCT1 raw current in mA
  zmct2_current_mA?: number;  // ZMCT2 raw current in mA
  zmct3_current_mA?: number;  // ZMCT3 raw current in mA
  relay1_status?: boolean;     // Relay 1 status (ZMCT1 protection)
  relay2_status?: boolean;     // Relay 2 status (ZMCT2 protection)
  relay3_status?: boolean;     // Relay 3 status (moisture protection)
}

export interface PoleMeta {
  name: string;
  location: { lat: number; lng: number };
  installedOn: string;
  status: 'online' | 'offline';
  area?: string; // Vijaynagar, Rajwada, Airport
}

export interface Pole {
  id: string;
  meta: PoleMeta;
  live: PoleLive;
  // computed client-side
  uiStatus: 'safe' | 'warning' | 'fault' | 'offline';
}

// ─── Firestore fault_events ────────────────────────────────────────────────────
export type FaultType = 'leakage' | 'overvoltage' | 'moisture' | 'offline' | 'overcurrent' | 'livewire' | 'undervoltage';

export interface FaultEvent {
  id: string;
  poleId: string;
  poleName: string;
  timestamp: number;
  type: FaultType;
  value: number;
  unit: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  notes?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

// ─── Firestore history_logs ────────────────────────────────────────────────────
export interface HistoryLog {
  id: string;
  poleId: string;
  timestamp: number;
  leakageCurrent_mA: number;
  loadCurrent_A: number;
  voltage_V: number;
  moisture_percent: number;
}

// ─── Auth / Users ──────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'technician';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  assignedPoles?: string[]; // for technicians
}

// ─── Alert feed item ───────────────────────────────────────────────────────────
export interface AlertFeedItem {
  id: string;
  poleId: string;
  poleName: string;
  message: string;
  timestamp: number;
  type: 'fault' | 'warning' | 'info' | 'resolved';
}

// ─── Threshold config ─────────────────────────────────────────────────────────
export interface PoleThresholds {
  leakageCurrent_mA: number;   // default: 15
  voltage_V_min: number;        // default: 200
  voltage_V_max: number;        // default: 250
  moisture_percent: number;     // default: 70
  loadCurrent_A_max: number;    // default: 10
  liveWireFault: boolean;       // detect disconnected neutral/phase
}

// ─── Firestore maintenance_logs ────────────────────────────────────────────────
export type MaintenanceStatus   = 'completed' | 'due-soon' | 'overdue' | 'scheduled';
export type MaintenancePriority = 'low' | 'medium' | 'high';

export interface MaintenanceRecord {
  id:                  string;
  poleId:              string;
  poleName:            string;
  lastMaintenanceDate: number;       // Unix ms — when last maintenance was done
  nextDueDate:         number;       // Unix ms — when next maintenance is due
  status:              MaintenanceStatus;
  assignedTechnician:  string;       // display name or UID
  notes:               string;
  priority:            MaintenancePriority;
  // optional — populated only once the job is marked complete
  completedBy?:        string;
  completedAt?:        number;       // Unix ms
}
