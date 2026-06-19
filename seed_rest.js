const fs = require('fs');

async function seed() {
  const tsContent = fs.readFileSync('Anjani Restaurant/src/data/MenuData.ts', 'utf8');
  
  // Extract the MenuItems array
  const itemsMatch = tsContent.match(/export const MenuItems[^=]*=\s*(\[[\s\S]*?\]);/);
  if (!itemsMatch) {
    console.error("Could not find MenuItems array in MenuData.ts");
    return;
  }
  
  let menuItemsStr = itemsMatch[1];
  
  // Clean up any potential JS keys to valid JSON (though it looks like it already uses double quotes for keys in most of it, wait, some might not)
  // The file provided had keys like "id": "vs1", so it's already mostly valid JSON.
  // Actually, we can just use `eval` securely since we control the file.
  
  let MenuItems;
  try {
    eval('MenuItems = ' + menuItemsStr);
  } catch (e) {
    console.error("Failed to parse MenuItems", e);
    return;
  }

  console.log(`Found ${MenuItems.length} items. Seeding to Firestore...`);

  let count = 0;
  for (const item of MenuItems) {
    const firestoreData = { fields: {} };
    for (const [key, value] of Object.entries(item)) {
      if (typeof value === 'string') firestoreData.fields[key] = { stringValue: value };
      else if (typeof value === 'number') firestoreData.fields[key] = { doubleValue: value };
      else if (typeof value === 'boolean') firestoreData.fields[key] = { booleanValue: value };
    }

    const url = `https://firestore.googleapis.com/v1/projects/anjani-restaurant/databases/(default)/documents/menu/${item.id}`;
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firestoreData)
      });
      
      if (!res.ok) {
        console.error(`Failed to seed ${item.id}: ${res.status} ${await res.text()}`);
      } else {
        count++;
        if (count % 10 === 0) console.log(`Seeded ${count} items...`);
      }
    } catch (e) {
      console.error(`Error seeding ${item.id}:`, e);
    }
  }

  console.log("Menu seeding complete!");
}

seed().catch(console.error);
