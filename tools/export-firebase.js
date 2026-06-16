#!/usr/bin/env node
/**
 * Export all Firestore collections to JSON for LMS migration.
 * Usage: node tools/export-firebase.js [serviceAccountPath]
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT = process.argv[2]
  || path.join(__dirname, '../backups/lead-management-eba09-firebase-adminsdk-fbsvc-3ebe6a637c.json');
const OUT_FILE = path.join(__dirname, '../backups/firebase-export.json');

if (!fs.existsSync(SERVICE_ACCOUNT)) {
  console.error('Service account not found:', SERVICE_ACCOUNT);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT)),
});
const db = admin.firestore();

function serializeValue(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof admin.firestore.Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (Array.isArray(val)) return val.map(serializeValue);
  if (typeof val === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(val)) out[k] = serializeValue(v);
    return out;
  }
  return val;
}

async function exportCollection(name) {
  const snap = await db.collection(name).get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...serializeValue(doc.data()),
  }));
}

async function main() {
  console.log('Exporting from Firestore...');
  const collections = ['companies', 'users', 'leads', 'events'];
  const data = { exportedAt: new Date().toISOString() };

  for (const col of collections) {
    data[col] = await exportCollection(col);
    console.log(`  ${col}: ${data[col].length} documents`);
  }

  const branding = await db.doc('systemConfig/globalBranding').get();
  data.systemConfig = branding.exists ? serializeValue(branding.data()) : null;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(data, null, 2));
  console.log(`\nSaved → ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
