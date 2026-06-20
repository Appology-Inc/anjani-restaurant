const admin = require("firebase-admin");
const serviceAccount = require("../anjani-restaurant-firebase-adminsdk-fbsvc-fe6d70a99f.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function assignRoles() {
  try {
    // Owner
    const ownerEmail = "owner@anjani.com";
    const ownerUser = await admin.auth().getUserByEmail(ownerEmail).catch(() => null);
    if (ownerUser) {
      await admin.firestore().collection('users').doc(ownerUser.uid).set({ role: 'owner' }, { merge: true });
      console.log(`✅ Granted 'owner' role to ${ownerEmail} (UID: ${ownerUser.uid})`);
    } else {
      console.log(`❌ User ${ownerEmail} not found in Firebase Auth.`);
    }

    // Rider
    const riderEmail = "rider@anjani.com";
    const riderUser = await admin.auth().getUserByEmail(riderEmail).catch(() => null);
    if (riderUser) {
      await admin.firestore().collection('users').doc(riderUser.uid).set({ role: 'rider' }, { merge: true });
      console.log(`✅ Granted 'rider' role to ${riderEmail} (UID: ${riderUser.uid})`);
    } else {
      console.log(`❌ User ${riderEmail} not found in Firebase Auth.`);
    }

  } catch (error) {
    console.log("Error:", error);
  } finally {
    process.exit(0);
  }
}

assignRoles();
