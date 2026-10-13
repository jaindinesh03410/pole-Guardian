// =====================================================
// ESP32 PROTECTION SYSTEM + FIREBASE (HTTP REST API)
// 2 x ZMCT + 1 x ZMPT101B + Soil Moisture + 3 Relays
// Uses HTTPClient - NO LIBRARY NEEDED!
// =====================================================

#include <WiFi.h>
#include <HTTPClient.h>

// =====================================================
// WiFi CREDENTIALS - UPDATE THESE
// =====================================================
const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// =====================================================
// FIREBASE CREDENTIALS - NO CHANGE NEEDED
// =====================================================
const char* FIREBASE_HOST = "YOUR_FIREBASE_DATABASE_URL";
const char* FIREBASE_API_KEY = "YOUR_FIREBASE_API_KEY";
const char* POLE_ID = "pole_rajwada_01";

// ---------------- SENSOR PINS ----------------
#define ZMCT1_PIN       34
#define ZMCT2_PIN       35
#define ZMPT_PIN        33
#define MOISTURE_PIN    32

// ---------------- RELAY PINS ----------------
#define RELAY1_PIN      23
#define RELAY2_PIN      19
#define RELAY3_PIN      18

// ---------------- SETTINGS ----------------
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
const unsigned long pushInterval = 2000;

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
  if (variance < 0) variance = 0;
  
  double rmsADC = sqrt(variance);
  float current_mA = rmsADC * calibration * 1000.0;
  
  if (isnan(current_mA) || current_mA < currentDetectLimit_mA)
    return 0.0;
  
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
  if (variance < 0) variance = 0;
  
  double rmsADC = sqrt(variance);
  float voltage = rmsADC * voltageCalibration;
  
  if (isnan(voltage) || voltage < 0)
    return 0.0;
  
  return voltage;
}

// =====================================================
// PUSH TO FIREBASE VIA HTTP
// =====================================================
void pushToFirebase(float current1, float current2, float voltage, int moisture, 
                     bool relay1, bool relay2, bool relay3)
{
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  
  // Build Firebase URL with API key
  String url = String(FIREBASE_HOST) + "/poles/" + String(POLE_ID) + "/live.json?auth=" + String(FIREBASE_API_KEY);
  
  // Calculate values
  float leakageCurrent = (current1 + current2) / 2.0;
  float loadCurrent = current1 / 1000.0;
  bool faultDetected = (current1 > currentLimit1_mA) || 
                       (current2 > currentLimit2_mA) || 
                       (moisture >= moistureLimit);
  int batteryLevel = map(constrain((int)voltage, 200, 240), 200, 240, 50, 100);
  float deviceTemp = 32.0 + random(-2, 3);
  int signalStrength = WiFi.RSSI();
  
  // Build JSON payload
  String payload = "{";
  payload += "\"leakageCurrent_mA\":" + String(leakageCurrent, 2) + ",";
  payload += "\"loadCurrent_A\":" + String(loadCurrent, 3) + ",";
  payload += "\"voltage_V\":" + String(voltage, 2) + ",";
  payload += "\"moisture_percent\":" + String(moisture) + ",";
  payload += "\"faultDetected\":" + String(faultDetected ? "true" : "false") + ",";
  payload += "\"deviceTemp_C\":" + String(deviceTemp, 1) + ",";
  payload += "\"batteryLevel_percent\":" + String(batteryLevel) + ",";
  payload += "\"signalStrength\":" + String(signalStrength) + ",";
  payload += "\"relay1_status\":" + String(relay1 ? "true" : "false") + ",";
  payload += "\"relay2_status\":" + String(relay2 ? "true" : "false") + ",";
  payload += "\"relay3_status\":" + String(relay3 ? "true" : "false") + ",";
  payload += "\"lastUpdated\":" + String(millis() / 1000);
  payload += "}";
  
  // Send HTTP PUT request
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.PUT(payload);
  
  if (httpCode == 200)
  {
    Serial.println("✅ Firebase updated");
  }
  else
  {
    Serial.print("❌ Firebase error: ");
    Serial.println(httpCode);
  }
  
  http.end();
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
  Serial.println("================================");
  
  // Setup pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);
  digitalWrite(RELAY3_PIN, LOW);
  
  analogReadResolution(12);
  
  // WiFi Config - FIX DISCONNECT ISSUES
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // Disable WiFi sleep mode
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);
  
  // Connect WiFi
  Serial.print("WiFi connecting to: ");
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
    Serial.print("SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("MAC: ");
    Serial.println(WiFi.macAddress());
  }
  else
  {
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("Check:");
    Serial.println("1. SSID and Password correct?");
    Serial.println("2. 2.4GHz WiFi? (ESP32 doesn't support 5GHz)");
    Serial.println("3. Router nearby?");
  }
  
  Serial.println();
  Serial.println("Pole ID: " + String(POLE_ID));
  Serial.println("Push every 2 seconds");
  Serial.println("================================");
  Serial.println();
}

// =====================================================
// MAIN LOOP
// =====================================================
void loop()
{
  // Reconnect WiFi if needed
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 5000) // Check every 5 seconds
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println();
      Serial.println("⚠️ WiFi Disconnected! Reconnecting...");
      
      WiFi.disconnect();
      delay(100);
      
      WiFi.mode(WIFI_STA);
      WiFi.setSleep(false);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 20)
      {
        delay(500);
        Serial.print(".");
        attempts++;
      }
      
      Serial.println();
      
      if (WiFi.status() == WL_CONNECTED)
      {
        Serial.println("✅ WiFi Reconnected!");
        Serial.print("IP: ");
        Serial.println(WiFi.localIP());
        Serial.print("Signal: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
      }
      else
      {
        Serial.println("❌ Reconnect Failed!");
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
  Serial.println("--- READINGS ---");
  Serial.print("Current 1: ");
  Serial.print(current1_mA, 2);
  Serial.println(" mA");
  
  Serial.print("Current 2: ");
  Serial.print(current2_mA, 2);
  Serial.println(" mA");
  
  Serial.print("Voltage: ");
  Serial.print(voltage, 2);
  Serial.println(" V");
  
  Serial.print("Moisture: ");
  Serial.print(moisture);
  Serial.println(" %");
  
  Serial.print("Relay1: ");
  Serial.println(relay1State ? "TRIP" : "OFF");
  
  Serial.print("Relay2: ");
  Serial.println(relay2State ? "TRIP" : "OFF");
  
  Serial.print("Relay3: ");
  Serial.println(relay3State ? "ON" : "OFF");
  
  Serial.print("WiFi: ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  Serial.println("----------------");
  
  // Push to Firebase
  unsigned long now = millis();
  if (now - lastPushTime >= pushInterval)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      Serial.print("Pushing to Firebase... ");
      pushToFirebase(current1_mA, current2_mA, voltage, moisture, 
                     relay1State, relay2State, relay3State);
    }
    else
    {
      Serial.println("⚠️ WiFi not connected - skipping push");
    }
    lastPushTime = now;
  }
  
  delay(1000);
}
