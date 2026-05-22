import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Switch,
  Alert,
  Animated,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  SectionList
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, ActiveOrder } from '../state/AppStore';
import { MenuItems, MenuCategories, MenuItem } from '../data/MenuData';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import AnimatedReanimated from 'react-native-reanimated';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const SCREEN_WIDTH = SCREEN_W;
const SCREEN_HEIGHT = SCREEN_H;
const scale = Math.min(SCREEN_W / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);

const CAT_ICONS: Record<string, string> = {
  "All": "🍽️",
  "Veg Soups": "🥣",
  "Non Veg Soups": "🍲",
  "Salads": "🥗",
  "Tandoori Starters": "🍢",
  "Veg Starters": "🥦",
  "Non Veg Starters": "🍗",
  "Veg Main Course": "🫕",
  "Non Veg Main Course": "🍖",
  "Breads": "🫓",
  "Rice": "🍚",
  "Veg Biryani": "🍛",
  "Non Veg Biryani": "🥘",
  "Fried Rice": "🥡",
  "Noodles": "🍜",
  "Snacks": "🍟"
};

export default function App() {
  const insets = useSafeAreaInsets();
  const [showSplash, setShowSplash] = useState(true);

  const [activeTab, setActiveTab] = useState<'operations' | 'menu'>('operations');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState('All');
  
  // Editing states
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editAvailable, setEditAvailable] = useState(true);

  // --- Animation States (Copied from Customer auth.tsx / Rider index.tsx) ---
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const authOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(SCREEN_H * 0.24)).current;
  const formTranslateY = useRef(new Animated.Value(45)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  // --- Auth Form States ---
  const [activeAuthTab, setActiveAuthTab] = useState<'signin' | 'signup'>('signin');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    currentUser, 
    login, 
    logout, 
    loadSavedSession, 
    loginFromCloud,
    systemOrders,
    updateOrderStatus,
    soldOutDishIds,
    toggleDishAvailability,
    menuItems,
    updateMenuItem,
    deleteMenuItem,
  } = useAppStore();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 1,
        duration: e?.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: e?.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Keyboard responsive interpolations
  const keyboardBrandY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -normalize(40)],
  });
  const keyboardBrandScale = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });
  const keyboardBrandOpacity = keyboardAnim.interpolate({
    inputRange: [0, 0.6],
    outputRange: [1, 0],
  });
  const keyboardFormY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -normalize(90)],
  });

  useEffect(() => {
    const init = async () => {
      // 1. Recover any existing session first
      await loadSavedSession();

      // 2. Start continuous slow background panning loop
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(imageScale, { toValue: 1.15, duration: 18000, useNativeDriver: true }),
            Animated.timing(imageScale, { toValue: 1, duration: 18000, useNativeDriver: true })
          ]),
          Animated.sequence([
            Animated.timing(imageTranslateX, { toValue: -20, duration: 18000, useNativeDriver: true }),
            Animated.timing(imageTranslateX, { toValue: 0, duration: 18000, useNativeDriver: true })
          ])
        ])
      ).start();

      // 3. Morph/Crossfade Boot Sequence
      const sessionUser = useAppStore.getState().currentUser;
      if (sessionUser) {
        // User already logged in: brief splash fade out to reveal dashboard directly
        setTimeout(() => {
          Animated.timing(splashOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }).start(() => {
            setShowSplash(false);
          });
        }, 2200);
      } else {
        // Not logged in: transition to Auth inputs after splash delay
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(splashOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
            Animated.timing(authOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(titleTranslateY, { toValue: -normalize(55), duration: 1800, useNativeDriver: true }),
            Animated.timing(formTranslateY, { toValue: 0, duration: 1800, useNativeDriver: true }),
          ]).start();
        }, 2500);
      }
    };

    init();
  }, []);

  const handleSignUp = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    
    if (!isFirebaseConfigured) {
      setTimeout(() => {
        login({
          uid: 'mock-user-' + Math.floor(Math.random() * 1000),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: 'Anjani Restaurant Headquarters, Hyderabad',
          addresses: [],
          selectedAddressId: '',
        });
        setLoading(false);
        Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          setShowSplash(false);
        });
      }, 1000);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;
      
      await login({
        uid: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: 'Anjani Restaurant Headquarters, Hyderabad',
        addresses: [],
        selectedAddressId: '',
      });
      Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setShowSplash(false);
      });
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already in use. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    const emailLower = email.trim().toLowerCase();
    if (emailLower !== 'owner@anjani.com' || password.trim() !== 'Owner123') {
      setError('Access Denied: Only registered owners can access this app.');
      return;
    }

    setLoading(true);
    setError('');

    // Directly authenticate locally with owner credentials to guarantee 100% success on any phone
    setTimeout(async () => {
      try {
        await login({
          uid: 'owner-session-uid-999',
          name: 'Anjani Restaurant Owner',
          phone: '+91 99999 88888',
          email: 'owner@anjani.com',
          address: 'Anjani Restaurant Headquarters, Hyderabad',
          addresses: [],
          selectedAddressId: '',
        });

        // Silently attempt background cloud sync if Firebase is active
        if (isFirebaseConfigured) {
          try {
            await loginFromCloud('owner-session-uid-999');
          } catch (e) {
            console.log('Background cloud database sync deferred');
          }
        }

        setLoading(false);
        Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          setShowSplash(false);
        });
      } catch (err: any) {
        setError(err.message || 'An error occurred during authentication.');
        setLoading(false);
      }
    }, 1000);
  };

  const handleGoogleLogin = async (emailAddress: string, displayName: string) => {
    setShowGoogleModal(false);
    setLoading(true);
    setError('');

    if (!isFirebaseConfigured) {
      setTimeout(() => {
        login({
          uid: 'mock-google-' + emailAddress.split('@')[0],
          name: displayName,
          phone: '+91 99999 88888',
          email: emailAddress,
          address: 'Anjani Restaurant Headquarters, Hyderabad',
          addresses: [],
          selectedAddressId: '',
        });
        setLoading(false);
        Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          setShowSplash(false);
        });
      }, 1000);
      return;
    }

    try {
      const testPassword = 'google-test-123';
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailAddress, testPassword);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          userCredential = await createUserWithEmailAndPassword(auth, emailAddress, testPassword);
        } else {
          throw err;
        }
      }
      
      const user = userCredential.user;
      const profileExists = await loginFromCloud(user.uid);
      if (!profileExists) {
        await login({
          uid: user.uid,
          name: displayName,
          phone: '+91 99999 88888',
          email: emailAddress,
          address: 'Anjani Restaurant Headquarters, Hyderabad',
          addresses: [],
          selectedAddressId: '',
        });
      }
      Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setShowSplash(false);
      });
    } catch (err: any) {
      console.error('Google mock sign-in error:', err);
      setError('Google sign-in error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderOwnerDashboard = () => {
    const incomingOrders = systemOrders.filter(o => o.status === 'PLACED');
    const activePrep = systemOrders.filter(o => o.status === 'PREPARING');
    const outForDelivery = systemOrders.filter(o => o.status === 'OUT_FOR_DELIVERY');
    const totalSales = systemOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const renderPaymentInfo = (order: ActiveOrder) => {
      let methodLabel = '';
      let methodIcon = 'card-outline';
      let statusLabel = '';
      let statusBg = '#FFF8E1';
      let statusText = '#E65100';
      let statusBorder = '#FFE0B2';
      let isPaid = false;

      switch (order.paymentMethod) {
        case 'COD':
          methodLabel = 'Cash on Delivery';
          methodIcon = 'cash-outline';
          statusLabel = 'Unpaid (COD)';
          statusBg = '#FFEBEE';
          statusText = '#C62828';
          statusBorder = '#FFCDD2';
          isPaid = false;
          break;
        case 'GPAY':
          methodLabel = 'Google Pay';
          methodIcon = 'logo-google';
          statusLabel = 'Paid';
          statusBg = '#E8F5E9';
          statusText = '#2E7D32';
          statusBorder = '#C8E6C9';
          isPaid = true;
          break;
        case 'PHONEPE':
          methodLabel = 'PhonePe';
          methodIcon = 'wallet-outline';
          statusLabel = 'Paid';
          statusBg = '#E8F5E9';
          statusText = '#2E7D32';
          statusBorder = '#C8E6C9';
          isPaid = true;
          break;
        case 'QR_GPAY':
          methodLabel = 'GPAY QR';
          methodIcon = 'qr-code-outline';
          if (order.utrNumber) {
            statusLabel = `Paid via QR (UTR: ${order.utrNumber})`;
            statusBg = '#E3F2FD';
            statusText = '#1565C0';
            statusBorder = '#BBDEFB';
            isPaid = true;
          } else {
            statusLabel = 'Pending Verification';
            statusBg = '#FFF3E0';
            statusText = '#E65100';
            statusBorder = '#FFE0B2';
            isPaid = false;
          }
          break;
        case 'QR_PHONEPE':
          methodLabel = 'PhonePe QR';
          methodIcon = 'qr-code-outline';
          if (order.utrNumber) {
            statusLabel = `Paid via QR (UTR: ${order.utrNumber})`;
            statusBg = '#E3F2FD';
            statusText = '#1565C0';
            statusBorder = '#BBDEFB';
            isPaid = true;
          } else {
            statusLabel = 'Pending Verification';
            statusBg = '#FFF3E0';
            statusText = '#E65100';
            statusBorder = '#FFE0B2';
            isPaid = false;
          }
          break;
        default:
          methodLabel = order.paymentMethod || 'Unknown';
          statusLabel = 'Pending';
      }

      return (
        <View style={styles.paymentBadgeRow}>
          <View style={styles.paymentMethodBadge}>
            <Ionicons name={methodIcon as any} size={12} color="#616161" style={{ marginRight: 4 }} />
            <Text style={styles.paymentMethodText}>{methodLabel}</Text>
          </View>
          <View style={[styles.paymentStatusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
            <Ionicons 
              name={isPaid ? 'checkmark-circle-outline' : 'alert-circle-outline'} 
              size={12} 
              color={statusText} 
              style={{ marginRight: 4 }} 
            />
            <Text style={[styles.paymentStatusText, { color: statusText }]}>{statusLabel}</Text>
          </View>
        </View>
      );
    };

    return (
      <ScrollView 
        style={styles.dashboardContainer} 
        nestedScrollEnabled 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Anjani's Kitchen</Text>
          <Text style={styles.dashboardSubtitle}>Admin & Operations Panel</Text>
        </View>

        {/* 1. Analytics Cards Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Revenue</Text>
            <Text style={styles.metricValue}>₹{Math.floor(totalSales)}</Text>
            <Text style={styles.metricSubText}>Gross sales (incl. tax)</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Prep</Text>
            <Text style={[styles.metricValue, { color: '#E65100' }]}>{incomingOrders.length + activePrep.length}</Text>
            <Text style={styles.metricSubText}>Cooking in kitchen</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>On Route</Text>
            <Text style={[styles.metricValue, { color: '#388E3C' }]}>{outForDelivery.length}</Text>
            <Text style={styles.metricSubText}>Riders delivering</Text>
          </View>
        </View>

        {/* 2. Incoming Requests Board */}
        <Text style={styles.dashboardSectionHeader}>Incoming Requests ({incomingOrders.length})</Text>
        {incomingOrders.length === 0 ? (
          <View style={styles.emptyDashboardCard}>
            <Ionicons name="notifications-off-outline" size={28} color="#757575" />
            <Text style={styles.emptyDashboardText}>No new requests at this moment.</Text>
          </View>
        ) : (
          incomingOrders.map(order => (
            <View key={order.id} style={styles.orderDashboardCard}>
              <View style={styles.orderCardHeader}>
                <Text style={styles.orderCardId}>{order.id}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#FFF3E0' }]}>
                  <Text style={[styles.statusPillText, { color: '#E65100' }]}>Incoming</Text>
                </View>
              </View>

              <Text style={styles.orderCardDetails}>
                Items: {order.items.map(i => `${i.item.name} x${i.quantity}`).join(', ')}
              </Text>
              <Text style={styles.orderCardInstructions}>
                💬 Instructions: "{order.cookingInstructions || 'None'}"
              </Text>
              <Text style={styles.orderCardTotal}>Total amount: ₹{Math.floor(order.totalAmount)}</Text>
              {renderPaymentInfo(order)}
              <Text style={styles.orderCardAddress}>📍 Address: {order.customerAddress}</Text>

              <TouchableOpacity 
                style={styles.acceptOrderBtn}
                onPress={() => {
                  updateOrderStatus(order.id, 'PREPARING');
                  Alert.alert('Kitchen Alert', `Order ${order.id} accepted. Starting food preparation!`);
                }}
              >
                <Ionicons name="restaurant" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.acceptOrderBtnText}>Accept & Start Cooking</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* 3. Preparation Queue Board */}
        <Text style={styles.dashboardSectionHeader}>Preparation Queue ({activePrep.length})</Text>
        {activePrep.length === 0 ? (
          <View style={styles.emptyDashboardCard}>
            <MaterialCommunityIcons name="chef-hat" size={28} color="#757575" />
            <Text style={styles.emptyDashboardText}>No items are currently cooking.</Text>
          </View>
        ) : (
          activePrep.map(order => (
            <View key={order.id} style={styles.orderDashboardCard}>
              <View style={styles.orderCardHeader}>
                <Text style={styles.orderCardId}>{order.id}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#E0F7FA' }]}>
                  <Text style={[styles.statusPillText, { color: '#006064' }]}>Preparing</Text>
                </View>
              </View>

              <Text style={styles.orderCardDetails}>
                Items: {order.items.map(i => `${i.item.name} x${i.quantity}`).join(', ')}
              </Text>
              <Text style={styles.orderCardInstructions}>
                💬 Instructions: "{order.cookingInstructions || 'None'}"
              </Text>
              <Text style={styles.orderCardTotal}>Total amount: ₹{Math.floor(order.totalAmount)}</Text>
              {renderPaymentInfo(order)}

              <TouchableOpacity 
                style={styles.dispatchOrderBtn}
                onPress={() => {
                  updateOrderStatus(order.id, 'OUT_FOR_DELIVERY');
                  Alert.alert('Kitchen Dispatch', `Order ${order.id} dispatched! Assigned to partner Ramesh Kumar.`);
                }}
              >
                <Ionicons name="bicycle" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.dispatchOrderBtnText}>Ready (Dispatch for Delivery)</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* 4. Active Deliveries Board */}
        <Text style={styles.dashboardSectionHeader}>Live Deliveries ({outForDelivery.length})</Text>
        {outForDelivery.length === 0 ? (
          <View style={styles.emptyDashboardCard}>
            <Ionicons name="bicycle-outline" size={28} color="#757575" />
            <Text style={styles.emptyDashboardText}>No orders are currently out on the road.</Text>
          </View>
        ) : (
          outForDelivery.map(order => (
            <View key={order.id} style={styles.orderDashboardCard}>
              <View style={styles.orderCardHeader}>
                <Text style={styles.orderCardId}>{order.id}</Text>
                <View style={[styles.statusPill, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.statusPillText, { color: '#2E7D32' }]}>On Route</Text>
                </View>
              </View>
              <Text style={styles.orderCardDetails}>Rider: Ramesh Kumar (+91 9123456789)</Text>
              <Text style={styles.orderCardAddress}>📍 Customer address: {order.customerAddress}</Text>
              <Text style={styles.orderCardTotal}>Total amount: ₹{Math.floor(order.totalAmount)}</Text>
              {renderPaymentInfo(order)}
              <Text style={styles.orderCardInstructions}>📍 Coordinates: {order.userLat.toFixed(4)}, {order.userLng.toFixed(4)}</Text>
            </View>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const renderMenuCatalog = () => {
    const categories = ['All', ...MenuCategories];
    
    const filtered = menuItems.filter(item => {
      if (item.isDeleted) return false;
      const matchesSearch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(menuSearchQuery.toLowerCase());
      const matchesCategory = menuSelectedCategory === 'All' || item.category === menuSelectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Group into sections for SectionList (Zomato/Swiggy style virtualization)
    const sections = MenuCategories
      .filter(cat => menuSelectedCategory === "All" || cat === menuSelectedCategory)
      .map(cat => ({
        title: cat,
        data: filtered.filter(i => i.category === cat)
      }))
      .filter(section => section.data.length > 0);

    const renderHeader = () => (
      <View style={styles.catalogHeader}>
        <Text style={styles.catalogTitle}>Menu Catalog</Text>
        <Text style={styles.catalogSubtitle}>Manage names, pricing, and availability</Text>
        
        <View style={styles.menuSearchRow}>
          <Ionicons name="search" size={20} color="#9A8A72" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.menuSearchInput}
            placeholder="Search dishes..."
            placeholderTextColor="#9A8A72"
            value={menuSearchQuery}
            onChangeText={setMenuSearchQuery}
            autoCorrect={false}
          />
          {menuSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setMenuSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#9A8A72" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Horizontal Scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {categories.map(cat => {
            const isActive = cat === menuSelectedCategory;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, isActive && styles.catPillActive]}
                onPress={() => setMenuSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catPillText, isActive && styles.catPillTextActive]}>
                  {CAT_ICONS[cat] || '🍽️'} {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );

    return (
      <View style={{ flex: 1, backgroundColor: '#18120A' }}>
        <SectionList
          sections={sections}
          keyExtractor={(item: MenuItem) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={true}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={<View style={{ height: 60 }} />}
          ListEmptyComponent={
            <View style={{ paddingHorizontal: 16 }}>
              <View style={styles.emptyCatalogCard}>
                <Ionicons name="alert-circle-outline" size={32} color="#9A8A72" />
                <Text style={styles.emptyCatalogText}>No dishes found matching search parameters.</Text>
              </View>
            </View>
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ backgroundColor: '#18120A', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
              <View style={styles.catalogCategoryHeader}>
                <Text style={styles.catalogCategoryTitle}>
                  {CAT_ICONS[title] || '🍽️'} {title.toUpperCase()}
                </Text>
                <View style={styles.catalogCategoryBadge}>
                  <Text style={styles.catalogCategoryBadgeText}>
                    {filtered.filter(i => i.category === title).length} items
                  </Text>
                </View>
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            const isSoldOut = soldOutDishIds.includes(item.id) || item.isAvailable === false;
            return (
              <View style={{ paddingHorizontal: 16 }}>
                <View style={styles.catalogItemCard}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.catalogItemImage} />
                  ) : (
                    <View style={[styles.catalogItemImage, { backgroundColor: '#2A1F12', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)' }]} />
                  )}
                  
                  <View style={styles.catalogItemDetails}>
                    <View style={styles.catalogItemHeaderRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <View style={[styles.vegBadgeCustom, { borderColor: item.isVeg ? '#22C55E' : '#EF4444' }]}>
                            <View style={[styles.vegDotCustom, { backgroundColor: item.isVeg ? '#22C55E' : '#EF4444' }]} />
                          </View>
                          <Text style={[styles.vegLabelCustom, { color: item.isVeg ? '#22C55E' : '#EF4444' }]}>
                            {item.isVeg ? 'VEG' : 'NON-VEG'}
                          </Text>
                          <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,107,0,0.2)', marginHorizontal: 8 }} />
                          <Ionicons name="star" size={10} color="#FFB300" />
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFB300', marginLeft: 3 }}>
                            {(item.rating || 4.5).toFixed(1)}
                          </Text>
                        </View>
                        <Text style={styles.catalogItemName}>{item.name}</Text>
                      </View>
                      <Text style={styles.catalogItemPrice}>₹{Math.floor(item.price)}</Text>
                    </View>

                    <Text style={styles.catalogItemDesc} numberOfLines={2}>
                      {item.description || 'No description provided.'}
                    </Text>

                    <View style={styles.catalogItemActionRow}>
                      {/* Availability Switch */}
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Switch
                          value={!isSoldOut}
                          onValueChange={() => toggleDishAvailability(item.id)}
                          trackColor={{ false: '#767577', true: 'rgba(255,107,0,0.4)' }}
                          thumbColor={!isSoldOut ? '#FF6B00' : '#ECEFF1'}
                          style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                        />
                        <Text style={[styles.catalogItemStatusText, { color: isSoldOut ? '#EF4444' : '#22C55E' }]}>
                          {isSoldOut ? 'Unavailable' : 'Available Today'}
                        </Text>
                      </View>

                      {/* Edit Button */}
                      <TouchableOpacity
                        style={styles.catalogEditBtn}
                        onPress={() => {
                          setEditingItem(item);
                          setEditName(item.name);
                          setEditDescription(item.description);
                          setEditPrice(String(item.price));
                          setEditAvailable(item.isAvailable !== false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="pencil-sharp" size={10} color="#FF6B00" style={{ marginRight: 4 }} />
                        <Text style={styles.catalogEditBtnText}>Edit Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>
    );
  };

  const renderEditModal = () => {
    if (!editingItem) return null;

    const handleSave = async () => {
      if (!editName.trim() || !editPrice.trim()) {
        Alert.alert('Validation Error', 'Dish name and price cannot be empty.');
        return;
      }
      
      const parsedPrice = parseFloat(editPrice);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid positive price.');
        return;
      }

      await updateMenuItem(
        editingItem.id,
        editName.trim(),
        editDescription.trim(),
        parsedPrice,
        editAvailable
      );

      Alert.alert('Catalog Updated', `"${editName}" details have been updated and synchronized!`);
      setEditingItem(null);
    };

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Dish Details</Text>
            <TouchableOpacity onPress={() => setEditingItem(null)}>
              <Ionicons name="close-circle-sharp" size={24} color="#757575" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalScroll} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Dish Name */}
            <Text style={styles.modalLabel}>Dish Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="e.g. Special Chicken Biryani"
              placeholderTextColor="#9E9E9E"
            />

            {/* 2. Dish Description */}
            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalInputMultiLine]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="e.g. Traditional slow-cooked layered rice dish..."
              placeholderTextColor="#9E9E9E"
              multiline
              numberOfLines={3}
            />

            {/* 3. Dish Price */}
            <Text style={styles.modalLabel}>Price (₹)</Text>
            <TextInput
              style={styles.modalInput}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
              placeholder="e.g. 250"
              placeholderTextColor="#9E9E9E"
            />

            {/* 4. Availability Toggle */}
            <View style={styles.modalToggleRow}>
              <View>
                <Text style={styles.modalLabel}>Available Today</Text>
                <Text style={{ fontSize: 11, color: '#757575', marginTop: 2 }}>
                  Controls whether customers can order this dish today
                </Text>
              </View>
              <Switch
                value={editAvailable}
                onValueChange={setEditAvailable}
                trackColor={{ false: '#767577', true: '#FFCC80' }}
                thumbColor={editAvailable ? '#E65100' : '#f4f3f4'}
              />
            </View>
            
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Delete Dish Permanently */}
          <TouchableOpacity 
            style={styles.modalDeleteBtn}
            onPress={() => {
              Alert.alert(
                'Delete Dish Permanently',
                `Are you sure you want to completely delete "${editingItem.name}" from the catalog?\n\nThis action cannot be undone and will remove the dish from all apps.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: async () => {
                      const deletedName = editingItem.name;
                      await deleteMenuItem(editingItem.id);
                      setEditingItem(null);
                      Alert.alert('Dish Deleted', `"${deletedName}" has been permanently removed from the catalog across all apps.`);
                    }
                  }
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={14} color="#D32F2F" style={{ marginRight: 6 }} />
            <Text style={styles.modalDeleteBtnText}>Delete Dish Completely</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.modalActionRow}>
            <TouchableOpacity 
              style={styles.modalCancelBtn}
              onPress={() => setEditingItem(null)}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalSaveBtn}
              onPress={handleSave}
            >
              <Text style={styles.modalSaveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (showSplash || !currentUser) {
    return (
      <View style={styles.container}>
        {/* Background 1: Splash Screen Image */}
        <Animated.Image 
          source={require('../../assets/images/cinematic-bg.png')}
          style={[styles.bgImage, { opacity: splashOpacity, transform: [{ scale: imageScale }, { translateX: imageTranslateX }] }]}
          resizeMode="cover"
          blurRadius={4}
        />
        {/* Background 2: Auth Screen Empty Restaurant Image */}
        <Animated.Image 
          source={require('../../assets/images/auth-bg-3.png')}
          style={[styles.bgImage, { opacity: authOpacity, transform: [{ scale: imageScale }, { translateX: imageTranslateX }] }]}
          resizeMode="cover"
          blurRadius={6}
        />

        {/* Crossfading Overlays */}
        <Animated.View style={[styles.overlay, { opacity: splashOpacity, backgroundColor: 'rgba(0, 0, 0, 0.75)' }]} pointerEvents="none" />
        <Animated.View style={[styles.overlay, { opacity: authOpacity, backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} pointerEvents="none" />

        <KeyboardAvoidingView 
          style={{ flex: 1, backgroundColor: 'transparent' }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView 
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(insets.top, 20),
                paddingBottom: Math.max(insets.bottom, 20)
              }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Morphing Brand Box */}
            <Animated.View 
              style={[
                styles.brandBox, 
                { 
                  transform: [
                    { translateY: titleTranslateY },
                    { translateY: keyboardBrandY },
                    { scale: keyboardBrandScale }
                  ] 
                }
              ]}
            >
              <Text style={styles.title}>ANJANI</Text>
              <Text style={styles.titleSecond}>RESTAURANT</Text>
              
              {/* Animated Divider & Tagline Wrapper which fades out on keyboard */}
              <Animated.View style={{ opacity: keyboardBrandOpacity, alignItems: 'center', width: '100%', transform: [{ scaleY: keyboardBrandOpacity }] }}>
                <View style={styles.divider} />
                
                {/* Tagline (Splash Screen Only) */}
                <View style={styles.taglineWrapper}>
                  <Animated.Text style={[styles.tagline, { opacity: splashOpacity }]}>
                    Kitchen & Dispatch Operations Suite 🔥
                  </Animated.Text>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Fade In & Slide Up Auth Form */}
            {!currentUser && (
              <Animated.View 
                style={[
                  styles.actionBox, 
                  { 
                    opacity: authOpacity, 
                    transform: [
                      { translateY: formTranslateY },
                      { translateY: keyboardFormY }
                    ] 
                  }
                ]}
              >
                {/* Console Header */}
                <View style={styles.consoleHeader}>
                  <Ionicons name="shield-checkmark" size={normalize(22)} color="#FF6B00" style={{ marginBottom: 4 }} />
                  <Text style={styles.consoleTitle}>OWNER MANAGEMENT PORTAL</Text>
                  <Text style={styles.consoleSubtitle}>Authorized Administrative Access Only</Text>
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="Administrative Email"
                      placeholderTextColor="#888"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                    <TextInput 
                      style={styles.input}
                      placeholder="Security Password"
                      placeholderTextColor="#888"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>

                  {error ? (
                    <Text style={styles.errorText}>{error}</Text>
                  ) : null}

                  <TouchableOpacity 
                    style={styles.primaryBtn} 
                    onPress={handleSignIn}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.primaryBtnTxt}>
                        Secure Sign In
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Google Account Selector Mock Modal */}
        {showGoogleModal && (
          <Modal transparent visible animationType="fade">
            <View style={styles.gModalBackdrop}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowGoogleModal(false)} />
              
              <AnimatedReanimated.View 
                entering={SlideInDown.duration(350)} 
                exiting={SlideOutDown.duration(250)}
                style={[styles.gModalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}
              >
                <View style={styles.gModalHandle} />
                <Ionicons name="logo-google" size={normalize(28)} color="#0D0A06" style={{ alignSelf: 'center', marginBottom: normalize(14) }} />
                <Text style={styles.gModalTitle}>Choose an account</Text>
                <Text style={styles.gModalSub}>to continue to Anjani Restaurant</Text>

                <View style={styles.gAccountList}>
                  <TouchableOpacity style={styles.gAccountRow} onPress={() => handleGoogleLogin('owner.anjani@gmail.com', 'Anjani Restaurant Owner')}>
                    <View style={styles.gAccountAvatar}>
                      <Text style={styles.gAvatarTxt}>A</Text>
                    </View>
                    <View style={styles.gAccountDetails}>
                      <Text style={styles.gAccountName}>Anjani Restaurant Owner</Text>
                      <Text style={styles.gAccountEmail}>owner.anjani@gmail.com</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.gAccountRow} onPress={() => handleGoogleLogin('chef.suresh@gmail.com', 'Chef Suresh')}>
                    <View style={[styles.gAccountAvatar, { backgroundColor: '#4285F4' }]}>
                      <Text style={styles.gAvatarTxt}>S</Text>
                    </View>
                    <View style={styles.gAccountDetails}>
                      <Text style={styles.gAccountName}>Chef Suresh</Text>
                      <Text style={styles.gAccountEmail}>chef.suresh@gmail.com</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.gAccountRow} onPress={() => setShowGoogleModal(false)}>
                    <View style={[styles.gAccountAvatar, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#DDD' }]}>
                      <Ionicons name="person-add-outline" size={normalize(18)} color="#555" />
                    </View>
                    <View style={styles.gAccountDetails}>
                      <Text style={styles.gAccountName}>Add another account</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </AnimatedReanimated.View>
            </View>
          </Modal>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#18120A', paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0A06" />
      
      {/* Top Brand Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0D0A06', borderBottomWidth: 1, borderBottomColor: 'rgba(255,107,0,0.18)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,107,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name="chef-hat" size={18} color="#FF6B00" />
          </View>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#F5ECD7' }}>Anjani Restaurant</Text>
            <Text style={{ fontSize: 11, color: '#9A8A72' }}>Owner Operations Suite</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' }} />
            <Text style={{ fontSize: 11, color: '#22C55E', fontWeight: '700' }}>Live</Text>
          </View>
          <TouchableOpacity 
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center', justifyContent: 'center' }} 
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to log out from the Owner operations session?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: async () => {
                  await logout();
                  // Reset credentials input states
                  setEmail('');
                  setPassword('');
                  setError('');
                  // Transition directly to the active login screen cleanly
                  splashOpacity.setValue(0);
                  authOpacity.setValue(1);
                  titleTranslateY.setValue(-normalize(55));
                  formTranslateY.setValue(0);
                  setShowSplash(false);
                }}
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Switcher Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'operations' && styles.tabButtonActive]}
          onPress={() => setActiveTab('operations')}
        >
          <MaterialCommunityIcons 
            name="chef-hat" 
            size={18} 
            color={activeTab === 'operations' ? '#FFF' : '#9A8A72'} 
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'operations' && styles.tabButtonTextActive]}>
            Operations
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'menu' && styles.tabButtonActive]}
          onPress={() => setActiveTab('menu')}
        >
          <Ionicons 
            name="restaurant" 
            size={16} 
            color={activeTab === 'menu' ? '#FFF' : '#9A8A72'} 
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabButtonText, activeTab === 'menu' && styles.tabButtonTextActive]}>
            Menu Catalog
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'operations' ? renderOwnerDashboard() : renderMenuCatalog()}
      
      {/* Edit Details Overlay Dialog */}
      {renderEditModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: normalize(20),
    gap: normalize(16),
  },
  brandBox: {
    alignItems: 'center',
  },
  title: {
    fontSize: normalize(34),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: normalize(6),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  titleSecond: {
    fontSize: normalize(30),
    fontWeight: '300',
    color: '#FFF',
    letterSpacing: normalize(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    width: normalize(50),
    height: 2,
    backgroundColor: '#FF6D00',
    marginVertical: normalize(16),
    shadowColor: '#E65100',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  taglineWrapper: {
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    width: '100%',
  },
  tagline: {
    fontSize: normalize(12),
    fontWeight: '500',
    color: '#E0E0E0',
    letterSpacing: normalize(2),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  actionBox: {
    width: '100%',
    maxWidth: 400, 
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
    borderRadius: normalize(20),
    padding: normalize(18),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  consoleHeader: {
    alignItems: 'center',
    marginBottom: normalize(20),
    paddingTop: normalize(6),
  },
  consoleTitle: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: '#FF6B00',
    letterSpacing: normalize(1.5),
    textAlign: 'center',
  },
  consoleSubtitle: {
    fontSize: normalize(11),
    fontWeight: '500',
    color: '#9A8A72',
    marginTop: normalize(2),
    textAlign: 'center',
  },
  formContainer: {
    gap: normalize(14),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(14),
    height: normalize(48),
  },
  inputIcon: {
    marginRight: normalize(10),
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: normalize(14),
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: '#FF6D00',
    height: normalize(48),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(4),
    shadowColor: '#FF6D00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryBtnTxt: {
    color: '#FFF',
    fontSize: normalize(14),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: normalize(2),
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  orTxt: {
    color: '#888',
    marginHorizontal: normalize(14),
    fontSize: normalize(11),
    fontWeight: 'bold',
  },
  googleBtn: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    height: normalize(48),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: normalize(10),
  },
  googleBtnTxt: {
    color: '#FFF',
    fontSize: normalize(14),
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: normalize(12),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: normalize(4),
  },
  gModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  gModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    padding: normalize(24),
  },
  gModalHandle: {
    width: normalize(40),
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: normalize(20),
  },
  gModalTitle: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: '#221A0F',
    textAlign: 'center',
  },
  gModalSub: {
    fontSize: normalize(13),
    color: '#757575',
    textAlign: 'center',
    marginBottom: normalize(24),
    marginTop: 4,
  },
  gAccountList: {
    gap: normalize(14),
  },
  gAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(8),
  },
  gAccountAvatar: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#FF6D00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(14),
  },
  gAvatarTxt: {
    color: '#FFF',
    fontSize: normalize(16),
    fontWeight: 'bold',
  },
  gAccountDetails: {
    flex: 1,
  },
  gAccountName: {
    fontSize: normalize(15),
    fontWeight: '600',
    color: '#221A0F',
  },
  gAccountEmail: {
    fontSize: normalize(13),
    color: '#757575',
    marginTop: 2,
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#18120A',
    paddingHorizontal: 16,
  },
  dashboardHeader: {
    marginVertical: 20,
  },
  dashboardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F5ECD7',
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#9A8A72',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#221A0F',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  metricLabel: {
    fontSize: 10,
    color: '#9A8A72',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5ECD7',
    marginVertical: 4,
  },
  metricSubText: {
    fontSize: 8,
    color: '#9A8A72',
  },
  dashboardSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A8A72',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  orderDashboardCard: {
    backgroundColor: '#221A0F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  orderCardId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5ECD7',
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  orderCardDetails: {
    fontSize: 12,
    color: '#9A8A72',
    marginBottom: 6,
    lineHeight: 18,
  },
  orderCardInstructions: {
    fontSize: 11,
    color: '#FF6B00',
    fontStyle: 'italic',
    marginBottom: 6,
    backgroundColor: 'rgba(255,107,0,0.08)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  orderCardTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F5ECD7',
    marginBottom: 6,
  },
  orderCardAddress: {
    fontSize: 12,
    color: '#9A8A72',
    marginBottom: 8,
  },
  paymentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1F12',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9A8A72',
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  acceptOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 10,
    gap: 6,
  },
  acceptOrderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dispatchOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 10,
    gap: 6,
  },
  dispatchOrderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyDashboardCard: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#221A0F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    gap: 8,
  },
  emptyDashboardText: {
    fontSize: 12,
    color: '#9A8A72',
    marginTop: 4,
  },
  menuControlCard: {
    backgroundColor: '#221A0F',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    marginBottom: 20,
  },
  menuControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.1)',
  },
  menuControlName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5ECD7',
  },
  menuControlCategory: {
    fontSize: 12,
    color: '#9A8A72',
    marginTop: 2,
  },
  menuControlStatus: {
    fontSize: 11,
    fontWeight: '700',
    marginRight: 8,
  },
  
  // Menu Catalog Manager & Custom Edit Modal Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0D0A06',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#221A0F',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  tabButtonActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A8A72',
  },
  tabButtonTextActive: {
    color: '#FFF',
  },
  catalogHeader: {
    padding: 16,
    backgroundColor: '#0D0A06',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.18)',
  },
  catalogTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F5ECD7',
  },
  catalogSubtitle: {
    fontSize: 12,
    color: '#9A8A72',
    marginTop: 2,
  },
  menuSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#221A0F',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  menuSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#F5ECD7',
    padding: 0,
  },
  categoriesScroll: {
    marginTop: 12,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#221A0F',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  catPillActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9A8A72',
  },
  catPillTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  emptyCatalogCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#221A0F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    marginTop: 20,
  },
  emptyCatalogText: {
    fontSize: 13,
    color: '#9A8A72',
    marginTop: 8,
    textAlign: 'center',
  },
  catalogItemCard: {
    flexDirection: 'row',
    backgroundColor: '#221A0F',
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  catalogItemImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
  },
  catalogItemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  catalogItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vegIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  vegLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  vegBadgeCustom: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  vegDotCustom: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  vegLabelCustom: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catalogItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F5ECD7',
  },
  catalogItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B00',
  },
  catalogItemDesc: {
    fontSize: 11,
    color: '#9A8A72',
    marginVertical: 4,
    lineHeight: 15,
  },
  catalogItemActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  catalogItemStatusText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  catalogEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,0,0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  catalogEditBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalCard: {
    width: SCREEN_WIDTH * 0.88,
    maxHeight: SCREEN_HEIGHT * 0.75,
    backgroundColor: '#221A0F',
    borderRadius: 20,
    padding: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.18)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5ECD7',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A8A72',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#F5ECD7',
    backgroundColor: '#18120A',
    marginBottom: 16,
  },
  modalInputMultiLine: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18120A',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
    marginBottom: 16,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,107,0,0.18)',
    paddingTop: 16,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2A1F12',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A8A72',
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  catalogCategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,0,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B00',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
  },
  catalogCategoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B00',
    letterSpacing: 0.8,
  },
  catalogCategoryBadge: {
    backgroundColor: 'rgba(255,107,0,0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  catalogCategoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF6B00',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 6,
  },
  modalDeleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
});
