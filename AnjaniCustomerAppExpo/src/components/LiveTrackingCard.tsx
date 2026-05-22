import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  Animated,
  Linking,
  Alert,
  DimensionValue,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../state/AppStore';

// ─── Map Imports with Safety Guards ──────────────────────────────────────────
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let PROVIDER_DEFAULT: any = null;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
  PROVIDER_DEFAULT = Maps.PROVIDER_DEFAULT;
} catch (e) {
  console.log('react-native-maps not available in this environment');
}

// Sleek dark-mode style for React Native Maps
const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1C1C1E" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8E8E93" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1C1C1E" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#3A3A3C" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#2C2C2E" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#8E8E93" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2C2C2E" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#AEAEB2" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3A3A3C" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function LiveTrackingCard({ order, onClear }: { order: any; onClear: () => void }) {
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const chatSlideAnim = useRef(new Animated.Value(0)).current;
  const chatOpacityAnim = useRef(new Animated.Value(0)).current;

  const [showChat, setShowChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { chatMessages, sendChatMessage, currentUser } = useAppStore();
  const orderMessages = chatMessages[order.id] || [];

  // Pulsating dot indicator loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (orderMessages.length > 0 && showChat) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [orderMessages.length, showChat]);

  // Responsive camera framing on live rider GPS updates
  useEffect(() => {
    if (mapRef.current && MapView) {
      setTimeout(() => {
        try {
          const coords = [
            { latitude: order.restaurantLat, longitude: order.restaurantLng },
            { latitude: order.userLat, longitude: order.userLng },
            { latitude: order.riderLat, longitude: order.riderLng }
          ];
          mapRef.current.fitToCoordinates(coords, {
            edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
            animated: true
          });
        } catch (e) {
          console.warn('Map fitToCoordinates error:', e);
        }
      }, 600);
    }
  }, [order.riderLat, order.riderLng]);

  const toggleChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showChat) {
      Animated.parallel([
        Animated.timing(chatSlideAnim, { toValue: 0, duration: 250, useNativeDriver: false }),
        Animated.timing(chatOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => setShowChat(false));
    } else {
      setShowChat(true);
      Animated.parallel([
        Animated.timing(chatSlideAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(chatOpacityAnim, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]).start();
    }
  };

  const handleSendMessage = () => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const senderName = currentUser?.name || 'Customer';
    sendChatMessage(order.id, 'customer', senderName, trimmed);
    setChatText('');
  };

  // Euclidean scale approximation mapping degrees to real-world kilometers
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return 6371 * c; // returns km
  };

  const dist = getDistance(order.riderLat, order.riderLng, order.userLat, order.userLng);
  const distanceText = dist < 0.1 ? 'Arrived!' : `${dist.toFixed(1)} km away`;
  const timeText = dist < 0.1 ? 'Now' : `${Math.max(1, Math.round(dist * 3.5))} mins`;

  // Compute linear step progress percentage
  let progressPercent = '0%';
  if (order.status === 'PREPARING') progressPercent = '35%';
  else if (order.status === 'OUT_FOR_DELIVERY') progressPercent = '75%';
  else if (order.status === 'DELIVERED') progressPercent = '100%';

  const handleCallRider = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('tel:+919032756266');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const renderMapPanel = () => {
    const showLiveMap = MapView && Marker && Polyline && Platform.OS !== 'web';
    
    if (showLiveMap) {
      return (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: (order.restaurantLat + order.userLat) / 2,
              longitude: (order.restaurantLng + order.userLng) / 2,
              latitudeDelta: Math.abs(order.restaurantLat - order.userLat) * 1.8 || 0.05,
              longitudeDelta: Math.abs(order.restaurantLng - order.userLng) * 1.8 || 0.05,
            }}
            scrollEnabled={true}
            zoomEnabled={true}
            customMapStyle={mapDarkStyle}
          >
            {/* Restaurant Hub */}
            <Marker
              coordinate={{ latitude: order.restaurantLat, longitude: order.restaurantLng }}
              title="Anjani Restaurant"
              description="Your order is hot and prepared here"
            >
              <View style={styles.mapIconWrap}>
                <Ionicons name="restaurant" size={13} color="#FFF" />
              </View>
            </Marker>

            {/* Destination Hub */}
            <Marker
              coordinate={{ latitude: order.userLat, longitude: order.userLng }}
              title="Your Location"
              description={order.customerAddress}
            >
              <View style={[styles.mapIconWrap, { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
                <Ionicons name="home" size={13} color="#FFF" />
              </View>
            </Marker>

            {/* Gliding Rider */}
            <Marker
              coordinate={{ latitude: order.riderLat, longitude: order.riderLng }}
              title="Delivery Partner"
              description={order.status === 'OUT_FOR_DELIVERY' ? 'Delivery partner is on the way!' : 'Preparing...'}
            >
              <Animated.View style={[styles.mapIconWrap, { backgroundColor: '#3B82F6', borderColor: '#3B82F6', transform: [{ scale: pulseAnim }] }]}>
                <Ionicons name="bicycle" size={13} color="#FFF" />
              </Animated.View>
            </Marker>

            {/* Dash route polyline */}
            <Polyline
              coordinates={[
                { latitude: order.restaurantLat, longitude: order.restaurantLng },
                { latitude: order.riderLat, longitude: order.riderLng },
                { latitude: order.userLat, longitude: order.userLng },
              ]}
              strokeColor="#FF6D00"
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
          </MapView>
        </View>
      );
    }

    // High fidelity isometric fallback grid for Web/Simulators
    return (
      <View style={styles.fallbackMapContainer}>
        <View style={styles.isometricTimeline}>
          <View style={styles.isoHub}>
            <View style={styles.isoHubIcon}>
              <Ionicons name="restaurant" size={16} color="#FF6D00" />
            </View>
            <Text style={styles.isoHubLabel}>Anjani</Text>
          </View>

          <View style={styles.isoLine}>
            <Animated.View style={[styles.isoRider, { 
              left: order.status === 'PREPARING' ? '25%' : order.status === 'OUT_FOR_DELIVERY' ? '65%' : '90%',
              transform: [{ scale: pulseAnim }]
            }]}>
              <Ionicons name="bicycle" size={14} color="#FFF" />
            </Animated.View>
          </View>

          <View style={styles.isoHub}>
            <View style={[styles.isoHubIcon, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10B981' }]}>
              <Ionicons name="home" size={16} color="#10B981" />
            </View>
            <Text style={styles.isoHubLabel}>Home</Text>
          </View>
        </View>
        
        <View style={styles.fallbackStats}>
          <Ionicons name="compass-outline" size={15} color={Colors.primary} />
          <Text style={styles.fallbackStatsTxt}>
            GPS Rider Coordinates: <Text style={styles.statsCoord}>{order.riderLat.toFixed(5)}, {order.riderLng.toFixed(5)}</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderChatPanel = () => {
    if (!showChat) return null;
    return (
      <Animated.View style={[styles.chatContainer, { opacity: chatOpacityAnim }]}>
        <View style={styles.chatHeader}>
          <Ionicons name="chatbubbles" size={15} color={Colors.primary} />
          <Text style={styles.chatHeaderText}>Message your delivery partner</Text>
          <View style={styles.chatLiveIndicator}>
            <View style={styles.chatLiveDot} />
            <Text style={styles.chatLiveText}>Live</Text>
          </View>
        </View>

        {/* Messages List */}
        <View style={styles.chatMessages}>
          {orderMessages.length === 0 ? (
            <View style={styles.chatEmpty}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={Colors.muted} />
              <Text style={styles.chatEmptyText}>No messages yet.</Text>
              <Text style={styles.chatEmptySubText}>Send a message to your rider!</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={orderMessages}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 220 }}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => {
                const isCustomer = item.senderRole === 'customer';
                return (
                  <View style={[styles.msgRow, isCustomer ? styles.msgRowRight : styles.msgRowLeft]}>
                    {!isCustomer && (
                      <View style={styles.msgAvatar}>
                        <Ionicons name="bicycle" size={12} color={Colors.primary} />
                      </View>
                    )}
                    <View style={[styles.msgBubble, isCustomer ? styles.msgBubbleCustomer : styles.msgBubbleRider]}>
                      {!isCustomer && (
                        <Text style={styles.msgSenderLabel}>Rider</Text>
                      )}
                      <Text style={[styles.msgText, isCustomer ? styles.msgTextCustomer : styles.msgTextRider]}>
                        {item.text}
                      </Text>
                      <Text style={[styles.msgTime, isCustomer ? styles.msgTimeCustomer : styles.msgTimeRider]}>
                        {formatTime(item.timestamp)}
                      </Text>
                    </View>
                    {isCustomer && (
                      <View style={[styles.msgAvatar, { backgroundColor: 'rgba(255,107,0,0.15)' }]}>
                        <Ionicons name="person" size={12} color={Colors.primary} />
                      </View>
                    )}
                  </View>
                );
              }}
            />
          )}
        </View>

        {/* Input Box */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatText}
              onChangeText={setChatText}
              placeholder="Type a message..."
              placeholderTextColor={Colors.muted}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
              maxLength={200}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, !chatText.trim() && styles.chatSendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!chatText.trim()}
              activeOpacity={0.7}
            >
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  };

  return (
    <View style={styles.liveCard}>
      {/* Live Track Header */}
      <View style={styles.liveHeader}>
        <View style={styles.liveIndicatorRow}>
          <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.liveTitle}>Live Order Tracking</Text>
        </View>
        <Text style={styles.liveId}>{order.id}</Text>
      </View>

      {/* Map Panel */}
      {renderMapPanel()}

      {/* ETA Details Box */}
      <View style={styles.etaDashboard}>
        <View style={styles.etaRow}>
          <View>
            <Text style={styles.etaHeading}>Estimated Delivery</Text>
            <Text style={styles.etaTime}>{timeText}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.etaHeading}>Distance Remaining</Text>
            <Text style={styles.etaDist}>{distanceText}</Text>
          </View>
        </View>

        {/* Dynamic horizontal tracker */}
        <View style={styles.liveProgressTrack}>
          <View style={[styles.liveProgressFill, { width: progressPercent as DimensionValue }]} />
        </View>

        {/* Milestone Labels */}
        <View style={styles.milestoneRow}>
          <Text style={[styles.milestoneLabel, order.status === 'PLACED' && styles.milestoneLabelActive]}>Placed</Text>
          <Text style={[styles.milestoneLabel, order.status === 'PREPARING' && styles.milestoneLabelActive]}>Preparing</Text>
          <Text style={[styles.milestoneLabel, order.status === 'OUT_FOR_DELIVERY' && styles.milestoneLabelActive]}>On The Way</Text>
          <Text style={[styles.milestoneLabel, order.status === 'DELIVERED' && styles.milestoneLabelActive]}>Delivered</Text>
        </View>
      </View>

      <View style={styles.liveDivider} />

      {/* Delivery Partner details */}
      <View style={styles.riderPanel}>
        <View style={styles.riderAvatarBox}>
          <Ionicons name="person" size={18} color={Colors.primary} />
        </View>
        <View style={styles.riderDetailsCol}>
          <View style={styles.riderNameRow}>
            <Text style={styles.riderName}>Delivery Partner</Text>
            <View style={styles.riderRatingPill}>
              <Ionicons name="star" size={10} color="#FF6D00" />
              <Text style={styles.riderRatingTxt}>4.9</Text>
            </View>
          </View>
          <Text style={styles.riderStatus}>
            {order.status === 'OUT_FOR_DELIVERY' ? '🛵 On the way to you' : order.status === 'DELIVERED' ? '✅ Delivered' : '👨‍🍳 Preparing your order'}
          </Text>
        </View>
        <View style={styles.riderActionsRow}>
          <TouchableOpacity
            style={[styles.riderActionIconBtn, showChat && { backgroundColor: 'rgba(255,107,0,0.12)', borderColor: Colors.primary }]}
            onPress={toggleChat}
          >
            <Ionicons
              name={showChat ? 'chatbubbles' : 'chatbubble-ellipses-outline'}
              size={17}
              color={showChat ? Colors.primary : Colors.text}
            />
            {orderMessages.length > 0 && !showChat && (
              <View style={styles.chatBadge}>
                <Text style={styles.chatBadgeText}>{orderMessages.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.riderActionIconBtn, { backgroundColor: 'rgba(255,107,0,0.12)' }]} onPress={handleCallRider}>
            <Ionicons name="call-outline" size={17} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat Panel */}
      {renderChatPanel()}

      {/* Context pills */}
      {(order.cookingInstructions || order.paymentMethod) && (
        <View style={styles.extraPillsRow}>
          {order.cookingInstructions && (
            <View style={styles.extraPill}>
              <Ionicons name="restaurant-outline" size={10} color={Colors.muted} />
              <Text style={styles.extraPillTxt} numberOfLines={1}>Note: {order.cookingInstructions}</Text>
            </View>
          )}
          <View style={[styles.extraPill, { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.15)' }]}>
            <Ionicons name="wallet-outline" size={10} color="#10B981" />
            <Text style={[styles.extraPillTxt, { color: '#10B981' }]}>
              {order.paymentMethod} • ₹{order.totalAmount.toFixed(0)}
            </Text>
          </View>
        </View>
      )}

      {/* Dismiss tracking bar */}
      {order.status === 'DELIVERED' && (
        <TouchableOpacity style={styles.liveDismissBtn} onPress={onClear}>
          <Ionicons name="checkmark-done-circle" size={18} color="#FFF" />
          <Text style={styles.liveDismissBtnTxt}>Dismiss Tracking</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  liveCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  liveId: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '600',
  },
  mapContainer: {
    height: 180,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6D00',
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  fallbackMapContainer: {
    height: 140,
    width: '100%',
    backgroundColor: Colors.card2 ?? Colors.surface,
    padding: 16,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  isometricTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  isoHub: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  isoHubIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FF6D00',
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  isoHubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  isoLine: {
    flex: 1,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 8,
    position: 'relative',
    borderRadius: 2,
  },
  isoRider: {
    position: 'absolute',
    top: -11,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  fallbackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fallbackStatsTxt: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
  },
  statsCoord: {
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  etaDashboard: {
    padding: 16,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  etaHeading: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaTime: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 2,
  },
  etaDist: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  liveProgressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  liveProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestoneLabel: {
    fontSize: 10,
    color: Colors.muted,
    fontWeight: '600',
  },
  milestoneLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  liveDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  riderPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  riderAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  riderDetailsCol: {
    flex: 1,
    gap: 3,
  },
  riderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  riderStatus: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '500',
  },
  riderRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,107,0,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  riderRatingTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6D00',
  },
  riderActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  riderActionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.card2 ?? Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  chatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFF',
  },

  // ─── Chat Panel ───────────────────────────────────────────────
  chatContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
  },
  chatLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  chatLiveText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '700',
  },
  chatMessages: {
    minHeight: 100,
  },
  chatEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  chatEmptyText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    marginTop: 4,
  },
  chatEmptySubText: {
    fontSize: 11,
    color: Colors.muted,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 6,
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgBubble: {
    maxWidth: '72%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  msgBubbleCustomer: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  msgBubbleRider: {
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  msgSenderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.muted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  msgTextCustomer: {
    color: '#FFF',
  },
  msgTextRider: {
    color: Colors.text,
  },
  msgTime: {
    fontSize: 9,
    marginTop: 3,
    fontWeight: '500',
  },
  msgTimeCustomer: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'right',
  },
  msgTimeRider: {
    color: Colors.muted,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 80,
  },
  chatSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  chatSendBtnDisabled: {
    backgroundColor: Colors.card2,
    ...Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
  },
  extraPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 12,
    gap: 8,
  },
  extraPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.card2 ?? Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  extraPillTxt: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: '500',
  },
  liveDismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    margin: 16,
    marginTop: 0,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  liveDismissBtnTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
