import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, StatusBar, TextInput, Platform, FlatList, KeyboardAvoidingView, Modal, SafeAreaView, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, ActiveOrder } from '../../state/AppStore';
import { Colors } from '../../constants/Colors';
import { NightModeScreen } from '../../components/NightModeScreen';
import { OrderDeliveryCard } from '../../components/OrderDeliveryCard';
import { MemoizedChatBubble } from '../../components/MemoizedChatBubble';
import { useRouter } from 'expo-router';
import AnimatedReanimated, { LinearTransition, FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, Easing } from 'react-native-reanimated';
import * as Location from 'expo-location';

const normalize = (size: number) => {
  if (Platform.OS === 'web') return size;
  const { width } = require('react-native').Dimensions.get('window');
  const scale = Math.min((width || 375) / 375, 1.2);
  return Math.round(size * scale);
};

const RiderPremiumOfflineBanner = ({ reason }: { reason: string }) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.7]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.98, 1.02]) }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.1]) }],
  }));

  return (
    <AnimatedReanimated.View entering={FadeInDown.duration(700).springify()} style={ss.premiumClosedWrapper}>
      {/* Background Pulse */}
      <AnimatedReanimated.View style={[ss.premiumClosedGlow, animatedGlowStyle]} />
      
      <View style={ss.premiumClosedInner}>
        {/* Background decorative circles */}
        <View style={ss.decorativeCircle1} />
        <View style={ss.decorativeCircle2} />

        <AnimatedReanimated.View style={[ss.premiumIconContainer, animatedIconStyle]}>
          <View style={ss.premiumIconCircle}>
            <Ionicons name="moon" size={32} color="#FFF" />
          </View>
        </AnimatedReanimated.View>

        <Text style={ss.premiumClosedTitle}>Restaurant Offline</Text>
        <Text style={ss.premiumClosedReason}>
          {reason || 'No new orders will be assigned right now.'}
        </Text>

        <View style={ss.premiumDividerContainer}>
          <View style={ss.premiumDivider} />
        </View>

        <View style={ss.premiumInfoBox}>
          <Ionicons name="bicycle" size={18} color="#94A3B8" />
          <Text style={ss.premiumInfoText}>Please complete active deliveries</Text>
        </View>
      </View>
    </AnimatedReanimated.View>
  );
};

export default function RiderDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const numColumns = isLargeScreen ? Math.max(2, Math.floor(width / 380)) : 1;
  const cardWidthPercent = `${100 / numColumns}%`;

  const [openChatOrderId, setOpenChatOrderId] = useState<string | null>(null);
  const [fullScreenChatOrderId, setFullScreenChatOrderId] = useState<string | null>(null);
  const [openMapOrderId, setOpenMapOrderId] = useState<string | null>(null);
  const [chatTexts, setChatTexts] = useState<{ [orderId: string]: string }>({});
  const flatListRefs = useRef<{ [orderId: string]: FlatList | null }>({});

  const currentUser = useAppStore(state => state.currentUser);
  const logout = useAppStore(state => state.logout);
  const systemOrders = useAppStore(state => state.systemOrders);
  const updateOrderStatus = useAppStore(state => state.updateOrderStatus);
  const acceptDeliveryTask = useAppStore(state => state.acceptDeliveryTask);
  const updateRiderSimulatedPosition = useAppStore(state => state.updateRiderSimulatedPosition);
  const chatMessages = useAppStore(state => state.chatMessages);
  const sendChatMessage = useAppStore(state => state.sendChatMessage);
  const isRestaurantOpen = useAppStore(state => state.isRestaurantOpen);
  const restaurantCloseReason = useAppStore(state => state.restaurantCloseReason);
  const isAutoNightMode = useAppStore(state => state.isAutoNightMode);

  const restaurantCoords = { lat: 17.0790, lng: 82.1374 };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'brand-name-animation-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&display=swap');
          .brand-name {
            font-family: 'Outfit', sans-serif !important;
            background: linear-gradient(120deg, #FF6B00 0%, #FFD180 25%, #FFF 50%, #FFD180 75%, #FF6B00 100%) !important;
            background-size: 200% auto !important;
            -webkit-background-clip: text !important;
            background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            color: transparent !important;
            animation: shinyBrandText 4s linear infinite !important;
            display: inline-block !important;
            font-style: italic !important;
            padding-right: 6px !important;
          }
          @keyframes shinyBrandText {
            0% { background-position: 0% center; }
            100% { background-position: -200% center; }
          }
          .rider-card-enhanced {
            background: rgba(26, 29, 38, 0.65) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05) !important;
            border-radius: 24px !important;
            padding: 20px 16px !important;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            width: calc(100% - 32px) !important;
            margin-left: 16px !important;
            margin-right: 16px !important;
            max-width: 480px !important;
            align-self: center !important;
          }
          .rider-card-enhanced:hover {
            transform: translateY(-2px) !important;
            border-color: rgba(255, 107, 0, 0.3) !important;
            box-shadow: 0 20px 50px rgba(255, 107, 0, 0.05), 0 16px 40px rgba(0, 0, 0, 0.5) !important;
          }
          .rider-card-header {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
            padding-bottom: 12px !important;
            margin-bottom: 12px !important;
          }
          .rider-pill {
            border-radius: 12px !important;
            padding: 4px 12px !important;
            font-weight: 700 !important;
          }
          .rider-action-btn {
            border-radius: 14px !important;
            padding: 12px 18px !important;
            font-weight: 800 !important;
            transition: all 0.2s ease !important;
          }
          .rider-action-btn:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(255, 107, 0, 0.25) !important;
          }
          .rider-action-btn-green:hover {
            box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25) !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  const sections = React.useMemo(() => {
    // Orders ready to be picked up and dispatched
    const availableJobs = systemOrders.filter(o =>
      o.status === 'READY'
    );
    // Orders rider has already accepted and is actively delivering
    const myActiveJobs = systemOrders.filter(o =>
      o.status === 'OUT_FOR_DELIVERY'
    );
    return [
      { title: 'My Active Deliveries', data: myActiveJobs, type: 'active' as const },
      { title: 'Ready for Pickup', data: availableJobs, type: 'available' as const },
    ];
  }, [systemOrders, currentUser?.uid]);

  const simulationTimers = useRef<{ [orderId: string]: any }>({});

  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      Object.values(simulationTimers.current).forEach(t => {
        if (t && t.remove) t.remove();
        else if (t) clearInterval(t);
      });
    };
  }, []);

  // Fix 7: Clear all GPS simulation timers when user logs out
  useEffect(() => {
    if (!currentUser) {
      Object.entries(simulationTimers.current).forEach(([id, t]) => {
        if (t && t.remove) t.remove();
        else if (t) clearInterval(t);
      });
      simulationTimers.current = {};
    }
  }, [currentUser]);


  const runSimulatedGPS = (order: ActiveOrder, silent = false) => {
    const startLat = order.restaurantLat || 17.0790;
    const startLng = order.restaurantLng || 82.1374;
    const destLat = order.userLat || 17.0850;
    const destLng = order.userLng || 82.1400;

    let step = 0;
    const totalSteps = 10; // 10 steps to reach destination (reduces Firestore writes by half)
    
    // Initial position
    updateRiderSimulatedPosition(order.id, startLat, startLng);

    const timer = setInterval(() => {
      step++;
      if (step > totalSteps) {
        clearInterval(timer);
        delete simulationTimers.current[order.id];
        Alert.alert('Arrived!', 'Simulated delivery agent has arrived at the customer location.');
        return;
      }
      const pct = step / totalSteps;
      const currentLat = startLat + (destLat - startLat) * pct;
      const currentLng = startLng + (destLng - startLng) * pct;
      updateRiderSimulatedPosition(order.id, currentLat, currentLng);
    }, 10000); // Update every 10 seconds to avoid exceeding daily Firebase write limits

    simulationTimers.current[order.id] = timer;
    if (!silent) {
      Alert.alert('Simulation Started', 'Simulating rider movement on map.');
    }
  };

  const startSimulation = (order: ActiveOrder) => {
    if (simulationTimers.current[order.id]) {
      Alert.alert('GPS Active', 'You are already tracking this destination.');
      return;
    }

    const startTrackingAction = async () => {
      try {
        const isSecure = Platform.OS !== 'web' || window.isSecureContext;
        if (!isSecure) {
          runSimulatedGPS(order, true);
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          runSimulatedGPS(order, true);
          return;
        }

        const watcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
          (loc) => {
            updateRiderSimulatedPosition(order.id, loc.coords.latitude, loc.coords.longitude);
          }
        );
        simulationTimers.current[order.id] = watcher;
      } catch (e: any) {
        runSimulatedGPS(order, true);
      }
    };

    Alert.alert(
      'Live GPS Tracking',
      'Start sharing your real location for this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: startTrackingAction }
      ]
    );
  };

  const handleUpdateOrderStatus = (orderId: string, status: any) => {
    if (status === 'DELIVERED') {
      if (simulationTimers.current[orderId]) {
        const t = simulationTimers.current[orderId];
        if (t && t.remove) t.remove();
        else if (t) clearInterval(t);
        delete simulationTimers.current[orderId];
      }
    }
    updateOrderStatus(orderId, status);
  };

  const handleSendMessage = (orderId: string) => {
    const text = (chatTexts[orderId] || '').trim();
    if (!text) return;
    sendChatMessage(orderId, 'rider', 'Delivery Partner', text);
    setChatTexts(prev => ({ ...prev, [orderId]: '' }));
    setTimeout(() => flatListRefs.current[orderId]?.scrollToEnd({ animated: true }), 100);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const renderChatPanel = (order: ActiveOrder) => {
    const isOpen = openChatOrderId === order.id;
    const isFullScreen = fullScreenChatOrderId === order.id;
    const msgs = chatMessages[order.id] || [];
    return (
      <View>
        <TouchableOpacity
          style={[ss.chatToggleBtn, isOpen && { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: Colors.primary }]}
          onPress={() => {
            setOpenChatOrderId(isOpen ? null : order.id);
          }}
        >
          <Ionicons name={isOpen ? 'chatbubbles' : 'chatbubble-ellipses-outline'} size={15} color={isOpen ? Colors.primary : Colors.muted} />
          <Text style={[ss.chatToggleTxt, isOpen && { color: Colors.primary }]}>Chat with Customer</Text>
          {msgs.length > 0 && <View style={ss.chatBadge}><Text style={ss.chatBadgeTxt}>{msgs.length}</Text></View>}
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.muted} />
        </TouchableOpacity>

        {isOpen && (
          <AnimatedReanimated.View style={ss.chatBox} layout={LinearTransition.duration(200)}>
            <TouchableOpacity 
              style={ss.chatMsgsWrap} 
              activeOpacity={0.9} 
              onPress={() => setFullScreenChatOrderId(order.id)}
            >
              {msgs.length === 0 ? (
                <View style={ss.chatEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.muted} />
                  <Text style={ss.chatEmptyTxt}>No messages yet</Text>
                </View>
              ) : (
                <View pointerEvents="none">
                  <FlatList
                    ref={ref => { flatListRefs.current[order.id] = ref; }}
                    data={msgs}
                    keyExtractor={(m, index) => m?.id || index.toString()}
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 250 }}
                    contentContainerStyle={{ padding: 8 }}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={5}
                    removeClippedSubviews={Platform.OS === 'android'}
                    renderItem={({ item }) => (
                      <MemoizedChatBubble item={item} formatTime={formatTime} />
                    )}
                  />
                </View>
              )}
            </TouchableOpacity>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={ss.chatInputRow}>
                <TextInput
                  style={ss.chatInput}
                  value={chatTexts[order.id] || ''}
                  onChangeText={t => setChatTexts(prev => ({ ...prev, [order.id]: t }))}
                  placeholder="Reply to customer..."
                  placeholderTextColor={Colors.muted}
                  returnKeyType="send"
                  onSubmitEditing={() => handleSendMessage(order.id)}
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[ss.chatSendBtn, !(chatTexts[order.id]?.trim()) && ss.chatSendBtnOff]}
                  onPress={() => handleSendMessage(order.id)}
                  disabled={!(chatTexts[order.id]?.trim())}
                >
                  <Ionicons name="send" size={15} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </AnimatedReanimated.View>
        )}

        <Modal 
          visible={isFullScreen} 
          animationType="slide" 
          presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
          transparent={Platform.OS !== 'ios'}
          statusBarTranslucent={true}
          onRequestClose={() => setFullScreenChatOrderId(null)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0} style={{ flex: 1, backgroundColor: Colors.dark, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="chatbubbles" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Chat with Customer</Text>
              </View>
              <TouchableOpacity onPress={() => setFullScreenChatOrderId(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>
            
            <View style={[ss.chatMsgsWrap, { flex: 1, backgroundColor: Colors.dark }]}>
              {msgs.length === 0 ? (
                <View style={ss.chatEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.muted} />
                  <Text style={[ss.chatEmptyTxt, { marginTop: 16 }]}>No messages yet</Text>
                </View>
              ) : (
                <FlatList
                  ref={ref => { flatListRefs.current[order.id] = ref; }}
                  data={msgs}
                  keyExtractor={(m, index) => m?.id || index.toString()}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                  initialNumToRender={10}
                  maxToRenderPerBatch={10}
                  windowSize={5}
                  removeClippedSubviews={Platform.OS === 'android'}
                  renderItem={({ item }) => (
                    <MemoizedChatBubble item={item} formatTime={formatTime} />
                  )}
                />
              )}
            </View>
            <View style={[ss.chatInputRow, { borderTopWidth: 1, borderTopColor: Colors.border, padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: Colors.surface }]}>
                <TextInput
                  style={[ss.chatInput, { height: 48 }]}
                  value={chatTexts[order.id] || ''}
                  onChangeText={t => setChatTexts(prev => ({ ...prev, [order.id]: t }))}
                  placeholder="Reply to customer..."
                  placeholderTextColor={Colors.muted}
                  returnKeyType="send"
                  onSubmitEditing={() => handleSendMessage(order.id)}
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[ss.chatSendBtn, { width: 48, height: 48, borderRadius: 24 }, !(chatTexts[order.id]?.trim()) && ss.chatSendBtnOff]}
                  onPress={() => handleSendMessage(order.id)}
                  disabled={!(chatTexts[order.id]?.trim())}
                >
                  <Ionicons name="send" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  };



  return (
    <View style={[ss.container, { paddingTop: Platform.OS === 'web' ? ('env(safe-area-inset-top)' as any) : insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {(!isRestaurantOpen || isAutoNightMode) && (
        <RiderPremiumOfflineBanner reason={!isRestaurantOpen ? (restaurantCloseReason || '') : 'Restaurant opens at 11:00 AM'} />
      )}

      {/* Header (Hidden on Desktop) */}
      {!isLargeScreen && (
        <View style={ss.header}>
          <TouchableOpacity 
            style={[ss.headerBrand, { flex: 1 }]} 
            activeOpacity={0.7}
            role="button"
            onPress={() => {
              if (Platform.OS === 'web' && typeof (window as any).triggerInstallPrompt === 'function') {
                (window as any).triggerInstallPrompt();
              }
            }}
          >
            <View style={ss.headerIcon}><Ionicons name="bicycle" size={18} color={Colors.primary} /></View>
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              {Platform.OS === 'web' ? (
                React.createElement(
                  'span',
                  { className: 'appology-glow-wrapper', style: { fontStyle: 'italic', whiteSpace: 'nowrap', alignSelf: 'flex-start' } },
                  React.createElement('span', { className: 'appology-gold-text', style: { fontSize: '18px', fontWeight: '900', paddingRight: '4px', letterSpacing: '0.5px' } }, 'Anjani'),
                  React.createElement('span', { className: 'appology-gold-text', style: { fontSize: '18px', fontWeight: '900', paddingRight: '6px', letterSpacing: '0.5px' } }, 'Restaurant')
                )
              ) : (
                <Text 
                  style={[ss.headerTitle, { fontSize: 16 }]} 
                  numberOfLines={1} 
                  adjustsFontSizeToFit
                >
                  Anjani Restaurant
                </Text>
              )}
              <Text style={ss.headerSub} numberOfLines={1} adjustsFontSizeToFit>Delivery Partner Dashboard</Text>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={ss.headerLive}>
              <View style={ss.liveDot} />
              <Text style={ss.liveText}>Live</Text>
            </View>
            <TouchableOpacity 
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center', justifyContent: 'center' }} 
              onPress={() => {
                const performLogout = async () => {
                  await logout();
                  router.replace('/auth');
                };

                Alert.alert('Logout', `Are you sure you want to log out from ${currentUser?.name || 'your'} session?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: performLogout }
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={16} color={Colors.red} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        style={ss.listContainer}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[ss.statsRow, isLargeScreen && { paddingHorizontal: 24, paddingVertical: 24, gap: 20 }]}>
          <View style={[ss.statCard, isLargeScreen && { padding: 20 }]}>
            <Text style={ss.statValue}>{sections[0].data.length}</Text>
            <Text style={ss.statLabel}>Active Deliveries</Text>
          </View>
          <View style={[ss.statCard, isLargeScreen && { padding: 20 }]}>
            <Text style={[ss.statValue, { color: Colors.primary }]}>{sections[1].data.length}</Text>
            <Text style={ss.statLabel}>Pending Jobs</Text>
          </View>
          <View style={[ss.statCard, isLargeScreen && { padding: 20 }]}>
            <Text style={[ss.statValue, { color: Colors.green, fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>Online</Text>
            <Text style={ss.statLabel}>Status</Text>
          </View>
        </View>

        {sections.map((section, sIndex) => (
          <View key={section.title} style={{ width: '100%' }}>
            <Text style={[ss.sectionTitle, { paddingHorizontal: isLargeScreen ? 24 : 16, marginTop: isLargeScreen ? 8 : 16, fontSize: isLargeScreen ? 16 : 13 }]}>{section.title}</Text>
            
            {section.data.length === 0 ? (
              <Text style={{ color: Colors.muted, paddingHorizontal: isLargeScreen ? 24 : 16, marginBottom: 20, fontStyle: 'italic' }}>
                No orders in this category.
              </Text>
            ) : (
              <View style={[isLargeScreen && { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }]}>
                {section.data.map((order) => (
                  <View key={order?.id || Math.random().toString()} style={[isLargeScreen && { width: cardWidthPercent as any, paddingHorizontal: 8, marginBottom: 8 }]}>
                    <OrderDeliveryCard
                      order={order}
                      sectionType={section.type}
                      openMapOrderId={openMapOrderId}
                      setOpenMapOrderId={setOpenMapOrderId}
                      startSimulation={startSimulation}
                      updateOrderStatus={handleUpdateOrderStatus}
                      renderChatPanel={renderChatPanel}
                      acceptDeliveryTask={acceptDeliveryTask}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {sections[0].data.length === 0 && sections[1].data.length === 0 && (
          <View style={[ss.emptyCard, { marginHorizontal: 16 }]}>
            <Ionicons name="checkmark-done-outline" size={28} color={Colors.muted} />
            <Text style={ss.emptyText}>All caught up!</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    width: '100%',
  },
  listContainer: { flex: 1 },
  premiumClosedWrapper: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 24,
    position: 'relative',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  premiumClosedGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.25)',
    transform: [{ scale: 1.02 }],
    zIndex: -1,
  },
  premiumClosedInner: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1A1010',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(239,68,68,0.04)',
  },
  premiumIconContainer: {
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  premiumIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumClosedTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  premiumClosedReason: {
    color: '#FCA5A5',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  premiumDividerContainer: {
    width: '100%',
    height: 1,
    marginVertical: 18,
    alignItems: 'center',
  },
  premiumDivider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(239,68,68,0.3)',
  },
  premiumInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  premiumInfoText: {
    color: '#FECACA',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.dark, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,107,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '900', fontFamily: 'Outfit', color: '#F5ECD7', fontStyle: 'italic' },
  headerSub: { fontSize: 11, fontFamily: 'Inter', color: '#9A8A72', fontWeight: '600', letterSpacing: 0.5, marginTop: 1 },
  headerLive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  liveText: { fontSize: 11, color: '#22C55E', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontSize: 22, fontWeight: '800', color: '#F5ECD7' },
  statLabel: { fontSize: 10, color: '#9A8A72', marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9A8A72', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  emptyCard: { alignItems: 'center', padding: 32, backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  emptyText: { fontSize: 13, color: '#9A8A72' },
  chatToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#2A1F12', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', marginBottom: 10, marginTop: 4 },
  chatToggleTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#9A8A72' },
  chatBadge: { backgroundColor: '#FF6B00', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  chatBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  chatBox: { backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, marginBottom: 10, overflow: 'hidden' },
  chatMsgsWrap: { minHeight: 80 },
  chatEmpty: { alignItems: 'center', padding: 20, gap: 6 },
  chatEmptyTxt: { fontSize: 12, color: '#9A8A72' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,107,0,0.18)' },
  chatInput: { flex: 1, backgroundColor: Colors.card, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#F5ECD7', borderWidth: 1, borderColor: Colors.border },
  chatSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center' },
  chatSendBtnOff: { backgroundColor: '#2A1F12' },
  gpsModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gpsModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gpsModalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  gpsModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  gpsModalSub: {
    color: Colors.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  gpsModalBody: {
    gap: 12,
    marginBottom: 20,
  },
  gpsOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  gpsOptionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsOptionDetails: {
    flex: 1,
    gap: 2,
  },
  gpsOptionTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  gpsOptionDesc: {
    color: Colors.muted,
    fontSize: 11,
    lineHeight: 14,
  },
  gpsCancelBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gpsCancelTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
