import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { useEffect } from 'react';
import { useAppStore } from '../state/AppStore';

export default function RootLayout() {
  
  const { loadSavedSession, seedDemoDashboardOrders } = useAppStore();

  useEffect(() => {
    // Initialize global app data
    loadSavedSession();
    seedDemoDashboardOrders();
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
