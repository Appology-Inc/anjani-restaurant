import { create } from 'zustand';
import { MenuItem, MenuItems } from '../data/MenuData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, isFirebaseConfigured } from '../config/firebase';
import { scheduleLocalNotification } from '../utils/notifications';

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  details: string;
  latitude?: number;
  longitude?: number;
}

export interface CustomerProfile {
  uid: string;
  name: string;
  phone: string;
  email: string;
  address: string; // Backwards compatibility: holds current active details
  addresses: SavedAddress[];
  selectedAddressId: string;
  latitude?: number;
  longitude?: number;
}

export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  item: MenuItem;
  quantity: number;
}

export interface ActiveOrder {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  customerAddress: string;
  customerPhone: string;
  customerName?: string;
  status: OrderStatus;
  riderLat: number;
  riderLng: number;
  restaurantLat: number;
  restaurantLng: number;
  userLat: number;
  userLng: number;
  paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE';
  utrNumber?: string;
  paymentVerified?: boolean; // True if the owner has manually verified the UTR
  cookingInstructions?: string; // Additional cooking instructions
  rating?: number;
  reviewText?: string;
  messages?: ChatMessage[];
  hasRealRider?: boolean;
  riderId?: string;
  createdAt?: number;
}

export interface PreviousOrder {
  id: string;
  date: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'DELIVERED';
  paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE';
  utrNumber?: string;
  cookingInstructions?: string; // Additional cooking instructions
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderRole: 'customer' | 'rider';
  senderName: string;
  text: string;
  timestamp: number;
}

interface AppState {
  // Session State
  currentUser: CustomerProfile | null;
  login: (profile: CustomerProfile) => Promise<void>;
  logout: () => Promise<void>;
  
  // Custom Registration / Session Recovery
  loginFromCloud: (emailOrPhone: string) => Promise<boolean>;
  syncWithCloud: () => Promise<void>;
  loadSavedSession: () => Promise<void>;

  // Saved Addresses Actions
  addSavedAddress: (label: 'Home' | 'Work' | 'Other', details: string, latitude?: number, longitude?: number) => Promise<void>;
  deleteSavedAddress: (addressId: string) => Promise<void>;
  selectSavedAddress: (addressId: string) => Promise<void>;
  updateAddress: (details: string, latitude?: number, longitude?: number) => Promise<void>; // backwards-compatible single address modifier

  // Cart State
  cart: { [itemId: string]: OrderItem };
  addToCart: (item: MenuItem) => void;
  removeFromCart: (item: MenuItem) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;

  // Active Order State
  activeOrder: ActiveOrder | null;
  placeOrder: (
    address: string, 
    phone: string, 
    paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE', 
    utrNumber?: string,
    cookingInstructions?: string, // Additional cooking instructions
    userLat?: number,
    userLng?: number
  ) => void;
  clearActiveOrder: () => void;

  // Previous Orders State
  previousOrders: PreviousOrder[];
  reorder: (items: OrderItem[]) => void;


  // Multi-Role & System States
  systemOrders: ActiveOrder[];
  soldOutDishIds: string[];
  menuItems: MenuItem[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  acceptDeliveryTask: (orderId: string) => void;
  updateRiderSimulatedPosition: (orderId: string, lat: number, lng: number) => void;
  toggleDishAvailability: (dishId: string) => Promise<void>;
  updateMenuItem: (
    itemId: string,
    name: string,
    description: string,
    price: number,
    isAvailable: boolean
  ) => Promise<void>;
  deleteMenuItem: (itemId: string) => Promise<void>;


  // Chat System
  chatMessages: { [orderId: string]: ChatMessage[] };
  sendChatMessage: (orderId: string, senderRole: 'customer' | 'rider', senderName: string, text: string) => void;

  // Restaurant Status
  isRestaurantOpen: boolean;
  restaurantCloseReason: string | null;
  isAutoNightMode: boolean;
  checkNightMode: () => void;
  initCloudListeners: () => void;
}

// API Network Lookups with emulator failovers
const LOCALHOST_URL = 'http://localhost:3000';
const ANDROID_EMULATOR_URL = 'http://10.0.2.2:3000';

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function callCloudAPI(path: string, options: RequestInit = {}): Promise<any> {
  // Attempt 1: Localhost (iOS / Web / Host)
  try {
    const res = await fetchWithTimeout(`${LOCALHOST_URL}${path}`, options);
    if (res.ok) return await res.json();
  } catch (e) {
    // Ignore and try fallback
  }

  // Attempt 2: 10.0.2.2 (Android Emulator)
  try {
    const res = await fetchWithTimeout(`${ANDROID_EMULATOR_URL}${path}`, options);
    if (res.ok) return await res.json();
  } catch (e) {
    // Ignore and throw
  }

  throw new Error('Cloud DB server unreachable');
}

// Peddapuram, Andhra Pradesh coordinates (Anjani Restaurant) — must match Customer App
const restaurantCoords = { lat: 17.0790, lng: 82.1374 };
const userCoords = { lat: 17.0850, lng: 82.1400 };

export const useAppStore = create<AppState>((set, get) => {
  let timerIds: { [orderId: string]: any } = {};
  let acceptInFlight = false; // Guard: prevents onSnapshot from clobbering optimistic accept state


  // Real-time Firestore sync for all orders and active tracking coordinates
  return {
    initCloudListeners: () => {
  if (isFirebaseConfigured) {
    try {
      const { collection, onSnapshot, doc } = require('firebase/firestore');
      const ordersRef = collection(db, 'orders');
      onSnapshot(ordersRef, (snapshot: any) => {
        const ordersList: ActiveOrder[] = [];
        const chatsObj: { [orderId: string]: ChatMessage[] } = {};

        snapshot.forEach((doc: any) => {
          const data = doc.data() as ActiveOrder;
          ordersList.push(data);
          
          if (data.messages) {
            chatsObj[data.id] = data.messages;
          }
        });

        if (Object.keys(chatsObj).length > 0) {
          set({ chatMessages: { ...get().chatMessages, ...chatsObj } });
        }

        const currentOrders = get().systemOrders;
        if (currentOrders.length > 0) {
          const newReadyOrders = ordersList.filter(
            o => o.status === 'READY' && !currentOrders.some(co => co.id === o.id && co.status === 'READY')
          );
          if (newReadyOrders.length > 0) {
            scheduleLocalNotification(
              'New Delivery Available!', 
              `Order ${newReadyOrders[0].id.slice(-6)} is ready for pickup.`
            );
          }
        }

        // Don't overwrite local state if we're in the middle of an accept operation
        if (acceptInFlight) {
          console.log('Skipping onSnapshot update — accept in flight');
          return;
        }

        set({ systemOrders: ordersList });
        
        const currentActive = get().activeOrder;
        if (currentActive) {
          const matching = ordersList.find(o => o.id === currentActive.id);
          if (matching) {
            set({ activeOrder: matching });
          }
        }
      }, (error: any) => {
        console.warn('Firestore orders sync deferred/unauthorized. Ensure public Firestore rules are active for orders: ', error.message);
        // Retry logic for race conditions on fresh logins
        setTimeout(() => {
          if (get().currentUser) {
             get().initCloudListeners();
          }
        }, 3000);
      });

      // Real-time Firestore sync for customized menu items
      const menuRef = collection(db, 'menu');
      onSnapshot(menuRef, (snapshot: any) => {
        const updates: { [id: string]: any } = {};
        snapshot.forEach((doc: any) => {
          updates[doc.id] = doc.data();
        });
        
        const currentMenu = get().menuItems || MenuItems;
        const updatedMenu = currentMenu.map(item => {
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
        set({ menuItems: updatedMenu });
      }, (error: any) => {
        console.warn('Firestore menu sync deferred/unauthorized: ', error.message);
      });

      // Real-time Firestore sync for restaurant status
      const statusRef = doc(db, 'settings', 'status');
      onSnapshot(statusRef, (snapshot: any) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          set({
            isRestaurantOpen: data.isOpen !== false,
            restaurantCloseReason: data.reason || null
          });
        }
      }, (error: any) => {
        console.warn('Firestore status sync deferred/unauthorized: ', error.message);
      });

    } catch (e) {
      console.log('Error initializing real-time Firestore listener:', e);
    }
  }
  },

    isRestaurantOpen: true,
    restaurantCloseReason: null,
    isAutoNightMode: false,
    checkNightMode: () => {
      const hour = new Date().getHours();
      // Temporarily changed to 10 AM so the user can test the app right now
      const nightMode = hour >= 23 || hour < 11;
      set({ isAutoNightMode: nightMode });
    },

    currentUser: null,
    login: async (profile) => {
      // Backwards-compatibility safety
      if (!profile.addresses) profile.addresses = [];
      if (profile.addresses.length === 0 && profile.address) {
        const defaultId = `ADD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        profile.addresses = [{ id: defaultId, label: 'Home', details: profile.address }];
        profile.selectedAddressId = defaultId;
      }
      if (!profile.address && profile.addresses.length > 0) {
        profile.address = profile.addresses.find(a => a.id === profile.selectedAddressId)?.details || '';
      }

      set({ currentUser: profile });


      // Persist locally
      try {
        await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(profile));
        await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(get().previousOrders));
      } catch (err) {
        console.error('Local persistence save error:', err);
      }

      // Sync to cloud
      try {
        await get().syncWithCloud();
        get().initCloudListeners();
      } catch (e) {
        console.log('Background sync on login failed (offline mode)');
      }
    },
    logout: async () => {
      Object.values(timerIds).forEach(t => clearInterval(t));
      timerIds = {};
      set({ currentUser: null, activeOrder: null, cart: {} });
      try {
        await AsyncStorage.removeItem('anjani_rider_user_profile');
        await AsyncStorage.removeItem('anjani_previous_orders');
      } catch (err) {
        console.error('Local persistence clear error:', err);
      }
    },
    
    // Custom Registration / Session Recovery
    loginFromCloud: async (emailOrPhone) => {
      const key = emailOrPhone.toLowerCase().trim();

      // Attempt Firestore retrieval
      if (isFirebaseConfigured) {
        try {
          const { doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');
          let cloudUser: any = null;

          // 1. Primary path: try direct UID lookup (matches Customer App's storage pattern)
          const uidRef = doc(db, 'users', emailOrPhone.trim());
          const uidSnap = await getDoc(uidRef);
          if (uidSnap.exists()) {
            cloudUser = uidSnap.data();
            cloudUser.uid = uidSnap.id;
          }

          // 2. Secondary path: email or phone lookup (legacy fallback)
          if (!cloudUser) {
            if (key.includes('@')) {
              const emailRef = doc(db, 'users', key);
              const emailSnap = await getDoc(emailRef);
              if (emailSnap.exists()) {
                cloudUser = emailSnap.data();
                cloudUser.uid = emailSnap.id;
              }
            } else {
              const q = query(collection(db, 'users'), where('phone', '==', emailOrPhone.trim()));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                cloudUser = querySnap.docs[0].data();
                cloudUser.uid = querySnap.docs[0].id;
              }
            }
          }

          if (cloudUser) {
            if (!cloudUser.uid) {
              cloudUser.uid = emailOrPhone.trim();
            }
            if (!cloudUser.address && cloudUser.addresses?.length > 0) {
              cloudUser.address = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId)?.details || '';
            }

            set({ 
              currentUser: cloudUser, 
              previousOrders: cloudUser.previousOrders || [] 
            });

            await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(cloudUser));
            await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(cloudUser.previousOrders || []));
            console.log('Successfully recovered profile from Firebase:', emailOrPhone);
            return true;
          }
        } catch (e: any) {
          console.log('Firebase user retrieval failed (falling back to mock):', e.message);
        }
      }

      // Safe Fallback to Mock Server
      try {
        const res = await callCloudAPI(`/user/${encodeURIComponent(emailOrPhone)}`);
        if (res && res.success && res.user) {
          const cloudUser = res.user;
          
          // Backwards compatibility safeguard
          if (!cloudUser.address && cloudUser.addresses.length > 0) {
            cloudUser.address = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId)?.details || '';
          }

          set({ 
            currentUser: cloudUser, 
            previousOrders: cloudUser.previousOrders || [] 
          });

          // Sync to local AsyncStorage
          await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(cloudUser));
          await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(cloudUser.previousOrders || []));
          return true;
        }
      } catch (e: any) {
        console.log('Cloud retrieval failed (offline/unregistered):', e.message);
      }
      return false;
    },
    syncWithCloud: async () => {
      const user = get().currentUser;
      if (!user) return;

      const payload = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addresses: user.addresses || [],
        selectedAddressId: user.selectedAddressId || '',
        previousOrders: get().previousOrders || [],
        latitude: user.latitude,
        longitude: user.longitude,
        role: 'rider'
      };

      // Sync with Cloud Firestore — use UID as doc ID to match Customer App
      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const docId = user.uid; // Always use UID for cross-app consistency
          const userRef = doc(db, 'users', docId);
          await setDoc(userRef, payload, { merge: true });
          console.log('Firestore user profile synchronized successfully:', docId);
        } catch (e: any) {
          console.log('Firestore background sync deferred (offline cache):', e.message);
        }
      }

      // Fallback Sync with Mock Server
      try {
        await callCloudAPI('/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.log('Mock server sync deferred (running in offline cache mode)');
      }
    },
    loadSavedSession: async () => {
      try {
        const userStr = await AsyncStorage.getItem('anjani_rider_user_profile');
        const ordersStr = await AsyncStorage.getItem('anjani_previous_orders');
        const activeOrderStr = await AsyncStorage.getItem('anjani_rider_active_order');
        
        let localUser = null;
        if (userStr) localUser = JSON.parse(userStr);

        let localOrders = [];
        if (ordersStr) {
          localOrders = JSON.parse(ordersStr);
          // Purge any lingering mock demo orders from the local cache
          localOrders = localOrders.filter((o: any) => !['ORD-55410', 'ORD-21094', 'ORD-98231', 'ORD-76293'].includes(o.id));
          await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(localOrders));
        }

        let localActiveOrder = null;
        if (activeOrderStr) {
          localActiveOrder = JSON.parse(activeOrderStr);
        }

        if (localUser) {
          set({ currentUser: localUser, previousOrders: localOrders, activeOrder: localActiveOrder });
          
          // Guarantee that the live order listener is attached when restoring a session
          get().initCloudListeners();

          // Attempt silent background sync to update changes
          let cloudUser: any = null;
          
          if (isFirebaseConfigured) {
            try {
              const { doc, getDoc } = require('firebase/firestore');
              const uid = localUser.uid;
              if (uid) {
                const userRef = doc(db, 'users', uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  cloudUser = userSnap.data();
                  cloudUser.uid = uid;
                }
              }
            } catch (err: any) {
              console.log('Firebase background silent sync deferred:', err.message);
            }
          }

          if (!cloudUser) {
            try {
              const key = localUser.email || localUser.phone;
              const res = await callCloudAPI(`/user/${encodeURIComponent(key)}`);
              if (res && res.success && res.user) {
                cloudUser = res.user;
              }
            } catch (syncErr) {
              console.log('Background silent sync mock server offline. Active cache loaded.');
            }
          }
          
          if (isFirebaseConfigured) {
            // Auto-heal permissions: push local profile back to cloud to ensure 'role' is set correctly
            get().syncWithCloud().catch(() => {});
          }
          
          if (cloudUser) {
            if (!cloudUser.address && cloudUser.addresses && cloudUser.addresses.length > 0) {
              cloudUser.address = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId)?.details || '';
            }
            
            set({ 
              currentUser: cloudUser,
              previousOrders: cloudUser.previousOrders || []
            });
            await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(cloudUser));
            await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(cloudUser.previousOrders || []));
            console.log('Silently synchronized profile cache with cloud DB.');
          }
        }
      } catch (err) {
        console.error('Session boot loading failed:', err);
      }
    },

    // Saved Addresses
    addSavedAddress: async (label, details, latitude, longitude) => {
      const user = get().currentUser;
      if (!user) return;

      const newAddress: SavedAddress = {
        id: `ADD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        label,
        details,
        latitude,
        longitude
      };

      const updatedAddresses = [...(user.addresses || []), newAddress];
      const selectedAddressId = user.selectedAddressId || newAddress.id;
      const activeAddress = updatedAddresses.find(a => a.id === selectedAddressId);
      const activeDetails = activeAddress?.details || details;

      const updatedUser = {
        ...user,
        addresses: updatedAddresses,
        selectedAddressId,
        address: activeDetails,
        latitude: activeAddress?.latitude || user.latitude,
        longitude: activeAddress?.longitude || user.longitude
      };

      set({ currentUser: updatedUser });
      await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(updatedUser));
      await get().syncWithCloud();
    },
    deleteSavedAddress: async (addressId) => {
      const user = get().currentUser;
      if (!user) return;

      const updatedAddresses = (user.addresses || []).filter(a => a.id !== addressId);
      let selectedAddressId = user.selectedAddressId;
      if (selectedAddressId === addressId) {
        selectedAddressId = updatedAddresses.length > 0 ? updatedAddresses[0].id : '';
      }
      const activeAddress = updatedAddresses.find(a => a.id === selectedAddressId);
      const activeDetails = activeAddress?.details || '';

      const updatedUser = {
        ...user,
        addresses: updatedAddresses,
        selectedAddressId,
        address: activeDetails,
        latitude: activeAddress?.latitude,
        longitude: activeAddress?.longitude
      };

      set({ currentUser: updatedUser });
      await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(updatedUser));
      await get().syncWithCloud();
    },
    selectSavedAddress: async (addressId) => {
      const user = get().currentUser;
      if (!user) return;

      const activeAddress = (user.addresses || []).find(a => a.id === addressId);
      const activeDetails = activeAddress?.details || '';

      const updatedUser = {
        ...user,
        selectedAddressId: addressId,
        address: activeDetails,
        latitude: activeAddress?.latitude || user.latitude,
        longitude: activeAddress?.longitude || user.longitude
      };

      set({ currentUser: updatedUser });
      await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(updatedUser));
      await get().syncWithCloud();
    },
    updateAddress: async (details, latitude, longitude) => {
      const user = get().currentUser;
      if (!user) return;

      let updatedAddresses = [...(user.addresses || [])];
      let selectedAddressId = user.selectedAddressId;

      const activeIndex = updatedAddresses.findIndex(a => a.id === selectedAddressId);
      if (activeIndex !== -1) {
        updatedAddresses[activeIndex] = {
          ...updatedAddresses[activeIndex],
          details,
          latitude: latitude !== undefined ? latitude : updatedAddresses[activeIndex].latitude,
          longitude: longitude !== undefined ? longitude : updatedAddresses[activeIndex].longitude
        };
      } else {
        const newAddress: SavedAddress = {
          id: `ADD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          label: 'Home',
          details,
          latitude,
          longitude
        };
        updatedAddresses.push(newAddress);
        selectedAddressId = newAddress.id;
      }

      const activeAddress = updatedAddresses.find(a => a.id === selectedAddressId);

      const updatedUser = {
        ...user,
        addresses: updatedAddresses,
        selectedAddressId,
        address: details,
        latitude: activeAddress?.latitude || latitude || user.latitude,
        longitude: activeAddress?.longitude || longitude || user.longitude
      };

      set({ currentUser: updatedUser });
      await AsyncStorage.setItem('anjani_rider_user_profile', JSON.stringify(updatedUser));
      await get().syncWithCloud();
    },

    cart: {},
    addToCart: (item) => set((state) => {
      const existing = state.cart[item.id];
      const quantity = existing ? existing.quantity + 1 : 1;
      return {
        cart: { ...state.cart, [item.id]: { item, quantity } }
      };
    }),
    removeFromCart: (item) => set((state) => {
      const existing = state.cart[item.id];
      if (!existing) return {};
      if (existing.quantity <= 1) {
        const nextCart = { ...state.cart };
        delete nextCart[item.id];
        return { cart: nextCart };
      }
      return {
        cart: { ...state.cart, [item.id]: { item, quantity: existing.quantity - 1 } }
      };
    }),
    clearCart: () => set({ cart: {} }),
    getCartTotal: () => {
      const { cart } = get();
      return Object.values(cart).reduce((sum, item) => sum + item.item.price * item.quantity, 0);
    },
    getCartCount: () => {
      const { cart } = get();
      return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
    },

    activeOrder: null,
    placeOrder: (address, phone, paymentMethod, utrNumber, cookingInstructions, userLat, userLng) => {
      const orderItems = Object.values(get().cart);
      if (orderItems.length === 0) return;

      const subtotal = get().getCartTotal();
      const deliveryFee = 30.0;
      const tax = subtotal * 0.05;
      const totalAmount = subtotal + deliveryFee + tax;

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const newOrder: ActiveOrder = {
        id: orderId,
        items: orderItems,
        totalAmount,
        customerAddress: address,
        customerPhone: phone,
        status: 'PLACED',
        riderLat: restaurantCoords.lat,
        riderLng: restaurantCoords.lng,
        restaurantLat: restaurantCoords.lat,
        restaurantLng: restaurantCoords.lng,
        userLat: userLat !== undefined ? userLat : userCoords.lat,
        userLng: userLng !== undefined ? userLng : userCoords.lng,
        paymentMethod,
        utrNumber: utrNumber || null,
        cookingInstructions: cookingInstructions || null,
      };

      set({ 
        activeOrder: newOrder, 
        cart: {},
        systemOrders: [newOrder, ...get().systemOrders]
      });
      
      // Save active order to Cloud Firestore
      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          setDoc(orderRef, newOrder)
            .then(() => console.log(`Active order ${orderId} saved to Firestore.`))
            .catch((e: any) => console.log('Firestore active order save deferred:', e.message));
        } catch (e: any) {
          console.log('Firebase active order sync skipped:', e.message);
        }
      }


    },
    clearActiveOrder: () => {
      const active = get().activeOrder;
      if (active && timerIds[active.id]) {
        clearInterval(timerIds[active.id]);
        delete timerIds[active.id];
      }
      if (active) {
        const updatedOrders: PreviousOrder[] = [
          {
            id: active.id,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            items: active.items,
            totalAmount: active.totalAmount,
            status: 'DELIVERED',
            paymentMethod: active.paymentMethod,
            utrNumber: active.utrNumber,
            cookingInstructions: active.cookingInstructions,
          },
          ...get().previousOrders.filter(o => o.id !== active.id)
        ];
        
        set({ 
          previousOrders: updatedOrders,
          activeOrder: null
        });

        // Mark order as DELIVERED in Firestore
        if (isFirebaseConfigured) {
          try {
            const { doc, updateDoc } = require('firebase/firestore');
            const orderRef = doc(db, 'orders', active.id);
            updateDoc(orderRef, { status: 'DELIVERED' })
              .then(() => console.log(`Firestore order ${active.id} status updated to DELIVERED.`))
              .catch((e: any) => console.log('Firestore order update deferred:', e.message));
          } catch (e: any) {
            console.log('Firebase active order update skipped:', e.message);
          }
        }

        // Background cache save & sync user (including updated previousOrders!)
        AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(updatedOrders))
          .then(() => AsyncStorage.removeItem('anjani_rider_active_order'))
          .then(() => get().syncWithCloud())
          .catch(err => console.error(err));
      } else {
        set({ activeOrder: null });
        AsyncStorage.removeItem('anjani_rider_active_order').catch(() => {});
      }
    },

    previousOrders: [],
    reorder: (items) => {
      const newCart: { [itemId: string]: OrderItem } = {};
      items.forEach((item) => {
        newCart[item.item.id] = { item: item.item, quantity: item.quantity };
      });
      set({ cart: newCart });
    },


    systemOrders: [],
    soldOutDishIds: [],
    menuItems: MenuItems,

    updateOrderStatus: (orderId, status) => {
      if (status === 'DELIVERED' || status === 'CANCELLED') {
        if (timerIds[orderId]) {
          clearInterval(timerIds[orderId]);
          delete timerIds[orderId];
        }
      }

      const originalSystem = get().systemOrders;
      const originalActive = get().activeOrder;
      
      const updatedSystem = originalSystem.map((o) =>
        o.id === orderId ? { ...o, status } : o
      );
      const updatedActive = originalActive && originalActive.id === orderId ? { ...originalActive, status } : originalActive;

      set({ systemOrders: updatedSystem, activeOrder: updatedActive });

      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          updateDoc(orderRef, { status })
            .catch((e: any) => {
              console.log('Firestore status update failed:', e.message);
              set({ systemOrders: originalSystem, activeOrder: originalActive });
            });
        } catch (e: any) {
          console.log('Firebase status sync skipped:', e.message);
        }
      }
    },

    acceptDeliveryTask: async (orderId) => {
      const riderId = get().currentUser?.uid || 'unknown_rider';
      
      // Save original state for rollback
      const originalSystem = get().systemOrders;
      const originalActive = get().activeOrder;
      
      // Set the guard BEFORE optimistic update
      acceptInFlight = true;
      
      const updatedSystem = originalSystem.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'OUT_FOR_DELIVERY' as OrderStatus,
              riderLat: restaurantCoords.lat,
              riderLng: restaurantCoords.lng,
              riderId: riderId,
            }
          : o
      );
      const updatedActive =
        originalActive && originalActive.id === orderId
          ? {
              ...originalActive,
              status: 'OUT_FOR_DELIVERY' as OrderStatus,
              riderLat: restaurantCoords.lat,
              riderLng: restaurantCoords.lng,
              hasRealRider: true,
              riderId: riderId,
            }
          : originalActive;

      // Optimistic local update
      set({ systemOrders: updatedSystem, activeOrder: updatedActive });
      
      if (updatedActive) {
        AsyncStorage.setItem('anjani_rider_active_order', JSON.stringify(updatedActive)).catch(() => {});
      }

      // Now write to Firestore and WAIT for it
      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, {
            status: 'OUT_FOR_DELIVERY',
            riderLat: restaurantCoords.lat,
            riderLng: restaurantCoords.lng,
            hasRealRider: true,
            riderId: riderId,
          });
          console.log(`Firestore accept successful for order ${orderId} by rider ${riderId}`);
        } catch (e: any) {
          console.error('Firestore accept FAILED — rolling back:', e.message);
          // Roll back to original state
          set({ systemOrders: originalSystem, activeOrder: originalActive });
        }
      }
      
      // Release the guard — the next onSnapshot will now correctly include our update
      acceptInFlight = false;
    },

    updateRiderSimulatedPosition: (orderId, lat, lng) => {
      const updatedSystem = get().systemOrders.map((o) =>
        o.id === orderId ? { ...o, riderLat: lat, riderLng: lng } : o
      );
      const active = get().activeOrder;
      const updatedActive =
        active && active.id === orderId ? { ...active, riderLat: lat, riderLng: lng } : active;

      set({ systemOrders: updatedSystem, activeOrder: updatedActive });

      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          updateDoc(orderRef, { riderLat: lat, riderLng: lng })
            .catch((e: any) => console.log('Firestore position update deferred:', e.message));
        } catch (e: any) {
          console.log('Firebase position update skipped:', e.message);
        }
      }
    },

    toggleDishAvailability: async (dishId) => {
      const currentSoldOut = get().soldOutDishIds;
      const isCurrentlySoldOut = currentSoldOut.includes(dishId);
      const nextSoldOut = isCurrentlySoldOut
        ? currentSoldOut.filter((id) => id !== dishId)
        : [...currentSoldOut, dishId];
      
      const newAvailability = isCurrentlySoldOut; // If it was sold out, it is now available (true)

      const currentMenu = get().menuItems || MenuItems;
      const updatedMenu = currentMenu.map(item => 
        item.id === dishId 
          ? { ...item, isAvailable: newAvailability }
          : item
      );

      set({ 
        soldOutDishIds: nextSoldOut,
        menuItems: updatedMenu 
      });

      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const itemRef = doc(db, 'menu', dishId);
          await setDoc(itemRef, {
            isAvailable: newAvailability
          }, { merge: true });
        } catch (e: any) {
          console.warn('Firestore availability toggle write deferred:', e.message);
        }
      }
    },

    updateMenuItem: async (itemId, name, description, price, isAvailable) => {
      const currentMenu = get().menuItems || MenuItems;
      const updatedMenu = currentMenu.map(item => 
        item.id === itemId 
          ? { ...item, name, description, price, isAvailable }
          : item
      );
      set({ menuItems: updatedMenu });

      const currentSoldOut = get().soldOutDishIds;
      if (!isAvailable) {
        if (!currentSoldOut.includes(itemId)) {
          set({ soldOutDishIds: [...currentSoldOut, itemId] });
        }
      } else {
        set({ soldOutDishIds: currentSoldOut.filter(id => id !== itemId) });
      }

      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const itemRef = doc(db, 'menu', itemId);
          await setDoc(itemRef, {
            id: itemId,
            name,
            description,
            price,
            isAvailable
          }, { merge: true });
          console.log(`Firestore menu item ${itemId} updated successfully.`);
        } catch (e: any) {
          console.warn('Firestore menu item write deferred:', e.message);
        }
      }
    },

    deleteMenuItem: async (itemId) => {
      const currentMenu = get().menuItems || MenuItems;
      const updatedMenu = currentMenu.filter(item => item.id !== itemId);
      set({ menuItems: updatedMenu });

      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const itemRef = doc(db, 'menu', itemId);
          await setDoc(itemRef, { isDeleted: true }, { merge: true });
          console.log(`Firestore menu item ${itemId} deleted successfully.`);
        } catch (e: any) {
          console.warn('Firestore menu item delete write deferred:', e.message);
        }
      }
    },



    // Chat System
    chatMessages: {},
    sendChatMessage: (orderId, senderRole, senderName, text) => {
      const newMessage: ChatMessage = {
        id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        orderId,
        senderRole,
        senderName,
        text: text.trim(),
        timestamp: Date.now(),
      };
      
      const current = get().chatMessages[orderId] || [];
      set({ chatMessages: { ...get().chatMessages, [orderId]: [...current, newMessage] } });

      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc, arrayUnion } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          updateDoc(orderRef, {
            messages: arrayUnion(newMessage)
          }).catch((e: any) => console.log('Firestore chat message sync deferred:', e.message));
        } catch (e) {
          console.warn('Failed to sync chat message to Firestore', e);
        }
      }
    },
  };
});

// Setup Firebase Auth for Rider
if (isFirebaseConfigured) {
  useAppStore.getState().checkNightMode();
  
  // Periodic check every 1 minute
  setInterval(() => {
    useAppStore.getState().checkNightMode();
  }, 60000);

  const { auth } = require('../config/firebase');
  const { onAuthStateChanged } = require('firebase/auth');
  
  onAuthStateChanged(auth, (user: any) => {
    if (user) {
      console.log("Rider authenticated successfully with UID:", user.uid);
      setTimeout(() => {
        useAppStore.getState().initCloudListeners();
      }, 500);
    }
  });
}
