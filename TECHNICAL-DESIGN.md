# 🏗️ Technical Design Document
# Tesla Pulse - Smart Electric Pole Monitoring System

**Version:** 1.0  
**Date:** January 2026  
**Team:** Tesla Pulse

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Component Specifications](#component-specifications)
4. [Data Flow](#data-flow)
5. [API Design](#api-design)
6. [Database Schema](#database-schema)
7. [Security](#security)
8. [Scalability](#scalability)
9. [Performance](#performance)
10. [Deployment](#deployment)

---

## 1. System Overview

### 1.1 Purpose
Tesla Pulse is an IoT-based monitoring and protection system for electric utility poles that provides real-time fault detection, automated load disconnection, and instant alerting.

### 1.2 Scope
- Real-time monitoring of 7 electric poles across 3 geographic areas
- Automated protection using relay-based circuit breakers
- Web-based dashboard for visualization and control
- Mobile alerts via Telegram

### 1.3 Goals
- **Reduce downtime** through early fault detection
- **Prevent equipment damage** via automated protection
- **Minimize response time** with instant alerts
- **Enable predictive maintenance** through data analytics

---

## 2. Architecture Design

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
│  ┌──────────────────┐         ┌─────────────────────────────┐  │
│  │  Web Dashboard   │         │    Telegram Mobile App      │  │
│  │  (React + Vite)  │         │    (Multi-recipient)        │  │
│  └────────┬─────────┘         └──────────────┬──────────────┘  │
└───────────┼────────────────────────────────────┼─────────────────┘
            │                                    │
            │                                    │
            ↓                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Firebase Platform                            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │  RTDB       │  │  Firestore   │  │  Cloud         │  │  │
│  │  │  (Live Data)│  │  (Events)    │  │  Functions     │  │  │
│  │  └──────┬──────┘  └──────┬───────┘  └────────┬───────┘  │  │
│  └─────────┼─────────────────┼──────────────────┼──────────┘  │
└────────────┼─────────────────┼──────────────────┼─────────────┘
             │                 │                  │
             │                 │                  │
             ↓                 ↓                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                    HARDWARE/IOT LAYER                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    ESP32 Microcontroller                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │ │
│  │  │ WiFi     │  │ Firebase │  │ Sensor   │  │ Relay     │ │ │
│  │  │ Module   │  │ Client   │  │ Manager  │  │ Control   │ │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │ │
│  └───────┼─────────────┼─────────────┼──────────────┼────────┘ │
└──────────┼─────────────┼─────────────┼──────────────┼──────────┘
           │             │             │              │
           ↓             ↓             ↓              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PHYSICAL LAYER                              │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌─────────┐  │
│  │ ZMCT1  │  │ ZMCT2  │  │ ZMPT   │  │Moisture│  │ Relays  │  │
│  │ Sensor │  │ Sensor │  │ Sensor │  │Sensors │  │ 4CH     │  │
│  └────────┘  └────────┘  └────────┘  └────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Interaction Diagram

```
┌─────────┐      WiFi/HTTPS       ┌──────────┐
│  ESP32  │ ─────────────────────→│ Firebase │
│ Device  │                        │   RTDB   │
└────┬────┘                        └────┬─────┘
     │                                  │
     │ Sensor Readings                  │ Real-time Sync
     │ Every 3 sec                      │
     ↓                                  ↓
┌──────────────┐                   ┌──────────┐
│ ZMCT1: 150mA │                   │  React   │
│ ZMCT2: 180mA │ ←─────────────────│Dashboard │
│ Voltage: 230V│     WebSocket     └──────────┘
│ Moisture: 45%│
└──────────────┘
     │
     │ Fault Detected
     │ (Current > 200mA)
     ↓
┌──────────────┐                   ┌──────────┐
│ Write to     │ ─────────────────→│Firestore │
│ fault_events │    Cloud Function │  Events  │
└──────────────┘                   └────┬─────┘
                                        │
                                        │ Trigger
                                        ↓
                                   ┌──────────┐
                                   │ Telegram │
                                   │   Bot    │
                                   └──────────┘
```

---

## 3. Component Specifications

### 3.1 ESP32 Firmware

**Language:** C++ (Arduino Framework)  
**Library:** Firebase ESP Client v4.3.x  
**RTOS:** FreeRTOS (built-in)

#### Key Modules:

**1. Sensor Manager**
```cpp
class SensorManager {
  public:
    float readZMCT(int pin, float calibration);
    float readVoltage(int pin);
    float readMoisture(int pin);
  private:
    float calculateRMS(int samples, int pin);
    float applyMovingAverage(float value);
};
```

**2. Protection Controller**
```cpp
class ProtectionController {
  public:
    bool checkOvercurrent(float current, float threshold);
    bool checkMoisture(float moisture, float threshold);
    void triggerRelay(int relayPin, bool state);
    void controlBuzzer(bool faultActive);
};
```

**3. Firebase Handler**
```cpp
class FirebaseHandler {
  public:
    bool connect(const char* apiKey, const char* dbUrl);
    bool pushData(FirebaseJson& json);
    void handleReconnection();
  private:
    FirebaseData fbdo;
    FirebaseAuth auth;
    FirebaseConfig config;
};
```

#### Timing Specifications:
- Sensor sampling: 1000 Hz
- Data push interval: 3 seconds
- WiFi reconnect: Every 10 seconds check
- Relay response time: <100ms

### 3.2 React Dashboard

**Framework:** React 18.2  
**Build Tool:** Vite 5.0  
**Language:** TypeScript 5.0  
**Styling:** TailwindCSS 3.4  

#### Architecture Pattern: Component-Based

```
src/
├── components/
│   ├── dashboard/          # Overview components
│   ├── pole/               # Pole detail components
│   ├── layout/             # Layout components
│   └── ui/                 # Reusable UI components
├── pages/
│   ├── OverviewPage.tsx
│   ├── SensorsPage.tsx
│   ├── FaultsPage.tsx
│   ├── AnalyticsPage.tsx
│   └── MaintenancePage.tsx
├── hooks/
│   ├── useRTDB.ts          # Firebase RTDB hook
│   ├── useFaultEvents.ts   # Firestore hook
│   └── useMaintenanceLogs.ts
├── store/
│   └── poleStore.ts        # Zustand state management
├── lib/
│   ├── firebase.ts         # Firebase initialization
│   ├── telegramService.ts  # Telegram API
│   └── utils.ts            # Helper functions
└── types/
    └── index.ts            # TypeScript definitions
```

#### State Management (Zustand):

```typescript
interface PoleStore {
  poles: Record<string, Pole>;
  alertFeed: AlertFeedItem[];
  activeFaults: FaultEvent[];
  connected: boolean;
  
  upsertPole: (id: string, meta: PoleMeta, live: PoleLive) => void;
  addFaultEvent: (event: FaultEvent) => void;
  resolveFault: (faultId: string) => void;
}
```

### 3.3 Firebase Configuration

#### Realtime Database Structure:
```json
{
  "poles": {
    "pole_rajwada_01": {
      "meta": {
        "name": "Pole 01 - Main Line",
        "location": { "lat": 22.7176, "lng": 75.8577 },
        "installedOn": "2026-01-15",
        "status": "online",
        "area": "Rajwada"
      },
      "live": {
        "zmct1_current_mA": 150.5,
        "zmct2_current_mA": 180.2,
        "leakageCurrent_mA": 165.35,
        "loadCurrent_A": 0.15,
        "voltage_V": 228.5,
        "moisture_percent": 45,
        "moisture1_percent": 43,
        "moisture2_percent": 47,
        "faultDetected": false,
        "deviceTemp_C": 32.5,
        "batteryLevel_percent": 87,
        "signalStrength": -65,
        "relay1_status": false,
        "relay2_status": false,
        "relay3_status": false,
        "relay4_status": false,
        "buzzer_status": true,
        "lastUpdated": 1704067200000
      }
    }
  }
}
```

#### Firestore Collections:

**1. fault_events:**
```typescript
{
  id: string;
  poleId: string;
  poleName: string;
  timestamp: number;
  type: 'leakage' | 'overcurrent' | 'overvoltage' | 'moisture';
  value: number;
  unit: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
}
```

**2. maintenance_logs:**
```typescript
{
  id: string;
  poleId: string;
  poleName: string;
  lastMaintenanceDate: number;
  nextDueDate: number;
  status: 'completed' | 'due-soon' | 'overdue' | 'scheduled';
  assignedTechnician: string;
  notes: string;
  priority: 'low' | 'medium' | 'high';
  completedBy?: string;
  completedAt?: number;
}
```

#### Cloud Functions:

**sendTelegramAlert.ts:**
```typescript
export const sendTelegramAlert = functions.firestore
  .document('fault_events/{eventId}')
  .onCreate(async (snapshot, context) => {
    const event = snapshot.data() as FaultEvent;
    
    // Format message
    const message = formatAlertMessage(event);
    
    // Send to multiple recipients
    const chatIds = process.env.TELEGRAM_CHAT_IDS?.split(',') || [];
    
    await Promise.all(
      chatIds.map(chatId => sendToTelegram(chatId, message))
    );
  });
```

---

## 4. Data Flow

### 4.1 Real-Time Monitoring Flow

```
┌─────────┐
│  ESP32  │ Reads sensors every 1 second
└────┬────┘
     │
     │ Process data (RMS, averaging, filtering)
     ↓
┌──────────────┐
│ Local Buffer │ Store 5 readings
└──────┬───────┘
       │
       │ Every 3 seconds
       ↓
┌────────────────┐
│ Firebase RTDB  │ Push JSON payload
│ /poles/{id}/   │
│ live           │
└────────┬───────┘
         │
         │ WebSocket sync
         ↓
┌────────────────┐
│ React Hook     │ useRTDB.ts listens
│ (onValue)      │
└────────┬───────┘
         │
         │ Update state
         ↓
┌────────────────┐
│ Zustand Store  │ poles: {...}
└────────┬───────┘
         │
         │ React re-render
         ↓
┌────────────────┐
│ UI Components  │ Display updated values
└────────────────┘
```

### 4.2 Fault Detection Flow

```
ESP32 detects fault
     ↓
Trigger relay (local protection)
     ↓
Set faultDetected = true
     ↓
Push to Firebase RTDB
     ↓
Dashboard detects fault (poleStore.ts)
     ↓
Create AlertFeedItem (UI notification)
     ↓
Write to Firestore fault_events
     ↓
Cloud Function triggered
     ↓
Format Telegram message
     ↓
Send to all chat IDs
     ↓
Users receive notification
```

---

## 5. API Design

### 5.1 Firebase RTDB Endpoints

**Base URL:** `https://tesla-pulse-9acb2-default-rtdb.asia-southeast1.firebasedatabase.app`

#### GET /poles/{poleId}/live.json
**Response:**
```json
{
  "zmct1_current_mA": 150.5,
  "zmct2_current_mA": 180.2,
  "voltage_V": 228.5,
  "moisture_percent": 45,
  "faultDetected": false,
  "lastUpdated": 1704067200000
}
```

#### PUT /poles/{poleId}/live.json
**Request Body:** Complete live data object

### 5.2 Telegram Bot API

**Base URL:** `https://api.telegram.org/bot{BOT_TOKEN}`

#### POST /sendMessage
**Request:**
```json
{
  "chat_id": "123456789",
  "text": "🚨 CRITICAL: Pole 01 - ZMCT1 Overcurrent 250mA",
  "parse_mode": "HTML"
}
```

### 5.3 Firestore REST API

**Base URL:** `https://firestore.googleapis.com/v1/projects/tesla-pulse-9acb2/databases/(default)/documents`

#### POST /fault_events
**Request:**
```json
{
  "fields": {
    "poleId": {"stringValue": "pole_rajwada_01"},
    "type": {"stringValue": "overcurrent"},
    "value": {"doubleValue": 250.5},
    "timestamp": {"integerValue": "1704067200000"}
  }
}
```

---

## 6. Database Schema

### 6.1 Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│    Poles    │ 1    ∞  │ FaultEvents  │  ∞   1  │  Maintenance    │
│─────────────│←────────│──────────────│────────→│─────────────────│
│ id (PK)     │         │ id (PK)      │         │ id (PK)         │
│ meta        │         │ poleId (FK)  │         │ poleId (FK)     │
│ live        │         │ timestamp    │         │ lastMaintenance │
└─────────────┘         │ type         │         │ nextDueDate     │
                        │ value        │         │ status          │
                        │ resolved     │         │ technician      │
                        │ severity     │         └─────────────────┘
                        └──────────────┘
```

### 6.2 TypeScript Interfaces

```typescript
// Core Data Types
interface Pole {
  id: string;
  meta: PoleMeta;
  live: PoleLive;
  uiStatus: 'safe' | 'warning' | 'fault' | 'offline';
}

interface PoleMeta {
  name: string;
  location: { lat: number; lng: number };
  installedOn: string;
  status: 'online' | 'offline';
  area?: string;
}

interface PoleLive {
  zmct1_current_mA?: number;
  zmct2_current_mA?: number;
  leakageCurrent_mA: number;
  loadCurrent_A: number;
  voltage_V: number;
  moisture_percent: number;
  moisture1_percent?: number;
  moisture2_percent?: number;
  faultDetected: boolean;
  deviceTemp_C: number;
  batteryLevel_percent: number;
  signalStrength: number;
  relay1_status?: boolean;
  relay2_status?: boolean;
  relay3_status?: boolean;
  relay4_status?: boolean;
  buzzer_status?: boolean;
  lastUpdated: number;
}

interface FaultEvent {
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

type FaultType = 'leakage' | 'overvoltage' | 'moisture' | 
                 'offline' | 'overcurrent' | 'undervoltage';
```

---

## 7. Security

### 7.1 Firebase Security Rules

**Realtime Database:**
```json
{
  "rules": {
    "poles": {
      "$poleId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

**Firestore:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /fault_events/{eventId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    match /maintenance_logs/{logId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### 7.2 Environment Variables

**Never commit:**
- Firebase API keys
- Telegram bot tokens
- Database URLs with authentication

**Use `.env` files:**
```env
# .env (not in git)
VITE_FIREBASE_API_KEY=xxxxx
TELEGRAM_BOT_TOKEN=xxxxx
```

**Use `.env.example`:**
```env
# .env.example (committed)
VITE_FIREBASE_API_KEY=your_api_key_here
TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 7.3 ESP32 Security

- Use WPA2/WPA3 WiFi encryption
- Store credentials in secure partition (future enhancement)
- Implement OTA firmware updates with signature verification
- Use Firebase authentication tokens

---

## 8. Scalability

### 8.1 Horizontal Scaling

**Current:** 7 poles  
**Target:** 100+ poles  

**Approach:**
1. Firebase RTDB can handle 100,000 concurrent connections
2. Each pole writes independently (no coordination needed)
3. Dashboard uses efficient listeners (one per pole)

### 8.2 Database Optimization

**RTDB Indexing:**
```json
{
  "rules": {
    "poles": {
      ".indexOn": ["meta/status", "meta/area"]
    }
  }
}
```

**Firestore Composite Indexes:**
```
Collection: fault_events
Fields: poleId (Ascending), timestamp (Descending)
Fields: resolved (Ascending), severity (Descending)
```

### 8.3 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Dashboard Load Time | <2s | 1.5s |
| Real-time Update Latency | <500ms | 300ms |
| Fault Alert Delivery | <3s | 2s |
| Sensor Data Push | 3s interval | 3s |
| Concurrent Users | 50+ | Tested 10 |

---

## 9. Performance

### 9.1 Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load pages
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
```

**Memoization:**
```typescript
const MemoizedSensorCard = memo(SensorCard);
```

**Virtual Scrolling:**
- Fault events list (100+ items)
- Maintenance logs table

### 9.2 Backend Optimization

**Firebase RTDB:**
- Shallow queries for metadata
- Filtered listeners per pole
- Disconnect detection

**Cloud Functions:**
- Batch Telegram sends
- Async processing
- Timeout: 60s

### 9.3 ESP32 Optimization

**Task Scheduling:**
```cpp
// Sensor task: High priority
xTaskCreate(sensorTask, "Sensors", 4096, NULL, 3, NULL);

// Firebase task: Medium priority
xTaskCreate(firebaseTask, "Firebase", 8192, NULL, 2, NULL);

// Display task: Low priority
xTaskCreate(displayTask, "Display", 2048, NULL, 1, NULL);
```

**Memory Management:**
- Static allocation for sensor buffers
- Ring buffer for moving average
- Clear JSON objects after use

---

## 10. Deployment

### 10.1 Development Environment

```bash
# Clone repository
git clone https://github.com/jaindinesh03410/pole-Guardian.git

# Install dependencies
cd tesla-pulse && npm install
cd ../functions && npm install

# Start dev server
cd tesla-pulse && npm run dev
```

### 10.2 Production Build

```bash
# Build React app
cd tesla-pulse
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting

# Deploy Cloud Functions
cd ../functions
firebase deploy --only functions
```

### 10.3 ESP32 Deployment

**Initial Setup:**
1. Flash firmware via USB
2. Configure WiFi via Serial
3. Verify Firebase connection

**OTA Updates (Future):**
```cpp
#include <ArduinoOTA.h>

void setupOTA() {
  ArduinoOTA.setHostname("pole-01");
  ArduinoOTA.setPassword("secure_password");
  ArduinoOTA.begin();
}
```

### 10.4 Monitoring

**Firebase Console:**
- Database usage
- Function invocations
- Authentication metrics

**Custom Monitoring:**
- Pole offline detection
- Battery level alerts
- WiFi signal strength

---

## 11. Future Enhancements

### 11.1 Planned Features
- [ ] Machine learning for predictive maintenance
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-tenancy support
- [ ] Role-based access control
- [ ] Historical data export (CSV/PDF)
- [ ] SMS alerts (backup to Telegram)
- [ ] Solar panel monitoring
- [ ] Energy consumption tracking

### 11.2 Technology Upgrades
- [ ] Edge ML on ESP32 for local anomaly detection
- [ ] LoRaWAN for remote poles without WiFi
- [ ] GraphQL API for flexible queries
- [ ] Redis caching layer
- [ ] Kubernetes deployment
- [ ] Prometheus metrics collection

---

## 📚 References

1. ESP32 Technical Reference Manual
2. Firebase Documentation
3. React TypeScript Best Practices
4. ZMCT101B Sensor Datasheet
5. ZMPT101B Sensor Datasheet
6. Telegram Bot API Documentation

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Authors:** Team Tesla Pulse
