/**
 * @fileoverview Utility script to quickly check the last 5 orders in Firestore.
 * Used for debugging and verification of the payment flow updates.
 */

const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require(path.join(__dirname, '../anjani-restaurant-firebase-adminsdk-fbsvc-fe6d70a99f.json'));

// Initialize Firebase Admin SDK to access Firestore securely
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Fetch the 5 most recent orders
db.collection('orders')
  .orderBy('createdAt', 'desc')
  .limit(5)
  .get()
  .then((snapshot) => {
    console.log('--- LAST 5 ORDERS ---');
    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`Status: ${data.status}`);
      console.log(`Payment Status: ${data.paymentStatus}`);
      console.log(`Payment Method: ${data.paymentMethod}`);
      console.log(`Total Amount: ${data.totalAmount}`);
      console.log(`Created At: ${data.createdAt ? new Date(data.createdAt).toISOString() : 'N/A'}`);
      console.log(`Razorpay Order ID: ${data.razorpayOrderId || 'N/A'}`);
      console.log(`Razorpay Payment ID: ${data.razorpayPaymentId || 'N/A'}`);
      console.log('---------------------');
    });
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error fetching orders:', err);
    process.exit(1);
  });
