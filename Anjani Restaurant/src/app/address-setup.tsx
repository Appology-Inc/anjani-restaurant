/**
 * @file address-setup.tsx
 * @description Provides a comprehensive map-based interface for users to select
 * and save their delivery address. Features reverse geocoding, autocomplete search,
 * and intricate map animations.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, TextInput, 
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Modal, Animated as RNAnimated, Keyboard, Easing, Alert
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import MapView, { Marker, PROVIDER_DEFAULT } from '../components/Maps';
import * as Location from 'expo-location';

/**
 * Scale helper for responsive UI sizing.
 * 
 * @param {number} size - Base size to normalize.
 * @returns {number} The normalized pixel value.
 */
const normalize = (size: number) => Math.round(size * 1.1);

const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

/**
 * AddressSetupScreen Component
 * 
 * This screen guides the user through setting up a delivery location.
 * It integrates mapping, location permissions, reverse geocoding, 
 * and an interactive UI for saving custom addresses (Home, Work, etc.).
 * 
 * @returns {React.JSX.Element} The Address Setup screen interface.
 */
export default function AddressSetupScreen() {
  const router = useRouter();
  const { newLocation } = useLocalSearchParams<{ newLocation: string }>();
  const isNewLocationDetected = newLocation === 'true';
  const insets = useSafeAreaInsets();
  const { bootLocation, currentUser, addSavedAddress } = useAppStore();

  const [houseNo, setHouseNo] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [tag, setTag] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [customLabel, setCustomLabel] = useState('Home');
  const [loading, setLoading] = useState(false);
  const [isRecentering, setIsRecentering] = useState(false);

  // Web address autocomplete state
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchAddressSuggestions = (query: string) => {
    setArea(query);
    if (!query.trim()) {
      setAddressSuggestions([]);
      return;
    }
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    setIsSearchingAddress(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=IN&addressdetails=1`, {
          headers: { 'User-Agent': 'AnjaniApp/1.0' }
        });
        const data = await res.json();
        setAddressSuggestions(data || []);
      } catch (e) {
        console.warn('Autocomplete fetch error:', e);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 250);
  };

  // Map state
  const [isExpanded, setIsExpanded] = useState(false);
  const [pinCoords, setPinCoords] = useState<{latitude: number, longitude: number} | null>(
    Platform.OS === 'web' ? null :
    bootLocation ? { latitude: bootLocation.latitude, longitude: bootLocation.longitude } : 
    (currentUser?.latitude && currentUser?.longitude) ? { latitude: currentUser.latitude, longitude: currentUser.longitude } :
    null
  );
  const mapRef = useRef<any>(null);

  // Background and floating animations
  const imageScale = useRef(new RNAnimated.Value(1)).current;
  const imageTranslateX = useRef(new RNAnimated.Value(0)).current;
  const pinTranslateY = useRef(new RNAnimated.Value(0)).current;
  const pulseScale = useRef(new RNAnimated.Value(1)).current;
  const pulseOpacity = useRef(new RNAnimated.Value(0.4)).current;
  const keyboardAnim = useRef(new RNAnimated.Value(0)).current;
  const capturePinAnim = useRef(new RNAnimated.Value(0)).current;
  const captureShadowAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      RNAnimated.timing(keyboardAnim, {
        toValue: 1,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      RNAnimated.timing(keyboardAnim, {
        toValue: 0,
        duration: e?.duration || 250,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // Continuous slow cinematic pan for the background
    RNAnimated.loop(
      RNAnimated.parallel([
        RNAnimated.sequence([
          RNAnimated.timing(imageScale, { toValue: 1.15, duration: 18000, useNativeDriver: true }),
          RNAnimated.timing(imageScale, { toValue: 1, duration: 18000, useNativeDriver: true })
        ]),
        RNAnimated.sequence([
          RNAnimated.timing(imageTranslateX, { toValue: -20, duration: 18000, useNativeDriver: true }),
          RNAnimated.timing(imageTranslateX, { toValue: 0, duration: 18000, useNativeDriver: true })
        ])
      ])
    ).start();

    // Bouncing location pin animation
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pinTranslateY, { toValue: -8, duration: 1000, useNativeDriver: true }),
        RNAnimated.timing(pinTranslateY, { toValue: 0, duration: 1000, useNativeDriver: true })
      ])
    ).start();

    // Pulsing radar effect
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.parallel([
          RNAnimated.timing(pulseScale, { toValue: 1.5, duration: 2000, useNativeDriver: true }),
          RNAnimated.timing(pulseOpacity, { toValue: 0, duration: 2000, useNativeDriver: true })
        ]),
        RNAnimated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true }),
        RNAnimated.timing(pulseOpacity, { toValue: 0.4, duration: 0, useNativeDriver: true })
      ])
    ).start();

    // Initial location detection
    if (Platform.OS === 'web') {
      // On web: ALWAYS use browser GPS as primary source
      (async () => {
        try {
          const coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
            if (!navigator.geolocation) { resolve(null); return; }
            // Try standard Wi-Fi/cellular geolocation first (extremely fast and accurate on desktops)
            navigator.geolocation.getCurrentPosition(
              pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => {
                // If that fails, try with high accuracy just in case
                navigator.geolocation.getCurrentPosition(
                  pos2 => resolve({ latitude: pos2.coords.latitude, longitude: pos2.coords.longitude }),
                  async () => {
                    // Fallback to IP geolocation if both fail
                    try {
                      const ipRes = await fetch('https://ipapi.co/json/');
                      const ipData = await ipRes.json();
                      if (ipData && ipData.latitude && ipData.longitude) {
                        resolve({ latitude: ipData.latitude, longitude: ipData.longitude });
                        return;
                      }
                    } catch (e) {
                      console.warn('First load IP fallback failed:', e);
                    }
                    resolve(null);
                  },
                  { timeout: 5000, enableHighAccuracy: true }
                );
              },
              { timeout: 4000, enableHighAccuracy: false, maximumAge: 30000 }
            );
          });

          if (coords) {
            setPinCoords(coords);
            reverseGeocode(coords);
          } else {
            // GPS and IP both failed — fall back to restaurant
            const fallback = { latitude: 17.0765705, longitude: 82.1340028 };
            setPinCoords(fallback);
            reverseGeocode(fallback);
          }
        } catch (e) {
          console.warn("Web location error:", e);
          const fallback = { latitude: 17.0765705, longitude: 82.1340028 };
          setPinCoords(fallback);
          reverseGeocode(fallback);
        }
      })();
    } else if (bootLocation) {
      setPinCoords({ latitude: bootLocation.latitude, longitude: bootLocation.longitude });
      if (bootLocation.address) setArea(bootLocation.address);
    } else if (currentUser?.latitude && currentUser?.longitude) {
      setPinCoords({ latitude: currentUser.latitude, longitude: currentUser.longitude });
    } else {
      // Native fallback to live GPS
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let loc = await Location.getLastKnownPositionAsync();
            if (!loc) {
              loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            }
            if (loc) {
              const newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
              setPinCoords(newCoords);
              reverseGeocode(newCoords);
              return;
            }
          }
        } catch (e) {
          console.warn("Location fetch error:", e);
        }
        const peddapuramCoords = { latitude: 17.0765705, longitude: 82.1340028 };
        setPinCoords(peddapuramCoords);
        reverseGeocode(peddapuramCoords);
      })();
    }
  }, [bootLocation, currentUser]);

  // Seamless map expansion animation
  const mapExpandAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    Keyboard.dismiss(); // Ensure keyboard closes on expand
    RNAnimated.timing(mapExpandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 400,
      easing: Easing.out(Easing.poly(3)),
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);

  const handleDragEnd = async (e: any) => {
    const newCoords = e.nativeEvent.coordinate;
    setPinCoords(newCoords);
    reverseGeocode(newCoords);
  };

  const handleMapCenterUpdate = async () => {
    if (mapRef.current) {
      const camera = await mapRef.current.getCamera();
      const newCoords = { latitude: camera.center.latitude, longitude: camera.center.longitude };
      setPinCoords(newCoords);
      reverseGeocode(newCoords);
    }
  };

  const reverseGeocode = async (coords: { latitude: number, longitude: number }) => {
    try {
      if (Platform.OS === 'web') {
        // Use OpenStreetMap Nominatim API (free, no API key, works on web)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data) {
          const addrObj = data.address || {};
          const house = addrObj.house_number || addrObj.building || addrObj.amenity || '';
          const road = addrObj.road || addrObj.street || '';
          const neighborhood = addrObj.neighbourhood || addrObj.suburb || addrObj.city_district || '';
          const city = addrObj.city || addrObj.town || addrObj.village || '';
          const state = addrObj.state || '';
          const postcode = addrObj.postcode || '';
          
          const parts = [house, road, neighborhood, city, state, postcode].filter(Boolean);
          const addr = parts.join(', ');
          setArea(addr || data.display_name);
        }
      } else {
        // Native: use expo-location (works perfectly on Android/iOS)
        const [place] = await Location.reverseGeocodeAsync(coords);
        if (place) {
          const addrParts = [
            place.name,
            place.streetNumber, 
            place.street, 
            place.subregion,
            place.district, 
            place.city, 
            place.region,
            place.postalCode
          ].filter(Boolean);
          const addr = Array.from(new Set(addrParts)).join(', ');
          if (addr) setArea(addr);
        }
      }
    } catch (e) {
      console.log('Reverse geocoding failed', e);
    }
  };

  const handleSave = async () => {
    if (!houseNo.trim() || !area.trim()) return;
    setLoading(true);

    const fullDetails = `${houseNo.trim()}, ${area.trim()}${landmark ? `, Near ${landmark.trim()}` : ''}`;
    
    await addSavedAddress(customLabel.trim() || tag, fullDetails, pinCoords?.latitude, pinCoords?.longitude);

    // Give a short delay for smooth UI feedback before navigation
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 400);
  };

  const renderTag = (label: 'Home' | 'Work' | 'Other', icon: any) => {
    const isActive = tag === label;
    return (
      <TouchableOpacity 
        style={[styles.tagBtn, isActive && styles.tagBtnActive]}
        onPress={() => {
          setTag(label);
          setCustomLabel(label);
        }}
      >
        <Ionicons name={icon} size={16} color={isActive ? Colors.primary : '#9A8A72'} style={{ marginRight: 6 }} />
        <Text style={[styles.tagTxt, isActive && styles.tagTxtActive]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const keyboardTranslateY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -normalize(180)]
  });

  const minimapOpacity = keyboardAnim.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [1, 0, 0]
  });

  const SCREEN_H = require('react-native').Dimensions.get('window').height;
  const mapHeight = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [normalize(140), SCREEN_H]
  });
  const mapMarginHorizontal = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });
  const mapBorderRadius = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0]
  });
  const mapPaddingTop = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(insets.top, 20), 0]
  });
  const mapPaddingBottom = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });
  const mapBorderBottom = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });
  const titleHeight = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 0]
  });
  const titleMargin = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0]
  });
  const mapBorderWidth = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });
  const formOpacity = mapExpandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  return (
    <View style={styles.container}>
      <RNAnimated.View style={[{ flex: 1 }, { transform: [{ translateY: keyboardTranslateY }] }]}>
      {/* Moving Cinematic Background */}
      <RNAnimated.Image 
        source={require('../../assets/images/cinematic-bg.png')}
        style={[
          StyleSheet.absoluteFill, 
          { 
            width: '100%', 
            height: '100%', 
            opacity: 0.25,
            transform: [{ scale: imageScale }, { translateX: imageTranslateX }]
          }
        ]}
        resizeMode="cover"
      />

      {/* Top Minimap / Expanded Map */}
      <RNAnimated.View style={[styles.minimapContainer, { paddingTop: mapPaddingTop, paddingBottom: mapPaddingBottom, borderBottomWidth: mapBorderBottom, opacity: minimapOpacity }]}>
        <RNAnimated.View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: titleMargin, paddingHorizontal: 20, opacity: formOpacity, height: titleHeight }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Delivery Location</Text>
            <View style={{ marginLeft: 12, alignItems: 'center', justifyContent: 'center' }}>
              <RNAnimated.View style={[styles.iconPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
              <View style={styles.iconCircle}>
                <RNAnimated.View style={{ transform: [{ translateY: pinTranslateY }] }}>
                  <Ionicons name="location" size={16} color={Colors.primary} />
                </RNAnimated.View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{ padding: 4 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={24} color={Colors.muted ?? '#9A8A72'} />
          </TouchableOpacity>
        </RNAnimated.View>
        
        <RNAnimated.View style={[styles.minimapWrap, { height: mapHeight, borderRadius: mapBorderRadius, marginHorizontal: mapMarginHorizontal, borderWidth: mapBorderWidth }]}>
          {pinCoords ? (
            <>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                provider={PROVIDER_DEFAULT}
                initialRegion={{
                  latitude: pinCoords.latitude,
                  longitude: pinCoords.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                customMapStyle={mapDarkStyle}
                showsUserLocation={true}
                showsMyLocationButton={false}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={true}
                rotateEnabled={true}
                onRegionChange={() => {
                  if (Platform.OS !== 'web') {
                    RNAnimated.timing(capturePinAnim, { toValue: -15, duration: 150, useNativeDriver: true }).start();
                    RNAnimated.timing(captureShadowAnim, { toValue: 0.4, duration: 150, useNativeDriver: true }).start();
                  }
                }}
                onRegionChangeComplete={(region: any) => {
                  const newCoords = { latitude: region.latitude, longitude: region.longitude };
                  setPinCoords(newCoords);
                  if (Platform.OS !== 'web') {
                    RNAnimated.timing(capturePinAnim, { toValue: 0, duration: 250, easing: Easing.bounce, useNativeDriver: true }).start();
                    RNAnimated.timing(captureShadowAnim, { toValue: 1, duration: 250, easing: Easing.bounce, useNativeDriver: true }).start();
                  }
                  reverseGeocode(newCoords);
                }}
              />

              <TouchableOpacity 
                style={[styles.centerPinWrap, { transform: [{ scale: isExpanded ? 1 : 0.8 }] }]} 
                activeOpacity={1}
                onPress={async () => {
                  RNAnimated.sequence([
                    RNAnimated.parallel([
                      RNAnimated.timing(capturePinAnim, { toValue: -20, duration: 150, useNativeDriver: true }),
                      RNAnimated.timing(captureShadowAnim, { toValue: 0.4, duration: 150, useNativeDriver: true })
                    ]),
                    RNAnimated.parallel([
                      RNAnimated.timing(capturePinAnim, { toValue: 0, duration: 250, easing: Easing.bounce, useNativeDriver: true }),
                      RNAnimated.timing(captureShadowAnim, { toValue: 1, duration: 250, easing: Easing.bounce, useNativeDriver: true })
                    ])
                  ]).start();

                  if (mapRef.current) {
                    const camera = await mapRef.current.getCamera();
                    const newCoords = { latitude: camera.center.latitude, longitude: camera.center.longitude };
                    setPinCoords(newCoords);
                    reverseGeocode(newCoords);
                  }
                }}
              >
                <RNAnimated.View style={{ transform: [{ translateY: capturePinAnim }], alignItems: 'center', zIndex: 2 }}>
                  <Ionicons name="location" size={48} color={Colors.primary} />
                </RNAnimated.View>
                <RNAnimated.View style={[styles.pinShadow, { transform: [{ scale: captureShadowAnim }], position: 'absolute', bottom: 2 }]} />
              </TouchableOpacity>

              {/* Default Minimap Overlay (Hidden when expanded) */}
              <RNAnimated.View style={[styles.minimapOverlay, { opacity: formOpacity }]} pointerEvents={isExpanded ? 'none' : 'box-none'}>
                {/* Top Left Recenter Button */}
                <TouchableOpacity 
                  style={[styles.recenterFab, { position: 'absolute', top: 10, left: 10 }]} 
                  onPress={async () => {
                    if (isRecentering) return;
                    setIsRecentering(true);
                    try {
                      let newCoords: any = null;
                      if (Platform.OS === 'web') {
                        newCoords = await new Promise((resolve) => {
                          if (!navigator.geolocation) { resolve(null); return; }
                          // Try standard Wi-Fi/cellular geolocation first (extremely fast and accurate on desktops)
                          navigator.geolocation.getCurrentPosition(
                            pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                            () => {
                              // If that fails, try with high accuracy just in case
                              navigator.geolocation.getCurrentPosition(
                                pos2 => resolve({ latitude: pos2.coords.latitude, longitude: pos2.coords.longitude }),
                                async () => {
                                  // Fallback to IP geolocation if both fail
                                  try {
                                    const ipRes = await fetch('https://ipapi.co/json/');
                                    const ipData = await ipRes.json();
                                    if (ipData && ipData.latitude && ipData.longitude) {
                                      resolve({ latitude: ipData.latitude, longitude: ipData.longitude });
                                      return;
                                    }
                                  } catch (e) {
                                    console.warn('Minimap IP fallback failed:', e);
                                  }
                                  resolve(null);
                                },
                                { timeout: 5000, enableHighAccuracy: true }
                              );
                            },
                            { timeout: 4000, enableHighAccuracy: false }
                          );
                        });
                      } else {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== 'granted') throw new Error('Permission denied');
                        let loc = await Location.getLastKnownPositionAsync();
                        if (!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc) newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                      }
                      
                      if (newCoords) {
                        setPinCoords(newCoords);
                        reverseGeocode(newCoords);
                        mapRef.current?.animateToRegion({
                          latitude: newCoords.latitude, longitude: newCoords.longitude,
                          latitudeDelta: 0.005, longitudeDelta: 0.005,
                        }, 1000);
                      } else {
                        Alert.alert(
                          "Location Access Offline",
                          "We couldn't fetch your location. Please check your browser's location settings and allow location access, or enter your address manually."
                        );
                      }
                    } catch (e) {
                      console.warn('Could not fetch location:', e);
                    } finally {
                      setIsRecentering(false);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <RNAnimated.View style={{ position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(66, 133, 244, 0.4)', transform: [{ scale: pulseScale }], opacity: pulseOpacity }} />
                  {isRecentering ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="locate" size={20} color={Colors.primary} />}
                </TouchableOpacity>

                <TouchableOpacity style={styles.expandBtn} onPress={() => setIsExpanded(true)}>
                  <Ionicons name="expand" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.expandTxt}>Adjust on Map</Text>
                </TouchableOpacity>
              </RNAnimated.View>

              {/* Expanded Overlay (Hidden when collapsed) */}
              <RNAnimated.View style={[StyleSheet.absoluteFill, { opacity: mapExpandAnim }]} pointerEvents={isExpanded ? 'box-none' : 'none'}>
                {/* Top Actions */}
                <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 20) }]}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setIsExpanded(false)}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Drag map to adjust</Text>
                  <View style={{ width: 40 }} />
                </View>

                {/* Floating Recenter Button */}
                <TouchableOpacity 
                  style={[styles.recenterFab, { position: 'absolute', top: Math.max(insets.top, 20) + 100, right: 20 }]} 
                  onPress={async () => {
                    if (isRecentering) return;
                    setIsRecentering(true);
                    try {
                      let newCoords: any = null;
                      if (Platform.OS === 'web') {
                        newCoords = await new Promise((resolve) => {
                          if (!navigator.geolocation) { resolve(null); return; }
                          // Try standard Wi-Fi/cellular geolocation first (extremely fast and accurate on desktops)
                          navigator.geolocation.getCurrentPosition(
                            pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                            () => {
                              // If that fails, try with high accuracy just in case
                              navigator.geolocation.getCurrentPosition(
                                pos2 => resolve({ latitude: pos2.coords.latitude, longitude: pos2.coords.longitude }),
                                async () => {
                                  // Fallback to IP geolocation if both fail
                                  try {
                                    const ipRes = await fetch('https://ipapi.co/json/');
                                    const ipData = await ipRes.json();
                                    if (ipData && ipData.latitude && ipData.longitude) {
                                      resolve({ latitude: ipData.latitude, longitude: ipData.longitude });
                                      return;
                                    }
                                  } catch (e) {
                                    console.warn('Expanded Map IP fallback failed:', e);
                                  }
                                  resolve(null);
                                },
                                { timeout: 5000, enableHighAccuracy: true }
                              );
                            },
                            { timeout: 4000, enableHighAccuracy: false }
                          );
                        });
                      } else {
                        const { status } = await Location.requestForegroundPermissionsAsync();
                        if (status !== 'granted') throw new Error('Permission denied');
                        let loc = await Location.getLastKnownPositionAsync();
                        if (!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                        if (loc) newCoords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                      }
                      
                      if (newCoords) {
                        setPinCoords(newCoords);
                        reverseGeocode(newCoords);
                        mapRef.current?.animateToRegion({
                          latitude: newCoords.latitude, longitude: newCoords.longitude,
                          latitudeDelta: 0.005, longitudeDelta: 0.005,
                        }, 1000);
                      } else {
                        Alert.alert(
                          "Location Access Offline",
                          "We couldn't fetch your location. Please check your browser's location settings and allow location access, or enter your address manually."
                        );
                      }
                    } catch (e) {
                      console.warn('Could not fetch location:', e);
                    } finally {
                      setIsRecentering(false);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <RNAnimated.View style={{ position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(66, 133, 244, 0.4)', transform: [{ scale: pulseScale }], opacity: pulseOpacity }} />
                  {isRecentering ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="locate" size={20} color={Colors.primary} />}
                </TouchableOpacity>

                {/* Bottom Actions */}
                <View style={[styles.modalFooter, { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Math.max(insets.bottom, 24) }]}>
                  <View style={styles.previewAddress}>
                    <Ionicons name="location" size={16} color={Colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                    <Text style={styles.previewTxt} numberOfLines={2}>{area || 'Locating...'}</Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.confirmPinBtn} 
                    onPress={() => {
                      reverseGeocode(pinCoords);
                      setIsExpanded(false);
                    }}
                  >
                    <Text style={styles.confirmPinTxt}>Confirm Location</Text>
                  </TouchableOpacity>
                </View>
              </RNAnimated.View>
            </>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ color: Colors.primary, marginTop: 12, fontSize: normalize(12), fontWeight: '600' }}>Locating you via GPS...</Text>
            </View>
          )}
        </RNAnimated.View>
      </RNAnimated.View>

      <RNAnimated.View 
        style={[{ flex: 1 }, { opacity: formOpacity }]}
        pointerEvents={isExpanded ? 'none' : 'auto'}
      >
        <KeyboardAwareScrollView 
          contentContainerStyle={[styles.formContent, { paddingBottom: 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!isExpanded}
          enableOnAndroid={true}
          extraScrollHeight={80}
        >
          <AnimatedReanimated.View entering={FadeInDown.duration(600).delay(200)}>
            {isNewLocationDetected && (
              <View style={{ backgroundColor: 'rgba(255, 107, 0, 0.15)', padding: 12, marginBottom: 20, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 107, 0, 0.3)', flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location" size={20} color="#FF6B00" style={{ marginRight: 8 }} />
                <Text style={{ color: '#FFF', fontSize: 13, flex: 1, fontWeight: '500' }}>We noticed you're in a new location! Please confirm your delivery address.</Text>
              </View>
            )}
            
            {/* Tags Row */}
            <Text style={styles.sectionLabel}>Save address as</Text>
            <View style={styles.tagsRow}>
              {renderTag('Home', 'home')}
              {renderTag('Work', 'briefcase')}
              {renderTag('Other', 'location')}
            </View>

            {/* Custom Label Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Label Name</Text>
              <TextInput
                style={styles.input}
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder="e.g. My Apartment"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Flat / House / Floor No. *</Text>
              <TextInput
                style={styles.input}
                value={houseNo}
                onChangeText={setHouseNo}
                placeholder="e.g. Flat 101, B Block"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area / Locality *</Text>
              <TextInput
                style={[styles.input, { height: normalize(70) }]}
                value={area}
                onChangeText={(text) => {
                  if (Platform.OS === 'web') {
                    fetchAddressSuggestions(text);
                  } else {
                    setArea(text);
                  }
                }}
                placeholder="Locality, City, State"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
                textAlignVertical="top"
              />
              {isSearchingAddress && (
                <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
              )}
              {addressSuggestions.length > 0 && (
                <View style={styles.suggestionsBox}>
                  {addressSuggestions.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionRow}
                      onPress={() => {
                        const newCoords = { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) };
                        setPinCoords(newCoords);
                        
                        const addrObj = item.address || {};
                        const house = addrObj.house_number || addrObj.building || addrObj.amenity || '';
                        const road = addrObj.road || addrObj.street || '';
                        const neighborhood = addrObj.neighbourhood || addrObj.suburb || addrObj.city_district || '';
                        const city = addrObj.city || addrObj.town || addrObj.village || '';
                        const state = addrObj.state || '';
                        const postcode = addrObj.postcode || '';
                        
                        const parts = [house, road, neighborhood, city, state, postcode].filter(Boolean);
                        const addr = parts.join(', ');
                        setArea(addr || item.display_name);
                        setAddressSuggestions([]);

                        // Recenter Leaflet map pin to exact searched location
                        mapRef.current?.animateToRegion({
                          latitude: newCoords.latitude,
                          longitude: newCoords.longitude,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }, 1000);
                      }}
                    >
                      <Ionicons name="location-outline" size={14} color={Colors.muted} style={{ marginRight: 6 }} />
                      <Text style={styles.suggestionText} numberOfLines={2}>{item.display_name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <Text style={styles.helperText}>Auto-filled from map pin. On website, you can search / type to find your exact location.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Landmark (Optional)</Text>
              <TextInput
                style={styles.input}
                value={landmark}
                onChangeText={setLandmark}
                placeholder="e.g. Near Apollo Hospital"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

          </AnimatedReanimated.View>
        </KeyboardAwareScrollView>

        {/* Fixed Footer */}
        <View style={{ 
          paddingHorizontal: 20, 
          paddingTop: 16, 
          paddingBottom: Math.max(insets.bottom, 20),
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.05)',
          backgroundColor: Colors.dark
        }}>
          <TouchableOpacity 
            style={[styles.primaryBtn, (!houseNo.trim() || !area.trim()) && { opacity: 0.5 }, { marginTop: 0 }]} 
            onPress={handleSave}
            disabled={loading || !houseNo.trim() || !area.trim()}
          >
            {loading ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.primaryBtnTxt}>Save & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </RNAnimated.View>
      </RNAnimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    overflow: 'hidden',
  },
  minimapContainer: {
    backgroundColor: 'transparent',
    borderBottomColor: 'rgba(255,107,0,0.15)',
  },
  headerTitle: {
    fontSize: normalize(20),
    fontWeight: '800',
    color: Colors.text,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,107,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    zIndex: 1,
  },
  minimapWrap: {
    width: 'auto',
    height: normalize(140),
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  markerCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  minimapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    padding: 10,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expandTxt: {
    color: Colors.primary,
    fontSize: normalize(11),
    fontWeight: '600',
  },
  recenterFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  formContent: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: normalize(13),
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: normalize(6),
    borderRadius: 20,
    gap: 6,
  },
  tagBtnActive: {
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderColor: Colors.primary,
  },
  tagTxt: {
    color: '#9A8A72',
    fontSize: normalize(12),
    fontWeight: '600',
  },
  tagTxtActive: {
    color: Colors.primary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: normalize(12),
    color: '#9A8A72',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: normalize(12),
    color: Colors.text,
    fontSize: normalize(14),
  },
  helperText: {
    fontSize: normalize(10),
    color: '#9A8A72',
    marginTop: 6,
    fontStyle: 'italic',
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: normalize(14),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryBtnTxt: {
    color: Colors.surface,
    fontSize: normalize(14),
    fontWeight: 'bold',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  centerPinWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -48,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pinShadow: {
    width: 16,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
  },
  modalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(24,18,10,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.primary,
    fontSize: normalize(16),
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  previewAddress: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
  },
  previewTxt: {
    flex: 1,
    color: Colors.text,
    fontSize: normalize(12),
    lineHeight: normalize(16),
  },
  confirmPinBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: normalize(14),
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmPinTxt: {
    color: Colors.surface,
    fontSize: normalize(14),
    fontWeight: 'bold',
  },
  suggestionsBox: {
    marginTop: 8,
    backgroundColor: Colors.card ?? '#2C2C2E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border ?? 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border ?? 'rgba(255,255,255,0.08)',
  },
  suggestionText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
});
