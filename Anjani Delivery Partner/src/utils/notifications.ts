/**
 * @file notifications.ts
 * @description Utility functions for managing push notifications across different platforms (iOS, Android, Web).
 * Handles token registration and local notification scheduling.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
 * Retrieves the Firebase Cloud Messaging (FCM) token if applicable.
 * 
 * @returns {Promise<string | null>} The FCM push token, or null if permissions are denied or unsupported.
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Web notification permission denied.');
        } else {
          console.log('Web notification permission granted.');
        }
      } catch (error) {
        console.warn('Failed to request web notification permission:', error);
      }
    }
    return null;
  }

  // Set up specific notification channel for Android 8.0+ (Oreo)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
      });
    } catch (e) {}
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get notification permissions');
        return null;
      }

      // Fetch FCM Token using React Native Firebase
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
 * Schedules a local push notification immediately.
 * Falls back to standard browser notifications on the web if supported.
 * 
 * @param {string} title - The title of the notification.
 * @param {string} body - The main body text of the notification.
 */
export async function scheduleLocalNotification(title: string, body: string) {
  if (Platform.OS === 'web' || !Notifications || typeof Notifications.scheduleNotificationAsync !== 'function') {
    console.log(`[Web Notification] ${title}: ${body}`);
    if (typeof window !== 'undefined' && 'Notification' in window && (Notification as any).permission === 'granted') {
      new Notification(title, { body });
    }
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.warn('Failed to schedule local notification', error);
  }
}
