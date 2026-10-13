# ⚡ Tesla Pulse - Smart Electric Pole Monitoring System

**Team Tesla Pulse**

A comprehensive IoT-based real-time monitoring and protection system for electric utility poles using ESP32, Firebase, and React.

![System Architecture](https://img.shields.io/badge/ESP32-IoT-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![Firebase](https://img.shields.io/badge/Firebase-RTDB-orange) ![License](https://img.shields.io/badge/License-MIT-green)

---

## 🌟 Overview

Tesla Pulse is an intelligent electric pole monitoring system that provides:
- **Real-time monitoring** of current leakage, voltage, and moisture
- **Automated protection** with relay-based circuit breakers
- **Instant alerts** via Telegram for critical faults
- **Web dashboard** for visualization and analytics
- **Predictive maintenance** scheduling

---

## 🎯 Features

### Hardware Protection System
- ⚡ **2x ZMCT101B** current sensors (overcurrent detection at >200mA)
- 🌡️ **2x Soil Moisture** sensors (trip at ≥65%)
- 📊 **1x ZMPT101B** voltage sensor (overvoltage detection at >250V)
- 🔌 **4x Relays** for automatic load disconnection
- 🔔 **Buzzer** for local fault indication

### Real-Time Dashboard
- 📍 **Interactive Map** with 7 poles across 3 areas (Rajwada, Vijaynagar, Airport)
- 📊 **Live Sensor Readings** (ZMCT1, ZMCT2, Voltage, Moisture, WiFi, Battery)
- 🚨 **Fault Management** with severity classification
- 📈 **Analytics** with charts and statistics
- 🔧 **Maintenance Scheduling** with status tracking

### Smart Alerts
- 📱 **Telegram Integration** (multi-recipient support)
- ⚡ **Real-time Notifications** for overcurrent, moisture, and voltage faults
- 🔥 **Firebase Cloud Functions** for automatic alert dispatch

---

## 🏗️ System Architecture

```
┌─────────────────┐
│   ESP32 + IoT   │ → Sensors (ZMCT, ZMPT, Moisture)
│    Hardware     │ → Relays + Buzzer
└────────┬────────┘
         │
         ↓ WiFi
┌─────────────────┐
│  Firebase RTDB  │ ← Real-time Database
│   + Firestore   │ ← Fault Events Storage
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐ ┌──────────┐
│ React  │ │ Telegram │
│Dashboard│ │  Alerts  │
└────────┘ └──────────┘
```

### Component Breakdown

**ESP32 Firmware:**
- Sensor data acquisition (RMS calculations)
- Relay control logic
- Firebase RTDB integration
- WiFi connectivity management

**React Dashboard:**
- Real-time data visualization
- Fault event management
- Analytics and reporting
- Maintenance scheduling

**Firebase Backend:**
- Realtime Database for live sensor data
- Firestore for fault events and maintenance logs
- Cloud Functions for Telegram alerts

---

## 📦 Tech Stack

### Hardware
- **Microcontroller:** ESP32 Dev Module
- **Sensors:** ZMCT101B (x2), ZMPT101B, Capacitive Soil Moisture (x2)
- **Actuators:** 4-Channel Relay Module, Buzzer
- **Power:** 5V DC supply

### Software
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui
- **Backend:** Firebase (RTDB, Firestore, Cloud Functions)
- **Maps:** Leaflet
- **Charts:** Recharts
- **Alerts:** Telegram Bot API
- **State Management:** Zustand

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- Arduino IDE with ESP32 support
- Firebase account
- Telegram Bot Token

### 1. Clone Repository
```bash
git clone https://github.com/jaindinesh03410/pole-Guardian.git
cd pole-Guardian
```

### 2. Install Dependencies
```bash
cd tesla-pulse
npm install
```

### 3. Environment Setup

Create `.env` file in `tesla-pulse/` directory:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com

# Telegram Bot
VITE_TELEGRAM_BOT_TOKEN=your_bot_token
VITE_TELEGRAM_CHAT_IDS=chat_id_1,chat_id_2
```

Create `functions/.env.local`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_IDS=chat_id_1,chat_id_2
```

### 4. Firebase Setup

#### Enable Services:
1. **Realtime Database** → Create database in Asia-Southeast region
2. **Firestore** → Create database
3. **Authentication** → Enable Anonymous sign-in
4. **Cloud Functions** → Enable billing (Blaze plan)

#### Deploy Functions:
```bash
cd functions
npm install
firebase deploy --only functions
```

### 5. ESP32 Setup

#### Install Library:
- Open Arduino IDE
- Tools → Manage Libraries
- Search: **"Firebase ESP Client"** by Mobizt
- Install version 4.3.x or higher

#### Configure and Upload:
1. Open `tesla-pulse/ESP32_COMPLETE_WITH_FIREBASE.ino`
2. Update WiFi credentials:
```cpp
const char* WIFI_SSID = "Your_WiFi_Name";
const char* WIFI_PASSWORD = "Your_Password";
```
3. Update Firebase credentials (API Key, Database URL)
4. Select Board: **ESP32 Dev Module**
5. Upload code
6. Open Serial Monitor (115200 baud)

### 6. Run Dashboard

```bash
cd tesla-pulse
npm run dev
```

Open browser: **http://localhost:5173**

---

## 🧪 Testing & Demo Mode

### With Hardware:
1. Upload ESP32 code
2. Connect sensors to designated GPIO pins
3. Power on ESP32
4. Monitor Serial output for readings
5. Check dashboard for live data

### Without Hardware (Mock Data):

**Terminal 1 - Mock Pusher:**
```bash
cd tesla-pulse
node firebase-mock-pusher.cjs
```

**Terminal 2 - Dashboard:**
```bash
cd tesla-pulse
npm run dev
```

Mock data includes:
- Normal readings for 20 cycles
- Fault simulation every 40 seconds (Rain Mode)
- Overcurrent and moisture faults
- Telegram alerts

### Test Telegram:
```bash
cd tesla-pulse
node test-telegram-direct.cjs
```

---

## 📊 Hardware Specifications

### Pin Configuration

| Component | GPIO Pin | Function |
|-----------|----------|----------|
| ZMCT1 | 34 | Current Sensor 1 (Analog) |
| ZMCT2 | 35 | Current Sensor 2 (Analog) |
| ZMPT | 33 | Voltage Sensor (Analog) |
| Moisture 1 | 32 | Soil Moisture 1 (Analog) |
| Moisture 2 | 36 | Soil Moisture 2 (Analog) |
| Relay 1 | 25 | ZMCT1 Protection (Digital) |
| Relay 2 | 26 | ZMCT2 Protection (Digital) |
| Relay 3 | 18 | Moisture1 Protection (Digital) |
| Relay 4 | 5 | Moisture2 Protection (Digital) |
| Buzzer | 15 | Fault Indicator (Digital) |

### Protection Logic

| Condition | Threshold | Action |
|-----------|-----------|--------|
| ZMCT1 Current | >200 mA | Relay 1 ON (Disconnect) |
| ZMCT2 Current | >200 mA | Relay 2 ON (Disconnect) |
| Moisture 1 | ≥65% | Relay 3 ON |
| Moisture 2 | ≥65% | Relay 4 ON |
| Voltage | >250V | Alert Only |
| Any Fault | Active | Buzzer OFF |
| Normal | - | Buzzer ON |

### Sensor Calibration

Adjust these values in ESP32 code for your hardware:

```cpp
// Current sensor calibration
float ZMCT1_CALIBRATION = 1.0;  // Adjust based on actual current
float ZMCT2_CALIBRATION = 1.0;

// Voltage calibration
float VOLTAGE_CALIBRATION = 0.50;

// Moisture sensor range
const int MOISTURE_DRY_VALUE = 4095;
const int MOISTURE_WET_VALUE = 1200;
```

---

## 📱 Telegram Bot Setup

### 1. Create Bot:
1. Open Telegram → Search **@BotFather**
2. Send `/newbot`
3. Follow instructions
4. Copy **Bot Token**

### 2. Get Chat ID:
1. Start your bot in Telegram
2. Send any message
3. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Copy `chat.id` from response

### 3. Configure:
Add to `.env` files:
```env
VITE_TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
VITE_TELEGRAM_CHAT_IDS=123456789,987654321
```

---

## 📈 Dashboard Pages

### 1. Overview
- 7 poles with real-time status
- Interactive map (Leaflet)
- Summary statistics
- Recent alerts feed

### 2. Faults & Alerts
- Active faults list
- Historical fault events
- Fault resolution tracking
- Telegram alert integration

### 3. Analytics
- Current distribution charts
- Voltage trends
- Moisture patterns
- Fault statistics

### 4. Sensors
- Live readings for all sensors
- ZMCT1, ZMCT2 current
- Voltage monitoring
- Moisture levels
- WiFi signal strength
- Battery health
- Device temperature

### 5. Maintenance
- Scheduled maintenance
- Overdue alerts
- Technician assignments
- Maintenance history

### 6. Settings
- Threshold configuration
- System preferences
- User management

---

## 🔧 Troubleshooting

### ESP32 Issues

**WiFi Not Connecting:**
```cpp
// Check credentials
const char* WIFI_SSID = "Your_WiFi_Name";  // Verify name
const char* WIFI_PASSWORD = "Your_Password";  // Verify password

// Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
```

**Firebase Authentication Failed:**
- Enable Anonymous Auth in Firebase Console
- Check API Key and Database URL
- Verify network allows Firebase connections

**ZMCT Readings Fluctuating:**
- See `ZMCT-CALIBRATION-GUIDE.md`
- Adjust `ZMCT_CALIBRATION` values
- Increase `ZMCT_ZERO_THRESHOLD` for noise reduction

### Dashboard Issues

**No Data Showing:**
1. Check Firebase connection
2. Verify `.env` file configuration
3. Check browser console for errors
4. Ensure Firebase RTDB has data at `/poles` path

**Telegram Alerts Not Working:**
1. Test bot token: `node test-telegram-direct.cjs`
2. Verify Chat IDs are correct
3. Check Cloud Functions are deployed
4. Verify Firestore trigger is active

---

## 📁 Project Structure

```
pole-Guardian/
├── tesla-pulse/                    # React Dashboard
│   ├── src/
│   │   ├── components/            # UI Components
│   │   ├── pages/                 # Page Components
│   │   ├── hooks/                 # Custom Hooks
│   │   ├── store/                 # Zustand State
│   │   ├── lib/                   # Utilities
│   │   └── types/                 # TypeScript Types
│   ├── public/                    # Static Assets
│   ├── .env                       # Environment Variables
│   ├── package.json
│   ├── vite.config.ts
│   └── ESP32_COMPLETE_WITH_FIREBASE.ino  # ESP32 Code
├── functions/                      # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts
│   │   └── sendTelegramAlert.ts
│   ├── .env.local
│   └── package.json
├── docs/                          # Documentation
│   ├── HARDWARE-FINAL-SETUP.md
│   ├── ZMCT-CALIBRATION-GUIDE.md
│   ├── TELEGRAM-SETUP.md
│   └── TECHNICAL-DESIGN.md
├── README.md                      # This file
├── LICENSE                        # MIT License
└── .gitignore
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team Tesla Pulse

- **Problem Statement:** Smart Electric Pole Monitoring
- **Technology Stack:** IoT, React, Firebase, ESP32
- **Target:** Power distribution companies, Smart Cities

---

## 📞 Support

For issues and questions:
- **GitHub Issues:** [Create Issue](https://github.com/jaindinesh03410/pole-Guardian/issues)
- **Documentation:** See `docs/` folder
- **Email:** support@teslapulse.com (if applicable)

---

## 🙏 Acknowledgments

- Firebase for real-time database
- Telegram for alert platform
- Mobizt for Firebase ESP32 Client library
- Open source community

---

## 📸 Dashboard Features

### Overview Page
- 🗺️ **Interactive Map** - 7 poles across Rajwada, Vijaynagar, and Airport areas
- 📊 **Real-time Status Cards** - Live monitoring of all poles with color-coded health indicators
- 🚨 **Alert Feed** - Recent fault events with severity classification
- 📈 **Summary Statistics** - Total poles, active faults, and system health at a glance

### Live Sensors Page
- ⚡ **ZMCT1 & ZMCT2 Current** - Individual current sensor readings with arc gauge visualization
- 🔋 **AC Voltage Monitor** - Real-time voltage display with threshold indicators
- 💧 **Soil Moisture** - Moisture percentage with relay trip status
- 📶 **WiFi Signal & Battery** - Device health monitoring
- 🎨 **Interactive Cards** - Click to expand and view detailed specifications

### Faults & Alerts Page
- 🔴 **Active Faults** - Critical alerts requiring immediate attention
- 📝 **Fault History** - Complete log with timestamps and resolution status
- 📱 **Telegram Integration** - Automatic alerts sent to configured recipients
- ✅ **Fault Resolution** - Mark faults as resolved with technician notes

### Analytics Page
- 📊 **Current Distribution Charts** - ZMCT1 and ZMCT2 trend analysis
- ⚡ **Voltage Patterns** - Historical voltage data visualization
- 💧 **Moisture Tracking** - Environmental condition monitoring
- 📈 **Fault Statistics** - Frequency analysis by type and severity

### Maintenance Page
- 🔧 **Scheduled Maintenance** - Upcoming service reminders
- ⏰ **Overdue Alerts** - Poles requiring immediate maintenance
- 👷 **Technician Assignment** - Track maintenance staff assignments
- 📝 **Service History** - Complete maintenance log with notes

> **Note:** Screenshots will be added once hardware setup is complete and system is deployed in production.

---

**⚡ Built with 💙 by Team Tesla Pulse**
