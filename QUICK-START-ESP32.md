# Quick Start - ESP32 to Dashboard Connection

## ✅ What's Fixed
- ESP32 now sends **ZMCT1**, **ZMCT2**, and **Soil Moisture** readings correctly
- Dashboard now displays all individual sensor values
- Data structure matches between hardware and frontend

## 🚀 Upload ESP32 Code (5 Steps)

### Step 1: Install Library
```
Arduino IDE → Tools → Manage Libraries
Search: "Firebase ESP Client"
Install: Firebase ESP Client by Mobizt (v4.3.x or higher)
```

### Step 2: Open Code
```
Open file: tesla-pulse/ESP32_PERFECT_STABLE.ino
```

### Step 3: Configure Board
```
Tools → Board → ESP32 Arduino → ESP32 Dev Module
Tools → Port → Select your COM port (e.g., COM92)
```

### Step 4: Verify WiFi Credentials
```cpp
const char* WIFI_SSID = "Your_WiFi_SSID";     // ← Update with your WiFi
const char* WIFI_PASSWORD = "Your_WiFi_Password";   // ← Update with your password
```

### Step 5: Upload
```
Click Upload button (→) in Arduino IDE
Wait for "Done uploading" message
```

## 📊 Expected Serial Monitor Output

```
================================
  POLE GUARDIAN - STABLE v3.0
  Team Tesla Pulse
================================

🔄 Connecting to WiFi...
SSID: SDBCT_AUDI 1
...........
✅ WiFi Connected!
IP: 192.168.1.105
Signal: -41 dBm

🔥 Initializing Firebase...
✅ Firebase Authentication OK

Configuration:
Pole ID: pole_rajwada_01
Current Limit: 1000 mA
Moisture Limit: 65 %
Push Interval: 3 sec

🔄 Starting...

╔════════════════════════════╗
║    READINGS                ║
╠════════════════════════════╣
║ C1: 250.8 mA
║ C2: 174.6 mA
║ V:  13.3 V
║ M:  100 %
╠════════════════════════════╣
║ R1: OFF
║ R2: OFF
║ R3: 💧ON
╠════════════════════════════╣
║ WiFi: ✓
║ FB:   ✓
║ RSSI: -41 dBm
╚════════════════════════════╝

📤 Pushing... ✅ Firebase SUCCESS
   ZMCT1: 250.8 mA | ZMCT2: 174.6 mA
   Voltage: 13.3 V | Moisture: 100 %
```

## 🖥️ Check Dashboard

### Step 1: Start Dev Server
```bash
cd tesla-pulse
npm run dev
```

### Step 2: Open Browser
```
http://localhost:5173
```

### Step 3: Navigate to Sensors Page
```
Dashboard → Sensors (left sidebar)
```

### Step 4: Verify Readings
Look for these sensor cards:
- ✅ **Leakage Current** (average of ZMCT1 + ZMCT2)
- ✅ **ZMCT1 Current** (individual reading from GPIO 34)
- ✅ **ZMCT2 Current** (individual reading from GPIO 35)
- ✅ **AC Voltage** (ZMPT sensor)
- ✅ **Soil Moisture** (capacitive sensor)
- ✅ All other device stats

## 🔧 Sensor Wiring Reference

```
ESP32 Pin → Sensor → Function
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GPIO 34   → ZMCT1    → Current Sensor 1 (Relay 1 @ 1000mA)
GPIO 35   → ZMCT2    → Current Sensor 2 (Relay 2 @ 1000mA)
GPIO 33   → ZMPT     → Voltage Sensor
GPIO 32   → Moisture → Soil Moisture (Relay 3 @ 65%)
GPIO 23   → Relay 1  → Output for ZMCT1 protection
GPIO 19   → Relay 2  → Output for ZMCT2 protection
GPIO 18   → Relay 3  → Output for moisture control
```

## ⚡ Relay Logic

| Sensor | Condition | Relay Action |
|--------|-----------|--------------|
| ZMCT1  | > 1000 mA | Relay 1 ON (trips) |
| ZMCT2  | > 1000 mA | Relay 2 ON (trips) |
| Moisture | ≥ 65% | Relay 3 ON (active) |

## 🐛 Troubleshooting

### WiFi Not Connecting
```
❌ WiFi Failed!
```
**Solution**: 
- Check SSID and password are correct
- Try mobile hotspot instead
- Check WiFi is 2.4 GHz (not 5 GHz)

### Firebase Authentication Error
```
❌ Firebase sign-in failed: connection lost
```
**Solution**:
- Weak WiFi signal - move ESP32 closer to router
- Network firewall blocking Firebase - try different network
- Wait 10-15 seconds for retry

### Dashboard Not Showing Data
**Solution**:
- Check Firebase RTDB URL in browser: 
  `https://tesla-pulse-9acb2-default-rtdb.asia-southeast1.firebasedatabase.app/poles/pole_rajwada_01/live.json`
- Enable Anonymous Auth in Firebase Console
- Use mock data pusher as alternative: `node firebase-mock-pusher.cjs`

## 🎯 Demo Mode (No Hardware Required)

If ESP32 hardware is not available or WiFi issues persist:

```bash
cd tesla-pulse
node firebase-mock-pusher.cjs
```

This pushes simulated data to Firebase every 3 seconds, including:
- ZMCT1: Random values 50-300 mA
- ZMCT2: Random values 50-300 mA
- Voltage: 220-235 V
- Moisture: 30-50%

## 📝 Files Changed

1. ✅ `tesla-pulse/src/types/index.ts` - Added ZMCT1, ZMCT2, relay fields
2. ✅ `tesla-pulse/src/pages/SensorsPage.tsx` - Added ZMCT1/ZMCT2 sensor cards
3. ✅ `tesla-pulse/ESP32_PERFECT_STABLE.ino` - WiFi credentials configured

## ✨ Current Status

**ESP32 Code**: Ready to upload ✅  
**Dashboard**: Updated to show all sensors ✅  
**Data Flow**: ESP32 → Firebase → Dashboard ✅  
**WiFi Config**: Update with your credentials ✅  

Upload the code and check the Serial Monitor - data should flow immediately!
