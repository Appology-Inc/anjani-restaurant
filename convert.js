const fs = require('fs');
const path = require('fs');

const filePath = '/Users/rajasekharrapaka/.gemini/antigravity/scratch/AnjaniDeliveryApp/app/src/main/java/com/example/anjanirestaurant/data/MenuData.kt';
const content = fs.readFileSync(filePath, 'utf8');

// Parse MenuItem(...) rows
const regex = /MenuItem\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]*)"\s*,\s*([\d.]+)\s*,\s*"([^"]+)"\s*,\s*(true|false)\s*,\s*([\d.]+)\s*\)/g;

let match;
const items = [];
const categoriesSet = new Set();

while ((match = regex.exec(content)) !== null) {
    const [_, id, name, category, description, price, imageUrl, isVeg, rating] = match;
    items.push({
        id,
        name,
        category,
        description,
        price: parseFloat(price),
        imageUrl,
        isVeg: isVeg === 'true',
        rating: parseFloat(rating)
    });
    categoriesSet.add(category);
}

const categories = Array.from(categoriesSet);

const output = `export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl: string;
  isVeg: boolean;
  rating: number;
}

export const MenuCategories = ${JSON.stringify(categories, null, 2)};

export const MenuItems: MenuItem[] = ${JSON.stringify(items, null, 2)};
`;

fs.writeFileSync('/Users/rajasekharrapaka/.gemini/antigravity/scratch/AnjaniDeliveryAppExpo/src/data/MenuData.ts', output);
console.log('Successfully wrote MenuData.ts with ' + items.length + ' items');
