/**
 * Populate Firestore maintenance_logs collection
 * Run: node populate-maintenance.cjs
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: 'tesla-pulse-9acb2',
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  ...serviceAccount,
});

const db = admin.firestore();

async function populateMaintenanceLogs() {
  console.log('🔧 Populating maintenance_logs collection...\n');

  try {
    // Read the firebase-initial-data.json file
    const rawData = fs.readFileSync('./firebase-initial-data.json', 'utf8');
    const data = JSON.parse(rawData);

    const maintenanceLogs = data.maintenance_logs;
    
    if (!maintenanceLogs) {
      console.error('❌ No maintenance_logs found in firebase-initial-data.json');
      process.exit(1);
    }

    const batch = db.batch();
    let count = 0;

    for (const [docId, record] of Object.entries(maintenanceLogs)) {
      const docRef = db.collection('maintenance_logs').doc(docId);
      batch.set(docRef, record);
      count++;
      console.log(`✅ Added: ${record.poleName} (${docId})`);
    }

    await batch.commit();
    console.log(`\n🎉 Successfully added ${count} maintenance records to Firestore!`);
    console.log('\n📱 Refresh your dashboard to see the maintenance page data.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

populateMaintenanceLogs();
