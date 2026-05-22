import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Platform, SectionList } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, interpolateColor, interpolate, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../state/AppStore';
import { MenuCard } from '../../components/MenuCard';
import { CategoryTabs } from '../../components/CategoryTabs';
import { MenuCategories, MenuItem } from '../../data/MenuData';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { currentUser, menuItems, cart, addToCart, removeFromCart, activeOrder, getCartTotal, getCartCount } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCat, setActiveCat] = useState("All");

  // 1. Resolve the "Stuck Active Order" bug
  const hasActiveTracking = activeOrder && !['DELIVERED', 'CANCELLED'].includes(activeOrder.status);

  // 2. Filter logic
  const filteredMenu = menuItems.filter(i => {
    if (i.isDeleted) return false;
    if (vegOnly && !i.isVeg) return false;
    if (activeCat !== "All" && i.category !== activeCat) return false;
    if (searchQuery.trim().length > 0) {
      return i.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  // 3. Group into sections for SectionList (Zomato/Swiggy style)
  const sections = MenuCategories
    .filter(cat => activeCat === "All" || cat === activeCat)
    .map(cat => ({
      title: cat,
      data: filteredMenu.filter(i => i.category === cat)
    }))
    .filter(section => section.data.length > 0);

  // Greeting logic
  const hour = new Date().getHours();
  let timeGreeting = "Morning";
  if (hour >= 12 && hour < 17) timeGreeting = "Afternoon";
  else if (hour >= 17) timeGreeting = "Evening";
  const capitalizedGreeting = timeGreeting.charAt(0).toUpperCase() + timeGreeting.slice(1);
  const firstName = currentUser?.name?.split(" ")[0]?.toUpperCase() || "THERE";

  // Animations
  const fireAnim = useSharedValue(0);
  const waveAnim = useSharedValue(0);
  const flameAnim = useSharedValue(1);
  const breatheAnim = useSharedValue(0);

  useEffect(() => {
    // Faster, more erratic animation for a "live fire" feel
    fireAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.2, { duration: 250 }),
        withTiming(0.8, { duration: 200 }),
        withTiming(0, { duration: 350 })
      ),
      -1,
      true
    );
    
    waveAnim.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 150 }),
        withTiming(-10, { duration: 150 }),
        withTiming(15, { duration: 150 }),
        withTiming(0, { duration: 150 }),
        withDelay(2000, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    flameAnim.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 250 }),
        withTiming(1.0, { duration: 250 }),
        withTiming(1.15, { duration: 200 }),
        withTiming(0.95, { duration: 200 })
      ),
      -1,
      false
    );

    breatheAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const fireStyle = useAnimatedStyle(() => ({
    color: '#FFFFFF', // White font per user request
    textShadowColor: interpolateColor(fireAnim.value, [0, 0.5, 1], ['#FF0000', '#FF5A00', '#FFB300']),
    textShadowRadius: interpolate(fireAnim.value, [0, 0.5, 1], [6, 14, 8]),
    textShadowOffset: { 
      width: 0, 
      height: interpolate(fireAnim.value, [0, 1], [-2, -8]) // Shadows extending upwards like flames
    },
    transform: [
      { scale: interpolate(breatheAnim.value, [0, 1], [0.98, 1.02]) }
    ]
  }));

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${waveAnim.value}deg` }]
  }));

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameAnim.value },
      { rotateZ: `${interpolate(flameAnim.value, [0.95, 1.3], [-5, 5])}deg` }
    ]
  }));


  const renderHeader = () => (
    <View style={styles.header}>
      {/* Greeting */}
      <View style={styles.greetRow}>
        <Text style={styles.greetText}>Good {timeGreeting}, {firstName} </Text>
        <Animated.Text style={[styles.greetText, waveStyle]}>👋</Animated.Text>
      </View>
      <Text style={styles.promptText}>what would you like to order this {timeGreeting.toLowerCase()}?</Text>
      
      {/* Brand */}
      <View style={styles.brandCol}>
        <Animated.Text style={[styles.brandTitle, fireStyle]} numberOfLines={1} adjustsFontSizeToFit>Anjani's Kitchen</Animated.Text>
        <View style={styles.taglineRow}>
          <Text style={styles.brandTagline} numberOfLines={1} adjustsFontSizeToFit>A TASTE OF PURE HEAVEN </Text>
          <Animated.Text style={[styles.brandTagline, flameStyle]}>🔥</Animated.Text>
        </View>
      </View>

      {/* Sticky-like Search + Veg Toggle Row */}
      <View style={styles.actionsRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.muted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search menu..."
            placeholderTextColor={Colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.vegToggle, vegOnly && styles.vegToggleActive]}
          onPress={() => setVegOnly(!vegOnly)}
          activeOpacity={0.7}
        >
          <View style={[styles.vegDot, vegOnly && styles.vegDotActive]} />
          <Text style={[styles.vegLabel, vegOnly && styles.vegLabelActive]}>VEG</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Category Tabs ─── */}
      <View style={{ paddingTop: 16 }}>
        <CategoryTabs activeCat={activeCat} setActiveCat={setActiveCat} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ height: Math.max(insets.top, 12), backgroundColor: Colors.surface }} />
      
      <SectionList
        sections={sections}
        keyExtractor={(item: MenuItem) => item.id}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickySectionHeadersEnabled={true}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={<View style={{ height: getCartCount() > 0 || hasActiveTracking ? 120 : 60 }} />}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Colors.muted} />
            <Text style={styles.emptyTitle}>No matches found</Text>
            <Text style={styles.emptySub}>Try searching for something else</Text>
          </Animated.View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <MenuCard
            item={item}
            cartItem={cart[item.id]}
            onAdd={addToCart}
            onRemove={removeFromCart}
            index={index}
          />
        )}
      />

      {/* ─── Floating Bottom Bars ─── */}
      <View style={[styles.floatingBannersContainer, { bottom: Math.max(insets.bottom, 16) }]}>
        {hasActiveTracking && (() => {
            const statusLabel = 
              activeOrder.status === 'PLACED' ? '🍽️ Order placed! Kitchen notified' :
              activeOrder.status === 'PREPARING' ? '👨‍🍳 Being prepared in kitchen...' :
              activeOrder.status === 'OUT_FOR_DELIVERY' ? '🛵 On the way to you!' :
              '✅ Order delivered!';
            return (
              <TouchableOpacity 
                style={[styles.floatingBar, styles.trackingBar]}
                onPress={() => router.push('/tracking')}
                activeOpacity={0.85}
              >
                <Ionicons name="radio-button-on" size={14} color="#4ade80" />
                <Text style={styles.floatingBarText}>{statusLabel}</Text>
                <Text style={styles.trackBarTapHint}>Track →</Text>
              </TouchableOpacity>
            );
          })()}

        {getCartCount() > 0 && (
          <TouchableOpacity 
            style={[styles.floatingBar, styles.checkoutBar]}
            onPress={() => router.push('/cart')}
            activeOpacity={0.9}
          >
            <View style={styles.floatingBarLeft}>
              <Text style={styles.cartBadge}>{getCartCount()}</Text>
              <Text style={styles.floatingBarText}>
                {getCartCount() === 1 ? 'Item' : 'Items'} · ₹{getCartTotal()}
              </Text>
            </View>
            <View style={styles.floatingBarRight}>
              <Text style={styles.checkoutLabel}>View Cart</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
  },
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetText: {
    fontSize: 18,
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 13,
    color: Colors.muted,
    fontWeight: '500',
    marginBottom: 20,
    marginTop: 2,
  },
  brandCol: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    gap: 4,
    flexWrap: 'nowrap',
    width: '100%',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 1,
    paddingBottom: 2,
  },
  brandTagline: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '800',
    letterSpacing: 1,
    flexShrink: 1,
  },
  
  // Actions Row (Search & Filter)
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  vegToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  vegToggleActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: Colors.green,
  },
  vegDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.muted,
  },
  vegDotActive: {
    backgroundColor: Colors.green,
  },
  vegLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.muted,
    letterSpacing: 0.5,
  },
  vegLabelActive: {
    color: Colors.green,
  },

  // Section Headers
  sectionHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.card2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 0.2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 6,
  },
  emptySub: {
    color: Colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },

  // Floating Bars
  floatingBannersContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    gap: 12,
  },
  floatingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  trackingBar: {
    backgroundColor: Colors.dark,
  },
  checkoutBar: {
    backgroundColor: Colors.primary,
    justifyContent: 'space-between',
  },
  floatingBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  floatingBarText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  cartBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: Colors.white,
    fontSize: 13,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  trackBarTapHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 'auto',
  },
  checkoutLabel: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
