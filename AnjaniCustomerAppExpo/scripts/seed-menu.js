const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDgZbCT3tliCLwY5KwfgkuDuFeW9qSdoeQ",
  authDomain: "anjani-restaurant.firebaseapp.com",
  projectId: "anjani-restaurant",
  storageBucket: "anjani-restaurant.firebasestorage.app",
  messagingSenderId: "560562817811",
  appId: "1:560562817811:web:a445988d46f47542ed28e6",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  console.log('Reading MenuData.ts...');
  const menuDataPath = path.join(__dirname, '../src/data/MenuData.ts');
  const content = fs.readFileSync(menuDataPath, 'utf8');

  const startIdx = content.indexOf('export const MenuItems: MenuItem[] = [');
  if (startIdx === -1) {
    throw new Error('Could not find MenuItems start in MenuData.ts');
  }

  const arrayStart = content.indexOf('[', startIdx);
  const arrayEnd = content.lastIndexOf(']');
  const arrayString = content.substring(arrayStart, arrayEnd + 1);

  console.log('Evaluating menu array...');
  const items = new Function('return ' + arrayString)();
  console.log(`Parsed ${items.length} menu items successfully.`);

  console.log('Seeding menu items to Firestore...');
  let count = 0;
  for (const item of items) {
    // Seed every item under its id as the document key
    const docRef = doc(db, 'menu', item.id);
    await setDoc(docRef, {
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description || '',
      price: Number(item.price),
      imageUrl: item.imageUrl || '',
      isVeg: !!item.isVeg,
      rating: Number(item.rating || 4),
      isAvailable: true,
      isDeleted: false,
    });
    count++;
    if (count % 20 === 0) {
      console.log(`Uploaded ${count}/${items.length} items...`);
    }
  }
  console.log('Menu seeded successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
