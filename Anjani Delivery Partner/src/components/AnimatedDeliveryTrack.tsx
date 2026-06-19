/**
 * @file AnimatedDeliveryTrack.tsx
 * @description Renders a playful, animated delivery progress track showing a cycling
 * icon (food -> rider -> home) moving along a horizontal path. Used as an ambient UI element.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = Math.min(SCREEN_WIDTH / 375, 1.2);

/**
 * Normalizes a size value based on screen width.
 * @param size - The base size to normalize.
 * @returns The scaled size.
 */
const normalize = (size: number) => Math.round(size * scale);

/**
 * Animated delivery progress tracker component.
 * It animates an icon along a track, continuously changing its state to depict the delivery lifecycle.
 */
export function AnimatedDeliveryTrack() {
  /** Animated value for the translation along the track. */
  const travelAnim = useRef(new Animated.Value(0)).current;
  /** State determining the current icon displayed in the animation. */
  const [iconPhase, setIconPhase] = useState<'food' | 'rider' | 'home'>('food');

  useEffect(() => {
    // Total duration for one full sweep across the track
    const duration = 3200;

    /** Starts the continuous sliding animation loop. */
    const runAnim = () => {
      travelAnim.setValue(0);
      setIconPhase('food'); // Start with food icon
      Animated.timing(travelAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) runAnim();
      });
    };

    runAnim();

    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    /** Schedules the phase changes of the icon during its travel. */
    const startTimers = () => {
      // 33% of the way: change to rider
      t1 = setTimeout(() => setIconPhase('rider'), duration * 0.33);
      // 66% of the way: change to home
      t2 = setTimeout(() => setIconPhase('home'),  duration * 0.66);
      // At completion: restart timers for next loop
      t3 = setTimeout(() => startTimers(), duration);
    };
    startTimers();

    // Cleanup timers and animation on unmount
    return () => {
      travelAnim.stopAnimation();
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const trackWidth     = normalize(120);
  const containerSize  = normalize(18);

  // Interpolate 0-1 animation progress to horizontal translation
  const translateX = travelAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, trackWidth - containerSize],
  });

  // Fade in at the start, stay fully visible, then fade out at the end
  const iconOpacity = travelAnim.interpolate({
    inputRange:  [0, 0.12, 0.88, 1],
    outputRange: [0, 1,    1,    0],
  });

  // Small scale pop effect at the start and end of track
  const iconScale = travelAnim.interpolate({
    inputRange:  [0, 0.12, 0.88, 1],
    outputRange: [0.85, 1.05, 1.05, 0.85],
  });

  /**
   * Returns the corresponding Ionicons name based on the current animation phase.
   */
  const getIconName = (): 'restaurant-outline' | 'bicycle-outline' | 'home-outline' => {
    switch (iconPhase) {
      case 'food':  return 'restaurant-outline';
      case 'rider': return 'bicycle-outline';
      case 'home':  return 'home-outline';
    }
  };

  return (
    <View style={styles.trackContainer}>
      <View style={styles.trackRoad} />
      <Animated.View
        style={[
          styles.travelingIcon,
          { opacity: iconOpacity, transform: [{ translateX }, { scale: iconScale }] },
        ]}
      >
        <Ionicons name={getIconName()} size={normalize(13)} color="#FF6B00" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  trackContainer: {
    width: normalize(120),
    height: normalize(20),
    justifyContent: 'center',
    marginVertical: normalize(16),
    position: 'relative',
    alignItems: 'flex-start',
  },
  trackRoad: {
    height: 1.5,
    backgroundColor: 'rgba(255, 107, 0, 0.22)',
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  travelingIcon: {
    width: normalize(18),
    height: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 0,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
});
