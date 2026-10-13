/**
 * Seed Firestore maintenance_logs collection using REST API
 * No dependencies needed - uses native fetch
 * Run: node seed-firestore-maintenance.cjs
 */

const fs = require('fs');

const PROJECT_ID = 'tesla-pulse-9acb2';
const COLLECTION = 'maintenance_logs';

async function seedMaintenance() {
  console.log('\n🔧 Seeding Firestore maintenance_logs collection...');
  console.log('📡 Project:', PROJECT_ID);
  console.log('━'.repeat(60) + '\n');

  try {
    // Read firebase-initial-data.json
    const rawData = fs.readFileSync('./firebase-initial-data.json', 'utf8');
    const data = JSON.parse(rawData);
    const maintenanceLogs = data.maintenance_logs;

    if (!maintenanceLogs) {
      console.error('❌ No maintenance_logs found in firebase-initial-data.json');
      process.exit(1);
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [docId, record] of Object.entries(maintenanceLogs)) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${docId}`;
        
        // Convert to Firestore document format
        const firestoreDoc = {
          fields: {}
        };

        for (const [key, value] of Object.entries(record)) {
          if (typeof value === 'string') {
            firestoreDoc.fields[key] = { stringValue: value };
          } else if (typeof value === 'number') {
            firestoreDoc.fields[key] = { integerValue: value.toString() };
          } else if (typeof value === 'boolean') {
            firestoreDoc.fields[key] = { booleanValue: value };
          }
        }

        const response = await fetch(url, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(firestoreDoc),
        });

        if (response.ok) {
          console.log(`✅ ${record.poleName} (${docId})`);
          successCount++;
        } else {
          const error = await response.text();
          console.error(`❌ Failed ${docId}: ${response.status} - ${error}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Error ${docId}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '━'.repeat(60));
    console.log(`✅ Success: ${successCount} records`);
    console.log(`❌ Errors: ${errorCount} records`);
    console.log('━'.repeat(60) + '\n');

    if (successCount > 0) {
      console.log('📱 Refresh your dashboard to see maintenance data!\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

seedMaintenance();
