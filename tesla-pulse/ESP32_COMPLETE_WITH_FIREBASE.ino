// ============================================================
// ESP32 AC PROTECTION SYSTEM WITH FIREBASE
// 2 x ZMCT + 1 x AC VOLTAGE SENSOR
// 2 x SOIL MOISTURE + 4 RELAYS + BUZZER
//
// RELAY 1 -> ZMCT 1
// RELAY 2 -> ZMCT 2
// RELAY 3 -> MOISTURE 1
// RELAY 4 -> MOISTURE 2
//
// BUZZER -> GPIO 15
//
// ZMCT TRIP     -> ABOVE 200 mA
// MOISTURE TRIP -> ABOVE 65%
//
// BUZZER:
// NORMAL CONDITION       -> ON
// PROTECTION CONDITION   -> OFF
//
// SERIAL MONITOR -> 115200
// ============================================================

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ============================================================
// WIFI CREDENTIALS
// ============================================================
const char* WIFI_SSID = "Your_WiFi_SSID";      // ← CHANGE THIS
const char* WIFI_PASSWORD = "Your_WiFi_Password";  // ← CHANGE THIS

// ============================================================
// FIREBASE CREDENTIALS
// ============================================================
#define API_KEY "YOUR_FIREBASE_API_KEY"  // ← CHANGE THIS
#define DATABASE_URL "YOUR_FIREBASE_DATABASE_URL"  // ← CHANGE THIS
const char* POLE_ID = "pole_rajwada_01";

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool wifiConnected = false;
bool firebaseReady = false;

// ============================================================
// SENSOR PINS
// ============================================================
#define ZMCT1_PIN       34
#define ZMCT2_PIN       35
#define VOLTAGE_PIN     33
#define MOISTURE1_PIN   32
#define MOISTURE2_PIN   36

// ============================================================
// RELAY PINS
// ============================================================
#define RELAY1_PIN      25
#define RELAY2_PIN      26
#define RELAY3_PIN      18
#define RELAY4_PIN       5

// ============================================================
// BUZZER PIN
// ============================================================
#define BUZZER_PIN      15

// ============================================================
// RELAY LOGIC (ACTIVE LOW)
// ============================================================
#define RELAY_ON        LOW
#define RELAY_OFF       HIGH

// ============================================================
// BUZZER LOGIC
// ============================================================
#define BUZZER_ON       HIGH
#define BUZZER_OFF      LOW

// ============================================================
// PROTECTION LIMITS
// ============================================================
const float CURRENT_LIMIT_mA = 200.0;
const float MOISTURE_LIMIT = 65.0;

// ============================================================
// MOISTURE CALIBRATION
// ============================================================
const int MOISTURE_DRY_VALUE = 4095;
const int MOISTURE_WET_VALUE = 1200;

// ============================================================
// ZMCT CALIBRATION
// ============================================================
float ZMCT1_CALIBRATION = 1.0;
float ZMCT2_CALIBRATION = 1.0;

// ============================================================
// ZMCT ZERO THRESHOLD
// ============================================================
const float ZMCT_ZERO_THRESHOLD = 5.0;

// ============================================================
// VOLTAGE CALIBRATION
// ============================================================
float VOLTAGE_CALIBRATION = 0.50;

// ============================================================
// FIREBASE PUSH INTERVAL
// ============================================================
unsigned long lastPushTime = 0;
const unsigned long PUSH_INTERVAL = 3000; // 3 seconds

// ============================================================
// VARIABLES
// ============================================================
float current1_mA = 0;
float current2_mA = 0;
float moisture1 = 0;
float moisture2 = 0;
float voltageAC = 0;

// ============================================================
// READ ZMCT CURRENT
// ============================================================
float readZMCT(int pin, float calibration)
{
  const int samples = 500;
  long sum = 0;
  
  // Find DC midpoint
  for (int i = 0; i < samples; i++)
  {
    sum += analogRead(pin);
    delayMicroseconds(100);
  }
  
  float average = (float)sum / samples;
  
  // Calculate RMS AC component
  double squareSum = 0;
  for (int i = 0; i < samples; i++)
  {
    int adcValue = analogRead(pin);
    float acValue = adcValue - average;
    squareSum += acValue * acValue;
    delayMicroseconds(100);
  }
  
  float rmsADC = sqrt(squareSum / samples);
  
  // No useful sensor signal
  if (rmsADC < ZMCT_ZERO_THRESHOLD)
  {
    return 0.0;
  }
  
  // Convert RMS ADC to mA
  float current_mA = rmsADC * calibration;
  
  if (current_mA < 0)
  {
    current_mA = 0;
  }
  
  return current_mA;
}

// ============================================================
// READ SOIL MOISTURE
// ============================================================
float readMoisture(int pin)
{
  int adcValue = analogRead(pin);
  
  // Invalid reading
  if (adcValue < 0 || adcValue > 4095)
  {
    return 0;
  }
  
  // Convert ADC to percentage
  float percentage = map(adcValue,
                         MOISTURE_DRY_VALUE,
                         MOISTURE_WET_VALUE,
                         0,
                         100);
  
  // Keep between 0 and 100
  percentage = constrain(percentage, 0, 100);
  
  return percentage;
}

// ============================================================
// READ AC VOLTAGE
// ============================================================
float readVoltage()
{
  const int samples = 300;
  long sum = 0;
  
  for (int i = 0; i < samples; i++)
  {
    sum += analogRead(VOLTAGE_PIN);
    delayMicroseconds(100);
  }
  
  float average = (float)sum / samples;
  
  // No voltage signal
  if (average < 5)
  {
    return 0;
  }
  
  float voltage = average * VOLTAGE_CALIBRATION;
  
  if (voltage < 1)
  {
    voltage = 0;
  }
  
  return voltage;
}

// ============================================================
// WIFI CONNECTION
// ============================================================
bool connectWiFi()
{
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
  while (WiFi.status() != WL_CONNECTED && attempts < 30)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("[OK] WiFi Connected!");
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
    Serial.println("[FAIL] WiFi Failed!");
    wifiConnected = false;
    return false;
  }
}

// ============================================================
// FIREBASE SETUP
// ============================================================
void setupFirebase()
{
  Serial.println(">> Initializing Firebase...");
  
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.timeout.socketConnection = 30 * 1000;
  config.timeout.serverResponse = 30 * 1000;
  config.timeout.rtdbKeepAlive = 45 * 1000;
  
  if (Firebase.signUp(&config, &auth, "", ""))
  {
    Serial.println("[OK] Firebase Authentication OK");
    firebaseReady = true;
  }
  else
  {
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

// ============================================================
// PUSH TO FIREBASE
// ============================================================
void pushToFirebase(float zmct1, float zmct2, float voltage, 
                    float moist1, float moist2,
                    bool r1, bool r2, bool r3, bool r4,
                    bool buzzer)
{
  if (!wifiConnected || !firebaseReady)
  {
    return;
  }
  
  // Calculate derived values for dashboard
  float leakageCurrent_mA = (zmct1 + zmct2) / 2.0;
  float loadCurrent_A = zmct1 / 1000.0;
  float moisture_percent = (moist1 + moist2) / 2.0; // Average moisture
  
  // Fault detection
  bool faultDetected = r1 || r2 || r3 || r4;
  
  // Device status
  int batteryLevel = map(constrain((int)voltage, 200, 240), 200, 240, 50, 100);
  float deviceTemp = 32.0 + random(-2, 3);
  int signalStrength = WiFi.RSSI();
  
  // Create JSON for Firebase
  FirebaseJson json;
  
  // PRIMARY SENSORS (Dashboard compatible)
  json.set("zmct1_current_mA", zmct1);
  json.set("zmct2_current_mA", zmct2);
  json.set("leakageCurrent_mA", leakageCurrent_mA);
  json.set("loadCurrent_A", loadCurrent_A);
  json.set("voltage_V", voltage);
  json.set("moisture_percent", moisture_percent);
  json.set("faultDetected", faultDetected);
  
  // ADDITIONAL MOISTURE SENSORS
  json.set("moisture1_percent", moist1);
  json.set("moisture2_percent", moist2);
  
  // DEVICE STATUS
  json.set("deviceTemp_C", deviceTemp);
  json.set("batteryLevel_percent", batteryLevel);
  json.set("signalStrength", signalStrength);
  
  // RELAY STATUS
  json.set("relay1_status", r1);  // ZMCT1
  json.set("relay2_status", r2);  // ZMCT2
  json.set("relay3_status", r3);  // Moisture1
  json.set("relay4_status", r4);  // Moisture2
  
  // BUZZER STATUS
  json.set("buzzer_status", buzzer);
  
  // TIMESTAMP
  json.set("lastUpdated", (unsigned long)(millis() / 1000));
  
  String path = "/poles/" + String(POLE_ID) + "/live";
  
  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json))
  {
    Serial.println("[OK] Firebase SUCCESS");
  }
  else
  {
    Serial.print("[FAIL] Firebase ERROR: ");
    Serial.println(fbdo.errorReason());
  }
}

// ============================================================
// SETUP
// ============================================================
void setup()
{
  // Serial Monitor
  Serial.begin(115200);
  delay(1000);
  
  // ESP32 ADC
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  
  // Relay pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  pinMode(RELAY4_PIN, OUTPUT);
  
  // Buzzer pin
  pinMode(BUZZER_PIN, OUTPUT);
  
  // All relays OFF at startup
  digitalWrite(RELAY1_PIN, RELAY_OFF);
  digitalWrite(RELAY2_PIN, RELAY_OFF);
  digitalWrite(RELAY3_PIN, RELAY_OFF);
  digitalWrite(RELAY4_PIN, RELAY_OFF);
  
  // Buzzer ON at startup
  digitalWrite(BUZZER_PIN, BUZZER_ON);
  
  // Sensor pins
  pinMode(ZMCT1_PIN, INPUT);
  pinMode(ZMCT2_PIN, INPUT);
  pinMode(VOLTAGE_PIN, INPUT);
  pinMode(MOISTURE1_PIN, INPUT);
  pinMode(MOISTURE2_PIN, INPUT);
  
  // STARTUP MESSAGE
  Serial.println();
  Serial.println("==============================================");
  Serial.println("   ESP32 AC PROTECTION SYSTEM + FIREBASE");
  Serial.println("   Team Tesla Pulse");
  Serial.println("==============================================");
  Serial.println();
  Serial.println("Protection Limits:");
  Serial.println("ZMCT 1 Trip      : 200 mA");
  Serial.println("ZMCT 2 Trip      : 200 mA");
  Serial.println("Moisture 1 Trip  : 65 %");
  Serial.println("Moisture 2 Trip  : 65 %");
  Serial.println("Buzzer GPIO      : 15");
  Serial.println();
  Serial.println("Buzzer Condition : NORMAL = ON");
  Serial.println("==============================================");
  Serial.println();
  
  // Connect WiFi
  connectWiFi();
  
  // Setup Firebase
  if (wifiConnected)
  {
    setupFirebase();
  }
  
  Serial.println();
  Serial.println("System Started");
  Serial.println("==============================================");
}

// ============================================================
// MAIN LOOP
// ============================================================
void loop()
{
  // Check WiFi every 10 seconds
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 10000)
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println("[WARN] WiFi Lost! Reconnecting...");
      wifiConnected = false;
      connectWiFi();
      if (wifiConnected)
      {
        setupFirebase();
      }
    }
    lastWiFiCheck = millis();
  }
  
  // READ SENSORS
  current1_mA = readZMCT(ZMCT1_PIN, ZMCT1_CALIBRATION);
  current2_mA = readZMCT(ZMCT2_PIN, ZMCT2_CALIBRATION);
  moisture1 = readMoisture(MOISTURE1_PIN);
  moisture2 = readMoisture(MOISTURE2_PIN);
  voltageAC = readVoltage();
  
  // PROTECTION CONDITIONS
  bool overCurrent1 = (current1_mA > CURRENT_LIMIT_mA);
  bool overCurrent2 = (current2_mA > CURRENT_LIMIT_mA);
  bool highMoisture1 = (moisture1 > MOISTURE_LIMIT);
  bool highMoisture2 = (moisture2 > MOISTURE_LIMIT);
  
  // RELAY 1 -> ZMCT 1
  digitalWrite(RELAY1_PIN, overCurrent1 ? RELAY_ON : RELAY_OFF);
  
  // RELAY 2 -> ZMCT 2
  digitalWrite(RELAY2_PIN, overCurrent2 ? RELAY_ON : RELAY_OFF);
  
  // RELAY 3 -> MOISTURE 1
  digitalWrite(RELAY3_PIN, highMoisture1 ? RELAY_ON : RELAY_OFF);
  
  // RELAY 4 -> MOISTURE 2
  digitalWrite(RELAY4_PIN, highMoisture2 ? RELAY_ON : RELAY_OFF);
  
  // BUZZER CONTROL (REVERSED LOGIC)
  bool protectionActive = (overCurrent1 || overCurrent2 || highMoisture1 || highMoisture2);
  digitalWrite(BUZZER_PIN, protectionActive ? BUZZER_OFF : BUZZER_ON);
  
  // SERIAL MONITOR
  Serial.println("----------------------------------------------");
  
  // ZMCT 1
  Serial.print("ZMCT 1 Current  : ");
  Serial.print(current1_mA, 2);
  Serial.println(" mA");
  Serial.print("ZMCT 1 Relay    : ");
  Serial.println(overCurrent1 ? "TRIPPED" : "OFF");
  
  // ZMCT 2
  Serial.print("ZMCT 2 Current  : ");
  Serial.print(current2_mA, 2);
  Serial.println(" mA");
  Serial.print("ZMCT 2 Relay    : ");
  Serial.println(overCurrent2 ? "TRIPPED" : "OFF");
  
  // MOISTURE 1
  Serial.print("Moisture 1      : ");
  Serial.print(moisture1, 1);
  Serial.println(" %");
  Serial.print("Moisture 1 Relay: ");
  Serial.println(highMoisture1 ? "TRIPPED" : "OFF");
  
  // MOISTURE 2
  Serial.print("Moisture 2      : ");
  Serial.print(moisture2, 1);
  Serial.println(" %");
  Serial.print("Moisture 2 Relay: ");
  Serial.println(highMoisture2 ? "TRIPPED" : "OFF");
  
  // AC VOLTAGE
  Serial.print("AC Voltage      : ");
  Serial.print(voltageAC, 2);
  Serial.println(" V");
  
  // BUZZER STATUS
  Serial.print("Buzzer          : ");
  Serial.println(protectionActive ? "OFF" : "ON");
  
  // SYSTEM STATUS
  Serial.print("SYSTEM STATUS   : ");
  Serial.println(protectionActive ? "PROTECTION ACTIVE" : "NORMAL");
  
  // WiFi & Firebase Status
  Serial.print("WiFi/Firebase   : ");
  Serial.print(wifiConnected ? "WiFi OK" : "WiFi FAIL");
  Serial.print(" / ");
  Serial.println(firebaseReady ? "Firebase OK" : "Firebase FAIL");
  
  Serial.println("----------------------------------------------");
  
  // PUSH TO FIREBASE every 3 seconds
  unsigned long now = millis();
  if (now - lastPushTime >= PUSH_INTERVAL && wifiConnected && firebaseReady)
  {
    Serial.println(">> Pushing to Firebase...");
    pushToFirebase(current1_mA, current2_mA, voltageAC,
                   moisture1, moisture2,
                   overCurrent1, overCurrent2, highMoisture1, highMoisture2,
                   !protectionActive);
    lastPushTime = now;
  }
  
  delay(1000);
}
