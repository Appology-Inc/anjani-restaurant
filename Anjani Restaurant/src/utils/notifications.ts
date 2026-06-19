/**
 * @file notifications.ts
 * @description Utility functions for handling push and local notifications across iOS, Android, and Web platforms.
 * Integrates Expo Notifications and React Native Firebase Messaging.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure default notification handler for native platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    } as any),
  });
}

/**
 * Requests necessary permissions and registers the device for push notifications.
 * Sets up Android notification channels and fetches the FCM token via Firebase.
 * @returns {Promise<string | null>} The FCM token if successful, null otherwise.
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') {
    return;
  }

  let token;

  // Set up specific notification channel for Android 8.0+ (Oreo)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00', // Matches brand color
      });
    } catch (e) {}
  }

  // Only attempt permission requests and token fetching on physical devices
  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Request permission if not already granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions');
        return null;
      }

      // Fetch FCM Token using React Native Firebase for remote push notifications
      try {
        const messaging = require('@react-native-firebase/messaging').default;
        await messaging().registerDeviceForRemoteMessages();
        token = await messaging().getToken();
        console.log('FCM Token:', token);
      } catch (fcmError) {
        console.warn('Could not fetch FCM token:', fcmError);
      }
    } catch (e) {}
  }

  return token;
}

/**
 * Schedules and immediately displays a local notification to the user.
 * Supports Web (using browser Notifications API) and Native (using Expo Notifications).
 * @param {string} title - The title of the notification.
 * @param {string} body - The body text of the notification.
 */
export async function scheduleLocalNotification(title: string, body: string) {
  // Handle Web platform notifications via browser API
  if (Platform.OS === 'web' || !Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
    console.log(`[Web Notification] ${title}: ${body}`);
    if (typeof window !== 'undefined' && 'Notification' in window && (Notification as any).permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  // Schedule immediate notification for Native platforms
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // trigger: null executes immediately
    });
  } catch (error) {
    console.warn('Failed to schedule local notification', error);
  }
}
