import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MenuItem } from '../data/MenuData';

interface MenuItemCardProps {
  item: MenuItem;
  isSoldOut: boolean;
  onToggle: (id: string) => void;
  onEdit: (item: MenuItem) => void;
}

export const MenuItemCard = React.memo(
  ({ item, isSoldOut, onToggle, onEdit }: MenuItemCardProps) => {
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.catalogItemCard}>
          <View style={styles.catalogItemDetails}>
            <View style={styles.catalogItemHeaderRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={[styles.vegBadgeCustom, { borderColor: item.isVeg ? '#22C55E' : '#EF4444' }]}>
                    <View style={[styles.vegDotCustom, { backgroundColor: item.isVeg ? '#22C55E' : '#EF4444' }]} />
                  </View>
                  <Text style={[styles.vegLabelCustom, { color: item.isVeg ? '#22C55E' : '#EF4444' }]}>
                    {item.isVeg ? 'VEG' : 'NON-VEG'}
                  </Text>
                  <View style={{ width: 1, height: 10, backgroundColor: 'rgba(255,107,0,0.2)', marginHorizontal: 8 }} />
                  <Ionicons name="star" size={10} color="#FFB300" />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#FFB300', marginLeft: 3 }}>
                    {(item.rating || 4.5).toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.catalogItemName}>{item.name}</Text>
              </View>
              <Text style={styles.catalogItemPrice}>₹{Math.floor(item.price)}</Text>
            </View>

            <Text style={styles.catalogItemDesc} numberOfLines={2}>
              {item.description || 'No description provided.'}
            </Text>

            <View style={styles.catalogItemActionRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Switch
                  value={!isSoldOut}
                  onValueChange={() => onToggle(item.id)}
                  trackColor={{ false: '#767577', true: 'rgba(255,107,0,0.4)' }}
                  thumbColor={!isSoldOut ? '#FF6B00' : '#ECEFF1'}
                  style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                />
                <Text style={[styles.catalogItemStatusText, { color: isSoldOut ? '#EF4444' : '#22C55E' }]}>
                  {isSoldOut ? 'Unavailable' : 'Available Today'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.catalogEditBtn}
                onPress={() => onEdit(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="pencil-sharp" size={10} color="#FF6B00" style={{ marginRight: 4 }} />
                <Text style={styles.catalogEditBtnText}>Edit Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  },
  (prev, next) => prev.isSoldOut === next.isSoldOut && prev.item.id === next.item.id && prev.item.name === next.item.name && prev.item.price === next.item.price && prev.item.isAvailable === next.item.isAvailable
);

const styles = StyleSheet.create({
  catalogItemCard: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#161618',
    borderRadius: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  catalogItemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  catalogItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vegBadgeCustom: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  vegDotCustom: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  vegLabelCustom: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catalogItemName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F5ECD7',
    letterSpacing: -0.3,
  },
  catalogItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FF6B00',
  },
  catalogItemDesc: {
    fontSize: 11,
    color: '#9A8A72',
    marginVertical: 4,
    lineHeight: 15,
  },
  catalogItemActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  catalogItemStatusText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  catalogEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,0,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
  },
  catalogEditBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
  },
});
