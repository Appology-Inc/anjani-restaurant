/**
 * @file tracking.tsx
 * @description Live order tracking screen.
 * Displays real-time updates for active orders using LiveTrackingCard,
 * with a dynamic UI for single or multiple concurrent orders.
 */
import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAppStore } from '../state/AppStore';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import LiveTrackingCard from '../components/LiveTrackingCard';

const { width } = Dimensions.get('window');

/**
 * TrackingScreen Component
 * 
 * Displays the status of active orders. Handles an empty state with a radar animation,
 * a single order view, or a paginated swiper for tracking multiple concurrent orders.
 * 
 * @returns {React.ReactElement} The rendered tracking screen.
 */
export default function TrackingScreen() {
  const router = useRouter();
  const { activeOrders, dismissOrder } = useAppStore();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  const liveOrders = (activeOrders || []);

  /**
   * Handles navigation back, ensuring dismissed or completed orders are cleared from tracking.
   */
  const handleBack = () => {
    liveOrders.forEach(order => {
      if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
        dismissOrder(order.id);
      }
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  if (liveOrders.length === 0) {
    return (
      <View style={styles.container} {...Platform.select({ web: { className: 'tracking-glow-bg' } })}>
        {Platform.OS === 'web' && (
          <style dangerouslySetInnerHTML={{__html: `
            .tracking-glow-bg {
              background-image: 
                radial-gradient(circle at 50% -10%, rgba(255, 107, 0, 0.18) 0%, transparent 60%),
                radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 45%),
                radial-gradient(circle at 90% 90%, rgba(255, 215, 0, 0.04) 0%, transparent 45%) !important;
              background-attachment: fixed !important;
              background-color: #07070a !important;
              position: relative !important;
            }
            .tracking-glow-bg::before {
              content: "" !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              background-image: linear-gradient(rgba(255, 255, 255, 0.007) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255, 255, 255, 0.007) 1px, transparent 1px) !important;
              background-size: 20px 20px !important;
              pointer-events: none !important;
              opacity: 0.8 !important;
              z-index: 0 !important;
            }
            .tracking-header-glass {
              background-color: rgba(10, 11, 14, 0.75) !important;
              backdrop-filter: blur(20px) !important;
              -webkit-backdrop-filter: blur(20px) !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
              box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4) !important;
              z-index: 10 !important;
            }
            .tracking-card-enhanced {
              background: rgba(18, 20, 26, 0.65) !important;
              backdrop-filter: blur(20px) !important;
              -webkit-backdrop-filter: blur(20px) !important;
              border: 1px solid rgba(255, 255, 255, 0.07) !important;
              box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 
                          inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
              border-radius: 24px !important;
              overflow: hidden !important;
              transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                          box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                          border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .tracking-card-enhanced:hover {
              transform: translateY(-4px) !important;
              box-shadow: 0 32px 80px rgba(255, 107, 0, 0.1), 
                          0 24px 64px rgba(0, 0, 0, 0.6),
                          inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
              border-color: rgba(255, 107, 0, 0.3) !important;
            }
            .tracking-card-header {
              border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
              background-color: rgba(255, 255, 255, 0.01) !important;
            }
            .tracking-back-glow {
              background-color: rgba(255, 255, 255, 0.03) !important;
              border: 1px solid rgba(255, 255, 255, 0.08) !important;
              transition: all 0.2s ease !important;
            }
            .tracking-back-glow:hover {
              background-color: rgba(255, 107, 0, 0.1) !important;
              border-color: rgba(255, 107, 0, 0.3) !important;
              box-shadow: 0 0 15px rgba(255, 107, 0, 0.2) !important;
              transform: scale(1.05) !important;
            }
            .brand-name-tracking {
              font-family: 'Outfit', sans-serif !important;
              background: linear-gradient(120deg, #FF6B00 0%, #FFD180 25%, #FFF 50%, #FFD180 75%, #FF6B00 100%) !important;
              background-size: 200% auto !important;
              -webkit-background-clip: text !important;
              background-clip: text !important;
              -webkit-text-fill-color: transparent !important;
              color: transparent !important;
              animation: shinyBrandTextTracking 4s linear infinite !important;
              display: inline-block !important;
              font-weight: 800 !important;
              font-style: italic !important;
              padding-right: 6px !important;
            }
            @keyframes shinyBrandTextTracking {
              0% { background-position: 0% center; }
              100% { background-position: -200% center; }
            }
            .tracking-indicator-row {
              background-color: rgba(16, 185, 129, 0.08) !important;
              padding: 6px 12px !important;
              border-radius: 20px !important;
              display: inline-flex !important;
              align-items: center !important;
              gap: 6px !important;
              border: 1px solid rgba(16, 185, 129, 0.2) !important;
            }
            .tracking-map-panel {
              background-color: rgba(20, 22, 28, 0.4) !important;
              border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
            }
            .tracking-map-container {
              border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
              overflow: hidden !important;
              position: relative !important;
            }
            .tracking-map-container-failed {
              border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
              background: rgba(22, 24, 30, 0.4) !important;
            }
            .tracking-eta-dashboard {
              background: rgba(255, 107, 0, 0.02) !important;
              border: 1px solid rgba(255, 107, 0, 0.08) !important;
              border-radius: 16px !important;
              margin: 16px !important;
              padding: 16px !important;
              box-shadow: inset 0 1px 1px rgba(255,255,255,0.03) !important;
            }
            .tracking-eta-time {
              font-family: 'Outfit', sans-serif !important;
              background: linear-gradient(135deg, #FF6B00 0%, #FF9E00 100%) !important;
              -webkit-background-clip: text !important;
              background-clip: text !important;
              -webkit-text-fill-color: transparent !important;
              color: transparent !important;
              font-weight: 900 !important;
              text-shadow: 0 4px 12px rgba(255, 107, 0, 0.15) !important;
            }
            .tracking-eta-dist {
              font-family: 'Outfit', sans-serif !important;
              font-weight: 800 !important;
              color: #FFF !important;
            }
            .tracking-progress-bg {
              background: rgba(255, 255, 255, 0.08) !important;
              height: 6px !important;
              border-radius: 3px !important;
              overflow: hidden !important;
              box-shadow: inset 0 1px 3px rgba(0,0,0,0.4) !important;
            }
            .tracking-progress-fill {
              background: linear-gradient(90deg, #FF6B00 0%, #FFA500 100%) !important;
              height: 100% !important;
              border-radius: 3px !important;
              box-shadow: 0 0 8px rgba(255, 107, 0, 0.6) !important;
              position: relative !important;
              animation: progressGlow 2s ease infinite alternate !important;
            }
            @keyframes progressGlow {
              0% { filter: drop-shadow(0 0 2px rgba(255, 107, 0, 0.4)); }
              100% { filter: drop-shadow(0 0 8px rgba(255, 107, 0, 0.8)); }
            }
            .tracking-milestone {
              font-size: 11px !important;
              color: #8E8E93 !important;
              transition: color 0.3s ease, text-shadow 0.3s ease !important;
            }
            .tracking-milestone-active {
              color: #FF6B00 !important;
              font-weight: 700 !important;
              text-shadow: 0 0 10px rgba(255, 107, 0, 0.3) !important;
            }
            .tracking-rider-panel {
              background: rgba(255, 255, 255, 0.015) !important;
              border: 1px solid rgba(255, 255, 255, 0.04) !important;
              border-radius: 16px !important;
              margin: 16px !important;
              padding: 16px !important;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
            }
            .tracking-rider-avatar {
              background-color: rgba(255, 107, 0, 0.12) !important;
              border: 1px solid rgba(255, 107, 0, 0.25) !important;
              box-shadow: 0 4px 10px rgba(255, 107, 0, 0.15) !important;
            }
            .tracking-rider-rating {
              background-color: rgba(255, 215, 0, 0.1) !important;
              border: 1px solid rgba(255, 215, 0, 0.25) !important;
              padding: 2px 6px !important;
              border-radius: 8px !important;
            }
            .tracking-extra-pills-row {
              margin: 0 16px 16px 16px !important;
              gap: 8px !important;
            }
            .tracking-extra-pill {
              background-color: rgba(255, 255, 255, 0.03) !important;
              border: 1px solid rgba(255, 255, 255, 0.06) !important;
              padding: 6px 12px !important;
              border-radius: 12px !important;
            }
            .tracking-extra-pill-success {
              background-color: rgba(16, 185, 129, 0.06) !important;
              border: 1px solid rgba(16, 185, 129, 0.15) !important;
              padding: 6px 12px !important;
              border-radius: 12px !important;
            }
            .tracking-cancel-btn {
              background: rgba(239, 68, 68, 0.05) !important;
              border: 1px solid rgba(239, 68, 68, 0.15) !important;
              transition: all 0.2s ease !important;
            }
            .tracking-cancel-btn:hover {
              background: rgba(239, 68, 68, 0.1) !important;
              border-color: rgba(239, 68, 68, 0.3) !important;
              box-shadow: 0 0 12px rgba(239, 68, 68, 0.1) !important;
            }
            .tracking-rating-container {
              background: rgba(255, 107, 0, 0.02) !important;
              border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
              border-bottom-left-radius: 24px !important;
              border-bottom-right-radius: 24px !important;
              padding: 20px !important;
            }
            .tracking-review-input {
              background-color: rgba(255, 255, 255, 0.02) !important;
              border: 1px solid rgba(255, 255, 255, 0.06) !important;
              border-radius: 12px !important;
              color: #FFF !important;
              transition: all 0.2s ease !important;
              padding: 10px 12px !important;
            }
            .tracking-review-input:focus {
              border-color: rgba(255, 107, 0, 0.4) !important;
              background-color: rgba(255, 255, 255, 0.04) !important;
            }
            .tracking-dismiss-btn {
              background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
              border-radius: 12px !important;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
              transition: all 0.2s ease !important;
            }
            .tracking-dismiss-btn:hover {
              transform: translateY(-1px) !important;
              box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4) !important;
            }
            .tracking-dot {
              background-color: rgba(255, 255, 255, 0.2) !important;
              transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            }
            .tracking-dot-active {
              background: linear-gradient(90deg, #FF6B00 0%, #FF9E00 100%) !important;
              box-shadow: 0 0 8px rgba(255, 107, 0, 0.6) !important;
            }
            .tracking-empty-card-wrapper {
              flex: 1 !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              padding: 24px !important;
              z-index: 1 !important;
            }
            .empty-state-card {
              max-width: 440px !important;
              width: 100% !important;
              padding: 40px 32px !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              text-align: center !important;
              background: rgba(18, 20, 26, 0.55) !important;
            }
            .radar-wrapper {
              position: relative !important;
              width: 100px !important;
              height: 100px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              margin-bottom: 24px !important;
            }
            .radar-ring {
              position: absolute !important;
              border: 1px solid rgba(255, 107, 0, 0.2) !important;
              border-radius: 50% !important;
              width: 100% !important;
              height: 100% !important;
              animation: radarPulse 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite !important;
            }
            .ring-2 {
              animation-delay: 1.5s !important;
            }
            .radar-icon-glow {
              filter: drop-shadow(0 0 8px rgba(255, 107, 0, 0.4)) !important;
              animation: iconPulse 2s ease-in-out infinite alternate !important;
              z-index: 2 !important;
            }
            @keyframes radarPulse {
              0% {
                transform: scale(0.6);
                opacity: 0.8;
              }
              100% {
                transform: scale(1.6);
                opacity: 0;
              }
            }
            @keyframes iconPulse {
              0% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255, 107, 0, 0.3)); }
              100% { transform: scale(1.08); filter: drop-shadow(0 0 16px rgba(255, 107, 0, 0.6)); }
            }
          `}} />
        )}
        <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 'calc(20px + env(safe-area-inset-top))' : Math.max(insets.top, 12) + 8 }]} {...Platform.select({ web: { className: 'tracking-header-glass' } })}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} {...Platform.select({ web: { className: 'tracking-back-glow', role: 'button' } })}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, Platform.OS === 'web' && { fontFamily: 'Outfit' }]}>
            {Platform.OS === 'web' ? (
              React.createElement('span', {
                className: 'brand-name-tracking',
                style: { fontSize: '20px', fontWeight: '800' }
              }, "Order Tracking")
            ) : (
              "Order Tracking"
            )}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer} {...Platform.select({ web: { className: 'tracking-empty-card-wrapper' } })}>
          <View style={styles.emptyCard} {...Platform.select({ web: { className: 'tracking-card-enhanced empty-state-card' } })}>
            <View style={styles.radarWrapper}>
              <View style={styles.radarRing1} {...Platform.select({ web: { className: 'radar-ring ring-1' } })} />
              <View style={styles.radarRing2} {...Platform.select({ web: { className: 'radar-ring ring-2' } })} />
              <Ionicons name="radar-outline" size={40} color="#FF6B00" style={styles.radarIcon} {...Platform.select({ web: { className: 'radar-icon-glow' } })} />
            </View>
            <Text style={styles.emptyTitle}>No Active Trackers</Text>
            <Text style={styles.emptySubtitle}>You don't have any active orders right now. Place an order from our delicious menu to see live delivery updates here!</Text>
            <TouchableOpacity 
              style={styles.browseBtn} 
              onPress={() => router.replace('/(tabs)')}
              {...Platform.select({ web: { className: 'tracking-dismiss-btn' } })}
            >
              <Ionicons name="restaurant" size={16} color="#FFF" />
              <Text style={styles.browseBtnTxt}>Browse Our Menu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  /**
   * Dismisses a completed or cancelled order from the tracking view.
   * Redirects to the main menu if no active orders remain.
   * 
   * @param {string} orderId - The unique ID of the order to dismiss.
   */
  const handleClear = (orderId: string) => {
    dismissOrder(orderId);
    if (liveOrders.length <= 1) {
      router.replace('/(tabs)');
    }
  };

  /**
   * Updates the active index indicator when scrolling through multiple active orders.
   * 
   * @param {NativeSyntheticEvent<NativeScrollEvent>} event - The native scroll event payload.
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== activeIndex && roundIndex >= 0 && roundIndex < liveOrders.length) {
      setActiveIndex(roundIndex);
    }
  };

  return (
    <View style={styles.container} {...Platform.select({ web: { className: 'tracking-glow-bg' } })}>
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{__html: `
          .tracking-glow-bg {
            background-image: 
              radial-gradient(circle at 50% -10%, rgba(255, 107, 0, 0.18) 0%, transparent 60%),
              radial-gradient(circle at 10% 80%, rgba(16, 185, 129, 0.06) 0%, transparent 45%),
              radial-gradient(circle at 90% 90%, rgba(255, 215, 0, 0.04) 0%, transparent 45%) !important;
            background-attachment: fixed !important;
            background-color: #07070a !important;
            position: relative !important;
          }
          .tracking-glow-bg::before {
            content: "" !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            background-image: linear-gradient(rgba(255, 255, 255, 0.007) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255, 255, 255, 0.007) 1px, transparent 1px) !important;
            background-size: 20px 20px !important;
            pointer-events: none !important;
            opacity: 0.8 !important;
            z-index: 0 !important;
          }
          .tracking-header-glass {
            background-color: rgba(10, 11, 14, 0.75) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4) !important;
            z-index: 10 !important;
          }
          .tracking-card-enhanced {
            background: rgba(18, 20, 26, 0.65) !important;
            backdrop-filter: blur(20px) !important;
            -webkit-backdrop-filter: blur(20px) !important;
            border: 1px solid rgba(255, 255, 255, 0.07) !important;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 
                        inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
            border-radius: 24px !important;
            overflow: hidden !important;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                        box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                        border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .tracking-card-enhanced:hover {
            transform: translateY(-4px) !important;
            box-shadow: 0 32px 80px rgba(255, 107, 0, 0.1), 
                        0 24px 64px rgba(0, 0, 0, 0.6),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
            border-color: rgba(255, 107, 0, 0.3) !important;
          }
          .tracking-card-header {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
            background-color: rgba(255, 255, 255, 0.01) !important;
          }
          .tracking-back-glow {
            background-color: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.08) !important;
            transition: all 0.2s ease !important;
          }
          .tracking-back-glow:hover {
            background-color: rgba(255, 107, 0, 0.1) !important;
            border-color: rgba(255, 107, 0, 0.3) !important;
            box-shadow: 0 0 15px rgba(255, 107, 0, 0.2) !important;
            transform: scale(1.05) !important;
          }
          .brand-name-tracking {
            font-family: 'Outfit', sans-serif !important;
            background: linear-gradient(120deg, #FF6B00 0%, #FFD180 25%, #FFF 50%, #FFD180 75%, #FF6B00 100%) !important;
            background-size: 200% auto !important;
            -webkit-background-clip: text !important;
            background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            color: transparent !important;
            animation: shinyBrandTextTracking 4s linear infinite !important;
            display: inline-block !important;
            font-weight: 800 !important;
            font-style: italic !important;
            padding-right: 6px !important;
          }
          @keyframes shinyBrandTextTracking {
            0% { background-position: 0% center; }
            100% { background-position: -200% center; }
          }
          .tracking-indicator-row {
            background-color: rgba(16, 185, 129, 0.08) !important;
            padding: 6px 12px !important;
            border-radius: 20px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 6px !important;
            border: 1px solid rgba(16, 185, 129, 0.2) !important;
          }
          .tracking-map-panel {
            background-color: rgba(20, 22, 28, 0.4) !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          }
          .tracking-map-container {
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
            overflow: hidden !important;
            position: relative !important;
          }
          .tracking-map-container-failed {
            border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
            background: rgba(22, 24, 30, 0.4) !important;
          }
          .tracking-eta-dashboard {
            background: rgba(255, 107, 0, 0.02) !important;
            border: 1px solid rgba(255, 107, 0, 0.08) !important;
            border-radius: 16px !important;
            margin: 16px !important;
            padding: 16px !important;
            box-shadow: inset 0 1px 1px rgba(255,255,255,0.03) !important;
          }
          .tracking-eta-time {
            font-family: 'Outfit', sans-serif !important;
            background: linear-gradient(135deg, #FF6B00 0%, #FF9E00 100%) !important;
            -webkit-background-clip: text !important;
            background-clip: text !important;
            -webkit-text-fill-color: transparent !important;
            color: transparent !important;
            font-weight: 900 !important;
            text-shadow: 0 4px 12px rgba(255, 107, 0, 0.15) !important;
          }
          .tracking-eta-dist {
            font-family: 'Outfit', sans-serif !important;
            font-weight: 800 !important;
            color: #FFF !important;
          }
          .tracking-progress-bg {
            background: rgba(255, 255, 255, 0.08) !important;
            height: 6px !important;
            border-radius: 3px !important;
            overflow: hidden !important;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.4) !important;
          }
          .tracking-progress-fill {
            background: linear-gradient(90deg, #FF6B00 0%, #FFA500 100%) !important;
            height: 100% !important;
            border-radius: 3px !important;
            box-shadow: 0 0 8px rgba(255, 107, 0, 0.6) !important;
            position: relative !important;
            animation: progressGlow 2s ease infinite alternate !important;
          }
          @keyframes progressGlow {
            0% { filter: drop-shadow(0 0 2px rgba(255, 107, 0, 0.4)); }
            100% { filter: drop-shadow(0 0 8px rgba(255, 107, 0, 0.8)); }
          }
          .tracking-milestone {
            font-size: 11px !important;
            color: #8E8E93 !important;
            transition: color 0.3s ease, text-shadow 0.3s ease !important;
          }
          .tracking-milestone-active {
            color: #FF6B00 !important;
            font-weight: 700 !important;
            text-shadow: 0 0 10px rgba(255, 107, 0, 0.3) !important;
          }
          .tracking-rider-panel {
            background: rgba(255, 255, 255, 0.015) !important;
            border: 1px solid rgba(255, 255, 255, 0.04) !important;
            border-radius: 16px !important;
            margin: 16px !important;
            padding: 16px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
          }
          .tracking-rider-avatar {
            background-color: rgba(255, 107, 0, 0.12) !important;
            border: 1px solid rgba(255, 107, 0, 0.25) !important;
            box-shadow: 0 4px 10px rgba(255, 107, 0, 0.15) !important;
          }
          .tracking-rider-rating {
            background-color: rgba(255, 215, 0, 0.1) !important;
            border: 1px solid rgba(255, 215, 0, 0.25) !important;
            padding: 2px 6px !important;
            border-radius: 8px !important;
          }
          .tracking-extra-pills-row {
            margin: 0 16px 16px 16px !important;
            gap: 8px !important;
          }
          .tracking-extra-pill {
            background-color: rgba(255, 255, 255, 0.03) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            padding: 6px 12px !important;
            border-radius: 12px !important;
          }
          .tracking-extra-pill-success {
            background-color: rgba(16, 185, 129, 0.06) !important;
            border: 1px solid rgba(16, 185, 129, 0.15) !important;
            padding: 6px 12px !important;
            border-radius: 12px !important;
          }
          .tracking-cancel-btn {
            background: rgba(239, 68, 68, 0.05) !important;
            border: 1px solid rgba(239, 68, 68, 0.15) !important;
            transition: all 0.2s ease !important;
          }
          .tracking-cancel-btn:hover {
            background: rgba(239, 68, 68, 0.1) !important;
            border-color: rgba(239, 68, 68, 0.3) !important;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.1) !important;
          }
          .tracking-rating-container {
            background: rgba(255, 107, 0, 0.02) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
            border-bottom-left-radius: 24px !important;
            border-bottom-right-radius: 24px !important;
            padding: 20px !important;
          }
          .tracking-review-input {
            background-color: rgba(255, 255, 255, 0.02) !important;
            border: 1px solid rgba(255, 255, 255, 0.06) !important;
            border-radius: 12px !important;
            color: #FFF !important;
            transition: all 0.2s ease !important;
            padding: 10px 12px !important;
          }
          .tracking-review-input:focus {
            border-color: rgba(255, 107, 0, 0.4) !important;
            background-color: rgba(255, 255, 255, 0.04) !important;
          }
          .tracking-dismiss-btn {
            background: linear-gradient(135deg, #10B981 0%, #059669 100%) !important;
            border-radius: 12px !important;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
            transition: all 0.2s ease !important;
          }
          .tracking-dismiss-btn:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4) !important;
          }
          .tracking-dot {
            background-color: rgba(255, 255, 255, 0.2) !important;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .tracking-dot-active {
            background: linear-gradient(90deg, #FF6B00 0%, #FF9E00 100%) !important;
            box-shadow: 0 0 8px rgba(255, 107, 0, 0.6) !important;
          }
          .tracking-empty-card-wrapper {
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 24px !important;
            z-index: 1 !important;
          }
          .empty-state-card {
            max-width: 440px !important;
            width: 100% !important;
            padding: 40px 32px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            background: rgba(18, 20, 26, 0.55) !important;
          }
          .radar-wrapper {
            position: relative !important;
            width: 100px !important;
            height: 100px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin-bottom: 24px !important;
          }
          .radar-ring {
            position: absolute !important;
            border: 1px solid rgba(255, 107, 0, 0.2) !important;
            border-radius: 50% !important;
            width: 100% !important;
            height: 100% !important;
            animation: radarPulse 3s cubic-bezier(0.215, 0.610, 0.355, 1) infinite !important;
          }
          .ring-2 {
            animation-delay: 1.5s !important;
          }
          .radar-icon-glow {
            filter: drop-shadow(0 0 8px rgba(255, 107, 0, 0.4)) !important;
            animation: iconPulse 2s ease-in-out infinite alternate !important;
            z-index: 2 !important;
          }
          @keyframes radarPulse {
            0% {
              transform: scale(0.6);
              opacity: 0.8;
            }
            100% {
              transform: scale(1.6);
              opacity: 0;
            }
          }
          @keyframes iconPulse {
            0% { transform: scale(1); filter: drop-shadow(0 0 6px rgba(255, 107, 0, 0.3)); }
            100% { transform: scale(1.08); filter: drop-shadow(0 0 16px rgba(255, 107, 0, 0.6)); }
          }
        `}} />
      )}
      <View style={[styles.header, { paddingTop: Platform.OS === 'web' ? 'calc(20px + env(safe-area-inset-top))' : Math.max(insets.top, 12) + 8 }]} {...Platform.select({ web: { className: 'tracking-header-glass' } })}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} {...Platform.select({ web: { className: 'tracking-back-glow', role: 'button' } })}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, Platform.OS === 'web' && { fontFamily: 'Outfit' }]}>
          {Platform.OS === 'web' ? (
            React.createElement('span', {
              className: 'brand-name-tracking',
              style: { fontSize: '20px', fontWeight: '800' }
            }, "Order Tracking")
          ) : (
            "Order Tracking"
          )}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {liveOrders.length > 1 && (
        <View style={styles.paginationRow}>
          {liveOrders.map((_, i) => (
            <View key={i} style={[styles.paginationDot, i === activeIndex && styles.paginationDotActive]} {...Platform.select({ web: { className: `tracking-dot ${i === activeIndex ? 'tracking-dot-active' : ''}` } })} />
          ))}
        </View>
      )}

      {liveOrders.length === 1 ? (
        <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: 600 }}>
          <KeyboardAwareScrollView 
            style={styles.content} 
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            enableOnAndroid={true}
            extraScrollHeight={Platform.OS === 'android' ? 100 : 20}
          >
            <LiveTrackingCard order={liveOrders[0]} onClear={() => handleClear(liveOrders[0].id)} />
          </KeyboardAwareScrollView>
        </View>
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.content}
        >
          {liveOrders.map((order, i) => (
            <View key={order?.id || `fallback-key-${i}`} style={{ width }}>
              <View style={{ flex: 1, alignSelf: 'center', width: '100%', maxWidth: 600 }}>
                <KeyboardAwareScrollView 
                  style={{ flex: 1 }} 
                  contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24), flexGrow: 1 }}
                  showsVerticalScrollIndicator={false}
                  enableOnAndroid={true}
                  extraScrollHeight={Platform.OS === 'android' ? 100 : 20}
                >
                  <LiveTrackingCard order={order} onClear={() => {
                    if (order?.id) handleClear(order.id);
                  }} />
                </KeyboardAwareScrollView>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: Colors.dark,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.muted,
  },
  paginationDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '90%',
    maxWidth: 440,
  },
  radarWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  radarRing1: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
  },
  radarRing2: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.2)',
  },
  radarIcon: {
    zIndex: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  browseBtnTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: Colors.muted,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
});
