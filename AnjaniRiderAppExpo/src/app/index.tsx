import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Animated,
  StatusBar, TextInput, KeyboardAvoidingView, Platform, FlatList, ActivityIndicator, Dimensions, Modal, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, ActiveOrder, ChatMessage } from '../state/AppStore';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import AnimatedReanimated from 'react-native-reanimated';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;
const scale = Math.min(SCREEN_W / 375, 1.2);
const normalize = (size: number) => Math.round(size * scale);

// Anjani Dark Theme
const C = {
  primary: '#FF6B00',
  dark: '#0D0A06',
  surface: '#18120A',
  card: '#221A0F',
  card2: '#2A1F12',
  border: 'rgba(255,107,0,0.18)',
  text: '#F5ECD7',
  muted: '#9A8A72',
  green: '#22C55E',
  red: '#EF4444',
  white: '#FFFFFF',
};

export default function RiderApp() {
  const insets = useSafeAreaInsets();
  const [showSplash, setShowSplash] = useState(true);
  const [openChatOrderId, setOpenChatOrderId] = useState<string | null>(null);
  const [chatTexts, setChatTexts] = useState<{ [orderId: string]: string }>({});
  const flatListRefs = useRef<{ [orderId: string]: FlatList | null }>({});

  // --- Animation States (Copied from Customer auth.tsx) ---
  const imageScale = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const authOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(SCREEN_H * 0.23)).current;
  const formTranslateY = useRef(new Animated.Value(45)).current;
  const keyboardAnim = useRef(new Animated.Value(0)).current;

  // --- Auth Form States ---
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signup');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { 
    currentUser, 
    login, 
    logout, 
    loadSavedSession, 
    loginFromCloud, 
    systemOrders, 
    updateOrderStatus, 
    acceptDeliveryTask, 
    updateRiderSimulatedPosition, 
    chatMessages, 
    sendChatMessage 
  } = useAppStore();

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

  const restaurantCoords = { lat: 17.0790, lng: 82.1374 };

  useEffect(() => {
    const init = async () => {
      // 1. Recover any existing session first
      await loadSavedSession();

      // 2. Start continuous slow background panning loop
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

      // 3. Morph/Crossfade Boot Sequence
      const sessionUser = useAppStore.getState().currentUser;
      if (sessionUser) {
        // User already logged in: brief splash fade out to reveal dashboard directly
        setTimeout(() => {
          Animated.timing(splashOpacity, { toValue: 0, duration: 1000, useNativeDriver: true }).start(() => {
            setShowSplash(false);
          });
        }, 2200);
      } else {
        // Not logged in: transition to Auth inputs after splash delay
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(splashOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
            Animated.timing(authOpacity, { toValue: 1, duration: 2000, useNativeDriver: true }),
            Animated.timing(titleTranslateY, { toValue: 0, duration: 1800, useNativeDriver: true }),
            Animated.timing(formTranslateY, { toValue: 0, duration: 1800, useNativeDriver: true }),
          ]).start();
        }, 2500);
      }
    };

    init();
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
        Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          setShowSplash(false);
        });
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
      Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setShowSplash(false);
      });
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
      setTimeout(async () => {
        const success = await loginFromCloud(email.trim());
        if (!success) {
          await login({
            uid: 'mock-user-999',
            name: 'Ramesh Kumar',
            phone: '+91 91234 56789',
            email: email.trim(),
            address: 'Gachibowli Restaurant Hub, Hyderabad',
            addresses: [],
            selectedAddressId: '',
          });
        }
        setLoading(false);
        Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          setShowSplash(false);
        });
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
          name: 'Ramesh Kumar',
          phone: '+91 91234 56789',
          email: email.trim(),
          address: 'Gachibowli Restaurant Hub, Hyderabad',
          addresses: [],
          selectedAddressId: '',
        });
      }
      Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setShowSplash(false);
      });
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
      setTimeout(() => {
        login({
          uid: 'mock-google-' + emailAddress.split('@')[0],
          name: displayName,
          phone: '+91 91234 56789',
          email: emailAddress,
          address: 'Gachibowli Restaurant Hub, Hyderabad',
          addresses: [],
          selectedAddressId: '',
        });
        setLoading(false);
        Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          setShowSplash(false);
        });
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
          phone: '+91 91234 56789',
          email: emailAddress,
          address: 'Gachibowli Restaurant Hub, Hyderabad',
          addresses: [],
          selectedAddressId: '',
        });
      }
      Animated.timing(authOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
        setShowSplash(false);
      });
    } catch (err: any) {
      console.error('Google mock sign-in error:', err);
      setError('Google sign-in error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const availableJobs = systemOrders.filter(o => o.status === 'OUT_FOR_DELIVERY' && o.riderLat === restaurantCoords.lat && o.riderLng === restaurantCoords.lng);
  const myActiveJobs = systemOrders.filter(o => o.status === 'OUT_FOR_DELIVERY' && (o.riderLat !== restaurantCoords.lat || o.riderLng !== restaurantCoords.lng));

  const startSimulation = (order: ActiveOrder) => {
    Alert.alert('GPS Navigation', 'Start live delivery route simulation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => {
        let step = 0;
        const total = 10;
        const timer = setInterval(() => {
          step++;
          const f = step / total;
          const lat = order.restaurantLat + f * (order.userLat - order.restaurantLat);
          const lng = order.restaurantLng + f * (order.userLng - order.restaurantLng);
          updateRiderSimulatedPosition(order.id, lat, lng);
          if (step >= total) { clearInterval(timer); updateOrderStatus(order.id, 'DELIVERED'); Alert.alert('Delivered!', `Order ${order.id} delivered successfully.`); }
        }, 2500);
      }}
    ]);
  };

  const handleSendMessage = (orderId: string) => {
    const text = (chatTexts[orderId] || '').trim();
    if (!text) return;
    sendChatMessage(orderId, 'rider', 'Delivery Partner', text);
    setChatTexts(prev => ({ ...prev, [orderId]: '' }));
    setTimeout(() => flatListRefs.current[orderId]?.scrollToEnd({ animated: true }), 100);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const renderChatPanel = (order: ActiveOrder) => {
    const isOpen = openChatOrderId === order.id;
    const msgs = chatMessages[order.id] || [];
    return (
      <View>
        <TouchableOpacity
          style={[ss.chatToggleBtn, isOpen && { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: C.primary }]}
          onPress={() => setOpenChatOrderId(isOpen ? null : order.id)}
        >
          <Ionicons name={isOpen ? 'chatbubbles' : 'chatbubble-ellipses-outline'} size={15} color={isOpen ? C.primary : C.muted} />
          <Text style={[ss.chatToggleTxt, isOpen && { color: C.primary }]}>Chat with Customer</Text>
          {msgs.length > 0 && <View style={ss.chatBadge}><Text style={ss.chatBadgeTxt}>{msgs.length}</Text></View>}
          <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={C.muted} />
        </TouchableOpacity>

        {isOpen && (
          <View style={ss.chatBox}>
            <View style={ss.chatMsgsWrap}>
              {msgs.length === 0 ? (
                <View style={ss.chatEmpty}>
                  <Ionicons name="chatbubble-ellipses-outline" size={24} color={C.muted} />
                  <Text style={ss.chatEmptyTxt}>No messages yet</Text>
                </View>
              ) : (
                <FlatList
                  ref={ref => { flatListRefs.current[order.id] = ref; }}
                  data={msgs}
                  keyExtractor={m => m.id}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 200 }}
                  contentContainerStyle={{ padding: 8 }}
                  renderItem={({ item }) => {
                    const isRider = item.senderRole === 'rider';
                    return (
                      <View style={[ss.msgRow, isRider ? ss.msgRowRight : ss.msgRowLeft]}>
                        <View style={[ss.msgBubble, isRider ? ss.msgBubbleRiderSent : ss.msgBubbleCustomer]}>
                          {!isRider && <Text style={ss.msgSenderLbl}>Customer</Text>}
                          <Text style={[ss.msgTxt, isRider ? { color: C.white } : { color: C.text }]}>{item.text}</Text>
                          <Text style={[ss.msgTime, isRider ? { color: 'rgba(255,255,255,0.65)', textAlign: 'right' } : { color: C.muted }]}>{formatTime(item.timestamp)}</Text>
                        </View>
                      </View>
                    );
                  }}
                />
              )}
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={ss.chatInputRow}>
                <TextInput
                  style={ss.chatInput}
                  value={chatTexts[order.id] || ''}
                  onChangeText={t => setChatTexts(prev => ({ ...prev, [order.id]: t }))}
                  placeholder="Reply to customer..."
                  placeholderTextColor={C.muted}
                  returnKeyType="send"
                  onSubmitEditing={() => handleSendMessage(order.id)}
                  maxLength={200}
                />
                <TouchableOpacity
                  style={[ss.chatSendBtn, !(chatTexts[order.id]?.trim()) && ss.chatSendBtnOff]}
                  onPress={() => handleSendMessage(order.id)}
                  disabled={!(chatTexts[order.id]?.trim())}
                >
                  <Ionicons name="send" size={15} color={C.white} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        )}
      </View>
    );
  };

  // --- RENDERING CONDITIONAL BOOT / LOGIN VIEW ---
  if (showSplash || !currentUser) {
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
              <Text style={styles.titleSecond}>RIDER PARTNER</Text>
              
              {/* Animated Divider & Tagline Wrapper which fades out on keyboard */}
              <Animated.View style={{ opacity: keyboardBrandOpacity, alignItems: 'center', width: '100%', transform: [{ scaleY: keyboardBrandOpacity }] }}>
                <View style={styles.divider} />
                
                {/* Tagline (Splash Screen Only) */}
                <View style={styles.taglineWrapper}>
                  <Animated.Text style={[styles.tagline, { opacity: splashOpacity }]}>
                    Served Hot, Delivered Fast 🔥
                  </Animated.Text>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Fade In & Slide Up Auth Form */}
            {!currentUser && (
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
            )}
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
                <Ionicons name="logo-google" size={normalize(28)} color={C.dark} style={{ alignSelf: 'center', marginBottom: normalize(14) }} />
                <Text style={styles.modalTitle}>Choose an account</Text>
                <Text style={styles.modalSub}>to continue to Anjani Rider</Text>

                <View style={styles.accountList}>
                  <TouchableOpacity style={styles.accountRow} onPress={() => handleGoogleLogin('partner.ramesh@gmail.com', 'Ramesh Kumar')}>
                    <View style={styles.accountAvatar}>
                      <Text style={styles.avatarTxt}>R</Text>
                    </View>
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountName}>Ramesh Kumar</Text>
                      <Text style={styles.accountEmail}>partner.ramesh@gmail.com</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.accountRow} onPress={() => handleGoogleLogin('rider.suresh@gmail.com', 'Suresh Reddy')}>
                    <View style={[styles.accountAvatar, { backgroundColor: '#4285F4' }]}>
                      <Text style={styles.avatarTxt}>S</Text>
                    </View>
                    <View style={styles.accountDetails}>
                      <Text style={styles.accountName}>Suresh Reddy</Text>
                      <Text style={styles.accountEmail}>rider.suresh@gmail.com</Text>
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

  // --- RENDERING MAIN DASHBOARD VIEW ---
  return (
    <View style={[ss.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.dark} />

      {/* Header */}
      <View style={ss.header}>
        <View style={ss.headerBrand}>
          <View style={ss.headerIcon}><Ionicons name="bicycle" size={18} color={C.primary} /></View>
          <View>
            <Text style={ss.headerTitle}>Anjani Rider</Text>
            <Text style={ss.headerSub}>Delivery Partner Dashboard</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={ss.headerLive}>
            <View style={ss.liveDot} />
            <Text style={ss.liveText}>Live</Text>
          </View>
          <TouchableOpacity 
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center', justifyContent: 'center' }} 
            onPress={() => {
              Alert.alert('Logout', 'Are you sure you want to log out from Ramesh Kumar\'s session?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: async () => {
                  await logout();
                  // Reset animation values for clean slide-in next time
                  splashOpacity.setValue(1);
                  authOpacity.setValue(0);
                  titleTranslateY.setValue(SCREEN_H * 0.23);
                  formTranslateY.setValue(45);
                  setShowSplash(true);
                }}
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={16} color={C.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={ss.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Stats row */}
        <View style={ss.statsRow}>
          <View style={ss.statCard}>
            <Text style={ss.statValue}>{myActiveJobs.length}</Text>
            <Text style={ss.statLabel}>Active Deliveries</Text>
          </View>
          <View style={ss.statCard}>
            <Text style={[ss.statValue, { color: C.primary }]}>{availableJobs.length}</Text>
            <Text style={ss.statLabel}>Available Jobs</Text>
          </View>
          <View style={ss.statCard}>
            <Text style={[ss.statValue, { color: C.green }]}>Online</Text>
            <Text style={ss.statLabel}>Status</Text>
          </View>
        </View>

        {/* Active Deliveries */}
        <View style={ss.section}>
          <Text style={ss.sectionTitle}>My Active Deliveries</Text>
          {myActiveJobs.length === 0 ? (
            <View style={ss.emptyCard}>
              <Ionicons name="clipboard-outline" size={28} color={C.muted} />
              <Text style={ss.emptyText}>No active deliveries</Text>
            </View>
          ) : myActiveJobs.map(order => (
            <View key={order.id} style={ss.orderCard}>
              <View style={ss.orderHeader}>
                <View style={ss.orderIdRow}>
                  <View style={ss.orderDot} />
                  <Text style={ss.orderId}>{order.id}</Text>
                </View>
                <View style={[ss.pill, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]}>
                  <Text style={[ss.pillTxt, { color: C.green }]}>Active</Text>
                </View>
              </View>

              <View style={ss.infoRow}>
                <Ionicons name="location" size={13} color={C.primary} />
                <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
              </View>
              <View style={ss.infoRow}>
                <Ionicons name="call" size={13} color={C.muted} />
                <Text style={ss.infoTxt}>{order.customerPhone}</Text>
              </View>
              {order.cookingInstructions ? (
                <View style={ss.instructionPill}>
                  <Ionicons name="information-circle-outline" size={12} color={C.primary} />
                  <Text style={ss.instructionTxt}>{order.cookingInstructions}</Text>
                </View>
              ) : null}

              <View style={ss.coordRow}>
                <Ionicons name="navigate" size={11} color={C.muted} />
                <Text style={ss.coordTxt}>{order.riderLat.toFixed(5)}, {order.riderLng.toFixed(5)}</Text>
              </View>

              {renderChatPanel(order)}

              <View style={ss.actionRow}>
                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.primary, flex: 1, marginRight: 8 }]} onPress={() => startSimulation(order)}>
                  <Ionicons name="play" size={14} color={C.white} />
                  <Text style={ss.actionBtnTxt}>GPS Simulate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.green, flex: 1 }]} onPress={() => { updateOrderStatus(order.id, 'DELIVERED'); Alert.alert('Delivered!', `Order ${order.id} handed to customer.`); }}>
                  <Ionicons name="checkmark-done" size={14} color={C.white} />
                  <Text style={ss.actionBtnTxt}>Mark Delivered</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Available Jobs */}
        <View style={ss.section}>
          <Text style={ss.sectionTitle}>Available Dispatch Jobs</Text>
          {availableJobs.length === 0 ? (
            <View style={ss.emptyCard}>
              <Ionicons name="checkbox-outline" size={28} color={C.muted} />
              <Text style={ss.emptyText}>All orders dispatched!</Text>
            </View>
          ) : availableJobs.map(order => (
            <View key={order.id} style={ss.orderCard}>
              <View style={ss.orderHeader}>
                <View style={ss.orderIdRow}>
                  <View style={[ss.orderDot, { backgroundColor: C.primary }]} />
                  <Text style={ss.orderId}>{order.id}</Text>
                </View>
                <View style={[ss.pill, { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: C.border }]}>
                  <Text style={[ss.pillTxt, { color: C.primary }]}>Awaiting Rider</Text>
                </View>
              </View>

              <View style={ss.infoRow}>
                <Ionicons name="location" size={13} color={C.primary} />
                <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
              </View>
              <View style={ss.totalRow}>
                <Text style={ss.totalLabel}>Order Value</Text>
                <Text style={ss.totalValue}>₹{Math.floor(order.totalAmount)}</Text>
              </View>

              <TouchableOpacity style={[ss.actionBtn, { backgroundColor: C.primary, width: '100%', marginTop: 12 }]} onPress={() => { acceptDeliveryTask(order.id); Alert.alert('Task Accepted!', `Order ${order.id} assigned. Drive safe! 🛵`); }}>
                <Ionicons name="navigate" size={14} color={C.white} />
                <Text style={ss.actionBtnTxt}>Accept & Start Delivery</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

// --- STYLING (Copied and isolated from Customer auth.tsx) ---
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
    fontSize: normalize(22),
    fontWeight: '300',
    color: '#FFF',
    letterSpacing: normalize(4),
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
    textAlign: 'center',
    marginTop: 4,
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
    letterSpacing: normalize(2),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  actionBox: {
    width: '100%',
    maxWidth: 400, 
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.65)',
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
    color: '#221A0F',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: normalize(13),
    color: '#757575',
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
    color: '#221A0F',
  },
  accountEmail: {
    fontSize: normalize(13),
    color: '#757575',
    marginTop: 2,
  },
});

const ss = StyleSheet.create({
  // Main
  container: { flex: 1, backgroundColor: '#18120A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#0D0A06', borderBottomWidth: 1, borderBottomColor: 'rgba(255,107,0,0.18)' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,107,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#F5ECD7' },
  headerSub: { fontSize: 11, color: '#9A8A72' },
  headerLive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  liveText: { fontSize: 11, color: '#22C55E', fontWeight: '700' },
  scroll: { flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  statCard: { flex: 1, backgroundColor: '#221A0F', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#F5ECD7' },
  statLabel: { fontSize: 10, color: '#9A8A72', marginTop: 2, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9A8A72', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  orderCard: { backgroundColor: '#221A0F', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  orderId: { fontSize: 14, fontWeight: '700', color: '#F5ECD7' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  pillTxt: { fontSize: 10, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoTxt: { flex: 1, fontSize: 12, color: '#9A8A72', lineHeight: 17 },
  instructionPill: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(255,107,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', borderRadius: 8, padding: 8, marginBottom: 10 },
  instructionTxt: { flex: 1, fontSize: 11, color: '#F5ECD7', fontStyle: 'italic', lineHeight: 15 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  coordTxt: { fontSize: 10, color: '#9A8A72', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLabel: { fontSize: 12, color: '#9A8A72' },
  totalValue: { fontSize: 16, fontWeight: '800', color: '#FF6B00' },
  actionRow: { flexDirection: 'row', marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 10 },
  actionBtnTxt: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyCard: { alignItems: 'center', padding: 32, backgroundColor: '#221A0F', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', gap: 8 },
  emptyText: { fontSize: 13, color: '#9A8A72' },
  // Chat
  chatToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#2A1F12', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', marginBottom: 10, marginTop: 4 },
  chatToggleTxt: { flex: 1, fontSize: 12, fontWeight: '600', color: '#9A8A72' },
  chatBadge: { backgroundColor: '#FF6B00', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  chatBadgeTxt: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  chatBox: { backgroundColor: '#18120A', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', marginBottom: 10, overflow: 'hidden' },
  chatMsgsWrap: { minHeight: 80 },
  chatEmpty: { alignItems: 'center', padding: 20, gap: 6 },
  chatEmptyTxt: { fontSize: 12, color: '#9A8A72' },
  msgRow: { flexDirection: 'row', marginBottom: 8 },
  msgRowRight: { justifyContent: 'flex-end' },
  msgRowLeft: { justifyContent: 'flex-start' },
  msgBubble: { maxWidth: '78%', padding: 10, borderRadius: 14 },
  msgBubbleRiderSent: { backgroundColor: '#FF6B00', borderBottomRightRadius: 4 },
  msgBubbleCustomer: { backgroundColor: '#2A1F12', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', borderBottomLeftRadius: 4 },
  msgSenderLbl: { fontSize: 9, color: '#9A8A72', fontWeight: '700', textTransform: 'uppercase', marginBottom: 2, letterSpacing: 0.5 },
  msgTxt: { fontSize: 13, lineHeight: 18 },
  msgTime: { fontSize: 9, marginTop: 3 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,107,0,0.18)' },
  chatInput: { flex: 1, backgroundColor: '#221A0F', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: '#F5ECD7', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)' },
  chatSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF6B00', alignItems: 'center', justifyContent: 'center' },
  chatSendBtnOff: { backgroundColor: '#2A1F12' },
});
