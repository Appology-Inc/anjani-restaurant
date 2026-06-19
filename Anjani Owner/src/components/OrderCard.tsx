import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveOrder } from '../state/AppStore';

const renderPaymentInfo = (order: ActiveOrder, onVerifyPayment?: (id: string) => void) => {
  let methodLabel = '';
  let methodIcon = 'card-outline';
  let statusLabel = '';
  let statusBg = '#FFF8E1';
  let statusText = '#E65100';
  let statusBorder = '#FFE0B2';
  let isPaid = false;
  let needsVerification = false;

  switch (order.paymentMethod) {
    case 'COD':
      methodLabel = 'Cash on Delivery';
      methodIcon = 'cash-outline';
      statusLabel = 'Unpaid (COD)';
      statusBg = '#FFEBEE';
      statusText = '#C62828';
      statusBorder = '#FFCDD2';
      isPaid = false;
      break;
    case 'GPAY':
      methodLabel = 'Google Pay';
      methodIcon = 'logo-google';
      statusLabel = 'Paid';
      statusBg = '#E8F5E9';
      statusText = '#2E7D32';
      statusBorder = '#C8E6C9';
      isPaid = true;
      break;
    case 'PHONEPE':
      methodLabel = 'PhonePe';
      methodIcon = 'wallet-outline';
      statusLabel = 'Paid';
      statusBg = '#E8F5E9';
      statusText = '#2E7D32';
      statusBorder = '#C8E6C9';
      isPaid = true;
      break;
    case 'QR_GPAY':
    case 'QR_PHONEPE':
      methodLabel = order.paymentMethod === 'QR_GPAY' ? 'GPAY QR' : 'PhonePe QR';
      methodIcon = 'qr-code-outline';
      if (order.utrNumber) {
        if (order.paymentVerified) {
          statusLabel = `Paid (UTR: ${order.utrNumber})`;
          statusBg = '#E8F5E9';
          statusText = '#2E7D32';
          statusBorder = '#C8E6C9';
          isPaid = true;
        } else {
          statusLabel = `Verify UTR: ${order.utrNumber}`;
          statusBg = '#FFF3E0';
          statusText = '#E65100';
          statusBorder = '#FFE0B2';
          isPaid = false;
          needsVerification = true;
        }
      } else {
        statusLabel = 'Pending Verification';
        statusBg = '#FFF3E0';
        statusText = '#E65100';
        statusBorder = '#FFE0B2';
        isPaid = false;
      }
      break;
    default:
      methodLabel = order.paymentMethod || 'Unknown';
      statusLabel = 'Pending';
  }

  return (
    <View style={styles.paymentBadgeRow}>
      <View style={styles.paymentMethodBadge}>
        <Ionicons name={methodIcon as any} size={12} color="#616161" style={{ marginRight: 4 }} />
        <Text style={styles.paymentMethodText}>{methodLabel}</Text>
      </View>
      <View style={[styles.paymentStatusBadge, { backgroundColor: statusBg, borderColor: statusBorder }]}>
        <Ionicons 
          name={isPaid ? 'checkmark-circle-outline' : (needsVerification ? 'help-circle-outline' : 'alert-circle-outline')} 
          size={12} 
          color={statusText} 
          style={{ marginRight: 4 }} 
        />
        <Text style={[styles.paymentStatusText, { color: statusText }]}>{statusLabel}</Text>
      </View>
      {needsVerification && onVerifyPayment && (
        <TouchableOpacity 
          style={styles.verifyBtn} 
          onPress={() => {
            Alert.alert(
              'Verify Payment',
              `Have you received the payment for UTR ${order.utrNumber} in your bank account?`,
              [
                { text: 'No', style: 'cancel' },
                { text: 'Yes, Verified', onPress: () => onVerifyPayment(order.id) }
              ]
            );
          }}
        >
          <Text style={styles.verifyBtnText}>Verify</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const OrderCard = React.memo(({ order, sectionType, onUpdateStatus, onVerifyPayment }: {
  order: ActiveOrder;
  sectionType: 'incoming' | 'prep' | 'ready' | 'route';
  onUpdateStatus: (id: string, status: string, cancelReason?: string) => void;
  onVerifyPayment?: (id: string) => void;
}) => {
  if (sectionType === 'incoming') {
    return (
      <View style={styles.orderDashboardCard}>
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderCardId} numberOfLines={1}>{order.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.statusPillText, { color: '#E65100' }]}>Incoming</Text>
          </View>
        </View>
        <Text style={styles.orderCardDetails}>Items: {(order?.items || []).map((i: any) => `${i?.item?.name || 'Item'} x${i.quantity}`).join(', ')}</Text>
        <Text style={styles.orderCardInstructions}>💬 Instructions: "{order.cookingInstructions || 'None'}"</Text>
        <Text style={styles.orderCardTotal}>Total amount: ₹{Math.floor(order.totalAmount)}</Text>
        {renderPaymentInfo(order, onVerifyPayment)}
        <Text style={styles.orderCardAddress}>📍 Address: {order.customerAddress}</Text>
        <View style={styles.actionsCol}>
          <TouchableOpacity style={styles.acceptOrderBtnLarge} onPress={() => onUpdateStatus(order.id, 'ACCEPTED')}>
            <Ionicons name="restaurant" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.acceptOrderBtnTextLarge}>Accept & Prepare</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectOrderBtnOutline} onPress={() => {
            Alert.alert(
              'Reject Order',
              `Are you sure you want to reject order ${order.id}?`,
              [
                { text: 'No', style: 'cancel' },
                { text: 'Yes, Reject', style: 'destructive', onPress: () => onUpdateStatus(order.id, 'CANCELLED', 'Item(s) currently unavailable') }
              ]
            );
          }}>
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.rejectOrderBtnTextOutline}>Reject Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else if (sectionType === 'prep') {
    const isAccepted = order.status === 'ACCEPTED';
    return (
      <View style={styles.orderDashboardCard}>
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderCardId} numberOfLines={1}>{order.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: isAccepted ? '#E8F5E9' : '#E0F7FA' }]}>
            <Text style={[styles.statusPillText, { color: isAccepted ? '#2E7D32' : '#006064' }]}>
              {isAccepted ? 'Accepted...' : 'Preparing'}
            </Text>
          </View>
        </View>
        <Text style={styles.orderCardDetails}>Items: {(order?.items || []).map((i: any) => `${i?.item?.name || 'Item'} x${i.quantity}`).join(', ')}</Text>
        <Text style={styles.orderCardInstructions}>💬 Instructions: "{order.cookingInstructions || 'None'}"</Text>
        <Text style={styles.orderCardTotal}>Total amount: ₹{Math.floor(order.totalAmount)}</Text>
        {renderPaymentInfo(order, onVerifyPayment)}
        
        {isAccepted ? (
          <View style={[styles.dispatchOrderBtn, { backgroundColor: '#F57C00', opacity: 0.7 }]}>
            <Ionicons name="timer-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.dispatchOrderBtnText}>Auto-starting Prep...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.dispatchOrderBtn} onPress={() => onUpdateStatus(order.id, 'READY')}>
            <Ionicons name="checkmark-done" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.dispatchOrderBtnText}>Mark Ready</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  } else if (sectionType === 'ready') {
    return (
      <View style={styles.orderDashboardCard}>
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderCardId} numberOfLines={1}>{order.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.statusPillText, { color: '#E65100' }]}>Ready</Text>
          </View>
        </View>
        <Text style={styles.orderCardDetails}>Items: {(order?.items || []).map((i: any) => `${i?.item?.name || 'Item'} x${i.quantity}`).join(', ')}</Text>
        <Text style={styles.orderCardInstructions}>💬 Instructions: "{order.cookingInstructions || 'None'}"</Text>
        <Text style={styles.orderCardTotal}>Total amount: ₹{Math.floor(order.totalAmount)}</Text>
        {renderPaymentInfo(order, onVerifyPayment)}
        <View style={[styles.dispatchOrderBtn, { backgroundColor: '#555' }]}>
          <Ionicons name="time-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
          <Text style={styles.dispatchOrderBtnText}>Waiting for Rider...</Text>
        </View>
      </View>
    );
  } else {
    return (
      <View style={styles.orderDashboardCard}>
        <View style={styles.orderCardHeader}>
          <Text style={styles.orderCardId} numberOfLines={1}>{order.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.statusPillText, { color: '#2E7D32' }]}>On Route</Text>
          </View>
        </View>
        <Text style={styles.orderCardDetails}>Items: {(order?.items || []).map((i: any) => `${i.item.name} x${i.quantity}`).join(', ')}</Text>
        <Text style={[styles.orderCardDetails, { color: '#4CAF50', fontWeight: '700' }]}>Rider Assigned</Text>
        <Text style={styles.orderCardAddress}>📍 Customer address: {order.customerAddress}</Text>
        <Text style={styles.orderCardTotal}>Total amount: ₹{Math.floor(order.totalAmount)}</Text>
        {renderPaymentInfo(order, onVerifyPayment)}
        <Text style={styles.orderCardInstructions}>💬 Instructions: "{order.cookingInstructions || 'None'}"</Text>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  orderDashboardCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F5ECD7',
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  orderCardDetails: {
    fontSize: 15,
    color: '#FFF',
    marginBottom: 6,
    lineHeight: 22,
  },
  orderCardInstructions: {
    fontSize: 14,
    color: '#FFCA28',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  orderCardAddress: {
    fontSize: 13,
    color: '#AAA',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },
  orderCardTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  actionsCol: {
    flexDirection: 'column',
    gap: 12,
  },
  acceptOrderBtnLarge: {
    backgroundColor: '#FF6B00',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  acceptOrderBtnTextLarge: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rejectOrderBtnOutline: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  rejectOrderBtnTextOutline: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 15,
  },
  dispatchOrderBtn: {
    backgroundColor: '#22C55E',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dispatchOrderBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  paymentBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  paymentMethodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#424242',
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  verifyBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
