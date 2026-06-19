/**
 * @fileoverview Root layout entry point for the Expo Router app.
 * Sets up the global context providers and status bar.
 */
import { Slot } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';

LogBox.ignoreAllLogs(true); // Suppress all warnings/errors from showing on screen during testing

/**
 * RootLayout component wrapping the entire application.
 * 
 * @returns {React.ReactElement} The rendered root layout with context providers.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Slot />
    </SafeAreaProvider>
  );
}
