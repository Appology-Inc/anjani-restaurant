/**
 * @fileoverview Utility script to update the payment server URL in Firestore.
 * This is typically used when running a local tunnel (like localtunnel or ngrok)
 * so the frontend knows where the backend API is hosted.
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../anjani-restaurant-firebase-adminsdk-fbsvc-fe6d70a99f.json'));

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const url = process.argv[2];

if (!url) {
  console.error('Error: Please provide a URL. Example: node update_payment_url.js https://my-url.loca.lt');
  process.exit(1);
}

db.collection('settings').doc('payment').set({
  url: url
}, { merge: true })
.then(() => {
  console.log('Payment server URL updated in Firestore to:', url);
  process.exit(0);
})
.catch((err) => {
  console.error('Error updating URL in Firestore:', err);
  process.exit(1);
});
