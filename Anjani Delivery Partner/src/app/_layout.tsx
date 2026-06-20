import '../global.css';
import { Slot } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { registerForPushNotificationsAsync } from '../utils/notifications';
import CustomAlertProvider from '../components/CustomAlertProvider';
import InstallPromptOverlay from '../components/InstallPromptOverlay';

// Keep the native splash screen visible until our custom boot screen mounts
SplashScreen.preventAutoHideAsync().catch(() => {});

// Global PWA install prompt catcher
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).pwaDeferredPrompt = e;
  });
}

export default function RootLayout() {
  React.useEffect(() => {
    registerForPushNotificationsAsync();
    if (Platform.OS === 'web') {
      document.title = 'Anjani Delivery Partner';
      
      // Inject manifest link dynamically
      const manifestLink = document.querySelector('link[rel="manifest"]') || document.createElement('link');
      manifestLink.setAttribute('rel', 'manifest');
      manifestLink.setAttribute('href', '/manifest.json?v=7');
      document.head.appendChild(manifestLink);

      // Unregister stale service workers from old ?v= registrations, then register fresh
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const reg of registrations) {
            if (reg.active && reg.active.scriptURL && reg.active.scriptURL.includes('?v=')) {
              reg.unregister().then(() => console.log('Unregistered stale SW:', reg.active?.scriptURL));
            }
          }
        });
        navigator.serviceWorker.register('/sw.js')
          .then(reg => {
            reg.update();
            console.log('Service worker registered:', reg.scope);
          })
          .catch(err => console.error('Service worker registration failed:', err));
      }

      // Developer Easter Egg
      console.log(
        '%c 🚀 Engineered by Appology Inc. %c \n Building the future of the web. ',
        'background: #111; color: #FF6B00; font-size: 16px; font-weight: bold; border-radius: 4px; padding: 4px 8px;',
        'color: #888; font-size: 12px; font-style: italic;'
      );
    }
  }, []);

  return (
    <CustomAlertProvider>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent={true} />
        <Slot />
        <InstallPromptOverlay />
      </SafeAreaProvider>
    </CustomAlertProvider>
  );
}
