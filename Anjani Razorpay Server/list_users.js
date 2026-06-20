const admin = require("firebase-admin");
const serviceAccount = require("../anjani-restaurant-firebase-adminsdk-fbsvc-fe6d70a99f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const listAllUsers = async (nextPageToken) => {
  try {
    const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
    for (const userRecord of listUsersResult.users) {
      console.log(`Email: ${userRecord.email}, UID: ${userRecord.uid}`);
      // Also get the users document
      const doc = await admin.firestore().collection('users').doc(userRecord.uid).get();
      if (doc.exists) {
        console.log(`  Role: ${doc.data().role}`);
      } else {
        console.log(`  No user document found!`);
        // We will make them an owner if they don't have a document
        await admin.firestore().collection('users').doc(userRecord.uid).set({ role: 'owner' });
        console.log(`  -> Granted owner role!`);
      }
    }
    console.log("Done checking all users.");
  } catch (error) {
    console.log('Error listing users:', error);
  }
};

listAllUsers();
