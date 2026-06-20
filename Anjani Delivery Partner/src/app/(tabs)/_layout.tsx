import React from 'react';
import { AppologyBrand } from '@/components/AppologyBrand';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, useWindowDimensions, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../state/AppStore';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAppStore(state => state.logout);

  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const styleId = 'brand-name-animation-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800;900&display=swap');
          .brand-name {
            font-family: 'Outfit', sans-serif !important;
            background: linear-gradient(120deg, #FF6B00 0%, #FFD180 25%, #FFF 50%, #FFD180 75%, #FF6B00 100%) !important;
            background-size: 200% auto !important;
            -webkit-background-clip: text !important;
            background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            color: transparent !important;
            animation: shinyBrandText 4s linear infinite !important;
            display: inline-block !important;
            font-style: italic !important;
            padding-right: 6px !important;
          }
          @keyframes shinyBrandText {
            0% { background-position: 0% center; }
            100% { background-position: -200% center; }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.dark, flexDirection: isLargeScreen ? 'row' : 'column' }}>
      
      {/* ─── DESKTOP SIDEBAR ─── */}
      {isLargeScreen && (
        <View style={{ width: 260, backgroundColor: '#110D09', borderRightWidth: 1, borderRightColor: 'rgba(255,107,0,0.18)', paddingTop: 40, paddingBottom: 20 }}>
          {/* Brand */}
          <TouchableOpacity 
            style={{ paddingHorizontal: 20, marginBottom: 40, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            activeOpacity={0.7}
            role="button"
            onPress={() => {
              if (Platform.OS === 'web' && typeof (window as any).triggerInstallPrompt === 'function') {
                (window as any).triggerInstallPrompt();
              }
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,107,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.3)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="bicycle" size={24} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text 
                style={[{ fontSize: 18, fontWeight: '800', color: '#F5ECD7', letterSpacing: 0.5 }, Platform.OS === 'web' && { fontFamily: 'Outfit' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {Platform.OS === 'web' ? (
                  React.createElement('span', {
                    className: 'brand-name',
                    style: { fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }
                  }, "Anjani Restaurant")
                ) : (
                  "Anjani Restaurant"
                )}
              </Text>
              <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: '600', letterSpacing: 1, marginTop: 2 }}>DELIVERY PARTNER</Text>
            </View>
          </TouchableOpacity>

          {/* Nav Links */}
          <View style={{ paddingHorizontal: 12, gap: 8, flex: 1 }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: pathname === '/' ? 'rgba(255,107,0,0.1)' : 'transparent', borderWidth: 1, borderColor: pathname === '/' ? 'rgba(255,107,0,0.2)' : 'transparent' }}
              onPress={() => router.push('/(tabs)')}
            >
              <Ionicons name="bicycle-outline" size={20} color={pathname === '/' ? Colors.primary : Colors.muted} />
              <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: pathname === '/' ? '700' : '500', color: pathname === '/' ? Colors.primary : Colors.muted }}>Active Deliveries</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: pathname === '/history' ? 'rgba(255,107,0,0.1)' : 'transparent', borderWidth: 1, borderColor: pathname === '/history' ? 'rgba(255,107,0,0.2)' : 'transparent' }}
              onPress={() => router.push('/(tabs)/history')}
            >
              <Ionicons name="checkmark-done-circle-outline" size={20} color={pathname === '/history' ? Colors.primary : Colors.muted} />
              <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: pathname === '/history' ? '700' : '500', color: pathname === '/history' ? Colors.primary : Colors.muted }}>Delivery History</Text>
            </TouchableOpacity>
          </View>

          {/* Footer / Logout */}
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
              onPress={() => {
                const performLogout = async () => {
                  await logout();
                  router.replace('/auth');
                };

                Alert.alert('Logout', `Are you sure you want to log out?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: performLogout }
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={Colors.red} />
              <Text style={{ marginLeft: 12, fontSize: 14, fontWeight: '600', color: Colors.red }}>Log Out</Text>
            </TouchableOpacity>
            
            {/* Appology Footer Badge */}
            <View style={{ marginTop: 'auto', paddingTop: 30, paddingBottom: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)' }}>
              <Text style={{ fontSize: 12, color: Colors.muted, fontWeight: '500' }}>
                Powered by{' '}
                <Text 
                  style={{ color: '#FF6B00', fontWeight: '800', fontStyle: 'italic' }}
                  {...Platform.select({ web: { className: 'appology-glow-text' } })}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open('https://appology-inc.github.io/', '_blank', 'noopener,noreferrer');
                    } else {
                      import('react-native').then(({ Linking }) => {
                        Linking.openURL('https://appology-inc.github.io/');
                      });
                    }
                  }}
                >
                  <AppologyBrand />
                </Text>
              </Text>
              
              {Platform.OS === 'web' && (
                <style dangerouslySetInnerHTML={{__html: `
                  .appology-glow-text {
                    text-shadow: 0 0 10px rgba(255, 107, 0, 0.4);
                    animation: appology-neon-glow 1.5s ease-in-out infinite alternate;
                  }
                  @keyframes appology-neon-glow {
                    0% { text-shadow: 0 0 5px rgba(255, 107, 0, 0.2), 0 0 10px rgba(255, 107, 0, 0.2); }
                    100% { text-shadow: 0 0 10px rgba(255, 107, 0, 0.6), 0 0 20px rgba(255, 107, 0, 0.4), 0 0 30px rgba(255, 107, 0, 0.2); }
                  }
                `}} />
              )}
            </View>
          </View>
        </View>
      )}

      {/* ─── MAIN CONTENT ─── */}
      <View style={{ flex: 1, backgroundColor: Colors.surface }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              display: isLargeScreen ? 'none' : 'flex',
              backgroundColor: Colors.dark,
              borderTopWidth: 0,
              elevation: 0,
              shadowOpacity: 0,
              minHeight: 62 + (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'web' ? 16 : 8)),
              paddingBottom: insets.bottom > 0 ? insets.bottom : (Platform.OS === 'web' ? 16 : 8),
              paddingTop: 8,
            },
            tabBarShowLabel: true,
            tabBarActiveTintColor: Colors.primary,
            tabBarInactiveTintColor: Colors.muted,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
            },
          }}
        >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Deliveries',
          tabBarLabel: 'Deliveries',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Delivered',
          tabBarLabel: 'Delivered',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="checkmark-done-circle-outline" size={24} color={color} />
          ),
        }}
      />
      </Tabs>
      </View>
    </View>
  );
}
