import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Animated, StatusBar, TextInput, Platform, Modal, ActivityIndicator, Keyboard } from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../state/AppStore';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import AnimatedReanimated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { AnimatedDeliveryTrack } from '../components/AnimatedDeliveryTrack';

const SCREEN_W = require('react-native').Dimensions.get('window').width;
const scale = Math.min(SCREEN_W / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, loginFromCloud } = useAppStore();

  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  const authOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(normalize(110))).current;
  const formTranslateY = useRef(new Animated.Value(45)).current;
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

    Animated.parallel([
      Animated.timing(authOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(titleTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(formTranslateY, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSignUp = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    
    if (!isFirebaseConfigured) {
      setTimeout(() => {
        login({
          uid: 'mock-user-' + Math.floor(Math.random() * 1000),
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: 'Gachibowli Restaurant Hub, Hyderabad',
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
        address: 'Gachibowli Restaurant Hub, Hyderabad',
        addresses: [],
        selectedAddressId: '',
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered. Please sign in instead.';
      else if (err.code === 'auth/invalid-email') msg = 'Please enter a valid email address.';
      else if (err.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
      else if (err.code === 'auth/network-request-failed') msg = 'Network error. Please check your internet connection.';
      else if (err.message) msg = err.message.replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/.*\)\.?$/, '');
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
      setTimeout(async () => {
        const success = await loginFromCloud(email.trim());
        if (!success) {
          await login({
            uid: 'mock-user-999',
            name: '',
            phone: '',
            email: email.trim(),
            address: 'Gachibowli Restaurant Hub, Hyderabad',
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
          name: '',
          phone: '',
          email: email.trim(),
          address: '',
          addresses: [],
          selectedAddressId: '',
        });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Sign in error:', err);
      let msg = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Incorrect email or password. Please try again.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network error. Please check your internet connection.';
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
      <Animated.Image 
        source={require('../../assets/images/auth-bg-3.png')}
        style={[styles.bgImage, { opacity: authOpacity, transform: [{ scale: imageScale }, { translateX: imageTranslateX }] }]}
        resizeMode="cover"
      />
      <Animated.View style={[styles.overlay, { opacity: authOpacity, backgroundColor: 'rgba(0, 0, 0, 0.65)' }]} pointerEvents="none" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.brandBox, { zIndex: 10, transform: [{ translateY: titleTranslateY }, { translateY: keyboardGroupY }, { scale: keyboardBrandScale }] }]}>
            <Animated.View style={{ opacity: brandCinematicOpacity, alignItems: 'center', width: '100%' }}>
              <Text style={styles.title}>ANJANI RESTAURANT</Text>
              <Text style={styles.titleSecond}>DELIVERY PARTNER</Text>
            </Animated.View>

            <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', opacity: brandCompactOpacity }} pointerEvents="none">
              <Text style={styles.compactTitle} numberOfLines={1} adjustsFontSizeToFit>
                ANJANI RESTAURANT <Text style={{ fontWeight: '300' }}>DELIVERY PARTNER</Text>
              </Text>
            </Animated.View>
            
            <Animated.View style={{ opacity: keyboardBrandOpacity, alignItems: 'center', width: '100%', transform: [{ scaleY: keyboardBrandOpacity }] }}>
              <AnimatedDeliveryTrack />
            </Animated.View>
          </Animated.View>

          <Animated.View style={[styles.actionBox, { opacity: authOpacity, transform: [{ translateY: formTranslateY }, { translateY: keyboardGroupY }] }]}>
            <View style={styles.consoleHeader}>
              <Ionicons name="bicycle" size={normalize(22)} color="#FF6B00" style={{ marginBottom: 4 }} />
              <Text style={styles.consoleTitle}>DELIVERY PARTNER PORTAL</Text>
              <Text style={styles.consoleSubtitle}>Authorized Rider Dispatch Access Only</Text>
            </View>

            <View style={styles.formContainer}>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Delivery Partner Email" placeholderTextColor="#888" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={normalize(18)} color="#AAA" style={styles.inputIcon} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Security Password" placeholderTextColor="#888" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: normalize(8) }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={normalize(18)} color="#AAA" />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.primaryBtnTxt}>Secure Sign In</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: normalize(20), gap: normalize(16) },
  brandBox: { alignItems: 'center' },
  title: { fontSize: normalize(26), fontWeight: '800', color: '#FFF', letterSpacing: normalize(4), textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10, textAlign: 'center' },
  titleSecond: { fontSize: normalize(18), fontWeight: '300', color: '#FFF', letterSpacing: normalize(3), textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10, textAlign: 'center', marginTop: 4 },
  compactTitle: { fontSize: normalize(15), fontWeight: '800', color: '#FFF', letterSpacing: normalize(2), textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10, textAlign: 'center', width: '100%' },
  consoleHeader: { alignItems: 'center', marginBottom: normalize(20), paddingTop: normalize(6) },
  consoleTitle: { fontSize: normalize(13), fontWeight: '800', color: '#FF6B00', letterSpacing: normalize(1.5), textAlign: 'center' },
  consoleSubtitle: { fontSize: normalize(11), fontWeight: '500', color: '#9A8A72', marginTop: normalize(2), textAlign: 'center' },
  actionBox: { width: '100%', maxWidth: 400, alignSelf: 'center', backgroundColor: 'rgba(20, 20, 20, 0.65)', borderRadius: normalize(20), padding: normalize(18), borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  formContainer: { gap: normalize(14) },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: normalize(10), paddingHorizontal: normalize(14), height: normalize(48) },
  inputIcon: { marginRight: normalize(10) },
  input: { flex: 1, color: '#FFF', fontSize: normalize(14), fontWeight: '500' },
  primaryBtn: { backgroundColor: '#FF6D00', height: normalize(48), borderRadius: normalize(10), alignItems: 'center', justifyContent: 'center', marginTop: normalize(4), shadowColor: '#FF6D00', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
  primaryBtnTxt: { color: '#FFF', fontSize: normalize(14), fontWeight: 'bold', letterSpacing: 0.5 },
  errorText: { color: '#FF3B30', fontSize: normalize(12), fontWeight: '600', textAlign: 'center', marginTop: normalize(4) },
});
