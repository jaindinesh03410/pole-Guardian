# Tesla Pulse - Smart Electric Pole Monitoring Dashboard

**Team Tesla Pulse**

Real-time IoT monitoring dashboard for electric pole safety system built with React, TypeScript, Firebase, and ESP32 hardware integration.

---

## 🚀 Problem Statement

Electric poles in India cause thousands of deaths annually due to:
- Leakage current from faulty insulation
- Exposed/dangling live wires
- Water-logging during monsoon
- No real-time monitoring system

**Tesla Pulse** provides 24/7 monitoring with instant fault alerts to prevent electrical accidents.

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS + shadcn/ui components
- **Backend:** Firebase (Realtime Database + Firestore + Authentication)
- **Charts:** Recharts + Custom SVG gauges
- **Maps:** Leaflet + React-Leaflet
- **State:** Zustand
- **Hardware:** ESP32 + ZMCT101B + ACS712 + Voltage/Moisture sensors

---

## 📦 Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-username/tesla-pulse.git
cd tesla-pulse
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

#### A. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: "tesla-pulse"
3. Enable **Realtime Database**, **Firestore**, **Authentication**

#### B. Get Firebase Credentials
1. Project Settings → Your apps → Web app
2. Copy config values

#### C. Create `.env` File
```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials:
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

**⚠️ IMPORTANT: Never commit `.env` file to Git! It's already in `.gitignore`**

#### D. Import Initial Data
1. Firebase Console → Realtime Database
2. Click "⋮" → Import JSON
3. Select `firebase-initial-data.json`
4. Import

#### E. Create Test User
1. Firebase Console → Authentication → Users
2. Add user:
   - Email: `admin@teslapulse.com`
   - Password: `admin123`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🧪 Testing with Mock Data

### Option 1: Mock Simulator (Browser Only)
1. Open dashboard
2. Click **"Simulate Live"** button in header
3. Rain-water fault scenario runs automatically

### Option 2: Firebase Mock Pusher (Real-time sync)
```bash
node firebase-mock-pusher.cjs
```

This script pushes random sensor data to Firebase every 2 seconds. Dashboard updates in real-time.

---

## 📊 Features

### Dashboard Pages
- **Overview** - Live pole status grid, map, alert feed, area filters
- **Pole Detail** - Individual pole monitoring with gauges, charts, device health
- **Faults & Alerts** - Fault event log with filters, export to CSV/PDF
- **Analytics** - Pole 1 vs Pole 2 comparison with bar/radar charts
- **Sensors** - Detailed view of all 8 hardware sensors with live readings
- **Settings** - Pole management, user roles (Admin only)

### Real-Time Features
- Live sensor data updates (no refresh needed)
- Instant fault detection with toast notifications
- Color-coded status (Green=Safe, Yellow=Warning, Red=Fault)
- Alert feed with timestamp
- Map with location markers

### Fault Detection
- **Leakage Current** - Threshold: 15 mA (ZMCT101B sensor)
- **Overcurrent** - Threshold: 10 A (ACS712 sensor)
- **Overvoltage** - Threshold: 250 V
- **Undervoltage** - Threshold: 200 V
- **High Moisture** - Threshold: 70% (Capacitive sensor)
- **Live Wire Fault** - ESP32 GPIO detection

---

## 🔌 Hardware Integration

### ESP32 Setup
1. Open `ESP32_Arduino_Code.ino` in Arduino IDE
2. Install libraries:
   - Firebase ESP32
   - WiFi
3. Update WiFi credentials
4. Update Firebase RTDB URL
5. Upload to ESP32
6. Connect sensors:
   - ZMCT101B → GPIO 34 (Leakage current)
   - ACS712 → GPIO 35 (Load current)
   - Voltage sensor → GPIO 32
   - Moisture sensor → GPIO 33

Hardware pushes data to `/poles/pole_rajwada_01/live` every 2 seconds.

---

## 🗂️ Project Structure

```
tesla-pulse/
├── src/
│   ├── components/
│   │   ├── dashboard/      # Overview page components
│   │   ├── layout/         # Sidebar, Header
│   │   ├── pole/           # Pole detail components
│   │   └── ui/             # Reusable UI components
│   ├── hooks/              # useAuth, useRTDB, useFaultEvents
│   ├── lib/                # Firebase config, utils, mock simulator
│   ├── pages/              # Route pages
│   ├── store/              # Zustand stores (auth, poles)
│   ├── types/              # TypeScript interfaces
│   └── main.tsx
├── public/
├── .env                    # Firebase credentials (GITIGNORED)
├── .env.example            # Template for .env
├── firebase-initial-data.json
├── firebase-mock-pusher.cjs
├── ESP32_Arduino_Code.ino
└── package.json
```

---

## 🔐 Authentication

### Login Credentials (After creating user in Firebase):
```
Email: admin@teslapulse.com
Password: admin123
```

### Roles
- **Admin** - Full access (all pages, settings)
- **Technician** - Limited access (assigned poles only)

---

## 🌐 Deployment

### Build for Production
```bash
npm run build
```

Output in `dist/` folder.

### Deploy to Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## 📄 License

MIT License

---

## 👥 Contributors

- Team Tesla Pulse - Full Stack Development & Hardware Integration

---

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- ESP32 community for hardware support
- Open source community

---

**⚡ Built with passion to save lives.**
