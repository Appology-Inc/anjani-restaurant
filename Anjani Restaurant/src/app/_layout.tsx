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

if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = message ? `${title}\n\n${message}` : title;
    if (buttons && buttons.length > 0) {
      const destructiveBtn = buttons.find(b => b.style === 'destructive' || b.text?.toLowerCase() === 'delete' || b.text?.toLowerCase() === 'log out');
      const cancelBtn = buttons.find(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');
      if (destructiveBtn || cancelBtn) {
        const confirmed = window.confirm(text);
        if (confirmed && destructiveBtn && destructiveBtn.onPress) {
          destructiveBtn.onPress();
        } else if (!confirmed && cancelBtn && cancelBtn.onPress) {
          cancelBtn.onPress();
        } else if (confirmed && !destructiveBtn) {
          const actionBtn = buttons.find(b => b !== cancelBtn);
          if (actionBtn && actionBtn.onPress) actionBtn.onPress();
        }
      } else {
        window.alert(text);
        const firstBtn = buttons[0];
        if (firstBtn && firstBtn.onPress) firstBtn.onPress();
      }
    } else {
      window.alert(text);
    }
  };
}

import { registerForPushNotificationsAsync } from '../utils/notifications';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

// Keep native splash locked until customer boot sequence is ready
SplashScreen.preventAutoHideAsync().catch(() => {});

import SplashScreenUI from '../components/SplashScreenUI';
import { View } from 'react-native';
import React from 'react';

/**
 * RootLayout Component
 * 
 * Root navigation component that sets up the Expo Router stack and global providers.
 * Also initiates font preloading, push notifications, and global alerts for Web.
 * 
 * @returns {React.JSX.Element} The application root layout wrapped in necessary providers.
 */
export default function RootLayout() {
  
  const { loadSavedSession } = useAppStore();

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
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.dark }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.dark} />

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
  );
}
