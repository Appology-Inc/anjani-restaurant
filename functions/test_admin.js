const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'anjani-restaurant'
});

async function test() {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('users').limit(1).get();
    console.log('Successfully connected to Firestore! Doc count:', snapshot.size);
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}

test();
