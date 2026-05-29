import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { MenuItem } from '../data/MenuData';

interface MenuCardProps {
  item: MenuItem;
  cartItem?: { quantity: number };
  onAdd: (item: MenuItem) => void;
  onRemove: (item: MenuItem) => void;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const MenuCard = React.memo(function MenuCard({ item, cartItem, onAdd, onRemove, index, isExpanded, onToggleExpand }: MenuCardProps) {
  const handleAdd = () => {
    onAdd(item);
  };

  const handleRemove = () => {
    onRemove(item);
  };

  const isBestseller = item.rating > 4.5;
  const hasImage = !!item.imageUrl;

  return (
    <Animated.View layout={LinearTransition.duration(200)}>
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.9}
        onPress={onToggleExpand}
      >
        <View style={styles.infoSection}>
          <View style={styles.badgesRow}>
            {/* Veg / Non-veg indicator */}
            <View style={[styles.vegBadge, { borderColor: item.isVeg ? Colors.green : Colors.red }]}>
              <View style={[styles.vegDot, { backgroundColor: item.isVeg ? Colors.green : Colors.red }]} />
            </View>
            {isBestseller && (
              <View style={styles.bestsellerBadge}>
                <Ionicons name="star" size={10} color={Colors.gold} style={{ marginRight: 2 }} />
                <Text style={styles.bestsellerText}>Bestseller</Text>
              </View>
            )}
          </View>
          
          <Text style={styles.name}>{item.name}</Text>
          
          <View style={styles.priceRatingRow}>
            <Text style={styles.price}>₹{item.price}</Text>
            <View style={styles.ratingRowInline}>
              <Ionicons name="star" size={12} color={Colors.gold} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
            </View>
          </View>

          {!!item.description && (
            <Text style={styles.desc} numberOfLines={isExpanded ? undefined : 1}>
              {item.description}
            </Text>
          )}
        </View>

        <View style={styles.actionSection}>
          <View style={styles.actionBox}>
            {item.isAvailable === false ? (
              <View style={styles.soldOutBadge}>
                <Text style={styles.soldOutText}>SOLD OUT</Text>
              </View>
            ) : cartItem ? (
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={handleRemove} activeOpacity={0.7}>
                  <Ionicons name="remove" size={16} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.qtyNum}>{cartItem.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={handleAdd} activeOpacity={0.7}>
                  <Ionicons name="add" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                <Text style={styles.addBtnText}>ADD</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.cartItem?.quantity === nextProps.cartItem?.quantity
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#161618',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  infoSection: {
    flex: 1,
    paddingRight: 16,
    justifyContent: 'center',
  },
  actionSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBox: {
    width: 90,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vegBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  bestsellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  bestsellerText: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  name: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  priceRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingRight: 10,
  },
  price: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  ratingRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    color: Colors.gold,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  desc: {
    color: Colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  soldOutBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  soldOutText: {
    color: Colors.red,
    fontWeight: '800',
    fontSize: 12,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    height: 36,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyNum: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  addBtn: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

});
