const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: "anjani-restaurant"
});

const db = admin.firestore();

async function seedMockData() {
  console.log("Seeding mock users (owners, riders, customers)...");
  
  // 1. Seed Owner
  await db.collection('users').doc('owner123').set({
    uid: 'owner123',
    name: 'Anjani Owner',
    phone: '+919032756266',
    role: 'owner',
    createdAt: Date.now()
  });

  // 2. Seed Delivery Partners
  await db.collection('users').doc('rider123').set({
    uid: 'rider123',
    name: 'Delivery Partner Raju',
    phone: '+919999999999',
    role: 'rider',
    isOnline: true,
    location: { lat: 17.0805, lng: 82.1355 },
    createdAt: Date.now()
  });

  // 3. Seed Customer
  await db.collection('users').doc('customer123').set({
    uid: 'customer123',
    name: 'Customer Kumar',
    phone: '+918888888888',
    role: 'customer',
    address: 'Near Street Cinema, Peddapuram',
    createdAt: Date.now()
  });

  console.log("Seeding mock orders...");
  
  // 4. Seed Mock Order
  await db.collection('orders').doc('ORD-123456-MOCK').set({
    id: 'ORD-123456-MOCK',
    customerUid: 'customer123',
    customerName: 'Customer Kumar',
    customerPhone: '+918888888888',
    customerAddress: 'Near Street Cinema, Peddapuram',
    items: [
      { id: 'vs1', name: 'Veg Manchow Soup', quantity: 2, price: 120, total: 240 }
    ],
    totalAmount: 240,
    status: 'PLACED',
    paymentMethod: 'COD',
    restaurantLat: 17.0805,
    restaurantLng: 82.1355,
    userLat: 17.0905,
    userLng: 82.1455,
    createdAt: Date.now()
  });

  console.log("Mock data seeding complete!");
}

seedMockData().catch(console.error);
