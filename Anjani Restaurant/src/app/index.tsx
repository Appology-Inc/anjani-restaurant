/**
 * @file index.tsx
 * @description Boot screen for the Anjani Restaurant application. This file handles
 * the initial loading sequence, location detection, and session restoration
 * before navigating the user to the appropriate screen.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAppStore } from '../state/AppStore';
import * as SplashScreen from 'expo-splash-screen';
import SplashScreenUI from '../components/SplashScreenUI';

/**
 * AppBootScreen Component
 * 
 * Main entry point of the application after the native splash screen.
 * Responsible for:
 * 1. Loading the saved user session from local storage.
 * 2. Requesting and capturing the user's current location (native only).
 * 3. Enforcing a minimum boot time for the splash animation to complete naturally.
 * 4. Routing the user to either the main app tabs or the authentication screen.
 * 
 * @returns {React.JSX.Element} The splash screen UI during the boot process.
 */
export default function AppBootScreen() {
  const router = useRouter();
  const { loadSavedSession, currentUser } = useAppStore();
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    const bootApp = async () => {
      // Initialize global app data
      await loadSavedSession();

      // Dismiss native splash screen now that JS layout is ready
      try {
        await SplashScreen.hideAsync();
      } catch (e) {}

      // Ask for location on boot to make delivery easier
      if (Platform.OS !== 'web') {
        try {
          // Request foreground location permissions
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
              
              // Remove duplicates and join to form the address string
              const addr = Array.from(new Set(addrParts)).join(', ');
              
              // Store the detected boot location in the global state
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
      }

      // Add minimum boot time so user can see animation
      // Using 3000ms to ensure a slow, natural reload experience instead of a quick flash
      setTimeout(() => setIsBooting(false), 3000);
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

  return <SplashScreenUI />;
}
