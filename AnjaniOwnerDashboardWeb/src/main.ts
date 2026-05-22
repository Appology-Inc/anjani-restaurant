import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { MenuItems as InitialMenuItems, MenuCategories } from './menuData';

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDgZbCT3tliCLwY5KwfgkuDuFeW9qSdoeQ",
  authDomain: "anjani-restaurant.firebaseapp.com",
  projectId: "anjani-restaurant",
  storageBucket: "anjani-restaurant.firebasestorage.app",
  messagingSenderId: "560562817811",
  appId: "1:560562817811:web:a445988d46f47542ed28e6",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Application State ---
let systemOrders: any[] = [];
let menuItems: any[] = [...InitialMenuItems];
let searchQuery = '';
let activeCategory = 'All';

// --- DOM Elements ---
const el = {
  clock: document.getElementById('live-clock')!,
  connStatus: document.getElementById('connection-status')!,
  metrics: {
    revenue: document.getElementById('metric-revenue')!,
    activeOrders: document.getElementById('metric-active-orders')!,
    liveDeliveries: document.getElementById('metric-live-deliveries')!,
    menuItems: document.getElementById('metric-menu-items')!
  },
  tabs: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  kanban: {
    incoming: document.getElementById('list-incoming')!,
    preparing: document.getElementById('list-preparing')!,
    delivering: document.getElementById('list-delivering')!,
    countIncoming: document.getElementById('count-incoming')!,
    countPreparing: document.getElementById('count-preparing')!,
    countDelivering: document.getElementById('count-delivering')!
  },
  menuGrid: document.getElementById('menu-grid')!,
  categoryFilters: document.getElementById('category-filters')!,
  searchInput: document.getElementById('menu-search') as HTMLInputElement,
  editModal: document.getElementById('edit-modal')!,
  confirmModal: document.getElementById('confirm-modal')!,
  loginOverlay: document.getElementById('login-overlay')!,
  logoutBtn: document.getElementById('logout-btn')!,
  loginBtn: document.getElementById('login-btn')!,
  loginEmail: document.getElementById('login-email') as HTMLInputElement,
  loginPassword: document.getElementById('login-password') as HTMLInputElement,
  loginError: document.getElementById('login-error')!,
  // Form elements
  editId: document.getElementById('edit-id') as HTMLInputElement,
  editName: document.getElementById('edit-name') as HTMLInputElement,
  editDesc: document.getElementById('edit-description') as HTMLTextAreaElement,
  editPrice: document.getElementById('edit-price') as HTMLInputElement,
  editAvail: document.getElementById('edit-available') as HTMLInputElement,
};

// --- Utilities ---
function formatCurrency(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}

function updateClock() {
  const now = new Date();
  el.clock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
}
setInterval(updateClock, 1000);
updateClock();

// Tab Switching
el.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    el.tabs.forEach(t => t.classList.remove('active'));
    el.tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.getAttribute('data-tab')}`)!.classList.add('active');
  });
});

// Search
el.searchInput.addEventListener('input', (e) => {
  searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
  renderMenu();
});

// --- Firebase Listeners ---
let unsubOrders: any = null;
let unsubMenu: any = null;

function initFirestoreSync() {
  const ordersRef = collection(db, 'orders');
  unsubOrders = onSnapshot(ordersRef, (snapshot) => {
    systemOrders = [];
    snapshot.forEach((doc) => {
      systemOrders.push(doc.data());
    });
    el.connStatus.className = 'connection-status connected';
    el.connStatus.querySelector('.text')!.textContent = 'Firebase Live';
    renderDashboard();
  }, (error) => {
    console.warn("Firestore orders read error:", error);
    el.connStatus.className = 'connection-status disconnected';
    el.connStatus.querySelector('.text')!.textContent = 'Offline/Unauthorized';
    seedDemoOrders();
  });

  const menuRef = collection(db, 'menu');
  unsubMenu = onSnapshot(menuRef, (snapshot) => {
    const updates: any = {};
    snapshot.forEach(doc => { updates[doc.id] = doc.data(); });
    
    menuItems = InitialMenuItems.map(item => {
      const u = updates[item.id];
      if (u) {
        return {
          ...item,
          name: u.name !== undefined ? u.name : item.name,
          description: u.description !== undefined ? u.description : item.description,
          price: u.price !== undefined ? u.price : item.price,
          isAvailable: u.isAvailable !== undefined ? u.isAvailable : item.isAvailable,
          isDeleted: u.isDeleted !== undefined ? u.isDeleted : item.isDeleted,
        };
      }
      return item;
    }).filter(item => !item.isDeleted);
    
    renderMenu();
  }, (error) => {
    console.warn("Firestore menu sync error:", error);
    renderMenu();
  });
}

function seedDemoOrders() {
  systemOrders = [
    {
      id: 'ORD-55410',
      status: 'PLACED',
      totalAmount: 681,
      customerAddress: 'Apartment 402, Block B, Silver Springs Residency, Gachibowli, Hyderabad',
      customerPhone: '+91 9876543210',
      paymentMethod: 'GPAY',
      cookingInstructions: 'Make it extra spicy, please! Less oil.',
      items: [
        { item: { name: 'Veg Dum Biryani' }, quantity: 2 },
        { item: { name: 'Veg Manchow Soup' }, quantity: 1 }
      ]
    },
    {
      id: 'ORD-21094',
      status: 'PREPARING',
      totalAmount: 282,
      customerAddress: 'Villa 18, Nectar Gardens, Madhapur, Hyderabad',
      customerPhone: '+91 8877665544',
      paymentMethod: 'COD',
      cookingInstructions: 'No garlic on one naan, keep butter normal.',
      items: [
        { item: { name: 'Garlic Naan' }, quantity: 4 }
      ]
    }
  ];
  renderDashboard();
}

// --- Render Logic ---

function renderDashboard() {
  const incoming = systemOrders.filter(o => o.status === 'PLACED');
  const preparing = systemOrders.filter(o => o.status === 'PREPARING');
  const delivering = systemOrders.filter(o => o.status === 'OUT_FOR_DELIVERY');

  el.kanban.countIncoming.textContent = incoming.length.toString();
  el.kanban.countPreparing.textContent = preparing.length.toString();
  el.kanban.countDelivering.textContent = delivering.length.toString();

  // Metrics
  const revenue = systemOrders
    .filter(o => ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  
  el.metrics.revenue.textContent = formatCurrency(revenue);
  el.metrics.activeOrders.textContent = (incoming.length + preparing.length).toString();
  el.metrics.liveDeliveries.textContent = delivering.length.toString();

  // Render Columns
  el.kanban.incoming.innerHTML = incoming.map(renderOrderCard).join('');
  el.kanban.preparing.innerHTML = preparing.map(renderOrderCard).join('');
  el.kanban.delivering.innerHTML = delivering.map(renderOrderCard).join('');

  attachOrderListeners();
}

function renderOrderCard(order: any) {
  const badgeClass = order.paymentMethod === 'COD' ? 'payment-cod' : order.paymentMethod.includes('QR') ? 'payment-qr' : 'payment-online';
  const badgeIcon = order.paymentMethod === 'COD' ? 'ri-money-rupee-circle-line' : order.paymentMethod.includes('QR') ? 'ri-qr-code-line' : 'ri-bank-card-line';
  const badgeText = order.paymentMethod === 'COD' ? 'COD (Unpaid)' : order.utrNumber ? `Paid (${order.utrNumber})` : 'Paid via Online';

  const itemsHtml = order.items.map((i: any) => `
    <div class="order-item-row">
      <span><span class="order-item-qty">${i.quantity}x</span> ${i.item.name}</span>
    </div>
  `).join('');

  let actionHtml = '';
  if (order.status === 'PLACED') {
    actionHtml = `<button class="btn-action btn-accept" data-id="${order.id}" data-action="accept"><i class="ri-check-line"></i> Accept & Prepare</button>`;
  } else if (order.status === 'PREPARING') {
    actionHtml = `<button class="btn-action btn-dispatch" data-id="${order.id}" data-action="dispatch"><i class="ri-e-bike-2-line"></i> Dispatch Order</button>`;
  } else if (order.status === 'OUT_FOR_DELIVERY') {
    actionHtml = `<button class="btn-action btn-track" disabled><i class="ri-map-pin-line"></i> On Route</button>`;
  }

  const instructionsHtml = order.cookingInstructions ? `
    <div class="order-instructions">
      <i class="ri-fire-line"></i> <span>${order.cookingInstructions}</span>
    </div>
  ` : '';

  return `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">#${order.id}</span>
        <span class="order-amount">${formatCurrency(order.totalAmount)}</span>
      </div>
      
      <div class="payment-badge ${badgeClass}">
        <i class="${badgeIcon}"></i> ${badgeText}
      </div>

      <div class="order-items">
        ${itemsHtml}
      </div>

      ${instructionsHtml}

      <div class="order-address">
        <i class="ri-map-pin-2-line"></i> <span>${order.customerAddress}<br>${order.customerPhone}</span>
      </div>

      ${actionHtml}
    </div>
  `;
}

function attachOrderListeners() {
  document.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) await updateOrderStatus(id, 'PREPARING');
    });
  });
  document.querySelectorAll('.btn-dispatch').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      // Set mock lat/lng for Rider out of restaurant
      if (id) await updateOrderStatus(id, 'OUT_FOR_DELIVERY', { riderLat: 17.4350, riderLng: 78.4482 });
    });
  });
}

// --- Menu Rendering ---

function renderCategoryFilters() {
  const categories = ['All', ...MenuCategories];
  el.categoryFilters.innerHTML = categories.map(cat => 
    `<button class="filter-btn ${activeCategory === cat ? 'active' : ''}" data-category="${cat}">${cat}</button>`
  ).join('');

  el.categoryFilters.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeCategory = (e.currentTarget as HTMLElement).getAttribute('data-category') || 'All';
      renderCategoryFilters(); // Re-render to update active class
      renderMenu();
    });
  });
}

function renderMenu() {
  el.metrics.menuItems.textContent = menuItems.length.toString();
  
  // 1. Filter items by search query and active category
  const filtered = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery) || item.category.toLowerCase().includes(searchQuery);
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // 2. Group items by category
  const grouped: Record<string, any[]> = {};
  filtered.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  // 3. Render headers and cards
  let html = '';
  
  // To preserve original order of categories as defined in MenuCategories
  const categoriesToRender = MenuCategories.filter(cat => grouped[cat]);
  
  categoriesToRender.forEach(category => {
    // Add Category Header
    html += `<div class="category-section-header">${category}</div>`;
    
    // Add Cards for this category
    html += grouped[category].map(item => {
      const vegClass = item.isVeg ? 'veg' : 'non-veg';
      const availClass = item.isAvailable === false ? 'unavailable' : '';
      const imgUrl = item.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
      
      return `
        <div class="menu-card ${availClass}">
          <img src="${imgUrl}" class="menu-img" alt="${item.name}">
          <div class="menu-info">
            <div class="menu-title-row">
              <span class="menu-name">${item.name}</span>
              <span class="veg-icon ${vegClass}"></span>
            </div>
            <span class="menu-category">${item.category}</span>
            <span class="menu-price">${formatCurrency(item.price)}</span>
          </div>
          <div class="menu-actions">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">
              <i class="ri-star-fill" style="color: #F59E0B"></i> ${item.rating || 4.5}
            </span>
            <button class="btn-edit" data-id="${item.id}"><i class="ri-pencil-line"></i> Edit</button>
          </div>
        </div>
      `;
    }).join('');
  });

  el.menuGrid.innerHTML = html;

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) openEditModal(id);
    });
  });
}

// --- Firebase Writes ---

async function updateOrderStatus(orderId: string, status: string, extraData: any = {}) {
  // Optimistic UI
  const order = systemOrders.find(o => o.id === orderId);
  if (order) { order.status = status; Object.assign(order, extraData); renderDashboard(); }
  
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status, ...extraData });
  } catch (e) { console.warn("Firestore updateDoc error:", e); }
}

async function saveMenuEdit() {
  const id = el.editId.value;
  const name = el.editName.value.trim();
  const desc = el.editDesc.value.trim();
  const price = parseFloat(el.editPrice.value);
  const isAvailable = el.editAvail.checked;

  if (!name || isNaN(price) || price <= 0) {
    alert("Please enter a valid name and price.");
    return;
  }

  // Optimistic UI
  const item = menuItems.find(i => i.id === id);
  if (item) {
    item.name = name; item.description = desc; item.price = price; item.isAvailable = isAvailable;
    renderMenu();
  }
  closeModals();

  try {
    const itemRef = doc(db, 'menu', id);
    await setDoc(itemRef, { id, name, description: desc, price, isAvailable }, { merge: true });
  } catch (e) { console.warn("Menu save error:", e); }
}

async function deleteMenuItem() {
  const id = el.editId.value;
  
  // Optimistic UI
  menuItems = menuItems.filter(i => i.id !== id);
  renderMenu();
  closeModals();

  try {
    const itemRef = doc(db, 'menu', id);
    await setDoc(itemRef, { isDeleted: true }, { merge: true });
  } catch (e) { console.warn("Menu delete error:", e); }
}

// --- Modal Handlers ---

function openEditModal(id: string) {
  const item = menuItems.find(i => i.id === id);
  if (!item) return;

  el.editId.value = item.id;
  el.editName.value = item.name;
  el.editDesc.value = item.description || '';
  el.editPrice.value = item.price.toString();
  el.editAvail.checked = item.isAvailable !== false;

  el.editModal.classList.remove('hidden');
}

function closeModals() {
  el.editModal.classList.add('hidden');
  el.confirmModal.classList.add('hidden');
}

document.getElementById('close-modal')!.addEventListener('click', closeModals);
document.getElementById('cancel-edit-btn')!.addEventListener('click', closeModals);
document.getElementById('save-edit-btn')!.addEventListener('click', saveMenuEdit);

document.getElementById('delete-dish-btn')!.addEventListener('click', () => {
  el.editModal.classList.add('hidden');
  el.confirmModal.classList.remove('hidden');
});

document.getElementById('cancel-confirm-btn')!.addEventListener('click', () => {
  el.confirmModal.classList.add('hidden');
  el.editModal.classList.remove('hidden'); // reopen edit modal
});

document.getElementById('confirm-delete-btn')!.addEventListener('click', deleteMenuItem);

// --- Auth Logic ---
el.loginBtn.addEventListener('click', async () => {
  const email = el.loginEmail.value.trim();
  const password = el.loginPassword.value;
  el.loginError.style.display = 'none';
  
  try {
    el.loginBtn.textContent = 'Signing in...';
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e: any) {
    el.loginError.textContent = e.message;
    el.loginError.style.display = 'block';
    el.loginBtn.textContent = 'Sign In to Dashboard';
  }
});

el.logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    el.loginOverlay.classList.add('hidden');
    el.logoutBtn.style.display = 'inline-block';
    initFirestoreSync();
  } else {
    el.loginOverlay.classList.remove('hidden');
    el.logoutBtn.style.display = 'none';
    el.loginBtn.textContent = 'Sign In to Dashboard';
    el.loginPassword.value = '';
    
    // Clear state
    systemOrders = [];
    menuItems = [...InitialMenuItems];
    if (unsubOrders) unsubOrders();
    if (unsubMenu) unsubMenu();
    
    renderDashboard();
    renderMenu();
  }
});

// Init
renderCategoryFilters();
