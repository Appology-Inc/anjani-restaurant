import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export default function InstallPromptOverlay() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(100)).current; // starts offscreen

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // One-time reset: clear old dismissal so users see the fixed install prompt
    if (!localStorage.getItem('anjani_rider_pwa_v6')) {
      localStorage.removeItem('anjani_rider_install_dismissed');
      localStorage.setItem('anjani_rider_pwa_v6', 'true');
    }

    // 1. Android / Chrome prompt event listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).pwaDeferredPrompt = e;
      setIsIOS(false);
      
      // Auto-show only if not dismissed previously
      const isDismissed = localStorage.getItem('anjani_rider_install_dismissed');
      if (isDismissed !== 'true') {
        showPrompt();
      }
    };

    // Check if the event fired before we mounted
    if ((window as any).pwaDeferredPrompt) {
      handleBeforeInstallPrompt((window as any).pwaDeferredPrompt);
    }

    // 2. iOS Safari detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/crios|fxios|opt|opios/.test(userAgent);
    
    // Check if already in PWA standalone mode
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches;

    if (isIOSDevice && isSafari && !isStandalone) {
      setIsIOS(true);
      const isDismissed = localStorage.getItem('anjani_rider_install_dismissed');
      if (isDismissed !== 'true') {
        const timer = setTimeout(() => {
          showPrompt();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // Expose a global hook to manually trigger the prompt (e.g. from header clicks)
    (window as any).triggerInstallPrompt = () => {
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
        localStorage.setItem('anjani_rider_install_dismissed', 'true');
      }
    });
  };

  const handleInstallPress = async () => {
    const prompt = deferredPrompt || (window as any).pwaDeferredPrompt;
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
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      console.log(`Rider PWA installation choice outcome: ${outcome}`);
    } catch (err) {
      console.error('Failed to trigger Rider PWA install prompt:', err);
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
            <Ionicons name="bicycle" size={24} color="#FFF" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Install Anjani Rider</Text>
            <Text style={styles.subtitle}>Stay updated with live dispatch &amp; route navigation</Text>
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
                <Text style={styles.benefitText}>Persistent background location alerts</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>📲</Text>
                <Text style={styles.benefitText}>Access directly from your Home Screen</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>🔔</Text>
                <Text style={styles.benefitText}>Instant notifications for new requests</Text>
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
    backgroundColor: 'rgba(10, 12, 18, 0.95)',
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
    marginBottom: Platform.OS === 'web' ? 0 : 20,
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
