# Final Hardware Setup - Complete Guide

## ✅ Hardware Configuration

### Sensors
- **2x ZMCT101B** - Current sensors (GPIO 34, 35)
- **1x ZMPT101B** - Voltage sensor (GPIO 33)
- **1x Capacitive Soil Moisture** - Moisture sensor (GPIO 32)

### Relays
- **Relay 1 (GPIO 23)** - Moisture protection
- **Relay 2 (GPIO 19)** - Overcurrent protection
- **Relay 3 (GPIO 18)** - Overvoltage protection

---

## ⚡ Relay Trip Logic

| Relay | Condition | Action | Purpose |
|-------|-----------|--------|---------|
| **Relay 1** | Moisture ≥ 60% | Turns ON | Moisture protection |
| **Relay 2** | ZMCT1 > 200mA OR ZMCT2 > 200mA | Turns ON | Overcurrent protection |
| **Relay 3** | Voltage > 250V | Turns ON | Overvoltage protection |

---

## 📋 Threshold Settings

```cpp
const float MOISTURE_THRESHOLD = 60.0;    // Relay 1 trips at ≥60%
const float CURRENT_THRESHOLD = 200.0;    // Relay 2 trips at >200mA
const float VOLTAGE_THRESHOLD = 250.0;    // Relay 3 trips at >250V
```

---

## 🔌 Pin Connections

### Input Sensors
```
ESP32 Pin → Sensor Type → Reading
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GPIO 34   → ZMCT1       → Current in mA
GPIO 35   → ZMCT2       → Current in mA
GPIO 33   → ZMPT        → Voltage in V
GPIO 32   → Moisture    → Moisture in %
```

### Output Relays
```
ESP32 Pin → Relay → Protection Type
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GPIO 23   → R1    → Moisture (≥60%)
GPIO 19   → R2    → Current (>200mA)
GPIO 18   → R3    → Voltage (>250V)
```

---

## 📤 Data Format Sent to Firebase

The ESP32 sends this JSON structure every 3 seconds:

```json
{
  "zmct1_current_mA": 120.5,
  "zmct2_current_mA": 95.3,
  "leakageCurrent_mA": 107.9,
  "loadCurrent_A": 0.12,
  "voltage_V": 228.5,
  "moisture_percent": 45,
  "faultDetected": false,
  "deviceTemp_C": 32.5,
  "batteryLevel_percent": 85,
  "signalStrength": -65,
  "relay1_status": false,
  "relay2_status": false,
  "relay3_status": false,
  "lastUpdated": 1704067200
}
```

### Field Descriptions

| Field | Description | Unit | Dashboard Display |
|-------|-------------|------|-------------------|
| `zmct1_current_mA` | ZMCT1 raw reading | mA | ZMCT1 Current card |
| `zmct2_current_mA` | ZMCT2 raw reading | mA | ZMCT2 Current card |
| `leakageCurrent_mA` | Average of ZMCT1+ZMCT2 | mA | Leakage Current card |
| `loadCurrent_A` | ZMCT1 in Amperes | A | Load Current card |
| `voltage_V` | ZMPT voltage | V | AC Voltage card |
| `moisture_percent` | Soil moisture | % | Soil Moisture card |
| `faultDetected` | Any relay tripped? | boolean | Fault Status card |
| `relay1_status` | Moisture relay | boolean | Not displayed |
| `relay2_status` | Current relay | boolean | Not displayed |
| `relay3_status` | Voltage relay | boolean | Not displayed |

---

## 🚀 Upload ESP32 Code

### Step 1: Open Arduino IDE
```
File → Open → tesla-pulse/ESP32_FINAL_HARDWARE.ino
```

### Step 2: Install Library
```
Tools → Manage Libraries
Search: "Firebase ESP Client"
Install: Firebase ESP Client by Mobizt (v4.3.x or higher)
```

### Step 3: Board Settings
```
Tools → Board → ESP32 Arduino → ESP32 Dev Module
Tools → Port → Select your COM port
```

### Step 4: WiFi Credentials (Already Set)
```cpp
const char* WIFI_SSID = "Your_WiFi_SSID";
const char* WIFI_PASSWORD = "Your_WiFi_Password";
```

### Step 5: Upload
Click **Upload** button (→) in Arduino IDE

---

## 📊 Expected Serial Monitor Output

```
════════════════════════════════════════════════════
  POLE GUARDIAN - FINAL HARDWARE v1.0
  Team Tesla Pulse
════════════════════════════════════════════════════

🔄 Connecting to WiFi...
SSID: SDBCT_AUDI 1
...........
✅ WiFi Connected!
IP: 192.168.1.105
Signal: -41 dBm

🔥 Initializing Firebase...
✅ Firebase Authentication OK

📋 Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pole ID: pole_rajwada_01
Relay 1 (Moisture): Trip at ≥60%
Relay 2 (Current): Trip at >200 mA
Relay 3 (Voltage): Trip at >250 V
Push Interval: 3 sec
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 System started...

╔════════════════════════════════════════╗
║         SENSOR READINGS                ║
╠════════════════════════════════════════╣
║ ZMCT1: 120.5 mA
║ ZMCT2: 95.3 mA
║ Voltage: 228.5 V
║ Moisture: 45 %
╠════════════════════════════════════════╣
║         RELAY STATUS                   ║
╠════════════════════════════════════════╣
║ Relay 1 (Moisture): ⚫ OFF
║ Relay 2 (Current): ⚫ OFF
║ Relay 3 (Voltage): ⚫ OFF
╠════════════════════════════════════════╣
║ WiFi: ✓ | Firebase: ✓ | RSSI: -41 dBm
╚════════════════════════════════════════╝

📤 Pushing to Firebase...
✅ Firebase SUCCESS
```

---

## 🖥️ Dashboard Display

### Sensors Page Shows:

1. **Leakage Current** - Average of ZMCT1 + ZMCT2
   - Threshold: 15 mA (fault)

2. **ZMCT1 Current** - Individual sensor 1 reading
   - Threshold: >200 mA (fault) - Trips Relay 2

3. **ZMCT2 Current** - Individual sensor 2 reading
   - Threshold: >200 mA (fault) - Trips Relay 2

4. **Load Current** - ZMCT1 converted to Amps
   - Threshold: 10 A (fault)

5. **AC Voltage** - ZMPT voltage sensor
   - Threshold: >250 V (fault) - Trips Relay 3

6. **Soil Moisture** - Capacitive moisture sensor
   - Threshold: ≥60% (fault) - Trips Relay 1

7. **Device Temp** - ESP32 internal temperature
8. **Battery** - Battery level percentage
9. **WiFi Signal** - Signal strength in dBm
10. **Fault Status** - Shows if any fault is detected

---

## 🧪 Test Without Hardware (Demo Mode)

If ESP32 hardware is not available:

### Step 1: Start Mock Pusher
```bash
cd tesla-pulse
node firebase-mock-pusher.cjs
```

### Step 2: Monitor Output
```
✅ Pole 1: ZMCT1=120mA | ZMCT2=95mA | V=228.5V | M=45% | R1:OFF R2:OFF R3:OFF
✅ Pole 2: ZMCT1=150mA | ZMCT2=110mA | V=230.2V | M=38% | R1:OFF R2:OFF R3:OFF
```

### Step 3: Watch Fault Simulation
Every 20 cycles (40 seconds), rain mode activates:
```
🌧️  RAIN MODE ACTIVATED - Faults will trigger!
🚨 Pole 1: ZMCT1=350mA | ZMCT2=180mA | V=235.0V | M=65% | R1:ON R2:ON R3:OFF
🚨 Pole 2: ZMCT1=180mA | ZMCT2=280mA | V=260.0V | M=62% | R1:ON R2:ON R3:ON
```

---

## 🔍 Troubleshooting

### Issue: WiFi Not Connecting
```
❌ WiFi Failed!
```
**Solution:**
- Verify SSID and password
- Check WiFi is 2.4 GHz (ESP32 doesn't support 5 GHz)
- Try mobile hotspot

### Issue: Firebase Authentication Error
```
❌ Firebase Auth Failed: connection lost
```
**Solution:**
- Weak WiFi signal - move ESP32 closer to router
- Check Firebase Anonymous Auth is enabled in console
- Wait 10-15 seconds for automatic retry

### Issue: No Data on Dashboard
**Solution:**
- Open Firebase RTDB URL in browser to verify data:
  ```
  https://tesla-pulse-9acb2-default-rtdb.asia-southeast1.firebasedatabase.app/poles/pole_rajwada_01/live.json
  ```
- Refresh dashboard page
- Check browser console for errors (F12)
- Use mock pusher for testing: `node firebase-mock-pusher.cjs`

---

## ✅ Files Updated

1. **ESP32_FINAL_HARDWARE.ino** - Complete ESP32 code with correct logic
2. **firebase-mock-pusher.cjs** - Mock data pusher matching hardware
3. **src/pages/SensorsPage.tsx** - Dashboard UI with correct thresholds
4. **src/types/index.ts** - TypeScript types with ZMCT fields

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| WiFi SSID | Your_WiFi_SSID |
| WiFi Password | Your_WiFi_Password |
| Pole ID | pole_rajwada_01 |
| Firebase URL | Your Firebase RTDB URL |
| Push Interval | 3 seconds |
| Baud Rate | 115200 |

---

## 🎯 Current Status

✅ ESP32 code with correct relay logic  
✅ Mock pusher with matching data format  
✅ Dashboard displaying all sensors  
✅ Thresholds updated:
  - Moisture: ≥60% (Relay 1)
  - Current: >200mA (Relay 2)
  - Voltage: >250V (Relay 3)

**Ready to upload to ESP32!**
