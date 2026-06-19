/**
 * @file checkout.tsx
 * @description Checkout and payment processing screen.
 * Handles order confirmation, delivery address selection,
 * and integration with Razorpay for secure online payments.
 */
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const PAYMENT_METHODS = [
  { id: 'ONLINE', label: 'Pay Online (Razorpay)', icon: 'card-outline' as const, sub: 'Secure UPI, Cards, NetBanking' },
  { id: 'COD', label: 'Cash on Delivery', icon: 'cash-outline' as const, sub: 'Pay when your food arrives' },
];

/**
 * Dynamically loads the Razorpay checkout script into the DOM for web environments.
 * Returns a promise that resolves to true if successful, false otherwise.
 * 
 * @returns {Promise<boolean>} Resolves to true when the script is loaded.
 */
const loadRazorpayScript = () => {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * CheckoutScreen Component
 * 
 * Manages the final checkout process. Calculates taxes and totals,
 * ensures the cart is not empty, and handles the order placement
 * flow for both COD and Online (Razorpay) payment methods.
 * 
 * @returns {React.ReactElement} The rendered checkout screen.
 */
export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ instructions?: string }>();
  const { cart, getCartTotal, getCartCount, placeOrder, createPendingOrder, confirmOrderPayment, cancelOrderPayment, currentUser, isRestaurantOpen, restaurantCloseReason, isAutoNightMode, paymentServerUrl } = useAppStore();
  const isEffectivelyClosed = !isRestaurantOpen || isAutoNightMode;

  const [paymentMethod, setPaymentMethod] = useState<'COD'|'ONLINE'|null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isOrderPlaced = useRef(false);

  const subtotal = getCartTotal();
  const cartItemCount = getCartCount();
  
  // Use useEffect to catch empty carts (e.g. if user presses back button after successful order)
  useEffect(() => {
    if (cartItemCount === 0 && !isProcessing && !isOrderPlaced.current) {
      Alert.alert('Empty Cart', 'Your cart is empty. Please add items from the menu.');
      router.replace('/(tabs)');
    }
  }, [cartItemCount, isProcessing]);

  const sgst = Math.round(subtotal * 0.025);
  const cgst = Math.round(subtotal * 0.025);
  const tax = sgst + cgst;
  const deliveryFee = subtotal === 0 ? 0 : 30;
  const grandTotal = subtotal + tax + deliveryFee;
  const cookingInstructions = params.instructions || '';

  /**
   * Processes the order placement based on the selected payment method.
   * Handles pre-order validation, order creation in the database,
   * payment gateway initialization, and post-payment confirmation or cancellation.
   */
  const handlePlaceOrder = async () => {
    if (subtotal === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart first.');
      router.replace('/(tabs)');
      return;
    }
    if (isEffectivelyClosed) {
      return Alert.alert('Restaurant Closed', !isRestaurantOpen ? (restaurantCloseReason || 'We are temporarily not accepting orders.') : 'We are closed and will reopen at 11:00 AM');
    }
    if (!paymentMethod) {
      return Alert.alert('Select Payment', 'Please choose a payment method to continue.');
    }
    if (!currentUser) {
      return Alert.alert('Sign In Required', 'Please sign in to place an order.');
    }
    if (!currentUser.address || currentUser.address.trim() === '') {
      return Alert.alert('Address Required', 'Please set a delivery address in your profile before ordering.');
    }

    setIsProcessing(true);

    const activeAddress = currentUser?.addresses?.find(a => a.id === currentUser.selectedAddressId);
    let finalLat: number | undefined = activeAddress?.latitude || currentUser.latitude;
    let finalLng: number | undefined = activeAddress?.longitude || currentUser.longitude;

    if (!finalLat || !finalLng) {
      if (Platform.OS === 'web') {
        try {
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
                    } catch (err) {
                      console.warn('Checkout IP fallback failed:', err);
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
            finalLat = coords.latitude;
            finalLng = coords.longitude;
          }
        } catch (e) {
          console.warn('Web checkout GPS fetch failed:', e);
        }
      } else {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            finalLat = loc.coords.latitude;
            finalLng = loc.coords.longitude;
          }
        } catch (e) {
          console.warn('GPS fetch failed, using address-area fallback:', e);
        }
      }
    }

    if (paymentMethod === 'ONLINE') {
      try {
        // 1. Create order locally and in Firestore as PAYMENT_PENDING
        const orderId = await createPendingOrder(
          currentUser.address,
          currentUser.phone,
          cookingInstructions,
          finalLat,
          finalLng
        );

        if (!orderId) {
          throw new Error('Failed to create order on database.');
        }

        // We are bypassing the Cloud Function here because the user's Firebase project is on the Free tier and cannot deploy functions.
        // For a production app without a backend, we use Razorpay's orderless integration (insecure but works for demo/free).

        if (Platform.OS === 'web') {
          const loaded = await loadRazorpayScript();
          if (!loaded) {
            throw new Error('Failed to load secure Razorpay gateway components.');
          }

          const options = {
            key: 'rzp_test_T3DIONNmFaZFaU',
            amount: grandTotal * 100, // paise
            currency: 'INR',
            name: 'Anjani Restaurant',
            description: 'Delicious Food Delivery Checkout',
            image: 'https://i.imgur.com/3g7nmJC.png',
            handler: async function (response: any) {
              try {
                setIsProcessing(true);
                // INSECURE: Trusting the frontend payment ID without backend signature verification
                if (response.razorpay_payment_id) {
                  isOrderPlaced.current = true;
                  await confirmOrderPayment(orderId, response.razorpay_payment_id);
                  router.replace('/tracking');
                } else {
                  throw new Error('Payment failed or cancelled.');
                }
              } catch (verifyError: any) {
                console.error('Web Payment Failure:', verifyError);
                Alert.alert('Payment Failed', 'We could not process your payment.');
                await cancelOrderPayment(orderId);
              } finally {
                setIsProcessing(false);
              }
            },
            prefill: {
              name: currentUser.name || 'Customer',
              email: currentUser.email || 'customer@example.com',
              contact: currentUser.phone || '9999999999'
            },
            theme: { color: Colors.primary },
            modal: {
              ondismiss: async function () {
                console.log('Web Razorpay Modal Cancelled');
                Alert.alert('Payment Cancelled', 'Your transaction was not completed.');
                await cancelOrderPayment(orderId);
                setIsProcessing(false);
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();

        } else {
          // Native Flow
          const RazorpayCheckout = require('react-native-razorpay').default;

          const options = {
            key: 'rzp_test_T3DIONNmFaZFaU',
            amount: grandTotal * 100,
            currency: 'INR',
            name: 'Anjani Restaurant',
            description: 'Delicious Food Delivery Checkout',
            image: 'https://i.imgur.com/3g7nmJC.png',
            prefill: {
              name: currentUser.name || 'Customer',
              email: currentUser.email || 'customer@example.com',
              contact: currentUser.phone || '9999999999'
            },
            theme: { color: Colors.primary }
          };

          RazorpayCheckout.open(options).then(async (data: any) => {
            try {
              setIsProcessing(true);
              if (data.razorpay_payment_id) {
                isOrderPlaced.current = true;
                await confirmOrderPayment(orderId, data.razorpay_payment_id);
                router.replace('/tracking');
              } else {
                throw new Error('Payment failed or cancelled.');
              }
            } catch (err) {
              await cancelOrderPayment(orderId);
              Alert.alert('Error', 'Payment verification failed locally.');
            } finally {
              setIsProcessing(false);
            }
          }).catch(async (error: any) => {
            console.log('Razorpay Window Closed or Failed:', error);
            await cancelOrderPayment(orderId);
            setIsProcessing(false);
          });
        }

      } catch (err: any) {
        console.error('Error initiating Razorpay checkout:', err);
        Alert.alert('Payment Error', err.message || 'Could not initiate secure payment.');
        setIsProcessing(false);
      }
      return;
    }

    // COD Flow
    setTimeout(() => {
      isOrderPlaced.current = true;
      setIsProcessing(false);
      placeOrder(
        currentUser.address, currentUser.phone, 'COD', undefined, cookingInstructions, finalLat, finalLng
      );
      router.replace('/tracking');
    }, 1500);
  };


  return (
    <View style={styles.container}>
      {/* Header stretching full width, content centered */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 'calc(20px + env(safe-area-inset-top))' : Math.max(insets.top, 12) + 8 }]}>
        <View style={{ width: '100%', maxWidth: 800, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: 800 }}>
          <ScrollView 
            style={styles.scrollArea} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
        {/* ─── Delivery Address ─── */}
        <Animated.View entering={FadeInDown.delay(100).duration(350)} style={styles.section}>
          <Text style={styles.sectionLabel}>DELIVER TO</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressIconWrap}>
              <Ionicons name="location" size={18} color={Colors.primary} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{currentUser?.name || 'Home'}</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {currentUser?.address || 'No address set'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Order Summary ─── */}
        <Animated.View entering={FadeInDown.delay(200).duration(350)} style={styles.section}>
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <View style={styles.summaryCard}>
            {Object.values(cart).map((c) => (
              <View key={c.item.id} style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <View style={[styles.miniVeg, { backgroundColor: c.item.isVeg ? Colors.green : Colors.red }]} />
                  <Text style={styles.summaryItemName} numberOfLines={1}>{c.quantity}× {c.item.name}</Text>
                </View>
                <Text style={styles.summaryItemPrice}>₹{c.item.price * c.quantity}</Text>
              </View>
            ))}
            
            {cookingInstructions.length > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.instructionRow}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={Colors.muted} />
                  <Text style={styles.instructionText} numberOfLines={2}>"{cookingInstructions}"</Text>
                </View>
              </>
            )}

            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: 13, color: Colors.muted }}>Delivery Fee</Text>
              <Text style={{ fontSize: 13, color: Colors.text, fontWeight: '500' }}>₹{deliveryFee}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: 9, color: Colors.muted }}>SGST (2.5%)</Text>
              <Text style={{ fontSize: 9, color: Colors.text, fontWeight: '500' }}>₹{sgst}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ fontSize: 9, color: Colors.muted }}>CGST (2.5%)</Text>
              <Text style={{ fontSize: 9, color: Colors.text, fontWeight: '500' }}>₹{cgst}</Text>
            </View>

            <View style={styles.summaryDivider} />
            <View style={styles.totalMiniRow}>
              <Text style={styles.totalMiniLabel}>Total</Text>
              <Text style={styles.totalMiniValue}>₹{grandTotal}</Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Payment Methods ─── */}
        <Animated.View entering={FadeInDown.delay(300).duration(350)} style={styles.section}>
          <Text style={styles.sectionLabel}>PAYMENT METHOD</Text>
          {PAYMENT_METHODS.map((method, index) => {
            const isSelected = paymentMethod === method.id;
            return (
              <TouchableOpacity 
                key={method.id}
                style={[styles.payCard, isSelected && styles.payCardSelected]}
                onPress={() => {
                  setPaymentMethod(method.id as 'COD'|'ONLINE');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
                <View style={styles.payIconWrap}>
                  <Ionicons name={method.icon} size={18} color={isSelected ? Colors.primary : Colors.muted} />
                </View>
                <View style={styles.payInfo}>
                  <Text style={[styles.payLabel, isSelected && styles.payLabelSelected]}>{method.label}</Text>
                  <Text style={styles.paySub}>{method.sub}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        <View style={{ height: 120 }} />
        </ScrollView>
      </View>

      {/* Footer stretching full width, content centered */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 'calc(20px + env(safe-area-inset-bottom))' : Math.max(insets.bottom, 12) + 8 }]}>
        <View style={{ width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 16 }}>
          <TouchableOpacity 
            style={[styles.confirmBtn, { width: '100%' }, (isProcessing || isEffectivelyClosed) && styles.confirmBtnProcessing, (!paymentMethod || isEffectivelyClosed) && styles.confirmBtnDisabled]} 
            onPress={handlePlaceOrder}
            disabled={isProcessing || isEffectivelyClosed}
            activeOpacity={0.85}
          >
            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={styles.confirmBtnText}>Processing...</Text>
              </View>
            ) : (
              <View style={styles.confirmBtnContent}>
                <Text style={styles.confirmBtnText}>
                  {isEffectivelyClosed ? 'Restaurant is Closed' : paymentMethod ? `Pay ₹${grandTotal}` : 'Select Payment Method'}
                </Text>
                {paymentMethod && !isEffectivelyClosed && <Ionicons name="shield-checkmark" size={18} color={Colors.white} />}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ─── Header ───
  header: {
    backgroundColor: Colors.dark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.card2,
    paddingBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },

  // ─── Scroll ───
  scrollArea: {
    flex: 1,
  },

  // ─── Section ───
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  // ─── Address Card ───
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 16,
  },

  // ─── Summary Card ───
  summaryCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    gap: 8,
  },
  miniVeg: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryItemName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '700',
  },
  summaryDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: Colors.muted,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  totalMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalMiniLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  totalMiniValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
  },

  // ─── Payment Cards ───
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 3 }
    })
  },
  payCardSelected: {
    backgroundColor: 'rgba(255,107,0,0.06)',
    borderColor: Colors.primary,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  payIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payInfo: {
    flex: 1,
  },
  payLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 1,
  },
  payLabelSelected: {
    color: Colors.primary,
  },
  paySub: {
    fontSize: 12,
    color: Colors.muted,
  },

  // ─── Footer ───
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.dark,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.card2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 12 },
    }),
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  confirmBtnDisabled: {
    backgroundColor: Colors.card2,
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmBtnProcessing: {
    opacity: 0.85,
  },
  confirmBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
