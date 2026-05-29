import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';

// ─── Map Imports with Safety Guards ──────────────────────────────────────────
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from './Maps';

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
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const chatSlideAnim = useRef(new Animated.Value(0)).current;
  const chatOpacityAnim = useRef(new Animated.Value(0)).current;

  const [showChat, setShowChat] = useState(false);
  const [fullScreenChat, setFullScreenChat] = useState(false);
  const [chatText, setChatText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  
  const flatListRef = useRef<FlatList>(null);
  const chatInputRef = useRef<TextInput>(null);

  const { chatMessages, sendChatMessage, currentUser, submitReview } = useAppStore();
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
      }, 150);
    }
  }, [orderMessages.length, showChat]);

  // Keyboard visibility listeners
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Responsive camera framing on live rider GPS updates
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        recenterMap();
      }, 600);
    }
  }, [order.riderLat, order.riderLng]);

  const recenterMap = () => {
    if (mapRef.current) {
      try {
        const coords = [
          { latitude: order.restaurantLat, longitude: order.restaurantLng },
          { latitude: order.userLat, longitude: order.userLng }
        ];
        if (order.riderLat !== undefined && order.riderLng !== undefined) {
          coords.push({ latitude: order.riderLat, longitude: order.riderLng });
        }
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true
        });
      } catch (e) {
        console.warn('Map fitToCoordinates error:', e);
      }
    }
  };

  const toggleChat = useCallback(() => {
    if (showChat) {
      Keyboard.dismiss();
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
  }, [showChat]);

  const handleSendMessage = () => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
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

  let dist = 0;
  let distanceText = '';
  let timeText = '';

  if (order.status === 'PREPARING' || order.status === 'PLACED') {
    dist = getDistance(order.restaurantLat, order.restaurantLng, order.userLat, order.userLng);
    distanceText = `${dist.toFixed(1)} km to deliver`;
    const travelTime = Math.max(1, Math.round(dist * 3.5));
    timeText = `${15 + travelTime} mins`; // 15 min prep + travel
  } else {
    const rLat = order.riderLat ?? order.restaurantLat;
    const rLng = order.riderLng ?? order.restaurantLng;
    dist = getDistance(rLat, rLng, order.userLat, order.userLng);
    distanceText = dist < 0.1 ? 'Arrived!' : `${dist.toFixed(1)} km away`;
    timeText = dist < 0.1 ? 'Now' : `${Math.max(1, Math.round(dist * 3.5))} mins`;
  }

  // Compute linear step progress percentage
  let progressPercent = '0%';
  if (order.status === 'ACCEPTED') progressPercent = '20%';
  else if (order.status === 'PREPARING') progressPercent = '40%';
  else if (order.status === 'READY') progressPercent = '60%';
  else if (order.status === 'OUT_FOR_DELIVERY') progressPercent = '80%';
  else if (order.status === 'DELIVERED') progressPercent = '100%';

  const handleCallRider = () => {
    Linking.openURL('tel:+919032756266');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const renderPrepPanel = () => {
    const isPlaced = order.status === 'PLACED';
    const isAccepted = order.status === 'ACCEPTED';
    const isPreparing = order.status === 'PREPARING';
    const isReady = order.status === 'READY';
    const isCancelled = order.status === 'CANCELLED';
    
    let iconName: any = 'time';
    let iconColor = '#F59E0B'; // Amber
    let bgColor = 'rgba(245,158,11,0.15)';
    let title = 'Order Received!';
    let subtitle = 'Waiting for the restaurant to confirm your order.';
    
    if (isCancelled) {
      iconName = 'close-circle';
      iconColor = '#EF4444';
      bgColor = 'rgba(239,68,68,0.15)';
      title = 'Order Cancelled';
      subtitle = (order as any).cancelReason || 'Unfortunately, your order could not be fulfilled at this time.';
    } else if (isAccepted) {
      iconName = 'checkmark-circle';
      iconColor = '#10B981';
      bgColor = 'rgba(16,185,129,0.15)';
      title = 'Restaurant Confirmed!';
      subtitle = 'The restaurant has accepted your order. Chefs will start preparing soon.';
    } else if (isPreparing) {
      iconName = 'restaurant';
      iconColor = '#10B981';
      bgColor = 'rgba(16,185,129,0.15)';
      title = 'Chefs are Cooking 👨‍🍳';
      subtitle = 'Our chefs are preparing your order with care. A delivery partner will be assigned shortly!';
    } else if (isReady) {
      iconName = 'cube';
      iconColor = Colors.primary;
      bgColor = 'rgba(255,107,0,0.15)';
      title = 'Order Ready! 📦';
      subtitle = 'Your food is packed and ready. Finding a delivery partner to pick it up.';
    }

    return (
      <View style={[styles.mapContainer, { backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>
        </Animated.View>
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
          {title}
        </Text>
        <Text style={{ color: Colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 }} numberOfLines={3}>
          {subtitle}
        </Text>
      </View>
    );
  };

  const renderMapPanel = (isHidden: boolean) => {
    const showLiveMap = Platform.OS !== 'web';

    if (showLiveMap) {
      return (
        <View style={[styles.mapContainer, isHidden && { display: 'none' }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: (order.restaurantLat + order.userLat) / 2,
              longitude: (order.restaurantLng + order.userLng) / 2,
              latitudeDelta: Math.abs(order.restaurantLat - order.userLat) * 1.8 || 0.05,
              longitudeDelta: Math.abs(order.restaurantLng - order.userLng) * 1.8 || 0.05,
            }}
            markers={[
              { lat: order.restaurantLat, lng: order.restaurantLng, type: 'restaurant' },
              { lat: order.userLat, lng: order.userLng, type: 'customer' },
              ...((order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED') && order.riderLat !== undefined && order.riderLng !== undefined 
                  ? [{ lat: order.riderLat, lng: order.riderLng, type: 'rider' }] 
                  : [])
            ]}
          />
          
          <TouchableOpacity 
            style={styles.recenterBtn} 
            onPress={recenterMap}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      );
    }

    // High fidelity isometric fallback grid for Web/Simulators
    return (
      <View style={styles.fallbackMapContainer}>
        <View style={styles.isometricTimeline}>
          <View style={styles.isoHub}>
            <View style={[styles.isoHubIcon, { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10B981' }]}>
              <Ionicons name="restaurant" size={16} color="#10B981" />
            </View>
            <Text style={styles.isoHubLabel}>Anjani</Text>
          </View>

          <View style={styles.isoLine}>
            <Animated.View style={[styles.isoRider, { 
              left: ['PREPARING', 'ACCEPTED', 'READY', 'PLACED'].includes(order.status) ? '25%' : order.status === 'OUT_FOR_DELIVERY' ? '65%' : '90%',
              transform: [{ scale: pulseAnim }]
            }]}>
              <Ionicons name="bicycle" size={14} color="#FFF" />
            </Animated.View>
          </View>

          <View style={styles.isoHub}>
            <View style={styles.isoHubIcon}>
              <Ionicons name="home" size={16} color="#FF6D00" />
            </View>
            <Text style={styles.isoHubLabel}>Home</Text>
          </View>
        </View>
        
        <View style={styles.fallbackStats}>
          <Ionicons name="compass-outline" size={15} color={Colors.primary} />
          <Text style={styles.fallbackStatsTxt}>
            GPS Rider Coordinates: <Text style={styles.statsCoord}>{order.riderLat?.toFixed(5) || 'N/A'}, {order.riderLng?.toFixed(5) || 'N/A'}</Text>
          </Text>
        </View>
      </View>
    );
  };

  const renderChatPanel = () => {
    return (
      <View>
        {/* Inline chat view if showChat is true */}
        {showChat && (
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.card }}>
            <TouchableOpacity 
              style={{ padding: 8 }} 
              activeOpacity={0.9} 
              onPress={() => setFullScreenChat(true)}
            >
              {orderMessages.length === 0 ? (
                <View style={[styles.chatEmpty, { paddingVertical: 20 }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.muted} />
                  <Text style={[styles.chatEmptyText, { fontSize: 13, marginTop: 4 }]}>No messages yet.</Text>
                </View>
              ) : (
                <View pointerEvents="none">
                  <FlatList
                    ref={flatListRef}
                    data={orderMessages}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: 200 }}
                    contentContainerStyle={{ paddingVertical: 4 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
                </View>
              )}
            </TouchableOpacity>
            
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={[styles.chatInputRow, { padding: 12, borderTopWidth: 0, paddingBottom: 16 }]}>
                <TextInput
                  ref={chatInputRef}
                  style={styles.chatInput}
                  value={chatText}
                  onChangeText={setChatText}
                  placeholder="Reply to rider..."
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
                  <Ionicons name="send" size={18} color="#FFF" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}

        {/* Full screen modal if fullScreenChat is true */}
        <Modal 
          visible={fullScreenChat} 
          animationType="slide" 
          presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'overFullScreen'}
          transparent={Platform.OS !== 'ios'}
          statusBarTranslucent={true}
          onRequestClose={() => setFullScreenChat(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#111', paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="chatbubbles" size={20} color={Colors.primary} />
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Chat with Rider</Text>
              </View>
              <TouchableOpacity onPress={() => setFullScreenChat(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={24} color={Colors.muted} />
              </TouchableOpacity>
            </View>
            
            <View style={{ flex: 1, backgroundColor: '#111' }}>
              {orderMessages.length === 0 ? (
                <View style={styles.chatEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.muted} />
                  <Text style={[styles.chatEmptyText, { marginTop: 16 }]}>No messages yet</Text>
                </View>
              ) : (
                <FlatList
                  data={orderMessages}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} 
              keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
              enabled={Platform.OS === 'ios' || keyboardVisible}
            >
              <View style={[styles.chatInputRow, { padding: 16, paddingBottom: Math.max(insets.bottom, 16), backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border }]}>
                <TextInput
                  style={[styles.chatInput, { height: 48 }]}
                  value={chatText}
                  onChangeText={setChatText}
                  placeholder="Reply to rider..."
                  placeholderTextColor={Colors.muted}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[styles.chatSendBtn, { width: 48, height: 48, borderRadius: 24 }, !chatText.trim() && styles.chatSendBtnDisabled]}
                  onPress={handleSendMessage}
                  disabled={!chatText.trim()}
                >
                  <Ionicons name="send" size={20} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    );
  };

  return (
    <View style={styles.liveCard}>
      {/* Live Track Header */}
      <View style={[styles.liveHeader, { flexDirection: 'column', alignItems: 'flex-start', gap: 2 }]}>
        <View style={{ width: '100%' }}>
          {order.items && order.items.length > 0 ? (
            order.items.map((i: any, index: number) => (
              <View key={index} style={[styles.liveIndicatorRow, { marginBottom: 4 }]}>
                {index === 0 ? (
                  <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                ) : (
                  <View style={{ width: 8, height: 8 }} />
                )}
                <Text style={[styles.liveTitle, { flex: 1, lineHeight: 20 }]} numberOfLines={1}>
                  {i.quantity}x {i.item.name}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.liveIndicatorRow}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={[styles.liveTitle, { flex: 1 }]} numberOfLines={1}>
                Live Order Tracking
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.liveId, { marginLeft: 16 }]} numberOfLines={1}>ID: {order.id}</Text>
      </View>

      {/* Map Panel or Prep Panel */}
      <View>
        {renderMapPanel(['PREPARING', 'PLACED', 'ACCEPTED', 'READY'].includes(order.status))}
        {['PREPARING', 'PLACED', 'ACCEPTED', 'READY'].includes(order.status) && renderPrepPanel()}
      </View>

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
          <Text style={[styles.milestoneLabel, order.status === 'ACCEPTED' && styles.milestoneLabelActive]}>Accepted</Text>
          <Text style={[styles.milestoneLabel, order.status === 'PREPARING' && styles.milestoneLabelActive]}>Preparing</Text>
          <Text style={[styles.milestoneLabel, order.status === 'READY' && styles.milestoneLabelActive]}>Ready</Text>
          <Text style={[styles.milestoneLabel, order.status === 'OUT_FOR_DELIVERY' && styles.milestoneLabelActive]}>On Way</Text>
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

      {/* Rating & Dismiss tracking bar */}
      {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
        <View style={styles.ratingContainer}>
          {order.status === 'DELIVERED' && (
            <>
              <Text style={styles.ratingTitle}>How was your food & delivery?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color="#FFD700" />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Leave a review (optional)"
                  placeholderTextColor={Colors.muted}
                  value={reviewText}
                  onChangeText={setReviewText}
                />
              )}
            </>
          )}
          <TouchableOpacity 
            style={[styles.liveDismissBtn, order.status === 'CANCELLED' && { backgroundColor: '#EF4444' }]} 
            onPress={() => {
              if (rating > 0 && order.status === 'DELIVERED') {
                submitReview(order.id, rating, reviewText);
              }
              onClear();
            }}
          >
            <Ionicons name="checkmark-done-circle" size={18} color="#FFF" />
            <Text style={styles.liveDismissBtnTxt}>
              {order.status === 'CANCELLED' ? "Dismiss" : (rating > 0 ? "Submit & Dismiss" : "Dismiss Tracking")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  liveCard: {
    flex: 1,
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
    shadowRadius: 10,
    elevation: 8,
  },
  ratingContainer: {
    padding: 16,
    backgroundColor: 'rgba(255,107,0,0.05)',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  ratingTitle: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  reviewInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 13,
    marginBottom: 12,
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
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    letterSpacing: 0.2,
  },
  liveId: {
    fontSize: 12,
    color: Colors.muted,
    fontWeight: '600',
  },
  mapContainer: {
    height: 220,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  recenterBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(28,28,30,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    zIndex: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalChatContainer: {
    maxHeight: '85%',
    minHeight: '50%',
    backgroundColor: '#18120A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20,
  },
  chatDragHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: '#18120A',
  },
  chatDragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#221A0F',
  },
  chatHeaderText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
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
    flex: 1,
    minHeight: 120,
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
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: '#18120A',
  },
  chatInputRowKeyboard: {
    paddingBottom: Platform.OS === 'ios' ? 10 : 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 9,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 80,
  },
  chatSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
