import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAppStore } from '../state/AppStore';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(SCREEN_WIDTH / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);

function AnimatedDeliveryTrack() {
  const travelAnim = useRef(new Animated.Value(0)).current;
  const [iconPhase, setIconPhase] = useState<'food' | 'rider' | 'home'>('food');

  useEffect(() => {
    const duration = 2000;
    const runAnim = () => {
      travelAnim.setValue(0);
      setIconPhase('food');
      Animated.timing(travelAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) runAnim();
      });
    };
    runAnim();

    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    const startTimers = () => {
      t1 = setTimeout(() => setIconPhase('rider'), duration * 0.33);
      t2 = setTimeout(() => setIconPhase('home'), duration * 0.66);
      t3 = setTimeout(() => startTimers(), duration);
    };
    startTimers();

    return () => { 
      travelAnim.stopAnimation(); 
      clearTimeout(t1); 
      clearTimeout(t2); 
      clearTimeout(t3); 
    };
  }, []);

  const trackWidth = normalize(120);
  const containerSize = normalize(18);
  const translateX = travelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, trackWidth - containerSize] });
  const iconOpacity = travelAnim.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0, 1, 1, 0] });
  const iconScale = travelAnim.interpolate({ inputRange: [0, 0.12, 0.88, 1], outputRange: [0.85, 1.05, 1.05, 0.85] });

  const getIconName = (): 'restaurant-outline' | 'bicycle-outline' | 'home-outline' => {
    switch (iconPhase) { case 'food': return 'restaurant-outline'; case 'rider': return 'bicycle-outline'; case 'home': return 'home-outline'; }
  };

  return (
    <View style={styles.trackContainer}>
      <View style={styles.trackRoad} />
      <Animated.View style={[styles.travelingIcon, { opacity: iconOpacity, transform: [{ translateX }, { scale: iconScale }] }]}>
        <Ionicons name={getIconName()} size={normalize(13)} color="#FF6B00" />
      </Animated.View>
    </View>
  );
}

export default function AppBootScreen() {
  const router = useRouter();
  const { loadSavedSession, currentUser } = useAppStore();
  const [isBooting, setIsBooting] = useState(true);

  // Cinematic fade ins and movement
  const opacity = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true
    }).start();

    // Continuous slow cinematic pan for the background
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(imageScale, { toValue: 1.15, duration: 18000, useNativeDriver: true }),
          Animated.timing(imageScale, { toValue: 1, duration: 18000, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(imageTranslateX, { toValue: -20, duration: 18000, useNativeDriver: true }),
          Animated.timing(imageTranslateX, { toValue: 0, duration: 18000, useNativeDriver: true })
        ])
      ])
    ).start();

    const bootApp = async () => {
      // Initialize global app data
      await loadSavedSession();


      // Ask for location on boot to make delivery easier
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [place] = await Location.reverseGeocodeAsync(loc.coords);
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
            useAppStore.getState().setBootLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              address: addr
            });
          }
        }
      } catch (e) {
        console.log('Location detection failed:', e);
      }

      // Add minimum boot time so user can see animation
      setTimeout(() => setIsBooting(false), 2000);
    };

    bootApp();
  }, []);

  useEffect(() => {
    if (!isBooting) {
      if (currentUser) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth');
      }
    }
  }, [isBooting, currentUser, router]);

  return (
    <View style={styles.container}>
      <Animated.Image 
        source={require('../../assets/images/cinematic-bg.png')}
        style={[
          StyleSheet.absoluteFill, 
          { 
            width: '100%', 
            height: '100%', 
            opacity: 0.6,
            transform: [{ scale: imageScale }, { translateX: imageTranslateX }]
          }
        ]}
        resizeMode="cover"
      />
      <View style={[StyleSheet.absoluteFill, { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.View style={{ opacity, alignItems: 'center', width: '100%' }}>
          <Text style={styles.title}>ANJANI</Text>
          <Text style={styles.titleSecond}>RESTAURANT</Text>
          
          <AnimatedDeliveryTrack />
          
          <View style={styles.taglineWrapper}>
            <Text style={styles.tagline}>Served Hot, Crafted with Love</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  title: {
    fontSize: normalize(34),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: normalize(6),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  titleSecond: {
    fontSize: normalize(30),
    fontWeight: '300',
    color: '#FFF',
    letterSpacing: normalize(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  trackContainer: {
    width: normalize(120),
    height: normalize(20),
    justifyContent: 'center',
    marginVertical: normalize(16),
    position: 'relative',
    alignItems: 'flex-start',
  },
  trackRoad: {
    height: 1.5,
    backgroundColor: 'rgba(255, 107, 0, 0.22)',
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  travelingIcon: {
    width: normalize(18),
    height: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
  taglineWrapper: {
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    width: '100%',
  },
  tagline: {
    fontSize: normalize(12),
    fontWeight: '500',
    color: '#E0E0E0',
    letterSpacing: normalize(3),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
