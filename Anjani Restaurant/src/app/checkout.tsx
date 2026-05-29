import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const PAYMENT_METHODS = [
  { id: 'ONLINE', label: 'Pay Online (Razorpay)', icon: 'card-outline' as const, sub: 'Secure UPI, Cards, NetBanking' },
  { id: 'COD', label: 'Cash on Delivery', icon: 'cash-outline' as const, sub: 'Pay when your food arrives' },
];

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ instructions?: string }>();
  const { cart, getCartTotal, getCartCount, placeOrder, currentUser, isRestaurantOpen, restaurantCloseReason, isAutoNightMode } = useAppStore();
  const isEffectivelyClosed = !isRestaurantOpen || isAutoNightMode;

  const [paymentMethod, setPaymentMethod] = useState<'COD'|'ONLINE'|null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = getCartTotal();
  const sgst = Math.round(subtotal * 0.025);
  const cgst = Math.round(subtotal * 0.025);
  const tax = sgst + cgst;
  const deliveryFee = 30;
  const grandTotal = subtotal + tax + deliveryFee;
  const cookingInstructions = params.instructions || '';

  const handlePlaceOrder = async () => {
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

    let finalLat: number | undefined = currentUser.latitude;
    let finalLng: number | undefined = currentUser.longitude;

    if (!finalLat || !finalLng) {
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

    if (paymentMethod === 'ONLINE') {
      try {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('../config/firebase');
        const RazorpayCheckout = (await import('react-native-razorpay')).default;

        const createOrder = httpsCallable(functions, 'createRazorpayOrder');
        const { data: orderData } = await createOrder({ 
          amountInRupees: grandTotal,
          receiptId: `rcpt_${currentUser.uid.substring(0, 5)}_${Date.now()}`
        }) as any;

        if (!orderData || !orderData.orderId) {
          throw new Error('Failed to create Razorpay order on backend.');
        }

        const options = {
          description: 'Anjani Restaurant Order',
          image: 'https://i.imgur.com/3g7nmJC.png',
          currency: orderData.currency,
          key: 'rzp_test_YourTestKeyIdHere', // Must match backend!
          amount: orderData.amount,
          name: 'Anjani Restaurant',
          order_id: orderData.orderId,
          prefill: {
            email: currentUser.email || 'customer@example.com',
            contact: currentUser.phone || '9999999999',
            name: currentUser.name || 'Customer'
          },
          theme: { color: Colors.primary }
        };

        RazorpayCheckout.open(options).then(async (data: any) => {
          // Success callback
          const verifyPayment = httpsCallable(functions, 'verifyRazorpayPayment');
          try {
            const { data: verifyData } = await verifyPayment({
              razorpay_order_id: data.razorpay_order_id,
              razorpay_payment_id: data.razorpay_payment_id,
              razorpay_signature: data.razorpay_signature
            }) as any;

            if (verifyData.success) {
              placeOrder(
                currentUser.address, currentUser.phone, 'ONLINE', data.razorpay_payment_id, cookingInstructions, finalLat, finalLng
              );
              setIsProcessing(false);
              router.replace('/tracking');
            } else {
              throw new Error('Verification failed.');
            }
          } catch (verifyError: any) {
            console.error('Signature Verification Error:', verifyError);
            Alert.alert('Payment Failed', 'We could not verify your payment securely.');
            setIsProcessing(false);
          }
        }).catch((error: any) => {
          // Error callback (user cancelled or payment failed)
          console.warn('Razorpay Error/Cancelled:', error);
          Alert.alert('Payment Cancelled', 'Your transaction was not completed.');
          setIsProcessing(false);
        });

      } catch (err: any) {
        console.error('Error initiating Razorpay:', err);
        Alert.alert('Payment Error', err.message || 'Could not initiate secure payment.');
        setIsProcessing(false);
      }
      return;
    }

    // COD Flow
    setTimeout(() => {
      setIsProcessing(false);
      placeOrder(
        currentUser.address, currentUser.phone, 'COD', undefined, cookingInstructions, finalLat, finalLng
      );
      router.replace('/tracking');
    }, 1500);
  };


  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 36 }} />
      </View>

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

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <TouchableOpacity 
          style={[styles.confirmBtn, (isProcessing || isEffectivelyClosed) && styles.confirmBtnProcessing, (!paymentMethod || isEffectivelyClosed) && styles.confirmBtnDisabled]} 
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.dark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.card2,
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
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
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
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  totalMiniValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },

  // ─── Payment Cards ───
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
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
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  payLabelSelected: {
    color: Colors.primary,
  },
  paySub: {
    fontSize: 11,
    color: Colors.muted,
  },

  // ─── Footer ───
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    backgroundColor: Colors.dark,
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
