# Sensor Display Fix - ZMCT1, ZMCT2, and Moisture

## Issue
Dashboard was not displaying individual ZMCT1 and ZMCT2 current sensor readings that ESP32 was sending to Firebase.

## Root Cause
1. ESP32 code was correctly sending `zmct1_current_mA` and `zmct2_current_mA` fields
2. TypeScript interface (`PoleLive`) didn't include these optional fields
3. Sensors page UI wasn't rendering these individual sensor cards

## Solution Applied

### 1. Updated TypeScript Types (`tesla-pulse/src/types/index.ts`)
Added optional fields to `PoleLive` interface:
```typescript
zmct1_current_mA?: number;  // ZMCT1 raw current in mA
zmct2_current_mA?: number;  // ZMCT2 raw current in mA
relay1_status?: boolean;     // Relay 1 status (ZMCT1 protection)
relay2_status?: boolean;     // Relay 2 status (ZMCT2 protection)
relay3_status?: boolean;     // Relay 3 status (moisture protection)
```

### 2. Updated Sensors Page (`tesla-pulse/src/pages/SensorsPage.tsx`)
- Added `zmct1` and `zmct2` to sensor configuration
- ZMCT1: GPIO 34, Trip at 1000mA, Cyan accent (#06b6d4)
- ZMCT2: GPIO 35, Trip at 1000mA, Sky blue accent (#0ea5e9)
- Updated sensor grid to conditionally render ZMCT1 and ZMCT2 cards when data is available
- Updated hardware specs table to show all 5 main sensors: Leakage, ZMCT1, ZMCT2, Voltage, Moisture
- Updated moisture sensor threshold display from "Max: 70%" to "Trip: 65%" (matching ESP32 code)

### 3. ESP32 Code Status (`tesla-pulse/ESP32_PERFECT_STABLE.ino`)
- Already correctly structured with proper JSON field names
- WiFi credentials: Update with your WiFi SSID and password
- Sends complete sensor data every 3 seconds:
  - `leakageCurrent_mA` - Average of ZMCT1 + ZMCT2
  - `zmct1_current_mA` - ZMCT1 raw reading
  - `zmct2_current_mA` - ZMCT2 raw reading
  - `voltage_V` - ZMPT sensor
  - `moisture_percent` - Soil moisture sensor
  - All relay statuses and device info

## What User Will See Now

### Sensors Page Display (when ESP32 is connected):
1. **Leakage Current** - Average of both ZMCT sensors (15 mA threshold)
2. **ZMCT1 Current** - Individual ZMCT1 reading (1000 mA trip point)
3. **ZMCT2 Current** - Individual ZMCT2 reading (1000 mA trip point)
4. **Load Current** - Converted from ZMCT1 in Amps
5. **AC Voltage** - ZMPT voltage sensor
6. **Soil Moisture** - Capacitive moisture sensor (65% trip point)
7. **Device Temp** - ESP32 internal temperature
8. **Battery** - Battery level percentage
9. **WiFi Signal** - Signal strength in dBm
10. **Fault Status** - Hardware fault detection card

## Hardware Mapping
- **GPIO 34** → ZMCT1 current sensor → Relay 1 (trips at >1000mA)
- **GPIO 35** → ZMCT2 current sensor → Relay 2 (trips at >1000mA)
- **GPIO 33** → ZMPT voltage sensor
- **GPIO 32** → Soil moisture sensor → Relay 3 (activates at ≥65%)
- **GPIO 23** → Relay 1 output
- **GPIO 19** → Relay 2 output
- **GPIO 18** → Relay 3 output

## Testing Steps

1. **Upload ESP32 Code**:
   ```bash
   # Open ESP32_PERFECT_STABLE.ino in Arduino IDE
   # Install library: Firebase ESP Client by Mobizt
   # Select board: ESP32 Dev Module
   # Upload code
   ```

2. **Monitor Serial Output**:
   ```
   ✅ WiFi Connected!
   ✅ Firebase Authentication OK
   ✅ Firebase SUCCESS
      ZMCT1: 250.8 mA | ZMCT2: 174.6 mA
      Voltage: 13.3 V | Moisture: 100 %
   ```

3. **Check Dashboard**:
   - Open `http://localhost:5173` (or your dev server URL)
   - Navigate to **Sensors** page
   - Look for individual ZMCT1 and ZMCT2 sensor cards
   - Both should show live readings updating every 3 seconds

## Alternative: Mock Data for Demo

If ESP32 WiFi issues persist, use the mock data pusher:

```bash
cd tesla-pulse
node firebase-mock-pusher.cjs
```

This will push simulated sensor data including ZMCT1, ZMCT2, and moisture readings to Firebase.

## Status
✅ **COMPLETE** - Dashboard now correctly displays all sensor readings from ESP32
