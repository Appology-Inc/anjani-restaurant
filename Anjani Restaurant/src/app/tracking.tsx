import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import LiveTrackingCard from '../components/LiveTrackingCard';

const { width } = Dimensions.get('window');

export default function TrackingScreen() {
  const router = useRouter();
  const { activeOrders, dismissOrder } = useAppStore();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  const liveOrders = (activeOrders || []);

  if (liveOrders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active order.</Text>
        </View>
      </View>
    );
  }

  const handleClear = (orderId: string) => {
    dismissOrder(orderId);
    if (liveOrders.length <= 1) {
      router.replace('/(tabs)');
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex && roundIndex >= 0 && roundIndex < liveOrders.length) {
      setActiveIndex(roundIndex);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      {liveOrders.length > 1 && (
        <View style={styles.paginationRow}>
          {liveOrders.map((_, i) => (
            <View key={i} style={[styles.paginationDot, i === activeIndex && styles.paginationDotActive]} />
          ))}
        </View>
      )}

      {liveOrders.length === 1 ? (
        <KeyboardAwareScrollView 
          style={styles.content} 
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === 'android' ? 100 : 20}
        >
          <LiveTrackingCard order={liveOrders[0]} onClear={() => handleClear(liveOrders[0].id)} />
        </KeyboardAwareScrollView>
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.content}
        >
          {liveOrders.map((order, i) => (
            <KeyboardAwareScrollView 
              key={order.id} 
              style={{ width }} 
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              enableOnAndroid={true}
              extraScrollHeight={Platform.OS === 'android' ? 100 : 20}
            >
              <LiveTrackingCard order={order} onClear={() => handleClear(order.id)} />
            </KeyboardAwareScrollView>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: Colors.dark,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.muted,
  },
  paginationDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
});
