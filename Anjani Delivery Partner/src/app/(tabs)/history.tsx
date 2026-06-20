import React from 'react';
import { AppologyBrand } from '@/components/AppologyBrand';
import { StyleSheet, Text, View, ScrollView, useWindowDimensions, Platform, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore, ActiveOrder } from '../../state/AppStore';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import AnimatedReanimated, { FadeInDown } from 'react-native-reanimated';

const normalize = (size: number) => {
  if (Platform.OS === 'web') return size;
  const { width } = require('react-native').Dimensions.get('window');
  const scale = Math.min((width || 375) / 375, 1.2);
  return Math.round(size * scale);
};

export default function HistoryTab() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const systemOrders = useAppStore(state => state.systemOrders);
  const currentUser = useAppStore(state => state.currentUser);

  // Filter for today's delivered orders assigned to this rider
  const deliveredToday = React.useMemo(() => {
    return systemOrders.filter(o => {
      if (o.status !== 'DELIVERED') return false;
      if (o.riderId !== currentUser?.uid) return false;
      
      const today = new Date();
      const orderDate = new Date(o.createdAt || Date.now());
      return orderDate.toDateString() === today.toDateString();
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); // Newest first
  }, [systemOrders, currentUser?.uid]);

  const totalEarnings = deliveredToday.reduce((acc, order) => {
    // Basic calculation for earning per order, flat 15 INR per delivery
    return acc + 15;
  }, 0);

  const renderOrder = ({ item, index }: { item: ActiveOrder, index: number }) => (
    <AnimatedReanimated.View 
      entering={FadeInDown.duration(400).delay(index * 100)}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item.id.slice(-6)}</Text>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#FFF" style={{marginRight: 4}} />
          <Text style={styles.statusTxt}>Delivered</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={16} color={Colors.muted} style={styles.icon} />
          <Text style={styles.infoTxt}>{item.customerName || `Customer #${item.id.slice(-4)}`}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color={Colors.muted} style={styles.icon} />
          <Text style={styles.infoTxt} numberOfLines={2}>{item.customerAddress}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={Colors.muted} style={styles.icon} />
          <Text style={styles.infoTxt}>
            {new Date(item.createdAt || Date.now()).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit', hour12: true})}
          </Text>
        </View>

        {item.items && item.items.length > 0 && (
          <View style={styles.itemsContainer}>
            {item.items.map((ordItem, idx) => (
              <View key={ordItem.item?.id || idx.toString()} style={styles.itemRow}>
                <Text style={styles.itemQty}>x{ordItem.quantity}</Text>
                <Text style={styles.itemName} numberOfLines={1}>{ordItem.item?.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </AnimatedReanimated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'web' ? ('env(safe-area-inset-top)' as any) : insets.top }]}>
      <View style={[styles.header, isLargeScreen && { paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 0 }]}>
        <Text style={[styles.headerTitle, isLargeScreen && { fontSize: 24 }]}>Today's Deliveries</Text>
      </View>

      <View style={[styles.statsContainer, isLargeScreen && { paddingHorizontal: 24, paddingBottom: 24 }]}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statValue}>{deliveredToday.length}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Earnings</Text>
          <Text style={styles.statValue}>₹{totalEarnings}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }, isLargeScreen && { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {deliveredToday.length === 0 ? (
          <View style={[styles.emptyState, { flex: 1 }]}>
            <Ionicons name="bicycle-outline" size={64} color={Colors.surface} />
            <Text style={styles.emptyTxt}>No deliveries completed today.</Text>
          </View>
        ) : (
          deliveredToday.map((item, index) => (
            <View key={item?.id || index.toString()} style={[isLargeScreen && { width: '33.33%', paddingHorizontal: 8, marginBottom: 8 }]}>
              {renderOrder({ item, index })}
            </View>
          ))
        )}

        {/* Appology Footer Badge */}
        {!isLargeScreen && (
          <View style={{ marginTop: 'auto', paddingTop: 30, paddingBottom: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: Colors.muted, fontWeight: '500' }}>
              Powered by{' '}
              <Text 
                style={{ color: '#FF6B00', fontWeight: '800', fontStyle: 'italic',  }}
                onPress={() => Linking.openURL('https://appology-inc.github.io/')}
              >
                <AppologyBrand />
              </Text>
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    width: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: normalize(20),
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  statLabel: {
    color: Colors.muted,
    fontSize: normalize(13),
    marginBottom: 8,
  },
  statValue: {
    color: '#FFF',
    fontSize: normalize(24),
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTxt: {
    color: Colors.muted,
    fontSize: normalize(16),
    marginTop: 16,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    color: '#FFF',
    fontSize: normalize(15),
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.5)',
  },
  statusTxt: {
    color: '#FFF',
    fontSize: normalize(12),
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  infoTxt: {
    color: Colors.muted,
    fontSize: normalize(14),
    flex: 1,
  },
  itemsContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    marginTop: 8,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemQty: {
    fontSize: normalize(12),
    fontWeight: '800',
    color: '#FF6B00',
  },
  itemName: {
    fontSize: normalize(12),
    color: '#E0E0E0',
    flex: 1,
  },
});
