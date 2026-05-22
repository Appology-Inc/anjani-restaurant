import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { MenuItem } from '../data/MenuData';

interface MenuCardProps {
  item: MenuItem;
  cartItem?: { quantity: number };
  onAdd: (item: MenuItem) => void;
  onRemove: (item: MenuItem) => void;
  index: number;
}

export function MenuCard({ item, cartItem, onAdd, onRemove, index }: MenuCardProps) {
  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(item);
  };

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemove(item);
  };

  const isBestseller = item.rating > 4.5;
  const hasImage = !!item.imageUrl;

  return (
    <Animated.View entering={FadeIn.delay(index * 20).duration(300)}>
      <View style={styles.card}>
        <View style={[styles.infoSection, !hasImage && styles.infoSectionFull]}>
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
          
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.price}>₹{item.price}</Text>
          
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={Colors.gold} />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>

          {!!item.description && (
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
          )}
        </View>

        <View style={styles.imageSection}>
          {hasImage ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.foodImage} 
              defaultSource={require('../../assets/images/icon.png')} // Fallback if needed
            />
          ) : (
            <View style={[styles.foodImage, styles.placeholderImage]} />
          )}

          {/* Absolute Floating Add Button */}
          <View style={styles.floatingActionBox}>
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
      </View>
      {/* Decorative dashed separator mimicking Swiggy */}
      <View style={styles.separator} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
  },
  infoSection: {
    flex: 1,
    paddingRight: 20,
  },
  infoSectionFull: {
    paddingRight: 0,
  },
  imageSection: {
    width: 140,
    height: 140,
    alignItems: 'center',
    position: 'relative',
  },
  foodImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
    backgroundColor: Colors.card,
  },
  placeholderImage: {
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floatingActionBox: {
    position: 'absolute',
    bottom: -10,
    width: 110,
    alignSelf: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
    borderWidth: 1,
    borderColor: Colors.border,
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
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  price: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    backgroundColor: Colors.card,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
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
    paddingHorizontal: 6,
    height: 40,
  },
  qtyBtn: {
    width: 32,
    height: 32,
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
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.card2,
    marginHorizontal: 16,
  },
});
