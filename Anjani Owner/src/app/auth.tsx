import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, TextInput, Platform, Modal, ActivityIndicator, Image, Keyboard } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
import { AnimatedDeliveryTrack } from '../components/AnimatedDeliveryTrack';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling helper
const scale = Math.min(SCREEN_WIDTH / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);



export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginFromCloud } = useAppStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Shared Background Pan/Zoom
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  const emailGlow = useRef(new Animated.Value(0)).current;
  const passwordGlow = useRef(new Animated.Value(0)).current;
  
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

  const brandCinematicOpacity = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const brandCompactOpacity = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const keyboardBrandOpacity = keyboardAnim.interpolate({
    inputRange: [0, 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const keyboardBrandScale = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.90],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // Autofill last login email
    const fetchLastLogin = async () => {
      try {
        const lastEmail = await AsyncStorage.getItem('anjani_last_login_email');
        if (lastEmail) {
          setEmail(lastEmail);
        }
      } catch (e) {}
    };
    fetchLastLogin();
  }, []);

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



  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (!isFirebaseConfigured) {
        throw new Error("Firebase is not configured. Real auth requires Firebase.");
      }

      // 1. Authenticate with live Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      
      // 2. Fetch user profile from Firestore and populate Zustand state
      const success = await loginFromCloud(userCredential.user.uid);
      
      if (!success) {
        // If no user profile found, bootstrap a default Owner profile
        await login({
          uid: userCredential.user.uid,
          name: '',
          phone: '',
          email: userCredential.user.email || '',
          address: '',
          addresses: [],
          selectedAddressId: '',
          role: 'owner',
        });
      }

      setLoading(false);
      router.replace('/(tabs)');
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

      <KeyboardAwareScrollView 
        style={{ flex: 1, backgroundColor: 'transparent', marginTop: Math.max(insets.top, 20) }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, 20)
          }
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={30}
      >
          {/* Brand Box */}
          <Animated.View 
            style={[
              styles.brandBox, 
              { 
                zIndex: 10,
                transform: [
                  { translateY: titleTranslateY },
                  { scale: keyboardBrandScale }
                ] 
              }
            ]}
          >
            {/* Cinematic (Two-line) Title */}
            <Animated.View style={{ opacity: brandCinematicOpacity, alignItems: 'center', width: '100%' }}>
              <Text style={styles.title}>ANJANI RESTAURANT</Text>
              <Text style={styles.titleSecond}>OWNER</Text>
            </Animated.View>

            {/* Compact (Single-line) Title */}
            <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', opacity: brandCompactOpacity }} pointerEvents="none">
              <Text style={styles.compactTitle}>
                ANJANI RESTAURANT <Text style={{ fontWeight: '300' }}>OWNER</Text>
              </Text>
            </Animated.View>
            
            {/* Animated Divider & Tagline Wrapper */}
            <Animated.View style={{ opacity: keyboardBrandOpacity, alignItems: 'center', width: '100%', transform: [{ scaleY: keyboardBrandOpacity }] }}>
              <AnimatedDeliveryTrack />
              
              {/* Tagline */}
              <View style={styles.taglineWrapper}>
                <Animated.Text style={[styles.tagline, { opacity: splashOpacity }]}>
                  Kitchen & Dispatch Operations Suite
                </Animated.Text>
              </View>
            </Animated.View>
          </Animated.View>

          {/* Fade In & Slide Up Auth Form */}
          <Animated.View 
            style={[
              styles.actionBox, 
              { 
                opacity: authOpacity, 
                transform: [
                  { translateY: formTranslateY }
                ] 
              }
            ]}
          >
            
            {/* Console Header */}
            <View style={styles.consoleHeader}>
              <Ionicons name="shield-checkmark" size={normalize(22)} color="#FF6B00" style={{ marginBottom: 4 }} />
              <Text style={styles.consoleTitle}>OWNER MANAGEMENT PORTAL</Text>
              <Text style={styles.consoleSubtitle}>Authorized Administrative Access Only</Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <View style={{ position: 'relative' }}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Administrative Email"
                    placeholderTextColor="#888"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => {
                      Animated.timing(emailGlow, { toValue: 1, duration: 250, useNativeDriver: true }).start();
                    }}
                    onBlur={() => {
                      Animated.timing(emailGlow, { toValue: 0, duration: 250, useNativeDriver: true }).start();
                    }}
                  />
                </View>
                <Animated.View style={[styles.inputWrapperActiveBorder, { opacity: emailGlow }]} pointerEvents="none" />
              </View>

              <View style={{ position: 'relative' }}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input}
                    placeholder="Security Password"
                    placeholderTextColor="#888"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => {
                      Animated.timing(passwordGlow, { toValue: 1, duration: 250, useNativeDriver: true }).start();
                    }}
                    onBlur={() => {
                      Animated.timing(passwordGlow, { toValue: 0, duration: 250, useNativeDriver: true }).start();
                    }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={normalize(18)} color="#AAA" />
                  </TouchableOpacity>
                </View>
                <Animated.View style={[styles.inputWrapperActiveBorder, { opacity: passwordGlow }]} pointerEvents="none" />
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
                onPress={handleSignIn}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.primaryBtnTxt}>
                    Secure Sign In
                  </Text>
                )}
              </TouchableOpacity>
            </View>

          </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
    paddingTop: normalize(40),
    paddingHorizontal: normalize(20),
    gap: normalize(16),
  },
  brandBox: {
    alignItems: 'center',
  },
  title: {
    fontSize: normalize(28),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: normalize(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  titleSecond: {
    fontSize: normalize(24),
    fontWeight: '300',
    color: '#FFF',
    letterSpacing: normalize(6),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: normalize(20),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: normalize(2),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },

  taglineWrapper: {
    height: 20, 
    justifyContent: 'center', 
    alignItems: 'center',
    width: '100%',
  },
  tagline: {
    fontSize: normalize(12),
    fontWeight: '500',
    color: '#E0E0E0',
    letterSpacing: normalize(3),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  actionBox: {
    width: '100%',
    maxWidth: 400, 
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.6)',
    borderRadius: normalize(20),
    padding: normalize(18),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
  consoleHeader: {
    alignItems: 'center',
    marginBottom: normalize(20),
    paddingTop: normalize(6),
  },
  consoleTitle: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: '#FF6B00',
    letterSpacing: normalize(1.5),
    textAlign: 'center',
  },
  consoleSubtitle: {
    fontSize: normalize(11),
    fontWeight: '500',
    color: '#9A8A72',
    marginTop: normalize(2),
    textAlign: 'center',
  },
  inputWrapperActiveBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: '#FF6D00',
    borderRadius: normalize(10),
    shadowColor: '#FF6D00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
});
