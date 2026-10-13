/**
 * Simple Mock Data Pusher for Firebase RTDB
 * Uses Firebase REST API to push data (No dependencies needed)
 * Run: node firebase-mock-pusher.cjs
 */

const https = require('https');

const DATABASE_URL = 'https://tesla-pulse-9acb2-default-rtdb.asia-southeast1.firebasedatabase.app';

// Jitter function for realistic variations
function jitter(base, range) {
  return parseFloat((base + (Math.random() - 0.5) * range * 2).toFixed(2));
}

// Thresholds (matching ESP32 code)
const MOISTURE_THRESHOLD = 60;    // Relay 1 trips at ≥60%
const CURRENT_THRESHOLD = 200;    // Relay 2 trips at >200mA
const VOLTAGE_THRESHOLD = 250;    // Relay 3 trips at >250V

// Initial state for poles
const state = {
  pole_rajwada_01: {
    zmct1_current_mA: 120.0,    // ZMCT1 sensor reading
    zmct2_current_mA: 95.0,     // ZMCT2 sensor reading
    voltage_V: 228.0,
    moisture_percent: 35,
    deviceTemp_C: 32,
    batteryLevel_percent: 85,
    signalStrength: -65,
  },
  pole_rajwada_02: {
    zmct1_current_mA: 150.0,    // ZMCT1 sensor reading
    zmct2_current_mA: 110.0,    // ZMCT2 sensor reading
    voltage_V: 230.0,
    moisture_percent: 38,
    deviceTemp_C: 33,
    batteryLevel_percent: 82,
    signalStrength: -68,
  },
};

let faultCycle = 0;
let rainMode = false;

function pushToFirebase(poleId, data) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(data);
    const url = new URL(`/poles/${poleId}/live.json`, DATABASE_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataString.length,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

console.log('\n🚀 Tesla Pulse - Firebase Mock Data Pusher');
console.log('━'.repeat(60));
console.log('📡 Database:', DATABASE_URL);
console.log('⏱️  Interval: 2 seconds per update');
console.log('🌧️  Rain Simulation: Every 20 cycles (40 seconds)');
console.log('⚡ Press Ctrl+C to stop');
console.log('━'.repeat(60) + '\n');

// Push data every 2 seconds
setInterval(async () => {
  faultCycle++;

  // Rain scenario every 20 cycles (40 seconds)
  if (faultCycle % 20 === 0) {
    rainMode = !rainMode;
    console.log('\n' + '═'.repeat(60));
    console.log(rainMode ? '🌧️  RAIN MODE ACTIVATED - Faults will trigger!' : '☀️  Normal mode restored - System recovering');
    console.log('═'.repeat(60) + '\n');
  }

  for (const [poleId, prev] of Object.entries(state)) {
    // Gradually drift sensor values
    let zmct1 = Math.max(0, jitter(prev.zmct1_current_mA, 10));
    let zmct2 = Math.max(0, jitter(prev.zmct2_current_mA, 10));
    let voltage = jitter(prev.voltage_V, 1.0);
    let moisture = Math.min(100, Math.max(0, jitter(prev.moisture_percent, 1)));
    
    // Calculate derived values (matching ESP32 code)
    let leakageCurrent_mA = (zmct1 + zmct2) / 2.0;  // Average of ZMCT1+ZMCT2
    let loadCurrent_A = zmct1 / 1000.0;             // ZMCT1 in Amperes
    
    // RELAY LOGIC (matching ESP32 code)
    let relay1 = (moisture >= MOISTURE_THRESHOLD);              // Moisture ≥60%
    let relay2 = (zmct1 > CURRENT_THRESHOLD) || (zmct2 > CURRENT_THRESHOLD);  // Current >200mA
    let relay3 = (voltage > VOLTAGE_THRESHOLD);                 // Voltage >250V
    
    let faultDetected = relay1 || relay2 || relay3;
    
    let live = {
      zmct1_current_mA: zmct1,
      zmct2_current_mA: zmct2,
      leakageCurrent_mA: leakageCurrent_mA,
      loadCurrent_A: loadCurrent_A,
      voltage_V: voltage,
      moisture_percent: moisture,
      faultDetected: faultDetected,
      deviceTemp_C: jitter(prev.deviceTemp_C, 0.3),
      batteryLevel_percent: Math.min(100, Math.max(0, prev.batteryLevel_percent - 0.02)),
      signalStrength: jitter(prev.signalStrength, 1),
      relay1_status: relay1,
      relay2_status: relay2,
      relay3_status: relay3,
      lastUpdated: Date.now(),
    };

    // Rain scenario - trigger faults
    if (rainMode) {
      // Increase moisture above threshold
      live.moisture_percent = Math.min(100, live.moisture_percent + 3);
      
      if (poleId === 'pole_rajwada_01') {
        // Pole 1: Overcurrent on ZMCT1
        live.zmct1_current_mA = jitter(350, 50);  // >200mA threshold
        live.zmct2_current_mA = jitter(180, 20);
        live.voltage_V = jitter(235, 5);
      } else if (poleId === 'pole_rajwada_02') {
        // Pole 2: Overcurrent on ZMCT2 + overvoltage
        live.zmct1_current_mA = jitter(180, 20);
        live.zmct2_current_mA = jitter(280, 40);  // >200mA threshold
        live.voltage_V = jitter(260, 10);         // >250V threshold
      }
      
      // Recalculate with fault values
      live.leakageCurrent_mA = (live.zmct1_current_mA + live.zmct2_current_mA) / 2.0;
      live.loadCurrent_A = live.zmct1_current_mA / 1000.0;
      live.relay1_status = (live.moisture_percent >= MOISTURE_THRESHOLD);
      live.relay2_status = (live.zmct1_current_mA > CURRENT_THRESHOLD) || (live.zmct2_current_mA > CURRENT_THRESHOLD);
      live.relay3_status = (live.voltage_V > VOLTAGE_THRESHOLD);
      live.faultDetected = live.relay1_status || live.relay2_status || live.relay3_status;
      
    } else {
      // Recovery mode - values normalize
      live.moisture_percent = Math.max(35, live.moisture_percent - 2);
      live.zmct1_current_mA = Math.max(100, live.zmct1_current_mA - 15);
      live.zmct2_current_mA = Math.max(80, live.zmct2_current_mA - 15);
      live.voltage_V = Math.min(230, Math.max(220, live.voltage_V - 2));
    }

    // Update state
    state[poleId] = {
      zmct1_current_mA: live.zmct1_current_mA,
      zmct2_current_mA: live.zmct2_current_mA,
      voltage_V: live.voltage_V,
      moisture_percent: live.moisture_percent,
      deviceTemp_C: live.deviceTemp_C,
      batteryLevel_percent: live.batteryLevel_percent,
      signalStrength: live.signalStrength,
    };

    // Push to Firebase
    try {
      await pushToFirebase(poleId, live);
      const status = live.faultDetected ? '🚨' : '✅';
      const poleName = poleId === 'pole_rajwada_01' ? 'Pole 1' : 'Pole 2';
      const relayStatus = `R1:${live.relay1_status ? 'ON' : 'OFF'} R2:${live.relay2_status ? 'ON' : 'OFF'} R3:${live.relay3_status ? 'ON' : 'OFF'}`;
      console.log(`${status} ${poleName}: ZMCT1=${live.zmct1_current_mA.toFixed(0)}mA | ZMCT2=${live.zmct2_current_mA.toFixed(0)}mA | V=${live.voltage_V.toFixed(1)}V | M=${live.moisture_percent.toFixed(0)}% | ${relayStatus}`);
    } catch (error) {
      console.error(`❌ Error pushing ${poleId}:`, error.message);
    }
  }

  console.log(`\n[Cycle ${faultCycle} complete at ${new Date().toLocaleTimeString()}]\n`);
}, 2000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n━'.repeat(60));
  console.log('🛑 Stopping mock data pusher...');
  console.log('👋 Goodbye!');
  console.log('━'.repeat(60) + '\n');
  process.exit(0);
});
