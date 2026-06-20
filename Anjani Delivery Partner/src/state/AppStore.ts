/**
 * @file AppStore.ts
 * @description Global state management for the Delivery Partner app using Zustand.
 * Handles order lifecycle, authentication, map tracking, and Firebase synchronization.
 */
import { create } from 'zustand';
import { MenuItem, MenuItems } from '../data/MenuData';
import AsyncStorageOriginal from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AsyncStorage = Platform.OS === 'web' ? {
  getItem: async (key: string) => {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { window.localStorage.setItem(key, value); } catch (e) {}
  },
  removeItem: async (key: string) => {
    try { window.localStorage.removeItem(key); } catch (e) {}
  },
  clear: async () => {
    try { window.localStorage.clear(); } catch (e) {}
  }
} as any : AsyncStorageOriginal;
import { db, rtdb, isFirebaseConfigured } from '../config/firebase';
import * as Notifications from 'expo-notifications';

/**
 * Represents a saved address for a customer.
 */
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

/**
 * Represents an order currently active and pending delivery.
 * Contains tracking coordinates for both rider and customer.
 */
export interface ActiveOrder {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  status: OrderStatus;
  riderId?: string;
  createdAt?: number;
  riderLat: number;
  riderLng: number;
  restaurantLat: number;
  restaurantLng: number;
  userLat: number;
  userLng: number;
  paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE';
  utrNumber?: string;
  cookingInstructions?: string; // Additional cooking instructions
  rating?: number;
  reviewText?: string;
  messages?: ChatMessage[];
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
  isLoggingOut: boolean;
  setLoggingOut: (val: boolean) => void;
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
  seedMockOrders: () => void;

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
  seedDemoDashboardOrders: () => void;

  // Chat System
  chatMessages: { [orderId: string]: ChatMessage[] };
  sendChatMessage: (orderId: string, senderRole: 'customer' | 'rider', senderName: string, text: string) => void;

  // Restaurant Status
  isRestaurantOpen: boolean;
  restaurantCloseReason: string | null;
  isAutoNightMode: boolean;
  manualOverride: boolean;
  checkNightMode: () => void;
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

/**
 * Main application state store using Zustand.
 * Manages the entire delivery partner lifecycle, including auth, order fetching, 
 * and simulated/real-time tracking.
 */
export const useAppStore = create<AppState>((set, get) => {
  let timerId: any = null;

  // Load cached systemOrders instantly
  AsyncStorage.getItem('anjani_rider_system_orders_cache').then((data) => {
    if (data) {
      try {
        const cachedOrders = JSON.parse(data);
        if (useAppStore.getState().systemOrders.length === 0) {
          useAppStore.setState({ systemOrders: cachedOrders });
        }
      } catch (e) {}
    }
  });

  /**
   * Simulates the lifecycle of an order from PLACED to DELIVERED.
   * Gradually interpolates rider coordinates towards the customer location.
   * 
   * @param {string} orderId - The ID of the order to simulate.
   */
  const simulateOrderLifeCycle = (orderId: string) => {
    if (timerId) clearInterval(timerId);

    let currentStep = 0;
    const totalSteps = 15;

    timerId = setInterval(() => {
      const order = get().activeOrder;
      if (!order || order.id !== orderId) {
        if (timerId) clearInterval(timerId);
        return;
      }

      if (order.status === 'PLACED') {
        set({ activeOrder: { ...order, status: 'PREPARING' } });
      } else if (order.status === 'PREPARING') {
        set({ activeOrder: { ...order, status: 'OUT_FOR_DELIVERY' } });
      } else if (order.status === 'OUT_FOR_DELIVERY') {
        currentStep++;
        const fraction = currentStep / totalSteps;

        const newLat = order.restaurantLat + fraction * (order.userLat - order.restaurantLat);
        const newLng = order.restaurantLng + fraction * (order.userLng - order.restaurantLng);

        if (currentStep >= totalSteps) {
          set({ activeOrder: { ...order, riderLat: newLat, riderLng: newLng, status: 'DELIVERED' } });
          if (timerId) clearInterval(timerId);
        } else {
          set({ activeOrder: { ...order, riderLat: newLat, riderLng: newLng } });
        }
      }
    }, 15000);
  };

  /**
   * Real-time Firestore sync for orders.
   * Listens to the 'orders' collection to push live updates to the rider's dashboard.
   */
  if (isFirebaseConfigured) {
    try {
      const { collection, onSnapshot, query, where } = require('firebase/firestore');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.getTime();
      const ordersRef = collection(db, 'orders');
      const todayOrdersQuery = query(ordersRef, where('createdAt', '>=', startOfToday));
      onSnapshot(todayOrdersQuery, (snapshot: any) => {
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
          const newPlacedOrders = ordersList.filter(
            o => o.status === 'PLACED' && !currentOrders.some(co => co.id === o.id)
          );
          if (newPlacedOrders.length > 0) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'New Delivery Request! 📦',
                body: `${newPlacedOrders.length} new order(s) ready to be picked up.`,
                sound: true,
              },
              trigger: null,
            });
          }
        }

        set({ systemOrders: ordersList });
        AsyncStorage.setItem('anjani_rider_system_orders_cache', JSON.stringify(ordersList)).catch(() => {});
        
        const currentActive = get().activeOrder;
        if (currentActive) {
          const matching = ordersList.find(o => o.id === currentActive.id);
          if (matching) {
            set({ activeOrder: matching });
          }
        }
      }, (error: any) => {
        console.warn('Firestore orders sync deferred/unauthorized. Ensure public Firestore rules are active for orders: ', error.message);
        // Fallback: If systemOrders is empty (unauthorized to fetch), seed mock orders for testing/demo purposes
        if (get().systemOrders.length === 0) {
          get().seedDemoDashboardOrders();
        }
      });

      // Real-time Firestore sync for ALL menu items has been removed in favor of Smart Caching
      // The menu is now fetched on-demand inside the statusRef listener when the menuUpdatedAt timestamp changes.

      // Real-time Firestore sync for restaurant status
      const { doc } = require('firebase/firestore');
      const statusRef = doc(db, 'settings', 'status');
      onSnapshot(statusRef, async (snapshot: any) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const override = !!data.manualOverride;
          set({
            isRestaurantOpen: data.isOpen !== false,
            restaurantCloseReason: data.reason || null,
            manualOverride: override
          });
          get().checkNightMode();

          // Smart Menu Caching Logic
          try {
            const localCacheStr = await AsyncStorage.getItem('anjani_rider_menu_cache');
            const localTimestampStr = await AsyncStorage.getItem('anjani_rider_menu_updated_at');
            const localTimestamp = localTimestampStr ? parseInt(localTimestampStr) : 0;
            const serverTimestamp = data.menuUpdatedAt || 0;

            if (localCacheStr && localTimestamp >= serverTimestamp && serverTimestamp !== 0) {
              const cachedMenu = JSON.parse(localCacheStr);
              if (cachedMenu && cachedMenu.length > 0) {
                set({ menuItems: cachedMenu });
              }
            } else {
              const { getDocs, collection } = require('firebase/firestore');
              const menuSnapshot = await getDocs(collection(db, 'menu'));
              const updates: { [id: string]: any } = {};
              menuSnapshot.forEach((doc: any) => {
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
              AsyncStorage.setItem('anjani_rider_menu_cache', JSON.stringify(updatedMenu)).catch(() => {});
              AsyncStorage.setItem('anjani_rider_menu_updated_at', serverTimestamp.toString()).catch(() => {});
            }
          } catch (e: any) {
            console.warn("Menu cache/fetch error:", e);
          }
        }
      }, (error: any) => {
        console.warn('Firestore status sync deferred/unauthorized: ', error.message);
      });

    } catch (e) {
      console.log('Error initializing real-time Firestore listener:', e);
    }
  }

  return {
    isRestaurantOpen: true,
    restaurantCloseReason: null,
    isAutoNightMode: false,
    manualOverride: false,
    checkNightMode: () => {
      const hour = new Date().getHours();
      const isNight = hour >= 23 || hour < 11;
      const override = get().manualOverride;
      set({ isAutoNightMode: isNight && !override });
    },

    currentUser: null,
    isLoggingOut: false,
    setLoggingOut: (val) => set({ isLoggingOut: val }),
    login: async (profile) => {
      // Backwards-compatibility safety
      if (!profile.addresses) profile.addresses = [];
      if (profile.addresses.length === 0 && profile.address) {
        const defaultId = `ADD-${Math.floor(Date.now() % 100000)}`;
        profile.addresses = [{ id: defaultId, label: 'Home', details: profile.address }];
        profile.selectedAddressId = defaultId;
      }
      if (!profile.address && profile.addresses.length > 0) {
        profile.address = profile.addresses.find(a => a.id === profile.selectedAddressId)?.details || '';
      }

      set({ currentUser: profile });
      if (get().previousOrders.length === 0) {
        get().seedMockOrders();
      }

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
      } catch (e) {
        console.log('Background sync on login failed (offline mode)');
      }
    },
    logout: async () => {
      if (timerId) clearInterval(timerId);
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
          }

          // 2. Secondary path: email or phone lookup (legacy fallback)
          if (!cloudUser) {
            if (key.includes('@')) {
              const emailRef = doc(db, 'users', key);
              const emailSnap = await getDoc(emailRef);
              if (emailSnap.exists()) {
                cloudUser = emailSnap.data();
              }
            } else {
              const q = query(collection(db, 'users'), where('phone', '==', emailOrPhone.trim()));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                cloudUser = querySnap.docs[0].data();
              }
            }
          }

          if (cloudUser) {
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
        longitude: user.longitude
      };

      // Sync with Cloud Firestore — use UID as doc ID to match Customer App
      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const docId = user.uid; // Always use UID for cross-app consistency
          const userRef = doc(db, 'users', docId);
          await setDoc(userRef, payload);
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
        
        if (userStr) {
          const localUser = JSON.parse(userStr);
          const localOrders = ordersStr ? JSON.parse(ordersStr) : [];
          set({ currentUser: localUser, previousOrders: localOrders });
          
          // Attempt silent background sync to update changes
          let cloudUser: any = null;
          
          if (isFirebaseConfigured) {
            try {
              const { doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');
              const key = (localUser.email || localUser.phone).toLowerCase().trim();
              if (key.includes('@')) {
                const userRef = doc(db, 'users', key);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                  cloudUser = userSnap.data();
                }
              } else {
                const q = query(collection(db, 'users'), where('phone', '==', key));
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                  cloudUser = querySnap.docs[0].data();
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
        id: `ADD-${Math.floor(Date.now() % 100000)}`,
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
          id: `ADD-${Math.floor(Date.now() % 100000)}`,
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
        customerName: get().currentUser?.name || 'Customer',
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
        utrNumber,
        cookingInstructions,
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

      simulateOrderLifeCycle(orderId);
    },
    clearActiveOrder: () => {
      if (timerId) clearInterval(timerId);
      const active = get().activeOrder;
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
          ...get().previousOrders
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
          .then(() => get().syncWithCloud())
          .catch((err: any) => console.error(err));
      } else {
        set({ activeOrder: null });
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
    seedMockOrders: () => {
      const mockItems1: OrderItem[] = [
        {
          item: {
            id: 'vs1',
            name: 'Veg Manchow Soup',
            category: 'Veg Soups',
            description: 'A delightful vegetarian option prepared fresh using authentic local garden produce.',
            price: 120,
            imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=80',
            isVeg: true,
            rating: 4.3
          },
          quantity: 2
        },
        {
          item: {
            id: 'brd9',
            name: 'Garlic Naan',
            category: 'Breads',
            description: '',
            price: 60,
            imageUrl: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=500&q=80',
            isVeg: true,
            rating: 4.7
          },
          quantity: 3
        }
      ];

      const mockItems2: OrderItem[] = [
        {
          item: {
            id: 'bir1',
            name: 'Veg Dum Biryani',
            category: 'Biryani',
            description: 'Traditional slow-cooked layered rice dish cooked with premium basmati rice and fresh garden vegetables.',
            price: 250,
            imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
            isVeg: true,
            rating: 4.6
          },
          quantity: 1
        }
      ];

      const orders: PreviousOrder[] = [
        {
          id: 'ORD-98231',
          date: '18 May 2026',
          items: mockItems1,
          totalAmount: 420 + 30 + 21,
          status: 'DELIVERED',
          paymentMethod: 'COD'
        },
        {
          id: 'ORD-76293',
          date: '14 May 2026',
          items: mockItems2,
          totalAmount: 250 + 30 + 12.5,
          status: 'DELIVERED',
          paymentMethod: 'GPAY',
          utrNumber: '928374829384'
        }
      ];

      set({ previousOrders: orders });
      AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(orders))
        .catch((err: any) => console.error(err));
    },

    systemOrders: [],
    soldOutDishIds: [],
    menuItems: MenuItems,

    updateOrderStatus: (orderId, status) => {
      const updatedSystem = get().systemOrders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      );
      const active = get().activeOrder;
      const updatedActive = active && active.id === orderId ? { ...active, status } : active;

      set({ systemOrders: updatedSystem, activeOrder: updatedActive });

      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          updateDoc(orderRef, { status })
            .catch((e: any) => console.log('Firestore status update deferred:', e.message));
        } catch (e: any) {
          console.log('Firebase status sync skipped:', e.message);
        }
      }
    },

    acceptDeliveryTask: (orderId) => {
      const updatedSystem = get().systemOrders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'OUT_FOR_DELIVERY' as OrderStatus,
              riderLat: restaurantCoords.lat,
              riderLng: restaurantCoords.lng,
            }
          : o
      );
      const active = get().activeOrder;
      const updatedActive =
        active && active.id === orderId
          ? {
              ...active,
              status: 'OUT_FOR_DELIVERY' as OrderStatus,
              riderLat: restaurantCoords.lat,
              riderLng: restaurantCoords.lng,
            }
          : active;

      set({ systemOrders: updatedSystem, activeOrder: updatedActive });

      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          updateDoc(orderRef, {
            status: 'OUT_FOR_DELIVERY',
            riderLat: restaurantCoords.lat,
            riderLng: restaurantCoords.lng,
          }).catch((e: any) => console.log('Firestore accept sync deferred:', e.message));
        } catch (e: any) {
          console.log('Firebase accept sync skipped:', e.message);
        }
      }
    },

    updateRiderSimulatedPosition: (orderId, lat, lng) => {
      const updatedSystem = get().systemOrders.map((o) =>
        o.id === orderId ? { ...o, riderLat: lat, riderLng: lng } : o
      );
      const active = get().activeOrder;
      const updatedActive =
        active && active.id === orderId ? { ...active, riderLat: lat, riderLng: lng } : active;

      set({ systemOrders: updatedSystem, activeOrder: updatedActive });

      if (isFirebaseConfigured && rtdb) {
        try {
          const { ref, set } = require('firebase/database');
          const trackingRef = ref(rtdb, `tracking/${orderId}`);
          set(trackingRef, { lat, lng })
            .catch((e: any) => console.log('RTDB position update deferred:', e.message));
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

    seedDemoDashboardOrders: () => {
      const demoOrders: ActiveOrder[] = [
        {
          id: 'ORD-55410',
          customerName: 'Aarav Mehta',
          items: [
            {
              item: {
                id: 'bir1',
                name: 'Veg Dum Biryani',
                category: 'Biryani',
                description: 'Traditional slow-cooked layered rice dish',
                price: 250,
                imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=500&q=80',
                isVeg: true,
                rating: 4.6
              },
              quantity: 2
            },
            {
              item: {
                id: 'vs1',
                name: 'Veg Manchow Soup',
                category: 'Veg Soups',
                description: 'A delightful vegetarian soup option.',
                price: 120,
                imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=500&q=80',
                isVeg: true,
                rating: 4.3
              },
              quantity: 1
            }
          ],
          totalAmount: 620 + 30 + 31,
          customerAddress: 'Apartment 402, Block B, Silver Springs Residency, Gachibowli, Hyderabad',
          customerPhone: '+91 9876543210',
          status: 'PLACED',
          riderLat: restaurantCoords.lat,
          riderLng: restaurantCoords.lng,
          restaurantLat: restaurantCoords.lat,
          restaurantLng: restaurantCoords.lng,
          userLat: 17.4435,
          userLng: 78.4680,
          paymentMethod: 'GPAY',
          cookingInstructions: 'Make it extra spicy, please! Less oil.',
        },
        {
          id: 'ORD-21094',
          customerName: 'Priya Sharma',
          items: [
            {
              item: {
                id: 'brd9',
                name: 'Garlic Naan',
                category: 'Breads',
                description: 'Leavened flatbread with garlic',
                price: 60,
                imageUrl: 'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?auto=format&fit=crop&w=500&q=80',
                isVeg: true,
                rating: 4.7
              },
              quantity: 4
            }
          ],
          totalAmount: 240 + 30 + 12,
          customerAddress: 'Villa 18, Nectar Gardens, Madhapur, Hyderabad',
          customerPhone: '+91 8877665544',
          status: 'PREPARING',
          riderLat: restaurantCoords.lat,
          riderLng: restaurantCoords.lng,
          restaurantLat: restaurantCoords.lat,
          restaurantLng: restaurantCoords.lng,
          userLat: 17.4520,
          userLng: 78.4810,
          paymentMethod: 'COD',
          cookingInstructions: 'No garlic on one naan, keep butter normal.',
        }
      ];
      set({ systemOrders: demoOrders });
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
  // Prevent hot-reload memory leaks
  if ((globalThis as any)._anjaniRiderInterval) clearInterval((globalThis as any)._anjaniRiderInterval);
  
  useAppStore.getState().checkNightMode();
  
  // Periodic check every 1 minute
  (globalThis as any)._anjaniRiderInterval = setInterval(() => {
    useAppStore.getState().checkNightMode();
  }, 60000);

  const { auth } = require('../config/firebase');
  if (auth) {
    const { signInWithEmailAndPassword, onAuthStateChanged } = require('firebase/auth');
    
    signInWithEmailAndPassword(auth, 'rider@anjani.com', 'rider123').catch((error: any) => {
      console.warn("Rider Firebase Auth failed:", error);
    });
    
    onAuthStateChanged(auth, (user: any) => {
      if (user) {
        console.log("Rider authenticated successfully with UID:", user.uid);
        setTimeout(() => {
          const store = useAppStore.getState();
          if (store.systemOrders.length === 0) {
             // Resync or rely on snapshot retry mechanism
          }
        }, 1000);
      }
    });
  }
}
