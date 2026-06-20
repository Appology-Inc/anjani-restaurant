/**
 * @file MenuCard.tsx
 * @description An interactive, animated card component for displaying individual menu items.
 * Includes features like "add to cart" functionality, quantity adjustment, and item details expansion.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { MenuItem } from '../data/MenuData';

/**
 * Props for the MenuCard component.
 */
interface MenuCardProps {
  /** The menu item data to display */
  item: MenuItem;
  /** Current cart item data, if the item is in the cart */
  cartItem?: { quantity: number };
  /** Callback fired when the "Add" or "+" button is pressed */
  onAdd: (item: MenuItem) => void;
  /** Callback fired when the "-" button is pressed */
  onRemove: (item: MenuItem) => void;
  /** The index of the item in the list (useful for staggered animations if needed) */
  index: number;
  /** Whether the card's description is currently expanded to show full text */
  isExpanded: boolean;
  /** Callback fired to toggle the expanded state of the card */
  onToggleExpand: () => void;
}

/**
 * MenuCard Component
 * 
 * Displays a single menu item with its name, price, rating, and veg/non-veg indicator.
 * Provides controls to add the item to the cart or adjust its quantity.
 * Utilizes `react-native-reanimated` for smooth layout transitions when expanding/collapsing.
 * Wrapped in `React.memo` with a custom comparison function to heavily optimize list rendering.
 * 
 * @param {MenuCardProps} props - The component props.
 * @returns {React.JSX.Element} The rendered menu card.
 */
export const MenuCard = React.memo(function MenuCard({ item, cartItem, onAdd, onRemove, index, isExpanded, onToggleExpand }: MenuCardProps) {
  /**
   * Handles adding an item to the cart or incrementing its quantity.
   */
  const handleAdd = () => {
    onAdd(item);
  };

  /**
   * Handles removing an item from the cart or decrementing its quantity.
   */
  const handleRemove = () => {
    onRemove(item);
  };

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
          </View>
          
          <Text style={styles.name}>{item.name}</Text>
          
          <View style={styles.priceRatingRow}>
            <Text style={styles.price}>₹{item.price}</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: Colors.card,
    marginHorizontal: Platform.OS === 'web' ? 12 : 16,
    marginVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: 'rgba(255, 90, 0, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 0, 0.2)',
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.1,
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
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 13,
    lineHeight: 20,
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
    fontSize: 16,
    fontWeight: '700',
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
    fontWeight: '700',
    letterSpacing: 0.5,
  },

});
