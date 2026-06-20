import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { ActiveOrder } from '../state/AppStore';
import { RiderMapCard } from './RiderMapCard';

interface OrderDeliveryCardProps {
  order: ActiveOrder;
  sectionType: 'active' | 'available' | 'new';
  openMapOrderId: string | null;
  setOpenMapOrderId: (id: string | null) => void;
  startSimulation: (order: ActiveOrder) => void;
  updateOrderStatus: (orderId: string, status: any) => void;
  renderChatPanel: (order: ActiveOrder) => React.ReactNode;
  acceptDeliveryTask: (orderId: string) => void;
}

const renderItemsSummary = (order: ActiveOrder) => {
  if (!order.items || order.items.length === 0) return null;
  return (
    <View style={ss.itemsSummaryContainer}>
      <View style={ss.itemsHeader}>
        <Ionicons name="receipt-outline" size={13} color={Colors.primary} />
        <Text style={ss.itemsHeaderTitle}>Items Ordered ({order.items.reduce((sum, i) => sum + i.quantity, 0)})</Text>
      </View>
      <View style={ss.itemsList}>
        {order.items.map((ordItem, idx) => (
          <View key={ordItem.item?.id || idx.toString()} style={ss.itemRow}>
            <Text style={ss.itemQty}>x{ordItem.quantity}</Text>
            <Text style={ss.itemName} numberOfLines={1}>{ordItem.item?.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const OrderDeliveryCard = React.memo(({ 
  order, 
  sectionType, 
  openMapOrderId, 
  setOpenMapOrderId, 
  startSimulation, 
  updateOrderStatus, 
  renderChatPanel, 
  acceptDeliveryTask 
}: OrderDeliveryCardProps) => {

  if (sectionType === 'active') {
    return (
      <View key="active-card" style={[ss.orderCard]} {...Platform.select({ web: { className: 'rider-card-enhanced' } })}>
        <View style={ss.orderHeader} {...Platform.select({ web: { className: 'rider-card-header' } })}>
          <View style={ss.orderIdRow}>
            <View style={ss.orderDot} />
            <Text style={ss.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={[ss.pill, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]} {...Platform.select({ web: { className: 'rider-pill' } })}>
            <Text style={[ss.pillTxt, { color: Colors.green }]}>Active</Text>
          </View>
        </View>

        <View style={ss.infoRow}>
          <Ionicons name="location" size={13} color={Colors.primary} style={{ marginTop: 2 }} />
          <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
        </View>
        <View style={ss.infoRow}>
          <Ionicons name="person" size={13} color={Colors.muted} style={{ marginTop: 2 }} />
          <Text style={ss.infoTxt}>{order.customerName || 'Customer'}</Text>
        </View>
        <TouchableOpacity style={[ss.infoRow, { paddingVertical: 4 }]} onPress={() => Linking.openURL(`tel:${order.customerPhone}`).catch(() => {})}>
          <Ionicons name="call" size={13} color={Colors.primary} style={{ marginTop: 2 }} />
          <Text style={[ss.infoTxt, { color: Colors.primary,  fontWeight: 'bold' }]}>{order.customerPhone}</Text>
        </TouchableOpacity>
        
        {renderItemsSummary(order)}

        <View style={[ss.totalRow, { marginTop: 4, marginBottom: 12 }]}>
          <Text style={ss.totalLabel}>
            {order.paymentMethod === 'COD' ? '💰 Collect Cash (COD)' : '💳 Paid Online (Prepaid)'}
          </Text>
          <Text style={ss.totalValue}>₹{Math.floor(order.totalAmount)}</Text>
        </View>

        {order.cookingInstructions ? (
          <View style={ss.instructionPill}>
            <Ionicons name="information-circle-outline" size={12} color={Colors.primary} style={{ marginTop: 1 }} />
            <Text style={ss.instructionTxt}>{order.cookingInstructions}</Text>
          </View>
        ) : null}



        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, backgroundColor: 'rgba(255,107,0,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,0,0.2)' }}
          onPress={() => setOpenMapOrderId(openMapOrderId === order.id ? null : order.id)}
        >
          <Ionicons name="map-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600' }}>
            {openMapOrderId === order.id ? 'Hide Live Map' : 'View Live Map'}
          </Text>
        </TouchableOpacity>

        {openMapOrderId === order.id && (
          <View style={{ marginBottom: 12 }}>
            <RiderMapCard order={order} />
          </View>
        )}

        {renderChatPanel(order)}

        <View style={ss.actionRow}>
          <TouchableOpacity style={[ss.actionBtn, { backgroundColor: Colors.primary, flex: 1, marginRight: 8 }]} {...Platform.select({ web: { className: 'rider-action-btn' } })} onPress={() => startSimulation(order)}>
            <Ionicons name="play" size={14} color={Colors.white} />
            <Text style={ss.actionBtnTxt}>Start GPS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ss.actionBtn, { backgroundColor: Colors.green, flex: 1 }]} {...Platform.select({ web: { className: 'rider-action-btn rider-action-btn-green' } })} onPress={() => { 
            updateOrderStatus(order.id, 'DELIVERED'); 
            Alert.alert('Delivered!', `Order ${order.id.slice(-6).toUpperCase()} handed to customer.`);
          }}>
            <Ionicons name="checkmark-done" size={14} color={Colors.white} />
            <Text style={ss.actionBtnTxt}>Mark Delivered</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else if (sectionType === 'new') {
    const statusColor = order.status === 'PLACED' ? Colors.primary : order.status === 'ACCEPTED' ? '#4ADE80' : '#FBBF24';
    const statusLabel = order.status === 'PLACED' ? '🍽️ Order Placed' : order.status === 'ACCEPTED' ? '✅ Order Accepted' : '👨‍🍳 Kitchen Preparing';
    return (
      <View key="new-card" style={[ss.orderCard]} {...Platform.select({ web: { className: 'rider-card-enhanced' } })}>
        <View style={ss.orderHeader} {...Platform.select({ web: { className: 'rider-card-header' } })}>
          <View style={ss.orderIdRow}>
            <View style={[ss.orderDot, { backgroundColor: statusColor }]} />
            <Text style={ss.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={[ss.pill, { backgroundColor: order.status === 'PLACED' ? 'rgba(255,107,0,0.15)' : 'rgba(251,191,36,0.15)', borderColor: statusColor + '50' }]} {...Platform.select({ web: { className: 'rider-pill' } })}>
            <Text style={[ss.pillTxt, { color: statusColor }]}>{order.status}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, color: statusColor, fontWeight: '600', marginBottom: 8 }}>{statusLabel}</Text>

        <View style={ss.infoRow}>
          <Ionicons name="location" size={13} color={Colors.primary} style={{ marginTop: 2 }} />
          <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
        </View>
        <View style={ss.infoRow}>
          <Ionicons name="person" size={13} color={Colors.muted} style={{ marginTop: 2 }} />
          <Text style={ss.infoTxt}>{order.customerName || 'Customer'}</Text>
        </View>
        <TouchableOpacity style={[ss.infoRow, { paddingVertical: 4 }]} onPress={() => Linking.openURL(`tel:${order.customerPhone}`).catch(() => {})}>
          <Ionicons name="call" size={13} color={Colors.primary} style={{ marginTop: 2 }} />
          <Text style={[ss.infoTxt, { color: Colors.primary,  fontWeight: 'bold' }]}>{order.customerPhone}</Text>
        </TouchableOpacity>
        
        {renderItemsSummary(order)}

        {order.cookingInstructions ? (
          <View style={ss.instructionPill}>
            <Ionicons name="information-circle-outline" size={12} color={Colors.primary} style={{ marginTop: 1 }} />
            <Text style={ss.instructionTxt}>{order.cookingInstructions}</Text>
          </View>
        ) : null}
        <View style={ss.totalRow}>
          <Text style={ss.totalLabel}>
            {order.paymentMethod === 'COD' ? '💰 Cash on Delivery (COD)' : '💳 Prepaid (Paid Online)'}
          </Text>
          <Text style={ss.totalValue}>₹{Math.floor(order.totalAmount)}</Text>
        </View>
        <View style={[ss.actionBtn, { backgroundColor: 'rgba(255,107,0,0.08)', borderWidth: 1, borderColor: Colors.border, marginTop: 12, width: '100%' }]}>
          <Ionicons name="time-outline" size={14} color={Colors.muted} />
          <Text style={[ss.actionBtnTxt, { color: Colors.muted }]}>Waiting for kitchen to prepare...</Text>
        </View>
      </View>
    );
  } else {
    return (
      <View key="available-card" style={[ss.orderCard]} {...Platform.select({ web: { className: 'rider-card-enhanced' } })}>
        <View style={ss.orderHeader} {...Platform.select({ web: { className: 'rider-card-header' } })}>
          <View style={ss.orderIdRow}>
            <View style={[ss.orderDot, { backgroundColor: Colors.primary }]} />
            <Text style={ss.orderId}>Order #{order.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={[ss.pill, { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: Colors.border }]} {...Platform.select({ web: { className: 'rider-pill' } })}>
            <Text style={[ss.pillTxt, { color: Colors.primary }]}>Ready to Pickup</Text>
          </View>
        </View>

        <View style={ss.infoRow}>
          <Ionicons name="location" size={13} color={Colors.primary} style={{ marginTop: 2 }} />
          <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
        </View>
        <View style={ss.infoRow}>
          <Ionicons name="person" size={13} color={Colors.muted} style={{ marginTop: 2 }} />
          <Text style={ss.infoTxt}>{order.customerName || 'Customer'}</Text>
        </View>
        <TouchableOpacity style={[ss.infoRow, { paddingVertical: 4 }]} onPress={() => Linking.openURL(`tel:${order.customerPhone}`).catch(() => {})}>
          <Ionicons name="call" size={13} color={Colors.primary} style={{ marginTop: 2 }} />
          <Text style={[ss.infoTxt, { color: Colors.primary,  fontWeight: 'bold' }]}>{order.customerPhone}</Text>
        </TouchableOpacity>
        
        {renderItemsSummary(order)}

        <View style={ss.totalRow}>
          <Text style={ss.totalLabel}>
            {order.paymentMethod === 'COD' ? '💰 Cash on Delivery (COD)' : '💳 Prepaid (Paid Online)'}
          </Text>
          <Text style={ss.totalValue}>₹{Math.floor(order.totalAmount)}</Text>
        </View>

        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 8, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, backgroundColor: 'rgba(255,107,0,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,107,0,0.2)' }}
          onPress={() => setOpenMapOrderId(openMapOrderId === order.id ? null : order.id)}
        >
          <Ionicons name="map-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600' }}>
            {openMapOrderId === order.id ? 'Hide Live Map' : 'View Live Map'}
          </Text>
        </TouchableOpacity>

        {openMapOrderId === order.id && (
          <View style={{ marginBottom: 12 }}>
            <RiderMapCard order={order} />
          </View>
        )}

        {renderChatPanel(order)}

        <TouchableOpacity style={[ss.actionBtn, { backgroundColor: Colors.primary, width: '100%', marginTop: 12 }]} {...Platform.select({ web: { className: 'rider-action-btn' } })} onPress={() => { 
          acceptDeliveryTask(order.id); 
          Alert.alert('Task Accepted!', `Order ${order.id.slice(-6).toUpperCase()} assigned. Drive safe! 🛵`);
        }}>
          <Ionicons name="navigate" size={14} color={Colors.white} />
          <Text style={ss.actionBtnTxt}>Accept &amp; Start Delivery</Text>
        </TouchableOpacity>
      </View>
    );
  }
});

const ss = StyleSheet.create({
  orderCard: { 
    backgroundColor: Colors.card, 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: Colors.border,
    marginHorizontal: 16,
    alignSelf: 'center',
    width: Platform.OS === 'web' ? undefined : '92%',
    maxWidth: 480,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  orderId: { fontSize: 14, fontWeight: '700', color: '#F5ECD7' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pillTxt: { fontSize: 10, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  infoTxt: { flex: 1, fontSize: 12, color: '#9A8A72', lineHeight: 17 },
  instructionPill: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(255,107,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.18)', borderRadius: 8, padding: 8, marginBottom: 10 },
  instructionTxt: { flex: 1, fontSize: 11, color: '#F5ECD7', fontStyle: 'italic', lineHeight: 15 },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 12 },
  coordTxt: { fontSize: 10, color: '#9A8A72', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  totalLabel: { fontSize: 12, color: '#9A8A72' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#FF6B00', letterSpacing: -0.5 },
  actionRow: { flexDirection: 'row', marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  actionBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  itemsSummaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginVertical: 10,
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  itemsHeaderTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF6B00',
    minWidth: 20,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: '#F5ECD7',
    fontWeight: '500',
  },
  itemSubtotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9A8A72',
  },
});
