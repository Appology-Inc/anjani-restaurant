/**
 * @file _layout.tsx
 * @description Main tab layout configuration for the Anjani Restaurant application.
 * Manages the bottom navigation tabs, session state routing, and tab bar styling.
 */
import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAppStore } from '../../state/AppStore';
import { View, Text, StyleSheet } from 'react-native';

/**
 * TabLayout Component
 * 
 * Renders the bottom navigation bar with icons and badges.
 * Includes session validation to ensure only authenticated users
 * can access the main application features.
 * 
 * @returns {React.ReactElement} The rendered tab layout or a redirect.
 */
export default function TabLayout() {
  const { getCartCount, currentUser, isSessionLoaded } = useAppStore();
  const insets = useSafeAreaInsets();

  if (!isSessionLoaded) {
    return <View style={{ flex: 1, backgroundColor: Colors.dark }} />;
  }

  if (!currentUser) {
    return <Redirect href="/auth" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.dark,
          borderTopWidth: 1,
          borderTopColor: Colors.card2,
          elevation: 0,
          shadowOpacity: 0,
          minHeight: 60 + (insets.bottom > 0 ? insets.bottom : 12),
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          paddingTop: 8,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="restaurant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => {
            const count = getCartCount();
            return (
              <View>
                <Ionicons name="cart" size={size} color={color} />
                {count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                )}
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.dark,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
});
