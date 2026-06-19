/**
 * @file index.tsx
 * @description Boot screen and entry point for the Anjani Delivery Partner app. Handles cinematic animations and session initialization.
 */
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../state/AppStore';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { AnimatedDeliveryTrack } from '../components/AnimatedDeliveryTrack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(SCREEN_WIDTH / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);

/**
 * Boot Screen Component
 * Displays a cinematic entry sequence and initializes user session.
 * Routes to the main tab interface if a session exists, otherwise to auth.
 * 
 * @returns {JSX.Element} The rendered boot screen component
 */
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
        blurRadius={4}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.View style={{ opacity, alignItems: 'center', width: '100%' }}>
          <Text style={styles.title}>ANJANI RESTAURANT</Text>
          <Text style={styles.titleSecond}>DELIVERY PARTNER</Text>
          
          <View style={{ marginVertical: 20, alignItems: 'center', width: '100%' }}>
            <AnimatedDeliveryTrack />
          </View>
          
          <View style={styles.taglineWrapper}>
            <Text style={styles.tagline}>Served Hot, Delivered Fast 🔥</Text>
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
    fontSize: normalize(26),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: normalize(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  titleSecond: {
    fontSize: normalize(18),
    fontWeight: '300',
    color: '#FFF',
    letterSpacing: normalize(3),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
    marginTop: 6,
  },
  taglineWrapper: {
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
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
