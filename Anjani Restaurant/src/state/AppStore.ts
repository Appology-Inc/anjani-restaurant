/**
 * @file AppStore.ts
 * @description Global Zustand store managing the entire application state.
 * Handles user sessions, cart management, real-time orders sync via Firebase,
 * offline fallbacks, and restaurant availability statuses.
 */

import { create } from 'zustand';
import { MenuItem, MenuItems } from '../data/MenuData';
import AsyncStorageOriginal from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const AsyncStorage = Platform.OS === 'web' ? {
  getItem: async (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  },
  removeItem: async (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {}
  },
  clear: async () => {
    try {
      window.localStorage.clear();
    } catch (e) {}
  }
} as any : AsyncStorageOriginal;

import { db, rtdb, auth, isFirebaseConfigured } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { scheduleLocalNotification } from '../utils/notifications';
import { Alert } from 'react-native';

const logToCrashlytics = (action: string, data?: any) => {
  if (Platform.OS !== 'web') {
    try {
      const crashlytics = require('@react-native-firebase/crashlytics').default;
      if (action === 'setUserId' && data) crashlytics().setUserId(data);
      else if (action === 'log') crashlytics().log(data);
      else if (action === 'recordError') crashlytics().recordError(data);
    } catch(e) {}
  }
};

/**
 * Represents a saved address for a customer.
 */
export interface SavedAddress {
  id: string;
  label: string;
  details: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Represents the profile of an authenticated customer.
 */
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

/**
 * Represents the current status of an active order.
 */
export type OrderStatus = 'PLACED' | 'PAYMENT_PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

/**
 * Represents an item added to an order.
 */
export interface OrderItem {
  item: MenuItem;
  quantity: number;
}

/**
 * Represents an active order currently being processed or delivered.
 */
export interface ActiveOrder {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  restaurantLat: number;
  restaurantLng: number;
  userLat: number;
  userLng: number;
  riderLat: number;
  riderLng: number;
  customerAddress: string;
  customerPhone: string;
  customerUid?: string;
  paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE' | 'ONLINE';
  customerName?: string;
  utrNumber?: string;
  paymentVerified?: boolean; // True if the owner has manually verified the UTR
  cookingInstructions?: string;
  createdAt?: number;
  rating?: number;
  reviewText?: string;
  messages?: ChatMessage[];
  hasRealRider?: boolean;
  isDismissed?: boolean;
}

/**
 * Represents a chat message between a customer and a rider.
 */
export interface ChatMessage {
  id: string;
  orderId: string;
  senderRole: 'customer' | 'rider';
  senderName: string;
  text: string;
  timestamp: number;
}

/**
 * Represents a previously completed or cancelled order.
 */
export interface PreviousOrder {
  id: string;
  date: string;
  timestamp?: number;
  items: OrderItem[];
  totalAmount: number;
  status: 'DELIVERED' | 'CANCELLED';
  paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE';
  utrNumber?: string;
  cookingInstructions?: string; // Additional cooking instructions
  rating?: number;
  reviewText?: string;
}

/**
 * The full Zustand store interface defining state properties and actions.
 */
interface AppState {
  // Session State
  isSessionLoaded: boolean;
  currentUser: CustomerProfile | null;
  login: (profile: CustomerProfile) => Promise<void>;
  logout: () => Promise<void>;
  
  // Custom Registration / Session Recovery
  loginFromCloud: (emailOrPhone: string) => Promise<boolean>;
  syncWithCloud: () => Promise<void>;
  loadSavedSession: () => Promise<void>;

  // Saved Addresses Actions
  addSavedAddress: (label: string, details: string, latitude?: number, longitude?: number) => Promise<void>;
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

  // Active Orders State
  activeOrders: ActiveOrder[];
  placeOrder: (
    address: string, 
    phone: string, 
    paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE', 
    utrNumber?: string,
    cookingInstructions?: string, // Additional cooking instructions
    userLat?: number,
    userLng?: number
  ) => Promise<void>;
  createPendingOrder: (
    address: string,
    phone: string,
    cookingInstructions?: string,
    userLat?: number,
    userLng?: number
  ) => Promise<string | null>;
  confirmOrderPayment: (orderId: string, razorpayPaymentId: string) => Promise<void>;
  cancelOrderPayment: (orderId: string) => Promise<void>;
  dismissOrder: (orderId: string) => void;

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
  manualOverride: boolean;
  paymentServerUrl: string | null;
  checkNightMode: () => void;

  // Boot Location
  bootLocation: { latitude: number; longitude: number; address: string } | null;
  setBootLocation: (loc: { latitude: number; longitude: number; address: string } | null) => void;

  // Reviews
  submitReview: (orderId: string, rating: number, text: string) => Promise<void>;
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

async function callCloudAPI(path: string, options: RequestInit = {}, retries = 2): Promise<any> {
  let lastError = null;

  for (let i = 0; i < retries; i++) {
    // Attempt 1: Localhost (iOS / Web / Host)
    try {
      const res = await fetchWithTimeout(`${LOCALHOST_URL}${path}`, options, 3000);
      if (res.ok) return await res.json();
    } catch (e) {
      lastError = e;
    }

    // Attempt 2: 10.0.2.2 (Android Emulator)
    try {
      const res = await fetchWithTimeout(`${ANDROID_EMULATOR_URL}${path}`, options, 3000);
      if (res.ok) return await res.json();
    } catch (e) {
      lastError = e;
    }
    
    // Short backoff before retry
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.warn(`callCloudAPI failed after ${retries} retries. Path: ${path}`, lastError);
  logToCrashlytics('recordError', lastError || new Error(`API failed: ${path}`));
  throw new Error('Cloud DB server unreachable or timed out.');
}

// Peddapuram, Andhra Pradesh Mock Coordinates (Anjani Restaurant)
const restaurantCoords = { lat: 17.0790, lng: 82.1374 };
const userCoords = { lat: 17.0850, lng: 82.1400 };

/**
 * Zustand store hook for accessing the global application state.
 * Syncs with Firebase in real-time when authenticated.
 */
export const useAppStore = create<AppState>((set, get) => {
  let timerIds: { [orderId: string]: any } = {};
  let trackingUnsubs: { [orderId: string]: Function } = {};
  let cloudUnsub: any = null;
  let menuUnsub: any = null;
  let statusUnsub: any = null;
  let paymentUnsub: any = null;
  let lastStatusMap: { [orderId: string]: string } = {};
  // Remove actionInFlight to allow Firebase's local cache optimistic UI to work properly

  // Real-time Firestore sync for all orders and active tracking coordinates
  return {
    initCloudListeners: () => {
      if (isFirebaseConfigured) {
        try {
          const { collection, onSnapshot, query, where, doc } = require('firebase/firestore');
          const currentUserUid = get().currentUser?.uid || auth?.currentUser?.uid;
          
          if (currentUserUid) {
            if (cloudUnsub) cloudUnsub();
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, 
              where('customerUid', '==', currentUserUid),
              where('status', 'in', ['PAYMENT_PENDING', 'PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'])
            );
            cloudUnsub = onSnapshot(q, (snapshot: any) => {
              const ordersList: ActiveOrder[] = [];
              const prevList: PreviousOrder[] = [];
              const chatsObj: { [orderId: string]: ChatMessage[] } = {};

              snapshot.forEach((doc: any) => {
                const data = doc.data() as ActiveOrder;
                ordersList.push(data);

                if (data.messages) {
                  chatsObj[data.id] = data.messages;
                }

                if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
                  if (data.customerUid === currentUserUid) {
                    prevList.push({
                      id: data.id,
                      date: new Date(data.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                      timestamp: data.createdAt || Date.now(),
                      items: data.items,
                      totalAmount: data.totalAmount,
                      status: data.status,
                      paymentMethod: data.paymentMethod,
                      utrNumber: data.utrNumber,
                      cookingInstructions: data.cookingInstructions,
                      rating: data.rating,
                      reviewText: data.reviewText,
                    });
                  }
                }
              });
              
              set({ systemOrders: ordersList });
              
              if (Object.keys(chatsObj).length > 0) {
                set({ chatMessages: { ...get().chatMessages, ...chatsObj } });
              }

              // Sort by newest first (descending)
              prevList.sort((a, b) => (b.timestamp || new Date(b.date).getTime()) - (a.timestamp || new Date(a.date).getTime()));
              set({ previousOrders: prevList });
              AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(prevList)).catch(() => {});
              
              const currentActives = get().activeOrders || [];
              const newActives = ordersList.filter(o => {
                // If it's explicitly dismissed, never show it
                if (o.isDismissed) return false;
                
                // Auto-dismiss terminal or abandoned states older than 24 hours as a fallback
                if (o.status === 'DELIVERED' || o.status === 'CANCELLED' || o.status === 'PAYMENT_PENDING') {
                  if (o.createdAt && (Date.now() - o.createdAt > 24 * 60 * 60 * 1000)) return false;
                }
                
                return true;
              });
              
              // Notifications check for status changes on existing orders
              if (currentActives.length > 0) {
                newActives.forEach(active => {
                  const matchingOld = currentActives.find(o => o.id === active.id);
                  if (matchingOld && matchingOld.status !== active.status) {
                    let body = '';
                    if (active.status === 'ACCEPTED') body = 'The restaurant has confirmed your order ✅';
                    else if (active.status === 'PREPARING') body = 'Your order is being prepared in the kitchen 👨‍🍳';
                    else if (active.status === 'READY') body = 'Your order is ready and waiting for a rider 📦';
                    else if (active.status === 'OUT_FOR_DELIVERY') body = 'Your order is out for delivery! 🛵';
                    else if (active.status === 'DELIVERED') body = 'Your order has been delivered! Enjoy your meal 🍽️';
                    else if (active.status === 'CANCELLED') body = 'Your order was cancelled by the restaurant ❌';
                    
                    if (body) {
                      scheduleLocalNotification('Order Update', body);
                    }
                  }
                });
              }
              // Sort active orders: in-progress first, then newest first
              newActives.sort((a, b) => {
                const aIsTerminal = ['DELIVERED', 'CANCELLED', 'PAYMENT_PENDING'].includes(a.status);
                const bIsTerminal = ['DELIVERED', 'CANCELLED', 'PAYMENT_PENDING'].includes(b.status);
                
                if (aIsTerminal && !bIsTerminal) return 1;
                if (!aIsTerminal && bIsTerminal) return -1;
                
                // If both are in the same terminal/active group, sort by createdAt descending
                return (b.createdAt || 0) - (a.createdAt || 0);
              });

              // RTDB Live Tracking Listeners
              if (isFirebaseConfigured && rtdb) {
                const { ref, onValue, off } = require('firebase/database');
                
                newActives.forEach(active => {
                  if (active.status === 'OUT_FOR_DELIVERY') {
                    if (!trackingUnsubs[active.id]) {
                      const trackingRef = ref(rtdb, `tracking/${active.id}`);
                      const listener = onValue(trackingRef, (snap: any) => {
                        if (snap.exists()) {
                          const data = snap.val();
                          if (data.lat && data.lng) {
                            get().updateRiderSimulatedPosition(active.id, data.lat, data.lng);
                          }
                        }
                      });
                      trackingUnsubs[active.id] = () => off(trackingRef, 'value', listener);
                    }
                  } else {
                    if (trackingUnsubs[active.id]) {
                      trackingUnsubs[active.id]();
                      delete trackingUnsubs[active.id];
                    }
                  }
                });
                
                Object.keys(trackingUnsubs).forEach(orderId => {
                  if (!newActives.find(a => a.id === orderId && a.status === 'OUT_FOR_DELIVERY')) {
                    trackingUnsubs[orderId]();
                    delete trackingUnsubs[orderId];
                  }
                });
              }

              set({ activeOrders: newActives });
              AsyncStorage.setItem('anjani_active_orders', JSON.stringify(newActives)).catch(() => {});
            }, (error: any) => {
              console.warn('Firestore orders sync deferred/unauthorized. Ensure public Firestore rules are active for orders: ', error.message);
            });
          } else {
            console.log("No authenticated user, skipping orders listener");
          }

      // Real-time Firestore sync for ALL menu items has been removed in favor of Smart Caching
      // The menu is now fetched on-demand inside the statusUnsub listener when the menuUpdatedAt timestamp changes.

        // Real-time Firestore sync for restaurant status
        if (statusUnsub) statusUnsub();
        const statusRef = doc(db, 'settings', 'status');
        statusUnsub = onSnapshot(statusRef, async (docSnap: any) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const override = !!data.manualOverride;
            set({
              isRestaurantOpen: data.isOpen !== false,
              restaurantCloseReason: data.reason || null,
              manualOverride: override
            });
            get().checkNightMode();

            // Smart Menu Caching Logic
            try {
              const localCacheStr = await AsyncStorage.getItem('anjani_menu_cache');
              const localTimestampStr = await AsyncStorage.getItem('anjani_menu_updated_at');
              const localTimestamp = localTimestampStr ? parseInt(localTimestampStr) : 0;
              const serverTimestamp = data.menuUpdatedAt || 0;

              if (localCacheStr && localTimestamp >= serverTimestamp && serverTimestamp !== 0) {
                // Use cache
                const cachedMenu = JSON.parse(localCacheStr);
                if (cachedMenu && cachedMenu.length > 0) {
                  set({ menuItems: cachedMenu });
                }
              } else {
                // Fetch from Firebase
                const { getDocs, collection } = require('firebase/firestore');
                const menuSnapshot = await getDocs(collection(db, 'menu'));
                const dbItems: MenuItem[] = [];
                menuSnapshot.forEach((docSnapItem: any) => {
                  const mData = docSnapItem.data();
                  if (!mData.isDeleted) {
                    dbItems.push({
                      id: docSnapItem.id,
                      name: mData.name,
                      category: mData.category,
                      description: mData.description || '',
                      price: Number(mData.price),
                      imageUrl: mData.imageUrl || '',
                      isVeg: !!mData.isVeg,
                      rating: Number(mData.rating || 4),
                      isAvailable: mData.isAvailable !== false,
                    });
                  }
                });
                if (dbItems.length > 0) {
                  set({ menuItems: dbItems });
                  AsyncStorage.setItem('anjani_menu_cache', JSON.stringify(dbItems)).catch(() => {});
                  AsyncStorage.setItem('anjani_menu_updated_at', serverTimestamp.toString()).catch(() => {});
                }
              }
            } catch (e: any) {
              console.warn("Menu cache/fetch error:", e);
            }
          }
        }, (error: any) => {
          console.warn('Firestore status sync deferred/unauthorized: ', error.message);
        });

        // Real-time Firestore sync for payment settings
        if (paymentUnsub) paymentUnsub();
        const paymentRef = doc(db, 'settings', 'payment');
        paymentUnsub = onSnapshot(paymentRef, (docSnap: any) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            set({
              paymentServerUrl: data.url || null
            });
          }
        }, (error: any) => {
          console.warn('Firestore payment sync deferred/unauthorized: ', error.message);
        });
      } catch (e: any) {
        console.log('Firebase listeners could not be attached:', e.message);
      }
    }
  },

  bootLocation: null,
  setBootLocation: (loc) => {
    set({ bootLocation: loc });
  },

  submitReview: async (orderId: string, rating: number, text: string) => {
    try {
      if (isFirebaseConfigured) {
        const { doc, updateDoc } = require('firebase/firestore');
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          rating,
          reviewText: text,
        });
      }
      
      const pOrders = get().previousOrders;
      const updated = pOrders.map(o => o.id === orderId ? { ...o, rating, reviewText: text } : o);
      set({ previousOrders: updated });
    } catch (e: any) {
      console.warn("Failed to submit review:", e);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    }
  },

    isRestaurantOpen: true,
    restaurantCloseReason: null,
    isAutoNightMode: false,
    manualOverride: false,
    paymentServerUrl: null,
    checkNightMode: () => {
      const hour = new Date().getHours();
      const isNight = hour >= 23 || hour < 11;
      const override = get().manualOverride;
      
      // Night mode is only active if it is night hours and there is no active override
      set({ isAutoNightMode: isNight && !override });
    },

    isSessionLoaded: false,
    currentUser: null,
    login: async (profile) => {
      // Backwards-compatibility safety
      if (!profile.addresses) profile.addresses = [];
      if (profile.addresses.length === 0 && profile.address) {
        const defaultId = `ADD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        profile.addresses = [{ id: defaultId, label: 'Home', details: profile.address, latitude: profile.latitude, longitude: profile.longitude }];
        profile.selectedAddressId = defaultId;
      }
      if (profile.addresses.length > 0) {
        const activeAddr = profile.addresses.find(a => a.id === profile.selectedAddressId) || profile.addresses[0];
        profile.selectedAddressId = activeAddr.id;
        profile.address = activeAddr.details;
        profile.latitude = activeAddr.latitude;
        profile.longitude = activeAddr.longitude;
      }

      set({ currentUser: profile });
      logToCrashlytics('setUserId', profile.uid);
      get().initCloudListeners();


      // Persist locally
      try {
        await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(profile));
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
      const userEmail = get().currentUser?.email || '';
      if (userEmail) {
        try {
          await AsyncStorage.setItem('anjani_last_login_email', userEmail);
        } catch (e) {}
      }

      Object.values(timerIds).forEach(t => clearInterval(t));
      timerIds = {};
      Object.values(trackingUnsubs).forEach(u => u());
      trackingUnsubs = {};
      if (cloudUnsub) { cloudUnsub(); cloudUnsub = null; }
      if (menuUnsub) { menuUnsub(); menuUnsub = null; }
      if (statusUnsub) { statusUnsub(); statusUnsub = null; }
      if (paymentUnsub) { paymentUnsub(); paymentUnsub = null; }
      set({ currentUser: null, activeOrders: [], cart: {}, previousOrders: [], chatMessages: {} });
      try {
        await AsyncStorage.removeItem('anjani_customer_user_profile');
        await AsyncStorage.removeItem('anjani_previous_orders');
        
        // Sync Firebase auth state
        if (isFirebaseConfigured) {
          const { signOut } = require('firebase/auth');
          await signOut(auth);
          console.log('Firebase user successfully signed out');
        }
      } catch (err) {
        console.error('Local persistence clear error:', err);
      }
    },
    
    // Custom Registration / Session Recovery
    loginFromCloud: async (uidOrKey) => {
      const key = uidOrKey.toLowerCase().trim();

      // Attempt Firestore retrieval
      if (isFirebaseConfigured) {
        try {
          const { doc, getDoc, collection, query, where, getDocs } = require('firebase/firestore');
          let cloudUser: any = null;

          // 1. Primary path: Fetch document by Auth UID
          const userRef = doc(db, 'users', uidOrKey);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            cloudUser = userSnap.data();
          }

          // 2. Secondary path: Legacy query by email or phone
          if (!cloudUser) {
            if (key.includes('@')) {
              const legacyRef = doc(db, 'users', key);
              const legacySnap = await getDoc(legacyRef);
              if (legacySnap.exists()) {
                cloudUser = legacySnap.data();
              }
            } else {
              const q = query(collection(db, 'users'), where('phone', '==', uidOrKey.trim()));
              const querySnap = await getDocs(q);
              if (!querySnap.empty) {
                cloudUser = querySnap.docs[0].data();
              }
            }
          }

          if (cloudUser) {
            if (cloudUser.addresses && cloudUser.addresses.length > 0) {
              const activeAddr = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId) || cloudUser.addresses[0];
              cloudUser.selectedAddressId = activeAddr.id;
              cloudUser.address = activeAddr.details;
              cloudUser.latitude = activeAddr.latitude;
              cloudUser.longitude = activeAddr.longitude;
            }

            set({ 
              currentUser: cloudUser, 
              previousOrders: cloudUser.previousOrders || [] 
            });
            get().initCloudListeners();

            await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(cloudUser));
            await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(cloudUser.previousOrders || []));
            console.log('Successfully recovered profile from Firebase:', uidOrKey);
            return true;
          }
        } catch (e: any) {
          console.log('Firebase user retrieval failed (falling back to mock):', e.message);
        }
      }

      // Safe Fallback to Mock Server
      try {
        const res = await callCloudAPI(`/user/${encodeURIComponent(uidOrKey)}`);
        if (res && res.success && res.user) {
          const cloudUser = res.user;
          
          if (cloudUser.addresses && cloudUser.addresses.length > 0) {
            const activeAddr = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId) || cloudUser.addresses[0];
            cloudUser.selectedAddressId = activeAddr.id;
            cloudUser.address = activeAddr.details;
            cloudUser.latitude = activeAddr.latitude;
            cloudUser.longitude = activeAddr.longitude;
          }

          set({ 
            currentUser: cloudUser, 
            previousOrders: cloudUser.previousOrders || [] 
          });
          get().initCloudListeners();

          await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(cloudUser));
          await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(cloudUser.previousOrders || []));
          return true;
        }
      } catch (e: any) {
        try {
          const localMockData = await AsyncStorage.getItem(`anjani_mock_db_${uidOrKey.toLowerCase().trim()}`);
          if (localMockData) {
            const cloudUser = JSON.parse(localMockData);
            
            if (cloudUser.addresses && cloudUser.addresses.length > 0) {
              const activeAddr = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId) || cloudUser.addresses[0];
              cloudUser.selectedAddressId = activeAddr.id;
              cloudUser.address = activeAddr.details;
              cloudUser.latitude = activeAddr.latitude;
              cloudUser.longitude = activeAddr.longitude;
            }

            set({ 
              currentUser: cloudUser, 
              previousOrders: cloudUser.previousOrders || [] 
            });
            get().initCloudListeners();

            await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(cloudUser));
            await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(cloudUser.previousOrders || []));
            return true;
          }
        } catch (mockErr) {}
        console.log('Cloud retrieval failed (offline/unregistered):', e.message);
      }
      return false;
    },
    syncWithCloud: async () => {
      const user = get().currentUser;
      if (!user) return;

      let fcmToken = null;
      try {
        const { registerForPushNotificationsAsync } = require('../utils/notifications');
        fcmToken = await registerForPushNotificationsAsync();
      } catch (e) {
        console.warn('Failed to fetch FCM token during sync', e);
      }

      const payload: any = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address || '',
        addresses: user.addresses || [],
        selectedAddressId: user.selectedAddressId || '',
        latitude: user.latitude,
        longitude: user.longitude,
        role: 'customer',
      };

      if (fcmToken) {
        payload.fcmToken = fcmToken;
      }

      // Sync with Cloud Firestore using the secure UID document path
      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const docId = user.uid;
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
        try {
          await AsyncStorage.setItem(`anjani_mock_db_${user.email.toLowerCase().trim()}`, JSON.stringify(payload));
          console.log('Mock server sync deferred. Saved to local mock db.');
        } catch (err) {}
      }
    },
    loadSavedSession: async () => {
      try {
        const userStr = await AsyncStorage.getItem('anjani_customer_user_profile');
        const ordersStr = await AsyncStorage.getItem('anjani_previous_orders');
        const activeOrdersStr = await AsyncStorage.getItem('anjani_active_orders');
        
        let localUser = null;
        if (userStr) {
          try { localUser = JSON.parse(userStr); } catch { localUser = null; }
        }

        let localOrders: any[] = [];
        if (ordersStr) {
          try {
            localOrders = JSON.parse(ordersStr);
            localOrders = localOrders.filter((o: any) => !['ORD-55410', 'ORD-21094', 'ORD-98231', 'ORD-76293'].includes(o.id));
            await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(localOrders));
          } catch { localOrders = []; }
        }

        let localActiveOrders: any[] = [];
        if (activeOrdersStr) {
          try { localActiveOrders = JSON.parse(activeOrdersStr); } catch { localActiveOrders = []; }
        }
        
        if (localUser) {
          if (localUser.addresses && localUser.addresses.length > 0) {
            const activeAddr = localUser.addresses.find((a: any) => a.id === localUser.selectedAddressId) || localUser.addresses[0];
            localUser.selectedAddressId = activeAddr.id;
            localUser.address = activeAddr.details;
            localUser.latitude = activeAddr.latitude;
            localUser.longitude = activeAddr.longitude;
          }
          set({ currentUser: localUser, previousOrders: localOrders, activeOrders: localActiveOrders, isSessionLoaded: true });
          logToCrashlytics('setUserId', localUser.uid);
          
          // Attempt silent background sync to update changes
          let cloudUser: any = null;
          
          if (isFirebaseConfigured) {
            try {
              const { doc, getDoc } = require('firebase/firestore');
              const userRef = doc(db, 'users', localUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                cloudUser = userSnap.data();
              }
            } catch (err: any) {
              console.log('Firebase background silent sync deferred:', err.message);
            }
          }

          if (!cloudUser) {
            try {
              const key = localUser.uid || localUser.email || localUser.phone;
              const res = await callCloudAPI(`/user/${encodeURIComponent(key)}`);
              if (res && res.success && res.user) {
                cloudUser = res.user;
              }
            } catch (syncErr) {
              console.log('Background silent sync mock server offline. Active cache loaded.');
            }
          }
          
          if (cloudUser) {
            if (cloudUser.addresses && cloudUser.addresses.length > 0) {
              const activeAddr = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId) || cloudUser.addresses[0];
              cloudUser.selectedAddressId = activeAddr.id;
              cloudUser.address = activeAddr.details;
              cloudUser.latitude = activeAddr.latitude;
              cloudUser.longitude = activeAddr.longitude;
            }
            
            set({ 
              currentUser: cloudUser
            });
            await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(cloudUser));
            console.log('Silently synchronized profile cache with cloud DB.');
          }
          
          // Re-initialize cloud listeners now that we have the proper user UID loaded
          get().initCloudListeners();
        } else {
          set({ isSessionLoaded: true });
        }
      } catch (err) {
        console.error('Session boot loading failed:', err);
        set({ isSessionLoaded: true });
      }
    },

    // Saved Addresses
    addSavedAddress: async (label, details, latitude, longitude) => {
      const user = get().currentUser;
      if (!user) return;

      // Auto-increment logic
      let finalLabel = label.trim() || 'Other';
      const existingSameLabels = (user.addresses || []).filter(a => a.label.startsWith(finalLabel));
      if (existingSameLabels.length > 0) {
        const exactExists = existingSameLabels.find(a => a.label === finalLabel);
        if (exactExists) {
          let maxNum = 1;
          existingSameLabels.forEach(a => {
            const match = a.label.match(new RegExp(`^${finalLabel} (\\d+)$`, 'i'));
            if (match) {
              const num = parseInt(match[1], 10);
              if (num >= maxNum) maxNum = num;
            }
          });
          finalLabel = `${finalLabel} ${maxNum + 1}`;
        }
      }

      const newAddress: SavedAddress = {
        id: `ADD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        label: finalLabel,
        details,
        latitude,
        longitude
      };

      const updatedAddresses = [...(user.addresses || []), newAddress];
      const selectedAddressId = newAddress.id; // Automatically select the newly added address
      const activeAddress = newAddress;
      const activeDetails = newAddress.details;

      const updatedUser = {
        ...user,
        addresses: updatedAddresses,
        selectedAddressId,
        address: activeDetails,
        latitude: activeAddress.latitude,
        longitude: activeAddress.longitude
      };

      set({ currentUser: updatedUser });
      try {
        await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
        await get().syncWithCloud();
      } catch (e) {
        console.warn('Address sync error:', e);
      }
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
      try {
        await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
        await get().syncWithCloud();
      } catch (e) {
        console.warn('Address sync error:', e);
      }
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
        latitude: activeAddress?.latitude,
        longitude: activeAddress?.longitude
      };

      set({ currentUser: updatedUser });
      try {
        await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
        await get().syncWithCloud();
      } catch (e) {
        console.warn('Address sync error:', e);
      }
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
        latitude: activeAddress?.latitude,
        longitude: activeAddress?.longitude
      };

      set({ currentUser: updatedUser });
      try {
        await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
        await get().syncWithCloud();
      } catch (e) {
        console.warn('Address sync error:', e);
      }
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

    activeOrders: [],
    placeOrder: async (address, phone, paymentMethod, utrNumber, cookingInstructions, userLat, userLng) => {
      logToCrashlytics('log', `Placing order. Method: ${paymentMethod}`);
      
      const orderItems = Object.values(get().cart);
      if (orderItems.length === 0) return;

      const subtotal = get().getCartTotal();
      const deliveryFee = 30.0;
      const tax = Math.round(subtotal * 0.025) + Math.round(subtotal * 0.025);
      const totalAmount = subtotal + deliveryFee + tax;

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const uid = get().currentUser?.uid || auth?.currentUser?.uid;
      if (!uid) {
        Alert.alert('Error', 'You must be logged in to place an order.');
        return;
      }

      const initialStatus = (paymentMethod === 'COD' || utrNumber) ? 'PLACED' : 'PAYMENT_PENDING';

      const newOrder: ActiveOrder = {
        id: orderId,
        customerUid: uid,
        customerName: get().currentUser?.name || 'Customer',
        items: orderItems,
        totalAmount,
        customerAddress: address,
        customerPhone: phone,
        status: initialStatus,
        isDismissed: false,
        riderLat: restaurantCoords.lat,
        riderLng: restaurantCoords.lng,
        restaurantLat: restaurantCoords.lat,
        restaurantLng: restaurantCoords.lng,
        userLat: userLat !== undefined ? userLat : (get().currentUser?.latitude !== undefined ? get().currentUser?.latitude : userCoords.lat),
        userLng: userLng !== undefined ? userLng : (get().currentUser?.longitude !== undefined ? get().currentUser?.longitude : userCoords.lng),
        paymentMethod,
        createdAt: Date.now(),
      };

      if (paymentMethod !== 'COD' && utrNumber) {
        newOrder.utrNumber = utrNumber;
      }
      if (cookingInstructions) {
        newOrder.cookingInstructions = cookingInstructions;
      }

      // Optimistically add the new order to local activeOrders and update AsyncStorage immediately (instant UI sync)
      const currentActive = get().activeOrders || [];
      const updatedActive = [...currentActive.filter(o => o.id !== orderId), newOrder];
      set({ 
        cart: {},
        activeOrders: updatedActive 
      });
      AsyncStorage.setItem('anjani_active_orders', JSON.stringify(updatedActive)).catch(() => {});

      // 1. Save to Firestore
      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          await setDoc(orderRef, newOrder);
        } catch (e: any) {
          console.log('Firestore active order save deferred:', e.message);
        }
      }
    },

    createPendingOrder: async (address, phone, cookingInstructions, userLat, userLng) => {
      const orderItems = Object.values(get().cart);
      if (orderItems.length === 0) return null;

      const subtotal = get().getCartTotal();
      const deliveryFee = 30.0;
      const tax = Math.round(subtotal * 0.025) + Math.round(subtotal * 0.025);
      const totalAmount = subtotal + deliveryFee + tax;

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const uid = get().currentUser?.uid || auth?.currentUser?.uid;
      if (!uid) {
        Alert.alert('Error', 'You must be logged in to place an order.');
        return null;
      }

      const newOrder: ActiveOrder = {
        id: orderId,
        customerUid: uid,
        customerName: get().currentUser?.name || 'Customer',
        items: orderItems,
        totalAmount,
        customerAddress: address,
        customerPhone: phone,
        status: 'PAYMENT_PENDING',
        isDismissed: false,
        riderLat: restaurantCoords.lat,
        riderLng: restaurantCoords.lng,
        restaurantLat: restaurantCoords.lat,
        restaurantLng: restaurantCoords.lng,
        userLat: userLat !== undefined ? userLat : (get().currentUser?.latitude !== undefined ? get().currentUser?.latitude : userCoords.lat),
        userLng: userLng !== undefined ? userLng : (get().currentUser?.longitude !== undefined ? get().currentUser?.longitude : userCoords.lng),
        paymentMethod: 'ONLINE',
        createdAt: Date.now(),
      };

      if (cookingInstructions) {
        newOrder.cookingInstructions = cookingInstructions;
      }

      // Add to local activeOrders and update AsyncStorage immediately (instant UI sync)
      const currentActive = get().activeOrders || [];
      const updatedActive = [...currentActive.filter(o => o.id !== orderId), newOrder];
      set({ 
        activeOrders: updatedActive 
      });
      AsyncStorage.setItem('anjani_active_orders', JSON.stringify(updatedActive)).catch(() => {});

      // Save to Firestore
      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          await setDoc(orderRef, newOrder);
        } catch (e: any) {
          console.log('Firestore active order save deferred:', e.message);
        }
      }

      return orderId;
    },

    confirmOrderPayment: async (orderId, razorpayPaymentId) => {
      // Clear cart
      set({ cart: {} });

      // Update local active order to PLACED status
      const currentActive = get().activeOrders || [];
      const updatedActive = currentActive.map(o => 
        o.id === orderId 
          ? { ...o, status: 'PLACED' as OrderStatus, paymentStatus: 'PAID', razorpayPaymentId } 
          : o
      );
      set({ activeOrders: updatedActive });
      AsyncStorage.setItem('anjani_active_orders', JSON.stringify(updatedActive)).catch(() => {});

      // Update Firestore locally as a safety fallback
      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, {
            status: 'PLACED',
            paymentStatus: 'PAID',
            razorpayPaymentId,
            updatedAt: Date.now()
          });
        } catch (e: any) {
          console.log('Firestore order update safety check deferred:', e.message);
        }
      }
    },

    cancelOrderPayment: async (orderId) => {
      // Update local active order to CANCELLED status
      const currentActive = get().activeOrders || [];
      const updatedActive = currentActive.map(o => 
        o.id === orderId ? { ...o, status: 'CANCELLED' as OrderStatus } : o
      );
      set({ activeOrders: updatedActive });
      AsyncStorage.setItem('anjani_active_orders', JSON.stringify(updatedActive)).catch(() => {});

      if (isFirebaseConfigured) {
        try {
          const { doc, updateDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, {
            status: 'CANCELLED',
            updatedAt: Date.now()
          });
        } catch (e: any) {
          console.log('Firestore order cancel update deferred:', e.message);
        }
      }
    },
    dismissOrder: (orderId) => {
      if (timerIds[orderId]) {
        clearInterval(timerIds[orderId]);
        delete timerIds[orderId];
      }
      const active = get().activeOrders.find(o => o.id === orderId);
      if (active) {
        // Allow dismissing DELIVERED, CANCELLED, or PAYMENT_PENDING orders
        if (active.status !== 'DELIVERED' && active.status !== 'CANCELLED' && active.status !== 'PAYMENT_PENDING') {
          console.warn(`Cannot dismiss order ${orderId}: status is ${active.status}`);
          // Still remove from active list if stuck (safety valve)
          const fallbackActive = get().activeOrders.filter(o => o.id !== orderId);
          set({ activeOrders: fallbackActive });
          AsyncStorage.setItem('anjani_active_orders', JSON.stringify(fallbackActive)).catch(() => {});
          return;
        }
        const updatedOrders: PreviousOrder[] = [
          {
            id: active.id,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            timestamp: active.createdAt || Date.now(),
            items: active.items,
            totalAmount: active.totalAmount,
            status: active.status as 'DELIVERED' | 'CANCELLED',
            paymentMethod: active.paymentMethod,
            utrNumber: active.utrNumber,
            cookingInstructions: active.cookingInstructions,
          },
          ...get().previousOrders.filter(o => o.id !== active.id)
        ];
        const newActiveOrders = get().activeOrders.filter(o => o.id !== orderId);
        set({ 
          previousOrders: updatedOrders,
          activeOrders: newActiveOrders
        });
        
        AsyncStorage.setItem('anjani_active_orders', JSON.stringify(newActiveOrders)).catch(() => {});

        // Mark order as DELIVERED/Dismissed in Firestore
        if (isFirebaseConfigured) {
          try {
            const { doc, updateDoc } = require('firebase/firestore');
            const orderRef = doc(db, 'orders', active.id);
            updateDoc(orderRef, { isDismissed: true })
              .then(() => console.log(`Firestore order ${active.id} marked as dismissed.`))
              .catch((e: any) => console.log('Firestore order update deferred:', e.message));
          } catch (e: any) {
            console.log('Firebase active order update skipped:', e.message);
          }
        }

        // Background cache save & sync user (including updated previousOrders!)
        AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(updatedOrders))
          .then(() => get().syncWithCloud())
          .catch(err => console.error(err));
      } else {
        const newActiveOrders = get().activeOrders.filter(o => o.id !== orderId);
        set({ activeOrders: newActiveOrders });
        AsyncStorage.setItem('anjani_active_orders', JSON.stringify(newActiveOrders)).catch(() => {});
      }
    },

    previousOrders: [],
    reorder: (items) => {
      const currentMenu = get().menuItems;
      const newCart: { [itemId: string]: OrderItem } = {};
      let someUnavailable = false;
      
      items.forEach((item) => {
        const liveItem = currentMenu.find(m => m.id === item.item.id);
        if (liveItem && liveItem.isAvailable && !liveItem.isDeleted) {
          newCart[liveItem.id] = { 
            item: liveItem, // use latest menu item data (price, name)
            quantity: item.quantity 
          };
        } else {
          someUnavailable = true;
        }
      });
      
      if (Object.keys(newCart).length === 0) {
        try {
          const { Alert, Platform } = require('react-native');
          if (Platform.OS === 'web') window.alert("None of the items from this order are currently available.");
          else Alert.alert("Unavailable", "None of the items from this order are currently available.");
        } catch(e) {}
        return;
      }
      
      if (someUnavailable) {
        try {
          const { Alert, Platform } = require('react-native');
          if (Platform.OS === 'web') window.alert("Some items are no longer available and were removed from your cart.");
          else Alert.alert("Items Removed", "Some items are no longer available and were removed from your cart.");
        } catch(e) {}
      }

      set({ cart: newCart });
    },


    systemOrders: [],
    soldOutDishIds: [],
    menuItems: MenuItems,
    chatMessages: {},
    sendChatMessage: (orderId, senderRole, senderName, text) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      const newMessage: ChatMessage = {
        id: `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        orderId,
        senderRole,
        senderName,
        text: trimmedText,
        timestamp: Date.now(),
      };
      
      set(state => ({ chatMessages: { ...state.chatMessages, [orderId]: [...(state.chatMessages[orderId] || []), newMessage] } }));

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

    updateOrderStatus: (orderId, status) => {
      if (status === 'DELIVERED' || status === 'CANCELLED') {
        if (timerIds[orderId]) {
          clearInterval(timerIds[orderId]);
          delete timerIds[orderId];
        }
      }

      const updatedSystem = get().systemOrders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      );
      const updatedActives = get().activeOrders.map(active => 
        active.id === orderId ? { ...active, status } : active
      );

      set({ systemOrders: updatedSystem, activeOrders: updatedActives });

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
      const updatedActives = get().activeOrders.map(active => 
        active.id === orderId
          ? {
              ...active,
              status: 'OUT_FOR_DELIVERY' as OrderStatus,
              riderLat: restaurantCoords.lat,
              riderLng: restaurantCoords.lng,
            }
          : active
      );

      set({ systemOrders: updatedSystem, activeOrders: updatedActives });

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
      const updatedActives = get().activeOrders.map(active => 
        active.id === orderId ? { ...active, riderLat: lat, riderLng: lng } : active
      );

      set({ systemOrders: updatedSystem, activeOrders: updatedActives });
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


  };
});

// Setup Firebase real-time listeners for Customer App
// Anonymous auth is NOT used — initCloudListeners works with or without a signed-in user
// since Firestore rules now allow public reads on orders/menu/settings.
if (isFirebaseConfigured) {
  // Prevent hot-reload memory leaks
  if ((globalThis as any)._anjaniCustomerInterval) clearInterval((globalThis as any)._anjaniCustomerInterval);
  if ((globalThis as any)._anjaniCustomerUnsubAuth) (globalThis as any)._anjaniCustomerUnsubAuth();

  // Always start listeners immediately — no auth required for reads
  useAppStore.getState().initCloudListeners();
  useAppStore.getState().checkNightMode();
  
  // Set up periodic interval to check night mode every 1 minute
  (globalThis as any)._anjaniCustomerInterval = setInterval(() => {
    useAppStore.getState().checkNightMode();
  }, 60000);

  // Also re-init when a real user signs in (e.g. after checkout login) and auto-recover detailed profile on page reload
  (globalThis as any)._anjaniCustomerUnsubAuth = onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log('Customer Firebase user UID:', user.uid);
      useAppStore.getState().initCloudListeners();
      
      try {
        const store = useAppStore.getState();
        if (!store.currentUser || store.currentUser.uid !== user.uid) {
          console.log('Silently recovering customer profile from Firestore on reload...');
          await store.loginFromCloud(user.uid);
        }
      } catch (e) {
        console.warn('Auto-session recovery failed:', e);
      }
    }
  });
}
