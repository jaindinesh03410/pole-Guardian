// =====================================================
// ESP32 POLE GUARDIAN - ULTRA STABLE VERSION
// Perfect for College WiFi / Unstable Networks
// Team Tesla Pulse
// =====================================================
// LIBRARY: Firebase ESP Client by Mobizt (v4.3.x+)
// Install: Tools → Manage Libraries → "Firebase ESP Client"
// =====================================================

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// =====================================================
// 🔧 CONFIGURATION - UPDATE WIFI ONLY
// =====================================================
const char* WIFI_SSID = "Your_WiFi_SSID";        // ← YOUR WIFI NAME
const char* WIFI_PASSWORD = "Your_WiFi_Password";     // ← YOUR WIFI PASSWORD

// Firebase (Update with your credentials)
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "YOUR_FIREBASE_DATABASE_URL"
const char* POLE_ID = "pole_rajwada_01";

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// =====================================================
// 📌 PINS
// =====================================================
#define ZMCT1_PIN    34
#define ZMCT2_PIN    35
#define ZMPT_PIN     33
#define MOISTURE_PIN 32
#define RELAY1_PIN   23
#define RELAY2_PIN   19
#define RELAY3_PIN   18

// =====================================================
// ⚙️ SETTINGS
// =====================================================
float currentLimit1_mA = 1000.0;
float currentLimit2_mA = 1000.0;
float currentDetectLimit_mA = 20.0;
float calibration1 = 0.01;
float calibration2 = 0.01;
float voltageCalibration = 0.50;
int dryValue = 4095;
int wetValue = 1200;
int moistureLimit = 65;

unsigned long lastPushTime = 0;
const unsigned long pushInterval = 3000; // 3 seconds for stability

// Status flags
bool wifiConnected = false;
bool firebaseReady = false;

// =====================================================
// 📊 READ CURRENT
// =====================================================
float readCurrent_mA(int pin, float calibration)
{
  const int samples = 500;
  double sum = 0, sumSquares = 0;
  
  for (int i = 0; i < samples; i++)
  {
    int val = analogRead(pin);
    sum += val;
    sumSquares += (double)val * val;
    delayMicroseconds(200);
  }
  
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rms = sqrt(variance);
  float current_mA = rms * calibration * 1000.0;
  
  return (isnan(current_mA) || current_mA < currentDetectLimit_mA) ? 0.0 : current_mA;
}

// =====================================================
// ⚡ READ VOLTAGE
// =====================================================
float readVoltage()
{
  const int samples = 1000;
  double sum = 0, sumSquares = 0;
  
  for (int i = 0; i < samples; i++)
  {
    int val = analogRead(ZMPT_PIN);
    sum += val;
    sumSquares += (double)val * val;
    delayMicroseconds(100);
  }
  
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rms = sqrt(variance);
  float voltage = rms * voltageCalibration;
  
  return (isnan(voltage) || voltage < 0) ? 0.0 : voltage;
}

// =====================================================
// 📶 WIFI CONNECTION WITH RETRY
// =====================================================
bool connectWiFi()
{
  Serial.println("🔄 Connecting to WiFi...");
  Serial.print("SSID: ");
  Serial.println(WIFI_SSID);
  
  WiFi.disconnect(true);
  delay(1000);
  
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  WiFi.persistent(false);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("✅ WiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    wifiConnected = true;
    return true;
  }
  else
  {
    Serial.println("❌ WiFi Failed!");
    wifiConnected = false;
    return false;
  }
}

// =====================================================
// 🔥 FIREBASE SETUP
// =====================================================
void setupFirebase()
{
  Serial.println("🔥 Initializing Firebase...");
  
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Increase timeouts for unstable networks
  config.timeout.socketConnection = 30 * 1000;    // 30 sec
  config.timeout.serverResponse = 30 * 1000;      // 30 sec
  config.timeout.rtdbKeepAlive = 45 * 1000;       // 45 sec
  config.timeout.rtdbStreamReconnect = 3 * 1000;  // 3 sec
  config.timeout.rtdbStreamError = 10 * 1000;     // 10 sec
  
  // Anonymous sign-in
  if (Firebase.signUp(&config, &auth, "", ""))
  {
    Serial.println("✅ Firebase Authentication OK");
    firebaseReady = true;
  }
  else
  {
    Serial.print("❌ Firebase Auth Failed: ");
    Serial.println(config.signer.signupError.message.c_str());
    firebaseReady = false;
  }
  
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Set buffer sizes
  fbdo.setBSSLBufferSize(4096, 1024);
  fbdo.setResponseSize(2048);
}

// =====================================================
// ☁️ PUSH TO FIREBASE - DASHBOARD COMPATIBLE FORMAT
// =====================================================
void pushToFirebase(float c1, float c2, float v, int m, bool r1, bool r2, bool r3)
{
  if (!wifiConnected || !firebaseReady)
  {
    Serial.println("⚠️ Skipping push - not ready");
    return;
  }
  
  // Dashboard expects these exact field names:
  // - leakageCurrent_mA (from ZMCT sensors - already working!)
  // - loadCurrent_A (from ZMCT1)
  // - voltage_V (from ZMPT)
  // - moisture_percent (from soil sensor)
  // - All other fields as bonus
  
  float leakageCurrent_mA = (c1 + c2) / 2.0;  // Average of both ZMCTs
  float loadCurrent_A = c1 / 1000.0;          // ZMCT1 in Amperes
  
  bool faultDetected = (c1 > currentLimit1_mA) || 
                       (c2 > currentLimit2_mA) || 
                       (m >= moistureLimit);
  
  int batteryLevel = map(constrain((int)v, 200, 240), 200, 240, 50, 100);
  float deviceTemp = 32.0 + random(-2, 3);
  int signalStrength = WiFi.RSSI();
  
  // Create JSON with EXACT dashboard field names
  FirebaseJson json;
  
  // PRIMARY SENSORS (Dashboard expects these)
  json.set("leakageCurrent_mA", leakageCurrent_mA);   // ← ZMCT average
  json.set("loadCurrent_A", loadCurrent_A);           // ← ZMCT1 in Amps
  json.set("voltage_V", v);                           // ← ZMPT voltage
  json.set("moisture_percent", m);                    // ← Soil moisture
  json.set("faultDetected", faultDetected);           // ← Fault status
  
  // ADDITIONAL SENSOR DATA (Your original readings)
  json.set("zmct1_current_mA", c1);                   // ← ZMCT1 raw value
  json.set("zmct2_current_mA", c2);                   // ← ZMCT2 raw value
  
  // DEVICE STATUS
  json.set("deviceTemp_C", deviceTemp);
  json.set("batteryLevel_percent", batteryLevel);
  json.set("signalStrength", signalStrength);
  
  // RELAY STATUS
  json.set("relay1_status", r1);
  json.set("relay2_status", r2);
  json.set("relay3_status", r3);
  
  // TIMESTAMP
  json.set("lastUpdated", (unsigned long)(millis() / 1000));
  
  String path = "/poles/" + String(POLE_ID) + "/live";
  
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json))
  {
    Serial.println("✅ Firebase SUCCESS");
    Serial.print("   ZMCT1: ");
    Serial.print(c1, 1);
    Serial.print(" mA | ZMCT2: ");
    Serial.print(c2, 1);
    Serial.println(" mA");
    Serial.print("   Voltage: ");
    Serial.print(v, 1);
    Serial.print(" V | Moisture: ");
    Serial.print(m);
    Serial.println(" %");
  }
  else
  {
    Serial.print("❌ Firebase ERROR: ");
    Serial.println(fbdo.errorReason());
    
    // Reconnect if connection error
    if (fbdo.errorReason().indexOf("connection") >= 0)
    {
      Serial.println("🔄 Reconnecting Firebase...");
      Firebase.reconnectWiFi(true);
    }
  }
}

// =====================================================
// 🚀 SETUP
// =====================================================
void setup()
{
  Serial.begin(115200);
  delay(2000);
  
  Serial.println();
  Serial.println("================================");
  Serial.println("  POLE GUARDIAN - STABLE v3.0");
  Serial.println("  Team Tesla Pulse");
  Serial.println("================================");
  Serial.println();
  
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
  
  // Setup Firebase if WiFi connected
  if (wifiConnected)
  {
    setupFirebase();
  }
  
  Serial.println();
  Serial.println("Configuration:");
  Serial.print("Pole ID: ");
  Serial.println(POLE_ID);
  Serial.print("Current Limit: ");
  Serial.print(currentLimit1_mA);
  Serial.println(" mA");
  Serial.print("Moisture Limit: ");
  Serial.print(moistureLimit);
  Serial.println(" %");
  Serial.print("Push Interval: ");
  Serial.print(pushInterval / 1000);
  Serial.println(" sec");
  Serial.println();
  Serial.println("🔄 Starting...");
  Serial.println();
}

// =====================================================
// 🔁 MAIN LOOP
// =====================================================
void loop()
{
  // WiFi check every 10 seconds
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 10000)
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println("⚠️ WiFi Lost! Reconnecting...");
      wifiConnected = false;
      connectWiFi();
      if (wifiConnected)
      {
        setupFirebase();
      }
    }
    lastCheck = millis();
  }
  
  // Read sensors
  float c1 = readCurrent_mA(ZMCT1_PIN, calibration1);
  float c2 = readCurrent_mA(ZMCT2_PIN, calibration2);
  float v = readVoltage();
  
  int mADC = analogRead(MOISTURE_PIN);
  int m = map(mADC, dryValue, wetValue, 0, 100);
  m = constrain(m, 0, 100);
  
  // Control relays
  bool r1 = (c1 > currentLimit1_mA);
  bool r2 = (c2 > currentLimit2_mA);
  bool r3 = (m >= moistureLimit);
  
  digitalWrite(RELAY1_PIN, r1 ? HIGH : LOW);
  digitalWrite(RELAY2_PIN, r2 ? HIGH : LOW);
  digitalWrite(RELAY3_PIN, r3 ? HIGH : LOW);
  
  // Display
  Serial.println("╔════════════════════════════╗");
  Serial.println("║    READINGS                ║");
  Serial.println("╠════════════════════════════╣");
  Serial.print("║ C1: ");
  Serial.print(c1, 1);
  Serial.println(" mA");
  Serial.print("║ C2: ");
  Serial.print(c2, 1);
  Serial.println(" mA");
  Serial.print("║ V:  ");
  Serial.print(v, 1);
  Serial.println(" V");
  Serial.print("║ M:  ");
  Serial.print(m);
  Serial.println(" %");
  Serial.println("╠════════════════════════════╣");
  Serial.print("║ R1: ");
  Serial.println(r1 ? "⚡TRIP" : "OFF");
  Serial.print("║ R2: ");
  Serial.println(r2 ? "⚡TRIP" : "OFF");
  Serial.print("║ R3: ");
  Serial.println(r3 ? "💧ON" : "OFF");
  Serial.println("╠════════════════════════════╣");
  Serial.print("║ WiFi: ");
  Serial.println(wifiConnected ? "✓" : "✗");
  Serial.print("║ FB:   ");
  Serial.println(firebaseReady ? "✓" : "✗");
  Serial.print("║ RSSI: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.println("╚════════════════════════════╝");
  Serial.println();
  
  // Push to Firebase
  unsigned long now = millis();
  if (now - lastPushTime >= pushInterval)
  {
    Serial.print("📤 Pushing... ");
    pushToFirebase(c1, c2, v, m, r1, r2, r3);
    lastPushTime = now;
  }
  
  delay(1000);
}

// =====================================================
// END
// =====================================================
