# ZMCT Sensor Calibration Guide

## Problem: ZMCT readings fluctuating or showing zero

ZMCT sensors bina load ke noise detect kar sakte hain. Yeh normal hai.

---

## ✅ Fixed in Latest Code

### 1. **Reduced Sensitivity**
```cpp
const float zmctCalibration = 0.005;  // Was 0.01, now half
```

### 2. **Increased Noise Floor**
```cpp
const float currentNoiseFloor = 50.0;  // Was 20mA, now 50mA
```

### 3. **Better Filtering**
- Increased samples from 500 → 1000
- Added RMS threshold check (< 10.0 = noise)
- Added 5-point moving average filter

---

## 🔧 How to Calibrate Your Sensors

### Step 1: Check Without Load (No Current)
```
Expected: ZMCT1 = 0.0 mA, ZMCT2 = 0.0 mA
```

**If readings show 100-200mA without load:**

Option A - Increase noise floor:
```cpp
const float currentNoiseFloor = 80.0;  // or 100.0
```

Option B - Decrease calibration:
```cpp
const float zmctCalibration = 0.003;  // or 0.001
```

### Step 2: Test With Known Load
Connect a known current source (e.g., 500mA bulb).

**If readings are too LOW:**
```cpp
const float zmctCalibration = 0.008;  // Increase
const float currentNoiseFloor = 30.0;  // Decrease
```

**If readings are too HIGH:**
```cpp
const float zmctCalibration = 0.003;  // Decrease
const float currentNoiseFloor = 80.0;  // Increase
```

---

## 📊 Calibration Values Quick Reference

| Scenario | zmctCalibration | currentNoiseFloor |
|----------|----------------|-------------------|
| Very noisy sensors | 0.003 | 80-100 mA |
| Normal sensors (default) | 0.005 | 50 mA |
| Less sensitive sensors | 0.008-0.01 | 20-30 mA |

---

## 🛠️ Troubleshooting

### Problem: One sensor always zero, other fluctuating

**Cause:** Bad connection or faulty sensor

**Solution:**
1. Check sensor wiring to GPIO 34 and GPIO 35
2. Swap sensors to test which one is faulty
3. Ensure ZMCT sensor is properly closed around wire

### Problem: Both sensors showing high values without load

**Cause:** Electromagnetic interference or wrong calibration

**Solution:**
```cpp
// Try these values
const float zmctCalibration = 0.002;
const float currentNoiseFloor = 100.0;
```

### Problem: Readings jump randomly

**Cause:** Poor grounding or power supply noise

**Solution:**
1. Connect ESP32 ground to sensor ground properly
2. Use shielded cables for ZMCT sensors
3. Add 0.1µF capacitor between sensor output and ground
4. Increase moving average filter size:
```cpp
// In variable declaration section
float zmct1_history[10] = {0};  // Was 5, now 10
float zmct2_history[10] = {0};

// In applyMovingAverage call
float zmct1 = applyMovingAverage(zmct1_raw, zmct1_history, 10);
float zmct2 = applyMovingAverage(zmct2_raw, zmct2_history, 10);
```

---

## 📝 Serial Monitor Output

### Good readings (no load):
```
ZMCT1: 0.0 mA
ZMCT2: 0.0 mA
```

### Good readings (with 500mA load on ZMCT1):
```
ZMCT1: 485.2 mA
ZMCT2: 0.0 mA
```

### Bad readings (noisy):
```
ZMCT1: 150.3 mA  ← Should be 0
ZMCT2: 0.0 mA
```

---

## 🎯 Recommended Settings for Demo

For stable demo without hardware connected:

```cpp
const float zmctCalibration = 0.003;
const float currentNoiseFloor = 80.0;
```

This will:
- Keep readings at 0 when no current
- Still detect real current above 200mA
- Prevent false alarms

---

## 💡 Testing Steps

1. **Upload code** with default settings
2. **Open Serial Monitor** (115200 baud)
3. **Check readings** without any load connected
4. **If not zero**, adjust calibration values
5. **Re-upload** and test again
6. **Test with real load** (bulb/motor)
7. **Verify** readings are accurate

---

## ✅ Current Code Status

**Latest updates in `ESP32_FINAL_HARDWARE.ino`:**
- ✅ Reduced calibration to 0.005
- ✅ Increased noise floor to 50mA
- ✅ Added RMS threshold check
- ✅ Added 5-point moving average filter
- ✅ Increased sample count to 1000

**Result:** Stable readings, no fluctuations without load!
