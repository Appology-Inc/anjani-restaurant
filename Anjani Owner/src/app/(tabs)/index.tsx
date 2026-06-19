import React from 'react';
import { View, Text, SectionList, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAppStore, OrderStatus } from '../../state/AppStore';
import { OrderCard } from '../../components/OrderCard';
import { TopHeader } from '../../components/TopHeader';
import { Colors } from '../../constants/Colors';
import { NightModeScreen } from '../../components/NightModeScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DashboardScreen() {
  const systemOrders = useAppStore(state => state.systemOrders);
  const { updateOrderStatus, verifyPayment, isRestaurantOpen, isAutoNightMode } = useAppStore();
  const insets = useSafeAreaInsets();

  const incomingOrders = systemOrders.filter(o => o.status === 'PLACED');
  const acceptedOrders = systemOrders.filter(o => o.status === 'ACCEPTED');
  const activePrep = systemOrders.filter(o => o.status === 'PREPARING');
  const readyOrders = systemOrders.filter(o => o.status === 'READY');
  const outForDelivery = systemOrders.filter(o => o.status === 'OUT_FOR_DELIVERY');
  const totalSales = systemOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const sections = [
    { title: `Incoming Requests (${incomingOrders.length})`, data: incomingOrders, type: 'incoming', emptyText: 'No new requests at this moment.', icon: 'notifications-off-outline' },
    { title: `Preparation Queue (${activePrep.length + acceptedOrders.length})`, data: [...acceptedOrders, ...activePrep], type: 'prep', emptyText: 'No items are currently cooking.', icon: 'chef-hat' },
    { title: `Ready for Pickup (${readyOrders.length})`, data: readyOrders, type: 'ready', emptyText: 'No orders waiting for riders.', icon: 'cube-outline' },
    { title: `Live Deliveries (${outForDelivery.length})`, data: outForDelivery, type: 'live', emptyText: 'No orders are currently out on the road.', icon: 'bicycle-outline' }
  ];



  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TopHeader />
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item?.id || index.toString()}
        style={styles.dashboardContainer}
        contentContainerStyle={{ paddingBottom: 160 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        ListHeaderComponent={
          <>
          <View style={styles.dashboardHeader}>
            <Text style={styles.dashboardSubtitle}>Admin & Operations Panel</Text>
          </View>

          {(!isRestaurantOpen || isAutoNightMode) && (
            <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, padding: 12, borderRadius: 12, marginHorizontal: 20, marginBottom: 16 }}>
              <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Restaurant is Offline</Text>
              <Text style={{ color: '#EF4444', fontSize: 13 }}>{isAutoNightMode ? 'We are closed and will reopen at 11:00 AM.' : 'Restaurant is manually paused.'}</Text>
            </View>
          )}

          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Total Revenue</Text>
              <Text style={styles.metricValue}>₹{Math.floor(totalSales)}</Text>
              <Text style={styles.metricSubText}>Gross sales (incl. tax)</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Active Prep</Text>
              <Text style={[styles.metricValue, { color: '#E65100' }]}>{incomingOrders.length + activePrep.length}</Text>
              <Text style={styles.metricSubText}>Cooking in kitchen</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>On Route</Text>
              <Text style={[styles.metricValue, { color: '#388E3C' }]}>{outForDelivery.length}</Text>
              <Text style={styles.metricSubText}>Riders delivering</Text>
            </View>
          </View>
        </>
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.dashboardSectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item: order, section }) => (
        <OrderCard
          order={order}
          sectionType={section.type}
          onUpdateStatus={(orderId: string, status: OrderStatus, cancelReason?: string) => {
            updateOrderStatus(orderId, status, cancelReason);
            if (status === 'ACCEPTED') {
              Alert.alert('Kitchen Alert', `Order ${orderId} accepted. Food preparation starting automatically...`);
            } else if (status === 'OUT_FOR_DELIVERY') {
              Alert.alert('Kitchen Dispatch', `Order ${orderId} dispatched!`);
            }
          }}
          onVerifyPayment={verifyPayment}
        />
      )}
      renderSectionFooter={({ section }) => (
        section.data.length === 0 ? (
          <View style={styles.emptyDashboardCard}>
            {section.icon === 'chef-hat' ? (
              <MaterialCommunityIcons name={section.icon as any} size={28} color="#757575" />
            ) : (
              <Ionicons name={section.icon as any} size={28} color="#757575" />
            )}
            <Text style={styles.emptyDashboardText}>{section.emptyText}</Text>
          </View>
        ) : null
      )}
      ListFooterComponent={<View style={{ height: 40 }} />}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#18120A',
  },
  dashboardContainer: {
    flex: 1,
    backgroundColor: '#18120A',
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  dashboardHeader: {
    marginBottom: 16,
  },
  dashboardTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F5ECD7',
  },
  dashboardSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A8A72',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: '#221A0F',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metricLabel: {
    fontSize: 10,
    color: '#9A8A72',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5ECD7',
    marginVertical: 4,
  },
  metricSubText: {
    fontSize: 8,
    color: '#9A8A72',
  },
  dashboardSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9A8A72',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  emptyDashboardCard: {
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#221A0F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  emptyDashboardText: {
    fontSize: 12,
    color: '#9A8A72',
  },
});
