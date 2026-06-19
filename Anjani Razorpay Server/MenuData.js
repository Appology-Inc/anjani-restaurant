}

const MenuCategories = [
  "Veg Soups",
  "Non Veg Soups",
  "Salads",
  "Tandoori Starters",
  "Veg Starters",
  "Non Veg Starters",
  "Veg Main Course",
  "Non Veg Main Course",
  "Breads",
  "Rice",
  "Veg Biryani",
  "Non Veg Biryani",
  "Fried Rice",
  "Noodles",
  "Snacks"
];

const MenuItems = [
  {
    "id": "vs1",
    "name": "Veg Manchow Soup",
    "category": "Veg Soups",
    "description": "A dark brown Chinese soup prepared with various vegetables, scallions, and thickened with broth and corn flour, topped with generous crispy fried noodles.",
    "price": 120,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vs2",
    "name": "Veg Clear Soup",
    "category": "Veg Soups",
    "description": "A delicate, restorative broth brimming with crisp, fresh vegetables and subtle aromatic herbs.",
    "price": 120,
    "isVeg": true,
    "rating": 4
  },
  {
    "id": "vs3",
    "name": "Tomato Soup",
    "category": "Veg Soups",
    "description": "Tomato soup is a smooth, flavorful soup made with ripe tomatoes, garlic, onions.",
    "price": 120,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "vs4",
    "name": "Veg Sweet Corn Soup",
    "category": "Veg Soups",
    "description": "A comforting, thick soup loaded with the goodness of sweet corn kernels and subtle oriental flavors.",
    "price": 120,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vs5",
    "name": "Veg Hot and Sour Soup",
    "category": "Veg Soups",
    "description": "A spicy, tangy and hearty bowl of soup with a perfect balance of oriental flavors and fresh vegetables.",
    "price": 120,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vs6",
    "name": "Lemon Coriander Soup",
    "category": "Veg Soups",
    "description": "A vitamin-rich, soothing clear soup flavored heavily with fresh coriander leaves and a splash of lemon juice.",
    "price": 120,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "vs7",
    "name": "Mushroom Soup",
    "category": "Veg Soups",
    "description": "A deeply comforting and flavorful bowl of mushroom soup, simmered to perfection and served piping hot.",
    "price": 120,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "nvs1",
    "name": "Chicken Hot and Sour Soup",
    "category": "Non Veg Soups",
    "description": "Chicken hot and sour soup is a flavorful, tangy soup made with tender chicken and vegetables.",
    "price": 150,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvs2",
    "name": "Chicken Manchow Soup",
    "category": "Non Veg Soups",
    "description": "Chicken manchow soup is a spicy, savory Indo Chinese soup made with tender chicken and crispy noodles.",
    "price": 150,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvs3",
    "name": "Chicken Clear Soup",
    "category": "Non Veg Soups",
    "description": "Chicken clear soup is a light, flavorful broth made with tender chicken, vegetables.",
    "price": 150,
    "isVeg": false,
    "rating": 4.1
  },
  {
    "id": "nvs4",
    "name": "Chicken Corn Soup",
    "category": "Non Veg Soups",
    "description": "Chicken corn soup is a comforting dish made with tender chicken, sweet corn.",
    "price": 150,
    "isVeg": false,
    "rating": 4.3
  },
  {
    "id": "nvs5",
    "name": "Chicken Dragon Soup",
    "category": "Non Veg Soups",
    "description": "Chicken dragon soup is a spicy, flavorful soup made with tender chicken, vegetables.",
    "price": 150,
    "isVeg": false,
    "rating": 4.4
  },
  {
    "id": "nvs6",
    "name": "Chicken Lemon Coriander Soup",
    "category": "Non Veg Soups",
    "description": "Chicken lemon coriander soup is a light, refreshing soup made with tender chicken, herbs.",
    "price": 150,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvs7",
    "name": "Mutton Hot and Sour Soup",
    "category": "Non Veg Soups",
    "description": "A spicy, tangy and hearty bowl of soup with a perfect balance of oriental flavors and fresh vegetables.",
    "price": 210,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "sd1",
    "name": "Cucumber Salad",
    "category": "Salads",
    "description": "A refreshing, crisp cucumber salad prepared with farm-fresh produce and a light, zesty dressing.",
    "price": 100,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "sd2",
    "name": "Carrot Salad",
    "category": "Salads",
    "description": "Carrot salad is a refreshing dish made with grated/sliced carrots, often mixed with herbs.",
    "price": 100,
    "isVeg": true,
    "rating": 4
  },
  {
    "id": "sd3",
    "name": "Green Salad",
    "category": "Salads",
    "description": "A refreshing, crisp green salad prepared with farm-fresh produce and a light, zesty dressing.",
    "price": 100,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "ts1",
    "name": "Tandoori Chicken",
    "category": "Tandoori Starters",
    "description": "The iconic Indian barbecue. Bone-in chicken marinated in yogurt and traditional fiery spices, roasted in a clay oven for that perfect smoky char.",
    "price": 280,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "ts2",
    "name": "Special Anjani Kabab",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of special anjani kabab, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "ts3",
    "name": "Veg Seekh Kabab",
    "category": "Tandoori Starters",
    "description": "Minced ingredients blended with aromatic spices, molded onto skewers and grilled over charcoal for a melt-in-the-mouth experience.",
    "price": 280,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "ts4",
    "name": "Paneer Tikka",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of paneer tikka, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 300,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "ts5",
    "name": "Chicken Tikka",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of chicken tikka, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 280,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "ts6",
    "name": "Hariyali Kabab [8 Pieces]",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of hariyali kabab [8 pieces], perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 280,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "ts7",
    "name": "Achari Kabab",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of achari kabab, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 280,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "ts8",
    "name": "Kalmi Kabab [4 Pieces]",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of kalmi kabab [4 pieces], perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 280,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "ts9",
    "name": "Tangdi Kabab [4 Pieces]",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of tangdi kabab [4 pieces], perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 280,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "ts10",
    "name": "Boneless Malai Kabab",
    "category": "Tandoori Starters",
    "description": "A crowd-pleasing appetizer of boneless malai kabab, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 280,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "vs_m1",
    "name": "Paneer Manchurian",
    "category": "Veg Starters",
    "description": "An addictive Indo-Chinese dish featuring perfectly crisp spheres tossed in a dark, rich, umami-packed garlic soy sauce.",
    "price": 240,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "vs_m2",
    "name": "Gobi Manchurian",
    "category": "Veg Starters",
    "description": "The ultimate Indo Chinese street food classic! Crispy cauliflower florets tossed in a tangy sauce.",
    "price": 220,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "vs_m3",
    "name": "Veg Manchurian",
    "category": "Veg Starters",
    "description": "It is all about crispy veggie balls swimming in a spicy, tangy, garlicky sauce.",
    "price": 220,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vs_m4",
    "name": "Chilli Paneer",
    "category": "Veg Starters",
    "description": "Soft paneer cubes batter-fried and tossed in a sweet, sour, and spicy chilli soy sauce with crunchy bell peppers.",
    "price": 240,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "vs_m5",
    "name": "Mushroom Manchurian",
    "category": "Veg Starters",
    "description": "An addictive Indo-Chinese dish featuring perfectly crisp spheres tossed in a dark, rich, umami-packed garlic soy sauce.",
    "price": 220,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vs_m6",
    "name": "Baby Corn Manchurian",
    "category": "Veg Starters",
    "description": "Baby corn manchurian is a popular Indo Chinese dish made with crispy fried baby corn.",
    "price": 220,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vs_m7",
    "name": "Chilli Mushroom",
    "category": "Veg Starters",
    "description": "A crowd-pleasing appetizer of chilli mushroom, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 220,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vs_m8",
    "name": "Veg 65",
    "category": "Veg Starters",
    "description": "[Veg preparation] crispy South Indian appetizer that is super popular, especially as a starter.",
    "price": 220,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vs_m9",
    "name": "Aloo 65",
    "category": "Veg Starters",
    "description": "Aloo 65 is a spicy, crispy snack made with deep fried potato cubes.",
    "price": 220,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vs_m10",
    "name": "Chilli Veg",
    "category": "Veg Starters",
    "description": "A crowd-pleasing appetizer of chilli veg, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 220,
    "isVeg": true,
    "rating": 4.1
  },
  {
    "id": "vs_m11",
    "name": "Chilli Gobi",
    "category": "Veg Starters",
    "description": "Chilli gobi is a spicy, crispy dish made with battered cauliflower florets tossed in chilli sauce.",
    "price": 220,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vs_m12",
    "name": "Gobi 65",
    "category": "Veg Starters",
    "description": "[Veg preparation] It is basically the cauliflower twist on the classic chicken 65.",
    "price": 220,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vs_m13",
    "name": "Veg Hong Kong",
    "category": "Veg Starters",
    "description": "A crowd-pleasing appetizer of veg hong kong, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 220,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vs_m14",
    "name": "Baby Corn 65",
    "category": "Veg Starters",
    "description": "Baby corn 65 is a crispy, spicy snack made with baby corn pieces.",
    "price": 220,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vs_m15",
    "name": "Chilli Baby Corn",
    "category": "Veg Starters",
    "description": "A crowd-pleasing appetizer of chilli baby corn, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 220,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vs_m16",
    "name": "Mushroom 65",
    "category": "Veg Starters",
    "description": "A crowd-pleasing appetizer of mushroom 65, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 220,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vs_m17",
    "name": "Paneer 65",
    "category": "Veg Starters",
    "description": "A crowd-pleasing appetizer of paneer 65, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 240,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "nvs_c1",
    "name": "Chicken Lollipop [6 Pieces]",
    "category": "Non Veg Starters",
    "description": "A universally loved appetizer featuring tender chicken winglets shaped into lollipops, coated in a spicy red batter and deep-fried to crispy perfection.",
    "price": 320,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvs_c2",
    "name": "Chicken Drumstick [6 Pieces]",
    "category": "Non Veg Starters",
    "description": "Chicken drumsticks are flavorful, marinated chicken legs, typically grilled/baked to a crispy golden finish.",
    "price": 320,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvs_c3",
    "name": "Chicken Majestic",
    "category": "Non Veg Starters",
    "description": "Spicy, tangy and super addictive. Highly popular South Indian starter.",
    "price": 320,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvs_c4",
    "name": "Chilli Fish",
    "category": "Non Veg Starters",
    "description": "Indo Chinese starter where fish pieces are battered and tossed in spicy sauces.",
    "price": 370,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvs_c5",
    "name": "Chicken 555",
    "category": "Non Veg Starters",
    "description": "Spicy, crispy fried chicken dish, marinated in a flavorful blend of sauces.",
    "price": 320,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvs_c6",
    "name": "Chilli Egg",
    "category": "Non Veg Starters",
    "description": "Spicy, tangy dish made with boiled eggs cooked in chinese sauces.",
    "price": 320,
    "isVeg": false,
    "rating": 4.2
  },
  {
    "id": "nvs_c7",
    "name": "Egg 65",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of egg 65, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.3
  },
  {
    "id": "nvs_c8",
    "name": "Egg Manchurian",
    "category": "Non Veg Starters",
    "description": "An addictive Indo-Chinese dish featuring perfectly crisp spheres tossed in a dark, rich, umami-packed garlic soy sauce.",
    "price": 320,
    "isVeg": false,
    "rating": 4.2
  },
  {
    "id": "nvs_c9",
    "name": "Chicken 65",
    "category": "Non Veg Starters",
    "description": "Spicy, crispy fried chicken dish marinated in a blend of South Indian spices.",
    "price": 320,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvs_c10",
    "name": "Chicken Manchurian",
    "category": "Non Veg Starters",
    "description": "Popular Indo Chinese dish made with crispy chicken pieces.",
    "price": 320,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvs_c11",
    "name": "Chilli Chicken",
    "category": "Non Veg Starters",
    "description": "Spicy, savory dish made with crispy fried chicken pieces.",
    "price": 320,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvs_c12",
    "name": "Hong Kong Chicken",
    "category": "Non Veg Starters",
    "description": "Boneless fried chicken tossed in a thick, spicy, tangy sauce, made with soy.",
    "price": 320,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvs_c13",
    "name": "Chicken Fry",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of chicken fry, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvs_c14",
    "name": "Chicken Wings [10 Pieces]",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of chicken wings [10 pieces], perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvs_c15",
    "name": "Pepper Chicken",
    "category": "Non Veg Starters",
    "description": "Dry and spicy South Indian style pepper chicken, heavily spiced with black pepper.",
    "price": 320,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvs_c16",
    "name": "Lemon Chicken",
    "category": "Non Veg Starters",
    "description": "Boneless fried chicken tossed in a sweet, sour and slightly spicy lemon sauce.",
    "price": 320,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvs_c17",
    "name": "Dragon Chicken",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of dragon chicken, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvs_c18",
    "name": "Garlic Chicken",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of garlic chicken, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.4
  },
  {
    "id": "nvs_c19",
    "name": "Chicken Roast",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of chicken roast, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvs_c20",
    "name": "Mangoli Chicken",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of mangoli chicken, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.3
  },
  {
    "id": "nvs_c21",
    "name": "Chicken Guljara",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of chicken guljara, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 320,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvs_c22",
    "name": "Mutton Roast",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of mutton roast, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 380,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvs_c23",
    "name": "Pepper Mutton",
    "category": "Non Veg Starters",
    "description": "Cooked with black pepper, along with aromatic spices, giving it a bold flavor.",
    "price": 380,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "nvs_c24",
    "name": "Chilli Mutton",
    "category": "Non Veg Starters",
    "description": "A crowd-pleasing appetizer of chilli mutton, perfectly seasoned and prepared for maximum crunch and flavor.",
    "price": 380,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvs_c25",
    "name": "Prawns Fry",
    "category": "Non Veg Starters",
    "description": "Prawns are marinated in a mix of spices and herbs, then fried until golden.",
    "price": 370,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvs_c26",
    "name": "Chilli Prawns",
    "category": "Non Veg Starters",
    "description": "Ultimate Indo Chinese starter, juicy prawns, crispy on the outside.",
    "price": 370,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvs_c27",
    "name": "Loose Prawns",
    "category": "Non Veg Starters",
    "description": "Spicy, juicy, street style South Indian dish that is a total flavor explosion.",
    "price": 370,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "nvs_c28",
    "name": "Prawns 65",
    "category": "Non Veg Starters",
    "description": "Spicy, crispy South Indian dream of seafood lovers. It is fiery, crunchy.",
    "price": 370,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvs_c29",
    "name": "Prawns Manchurian",
    "category": "Non Veg Starters",
    "description": "Perfect Indo Chinese dish where crispy prawns meet that classic spicy, tangy sauce.",
    "price": 370,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "vmc1",
    "name": "Paneer Butter Masala",
    "category": "Veg Main Course",
    "description": "Paneer butter masala is a rich, creamy dish made with soft paneer cubes cooked in tomato gravy.",
    "price": 260,
    "isVeg": true,
    "rating": 4.8
  },
  {
    "id": "vmc2",
    "name": "Kaju Tomato",
    "category": "Veg Main Course",
    "description": "Rich premium whole cashew nuts roasted and simmered to perfection.",
    "price": 270,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "vmc3",
    "name": "Palak Paneer",
    "category": "Veg Main Course",
    "description": "A healthy, vibrant classic. Fresh spinach puréed with aromatic spices, cooked with soft cubes of cottage cheese.",
    "price": 260,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "vmc4",
    "name": "Malai Kofta",
    "category": "Veg Main Course",
    "description": "Our signature malai kofta, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "vmc5",
    "name": "Kadai Paneer",
    "category": "Veg Main Course",
    "description": "Kadai paneer is a flavorful dish made with paneer cubes cooked in a spicy kadai masala.",
    "price": 260,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "vmc6",
    "name": "Kaju Masala",
    "category": "Veg Main Course",
    "description": "Kaju masala is a rich, flavorful dish made with cashew nuts cooked in a creamy gravy.",
    "price": 270,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "vmc7",
    "name": "Veg Manchurian Gravy",
    "category": "Veg Main Course",
    "description": "An addictive Indo-Chinese dish featuring perfectly crisp spheres tossed in a dark, rich, umami-packed garlic soy sauce.",
    "price": 240,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vmc8",
    "name": "Plain Palak",
    "category": "Veg Main Course",
    "description": "Our signature plain palak, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.1
  },
  {
    "id": "vmc9",
    "name": "Green Peas Masala",
    "category": "Veg Main Course",
    "description": "Green peas masala is a flavorful curry made with tender green peas cooked in masala onion tomato gravy.",
    "price": 240,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vmc10",
    "name": "Capsicum Masala",
    "category": "Veg Main Course",
    "description": "Capsicum masala is a flavorful dish made with bell peppers cooked in a rich onion tomato paste.",
    "price": 240,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vmc11",
    "name": "Veg Do Pyaaza",
    "category": "Veg Main Course",
    "description": "Our signature veg do pyaaza, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vmc12",
    "name": "Mixed Veg Curry",
    "category": "Veg Main Course",
    "description": "Mixed veg curry is a hearty dish made with a variety of vegetables cooked together.",
    "price": 240,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vmc13",
    "name": "Paneer Tomato",
    "category": "Veg Main Course",
    "description": "Our signature paneer tomato, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 260,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vmc14",
    "name": "Veg Ginger",
    "category": "Veg Main Course",
    "description": "Our signature veg ginger, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.1
  },
  {
    "id": "vmc15",
    "name": "Veg Kolhapuri",
    "category": "Veg Main Course",
    "description": "Veg Kolhapuri is a spicy, flavorful curry made with mixed vegetables cooked in Kolhapuri style.",
    "price": 240,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vmc16",
    "name": "Veg Kundan Kasa",
    "category": "Veg Main Course",
    "description": "Our signature veg kundan kasa, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vmc17",
    "name": "Paneer Shahi Korma",
    "category": "Veg Main Course",
    "description": "Our signature paneer shahi korma, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 260,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "vmc18",
    "name": "Hyderabadi Veg Curry",
    "category": "Veg Main Course",
    "description": "Our signature hyderabadi veg curry, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vmc19",
    "name": "Mushroom Masala",
    "category": "Veg Main Course",
    "description": "Our signature mushroom masala, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vmc20",
    "name": "Kadai Mushroom",
    "category": "Veg Main Course",
    "description": "Our signature kadai mushroom, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "vmc21",
    "name": "Methi Chaman",
    "category": "Veg Main Course",
    "description": "[Veg preparation] Methi chaman is a traditional Indian dish made with fenugreek leaves and paneer.",
    "price": 240,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "vmc22",
    "name": "Kaju Mushroom",
    "category": "Veg Main Course",
    "description": "Our signature kaju mushroom, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 270,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "vmc23",
    "name": "Paneer Tikka Masala",
    "category": "Veg Main Course",
    "description": "Tender marinated chunks roasted in a tandoor, then folded into a creamy, spiced, vibrant tomato-based curry.",
    "price": 260,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "vmc24",
    "name": "Tomato Curry",
    "category": "Veg Main Course",
    "description": "Our signature tomato curry, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 240,
    "isVeg": true,
    "rating": 4.1
  },
  {
    "id": "vmc25",
    "name": "Kaju Capsicum",
    "category": "Veg Main Course",
    "description": "Rich premium whole cashew nuts roasted and simmered to perfection.",
    "price": 270,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "vmc26",
    "name": "Kaju Paneer",
    "category": "Veg Main Course",
    "description": "Our signature kaju paneer, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 290,
    "isVeg": true,
    "rating": 4.8
  },
  {
    "id": "vmc27",
    "name": "Kaju Curry",
    "category": "Veg Main Course",
    "description": "Rich premium whole cashew nuts roasted and simmered to perfection.",
    "price": 270,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "nvmc1",
    "name": "Boneless Chicken Curry",
    "category": "Non Veg Main Course",
    "description": "Boneless chicken curry features tender boneless chicken pieces cooked in a rich, spiced Indian gravy.",
    "price": 340,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvmc2",
    "name": "Butter Chicken",
    "category": "Non Veg Main Course",
    "description": "Butter chicken is a rich, creamy dish made with tender chicken cooked in butter and smooth gravy.",
    "price": 340,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "nvmc3",
    "name": "Andhra Chicken Curry",
    "category": "Non Veg Main Course",
    "description": "Andhra chicken curry is a spicy, flavorful dish made with tender chicken cooked in authentic Andhra style.",
    "price": 340,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvmc4",
    "name": "Chicken Manchurian Gravy",
    "category": "Non Veg Main Course",
    "description": "An addictive Indo-Chinese dish featuring perfectly crisp spheres tossed in a dark, rich, umami-packed garlic soy sauce.",
    "price": 340,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvmc5",
    "name": "Punjabi Chicken",
    "category": "Non Veg Main Course",
    "description": "Our signature punjabi chicken, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvmc6",
    "name": "Chicken Masala",
    "category": "Non Veg Main Course",
    "description": "Our signature chicken masala, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvmc7",
    "name": "Chicken Hyderabadi",
    "category": "Non Veg Main Course",
    "description": "Chicken Hyderabadi is a flavorful, spicy dish featuring marinated chicken cooked with aromatic green paste.",
    "price": 340,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvmc8",
    "name": "Methi Chicken",
    "category": "Non Veg Main Course",
    "description": "Our signature methi chicken, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvmc9",
    "name": "Chicken Rogan Josh",
    "category": "Non Veg Main Course",
    "description": "Our signature chicken rogan josh, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvmc10",
    "name": "Chicken Mughlai",
    "category": "Non Veg Main Course",
    "description": "Our signature chicken mughlai, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvmc11",
    "name": "Kadai Chicken",
    "category": "Non Veg Main Course",
    "description": "Our signature kadai chicken, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvmc12",
    "name": "Chicken Kolhapuri",
    "category": "Non Veg Main Course",
    "description": "Our signature chicken kolhapuri, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvmc13",
    "name": "Chicken Patiala",
    "category": "Non Veg Main Course",
    "description": "Our signature chicken patiala, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvmc14",
    "name": "Chicken Noorani",
    "category": "Non Veg Main Course",
    "description": "Our signature chicken noorani, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvmc15",
    "name": "Special Chicken Curry",
    "category": "Non Veg Main Course",
    "description": "Our signature special chicken curry, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 380,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvmc16",
    "name": "Chicken Maharani",
    "category": "Non Veg Main Course",
    "description": "Our signature chicken maharani, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvmc17",
    "name": "Chicken Tikka Masala",
    "category": "Non Veg Main Course",
    "description": "Tender marinated chunks roasted in a tandoor, then folded into a creamy, spiced, vibrant tomato-based curry.",
    "price": 340,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvmc18",
    "name": "Kaju Chicken Curry",
    "category": "Non Veg Main Course",
    "description": "Kaju chicken curry is a flavorful dish featuring tender chicken cooked in a rich cashew gravy.",
    "price": 370,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvmc19",
    "name": "Andhra Fish Curry",
    "category": "Non Veg Main Course",
    "description": "Andhra Fish Curry is a spicy, tangy dish made with tender fish cooked in a tamarind base.",
    "price": 390,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvmc20",
    "name": "Afghani Chicken",
    "category": "Non Veg Main Course",
    "description": "Our signature afghani chicken, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 340,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvmc21",
    "name": "Mutton Masala",
    "category": "Non Veg Main Course",
    "description": "Our signature mutton masala, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 400,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvmc22",
    "name": "Mutton Rogan Josh",
    "category": "Non Veg Main Course",
    "description": "Our signature mutton rogan josh, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 400,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvmc23",
    "name": "Mutton Curry",
    "category": "Non Veg Main Course",
    "description": "Mutton curry is a rich, flavorful dish made with tender pieces of mutton slow cooked.",
    "price": 400,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "nvmc24",
    "name": "Mutton Keema Masala",
    "category": "Non Veg Main Course",
    "description": "Our signature mutton keema masala, slowly cooked in a rich, complex blend of aromatic house spices to pair perfectly with breads or rice.",
    "price": 400,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvmc25",
    "name": "Fish Curry",
    "category": "Non Veg Main Course",
    "description": "Fish curry is a flavorful dish made with tender fish pieces cooked in a traditional spiced gravy.",
    "price": 390,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvmc26",
    "name": "Boneless Fish Masala",
    "category": "Non Veg Main Course",
    "description": "Boneless fish masala is a flavorful dish made with tender boneless fish cooked in thick gravy.",
    "price": 390,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvmc27",
    "name": "Prawns Curry",
    "category": "Non Veg Main Course",
    "description": "Fresh premium prawns sautéed and infused with intense flavorful secret spice blends.",
    "price": 390,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "brd1",
    "name": "Phulka",
    "category": "Breads",
    "description": "Freshly baked phulka, soft on the inside and perfectly blistered on the outside.",
    "price": 20,
    "isVeg": true,
    "rating": 4
  },
  {
    "id": "brd2",
    "name": "Roti",
    "category": "Breads",
    "description": "Freshly baked roti, soft on the inside and perfectly blistered on the outside.",
    "price": 30,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "brd3",
    "name": "Plain Naan",
    "category": "Breads",
    "description": "Freshly baked plain naan, soft on the inside and perfectly blistered on the outside.",
    "price": 50,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "brd4",
    "name": "Butter Roti",
    "category": "Breads",
    "description": "Butter roti is a soft, warm Indian flatbread made from whole wheat flour and topped with butter.",
    "price": 40,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "brd5",
    "name": "Butter Naan",
    "category": "Breads",
    "description": "Butter naan is a soft, fluffy Indian flatbread, baked in a tandoor and brushed with melted butter.",
    "price": 60,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "brd6",
    "name": "Laccha Parotta",
    "category": "Breads",
    "description": "Freshly baked laccha parotta, soft on the inside and perfectly blistered on the outside.",
    "price": 50,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "brd7",
    "name": "Butter Parotta",
    "category": "Breads",
    "description": "Freshly baked butter parotta, soft on the inside and perfectly blistered on the outside.",
    "price": 60,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "brd8",
    "name": "Aloo Parotta",
    "category": "Breads",
    "description": "Freshly baked aloo parotta, soft on the inside and perfectly blistered on the outside.",
    "price": 50,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "brd9",
    "name": "Garlic Naan",
    "category": "Breads",
    "description": "Tandoor-baked flatbread infused with freshly minced garlic and coriander, finished with a glaze of butter.",
    "price": 60,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "brd10",
    "name": "Plain Kulcha",
    "category": "Breads",
    "description": "Freshly baked plain kulcha, soft on the inside and perfectly blistered on the outside.",
    "price": 50,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "brd11",
    "name": "Pudina Parotta",
    "category": "Breads",
    "description": "Freshly baked pudina parotta, soft on the inside and perfectly blistered on the outside.",
    "price": 50,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "brd12",
    "name": "Methi Parotta",
    "category": "Breads",
    "description": "Freshly baked methi parotta, soft on the inside and perfectly blistered on the outside.",
    "price": 50,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "brd13",
    "name": "Kashmiri Naan",
    "category": "Breads",
    "description": "Freshly baked kashmiri naan, soft on the inside and perfectly blistered on the outside.",
    "price": 90,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "brd14",
    "name": "Punjabi Naan",
    "category": "Breads",
    "description": "Freshly baked punjabi naan, soft on the inside and perfectly blistered on the outside.",
    "price": 90,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "brd15",
    "name": "Chicken Keema Naan",
    "category": "Breads",
    "description": "Freshly baked chicken keema naan, soft on the inside and perfectly blistered on the outside.",
    "price": 140,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "brd16",
    "name": "Mutton Keema Naan",
    "category": "Breads",
    "description": "Mutton keema naan is a stuffed flatbread filled with spiced minced mutton, baked in clay oven.",
    "price": 140,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "rc1",
    "name": "Veg Pulao",
    "category": "Rice",
    "description": "Veg pulao is a fragrant rice dish made with mixed vegetables, basmati rice, and basic spices.",
    "price": 150,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "rc2",
    "name": "Biryani Rice",
    "category": "Rice",
    "description": "[Veg preparation] Plain aromatic long grain basmati rice cooked with subtle biryani spices.",
    "price": 150,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "rc3",
    "name": "Curd Rice",
    "category": "Rice",
    "description": "Curd rice is a soothing South Indian dish made with cooked rice mixed with yogurt and tempered.",
    "price": 150,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "rc4",
    "name": "Jeera Rice",
    "category": "Rice",
    "description": "An incredibly fragrant, expertly prepared portion of jeera rice, promising an explosion of flavors in every bite.",
    "price": 150,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "vb1",
    "name": "Mushroom Biryani",
    "category": "Veg Biryani",
    "description": "[Veg preparation] Earthy, umami packed biryani with meaty mushroom pieces.",
    "price": 260,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vb2",
    "name": "Special Kaju Paneer Biryani",
    "category": "Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of special kaju paneer biryani, promising an explosion of flavors in every bite.",
    "price": 350,
    "isVeg": true,
    "rating": 4.8
  },
  {
    "id": "vb3",
    "name": "Paneer Biryani",
    "category": "Veg Biryani",
    "description": "Paneer biryani is a flavorful veg dish made with marinated paneer cubes, aromatic basmati rice.",
    "price": 280,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "vb4",
    "name": "Veg Biryani",
    "category": "Veg Biryani",
    "description": "Aromatic basmati rice layered with spiced vegetables, herbs, cooked on dum.",
    "price": 260,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "vb5",
    "name": "Special Veg Biryani",
    "category": "Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of special veg biryani, promising an explosion of flavors in every bite.",
    "price": 300,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "vb6",
    "name": "Kaju Biryani",
    "category": "Veg Biryani",
    "description": "A rich, flavorful and super indulgent biryani where roasted cashews are the star ingredient.",
    "price": 290,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "vb7",
    "name": "Special Kaju Mushroom Biryani",
    "category": "Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of special kaju mushroom biryani, promising an explosion of flavors in every bite.",
    "price": 330,
    "isVeg": true,
    "rating": 4.7
  },
  {
    "id": "nvb1",
    "name": "Chicken Dum Biryani",
    "category": "Non Veg Biryani",
    "description": "Chicken dum biryani is a slow cooked, flavorful dish with marinated chicken and layered long grain rice.",
    "price": 360,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "nvb2",
    "name": "Chicken Fry Piece Biryani",
    "category": "Non Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of chicken fry piece biryani, promising an explosion of flavors in every bite.",
    "price": 360,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvb3",
    "name": "Special Chicken Biryani",
    "category": "Non Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of special chicken biryani, promising an explosion of flavors in every bite.",
    "price": 400,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "nvb4",
    "name": "Chicken Mughlai Biryani",
    "category": "Non Veg Biryani",
    "description": "Chicken Mughlai biryani is a rich, aromatic dish with tender chicken, basmati rice and rich egg cream topping.",
    "price": 360,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvb5",
    "name": "Chicken Tandoori Biryani",
    "category": "Non Veg Biryani",
    "description": "Chicken tandoori biryani combines flavorful, marinated tandoori chicken with aromatic basmati rice.",
    "price": 360,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvb6",
    "name": "Fish Biryani",
    "category": "Non Veg Biryani",
    "description": "Fish biryani is a fragrant rice dish made with tender fish pieces, marinated in herbs.",
    "price": 410,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvb7",
    "name": "Prawns Biryani",
    "category": "Non Veg Biryani",
    "description": "Prawns biryani is a flavorful and aromatic rice dish made with prawns and traditional spices.",
    "price": 410,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvb8",
    "name": "Special Mutton Biryani",
    "category": "Non Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of special mutton biryani, promising an explosion of flavors in every bite.",
    "price": 460,
    "isVeg": false,
    "rating": 4.9
  },
  {
    "id": "nvb9",
    "name": "Chicken Joint Biryani",
    "category": "Non Veg Biryani",
    "description": "Chicken joint biryani is a flavorful dish featuring tender chicken pieces, marinated and cooked uniquely.",
    "price": 360,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nvb10",
    "name": "Chicken Wings Biryani",
    "category": "Non Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of chicken wings biryani, promising an explosion of flavors in every bite.",
    "price": 360,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "nvb11",
    "name": "Chicken Fry Piece Mughlai Biryani",
    "category": "Non Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of chicken fry piece mughlai biryani, promising an explosion of flavors in every bite.",
    "price": 360,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nvb12",
    "name": "Chicken Tikka Biryani",
    "category": "Non Veg Biryani",
    "description": "Chicken tikka biryani is where two legends meet: smoky, spiced chicken tikka and aromatic basmati rice.",
    "price": 360,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvb13",
    "name": "Mutton Biryani",
    "category": "Non Veg Biryani",
    "description": "An incredibly fragrant, expertly prepared portion of mutton biryani, promising an explosion of flavors in every bite.",
    "price": 420,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvb14",
    "name": "Mutton Mughlai Biryani",
    "category": "Non Veg Biryani",
    "description": "Mutton Mughlai biryani is royal, rich, creamy, aromatic and loaded with bold spices.",
    "price": 420,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "nvb15",
    "name": "Mutton Keema Biryani",
    "category": "Non Veg Biryani",
    "description": "A spiced and flavorful biryani made with minced mutton, cooked with aromatic basmati rice.",
    "price": 420,
    "isVeg": false,
    "rating": 4.8
  },
  {
    "id": "fr1",
    "name": "Chicken Fried Rice",
    "category": "Fried Rice",
    "description": "Chicken fried rice is a flavorful dish made with stir fried rice, tender chicken cubes, and mixed greens.",
    "price": 200,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "fr2",
    "name": "Special Veg Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 240,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "fr3",
    "name": "Special Chicken Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 240,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "fr4",
    "name": "Egg Fried Rice",
    "category": "Fried Rice",
    "description": "Egg fried rice is a savory dish made with stir fried rice, scrambled eggs, and soy sauce.",
    "price": 200,
    "isVeg": false,
    "rating": 4.3
  },
  {
    "id": "fr5",
    "name": "Veg Fried Rice",
    "category": "Fried Rice",
    "description": "Veg fried Rice is a flavorful dish made with stir fried rice, mixed vegetables, and condiments.",
    "price": 200,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "fr6",
    "name": "Schezwan Egg Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 200,
    "isVeg": false,
    "rating": 4.3
  },
  {
    "id": "fr7",
    "name": "Mixed Veg Fried Rice",
    "category": "Fried Rice",
    "description": "Mixed veg fried rice is a savory dish made with stir fried rice and seasonal fresh vegetables.",
    "price": 200,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "fr8",
    "name": "Paneer Fried Rice",
    "category": "Fried Rice",
    "description": "Paneer fried rice is a flavorful dish made with stir fried rice, cubes of paneer, and sauces.",
    "price": 220,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "fr9",
    "name": "Mushroom Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 200,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "fr10",
    "name": "Special Paneer Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 260,
    "isVeg": true,
    "rating": 4.6
  },
  {
    "id": "fr11",
    "name": "Special Mushroom Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 240,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "fr12",
    "name": "Kaju Paneer Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 250,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "fr13",
    "name": "Kaju Mushroom Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 230,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "fr14",
    "name": "Chicken Fry Piece Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 200,
    "isVeg": false,
    "rating": 4.5
  },
  {
    "id": "fr15",
    "name": "Schezwan Chicken Fried Rice",
    "category": "Fried Rice",
    "description": "Wok-tossed long-grain rice stir-fried on high flame with crisp vegetables, soy sauce, and aromatic oriental seasoning.",
    "price": 200,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "fr16",
    "name": "Prawns Fried Rice",
    "category": "Fried Rice",
    "description": "Fresh premium prawns sautéed and infused with intense flavorful secret spice blends.",
    "price": 250,
    "isVeg": false,
    "rating": 4.7
  },
  {
    "id": "nd1",
    "name": "Chicken Soft Noodles",
    "category": "Noodles",
    "description": "Chicken soft noodles is a delicious dish with tender, stir fried noodles, succulent chicken, and veggies.",
    "price": 200,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nd2",
    "name": "Veg Soft Noodles",
    "category": "Noodles",
    "description": "A delicious and expertly prepared serving of Veg Soft Noodles, crafted using the finest ingredients and authentic recipes.",
    "price": 200,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "nd3",
    "name": "Egg Soft Noodles",
    "category": "Noodles",
    "description": "Egg soft noodles are tender, stir fried noodles cooked with scrambled eggs, vegetables.",
    "price": 200,
    "isVeg": false,
    "rating": 4.3
  },
  {
    "id": "nd4",
    "name": "Paneer Soft Noodles",
    "category": "Noodles",
    "description": "Paneer soft noodles is a flavorful dish with tender noodles stir fried with golden paneer cubes.",
    "price": 220,
    "isVeg": true,
    "rating": 4.5
  },
  {
    "id": "nd5",
    "name": "Schezwan Chicken Noodles",
    "category": "Noodles",
    "description": "Schezwan chicken noodles is a spicy, tangy dish made with stir fried noodles, shredded chicken.",
    "price": 200,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "nd6",
    "name": "Chicken Hakka Noodles",
    "category": "Noodles",
    "description": "Thin, springy noodles tossed in a hot wok with shredded vegetables, soy sauce, and a hint of white pepper.",
    "price": 200,
    "isVeg": false,
    "rating": 4.6
  },
  {
    "id": "snk1",
    "name": "American Corn Dry",
    "category": "Snacks",
    "description": "American corn dry is a savory snack made with corn kernels sautéed in mild spices.",
    "price": 120,
    "isVeg": true,
    "rating": 4.2
  },
  {
    "id": "snk2",
    "name": "Kaju Fry",
    "category": "Snacks",
    "description": "Kaju fry is a delicious snack made by roasting cashew nuts with a touch of ghee and spice.",
    "price": 150,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "snk3",
    "name": "Masala Kulcha",
    "category": "Snacks",
    "description": "A delicious and expertly prepared serving of Masala Kulcha, crafted using the finest ingredients and authentic recipes.",
    "price": 60,
    "isVeg": true,
    "rating": 4.3
  },
  {
    "id": "snk4",
    "name": "Paneer Kulcha",
    "category": "Snacks",
    "description": "A delicious and expertly prepared serving of Paneer Kulcha, crafted using the finest ingredients and authentic recipes.",
    "price": 50,
    "isVeg": true,
    "rating": 4.4
  },
  {
    "id": "snk5",
    "name": "Omelette",
    "category": "Snacks",
    "description": "A delicious and expertly prepared serving of Omelette, crafted using the finest ingredients and authentic recipes.",
    "price": 120,
    "isVeg": false,
    "rating": 4.2
  },
  {
    "id": "snk6",
    "name": "Mutton Keema Balls",
    "category": "Snacks",
    "description": "A delicious and expertly prepared serving of Mutton Keema Balls, crafted using the finest ingredients and authentic recipes.",
    "price": 180,
    "isVeg": false,
    "rating": 4.7
  }
];
module.exports = { MenuItems, MenuCategories };
