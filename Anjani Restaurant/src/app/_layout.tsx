/**
 * @file _layout.tsx
 * @description Global application layout. Sets up navigation stack, status bar, 
 * font preloading, gesture handler, and safe area provider for the app.
 */

import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useEffect } from 'react';
import { useAppStore } from '../state/AppStore';
import { LogBox, Alert, Platform } from 'react-native';

// Removed static window.confirm Alert.alert override in favor of CustomAlertProvider

import { registerForPushNotificationsAsync } from '../utils/notifications';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

// Keep native splash locked until customer boot sequence is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

import SplashScreenUI from '../components/SplashScreenUI';
import { View } from 'react-native';
import React from 'react';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { NetworkStatus } from '../components/NetworkStatus';
import InstallPromptOverlay from '../components/InstallPromptOverlay';
import CustomAlertProvider from '../components/CustomAlertProvider';
import { LogoutOverlay } from '../components/LogoutOverlay';

/**
 * RootLayout Component
 * 
 * Root navigation component that sets up the Expo Router stack and global providers.
 * Also initiates font preloading, push notifications, and global alerts for Web.
 * 
 * @returns {React.JSX.Element} The application root layout wrapped in necessary providers.
 */
export default function RootLayout() {
  
  const { loadSavedSession, isLoggingOut } = useAppStore();

  // Explicitly preload Ionicons font for web reliability
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    // Boot sequence is now handled by app/index.tsx, but we must ensure session loads on deep links or reloads
    loadSavedSession();
    registerForPushNotificationsAsync();
    if (Platform.OS === 'web') {
      document.title = 'Anjani Restaurant';
      // Developer Easter Egg
      console.log(
        '%c 🚀 Engineered by Appology Inc. %c \n Building the future of the web. ',
        'background: #111; color: #FF6B00; font-size: 16px; font-weight: bold; border-radius: 4px; padding: 4px 8px;',
        'color: #888; font-size: 12px; font-style: italic;'
      );
    } else {
      // Wire up Crashlytics for mobile resilience
      try {
        const crashlytics = require('@react-native-firebase/crashlytics').default;
        crashlytics().log('App RootLayout mounted.');
      } catch(e) {
        console.log('Crashlytics not available in this environment');
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <CustomAlertProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.dark }}>
          <SafeAreaProvider>
            <StatusBar style="light" backgroundColor={Colors.dark} />
            
            <NetworkStatus />
            <InstallPromptOverlay />
            
            {isLoggingOut && <LogoutOverlay />}

            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colors.surface },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen 
                name="checkout" 
                options={{ 
                  presentation: 'modal', 
                  animation: 'slide_from_bottom',
                }} 
              />
              <Stack.Screen 
                name="tracking" 
                options={{ 
                  animation: 'slide_from_right',
                }} 
              />
            </Stack>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </CustomAlertProvider>
    </ErrorBoundary>
  );
}
