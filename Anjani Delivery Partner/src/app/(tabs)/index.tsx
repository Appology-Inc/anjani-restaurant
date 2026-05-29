import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, StatusBar, TextInput, Platform, FlatList, SectionList, KeyboardAvoidingView, Modal, SafeAreaView } from 'react-native';
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

const scale = Math.min(require('react-native').Dimensions.get('window').width / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);

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

  const startSimulation = (order: ActiveOrder) => {
    if (simulationTimers.current[order.id]) {
      Alert.alert('GPS Active', 'You are already tracking this destination.');
      return;
    }
    Alert.alert('Live GPS Tracking', 'Start sharing your real location for this delivery?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable location services to use Real GPS.');
          return;
        }
        
        try {
          const watcher = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
            (loc) => {
              updateRiderSimulatedPosition(order.id, loc.coords.latitude, loc.coords.longitude);
            }
          );
          simulationTimers.current[order.id] = watcher;
        } catch (e: any) {
          Alert.alert('GPS Error', e.message);
        }
      }}
    ]);
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
                    keyExtractor={m => m.id}
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
                  keyExtractor={m => m.id}
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
    <View style={[ss.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {(!isRestaurantOpen || isAutoNightMode) && (
        <RiderPremiumOfflineBanner reason={!isRestaurantOpen ? (restaurantCloseReason || '') : 'Restaurant opens at 11:00 AM'} />
      )}

      {/* Header */}
      <View style={ss.header}>
        <View style={ss.headerBrand}>
          <View style={ss.headerIcon}><Ionicons name="bicycle" size={18} color={Colors.primary} /></View>
          <View>
            <Text style={ss.headerTitle}>Anjani Restaurant</Text>
            <Text style={ss.headerSub}>Delivery Partner Dashboard</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={ss.headerLive}>
            <View style={ss.liveDot} />
            <Text style={ss.liveText}>Live</Text>
          </View>
          <TouchableOpacity 
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center', justifyContent: 'center' }} 
            onPress={() => {
              Alert.alert('Logout', `Are you sure you want to log out from ${currentUser?.name || 'your'} session?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: async () => {
                  await logout();
                  router.replace('/auth');
                }}
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={16} color={Colors.red} />
          </TouchableOpacity>
        </View>
      </View>

      <SectionList
        style={ss.listContainer}
        contentContainerStyle={{ paddingBottom: 160 }}
        sections={sections}
        keyExtractor={item => item.id}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListHeaderComponent={
          <View style={ss.statsRow}>
            <View style={ss.statCard}>
              <Text style={ss.statValue}>{sections[0].data.length}</Text>
              <Text style={ss.statLabel}>Active Deliveries</Text>
            </View>
            <View style={ss.statCard}>
              <Text style={[ss.statValue, { color: Colors.primary }]}>{sections[1].data.length}</Text>
              <Text style={ss.statLabel}>Pending Jobs</Text>
            </View>
            <View style={ss.statCard}>
              <Text style={[ss.statValue, { color: Colors.green, fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>Online</Text>
              <Text style={ss.statLabel}>Status</Text>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={[ss.sectionTitle, { paddingHorizontal: 16, marginTop: 16 }]}>{section.title}</Text>
        )}
        renderItem={({ item: order, section }) => (
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
        )}
        ListEmptyComponent={
          <View style={[ss.emptyCard, { marginHorizontal: 16 }]}>
            <Ionicons name="checkmark-done-outline" size={28} color={Colors.muted} />
            <Text style={ss.emptyText}>All caught up!</Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 120 }} />}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0D0A06', borderBottomWidth: 1, borderBottomColor: 'rgba(255,107,0,0.18)' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,107,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#F5ECD7' },
  headerSub: { fontSize: 11, color: '#9A8A72' },
  headerLive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  liveText: { fontSize: 11, color: '#22C55E', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  statCard: { flex: 1, backgroundColor: '#221A0F', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#F5ECD7' },
  statLabel: { fontSize: 10, color: '#9A8A72', marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9A8A72', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  emptyCard: { alignItems: 'center', padding: 32, backgroundColor: '#221A0F', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', gap: 8 },
  emptyText: { fontSize: 13, color: '#9A8A72' },
  chatToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#2A1F12', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', marginBottom: 10, marginTop: 4 },
  chatToggleTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#9A8A72' },
  chatBadge: { backgroundColor: '#FF6B00', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  chatBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  chatBox: { backgroundColor: '#18120A', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', marginBottom: 10, overflow: 'hidden' },
  chatMsgsWrap: { minHeight: 80 },
  chatEmpty: { alignItems: 'center', padding: 20, gap: 6 },
  chatEmptyTxt: { fontSize: 12, color: '#9A8A72' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,107,0,0.18)' },
  chatInput: { flex: 1, backgroundColor: '#221A0F', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#F5ECD7', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)' },
  chatSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center' },
  chatSendBtnOff: { backgroundColor: '#2A1F12' },
});
