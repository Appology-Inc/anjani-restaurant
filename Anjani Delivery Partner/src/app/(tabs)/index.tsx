/**
 * @fileoverview Rider Dashboard tab screen for the Anjani Delivery Partner application.
 * This screen displays the rider's active, ready-to-dispatch, and new order requests,
 * along with simulated navigation, chat capabilities, and order status updates.
 */
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, StatusBar, TextInput, Platform, FlatList, SectionList, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, ActiveOrder } from '../../state/AppStore';
import { Colors } from '../../constants/Colors';
import { OrderDeliveryCard } from '../../components/OrderDeliveryCard';
import { MemoizedChatBubble } from '../../components/MemoizedChatBubble';
import { useRouter } from 'expo-router';
import AnimatedReanimated, { LinearTransition } from 'react-native-reanimated';

const scale = Math.min(require('react-native').Dimensions.get('window').width / 375, 1.2);
/**
 * Normalizes a given size based on the device's screen width.
 * @param {number} size - The original size to normalize.
 * @returns {number} The normalized and rounded size.
 */
const normalize = (size: number) => Math.round(size * scale);

/**
 * Main dashboard screen component for the delivery rider.
 * Manages order lists, live simulation, and chat UI.
 *
 * @returns {React.ReactElement} The rendered RiderDashboard component.
 */
export default function RiderDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [openChatOrderId, setOpenChatOrderId] = useState<string | null>(null);
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

  const restaurantCoords = { lat: 17.0790, lng: 82.1374 };

  const sections = React.useMemo(() => {
    // New orders waiting for restaurant prep or ready to dispatch
    const newOrderRequests = systemOrders.filter(o =>
      o.status === 'PLACED' || o.status === 'PREPARING'
    );
    // Orders ready to be picked up and dispatched (out for delivery, still at restaurant)
    const availableJobs = systemOrders.filter(o =>
      o.status === 'OUT_FOR_DELIVERY' &&
      o.riderLat === restaurantCoords.lat &&
      o.riderLng === restaurantCoords.lng
    );
    // Orders rider has already accepted and is actively delivering
    const myActiveJobs = systemOrders.filter(o =>
      o.status === 'OUT_FOR_DELIVERY' &&
      (o.riderLat !== restaurantCoords.lat || o.riderLng !== restaurantCoords.lng)
    );
    return [
      { title: 'My Active Deliveries', data: myActiveJobs, type: 'active' as const },
      { title: 'Ready to Dispatch', data: availableJobs, type: 'available' as const },
      { title: 'New Order Requests', data: newOrderRequests, type: 'new' as const },
    ];
  }, [systemOrders, restaurantCoords.lat, restaurantCoords.lng]);

  const simulationTimers = useRef<{ [orderId: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    return () => {
      // Cleanup all timers on unmount
      Object.values(simulationTimers.current).forEach(clearInterval);
    };
  }, []);

  /**
   * Starts a live GPS delivery route simulation for a given order.
   * Simulates the rider moving towards the user's location over 10 steps.
   * 
   * @param {ActiveOrder} order - The order to simulate navigation for.
   */
  const startSimulation = (order: ActiveOrder) => {
    if (simulationTimers.current[order.id]) {
      Alert.alert('Navigation Active', 'You are already navigating to this destination.');
      return;
    }
    Alert.alert('GPS Navigation', 'Start live delivery route simulation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => {
        let step = 0;
        const total = 10; // Total steps for the simulation
        const timer = setInterval(() => {
          step++;
          const f = step / total; // Fraction of completion
          // Calculate intermediate simulated lat and lng
          const lat = order.restaurantLat + f * (order.userLat - order.restaurantLat);
          const lng = order.restaurantLng + f * (order.userLng - order.restaurantLng);
          updateRiderSimulatedPosition(order.id, lat, lng);
          if (step >= total) { 
            clearInterval(timer); 
            delete simulationTimers.current[order.id];
            updateOrderStatus(order.id, 'DELIVERED'); 
            Alert.alert('Delivered!', `Order ${order.id} delivered successfully.`); 
          }
        }, 2500);
        simulationTimers.current[order.id] = timer;
      }}
    ]);
  };

  /**
   * Handles sending a chat message to the customer for a specific order.
   * 
   * @param {string} orderId - The ID of the order.
   */
  const handleSendMessage = (orderId: string) => {
    const text = (chatTexts[orderId] || '').trim();
    if (!text) return;
    sendChatMessage(orderId, 'rider', 'Delivery Partner', text);
    setChatTexts(prev => ({ ...prev, [orderId]: '' }));
    setTimeout(() => flatListRefs.current[orderId]?.scrollToEnd({ animated: true }), 100);
  };

  /**
   * Formats a timestamp into a localized 12-hour time string (e.g., "10:30 PM").
   * 
   * @param {number} ts - Timestamp in milliseconds.
   * @returns {string} Formatted time string.
   */
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  /**
   * Renders the chat interface panel for a specific order.
   * This panel allows the rider to view messages and reply to the customer.
   * 
   * @param {ActiveOrder} order - The order associated with the chat.
   * @returns {React.ReactElement} The rendered chat panel.
   */
  const renderChatPanel = (order: ActiveOrder) => {
    const isOpen = openChatOrderId === order.id;
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
            <View style={ss.chatMsgsWrap}>
              {msgs.length === 0 ? (
                <View style={ss.chatEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.muted} />
                  <Text style={ss.chatEmptyTxt}>No messages yet</Text>
                </View>
              ) : (
                <FlatList
                  ref={ref => { flatListRefs.current[order.id] = ref; }}
                  data={msgs}
                  keyExtractor={m => m.id}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 350 }}
                  contentContainerStyle={{ padding: 8 }}
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
      </View>
    );
  };

  return (
    <View style={[ss.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {!isRestaurantOpen && (
        <View style={ss.closedBanner}>
          <Ionicons name="warning" size={16} color={Colors.white} />
          <Text style={ss.closedBannerText}>
            Restaurant Closed: {restaurantCloseReason || 'No new orders will be assigned.'}
          </Text>
        </View>
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
        sections={sections}
        keyExtractor={item => item.id}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        ListHeaderComponent={
          <View style={ss.statsRow}>
            <View style={ss.statCard}>
              <Text style={ss.statValue}>{sections[0].data.length}</Text>
              <Text style={ss.statLabel}>Active Deliveries</Text>
            </View>
            <View style={ss.statCard}>
              <Text style={[ss.statValue, { color: Colors.primary }]}>{sections[1].data.length + sections[2].data.length}</Text>
              <Text style={ss.statLabel}>Pending Jobs</Text>
            </View>
            <View style={ss.statCard}>
              <Text style={[ss.statValue, { color: Colors.green }]}>Online</Text>
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
            updateOrderStatus={updateOrderStatus}
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
        ListFooterComponent={<View style={{ height: 50 }} />}
      />
    </View>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  listContainer: { flex: 1 },
  closedBanner: { backgroundColor: Colors.red, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 8 },
  closedBannerText: { color: Colors.white, fontSize: normalize(11), fontWeight: '800' },
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
