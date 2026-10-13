// =====================================================
// ESP32 POLE GUARDIAN - COMPLETE SYSTEM
// Smart Electric Pole Monitoring with Firebase
// Team Tesla Pulse
// =====================================================
// HARDWARE:
// - 2x ZMCT Current Sensors (GPIO 34, 35)
// - 1x ZMPT101B Voltage Sensor (GPIO 33)
// - 1x Soil Moisture Sensor (GPIO 32)
// - 3x Relays (GPIO 23, 19, 18)
// =====================================================

#include <WiFi.h>
#include <HTTPClient.h>

// =====================================================
// 🔧 CONFIGURATION - UPDATE THESE
// =====================================================

// WiFi Credentials
const char* WIFI_SSID = "YOUR_WIFI_NAME";           // ← Change this
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";   // ← Change this

// Firebase Setup (Update with your credentials)
const char* FIREBASE_HOST = "YOUR_FIREBASE_DATABASE_URL";
const char* FIREBASE_API_KEY = "YOUR_FIREBASE_API_KEY";
const char* POLE_ID = "pole_rajwada_01";  // Change for different poles

// =====================================================
// 📌 HARDWARE PIN CONFIGURATION
// =====================================================
#define ZMCT1_PIN       34  // Current sensor 1
#define ZMCT2_PIN       35  // Current sensor 2
#define ZMPT_PIN        33  // Voltage sensor
#define MOISTURE_PIN    32  // Soil moisture sensor

#define RELAY1_PIN      23  // Relay 1 (Overcurrent protection)
#define RELAY2_PIN      19  // Relay 2 (Overcurrent protection)
#define RELAY3_PIN      18  // Relay 3 (Moisture detection)

// =====================================================
// ⚙️ SENSOR CALIBRATION & LIMITS
// =====================================================

// Current sensor settings
float currentLimit1_mA = 1000.0;        // Trip threshold for relay 1
float currentLimit2_mA = 1000.0;        // Trip threshold for relay 2
float currentDetectLimit_mA = 20.0;     // Noise filter threshold
float calibration1 = 0.01;              // ZMCT1 calibration factor
float calibration2 = 0.01;              // ZMCT2 calibration factor

// Voltage sensor settings
float voltageCalibration = 0.50;        // ZMPT calibration factor

// Moisture sensor settings
int dryValue = 4095;                    // ADC value when dry (air)
int wetValue = 1200;                    // ADC value when wet (water)
int moistureLimit = 65;                 // Relay 3 trip threshold (%)

// Firebase push interval
unsigned long lastPushTime = 0;
const unsigned long pushInterval = 2000; // Push every 2 seconds

// =====================================================
// 📊 READ ZMCT CURRENT SENSOR (RMS)
// =====================================================
float readCurrent_mA(int pin, float calibration)
{
  const int samples = 500;
  double sum = 0;
  double sumSquares = 0;
  
  // Collect samples
  for (int i = 0; i < samples; i++)
  {
    int adcValue = analogRead(pin);
    sum += adcValue;
    sumSquares += (double)adcValue * adcValue;
    delayMicroseconds(200);
  }
  
  // Calculate RMS
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rmsADC = sqrt(variance);
  float current_mA = rmsADC * calibration * 1000.0;
  
  // Filter noise
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
  
  // Collect samples
  for (int i = 0; i < samples; i++)
  {
    int adcValue = analogRead(ZMPT_PIN);
    sum += adcValue;
    sumSquares += (double)adcValue * adcValue;
    delayMicroseconds(100);
  }
  
  // Calculate RMS
  double mean = sum / samples;
  double variance = (sumSquares / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  
  double rmsADC = sqrt(variance);
  float voltage = rmsADC * voltageCalibration;
  
  // Validate
  if (isnan(voltage) || voltage < 0)
    return 0.0;
  
  return voltage;
}

// =====================================================
// ☁️ PUSH DATA TO FIREBASE (HTTP REST API)
// =====================================================
void pushToFirebase(float current1, float current2, float voltage, int moisture, 
                     bool relay1, bool relay2, bool relay3)
{
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("⚠️ WiFi not connected - skipping Firebase push");
    return;
  }
  
  HTTPClient http;
  
  // Build Firebase URL with authentication
  String url = String(FIREBASE_HOST) + "/poles/" + String(POLE_ID) + "/live.json?auth=" + String(FIREBASE_API_KEY);
  
  // Calculate derived values
  float leakageCurrent = (current1 + current2) / 2.0;  // Average leakage
  float loadCurrent = current1 / 1000.0;               // Convert mA to A
  
  // Fault detection logic
  bool faultDetected = (current1 > currentLimit1_mA) || 
                       (current2 > currentLimit2_mA) || 
                       (moisture >= moistureLimit);
  
  // Simulated battery level based on voltage
  int batteryLevel = map(constrain((int)voltage, 200, 240), 200, 240, 50, 100);
  
  // Simulated temperature (or read from DHT sensor if available)
  float deviceTemp = 32.0 + random(-2, 3);
  
  // WiFi signal strength
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
  
  // Send HTTP PUT request to Firebase
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000); // 5 second timeout
  
  int httpCode = http.PUT(payload);
  
  // Handle response
  if (httpCode == 200)
  {
    Serial.println("✅ Firebase updated successfully");
  }
  else if (httpCode > 0)
  {
    Serial.print("❌ Firebase error: HTTP ");
    Serial.println(httpCode);
  }
  else
  {
    Serial.print("❌ Firebase connection failed: ");
    Serial.println(http.errorToString(httpCode));
  }
  
  http.end();
}

// =====================================================
// 🚀 SETUP - RUNS ONCE AT STARTUP
// =====================================================
void setup()
{
  // Initialize serial communication
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("================================");
  Serial.println("   POLE GUARDIAN SYSTEM v2.0");
  Serial.println("   Team Tesla Pulse");
  Serial.println("================================");
  Serial.println();
  
  // Configure relay pins as outputs
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  
  // Initialize all relays to OFF state
  digitalWrite(RELAY1_PIN, LOW);
  digitalWrite(RELAY2_PIN, LOW);
  digitalWrite(RELAY3_PIN, LOW);
  
  // Set ADC resolution to 12-bit (0-4095)
  analogReadResolution(12);
  
  // Configure WiFi for stability
  WiFi.mode(WIFI_STA);              // Station mode only
  WiFi.setSleep(false);             // Disable sleep to prevent disconnects
  WiFi.setAutoReconnect(true);      // Enable auto-reconnect
  WiFi.persistent(true);            // Save WiFi config to flash
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  Serial.print("Attempting connection");
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  Serial.println();
  
  // Check connection status
  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("✅ WiFi Connected Successfully!");
    Serial.println("--------------------------------");
    Serial.print("SSID: ");
    Serial.println(WiFi.SSID());
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    Serial.print("MAC Address: ");
    Serial.println(WiFi.macAddress());
    Serial.println("--------------------------------");
  }
  else
  {
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println();
    Serial.println("Troubleshooting:");
    Serial.println("1. Check SSID and password are correct");
    Serial.println("2. Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)");
    Serial.println("3. Move ESP32 closer to the router");
    Serial.println("4. Check if router MAC filtering is enabled");
    Serial.println();
  }
  
  // Display configuration
  Serial.println();
  Serial.println("System Configuration:");
  Serial.println("--------------------------------");
  Serial.print("Pole ID: ");
  Serial.println(POLE_ID);
  Serial.print("Current Limit 1: ");
  Serial.print(currentLimit1_mA);
  Serial.println(" mA");
  Serial.print("Current Limit 2: ");
  Serial.print(currentLimit2_mA);
  Serial.println(" mA");
  Serial.print("Moisture Limit: ");
  Serial.print(moistureLimit);
  Serial.println(" %");
  Serial.print("Push Interval: ");
  Serial.print(pushInterval / 1000);
  Serial.println(" seconds");
  Serial.println("--------------------------------");
  Serial.println();
  Serial.println("🔄 Starting monitoring loop...");
  Serial.println();
}

// =====================================================
// 🔁 MAIN LOOP - RUNS CONTINUOUSLY
// =====================================================
void loop()
{
  // ==================== WiFi RECONNECTION ====================
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 5000) // Check every 5 seconds
  {
    if (WiFi.status() != WL_CONNECTED)
    {
      Serial.println();
      Serial.println("⚠️ WiFi Disconnected! Attempting reconnection...");
      
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
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("Signal: ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
      }
      else
      {
        Serial.println("❌ Reconnection Failed! Will retry in 5 seconds...");
      }
      Serial.println();
    }
    lastWiFiCheck = millis();
  }
  
  // ==================== READ SENSORS ====================
  float current1_mA = readCurrent_mA(ZMCT1_PIN, calibration1);
  float current2_mA = readCurrent_mA(ZMCT2_PIN, calibration2);
  float voltage = readVoltage();
  
  // Read and map moisture sensor
  int moistureADC = analogRead(MOISTURE_PIN);
  int moisture = map(moistureADC, dryValue, wetValue, 0, 100);
  moisture = constrain(moisture, 0, 100);
  
  // ==================== RELAY CONTROL ====================
  
  // Relay 1: ZMCT1 Overcurrent Protection
  bool relay1State = (current1_mA > currentLimit1_mA);
  digitalWrite(RELAY1_PIN, relay1State ? HIGH : LOW);
  
  // Relay 2: ZMCT2 Overcurrent Protection
  bool relay2State = (current2_mA > currentLimit2_mA);
  digitalWrite(RELAY2_PIN, relay2State ? HIGH : LOW);
  
  // Relay 3: Moisture Detection
  bool relay3State = (moisture >= moistureLimit);
  digitalWrite(RELAY3_PIN, relay3State ? HIGH : LOW);
  
  // ==================== SERIAL OUTPUT ====================
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
  Serial.println(relay3State ? "💧 MOISTURE DETECTED" : "✓ OFF");
  
  Serial.println("╠════════════════════════════════════╣");
  
  Serial.print("║ WiFi Signal:  ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");
  
  Serial.print("║ Status:       ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "✓ Connected" : "✗ Disconnected");
  
  Serial.println("╚════════════════════════════════════╝");
  Serial.println();
  
  // ==================== FIREBASE PUSH ====================
  unsigned long now = millis();
  if (now - lastPushTime >= pushInterval)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      Serial.print("📤 Pushing data to Firebase... ");
      pushToFirebase(current1_mA, current2_mA, voltage, moisture, 
                     relay1State, relay2State, relay3State);
    }
    else
    {
      Serial.println("⚠️ WiFi not connected - skipping Firebase push");
    }
    lastPushTime = now;
  }
  
  // Wait before next loop iteration
  delay(1000);
}

// =====================================================
// END OF CODE
// =====================================================
