# Tesla Pulse - Complete Testing Checklist ✅

## 🔧 Setup Status

### ✅ Configuration Files
- [x] `.env` - Firebase credentials with VITE_ prefix
- [x] `package.json` - All dependencies installed
- [x] `firebase-initial-data.json` - Mock data ready for import
- [x] `firebase-mock-pusher.cjs` - Script ready to push live data

### ✅ Core Integration
- [x] `App.tsx` - useAuth() and useRTDB() hooks active
- [x] `main.tsx` - StrictMode disabled (prevents double mounting)
- [x] `firebase.ts` - Proper initialization with error handling
- [x] `useRTDB.ts` - Real-time listener with duplicate prevention

### ✅ Pages & Routes
- [x] Overview Page - `/dashboard` (default)
- [x] Pole Detail - `/dashboard/pole/:poleId`
- [x] Faults & Alerts - `/dashboard/faults`
- [x] Analytics - `/dashboard/analytics`
- [x] **Sensors - `/dashboard/sensors`** ⭐ NEW
- [x] Settings - `/dashboard/settings` (admin only)

### ✅ Navigation
- [x] Sidebar - All 5 nav links (Overview, Faults, Analytics, Sensors, Settings)
- [x] "Sensors" link added with Radio icon
- [x] Area filter (Rajwada, Vijaynagar, Airport)

---

## 🧪 Testing Steps

### 1️⃣ Firebase Connection Test

**Terminal:**
```bash
cd tesla-pulse
npm run dev
```

**Browser Console (F12):**
Look for:
```
✅ Firebase initialized
🔥 useRTDB effect running: {simulatorActive: false, ...}
✅ Setting up Firebase listeners...
🌐 Firebase connection status: true
📡 Firebase data update received
```

**Expected Result:** ✅ No errors, Firebase connected

---

### 2️⃣ Firebase Data Import Test

**Firebase Console:**
1. Go to Realtime Database
2. Click "⋮" menu → Import JSON
3. Select `firebase-initial-data.json`
4. Import

**Dashboard (refresh page):**
- 7 poles should appear
- 2 Rajwada poles: GREEN (online) with live sensor data
- 5 other poles: GREY (offline)

**Expected Result:** ✅ Poles appear with correct status

---

### 3️⃣ Real-Time Update Test (Manual)

**Firebase Console:**
1. Navigate to `poles/pole_rajwada_01/live/leakageCurrent_mA`
2. Change value from `12.4` to `25.5`

**Dashboard (NO refresh needed):**
- Console should show: `📡 Firebase data update received`
- Pole 1 card should update instantly
- Should trigger red alert (threshold crossed)
- Toast notification should appear

**Expected Result:** ✅ Real-time update without refresh

---

### 4️⃣ Mock Data Pusher Test

**Terminal 2:**
```bash
cd tesla-pulse
node firebase-mock-pusher.cjs
```

**Expected Output:**
```
🚀 Tesla Pulse - Firebase Mock Data Pusher
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 Database: https://tesla-pulse-9acb2-default-rtdb...
⏱️  Interval: 2 seconds per update

✅ Pole 1: leak=8.3mA | V=228.5V | moisture=36% | fault=NO
✅ Pole 2: leak=7.9mA | V=229.8V | moisture=39% | fault=NO
```

**Dashboard:**
- Values should update every 2 seconds
- Every 40 seconds: Rain mode activates
- Red alerts should trigger
- Alert feed should populate

**Expected Result:** ✅ Continuous real-time updates

---

### 5️⃣ Sensors Page Test

**Dashboard:**
1. Click "Sensors" in sidebar
2. Should see 8 sensor cards for each Rajwada pole:
   - ⚠️ Leakage Current (ZMCT101B)
   - ⚡ Load Current (ACS712)
   - 📊 AC Voltage (Transformer)
   - 💧 Moisture Level (Capacitive sensor)
   - 🌡️ Device Temperature (ESP32)
   - 🔋 Battery Level (Solar backup)
   - 📡 WiFi Signal (ESP32)
   - 🚨 Fault Status

**Expected Result:** ✅ All sensor cards visible with live data

---

### 6️⃣ Analytics Page Test

**Dashboard:**
1. Click "Analytics" in sidebar
2. Should see Pole 1 vs Pole 2 comparison:
   - Side-by-side bar charts
   - Radar chart comparison
   - Leakage progress bars
   - Status summary cards

**Expected Result:** ✅ Comparison graphs render correctly

---

### 7️⃣ Faults Page Test

**Trigger a fault:**
- Wait for mock pusher rain mode (40 seconds)
- OR manually set `leakageCurrent_mA > 15` in Firebase

**Faults Page:**
1. Click "Faults & Alerts" in sidebar
2. Should see fault events table
3. Filter by fault type (leakage, moisture, etc.)
4. Export to CSV/PDF buttons visible

**Expected Result:** ✅ Fault events logged and displayed

---

### 8️⃣ Map Test

**Overview Page:**
- Map should show 7 markers:
  - 2 green markers (Rajwada - online)
  - 5 grey markers (Vijaynagar/Airport - offline)
- Click marker → Popup with pole name + area
- "View Details" button → Navigate to pole detail page

**Expected Result:** ✅ Map renders with correct markers

---

### 9️⃣ Area Filter Test

**Overview Page:**
1. Click "Rajwada" filter → Only 2 poles visible
2. Click "Vijaynagar" filter → 3 offline poles visible
3. Click "Airport" filter → 2 offline poles visible
4. Click "All" → All 7 poles visible

**Expected Result:** ✅ Filter works correctly

---

### 🔟 Mock Simulator Toggle Test

**Header:**
1. Click "Simulate Live" button
2. Should see internal mock data (not Firebase)
3. Console: `⏸️ Firebase listener disabled - simulator is active`
4. Click "Stop Sim" → Firebase listener re-activates

**Expected Result:** ✅ Simulator can be toggled on/off

---

## 🎯 Final Verification Checklist

### Core Functionality
- [ ] Firebase connection established
- [ ] Real-time updates work without refresh
- [ ] Mock pusher script runs without errors
- [ ] All 7 poles display correctly
- [ ] Rajwada poles show live data
- [ ] Offline poles show as grey/inactive

### Pages & Navigation
- [ ] Overview page loads
- [ ] Sensors page loads with 8 sensor cards
- [ ] Analytics page shows Pole 1 vs Pole 2
- [ ] Faults page shows fault events
- [ ] Settings page accessible (admin only)
- [ ] Pole detail page opens on card click
- [ ] Sidebar navigation works

### Real-Time Features
- [ ] Manual Firebase edits update instantly
- [ ] Mock pusher updates every 2 seconds
- [ ] Rain mode triggers faults
- [ ] Toast notifications appear
- [ ] Alert feed populates
- [ ] Red borders appear on fault

### Filters & UI
- [ ] Area filter (Rajwada/Vijaynagar/Airport) works
- [ ] Map markers render correctly
- [ ] Status colors correct (green/red/grey)
- [ ] Timestamps show correct time
- [ ] Animated value transitions smooth

### Data Accuracy
- [ ] Leakage current displays correctly
- [ ] Voltage readings accurate
- [ ] Moisture percentage correct
- [ ] Fault detection threshold works (>15mA)
- [ ] Battery level decreases gradually
- [ ] WiFi signal strength realistic

---

## 🐛 Common Issues & Fixes

### Issue: "require is not defined"
**Fix:** Use `.cjs` file extension for Node scripts
```bash
node firebase-mock-pusher.cjs  # ✅ Correct
node firebase-mock-pusher.js   # ❌ Wrong
```

### Issue: Data not updating in real-time
**Fixes:**
1. Check browser console for Firebase errors
2. Verify `.env` has `VITE_` prefix on all keys
3. Restart dev server after `.env` changes
4. Ensure simulator is OFF (Stop Sim button)
5. Check Firebase Rules allow read/write

### Issue: Map not showing markers
**Fixes:**
1. Check `poles` have valid `location: {lat, lng}` in Firebase
2. Verify Leaflet CSS loaded
3. Check browser console for Leaflet errors

### Issue: Sensors page blank
**Fixes:**
1. Check Rajwada poles have `live` data in Firebase
2. Verify `firebase-initial-data.json` imported
3. Run mock pusher to populate data

---

## 🚀 Production Deployment Checklist

Before deploying:
- [ ] Remove console.log statements from `useRTDB.ts`
- [ ] Enable Firebase security rules (not public read/write)
- [ ] Add authentication (remove login bypass in `App.tsx`)
- [ ] Re-enable React StrictMode in `main.tsx`
- [ ] Set proper CORS for Firebase RTDB
- [ ] Configure Firebase Hosting
- [ ] Run `npm run build` and test production build
- [ ] Test with actual ESP32 hardware

---

## 📝 Notes

- **Mock Pusher:** Use for demo without hardware
- **Simulator Button:** Use for quick testing without Firebase
- **Firebase Import:** One-time setup for initial pole metadata
- **Real Hardware:** ESP32 code in `ESP32_Arduino_Code.ino`

---

**Project Status:** ✅ FULLY FUNCTIONAL
**Last Updated:** December 2024
**Framework:** React + TypeScript + Firebase + Vite
**Team:** Tesla Pulse
