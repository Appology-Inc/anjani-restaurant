import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDgZbCT3tliCLwY5KwfgkuDuFeW9qSdoeQ",
  authDomain: "anjani-restaurant.firebaseapp.com",
  projectId: "anjani-restaurant",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setup() {
  try {
    // Create Owner
    const ownerCred = await createUserWithEmailAndPassword(auth, 'owner@anjani.com', 'owner123');
    await setDoc(doc(db, 'users', ownerCred.user.uid), { role: 'owner', email: 'owner@anjani.com' });
    console.log("Owner created successfully: owner@anjani.com / owner123");

    // Create Rider
    const riderCred = await createUserWithEmailAndPassword(auth, 'rider@anjani.com', 'rider123');
    await setDoc(doc(db, 'users', riderCred.user.uid), { role: 'rider', email: 'rider@anjani.com' });
    console.log("Rider created successfully: rider@anjani.com / rider123");

    console.log("Security setup complete!");
    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log("Users already exist. Setup was likely already run.");
      process.exit(0);
    }
    console.error("Error setting up users:", error);
    process.exit(1);
  }
}

setup();
