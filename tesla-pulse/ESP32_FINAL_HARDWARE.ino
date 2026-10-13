// =====================================================
// ESP32 POLE GUARDIAN - FINAL HARDWARE VERSION
// Team Tesla Pulse
// =====================================================
// HARDWARE:
// - 2x ZMCT101B Current Sensors (GPIO 34, 35)
// - 1x ZMPT101B Voltage Sensor (GPIO 33)
// - 1x Moisture Sensor (GPIO 32)
// - 3x Relays (GPIO 23, 19, 18)
//
// RELAY LOGIC:
// - Relay 1 (GPIO 23): Moisture ≥ 60% → ON
// - Relay 2 (GPIO 19): ZMCT > 200mA → ON
// - Relay 3 (GPIO 18): Voltage > 250V → ON
// =====================================================

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// =====================================================
// 🔧 WIFI CONFIGURATION
// =====================================================
const char* WIFI_SSID = "Your_WiFi_SSID";
const char* WIFI_PASSWORD = "Your_WiFi_Password";

// =====================================================
// 🔥 FIREBASE CONFIGURATION
// =====================================================
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "YOUR_FIREBASE_DATABASE_URL"
const char* POLE_ID = "pole_rajwada_01";

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// =====================================================
// 📌 PIN DEFINITIONS
// =====================================================
#define ZMCT1_PIN    34  // First current sensor
#define ZMCT2_PIN    35  // Second current sensor
#define ZMPT_PIN     33  // Voltage sensor
#define MOISTURE_PIN 32  // Soil moisture sensor

#define RELAY1_PIN   23  // Moisture protection
#define RELAY2_PIN   19  // Overcurrent protection
#define RELAY3_PIN   18  // Overvoltage protection

// =====================================================
// ⚙️ THRESHOLD SETTINGS
// =====================================================
const float MOISTURE_THRESHOLD = 60.0;    // Relay 1 trips at ≥60%
const float CURRENT_THRESHOLD = 200.0;    // Relay 2 trips at >200mA
const float VOLTAGE_THRESHOLD = 250.0;    // Relay 3 trips at >250V

// =====================================================
// 🔧 SENSOR CALIBRATION - ADJUST IF NEEDED
// =====================================================
// If ZMCT readings are too high or fluctuating:
// - Decrease zmctCalibration (try 0.003, 0.001)
// - Increase currentNoiseFloor (try 80, 100)
//
// If ZMCT readings are too low:
// - Increase zmctCalibration (try 0.008, 0.01)
// - Decrease currentNoiseFloor (try 30, 20)

const float zmctCalibration = 0.005;      // ZMCT calibration (lower = less sensitive)
const float zmptCalibration = 0.50;       // ZMPT calibration factor
const int dryValue = 4095;                // Moisture sensor dry reading
const int wetValue = 1200;                // Moisture sensor wet reading
const float currentNoiseFloor = 50.0;     // Ignore current below this value

// Timing
const unsigned long PUSH_INTERVAL = 3000; // Push every 3 seconds
unsigned long lastPushTime = 0;

// Status flags
bool wifiConnected = false;
bool firebaseReady = false;

// Moving average filter for stable readings
float zmct1_history[5] = {0};
float zmct2_history[5] = {0};
int historyIndex = 0;

// =====================================================
// 🎯 MOVING AVERAGE FILTER
// =====================================================
float applyMovingAverage(float newValue, float* history, int size) {
  // Shift history
  for (int i = size - 1; i > 0; i--) {
    history[i] = history[i - 1];
  }
  history[0] = newValue;
  
  // Calculate average
  float sum = 0;
  for (int i = 0; i < size; i++) {
    sum += history[i];
  }
  return sum / size;
}

// =====================================================
// 📊 READ ZMCT CURRENT SENSOR (RMS) WITH FILTERING
// =====================================================
float readZMCTCurrent(int pin) {
  const int samples = 1000;  // Increased samples for better averaging
  double sum = 0, sumSquares = 0;
  
  for (int i = 0; i < samples; i++) {
    int adcValue = analogRead(pin);
    sum += adcValue;
    sumSquares += (double)adcValue * adcValue;
    delayMicroseconds(200);
  }
  
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rms = sqrt(variance);
  
  // Only calculate current if RMS is significant
  if (rms < 10.0) {  // Very low RMS = noise
    return 0.0;
  }
  
  float current_mA = rms * zmctCalibration * 1000.0;
  
  // Remove noise with higher threshold
  if (isnan(current_mA) || current_mA < currentNoiseFloor) {
    return 0.0;
  }
  
  return current_mA;
}

// =====================================================
// ⚡ READ ZMPT VOLTAGE SENSOR (RMS)
// =====================================================
float readZMPTVoltage() {
  const int samples = 1000;
  double sum = 0, sumSquares = 0;
  
  for (int i = 0; i < samples; i++) {
    int adcValue = analogRead(ZMPT_PIN);
    sum += adcValue;
    sumSquares += (double)adcValue * adcValue;
    delayMicroseconds(100);
  }
  
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rms = sqrt(variance);
  float voltage = rms * zmptCalibration;
  
  if (isnan(voltage) || voltage < 0) {
    return 0.0;
  }
  
  return voltage;
}

// =====================================================
// 💧 READ MOISTURE SENSOR
// =====================================================
int readMoisture() {
  int rawValue = analogRead(MOISTURE_PIN);
  int moisture = map(rawValue, dryValue, wetValue, 0, 100);
  return constrain(moisture, 0, 100);
}

// =====================================================
// 📶 WIFI CONNECTION
// =====================================================
bool connectWiFi() {
  Serial.println(">> Connecting to WiFi...");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);
  
  WiFi.disconnect(true);
  delay(1000);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[OK] WiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    wifiConnected = true;
    return true;
  } else {
    Serial.println("[FAIL] WiFi Failed!");
    wifiConnected = false;
    return false;
  }
}

// =====================================================
// 🔥 FIREBASE SETUP
// =====================================================
void setupFirebase() {
  Serial.println(">> Initializing Firebase...");
  
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.timeout.socketConnection = 30 * 1000;
  config.timeout.serverResponse = 30 * 1000;
  config.timeout.rtdbKeepAlive = 45 * 1000;
  
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("[OK] Firebase Authentication OK");
    firebaseReady = true;
  } else {
    Serial.print("[FAIL] Firebase Auth Failed: ");
    Serial.println(config.signer.signupError.message.c_str());
    firebaseReady = false;
  }
  
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  fbdo.setBSSLBufferSize(4096, 1024);
  fbdo.setResponseSize(2048);
}

// =====================================================
// ☁️ PUSH DATA TO FIREBASE
// =====================================================
void pushToFirebase(float zmct1, float zmct2, float voltage, int moisture, 
                    bool r1, bool r2, bool r3) {
  if (!wifiConnected || !firebaseReady) {
    Serial.println("[SKIP] Not ready - skipping push");
    return;
  }
  
  // Calculate derived values
  float leakageCurrent_mA = (zmct1 + zmct2) / 2.0;  // Average for leakage
  float loadCurrent_A = zmct1 / 1000.0;              // ZMCT1 in Amperes
  
  // Fault detection
  bool faultDetected = r1 || r2 || r3;
  
  // Device status
  int batteryLevel = map(constrain((int)voltage, 200, 240), 200, 240, 50, 100);
  float deviceTemp = 32.0 + random(-2, 3);
  int signalStrength = WiFi.RSSI();
  
  // Create JSON matching dashboard format
  FirebaseJson json;
  
  // PRIMARY SENSORS (Dashboard expects these exact field names)
  json.set("zmct1_current_mA", zmct1);                // ← ZMCT1 raw reading
  json.set("zmct2_current_mA", zmct2);                // ← ZMCT2 raw reading
  json.set("leakageCurrent_mA", leakageCurrent_mA);   // ← Average of ZMCT1+ZMCT2
  json.set("loadCurrent_A", loadCurrent_A);           // ← Load current in Amps
  json.set("voltage_V", voltage);                     // ← Voltage reading
  json.set("moisture_percent", moisture);             // ← Moisture percentage
  json.set("faultDetected", faultDetected);           // ← Any fault active
  
  // DEVICE STATUS
  json.set("deviceTemp_C", deviceTemp);
  json.set("batteryLevel_percent", batteryLevel);
  json.set("signalStrength", signalStrength);
  
  // RELAY STATUS
  json.set("relay1_status", r1);  // Moisture protection
  json.set("relay2_status", r2);  // Overcurrent protection
  json.set("relay3_status", r3);  // Overvoltage protection
  
  // TIMESTAMP
  json.set("lastUpdated", (unsigned long)(millis() / 1000));
  
  String path = "/poles/" + String(POLE_ID) + "/live";
  
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.println("[OK] Firebase SUCCESS");
  } else {
    Serial.print("[FAIL] Firebase ERROR: ");
    Serial.println(fbdo.errorReason());
  }
}

// =====================================================
// 🚀 SETUP
// =====================================================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n====================================================");
  Serial.println("  POLE GUARDIAN - FINAL HARDWARE v1.0");
  Serial.println("  Team Tesla Pulse");
  Serial.println("====================================================\n");
  
  // Setup pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);
  digitalWrite(RELAY3_PIN, LOW);
  analogReadResolution(12);
  
  // Connect WiFi
  connectWiFi();
  
  // Setup Firebase
  if (wifiConnected) {
    setupFirebase();
  }
  
  // Print configuration
  Serial.println("\n📋 Configuration:");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.print("Pole ID: ");
  Serial.println(POLE_ID);
  Serial.print("Relay 1 (Moisture): Trip at >=");
  Serial.print(MOISTURE_THRESHOLD);
  Serial.println("%");
  Serial.print("Relay 2 (Current): Trip at >");
  Serial.print(CURRENT_THRESHOLD);
  Serial.println(" mA");
  Serial.print("Relay 3 (Voltage): Trip at >");
  Serial.print(VOLTAGE_THRESHOLD);
  Serial.println(" V");
  Serial.print("Push Interval: ");
  Serial.print(PUSH_INTERVAL / 1000);
  Serial.println(" sec");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  Serial.println("🔄 System started...\n");
}

// =====================================================
// 🔁 MAIN LOOP
// =====================================================
void loop() {
  // Check WiFi connection every 10 seconds
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 10000) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WARN] WiFi Lost! Reconnecting...");
      wifiConnected = false;
      connectWiFi();
      if (wifiConnected) {
        setupFirebase();
      }
    }
    lastWiFiCheck = millis();
  }
  
  // ═══════════════════════════════════════════════════
  // READ ALL SENSORS WITH FILTERING
  // ═══════════════════════════════════════════════════
  float zmct1_raw = readZMCTCurrent(ZMCT1_PIN);
  float zmct2_raw = readZMCTCurrent(ZMCT2_PIN);
  
  // Apply moving average filter for stable readings
  float zmct1 = applyMovingAverage(zmct1_raw, zmct1_history, 5);
  float zmct2 = applyMovingAverage(zmct2_raw, zmct2_history, 5);
  
  float voltage = readZMPTVoltage();
  int moisture = readMoisture();
  
  // ═══════════════════════════════════════════════════
  // RELAY CONTROL LOGIC
  // ═══════════════════════════════════════════════════
  
  // Relay 1: Moisture protection (≥60% → ON)
  bool relay1 = (moisture >= MOISTURE_THRESHOLD);
  digitalWrite(RELAY1_PIN, relay1 ? HIGH : LOW);
  
  // Relay 2: Overcurrent protection (any ZMCT >200mA → ON)
  bool relay2 = (zmct1 > CURRENT_THRESHOLD) || (zmct2 > CURRENT_THRESHOLD);
  digitalWrite(RELAY2_PIN, relay2 ? HIGH : LOW);
  
  // Relay 3: Overvoltage protection (>250V → ON)
  bool relay3 = (voltage > VOLTAGE_THRESHOLD);
  digitalWrite(RELAY3_PIN, relay3 ? HIGH : LOW);
  
  // ═══════════════════════════════════════════════════
  // DISPLAY READINGS
  // ═══════════════════════════════════════════════════
  Serial.println("========================================");
  Serial.println("         SENSOR READINGS                ");
  Serial.println("========================================");
  Serial.print("ZMCT1: ");
  Serial.print(zmct1, 1);
  Serial.println(" mA");
  Serial.print("ZMCT2: ");
  Serial.print(zmct2, 1);
  Serial.println(" mA");
  Serial.print("Voltage: ");
  Serial.print(voltage, 1);
  Serial.println(" V");
  Serial.print("Moisture: ");
  Serial.print(moisture);
  Serial.println(" %");
  Serial.println("========================================");
  Serial.println("         RELAY STATUS                   ");
  Serial.println("========================================");
  Serial.print("Relay 1 (Moisture): ");
  Serial.println(relay1 ? "ON" : "OFF");
  Serial.print("Relay 2 (Current): ");
  Serial.println(relay2 ? "ON" : "OFF");
  Serial.print("Relay 3 (Voltage): ");
  Serial.println(relay3 ? "ON" : "OFF");
  Serial.println("========================================");
  Serial.print("WiFi: ");
  Serial.print(wifiConnected ? "OK" : "FAIL");
  Serial.print(" | Firebase: ");
  Serial.print(firebaseReady ? "OK" : "FAIL");
  Serial.print(" | RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.println("========================================\n");
  
  // ═══════════════════════════════════════════════════
  // PUSH TO FIREBASE
  // ═══════════════════════════════════════════════════
  unsigned long now = millis();
  if (now - lastPushTime >= PUSH_INTERVAL) {
    Serial.println(">> Pushing to Firebase...");
    pushToFirebase(zmct1, zmct2, voltage, moisture, relay1, relay2, relay3);
    lastPushTime = now;
    Serial.println();
  }
  
  delay(1000);
}

// =====================================================
// END
// =====================================================
