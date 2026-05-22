import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, TextInput, KeyboardAvoidingView, Platform, Modal, ScrollView, ActivityIndicator, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import AnimatedReanimated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive scaling helper
const scale = Math.min(SCREEN_WIDTH / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login, loginFromCloud } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signup');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Animation State ---
  // Shared Background Pan/Zoom
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  
  // Crossfade & Morphing
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const authOpacity = useRef(new Animated.Value(0)).current;
  
  // Movement
  const titleTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.25)).current; // Starts pushed down
  const formTranslateY = useRef(new Animated.Value(40)).current; // Starts slightly low
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

  // Keyboard responsive interpolations
  const keyboardBrandY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -normalize(40)],
  });
  const keyboardBrandScale = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.72],
  });
  const keyboardBrandOpacity = keyboardAnim.interpolate({
    inputRange: [0, 0.6],
    outputRange: [1, 0],
  });
  const keyboardFormY = keyboardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -normalize(25)],
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

    // 2. Cinematic Crossfade and Morph Sequence
    const timer = setTimeout(() => {
      Animated.parallel([
        // Crossfade Backgrounds and Overlays
        Animated.timing(splashOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
        Animated.timing(authOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
        
        // Glide Title Up to the top
        Animated.timing(titleTranslateY, { toValue: 0, duration: 1800, useNativeDriver: true }),
        
        // Glide Form up and fade in
        Animated.timing(formTranslateY, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]).start();
    }, 2800); // Wait 2.8 seconds showing the Splash screen before transitioning

    return () => clearTimeout(timer);
  }, []);

  const handleSignUp = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    
    if (!isFirebaseConfigured) {
      // Mock Fallback
      setTimeout(() => {
        login({
          uid: 'mock-user-' + Math.floor(Math.random() * 1000),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: 'Sri Venkateswara Temple, Street Cinema Center, Peddapuram, Andhra Pradesh 533437',
          addresses: [],
          selectedAddressId: '',
        });
        setLoading(false);
        router.replace('/(tabs)');
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
        address: 'Sri Venkateswara Temple, Street Cinema Center, Peddapuram, Andhra Pradesh 533437',
        addresses: [],
        selectedAddressId: '',
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already in use. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
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
            name: 'Arjun Reddy',
            phone: '+91 90327 56266',
            email: email.trim(),
            address: 'Sri Venkateswara Temple, Street Cinema Center, Peddapuram, Andhra Pradesh 533437',
            addresses: [],
            selectedAddressId: '',
          });
        }
        setLoading(false);
        router.replace('/(tabs)');
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
          name: 'Arjun Reddy',
          phone: '+91 90327 56266',
          email: email.trim(),
          address: 'Sri Venkateswara Temple, Street Cinema Center, Peddapuram, Andhra Pradesh 533437',
          addresses: [],
          selectedAddressId: '',
        });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Sign in error:', err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please try again.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (emailAddress: string, displayName: string) => {
    setShowGoogleModal(false);
    setLoading(true);
    setError('');

    if (!isFirebaseConfigured) {
      // Mock Fallback
      setTimeout(() => {
        login({
          uid: 'mock-google-' + emailAddress.split('@')[0],
          name: displayName,
          phone: '+91 90327 56266',
          email: emailAddress,
          address: 'Sri Venkateswara Temple, Street Cinema Center, Peddapuram, Andhra Pradesh 533437',
          addresses: [],
          selectedAddressId: '',
        });
        setLoading(false);
        router.replace('/(tabs)');
      }, 1000);
      return;
    }

    try {
      const testPassword = 'google-test-123';
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, emailAddress, testPassword);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          userCredential = await createUserWithEmailAndPassword(auth, emailAddress, testPassword);
        } else {
          throw err;
        }
      }
      
      const user = userCredential.user;
      const profileExists = await loginFromCloud(user.uid);
      if (!profileExists) {
        await login({
          uid: user.uid,
          name: displayName,
          phone: '+91 90327 56266',
          email: emailAddress,
          address: 'Sri Venkateswara Temple, Street Cinema Center, Peddapuram, Andhra Pradesh 533437',
          addresses: [],
          selectedAddressId: '',
        });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Google mock sign-in error:', err);
      setError('Google sign-in error: ' + err.message);
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
        blurRadius={4}
      />
      {/* Background 2: Auth Screen Empty Restaurant Image */}
      <Animated.Image 
        source={require('../../assets/images/auth-bg-3.png')}
        style={[styles.bgImage, { opacity: authOpacity, transform: [{ scale: imageScale }, { translateX: imageTranslateX }] }]}
        resizeMode="cover"
        blurRadius={6}
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
              paddingTop: Math.max(insets.top, 20),
              paddingBottom: Math.max(insets.bottom, 20)
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
                transform: [
                  { translateY: titleTranslateY },
                  { translateY: keyboardBrandY },
                  { scale: keyboardBrandScale }
                ] 
              }
            ]}
          >
            <Text style={styles.title}>ANJANI</Text>
            <Text style={styles.titleSecond}>RESTAURANT</Text>
            
            {/* Animated Divider & Tagline Wrapper which fades out on keyboard */}
            <Animated.View style={{ opacity: keyboardBrandOpacity, alignItems: 'center', width: '100%', transform: [{ scaleY: keyboardBrandOpacity }] }}>
              <View style={styles.divider} />
              
              {/* Tagline (Splash Screen Only) */}
              <View style={styles.taglineWrapper}>
                <Animated.Text style={[styles.tagline, { opacity: splashOpacity }]}>
                  Served Hot, Crafted with Love
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
                  { translateY: formTranslateY },
                  { translateY: keyboardFormY }
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
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#888"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {error ? (
                <Text style={styles.errorText}>{error}</Text>
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

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orTxt}>OR</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity 
                style={styles.googleBtn} 
                onPress={() => setShowGoogleModal(true)}
                disabled={loading}
              >
                <Ionicons name="logo-google" size={normalize(18)} color="#FFF" />
                <Text style={styles.googleBtnTxt}>Continue with Google</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Account Selector Mock Modal */}
      {showGoogleModal && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalBackdrop}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowGoogleModal(false)} />
            
            <AnimatedReanimated.View 
              entering={SlideInDown.duration(350)} 
              exiting={SlideOutDown.duration(250)}
              style={[styles.googleModal, { paddingBottom: Math.max(insets.bottom, 24) }]}
            >
              <View style={styles.modalHandle} />
              <Ionicons name="logo-google" size={normalize(28)} color={Colors.text} style={{ alignSelf: 'center', marginBottom: normalize(14) }} />
              <Text style={styles.modalTitle}>Choose an account</Text>
              <Text style={styles.modalSub}>to continue to Anjani Restaurant</Text>

              <View style={styles.accountList}>
                <TouchableOpacity style={styles.accountRow} onPress={() => handleGoogleLogin('arjun@example.com', 'Arjun Reddy')}>
                  <View style={styles.accountAvatar}>
                    <Text style={styles.avatarTxt}>A</Text>
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>Arjun Reddy</Text>
                    <Text style={styles.accountEmail}>arjun@example.com</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.accountRow} onPress={() => handleGoogleLogin('arjun.work@gmail.com', 'Arjun Reddy Work')}>
                  <View style={[styles.accountAvatar, { backgroundColor: '#4285F4' }]}>
                    <Text style={styles.avatarTxt}>A</Text>
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>Arjun Reddy Work</Text>
                    <Text style={styles.accountEmail}>arjun.work@gmail.com</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.accountRow} onPress={() => setShowGoogleModal(false)}>
                  <View style={[styles.accountAvatar, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#DDD' }]}>
                    <Ionicons name="person-add-outline" size={normalize(18)} color="#555" />
                  </View>
                  <View style={styles.accountDetails}>
                    <Text style={styles.accountName}>Add another account</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </AnimatedReanimated.View>
          </View>
        </Modal>
      )}
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
    justifyContent: 'center', 
    paddingHorizontal: normalize(20),
    gap: normalize(16),
  },
  brandBox: {
    alignItems: 'center',
  },
  title: {
    fontSize: normalize(34),
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: normalize(6),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  titleSecond: {
    fontSize: normalize(30),
    fontWeight: '300',
    color: '#FFF',
    letterSpacing: normalize(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  divider: {
    width: normalize(50),
    height: 2,
    backgroundColor: '#FF6D00',
    marginVertical: normalize(16),
    shadowColor: '#E65100',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
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
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: normalize(2),
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  orTxt: {
    color: '#888',
    marginHorizontal: normalize(14),
    fontSize: normalize(11),
    fontWeight: 'bold',
  },
  googleBtn: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    height: normalize(48),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: normalize(10),
  },
  googleBtnTxt: {
    color: '#FFF',
    fontSize: normalize(14),
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: normalize(12),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: normalize(4),
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  googleModal: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    padding: normalize(24),
  },
  modalHandle: {
    width: normalize(40),
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: normalize(20),
  },
  modalTitle: {
    fontSize: normalize(18),
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: normalize(13),
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: normalize(24),
    marginTop: 4,
  },
  accountList: {
    gap: normalize(14),
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: normalize(8),
  },
  accountAvatar: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#0F9D58',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: normalize(14),
  },
  avatarTxt: {
    color: '#FFF',
    fontSize: normalize(16),
    fontWeight: 'bold',
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: normalize(15),
    fontWeight: '600',
    color: Colors.text,
  },
  accountEmail: {
    fontSize: normalize(13),
    color: Colors.muted,
    marginTop: 2,
  },
});
