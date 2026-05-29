import { create } from 'zustand';
import { MenuItem, MenuItems } from '../data/MenuData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth, isFirebaseConfigured } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { scheduleLocalNotification } from '../utils/notifications';
import { Alert } from 'react-native';

export interface SavedAddress {
  id: string;
  label: string;
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
  paymentMethod: 'COD' | 'GPAY' | 'PHONEPE' | 'QR_GPAY' | 'QR_PHONEPE';
  utrNumber?: string;
  paymentVerified?: boolean; // True if the owner has manually verified the UTR
  cookingInstructions?: string;
  createdAt?: number;
  rating?: number;
  reviewText?: string;
  messages?: ChatMessage[];
  hasRealRider?: boolean;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  senderRole: 'customer' | 'rider';
  senderName: string;
  text: string;
  timestamp: number;
}

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

// Peddapuram, Andhra Pradesh Mock Coordinates (Anjani Restaurant)
const restaurantCoords = { lat: 17.0790, lng: 82.1374 };
const userCoords = { lat: 17.0850, lng: 82.1400 };

export const useAppStore = create<AppState>((set, get) => {
  let timerIds: { [orderId: string]: any } = {};
  let cloudUnsub: any = null;
  let lastStatusMap: { [orderId: string]: string } = {};

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
            const q = query(ordersRef, where('customerUid', '==', currentUserUid));
            cloudUnsub = onSnapshot(q, (snapshot: any) => {
              const ordersList: ActiveOrder[] = [];
              const prevList: PreviousOrder[] = [];
              const chatsObj: { [orderId: string]: ChatMessage[] } = {};

              snapshot.forEach((doc: any) => {
                const data = doc.data() as ActiveOrder;
                ordersList.push(data);

                // Notification Logic
                const prevStatus = lastStatusMap[data.id];
                if (prevStatus && prevStatus !== data.status) {
                  if (data.status === 'PREPARING') {
                    scheduleLocalNotification('Order is Preparing! 🍳', 'The kitchen has started preparing your food.');
                  } else if (data.status === 'READY') {
                    scheduleLocalNotification('Order is Ready! 🛍️', 'Your food is ready and waiting for a delivery partner.');
                  } else if (data.status === 'OUT_FOR_DELIVERY') {
                    scheduleLocalNotification('Out for Delivery! 🛵', 'Your order is on the way!');
                  } else if (data.status === 'DELIVERED') {
                    scheduleLocalNotification('Order Delivered! 🎉', 'Enjoy your meal!');
                  }
                }
                lastStatusMap[data.id] = data.status;

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
              AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(prevList));
              
              const currentActives = get().activeOrders || [];
              const newActives = ordersList.filter(o => {
                if (o.status === 'CANCELLED') return false;
                if (o.status === 'DELIVERED') {
                  if (o.isDismissed) return false;
                  // Auto-dismiss orders older than 24 hours as a fallback
                  if (o.createdAt && (Date.now() - o.createdAt > 24 * 60 * 60 * 1000)) return false;
                  return true;
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
                    
                    if (body) {
                      Notifications.scheduleNotificationAsync({
                        content: { title: 'Order Update', body },
                        trigger: null,
                      });
                    }
                  }
                });
              }
              set({ activeOrders: newActives });
              AsyncStorage.setItem('anjani_active_orders', JSON.stringify(newActives));
            }, (error: any) => {
              console.warn('Firestore orders sync deferred/unauthorized. Ensure public Firestore rules are active for orders: ', error.message);
            });
          } else {
            console.log("No authenticated user, skipping orders listener");
          }

      // Real-time Firestore sync for ALL menu items
      const menuRef = collection(db, 'menu');
      onSnapshot(menuRef, (snapshot: any) => {
        const dbItems: MenuItem[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          if (!data.isDeleted) {
            dbItems.push({
              id: doc.id,
              name: data.name,
              category: data.category,
              description: data.description || '',
              price: Number(data.price),
              imageUrl: data.imageUrl || '',
              isVeg: !!data.isVeg,
              rating: Number(data.rating || 4),
              isAvailable: data.isAvailable !== false,
            });
          }
        });
        
        if (dbItems.length > 0) {
          set({ menuItems: dbItems });
        } else {
          set({ menuItems: MenuItems });
        }
      }, (error: any) => {
        console.warn('Firestore menu sync deferred/unauthorized: ', error.message);
        if (!get().menuItems || get().menuItems.length === 0) {
          set({ menuItems: MenuItems });
        }
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
      set({ currentUser: null, activeOrders: [], cart: {} });
      try {
        await AsyncStorage.removeItem('anjani_customer_user_profile');
        await AsyncStorage.removeItem('anjani_previous_orders');
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
            if (!cloudUser.address && cloudUser.addresses && cloudUser.addresses.length > 0) {
              cloudUser.address = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId)?.details || cloudUser.addresses[0].details || '';
            }

            set({ 
              currentUser: cloudUser, 
              previousOrders: cloudUser.previousOrders || [] 
            });

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
          
          if (!cloudUser.address && cloudUser.addresses?.length > 0) {
            cloudUser.address = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId)?.details || cloudUser.addresses[0].details || '';
          }

          set({ 
            currentUser: cloudUser, 
            previousOrders: cloudUser.previousOrders || [] 
          });

          await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(cloudUser));
          await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(cloudUser.previousOrders || []));
          return true;
        }
      } catch (e: any) {
        try {
          const localMockData = await AsyncStorage.getItem(`anjani_mock_db_${uidOrKey.toLowerCase().trim()}`);
          if (localMockData) {
            const cloudUser = JSON.parse(localMockData);
            
            if (!cloudUser.address && cloudUser.addresses?.length > 0) {
              cloudUser.address = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId)?.details || cloudUser.addresses[0].details || '';
            }

            set({ 
              currentUser: cloudUser, 
              previousOrders: cloudUser.previousOrders || [] 
            });

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

      const payload = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address || '',
        addresses: user.addresses || [],
        selectedAddressId: user.selectedAddressId || '',
        latitude: user.latitude,
        longitude: user.longitude
      };

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
        if (userStr) localUser = JSON.parse(userStr);

        let localOrders = [];
        if (ordersStr) {
          localOrders = JSON.parse(ordersStr);
          // Purge any lingering mock demo orders from the local cache
          localOrders = localOrders.filter((o: any) => !['ORD-55410', 'ORD-21094', 'ORD-98231', 'ORD-76293'].includes(o.id));
          await AsyncStorage.setItem('anjani_previous_orders', JSON.stringify(localOrders));
        }

        let localActiveOrders = [];
        if (activeOrdersStr) {
          localActiveOrders = JSON.parse(activeOrdersStr);
        }
        
        if (localUser) {
          set({ currentUser: localUser, previousOrders: localOrders, activeOrders: localActiveOrders });
          
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
            if (!cloudUser.address && cloudUser.addresses && cloudUser.addresses.length > 0) {
              cloudUser.address = cloudUser.addresses.find((a: SavedAddress) => a.id === cloudUser.selectedAddressId)?.details || '';
            }
            
            set({ 
              currentUser: cloudUser
            });
            await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(cloudUser));
            console.log('Silently synchronized profile cache with cloud DB.');
          }
          
          // Re-initialize cloud listeners now that we have the proper user UID loaded
          get().initCloudListeners();
        }
      } catch (err) {
        console.error('Session boot loading failed:', err);
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
      await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
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
      await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
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
      await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
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
      await AsyncStorage.setItem('anjani_customer_user_profile', JSON.stringify(updatedUser));
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

    activeOrders: [],
    placeOrder: async (address, phone, paymentMethod, utrNumber, cookingInstructions, userLat, userLng) => {
      const orderItems = Object.values(get().cart);
      if (orderItems.length === 0) return;

      const subtotal = get().getCartTotal();
      const deliveryFee = 30.0;
      const tax = Math.round(subtotal * 0.025) + Math.round(subtotal * 0.025);
      const totalAmount = subtotal + deliveryFee + tax;

      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const uid = get().currentUser?.uid || auth?.currentUser?.uid || 'anonymous-fallback';

      const initialStatus = paymentMethod === 'COD' ? 'PLACED' : 'PAYMENT_PENDING';

      const newOrder: ActiveOrder = {
        id: orderId,
        customerUid: uid,
        customerName: get().currentUser?.name || 'Customer',
        items: orderItems,
        totalAmount,
        customerAddress: address,
        customerPhone: phone,
        status: initialStatus,
        riderLat: restaurantCoords.lat,
        riderLng: restaurantCoords.lng,
        restaurantLat: restaurantCoords.lat,
        restaurantLng: restaurantCoords.lng,
        userLat: userLat !== undefined ? userLat : userCoords.lat,
        userLng: userLng !== undefined ? userLng : userCoords.lng,
        paymentMethod,
        utrNumber: (paymentMethod !== 'COD' && utrNumber) ? utrNumber : null,
        cookingInstructions: cookingInstructions || null,
        createdAt: Date.now(),
      };

      // 1. Initial save to Firestore
      if (isFirebaseConfigured) {
        try {
          const { doc, setDoc } = require('firebase/firestore');
          const orderRef = doc(db, 'orders', orderId);
          await setDoc(orderRef, newOrder);
        } catch (e: any) {
          console.log('Firestore active order save deferred:', e.message);
        }
      }

      set({ cart: {}, currentActiveStep: 0 });

      // 2. Razorpay Flow
      if (paymentMethod !== 'COD') {
        try {
          const RazorpayCheckout = require('react-native-razorpay').default;
          // Use 10.0.2.2 for Android Emulator connecting to local Vercel runner
          const API_URL = 'http://10.0.2.2:4000/api'; 
          
          const createRes = await fetch(`${API_URL}/createOrder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: totalAmount, receipt: orderId })
          });
          const orderData = await createRes.json();

          if (!orderData || !orderData.id) {
             Alert.alert('Payment Error', 'Failed to connect to secure server.');
             return;
          }

          const options = {
            description: 'Anjani Restaurant Order',
            image: 'https://i.imgur.com/3g7nmJC.png',
            currency: 'INR',
            key: 'rzp_test_dummy', 
            amount: orderData.amount,
            name: 'Anjani Restaurant',
            order_id: orderData.id,
            prefill: {
              email: get().currentUser?.email || 'customer@example.com',
              contact: phone,
              name: get().currentUser?.name || 'Customer'
            },
            theme: { color: '#FF6B00' }
          };

          const paymentData = await RazorpayCheckout.open(options);
          
          const verifyRes = await fetch(`${API_URL}/verifyPayment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: paymentData.razorpay_order_id,
              razorpay_payment_id: paymentData.razorpay_payment_id,
              razorpay_signature: paymentData.razorpay_signature,
              firestore_order_id: orderId 
            })
          });
          
          const verifyData = await verifyRes.json();
          if (!verifyData.success) {
            Alert.alert('Verification Failed', 'Invalid payment signature.');
          }
          
        } catch (error: any) {
          console.log("Payment Error or Cancel:", error);
          Alert.alert('Payment Cancelled', 'Your payment was not completed.');
          if (isFirebaseConfigured) {
             try {
               const { doc, updateDoc } = require('firebase/firestore');
               await updateDoc(doc(db, 'orders', orderId), { status: 'CANCELLED' });
             } catch(e){}
          }
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
        // Only allow dismissing orders that have been DELIVERED — prevents premature removal
        if (active.status !== 'DELIVERED') {
          console.warn(`Cannot dismiss order ${orderId}: status is ${active.status}, not DELIVERED`);
          // Still remove from active list if stuck (safety valve for edge cases)
          // but don't promote to previousOrders
          set({ activeOrders: get().activeOrders.filter(o => o.id !== orderId) });
          return;
        }
        const updatedOrders: PreviousOrder[] = [
          {
            id: active.id,
            date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
            timestamp: active.createdAt || Date.now(),
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
          activeOrders: get().activeOrders.filter(o => o.id !== orderId)
        });

        // Mark order as DELIVERED in Firestore
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
        set({ activeOrders: get().activeOrders.filter(o => o.id !== orderId) });
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


  };
});

// Setup Firebase real-time listeners for Customer App
// Anonymous auth is NOT used — initCloudListeners works with or without a signed-in user
// since Firestore rules now allow public reads on orders/menu/settings.
if (isFirebaseConfigured) {
  // Always start listeners immediately — no auth required for reads
  useAppStore.getState().initCloudListeners();
  useAppStore.getState().checkNightMode();
  
  // Set up periodic interval to check night mode every 1 minute
  setInterval(() => {
    useAppStore.getState().checkNightMode();
  }, 60000);

  // Also re-init when a real user signs in (e.g. after checkout login)
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('Customer Firebase user UID:', user.uid);
      useAppStore.getState().initCloudListeners();
    }
  });
}
