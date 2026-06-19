/**
 * @file OrderDeliveryCard.tsx
 * @description A comprehensive card component representing an order's status.
 * Adapts its layout and actions based on whether it is an 'active', 'available', or 'new' order.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { ActiveOrder } from '../state/AppStore';
import { RiderMapCard } from './RiderMapCard';

/**
 * Props for the OrderDeliveryCard component.
 */
interface OrderDeliveryCardProps {
  /** The order data object. */
  order: ActiveOrder;
  /** Categorizes the state/section in which this card is displayed. */
  sectionType: 'active' | 'available' | 'new';
  /** The ID of the currently expanded map, or null. */
  openMapOrderId: string | null;
  /** Callback to toggle the map visibility for this order. */
  setOpenMapOrderId: (id: string | null) => void;
  /** Callback to begin GPS simulation for an active order. */
  startSimulation: (order: ActiveOrder) => void;
  /** Callback to update the order's status (e.g., mark as delivered). */
  updateOrderStatus: (orderId: string, status: any) => void;
  /** Function returning the chat UI component for the order. */
  renderChatPanel: (order: ActiveOrder) => React.ReactNode;
  /** Callback for a rider to accept an available delivery task. */
  acceptDeliveryTask: (orderId: string) => void;
}

/**
 * Renders a detailed card showing order information, actions, and map/chat expansions.
 * It uses React.memo for performance optimization to avoid re-renders unless props change.
 * 
 * @param props - Component properties.
 */
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
      <View style={[ss.orderCard, { marginHorizontal: 16 }]}>
        <View style={ss.orderHeader}>
          <View style={ss.orderIdRow}>
            <View style={ss.orderDot} />
            <Text style={ss.orderId}>{order.id}</Text>
          </View>
          <View style={[ss.pill, { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)' }]}>
            <Text style={[ss.pillTxt, { color: Colors.green }]}>Active</Text>
          </View>
        </View>

        <View style={ss.infoRow}>
          <Ionicons name="location" size={13} color={Colors.primary} />
          <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
        </View>
        <View style={ss.infoRow}>
          <Ionicons name="call" size={13} color={Colors.muted} />
          <Text style={ss.infoTxt}>{order.customerPhone}</Text>
        </View>
        {order.cookingInstructions ? (
          <View style={ss.instructionPill}>
            <Ionicons name="information-circle-outline" size={12} color={Colors.primary} />
            <Text style={ss.instructionTxt}>{order.cookingInstructions}</Text>
          </View>
        ) : null}

        <View style={ss.coordRow}>
          <Ionicons name="navigate" size={11} color={Colors.muted} />
          <Text style={ss.coordTxt}>{order.riderLat.toFixed(5)}, {order.riderLng.toFixed(5)}</Text>
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

        <View style={ss.actionRow}>
          <TouchableOpacity style={[ss.actionBtn, { backgroundColor: Colors.primary, flex: 1, marginRight: 8 }]} onPress={() => startSimulation(order)}>
            <Ionicons name="play" size={14} color={Colors.white} />
            <Text style={ss.actionBtnTxt}>GPS Simulate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[ss.actionBtn, { backgroundColor: Colors.green, flex: 1 }]} onPress={() => { updateOrderStatus(order.id, 'DELIVERED'); Alert.alert('Delivered!', `Order ${order.id} handed to customer.`); }}>
            <Ionicons name="checkmark-done" size={14} color={Colors.white} />
            <Text style={ss.actionBtnTxt}>Mark Delivered</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else if (sectionType === 'new') {
    const statusColor = order.status === 'PLACED' ? Colors.primary : '#FBBF24';
    const statusLabel = order.status === 'PLACED' ? '🍽️ Order Placed' : '👨‍🍳 Kitchen Preparing';
    return (
      <View style={[ss.orderCard, { marginHorizontal: 16 }]}>
        <View style={ss.orderHeader}>
          <View style={ss.orderIdRow}>
            <View style={[ss.orderDot, { backgroundColor: statusColor }]} />
            <Text style={ss.orderId}>{order.id}</Text>
          </View>
          <View style={[ss.pill, { backgroundColor: order.status === 'PLACED' ? 'rgba(255,107,0,0.15)' : 'rgba(251,191,36,0.15)', borderColor: statusColor + '50' }]}>
            <Text style={[ss.pillTxt, { color: statusColor }]}>{order.status}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 12, color: statusColor, fontWeight: '600', marginBottom: 8 }}>{statusLabel}</Text>

        <View style={ss.infoRow}>
          <Ionicons name="location" size={13} color={Colors.primary} />
          <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
        </View>
        <View style={ss.infoRow}>
          <Ionicons name="call" size={13} color={Colors.muted} />
          <Text style={ss.infoTxt}>{order.customerPhone}</Text>
        </View>
        {order.cookingInstructions ? (
          <View style={ss.instructionPill}>
            <Ionicons name="information-circle-outline" size={12} color={Colors.primary} />
            <Text style={ss.instructionTxt}>{order.cookingInstructions}</Text>
          </View>
        ) : null}
        <View style={ss.totalRow}>
          <Text style={ss.totalLabel}>Order Value</Text>
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
      <View style={[ss.orderCard, { marginHorizontal: 16 }]}>
        <View style={ss.orderHeader}>
          <View style={ss.orderIdRow}>
            <View style={[ss.orderDot, { backgroundColor: Colors.primary }]} />
            <Text style={ss.orderId}>{order.id}</Text>
          </View>
          <View style={[ss.pill, { backgroundColor: 'rgba(255,107,0,0.15)', borderColor: Colors.border }]}>
            <Text style={[ss.pillTxt, { color: Colors.primary }]}>Ready to Pickup</Text>
          </View>
        </View>

        <View style={ss.infoRow}>
          <Ionicons name="location" size={13} color={Colors.primary} />
          <Text style={ss.infoTxt} numberOfLines={2}>{order.customerAddress}</Text>
        </View>
        <View style={ss.totalRow}>
          <Text style={ss.totalLabel}>Order Value</Text>
          <Text style={ss.totalValue}>₹{Math.floor(order.totalAmount)}</Text>
        </View>

        <TouchableOpacity style={[ss.actionBtn, { backgroundColor: Colors.primary, width: '100%', marginTop: 12 }]} onPress={() => { acceptDeliveryTask(order.id); Alert.alert('Task Accepted!', `Order ${order.id} assigned. Drive safe! 🛵`); }}>
          <Ionicons name="navigate" size={14} color={Colors.white} />
          <Text style={ss.actionBtnTxt}>Accept &amp; Start Delivery</Text>
        </TouchableOpacity>
      </View>
    );
  }
});

const ss = StyleSheet.create({
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
});
