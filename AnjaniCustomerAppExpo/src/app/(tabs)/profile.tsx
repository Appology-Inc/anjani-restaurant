import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Linking,
  DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../state/AppStore';
import { SavedAddress } from '../../state/AppStore';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
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
function AddressCard({
  addr,
  isSelected,
  onSelect,
  onDelete,
}: {
  addr: SavedAddress;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
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
        <TouchableOpacity onPress={onDelete} style={styles.addrDeleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Previous Order Card Component ───────────────────────────────────────────
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
          <Text style={styles.orderDate}>{order.date}</Text>
        </View>
        <View style={styles.orderBadge}>
          <Ionicons name="checkmark-circle" size={12} color="#22c55e" />
          <Text style={styles.orderBadgeTxt}>Delivered</Text>
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
          <Text style={styles.orderItemPrice}>₹{(oi.item.price * oi.quantity).toFixed(0)}</Text>
        </View>
      ))}

      <View style={styles.orderDivider} />

      <View style={styles.orderFooter}>
        <View style={styles.orderPayRow}>
          <Ionicons name="card-outline" size={13} color={Colors.muted} />
          <Text style={styles.orderPayTxt}>{payLabel[order.paymentMethod] ?? order.paymentMethod}</Text>
        </View>
        <Text style={styles.orderTotal}>₹{order.totalAmount.toFixed(0)}</Text>
      </View>

      <TouchableOpacity
        style={styles.reorderBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
export default function ProfileScreen() {
  const { 
    currentUser, 
    login, 
    logout, 
    addSavedAddress, 
    deleteSavedAddress, 
    selectSavedAddress, 
    previousOrders, 
    activeOrder, 
    clearActiveOrder 
  } = useAppStore();
  const insets = useSafeAreaInsets();

  // Registration state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [registerCoords, setRegisterCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Add address state
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addingAddress, setAddingAddress] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAutoDetect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Could not detect location. Please enter manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!name.trim() || !email.trim() || !regAddress.trim() || !phone.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  const handleSaveAddress = async () => {
    if (!newAddress.trim()) return Alert.alert('Empty', 'Please enter an address.');
    setAddingAddress(true);
    await addSavedAddress(newLabel, newAddress.trim(), undefined, undefined);
    setNewAddress('');
    setNewLabel('Home');
    setShowAddForm(false);
    setAddingAddress(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Unauthenticated: Registration Screen ──────────────────────────────────
  if (!currentUser) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[styles.registerContent, { paddingTop: insets.top + 24 }]}
          keyboardShouldPersistTaps="handled"
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
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Authenticated: Profile Screen ─────────────────────────────────────────
  const initials = (currentUser.name || 'AR')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTxt}>{initials}</Text>
        </View>
        <View style={styles.heroInfo}>
          <Text style={styles.heroName}>{currentUser.name}</Text>
          <Text style={styles.heroEmail}>{currentUser.email}</Text>
          <Text style={styles.heroPhone}>{currentUser.phone}</Text>
        </View>
        <View style={styles.memberBadge}>
          <Ionicons name="star" size={10} color={Colors.primary} />
          <Text style={styles.memberTxt}>Member</Text>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Active live tracking card (Primary Blend) ───────────────── */}
        {activeOrder && (
          <LiveTrackingCard
            order={activeOrder}
            onClear={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              clearActiveOrder();
            }}
          />
        )}

        {/* ── Saved Addresses ─────────────────────────────────────────── */}
        <SectionHeader icon="location" title="Saved Addresses" />

        {(currentUser.addresses?.length ?? 0) === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="location-outline" size={32} color={Colors.border} />
            <Text style={styles.emptyTxt}>No saved addresses yet</Text>
          </View>
        )}

        {currentUser.addresses?.map((addr) => (
          <AddressCard
            key={addr.id}
            addr={addr}
            isSelected={addr.id === currentUser.selectedAddressId}
            onSelect={() => {
              Haptics.selectionAsync();
              selectSavedAddress(addr.id);
            }}
            onDelete={() => {
              Alert.alert('Delete Address', `Remove "${addr.label}" address?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    deleteSavedAddress(addr.id);
                  },
                },
              ]);
            }}
          />
        ))}

        {/* Add address toggle */}
        {!showAddForm ? (
          <TouchableOpacity
            style={styles.addAddrBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddForm(true);
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.addAddrTxt}>Add New Address</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addAddrForm}>
            <Text style={styles.formLabel}>Label</Text>
            <View style={styles.labelPillRow}>
              {(['Home', 'Work', 'Other'] as const).map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.labelPill, newLabel === l && styles.labelPillActive]}
                  onPress={() => setNewLabel(l)}
                >
                  <Ionicons
                    name={LABEL_ICONS[l]}
                    size={13}
                    color={newLabel === l ? Colors.white : Colors.muted}
                  />
                  <Text style={[styles.labelPillTxt, newLabel === l && styles.labelPillTxtActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.formLabel}>Address</Text>
            <TextInput
              style={styles.addrInput}
              placeholder="e.g. Flat 4B, Sunshine Apts, Gachibowli"
              placeholderTextColor={Colors.muted}
              value={newAddress}
              onChangeText={setNewAddress}
              multiline
              numberOfLines={2}
            />
            <View style={styles.addAddrBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowAddForm(false);
                  setNewAddress('');
                  setNewLabel('Home');
                }}
              >
                <Text style={styles.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress} disabled={addingAddress}>
                {addingAddress ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnTxt}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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

        {/* ── Logout ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            Alert.alert('Log Out', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Log Out',
                style: 'destructive',
                onPress: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  logout();
                },
              },
            ]);
          }}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutTxt}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,107,0,0.18)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarTxt: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
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
    gap: 4,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
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
    minHeight: 60,
    textAlignVertical: 'top',
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
    marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  orderBadgeTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: '#22c55e',
  },
  orderDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    gap: 8,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderItemName: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  orderItemQty: {
    fontSize: 13,
    color: Colors.muted,
    width: 28,
    textAlign: 'right',
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    width: 48,
    textAlign: 'right',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  orderPayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orderPayTxt: {
    fontSize: 12,
    color: Colors.muted,
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  reorderTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  logoutTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ef4444',
  },

  // LiveTrackingCard styles extracted to src/components/LiveTrackingCard.tsx
});
