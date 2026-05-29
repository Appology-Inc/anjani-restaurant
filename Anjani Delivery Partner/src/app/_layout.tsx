import { Slot } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';

import { registerForPushNotificationsAsync } from '../utils/notifications';

// LogBox.ignoreAllLogs(true); // Removed for production

export default function RootLayout() {
  React.useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Slot />
    </SafeAreaProvider>
  );
}
