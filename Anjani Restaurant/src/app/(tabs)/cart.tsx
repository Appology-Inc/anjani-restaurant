import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../state/AppStore';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

export default function CartScreen() {
  const { cart, addToCart, removeFromCart, getCartTotal, getCartCount } = useAppStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [instructions, setInstructions] = useState('');

  const cartItems = Object.values(cart);
  const isEmpty = cartItems.length === 0;
  const subtotal = getCartTotal();
  const sgst = Math.round(subtotal * 0.025);
  const cgst = Math.round(subtotal * 0.025);
  const tax = sgst + cgst;
  const deliveryFee = isEmpty ? 0 : 30;
  const grandTotal = subtotal + tax + deliveryFee;

  const handleAdd = (item: any) => {
    addToCart(item);
  };

  const handleRemove = (item: any) => {
    removeFromCart(item);
  };

  const handleProceedToPayment = () => {
    router.push({ pathname: '/checkout', params: { instructions: instructions.trim() } });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <Text style={styles.headerTitle}>Your Order</Text>
        {!isEmpty && (
          <Text style={styles.headerCount}>{getCartCount()} {getCartCount() === 1 ? 'item' : 'items'}</Text>
        )}
      </View>

      {isEmpty ? (
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="cart-outline" size={56} color={Colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add some delicious dishes from the menu</Text>
          <TouchableOpacity 
            style={styles.browseBtn} 
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.8}
          >
            <Ionicons name="restaurant-outline" size={18} color={Colors.primary} />
            <Text style={styles.browseBtnText}>Browse Menu</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View style={{ flex: 1 }}>
          <KeyboardAwareScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            extraScrollHeight={20}
          >
            {/* ─── Cart Items ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>ITEMS IN YOUR CART</Text>
              {cartItems.map((c, index) => (
                <Animated.View 
                  key={c.item.id} 
                  entering={FadeInDown.delay(index * 60).duration(300)}
                  exiting={FadeOut.duration(200)}
                  layout={LinearTransition.duration(200)}
                  style={styles.itemCard}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.vegBadge, { borderColor: c.item.isVeg ? Colors.green : Colors.red }]}>
                      <View style={[styles.vegDot, { backgroundColor: c.item.isVeg ? Colors.green : Colors.red }]} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} numberOfLines={1}>{c.item.name}</Text>
                      <Text style={styles.itemPrice}>₹{c.item.price}</Text>
                    </View>
                  </View>

                  <View style={styles.itemRight}>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity 
                        style={styles.qtyBtn} 
                        onPress={() => handleRemove(c.item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={c.quantity === 1 ? "trash-outline" : "remove"} size={14} color={c.quantity === 1 ? Colors.red : Colors.text} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{c.quantity}</Text>
                      <TouchableOpacity 
                        style={[styles.qtyBtn, styles.qtyBtnAdd]} 
                        onPress={() => handleAdd(c.item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={14} color={Colors.white} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.itemTotal}>₹{c.item.price * c.quantity}</Text>
                  </View>
                </Animated.View>
              ))}
            </View>

            {/* ─── Cooking Instructions ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>COOKING INSTRUCTIONS</Text>
              <View style={styles.instructionsBox}>
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.muted} style={{ marginTop: 2 }} />
                <TextInput
                  style={styles.instructionsInput}
                  placeholder="e.g. Less spicy, no onion, extra cheese..."
                  placeholderTextColor={Colors.muted}
                  value={instructions}
                  onChangeText={setInstructions}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
              </View>
              {instructions.length > 0 && (
                <Text style={styles.charCount}>{instructions.length}/200</Text>
              )}
            </View>

            {/* ─── Bill Summary ─── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>BILL DETAILS</Text>
              <View style={styles.billCard}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billValue}>₹{subtotal}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Delivery Fee</Text>
                  <Text style={styles.billValue}>₹{deliveryFee}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { fontSize: 9 }]}>SGST (2.5%)</Text>
                  <Text style={[styles.billValue, { fontSize: 9 }]}>₹{sgst}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { fontSize: 9 }]}>CGST (2.5%)</Text>
                  <Text style={[styles.billValue, { fontSize: 9 }]}>₹{cgst}</Text>
                </View>
                <View style={styles.billDivider} />
                <View style={styles.billRow}>
                  <Text style={styles.grandLabel}>To Pay</Text>
                  <Text style={styles.grandValue}>₹{grandTotal}</Text>
                </View>
              </View>
            </View>

            <View style={{ height: 120 }} />
          </KeyboardAwareScrollView>

          {/* ─── Floating Checkout Footer ─── */}
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <View style={styles.footerInfo}>
              <Text style={styles.footerTotal}>₹{grandTotal}</Text>
              <Text style={styles.footerSub}>incl. taxes</Text>
            </View>
            <TouchableOpacity 
              style={styles.paymentBtn} 
              onPress={handleProceedToPayment}
              activeOpacity={0.85}
            >
              <Text style={styles.paymentBtnText}>Proceed to Payment</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.dark,
    borderBottomWidth: 1,
    borderBottomColor: Colors.card2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.3,
  },
  headerCount: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '500',
    marginTop: 2,
  },

  // ─── Empty State ───
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  browseBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  // ─── Scroll Area ───
  scrollArea: {
    flex: 1,
  },

  // ─── Sections ───
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

  // ─── Item Cards ───
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  vegBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 11,
    color: Colors.muted,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: 4,
  },
  qtyBtn: {
    width: 30,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnAdd: {
    backgroundColor: Colors.primary,
  },
  qtyText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 10,
    minWidth: 28,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ─── Cooking Instructions ───
  instructionsBox: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'flex-start',
    gap: 10,
  },
  instructionsInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 50,
    maxHeight: 100,
    paddingTop: 0,
    paddingBottom: 0,
  },
  charCount: {
    fontSize: 10,
    color: Colors.muted,
    textAlign: 'right',
    marginTop: 4,
  },

  // ─── Bill Card ───
  billCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 13,
    color: Colors.muted,
  },
  billValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  billDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  grandLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.primary,
  },

  // ─── Footer ───
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark,
    paddingHorizontal: 16,
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
  footerInfo: {
    marginRight: 16,
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  footerSub: {
    fontSize: 10,
    color: Colors.muted,
    fontWeight: '500',
  },
  paymentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: { elevation: 6 },
    }),
  },
  paymentBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
