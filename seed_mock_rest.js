async function seedMockData() {
  console.log("Seeding mock users and orders via REST API...");

  async function patch(collection, id, data) {
    const firestoreData = { fields: {} };
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') firestoreData.fields[key] = { stringValue: value };
      else if (typeof value === 'number') firestoreData.fields[key] = { doubleValue: value };
      else if (typeof value === 'boolean') firestoreData.fields[key] = { booleanValue: value };
      else if (Array.isArray(value)) {
          // Simplistic array converter for items array
          firestoreData.fields[key] = {
              arrayValue: {
                  values: value.map(obj => {
                      const mapFields = {};
                      for (const [k, v] of Object.entries(obj)) {
                          if (typeof v === 'string') mapFields[k] = { stringValue: v };
                          else if (typeof v === 'number') mapFields[k] = { doubleValue: v };
                      }
                      return { mapValue: { fields: mapFields } };
                  })
              }
          };
      }
      else if (typeof value === 'object' && value !== null) {
          const mapFields = {};
          for (const [k, v] of Object.entries(value)) {
              if (typeof v === 'string') mapFields[k] = { stringValue: v };
              else if (typeof v === 'number') mapFields[k] = { doubleValue: v };
          }
          firestoreData.fields[key] = { mapValue: { fields: mapFields } };
      }
    }

    const url = `https://firestore.googleapis.com/v1/projects/anjani-restaurant/databases/(default)/documents/${collection}/${id}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(firestoreData)
    });
    
    if (!res.ok) {
      console.error(`Failed to seed ${collection}/${id}: ${res.status} ${await res.text()}`);
    } else {
      console.log(`Seeded ${collection}/${id}`);
    }
  }

  // 1. Seed Owner
  await patch('users', 'owner123', {
    uid: 'owner123',
    name: 'Anjani Owner',
    phone: '+919032756266',
    role: 'owner',
    createdAt: Date.now()
  });

  // 2. Seed Delivery Partners
  await patch('users', 'rider123', {
    uid: 'rider123',
    name: 'Delivery Partner Raju',
    phone: '+919999999999',
    role: 'rider',
    isOnline: true,
    location: { lat: 17.0805, lng: 82.1355 },
    createdAt: Date.now()
  });

  // 3. Seed Customer
  await patch('users', 'customer123', {
    uid: 'customer123',
    name: 'Customer Kumar',
    phone: '+918888888888',
    role: 'customer',
    address: 'Near Street Cinema, Peddapuram',
    createdAt: Date.now()
  });

  // 4. Seed Mock Order
  await patch('orders', 'ORD-123456-MOCK', {
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
