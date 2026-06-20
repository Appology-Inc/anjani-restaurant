const admin = require("firebase-admin");
const serviceAccount = require("../anjani-restaurant-firebase-adminsdk-fbsvc-fe6d70a99f.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function fix() {
  try {
    const uid = "1kvvwZFVlLNMnFaFbFdZTEnc2ti2"; // charith994@gmail.com
    await admin.firestore().collection('users').doc(uid).set({ role: 'owner' }, { merge: true });
    console.log("Successfully granted owner role to", uid);
  } catch (error) {
    console.log("Error:", error);
  }
}

fix();
