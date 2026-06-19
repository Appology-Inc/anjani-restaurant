/**
 * @file RiderMapCard.tsx
 * @description Provides a live map view tracking the rider, restaurant, and destination.
 * Includes a fallback isometric view for web or unsupported platforms.
 */
import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  Animated,
  TouchableOpacity,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveOrder } from '../state/AppStore';

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

/**
 * Component that displays a live map tracking delivery progress.
 * Renders native maps on iOS/Android and an isometric illustration on Web.
 * 
 * @param props - Component properties.
 * @param props.order - The active order details used to display locations.
 */
export function RiderMapCard({ order }: { order: ActiveOrder }) {
  const mapRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsating dot indicator loop for the rider icon
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

  /**
   * Adjusts the map camera to encompass all relevant points: 
   * the restaurant, the customer, and the rider.
   */
  const recenterMap = () => {
    if (mapRef.current) {
      try {
        const coords = [
          { latitude: order.restaurantLat, longitude: order.restaurantLng },
          { latitude: order.userLat, longitude: order.userLng },
          { latitude: order.riderLat, longitude: order.riderLng }
        ];
        // Ensure all coordinates are visible with some padding
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true
        });
      } catch (e) {
        console.warn('Map fitToCoordinates error:', e);
      }
    }
  };

  // Responsive camera framing on live rider GPS updates.
  // Delay the recentering slightly to ensure map has fully rendered.
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        recenterMap();
      }, 600);
    }
  }, [order.riderLat, order.riderLng]);

  const showLiveMap = Platform.OS !== 'web';
  
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
            description="Pickup Location"
          >
            <View style={[styles.mapIconWrap, { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
              <Ionicons name="restaurant" size={13} color="#FFF" />
            </View>
          </Marker>

          {/* Destination Hub */}
          <Marker
            coordinate={{ latitude: order.userLat, longitude: order.userLng }}
            title="Customer Location"
            description={order.customerAddress}
          >
            <View style={styles.mapIconWrap}>
              <Ionicons name="home" size={13} color="#FFF" />
            </View>
          </Marker>

          {/* Gliding Rider */}
          <Marker
            coordinate={{ latitude: order.riderLat, longitude: order.riderLng }}
            title="You"
            description="Your current location"
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
        
        <TouchableOpacity 
          style={styles.recenterBtn} 
          onPress={recenterMap}
          activeOpacity={0.8}
        >
          <Ionicons name="locate" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* Native Navigation Button */}
        <TouchableOpacity 
          style={styles.navigateBtn} 
          onPress={() => {
            const url = Platform.select({
              ios: `maps:0,0?q=${order.userLat},${order.userLng}`,
              android: `google.navigation:q=${order.userLat},${order.userLng}`
            });
            if (url) Linking.openURL(url);
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="navigate-circle" size={24} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>Navigate via Maps</Text>
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
          <Text style={styles.isoHubLabel}>Pickup</Text>
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
          <View style={styles.isoHubIcon}>
            <Ionicons name="home" size={16} color="#FF6D00" />
          </View>
          <Text style={styles.isoHubLabel}>Dropoff</Text>
        </View>
      </View>
      
      <View style={styles.fallbackStats}>
        <Ionicons name="compass-outline" size={15} color="#FF6B00" />
        <Text style={styles.fallbackStatsTxt}>
          Your Coordinates: <Text style={styles.statsCoord}>{order.riderLat.toFixed(5)}, {order.riderLng.toFixed(5)}</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 200,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
    marginTop: 12,
    borderRadius: 12,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  recenterBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
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
  navigateBtn: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
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
    backgroundColor: '#18120A',
    padding: 16,
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.18)',
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
    color: '#F5ECD7',
  },
  isoLine: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,107,0,0.18)',
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
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  fallbackStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fallbackStatsTxt: {
    fontSize: 12,
    color: '#9A8A72',
  },
  statsCoord: {
    color: '#F5ECD7',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
});
