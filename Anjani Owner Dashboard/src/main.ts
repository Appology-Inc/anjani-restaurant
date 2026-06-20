/**
 * @file main.ts
 * @description Core logic for the Anjani Owner Dashboard. Handles UI interactions, 
 * Firebase data fetching (orders, menu, settings), real-time updates, metrics aggregation, 
 * and chart rendering using Chart.js.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, updateDoc, setDoc, query, where, getDocs, getDoc, limit, orderBy, startAfter } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { MenuItems as InitialMenuItems, MenuCategories } from './menuData';

// Developer Easter Egg
console.log(
  '%c 🚀 Engineered by Appology Inc. %c \n Building the future of the web. ',
  'background: #111; color: #FF6B00; font-size: 16px; font-weight: bold; border-radius: 4px; padding: 4px 8px;',
  'color: #888; font-size: 12px; font-style: italic;'
);

// --- PWA Installation Flow ---
(function initPWA() {
  if (typeof window === 'undefined') return;

  // One-time reset: clear old dismissal so users see the fixed install prompt
  if (!localStorage.getItem('anjani_owner_pwa_v6')) {
    localStorage.removeItem('anjani_owner_install_dismissed');
    localStorage.setItem('anjani_owner_pwa_v6', 'true');
  }

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Unregister stale service workers from old ?v= registrations
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
          if (reg.active && reg.active.scriptURL && reg.active.scriptURL.includes('?v=')) {
            reg.unregister().then(() => console.log('Unregistered stale SW:', reg.active?.scriptURL));
          }
        }
      });
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          reg.update(); // Force immediate update check
          console.log('Service worker registered:', reg.scope);
        })
        .catch(err => console.error('Service worker registration failed:', err));
    });
  }

  // 2. Install Prompt Interaction
  const overlay = document.getElementById('pwa-install-overlay');
  if (!overlay) return;

  const androidBody = document.getElementById('pwa-android-body');
  const iosBody = document.getElementById('pwa-ios-body');
  const cancelBtn = document.getElementById('pwa-cancel-btn');
  const installBtn = document.getElementById('pwa-install-btn');
  const gotitBtn = document.getElementById('pwa-gotit-btn');
  const closeBtn = document.getElementById('pwa-close-btn');

  let deferredPrompt: any = null;

  const showPWAOverlay = () => {
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.classList.add('visible');
    }, 50);
  };

  const hidePWAOverlay = (permanently = true) => {
    overlay.classList.remove('visible');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);

    if (permanently) {
      localStorage.setItem('anjani_owner_install_dismissed', 'true');
    }
  };

  // Check if dismissed previously (only gates auto-show, NOT event listeners)
  const isDismissed = localStorage.getItem('anjani_owner_install_dismissed') === 'true';

  // Android / Desktop beforeinstallprompt Handler — ALWAYS register
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    if (androidBody) androidBody.style.display = 'flex';
    if (iosBody) iosBody.style.display = 'none';

    // Only auto-show if not dismissed
    if (!isDismissed) {
      showPWAOverlay();
    }
  });

  // iOS Safari detection
  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|opt|opios/.test(userAgent);
  const isStandalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;

  if (isIOS && isSafari && !isStandalone && !isDismissed) {
    if (androidBody) androidBody.style.display = 'none';
    if (iosBody) iosBody.style.display = 'flex';
    setTimeout(showPWAOverlay, 3000);
  }

  // Close actions
  if (closeBtn) closeBtn.addEventListener('click', () => hidePWAOverlay(true));
  if (cancelBtn) cancelBtn.addEventListener('click', () => hidePWAOverlay(true));
  if (gotitBtn) gotitBtn.addEventListener('click', () => hidePWAOverlay(true));

  // Install Action — ALWAYS register
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        (window as any).showAlert('To install this app on your device, please click the browser\'s menu (usually three dots ••• or arrow icon) and select "Install App" or "Add to Home Screen".', 'Install App');
        hidePWAOverlay(false);
        return;
      }
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA choice outcome: ${outcome}`);
      } catch (err) {
        console.error('Failed to trigger Owner PWA install prompt:', err);
      }
      
      deferredPrompt = null;
      hidePWAOverlay(true);
    });
  }

  // Header Brand Click Trigger — ALWAYS register, bypasses dismissal
  const headerBrand = document.getElementById('brand-header-title');
  if (headerBrand) {
    headerBrand.addEventListener('click', () => {
      if (isIOS && isSafari && !isStandalone) {
        if (androidBody) androidBody.style.display = 'none';
        if (iosBody) iosBody.style.display = 'flex';
      } else {
        if (androidBody) androidBody.style.display = 'flex';
        if (iosBody) iosBody.style.display = 'none';
      }
      showPWAOverlay();
    });
  }
})();

// --- Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
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
    ready: document.getElementById('list-ready')!,
    delivering: document.getElementById('list-delivering')!,
    countIncoming: document.getElementById('count-incoming')!,
    countPreparing: document.getElementById('count-preparing')!,
    countReady: document.getElementById('count-ready')!,
    countDelivering: document.getElementById('count-delivering')!
  },
  menuGrid: document.getElementById('menu-grid')!,
  categoryFilters: document.getElementById('category-filters')!,
  searchInput: document.getElementById('menu-search') as HTMLInputElement,
  editModal: document.getElementById('edit-modal')!,
  confirmModal: document.getElementById('confirm-modal')!,
  loginOverlay: document.getElementById('login-overlay')!,
  logoutBtn: document.getElementById('logout-btn')!,
  logoutScreen: document.getElementById('logout-screen')!,
  loginBtn: document.getElementById('login-btn')!,
  loginEmail: document.getElementById('login-email') as HTMLInputElement,
  loginPassword: document.getElementById('login-password') as HTMLInputElement,
  loginError: document.getElementById('login-error')!,
  statusToggleContainer: document.getElementById('status-toggle-container')!,
  restaurantStatusToggle: document.getElementById('restaurant-status-toggle')!,
  restaurantStatusIcon: document.getElementById('restaurant-status-icon')!,
  restaurantStatusText: document.getElementById('toggle-status-text')!,
  statusReasonModal: document.getElementById('status-reason-modal')!,
  closeStatusReasonModal: document.getElementById('close-status-reason-modal')!,
  confirmStatusCloseBtn: document.getElementById('confirm-status-close-btn')!,
  // Form elements
  editId: document.getElementById('edit-id') as HTMLInputElement,
  editName: document.getElementById('edit-name') as HTMLInputElement,
  editDesc: document.getElementById('edit-description') as HTMLTextAreaElement,
  editPrice: document.getElementById('edit-price') as HTMLInputElement,
  editAvail: document.getElementById('edit-available') as HTMLInputElement,
  historical: {
    startDate: document.getElementById('hist-start-date') as HTMLInputElement,
    endDate: document.getElementById('hist-end-date') as HTMLInputElement,
    fetchBtn: document.getElementById('fetch-historical-btn') as HTMLButtonElement,
    summaryPanel: document.getElementById('hist-summary') as HTMLElement,
    totalOrders: document.getElementById('hist-total-orders') as HTMLElement,
    deliveredOrders: document.getElementById('hist-delivered-orders') as HTMLElement,
    cancelledOrders: document.getElementById('hist-cancelled-orders') as HTMLElement,
    totalRevenue: document.getElementById('hist-total-revenue') as HTMLElement,
    tbody: document.getElementById('historical-tbody') as HTMLElement,
    loadMoreBtn: document.getElementById('load-more-historical-btn') as HTMLButtonElement,
    paginationContainer: document.getElementById('historical-pagination') as HTMLElement,
  },
};

// --- Utilities ---
function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(amount: number) {
  return '\u20b9' + amount.toLocaleString('en-IN');
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
  // Create a toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:9999',
    `background:${type === 'success' ? '#22C55E' : '#EF4444'}`,
    'color:#fff', 'padding:12px 20px', 'border-radius:10px',
    'font-size:14px', 'font-weight:600', 'box-shadow:0 4px 20px rgba(0,0,0,0.3)',
    'transition:opacity 0.3s ease', 'max-width:300px'
  ].join(';');
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
}

(window as any).showConfirm = function(message: string, isDestructive: boolean = true) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0)',
      backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)',
      zIndex: '999999', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s ease-out'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      backgroundColor: '#18120A', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '16px', padding: '24px', maxWidth: '340px', width: '100%',
      textAlign: 'center', transform: 'scale(0.95)',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      boxShadow: '0 15px 30px rgba(0,0,0,0.6)'
    });

    const btnStyle = isDestructive 
      ? 'background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #EF4444;' 
      : 'background-color: #FF6B00; border: 1px solid #FF6B00; color: #FFF;';

    box.innerHTML = `
      <div style="font-size: 18px; font-weight: 700; color: #FFF; margin-bottom: 8px;">Confirm Action</div>
      <div style="font-size: 14px; color: #9A8A72; margin-bottom: 24px; line-height: 20px;">${message}</div>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="modal-cancel" style="flex: 1; padding: 12px; border-radius: 10px; background-color: #18120A; border: 1px solid #36291C; color: #E5E1D8; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">Cancel</button>
        <button id="modal-confirm" style="flex: 1; padding: 12px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; ${btnStyle}">Confirm</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
      overlay.style.backdropFilter = 'blur(8px)';
      (overlay.style as any).WebkitBackdropFilter = 'blur(8px)';
      box.style.transform = 'scale(1)';
    });

    const close = (result: boolean) => {
      overlay.style.backgroundColor = 'rgba(0,0,0,0)';
      overlay.style.backdropFilter = 'blur(0px)';
      (overlay.style as any).WebkitBackdropFilter = 'blur(0px)';
      box.style.transform = 'scale(0.95)';
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };

    (overlay.querySelector('#modal-cancel') as HTMLElement).onclick = () => close(false);
    (overlay.querySelector('#modal-confirm') as HTMLElement).onclick = () => close(true);
  });
};

(window as any).showAlert = function(message: string, title: string = "Notice") {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', backgroundColor: 'rgba(0,0,0,0)',
      backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)',
      zIndex: '999999', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.2s ease-out'
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      backgroundColor: '#18120A', border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '16px', padding: '24px', maxWidth: '340px', width: '100%',
      textAlign: 'center', transform: 'scale(0.95)',
      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      boxShadow: '0 15px 30px rgba(0,0,0,0.6)'
    });

    box.innerHTML = `
      <div style="font-size: 18px; font-weight: 700; color: #FFF; margin-bottom: 8px;">${title}</div>
      <div style="font-size: 14px; color: #9A8A72; margin-bottom: 24px; line-height: 20px;">${message}</div>
      <div style="display: flex; justify-content: center;">
        <button id="modal-ok" style="flex: 1; padding: 12px; border-radius: 10px; background-color: #FF6B00; border: 1px solid #FF6B00; color: #FFF; font-weight: 600; cursor: pointer; transition: opacity 0.2s;">OK</button>
      </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.backgroundColor = 'rgba(0,0,0,0.4)';
      overlay.style.backdropFilter = 'blur(8px)';
      (overlay.style as any).WebkitBackdropFilter = 'blur(8px)';
      box.style.transform = 'scale(1)';
    });

    const close = () => {
      overlay.style.backgroundColor = 'rgba(0,0,0,0)';
      overlay.style.backdropFilter = 'blur(0px)';
      (overlay.style as any).WebkitBackdropFilter = 'blur(0px)';
      box.style.transform = 'scale(0.95)';
      setTimeout(() => overlay.remove(), 200);
      resolve(true);
    };

    (overlay.querySelector('#modal-ok') as HTMLElement).onclick = () => close();
  });
};

function updateClock() {
  const now = new Date();
  el.clock.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
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
let unsubStatus: any = null;
let lastPendingCount = -1;
let updateInFlight = false;

function playNotificationChime() {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.play().catch(e => console.log('Audio play failed (interaction required):', e));
}

/**
 * Initializes real-time synchronization with Firestore.
 * Sets up active listeners for incoming orders, menu inventory changes, 
 * and restaurant open/close status.
 */
function initFirestoreSync() {
  // Request Notification permission for web alerts
  if ('Notification' in window) {
    Notification.requestPermission().catch(console.warn);
  }

  // Logic for Firebase data fetching: Listen to the "orders" collection in real-time
  // Optimized: Only listen to orders created today to save Firebase reads
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfToday = today.getTime();
  const ordersRef = collection(db, 'orders');
  const todayOrdersQuery = query(ordersRef, where('createdAt', '>=', startOfToday));
  
  unsubOrders = onSnapshot(todayOrdersQuery, (snapshot) => {
    if (updateInFlight) {
      console.log('Skipping onSnapshot update — update in flight');
      return;
    }
    systemOrders = [];
    let currentPendingCount = 0;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      systemOrders.push(data);
      if (data.status === 'pending') currentPendingCount++;
    });
    
    if (lastPendingCount !== -1 && currentPendingCount > lastPendingCount) {
      playNotificationChime();
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Order Received! 💸', {
          body: 'A new order has been placed. Check the operations board.',
        });
      }
    }
    lastPendingCount = currentPendingCount;

    el.connStatus.className = 'connection-status connected';
    el.connStatus.querySelector('.text')!.textContent = 'Firebase Live';
    renderDashboard();
  }, (error) => {
    console.warn("Firestore orders read error:", error);
    el.connStatus.className = 'connection-status disconnected';
    el.connStatus.querySelector('.text')!.textContent = 'Offline/Unauthorized';
  });

  const menuRef = collection(db, 'menu');
  unsubMenu = onSnapshot(menuRef, (snapshot) => {
    if (updateInFlight) {
      console.log('Skipping menu onSnapshot update — update in flight');
      return;
    }
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

  const statusRef = doc(db, 'settings', 'status');
  unsubStatus = onSnapshot(statusRef, (docSnap) => {
    if (updateInFlight) {
      console.log('Skipping status onSnapshot update — update in flight');
      return;
    }
    if (docSnap.exists()) {
      const data = docSnap.data();
      const isOpen = data.isOpen !== false;
      if (isOpen) {
        el.restaurantStatusToggle.classList.add('is-open');
        el.restaurantStatusIcon.className = 'ri-store-2-line';
        el.restaurantStatusText.textContent = 'Accepting Orders';
        el.restaurantStatusText.className = 'toggle-status-text live';
      } else {
        el.restaurantStatusToggle.classList.remove('is-open');
        el.restaurantStatusIcon.className = 'ri-lock-line';
        el.restaurantStatusText.textContent = data.reason || 'Closed';
        el.restaurantStatusText.className = 'toggle-status-text off';
      }
    }
  }, (error) => {
    console.warn("Firestore status sync error:", error);
  });
}

// --- Render Logic ---

/**
 * Renders the primary dashboard view including the kanban board and top-level metrics.
 * Aggregates order statuses to calculate revenue, active orders, and deliveries.
 */
function renderDashboard() {
  // Aggregate metrics logic: Filter orders by their current status into respective kanban columns
  const incoming = systemOrders.filter(o => o.status === 'PLACED');
  const preparing = systemOrders.filter(o => o.status === 'ACCEPTED' || o.status === 'PREPARING');
  const ready = systemOrders.filter(o => o.status === 'READY');
  const delivering = systemOrders.filter(o => o.status === 'OUT_FOR_DELIVERY');

  el.kanban.countIncoming.textContent = incoming.length.toString();
  el.kanban.countPreparing.textContent = preparing.length.toString();
  el.kanban.countReady.textContent = ready.length.toString();
  el.kanban.countDelivering.textContent = delivering.length.toString();

  // Metrics
  const revenue = systemOrders
    .filter(o => ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status))
    .reduce((sum, o) => sum + o.totalAmount, 0);
  
  el.metrics.revenue.textContent = formatCurrency(revenue);
  el.metrics.activeOrders.textContent = (incoming.length + preparing.length + ready.length).toString();
  el.metrics.liveDeliveries.textContent = delivering.length.toString();

  // Render Columns
  el.kanban.incoming.innerHTML = incoming.map(renderOrderCard).join('');
  el.kanban.preparing.innerHTML = preparing.map(renderOrderCard).join('');
  el.kanban.ready.innerHTML = ready.map(renderOrderCard).join('');
  el.kanban.delivering.innerHTML = delivering.map(renderOrderCard).join('');

  attachOrderListeners();
  renderAnalytics();
}

// Global chart references
let revenueChartInstance: any = null;
let topItemsChartInstance: any = null;
let paymentChartInstance: any = null;
let peakHoursChartInstance: any = null;
let statusChartInstance: any = null;

/**
 * Renders the analytics section using Chart.js.
 * Processes the system orders to generate data for revenue, top items, 
 * payment methods, peak hours, and order statuses.
 */
function renderAnalytics() {
  // Chart logic: Retrieve canvas contexts for the various analytical charts
  const canvasRev = document.getElementById('revenueChart') as HTMLCanvasElement;
  const canvasItems = document.getElementById('topItemsChart') as HTMLCanvasElement;
  const canvasPayment = document.getElementById('paymentChart') as HTMLCanvasElement;
  const canvasPeak = document.getElementById('peakHoursChart') as HTMLCanvasElement;
  const canvasStatus = document.getElementById('statusChart') as HTMLCanvasElement;
  
  if (!canvasRev || !canvasItems || !canvasPayment || !canvasPeak || !canvasStatus) return;

  if (typeof (window as any).Chart === 'undefined') {
    setTimeout(renderAnalytics, 200);
    return;
  }
  const Chart = (window as any).Chart;
  
  // Set default Chart.js styles for dark theme
  Chart.defaults.color = '#9A8A72';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(24, 18, 10, 0.9)';
  Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 107, 0, 0.2)';
  Chart.defaults.plugins.tooltip.borderWidth = 1;

  // Filter valid completed/in-progress orders
  const validOrders = systemOrders.filter(o => ['PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status));

  // --- 1. Revenue Chart (Last 7 Days) ---
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const revData = last7Days.map(dayStart => {
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23,59,59,999);
    return validOrders
      .filter(o => o.createdAt >= dayStart.getTime() && o.createdAt <= dayEnd.getTime())
      .reduce((sum, o) => sum + o.totalAmount, 0);
  });

  const revLabels = last7Days.map(d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));

  if (revenueChartInstance) revenueChartInstance.destroy();
  revenueChartInstance = new Chart(canvasRev, {
    type: 'line',
    data: {
      labels: revLabels,
      datasets: [{
        label: 'Revenue (₹)',
        data: revData,
        borderColor: '#FF6B00',
        backgroundColor: 'rgba(255, 107, 0, 0.15)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#FF6B00',
        pointBorderColor: '#FFF',
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });

  // --- 2. Top Selling Items ---
  const itemCounts: Record<string, number> = {};
  validOrders.forEach(o => {
    (o.items || []).forEach((i: any) => {
      itemCounts[i.item.name] = (itemCounts[i.item.name] || 0) + i.quantity;
    });
  });
  
  const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topItemsChartInstance) topItemsChartInstance.destroy();
  topItemsChartInstance = new Chart(canvasItems, {
    type: 'bar',
    data: {
      labels: sortedItems.map(i => i[0]),
      datasets: [{
        label: 'Units Sold',
        data: sortedItems.map(i => i[1]),
        backgroundColor: '#22C55E',
        borderRadius: 6,
        barPercentage: 0.6
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { grid: { display: false } }
      },
      plugins: { legend: { display: false } }
    }
  });

  // --- 3. Payment Methods ---
  const payCounts = { COD: 0, GPAY: 0, PHONEPE: 0, ONLINE: 0 };
  validOrders.forEach(o => {
    if (o.paymentMethod === 'COD') payCounts.COD++;
    else if (o.paymentMethod === 'GPAY') payCounts.GPAY++;
    else if (o.paymentMethod === 'PHONEPE') payCounts.PHONEPE++;
    else payCounts.ONLINE++;
  });

  if (paymentChartInstance) paymentChartInstance.destroy();
  paymentChartInstance = new Chart(canvasPayment, {
    type: 'doughnut',
    data: {
      labels: ['COD', 'GPay', 'PhonePe', 'Other Online'],
      datasets: [{
        data: [payCounts.COD, payCounts.GPAY, payCounts.PHONEPE, payCounts.ONLINE],
        backgroundColor: ['#F59E0B', '#3B82F6', '#6366F1', '#10B981'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { legend: { position: 'bottom' } }
    }
  });

  // --- 4. Peak Order Hours ---
  const hourCounts = new Array(24).fill(0);
  validOrders.forEach(o => {
    if (o.createdAt) {
      const h = new Date(o.createdAt).getHours();
      hourCounts[h]++;
    }
  });
  // Simplify to meaningful blocks (e.g., 12PM-3PM, 6PM-10PM)
  const timeBlocks = ['Morning (8A-12P)', 'Lunch (12P-4P)', 'Evening (4P-8P)', 'Night (8P-12A)'];
  const blockCounts = [
    hourCounts.slice(8,12).reduce((a,b)=>a+b,0),
    hourCounts.slice(12,16).reduce((a,b)=>a+b,0),
    hourCounts.slice(16,20).reduce((a,b)=>a+b,0),
    hourCounts.slice(20,24).reduce((a,b)=>a+b,0)
  ];

  if (peakHoursChartInstance) peakHoursChartInstance.destroy();
  peakHoursChartInstance = new Chart(canvasPeak, {
    type: 'radar',
    data: {
      labels: timeBlocks,
      datasets: [{
        label: 'Orders',
        data: blockCounts,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: '#8B5CF6',
        pointBackgroundColor: '#8B5CF6',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          grid: { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#9A8A72', font: { size: 11 } },
          ticks: { display: false }
        }
      },
      plugins: { legend: { display: false } }
    }
  });

  // --- 5. Live Order Status ---
  const statusCounts = { PLACED: 0, PREPARING: 0, OUT: 0, DELIVERED: 0 };
  systemOrders.forEach(o => {
    if (o.status === 'PLACED') statusCounts.PLACED++;
    if (o.status === 'PREPARING') statusCounts.PREPARING++;
    if (o.status === 'OUT_FOR_DELIVERY') statusCounts.OUT++;
    if (o.status === 'DELIVERED') statusCounts.DELIVERED++;
  });

  if (statusChartInstance) statusChartInstance.destroy();
  statusChartInstance = new Chart(canvasStatus, {
    type: 'pie',
    data: {
      labels: ['Incoming', 'Preparing', 'On Route', 'Delivered'],
      datasets: [{
        data: [statusCounts.PLACED, statusCounts.PREPARING, statusCounts.OUT, statusCounts.DELIVERED],
        backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

/**
 * Generates the HTML markup for a single order card.
 *
 * @param {any} order - The order object containing details such as items, status, and payment info.
 * @returns {string} The HTML string representing the order card.
 */
function renderOrderCard(order: any) {
  let badgeClass = 'payment-online';
  let badgeIcon = 'ri-bank-card-line';
  let badgeText = 'Paid via Online';
  let verifyHtml = '';

  if (order.paymentMethod === 'COD') {
    badgeClass = 'payment-cod';
    badgeIcon = 'ri-money-rupee-circle-line';
    badgeText = 'COD (Unpaid)';
  } else if (order.paymentMethod?.includes('QR')) {
    badgeClass = 'payment-qr';
    badgeIcon = 'ri-qr-code-line';
    if (order.utrNumber) {
      if (order.paymentVerified) {
        badgeText = `Paid (UTR: ${escapeHtml(order.utrNumber)})`;
        badgeClass = 'payment-online'; // Green color
      } else {
        badgeText = `Verify UTR: ${escapeHtml(order.utrNumber)}`;
        badgeClass = 'payment-cod'; // Orange/red warning color
        verifyHtml = `<button class="btn-verify" data-id="${order.id}" style="margin-top: 6px; padding: 4px 8px; font-size: 0.8rem; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer;">Verify Payment</button>`;
      }
    } else {
      badgeText = 'Pending Verification';
    }
  }

  const itemsHtml = (order.items || []).map((i: any) => `
    <div class="order-item-row">
      <span><span class="order-item-qty">${i.quantity}x</span> ${escapeHtml(i?.item?.name || 'Item')}</span>
    </div>
  `).join('');

  let actionHtml = '';
  if (order.status === 'PLACED') {
    actionHtml = `
      <div class="order-actions-row" style="display: flex; gap: 8px; margin-top: 10px; width: 100%;">
        <button class="btn-action btn-accept" data-id="${order.id}" data-action="accept" style="flex: 1;"><i class="ri-restaurant-line"></i> Accept</button>
        <button class="btn-action btn-reject btn-danger" data-id="${order.id}" data-action="reject" style="flex: 1; padding: 10px; font-size: 0.9rem; background: var(--danger);"><i class="ri-close-circle-line"></i> Reject</button>
      </div>
    `;
  } else if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
    actionHtml = `
      <div style="display: flex; gap: 8px; flex-direction: column; width: 100%; margin-top: 10px;">
        <button class="btn-action btn-ready" data-id="${order.id}" data-action="ready"><i class="ri-check-double-line"></i> Mark Ready</button>
        <button class="btn-action btn-reject" data-id="${order.id}" data-action="reject" style="background: transparent; border: 1px solid var(--danger); color: var(--danger);"><i class="ri-close-circle-line"></i> Cancel Order</button>
      </div>
    `;
  } else if (order.status === 'READY') {
    actionHtml = `
      <div style="display: flex; gap: 8px; flex-direction: column; width: 100%; margin-top: 10px;">
        <button class="btn-action btn-track" disabled><i class="ri-time-line"></i> Waiting for Rider...</button>
        <button class="btn-action btn-reject" data-id="${order.id}" data-action="reject" style="background: transparent; border: 1px solid var(--danger); color: var(--danger);"><i class="ri-close-circle-line"></i> Cancel Order</button>
      </div>
    `;
  } else if (order.status === 'OUT_FOR_DELIVERY') {
    actionHtml = `<button class="btn-action btn-track" disabled><i class="ri-map-pin-line"></i> On Route</button>`;
  }

  const instructionsHtml = order.cookingInstructions ? `
    <div class="order-instructions">
      <i class="ri-fire-line"></i> <span>${escapeHtml(order.cookingInstructions)}</span>
    </div>
  ` : '';

  return `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">#${order.id}</span>
        <span class="order-amount">${formatCurrency(order.totalAmount)}</span>
      </div>
      
      <div class="payment-badge ${badgeClass}" style="display: flex; flex-direction: column; align-items: flex-start;">
        <div><i class="${badgeIcon}"></i> ${badgeText}</div>
        ${verifyHtml}
      </div>

      <div class="order-items">
        ${itemsHtml}
      </div>

      ${instructionsHtml}

      <div class="order-address" style="margin-bottom: 8px;">
        <i class="ri-user-3-line"></i> <span><strong>${escapeHtml(order.customerName || 'Customer')}</strong></span>
      </div>

      <div class="order-address">
        <i class="ri-map-pin-2-line"></i> <span>${escapeHtml(order.customerAddress)}<br>${escapeHtml(order.customerPhone)}</span>
      </div>

      ${actionHtml}
    </div>
  `;
}

/**
 * Attaches event listeners to the buttons within order cards.
 * Handles actions like accepting, preparing, marking ready, and rejecting orders.
 */
function attachOrderListeners() {
  document.querySelectorAll('.btn-accept').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        await updateOrderStatus(id, 'ACCEPTED');
        // Auto-transition to PREPARING after 25 seconds
        setTimeout(async () => {
          try {
            const orderRef = doc(db, 'orders', id);
            const orderDoc = await getDoc(orderRef);
            if (orderDoc.exists() && orderDoc.data().status === 'ACCEPTED') {
              await updateOrderStatus(id, 'PREPARING');
            }
          } catch (err) {
            console.error('Auto transition error:', err);
          }
        }, 25000); // 25 seconds
      }
    });
  });
  document.querySelectorAll('.btn-prepare').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) await updateOrderStatus(id, 'PREPARING');
    });
  });
  document.querySelectorAll('.btn-ready').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) await updateOrderStatus(id, 'READY');
    });
  });

  document.querySelectorAll('.btn-reject').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        if (await (window as any).showConfirm("Are you sure you want to REJECT this order? This will cancel the order for the customer.", true)) {
          await updateOrderStatus(id, 'CANCELLED', { cancelReason: 'Rejected by restaurant' });
        }
      }
    });
  });
  
  document.querySelectorAll('.btn-verify').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) {
        if (await (window as any).showConfirm("Have you received the payment in your bank account?", false)) {
          await updateOrderStatus(id, 'PLACED', { paymentVerified: true });
        }
      }
    });
  });

  // Set up password visibility toggle
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordInput = document.getElementById('login-password') as HTMLInputElement;
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';
      togglePasswordBtn.className = isPassword ? 'ri-eye-off-line' : 'ri-eye-line';
    });
  }
}

// --- Menu Rendering ---

/**
 * Renders the category filter buttons for the menu view.
 * Attaches click listeners to filter the displayed menu items by category.
 */
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

/**
 * Renders the menu grid based on the current search query and active category filter.
 * Groups items by category and generates the corresponding HTML markup.
 */
function renderMenu() {
  el.metrics.menuItems.textContent = menuItems.length.toString();
  
  // Logic for inventory toggling/filtering: Filter items based on search input and selected category
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
  
  const CategoryEmojis: Record<string, string> = {
    "Veg Soups": "🍲",
    "Non Veg Soups": "🥣",
    "Salads": "🥗",
    "Tandoori Starters": "🍢",
    "Veg Starters": "🥟",
    "Non Veg Starters": "🍗",
    "Veg Main Course": "🥘",
    "Non Veg Main Course": "🍛",
    "Breads": "🫓",
    "Rice": "🍚",
    "Veg Biryani": "🥘",
    "Non Veg Biryani": "🥘",
    "Fried Rice": "🍚",
    "Noodles": "🍜",
    "Snacks": "🍟"
  };

  // To preserve original order of categories as defined in MenuCategories
  const categoriesToRender = MenuCategories.filter(cat => grouped[cat]);
  
  categoriesToRender.forEach(category => {
    const icon = CategoryEmojis[category] || "🍽️";
    // Add Category Group Wrapper
    html += `<div class="category-group">`;
    // Add Category Header
    html += `<div class="category-section-header">${icon} ${escapeHtml(category)}</div>`;
    
    // Add Cards for this category
    html += `<div class="category-items-grid">`;
    html += grouped[category].map(item => {
      const vegClass = item.isVeg ? 'veg' : 'non-veg';
      const availClass = item.isAvailable === false ? 'unavailable' : '';
      return `
        <div class="menu-card ${availClass}">
          <div class="menu-info">
            <div class="menu-title-row">
              <span class="menu-name">${escapeHtml(item.name)}</span>
              <span class="veg-icon ${vegClass}"></span>
            </div>
            <span class="menu-category">${escapeHtml(item.category)}</span>
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
    html += `</div></div>`;
  });

  el.menuGrid.innerHTML = html;

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (id) openEditModal(id);
    });
  });
}

// --- Historical Data Logic ---

let lastHistoricalDoc: any = null;
let currentHistoricalOrders: any[] = [];

el.historical.fetchBtn.addEventListener('click', async () => {
  lastHistoricalDoc = null;
  currentHistoricalOrders = [];
  el.historical.paginationContainer.style.display = 'none';
  await fetchHistoricalPage();
});

el.historical.loadMoreBtn.addEventListener('click', async () => {
  await fetchHistoricalPage();
});

async function fetchHistoricalPage() {
  const startStr = el.historical.startDate.value;
  const endStr = el.historical.endDate.value;

  if (!startStr || !endStr) {
    (window as any).showAlert("Please select both Start Date and End Date.", "Missing Dates");
    return;
  }

  // Convert to timestamps
  const startObj = new Date(startStr);
  startObj.setHours(0, 0, 0, 0);
  const endObj = new Date(endStr);
  endObj.setHours(23, 59, 59, 999);

  const startTimestamp = startObj.getTime();
  const endTimestamp = endObj.getTime();

  el.historical.fetchBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Retrieving...';
  el.historical.fetchBtn.disabled = true;
  el.historical.loadMoreBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Loading...';
  el.historical.loadMoreBtn.disabled = true;

  try {
    let newOrders: any[] = [];
    
    // Check if we are connected to Firebase
    if (auth.currentUser) {
      const ordersRef = collection(db, 'orders');
      let q = query(
        ordersRef, 
        where('createdAt', '>=', startTimestamp), 
        where('createdAt', '<=', endTimestamp),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      if (lastHistoricalDoc) {
        q = query(
          ordersRef, 
          where('createdAt', '>=', startTimestamp), 
          where('createdAt', '<=', endTimestamp),
          orderBy('createdAt', 'desc'),
          startAfter(lastHistoricalDoc),
          limit(50)
        );
      }
  
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        lastHistoricalDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
        if (querySnapshot.docs.length < 50) {
          el.historical.paginationContainer.style.display = 'none';
        } else {
          el.historical.paginationContainer.style.display = 'flex';
        }
      } else {
        el.historical.paginationContainer.style.display = 'none';
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
          newOrders.push(data);
        }
      });
    } else {
      // Offline/Demo mode: Use local systemOrders
      newOrders = systemOrders.filter(o => 
        (o.status === 'DELIVERED' || o.status === 'CANCELLED') && 
        o.createdAt >= startTimestamp && 
        o.createdAt <= endTimestamp
      );
      newOrders.sort((a, b) => b.createdAt - a.createdAt);
      el.historical.paginationContainer.style.display = 'none';
    }

    currentHistoricalOrders = [...currentHistoricalOrders, ...newOrders];
    renderHistoricalTable(currentHistoricalOrders);

  } catch (error) {
    console.error("Error fetching historical data:", error);
    (window as any).showAlert("Failed to retrieve historical data. Check console for details.", "Error");
  } finally {
    el.historical.fetchBtn.innerHTML = '<i class="ri-search-eye-line"></i> Retrieve Data';
    el.historical.fetchBtn.disabled = false;
    el.historical.loadMoreBtn.innerHTML = '<i class="ri-arrow-down-line"></i> Load More';
    el.historical.loadMoreBtn.disabled = false;
  }
}

function renderHistoricalTable(orders: any[]) {
  if (orders.length === 0) {
    el.historical.summaryPanel.style.display = 'none';
    el.historical.tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: var(--text-secondary); padding: 2rem;">No historical orders found in this date range.</td></tr>';
    return;
  }

  let totalRev = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  
  const html = orders.map(order => {
    if (order.status === 'CANCELLED') {
      cancelledCount++;
    } else {
      deliveredCount++;
      totalRev += order.totalAmount || 0;
    }
    
    const dateObj = new Date(order.createdAt);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const itemsHtml = (order.items || []).map((i: any) => 
      `<li>${i.quantity}x ${escapeHtml(i.item.name)}</li>`
    ).join('');

    const isCod = order.paymentMethod === 'COD';
    const isCancelled = order.status === 'CANCELLED';
    const badgeClass = isCancelled ? 'hist-badge danger' : (isCod ? 'hist-badge cod' : 'hist-badge');
    const paymentText = isCancelled ? 'Cancelled' : (isCod ? 'COD' : 'Paid Online');

    return `
      <tr>
        <td style="font-weight: 600;">#${order.id}</td>
        <td>
          <div style="font-weight: 500;">${dateStr}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${timeStr}</div>
        </td>
        <td>
          <div style="font-weight: 500; color: #FFF;">${escapeHtml(order.customerName) || 'Unknown Customer'}</div>
          <div style="font-size: 0.85rem; margin-top: 2px;">${escapeHtml(order.customerPhone) || 'N/A'}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">${escapeHtml(order.customerAddress) || 'N/A'}</div>
        </td>
        <td>
          <ul class="hist-item-list">${itemsHtml}</ul>
        </td>
        <td style="font-weight: 700; color: ${isCancelled ? 'var(--danger)' : 'var(--success)'};">${isCancelled ? '<strike>' + formatCurrency(order.totalAmount || 0) + '</strike>' : formatCurrency(order.totalAmount || 0)}</td>
        <td><span class="${badgeClass}" ${isCancelled ? 'style="background: rgba(239, 68, 68, 0.15); color: #EF4444;"' : ''}>${paymentText}</span></td>
      </tr>
    `;
  }).join('');

  el.historical.tbody.innerHTML = html;
  el.historical.totalOrders.textContent = orders.length.toString();
  el.historical.deliveredOrders.textContent = deliveredCount.toString();
  el.historical.cancelledOrders.textContent = cancelledCount.toString();
  el.historical.totalRevenue.textContent = formatCurrency(totalRev);
  el.historical.summaryPanel.style.display = 'flex';
}

// --- Firebase Writes ---

async function updateOrderStatus(orderId: string, status: string, extraData: any = {}) {
  // Optimistic UI
  updateInFlight = true;
  const order = systemOrders.find(o => o.id === orderId);
  if (order) { 
    order._prevStatus = order.status;
    order.status = status; 
    Object.assign(order, extraData); 
    renderDashboard(); 
  }
  
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status, ...extraData });
  } catch (e: any) {
    console.warn("Firestore updateDoc error:", e);
    // Revert optimistic UI on failure
    const failedOrder = systemOrders.find(o => o.id === orderId);
    if (failedOrder) {
      failedOrder.status = failedOrder._prevStatus || failedOrder.status;
      renderDashboard();
    }
    showToast(`Failed to update order ${orderId}: ${e.message || 'Check connection.'}`, 'error');
  } finally {
    setTimeout(() => { updateInFlight = false; }, 500);
  }
}

async function saveMenuEdit() {
  const id = el.editId.value;
  const name = el.editName.value.trim();
  const desc = el.editDesc.value.trim();
  const price = parseFloat(el.editPrice.value);
  const isAvailable = el.editAvail.checked;

  if (!name || isNaN(price) || price <= 0) {
    (window as any).showAlert("Please enter a valid name and price.", "Invalid Input");
    return;
  }

  // Optimistic UI
  updateInFlight = true;
  const item = menuItems.find(i => i.id === id);
  if (item) {
    item.name = name; item.description = desc; item.price = price; item.isAvailable = isAvailable;
    renderMenu();
  }
  closeModals();

  try {
    const itemRef = doc(db, 'menu', id);
    await setDoc(itemRef, { id, name, description: desc, price, isAvailable }, { merge: true });
    
    // Broadcast cache invalidation to all apps
    const statusRef = doc(db, 'settings', 'status');
    await setDoc(statusRef, { menuUpdatedAt: Date.now() }, { merge: true });

    showToast('Menu item saved successfully!', 'success');
  } catch (e: any) {
    console.warn('Menu save error:', e);
    showToast(`Save failed: ${e.message || 'Check connection.'}`, 'error');
  }
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
    
    // Broadcast cache invalidation to all apps
    const statusRef = doc(db, 'settings', 'status');
    await setDoc(statusRef, { menuUpdatedAt: Date.now() }, { merge: true });

    showToast('Menu item deleted.', 'success');
  } catch (e: any) {
    console.warn('Menu delete error:', e);
    showToast(`Delete failed: ${e.message || 'Check connection.'}`, 'error');
  }
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
const rememberMeCheckbox = document.getElementById('remember-me') as HTMLInputElement;

el.loginBtn.addEventListener('click', async () => {
  const email = el.loginEmail.value.trim();
  const password = el.loginPassword.value;
  el.loginError.style.display = 'none';
  
  if (rememberMeCheckbox && rememberMeCheckbox.checked) {
    localStorage.setItem('ownerEmail', email);
    localStorage.setItem('ownerPassword', password);
    localStorage.setItem('autoLogin', 'true');
  } else {
    localStorage.removeItem('ownerEmail');
    localStorage.removeItem('ownerPassword');
    localStorage.removeItem('autoLogin');
  }
  
  try {
    el.loginBtn.textContent = 'Signing in...';
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: any) {
    let msg = 'An unexpected error occurred.<br/>Please try again.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'Incorrect email or password.<br/>Please try again.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Please enter a valid email address.';
    } else if (err.code === 'auth/too-many-requests') {
      msg = 'Too many failed attempts.<br/>Please try again later.';
    } else if (err.code === 'auth/network-request-failed') {
      msg = 'Network error.<br/>Please check your internet connection.';
    } else if (err.message) {
      msg = err.message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/.*\)\.?$/, '');
    }
    el.loginError.innerHTML = `<i class="ri-alert-line" style="color: #ef4444; margin-right: 8px; font-size: 1.1rem; flex-shrink: 0; display: flex; align-items: center;"></i><span style="flex: 1; text-align: center;">${msg}</span><div style="width: calc(1.1rem + 8px); flex-shrink: 0;"></div>`;
    el.loginError.style.display = 'flex';
    el.loginBtn.innerHTML = '<i class="ri-key-2-line" style="margin-right: 6px;"></i> Secure Sign In';
  }
});

el.logoutBtn.addEventListener('click', async () => {
  if (await (window as any).showConfirm("Are you sure you want to log out?", true)) {
    localStorage.removeItem('autoLogin'); // Prevent auto-login loop on manual logout
    
    // Show and fade in the logout screen overlay
    el.logoutScreen.style.display = 'flex';
    setTimeout(() => {
      el.logoutScreen.classList.remove('fade-out');
    }, 20);

    // Wait 500ms for overlay to become fully opaque
    setTimeout(async () => {
      try {
        await signOut(auth);
      } catch (err) {
        console.error('Logout error:', err);
      }
      
      // Wait 600ms for the page layout changes to settle behind the black overlay
      setTimeout(() => {
        el.logoutScreen.classList.add('fade-out');
        // Wait 800ms for the fade-out transition to complete, then hide the overlay
        setTimeout(() => {
          el.logoutScreen.style.display = 'none';
        }, 800);
      }, 600);
    }, 500);
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    el.loginOverlay.classList.add('hidden');
    el.logoutBtn.style.display = 'inline-block';
    el.statusToggleContainer.style.display = 'flex';
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    initFirestoreSync();
    
    // Auto-fetch today's historical data
    const today = new Date();
    // Adjust timezone offset to get local YYYY-MM-DD
    const localDateStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    el.historical.startDate.value = localDateStr;
    el.historical.endDate.value = localDateStr;
    setTimeout(() => el.historical.fetchBtn.click(), 500);
    
  } else {
    el.loginOverlay.classList.remove('hidden');
    el.logoutBtn.style.display = 'none';
    el.statusToggleContainer.style.display = 'none';
    el.loginBtn.innerHTML = '<i class="ri-key-2-line" style="margin-right: 6px;"></i> Secure Sign In';
    
    const savedEmail = localStorage.getItem('ownerEmail');
    const savedPassword = localStorage.getItem('ownerPassword');
    const shouldAutoLogin = localStorage.getItem('autoLogin') === 'true';

    if (savedEmail && savedPassword) {
      el.loginEmail.value = savedEmail;
      el.loginPassword.value = savedPassword;
      if (rememberMeCheckbox) rememberMeCheckbox.checked = true;

      if (shouldAutoLogin) {
        // Wait a tiny bit for UI to settle, then auto-login
        setTimeout(() => el.loginBtn.click(), 100);
      }
    } else {
      el.loginPassword.value = '';
    }
    
    // Clear state
    systemOrders = [];
    menuItems = [...InitialMenuItems];
    if (unsubOrders) unsubOrders();
    if (unsubMenu) unsubMenu();
    if (unsubStatus) unsubStatus();
    
    renderDashboard();
    renderMenu();
  }
});

// Init
renderCategoryFilters();

// Logic for inventory toggling: Handle restaurant open/close status toggle clicks
el.restaurantStatusToggle.addEventListener('click', async () => {
  const wasOpen = el.restaurantStatusToggle.classList.contains('is-open');
  
  if (wasOpen) {
    // Open reason selection modal if turning OFF
    el.statusReasonModal.classList.remove('hidden');
    return;
  }

  // Turning LIVE immediately
  const hour = new Date().getHours();
  const isNight = hour >= 23 || hour < 11;
  const manualOverride = isNight;

  updateInFlight = true;
  // Optimistic UI updates
  el.restaurantStatusToggle.classList.add('is-open');
  el.restaurantStatusIcon.className = 'ri-store-2-line';
  el.restaurantStatusText.textContent = 'Accepting Orders';
  el.restaurantStatusText.className = 'toggle-status-text live';

  try {
    const statusRef = doc(db, 'settings', 'status');
    await setDoc(statusRef, {
      isOpen: true,
      reason: null,
      manualOverride
    });
    showToast('Restaurant turned LIVE successfully!', 'success');
  } catch (error: any) {
    console.error("Error setting restaurant status:", error);
    showToast(`Failed to update status: ${error.message}`, 'error');
    // Revert state
    el.restaurantStatusToggle.classList.remove('is-open');
    el.restaurantStatusIcon.className = 'ri-lock-line';
    const statusSnap = await getDoc(doc(db, 'settings', 'status'));
    if (statusSnap.exists()) {
      const data = statusSnap.data();
      el.restaurantStatusText.textContent = data.reason || 'Closed';
      el.restaurantStatusText.className = 'toggle-status-text off';
    }
  } finally {
    setTimeout(() => { updateInFlight = false; }, 500);
  }
});

// Modal Reason Option selection logic
let selectedCloseReason = 'Chef/Workers not available';
const reasonOptions = document.querySelectorAll('.reason-option');

reasonOptions.forEach(optionEl => {
  optionEl.addEventListener('click', () => {
    reasonOptions.forEach(opt => {
      opt.classList.remove('selected');
      const icon = opt.querySelector('.reason-radio-icon');
      if (icon) icon.className = 'ri-radio-button-line reason-radio-icon';
    });
    optionEl.classList.add('selected');
    const icon = optionEl.querySelector('.reason-radio-icon');
    if (icon) icon.className = 'ri-radio-button-fill reason-radio-icon';
    selectedCloseReason = optionEl.getAttribute('data-reason') || 'Chef/Workers not available';
  });
});

// Close status modal handler
const closeStatusReasonModalFunc = () => {
  el.statusReasonModal.classList.add('hidden');
};
el.closeStatusReasonModal.addEventListener('click', closeStatusReasonModalFunc);

// Close modal when clicking outside the card
el.statusReasonModal.addEventListener('click', (e) => {
  if (e.target === el.statusReasonModal) {
    closeStatusReasonModalFunc();
  }
});

// Confirm close status handler
el.confirmStatusCloseBtn.addEventListener('click', async () => {
  closeStatusReasonModalFunc();
  
  updateInFlight = true;
  // Optimistic UI updates
  el.restaurantStatusToggle.classList.remove('is-open');
  el.restaurantStatusIcon.className = 'ri-lock-line';
  el.restaurantStatusText.textContent = selectedCloseReason;
  el.restaurantStatusText.className = 'toggle-status-text off';

  try {
    const statusRef = doc(db, 'settings', 'status');
    await setDoc(statusRef, {
      isOpen: false,
      reason: selectedCloseReason,
      manualOverride: false
    });
    showToast('Restaurant turned OFF successfully!', 'success');
  } catch (error: any) {
    console.error("Error setting restaurant status:", error);
    showToast(`Failed to update status: ${error.message}`, 'error');
    // Revert state
    const statusSnap = await getDoc(doc(db, 'settings', 'status'));
    if (statusSnap.exists()) {
      const data = statusSnap.data();
      const isOpen = data.isOpen !== false;
      if (isOpen) {
        el.restaurantStatusToggle.classList.add('is-open');
        el.restaurantStatusIcon.className = 'ri-store-2-line';
        el.restaurantStatusText.textContent = 'Accepting Orders';
        el.restaurantStatusText.className = 'toggle-status-text live';
      } else {
        el.restaurantStatusToggle.classList.remove('is-open');
        el.restaurantStatusIcon.className = 'ri-lock-line';
        el.restaurantStatusText.textContent = data.reason || 'Closed';
        el.restaurantStatusText.className = 'toggle-status-text off';
      }
    }
  } finally {
    setTimeout(() => { updateInFlight = false; }, 500);
  }
});

// --- Premium Custom Web Boot/Splash Screen Logic ---
const webSplashScreen = document.getElementById('web-splash-screen');
if (webSplashScreen) {
  const loadingTrackIcon = document.getElementById('loading-track-icon');
  if (loadingTrackIcon) {
    let phase = 0;
    const icons = ['ri-restaurant-line', 'ri-e-bike-2-line', 'ri-home-4-line'];
    
    // Rotate icons every 1.06s (1/3 of the 3.2s glide period)
    const iconInterval = setInterval(() => {
      phase = (phase + 1) % 3;
      loadingTrackIcon.className = icons[phase];
    }, 1060);

    // Fade out after 3.2s and hide layout
    setTimeout(() => {
      clearInterval(iconInterval);
      webSplashScreen.classList.add('fade-out');
      setTimeout(() => {
        webSplashScreen.style.display = 'none';
      }, 800);
    }, 3200);
  }
}

// --- Auth Input Focus Morphing Transitions ---
const authGroup = document.querySelector('.web-auth-group');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');

if (authGroup && emailInput && passwordInput) {
  const handleFocus = () => {
    authGroup.classList.add('focused');
  };
  
  const handleBlur = () => {
    // Small timeout to check if focus shifted directly to the other input field
    setTimeout(() => {
      if (document.activeElement !== emailInput && document.activeElement !== passwordInput) {
        authGroup.classList.remove('focused');
      }
    }, 60);
  };

  emailInput.addEventListener('focus', handleFocus);
  emailInput.addEventListener('blur', handleBlur);
  passwordInput.addEventListener('focus', handleFocus);
  passwordInput.addEventListener('blur', handleBlur);
}

// --- Login Brand Box Track Icon Phase Logic ---
const loginTrackIcon = document.getElementById('login-track-icon');
if (loginTrackIcon) {
  let loginPhase = 0;
  const icons = ['ri-restaurant-line', 'ri-e-bike-2-line', 'ri-home-4-line'];
  
  // Rotate icons continuously every 1.06s matching the glide loop
  setInterval(() => {
    loginPhase = (loginPhase + 1) % 3;
    loginTrackIcon.className = icons[loginPhase];
  }, 1060);
}
