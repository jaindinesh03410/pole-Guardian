# 🔌 ESP32 Firebase Integration - Complete Setup Guide

## ✅ What You Get

- **Real-time sensor data** pushed to Firebase every 2 seconds
- **Automatic fault detection** with relay control
- **WiFi auto-reconnect** if connection drops
- **Dashboard instantly updates** with live ESP32 data

---

## 📋 Requirements

### Hardware:
- ESP32 Development Board
- 2x ZMCT Current Sensors (pins 34, 35)
- 1x ZMPT101B Voltage Sensor (pin 33)
- 1x Soil Moisture Sensor (pin 32)
- 3x Relays (pins 23, 19, 18)

### Software:
- Arduino IDE 1.8.19 or higher
- ESP32 Board Support installed
- Required Library: **FirebaseESP32** by Mobizt

---

## 🚀 Step-by-Step Setup

### Step 1: Install ESP32 Board Support

1. Open Arduino IDE
2. File → Preferences
3. Additional Board Manager URLs, add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Tools → Board → Boards Manager
5. Search "ESP32" and install **esp32 by Espressif Systems**

### Step 2: Install FirebaseESP32 Library

1. Tools → Manage Libraries (or Ctrl+Shift+I)
2. Search: **Firebase ESP32 Client**
3. Install: **Firebase Arduino Client Library for ESP32** by Mobizt
4. Version: 4.3.x or later

### Step 3: Update Code with Your Credentials

Open `ESP32_Firebase_Complete.ino` and update:

```cpp
// WiFi Credentials
#define WIFI_SSID "YOUR_WIFI_NAME"       // Your WiFi name
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD" // Your WiFi password

// Firebase (Update with your credentials)
#define FIREBASE_HOST "YOUR_FIREBASE_DATABASE_URL"
#define FIREBASE_AUTH "YOUR_FIREBASE_API_KEY"

// Pole ID (change for each pole)
#define POLE_ID "pole_rajwada_01"  // For Pole 1
// #define POLE_ID "pole_rajwada_02"  // For Pole 2
```

### Step 4: Upload Code to ESP32

1. Connect ESP32 via USB
2. Tools → Board → ESP32 Dev Module
3. Tools → Port → Select your COM port
4. Tools → Upload Speed → 115200
5. Click **Upload** button (→)
6. Wait for "Done uploading"

### Step 5: Monitor Serial Output

1. Tools → Serial Monitor
2. Set baud rate: **115200**
3. You should see:
   ```
   ================================
     ESP32 PROTECTION SYSTEM v2.0
     WITH FIREBASE INTEGRATION
   ================================
   
   Connecting to WiFi........
   ✅ WiFi Connected!
   IP Address: 192.168.x.x
   Signal Strength: -65 dBm
   Connecting to Firebase...
   ✅ Firebase Connected!
   
   System Started
   Pole ID: pole_rajwada_01
   ================================
   
   ------------- READINGS -------------
   ZMCT 1 Current : 125.43 mA
   ZMCT 2 Current : 132.67 mA
   ZMPT Voltage   : 228.50 V
   Soil Moisture  : 45 %
   
   Relay 1: OFF
   Relay 2: OFF
   Relay 3: OFF
   WiFi Signal: -68 dBm
   ------------------------------------
   ✅ Data pushed to Firebase
   ```

---

## 🎯 Data Format Sent to Firebase

Location: `/poles/pole_rajwada_01/live`

```json
{
  "leakageCurrent_mA": 129.05,
  "loadCurrent_A": 0.125,
  "voltage_V": 228.5,
  "moisture_percent": 45,
  "faultDetected": false,
  "deviceTemp_C": 33,
  "batteryLevel_percent": 82,
  "signalStrength": -68,
  "relay1_status": false,
  "relay2_status": false,
  "relay3_status": false,
  "lastUpdated": 12345
}
```

---

## 📊 Dashboard Auto-Update

Once ESP32 is running:

1. **Start Dashboard:**
   ```bash
   cd tesla-pulse
   npm run dev
   ```

2. **Open:** http://localhost:5173

3. **Navigate to:**
   - **Overview** → See pole on map with live status
   - **Sensors** → Real-time gauges updating every 2 seconds
   - **Pole Detail** → Click pole card → See all sensor readings + charts

---

## 🔧 Calibration (If Needed)

### ZMCT Current Sensors:
If readings seem off, adjust:
```cpp
float calibration1 = 0.01;  // Increase for lower readings
float calibration2 = 0.01;  // Decrease for higher readings
```

### ZMPT Voltage Sensor:
```cpp
float voltageCalibration = 0.50;  // Tune based on multimeter reading
```

### Soil Moisture:
```cpp
int dryValue = 4095;  // ADC value in air
int wetValue = 1200;  // ADC value in water
```

**How to calibrate moisture:**
1. Place sensor in air → note Serial Monitor ADC value → set as `dryValue`
2. Place sensor in water → note ADC value → set as `wetValue`

---

## ⚠️ Troubleshooting

### WiFi Not Connecting
- Check SSID and password (case-sensitive!)
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Move closer to router

### Firebase Push Failed
- Check Firebase URL (no `https://`, no trailing `/`)
- Verify API key is correct
- Check Firebase Realtime Database rules (should be open for testing)

### No Data on Dashboard
- Verify `POLE_ID` matches dashboard expectation
- Check Firebase Console → Realtime Database → `/poles/` to confirm data is arriving
- Ensure dashboard is running (`npm run dev`)

### Sensors Reading Zero
- Check wiring connections
- Verify pin numbers match physical connections
- Test sensors individually with multimeter

---

## 🔄 Multiple Poles Setup

To deploy multiple ESP32s:

1. **Upload code to first ESP32** with:
   ```cpp
   #define POLE_ID "pole_rajwada_01"
   ```

2. **Change pole ID for second ESP32:**
   ```cpp
   #define POLE_ID "pole_rajwada_02"
   ```

3. **Upload to second ESP32**

4. Both will push to different Firebase paths:
   - `/poles/pole_rajwada_01/live`
   - `/poles/pole_rajwada_02/live`

5. Dashboard automatically shows both!

---

## 📱 Testing Without Hardware

Want to test dashboard without ESP32?

Use the **mock data pusher**:

```bash
cd tesla-pulse
node firebase-mock-pusher.cjs
```

This simulates 2 poles with realistic data including fault scenarios!

---

## ✅ Success Checklist

- [ ] ESP32 connects to WiFi (see IP in Serial Monitor)
- [ ] Firebase push success messages in Serial Monitor
- [ ] Firebase Console shows data under `/poles/pole_rajwada_01/live`
- [ ] Dashboard shows pole as "online" (green status)
- [ ] Sensor gauges updating in real-time
- [ ] Relay status matches actual relay pins

---

## 🎉 You're Done!

Your ESP32 is now pushing real-time data to Firebase, and the dashboard is displaying it live!

**Next Steps:**
- Add more poles (change `POLE_ID` and upload)
- Calibrate sensors for accurate readings
- Test relay triggering with fault conditions
- Enable Telegram alerts for critical faults

---

**Need Help?**
- Check Serial Monitor for detailed logs
- Verify all wiring connections
- Ensure Firebase Realtime Database is created and accessible
