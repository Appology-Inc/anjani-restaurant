import json

code = """import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView,
  Image, Dimensions, Alert, Platform, Animated, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../state/AppStore';
import * as Location from 'expo-location';

const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  primary: "#FF6B00", dark: "#0D0A06", surface: "#18120A",
  card: "#221A0F", card2: "#2A1F12", border: "rgba(255,107,0,0.18)",
  text: "#F5ECD7", muted: "#9A8A72", green: "#22C55E",
  red: "#EF4444", white: "#FFFFFF", gold: "#FFD700",
};

const CATEGORIES = [
  "All", "Non-Veg Starters", "Sea Food Starters", "Veg Starters",
  "Biryanis & Pulaos", "Non-Veg Curries", "Veg Curries",
  "Rice & Noodles", "Indian Breads", "Desserts & Beverages",
];

const CAT_ICONS: Record<string,string> = {
  "All": "🍽️", "Non-Veg Starters": "🍗", "Sea Food Starters": "🦐",
  "Veg Starters": "🥦", "Biryanis & Pulaos": "🍛", "Non-Veg Curries": "🍖",
  "Veg Curries": "🫕", "Rice & Noodles": "🍜", "Indian Breads": "🫓",
  "Desserts & Beverages": "🍮",
};

export default function App() {
  const insets = useSafeAreaInsets();
  
  const {
    currentUser, login, logout, 
    cart, addToCart, removeFromCart, getCartTotal, getCartCount, clearCart,
    activeOrder, placeOrder, clearActiveOrder,
    loadSavedSession, menuItems, seedDemoDashboardOrders
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'profile'>('menu');
  const [showTracking, setShowTracking] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [activeCat, setActiveCat] = useState("All");

  // Auth States
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [registerCoords, setRegisterCoords] = useState<{latitude:number, longitude:number}|null>(null);
  
  // Cart/Checkout States
  const [checkoutStep, setCheckoutStep] = useState<1|2|3>(1);
  const [paymentMethod, setPaymentMethod] = useState<'COD'|'GPAY'|'PHONEPE'|'QR_GPAY'|'QR_PHONEPE'|null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [cookingInstructions, setCookingInstructions] = useState('');

  // Animations
  const splashContainerOpacity = useRef(new Animated.Value(1)).current;
  const brandRevealOpacity = useRef(new Animated.Value(0)).current;
  const brandRevealScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    loadSavedSession();
    seedDemoDashboardOrders();

    Animated.parallel([
      Animated.timing(brandRevealOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(brandRevealScale, { toValue: 1, duration: 1500, useNativeDriver: true })
    ]).start();

    setTimeout(() => {
      Animated.timing(splashContainerOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => setShowSplash(false));
    }, 2000);
  }, []);

  const handleAutoDetectLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Permission denied');
      const location = await Location.getCurrentPositionAsync({});
      setRegisterCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      Alert.alert('GPS Locked', 'Your location has been locked for delivery.');
    } catch (e) {
      Alert.alert('Error', 'Failed to detect location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleRegister = () => {
    if (!name || !email || !address || !phone) return Alert.alert('Error', 'Fill all details');
    login({
      uid: `USR-${Date.now()}`, name, email, phone, address,
      addresses: [{ id: '1', label: 'Home', details: address, ...registerCoords }],
      selectedAddressId: '1', ...registerCoords
    });
  };

  const processPayment = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const utr = `UTR${Date.now()}`;
      placeOrder(
        currentUser?.address || address, currentUser?.phone || phone, 
        paymentMethod || 'COD', utr, cookingInstructions,
        currentUser?.latitude || registerCoords?.latitude,
        currentUser?.longitude || registerCoords?.longitude
      );
      setCheckoutStep(1); setActiveTab('profile'); setShowTracking(true);
      Alert.alert('Success', 'Order Placed successfully!');
    }, 1500);
  };

  const filteredMenu = menuItems.filter(i => {
    if (i.isDeleted) return false;
    if (activeCat !== "All" && i.category !== activeCat && activeCat !== "All") return false;
    return true;
  });

  const renderMenuView = () => (
    <View style={st.container}>
      <View style={st.headerTop}>
        <View>
          <Text style={st.greetTxt}>Welcome,</Text>
          <Text style={st.userNameTxt}>{currentUser?.name?.split(" ")[0] || "Guest"} 👋</Text>
        </View>
        <Image source={{uri: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200&q=60'}} style={st.headerAvatar} />
      </View>

      <View style={st.heroBanner}>
         <Image source={{ uri: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=60" }} style={StyleSheet.absoluteFillObject} />
         <View style={st.heroOverlay} />
         <Text style={st.heroTitle}>Taste the Tradition</Text>
         <Text style={st.heroSub}>Pure Flavours Since 2005</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.catScroll}>
        {CATEGORIES.map(cat => {
          const isOn = activeCat === cat;
          return (
            <TouchableOpacity key={cat} style={[st.catTab, isOn && st.catTabOn]} onPress={() => setActiveCat(cat)}>
              <Text style={[st.catTabTxt, isOn && st.catTabTxtOn]}>
                {CAT_ICONS[cat]} {cat === "All" ? "All" : cat.split(" ")[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} style={{flex:1, marginTop: 16}}>
        {filteredMenu.map(item => {
          const ci = cart[item.id];
          return (
            <TouchableOpacity key={item.id} style={st.menuCard}>
              <View style={{ flex: 1, padding: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green }}/>
                  <Text style={st.menuName}>{item.name}</Text>
                </View>
                <Text style={st.menuDesc} numberOfLines={2}>{item.description}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <Text style={st.menuPrice}>₹{item.price}</Text>
                  {!item.isAvailable ? (
                    <Text style={{color: C.red, fontWeight: 'bold'}}>Sold Out</Text>
                  ) : ci ? (
                    <View style={st.qcRow}>
                      <TouchableOpacity style={st.qcBtn} onPress={() => removeFromCart(item)}><Text style={st.qcBtnTxt}>−</Text></TouchableOpacity>
                      <Text style={st.qcNum}>{ci.quantity}</Text>
                      <TouchableOpacity style={[st.qcBtn, { backgroundColor: C.primary, borderColor: C.primary }]} onPress={() => addToCart(item)}>
                        <Text style={[st.qcBtnTxt, { color: C.white }]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={st.addBtn} onPress={() => addToCart(item)}>
                      <Ionicons name="add" size={18} color={C.white}/>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );

  const renderCartView = () => (
    <ScrollView style={st.container}>
      <Text style={st.pageTitle}>Your Cart</Text>
      {Object.values(cart).length === 0 ? (
        <Text style={st.emptyText}>Cart is empty</Text>
      ) : (
        <View>
          <View style={st.billCard}>
            {Object.values(cart).map(c => (
              <View key={c.item.id} style={st.cartRow}>
                <Text style={st.cartName}>{c.quantity} x {c.item.name}</Text>
                <Text style={st.cartPrice}>₹{c.item.price * c.quantity}</Text>
              </View>
            ))}
            <View style={st.billDivider}/>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 10}}>
                <Text style={st.cartName}>Grand Total</Text>
                <Text style={[st.cartPrice, {fontSize: 18, color: C.primary}]}>₹{getCartTotal()}</Text>
            </View>
          </View>
          
          {checkoutStep === 1 && (
            <TouchableOpacity onPress={() => setCheckoutStep(2)} style={st.placeOrderBtn}>
              <Text style={st.placeOrderTxt}>Proceed to Payment</Text>
            </TouchableOpacity>
          )}

          {checkoutStep === 2 && (
            <View style={[st.billCard, {marginTop: 20}]}>
              <Text style={st.sectionLabel}>Select Payment Method</Text>
              {['COD', 'GPAY', 'PHONEPE'].map(m => (
                <TouchableOpacity key={m} onPress={() => setPaymentMethod(m as any)} style={[st.payOpt, paymentMethod === m && st.payOptOn]}>
                  <View style={[st.radio, paymentMethod === m && st.radioOn]}>
                    {paymentMethod === m && <View style={st.radioInner}/>}
                  </View>
                  <Text style={st.payLabel}>{m}</Text>
                </TouchableOpacity>
              ))}
              <TextInput placeholder="Cooking Instructions?" placeholderTextColor={C.muted} value={cookingInstructions} onChangeText={setCookingInstructions} style={st.noteInput} />
              <TouchableOpacity onPress={processPayment} style={[st.placeOrderBtn, {marginTop: 16}]}>
                <Text style={st.placeOrderTxt}>Confirm Order</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      <View style={{height: 100}} />
    </ScrollView>
  );

  const renderProfileView = () => (
    <ScrollView style={st.container}>
      {!currentUser ? (
        <View style={st.billCard}>
          <Text style={st.pageTitle}>Welcome</Text>
          <TextInput placeholderTextColor={C.muted} placeholder="Name" value={name} onChangeText={setName} style={st.input} />
          <TextInput placeholderTextColor={C.muted} placeholder="Email" value={email} onChangeText={setEmail} style={st.input} />
          <TextInput placeholderTextColor={C.muted} placeholder="Phone" value={phone} onChangeText={setPhone} style={st.input} />
          <TextInput placeholderTextColor={C.muted} placeholder="Address" value={address} onChangeText={setAddress} style={st.input} />
          <TouchableOpacity onPress={handleAutoDetectLocation} style={[st.ghostBtn, {marginBottom: 16}]}>
            <Text style={st.ghostBtnTxt}>{isLocating ? 'Locating...' : 'Auto Detect GPS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRegister} style={st.placeOrderBtn}>
            <Text style={st.placeOrderTxt}>Register</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={st.profileHero}>
          <View style={st.avatar}><Ionicons name="person" size={32} color={C.primary}/></View>
          <Text style={st.profileName}>{currentUser.name}</Text>
          <Text style={st.profileEmail}>{currentUser.email} | {currentUser.phone}</Text>
          <Text style={st.profileEmail}>Address: {currentUser.address}</Text>
          
          <TouchableOpacity onPress={() => logout()} style={[st.ghostBtn, {marginTop: 20}]}>
            <Text style={st.ghostBtnTxt}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={{height: 100}} />
    </ScrollView>
  );

  const renderTrackingView = () => {
    if (!activeOrder) return <Text style={{marginTop: 100, textAlign: 'center', color: C.text}}>No active order.</Text>;
    return (
      <View style={[st.container, {paddingTop: 50}]}>
        <TouchableOpacity style={st.backBtn} onPress={() => setShowTracking(false)}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={st.trackHero}>
            <Text style={st.pageTitle}>Order Tracker</Text>
            <Text style={st.trackStatus}>{activeOrder.status}</Text>
        </View>
        <View style={{alignItems:'center', marginTop: 20}}>
            <Text style={{color: C.muted}}>Rider Coordinates: {activeOrder.riderLat}, {activeOrder.riderLng}</Text>
        </View>
        {activeOrder.status === 'DELIVERED' && (
          <TouchableOpacity onPress={() => clearActiveOrder()} style={[st.placeOrderBtn, {margin: 20, marginTop: 40}]}>
            <Text style={st.placeOrderTxt}>Clear Order</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (showSplash) {
    return (
      <Animated.View style={[st.splashContainer, { opacity: splashContainerOpacity }]}>
        <Animated.View style={{ opacity: brandRevealOpacity, transform: [{ scale: brandRevealScale }], alignItems:'center' }}>
          <Text style={{ fontSize: 56 }}>🔥</Text>
          <Text style={st.splashText}>Anjani Restaurant</Text>
          <Text style={st.splashSub}>Authentic Hyderabadi Cuisine</Text>
        </Animated.View>
      </Animated.View>
    );
  }

  if (showTracking) return renderTrackingView();

  return (
    <View style={{ flex: 1, backgroundColor: C.surface, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />
      <View style={{ flex: 1 }}>
        {activeTab === 'menu' && renderMenuView()}
        {activeTab === 'cart' && renderCartView()}
        {activeTab === 'profile' && renderProfileView()}
      </View>

      <View style={[st.bottomTabBar, { height: 65 + insets.bottom, paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={[st.tabItem]} onPress={() => setActiveTab('menu')}>
          <Ionicons name="restaurant" size={24} color={activeTab === 'menu' ? C.primary : C.muted} />
          <Text style={[st.tabLabel, activeTab === 'menu' && {color: C.primary}]}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tabItem]} onPress={() => setActiveTab('cart')}>
          <Ionicons name="cart" size={24} color={activeTab === 'cart' ? C.primary : C.muted} />
          <Text style={[st.tabLabel, activeTab === 'cart' && {color: C.primary}]}>Cart ({getCartCount()})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tabItem]} onPress={() => setActiveTab('profile')}>
          <Ionicons name="person" size={24} color={activeTab === 'profile' ? C.primary : C.muted} />
          <Text style={[st.tabLabel, activeTab === 'profile' && {color: C.primary}]}>Profile</Text>
        </TouchableOpacity>
      </View>
      
      {activeOrder && !showTracking && (
        <TouchableOpacity style={st.floatingBanner} onPress={() => setShowTracking(true)}>
          <Text style={st.bannerText}>View Active Order: {activeOrder.status}</Text>
        </TouchableOpacity>
      )}
      
      {isVerifying && (
        <View style={st.overlay}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{color: '#FFF', marginTop: 10}}>Verifying Payment...</Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: C.dark, alignItems: 'center', justifyContent: 'center' },
  splashText: { color: C.primary, fontSize: 32, fontWeight: 'bold', marginTop: 10 },
  splashSub: { color: C.muted, fontSize: 16, marginTop: 4 },
  
  container: { flex: 1, backgroundColor: C.surface },
  
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center' },
  greetTxt: { color: C.muted, fontSize: 14 },
  userNameTxt: { color: C.text, fontSize: 20, fontWeight: 'bold' },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card },

  heroBanner: { height: 160, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', padding: 20 },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  heroTitle: { color: C.white, fontSize: 24, fontWeight: 'bold', zIndex: 1 },
  heroSub: { color: '#DDD', fontSize: 14, zIndex: 1, marginTop: 4 },

  catScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  catTabOn: { backgroundColor: C.primary, borderColor: C.primary },
  catTabTxt: { color: C.text, fontWeight: '600' },
  catTabTxtOn: { color: C.white },

  menuCard: { backgroundColor: C.card, marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: C.border },
  menuName: { color: C.text, fontSize: 16, fontWeight: 'bold' },
  menuDesc: { color: C.muted, fontSize: 12, marginTop: 4, lineHeight: 18 },
  menuPrice: { color: C.primary, fontSize: 16, fontWeight: 'bold' },

  addBtn: { backgroundColor: C.card2, width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  qcRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qcBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  qcBtnTxt: { color: C.text, fontSize: 16, fontWeight: 'bold' },
  qcNum: { color: C.text, fontSize: 16, fontWeight: 'bold' },

  pageTitle: { fontSize: 24, fontWeight: "700", color: C.text, padding: 16 },
  emptyText: { textAlign: 'center', marginTop: 50, color: C.muted },
  
  billCard: { marginHorizontal: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  cartRow: { flexDirection: "row", justifyContent: 'space-between', paddingVertical: 8 },
  cartName: { fontSize: 14, fontWeight: "600", color: C.text },
  cartPrice: { fontSize: 14, fontWeight: "600", color: C.text },
  billDivider: { height: 1, backgroundColor: C.border, marginVertical: 8 },

  sectionLabel: { fontSize: 11, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  payOpt: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 8 },
  payOptOn: { borderColor: C.primary, backgroundColor: "rgba(255,107,0,0.08)" },
  payLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, alignItems: "center", justifyContent: "center" },
  radioOn: { borderColor: C.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },
  noteInput: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text, fontSize: 13, minHeight: 56, marginTop: 10 },

  placeOrderBtn: { marginHorizontal: 16, backgroundColor: C.green, borderRadius: 50, paddingVertical: 16, alignItems: "center", elevation: 6 },
  placeOrderTxt: { color: C.white, fontWeight: "700", fontSize: 16 },

  input: { backgroundColor: C.card2, borderWidth: 1, borderColor: C.border, padding: 14, borderRadius: 10, marginBottom: 12, color: C.text },
  ghostBtn: { alignItems: 'center', padding: 12 },
  ghostBtnTxt: { color: C.primary, fontWeight: 'bold' },

  profileHero: { alignItems: "center", padding: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: "700", color: C.text },
  profileEmail: { fontSize: 13, color: C.muted, marginTop: 4 },

  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.dark, flexDirection: 'row', borderTopWidth: 1, borderColor: C.card2 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 11, marginTop: 4, fontWeight: '500' },

  floatingBanner: { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: C.primary, padding: 14, borderRadius: 50, alignItems: 'center', elevation: 8 },
  bannerText: { color: C.white, fontWeight: 'bold' },
  
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  
  trackHero: { marginVertical: 16, padding: 20, backgroundColor: "rgba(255,107,0,0.08)", borderWidth: 1, borderColor: C.border, borderRadius: 16, alignItems: "center" },
  trackStatus: { fontSize: 20, fontWeight: "700", color: C.primary, marginTop: 4 },
});
"""

with open('/Users/rajasekharrapaka/.gemini/antigravity/scratch/AnjaniCustomerAppExpo/src/app/index.tsx', 'w') as f:
    f.write(code)
