/**
 * @file LogoutOverlay.tsx
 * @description A premium, cinematic logout overlay screen.
 * Handles the fade-to-black transition, triggers the secure auth state clearance,
 * and fades back out once the login screen is mounted, eliminating any screen layout glitches.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, ActivityIndicator, Dimensions, Platform } from 'react-native';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import { AppologyBrand } from './AppologyBrand';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH > 0 ? Math.min(SCREEN_WIDTH / 375, 1.2) : 1;
const normalize = (size: number) => Math.round(size * scale);

export function LogoutOverlay() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const performTransition = async () => {
      // 1. Fade to solid black (fade-in the overlay)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }).start(async () => {
        try {
          // 2. Perform the actual logout clearance behind the black screen
          await useAppStore.getState().logout();
          
          // Allow a brief moment for the router to update DOM and mount AuthScreen
          setTimeout(() => {
            // 3. Fade-out the overlay, revealing the AuthScreen smoothly
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }).start(() => {
              // 4. Finally, disable isLoggingOut to unmount the overlay
              useAppStore.getState().setLoggingOut(false);
            });
          }, 350);
        } catch (error) {
          console.error('Transition logout error:', error);
          useAppStore.getState().setLoggingOut(false);
        }
      });
    };

    performTransition();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* Animated spinner */}
        <ActivityIndicator size="large" color="#FF6B00" style={styles.spinner} />
        
        {/* Clean administrative message */}
        <Text style={styles.title}>ANJANI DELIVERY PARTNER</Text>
        <Text style={styles.subtitle}>Securing console session...</Text>
      </View>
      
      {/* Brand Footer */}
      <View style={styles.footer}>
        <AppologyBrand />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: '#05050A',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(12),
  },
  spinner: {
    marginBottom: normalize(8),
    transform: [{ scale: normalize(1.2) }],
  },
  title: {
    fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : undefined,
    fontSize: normalize(20),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: normalize(6),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: normalize(11),
    color: '#9A8A72',
    letterSpacing: normalize(0.5),
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: normalize(32),
    alignSelf: 'center',
  },
});
