/**
 * @file InstallPromptOverlay.tsx
 * @description A sophisticated PWA (Progressive Web App) installation prompt.
 * It handles the complexities of cross-platform PWA installation, detecting iOS Safari
 * vs Android Chrome, managing the `beforeinstallprompt` event, and providing a unified,
 * animated UI overlay to encourage users to install the app.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Dimensions, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

/**
 * InstallPromptOverlay Component
 * 
 * Manages the display and interaction logic for prompting the user to install the PWA.
 * It detects the current browser environment and renders tailored instructions (e.g.,
 * showing "Add to Home Screen" instructions for iOS Safari, or a direct "Install" button
 * for browsers that support the native install prompt).
 * 
 * @returns {React.JSX.Element | null} The overlay component, or null if hidden.
 */
export default function InstallPromptOverlay() {
  // State to manage overall visibility of the overlay
  const [visible, setVisible] = useState(false);
  // State flag for iOS Safari specific UI rendering
  const [isIOS, setIsIOS] = useState(false);
  // Stores the captured beforeinstallprompt event to trigger native prompt later
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Animation value for the background blur fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Animation value for the bottom-up slide transition
  const slideAnim = useRef(new Animated.Value(100)).current; // starts offscreen

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // One-time reset: clear old dismissal so users see the fixed install prompt
    if (!localStorage.getItem('anjani_customer_pwa_v6')) {
      localStorage.removeItem('anjani_install_dismissed');
      localStorage.setItem('anjani_customer_pwa_v6', 'true');
    }

    console.log('PWA Installer: Initializing...');
    const isDismissed = localStorage.getItem('anjani_install_dismissed');
    console.log('PWA Installer: dismissed state =', isDismissed);

    // 1. Android / Chrome prompt event listener
    // This event fires natively when Chrome determines the PWA is installable
    const handleBeforeInstallPrompt = (e: any) => {
      console.log('PWA Installer: beforeinstallprompt event captured!');
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).pwaDeferredPrompt = e;
      setIsIOS(false);
      
      // Auto-show only if not dismissed previously
      if (isDismissed !== 'true') {
        console.log('PWA Installer: Auto-showing prompt on Android/Chrome.');
        showPrompt();
      } else {
        console.log('PWA Installer: Auto-show bypassed because dismissed is true.');
      }
    };

    // Check if the event fired before we mounted
    if ((window as any).pwaDeferredPrompt) {
      handleBeforeInstallPrompt((window as any).pwaDeferredPrompt);
    }

    // 2. iOS Safari detection
    // iOS Safari does not support the beforeinstallprompt event, so we must manually detect it
    // and provide custom visual instructions for the user.
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|opt|opios/.test(userAgent);
    
    // Check if already in PWA standalone mode
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches;

    console.log('PWA Installer: Device details:', { isIOSDevice, isSafari, isStandalone });

    if (isIOSDevice && isSafari && !isStandalone) {
      setIsIOS(true);
      if (isDismissed !== 'true') {
        console.log('PWA Installer: Auto-showing prompt on iOS Safari in 3s.');
        const timer = setTimeout(() => {
          showPrompt();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // Expose a global hook to manually trigger the prompt (e.g. from header clicks)
    (window as any).triggerInstallPrompt = () => {
      console.log('PWA Installer: triggerInstallPrompt() manual trigger invoked!');
      if (isIOSDevice && isSafari && !isStandalone) {
        setIsIOS(true);
      }
      showPrompt();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      if ((window as any).triggerInstallPrompt) {
        delete (window as any).triggerInstallPrompt;
      }
    };
  }, []);

  /**
   * Initiates the entry animation sequence to display the prompt overlay.
   */
  const showPrompt = () => {
    setVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  /**
   * Initiates the exit animation sequence and optionally marks the prompt as permanently dismissed.
   * 
   * @param {boolean} permanently - If true, saves dismissal state to localStorage.
   */
  const dismissPrompt = (permanently = true) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setVisible(false);
      if (permanently && Platform.OS === 'web') {
        localStorage.setItem('anjani_install_dismissed', 'true');
      }
    });
  };

  /**
   * Handles the action when the user clicks the "Install" button (Android/Chrome).
   * It attempts to trigger the browser's native installation prompt using the
   * previously captured `beforeinstallprompt` event.
   */
  const handleInstallPress = async () => {
    // Retrieve the captured event either from local state or global fallback
    const prompt = deferredPrompt || (window as any).pwaDeferredPrompt;
    
    // If no event was captured, fallback to a manual alert message
    if (!prompt) {
      Alert.alert(
        'PWA Installation',
        'To install this app on your device, please click the browser\'s menu (usually three dots ••• or arrow icon) and select "Install App" or "Add to Home Screen".'
      );
      dismissPrompt(false);
      return;
    }
    
    // Trigger native browser install prompt immediately (ensuring direct user gesture context)
    try {
      console.log('PWA Installer: Triggering native prompt...');
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      console.log(`PWA Installer: User choice outcome: ${outcome}`);
    } catch (err) {
      console.error('PWA Installer: Failed to trigger native prompt:', err);
    }
    
    // Clear prompt state and close the overlay UI
    setDeferredPrompt(null);
    (window as any).pwaDeferredPrompt = null;
    dismissPrompt(true);
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlayContainer, { opacity: fadeAnim }]}>
      <BlurView intensity={35} tint="dark" style={styles.blurBg} />
      <Animated.View style={[styles.promptCard, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.cardHeader}>
          <View style={styles.appIconContainer}>
            <Ionicons name="restaurant" size={24} color="#FFF" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Install Anjani Restaurant</Text>
            <Text style={styles.subtitle}>Get a premium, faster ordering experience</Text>
          </View>
          <TouchableOpacity onPress={() => dismissPrompt(true)} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={Colors.muted} />
          </TouchableOpacity>
        </View>

        {isIOS ? (
          // iOS Specific Instructions
          <View style={styles.iosBody}>
            <Text style={styles.stepText}>To install this app on your iPhone:</Text>
            
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepDetail}>
                Tap the Safari <Text style={styles.highlightText}>Share</Text> button <Ionicons name="share-outline" size={16} color={Colors.primary} /> in the toolbar.
              </Text>
            </View>

            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepDetail}>
                Scroll down and select <Text style={styles.highlightText}>"Add to Home Screen"</Text> <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />.
              </Text>
            </View>

            <TouchableOpacity style={styles.gotItBtn} onPress={() => dismissPrompt(true)} activeOpacity={0.8}>
              <Text style={styles.gotItText}>Got It</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Android / Chrome Prompt
          <View style={styles.androidBody}>
            <View style={styles.benefitsList}>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>✨</Text>
                <Text style={styles.benefitText}>60fps high-performance interface</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>📲</Text>
                <Text style={styles.benefitText}>Access directly from your Home Screen</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>🚀</Text>
                <Text style={styles.benefitText}>Instant page loads & order tracking</Text>
              </View>
            </View>
            
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => dismissPrompt(true)} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Not Now</Text>
              </TouchableOpacity>
              {Platform.OS === 'web' ? (
                React.createElement('button', {
                  onClick: handleInstallPress,
                  style: {
                    flex: 2,
                    padding: '12px 0',
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: Colors.primary,
                    border: 'none',
                    color: '#FFF',
                    fontSize: 14,
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 8px rgba(255, 90, 0, 0.3)'
                  }
                }, "Install")
              ) : (
                <TouchableOpacity style={styles.installBtn} onPress={handleInstallPress} activeOpacity={0.8}>
                  <Text style={styles.installText}>Install</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 999999,
  },
  blurBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  promptCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(18, 20, 26, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: Platform.OS === 'web' ? 0 : 20, // Sit flush on web browsers
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  appIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: Colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iosBody: {
    gap: 16,
  },
  stepText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,90,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,90,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  stepDetail: {
    flex: 1,
    color: Colors.muted,
    fontSize: 12.5,
    lineHeight: 18,
  },
  highlightText: {
    color: '#FFF',
    fontWeight: '700',
  },
  gotItBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  gotItText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  androidBody: {
    gap: 16,
  },
  benefitsList: {
    gap: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  benefitEmoji: {
    fontSize: 16,
  },
  benefitText: {
    color: Colors.muted,
    fontSize: 13.5,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    color: Colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  installBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  installText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
