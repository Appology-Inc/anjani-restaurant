import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Modal, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../state/AppStore';
import { AnimatedRestaurantToggle } from './AnimatedRestaurantToggle';
import { router } from 'expo-router';

export const TopHeader = () => {
  const { isRestaurantOpen, restaurantCloseReason, toggleRestaurantStatus, logout } = useAppStore();
  const [showRestaurantCloseModal, setShowRestaurantCloseModal] = useState(false);
  const [restaurantCloseReasonInput, setRestaurantCloseReasonInput] = useState('Chef/Workers not available');
  
  const brandBreathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(brandBreathe, { toValue: 1, duration: 3500, useNativeDriver: true }),
        Animated.timing(brandBreathe, { toValue: 0, duration: 3500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <>
      <View style={styles.topHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.headerIconContainer}>
            <MaterialCommunityIcons name="chef-hat" size={18} color="#FF6B00" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Anjani Restaurant</Text>
            <Text style={styles.headerSubtitle}>Owner Operations Suite</Text>
          </View>
        </View>
        <View style={{ alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <AnimatedRestaurantToggle 
              isOpen={isRestaurantOpen}
              onPress={() => {
                if (isRestaurantOpen) setShowRestaurantCloseModal(true);
                else toggleRestaurantStatus(true);
              }}
            />
            <TouchableOpacity 
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(239,68,68,0.12)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', alignItems: 'center', justifyContent: 'center' }} 
              onPress={() => {
                Alert.alert('Logout', 'Are you sure you want to log out from the Owner operations session?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: async () => {
                    await logout();
                    router.replace('/auth');
                  }}
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
          <View style={{ marginTop: 4, width: '100%', flexDirection: 'row', overflow: 'visible' }}>
            <View style={{ width: 74, alignItems: 'center', justifyContent: 'flex-start', overflow: 'visible' }}>
              {isRestaurantOpen ? (
                <Animated.Text 
                  numberOfLines={1} 
                  adjustsFontSizeToFit 
                  style={[styles.statusText, { color: '#4CAF50', marginTop: 0, opacity: Animated.add(0.4, Animated.multiply(brandBreathe, 0.6)) }]}
                >
                  Accepting Orders
                </Animated.Text>
              ) : restaurantCloseReason ? (
                <Text style={[styles.statusText, { color: '#F44336', marginTop: 0 }]} numberOfLines={1} adjustsFontSizeToFit>
                  {restaurantCloseReason}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      <Modal transparent visible={showRestaurantCloseModal} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Turn Off Orders?</Text>
              <TouchableOpacity onPress={() => setShowRestaurantCloseModal(false)}>
                <Ionicons name="close-circle-sharp" size={24} color="#757575" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#9A8A72', fontSize: 13, marginBottom: 16 }}>Select a reason for temporarily turning off the restaurant.</Text>
            
            {['Chef/Workers not available', 'Ingredients out of stock', 'Too many pending orders', 'Closing early today', 'Kitchen Maintenance/Cleaning'].map(reason => (
              <TouchableOpacity
                key={reason}
                style={[styles.reasonOption, restaurantCloseReasonInput === reason && styles.reasonOptionSelected]}
                onPress={() => setRestaurantCloseReasonInput(reason)}
              >
                <Ionicons name={restaurantCloseReasonInput === reason ? "radio-button-on" : "radio-button-off"} size={20} color={restaurantCloseReasonInput === reason ? "#FF6B00" : "#757575"} />
                <Text style={styles.reasonText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity 
              style={[styles.primaryBtn, { marginTop: 24, backgroundColor: 'rgba(244, 67, 54, 0.15)', borderColor: '#F44336' }]}
              onPress={() => {
                toggleRestaurantStatus(false, restaurantCloseReasonInput);
                setShowRestaurantCloseModal(false);
              }}
            >
              <Text style={[styles.primaryBtnTxt, { color: '#F44336' }]}>Confirm & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#0D0A06',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.18)',
  },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,107,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F5ECD7',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#9A8A72',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 100,
    textAlign: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalCard: {
    width: '88%',
    backgroundColor: '#221A0F',
    borderRadius: 20,
    padding: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,0,0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,0,0.18)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5ECD7',
  },
  primaryBtn: {
    backgroundColor: '#FF6D00',
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#FF6D00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    borderWidth: 1,
  },
  primaryBtnTxt: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#18120A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
  },
  reasonOptionSelected: {
    borderColor: 'rgba(255,107,0,0.4)',
    backgroundColor: 'rgba(255,107,0,0.1)',
  },
  reasonText: {
    color: '#E0E0E0',
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
  },
});
