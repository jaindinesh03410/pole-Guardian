/*
 * Tesla Pulse - ESP32 Sensor Reader for Electric Pole Monitoring
 * Hardware: ESP32 + ZMCT101B + ACS712 + Moisture Sensor + Voltage Sensor
 * Team Tesla Pulse
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// ========== WiFi Credentials ==========
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ========== Firebase Config ==========
#define API_KEY "YOUR_FIREBASE_API_KEY"
#define DATABASE_URL "https://YOUR_PROJECT.firebaseio.com/"

// ========== Sensor Pin Configuration ==========
#define ZMCT_PIN 34          // ZMCT101B Leakage Current Sensor (Analog)
#define ACS712_PIN 35        // ACS712 Load Current Sensor (Analog)
#define VOLTAGE_PIN 32       // Voltage Sensor (Step-down + Rectifier)
#define MOISTURE_PIN 33      // Moisture Sensor (Analog)
#define FAULT_PIN 25         // Hardware Fault Detection Pin (Digital)

// ========== Calibration Constants ==========
// ZMCT101B: 1000:1 ratio, output 0-5V for 0-100A
#define ZMCT_SENSITIVITY 0.0488   // mA per ADC unit (adjust based on calibration)
#define ZMCT_OFFSET 2048          // ADC midpoint for AC

// ACS712 5A Module: 185mV/A sensitivity
#define ACS712_SENSITIVITY 0.185  // V/A
#define ACS712_OFFSET 2.5         // Output at 0A (VCC/2)

// Voltage sensor: Step-down transformer + rectifier
#define VOLTAGE_FACTOR 230.0 / 3.3  // Adjust based on divider ratio

// Moisture sensor: Capacitive or resistive
#define MOISTURE_DRY 3500        // ADC value in dry condition
#define MOISTURE_WET 1500        // ADC value in wet condition

// ========== Firebase Objects ==========
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ========== Global Variables ==========
unsigned long lastPushTime = 0;
const unsigned long PUSH_INTERVAL = 2000;  // Push every 2 seconds

// ========== Function Prototypes ==========
float readLeakageCurrent();
float readLoadCurrent();
float readVoltage();
float readMoisture();
bool detectFault();

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Tesla Pulse - Pole Monitor ===");
  
  // Initialize sensor pins
  pinMode(ZMCT_PIN, INPUT);
  pinMode(ACS712_PIN, INPUT);
  pinMode(VOLTAGE_PIN, INPUT);
  pinMode(MOISTURE_PIN, INPUT);
  pinMode(FAULT_PIN, INPUT_PULLUP);
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✓ WiFi Connected");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Anonymous sign in (or use token)
  Serial.print("Connecting to Firebase");
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("\n✓ Firebase Connected");
  } else {
    Serial.printf("\n✗ Firebase Error: %s\n", config.signer.signupError.message.c_str());
  }
  
  config.token_status_callback = tokenStatusCallback;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("=== System Ready ===\n");
}

void loop() {
  // Check if it's time to push data
  if (millis() - lastPushTime >= PUSH_INTERVAL) {
    lastPushTime = millis();
    
    // Read all sensors
    float leakage = readLeakageCurrent();
    float loadCurrent = readLoadCurrent();
    float voltage = readVoltage();
    float moisture = readMoisture();
    bool faultDetected = detectFault();
    
    // Print to Serial for debugging
    Serial.println("─── Sensor Readings ───");
    Serial.printf("Leakage: %.2f mA\n", leakage);
    Serial.printf("Load: %.2f A\n", loadCurrent);
    Serial.printf("Voltage: %.1f V\n", voltage);
    Serial.printf("Moisture: %.0f %%\n", moisture);
    Serial.printf("Fault: %s\n", faultDetected ? "YES" : "NO");
    
    // Prepare JSON payload
    FirebaseJson json;
    json.set("leakageCurrent_mA", leakage);
    json.set("loadCurrent_A", loadCurrent);
    json.set("voltage_V", voltage);
    json.set("moisture_percent", moisture);
    json.set("faultDetected", faultDetected);
    json.set("deviceTemp_C", temperatureRead());  // ESP32 internal temp
    json.set("batteryLevel_percent", 100);        // If using battery, read actual level
    json.set("signalStrength", WiFi.RSSI());
    json.set("lastUpdated/.sv", "timestamp");     // Firebase server timestamp
    
    // Push to Firebase (change pole_rajwada_01 to your pole ID)
    String path = "/poles/pole_rajwada_01/live";
    
    if (Firebase.RTDB.updateNode(&fbdo, path.c_str(), &json)) {
      Serial.println("✓ Data pushed to Firebase\n");
    } else {
      Serial.printf("✗ Push failed: %s\n\n", fbdo.errorReason().c_str());
    }
  }
  
  delay(10);  // Small delay to prevent watchdog reset
}

// ========== Sensor Reading Functions ==========

float readLeakageCurrent() {
  /*
   * ZMCT101B Current Transformer
   * Output: 0-5V AC signal
   * Read multiple samples and calculate RMS
   */
  const int samples = 100;
  float sum = 0;
  
  for (int i = 0; i < samples; i++) {
    int raw = analogRead(ZMCT_PIN);
    float voltage = (raw - ZMCT_OFFSET) * (3.3 / 4095.0);
    sum += voltage * voltage;
    delayMicroseconds(200);  // ~5kHz sampling for 50Hz AC
  }
  
  float rms = sqrt(sum / samples);
  float current_mA = rms * 1000.0 / ZMCT_SENSITIVITY;
  
  return abs(current_mA);
}

float readLoadCurrent() {
  /*
   * ACS712 Hall Effect Current Sensor
   * 5A model: 185 mV/A, centered at 2.5V
   */
  const int samples = 50;
  float sum = 0;
  
  for (int i = 0; i < samples; i++) {
    int raw = analogRead(ACS712_PIN);
    float voltage = raw * (3.3 / 4095.0);
    float current = (voltage - ACS712_OFFSET) / ACS712_SENSITIVITY;
    sum += current * current;
    delay(2);
  }
  
  float rms = sqrt(sum / samples);
  return abs(rms);
}

float readVoltage() {
  /*
   * Voltage Sensor: Step-down transformer + rectifier
   * Output scaled to 0-3.3V representing 0-300V AC
   */
  const int samples = 50;
  long sum = 0;
  
  for (int i = 0; i < samples; i++) {
    sum += analogRead(VOLTAGE_PIN);
    delay(2);
  }
  
  float avg = sum / (float)samples;
  float voltage = (avg / 4095.0) * 3.3 * VOLTAGE_FACTOR;
  
  return voltage;
}

float readMoisture() {
  /*
   * Capacitive Moisture Sensor
   * Wet = low value, Dry = high value
   */
  int raw = analogRead(MOISTURE_PIN);
  
  // Convert to percentage (0% = dry, 100% = wet)
  float percent = map(raw, MOISTURE_DRY, MOISTURE_WET, 0, 100);
  percent = constrain(percent, 0, 100);
  
  return percent;
}

bool detectFault() {
  /*
   * Hardware fault detection logic
   * Returns true if any critical condition met
   */
  float leakage = readLeakageCurrent();
  float moisture = readMoisture();
  float voltage = readVoltage();
  float load = readLoadCurrent();
  
  // Hardware fault pin (if connected to relay/alarm)
  bool hwFault = (digitalRead(FAULT_PIN) == LOW);
  
  // Threshold-based detection
  bool leakageFault = (leakage > 15.0);
  bool moistureFault = (moisture > 70.0);
  bool voltageFault = (voltage > 250.0 || voltage < 180.0);
  bool overloadFault = (load > 10.0);
  
  return (hwFault || leakageFault || moistureFault || voltageFault || overloadFault);
}
