// =====================================================
// ESP32 PROTECTION SYSTEM + FIREBASE INTEGRATION
// 2 x ZMCT + 1 x ZMPT101B + Soil Moisture + 3 Relays
// Real-time data push to Firebase Realtime Database
// =====================================================

#include <WiFi.h>
#include <FirebaseESP32.h>

// =====================================================
// WiFi CREDENTIALS - UPDATE THESE
// =====================================================
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// =====================================================
// FIREBASE CREDENTIALS - UPDATE THESE
// =====================================================
#define FIREBASE_HOST "YOUR_FIREBASE_DATABASE_URL"
#define FIREBASE_AUTH "YOUR_FIREBASE_API_KEY"

// Pole ID - change this for each pole
#define POLE_ID "pole_rajwada_01"

// Firebase objects
FirebaseData firebaseData;
FirebaseConfig firebaseConfig;
FirebaseAuth firebaseAuth;

// ---------------- SENSOR PINS ----------------
#define ZMCT1_PIN       34
#define ZMCT2_PIN       35
#define ZMPT_PIN        33
#define MOISTURE_PIN    32

// ---------------- RELAY PINS ----------------
#define RELAY1_PIN      23
#define RELAY2_PIN      19
#define RELAY3_PIN      18

// ---------------- ZMCT SETTINGS ----------------
float currentLimit1_mA = 1000.0;
float currentLimit2_mA = 1000.0;
float currentDetectLimit_mA = 20.0;
float calibration1 = 0.01;
float calibration2 = 0.01;

// ---------------- ZMPT SETTINGS ----------------
float voltageCalibration = 0.50;

// ---------------- SOIL MOISTURE SETTINGS ----------------
int dryValue = 4095;
int wetValue = 1200;
int moistureLimit = 65;

// ---------------- TIMING ----------------
unsigned long lastPushTime = 0;
const unsigned long pushInterval = 2000; // Push every 2 seconds

// =====================================================
// READ ZMCT CURRENT
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
  
  if (variance < 0)
    variance = 0;
    
  double rmsADC = sqrt(variance);
  float current_A = rmsADC * calibration;
  float current_mA = current_A * 1000.0;
  
  if (isnan(current_mA) || current_mA < currentDetectLimit_mA)
  {
    return 0.0;
  }
  
  return current_mA;
}

// =====================================================
// READ ZMPT VOLTAGE
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
  
  if (variance < 0)
    variance = 0;
    
  double rmsADC = sqrt(variance);
  float voltage = rmsADC * voltageCalibration;
  
  if (isnan(voltage) || voltage < 0)
    return 0.0;
    
  return voltage;
}

// =====================================================
// WIFI CONNECTION
// =====================================================
void connectWiFi()
{
  Serial.print("Connecting to WiFi");
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
    Serial.println();
    Serial.println("✅ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  }
  else
  {
    Serial.println();
    Serial.println("❌ WiFi Connection Failed!");
  }
}

// =====================================================
// FIREBASE CONNECTION
// =====================================================
void connectFirebase()
{
  Serial.println("Connecting to Firebase...");
  
  firebaseConfig.host = FIREBASE_HOST;
  firebaseConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  
  Firebase.begin(&firebaseConfig, &firebaseAuth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("✅ Firebase Connected!");
}

// =====================================================
// PUSH DATA TO FIREBASE
// =====================================================
void pushToFirebase(float current1, float current2, float voltage, int moisture, bool relay1, bool relay2, bool relay3)
{
  String path = "/poles/" + String(POLE_ID) + "/live";
  
  // Leakage current (average of both ZMCTs)
  float leakageCurrent = (current1 + current2) / 2.0;
  
  // Load current (using ZMCT1 as main load)
  float loadCurrent = current1 / 1000.0; // Convert mA to A
  
  // Fault detection
  bool faultDetected = (current1 > currentLimit1_mA) || 
                       (current2 > currentLimit2_mA) || 
                       (moisture >= moistureLimit);
  
  // Battery level (simulated based on voltage)
  int batteryLevel = map(constrain((int)voltage, 200, 240), 200, 240, 50, 100);
  
  // Device temperature (simulate or read from DHT sensor if available)
  float deviceTemp = 32.0 + random(-2, 3); // Random variation around 32°C
  
  // Signal strength
  int signalStrength = WiFi.RSSI();
  
  // Create JSON object
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
  if (Firebase.setJSON(firebaseData, path, json))
  {
    Serial.println("✅ Data pushed to Firebase");
  }
  else
  {
    Serial.println("❌ Firebase push failed");
    Serial.println("Reason: " + firebaseData.errorReason());
  }
}

// =====================================================
// SETUP
// =====================================================
void setup()
{
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("================================");
  Serial.println("  ESP32 PROTECTION SYSTEM v2.0");
  Serial.println("  WITH FIREBASE INTEGRATION");
  Serial.println("================================");
  Serial.println();
  
  // Relay outputs
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  
  // All relays initially OFF
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);
  digitalWrite(RELAY3_PIN, LOW);
  
  // ESP32 ADC resolution
  analogReadResolution(12);
  
  // Connect to WiFi
  connectWiFi();
  
  // Connect to Firebase
  if (WiFi.status() == WL_CONNECTED)
  {
    connectFirebase();
  }
  
  Serial.println();
  Serial.println("System Started");
  Serial.println("Pole ID: " + String(POLE_ID));
  Serial.println("ZMCT Trip Limit: 1000 mA");
  Serial.println("Moisture Limit: 65%");
  Serial.println("Push Interval: 2 seconds");
  Serial.println("================================");
  Serial.println();
}

// =====================================================
// MAIN LOOP
// =====================================================
void loop()
{
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi disconnected! Reconnecting...");
    connectWiFi();
    if (WiFi.status() == WL_CONNECTED)
    {
      connectFirebase();
    }
  }
  
  // ---------------- READ SENSORS ----------------
  float current1_mA = readCurrent_mA(ZMCT1_PIN, calibration1);
  float current2_mA = readCurrent_mA(ZMCT2_PIN, calibration2);
  float voltage = readVoltage();
  
  // Soil moisture
  int moistureADC = analogRead(MOISTURE_PIN);
  int moisture = map(moistureADC, dryValue, wetValue, 0, 100);
  moisture = constrain(moisture, 0, 100);
  
  // =================================================
  // RELAY 1 - ZMCT 1 (Overcurrent Protection)
  // =================================================
  bool relay1State = false;
  if (current1_mA > currentLimit1_mA)
  {
    digitalWrite(RELAY1_PIN, HIGH); // TRIP
    relay1State = true;
  }
  else
  {
    digitalWrite(RELAY1_PIN, LOW); // NORMAL
    relay1State = false;
  }
  
  // =================================================
  // RELAY 2 - ZMCT 2 (Overcurrent Protection)
  // =================================================
  bool relay2State = false;
  if (current2_mA > currentLimit2_mA)
  {
    digitalWrite(RELAY2_PIN, HIGH); // TRIP
    relay2State = true;
  }
  else
  {
    digitalWrite(RELAY2_PIN, LOW); // NORMAL
    relay2State = false;
  }
  
  // =================================================
  // RELAY 3 - SOIL MOISTURE (Water Detection)
  // =================================================
  bool relay3State = false;
  if (moisture >= moistureLimit)
  {
    digitalWrite(RELAY3_PIN, HIGH); // MOISTURE DETECTED
    relay3State = true;
  }
  else
  {
    digitalWrite(RELAY3_PIN, LOW); // NORMAL
    relay3State = false;
  }
  
  // =================================================
  // SERIAL MONITOR
  // =================================================
  Serial.println("------------- READINGS -------------");
  Serial.print("ZMCT 1 Current : ");
  Serial.print(current1_mA, 2);
  Serial.println(" mA");
  
  Serial.print("ZMCT 2 Current : ");
  Serial.print(current2_mA, 2);
  Serial.println(" mA");
  
  Serial.print("ZMPT Voltage   : ");
  Serial.print(voltage, 2);
  Serial.println(" V");
  
  Serial.print("Soil Moisture  : ");
  Serial.print(moisture);
  Serial.println(" %");
  
  Serial.println();
  Serial.print("Relay 1: ");
  Serial.println(relay1State ? "TRIPPED" : "OFF");
  
  Serial.print("Relay 2: ");
  Serial.println(relay2State ? "TRIPPED" : "OFF");
  
  Serial.print("Relay 3: ");
  Serial.println(relay3State ? "ON (MOISTURE)" : "OFF");
  
  Serial.print("WiFi Signal: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.println("------------------------------------");
  
  // =================================================
  // PUSH TO FIREBASE (Every 2 seconds)
  // =================================================
  unsigned long currentTime = millis();
  if (currentTime - lastPushTime >= pushInterval)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      pushToFirebase(current1_mA, current2_mA, voltage, moisture, relay1State, relay2State, relay3State);
      lastPushTime = currentTime;
    }
    else
    {
      Serial.println("⚠️ WiFi not connected - skipping Firebase push");
    }
  }
  
  delay(1000);
}
