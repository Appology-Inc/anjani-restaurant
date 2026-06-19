const admin = require('firebase-admin');
const { MenuItems } = require('./MenuData.js');

// Initialize Firebase Admin without credentials (uses application default credentials if deployed, 
// or since we just need basic access, we can initialize it with the projectId directly and rely on permissive rules?
// Wait, firebase-admin requires ADC. Let's try initializing it with projectId.
// Actually, since the user is logged into firebase CLI, ADC might be available.
// If it fails, I'll fall back to the REST API via fetch.
admin.initializeApp({
  projectId: "anjani-restaurant"
});

const db = admin.firestore();

async function seedMenu() {
  console.log("Seeding", MenuItems.length, "items...");
  let count = 0;
  for (const item of MenuItems) {
    try {
      await db.collection('menu').doc(item.id).set(item);
      count++;
      if (count % 10 === 0) console.log(`Seeded ${count} items...`);
    } catch (e) {
      console.error("Error seeding", item.id, e.message);
    }
  }
  console.log("Menu seeding complete!");
}

seedMenu().catch(console.error);
