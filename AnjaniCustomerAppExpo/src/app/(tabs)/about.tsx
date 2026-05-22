import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, Linking, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Haptics from 'expo-haptics';

const RESTAURANT_COORDS = { latitude: 17.0805, longitude: 82.1355 };
const RESTAURANT_ADDRESS = "Sri Venkateswara Temple, Street Cinema Center, Peddapuram, Andhra Pradesh 533437";
const RESTAURANT_PHONE = "+91 90327 56266";

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Continuous slow pan & scale animation for the background
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 12000,
          useNativeDriver: true,
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 12000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (e) {
        console.warn('Location permission denied or failed', e);
      } finally {
        // Location fetched
      }
    })();

    return () => animation.stop();
  }, []);

  const handleGetDirections = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${RESTAURANT_COORDS.latitude},${RESTAURANT_COORDS.longitude}`;
    const label = "Anjani Restaurant";
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
        Linking.openURL(url).catch(() => {
             // Fallback to browser if maps app isn't available
             Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latLng}`);
        });
    }
  };

  const bgScale = animValue.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const bgTranslateX = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
  const bgTranslateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });

  return (
    <View style={styles.container}>
      {/* Animated Blurred Background */}
      <Animated.Image 
        source={require('../../../assets/images/about-bg.png')}
        style={[
          StyleSheet.absoluteFill, 
          { 
            transform: [
              { scale: bgScale },
              { translateX: bgTranslateX },
              { translateY: bgTranslateY }
            ], 
            opacity: 0.35 
          }
        ]}
        blurRadius={6}
        resizeMode="cover"
      />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 16 }]}>
        <Text style={styles.pageTitle}>About Us</Text>
      </View>
      
      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        {/* Brand Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.restaurantName}>Anjani Restaurant</Text>
          <Text style={styles.tagline}>Taste the Fire</Text>
          <Text style={styles.description}>
            Experience the authentic flavors of Andhra and Hyderabad. We serve premium quality, freshly prepared meals with a touch of our signature fiery spices.
          </Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="time" size={20} color={Colors.primary} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoTitle}>Opening Hours</Text>
              <Text style={styles.infoDesc}>11:00 AM to 11:00 PM</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="call" size={20} color={Colors.primary} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoTitle}>Contact</Text>
              <Text style={styles.infoDesc}>{RESTAURANT_PHONE}</Text>
            </View>
            <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => {
                    Haptics.selectionAsync();
                    Linking.openURL(`tel:${RESTAURANT_PHONE.replace(/ /g, '')}`);
                }}
            >
              <Ionicons name="call-outline" size={16} color={Colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="location" size={20} color={Colors.primary} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoTitle}>Address</Text>
              <Text style={styles.infoDesc}>{RESTAURANT_ADDRESS}</Text>
            </View>
          </View>
        </View>

        {/* Map Section */}
        <Text style={styles.sectionTitle}>Our Location</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: RESTAURANT_COORDS.latitude,
              longitude: RESTAURANT_COORDS.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={true}
          >
            <Marker coordinate={RESTAURANT_COORDS} title="Anjani Restaurant" description="Restaurant Location" />
            {userLocation && (
              <Polyline 
                coordinates={[userLocation, RESTAURANT_COORDS]}
                strokeColor={Colors.primary}
                strokeWidth={3}
                lineDashPattern={[10, 10]}
              />
            )}
          </MapView>
          
          <TouchableOpacity style={styles.directionsBtn} onPress={handleGetDirections}>
            <Ionicons name="navigate" size={18} color={Colors.white} />
            <Text style={styles.directionsTxt}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  scrollArea: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(34, 26, 15, 0.4)', // Slightly transparent to let background peek through
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,107,0,0.1)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.primary,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    color: Colors.muted,
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: 'rgba(34, 26, 15, 0.7)', // Slightly transparent
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.1)',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  infoTextCol: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.card2,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  mapContainer: {
    marginHorizontal: 16,
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  directionsBtn: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  directionsTxt: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
});
