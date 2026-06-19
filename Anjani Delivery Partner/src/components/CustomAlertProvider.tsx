import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/Colors';

let setAlertStateGlobal: any = null;

const originalAlert = Alert.alert;

// Override Alert.alert for web
if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: any[]) => {
    if (setAlertStateGlobal) {
      setAlertStateGlobal({ title, message, buttons: buttons || [{ text: 'OK' }] });
    } else {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
  };
}

export default function CustomAlertProvider({ children }: { children: React.ReactNode }) {
  const [visibleConfig, setVisibleConfig] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    setAlertStateGlobal = (newConfig: any) => {
      if (newConfig) {
        setVisibleConfig(newConfig);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
          })
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start(() => setVisibleConfig(null));
      }
    };
  }, []);

  return (
    <>
      {children}
      {Platform.OS === 'web' && visibleConfig && (
        <Animated.View style={[styles.absoluteOverlay, { opacity: fadeAnim }]}>
          <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
            <Animated.View style={[styles.alertBox, { transform: [{ scale: scaleAnim }] }]}>
              {visibleConfig.title && <Text style={styles.title}>{visibleConfig.title}</Text>}
              {visibleConfig.message && <Text style={styles.message}>{visibleConfig.message}</Text>}
              
              <View style={styles.buttonRow}>
                {visibleConfig.buttons?.map((btn: any, i: number) => {
                  const isDestructive = btn.style === 'destructive' || btn.text?.toLowerCase() === 'log out' || btn.text?.toLowerCase() === 'delete';
                  const isCancel = btn.style === 'cancel' || btn.text?.toLowerCase() === 'cancel' || btn.text?.toLowerCase() === 'no';
                  return (
                    <TouchableOpacity 
                      key={i} 
                      style={[
                        styles.button, 
                        isDestructive ? styles.buttonDestructive : (isCancel ? styles.buttonCancel : styles.buttonDefault)
                      ]}
                      onPress={() => {
                        setAlertStateGlobal(null);
                        if (btn.onPress) btn.onPress();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.buttonText,
                        isDestructive ? styles.textDestructive : (isCancel ? styles.textCancel : styles.textDefault)
                      ]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </BlurView>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  absoluteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDefault: {
    backgroundColor: Colors.primary,
  },
  buttonCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonDestructive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textDefault: {
    color: '#FFF',
  },
  textCancel: {
    color: Colors.text,
  },
  textDestructive: {
    color: '#EF4444',
  },
});
