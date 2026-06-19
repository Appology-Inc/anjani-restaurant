import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AnimatedRestaurantToggleProps {
  isOpen: boolean;
  onPress: () => void;
}

export const AnimatedRestaurantToggle = ({ isOpen, onPress }: AnimatedRestaurantToggleProps) => {
  const anim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: false,
      friction: 6,
      tension: 40,
    }).start();
  }, [isOpen]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(244, 67, 54, 0.15)', 'rgba(76, 175, 80, 0.15)'],
  });

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(244, 67, 54, 0.3)', 'rgba(76, 175, 80, 0.3)'],
  });

  const thumbTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 44],
  });

  const thumbColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F44336', '#4CAF50'],
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      <Animated.View style={[styles.creativeToggleContainer, { backgroundColor, borderColor }]}>
        <View style={styles.creativeToggleTextContainer}>
          <Text style={[styles.creativeToggleText, { color: '#4CAF50', opacity: isOpen ? 1 : 0 }]}>LIVE</Text>
          <Text style={[styles.creativeToggleText, { color: '#F44336', opacity: isOpen ? 0 : 1 }]}>OFF</Text>
        </View>
        <Animated.View style={[styles.creativeToggleThumb, { transform: [{ translateX: thumbTranslateX }], backgroundColor: thumbColor }]}>
          <Ionicons name={isOpen ? "storefront" : "lock-closed"} size={12} color="#FFF" />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  creativeToggleContainer: {
    width: 74,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  creativeToggleTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    position: 'absolute',
    width: '100%',
  },
  creativeToggleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  creativeToggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
});
