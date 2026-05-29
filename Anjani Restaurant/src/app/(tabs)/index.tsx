import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Platform, SectionList, Modal, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, withDelay, interpolateColor, interpolate, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../state/AppStore';
import { MenuCard } from '../../components/MenuCard';
import { CategoryTabs } from '../../components/CategoryTabs';
import { NightModeScreen } from '../../components/NightModeScreen';
import { MenuCategories, MenuItem } from '../../data/MenuData';

const CategoryEmojis: Record<string, string> = {
  "Veg Soups": "🍲",
  "Non Veg Soups": "🥣",
  "Salads": "🥗",
  "Tandoori Starters": "🍢",
  "Veg Starters": "🥟",
  "Non Veg Starters": "🍗",
  "Veg Main Course": "🥘",
  "Non Veg Main Course": "🍛",
  "Breads": "🫓",
  "Rice": "🍚",
  "Veg Biryani": "🥘",
  "Non Veg Biryani": "🍖",
  "Fried Rice": "🍛",
  "Noodles": "🍝",
  "Snacks": "🍟"
};

const ClosedPremiumBanner = ({ reason }: { reason: string }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowingDot = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 1.3]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.8]),
  }));

  const cardBreathe = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(pulse.value, [0, 1], [0, -3]) }],
    shadowOpacity: interpolate(pulse.value, [0, 1], [0.2, 0.4]),
  }));

  return (
    <Animated.View entering={FadeInDown.duration(600).springify()} style={[styles.modernClosedWrapper, cardBreathe]}>
      <View style={styles.modernClosedGradient}>
        <View style={styles.modernClosedHeader}>
          <View style={styles.modernClosedIconCircle}>
            <Animated.View style={[styles.redGlowDot, glowingDot]} />
            <Ionicons name="moon" size={20} color={Colors.primary} style={{ zIndex: 2 }} />
          </View>
          <View>
            <Text style={styles.modernClosedTitle}>Restaurant Offline</Text>
          </View>
        </View>
        
        <View style={styles.modernClosedDivider} />
        
        <Text style={styles.modernClosedReason}>
          {reason || 'We are not accepting new orders at this time. Please check back later.'}
        </Text>
        
        <View style={styles.modernClosedFooter}>
          <Ionicons name="restaurant-outline" size={16} color={Colors.muted} />
          <Text style={styles.modernClosedFooterText}>You may still browse our menu below</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { currentUser, menuItems, cart, addToCart, removeFromCart, activeOrders, getCartTotal, getCartCount, isRestaurantOpen, restaurantCloseReason, isAutoNightMode, selectSavedAddress } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [activeCat, setActiveCat] = useState("All");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Collapse description on search or filter change
  useEffect(() => {
    setExpandedItemId(null);
  }, [searchQuery, vegOnly, activeCat]);

  // 1. Resolve the "Stuck Active Order" bug
  const liveOrders = (activeOrders || []).filter(o => !['CANCELLED'].includes(o.status));
  const hasActiveTracking = liveOrders.length > 0;

  // 2. Filter logic (Memoized)
  const filteredMenu = useMemo(() => {
    return menuItems.filter(i => {
      if (i.isDeleted) return false;
      if (vegOnly && !i.isVeg) return false;
      if (activeCat !== "All" && i.category !== activeCat) return false;
      if (searchQuery.trim().length > 0) {
        if (!i.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
            !(i.description || '').toLowerCase().includes(searchQuery.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [menuItems, vegOnly, activeCat, searchQuery]);

  // 3. Group into sections for SectionList (Memoized)
  const sections = useMemo(() => {
    return MenuCategories
      .filter(cat => activeCat === "All" || cat === activeCat)
      .map(cat => ({
        title: cat,
        data: filteredMenu.filter(i => i.category === cat)
      }))
      .filter(section => section.data.length > 0);
  }, [filteredMenu, activeCat]);

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
  const sweepAnim = useSharedValue(0);
  const trackArrowAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(0);
  const waterDropAnim = useSharedValue(0);

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

    sweepAnim.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true // Seamlessly reverse to create a breathing molten flow
    );

    trackArrowAnim.value = withRepeat(
      withSequence(
        withTiming(4, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    waterDropAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
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

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweepAnim.value, [0, 1], [0, -400]) }]
  }));

  const trackArrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackArrowAnim.value }]
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [0.8, 1.8]) }],
    opacity: interpolate(pulseAnim.value, [0, 1], [0.8, 0])
  }));

  const pulseBorderStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseAnim.value, [0, 1], [0.99, 1.01]) }],
    shadowColor: '#4ade80',
    shadowOpacity: interpolate(pulseAnim.value, [0, 1], [0.1, 0.4]),
    shadowRadius: interpolate(pulseAnim.value, [0, 1], [4, 15]),
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweepAnim.value, [0, 1], [-400, 400]) }]
  }));

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(pulseAnim.value, [0, 0.5, 1], [0, -3, 0]) }]
  }));

  const pinBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(waterDropAnim.value, [0, 0.15, 0.3, 1], [0, -6, 0, 0]) }]
  }));

  const pinRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(waterDropAnim.value, [0, 0.3, 0.8, 1], [0, 0, 2.5, 2.5]) }],
    opacity: interpolate(waterDropAnim.value, [0, 0.3, 0.5, 0.8, 1], [0, 0, 0.6, 0, 0])
  }));

  const renderHeaderTop = () => {
    const activeAddress = currentUser?.addresses?.find(a => a.id === currentUser?.selectedAddressId) || currentUser?.addresses?.[0];
    const addressLabel = activeAddress?.label || 'Home';
    const addressDetails = activeAddress?.details || currentUser?.address || 'Tap to choose delivery address';

    return (
    <View style={styles.headerTopPart}>
      {/* Location Selector */}
      <TouchableOpacity 
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
        onPress={() => setShowAddressModal(true)}
        activeOpacity={0.7}
      >
        <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={[
            { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.primary, bottom: 4 },
            pinRippleStyle
          ]} />
          <Animated.View style={pinBounceStyle}>
            <Ionicons name="location" size={26} color={Colors.primary} />
          </Animated.View>
        </View>
        <View style={{ marginLeft: 6, flex: 1, paddingRight: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: Colors.white, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 }}>
              {addressLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.primary} style={{ marginLeft: 4 }} />
          </View>
          <Text style={{ color: Colors.muted, fontSize: 13, fontWeight: '500', marginTop: 2 }} numberOfLines={1}>
            {addressDetails}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Greeting */}
      <View style={styles.greetRow}>
        <Text style={styles.greetText}>Good {timeGreeting}, {firstName} </Text>
        <Animated.Text style={[styles.greetText, waveStyle]}>👋</Animated.Text>
      </View>
      <Text style={styles.promptText}>what would you like to order this {timeGreeting.toLowerCase()}?</Text>
      
      {/* Brand */}
      <View style={styles.brandCol}>
        <MaskedView
          style={{ height: 35, width: 175 }}
          maskElement={
            <View style={{ backgroundColor: 'transparent', flex: 1, justifyContent: 'center' }}>
              <Text style={[styles.brandTitle, { color: 'black' }]} numberOfLines={1} adjustsFontSizeToFit>Anjani's Kitchen</Text>
            </View>
          }
        >
          <Animated.View style={[{ width: 800, height: '100%', flexDirection: 'row' }, sweepStyle]}>
            <LinearGradient
              colors={['#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFFFF', '#FFD700', '#FF8C00', '#FF4500', '#FF0000']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </MaskedView>

        <Text style={styles.partitionChar}>|</Text>

        <View style={styles.taglineRow}>
          <Text style={styles.brandTagline} numberOfLines={1} adjustsFontSizeToFit>A TASTE OF PURE HEAVEN </Text>
          <Animated.Text style={[styles.brandTagline, flameStyle]}>🔥</Animated.Text>
        </View>
      </View>
    </View>
    );
  };
  const renderStickyPart = () => (
    <View style={styles.stickyHeaderPart}>
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
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={true}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={{ paddingBottom: getCartCount() > 0 || hasActiveTracking ? 120 : 60 }}
        ListHeaderComponent={
          <>
            {renderHeaderTop()}
            {(!isRestaurantOpen || isAutoNightMode) && (
              <ClosedPremiumBanner reason={!isRestaurantOpen ? (restaurantCloseReason || '') : 'We are closed and will reopen at 11:00 AM'} />
            )}
            {renderStickyPart()}
            {sections.length === 0 && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={Colors.muted} />
                <Text style={styles.emptyTitle}>No matches found</Text>
                <Text style={styles.emptySub}>Try searching for something else</Text>
              </Animated.View>
            )}
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{CategoryEmojis[title] || "🍽️"} {title}</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <MenuCard
            item={item}
            cartItem={cart[item.id]}
            onAdd={addToCart}
            onRemove={removeFromCart}
            index={index}
            isExpanded={expandedItemId === item.id}
            onToggleExpand={() => {
              setExpandedItemId(prevId => prevId === item.id ? null : item.id);
            }}
          />
        )}
      />

      {/* ─── Floating Bottom Bars ─── */}
      <View style={[styles.floatingBannersContainer, { bottom: Math.max(insets.bottom, 16) }]}>
        {hasActiveTracking && (() => {
            if (liveOrders.length > 1) {
              return (
                <Animated.View style={[{ overflow: 'hidden', borderRadius: 16 }, pulseBorderStyle]}>
                  <TouchableOpacity 
                    style={[styles.floatingBar, styles.trackingBar]}
                    onPress={() => router.push('/tracking')}
                    activeOpacity={0.85}
                  >
                    <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: '200%' }, shimmerStyle]}>
                      <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                      />
                    </Animated.View>
                    <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
                      <Animated.View style={[{ position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#4ade80' }, pulseStyle]} />
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 }} />
                    </View>
                    <Animated.Text style={[styles.floatingBarText, bounceStyle]}>🚚</Animated.Text>
                    <Text style={[styles.floatingBarText, { marginLeft: -6 }]}>{liveOrders.length} Active Orders</Text>
                    <Animated.View style={[{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }, trackArrowStyle]}>
                      <Text style={styles.trackBarTapHint}>Track All</Text>
                      <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
                    </Animated.View>
                  </TouchableOpacity>
                </Animated.View>
              );
            }

            const activeOrder = liveOrders[0];
            const statusLabel = 
              activeOrder.status === 'PLACED' ? '🍽️ Order placed! Kitchen notified' :
              activeOrder.status === 'PREPARING' ? '👨‍🍳 Being prepared in kitchen...' :
              activeOrder.status === 'OUT_FOR_DELIVERY' ? '🛵 On the way to you!' :
              '✅ Order delivered!';
            return (
              <Animated.View style={[{ overflow: 'hidden', borderRadius: 16 }, pulseBorderStyle]}>
                <TouchableOpacity 
                  style={[styles.floatingBar, styles.trackingBar]}
                  onPress={() => router.push('/tracking')}
                  activeOpacity={0.85}
                >
                  <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: '200%' }, shimmerStyle]}>
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ flex: 1 }}
                    />
                  </Animated.View>
                  <View style={{ width: 16, height: 16, justifyContent: 'center', alignItems: 'center' }}>
                    <Animated.View style={[{ position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#4ade80' }, pulseStyle]} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4 }} />
                  </View>
                  <Animated.Text style={[styles.floatingBarText, bounceStyle]}>
                    {activeOrder.status === 'PREPARING' ? '👨‍🍳 ' : activeOrder.status === 'OUT_FOR_DELIVERY' ? '🛵 ' : ''}
                  </Animated.Text>
                  <Text style={[styles.floatingBarText, { marginLeft: -6 }]}>{statusLabel.replace(/👨‍🍳 |🛵 |🍽️ |✅ /, '')}</Text>
                  <Animated.View style={[{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }, trackArrowStyle]}>
                    <Text style={styles.trackBarTapHint}>Track</Text>
                    <Ionicons name="arrow-forward" size={14} color="rgba(255,255,255,0.7)" />
                  </Animated.View>
                </TouchableOpacity>
              </Animated.View>
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
              {getCartCount() === 1 ? 'Item' : 'Items'} · ₹{Math.round(getCartTotal())}
              </Text>
            </View>
            <View style={styles.floatingBarRight}>
              <Text style={styles.checkoutLabel}>View Cart</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </View>
          </TouchableOpacity>
        )}
      </View>
      {/* Address Selector Modal */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddressModal(false)}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Delivery Location</Text>
                <TouchableOpacity onPress={() => setShowAddressModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 300, marginBottom: 16 }}>
                {(currentUser?.addresses || []).map((addr) => {
                  const isActive = addr.id === currentUser?.selectedAddressId;
                  const iconName = addr.label === 'Home' ? 'home-outline' : addr.label === 'Work' ? 'briefcase-outline' : 'location-outline';
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.addressItem, isActive && styles.addressItemActive]}
                      onPress={() => {
                        selectSavedAddress(addr.id);
                        setShowAddressModal(false);
                      }}
                    >
                      <View style={[styles.addressIconWrap, isActive && { backgroundColor: Colors.primary }]}>
                        <Ionicons name={iconName} size={18} color={isActive ? Colors.white : Colors.muted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.addressLabelTxt, isActive && { color: Colors.primary }]}>{addr.label}</Text>
                        <Text style={styles.addressDetailsTxt} numberOfLines={2}>{addr.details}</Text>
                      </View>
                      {isActive && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity 
                style={styles.addNewAddressBtn}
                onPress={() => {
                  setShowAddressModal(false);
                  router.push('/address-setup');
                }}
              >
                <Ionicons name="add" size={20} color={Colors.primary} />
                <Text style={styles.addNewAddressTxt}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  modernClosedWrapper: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modernClosedGradient: {
    borderRadius: 20,
    padding: 24,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernClosedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  modernClosedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,107,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
  },
  redGlowDot: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,0,0.25)',
    zIndex: 1,
  },
  modernClosedTitle: {
    color: Colors.text,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  modernClosedReason: {
    color: Colors.text,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 20,
  },
  modernClosedDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 16,
    width: '100%',
  },
  modernClosedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modernClosedFooterText: {
    color: Colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  headerTopPart: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: Colors.surface,
  },
  stickyHeaderPart: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    zIndex: 10,
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
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    flexWrap: 'nowrap',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  partitionChar: {
    color: Colors.muted,
    fontSize: 18,
    fontWeight: '300',
    marginHorizontal: 4,
    marginTop: 6, // Push down to meet baseline
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginTop: 8, // Push down to meet baseline
  },
  brandTagline: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#4ade80',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
  },
  checkoutLabel: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: Colors.white,
  },
  modalCloseBtn: {
    padding: 4,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  addressItemActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,107,0,0.06)',
  },
  addressIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressLabelTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  addressDetailsTxt: {
    fontSize: 13,
    color: Colors.muted,
  },
  addNewAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  addNewAddressTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 6,
  },
});
