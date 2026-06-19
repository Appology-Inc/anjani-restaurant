/**
 * @file auth.tsx
 * @description Authentication screen providing sign-in and sign-up functionality.
 * Features a cinematic animated background, dynamic keyboard handling, and 
 * integration with Firebase Authentication.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppologyBrand } from '@/components/AppologyBrand';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, TextInput, KeyboardAvoidingView, Platform, Modal, ScrollView, ActivityIndicator, Keyboard, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import AnimatedReanimated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';

const { width: INITIAL_WIDTH } = Dimensions.get('window');

// Fluid scaling helper for Web (clamp) & Native (scale)
const scale = INITIAL_WIDTH > 0 ? Math.min(INITIAL_WIDTH / 375, 1.2) : 1;

/**
 * Normalizes a size based on screen width using the computed scale factor.
 * 
 * @param {number} size - The base size to scale.
 * @returns {number} The normalized pixel value.
 */
export const normalize = (size: number) => Math.round(size * scale);

/**
 * Creates a fluid size value depending on the platform.
 * Returns a CSS `clamp()` string for web, and a normalized number for native.
 * 
 * @param {number} min - Minimum value in pixels.
 * @param {number} prefVw - Preferred value in viewport width (vw) for web.
 * @param {number} max - Maximum value in pixels for web.
 * @returns {any} Fluid size value suitable for the current platform.
 */
export const fluid = (min: number, prefVw: number, max: number): any => {
  return Platform.OS === 'web' 
    ? `clamp(${min}px, ${prefVw}vw, ${max}px)` 
    : normalize(min);
};

/**
 * AnimatedDeliveryTrack Component
 * 
 * Renders a decorative track with a moving icon that travels left to right.
 * The icon cycles through three phases: Food (restaurant) -> Rider (bicycle) -> Home.
 * 
 * @returns {React.JSX.Element} The animated track component.
 */
function AnimatedDeliveryTrack() {
  const travelAnim = useRef(new Animated.Value(0)).current;
  const [iconPhase, setIconPhase] = useState<'food' | 'rider' | 'home'>('food');

  useEffect(() => {
    const duration = 3200;

    const runAnim = () => {
      travelAnim.setValue(0);
      setIconPhase('food');
      Animated.timing(travelAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) runAnim();
      });
    };

    runAnim();

    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    const startTimers = () => {
      t1 = setTimeout(() => setIconPhase('rider'), duration * 0.33);
      t2 = setTimeout(() => setIconPhase('home'),  duration * 0.66);
      t3 = setTimeout(() => startTimers(), duration);
    };
    startTimers();

    return () => {
      travelAnim.stopAnimation();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  const trackWidth     = normalize(120);
  const containerSize  = normalize(18);

  const translateX = travelAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, trackWidth - containerSize],
  });

  const iconOpacity = travelAnim.interpolate({
    inputRange:  [0, 0.12, 0.88, 1],
    outputRange: [0, 1,    1,    0],
  });

  const iconScale = travelAnim.interpolate({
    inputRange:  [0, 0.12, 0.88, 1],
    outputRange: [0.85, 1.05, 1.05, 0.85],
  });

  const getIconName = (): 'restaurant-outline' | 'bicycle-outline' | 'home-outline' => {
    switch (iconPhase) {
      case 'food':  return 'restaurant-outline';
      case 'rider': return 'bicycle-outline';
      case 'home':  return 'home-outline';
    }
  };

  return (
    <View style={styles.trackContainer}>
      <View style={styles.trackRoad} />
      {fontsLoaded && (
        <Animated.View
          style={[
            styles.travelingIcon,
            { opacity: iconOpacity, transform: [{ translateX }, { scale: iconScale }] },
          ]}
        >
          <Ionicons name={getIconName()} size={normalize(13)} color="#FF6B00" />
        </Animated.View>
      )}
    </View>
  );
}

/**
 * AuthScreen Component
 * 
 * Main authentication view allowing users to sign up or sign in.
 * Includes complex cinematic and keyboard-driven animations, fallback mock login
 * (if Firebase is unconfigured), and conditional routing based on location availability.
 * 
 * @returns {React.JSX.Element} The authentication screen.
 */
export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginFromCloud, bootLocation } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signup');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Animation State ---
  // Shared Background Pan/Zoom
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  
  // Crossfade & Morphing
  const splashOpacity = useRef(new Animated.Value(0)).current;
  const authOpacity = useRef(new Animated.Value(1)).current;
  
  // Movement
  const titleTranslateY = useRef(new Animated.Value(0)).current; 
  const formTranslateY = useRef(new Animated.Value(0)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 1,
        duration: e?.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardAnim, {
        toValue: 0,
        duration: e?.duration || 250,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    // Autofill last login email
    const fetchLastLogin = async () => {
      try {
        const lastEmail = await AsyncStorage.getItem('anjani_last_login_email');
        const lastPassword = await AsyncStorage.getItem('anjani_last_login_password');
        if (lastEmail) {
          setEmail(lastEmail);
          setActiveTab('signin'); // Default to signin if we have a saved email
        }
        if (lastPassword) {
          setPassword(lastPassword);
        }
      } catch (e) {}
    };
    fetchLastLogin();
  }, []);

  // Keyboard responsive interpolations
  const keyboardBrandScale = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.90],
  });
  const formKeyboardY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -normalize(75)],
  });
  const keyboardBrandOpacity = keyboardAnim.interpolate({
    inputRange: [0, 0.6],
    outputRange: [1, 0],
  });
  const keyboardGroupY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -normalize(70)],
  });

  const brandCinematicOpacity = keyboardAnim.interpolate({
    inputRange: [0, 0.35],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const brandCompactOpacity = keyboardAnim.interpolate({
    inputRange: [0.35, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // 1. Continuous slow cinematic pan for BOTH backgrounds
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(imageScale, { toValue: 1.15, duration: 18000, useNativeDriver: true }),
          Animated.timing(imageScale, { toValue: 1, duration: 18000, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(imageTranslateX, { toValue: -20, duration: 18000, useNativeDriver: true }),
          Animated.timing(imageTranslateX, { toValue: 0, duration: 18000, useNativeDriver: true })
        ])
      ])
    ).start();

    // No timeout needed; index.tsx handles the boot animation now.
  }, []);

  const handleSignUp = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (name.trim().length < 2) {
      setError('Please enter a valid name');
      return;
    }
    setLoading(true);
    setError('');
    
    if (!isFirebaseConfigured) {
      // Mock Fallback
      setTimeout(async () => {
        login({
          uid: 'mock-user-999',
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: '',
          addresses: [],
          selectedAddressId: '',
          latitude: bootLocation?.latitude,
          longitude: bootLocation?.longitude,
        });
        await AsyncStorage.setItem('anjani_last_login_email', email.trim());
        await AsyncStorage.setItem('anjani_last_login_password', password.trim());
        setLoading(false);
        router.replace('/address-setup');
      }, 1000);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;
      
      await login({
        uid: user.uid,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: '',
        addresses: [],
        selectedAddressId: '',
        latitude: bootLocation?.latitude,
        longitude: bootLocation?.longitude,
      });
      await AsyncStorage.setItem('anjani_last_login_password', password.trim());
      router.replace('/address-setup');
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = 'An unexpected error occurred.\nPlease try again.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered.\nPlease sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network error.\nPlease check your internet connection.';
      } else if (err.message) {
        msg = err.message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/.*\)\.?$/, '');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');

    if (!isFirebaseConfigured) {
      // Mock Fallback
      setTimeout(async () => {
        const success = await loginFromCloud(email.trim());
        if (!success) {
          await login({
            uid: 'mock-user-999',
            name: '',
            phone: '',
            email: email.trim(),
            address: '',
            addresses: [],
            selectedAddressId: '',
            latitude: bootLocation?.latitude,
            longitude: bootLocation?.longitude,
          });
        }
        await AsyncStorage.setItem('anjani_last_login_email', email.trim());
        await AsyncStorage.setItem('anjani_last_login_password', password.trim());
        setLoading(false);
        const currentUser = useAppStore.getState().currentUser;
        if (!currentUser?.address || currentUser.address.trim() === '') {
          router.replace('/address-setup');
        } else {
          router.replace('/(tabs)');
        }
      }, 1000);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const user = userCredential.user;
      
      const profileExists = await loginFromCloud(user.uid);
      if (!profileExists) {
        await login({
          uid: user.uid,
          name: '',
          phone: '',
          email: email.trim(),
          address: '',
          addresses: [],
          selectedAddressId: '',
          latitude: bootLocation?.latitude,
          longitude: bootLocation?.longitude,
        });
      }
      await AsyncStorage.setItem('anjani_last_login_password', password.trim());
      
      const currentUser = useAppStore.getState().currentUser;
      
      let isNewLocation = false;
      if (bootLocation && currentUser?.addresses && currentUser.addresses.length > 0) {
        const isClose = currentUser.addresses.some(addr => {
          if (!addr.latitude || !addr.longitude) return false;
          const dLat = (addr.latitude - bootLocation.latitude) * 111;
          const dLng = (addr.longitude - bootLocation.longitude) * 111 * Math.cos(bootLocation.latitude * Math.PI / 180);
          const distKm = Math.sqrt(dLat*dLat + dLng*dLng);
          return distKm < 0.15; // within 150 meters to account for indoor GPS drift
        });
        if (!isClose) isNewLocation = true;
      }

      if (!currentUser?.address || currentUser.address.trim() === '' || isNewLocation) {
        router.replace({ pathname: '/address-setup', params: { newLocation: isNewLocation ? 'true' : 'false' } });
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      let msg = 'An unexpected error occurred.\nPlease try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect email or password.\nPlease try again.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Incorrect password.\nPlease try again.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts.\nPlease try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network error.\nPlease check your internet connection.';
      } else if (err.message) {
        msg = err.message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/.*\)\.?$/, '');
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* Background 1: Splash Screen Image */}
      <Animated.Image 
        source={require('../../assets/images/cinematic-bg.png')}
        style={[styles.bgImage, { opacity: splashOpacity, transform: [{ scale: imageScale }, { translateX: imageTranslateX }] }]}
        resizeMode="cover"
      />
      {/* Background 2: Auth Screen Empty Restaurant Image */}
      <Animated.Image 
        source={require('../../assets/images/auth-bg-3.png')}
        style={[styles.bgImage, { opacity: authOpacity, transform: [{ scale: imageScale }, { translateX: imageTranslateX }] }]}
        resizeMode="cover"
      />

      {/* Crossfading Overlays */}
      <Animated.View style={[styles.overlay, { opacity: splashOpacity, backgroundColor: 'rgba(0, 0, 0, 0.75)' }]} pointerEvents="none" />
      <Animated.View style={[styles.overlay, { opacity: authOpacity, backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} pointerEvents="none" />

      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: 'transparent' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Platform.OS === 'web' ? 'calc(20px + env(safe-area-inset-top))' : Math.max(insets.top, 20),
              paddingBottom: Platform.OS === 'web' ? 'calc(20px + env(safe-area-inset-bottom))' : Math.max(insets.bottom, 20)
            }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Morphing Brand Box */}
          <Animated.View 
            style={[
              styles.brandBox, 
              { 
                zIndex: 10,
                transform: [
                  { translateY: titleTranslateY },
                  { translateY: keyboardGroupY },
                  { scale: keyboardBrandScale }
                ] 
              }
            ]}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              style={{ width: '100%', alignItems: 'center' }}
              onPress={() => {
                if (Platform.OS === 'web' && (window as any).triggerInstallPrompt) {
                  (window as any).triggerInstallPrompt();
                }
              }}
            >
              {/* Cinematic (Two-line) Title */}
            <Animated.View style={{ opacity: brandCinematicOpacity, alignItems: 'center', width: '100%' }}>
              <Text style={styles.title}>ANJANI</Text>
              <Text style={styles.titleSecond}>RESTAURANT</Text>
            </Animated.View>

            {/* Compact (Single-line) Title */}
            <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', opacity: brandCompactOpacity }} pointerEvents="none">
              <Text style={styles.compactTitle}>
                ANJANI <Text style={{ fontWeight: '300' }}>RESTAURANT</Text>
              </Text>
            </Animated.View>
            
            {/* Animated Divider & Tagline Wrapper which fades out on keyboard */}
            <Animated.View style={{ opacity: keyboardBrandOpacity, alignItems: 'center', width: '100%', transform: [{ scaleY: keyboardBrandOpacity }] }}>
              <AnimatedDeliveryTrack />
              
              {/* Tagline (Splash Screen Only) */}
              <View style={styles.taglineWrapper}>
                <Animated.Text style={[styles.tagline, { opacity: splashOpacity }]}>
                  Served Hot, Crafted with Love
                </Animated.Text>
              </View>
            </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Fade In & Slide Up Auth Form */}
          <Animated.View 
            style={[
              styles.actionBox, 
              { 
                opacity: authOpacity, 
                transform: [
                  { translateY: formTranslateY },
                  { translateY: formKeyboardY },
                  { translateY: keyboardGroupY }
                ] 
              }
            ]}
          >
            
            {/* Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'signup' && styles.tabBtnActive]} 
                onPress={() => {
                  setActiveTab('signup');
                  setError('');
                }}
              >
                <Text style={[styles.tabTxt, activeTab === 'signup' && styles.tabTxtActive]}>Sign Up</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, activeTab === 'signin' && styles.tabBtnActive]} 
                onPress={() => {
                  setActiveTab('signin');
                  setError('');
                }}
              >
                <Text style={[styles.tabTxt, activeTab === 'signin' && styles.tabTxtActive]}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              {activeTab === 'signup' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor="#888"
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              )}

              {activeTab === 'signup' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Phone Number"
                    placeholderTextColor="#888"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#888"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                <TextInput 
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Password"
                  placeholderTextColor="#888"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: normalize(8) }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={normalize(18)} color="#AAA" />
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={normalize(16)} color="#FF453A" style={{ marginRight: normalize(6) }} />
                  <Text style={styles.errorText}>{error}</Text>
                  <View style={{ width: normalize(16 + 6) }} />
                </View>
              ) : null}

              <TouchableOpacity 
                style={styles.primaryBtn} 
                onPress={activeTab === 'signin' ? handleSignIn : handleSignUp}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnTxt}>
                    {activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </Animated.View>

          {/* Legal Footer */}
          <View style={{ alignItems: 'center', marginTop: normalize(16), paddingHorizontal: normalize(20) }}>
            <Text style={{ fontSize: normalize(11), color: '#888', textAlign: 'center', lineHeight: normalize(16) }}>
              By signing in or signing up, you agree to our{'\n'}
              <Text 
                style={{ color: '#FF6D00', textDecorationLine: 'underline' }}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.open('https://anjanirestaurant.web.app/terms.html', '_blank');
                  } else {
                    import('react-native').then(({ Linking }) => Linking.openURL('https://anjanirestaurant.web.app/terms.html'));
                  }
                }}
              >
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text 
                style={{ color: '#FF6D00', textDecorationLine: 'underline' }}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.open('https://anjanirestaurant.web.app/privacy.html', '_blank');
                  } else {
                    import('react-native').then(({ Linking }) => Linking.openURL('https://anjanirestaurant.web.app/privacy.html'));
                  }
                }}
              >
                Privacy Policy
              </Text>.
            </Text>
          </View>

          {/* Appology Footer Badge */}
          <View style={{ marginTop: 'auto', paddingTop: normalize(40), alignItems: 'center' }}>
            <Text style={{ fontSize: normalize(12), color: '#AAA', fontWeight: '500' }}>
              Powered by{' '}
              <Text 
                style={{ color: '#FF6B00', fontWeight: '800', fontStyle: 'italic',  }}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.open('https://appology-inc.github.io/', '_blank', 'noopener,noreferrer');
                  } else {
                    import('react-native').then(({ Linking }) => Linking.openURL('https://appology-inc.github.io/'));
                  }
                }}
              >
                <AppologyBrand />
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center', 
    paddingHorizontal: normalize(20),
    gap: normalize(16),
  },
  brandBox: {
    alignItems: 'center',
  },
  title: {
    fontSize: fluid(28, 8, 48),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: fluid(4, 1.5, 8),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  titleSecond: {
    fontSize: fluid(22, 6, 40),
    fontWeight: '300',
    color: '#FFF',
    letterSpacing: fluid(2, 1, 6),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: fluid(20, 5, 36),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: fluid(2, 1, 6),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  trackContainer: {
    width: normalize(120),
    height: normalize(20),
    justifyContent: 'center',
    marginVertical: normalize(16),
    position: 'relative',
    alignItems: 'flex-start',
  },
  trackRoad: {
    height: 1.5,
    backgroundColor: 'rgba(255, 107, 0, 0.22)',
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  travelingIcon: {
    width: normalize(18),
    height: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
  },
  taglineWrapper: {
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    width: '100%',
  },
  tagline: {
    fontSize: fluid(10, 2.5, 16),
    fontWeight: '500',
    color: '#E0E0E0',
    letterSpacing: fluid(2, 0.5, 4),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  actionBox: {
    width: '100%',
    maxWidth: fluid(320, 85, 460), 
    alignSelf: 'center',
    backgroundColor: Colors.card,
    borderRadius: fluid(16, 4, 28),
    padding: fluid(16, 4, 28),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: normalize(14),
    padding: normalize(4),
    marginBottom: normalize(16),
  },
  tabBtn: {
    flex: 1,
    paddingVertical: normalize(10),
    alignItems: 'center',
    borderRadius: normalize(10),
  },
  tabBtnActive: {
    backgroundColor: '#FF6D00',
  },
  tabTxt: {
    color: '#AAA',
    fontSize: normalize(13),
    fontWeight: '600',
  },
  tabTxtActive: {
    color: '#FFF',
  },
  formContainer: {
    gap: normalize(14),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: normalize(10),
    paddingHorizontal: normalize(14),
    height: normalize(48),
  },
  inputIcon: {
    marginRight: normalize(10),
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: normalize(14),
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: '#FF6D00',
    height: normalize(48),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(4),
    shadowColor: '#FF6D00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  primaryBtnTxt: {
    color: '#FFF',
    fontSize: normalize(14),
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: normalize(8),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(14),
    marginTop: normalize(4),
  },
  errorText: {
    color: '#FF453A',
    fontSize: normalize(12),
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
});
