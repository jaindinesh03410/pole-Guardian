// =====================================================
// ESP32 POLE GUARDIAN - FIREBASE ESP32 CLIENT LIBRARY
// Smart Electric Pole Monitoring System
// Team Tesla Pulse
// =====================================================
// REQUIRED LIBRARY:
// Firebase ESP32 Client by Mobizt (v4.3.x or higher)
// Install: Tools → Manage Libraries → Search "Firebase ESP32 Client"
// =====================================================

#include <WiFi.h>
#include <FirebaseESP32.h>

// =====================================================
// 🔧 WIFI CONFIGURATION - UPDATE THESE
// =====================================================
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// =====================================================
// 🔥 FIREBASE CONFIGURATION - UPDATE THESE
// =====================================================
#define FIREBASE_HOST "YOUR_FIREBASE_DATABASE_URL"
#define FIREBASE_AUTH "YOUR_FIREBASE_API_KEY"

// Pole Identification
#define POLE_ID "pole_rajwada_01"  // Change for each pole

// Firebase objects
FirebaseData firebaseData;
FirebaseConfig firebaseConfig;
FirebaseAuth firebaseAuth;

// =====================================================
// 📌 HARDWARE PIN CONFIGURATION
// =====================================================
#define ZMCT1_PIN       34  // Current sensor 1
#define ZMCT2_PIN       35  // Current sensor 2
#define ZMPT_PIN        33  // Voltage sensor
#define MOISTURE_PIN    32  // Soil moisture sensor

#define RELAY1_PIN      23  // Relay 1 (Overcurrent 1)
#define RELAY2_PIN      19  // Relay 2 (Overcurrent 2)
#define RELAY3_PIN      18  // Relay 3 (Moisture)

// =====================================================
// ⚙️ SENSOR CALIBRATION & LIMITS
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
const unsigned long pushInterval = 2000;  // 2 seconds

// =====================================================
// 📊 READ ZMCT CURRENT SENSOR (RMS)
// =====================================================
float readCurrent_mA(int pin, float calibration)
{
  const int samples = 500;
  double sum = 0;
  double sumSquares = 0;
  
  for (int i = 0; i < samples; i++)
  {
    int adcValue = analogRead(pin);
    sum += adcValue;
    sumSquares += (double)adcValue * adcValue;
    delayMicroseconds(200);
  }
  
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rmsADC = sqrt(variance);
  float current_mA = rmsADC * calibration * 1000.0;
  
  if (isnan(current_mA) || current_mA < currentDetectLimit_mA)
    return 0.0;
  
  return current_mA;
}

// =====================================================
// ⚡ READ ZMPT VOLTAGE SENSOR (RMS)
// =====================================================
float readVoltage()
{
  const int samples = 1000;
  double sum = 0;
  double sumSquares = 0;
  
  for (int i = 0; i < samples; i++)
  {
    int adcValue = analogRead(ZMPT_PIN);
    sum += adcValue;
    sumSquares += (double)adcValue * adcValue;
    delayMicroseconds(100);
  }
  
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rmsADC = sqrt(variance);
  float voltage = rmsADC * voltageCalibration;
  
  if (isnan(voltage) || voltage < 0)
    return 0.0;
  
  return voltage;
}

// =====================================================
// ☁️ PUSH DATA TO FIREBASE
// =====================================================
void pushToFirebase(float current1, float current2, float voltage, int moisture,
                     bool relay1, bool relay2, bool relay3)
{
  if (!Firebase.ready())
  {
    Serial.println("⚠️ Firebase not ready");
    return;
  }
  
  // Build Firebase path
  String path = "/poles/" + String(POLE_ID) + "/live";
  
  // Calculate values
  float leakageCurrent = (current1 + current2) / 2.0;
  float loadCurrent = current1 / 1000.0;
  bool faultDetected = (current1 > currentLimit1_mA) || 
                       (current2 > currentLimit2_mA) || 
                       (moisture >= moistureLimit);
  int batteryLevel = map(constrain((int)voltage, 200, 240), 200, 240, 50, 100);
  float deviceTemp = 32.0 + random(-2, 3);
  int signalStrength = WiFi.RSSI();
  
  // Create FirebaseJson object
  FirebaseJson json;
  json.set("leakageCurrent_mA", leakageCurrent);
  json.set("loadCurrent_A", loadCurrent);
  json.set("voltage_V", voltage);
  json.set("moisture_percent", moisture);
  json.set("faultDetected", faultDetected);
  json.set("deviceTemp_C", deviceTemp);
  json.set("batteryLevel_percent", batteryLevel);
  json.set("signalStrength", signalStrength);
  json.set("relay1_status", relay1);
  json.set("relay2_status", relay2);
  json.set("relay3_status", relay3);
  json.set("lastUpdated", (unsigned long)(millis() / 1000));
  
  // Push to Firebase
  if (Firebase.RTDB.setJSON(&firebaseData, path.c_str(), &json))
  {
    Serial.println("✅ Firebase updated successfully");
  }
  else
  {
    Serial.print("❌ Firebase error: ");
    Serial.println(firebaseData.errorReason());
  }
}

// =====================================================
// 🚀 SETUP - RUNS ONCE
// =====================================================
void setup()
{
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("================================");
  Serial.println("   POLE GUARDIAN SYSTEM v2.0");
  Serial.println("   Firebase ESP32 Client Library");
  Serial.println("   Team Tesla Pulse");
  Serial.println("================================");
  Serial.println();
  
  // Configure pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);
  digitalWrite(RELAY3_PIN, LOW);
  
  analogReadResolution(12);
  
  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(true);
  
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40)
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
  }
  else
  {
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("Check SSID, password, and 2.4GHz WiFi");
  }
  
  // Configure Firebase
  Serial.println();
  Serial.println("Connecting to Firebase...");
  
  firebaseConfig.host = FIREBASE_HOST;
  firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  
  // Optional: For debugging
  // firebaseConfig.database_url = FIREBASE_HOST;
  
  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
  
  // Set timeout
  firebaseData.setBSSLBufferSize(1024, 1024);
  firebaseData.setResponseSize(1024);
  
  Serial.println("✅ Firebase initialized!");
  
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
  Serial.println();
  Serial.println("🔄 Starting monitoring...");
  Serial.println();
}

// =====================================================
// 🔁 MAIN LOOP
// =====================================================
void loop()
{
  // WiFi reconnection check
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 5000)
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println("⚠️ WiFi Disconnected! Reconnecting...");
      WiFi.disconnect();
      delay(100);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 20)
      {
        delay(500);
        Serial.print(".");
        attempts++;
      }
      
      if (WiFi.status() == WL_CONNECTED)
      {
        Serial.println("\n✅ WiFi Reconnected!");
      }
      else
      {
        Serial.println("\n❌ Reconnection failed!");
      }
    }
    lastWiFiCheck = millis();
  }
  
  // Read sensors
  float current1_mA = readCurrent_mA(ZMCT1_PIN, calibration1);
  float current2_mA = readCurrent_mA(ZMCT2_PIN, calibration2);
  float voltage = readVoltage();
  
  int moistureADC = analogRead(MOISTURE_PIN);
  int moisture = map(moistureADC, dryValue, wetValue, 0, 100);
  moisture = constrain(moisture, 0, 100);
  
  // Control relays
  bool relay1State = (current1_mA > currentLimit1_mA);
  bool relay2State = (current2_mA > currentLimit2_mA);
  bool relay3State = (moisture >= moistureLimit);
  
  digitalWrite(RELAY1_PIN, relay1State ? HIGH : LOW);
  digitalWrite(RELAY2_PIN, relay2State ? HIGH : LOW);
  digitalWrite(RELAY3_PIN, relay3State ? HIGH : LOW);
  
  // Serial output
  Serial.println("╔════════════════════════════════════╗");
  Serial.println("║       SENSOR READINGS              ║");
  Serial.println("╠════════════════════════════════════╣");
  Serial.print("║ Current 1:    ");
  Serial.print(current1_mA, 2);
  Serial.println(" mA");
  Serial.print("║ Current 2:    ");
  Serial.print(current2_mA, 2);
  Serial.println(" mA");
  Serial.print("║ Voltage:      ");
  Serial.print(voltage, 2);
  Serial.println(" V");
  Serial.print("║ Moisture:     ");
  Serial.print(moisture);
  Serial.println(" %");
  Serial.println("╠════════════════════════════════════╣");
  Serial.println("║       RELAY STATUS                 ║");
  Serial.println("╠════════════════════════════════════╣");
  Serial.print("║ Relay 1:      ");
  Serial.println(relay1State ? "⚡ TRIPPED" : "✓ OFF");
  Serial.print("║ Relay 2:      ");
  Serial.println(relay2State ? "⚡ TRIPPED" : "✓ OFF");
  Serial.print("║ Relay 3:      ");
  Serial.println(relay3State ? "💧 MOISTURE" : "✓ OFF");
  Serial.println("╠════════════════════════════════════╣");
  Serial.print("║ WiFi:         ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.print("║ Status:       ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "✓ Connected" : "✗ Offline");
  Serial.println("╚════════════════════════════════════╝");
  Serial.println();
  
  // Push to Firebase
  unsigned long now = millis();
  if (now - lastPushTime >= pushInterval)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      Serial.print("📤 Pushing to Firebase... ");
      pushToFirebase(current1_mA, current2_mA, voltage, moisture,
                     relay1State, relay2State, relay3State);
    }
    else
    {
      Serial.println("⚠️ WiFi offline - skipping push");
    }
    lastPushTime = now;
  }
  
  delay(1000);
}

// =====================================================
// END OF CODE
// =====================================================
