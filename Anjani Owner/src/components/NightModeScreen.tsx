import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  interpolate, 
  Easing 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface NightModeScreenProps {
  reopenTime?: string;
}

export const NightModeScreen = ({ reopenTime = "8:00 AM" }: NightModeScreenProps) => {
  const pulse = useSharedValue(0);
  const float1 = useSharedValue(0);
  const float2 = useSharedValue(0);
  const float3 = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    float1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    float2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    float3.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const moonGlow = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0.9]),
  }));

  const zzz1 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float1.value, [0, 1], [0, -15]) },
      { translateX: interpolate(float1.value, [0, 1], [0, 10]) },
      { scale: interpolate(float1.value, [0, 1], [0.8, 1.2]) }
    ],
    opacity: interpolate(float1.value, [0, 0.5, 1], [0, 1, 0]),
  }));

  const zzz2 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float2.value, [0, 1], [0, -25]) },
      { translateX: interpolate(float2.value, [0, 1], [0, 15]) },
      { scale: interpolate(float2.value, [0, 1], [0.6, 1.4]) }
    ],
    opacity: interpolate(float2.value, [0, 0.5, 1], [0, 1, 0]),
  }));

  const zzz3 = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float3.value, [0, 1], [0, -35]) },
      { translateX: interpolate(float3.value, [0, 1], [0, 20]) },
      { scale: interpolate(float3.value, [0, 1], [0.5, 1.5]) }
    ],
    opacity: interpolate(float3.value, [0, 0.5, 1], [0, 1, 0]),
  }));

  return (
    <View style={styles.container}>
      
      {/* Stars Background */}
      <View style={[styles.star, { top: height * 0.1, left: width * 0.2 }]} />
      <View style={[styles.star, { top: height * 0.2, left: width * 0.8, width: 3, height: 3 }]} />
      <View style={[styles.star, { top: height * 0.35, left: width * 0.15, width: 2, height: 2 }]} />
      <View style={[styles.star, { top: height * 0.15, left: width * 0.5, width: 4, height: 4, opacity: 0.8 }]} />

      <View style={styles.content}>
        <View style={styles.moonContainer}>
          <Animated.View style={[styles.moonGlow, moonGlow]} />
          <Ionicons name="moon" size={80} color="#3B82F6" />
          
          <Animated.View style={[styles.zzz, styles.zzzPos1, zzz1]}>
            <Text style={styles.zzzText}>z</Text>
          </Animated.View>
          <Animated.View style={[styles.zzz, styles.zzzPos2, zzz2]}>
            <Text style={styles.zzzText}>Z</Text>
          </Animated.View>
          <Animated.View style={[styles.zzz, styles.zzzPos3, zzz3]}>
            <Text style={[styles.zzzText, { fontSize: 28 }]}>Z</Text>
          </Animated.View>
        </View>

        <Text style={styles.title}>Restaurant Offline</Text>
        <Text style={styles.subtitle}>Restaurant is closed for the night. Orders are paused.</Text>
        
        <View style={styles.divider} />
        
        <View style={styles.infoBox}>
          <Ionicons name="time" size={24} color="#3B82F6" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>AUTO-OPEN AT</Text>
            <Text style={styles.infoValue}>{reopenTime}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  moonContainer: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59,130,246,0.15)',
    zIndex: -1,
  },
  zzz: {
    position: 'absolute',
  },
  zzzPos1: { top: -10, right: -10 },
  zzzPos2: { top: -30, right: -25 },
  zzzPos3: { top: -60, right: -40 },
  zzzText: {
    color: '#93C5FD',
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 32,
    borderRadius: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59,130,246,0.05)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
    width: '100%',
  },
  infoTextContainer: {
    marginLeft: 16,
  },
  infoLabel: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  infoValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 2,
    opacity: 0.4,
  }
});
