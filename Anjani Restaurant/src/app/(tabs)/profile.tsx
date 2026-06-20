/**
 * @file profile.tsx
 * @description User profile screen for Anjani Restaurant.
 * Handles user authentication (registration), managing delivery addresses
 * with GPS auto-detection and OpenStreetMap integration, and displaying previous orders.
 */
import React, { useState, useEffect, useRef } from 'react';
import Animated, { LinearTransition } from 'react-native-reanimated';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Animated as RNAnimated,
  Linking,
  DimensionValue,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../state/AppStore';
import { SavedAddress } from '../../state/AppStore';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LiveTrackingCard from '../../components/LiveTrackingCard';

// Maps imports handled in LiveTrackingCard component

// ─── Label icon helper ───────────────────────────────────────────────────────
const LABEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  Work: 'briefcase-outline',
  Other: 'location-outline',
};

// LiveTrackingCard component extracted to src/components/LiveTrackingCard.tsx

// ─── Address Card Component ──────────────────────────────────────────────────
/**
 * AddressCard Component
 * 
 * Displays a single saved delivery address with options to select, edit, or delete it.
 * 
 * @param {Object} props - The component props.
 * @param {SavedAddress} props.addr - The address object to display.
 * @param {boolean} props.isSelected - Whether this address is currently selected for delivery.
 * @param {Function} props.onSelect - Callback invoked when the address is selected.
 * @param {Function} props.onDelete - Callback invoked when the address is deleted.
 * @param {Function} props.onEdit - Callback invoked when the address is edited.
 * @returns {React.ReactElement} The rendered AddressCard.
 */
function AddressCard({
  addr,
  isSelected,
  onSelect,
  onDelete,
  onEdit,
}: {
  addr: SavedAddress;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={[styles.addrCard, isSelected && styles.addrCardActive]}>
      <View style={[styles.addrIconBox, isSelected && styles.addrIconBoxActive]}>
        <Ionicons
          name={LABEL_ICONS[addr.label] ?? 'location-outline'}
          size={18}
          color={isSelected ? Colors.white : Colors.muted}
        />
      </View>
      <View style={styles.addrTextCol}>
        <Text style={[styles.addrLabel, isSelected && styles.addrLabelActive]}>{addr.label}</Text>
        <Text style={styles.addrDetails} numberOfLines={2}>{addr.details}</Text>
      </View>
      <View style={styles.addrActions}>
        {!isSelected && (
          <TouchableOpacity style={styles.addrSelectBtn} onPress={onSelect}>
            <Text style={styles.addrSelectTxt}>Use</Text>
          </TouchableOpacity>
        )}
        {isSelected && (
          <View style={styles.addrActivePill}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
            <Text style={styles.addrActiveTxt}>Active</Text>
          </View>
        )}
        <TouchableOpacity style={styles.addrEditBtn} onPress={onEdit}>
          <Text style={styles.addrEditTxt}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.addrDeleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Previous Order Card Component ───────────────────────────────────────────
/**
 * OrderCard Component
 * 
 * Displays details of a previously placed order, including items,
 * timestamp, payment method, and status. Provides a reorder button.
 * 
 * @param {Object} props - The component props.
 * @param {any} props.order - The order object.
 * @returns {React.ReactElement} The rendered OrderCard.
 */
function OrderCard({ order }: { order: any }) {
  const { reorder } = useAppStore();
  const payLabel: Record<string, string> = {
    COD: 'Cash',
    GPAY: 'GPay',
    PHONEPE: 'PhonePe',
    QR_GPAY: 'GPay QR',
    QR_PHONEPE: 'PhonePe QR',
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{order.id}</Text>
          <View style={styles.dateTimeRow}>
            <View style={styles.datePill}>
              <Ionicons name="calendar-outline" size={12} color={Colors.muted} />
              <Text style={styles.dateText}>{order.date}</Text>
            </View>
            {order.timestamp ? (
              <View style={styles.timePill}>
                <Ionicons name="time-outline" size={12} color={Colors.muted} />
                <Text style={styles.timeText}>
                  {new Date(order.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={[styles.orderBadge, order.status === 'CANCELLED' && { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
          <Ionicons name={order.status === 'CANCELLED' ? "close-circle" : "checkmark-circle"} size={12} color={order.status === 'CANCELLED' ? "#ef4444" : "#22c55e"} />
          <Text style={[styles.orderBadgeTxt, order.status === 'CANCELLED' && { color: '#ef4444' }]}>
            {order.status === 'CANCELLED' ? 'Cancelled' : 'Delivered'}
          </Text>
        </View>
      </View>

      <View style={styles.orderDivider} />

      {order.items.map((oi: any, idx: number) => (
        <View key={idx} style={styles.orderItemRow}>
          <View style={[styles.vegDot, { backgroundColor: oi.item.isVeg ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.orderItemName} numberOfLines={1}>
            {oi.item.name}
          </Text>
          <Text style={styles.orderItemQty}>×{oi.quantity}</Text>
        </View>
      ))}

      <View style={styles.orderDivider} />

      <View style={styles.orderFooter}>
        <View style={styles.orderPayRow}>
          <Ionicons name="card-outline" size={13} color={Colors.muted} />
          <Text style={styles.orderPayTxt}>{payLabel[order.paymentMethod] ?? order.paymentMethod}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.reorderBtn}
        onPress={() => {
          reorder(order.items);
          Alert.alert('Added to Cart', 'Items from this order have been added to your cart.');
        }}
      >
        <Ionicons name="refresh-outline" size={15} color={Colors.primary} />
        <Text style={styles.reorderTxt}>Reorder</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
/**
 * SectionHeader Component
 * 
 * Reusable header for sections in the profile screen.
 * 
 * @param {Object} props - The component props.
 * @param {keyof typeof Ionicons.glyphMap} props.icon - The Ionicons name.
 * @param {string} props.title - The section title.
 * @returns {React.ReactElement} The rendered SectionHeader.
 */
function SectionHeader({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIconBox}>
        <Ionicons name={icon} size={15} color={Colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
/**
 * ProfileScreen Component
 * 
 * Manages the main user profile view. If the user is unauthenticated, it shows
 * a registration form. Once authenticated, it allows managing addresses,
 * viewing live tracking cards, and seeing order history.
 * 
 * @returns {React.ReactElement} The rendered ProfileScreen.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { 
    currentUser, 
    login, 
    logout, 
    setLoggingOut,
    addSavedAddress, 
    updateAddress,
    deleteSavedAddress, 
    selectSavedAddress, 
    previousOrders, 
    activeOrders, 
    dismissOrder 
  } = useAppStore();
  const insets = useSafeAreaInsets();

  const liveOrders = (activeOrders || []).filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED');

  // Registration state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [registerCoords, setRegisterCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Add/Edit address state
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('Home');
  const [customLabel, setCustomLabel] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const handleInputFocus = () => {
    // Only auto-scroll to the bottom if we are adding a NEW address
    // Otherwise, a hardcoded scroll will push top addresses off the screen!
    if (editingAddressId === null) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 250);
    }
  };
  
  // GPS State for Address Setup
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [addressCoords, setAddressCoords] = useState<{latitude: number, longitude: number}|null>(null);

  // Autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Keyboard State
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  /**
   * Fetches address suggestions from Nominatim (OpenStreetMap) based on user query.
   * 
   * @param {string} query - The search string for the address.
   */
  const fetchAddressSuggestions = (query: string) => {
    setNewAddress(query);
    if (!query.trim()) {
      setAddressSuggestions([]);
      return;
    }
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    setIsSearchingAddress(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=IN`, {
          headers: { 'User-Agent': 'AnjaniApp/1.0' }
        });
        const data = await res.json();
        setAddressSuggestions(data);
      } catch (e) {
        console.warn('Autocomplete fetch error:', e);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 200);
  };

  /**
   * Auto-detects user location for the registration form using expo-location.
   */
  const handleAutoDetect = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Permission denied');
      const loc = await Location.getCurrentPositionAsync({});
      setRegisterCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      if (place) {
        const addr = [place.name, place.street, place.district, place.city].filter(Boolean).join(', ');
        setRegAddress(addr);
      }
    } catch {
      Alert.alert('Error', 'Could not detect location. Please enter manually.');
    } finally {
      setIsLocating(false);
    }
  };

  /**
   * Handles user registration by validating inputs and creating a new user session.
   */
  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !regAddress.trim() || !phone.trim()) {
      return Alert.alert('Missing Info', 'Please fill in all fields.');
    }
    login({
      uid: `USR-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: regAddress.trim(),
      addresses: [{ id: 'ADD-1', label: 'Home', details: regAddress.trim(), ...registerCoords }],
      selectedAddressId: 'ADD-1',
      ...registerCoords,
    });
  };

  /**
   * Auto-detects user location for the add/edit address form using
   * the browser's Geolocation API on web or expo-location on native platforms.
   */
  const handleAutoDetectAddress = async () => {
    setIsLocatingAddress(true);
    try {
      if (Platform.OS === 'web') {
        const coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
          if (!navigator.geolocation) { resolve(null); return; }
          // Try standard Wi-Fi/cellular geolocation first (extremely fast and accurate on desktops)
          navigator.geolocation.getCurrentPosition(
            pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
            () => {
              // If that fails, try with high accuracy just in case
              navigator.geolocation.getCurrentPosition(
                pos2 => resolve({ latitude: pos2.coords.latitude, longitude: pos2.coords.longitude }),
                async () => {
                  // Fallback to IP geolocation if both fail
                  try {
                    const ipRes = await fetch('https://ipapi.co/json/');
                    const ipData = await ipRes.json();
                    if (ipData && ipData.latitude && ipData.longitude) {
                      resolve({ latitude: ipData.latitude, longitude: ipData.longitude });
                      return;
                    }
                  } catch (e) {
                    console.warn('IP fallback failed:', e);
                  }
                  resolve(null);
                },
                { timeout: 5000, enableHighAccuracy: true }
              );
            },
            { timeout: 4000, enableHighAccuracy: false }
          );
        });

        if (coords) {
          setAddressCoords({ latitude: coords.latitude, longitude: coords.longitude });
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data) {
            const addrObj = data.address || {};
            const house = addrObj.house_number || addrObj.building || addrObj.amenity || '';
            const road = addrObj.road || addrObj.street || '';
            const neighborhood = addrObj.neighbourhood || addrObj.suburb || addrObj.city_district || '';
            const city = addrObj.city || addrObj.town || addrObj.village || '';
            const state = addrObj.state || '';
            const postcode = addrObj.postcode || '';
            
            const parts = [house, road, neighborhood, city, state, postcode].filter(Boolean);
            const addr = parts.join(', ');
            setNewAddress(addr || data.display_name);
          } else {
            setNewAddress(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
          }
        } else {
          Alert.alert('Error', 'Could not detect location. Please enter manually.');
        }
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Permission denied');
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        setAddressCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        const [place] = await Location.reverseGeocodeAsync(loc.coords);
        if (place) {
          const addr = [place.name, place.street, place.district, place.city].filter(Boolean).join(', ');
          setNewAddress(addr);
        }
      }
    } catch {
      Alert.alert('Error', 'Could not detect location. Please enter manually.');
    } finally {
      setIsLocatingAddress(false);
    }
  };

  /**
   * Saves a new or edited address to the user's profile.
   */
  const handleSaveAddress = () => {
    if (!newAddress.trim()) return Alert.alert('Empty', 'Please enter an address.');
    
    const finalLabel = newLabel === 'Other' ? (customLabel.trim() || 'Other') : newLabel;
    const addrText = newAddress.trim();
    const lat = addressCoords?.latitude;
    const lon = addressCoords?.longitude;
    const editId = editingAddressId;
    
    setNewAddress('');
    setNewLabel('Home');
    setCustomLabel('');
    setAddressCoords(null);
    setEditingAddressId(null);
    setShowAddForm(false);
    
    if (editId) {
      updateAddress(addrText, lat, lon).then(() => {
        deleteSavedAddress(editId).then(() => {
          addSavedAddress(finalLabel, addrText, lat, lon);
        });
      });
    } else {
      addSavedAddress(finalLabel, addrText, lat, lon);
    }
  };

  // ── Unauthenticated: Registration Screen ──────────────────────────────────
  if (!currentUser) {
    return (
      <KeyboardAwareScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={[styles.registerContent, { paddingTop: Platform.OS === 'web' ? 'calc(24px + env(safe-area-inset-top))' : insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={80}
      >
          {/* Brand header */}
          <View style={styles.registerHero}>
            <View style={styles.registerIconWrap}>
              <Ionicons name="person-circle-outline" size={52} color={Colors.primary} />
            </View>
            <Text style={styles.registerTitle}>Create Account</Text>
            <Text style={styles.registerSub}>Save your details for faster ordering</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <InputRow icon="person-outline" placeholder="Full Name" value={name} onChangeText={setName} />
            <InputRow icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <InputRow icon="call-outline" placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <InputRow icon="home-outline" placeholder="Delivery Address" value={regAddress} onChangeText={setRegAddress} />

            <TouchableOpacity style={styles.gpsBtn} onPress={handleAutoDetect} disabled={isLocating}>
              {isLocating ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="navigate-circle-outline" size={18} color={Colors.primary} />
              )}
              <Text style={styles.gpsBtnTxt}>{isLocating ? 'Detecting…' : 'Auto-detect Location'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister}>
              <Text style={styles.primaryBtnTxt}>Get Started</Text>
            </TouchableOpacity>
          </View>
      </KeyboardAwareScrollView>
    );
  }

  // ── Authenticated: Profile Screen ─────────────────────────────────────────

  const renderAddressForm = () => (
    <View style={styles.addAddrForm}>
      <Text style={styles.formLabel}>Label</Text>
      <View style={styles.labelPillRow}>
        {(['Home', 'Work', 'Other'] as const).map((l) => (
          <TouchableOpacity
            key={l}
            style={[styles.labelPill, newLabel === l && styles.labelPillActive]}
            onPress={() => {
              setNewLabel(l);
            }}
          >
            <Ionicons name={LABEL_ICONS[l] ?? 'location-outline'} size={14} color={newLabel === l ? Colors.white : Colors.muted} />
            <Text style={[styles.labelPillTxt, newLabel === l && styles.labelPillTxtActive]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {newLabel === 'Other' && (
        <View style={{ marginTop: 8 }}>
          <TextInput
            style={[styles.addrInput, { minHeight: 44, paddingVertical: 12 }]}
            placeholder="e.g. My Apartment, Friend's house"
            placeholderTextColor={Colors.muted}
            value={customLabel}
            onChangeText={setCustomLabel}
            onFocus={handleInputFocus}
          />
        </View>
      )}

      <Text style={[styles.formLabel, { marginTop: 12 }]}>Details</Text>
      <TextInput
        style={styles.addrInput}
        placeholder="Flat / House No / Floor / Building..."
        placeholderTextColor={Colors.muted}
        value={newAddress}
        onChangeText={(text) => {
          setNewAddress(text);
          fetchAddressSuggestions(text);
        }}
        onFocus={handleInputFocus}
        multiline
        numberOfLines={4}
      />

      {/* Suggestions dropdown */}
      {isSearchingAddress && (
        <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
      )}
      {addressSuggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {addressSuggestions.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.suggestionRow}
              onPress={() => {
                setNewAddress(item.display_name);
                setAddressCoords({ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) });
                setAddressSuggestions([]);
              }}
            >
              <Ionicons name="location-outline" size={14} color={Colors.muted} />
              <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity 
        style={[styles.gpsBtn, addressCoords && styles.gpsBtnSuccess]} 
        onPress={handleAutoDetectAddress} 
        disabled={isLocatingAddress}
      >
        {isLocatingAddress ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name={addressCoords ? "checkmark-circle" : "navigate-circle-outline"} size={18} color={addressCoords ? Colors.green : Colors.primary} />
        )}
        <Text style={[styles.gpsBtnTxt, addressCoords && { color: Colors.green }]}>
          {isLocatingAddress ? 'Detecting...' : addressCoords ? 'Exact Location Locked' : 'Auto-detect GPS Location'}
        </Text>
      </TouchableOpacity>

      <View style={styles.addAddrBtnRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => {
            setShowAddForm(false);
            setEditingAddressId(null);
            setAddressSuggestions([]);
          }}
        >
          <Text style={styles.cancelBtnTxt}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
          <Text style={styles.saveBtnTxt}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAwareScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 'calc(32px + env(safe-area-inset-bottom))' : insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid={true}
      extraScrollHeight={120}
    >
      {/* Hero */}
      {!isKeyboardVisible && (
        <View style={[styles.hero, { paddingTop: Platform.OS === 'web' ? 'calc(16px + env(safe-area-inset-top))' : insets.top + 16 }]}>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{currentUser.name}</Text>
            <Text style={styles.heroEmail}>{currentUser.email}</Text>
            <Text style={styles.heroPhone}>{currentUser.phone}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={styles.memberBadge}>
              <Ionicons name="star" size={12} color={Colors.primary} />
              <Text style={styles.memberTxt}>Member</Text>
            </View>
            <TouchableOpacity
              style={styles.headerLogoutBtn}
              onPress={() => {
                Alert.alert('Log Out', 'Are you sure you want to log out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: () => {
                      setLoggingOut(true);
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={12} color="#ef4444" />
              <Text style={styles.headerLogoutTxt}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scrollable content */}
      <View style={styles.scrollArea}>
        {/* ── Active live tracking card (Primary Blend) ───────────────── */}
        {liveOrders.map(order => (
          <View key={order.id} style={{ marginBottom: 12 }}>
            <LiveTrackingCard
              order={order}
              onClear={() => {
                dismissOrder(order.id);
              }}
            />
          </View>
        ))}

        {/* ── Saved Addresses ─────────────────────────────────────────── */}
        <SectionHeader icon="location" title="Saved Addresses" />

        {(currentUser.addresses?.length ?? 0) === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="location-outline" size={32} color={Colors.border} />
            <Text style={styles.emptyTxt}>No saved addresses yet</Text>
          </View>
        )}

        {currentUser.addresses?.map((addr) => (
          <Animated.View key={addr.id} layout={LinearTransition.duration(200)}>
            {showAddForm && editingAddressId === addr.id ? (
              <View style={{ marginBottom: 6 }}>
                {renderAddressForm()}
              </View>
            ) : (
              <AddressCard
                addr={addr}
                isSelected={addr.id === currentUser.selectedAddressId}
                onSelect={() => {
                  selectSavedAddress(addr.id);
                }}
                onEdit={() => {
                  if (editingAddressId === addr.id && showAddForm) {
                    setShowAddForm(false);
                    setEditingAddressId(null);
                  } else {
                    setEditingAddressId(addr.id);
                    const isKnown = ['Home', 'Work'].includes(addr.label);
                    setNewLabel(isKnown ? addr.label : 'Other');
                    setCustomLabel(isKnown ? '' : addr.label);
                    setNewAddress(addr.details);
                    setAddressCoords(addr.latitude && addr.longitude ? { latitude: addr.latitude, longitude: addr.longitude } : null);
                    setShowAddForm(true);
                  }
                }}
                onDelete={() => {
                  Alert.alert('Delete Address', `Remove "${addr.label}" address?`, [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => {
                        deleteSavedAddress(addr.id);
                      },
                    },
                  ]);
                }}
              />
            )}
          </Animated.View>
        ))}

        {/* Add/Edit address toggle */}
        {!showAddForm || editingAddressId !== null ? (
          <TouchableOpacity
            style={styles.addAddrBtn}
            onPress={() => {
              setEditingAddressId(null);
              setNewLabel('Home');
              setCustomLabel('');
              setNewAddress('');
              setAddressCoords(null);
              setShowAddForm(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addAddrTxt}>Add New Address</Text>
          </TouchableOpacity>
        ) : (
          <Animated.View layout={LinearTransition.duration(200)}>
            {renderAddressForm()}
          </Animated.View>
        )}

        {/* ── Previous Orders ──────────────────────────────────────────── */}
        <SectionHeader icon="receipt-outline" title="Previous Orders" />

        {previousOrders.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="bag-outline" size={32} color={Colors.border} />
            <Text style={styles.emptyTxt}>No orders yet — let's change that!</Text>
          </View>
        ) : (
          previousOrders.map((order) => <OrderCard key={order.id} order={order} />)
        )}

        {/* Logout button was moved to header */}
      </View>
    </KeyboardAwareScrollView>
  );
}

// ─── Shared input row ─────────────────────────────────────────────────────────
function InputRow({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  return (
    <View style={styles.inputRow}>
      <Ionicons name={icon} size={18} color={Colors.muted} style={styles.inputIcon} />
      <TextInput
        style={styles.inputField}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ── Registration ──
  registerContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  registerHero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  registerIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  registerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
  },
  registerSub: {
    fontSize: 14,
    color: Colors.muted,
    marginTop: 6,
  },
  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card2 ?? Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,107,0,0.08)',
  },
  gpsBtnTxt: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnTxt: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },

  // ── Hero ──
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.dark ?? Colors.card,
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  heroEmail: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 2,
  },
  heroPhone: {
    fontSize: 13,
    color: Colors.muted,
    marginTop: 1,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  memberTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Info pills ──
  infoPillRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.dark ?? Colors.card,
  },
  infoPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionsBox: {
    marginTop: 8,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.card2 ?? Colors.border,
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },

  infoPillTxt: {
    fontSize: 11,
    color: Colors.muted,
    flex: 1,
  },

  // ── Scroll ──
  scrollArea: {
    flex: 1,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 10,
    gap: 8,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },

  // ── Address cards ──
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addrCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,107,0,0.06)',
  },
  addrIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card2 ?? Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addrIconBoxActive: {
    backgroundColor: Colors.primary,
  },
  addrTextCol: {
    flex: 1,
  },
  addrLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    marginBottom: 2,
  },
  addrLabelActive: {
    color: Colors.primary,
  },
  addrDetails: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  addrActions: {
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  addrSelectBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addrSelectTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  addrActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addrActiveTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
  },
  addrDeleteBtn: {
    padding: 4,
  },
  addrEditBtn: {
    backgroundColor: 'rgba(255,107,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addrEditTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Add address ──
  addAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    justifyContent: 'center',
  },
  addAddrTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  addAddrForm: {
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  labelPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card2 ?? Colors.surface,
  },
  labelPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  labelPillTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
  },
  labelPillTxtActive: {
    color: Colors.white,
  },
  addrInput: {
    backgroundColor: Colors.card2 ?? Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  gpsBtnSuccess: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  addAddrBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.card2 ?? Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.muted,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveBtnTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },

  // ── Empty states ──
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTxt: {
    fontSize: 13,
    color: Colors.muted,
    fontStyle: 'italic',
  },

  // ── Previous Order cards ──
  orderCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  orderId: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 0.5,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  orderBadgeTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22c55e',
  },
  orderDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  orderItemQty: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    width: 32,
    textAlign: 'right',
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    width: 54,
    textAlign: 'right',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  orderPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderPayTxt: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.white,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  reorderTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },

  // ── Logout ──
  headerLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  headerLogoutTxt: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },

  // LiveTrackingCard styles extracted to src/components/LiveTrackingCard.tsx
});
